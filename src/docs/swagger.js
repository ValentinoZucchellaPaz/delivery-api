import { z } from 'zod';
import { createDocument } from 'zod-openapi';
import {
    PublicUserSchema,
    UserListResponse,
    UserLoginRequest,
    UserRegisterRequest,
    UserRegisterResponse
} from '../modules/user/user.schema.js';

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
        '/users': {
            get: {
                summary: 'Gets all users',
                description: 'Returns a list of all users',
                security: [{ bearerAuth: [] }], // protected endpoint
                "x-roles": ["admin"],
                responses: {
                    200: {
                        description: 'List of users retrieved succesfully',
                        content: {
                            "application/json": { schema: UserListResponse }
                        }
                    },
                },
            },
        },
        '/users/:id': {
            get: {
                summary: 'Gets user by id',
                security: [{ bearerAuth: [] }], // protected endpoint
                "x-roles": ["admin"],
                responses: {
                    200: {
                        description: 'User retrieved succesfully',
                        content: {
                            "application/json": { schema: PublicUserSchema }
                        }
                    },
                },
            },
        },
        '/users/register': {
            post: {
                summary: 'Create user',
                requestBody: {
                    content: {
                        'application/json': { schema: UserRegisterRequest }, // input
                    },
                },
                responses: {
                    201: {
                        description: 'Created',
                        content: {
                            "application/json": { schema: UserRegisterResponse }
                        }
                    },
                },
            },
        },
        'users/login': {
            post: {
                summary: 'Login user',
                description: 'Returns a JWT with the user credentials',
                requestBody: {
                    content: {
                        'application/json': { schema: UserLoginRequest }, // input
                    },
                },
                responses: {
                    201: {
                        description: 'Logged',
                        content: {
                            "application/json": { schema: z.object({ token: z.string() }) }
                        }
                    },
                },
            },
        }
    },
})