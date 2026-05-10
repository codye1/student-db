import argon2 from 'argon2';
import { createAuthService } from '#services/auth.service';
import authRegisterBodySchema from '../schemas/authRegisterBodySchema.js';
import authLoginBodySchema from '../schemas/authLoginBodySchema.js';
import {
  findUserByEmail,
  createUser,
} from '../src/repositories/users.repository.js';

const userResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    email: { type: 'string' },
  },
};

const errorResponseSchema = {
  type: 'object',
  properties: {
    error: { type: 'string' },
  },
};

const authService = createAuthService({
  usersRepository: {
    findByEmail: findUserByEmail,
    create: createUser,
  },
  argon2,
});

const saveSession = (request) =>
  new Promise((resolve, reject) => {
    request.session.save((err) => (err ? reject(err) : resolve()));
  });

const destroySession = (request) =>
  new Promise((resolve, reject) => {
    request.session.destroy((err) => (err ? reject(err) : resolve()));
  });

export const buildAuthRoutes = () => [
  {
    method: 'POST',
    url: '/auth/register',
    schema: {
      tags: ['Auth'],
      summary: 'Register a new user',
      body: authRegisterBodySchema,
      response: {
        201: userResponseSchema,
        409: errorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      try {
        const user = await authService.register(request.body);
        return reply.code(201).send(user);
      } catch (error) {
        if (error.statusCode === 409) {
          return reply.code(409).send({ error: error.message });
        }
        throw error;
      }
    },
  },
  {
    method: 'POST',
    url: '/auth/login',
    schema: {
      tags: ['Auth'],
      summary: 'Login and create session',
      body: authLoginBodySchema,
      response: {
        200: userResponseSchema,
        401: errorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const user = await authService.login(request.body);
      if (!user) {
        return reply.code(401).send({ error: 'Invalid credentials' });
      }

      request.session.user = user;
      await saveSession(request);
      return reply.code(200).send(user);
    },
  },
  {
    method: 'POST',
    url: '/auth/logout',
    schema: {
      tags: ['Auth'],
      summary: 'Logout and destroy session',
      response: {
        204: { type: 'null' },
      },
    },
    handler: async (request, reply) => {
      await destroySession(request);
      return reply.code(204).send();
    },
  },
];
