import dotenv from 'dotenv';
import { verifyJwt } from '../utils/jwt.js';

dotenv.config();

export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Expected: "Bearer <token>"

    if (!token) return res.status(401).json({ error: 'Access token missing' });


    const payload = verifyJwt(token)
    if (!payload) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = payload; // { user_id, role }
    next();
};

// Restrict access by role
export const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) return res.status(401).json({ error: 'User not authenticated' });
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Forbidden: insufficient permissions' });
        }
        next();
    };
};
