import dotenv from 'dotenv';
import { verifyJwt } from '../utils/jwt.js';
import { AuthError } from '../utils/errors.js';

dotenv.config();

export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Expected: "Bearer <token>"

    if (!token) throw new AuthError('Access token missing')


    const payload = verifyJwt(token)
    if (!payload) throw new AuthError('Invalid or expired token');
    req.user = payload; // { user_id, role }
    next();
};

// Restrict access by role
export const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) throw new AuthError('User not authenticated');
        if (!allowedRoles.includes(req.user.role)) {
            throw new AuthError('Insufficient permissions', 403)
        }
        next();
    };
};
