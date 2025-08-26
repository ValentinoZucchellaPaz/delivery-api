import express from 'express';
import dotenv from 'dotenv';
const app = express();

// middlewares
import { errorHandler } from './middlewares/errorHandler.js';
dotenv.config();
app.use(express.json());
app.use(errorHandler);

// swagger docs endpoint
import swaggerUi from 'swagger-ui-express'
import { openApiDoc } from './docs/swagger.js';
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiDoc));

// routes
import userRoutes from './modules/user/user.routes.js';
import orderRoutes from './modules/order/order.routes.js';
app.use('/orders', orderRoutes);
app.use('/users', userRoutes)

app.get('/', (req, res) => {
    res.send('Welcome to the Delivery App API');
});

export default app;