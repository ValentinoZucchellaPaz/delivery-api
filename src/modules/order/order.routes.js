import { Router } from 'express';
import {
    createOrder,
    getOrder,
    listOrders,
    acceptOrder,
    markPrepared,
    markSent,
    markDelivered,
    markPaid,
    cancelOrder
} from "./order.controller.js";
import { authenticateToken, authorizeRoles } from '../../middlewares/authMiddleware.js';

const router = Router();

// create order (customer)
router.post("/", authenticateToken, authorizeRoles("customer"), createOrder);

// list & get
router.get("/", authenticateToken, listOrders);
router.get("/:id", authenticateToken, getOrder);

// transitions
router.patch("/:id/accept", authenticateToken, authorizeRoles("restaurant_owner", "admin"), acceptOrder);
router.patch("/:id/prepared", authenticateToken, authorizeRoles("restaurant_owner"), markPrepared);
router.patch("/:id/sent", authenticateToken, authorizeRoles("restaurant_owner"), markSent);
router.patch("/:id/delivered", authenticateToken, authorizeRoles("restaurant_owner"), markDelivered);
router.patch("/:id/paid", authenticateToken, authorizeRoles("restaurant_owner"), markPaid);
router.patch("/:id/cancel", authenticateToken, cancelOrder);

export default router;
