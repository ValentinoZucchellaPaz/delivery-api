import { Router } from "express";
import { authenticateToken, authorizeRoles } from "../../middlewares/authMiddleware.js";
import { createRestaurant, getAllRestaurants, getBranchesByRestaurantId, getRestaurantById, updateRestaurant } from "./restaurant.controller.js";

const router = Router();

router.post("/", authenticateToken, authorizeRoles('admin'), createRestaurant)
router.get("/", authenticateToken, authorizeRoles('admin'), getAllRestaurants);
router.get("/:id", authenticateToken, authorizeRoles('admin'), getRestaurantById);
router.patch("/:id", authenticateToken, authorizeRoles('admin', 'restaurant_owner'), updateRestaurant);
router.get("/:id/branches", authenticateToken, authorizeRoles('admin'), getBranchesByRestaurantId);

export default router;