// import swaggerJSDoc from 'swagger-jsdoc';
// import swaggerUi from 'swagger-ui-express';
// import path from 'path';
// import { fileURLToPath } from 'url';

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// const swaggerDefinition = {
//     openapi: '3.0.0',
//     info: {
//         title: 'Mi API',
//         version: '1.0.0',
//         description: 'Documentación generada automáticamente con Swagger',
//     },
// };

// const options = {
//     swaggerDefinition,
//     apis: [
//         path.join(__dirname, '../routes/*.js'),
//         path.join(__dirname, '../schemas/*.js'),
//     ],
// };

// const swaggerSpec = swaggerJSDoc(options);

// export default (app) => {
//     app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
// };


// src/docs/openapi.ts
import * as z from 'zod';
import 'zod-openapi'; // <-- habilita tipos para .meta(...)
import { createDocument } from 'zod-openapi';
import {
    UserListResponseSchema,
    UserLoginRequest,
    UserRegisterRequest,
    UserRegisterResponseSchema
} from '../schemas/requests.js';

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
                            "application/json": { schema: UserListResponseSchema }
                        }
                    },
                },
            },
        },
        'users/register': {
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
                            "application/json": { schema: UserRegisterResponseSchema }
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