const REDIS_PREFIX = 'student-db';
const STUDENTS_V2_LIST_PREFIX = `${REDIS_PREFIX}:students:v2:list:`;

export const redisKeys = {
  externalCourses: () => `${REDIS_PREFIX}:external:courses`,
  authAccessBlacklist: (jti) => `${REDIS_PREFIX}:auth:access:blacklist:${jti}`,
  authRefreshToken: (token) => `${REDIS_PREFIX}:auth:refresh:${token}`,
  studentsV2List: ({ page, limit, course }) => {
    const coursePart =
      course === undefined || course === null ? 'all' : String(course);
    return `${STUDENTS_V2_LIST_PREFIX}page:${page}:limit:${limit}:course:${coursePart}`;
  },
  studentsV2ListPrefix: () => STUDENTS_V2_LIST_PREFIX,
};
