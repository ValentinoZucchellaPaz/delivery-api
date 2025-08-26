import { z } from "zod";

/**
 * @swagger
 * components:
 *   schemas:
 *     UserRegisterRequest:
 *       type: object
 *       required:
 *         - name
 *         - email
 *         - password
 *         - role
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: "user@example.com"
 *         password:
 *           type: string
 *           format: password
 *           example: "123456"
 *         name:
 *           type: string
 *           example: "John Doe"
 *         role:
 *          type: string
 *          enum: [customer, restaurant_owner, admin]
 */
export const UserRegisterRequest = z.object({
    name: z.string().min(2),
    email: z.email(),
    password: z.string().min(6),
    role: z.enum(['customer', 'restaurant_owner', 'admin']).optional()
});

/**
 * @swagger
 * components:
 *   schemas:
 *     UserLoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: "user@example.com"
 *         password:
 *           type: string
 *           format: password
 *           example: "123456"
 */
export const UserLoginRequest = z.object({
    email: z.email(),
    password: z.string().min(6)
});