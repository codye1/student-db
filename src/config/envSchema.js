const envSchema = {
  type: 'object',
  required: [
    'PORT',
    'HOSTNAME',
    'NODE_ENV',
    'ADMIN_API_KEY',
    'SESSION_SECRET',
    'REDIS_HOST',
    'REDIS_PORT',
    'MYSQL_HOST',
    'MYSQL_PORT',
    'MYSQL_USER',
    'MYSQL_PASSWORD',
    'MYSQL_DB',
  ],
  properties: {
    PORT: { type: 'string', default: '3000' },
    HOSTNAME: { type: 'string', default: '127.0.0.1' },
    NODE_ENV: { type: 'string', default: 'development' },
    ADMIN_API_KEY: { type: 'string' },
    SESSION_SECRET: { type: 'string' },
    GITHUB_TOKEN: { type: 'string', default: '' },
    REDIS_HOST: { type: 'string', default: '127.0.0.1' },
    REDIS_PORT: { type: 'string', default: '6379' },
    MYSQL_HOST: { type: 'string', default: '127.0.0.1' },
    MYSQL_PORT: { type: 'string', default: '3306' },
    MYSQL_USER: { type: 'string', default: 'root' },
    MYSQL_PASSWORD: { type: 'string', default: '' },
    MYSQL_DB: { type: 'string', default: 'student_db' },
  },
};

export default envSchema;
