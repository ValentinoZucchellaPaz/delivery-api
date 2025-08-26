import { z } from "zod";
import { UserRoleEnum } from "./requests.js";

// -------------------- USERS --------------------
export const userSchema = z.object({
    id: z.number().int(),
    name: z.string().min(2).meta({ example: "Admin" }),
    email: z.email().meta({ example: "admin@example.com" }),
    role: z.enum(["admin", "restaurant_owner", "customer"]).default('customer').meta({ example: "admin" }),
    active: z.union([z.boolean(), z.number()])
        .transform(val => Boolean(val)) // converts 0/1 -> false/true
        .meta({ example: true }),
    created_at: z.union([z.string(), z.instanceof(Date)])
        .transform(val => new Date(val).toISOString())
        .meta({ example: "2025-08-26T10:00:00Z" })
});


// -------------------- RESTAURANTS --------------------
export const restaurantSchema = z.object({
    id: z.number().int().optional(),
    user_id: z.number().int(),
    name: z.string().min(2),
    description: z.string().optional(),
    created_at: z.string().optional(),
});

// -------------------- BRANCHES --------------------
export const branchSchema = z.object({
    id: z.number().int().optional(),
    restaurant_id: z.number().int(),
    address: z.string().min(5),
    city: z.string().min(2),
    avg_waiting_time: z.number().int().default(0),
    active: z.boolean().default(true),
    created_at: z.string().optional(),
});

// -------------------- MENUS --------------------
export const menuSchema = z.object({
    id: z.number().int().optional(),
    branch_id: z.number().int(),
    name: z.string().min(2),
    active: z.boolean().default(true),
    created_at: z.string().optional(),
});

// -------------------- MENU ITEMS --------------------
export const menuItemSchema = z.object({
    id: z.number().int().optional(),
    menu_id: z.number().int(),
    name: z.string().min(2),
    description: z.string().optional(),
    price: z.number().positive(),
    available: z.boolean().default(true),
});

// -------------------- ORDERS --------------------
export const orderSchema = z.object({
    id: z.number().int().optional(),
    customer_id: z.number().int(),
    branch_id: z.number().int(),
    estimated_delivery_time: z.number().int().default(0),
    actual_delivery_time: z.number().int().default(0),
    status: z.enum(['preparing', 'on_the_way', 'delivered', 'cancelled']).default('preparing'),
    delivery_address: z.string().min(5),
    total: z.number().positive(),
    payment_method: z.enum(['credit_card', 'debit_card', 'cash', 'online_payment']).default('cash'),
    paid: z.boolean().default(false),
    created_at: z.string().optional(),
});

// -------------------- ORDER ITEMS --------------------
export const orderItemSchema = z.object({
    id: z.number().int().optional(),
    order_id: z.number().int(),
    menu_item_id: z.number().int(),
    quantity: z.number().int().min(1).default(1),
    price: z.number().positive(),
});
