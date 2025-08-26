import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const swaggerDefinition = {
    openapi: '3.0.0',
    info: {
        title: 'Mi API',
        version: '1.0.0',
        description: 'Documentación generada automáticamente con Swagger',
    },
};

const options = {
    swaggerDefinition,
    apis: [
        path.join(__dirname, '../routes/*.js'),
        path.join(__dirname, '../schemas/*.js'),
    ],
};

const swaggerSpec = swaggerJSDoc(options);

export default (app) => {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};
