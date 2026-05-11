const studentParamsSchema = {
  type: 'object',
  required: ['id'],
  additionalProperties: false,
  properties: {
    id: {
      anyOf: [
        {
          type: 'integer',
          minimum: 1,
        },
        {
          type: 'string',
          minLength: 1,
        },
      ],
    },
  },
};
export default studentParamsSchema;
