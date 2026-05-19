import crypto from 'crypto';
import { createAuthService } from '#services/auth.service';
import authRegisterBodySchema from '#validators/authRegisterBodySchema';
import authLoginBodySchema from '#validators/authLoginBodySchema';
import { redisKeys } from '../constants/redisKeys.js';

const ACCESS_TTL_SECONDS = 60 * 15;
const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 7;
const REFRESH_COOKIE_NAME = 'refreshToken';

const accessTokenResponseSchema = {
  type: 'object',
  properties: {
    accessToken: { type: 'string' },
  },
};

const authUserResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    email: { type: 'string' },
  },
};

const errorResponseSchema = {
  type: 'object',
  properties: {
    statusCode: { type: 'integer' },
    error: { type: 'string' },
    message: { type: 'string' },
  },
};

const requireAuth = async (request, reply) => {
  try {
    await request.jwtVerify();
  } catch {
    return reply.code(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Invalid or missing token',
    });
  }
};

export const buildAuthRoutes = ({ fastify }) => {
  const authService = createAuthService({ db: fastify.drizzle });

  const issueAccessToken = (user) => {
    const jti = crypto.randomUUID();
    const token = fastify.jwt.sign(
      {
        sub: user.id,
        email: user.email,
        jti,
      },
      { expiresIn: ACCESS_TTL_SECONDS }
    );
    return { token, jti };
  };

  const setRefreshToken = async (reply, userId) => {
    const refreshToken = crypto.randomBytes(32).toString('hex');
    await fastify.redis.set(
      redisKeys.authRefreshToken(refreshToken),
      String(userId),
      'EX',
      REFRESH_TTL_SECONDS
    );
    const isProd = fastify.config.NODE_ENV === 'production';
    reply.setCookie(REFRESH_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
      path: '/api/v1/auth',
      maxAge: REFRESH_TTL_SECONDS,
    });
    return refreshToken;
  };

  const clearRefreshToken = async (reply, token) => {
    if (token) {
      await fastify.redis.del(redisKeys.authRefreshToken(token));
    }
    reply.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/v1/auth' });
  };

  return [
    {
      method: 'POST',
      url: '/auth/register',
      schema: {
        tags: ['Auth'],
        summary: 'Register a new user',
        body: authRegisterBodySchema,
        response: {
          201: authUserResponseSchema,
          409: errorResponseSchema,
        },
      },
      handler: async (request, reply) => {
        const { email, password } = request.body;
        const existing = await authService.findUserByEmail(email);
        if (existing) {
          return reply.code(409).send({
            statusCode: 409,
            error: 'Conflict',
            message: 'Email is already registered',
          });
        }
        const user = await authService.createUser({ email, password });
        return reply.code(201).send(user);
      },
    },
    {
      method: 'POST',
      url: '/auth/login',
      schema: {
        tags: ['Auth'],
        summary: 'Login and receive access token',
        body: authLoginBodySchema,
        response: {
          200: accessTokenResponseSchema,
          401: errorResponseSchema,
        },
      },
      handler: async (request, reply) => {
        const { email, password } = request.body;
        const user = await authService.findUserByEmail(email);
        if (!user) {
          return reply.code(401).send({
            statusCode: 401,
            error: 'Unauthorized',
            message: 'Invalid email or password',
          });
        }
        const valid = await authService.verifyPassword(user.password, password);
        if (!valid) {
          return reply.code(401).send({
            statusCode: 401,
            error: 'Unauthorized',
            message: 'Invalid email or password',
          });
        }
        const { token } = issueAccessToken(user);
        await setRefreshToken(reply, user.id);
        return reply.code(200).send({ accessToken: token });
      },
    },
    {
      method: 'POST',
      url: '/auth/refresh',
      schema: {
        tags: ['Auth'],
        summary: 'Refresh access token',
        response: {
          200: accessTokenResponseSchema,
          401: errorResponseSchema,
        },
      },
      handler: async (request, reply) => {
        let refreshToken = request.cookies?.[REFRESH_COOKIE_NAME];
        // Fallback: parse raw cookie header if fastify-cookie didn't populate
        if (!refreshToken && request.headers && request.headers.cookie) {
          const raw = String(request.headers.cookie || '');
          const match = raw.split(';').map((s) => s.trim()).find((p) => p.startsWith(`${REFRESH_COOKIE_NAME}=`));
          if (match) refreshToken = match.split('=')[1];
        }

        if (!refreshToken) {
          return reply.code(401).send({
            statusCode: 401,
            error: 'Unauthorized',
            message: 'Refresh token is missing',
          });
        }

        let userId;
        try {
          userId = await fastify.redis.get(
            redisKeys.authRefreshToken(refreshToken)
          );
        } catch (err) {
          request.log.warn(err, 'Redis get failed during refresh');
          userId = null;
        }

        if (!userId) {
          return reply.code(401).send({
            statusCode: 401,
            error: 'Unauthorized',
            message: 'Refresh token is invalid',
          });
        }
        const user = await authService.findUserById(userId);
        if (!user) {
          await clearRefreshToken(reply, refreshToken);
          return reply.code(401).send({
            statusCode: 401,
            error: 'Unauthorized',
            message: 'User no longer exists',
          });
        }
        const { token } = issueAccessToken(user);
        return reply.code(200).send({ accessToken: token });
      },
    },
    {
      method: 'POST',
      url: '/auth/logout',
      onRequest: requireAuth,
      schema: {
        tags: ['Auth'],
        summary: 'Logout and revoke access token',
        security: [{ bearerAuth: [] }],
        response: {
          204: { type: 'null' },
          401: errorResponseSchema,
        },
      },
      handler: async (request, reply) => {
        const { jti, exp } = request.user || {};
        if (!jti) {
          return reply.code(401).send({
            statusCode: 401,
            error: 'Unauthorized',
            message: 'Invalid access token',
          });
        }
        const now = Math.floor(Date.now() / 1000);
        const ttl = Math.max((exp || now) - now, 1);
        await fastify.redis.set(
          redisKeys.authAccessBlacklist(jti),
          '1',
          'EX',
          ttl
        );
        const refreshToken = request.cookies?.[REFRESH_COOKIE_NAME];
        await clearRefreshToken(reply, refreshToken);
        return reply.code(204).send();
      },
    },
  ];
};
