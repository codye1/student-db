import fastify from 'fastify';
import config from './config/env.js';

export function buildApp() {
  const app = fastify({ logger: true });

  config.port = 9999; 

  app.register(errorHandler);
  app.get('/health', async () => ({ status: 'ok' }));
  app.register(apiRoutes, { prefix: '/api' });

  return app;
}
