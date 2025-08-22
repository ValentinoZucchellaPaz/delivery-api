import { Router } from 'express';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.middleware.js';

const router = Router();

// Any logged-in user can see their orders
router.get('/', authenticateToken, (req, res) => {
    res.json({ message: `Orders for user ${req.user.user_id}`, role: req.user.role });
});

// Only restaurants can create orders (example logic)
router.post('/', authenticateToken, authorizeRoles('restaurant'), (req, res) => {
    res.json({ message: `Order created by restaurant ${req.user.user_id}` });
});

export default router;
