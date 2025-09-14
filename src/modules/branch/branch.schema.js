import { z } from 'zod'

export const createBranchSchema = z.object({
    restaurant_id: z.number().int(),
    address: z.string().min(5),
    city: z.string()
});

export const menuItemSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    price: z.number().min(0),
    available: z.boolean().optional().default(true)
})

export const createMenuSchema = z.object({
    name: z.string().min(3),
    items: z.array(menuItemSchema).optional().default([]),
});