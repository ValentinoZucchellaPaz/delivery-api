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
import { validateParams } from '../../middlewares/validate.js';
import { z } from 'zod'

const router = Router();

// create order (customer)
router.post("/", authenticateToken, authorizeRoles("customer"), createOrder);

// list & get
router.get("/", authenticateToken, listOrders);
router.get("/:public_id", authenticateToken, validateParams(z.object({ public_id: z.uuid() })), getOrder);

// transitions
router.patch("/:public_id/accept", authenticateToken, validateParams(z.object({ public_id: z.uuid() })), authorizeRoles("restaurant_owner", "admin"), acceptOrder);
router.patch("/:public_id/prepared", authenticateToken, validateParams(z.object({ public_id: z.uuid() })), authorizeRoles("restaurant_owner"), markPrepared);
router.patch("/:public_id/sent", authenticateToken, validateParams(z.object({ public_id: z.uuid() })), authorizeRoles("restaurant_owner"), markSent);
router.patch("/:public_id/delivered", authenticateToken, validateParams(z.object({ public_id: z.uuid() })), authorizeRoles("restaurant_owner"), markDelivered);
router.patch("/:public_id/paid", authenticateToken, validateParams(z.object({ public_id: z.uuid() })), authorizeRoles("restaurant_owner"), markPaid);
router.patch("/:public_id/cancel", authenticateToken, validateParams(z.object({ public_id: z.uuid() })), cancelOrder);

export default router;
