import express from "express";
import { getUsers, login, registerUser } from "../controllers/user.controller.js";
import { authenticateToken, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

// TODO: write get/post methods in ./db/users.js

/** 
 * @swagger
 * /users:
 *   get:
 *      summary: Retrieve a list of users
 *      tags: [Auth]
 */
router.get("/", authenticateToken, authorizeRoles('admin'), getUsers);

/**
 * @swagger
 * /users/register:
 *   post:
 *     summary: Register a new user
 *     description: Create a new user account with name, email, and password.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserRegisterRequest'
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Invalid input or user already exists
 */
router.post("/register", registerUser);

/**
 * @swagger
 * /users/login:
 *   post:
 *     summary: User login
 *     description: Authenticate a user and return a JWT token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserLoginRequest'
 *     responses:
 *       200:
 *         description: User authenticated successfully
 *       401:
 *         description: Invalid credentials
 */
router.post("/login", login);



router.post("/refresh-token", (req, res) => {
}); // todo: recibir por cookie
router.post('/logout', (req, res) => {
}); // todo
// TODO: add protected routes via auth middleware and other endpoint

export default router;
