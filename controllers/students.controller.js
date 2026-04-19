import fs from 'fs/promises';
import path from 'path';
import {
  update,
  findById,
  remove,
} from '../src/repositories/items.repository.js';
import { getImageUrl } from '../helpers/imageUrl.js';
import { findAll, create } from '../src/repositories/items.repository.js';
import { studentsToCsv } from '../helpers/csv.js';
import { parseImportFile } from '../helpers/csvImport.js';
import studentCreateBodySchema from '../schemas/studentCreateBodySchema.js';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import studentsQuerySchema from '../schemas/studentsQuerySchema.js';
import studentParamsSchema from '../schemas/studentParamsSchema.js';
import studentPatchBodySchema from '../schemas/studentPatchBodySchema.js';
import { STUDENT_NOT_FOUND } from '../constants/errors.js';
import {
  getExternalCourseDetails,
  getFallbackCourseDetails,
} from '#services/externalReference.service';

const studentResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    name: { type: 'string' },
    grades: { type: 'array', items: { type: 'integer' } },
    course: { type: 'integer' },
    image: { type: 'string' },
  },
};

const studentsListResponseSchema = {
  type: 'array',
  items: studentResponseSchema,
};

const studentsPaginatedQuerySchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    page: {
      type: 'integer',
      minimum: 1,
    },
    limit: {
      type: 'integer',
      minimum: 1,
      maximum: 100,
    },
    course: {
      type: 'integer',
      minimum: 1,
    },
  },
};

const studentsPaginatedResponseSchema = {
  type: 'object',
  properties: {
    data: studentsListResponseSchema,
    meta: {
      type: 'object',
      properties: {
        total: { type: 'integer' },
        page: { type: 'integer' },
        limit: { type: 'integer' },
        totalPages: { type: 'integer' },
      },
    },
  },
};

const expelledResponseSchema = {
  type: 'object',
  properties: {
    message: { type: 'string' },
    student: studentResponseSchema,
  },
};

const errorResponseSchema = {
  type: 'object',
  properties: {
    error: { type: 'string' },
  },
};

const itemDetailsResponseSchema = {
  type: 'object',
  properties: {
    id: { anyOf: [{ type: 'integer' }, { type: 'string' }] },
    name: { type: 'string' },
    age: { type: 'integer' },
    group: { type: 'string' },
    email: { type: ['string', 'null'], nullable: true },
    grades: { type: 'array', items: { type: 'integer' } },
    course: { type: 'integer' },
    image: { type: ['string', 'null'], nullable: true },
    courseDetails: {
      type: 'object',
      properties: {
        id: { anyOf: [{ type: 'integer' }, { type: 'null' }] },
        name: { anyOf: [{ type: 'string' }, { type: 'null' }] },
        credits: { anyOf: [{ type: 'integer' }, { type: 'null' }] },
      },
    },
  },
};

