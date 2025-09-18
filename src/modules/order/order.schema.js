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

// --------------       DOCS SCHEMAS       --------------

// Order item inside a request
export const OrderItemSchema = z.object({
    menu_item_id: z.number().int(),
    quantity: z.number().int().min(1),
});

// Create order request
export const CreateOrderSchema = z.object({
    branch_id: z.number().int(),
    delivery_address: z.string().min(5),
    items: z.array(OrderItemSchema),
    payment_method: z.enum(["cash"]), // en el futuro agregás más
});

// Public order schema (response)
export const PublicOrderSchema = z.object({
    id: z.number(),
    customer_id: z.number(),
    branch_id: z.number(),
    delivery_address: z.string(),
    status: z.enum(["preparing", "ready", "delivering", "delivered", "paid", "cancelled"]),
    total: z.number(),
    estimated_delivery_time: z.number().optional(),
    actual_delivery_time: z.number().optional(),
    payment_method: z.enum(["cash"]),
    paid: z.boolean(),
    created_at: z.string(),
    items: z.array(
        z.object({
            id: z.number(),
            menu_item_id: z.number(),
            name: z.string(),
            quantity: z.number(),
            unit_price: z.number(),
        })
    )
});

export const OrderListResponse = z.array(PublicOrderSchema);

// Update status
export const UpdateOrderStatusSchema = z.object({
    status: z.enum(["ready", "delivering", "delivered", "paid", "cancelled"])
});
