import { readFileSync } from 'node:fs';

function loadDotEnvSync() {
  try {
    const content = readFileSync('.env', 'utf8');
    const env = {};
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const separatorIndex = trimmed.indexOf('=');
      if (separatorIndex === -1) continue;
      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed
        .slice(separatorIndex + 1)
        .trim()
        .replace(/^['"]|['"]$/g, '');
      env[key] = value;
    }
    return env;
  } catch {
    return {};
  }
}

const env = loadDotEnvSync();
const runtimeEnv = globalThis.process?.env ?? {};
const mergedEnv = { ...env, ...runtimeEnv };

export default {
  dialect: 'mysql',
  schema: './db/schema.js',
  out: './db/migrations',
  dbCredentials: {
    host: mergedEnv.MYSQL_HOST ?? '127.0.0.1',
    port: Number(mergedEnv.MYSQL_PORT ?? 3306),
    user: mergedEnv.MYSQL_USER ?? 'root',
    password: mergedEnv.MYSQL_PASSWORD ?? '',
    database: mergedEnv.MYSQL_DB ?? 'student_db',
  },
};
