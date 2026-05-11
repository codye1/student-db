const gracefulShutdown = (signal, fastifyInstance) => {
  process.stdout.write(
    `\n[SHUTDOWN] Received ${signal}. Closing Fastify server...\n`
  );

  const forceExit = setTimeout(() => {
    process.stderr.write('[SHUTDOWN] Timeout exceeded (10s). Forcing exit.\n');
    process.exit(1);
  }, 10_000);

  if (!fastifyInstance || typeof fastifyInstance.close !== 'function') {
    clearTimeout(forceExit);
    process.stderr.write('[SHUTDOWN] Fastify instance is not available.\n');
    process.exit(1);
  }

  const onCloseSuccess = () => {
    clearTimeout(forceExit);
    process.stdout.write('[SHUTDOWN] Server closed gracefully.\n');
    process.exit(0);
  };

  const onCloseError = (err) => {
    clearTimeout(forceExit);
    process.stderr.write(
      `[SHUTDOWN] Error while closing server: ${err?.message || err}\n`
    );
    process.exit(1);
  };

  try {
    const result = fastifyInstance.close(onCloseError);
    if (result && typeof result.then === 'function') {
      result.then(onCloseSuccess).catch(onCloseError);
    }
  } catch (err) {
    onCloseError(err);
  }
};

export default gracefulShutdown;
