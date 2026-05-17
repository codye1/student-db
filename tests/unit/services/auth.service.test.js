import { describe, expect, it, vi } from 'vitest';

vi.mock('argon2', () => ({
  default: {
    hash: vi.fn(async () => 'hashed'),
    verify: vi.fn(async () => true),
  },
}));

import argon2 from 'argon2';
import { createAuthService } from '../../../services/auth.service.js';

describe('auth.service', () => {
  it('returns null when user not found by email', async () => {
    const db = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [],
          }),
        }),
      }),
    };

    const service = createAuthService({ db });
    await expect(service.findUserByEmail('test@example.com')).resolves.toBeNull();
  });

  it('creates user with normalized email', async () => {
    let insertValues;
    const db = {
      insert: () => ({
        values: (data) => {
          insertValues = data;
          return {
            $returningId: async () => [{ id: 7 }],
          };
        },
      }),
    };

    const service = createAuthService({ db });
    const user = await service.createUser({ email: ' TEST@EXAMPLE.com ', password: 'pass' });

    expect(argon2.hash).toHaveBeenCalledWith('pass');
    expect(insertValues.email).toBe('test@example.com');
    expect(user).toEqual({ id: 7, email: 'test@example.com' });
  });

  it('verifies password via argon2', async () => {
    const db = {};
    const service = createAuthService({ db });
    await service.verifyPassword('hash', 'pass');

    expect(argon2.verify).toHaveBeenCalledWith('hash', 'pass');
  });
});
