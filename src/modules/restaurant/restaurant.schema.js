import { z } from 'zod'

export const createRestaurantSchema = z.object({
    user_id: z.number().int(),
    name: z.string().min(2),
    description: z.string().optional(),
});

export const updateRestaurantSchema = z.object({
    name: z.string().min(2).optional(),
    description: z.string().optional(),
});