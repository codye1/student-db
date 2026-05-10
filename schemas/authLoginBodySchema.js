export default {
  type: 'object',
  required: ['email', 'password'],
  additionalProperties: false,
  properties: {
    email: { type: 'string', format: 'email', minLength: 5 },
    password: { type: 'string', minLength: 6 },
  },
};
