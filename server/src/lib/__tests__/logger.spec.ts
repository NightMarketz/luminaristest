/**
 * Unit tests for the logger — focused on the Error-serialization fix (a bare Error in context used to
 * log as `{}`, dropping message/stack). NODE_ENV=test under Jest, so output is single-line JSON.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { logger } from '../logger';
import { ForbiddenError } from '../errors';
import { requestContext } from '../requestContext';
import { LogEntrySchema } from '../logEvents';

/**
 * ADR-OBSERVABILIDADE §6 item 1: every console line this spec reads goes through LogEntrySchema, so the
 * fixed line shape (OBS-R12) is asserted on everything the logger emits here, not on a hand-picked sample.
 */
const parseLine = (spy: jest.SpyInstance, call = 0): Record<string, any> =>
  LogEntrySchema.parse(JSON.parse(spy.mock.calls[call][0] as string));

describe('logger Error serialization', () => {
  let spy: jest.SpyInstance | undefined;
  afterEach(() => spy?.mockRestore());

  it('serializes an Error in context with its message and stack (not `{}`)', () => {
    spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    logger.error('boom happened', { error: new Error('the real cause') });

    const logged = parseLine(spy);
    expect(logged.message).toBe('boom happened');
    expect(logged.error.message).toBe('the real cause');
    expect(typeof logged.error.stack).toBe('string');
  });

  it('includes custom AppError fields (errorCode/statusCode)', () => {
    spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    logger.error('denied', { error: new ForbiddenError('nope') });

    const logged = parseLine(spy);
    expect(logged.error.errorCode).toBe('FORBIDDEN');
    expect(logged.error.statusCode).toBe(403);
  });

  it('routes info/warn to console.log and carries plain context', () => {
    spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    logger.info('hello', { userId: 'u1' });

    const logged = parseLine(spy);
    expect(logged.level).toBe('info');
    expect(logged.userId).toBe('u1');
  });
});

/**
 * The file sink. These assert the SHAPE ON DISK, not just that the call compiles — the file is what
 * `npm run logs:errors` parses, so a multi-line or half-serialized entry would break the reader
 * silently. `LOG_ERROR_DIR` is the same override the sink uses to stay off under NODE_ENV=test.
 */
describe('logger error file sink', () => {
  const today = new Date().toISOString().slice(0, 10);
  let dir: string;
  let spies: jest.SpyInstance[];

  const readLines = (d = dir): string[] => {
    const file = path.join(d, `errors-${today}.ndjson`);
    if (!fs.existsSync(file)) return [];
    return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean);
  };

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'luminaris-log-'));
    process.env.LOG_ERROR_DIR = dir;
    spies = [
      jest.spyOn(console, 'error').mockImplementation(() => {}),
      jest.spyOn(console, 'log').mockImplementation(() => {}),
    ];
  });

  afterEach(() => {
    delete process.env.LOG_ERROR_DIR;
    spies.forEach((s) => s.mockRestore());
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('writes one parseable NDJSON line per error, with the Error fully serialized', () => {
    logger.error('reconcile failed', { jobId: 'j1', error: new Error('db is gone') });

    const lines = readLines();
    expect(lines).toHaveLength(1);

    const entry = LogEntrySchema.parse(JSON.parse(lines[0])) as Record<string, any>;
    expect(entry.level).toBe('error');
    expect(entry.message).toBe('reconcile failed');
    expect(entry.jobId).toBe('j1');
    expect(entry.error.message).toBe('db is gone');
    expect(typeof entry.error.stack).toBe('string');
    // The stack has newlines in it; NDJSON only survives if they stayed escaped inside the string.
    expect(lines[0]).not.toContain('\n');
    expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('persists warn as well as error, but never info/debug', () => {
    logger.warn('slow query', { ms: 5000 });
    logger.info('server started');
    logger.debug('noise');

    const levels = readLines().map((line) => LogEntrySchema.parse(JSON.parse(line)).level);
    expect(levels).toEqual(['warn']);
  });

  it('appends across calls instead of truncating', () => {
    logger.error('first');
    logger.error('second');

    expect(readLines().map((line) => LogEntrySchema.parse(JSON.parse(line)).message)).toEqual(['first', 'second']);
  });

  it('stays silent when the app itself throws inside the sink (unwritable dir)', () => {
    process.env.LOG_ERROR_DIR = path.join(dir, 'file-not-a-dir');
    fs.writeFileSync(path.join(dir, 'file-not-a-dir'), 'blocks mkdir');

    expect(() => logger.error('must not throw')).not.toThrow();
    expect(spies[0]).toHaveBeenCalled(); // console fallback still fired
  });

  it('is OFF by default under Jest so the suite leaves no files behind', () => {
    delete process.env.LOG_ERROR_DIR;
    logger.error('should not reach disk');

    expect(readLines()).toHaveLength(0);
  });

  // Regression: the first cut of this guard keyed on NODE_ENV alone, so any suite that flips
  // NODE_ENV to reach a dev-only branch (apiUtils.spec.ts does) re-armed the sink and wrote a real
  // file into server/logs during `npm run test:unit`. The guard now keys on JEST_WORKER_ID.
  it('stays OFF even when a test mutates NODE_ENV away from "test"', () => {
    const defaultDir = path.resolve(__dirname, '../../../logs');
    const defaultFile = path.join(defaultDir, `errors-${today}.ndjson`);
    const sizeBefore = fs.existsSync(defaultFile) ? fs.statSync(defaultFile).size : -1;

    delete process.env.LOG_ERROR_DIR;
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    try {
      logger.error('must not land in server/logs', { error: new Error('leak probe') });
    } finally {
      process.env.NODE_ENV = original;
    }

    const sizeAfter = fs.existsSync(defaultFile) ? fs.statSync(defaultFile).size : -1;
    expect(sizeAfter).toBe(sizeBefore);
  });

  it('deletes day-files older than the retention window on the first write of a process', () => {
    const stale = `errors-${new Date(Date.now() - 20 * 86400000).toISOString().slice(0, 10)}.ndjson`;
    const fresh = `errors-${new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10)}.ndjson`;
    fs.writeFileSync(path.join(dir, stale), '{}\n');
    fs.writeFileSync(path.join(dir, fresh), '{}\n');
    fs.writeFileSync(path.join(dir, 'unrelated.txt'), 'keep me');

    // Fresh module instance: pruning runs once per process, and the tests above already consumed it.
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      (require('../logger').logger as typeof logger).error('triggers the prune');
    });

    expect(fs.existsSync(path.join(dir, stale))).toBe(false);
    expect(fs.existsSync(path.join(dir, fresh))).toBe(true);
    expect(fs.existsSync(path.join(dir, 'unrelated.txt'))).toBe(true);
  });
});

