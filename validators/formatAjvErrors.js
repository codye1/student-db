const formatAjvErrors = (errors = []) => {
  return errors.map((error) => {
    if (error.keyword === 'required') {
      return `${error.params.missingProperty} is required`;
    }

    if (error.keyword === 'additionalProperties') {
      return `Unknown field: ${error.params.additionalProperty}`;
    }

    const field = error.instancePath ? error.instancePath.slice(1) : 'value';
    return `${field} ${error.message}`;
  });
};

export default formatAjvErrors;
