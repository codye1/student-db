import Fastify from 'fastify';
import fastifyEnv from '@fastify/env';
import envSchema from '../config/envSchema.js';

export async function loadEnv({ envFile } = {}) {
  const dotenv =
    envFile === false ? false : envFile ? { path: envFile } : true;

  const tempFastify = Fastify();
  await tempFastify.register(fastifyEnv, {
    schema: envSchema,
    dotenv,
  });
  await tempFastify.ready();
  const config = tempFastify.config;
  await tempFastify.close();
  return config;
}
