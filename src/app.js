import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
const app = express();

// middlewares
import { errorHandler } from "./middlewares/errorHandler.js";
dotenv.config({ quiet: true });
app.use(express.json());
app.use(cookieParser());

// swagger docs endpoint
import swaggerUi from "swagger-ui-express";
import { openApiDoc } from "./docs/swagger.js";
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiDoc));

// routes
import userRoutes from "./modules/user/user.routes.js";
import orderRoutes from "./modules/order/order.routes.js";
import authRoutes from "./modules/auth/auth.routes.js";
import restaurantRoutes from "./modules/restaurant/restaurant.routes.js";
import branchRoutes from "./modules/branch/branch.routes.js";
app.use("/order", orderRoutes);
app.use("/users", userRoutes);
app.use("/auth", authRoutes);
app.use("/restaurant", restaurantRoutes);
app.use("/branch", branchRoutes);

app.get("/", (req, res) => {
  res.send("Welcome to the Delivery App API");
});

app.use(errorHandler);
export default app;
