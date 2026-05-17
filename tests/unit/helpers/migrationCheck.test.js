import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { checkMigration } from '../../../src/helpers/migrationCheck.js';
import fs from 'node:fs/promises';

vi.mock('node:fs/promises');

describe('checkMigration', () => {
  let fastify;

  beforeEach(() => {
    fastify = {
      db: { query: vi.fn() },
      log: { warn: vi.fn() },
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ✅ вже є
  it('warns when db is missing', async () => {
    fastify.db = null;
    await checkMigration(fastify);
    expect(fastify.log.warn).toHaveBeenCalledWith('Database connection is not available');
  });

  // journal.entries — не масив → повертає 0 → рання return
  it('returns early when journal has no entries array', async () => {
    fs.readFile.mockResolvedValue(JSON.stringify({ entries: 'not-an-array' }));
    await checkMigration(fastify);
    expect(fastify.db.query).not.toHaveBeenCalled();
  });

  // journal.entries — порожній масив → повертає 0 → рання return
  it('returns early when journal entries is empty', async () => {
    fs.readFile.mockResolvedValue(JSON.stringify({ entries: [] }));
    await checkMigration(fastify);
    expect(fastify.db.query).not.toHaveBeenCalled();
  });

  // readFile кидає помилку → getGeneratedMigrationCount повертає 0 → рання return
  it('returns early when journal file cannot be read', async () => {
    fs.readFile.mockRejectedValue(new Error('File not found'));
    await checkMigration(fastify);
    expect(fastify.db.query).not.toHaveBeenCalled();
  });

  // таблиця __drizzle_migrations не існує
  it('warns when migrations table does not exist', async () => {
    fs.readFile.mockResolvedValue(JSON.stringify({ entries: [1, 2] }));
    fastify.db.query.mockResolvedValueOnce([[]]); // SHOW TABLES → порожній результат

    await checkMigration(fastify);

    expect(fastify.log.warn).toHaveBeenCalledWith(
      expect.stringContaining('Drizzle migrations table not found')
    );
  });

  // усі міграції застосовані — warn не викликається
  it('does not warn when all migrations are applied', async () => {
    fs.readFile.mockResolvedValue(JSON.stringify({ entries: [1, 2] }));
    fastify.db.query
      .mockResolvedValueOnce([[{ Tables_in_db: '__drizzle_migrations' }]]) // SHOW TABLES
      .mockResolvedValueOnce([[{ count: '2' }]]);                          // COUNT

    await checkMigration(fastify);

    expect(fastify.log.warn).not.toHaveBeenCalled();
  });

  // appliedCount < expectedCount → попереджає про pending
  it('warns when there are pending migrations', async () => {
    fs.readFile.mockResolvedValue(JSON.stringify({ entries: [1, 2, 3] }));
    fastify.db.query
      .mockResolvedValueOnce([[{ Tables_in_db: '__drizzle_migrations' }]]) // SHOW TABLES
      .mockResolvedValueOnce([[{ count: '1' }]]);                          // COUNT

    await checkMigration(fastify);

    expect(fastify.log.warn).toHaveBeenCalledWith(
      expect.stringContaining('pending Drizzle migrations')
    );
  });

  // rows?.[0]?.count — nullish → appliedCount = 0
  it('treats missing count as 0 and warns about pending migrations', async () => {
    fs.readFile.mockResolvedValue(JSON.stringify({ entries: [1] }));
    fastify.db.query
      .mockResolvedValueOnce([[{ Tables_in_db: '__drizzle_migrations' }]])
      .mockResolvedValueOnce([[null]]); // rows[0] = null → ?. дає undefined → ?? 0

    await checkMigration(fastify);

    expect(fastify.log.warn).toHaveBeenCalledWith(
      expect.stringContaining('pending Drizzle migrations')
    );
  });

  // db.query кидає виняток → catch → warn
  it('warns when db.query throws an error', async () => {
    fs.readFile.mockResolvedValue(JSON.stringify({ entries: [1] }));
    fastify.db.query.mockRejectedValue(new Error('DB error'));

    await checkMigration(fastify);

    expect(fastify.log.warn).toHaveBeenCalledWith(
      expect.stringContaining('Drizzle migrations table not found')
    );
  });
});