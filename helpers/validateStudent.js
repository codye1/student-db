const validateStudent = (body, partial = false) => {
  const errors = [];

  if (!partial || body.name !== undefined) {
    if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
      errors.push('`name` must be a non-empty string');
    }
  }

  if (!partial || body.course !== undefined) {
    if (body.course === undefined || body.course === null) {
      if (!partial) errors.push('`course` is required');
    } else if (!Number.isInteger(body.course) || body.course < 1 || body.course > 6) {
      errors.push('`course` must be an integer between 1 and 6');
    }
  }

  if (!partial || body.grades !== undefined) {
    if (body.grades !== undefined) {
      if (!Array.isArray(body.grades) || body.grades.length === 0) {
        errors.push('`grades` must be a non-empty array');
      } else if (!body.grades.every(g => Number.isInteger(g) && g >= 1 && g <= 5)) {
        errors.push('Each grade must be an integer between 1 and 5');
      }
    } else if (!partial) {
      errors.push('`grades` is required');
    }
  }

  return errors;
}

export default validateStudent;