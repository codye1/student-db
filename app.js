import Fastify from 'fastify';
import fastifyEnv from '@fastify/env';
import { backupData } from './src/helpers/backup.js';
import { checkMigration } from './src/helpers/migrationCheck.js';
import { loadEnv } from './src/helpers/loadEnv.js';
import envSchema from './src/config/envSchema.js';
import gracefulShutdown from '#helpers/gracefulShutdown';
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
import mysqlPlugin from './db/mysql.js';
import { initItemsRepository } from './src/repositories/items.repository.js';
import redisPlugin from './src/plugins/redis.js';

// ─── Fastify server ──────────────────────────────────────────────────────────

const envOptions = {
  schema: envSchema,
  dotenv: true,
};

let fastify;

// Бекап даних перед запуском сервера
(async () => {
  const env = await loadEnv();

  let logger;
  if (env.NODE_ENV === 'development') {
    logger = {
      level: 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
    };
  } else {
    logger = {
      level: 'error',
    };
  }

  fastify = Fastify({ logger });
  await fastify.register(fastifyEnv, envOptions);
  await fastify.register(mysqlPlugin);
  const drizzlePlugin = await import('./db/drizzle.js');
  await fastify.register(drizzlePlugin.default);
  initItemsRepository(fastify.drizzle);
  await checkMigration(fastify);
  await backupData();
  await fastify.register(fastifySensible);
  await fastify.register(redisPlugin);
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

  fastify.addHook('onClose', async (instance, done) => {
    process.stdout.write('[FASTIFY] Server is closing...\n');
    done();
  });

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

  fastify.listen(
    { port: Number(fastify.config.PORT), host: fastify.config.HOSTNAME },
    (err, address) => {
      if (err) {
        process.stderr.write(`[FASTIFY ERROR] ${err.message}\n`);
        process.exit(1);
      }
      process.stdout.write(`Student Database API running at ${address}\n`);
    }
  );
})().catch((err) => {
  process.stderr.write(`[FASTIFY ENV ERROR] ${err.message}\n`);
  process.exit(1);
});

// ─── OS signals ──────────────────────────────────────────────────────────────

process.on('SIGINT', () => gracefulShutdown('SIGINT', fastify));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM', fastify));

// ─── Global error handlers ───────────────────────────────────────────────────

process.on('uncaughtException', (err) => {
  process.stderr.write(`[UNCAUGHT EXCEPTION] ${err.message}\n${err.stack}\n`);
  gracefulShutdown('uncaughtException', fastify);
});

process.on('unhandledRejection', (reason) => {
  process.stderr.write(`[UNHANDLED REJECTION] ${reason}\n`);
  gracefulShutdown('unhandledRejection', fastify);
});
