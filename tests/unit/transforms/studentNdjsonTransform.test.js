import { Readable } from 'stream';
import { describe, expect, it } from 'vitest';
import StudentNdjsonTransform from '../../../src/transforms/studentNdjsonTransform.js';

const collectStream = async (stream) => {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return chunks.join('');
};

describe('StudentNdjsonTransform', () => {
  it('serializes items to ndjson lines', async () => {
    const source = Readable.from([{ id: 1, name: 'Alex' }]);
    const result = await collectStream(source.pipe(new StudentNdjsonTransform()));

    expect(result).toBe('{"id":1,"name":"Alex"}\n');
  });
});
