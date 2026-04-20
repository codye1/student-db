import { studentRoutes, studentRoutesV2 } from '#controllers/students.controller';
import { githubRoutesV1, githubRoutesV2 } from '#controllers/github.controller';

export default async function router(fastify) {
  const registerRoutes = (instance, routes) => {
    for (const route of routes) {
      instance.route(route);
    }
  };

  const v1Routes = async (instance) => {
    instance.route({
      method: 'GET',
      url: '/health',
      schema: {
        tags: ['System'],
        summary: 'Health check endpoint',
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
            },
          },
        },
      },
      handler: async () => ({ status: 'ok' }),
    });

    instance.route({
      method: 'GET',
      url: '/health/details',
      schema: {
        tags: ['System'],
        summary: 'Detailed health diagnostics',
        response: {
          200: {
            type: 'object',
            properties: {
              pid: { type: 'integer' },
              nodeVersion: { type: 'string' },
              platform: { type: 'string' },
              uptime: { type: 'number' },
              memoryUsage: { type: 'object' },
            },
          },
          401: {
            type: 'object',
            properties: {
              statusCode: { type: 'integer' },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
      onRequest: (request, reply, done) => {
        const apiKey = request.headers['x-api-key'];
        if (!apiKey || apiKey !== instance.config.ADMIN_API_KEY) {
          return reply.unauthorized('Invalid or missing API key');
        }
        done();
      },
      handler: async () => ({
        pid: process.pid,
        nodeVersion: process.version,
        platform: process.platform,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
      }),
    });

    // Students routes
    registerRoutes(instance, studentRoutes);
    registerRoutes(instance, githubRoutesV1);
  };

  const v2Routes = async (instance) => {
    const v2BaseRoutes = studentRoutes.filter(
      (route) => !(route.method === 'GET' && route.url === '/students')
    );

    registerRoutes(instance, v2BaseRoutes);
    registerRoutes(instance, studentRoutesV2);
    registerRoutes(instance, githubRoutesV2);
  };

  await fastify.register(v1Routes, { prefix: '/api/v1' });
  await fastify.register(v2Routes, { prefix: '/api/v2' });
}
