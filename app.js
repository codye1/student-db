import { createServer } from 'http';
import config from './config.js';
import send from '#helpers/send';
import router from './router.js';
import logRequest from '#helpers/logRequest';
import gracefulShutdown from '#helpers/gracefulShutdown';

// ─── HTTP server ─────────────────────────────────────────────────────────────

const server = createServer(async (req, res) => {
  res.on('finish', () => logRequest(req, res.statusCode));

  try {
    await router(req, res);
  } catch (err) {
    send(res, 500, { error: 'Internal server error', details: err.message });
  }
});

server.listen(config.PORT, config.HOSTNAME, () => {
  process.stdout.write(
    `Student Database API running at http://${config.HOSTNAME}:${config.PORT}\n`
  );
});

// ─── OS signals ──────────────────────────────────────────────────────────────

process.on('SIGINT', () => gracefulShutdown('SIGINT', server));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM', server));

// ─── Global error handlers ───────────────────────────────────────────────────

process.on('uncaughtException', (err) => {
  process.stderr.write(`[UNCAUGHT EXCEPTION] ${err.message}\n${err.stack}\n`);
  gracefulShutdown('uncaughtException', server);
});

process.on('unhandledRejection', (reason) => {
  process.stderr.write(`[UNHANDLED REJECTION] ${reason}\n`);
  gracefulShutdown('unhandledRejection', server);
});
