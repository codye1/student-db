const configSchema = {
  type: 'object',
  required: ['PORT', 'HOSTNAME', 'NODE_ENV'],
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
  },
};

export default configSchema;
