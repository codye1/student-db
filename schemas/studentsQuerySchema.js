export default {
  type: 'object',
  additionalProperties: false,
  properties: {
    course: {
      type: 'integer',
      minimum: 1,
    },
  },
};
