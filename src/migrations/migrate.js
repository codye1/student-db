import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import ItemModel from '../models/item.model.js';
import { writeAtomic } from '../repositories/items.repository.js';

const ITEMS_DIR = path.join(process.cwd(), 'data', 'items');
const VERSION_FILE = path.join(process.cwd(), 'data', 'version.json');

async function getModelHash() {
  const modelStr = JSON.stringify(ItemModel);
  return crypto.createHash('md5').update(modelStr).digest('hex');
}

async function migrate() {
  const modelHash = await getModelHash();
  let version = { hash: null };
  try {
    const versionContent = await fs.readFile(VERSION_FILE, 'utf8');
    version = JSON.parse(versionContent);
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }

  if (version.hash === modelHash) {
    console.log('Міграція не потрібна. Схема не змінилась.');
    return;
  }

  // Міграція: додаємо відсутні поля з дефолтними значеннями
  await fs.mkdir(ITEMS_DIR, { recursive: true });
  const files = await fs.readdir(ITEMS_DIR);
  for (const file of files) {
    if (file.endsWith('.json')) {
      const filePath = path.join(ITEMS_DIR, file);
      const content = await fs.readFile(filePath, 'utf8');
      const data = JSON.parse(content);
      let changed = false;
      for (const key of Object.keys(ItemModel)) {
        if (!(key in data)) {
          data[key] = ItemModel[key];
          changed = true;
        }
      }
      if (changed) {
        await writeAtomic(filePath, data);
        console.log(`Оновлено: ${file}`);
      }
    }
  }
  // Оновлюємо версію
  await writeAtomic(VERSION_FILE, { hash: modelHash });
  console.log('Міграція завершена.');
}

migrate();
