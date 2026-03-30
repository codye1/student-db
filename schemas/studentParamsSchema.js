export default {
  type: 'object',
  required: ['id'],
  additionalProperties: false,
  properties: {
    id: {
      type: 'integer',
      minimum: 1,
    },
  },
};
