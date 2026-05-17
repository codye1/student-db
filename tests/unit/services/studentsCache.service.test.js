import { describe, expect, it, vi } from 'vitest';
import { createStudentsCacheService } from '../../../services/studentsCache.service.js';

const redisKeys = {
  studentsV2List: ({ page, limit, course }) => `students:${page}:${limit}:${course}`,
  studentsV2ListPrefix: () => 'students:',
};

describe('studentsCache.service', () => {
  it('returns null when redis is not available', async () => {
    const service = createStudentsCacheService({ redis: null, redisKeys });
    await expect(service.getStudentsPage({ page: 1, limit: 10 })).resolves.toBeNull();
  });

  it('stores and reads cached students list', async () => {
    const redis = {
      get: vi.fn(async () => JSON.stringify({ data: [] })),
      set: vi.fn(async () => 'OK'),
    };

    const service = createStudentsCacheService({ redis, redisKeys });
    await service.setStudentsPage({ page: 1, limit: 10 }, { data: [] });
    const cached = await service.getStudentsPage({ page: 1, limit: 10 });

    expect(redis.set).toHaveBeenCalled();
    expect(cached).toEqual({ data: [] });
  });

  it('invalidates cache by scanning keys', async () => {
    const redis = {
      scan: vi
        .fn()
        .mockResolvedValueOnce(['1', ['students:1:10:']])
        .mockResolvedValueOnce(['0', []]),
      del: vi.fn(async () => 1),
    };

    const service = createStudentsCacheService({ redis, redisKeys });
    await service.invalidateStudentsCache();

    expect(redis.scan).toHaveBeenCalled();
    expect(redis.del).toHaveBeenCalledWith(['students:1:10:']);
  });
});
