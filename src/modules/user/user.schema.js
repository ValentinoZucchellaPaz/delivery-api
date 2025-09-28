import { z } from "zod";

export const UserRoleEnum = z
  .enum(["admin", "restaurant_owner", "customer"])
  .default("customer")
  .meta({
    description: "User roles",
    example: "admin",
  });

export const UserSchema = z.object({
  id: z.number().int().meta({ example: 1 }),
  name: z.string().min(2).meta({ example: "Admin" }),
  email: z.email().meta({ example: "admin@example.com" }),
  password_hash: z.string(),
  role: UserRoleEnum,
  active: z
    .union([z.boolean(), z.number()])
    .transform((val) => Boolean(val)) // converts 0/1 -> false/true
    .meta({ example: true }),
  created_at: z
    .union([z.string(), z.instanceof(Date)])
    .transform((val) => new Date(val).toISOString())
    .meta({ example: "2025-08-26T10:00:00Z" }),
});

export const PublicUserSchema = UserSchema.omit({ password_hash: true });
export const CreateUserSchema = UserSchema.omit({ id: true, active: true, created_at: true });
export const UserRegisterResponse = UserSchema.omit({
  password_hash: true,
  active: true,
  created_at: true,
}).meta({
  id: "UserRegisterResponseDTO",
});

export const UserRegisterRequest = z
  .object({
    name: z.string().min(2).meta({ description: "Name", example: "John Doe" }),
    email: z.email().meta({ example: "example@gmail.com" }),
    password: z.string().min(6),
    role: UserRoleEnum,
  })
  .meta({
    id: "UserRegisterRequestDTO",
  });

export const UserLoginRequest = z
  .object({
    email: z.email().meta({ example: "admin@example.com" }),
    password: z.string().min(6).meta("123456"),
  })
  .meta({
    id: "UserLoginRequestDTO",
  });

export const UserListResponse = z
  .object({
    status: z.literal("success"),
    users: z.array(PublicUserSchema),
  })
  .meta({
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
          created_at: "2025-08-26T10:00:00Z",
        },
      ],
    },
  });

export const userIdParamSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/)
    .transform((val) => parseInt(val, 10)), // transforms to number, extra security
});

export const UserUpdateSchema = z.object({
  name: z.string().optional(),
  email: z.email().optional(),
  role: z.enum(["customer", "restaurant_owner", "admin"]).optional(),
});
