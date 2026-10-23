/**
 * ADR-OBSERVABILIDADE §6 item 1 (F-OBS-10/11 a): the closed event catalog and the fixed line shape.
 * The logger's own lines are checked against LogEntrySchema in logger.spec.ts.
 */
import { LOG_EVENTS, LogEntrySchema } from '../logEvents';

describe('LOG_EVENTS', () => {
  it('has no duplicate name', () => {
    expect(new Set(LOG_EVENTS).size).toBe(LOG_EVENTS.length);
  });

  it('names every event as <gate>.<what>', () => {
    for (const name of LOG_EVENTS) expect(name).toMatch(/^[a-z]+\.[a-z_]+$/);
  });
});

describe('LogEntrySchema', () => {
  const base = { timestamp: '2026-10-23T12:00:00.000Z', level: 'info', message: 'x' };

  it('accepts a minimal line and keeps the caller context', () => {
    expect(LogEntrySchema.parse({ ...base, jobId: 'j1' })).toMatchObject({ jobId: 'j1' });
  });

  it('accepts a catalog event', () => {
    expect(LogEntrySchema.safeParse({ ...base, event: 'job.failed' }).success).toBe(true);
  });

  it('rejects an event outside the catalog', () => {
    expect(LogEntrySchema.safeParse({ ...base, event: 'failed' }).success).toBe(false);
  });

  it('rejects an unknown level, an empty message and a non-ISO timestamp', () => {
    expect(LogEntrySchema.safeParse({ ...base, level: 'fatal' }).success).toBe(false);
    expect(LogEntrySchema.safeParse({ ...base, message: '' }).success).toBe(false);
    expect(LogEntrySchema.safeParse({ ...base, timestamp: 'yesterday' }).success).toBe(false);
  });

  it('types the request-context keys as strings', () => {
    expect(LogEntrySchema.safeParse({ ...base, userId: 42 }).success).toBe(false);
  });
});
