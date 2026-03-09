import parseBody from './helpers/parseBody.js';
import parseQuery from './helpers/parseQuery.js';
import validateStudent from './helpers/validateStudent.js';
import idFromPath from './helpers/idFromPath.js';
import send from './helpers/send.js';
import logRequest from './helpers/logRequest.js';

let students = [
  { id: 1, name: 'Ivan', grades: [5, 4, 5], course: 2 },
  { id: 2, name: 'Olena', grades: [4, 4, 3], course: 1 },
  { id: 3, name: 'Mykola', grades: [5, 5, 5], course: 3 },
];

let nextId = 4;


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


  // GET /students  — list, optional ?course=N
  if (method === 'GET' && basePath === '/students') {
    const { course } = parseQuery(url);

    if (course !== undefined) {
      const courseNum = Number(course);
      if (!Number.isInteger(courseNum) || courseNum < 1) {
        return send(res, 400, { error: '`course` query param must be a positive integer' });
      }
      const filtered = students.filter(s => s.course === courseNum);
      return send(res, 200, filtered);
    }

    return send(res, 200, students);
  }

  // POST /students — add new student
  if (method === 'POST' && basePath === '/students') {
    let body;
    try {
      body = await parseBody(req);
    } catch {
      return send(res, 400, { error: 'Invalid JSON body' });
    }

    if (body.id !== undefined) {
      return send(res, 400, { error: '`id` is auto-generated and must not be provided' });
    }

    const errors = validateStudent(body, false);
    if (errors.length) return send(res, 400, { errors });

    const student = {
      id: nextId++,
      name: body.name.trim(),
      grades: body.grades,
      course: body.course,
    };
    students.push(student);
    return send(res, 201, student);
  }

  // PATCH /students/:id — partial update
  if (method === 'PATCH' && idFromPath(basePath) !== null) {
    const id = idFromPath(basePath);
    const index = students.findIndex(s => s.id === id);
    if (index === -1) return send(res, 404, { error: `Student with id=${id} not found` });

    let body;
    try {
      body = await parseBody(req);
    } catch {
      return send(res, 400, { error: 'Invalid JSON body' });
    }

    if (Object.keys(body).length === 0) {
      return send(res, 400, { error: 'Request body must not be empty' });
    }
    if (body.id !== undefined) {
      return send(res, 400, { error: '`id` cannot be updated' });
    }

    const errors = validateStudent(body, true);
    if (errors.length) return send(res, 400, { errors });

    const updated = { ...students[index] };
    if (body.name !== undefined) updated.name = body.name.trim();
    if (body.grades !== undefined) updated.grades = body.grades;
    if (body.course !== undefined) updated.course = body.course;

    students[index] = updated;
    return send(res, 200, updated);
  }

  // DELETE /students/:id — expel student
  if (method === 'DELETE' && idFromPath(basePath) !== null) {
    const id = idFromPath(basePath);
    const index = students.findIndex(s => s.id === id);
    if (index === -1) return send(res, 404, { error: `Student with id=${id} not found` });

    const [removed] = students.splice(index, 1);
    return send(res, 200, { message: `Student "${removed.name}" has been expelled`, student: removed });
  }

  // 404 fallback
  send(res, 404, { error: 'Route not found' });
}

export default router;