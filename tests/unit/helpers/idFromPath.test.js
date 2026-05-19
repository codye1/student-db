import { describe, expect, it } from 'vitest';
import idFromPath from '../../../helpers/idFromPath.js';

describe('idFromPath', () => {
  it('returns id for valid students path', () => {
    expect(idFromPath('/students/123')).toBe('123');
  });

  it('returns null for non-matching path', () => {
    expect(idFromPath('/students/123/extra')).toBeNull();
  });
});
