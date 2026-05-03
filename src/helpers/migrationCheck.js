import fs from 'node:fs/promises';
import path from 'node:path';

const JOURNAL_FILE = path.join(process.cwd(), 'db', 'migrations', 'meta', '_journal.json');

async function getGeneratedMigrationCount() {
  try {
    const content = await fs.readFile(JOURNAL_FILE, 'utf8');
    const journal = JSON.parse(content);
    return Array.isArray(journal.entries) ? journal.entries.length : 0;
  } catch {
    return 0;
  }
}

export async function checkMigration(fastify) {
  try {
    if (!fastify.db) {
      fastify.log.warn('Database connection is not available');
      return;
    }

    const expectedCount = await getGeneratedMigrationCount();
    if (!expectedCount) {
      return;
    }

    const [tableRows] = await fastify.db.query(
      "SHOW TABLES LIKE '__drizzle_migrations'"
    );
    if (!tableRows.length) {
      fastify.log.warn(
        'Drizzle migrations table not found. Run "npm run migrate" to initialize schema.'
      );
      return;
    }

    const [rows] = await fastify.db.query('SELECT COUNT(*) AS count FROM __drizzle_migrations');
    const appliedCount = Number(rows?.[0]?.count ?? 0);

    if (appliedCount < expectedCount) {
      fastify.log.warn(
        'There are pending Drizzle migrations. Run "npm run migrate" before starting the app.'
      );
    }
  } catch {
    fastify.log.warn(
      'Drizzle migrations table not found. Run "npm run migrate" to initialize schema.'
    );
  }
}
