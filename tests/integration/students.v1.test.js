import { beforeAll, beforeEach, afterAll, describe, expect, it, vi } from 'vitest';
import {
  buildTestApp,
  createStudent,
  registerAndLogin,
    buildMultipartBody,
  resetState,
} from '../helpers/testApp.js';

let app;

const baseStudent = {
  name: 'Alex',
  age: 20,
  group: 'A1',
  course: 2,
  grades: [5, 4],
  email: 'alex@example.com',
};

beforeAll(async () => {
  app = await buildTestApp();
});

beforeEach(async () => {
  await resetState(app);
});

afterAll(async () => {
  if (app) {
    await app.close();
  }
});

describe('students v1 endpoints', () => {
  it('rejects protected endpoints without auth', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/students',
      payload: baseStudent,
    });

    expect(response.statusCode).toBe(401);
  });

  it('creates and lists students', async () => {
    const { accessToken } = await registerAndLogin(app, {
      email: 'create@example.com',
      password: 'pass1234',
    });

    const created = await createStudent(app, { token: accessToken, student: baseStudent });

    const list = await app.inject({ method: 'GET', url: '/api/v1/students' });

    expect(created).toEqual(expect.objectContaining({ name: 'Alex', course: 2 }));
    expect(JSON.parse(list.payload).length).toBe(1);
  });

  it('filters students by course', async () => {
    const { accessToken } = await registerAndLogin(app, {
      email: 'filter@example.com',
      password: 'pass1234',
    });

    await createStudent(app, { token: accessToken, student: baseStudent });
    await createStudent(app, {
      token: accessToken,
      student: { ...baseStudent, name: 'Dana', course: 3 },
    });

    const list = await app.inject({
      method: 'GET',
      url: '/api/v1/students?course=3',
    });

    const payload = JSON.parse(list.payload);
    expect(payload).toHaveLength(1);
    expect(payload[0].course).toBe(3);
  });

  it('streams students as ndjson', async () => {
    const { accessToken } = await registerAndLogin(app, {
      email: 'stream@example.com',
      password: 'pass1234',
    });

    await createStudent(app, { token: accessToken, student: baseStudent });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/students/stream',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('application/x-ndjson');
    expect(response.payload).toContain('\n');
  });


  it('returns item details with external course data', async () => {
    const { accessToken } = await registerAndLogin(app, {
      email: 'details@example.com',
      password: 'pass1234',
    });

    const created = await createStudent(app, { token: accessToken, student: baseStudent });

    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: 2, name: 'Math', credits: 3 }],
    });

    vi.stubGlobal('fetch', fetchMock);

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/items/${created.id}/details`,
    });

    const payload = JSON.parse(response.payload);
    expect(payload.courseDetails).toEqual({ id: 2, name: 'Math', credits: 3 });
  });


  it('updates student when authorized', async () => {
    const { accessToken } = await registerAndLogin(app, {
      email: 'update@example.com',
      password: 'pass1234',
    });

    const created = await createStudent(app, { token: accessToken, student: baseStudent });

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/students/${created.id}`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { name: 'Updated' },
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.payload).name).toBe('Updated');
  });

  it('returns 404 for missing student update', async () => {
    const { accessToken } = await registerAndLogin(app, {
      email: 'update-missing@example.com',
      password: 'pass1234',
    });

    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/students/9999',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { name: 'Updated' },
    });

    expect(response.statusCode).toBe(404);
  });

  it('deletes student when authorized', async () => {
    const { accessToken } = await registerAndLogin(app, {
      email: 'delete@example.com',
      password: 'pass1234',
    });

    const created = await createStudent(app, { token: accessToken, student: baseStudent });

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/v1/students/${created.id}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
  });

  it('returns 404 when deleting missing student', async () => {
    const { accessToken } = await registerAndLogin(app, {
      email: 'delete-missing@example.com',
      password: 'pass1234',
    });

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/v1/students/9999',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(404);
  });

  it('rejects student image upload without file', async () => {
    const { accessToken } = await registerAndLogin(app, {
      email: 'image-empty@example.com',
      password: 'pass1234',
    });

    const created = await createStudent(app, { token: accessToken, student: baseStudent });
    const { boundary, payload } = buildMultipartBody({});

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/students/${created.id}/image`,
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload,
    });

    expect(response.statusCode).toBe(500);
  });

  it('rejects student image upload with invalid type', async () => {
    const { accessToken } = await registerAndLogin(app, {
      email: 'image-invalid@example.com',
      password: 'pass1234',
    });

    const created = await createStudent(app, { token: accessToken, student: baseStudent });

    const { boundary, payload } = buildMultipartBody({
      files: [
        {
          fieldName: 'file',
          filename: 'notes.txt',
          contentType: 'text/plain',
          content: 'plain text',
        },
      ],
    });

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/students/${created.id}/image`,
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload,
    });

    expect(response.statusCode).toBe(500);
  });

  it('rejects student import without file', async () => {
    const { accessToken } = await registerAndLogin(app, {
      email: 'import-empty@example.com',
      password: 'pass1234',
    });

    const { boundary, payload } = buildMultipartBody({});

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/students/import',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload,
    });

    expect(response.statusCode).toBe(500);
  });

  it('rejects student import with invalid format', async () => {
    const { accessToken } = await registerAndLogin(app, {
      email: 'import-invalid@example.com',
      password: 'pass1234',
    });

    const { boundary, payload } = buildMultipartBody({
      files: [
        {
          fieldName: 'file',
          filename: 'students.txt',
          contentType: 'text/plain',
          content: 'not a valid import file',
        },
      ],
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/students/import',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload,
    });

    expect(response.statusCode).toBe(500);
  });

});
