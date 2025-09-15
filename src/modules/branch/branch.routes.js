import { Router } from "express";
import { authenticateToken, authorizeRoles } from "../../middlewares/authMiddleware.js";
import { createBranch, createMenuWithItems, editMenu, getMenusWithItems, toggleBranchActive, toggleMenuActive, updateBranch } from "./branch.controller.js";

const router = Router();

router.post("/", authenticateToken, authorizeRoles("restaurant_owner"), createBranch)
router.patch("/:id", authenticateToken, authorizeRoles("restaurant_owner"), updateBranch);
router.post("/:id/menu", authenticateToken, authorizeRoles("restaurant_owner"), createMenuWithItems)
router.get("/:id/menu", getMenusWithItems)
router.patch("/:id/active", authenticateToken, authorizeRoles("restaurant_owner"), toggleBranchActive);
router.patch("/:id/menu/:menu_id", authenticateToken, authorizeRoles("restaurant_owner"), editMenu);
router.patch("/:id/menu/:menu_id/active", authenticateToken, authorizeRoles("restaurant_owner"), toggleMenuActive);

export default router;