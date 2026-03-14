const studentCreateBodySchema = {
  type: 'object',
  required: ['name', 'course', 'grades'],
  additionalProperties: false,
  properties: {
    name: {
      type: 'string',
      minLength: 1,
      pattern: '\\S',
    },
    course: {
      type: 'integer',
      minimum: 1,
      maximum: 6,
    },
    grades: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'integer',
        minimum: 1,
        maximum: 5,
      },
    },
  },
};

export default studentCreateBodySchema;
