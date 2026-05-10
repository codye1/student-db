import argon2 from 'argon2';
import { eq } from 'drizzle-orm';
import { users } from '../db/schema.js';

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

export const createAuthService = ({ db }) => {
  const findUserByEmail = async (email) => {
    const normalizedEmail = normalizeEmail(email);
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);
    return rows.length ? rows[0] : null;
  };

  const findUserById = async (id) => {
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.id, Number(id)))
      .limit(1);
    return rows.length ? rows[0] : null;
  };

  const createUser = async ({ email, password }) => {
    const normalizedEmail = normalizeEmail(email);
    const passwordHash = await argon2.hash(password);
    const result = await db
      .insert(users)
      .values({ email: normalizedEmail, password: passwordHash })
      .$returningId();
    const created = Array.isArray(result) ? result[0] : result;
    const id = created?.id ?? created;
    return { id: Number(id), email: normalizedEmail };
  };

  const verifyPassword = async (hash, password) => {
    return argon2.verify(hash, password);
  };

  return {
    findUserByEmail,
    findUserById,
    createUser,
    verifyPassword,
  };
};
