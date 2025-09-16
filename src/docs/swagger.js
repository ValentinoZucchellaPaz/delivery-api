import { z } from 'zod';
import { createDocument } from 'zod-openapi';
import {
    PublicUserSchema,
    UserListResponse,
    UserLoginRequest,
    UserRegisterRequest,
    UserRegisterResponse
} from '../modules/user/user.schema.js';

import { createRestaurantSchema, publicRestaurantSchema, RestaurantListResponse, updateRestaurantSchema } from '../modules/restaurant/restaurant.schema.js';
import { BranchListResponse, createBranchSchema, createMenuSchema, editMenuSchema, MenuListResponse, publicBranchSchema, publicMenuSchema, updateBranchSchema } from '../modules/branch/branch.schema.js';

export const openApiDoc = createDocument({
    openapi: '3.1.0',
    info: {
        title: 'Delivery APP API',
        version: '1.0.0',
        description: 'Docs generated from Zod using zod-openapi',
    },
    components: {
        securitySchemes: {
            bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
    },
    paths: {
        // === Users ===
        '/users': {
            get: {
                summary: 'Gets all users',
                security: [{ bearerAuth: [] }],
                "x-roles": ["admin"],
                responses: {
                    200: {
                        description: 'List of users retrieved successfully',
                        content: {
                            "application/json": { schema: UserListResponse }
                        }
                    }
                }
            }
        },
        '/users/{id}': {
            get: {
                summary: 'Gets user by id',
                security: [{ bearerAuth: [] }],
                "x-roles": ["admin"],
                responses: {
                    200: {
                        description: 'User retrieved successfully',
                        content: {
                            "application/json": { schema: PublicUserSchema }
                        }
                    }
                }
            }
        },
        '/users/register': {
            post: {
                summary: 'Register user',
                requestBody: {
                    content: {
                        'application/json': { schema: UserRegisterRequest }
                    }
                },
                responses: {
                    201: {
                        description: 'Created',
                        content: {
                            "application/json": {
                                schema: z.object({
                                    status: z.string().meta({ example: "success" }),
                                    user: UserRegisterResponse
                                })
                            }
                        }
                    }
                }
            }
        },
        '/users/login': {
            post: {
                summary: 'Login user',
                requestBody: {
                    content: {
                        'application/json': { schema: UserLoginRequest }
                    }
                },
                responses: {
                    201: {
                        description: 'Logged',
                        content: {
                            "application/json": { schema: z.object({ token: z.string() }) }
                        }
                    }
                }
            }
        },
        '/users/refresh-token': {
            post: {
                summary: 'Refresh access token',
                responses: {
                    201: {
                        description: 'Access token refreshed successfully',
                        content: {
                            "application/json": { schema: z.object({ token: z.string() }) }
                        }
                    }
                }
            }
        },
        '/users/logout': {
            post: {
                summary: 'Logout user',
                responses: {
                    201: { description: 'Logged out successfully' }
                }
            }
        },

        // === Restaurants ===
        '/restaurants': {
            post: {
                summary: 'Create restaurant',
                security: [{ bearerAuth: [] }],
                "x-roles": ["admin"],
                requestBody: {
                    content: { 'application/json': { schema: createRestaurantSchema } }
                },
                responses: {
                    201: {
                        description: 'Restaurant created',
                        content: { "application/json": { schema: publicRestaurantSchema } }
                    }
                }
            },
            get: {
                summary: 'Get all restaurants',
                security: [{ bearerAuth: [] }],
                "x-roles": ["admin"],
                responses: {
                    200: {
                        description: 'List of restaurants',
                        content: { "application/json": { schema: RestaurantListResponse } }
                    }
                }
            }
        },
        '/restaurants/{id}': {
            get: {
                summary: 'Get restaurant by ID',
                security: [{ bearerAuth: [] }],
                "x-roles": ["admin"],
                responses: {
                    200: {
                        description: 'Restaurant retrieved',
                        content: { "application/json": { schema: publicRestaurantSchema } }
                    }
                }
            },
            patch: {
                summary: 'Update restaurant',
                security: [{ bearerAuth: [] }],
                "x-roles": ["admin"],
                requestBody: {
                    content: { 'application/json': { schema: updateRestaurantSchema } }
                },
                responses: {
                    200: {
                        description: 'Restaurant updated',
                        content: { "application/json": { schema: publicRestaurantSchema } }
                    }
                }
            }
        },
        '/restaurants/{id}/branches': {
            get: {
                summary: 'Get branches by restaurant',
                security: [{ bearerAuth: [] }],
                "x-roles": ["admin"],
                responses: {
                    200: {
                        description: 'List of branches',
                        content: { "application/json": { schema: BranchListResponse } }
                    }
                }
            }
        },

        // === Branches ===
        '/branches': {
            post: {
                summary: 'Create branch',
                security: [{ bearerAuth: [] }],
                "x-roles": ["restaurant_owner"],
                requestBody: {
                    content: { 'application/json': { schema: createBranchSchema } }
                },
                responses: {
                    201: {
                        description: 'Branch created',
                        content: { "application/json": { schema: publicBranchSchema } }
                    }
                }
            }
        },
        '/branches/{id}': {
            patch: {
                summary: 'Update branch',
                security: [{ bearerAuth: [] }],
                "x-roles": ["restaurant_owner"],
                requestBody: {
                    content: { 'application/json': { schema: updateBranchSchema } }
                },
                responses: {
                    200: {
                        description: 'Branch updated',
                        content: { "application/json": { schema: publicBranchSchema } }
                    }
                }
            }
        },
        '/branches/{id}/active': {
            patch: {
                summary: 'Activate/deactivate branch',
                security: [{ bearerAuth: [] }],
                "x-roles": ["restaurant_owner"],
                requestBody: {
                    content: { 'application/json': { schema: z.object({ active: z.boolean() }) } }
                },
                responses: {
                    200: {
                        description: 'Branch updated',
                        content: { "application/json": { schema: publicBranchSchema } }
                    }
                }
            }
        },

        // === Menus ===
        '/branches/{id}/menu': {
            post: {
                summary: 'Create menu with items',
                security: [{ bearerAuth: [] }],
                "x-roles": ["restaurant_owner"],
                requestBody: {
                    content: { 'application/json': { schema: createMenuSchema } }
                },
                responses: {
                    201: {
                        description: 'Menu created',
                        content: { "application/json": { schema: publicMenuSchema } }
                    }
                }
            },
            get: {
                summary: 'Get all menus for a branch',
                responses: {
                    200: {
                        description: 'List of menus',
                        content: { "application/json": { schema: MenuListResponse } }
                    }
                }
            }
        },
        '/branches/{id}/menu/{menu_id}': {
            patch: {
                summary: 'Edit menu (add/delete items)',
                security: [{ bearerAuth: [] }],
                "x-roles": ["restaurant_owner"],
                requestBody: {
                    content: { 'application/json': { schema: editMenuSchema } }
                },
                responses: {
                    200: {
                        description: 'Menu updated',
                        content: { "application/json": { schema: publicMenuSchema } }
                    }
                }
            }
        },
        '/branches/{id}/menu/{menu_id}/active': {
            patch: {
                summary: 'Activate/deactivate menu',
                security: [{ bearerAuth: [] }],
                "x-roles": ["restaurant_owner"],
                requestBody: {
                    content: { 'application/json': { schema: z.object({ active: z.boolean() }) } }
                },
                responses: {
                    200: {
                        description: 'Menu updated',
                        content: { "application/json": { schema: publicMenuSchema } }
                    }
                }
            }
        }
    }
});
