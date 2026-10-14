jest.mock('../../../../lib/factory', () => ({ getFactory: jest.fn() }));
import { serializeReload } from '../mapperReload';

/** LAC-B PR-0 — EMENDA-1 item 0b: a cadeia de `Promise` da recarga dos mappers. */
describe('serializeReload', () => {
  const deferred = () => {
    let resolve!: () => void;
    let reject!: (e: unknown) => void;
    const promise = new Promise<void>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };

  it('duas recargas simultâneas rodam em série: a 2ª só começa depois que a 1ª termina', async () => {
    const first = deferred();
    const log: string[] = [];
    const reload = jest
      .fn<Promise<void>, []>()
      .mockImplementationOnce(async () => {
        log.push('start-1');
        await first.promise;
        log.push('end-1');
      })
      .mockImplementationOnce(async () => {
        log.push('start-2');
      });
    const run = serializeReload(reload);

    const a = run();
    const b = run();
    await Promise.resolve();
    await Promise.resolve();
    expect(log).toEqual(['start-1']);

    first.resolve();
    await Promise.all([a, b]);
    expect(log).toEqual(['start-1', 'end-1', 'start-2']);
  });

  it('a cadeia não morre depois de uma recarga rejeitada: quem pediu recebe o erro, a próxima roda', async () => {
    const reload = jest.fn<Promise<void>, []>().mockRejectedValueOnce(new Error('colisão')).mockResolvedValueOnce(undefined);
    const run = serializeReload(reload);

    await expect(run()).rejects.toThrow('colisão');
    await expect(run()).resolves.toBeUndefined();
    expect(reload).toHaveBeenCalledTimes(2);
  });
});
