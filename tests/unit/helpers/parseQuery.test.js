import { describe, expect, it } from 'vitest';
import parseQuery from '../../../helpers/parseQuery.js';

describe('parseQuery', () => {
  it('returns empty object when query is missing', () => {
    expect(parseQuery('/students')).toEqual({});
  });

  it('parses query parameters into object', () => {
    expect(parseQuery('/students?course=2&name=Alex')).toEqual({
      course: '2',
      name: 'Alex',
    });
  });
});
