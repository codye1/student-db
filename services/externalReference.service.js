const EXTERNAL_COURSES_URL = 'http://127.0.0.1:3001/courses';
const CACHE_TTL_SEC = 120;
const RETRY_DELAYS_MS = [1000, 2000, 4000];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchWithTimeout = async (url, timeoutMs = 5000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
};

const fetchWithRetry = async (url) => {
  let lastError;

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const response = await fetchWithTimeout(url, 5000);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      lastError = error;

      if (attempt === RETRY_DELAYS_MS.length) {
        throw lastError;
      }

      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }

  throw lastError;
};

export const createExternalReferenceService = ({ redis, redisKeys }) => {
  const getCoursesFromCache = async () => {
    if (!redis) return null;
    const raw = await redis.get(redisKeys.externalCourses());
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  };

  const cacheCourses = async (courses) => {
    if (!redis) return;
    await redis.set(
      redisKeys.externalCourses(),
      JSON.stringify(courses),
      'EX',
      CACHE_TTL_SEC
    );
  };

  const getExternalCourseDetails = async (courseId) => {
    const cachedCourses = await getCoursesFromCache();
    const courses = cachedCourses || (await fetchWithRetry(EXTERNAL_COURSES_URL));

    if (!cachedCourses) {
      await cacheCourses(courses);
    }

    const matchedCourse = courses.find(
      (course) => Number(course.id) === Number(courseId)
    );

    const normalizedId =
      matchedCourse?.id === undefined || matchedCourse?.id === null
        ? null
        : Number(matchedCourse.id);
    const normalizedCredits =
      matchedCourse?.credits === undefined || matchedCourse?.credits === null
        ? null
        : Number(matchedCourse.credits);

    return {
      id: Number.isFinite(normalizedId) ? normalizedId : null,
      name: matchedCourse?.name ?? null,
      credits: Number.isFinite(normalizedCredits) ? normalizedCredits : null,
    };
  };

  return { getExternalCourseDetails };
};

export const getFallbackCourseDetails = () => ({
  id: null,
  name: null,
  credits: null,
});
