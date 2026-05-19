import fs from 'fs/promises';
import path from 'path';
import Fastify from 'fastify';
import fastifyEnv from '@fastify/env';
import mysql from 'mysql2/promise';
import { createApp } from '../../appFactory.js';
import envSchema from '../../src/config/envSchema.js';

const STUDENTS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS students (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  age INT NOT NULL,
  \`group\` VARCHAR(50) NOT NULL,
  email VARCHAR(255) NULL,
  grades JSON NOT NULL,
  course INT NOT NULL,
  image VARCHAR(255) NULL,
  test VARCHAR(255) DEFAULT ''
);
`;

const USERS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL
);
`;

const ENV_PATH = path.join(process.cwd(), '.env.test');

const loadTestConfig = async () => {
  const app = Fastify({ logger: false });
  await app.register(fastifyEnv, {
    schema: envSchema,
    dotenv: { path: ENV_PATH },
  });
  await app.ready();

  try {
    return { ...app.config };
  } finally {
    await app.close();
  }
};

const ensureDatabase = async (config) => {
  try {
    const connection = await mysql.createConnection({
      host: config.MYSQL_HOST,
      port: Number(config.MYSQL_PORT || 3306),
      user: config.MYSQL_USER,
      password: config.MYSQL_PASSWORD,
    });

    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${config.MYSQL_DB}\``
    );
    await connection.end();
  } catch (error) {
    const message = String(error?.message || error);
    throw new Error(
      `Failed to connect to MySQL. Update MYSQL_USER/MYSQL_PASSWORD in .env.test or set env vars. Original error: ${message}`,
      { cause: error }
    );
  }
};

const ensureSchema = async (app) => {
  await app.db.query(STUDENTS_TABLE_SQL);
  await app.db.query(USERS_TABLE_SQL);
};

export const buildTestApp = async () => {
  const config = await loadTestConfig();
  await ensureDatabase(config);

  const app = await createApp({
    logger: false,
    envFile: '.env.test',
    skipStartupTasks: true,
  });
  await app.ready();
  try {
    if (app.redis) {
      await app.redis.ping();
    }
  } catch (error) {
    const message = String(error?.message || error);
    throw new Error(
      `Failed to connect to Redis. Ensure the test Redis instance is running. Original error: ${message}`,
      { cause: error }
    );
  }
  await ensureSchema(app);
  await fs.mkdir(path.join(process.cwd(), 'uploads'), { recursive: true });
  return app;
};

export const resetState = async (app) => {
  await app.db.query('DELETE FROM students');
  await app.db.query('DELETE FROM users');
  if (app.redis) {
    await app.redis.flushdb();
  }
};

export const registerAndLogin = async (app, { email, password }) => {
  await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: { email, password },
  });

  const loginResponse = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email, password },
  });

  const body = JSON.parse(loginResponse.payload);
  const cookie = loginResponse.headers['set-cookie'];

  return {
    accessToken: body.accessToken,
    refreshCookie: Array.isArray(cookie) ? cookie[0] : cookie,
  };
};

export const createStudent = async (app, { token, student }) => {
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/students',
    headers: {
      authorization: `Bearer ${token}`,
    },
    payload: student,
  });

  return JSON.parse(response.payload);
};

export const buildMultipartBody = ({ fields = {}, files = [] }) => {
  const boundary = `----student-db-${Date.now()}`;
  const lines = [];

  for (const [name, value] of Object.entries(fields)) {
    lines.push(`--${boundary}`);
    lines.push(`Content-Disposition: form-data; name="${name}"`);
    lines.push('');
    lines.push(String(value));
  }

  for (const file of files) {
    lines.push(`--${boundary}`);
    lines.push(
      `Content-Disposition: form-data; name="${file.fieldName}"; filename="${file.filename}"`
    );
    lines.push(`Content-Type: ${file.contentType}`);
    lines.push('');
    lines.push(file.content);
  }

  lines.push(`--${boundary}--`);
  lines.push('');

  return {
    boundary,
    payload: Buffer.from(lines.join('\r\n')),
  };
};
