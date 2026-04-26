import fs from 'fs/promises';
import { createReadStream, createWriteStream } from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { createGzip } from 'zlib';

const ITEMS_DIR = path.join(process.cwd(), 'data', 'items');
const BACKUPS_DIR = path.join(process.cwd(), 'data', 'backups');

async function pruneOldBackups(limit = 5) {
  const entries = await fs.readdir(BACKUPS_DIR, { withFileTypes: true });

  const backups = (
    await Promise.all(
      entries
        .filter((entry) => !entry.name.startsWith('.'))
        .map(async (entry) => {
          const fullPath = path.join(BACKUPS_DIR, entry.name);
          const stats = await fs.stat(fullPath);
          return { fullPath, mtimeMs: stats.mtimeMs };
        })
    )
  ).sort((a, b) => b.mtimeMs - a.mtimeMs);

  if (backups.length <= limit) {
    return;
  }

  for (const backup of backups.slice(limit)) {
    await fs.rm(backup.fullPath, { recursive: true, force: true });
  }
}

export async function backupData() {
  await fs.mkdir(BACKUPS_DIR, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(BACKUPS_DIR, `${timestamp}.gz`);

  const files = (await fs.readdir(ITEMS_DIR))
    .filter((file) => file.endsWith('.json'))
    .sort();

  const source = Readable.from(
    (async function* () {
      for (const file of files) {
        const filePath = path.join(ITEMS_DIR, file);
        for await (const chunk of createReadStream(filePath)) {
          yield chunk;
        }
        yield '\n';
      }
    })()
  );

  await pipeline(source, createGzip(), createWriteStream(backupFile));

  await pruneOldBackups(5);
}
