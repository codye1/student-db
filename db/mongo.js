import fp from 'fastify-plugin';
import mongoose from 'mongoose';

async function mongoPlugin(fastify) {
  const { MONGO_URL, MONGO_DB_NAME } = fastify.config;

  try {
    await mongoose.connect(MONGO_URL, { dbName: MONGO_DB_NAME });
  } catch (error) {
    fastify.log.error(error, 'MongoDB connection failed');
    process.exit(1);
  }

  fastify.decorate('db', mongoose.connection);

  fastify.addHook('onClose', async () => {
    await mongoose.connection.close();
  });
}

export default fp(mongoPlugin, { name: 'mongo' });
