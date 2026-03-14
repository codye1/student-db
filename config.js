import ajv from '#validators/ajv';
import configSchema from '#validators/configSchema';
import formatAjvErrors from '#validators/formatAjvErrors';

const validateConfig = ajv.compile(configSchema);

try {
  process.loadEnvFile('.env');
} catch {
  process.stderr.write(
    '[CONFIG] No .env file found, using environment variables.\n'
  );
}

const runtimeConfig = {
  PORT: Number(process.env.PORT),
  HOSTNAME: process.env.HOSTNAME?.trim(),
  NODE_ENV: process.env.NODE_ENV,
};

if (!validateConfig(runtimeConfig)) {
  formatAjvErrors(validateConfig.errors).forEach((error) => {
    process.stderr.write(`[CONFIG ERROR] ${error}\n`);
  });
  process.exit(1);
}

export default {
  PORT: runtimeConfig.PORT,
  HOSTNAME: runtimeConfig.HOSTNAME,
  NODE_ENV: runtimeConfig.NODE_ENV,
};
