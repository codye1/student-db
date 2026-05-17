import { beforeAll, beforeEach, afterAll, describe, expect, it } from 'vitest';
import {
  buildTestApp,
  resetState,
} from '../helpers/testApp.js';

let app;

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

describe('students v2 endpoints', () => {
  it('returns paginated list', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v2/students' });

    expect(response.statusCode).toBe(200);
    const payload = JSON.parse(response.payload);
    expect(payload).toEqual(expect.objectContaining({
      data: expect.any(Array),
      meta: expect.any(Object),
    }));
  });
});
