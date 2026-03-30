import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import ItemModel from '../models/item.model.js';

const VERSION_FILE = path.join(process.cwd(), 'data', 'version.json');

async function getModelHash() {
  const modelStr = JSON.stringify(ItemModel);
  return crypto.createHash('md5').update(modelStr).digest('hex');
}

export async function checkMigration(fastify) {
  const modelHash = await getModelHash();
  let version = { hash: null };
  try {
    const versionContent = await fs.readFile(VERSION_FILE, 'utf8');
    version = JSON.parse(versionContent);
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
  if (version.hash !== modelHash) {
    fastify.log.warn(
      'Data schema changed. Run "npm run migrate" to update existing files.'
    );
  }
}
