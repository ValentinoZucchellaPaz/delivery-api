import { z } from "zod";

export const createBranchSchema = z.object({
  restaurant_id: z.number().int(),
  address: z.string().min(5),
  city: z.string(),
});

export const updateBranchSchema = z.object({
  address: z.string().optional(),
  city: z.string().optional(),
  avg_waiting_time: z.number().optional(),
  active: z.boolean().optional(),
});

export const publicBranchSchema = z.object({
  id: z.number(),
  restaurant_id: z.number(),
  address: z.string().optional(),
  city: z.string().optional(),
  avg_waiting_time: z.number().optional(),
  created_at: z
    .union([z.string(), z.instanceof(Date)])
    .transform((val) => new Date(val).toISOString())
    .meta({ example: "2025-08-26T10:00:00Z" }),
});

export const BranchListResponse = z.array(publicBranchSchema);

// ==================     MENU     ==================

export const menuItemSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().min(0),
  available: z.boolean().optional(),
});

export const createMenuSchema = z.object({
  name: z.string().min(3),
  items: z.array(menuItemSchema).optional().default([]),
});

export const editMenuSchema = z.object({
  name: z.string().optional(),
  active: z.boolean().optional(),
  add: z.array(menuItemSchema).optional().default([]),
  delete: z.array(z.number()).optional().default([]),
});

export const publicMenuSchema = z.object({
  id: z.number(),
  branch_id: z.number(),
  name: z.string(),
  active: z.boolean(),
  items: z.array(menuItemSchema),
  created_at: z
    .union([z.string(), z.instanceof(Date)])
    .transform((val) => new Date(val).toISOString())
    .meta({ example: "2025-09-14T10:00:00Z" }),
});

export const MenuListResponse = z.array(publicMenuSchema);
