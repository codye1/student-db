import fp from 'fastify-plugin';
import { drizzle } from 'drizzle-orm/mysql2';

async function drizzlePlugin(fastify) {
  if (!fastify.db) {
    throw new Error('MySQL pool must be registered before Drizzle plugin');
  }

  const db = drizzle(fastify.db);
  fastify.decorate('drizzle', db);

}

export default fp(drizzlePlugin, { name: 'drizzle' });
