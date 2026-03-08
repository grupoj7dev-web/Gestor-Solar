const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is required');
}

async function authMiddleware(req, res, next) {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                permissions: true,
                isActive: true,
            },
        });

        if (!user || !user.isActive) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        req.user = {
            userId: user.id,
            email: user.email,
            role: user.role,
            name: user.name,
            permissions: user.permissions,
            is_active: user.isActive,
        };
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
}

module.exports = authMiddleware;
