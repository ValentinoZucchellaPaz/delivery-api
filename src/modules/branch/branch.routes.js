import { Router } from "express";
import { authenticateToken, authorizeRoles } from "../../middlewares/authMiddleware.js";
import { createBranch, createMenuWithItems, getMenusWithItems } from "./branch.controller.js";

const router = Router();

router.post("/", authenticateToken, authorizeRoles('restaurant_owner'), createBranch)
router.post("/:id/menu", authenticateToken, authorizeRoles('restaurant_owner'), createMenuWithItems)
router.get("/:id/menu", getMenusWithItems)

export default router;