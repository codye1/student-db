import fp from 'fastify-plugin';
import fastifyRedis from '@fastify/redis';

async function redisPlugin(fastify) {
  const { REDIS_HOST, REDIS_PORT } = fastify.config;

  await fastify.register(fastifyRedis, {
    host: REDIS_HOST,
    port: Number(REDIS_PORT),
    connectTimeout: 2000,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
  });

  fastify.addHook('onClose', async (instance) => {
    if (instance.redis) {
      await instance.redis.quit();
    }
  });
}

export default fp(redisPlugin, { name: 'redis' });
