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

describe('auth endpoints', () => {
  it('rejects login with invalid credentials', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'missing@example.com', password: 'badpass' },
    });

    expect(response.statusCode).toBe(401);
  });

  it('logs in and issues refresh token cookie', async () => {
    const payload = { email: 'login@example.com', password: 'pass1234' };
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload,
    });

    const login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload,
    });

    expect(login.statusCode).toBe(200);
    expect(login.headers['set-cookie']).toBeDefined();
    expect(JSON.parse(login.payload)).toHaveProperty('accessToken');
  });

    it('rejects refresh without cookie', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
    });

    expect(response.statusCode).toBe(401);
  });

  it('logs out and blacklists access token', async () => {
    const payload = { email: 'logout@example.com', password: 'pass1234' };
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload,
    });

    const login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload,
    });

    const { accessToken } = JSON.parse(login.payload);

    const logout = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      headers: {
        authorization: `Bearer ${accessToken}`,
        cookie: Array.isArray(login.headers['set-cookie'])
          ? login.headers['set-cookie'][0]
          : login.headers['set-cookie'],
      },
    });

    expect(logout.statusCode).toBe(204);
  });
});
