import Ajv from 'ajv';

const ajv = new Ajv({
  allErrors: true,
  coerceTypes: true,
});

export default ajv;
