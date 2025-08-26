import { email, z } from "zod";
import { userSchema } from "./entities.js";

export const UserRoleEnum = z.enum(["admin", "restaurant_owner", "customer"]).meta({
    description: "User roles",
    example: "admin",
});

export const UserRegisterRequest = z.object({
    name: z.string().min(2).meta({ description: "Name", example: "John Doe" }),
    email: z.email().meta({ example: "example@gmail.com" }),
    password: z.string().min(6),
    role: UserRoleEnum
}).meta({
    id: "UserRegisterRequestDTO"
});

export const UserLoginRequest = z.object({
    email: z.email().meta({ example: "admin@example.com" }),
    password: z.string().min(6).meta("123456")
}).meta({
    id: "UserLoginRequestDTO"
});

export const UserRegisterResponseSchema = z.object({
    status: z.literal("success"),
    user: z.object({
        id: z.int().meta({ example: 1 }),
        name: z.string().meta({ example: 'Admin' }),
        email: z.email().meta({ example: "admin@example.com" }),
        role: UserRoleEnum
    })
}).meta({
    id: "UserRegisterResponseDTO"
});

export const UserListResponseSchema = z.object({
    status: z.literal("success"),
    users: z.array(userSchema),
}).meta({
    id: "UserListResponseDTO",
    example: {
        status: "success",
        users: [
            {
                id: 1,
                name: "Valentino",
                email: "vale@example.com",
                role: "admin",
                active: true,
                created_at: "2025-08-26T10:00:00Z"
            }
        ]
    }
});