import fs from 'fs';
import path from 'path';

interface LogContext {
  [key: string]: unknown;
}

const isDevelopment = process.env.NODE_ENV === 'development';

/** Days of error logs kept on disk; older day-files are deleted on the first write of each process. */
const ERROR_LOG_RETENTION_DAYS = 14;

let prunedThisProcess = false;

/**
 * Where error/warn lines are persisted, or `null` when the sink is off.
 *
 * Until this existed the only sink was `console`, so an error in a background job (the scheduler is
 * in-process) survived exactly as long as the terminal scrollback — `server.ts` deliberately swallows
 * `unhandledRejection` without exiting, so nothing else marked the failure. Read with
 * `npm run logs:errors`.
 *
 * Resolved from `__dirname` (never `process.cwd()`) so it lands in `server/logs` from both `src/lib`
 * and the built `dist/lib`. `LOG_ERROR_DIR` overrides it — that is also how the tests exercise the
 * sink, since it is otherwise off under Jest so the suite never litters the disk.
 *
 * The off-switch keys on JEST_WORKER_ID, not on NODE_ENV alone: several suites legitimately set
 * `NODE_ENV = 'development'` to reach dev-only branches (`apiUtils.spec.ts` does, for the rawError
 * body), and a NODE_ENV-only guard let those runs write real files into `server/logs`.
 */
function errorLogDir(): string | null {
  const override = process.env.LOG_ERROR_DIR;
  if (override) return override;
  if (process.env.JEST_WORKER_ID || process.env.NODE_ENV === 'test') return null;
  return path.resolve(__dirname, '../../logs');
}

function pruneOldErrorLogs(dir: string): void {
  const cutoff = Date.now() - ERROR_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  for (const name of fs.readdirSync(dir)) {
    const day = /^errors-(\d{4}-\d{2}-\d{2})\.ndjson$/.exec(name)?.[1];
    if (day && Date.parse(`${day}T00:00:00Z`) < cutoff) {
      fs.unlinkSync(path.join(dir, name));
    }
  }
}

/**
 * Appends one compact JSON line to `logs/errors-YYYY-MM-DD.ndjson`.
 *
 * Synchronous on purpose: `uncaughtException` logs and then shuts down, and that is precisely the
 * failure worth keeping — an async write would still be queued when the process exits.
 * ponytail: append-only NDJSON, rotated by day. If volume ever makes the sync write hurt, the upgrade
 * path is a real log shipper (Sentry/pino transport), not a buffer bolted on here.
 */
function appendToErrorLog(jsonLine: string, timestamp: string): void {
  const dir = errorLogDir();
  if (!dir) return;

  try {
    fs.mkdirSync(dir, { recursive: true });
    if (!prunedThisProcess) {
      prunedThisProcess = true;
      pruneOldErrorLogs(dir);
    }
    fs.appendFileSync(path.join(dir, `errors-${timestamp.slice(0, 10)}.ndjson`), `${jsonLine}\n`);
  } catch {
    // A logger must never be the thing that takes the app down: if the disk write fails, the console
    // line was already emitted by the caller, and that is the fallback.
  }
}

/**
 * JSON.stringify replacer that makes Error values useful in logs. A plain `JSON.stringify(new Error())`
 * yields `{}` (Error's own enumerable props are none), so `logger.error('x', { error })` used to drop the
 * message and stack entirely. This serializes name/message/stack (and any custom enumerable props).
 */
function logReplacer(_key: string, value: unknown): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
      ...(value as unknown as Record<string, unknown>), // include any custom fields (e.g. AppError.errorCode)
    };
  }
  return value;
}

function formatLog(level: string, message: string, context: LogContext = {}): void {
  const timestamp = new Date().toISOString();
  const logEntry = { timestamp, level, message, ...context };

  // The compact form is always computed: it is what the file sink writes, so a dev run's
  // pretty-printed console output never turns the NDJSON file into multi-line JSON.
  const jsonLine = JSON.stringify(logEntry, logReplacer);
  const logString = isDevelopment ? JSON.stringify(logEntry, logReplacer, 2) : jsonLine;

  if (level === 'error') {
    console.error(logString);
  } else {
    console.log(logString);
  }

  if (level === 'error' || level === 'warn') {
    appendToErrorLog(jsonLine, timestamp);
  }
}

export const logger = {
  info(message: string, context: LogContext = {}) {
    formatLog('info', message, context);
  },

  error(message: string, context: LogContext = {}) {
    formatLog('error', message, context);
  },

  warn(message: string, context: LogContext = {}) {
    formatLog('warn', message, context);
  },

  debug(message: string, context: LogContext = {}) {
    if (isDevelopment) {
      formatLog('debug', message, context);
    }
  },
};

export default logger;
