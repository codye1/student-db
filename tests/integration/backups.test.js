import fs from 'fs/promises';
import path from 'path';
import { beforeAll, beforeEach, afterAll, describe, expect, it } from 'vitest';
import { buildTestApp, resetState } from '../helpers/testApp.js';

let app;

const BACKUPS_DIR = path.join(process.cwd(), 'data', 'backups');

beforeAll(async () => {
  app = await buildTestApp();
  await fs.mkdir(BACKUPS_DIR, { recursive: true });
});

beforeEach(async () => {
  await resetState(app);
});

afterAll(async () => {
  if (app) {
    await app.close();
  }
});

describe('backup endpoints', () => {
  it('requires admin api key', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/backups/2020-01-01T00-00-00-000Z.gz',
    });

    expect(response.statusCode).toBe(401);
  });

  it('returns 400 for invalid timestamp format', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/backups/bad-timestamp',
      headers: { 'x-api-key': 'test-admin-key' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('returns 404 for missing backup', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/backups/1999-01-01T00-00-00-000Z',
      headers: { 'x-api-key': 'test-admin-key' },
    });

    expect(response.statusCode).toBe(404);
  });

  it('downloads existing backup', async () => {
    const fileName = '2020-01-01T00-00-00-000Z.gz';
    const filePath = path.join(BACKUPS_DIR, fileName);
    await fs.writeFile(filePath, 'data');

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/backups/${fileName}`,
      headers: { 'x-api-key': 'test-admin-key' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toBe('application/gzip');
  });
});
