import { loadEnv } from './src/helpers/loadEnv.js';
import gracefulShutdown from '#helpers/gracefulShutdown';
import { createApp } from './appFactory.js';

// ─── Fastify server ──────────────────────────────────────────────────────────

let fastify;

const parseEnvFileArg = (argv) => {
  let envFile;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--no-dotenv') {
      envFile = false;
      continue;
    }
    if (arg === '--env-file') {
      envFile = argv[i + 1];
      i += 1;
    }
  }

  return envFile;
};

// Бекап даних перед запуском сервера
(async () => {
  const envFile = parseEnvFileArg(process.argv.slice(2));
  const env = await loadEnv({ envFile });

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

  fastify = await createApp({ logger, envFile });

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
