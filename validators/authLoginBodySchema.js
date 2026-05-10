const authLoginBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['email', 'password'],
  properties: {
    email: {
      type: 'string',
      minLength: 3,
      format: 'email',
    },
    password: {
      type: 'string',
      minLength: 6,
    },
  },
};

export default authLoginBodySchema;
