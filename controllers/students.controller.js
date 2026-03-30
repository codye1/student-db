import fs from 'fs/promises';
import path from 'path';
import {
  update,
  findById,
  remove,
} from '../src/repositories/items.repository.js';
import { getImageUrl } from '../helpers/imageUrl.js';

// ...existing code...
import { findAll, create } from '../src/repositories/items.repository.js';
import { studentsToCsv } from '../helpers/csv.js';
import { parseImportFile } from '../helpers/csvImport.js';
import studentCreateBodySchema from '../schemas/studentCreateBodySchema.js';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import fastifyMultipart from '@fastify/multipart';
import studentsQuerySchema from '../schemas/studentsQuerySchema.js';
import studentParamsSchema from '../schemas/studentParamsSchema.js';
import studentPatchBodySchema from '../schemas/studentPatchBodySchema.js';
import { STUDENT_NOT_FOUND } from '../constants/errors.js';

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
    method: 'POST',
    url: '/students/:id/image',
    handler: async (request, reply) => {
      const { id } = request.params;
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
      // Оновлюємо поле image у файлі студента
      const student = await findById(id);
      if (!student) return reply.notFound('Student not found');
      await update(id, { image: relPath });
      reply.send({
        image: getImageUrl({ ...student, image: relPath }, request),
      });
    },
  },
  {
    method: 'POST',
    url: '/students/import',
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
      reply.send({ imported, rejected });
    },
  },
  {
    method: 'GET',
    url: '/students/export',
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
      reply.send(csv);
    },
  },
  {
    method: 'GET',
    url: '/students',
    schema: {
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
    method: 'POST',
    url: '/students',
    schema: {
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
      params: studentParamsSchema,
      body: studentPatchBodySchema,
      response: {
        200: studentResponseSchema,
        404: { type: 'object', properties: { error: { type: 'string' } } },
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
      if (!student) return reply.notFound(STUDENT_NOT_FOUND(id));
      const updated = await update(id, patch);
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
    handler: async (request, reply) => {
      const { id } = request.params;
      const student = await findById(id);
      if (!student) return reply.notFound(STUDENT_NOT_FOUND(id));
      await remove(id);
      reply.code(200).send({
        message: `Student "${student.name}" has been expelled`,
        student,
      });
    },
  },
];
