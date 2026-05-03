import ItemModel from '../models/item.model.js';
import { students } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

let repository = null;

function normalizeRow(row) {
  if (!row) return row;
  const normalized = { ...row };
  if (typeof normalized.grades === 'string') {
    try {
      normalized.grades = JSON.parse(normalized.grades);
    } catch {
      normalized.grades = [];
    }
  }
  if (!Array.isArray(normalized.grades)) normalized.grades = [];
  return normalized;
}

export function createItemsRepository(db) {
  const repo = {
    findAll: async () => {
      const rows = await db.select().from(students).orderBy(students.id);
      return rows.map(normalizeRow);
    },
    iterateAll: async function* () {
      const rows = await db.select().from(students).orderBy(students.id);
      for (const row of rows) yield normalizeRow(row);
    },
    findById: async (id) => {
      const rows = await db
        .select()
        .from(students)
        .where(eq(students.id, Number(id)))
        .limit(1);
      return rows.length ? normalizeRow(rows[0]) : null;
    },
    create: async (data) => {
      const item = { ...ItemModel, ...data };
      const insertData = {
        name: item.name,
        age: item.age,
        group: item.group,
        email: item.email,
        grades: item.grades ?? [],
        course: item.course,
        image: item.image,
        test: item.test,
      };
      const result = await db.insert(students).values(insertData).$returningId();
      const created = Array.isArray(result) ? result[0] : result;
      return {
        ...item,
        id: Number(created.id),
        grades: item.grades ?? [],
      };
    },
    update: async (id, changes) => {
      const current = await repo.findById(id);
      if (!current) throw new Error('Not found');
      const updated = { ...current, ...changes };
      const updateData = {
        name: updated.name,
        age: updated.age,
        group: updated.group,
        email: updated.email,
        grades: updated.grades ?? [],
        course: updated.course,
        image: updated.image,
        test: updated.test,
      };
      await db
        .update(students)
        .set(updateData)
        .where(eq(students.id, Number(id)));
      return updated;
    },
    remove: async (id) => {
      const result = await db.delete(students).where(eq(students.id, Number(id)));
      // drizzle returns { affectedRows } or array; be permissive
      if (result && typeof result === 'object') {
        return result.affectedRows ? result.affectedRows > 0 : true;
      }
      return true;
    },
  };
  return repo;
}

export function initItemsRepository(db) {
  repository = createItemsRepository(db);
}

function getRepository() {
  if (!repository) throw new Error('Items repository is not initialized');
  return repository;
}

export async function findAll() {
  return getRepository().findAll();
}

export async function* iterateAll() {
  for await (const item of getRepository().iterateAll()) {
    yield item;
  }
}

export async function findById(id) {
  return getRepository().findById(id);
}

export async function create(data) {
  return getRepository().create(data);
}

export async function update(id, changes) {
  return getRepository().update(id, changes);
}

export async function remove(id) {
  return getRepository().remove(id);
}
