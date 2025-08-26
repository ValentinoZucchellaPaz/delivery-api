import express from 'express';
import dotenv from 'dotenv';
import swaggerDocs from './src/docs/swagger.js';



// routes
import userRoutes from './src/routes/user.routes.js';
import orderRoutes from './src/routes/order.routes.js';

// middlewares
import { authenticateToken, authorizeRoles } from './src/middlewares/auth.middleware.js';
import { errorHandler } from './src/middlewares/errorHandler.js';

dotenv.config();

const app = express();
app.use(express.json());

// swagger setup
swaggerDocs(app);

app.use('/orders', orderRoutes);
app.use('/users', userRoutes)

app.get('/', (req, res) => {
    res.send('Welcome to the Delivery App API');
});

// Only restaurant accounts
app.post('/restaurants/menu', authenticateToken, authorizeRoles('restaurant'), (req, res) => {
    res.json({ message: `Menu updated by restaurant ${req.user.user_id}` });
});


app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
