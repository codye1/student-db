const gracefulShutdown = (signal, fastifyServer) => {
  process.stdout.write(
    `\n[SHUTDOWN] Received ${signal}. Closing Fastify server...\n`
  );

  const forceExit = setTimeout(() => {
    process.stderr.write('[SHUTDOWN] Timeout exceeded (10s). Forcing exit.\n');
    process.exit(1);
  }, 10_000);

  // Fastify server.close() возвращает Promise
  fastifyServer
    .close()
    .then(() => {
      clearTimeout(forceExit);
      process.stdout.write('[SHUTDOWN] Server closed gracefully.\n');
      process.exit(0);
    })
    .catch((err) => {
      clearTimeout(forceExit);
      process.stderr.write(
        `[SHUTDOWN] Error while closing server: ${err.message}\n`
      );
      process.exit(1);
    });
};

export default gracefulShutdown;
