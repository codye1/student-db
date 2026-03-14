const parseBody = require('../helpers/parseBody');
const parseQuery = require('../helpers/parseQuery');
const send = require('../helpers/send');
const {
  listStudents,
  addStudent,
  updateStudentById,
  deleteStudentById,
} = require('../services/students.service');
const ajv = require('../validators/ajv');
const formatAjvErrors = require('../validators/formatAjvErrors');
const studentsQuerySchema = require('../validators/studentsQuerySchema');
const studentParamsSchema = require('../validators/studentParamsSchema');
const studentCreateBodySchema = require('../validators/studentCreateBodySchema');
const studentPatchBodySchema = require('../validators/studentPatchBodySchema');

const validateStudentsQuery = ajv.compile(studentsQuerySchema);
const validateStudentParams = ajv.compile(studentParamsSchema);
const validateStudentCreateBody = ajv.compile(studentCreateBodySchema);
const validateStudentPatchBody = ajv.compile(studentPatchBodySchema);

const getStudents = async (req, res) => {
  const query = parseQuery(req.url);

  if (!validateStudentsQuery(query)) {
    return send(res, 400, {
      errors: formatAjvErrors(validateStudentsQuery.errors),
    });
  }

  const { course } = query;
  return send(res, 200, listStudents(course));
};

const createStudent = async (req, res) => {
  let body;
  try {
    body = await parseBody(req);
  } catch {
    return send(res, 400, { error: 'Invalid JSON body' });
  }

  if (!validateStudentCreateBody(body)) {
    return send(res, 400, {
      errors: formatAjvErrors(validateStudentCreateBody.errors),
    });
  }

  const student = addStudent({
    name: body.name.trim(),
    grades: body.grades,
    course: body.course,
  });
  return send(res, 201, student);
};

const patchStudent = async (req, res, id) => {
  const params = { id };
  if (!validateStudentParams(params)) {
    return send(res, 400, {
      errors: formatAjvErrors(validateStudentParams.errors),
    });
  }

  let body;
  try {
    body = await parseBody(req);
  } catch {
    return send(res, 400, { error: 'Invalid JSON body' });
  }

  if (!validateStudentPatchBody(body)) {
    return send(res, 400, {
      errors: formatAjvErrors(validateStudentPatchBody.errors),
    });
  }

  const patch = {};
  if (body.name !== undefined) patch.name = body.name.trim();
  if (body.grades !== undefined) patch.grades = body.grades;
  if (body.course !== undefined) patch.course = body.course;

  const updated = updateStudentById(id, patch);
  if (!updated)
    return send(res, 404, { error: `Student with id=${id} not found` });
  return send(res, 200, updated);
};

const deleteStudent = async (req, res, id) => {
  const params = { id };
  if (!validateStudentParams(params)) {
    return send(res, 400, {
      errors: formatAjvErrors(validateStudentParams.errors),
    });
  }

  const removed = deleteStudentById(id);
  if (!removed)
    return send(res, 404, { error: `Student with id=${id} not found` });

  return send(res, 200, {
    message: `Student "${removed.name}" has been expelled`,
    student: removed,
  });
};

module.exports = {
  getStudents,
  createStudent,
  patchStudent,
  deleteStudent,
};
