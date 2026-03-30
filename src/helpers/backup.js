// Бекап даних з data/items/ у data/backups/{timestamp}/, зберігає не більше 5 останніх бекапів
import fs from 'fs/promises';
import path from 'path';

const ITEMS_DIR = path.join(process.cwd(), 'data', 'items');
const BACKUPS_DIR = path.join(process.cwd(), 'data', 'backups');

export async function backupData() {
  await fs.mkdir(BACKUPS_DIR, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(BACKUPS_DIR, timestamp);
  await fs.mkdir(backupDir, { recursive: true });

  // Копіюємо всі файли з items у backupDir
  const files = await fs.readdir(ITEMS_DIR);
  for (const file of files) {
    if (file.endsWith('.json')) {
      await fs.copyFile(path.join(ITEMS_DIR, file), path.join(backupDir, file));
    }
  }

  // Зберігати не більше 5 останніх бекапів
  const backups = (await fs.readdir(BACKUPS_DIR))
    .filter((name) => !name.startsWith('.'))
    .sort();
  if (backups.length > 5) {
    const toDelete = backups.slice(0, backups.length - 5);
    for (const dir of toDelete) {
      await fs.rm(path.join(BACKUPS_DIR, dir), {
        recursive: true,
        force: true,
      });
    }
  }
}
