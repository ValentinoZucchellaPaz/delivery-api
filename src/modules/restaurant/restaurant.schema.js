import { z } from 'zod'

export const createRestaurantSchema = z.object({
    user_id: z.number().int(),
    name: z.string().min(2),
    description: z.string().optional(),
});
