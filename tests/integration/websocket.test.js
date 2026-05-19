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

describe('websocket endpoint', () => {
  it('rejects non-upgrade requests', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/students/ws',
    });

    expect([400, 404, 426]).toContain(response.statusCode);
  });
});
