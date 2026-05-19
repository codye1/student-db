import { Readable } from 'stream';
import { describe, expect, it } from 'vitest';
import StudentAvgGradeTransform from '../../../src/transforms/studentAvgGradeTransform.js';

const collectStream = async (stream) => {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return chunks;
};

describe('StudentAvgGradeTransform', () => {
  it('replaces grades with avgGrade', async () => {
    const source = Readable.from([{ id: 1, grades: [4, 2], name: 'Alex' }]);
    const result = await collectStream(source.pipe(new StudentAvgGradeTransform()));

    expect(result[0]).toEqual({ id: 1, name: 'Alex', avgGrade: 3 });
  });

  it('handles missing grades', async () => {
    const source = Readable.from([{ id: 2, name: 'Dana' }]);
    const result = await collectStream(source.pipe(new StudentAvgGradeTransform()));

    expect(result[0].avgGrade).toBe(0);
  });
});
