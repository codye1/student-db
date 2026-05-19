import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/repositories/items.repository.js', () => ({
  iterateAll: async function* () {
    yield { id: 1, name: 'Alex' };
    yield { id: 2, name: 'Dana' };
  },
}));

describe('backupData', () => {
  it('writes gzip backup and prunes old files', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'student-db-'));
    const previousCwd = process.cwd();

    try {
      process.chdir(tempDir);

      vi.resetModules();
      const { backupData } = await import('../../../src/helpers/backup.js');

      const backupsDir = path.join(tempDir, 'data', 'backups');
      await fs.mkdir(backupsDir, { recursive: true });

      for (let i = 0; i < 6; i++) {
        const filePath = path.join(backupsDir, `old-${i}.gz`);
        await fs.writeFile(filePath, 'data');
        const time = Date.now() - (i + 1) * 1000;
        await fs.utimes(filePath, time / 1000, time / 1000);
      }

      await backupData();

      const files = await fs.readdir(backupsDir);
      const oldCount = files.filter((name) => name.startsWith('old-')).length;
      const newCount = files.filter((name) => !name.startsWith('old-')).length;

      expect(newCount).toBeGreaterThan(0);
      expect(oldCount).toBeLessThan(6);
      expect(files.length).toBeLessThan(7);
    } finally {
      process.chdir(previousCwd);
    }
  });
});
