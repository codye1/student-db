import { describe, expect, it, vi } from 'vitest';
import {
  createExternalReferenceService,
  getFallbackCourseDetails,
} from '../../../services/externalReference.service.js';

const redisKeys = {
  externalCourses: () => 'external:courses',
};

describe('externalReference.service', () => {
  it('returns cached course details when available', async () => {
    const redis = {
      get: vi.fn(async () => JSON.stringify([{ id: 2, name: 'Math', credits: 3 }])),
      set: vi.fn(),
    };
    const service = createExternalReferenceService({ redis, redisKeys });

    const result = await service.getExternalCourseDetails(2);

    expect(result).toEqual({ id: 2, name: 'Math', credits: 3 });
    expect(redis.set).not.toHaveBeenCalled();
  });

  it('fetches with retry and caches on success', async () => {
    vi.useFakeTimers();
    const redis = {
      get: vi.fn(async () => null),
      set: vi.fn(async () => 'OK'),
    };

    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: '5', name: 'Physics', credits: '4' }],
      });

    vi.stubGlobal('fetch', fetchMock);

    const service = createExternalReferenceService({ redis, redisKeys });
    const promise = service.getExternalCourseDetails(5);

    await vi.runAllTimersAsync();

    const result = await promise;

    expect(fetchMock).toHaveBeenCalled();
    expect(redis.set).toHaveBeenCalled();
    expect(result).toEqual({ id: 5, name: 'Physics', credits: 4 });
    vi.useRealTimers();
  });

  it('returns fallback course details structure', () => {
    expect(getFallbackCourseDetails()).toEqual({
      id: null,
      name: null,
      credits: null,
    });
  });
});
