import { Router } from "express";
import { deactivateUser, editUser, getUser, getUsers, reactivateUser } from "./user.controller.js";
import { authenticateToken, authorizeRoles } from "../../middlewares/authMiddleware.js";
import { validateParams } from "../../middlewares/validate.js";
import { userIdParamSchema } from "./user.schema.js";

const router = Router();

router.get("/", authenticateToken, authorizeRoles('admin'), getUsers);
router.get("/:id", authenticateToken, authorizeRoles('admin'), validateParams(userIdParamSchema), getUser)
router.patch("/:id", authenticateToken, authorizeRoles("admin"), validateParams(userIdParamSchema), editUser);
router.patch("/:id/deactivate", authenticateToken, authorizeRoles("admin"), validateParams(userIdParamSchema), deactivateUser);
router.patch("/:id/reactivate", authenticateToken, authorizeRoles("admin"), validateParams(userIdParamSchema), reactivateUser);


export default router;
