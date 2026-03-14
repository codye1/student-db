const studentsQuerySchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    course: {
      type: 'integer',
      minimum: 1,
    },
  },
};

module.exports = studentsQuerySchema;
