import { getSharedReposV1, getSharedReposV2 } from '#services/github.service';

const githubQuerySchema = {
  type: 'object',
  required: ['repo'],
  additionalProperties: false,
  properties: {
    repo: {
      type: 'string',
      pattern: '^[^/\\s]+/[^/\\s]+$',
    },
  },
};

const githubSharedReposResponseSchema = {
  type: 'object',
  properties: {
    repo: { type: 'string' },
    variant: { type: 'string' },
    totalContributors: { type: 'integer' },
    analyzedContributors: { type: 'integer' },
    relatedRepos: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          fullName: { type: 'string' },
          sharedContributors: { type: 'integer' },
          url: { anyOf: [{ type: 'string' }, { type: 'null' }] },
        },
      },
    },
  },
};

const errorSchema = {
  type: 'object',
  properties: {
    error: { type: 'string' },
  },
};

const buildHandler = (serviceMethod) => {
  return async (request, reply) => {
    try {
      const result = await serviceMethod(
        request.query.repo,
        request.server.config.GITHUB_TOKEN
      );

      return reply.code(200).send(result);
    } catch (error) {
      if (error.statusCode === 400) {
        return reply.code(400).send({ error: error.message });
      }

      if (error.isRateLimit) {
        return reply.code(429).send({
          error:
            'GitHub API rate limit exceeded. Add GITHUB_TOKEN to .env and retry.',
        });
      }

      return reply.code(502).send({
        error: 'Failed to fetch analytics from GitHub API',
      });
    }
  };
};

export const githubRoutesV1 = [
  {
    method: 'GET',
    url: '/github/shared-repos',
    schema: {
      tags: ['GitHub'],
      summary: 'Shared contributors analytics via GitHub REST API',
      querystring: githubQuerySchema,
      response: {
        200: githubSharedReposResponseSchema,
        400: errorSchema,
        429: errorSchema,
        502: errorSchema,
      },
    },
    handler: buildHandler(getSharedReposV1),
  },
];

export const githubRoutesV2 = [
  {
    method: 'GET',
    url: '/github/shared-repos',
    schema: {
      tags: ['GitHub'],
      summary: 'Shared contributors analytics via alternative GitHub REST flow',
      querystring: githubQuerySchema,
      response: {
        200: githubSharedReposResponseSchema,
        400: errorSchema,
        429: errorSchema,
        502: errorSchema,
      },
    },
    handler: buildHandler(getSharedReposV2),
  },
];
