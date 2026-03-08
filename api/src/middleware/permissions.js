const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is required');
}

// Middleware to verify JWT token
exports.authMiddleware = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);

        // Get user data
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                permissions: true,
                isActive: true
            }
        });

        if (!user) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        if (!user.isActive) {
            return res.status(403).json({ error: 'User account is inactive' });
        }

        req.user = {
            ...user,
            is_active: user.isActive
        };
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// Middleware to check if user is admin
exports.requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }

    next();
};

// Middleware to check if user has permission for a module
exports.requirePermission = (module) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        // Admins have access to everything
        if (req.user.role === 'admin') {
            return next();
        }

        // Check if user has permission for this module
        const modules = req.user.permissions?.modules || [];

        if (!modules.includes(module)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        next();
    };
};

module.exports = exports;
