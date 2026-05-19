import { beforeAll, beforeEach, afterAll, describe, expect, it } from 'vitest';
import { buildTestApp, resetState } from '../helpers/testApp.js';

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

describe('health endpoints', () => {
  it('returns ok status', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/health' });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.payload)).toEqual({ status: 'ok' });
  });

  it('rejects detailed health without api key', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/health/details',
    });

    expect(response.statusCode).toBe(401);
  });

  it('returns detailed health with api key', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/health/details',
      headers: { 'x-api-key': 'test-admin-key' },
    });

    expect(response.statusCode).toBe(200);
    const payload = JSON.parse(response.payload);
    expect(payload).toEqual(expect.objectContaining({
      pid: expect.any(Number),
      nodeVersion: expect.any(String),
      platform: expect.any(String),
    }));
  });
});
