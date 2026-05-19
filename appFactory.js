import Fastify from 'fastify';
import fastifyEnv from '@fastify/env';
import { backupData } from './src/helpers/backup.js';
import { checkMigration } from './src/helpers/migrationCheck.js';
import envSchema from './src/config/envSchema.js';
import router from './router.js';
import fastifyStatic from '@fastify/static';
import path from 'path';
import fastifySensible from '@fastify/sensible';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyMultipart from '@fastify/multipart';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import fastifyWebsocket from '@fastify/websocket';
import fastifyJwt from '@fastify/jwt';
import fastifyCookie from '@fastify/cookie';
import mysqlPlugin from './db/mysql.js';
import { initItemsRepository } from './src/repositories/items.repository.js';
import redisPlugin from './src/plugins/redis.js';
import { redisKeys } from './constants/redisKeys.js';

export const createApp = async ({
  logger = false,
  envFile,
  skipStartupTasks = false,
} = {}) => {
  const fastify = Fastify({ logger });

  const dotenv =
    envFile === false ? false : envFile ? { path: envFile } : true;
  await fastify.register(fastifyEnv, {
    schema: envSchema,
    dotenv,
  });

  await fastify.register(mysqlPlugin);
  const drizzlePlugin = await import('./db/drizzle.js');
  await fastify.register(drizzlePlugin.default);
  initItemsRepository(fastify.drizzle);

  if (!skipStartupTasks) {
    await checkMigration(fastify);
    await backupData();
  }

  await fastify.register(fastifySensible);
  await fastify.register(redisPlugin);
  await fastify.register(fastifyCookie);
  await fastify.register(fastifyJwt, {
    secret: fastify.config.JWT_SECRET,
    trusted: async (request, decodedToken) => {
      const jti = decodedToken?.jti;
      if (!jti) return false;
      try {
        const key = redisKeys.authAccessBlacklist(jti);
        const blacklisted = await fastify.redis.get(key);
        return !blacklisted;
      } catch (error) {
        request.log.error(error, 'JWT blacklist check failed');
        return false;
      }
    },
  });

  await fastify.register(fastifyRateLimit, {
    global: true,
    redis: fastify.redis,
    max: 100,
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: 'Rate limit exceeded',
    }),
  });

  await fastify.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'Student Database API',
        description: 'REST API for students service',
        version: '1.0.0',
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'Authorization: Bearer <token>',
          },
        },
      },
    },
  });

  await fastify.register(fastifySwaggerUi, {
    routePrefix: '/docs',
  });

  await fastify.register(fastifyHelmet, { global: true });
  await fastify.register(fastifyMultipart, {
    limits: { fileSize: 5 * 1024 * 1024 },
  });

  const isDev = fastify.config.NODE_ENV === 'development';
  await fastify.register(fastifyCors, {
    origin: isDev ? '*' : 'https://your-production-domain.com',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  });

  await fastify.register(fastifyWebsocket);

  // Rely on Fastify's default onClose behavior; avoid noisy stdout during tests.

  fastify.setErrorHandler((error, request, reply) => {
    fastify.log.error(error);
    reply
      .status(500)
      .send({ error: 'Internal server error', details: error.message });
  });

  await fastify.register(fastifyStatic, {
    root: path.join(process.cwd(), 'uploads'),
    prefix: '/uploads/',
  });

  await fastify.register(router);

  // Use the default Fastify close behavior; temporary debug wrapper removed.

  return fastify;
};
