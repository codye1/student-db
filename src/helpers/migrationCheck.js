import path from 'path';
import crypto from 'crypto';
import fs from 'fs/promises';

const SCHEMA_FILE = path.join(process.cwd(), 'db', 'schema.sql');

async function getSchemaHash() {
  const schemaSql = await fs.readFile(SCHEMA_FILE, 'utf8');
  return crypto.createHash('md5').update(schemaSql).digest('hex');
}

export async function checkMigration(fastify) {
  const schemaHash = await getSchemaHash();
  let storedHash = null;

  try {
    const [rows] = await fastify.db.query(
      'SELECT hash FROM migrations ORDER BY id DESC LIMIT 1'
    );
    storedHash = rows.length ? rows[0].hash : null;
  } catch (error) {
    fastify.log.warn(
      'Migrations table not found. Run "npm run migrate" to initialize schema.'
    );
    return;
  }

  if (storedHash !== schemaHash) {
    fastify.log.warn(
      'Data schema changed. Run "npm run migrate" to record the new schema hash.'
    );
  }
}
