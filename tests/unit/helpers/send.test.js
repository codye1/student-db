import { describe, expect, it, vi } from 'vitest';
import send from '../../../helpers/send.js';

describe('send', () => {
  it('writes JSON response with headers', () => {
    const res = {
      writeHead: vi.fn(),
      end: vi.fn(),
    };

    send(res, 201, { ok: true });

    expect(res.writeHead).toHaveBeenCalledWith(201, expect.objectContaining({
      'Content-Type': 'application/json',
    }));
    expect(res.end).toHaveBeenCalledWith('{' + '\n  "ok": true\n}');
  });
});
