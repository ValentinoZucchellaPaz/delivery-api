import express from 'express';
import dotenv from 'dotenv';
import authRoutes from './src/routes/auth.routes.js';
// import { authenticateToken, authorizeRoles } from './src/middlewares/auth.middleware.js';
import orderRoutes from './src/routes/order.routes.js';

dotenv.config();

const app = express();
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/orders', orderRoutes);

app.get('/', (req, res) => {
    res.send('Welcome to the Delivery App API');
});

// // Only logged users (any role)
// app.get('/orders', authenticateToken, (req, res) => {
//     res.json({ message: `Orders for user ${req.user.user_id}` });
// });

// // Only restaurant accounts
// app.post('/restaurants/menu', authenticateToken, authorizeRoles('restaurant'), (req, res) => {
//     res.json({ message: `Menu updated by restaurant ${req.user.user_id}` });
// });|

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
