const configSchema = {
  type: 'object',
  required: ['PORT', 'HOSTNAME', 'NODE_ENV', 'MONGO_URL', 'MONGO_DB_NAME'],
  additionalProperties: false,
  properties: {
    PORT: {
      type: 'integer',
      minimum: 1,
      maximum: 65535,
    },
    HOSTNAME: {
      type: 'string',
      minLength: 1,
      pattern: '\\S',
    },
    NODE_ENV: {
      type: 'string',
      enum: ['development', 'production'],
    },
    MONGO_URL: {
      type: 'string',
      minLength: 1,
      pattern: '\\S',
    },
    MONGO_DB_NAME: {
      type: 'string',
      minLength: 1,
      pattern: '\\S',
    },
  },
};

export default configSchema;
