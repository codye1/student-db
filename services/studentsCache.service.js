const STUDENTS_CACHE_TTL_SEC = 24 * 60 * 60;

export const createStudentsCacheService = ({ redis, redisKeys }) => {
  const getStudentsPage = async ({ page, limit, course }) => {
    if (!redis) return null;
    try {
      const key = redisKeys.studentsV2List({ page, limit, course });
      const raw = await redis.get(key);
      if (!raw) return null;
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    } catch {
      return null;
    }
  };

  const setStudentsPage = async ({ page, limit, course }, payload) => {
    if (!redis) return;
    try {
      const key = redisKeys.studentsV2List({ page, limit, course });
      await redis.set(key, JSON.stringify(payload), 'EX', STUDENTS_CACHE_TTL_SEC);
    } catch {
      return;
    }
  };

  const invalidateStudentsCache = async () => {
    if (!redis) return;
    try {
      const prefix = redisKeys.studentsV2ListPrefix();
      let cursor = '0';

      do {
        const [nextCursor, keys] = await redis.scan(
          cursor,
          'MATCH',
          `${prefix}*`,
          'COUNT',
          100
        );
        if (Array.isArray(keys) && keys.length) {
          await redis.del(keys);
        }
        cursor = nextCursor;
      } while (cursor !== '0');
    } catch {
      return;
    }
  };

  return {
    getStudentsPage,
    setStudentsPage,
    invalidateStudentsCache,
  };
};
