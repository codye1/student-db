import { studentRoutes } from '#controllers/students.controller';

export default async function router(fastify) {
  fastify.get('/health', async () => ({ status: 'ok' }));

  fastify.route({
    method: 'GET',
    url: '/health/details',
    onRequest: (request, reply, done) => {
      const apiKey = request.headers['x-api-key'];
      if (!apiKey || apiKey !== fastify.config.ADMIN_API_KEY) {
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
  for (const route of studentRoutes) {
    fastify.route(route);
  }
}
