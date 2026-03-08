const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/auth');
const { requireAdmin } = require('../middleware/permissions');
const bcrypt = require('bcryptjs');

// Get all employees (users)
router.get('/', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('id, name, email, role, permissions, is_active, department, created_at')
            .order('name', { ascending: true });

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Error fetching employees:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get employee by ID
router.get('/:id', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('id, name, email, role, permissions, is_active, department, created_at')
            .eq('id', req.params.id)
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Employee not found' });

        res.json(data);
    } catch (error) {
        console.error('Error fetching employee:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create employee (user)
router.post('/', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const { name, email, password, role, permissions, department } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email and password are required' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Prepare payload
        const payload = {
            name,
            email,
            password_hash: passwordHash,
            role: role || 'employee',
            permissions: permissions || { modules: [] },
            is_active: true,
            department
        };

        console.log('Creating user with payload:', { ...payload, password_hash: '***' });

        const { data, error } = await supabase
            .from('users')
            .insert([payload])
            .select('id, name, email, role, permissions, is_active, department')
            .single();

        if (error) {
            console.error('Supabase error creating user:', error);
            if (error.code === '23505') {
                return res.status(400).json({ error: 'Email already exists' });
            }
            throw error;
        }

        res.status(201).json(data);
    } catch (error) {
        console.error('Error creating employee:', error);
        res.status(500).json({
            error: 'Server error',
            details: error.message || error
        });
    }
});

// Update employee (user)
router.put('/:id', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const { name, email, password, role, permissions, is_active, department } = req.body;

        // Build update payload
        const payload = {};
        if (name !== undefined) payload.name = name;
        if (email !== undefined) payload.email = email;
        if (role !== undefined) payload.role = role;
        if (permissions !== undefined) payload.permissions = permissions;
        if (is_active !== undefined) payload.is_active = is_active;
        if (department !== undefined) payload.department = department;

        if (password && password.length >= 6) {
            const salt = await bcrypt.genSalt(10);
            payload.password_hash = await bcrypt.hash(password, salt);
        }

        console.log('Updating user with payload:', { ...payload, password_hash: payload.password_hash ? '***' : undefined });

        const { data, error } = await supabase
            .from('users')
            .update(payload)
            .eq('id', req.params.id)
            .select('id, name, email, role, permissions, is_active, department')
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Employee not found' });

        res.json(data);
    } catch (error) {
        console.error('Error updating employee:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete employee (user)
router.delete('/:id', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', req.params.id);

        if (error) throw error;
        res.json({ message: 'Employee deleted successfully' });
    } catch (error) {
        console.error('Error deleting employee:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
