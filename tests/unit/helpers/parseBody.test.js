import { Readable } from 'stream';
import { describe, expect, it } from 'vitest';
import parseBody from '../../../helpers/parseBody.js';

describe('parseBody', () => {
  it('parses JSON body from stream', async () => {
    const req = new Readable({ read() {} });
    const resultPromise = parseBody(req);

    req.push('{"name":"Alex"}');
    req.push(null);

    await expect(resultPromise).resolves.toEqual({ name: 'Alex' });
  });

  it('returns empty object on empty body', async () => {
    const req = new Readable({ read() {} });
    const resultPromise = parseBody(req);

    req.push(null);

    await expect(resultPromise).resolves.toEqual({});
  });

  it('rejects invalid JSON', async () => {
    const req = new Readable({ read() {} });
    const resultPromise = parseBody(req);

    req.push('{bad json}');
    req.push(null);

    await expect(resultPromise).rejects.toThrow('Invalid JSON');
  });
});
