import { z } from "zod";

export const orderItemRequestSchema = z.object({
    menu_item_id: z.number().int(),
    quantity: z.number().int().min(1)
});

export const createOrderSchema = z.object({
    branch_id: z.number().int(),
    delivery_address: z.string().min(5),
    items: z.array(orderItemRequestSchema).min(1)
});

// simple schema for PATCH actions that expect no body or a small body
export const patchActionSchema = z.object({
    // for cancel we could allow reason; for paid we might allow payment_meta in future
    reason: z.string().optional()
});
