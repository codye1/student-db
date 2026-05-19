import { describe, expect, it, vi } from 'vitest';
import { getSharedReposV1 } from '../../../services/github.service.js';

const buildResponse = ({ ok, status = 200, json, headers = {} }) => ({
  ok,
  status,
  json,
  headers: {
    get: (key) => headers[key.toLowerCase()] ?? null,
  },
});

describe('github.service', () => {
  it('rejects invalid repository format', async () => {
    await expect(getSharedReposV1('invalid', '')).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('aggregates shared repos across contributors', async () => {
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
            { repo: { name: 'org/repo1' } },
            { repo: { name: 'org/repo2' } },
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

    const result = await getSharedReposV1('org/source', '');

    expect(result.repo).toBe('org/source');
    expect(result.relatedRepos.length).toBeGreaterThan(0);
  });

  it('marks rate limit errors', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      buildResponse({
        ok: false,
        status: 403,
        headers: { 'x-ratelimit-remaining': '0' },
        json: async () => ({ message: 'API rate limit exceeded' }),
      })
    );

    vi.stubGlobal('fetch', fetchMock);

    await expect(getSharedReposV1('org/source', '')).rejects.toMatchObject({
      isRateLimit: true,
    });
  });
});
