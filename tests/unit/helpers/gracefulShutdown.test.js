import { describe, expect, it, vi } from 'vitest';
import gracefulShutdown from '../../../helpers/gracefulShutdown.js';

describe('gracefulShutdown', () => {
  it('exits with error when fastify instance is missing', () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit');
    });

    expect(() => gracefulShutdown('SIGINT', null)).toThrow('exit');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('closes server and exits cleanly', async () => {
    vi.useFakeTimers();
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined);

    const fastifyInstance = {
      close: () => Promise.resolve(),
    };

    gracefulShutdown('SIGTERM', fastifyInstance);
    await vi.runAllTimersAsync();

    expect(exitSpy).toHaveBeenCalledWith(0);
    vi.useRealTimers();
  });

  it('exits with error when close rejects', async () => {
    vi.useFakeTimers();
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined);

    const fastifyInstance = {
      close: () => Promise.reject(new Error('close failed')),
    };

    gracefulShutdown('SIGTERM', fastifyInstance);
    await vi.runAllTimersAsync();

    expect(exitSpy).toHaveBeenCalledWith(1);
    vi.useRealTimers();
  });
});