export const studentRoutes = [
  {
    method: 'POST',
    url: '/students/:id/image',
    schema: {
      tags: ['Students'],
      summary: 'Upload student image',
      params: studentParamsSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            image: { type: ['string', 'null'], nullable: true },
          },
        },
        400: errorResponseSchema,
        404: errorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { id } = request.params;
      const student = await findById(id);
      if (!student) {
        return reply.code(404).send({ error: STUDENT_NOT_FOUND(id) });
      }

      const data = await request.file();
      if (!data) return reply.badRequest('No file uploaded');
      if (!['image/jpeg', 'image/png'].includes(data.mimetype)) {
        return reply.badRequest('Only images allowed');
      }
      if (data.file.truncated) {
        return reply.badRequest('File too large');
      }
      const ext = data.mimetype === 'image/png' ? '.png' : '.jpg';
      const uploadDir = path.join(process.cwd(), 'uploads', id);
      await fs.mkdir(uploadDir, { recursive: true });
      const filePath = path.join(uploadDir, `image${ext}`);
      const relPath = `/${id}/image${ext}`;
      const stream = data.file;
      const { createWriteStream } = await import('fs');
      await new Promise((resolve, reject) => {
        const writeStream = createWriteStream(filePath);
        stream.pipe(writeStream);
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });
      await update(id, { image: relPath });
      reply.code(200).send({
        image: getImageUrl({ ...student, image: relPath }, request),
      });
    },
  },
  {
    method: 'POST',
    url: '/students/import',
    schema: {
      tags: ['Students'],
      summary: 'Import students from CSV or JSON file',
      response: {
        200: {
          type: 'object',
          properties: {
            imported: { type: 'integer' },
            rejected: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  index: { type: 'integer' },
                  reason: { type: 'string' },
                },
              },
            },
          },
        },
        400: errorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const data = await request.file();
      if (!data) return reply.badRequest('No file uploaded');
      let items;
      try {
        items = parseImportFile(
          await data.toBuffer(),
          data.filename,
          data.mimetype
        );
      } catch {
        return reply.badRequest('Invalid file format');
      }
      const ajv = new Ajv({ allErrors: true });
      addFormats(ajv);
      const validate = ajv.compile(studentCreateBodySchema);
      let imported = 0;
      const rejected = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (validate(item)) {
          await create(item);
          imported++;
        } else {
          rejected.push({
            index: i + 1,
            reason: ajv.errorsText(validate.errors),
          });
        }
      }
      reply.code(200).send({ imported, rejected });
    },
  },
  {
    method: 'GET',
    url: '/students/export',
    schema: {
      tags: ['Students'],
      summary: 'Export students as CSV',
      response: {
        200: { type: 'string' },
      },
    },
    handler: async (request, reply) => {
      const items = await findAll();
      // Формування повного URL для image
      const getImageUrl = (item) =>
        item.image
          ? `${request.protocol}://${request.hostname}/uploads${item.image}`
          : '';
      const csv = studentsToCsv(items, getImageUrl);
      reply.header('Content-Type', 'text/csv');
      reply.header(
        'Content-Disposition',
        'attachment; filename="students.csv"'
      );
      reply.code(200).send(csv);
    },
  },
  {
    method: 'GET',
    url: '/students',
    schema: {
      tags: ['Students'],
      summary: 'Get students list',
      querystring: studentsQuerySchema,
      response: {
        200: studentsListResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { course } = request.query;
      const students = await findAll();
      const filtered =
        course !== undefined
          ? students.filter((s) => s.course === course)
          : students;
      reply.code(200).send(filtered);
    },
  },
  {
    method: 'GET',
    url: '/items/:id/details',
    schema: {
      tags: ['Students'],
      summary: 'Get item details enriched by external courses service',
      params: studentParamsSchema,
      response: {
        200: itemDetailsResponseSchema,
        404: errorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { id } = request.params;
      const item = await findById(id);

      if (!item) {
        return reply.code(404).send({ error: STUDENT_NOT_FOUND(id) });
      }

      try {
        const courseDetails = await getExternalCourseDetails(item.course);
        return reply.code(200).send({
          ...item,
          courseDetails,
        });
      } catch {
        return reply.code(200).send({
          ...item,
          courseDetails: getFallbackCourseDetails(),
        });
      }
    },
  },
  {
    method: 'POST',
    url: '/students',
    schema: {
      tags: ['Students'],
      summary: 'Create student',
      body: studentCreateBodySchema,
      response: {
        201: studentResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { name, grades, course, email } = request.body;
      const student = await create({
        name: name.trim(),
        grades,
        course,
        email,
      });
      reply.code(201).send(student);
    },
  },
  {
    method: 'PATCH',
    url: '/students/:id',
    schema: {
      tags: ['Students'],
      summary: 'Update student by id',
      params: studentParamsSchema,
      body: studentPatchBodySchema,
      response: {
        200: studentResponseSchema,
        404: errorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { id } = request.params;
      const patch = {};
      if (request.body.name !== undefined)
        patch.name = request.body.name.trim();
      if (request.body.grades !== undefined) patch.grades = request.body.grades;
      if (request.body.course !== undefined) patch.course = request.body.course;
      if (request.body.email !== undefined) patch.email = request.body.email;
      const student = await findById(id);
      if (!student) {
        return reply.code(404).send({ error: STUDENT_NOT_FOUND(id) });
      }
      const updated = await update(id, patch);
      reply.code(200).send(updated);
    },
  },
  {
    method: 'DELETE',
    url: '/students/:id',
    schema: {
      tags: ['Students'],
      summary: 'Delete student by id',
      params: studentParamsSchema,
      response: {
        200: expelledResponseSchema,
        404: errorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { id } = request.params;
      const student = await findById(id);
      if (!student) {
        return reply.code(404).send({ error: STUDENT_NOT_FOUND(id) });
      }
      await remove(id);
      reply.code(200).send({
        message: `Student "${student.name}" has been expelled`,
        student,
      });
    },
  },
];

export const studentRoutesV2 = [
  {
    method: 'GET',
    url: '/students',
    schema: {
      tags: ['Students'],
      summary: 'Get students list with pagination',
      querystring: studentsPaginatedQuerySchema,
      response: {
        200: studentsPaginatedResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const page = Number(request.query.page ?? 1);
      const limit = Number(request.query.limit ?? 10);
      const { course } = request.query;

      const students = await findAll();
      const filtered =
        course !== undefined
          ? students.filter((student) => student.course === course)
          : students;

      const total = filtered.length;
      const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
      const offset = (page - 1) * limit;

      return reply.code(200).send({
        data: filtered.slice(offset, offset + limit),
        meta: {
          total,
          page,
          limit,
          totalPages,
        },
      });
    },
  },
];
