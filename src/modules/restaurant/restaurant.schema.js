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

export const publicRestaurantSchema = createRestaurantSchema.extend({
    id: z.number(),
    created_at: z.union([z.string(), z.instanceof(Date)])
        .transform(val => new Date(val).toISOString())
        .meta({ example: "2025-09-14T10:00:00Z" })
});

export const RestaurantListResponse = z.array(publicRestaurantSchema);