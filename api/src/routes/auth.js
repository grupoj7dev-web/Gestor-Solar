const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');

/**
 * Auth Routes
 * 
 * Base Path: /api/auth (mounted in index.js)
 * 
 * Endpoints:
 * - GET /api/auth/check-first-user : Check if any user exists (for setup)
 * - POST /api/auth/register-first  : Register the first admin user
 * - POST /api/auth/register        : Public registration
 * - POST /api/auth/login           : Authenticate user
 * - GET /api/auth/verify           : Verify token
 * 
 * Environment Variables (.env):
 * - DATABASE_URL
 * - JWT_SECRET
 */

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is required');
}

// Check if any user exists (for first-time setup)
router.get('/check-first-user', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('id')
            .limit(1);

        if (error) throw error;

        res.json({ hasUsers: data && data.length > 0 });
    } catch (error) {
        console.error('CRITICAL ERROR in /check-first-user:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
});

// Register first user (only if no users exist)
router.post('/register-first', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Check if users exist
        const { data: existingUsers } = await supabase
            .from('users')
            .select('id')
            .limit(1);

        if (existingUsers && existingUsers.length > 0) {
            return res.status(400).json({ error: 'Users already exist' });
        }

        // Validate input
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Create first user as ADMIN with full permissions
        const { data, error } = await supabase
            .from('users')
            .insert([{
                name,
                email,
                password_hash: passwordHash,
                role: 'admin',
                permissions: {
                    modules: ['dashboard', 'operation', 'monitoring', 'tickets', 'clients', 'inverters', 'branches', 'parameters', 'employees']
                },
                is_active: true
            }])
            .select()
            .single();

        if (error) {
            if (error.code === 'P2002' || error.code === '23505') {
                return res.status(400).json({ error: 'Email already exists' });
            }
            throw error;
        }

        // Generate token
        const token = jwt.sign({ userId: data.id, email: data.email, role: data.role }, JWT_SECRET, { expiresIn: '7d' });

        res.json({
            token,
            user: {
                id: data.id,
                name: data.name,
                email: data.email,
                role: data.role,
                permissions: data.permissions
            }
        });
    } catch (error) {
        if (error && (error.code === 'P2002' || error.code === '23505')) {
            return res.status(400).json({ error: 'Email already exists' });
        }
        console.error('Error registering user:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Public registration
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Validate input
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Create user
        const { data, error } = await supabase
            .from('users')
            .insert([{ name, email, password_hash: passwordHash }])
            .select()
            .single();

        if (error) {
            if (error.code === 'P2002' || error.code === '23505') {
                return res.status(400).json({ error: 'Email already exists' });
            }
            throw error;
        }

        // Generate token
        const token = jwt.sign({ userId: data.id, email: data.email }, JWT_SECRET, { expiresIn: '7d' });

        res.json({
            token,
            user: {
                id: data.id,
                name: data.name,
                email: data.email
            }
        });
    } catch (error) {
        if (error && (error.code === 'P2002' || error.code === '23505')) {
            return res.status(400).json({ error: 'Email already exists' });
        }
        console.error('Error registering user:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find user
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (error || !user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check password
        const userPasswordHash = user.password_hash || user.passwordHash || '';
        if (!userPasswordHash) {
            console.error('User record missing password hash:', { email: user.email, id: user.id });
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        let isMatch = false;
        const isBcryptHash = typeof userPasswordHash === 'string' && /^\$2[aby]\$\d{2}\$/.test(userPasswordHash);

        if (isBcryptHash) {
            try {
                isMatch = await bcrypt.compare(password, userPasswordHash);
            } catch (compareError) {
                console.error('Password hash compare failed:', {
                    userId: user.id,
                    email: user.email,
                    message: compareError?.message
                });
                return res.status(401).json({ error: 'Invalid credentials' });
            }
        } else {
            // Legacy plain-text fallback to avoid 500 and allow smooth migration.
            isMatch = password === userPasswordHash;
            if (isMatch) {
                try {
                    const salt = await bcrypt.genSalt(10);
                    const upgradedHash = await bcrypt.hash(password, salt);
                    await supabase
                        .from('users')
                        .update({ password_hash: upgradedHash })
                        .eq('id', user.id);
                } catch (upgradeError) {
                    console.error('Failed to upgrade legacy password hash:', {
                        userId: user.id,
                        email: user.email,
                        message: upgradeError?.message
                    });
                }
            }
        }

        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check if user is active
        const isActive = user.is_active !== undefined ? Boolean(user.is_active) : Boolean(user.isActive);
        if (!isActive) {
            return res.status(403).json({ error: 'User account is inactive' });
        }

        // Generate token
        const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                permissions: user.permissions
            }
        });
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Verify token
router.get('/verify', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);

        // Get user data
        const { data: user, error } = await supabase
            .from('users')
            .select('id, name, email, role, permissions, is_active')
            .eq('id', decoded.userId)
            .single();

        if (error || !user) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        if (!user.is_active) {
            return res.status(403).json({ error: 'User account is inactive' });
        }

        res.json({ user });
    } catch (error) {
        console.error('Error verifying token:', error);
        res.status(401).json({ error: 'Invalid token' });
    }
});

module.exports = router;
