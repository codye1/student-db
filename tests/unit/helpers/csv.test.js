import { describe, expect, it } from 'vitest';
import { studentsToCsv } from '../../../helpers/csv.js';

describe('studentsToCsv', () => {
  it('outputs CSV with image URL when present', () => {
    const csv = studentsToCsv(
      [{ id: 1, name: 'Alex', image: '/1/image.png', grades: [5] }],
      (item) => `https://example.com/uploads${item.image}`
    );

    expect(csv).toContain('id,name,image,grades');
    expect(csv).toContain('https://example.com/uploads/1/image.png');
  });

  it('omits image URL when image is missing', () => {
    const csv = studentsToCsv([{ id: 2, name: 'Sam', image: null, grades: [4] }], () => {
      throw new Error('should not be called');
    });

    expect(csv).toContain('id,name,image,grades');
    expect(csv).toContain('Sam');
    expect(csv).not.toContain('should not be called');
  });
});
