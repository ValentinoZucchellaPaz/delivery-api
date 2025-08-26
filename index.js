import express from 'express';
import dotenv from 'dotenv';
const app = express();


// middlewares
import { authenticateToken, authorizeRoles } from './src/middlewares/auth.middleware.js';
import { errorHandler } from './src/middlewares/errorHandler.js';
dotenv.config();
app.use(express.json());
app.use(errorHandler);

// swagger docs endpoint
import swaggerUi from 'swagger-ui-express'
import { openApiDoc } from './src/docs/swagger.js';
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiDoc));

// routes
import userRoutes from './src/routes/user.routes.js';
import orderRoutes from './src/routes/order.routes.js';
app.use('/orders', orderRoutes);
app.use('/users', userRoutes)

app.get('/', (req, res) => {
    res.send('Welcome to the Delivery App API');
});

// Only restaurant accounts
app.post('/restaurants/menu', authenticateToken, authorizeRoles('restaurant'), (req, res) => {
    res.json({ message: `Menu updated by restaurant ${req.user.user_id}` });
});



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
