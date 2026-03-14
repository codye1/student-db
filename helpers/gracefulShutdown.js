const gracefulShutdown = (signal, server) => {
  process.stdout.write(
    `\n[SHUTDOWN] Received ${signal}. Closing HTTP server...\n`
  );

  const forceExit = setTimeout(() => {
    process.stderr.write('[SHUTDOWN] Timeout exceeded (10s). Forcing exit.\n');
    process.exit(1);
  }, 10_000);

  server.close((err) => {
    clearTimeout(forceExit);
    if (err) {
      process.stderr.write(
        `[SHUTDOWN] Error while closing server: ${err.message}\n`
      );
      process.exit(1);
    }
    process.stdout.write('[SHUTDOWN] Server closed gracefully.\n');
    process.exit(0);
  });
};

module.exports = gracefulShutdown;
