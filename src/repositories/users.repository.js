import { users } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

let repository = null;

export function createUsersRepository(db) {
  const repo = {
    findByEmail: async (email) => {
      const rows = await db
        .select()
        .from(users)
        .where(eq(users.email, String(email)))
        .limit(1);
      return rows.length ? rows[0] : null;
    },
    findById: async (id) => {
      const rows = await db
        .select()
        .from(users)
        .where(eq(users.id, Number(id)))
        .limit(1);
      return rows.length ? rows[0] : null;
    },
    create: async ({ email, password }) => {
      const result = await db
        .insert(users)
        .values({ email, password })
        .$returningId();
      const created = Array.isArray(result) ? result[0] : result;
      return {
        id: Number(created.id),
        email,
        password,
      };
    },
  };

  return repo;
}

export function initUsersRepository(db) {
  repository = createUsersRepository(db);
}

function getRepository() {
  if (!repository) throw new Error('Users repository is not initialized');
  return repository;
}

export async function findUserByEmail(email) {
  return getRepository().findByEmail(email);
}

export async function findUserById(id) {
  return getRepository().findById(id);
}

export async function createUser(data) {
  return getRepository().create(data);
}
