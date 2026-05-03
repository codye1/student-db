import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import mysql from 'mysql2/promise';
import { loadEnv } from '../helpers/loadEnv.js';

const SCHEMA_FILE = path.join(process.cwd(), 'db', 'schema.sql');

async function getSchemaHash(schemaSql) {
  return crypto.createHash('md5').update(schemaSql).digest('hex');
}

async function migrate() {
  const env = await loadEnv();
  const pool = mysql.createPool({
    host: env.MYSQL_HOST,
    port: Number(env.MYSQL_PORT),
    user: env.MYSQL_USER,
    password: env.MYSQL_PASSWORD,
    database: env.MYSQL_DB,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
    multipleStatements: true,
  });

  try {
    const schemaSql = await fs.readFile(SCHEMA_FILE, 'utf8');
    await pool.query(schemaSql);

    const schemaHash = await getSchemaHash(schemaSql);
    const [rows] = await pool.query(
      'SELECT hash FROM migrations ORDER BY id DESC LIMIT 1'
    );
    const storedHash = rows.length ? rows[0].hash : null;

    if (storedHash === schemaHash) {
      console.log('Міграція не потрібна. Схема не змінилась.');
      return;
    }

    await pool.query('INSERT INTO migrations (hash) VALUES (?)', [schemaHash]);
    console.log('Міграція завершена.');
  } finally {
    await pool.end();
  }
}

migrate().catch((error) => {
  console.error(`[MIGRATION ERROR] ${error.message}`);
  process.exit(1);
});
