import { beforeAll, beforeEach, afterAll, describe, expect, it, vi } from 'vitest';
import { buildTestApp, resetState } from '../helpers/testApp.js';

let app;

const buildResponse = ({ ok, status = 200, json, headers = {} }) => ({
  ok,
  status,
  json,
  headers: {
    get: (key) => headers[key.toLowerCase()] ?? null,
  },
});

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

describe('github endpoints', () => {
  it('returns analytics for v1 endpoint', async () => {
    const fetchMock = vi.fn();
    fetchMock
      .mockResolvedValueOnce(
        buildResponse({
          ok: true,
          json: async () => [{ login: 'alice', type: 'User' }],
        })
      )
      .mockResolvedValueOnce(
        buildResponse({
          ok: true,
          json: async () => [
            { repo: { name: 'org/related' } },
            { repo: { name: 'org/related2' } },
          ],
        })
      )
      .mockResolvedValueOnce(
        buildResponse({
          ok: true,
          json: async () => [],
        })
      );

    vi.stubGlobal('fetch', fetchMock);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/github/shared-repos?repo=org/source',
    });

    expect(response.statusCode).toBe(200);
    const payload = JSON.parse(response.payload);
    expect(payload.repo).toBe('org/source');
    expect(payload.relatedRepos.length).toBeGreaterThan(0);
  });

  it('returns rate limit error for v1 endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      buildResponse({
        ok: false,
        status: 403,
        headers: { 'x-ratelimit-remaining': '0' },
        json: async () => ({ message: 'API rate limit exceeded' }),
      })
    );

    vi.stubGlobal('fetch', fetchMock);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/github/shared-repos?repo=org/source',
    });

    expect(response.statusCode).toBe(429);
  });

  it('returns analytics for v2 endpoint', async () => {
    const fetchMock = vi.fn();
    fetchMock
      .mockResolvedValueOnce(
        buildResponse({
          ok: true,
          json: async () => [{ login: 'bob', type: 'User' }],
        })
      )
      .mockResolvedValueOnce(
        buildResponse({
          ok: true,
          json: async () => [
            { full_name: 'org/related', html_url: 'https://github.com/org/related' },
          ],
        })
      )
      .mockResolvedValueOnce(
        buildResponse({
          ok: true,
          json: async () => [],
        })
      );

    vi.stubGlobal('fetch', fetchMock);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v2/github/shared-repos?repo=org/source',
    });

    expect(response.statusCode).toBe(200);
    const payload = JSON.parse(response.payload);
    expect(payload.variant).toBe('v2-rest-alt');
  });
});