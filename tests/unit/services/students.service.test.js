import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/repositories/items.repository.js', () => ({
  findAll: vi.fn(async () => [
    { id: 1, course: 1 },
    { id: 2, course: 2 },
  ]),
  findById: vi.fn(async (id) => (id === '1' ? { id: 1 } : null)),
  create: vi.fn(async (data) => ({ id: 3, ...data })),
  update: vi.fn(async (id, patch) => ({ id, ...patch })),
  remove: vi.fn(async () => true),
}));

import {
  addStudent,
  deleteStudentById,
  listStudents,
  updateStudentById,
} from '../../../services/students.service.js';
import {
  create as repoCreate,
  findById as repoFindById,
  remove as repoRemove,
  update as repoUpdate,
} from '../../../src/repositories/items.repository.js';

describe('students.service', () => {
  it('filters students by course when provided', async () => {
    const result = await listStudents(1);
    expect(result).toEqual([{ id: 1, course: 1 }]);
  });

  it('creates student via repository', async () => {
    const student = await addStudent({ name: 'Alex' });
    expect(repoCreate).toHaveBeenCalled();
    expect(student.name).toBe('Alex');
  });

  it('returns null when updating missing student', async () => {
    const result = await updateStudentById('999', { name: 'New' });
    expect(result).toBeNull();
    expect(repoUpdate).not.toHaveBeenCalled();
  });

  it('returns null when deleting missing student', async () => {
    const result = await deleteStudentById('999');
    expect(result).toBeNull();
    expect(repoRemove).not.toHaveBeenCalled();
  });

  it('updates existing student', async () => {
    const result = await updateStudentById('1', { name: 'New' });
    expect(repoFindById).toHaveBeenCalledWith('1');
    expect(result.name).toBe('New');
  });
});
