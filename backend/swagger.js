import swaggerJSDoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Smart Tourism Indonesia API',
      version: '1.0.0',
      description: 'Dokumentasi API untuk Smart Tourism Indonesia — ITechno Cup 2026',
    },
    servers: [
      { url: 'http://localhost:4000', description: 'Local development' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  // semua file yang isinya komentar @swagger akan dibaca dari sini
  apis: ['./router/*.js', './controllers/*.js'],
};

export const swaggerSpec = swaggerJSDoc(options);