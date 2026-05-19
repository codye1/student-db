import { describe, expect, it } from 'vitest';
import { parseImportFile } from '../../../helpers/csvImport.js';

describe('parseImportFile', () => {
  it('parses JSON payloads', () => {
    const buffer = Buffer.from('[{"name":"A","age":20,"course":1,"grades":[5]}]');
    const result = parseImportFile(buffer, 'students.json', 'application/json');
    expect(result).toHaveLength(1);
    expect(result[0].age).toBe(20);
  });

  it('parses CSV and normalizes numeric fields', () => {
    const csv = 'name,age,course,grades\nAlex,21,2,"[5,4]"';
    const result = parseImportFile(Buffer.from(csv), 'students.csv', 'text/csv');
    expect(result[0].age).toBe(21);
    expect(result[0].course).toBe(2);
    expect(result[0].grades).toEqual([5, 4]);
  });

  it('throws for unsupported file types', () => {
    const buffer = Buffer.from('data');
    expect(() => parseImportFile(buffer, 'file.txt', 'text/plain')).toThrow(
      'Unsupported file type'
    );
  });

  it('falls back when numeric and grades fields are invalid csv values', () => {
    const csv = 'name,age,course,grades\nAlex,not-a-number,foo,"1, 2, x"';
    const result = parseImportFile(Buffer.from(csv), 'students.csv', 'text/csv');

    expect(result[0].age).toBeUndefined();
    expect(result[0].course).toBeUndefined();
    expect(result[0].grades).toEqual([1, 2]);
  });

  it('returns an empty grades array when parsed json grades are not an array', () => {
    const csv = 'name,age,course,grades\nAlex,20,2,"{""value"":5}"';
    const result = parseImportFile(Buffer.from(csv), 'students.csv', 'text/csv');

    expect(result[0].grades).toEqual([]);
  });
});
