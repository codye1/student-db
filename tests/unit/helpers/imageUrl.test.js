import { describe, expect, it } from 'vitest';
import { getImageUrl } from '../../../helpers/imageUrl.js';

describe('getImageUrl', () => {
  it('returns null when image is missing', () => {
    const req = { protocol: 'http', hostname: 'localhost' };
    expect(getImageUrl({ image: null }, req)).toBeNull();
  });

  it('builds absolute image URL', () => {
    const req = { protocol: 'https', hostname: 'example.com' };
    expect(getImageUrl({ image: '/1/image.png' }, req)).toBe(
      'https://example.com/uploads/1/image.png'
    );
  });
});
