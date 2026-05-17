import fp from 'fastify-plugin';
import fastifyRedis from '@fastify/redis';

async function redisPlugin(fastify) {
  const { REDIS_HOST, REDIS_PORT, REDIS_DB } = fastify.config;

  await fastify.register(fastifyRedis, {
    host: REDIS_HOST,
    port: Number(REDIS_PORT),
    db: Number(REDIS_DB || 0),
    connectTimeout: 2000,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
  });

  // Do not surface Redis client errors to stdout during tests; log at debug level.
  if (fastify.redis && typeof fastify.redis.on === 'function') {
    fastify.redis.on('error', (err) => {
      fastify.log.debug({ err }, 'Redis client error');
    });
  }

  fastify.addHook('onClose', async (instance) => {
    if (instance.redis) {
      try {
        if (typeof instance.redis.disconnect === 'function') {
          instance.redis.disconnect();
        } else if (typeof instance.redis.quit === 'function') {
          await instance.redis.quit();
        }
      } catch (err) {
        fastify.log.warn(err, 'Error while closing Redis client');
      }
    }
  });
}

export default fp(redisPlugin, { name: 'redis' });
