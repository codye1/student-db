import ItemModel from '../models/item.model.js';
const TABLE_NAME = 'students';
let repository = null;

function normalizeRow(row) {
  if (!row) return row;
  const normalized = { ...row };
  if (Buffer.isBuffer(normalized.grades)) {
    normalized.grades = normalized.grades.toString('utf8');
  }
  if (typeof normalized.grades === 'string') {
    try {
      normalized.grades = JSON.parse(normalized.grades);
    } catch {
      normalized.grades = [];
    }
  }
  if (!Array.isArray(normalized.grades)) {
    normalized.grades = [];
  }
  return normalized;
}

export function createItemsRepository(db) {
  const repo = {
    findAll: async () => {
      const [rows] = await db.query(`SELECT * FROM ${TABLE_NAME} ORDER BY id`);
      return rows.map(normalizeRow);
    },
    iterateAll: async function* () {
      const [rows] = await db.query(`SELECT * FROM ${TABLE_NAME} ORDER BY id`);
      for (const row of rows) {
        yield normalizeRow(row);
      }
    },
    findById: async (id) => {
      const [rows] = await db.query(
        `SELECT * FROM ${TABLE_NAME} WHERE id = ? LIMIT 1`,
        [id]
      );
      return rows.length ? normalizeRow(rows[0]) : null;
    },
    create: async (data) => {
      const item = { ...ItemModel, ...data };
      const grades = JSON.stringify(item.grades ?? []);
      const [result] = await db.query(
        `INSERT INTO ${TABLE_NAME}
        (name, age, \`group\`, email, grades, course, image, test)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.name,
          item.age,
          item.group,
          item.email,
          grades,
          item.course,
          item.image,
          item.test,
        ]
      );
      return {
        ...item,
        id: Number(result.insertId),
        grades: item.grades ?? [],
      };
    },
    update: async (id, changes) => {
      const current = await repo.findById(id);
      if (!current) throw new Error('Not found');
      const updated = { ...current, ...changes };
      const grades = JSON.stringify(updated.grades ?? []);
      await db.query(
        `UPDATE ${TABLE_NAME}
        SET name = ?, age = ?, \`group\` = ?, email = ?, grades = ?, course = ?, image = ?, test = ?
        WHERE id = ?`,
        [
          updated.name,
          updated.age,
          updated.group,
          updated.email,
          grades,
          updated.course,
          updated.image,
          updated.test,
          id,
        ]
      );
      return updated;
    },
    remove: async (id) => {
      const [result] = await db.query(
        `DELETE FROM ${TABLE_NAME} WHERE id = ?`,
        [id]
      );
      return result.affectedRows > 0;
    },
  };
  return repo;
}

export function initItemsRepository(db) {
  repository = createItemsRepository(db);
}

function getRepository() {
  if (!repository) {
    throw new Error('Items repository is not initialized');
  }
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
