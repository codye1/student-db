import Fastify from 'fastify';
import fastifyEnv from '@fastify/env';
import envSchema from '../config/envSchema.js';

export async function loadEnv() {
  const tempFastify = Fastify();
  await tempFastify.register(fastifyEnv, {
    schema: envSchema,
    dotenv: true,
  });
  await tempFastify.ready();
  const config = tempFastify.config;
  await tempFastify.close();
  return config;
}
