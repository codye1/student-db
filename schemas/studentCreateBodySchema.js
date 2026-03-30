export default {
  type: 'object',
  required: ['name', 'course', 'grades'],
  additionalProperties: false,
  properties: {
    name: {
      type: 'string',
      minLength: 1,
      pattern: '\\S',
    },
    age: {
      type: 'integer',
      minimum: 0,
      maximum: 150,
    },
    group: {
      type: 'string',
      minLength: 1,
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
    email: {
      type: ['string', 'null'],
      format: 'email',
      nullable: true,
    },
  },
};
