
const validationErrors = [];

try {
  process.loadEnvFile('.env');
} catch {
  process.stderr.write('[CONFIG] No .env file found, using environment variables.\n');
  process.exit(1);
}

// --- PORT ---
const rawPort = process.env.PORT;
const PORT = Number(rawPort);
if (!rawPort || !Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  validationErrors.push('PORT must be an integer between 1 and 65535 (got: ' + rawPort + ')');
}

// --- HOSTNAME ---
const HOSTNAME = process.env.HOSTNAME;
if (!HOSTNAME || HOSTNAME.trim() === '') {
  validationErrors.push('HOSTNAME must be a non-empty string (got: ' + HOSTNAME + ')');
}

// --- NODE_ENV ---
const NODE_ENV = process.env.NODE_ENV;
if (!NODE_ENV || !['development', 'production'].includes(NODE_ENV)) {
  validationErrors.push('NODE_ENV must be "development" or "production" (got: ' + NODE_ENV + ')');
}

if (validationErrors.length > 0) {
  validationErrors.forEach(e => process.stderr.write('[CONFIG ERROR] ' + e + '\n'));
  process.exit(1);
}

export default {
  PORT,
  HOSTNAME: HOSTNAME.trim(),
  NODE_ENV,
};
