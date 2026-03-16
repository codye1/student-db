const send = require('#helpers/send');
const idFromPath = require('#helpers/idFromPath');
const {
  getStudents,
  createStudent,
  patchStudent,
  deleteStudent,
} = require('./controllers/students.controller');

const router = async (req, res) => {
  const { method, url } = req;
  const basePath = url.split('?')[0];

  // GET /health
  if (req.method === 'GET' && basePath === '/health') {
    const data = {
      pid: process.pid,
      nodeVersion: process.version,
      platform: process.platform,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
    };
    return send(res, 200, data);
  }

  if (method === 'GET' && basePath === '/students') {
    return getStudents(req, res);
  }

  if (method === 'POST' && basePath === '/students') {
    return createStudent(req, res);
  }

  const studentId = idFromPath(basePath);

  if (method === 'PATCH' && studentId !== null) {
    return patchStudent(req, res, studentId);
  }

  if (method === 'DELETE' && studentId !== null) {
    return deleteStudent(req, res, studentId);
  }

  // 404 fallback
  send(res, 404, { error: 'Route not found' });
};

module.exports = router;