/** Nó OBS, item 4: the request context rides on every line; outside a request the line is unchanged. */
describe('logger request context', () => {
  let spy: jest.SpyInstance | undefined;
  afterEach(() => spy?.mockRestore());

  it('merges requestId/userId/method/route inside requestContext.run', () => {
    spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    requestContext.run({ requestId: 'req-9', method: 'POST', route: '/api/x', userId: 'u9' }, () => {
      logger.info('inside');
    });
    const logged = parseLine(spy);
    expect(logged).toMatchObject({ requestId: 'req-9', method: 'POST', route: '/api/x', userId: 'u9' });
  });

  it("lets the caller's own key win over the context", () => {
    spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    requestContext.run({ requestId: 'req-9', method: 'POST', route: '/api/x', userId: 'u9' }, () => {
      logger.info('inside', { userId: 'explicit' });
    });
    expect(parseLine(spy).userId).toBe('explicit');
  });

  it('adds nothing outside a request', () => {
    spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    logger.info('outside', { a: 1 });
    expect(Object.keys(parseLine(spy)).sort()).toEqual(['a', 'level', 'message', 'timestamp']);
  });
});

/** Nó OBS, item 7 (F-OBS-3 a): sensitive keys are redacted at any depth, Error custom fields included. */
describe('logger redaction', () => {
  let spy: jest.SpyInstance | undefined;
  afterEach(() => spy?.mockRestore());

  it('redacts listed keys in nested objects, case-insensitively', () => {
    spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    logger.info('x', { user: { Email: 'a@b.co', profile: { cpf: '123', name: 'Ana' } }, headers: { authorization: 'Bearer t' } });
    const logged = parseLine(spy);
    expect(logged.user.Email).toBe('[redacted]');
    expect(logged.user.profile.cpf).toBe('[redacted]');
    expect(logged.user.profile.name).toBe('Ana');
    expect(logged.headers.authorization).toBe('[redacted]');
  });

  it('redacts a custom field carried by an Error', () => {
    spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const err = Object.assign(new Error('boom'), { cnpj: '12345678000199', step: 'emit' });
    logger.error('x', { error: err });
    const logged = parseLine(spy);
    expect(logged.error.cnpj).toBe('[redacted]');
    expect(logged.error.step).toBe('emit');
    expect(logged.error.message).toBe('boom');
  });
});

/** ADR-OBSERVABILIDADE §6 item 2 (F-OBS-11 a): gate lines carry `event` from the closed catalog. */
describe('logger.event', () => {
  let spy: jest.SpyInstance | undefined;
  afterEach(() => spy?.mockRestore());

  it('writes the catalog event on the line, at the given level', () => {
    spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    logger.event('warn', 'job.skipped', 'ptax_rate_sync', { job: 'ptax_rate_sync', reason: 'lock' });
    expect(parseLine(spy)).toMatchObject({
      level: 'warn', event: 'job.skipped', message: 'ptax_rate_sync', job: 'ptax_rate_sync', reason: 'lock',
    });
  });

  it('routes error to console.error and keeps the request context', () => {
    spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    requestContext.run({ requestId: 'req-1', method: 'GET', route: '/x' }, () => {
      logger.event('error', 'api.error', '[API Error Handler]', { statusCode: 500, error: new Error('db') });
    });
    expect(parseLine(spy)).toMatchObject({ level: 'error', event: 'api.error', requestId: 'req-1', statusCode: 500 });
  });

  it('keeps the catalog event even when the context carries its own `event`', () => {
    spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    logger.event('info', 'job.completed', 'x', { event: 'complete' });
    expect(parseLine(spy).event).toBe('job.completed');
  });

  it('refuses, at compile time, a name outside the catalog and the debug level', () => {
    spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    // @ts-expect-error — 'complete' is the pre-catalog vocabulary, not a LogEvent
    logger.event('info', 'complete', 'x');
    // @ts-expect-error — gate lines are info/warn/error only
    logger.event('debug', 'job.completed', 'x');
    expect(spy).toHaveBeenCalled();
  });
});
