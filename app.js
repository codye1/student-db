import {createServer} from 'http';
import send from './helpers/send.js';
import router from './router.js';

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

const server = createServer(async (req, res) => {
  try {
    await router(req, res);
  } catch (err) {
    send(res, 500, { error: 'Internal server error', details: err.message });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Student Database API running at http://${HOST}:${PORT}`);
  console.log('');
  console.log('Endpoints:');
  console.log('  GET    /students          — list all students');
  console.log('  GET    /students?course=2 — filter by course');
  console.log('  POST   /students          — add a new student');
  console.log('  PATCH  /students/:id      — partial update');
  console.log('  DELETE /students/:id      — expel student');
});