import fs from 'fs';
import os from 'os';
import path from 'path';
import { logger } from '../logger';
import {
  AccessLogRecordSchema,
  ACCESS_LOG_RETENTION_DAYS,
  appendAccessLog,
  parseClientPort,
  pruneOldAccessLogs,
  type AccessLogRecord,
} from '../accessLog';

/** Nó OBS, Fase B, items 11 and 13 (PRE-ADR-OBSERVABILIDADE §5). Asserts the file on disk, which is the record. */
const record = (over: Partial<AccessLogRecord> = {}): AccessLogRecord => ({
  timestamp: '2026-10-24T12:00:00.000Z',
  ip: '203.0.113.7',
  port: 51234,
  userId: 'u1',
  method: 'GET',
  route: '/api/units',
  requestId: 'req-12345678',
  ...over,
});

const touch = (dir: string, day: string) => fs.writeFileSync(path.join(dir, `access-${day}.ndjson`), '{}\n');

describe('AccessLogRecordSchema (contract)', () => {
  it('accepts the record the middleware writes, with or without a port', () => {
    expect(AccessLogRecordSchema.parse(record())).toEqual(record());
    expect(AccessLogRecordSchema.parse(record({ port: null })).port).toBeNull();
  });

  it('rejects any extra key, so a body or query can never ride along', () => {
    expect(() => AccessLogRecordSchema.parse({ ...record(), body: { cpf: '1' } })).toThrow();
    expect(() => AccessLogRecordSchema.parse({ ...record(), query: 'cpf=1' })).toThrow();
  });

  it('rejects an out-of-range port and an empty userId', () => {
    expect(() => AccessLogRecordSchema.parse(record({ port: 70000 }))).toThrow();
    expect(() => AccessLogRecordSchema.parse(record({ userId: '' }))).toThrow();
  });
});

describe('parseClientPort (F-OBS-6 b)', () => {
  it('keeps a plain integer port', () => {
    expect(parseClientPort('51234')).toBe(51234);
    expect(parseClientPort('1')).toBe(1);
    expect(parseClientPort('65535')).toBe(65535);
  });

  it('is null when the header is missing, repeated, out of range or not a plain integer', () => {
    for (const raw of [undefined, ['1', '2'], '', '0', '65536', '99999', '-1', '80.5', ' 80', '80a']) {
      expect(parseClientPort(raw as string | string[] | undefined)).toBeNull();
    }
  });
});

describe('access log file sink', () => {
  let dir: string;

  const lines = (day: string): string[] => {
    const file = path.join(dir, `access-${day}.ndjson`);
    return fs.existsSync(file) ? fs.readFileSync(file, 'utf8').split('\n').filter(Boolean) : [];
  };

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'luminaris-access-'));
    process.env.LOG_ACCESS_DIR = dir;
  });

  afterEach(() => {
    delete process.env.LOG_ACCESS_DIR;
    fs.rmSync(dir, { recursive: true, force: true });
    jest.restoreAllMocks();
  });

  it('appends one schema-valid NDJSON line per record, in the file of the record UTC day', () => {
    appendAccessLog(record());
    appendAccessLog(record({ requestId: 'req-second-1' }));

    const written = lines('2026-10-24').map((l) => AccessLogRecordSchema.parse(JSON.parse(l)));
    expect(written.map((r) => r.requestId)).toEqual(['req-12345678', 'req-second-1']);
  });

  it('is OFF by default under Jest', () => {
    delete process.env.LOG_ACCESS_DIR;
    expect(() => appendAccessLog(record())).not.toThrow();
    expect(fs.readdirSync(dir)).toHaveLength(0);
  });

  it('a failed write never throws and is logged as warn (OBS-R8)', () => {
    const warn = jest.spyOn(logger, 'warn').mockImplementation(() => {});
    process.env.LOG_ACCESS_DIR = path.join(dir, 'file-not-a-dir');
    fs.writeFileSync(path.join(dir, 'file-not-a-dir'), 'blocks mkdir');

    expect(() => appendAccessLog(record())).not.toThrow();
    expect(warn).toHaveBeenCalledWith('Access log write failed', expect.objectContaining({ error: expect.anything() }));
  });

  it('retention is 190 days (6 months at most 184 + margin)', () => {
    expect(ACCESS_LOG_RETENTION_DAYS).toBe(190);
  });

  it('prune deletes a day-file older than 190 days and keeps the one exactly at the edge', () => {
    const now = Date.parse('2026-10-24T00:00:00Z');
    touch(dir, '2026-04-16'); // 191 days before → gone
    touch(dir, '2026-04-17'); // 190 days before → kept (cutoff is strict)
    touch(dir, '2026-10-23');
    fs.writeFileSync(path.join(dir, 'errors-2020-01-01.ndjson'), '{}\n'); // not ours → untouched

    pruneOldAccessLogs(dir, now);

    expect(fs.readdirSync(dir).sort()).toEqual([
      'access-2026-04-17.ndjson',
      'access-2026-10-23.ndjson',
      'errors-2020-01-01.ndjson',
    ]);
  });

  it('expires on the first write of each new day, not only once per process (item 13)', () => {
    // First write of 24/10 prunes against 24/10: 2026-04-17 is at the edge and stays.
    touch(dir, '2026-04-17');
    appendAccessLog(record({ timestamp: '2026-10-24T12:00:00.000Z' }));
    expect(fs.existsSync(path.join(dir, 'access-2026-04-17.ndjson'))).toBe(true);

    // Same process, next day: the day change prunes again and 2026-04-17 is now past 190 days.
    appendAccessLog(record({ timestamp: '2026-10-25T00:00:01.000Z' }));
    expect(fs.existsSync(path.join(dir, 'access-2026-04-17.ndjson'))).toBe(false);
    expect(lines('2026-10-25')).toHaveLength(1);
  });
});
