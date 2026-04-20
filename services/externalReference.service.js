import fs from 'fs/promises';
import path from 'path';

const EXTERNAL_COURSES_URL = 'http://127.0.0.1:3001/courses';
const CACHE_PATH = path.join(
  process.cwd(),
  'data',
  'cache',
  'reference.json'
);
const CACHE_TTL_MS = 120 * 1000;
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

const readCache = async () => {
  try {
    const raw = await fs.readFile(CACHE_PATH, 'utf8');
    if (!raw.trim()) {
      return null;
    }

    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
};

const writeCache = async (data) => {
  await fs.mkdir(path.dirname(CACHE_PATH), { recursive: true });
  await fs.writeFile(
    CACHE_PATH,
    JSON.stringify({
      cachedAt: Date.now(),
      data,
    }),
    'utf8'
  );
};

const getCoursesFromCache = async () => {
  const cache = await readCache();
  if (!cache) return null;

  const isFresh = Date.now() - Number(cache.cachedAt || 0) < CACHE_TTL_MS;
  if (!isFresh) return null;

  return Array.isArray(cache.data) ? cache.data : null;
};

export const getExternalCourseDetails = async (courseId) => {
  const cachedCourses = await getCoursesFromCache();
  const courses = cachedCourses || (await fetchWithRetry(EXTERNAL_COURSES_URL));

  if (!cachedCourses) {
    await writeCache(courses);
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

export const getFallbackCourseDetails = () => ({
  id: null,
  name: null,
  credits: null,
});
