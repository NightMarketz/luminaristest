import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { logger } from './logger';

/**
 * Access log (registro de acesso) — nó OBS, Fase B, items 11 and 13 of PRE-ADR-OBSERVABILIDADE §5.
 *
 * The Marco Civil makes an application provider keep "data e hora de uso a partir de um endereço IP" for 6
 * months (Lei 12.965/2014, arts. 5º VIII and 15), now with the logical source port when needed to identify the
 * terminal (Dec. 8.771/2016, art. 15-A, added by Dec. 12.975/2026), and delete it once the term is over
 * (art. 13, § 2º). Legal reading: pesquisas-legais/marco-civil-guarda-registros/relatorio.md.
 *
 * F-OBS-5 (b), provisional until the Onda 0 host exists: one NDJSON file per UTC day, apart from the error log
 * (`logger.ts`). Encrypted volume, named-role access and the read inventory (art. 13, I–IV) are item 12 and
 * belong to the host — this module only writes and expires the files.
 */
export const AccessLogRecordSchema = z
  .object({
    /** ISO UTC instant the request arrived. */
    timestamp: z.string().datetime(),
    /** `req.ip` — with `trust proxy = 1` it is the client address the proxy forwarded. */
    ip: z.string(),
    /** F-OBS-6 (b): source port forwarded by the proxy in `X-Client-Port`; `null` without it. */
    port: z.number().int().min(1).max(65535).nullable(),
    userId: z.string().min(1),
    method: z.string().min(1),
    /** Path without query; never the body (OBS-R7). */
    route: z.string().min(1),
    requestId: z.string().min(1),
  })
  .strict();

export type AccessLogRecord = z.infer<typeof AccessLogRecordSchema>;

/**
 * 6 months is at most 184 days (Jul–Dec); 6 more days of margin so the last day of a long semester is never
 * deleted early (dono, questionário 2026-10-24: "190 dias").
 */
export const ACCESS_LOG_RETENTION_DAYS = 190;

/** Header the proxy must fill with the client's source port (dono, questionário 2026-10-24). */
export const CLIENT_PORT_HEADER = 'x-client-port';

const DAY_MS = 24 * 60 * 60 * 1000;
const FILE_NAME = /^access-(\d{4}-\d{2}-\d{2})\.ndjson$/;

/** UTC day of the last prune; a new day triggers one more (dono, questionário 2026-10-24: "1ª escrita de cada dia"). */
let lastPrunedDay: string | null = null;

/**
 * Where the access log lands, or `null` when the sink is off. Same rules as the error log's `errorLogDir`:
 * `LOG_ACCESS_DIR` overrides; off under Jest (keyed on JEST_WORKER_ID, since suites mutate NODE_ENV);
 * otherwise `server/logs/access`, resolved from `__dirname` so `src/` and `dist/` agree.
 */
function accessLogDir(): string | null {
  const override = process.env.LOG_ACCESS_DIR;
  if (override) return override;
  if (process.env.JEST_WORKER_ID || process.env.NODE_ENV === 'test') return null;
  return path.resolve(__dirname, '../../logs/access');
}

/** Deletes every day-file older than the retention, judged by the date in its name (molde de `pruneOldErrorLogs`). */
export function pruneOldAccessLogs(dir: string, now: number = Date.now()): void {
  const cutoff = now - ACCESS_LOG_RETENTION_DAYS * DAY_MS;
  for (const name of fs.readdirSync(dir)) {
    const day = FILE_NAME.exec(name)?.[1];
    if (day && Date.parse(`${day}T00:00:00Z`) < cutoff) {
      fs.unlinkSync(path.join(dir, name));
    }
  }
}

/** A port is kept only when the header is a plain integer in range — anything else is `null`, never a guess. */
export function parseClientPort(raw: string | string[] | undefined): number | null {
  if (typeof raw !== 'string' || !/^\d{1,5}$/.test(raw)) return null;
  const port = Number(raw);
  return port >= 1 && port <= 65535 ? port : null;
}

/**
 * Appends one record to `access-YYYY-MM-DD.ndjson`. Synchronous like the error log, so a line is on disk
 * before the process can exit. A failed write never fails the request: it is logged as `warn` (OBS-R8) and
 * lands in the error log, which is a different file.
 */
export function appendAccessLog(record: AccessLogRecord): void {
  const dir = accessLogDir();
  if (!dir) return;

  try {
    const day = record.timestamp.slice(0, 10);
    fs.mkdirSync(dir, { recursive: true });
    if (lastPrunedDay !== day) {
      lastPrunedDay = day;
      pruneOldAccessLogs(dir, Date.parse(record.timestamp));
    }
    fs.appendFileSync(path.join(dir, `access-${day}.ndjson`), `${JSON.stringify(record)}\n`);
  } catch (error) {
    logger.warn('Access log write failed', { error });
  }
}
