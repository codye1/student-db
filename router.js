import { studentRoutes, studentRoutesV2 } from '#controllers/students.controller';
import { githubRoutesV1, githubRoutesV2 } from '#controllers/github.controller';
import fs from 'fs/promises';
import { createReadStream } from 'fs';
import path from 'path';
import { iterateAll } from './src/repositories/items.repository.js';
import { eventsBus } from './src/helpers/eventsBus.js';

const BACKUPS_DIR = path.join(process.cwd(), 'data', 'backups');

export default async function router(fastify) {
  const sockets = new Set();

  const broadcast = (payload) => {
    const message = JSON.stringify(payload);
    for (const socket of sockets) {
      if (socket.readyState === 1) {
        socket.send(message);
      }
    }
  };

  const onStudentCreated = (data) => {
    broadcast({ event: 'created', data });
  };

  const onStudentUpdated = (data) => {
    broadcast({ event: 'updated', data });
  };

  const onStudentDeleted = ({ id }) => {
    broadcast({ event: 'deleted', id });
  };

  eventsBus.on('students:created', onStudentCreated);
  eventsBus.on('students:updated', onStudentUpdated);
  eventsBus.on('students:deleted', onStudentDeleted);

  fastify.addHook('onClose', async () => {
    eventsBus.off('students:created', onStudentCreated);
    eventsBus.off('students:updated', onStudentUpdated);
    eventsBus.off('students:deleted', onStudentDeleted);
    for (const socket of sockets) {
      socket.close();
    }
    sockets.clear();
  });

  const registerRoutes = (instance, routes) => {
    for (const route of routes) {
      instance.route(route);
    }
  };

  const v1Routes = async (instance) => {
    const requireAdminApiKey = (request, reply, done) => {
      const apiKey = request.headers['x-api-key'];
      if (!apiKey || apiKey !== instance.config.ADMIN_API_KEY) {
        reply.code(401).send({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Invalid or missing API key',
        });
        return;
      }
      done();
    };

    instance.route({
      method: 'GET',
      url: '/health',
      schema: {
        tags: ['System'],
        summary: 'Health check endpoint',
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
            },
          },
        },
      },
      handler: async () => ({ status: 'ok' }),
    });

    instance.route({
      method: 'GET',
      url: '/health/details',
      schema: {
        tags: ['System'],
        summary: 'Detailed health diagnostics',
        response: {
          200: {
            type: 'object',
            properties: {
              pid: { type: 'integer' },
              nodeVersion: { type: 'string' },
              platform: { type: 'string' },
              uptime: { type: 'number' },
              memoryUsage: { type: 'object' },
            },
          },
          401: {
            type: 'object',
            properties: {
              statusCode: { type: 'integer' },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
      onRequest: (request, reply, done) => {
        requireAdminApiKey(request, reply, done);
      },
      handler: async () => ({
        pid: process.pid,
        nodeVersion: process.version,
        platform: process.platform,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
      }),
    });

    instance.route({
      method: 'GET',
      url: '/backups/:timestamp',
      schema: {
        tags: ['System'],
        summary: 'Download backup file by timestamp',
        params: {
          type: 'object',
          required: ['timestamp'],
          properties: {
            timestamp: { type: 'string' },
          },
        },
        response: {
          200: { type: 'string' },
          401: {
            type: 'object',
            properties: {
              statusCode: { type: 'integer' },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
          404: {
            type: 'object',
            properties: {
              statusCode: { type: 'integer' },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
      onRequest: requireAdminApiKey,
      handler: async (request, reply) => {
        const rawTimestamp = String(request.params.timestamp || '');

        // Проста валідація для захисту від path traversal
        if (!/^[0-9TZ\-.]+(\.gz)?$/i.test(rawTimestamp)) {
          return reply.code(400).send({
            statusCode: 400,
            error: 'Bad Request',
            message: 'Invalid backup timestamp format',
          });
        }

        const fileName = rawTimestamp.endsWith('.gz')
          ? rawTimestamp
          : `${rawTimestamp}.gz`;
        const filePath = path.join(BACKUPS_DIR, fileName);

        try {
          const stat = await fs.stat(filePath);
          if (!stat.isFile()) {
            return reply.code(404).send({
              statusCode: 404,
              error: 'Not Found',
              message: 'Backup file not found',
            });
          }
        } catch {
          return reply.code(404).send({
            statusCode: 404,
            error: 'Not Found',
            message: 'Backup file not found',
          });
        }

        reply.type('application/gzip');
        reply.header('Content-Disposition', `attachment; filename="${fileName}"`);
        return reply.send(createReadStream(filePath));
      },
    });

    instance.route({
      method: 'GET',
      url: '/students/ws',
      websocket: true,
      handler: (socket, request) => {
        sockets.add(socket);

        (async () => {
          const data = [];
          for await (const item of iterateAll()) {
            data.push(item);
          }
          if (socket.readyState === 1) {
            socket.send(JSON.stringify({ event: 'snapshot', data }));
          }
        })().catch((error) => {
          request.log.error(error, 'Failed to send websocket snapshot');
        });

        socket.on('close', () => {
          sockets.delete(socket);
        });

        socket.on('error', (error) => {
          request.log.error(error, 'WebSocket connection error');
          sockets.delete(socket);
        });
      },
    });

    // Students routes
    registerRoutes(instance, studentRoutes);
    registerRoutes(instance, githubRoutesV1);
  };

  const v2Routes = async (instance) => {
    const v2BaseRoutes = studentRoutes.filter(
      (route) => !(route.method === 'GET' && route.url === '/students')
    );

    registerRoutes(instance, v2BaseRoutes);
    registerRoutes(instance, studentRoutesV2);
    registerRoutes(instance, githubRoutesV2);
  };

  await fastify.register(v1Routes, { prefix: '/api/v1' });
  await fastify.register(v2Routes, { prefix: '/api/v2' });
}
