import {
  listStudents,
  addStudent,
  updateStudentById,
  deleteStudentById,
} from '#services/students.service';
import studentsQuerySchema from '../schemas/studentsQuerySchema.js';
import studentParamsSchema from '../schemas/studentParamsSchema.js';
import studentCreateBodySchema from '../schemas/studentCreateBodySchema.js';
import studentPatchBodySchema from '../schemas/studentPatchBodySchema.js';
import { STUDENT_NOT_FOUND } from '../constants/errors.js';

// Схемы для ответов
const studentResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    name: { type: 'string' },
    grades: { type: 'array', items: { type: 'integer' } },
    course: { type: 'integer' },
  },
};

const studentsListResponseSchema = {
  type: 'array',
  items: studentResponseSchema,
};

const expelledResponseSchema = {
  type: 'object',
  properties: {
    message: { type: 'string' },
    student: studentResponseSchema,
  },
};

export const studentRoutes = [
  {
    method: 'GET',
    url: '/students',
    schema: {
      querystring: studentsQuerySchema,
      response: {
        200: studentsListResponseSchema,
      },
    },
    handler: (request, reply) => {
      const { course } = request.query;
      const students = listStudents(course);
      reply.code(200).send(students);
    },
  },
  {
    method: 'POST',
    url: '/students',
    schema: {
      body: studentCreateBodySchema,
      response: {
        201: studentResponseSchema,
      },
    },
    handler: (request, reply) => {
      const { name, grades, course } = request.body;
      const student = addStudent({ name: name.trim(), grades, course });
      reply.code(201).send(student);
    },
  },
  {
    method: 'PATCH',
    url: '/students/:id',
    schema: {
      params: studentParamsSchema,
      body: studentPatchBodySchema,
      response: {
        200: studentResponseSchema,
        404: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
    handler: (request, reply) => {
      const { id } = request.params;
      const patch = {};
      if (request.body.name !== undefined)
        patch.name = request.body.name.trim();
      if (request.body.grades !== undefined) patch.grades = request.body.grades;
      if (request.body.course !== undefined) patch.course = request.body.course;
      const updated = updateStudentById(id, patch);
      if (!updated) return reply.notFound(STUDENT_NOT_FOUND(id));
      reply.code(200).send(updated);
    },
  },
  {
    method: 'DELETE',
    url: '/students/:id',
    schema: {
      params: studentParamsSchema,
      response: {
        200: expelledResponseSchema,
        404: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
    handler: (request, reply) => {
      const { id } = request.params;
      const removed = deleteStudentById(id);
      if (!removed) return reply.notFound(STUDENT_NOT_FOUND(id));
      reply.code(200).send({
        message: `Student "${removed.name}" has been expelled`,
        student: removed,
      });
    },
  },
];
