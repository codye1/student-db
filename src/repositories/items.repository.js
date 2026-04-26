import fs from 'fs/promises';
import path from 'path';
import ItemModel from '../models/item.model.js';

const DATA_DIR = path.join(process.cwd(), 'data', 'items');

// Атомарний запис у файл
export async function writeAtomic(filePath, data) {
  const tmp = `${filePath}.tmp`;
  const dir = path.dirname(filePath);
  try {
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
    await fs.rename(tmp, filePath);
  } catch (error) {
    try {
      await fs.unlink(tmp);
    } catch (unlinkError) {
      if (unlinkError.code !== 'ENOENT') {
        console.error('Failed to cleanup tmp file:', unlinkError);
      }
    }
    throw error;
  }
}

// Зчитати всі файли (findAll)
export async function findAll() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const files = await fs.readdir(DATA_DIR);
  const items = [];
  for (const file of files) {
    if (file.endsWith('.json')) {
      const content = await fs.readFile(path.join(DATA_DIR, file), 'utf8');
      items.push(JSON.parse(content));
    }
  }
  return items;
}

// Потокове проходження по всіх записах без накопичення всього масиву
export async function* iterateAll() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const files = (await fs.readdir(DATA_DIR))
    .filter((file) => file.endsWith('.json'))
    .sort();

  for (const file of files) {
    const content = await fs.readFile(path.join(DATA_DIR, file), 'utf8');
    yield JSON.parse(content);
  }
}

// Зчитати один файл (findById)
export async function findById(id) {
  const filePath = path.join(DATA_DIR, `${id}.json`);
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

// Створити новий запис (create)
export async function create(data) {
  const id = data.id || Date.now().toString();
  const filePath = path.join(DATA_DIR, `${id}.json`);
  const item = { ...ItemModel, ...data, id };
  await writeAtomic(filePath, item);
  return item;
}

// Оновити запис (update)
export async function update(id, changes) {
  const filePath = path.join(DATA_DIR, `${id}.json`);
  const current = await findById(id);
  if (!current) throw new Error('Not found');
  const updated = { ...current, ...changes };
  await writeAtomic(filePath, updated);
  return updated;
}

// Видалити запис (remove)
export async function remove(id) {
  const filePath = path.join(DATA_DIR, `${id}.json`);
  try {
    await fs.unlink(filePath);
    return true;
  } catch (err) {
    if (err.code === 'ENOENT') return false;
    throw err;
  }
}
