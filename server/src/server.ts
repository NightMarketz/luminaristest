import type { Server } from 'http';
import app from './app';
import { runQdrantInitialization } from './lib/vector/qdrant';
import prisma from './lib/prisma';
import { logger } from './lib/logger';
import { ApplicationFactory } from './lib/factory';
import { purgeOldDeletedRecords } from './jobs/PurgeDeletedRecords';
import { accountingSyncScheduler } from './jobs/AccountingSyncScheduler';
import { DocumentStatus } from './features/documents/models/Document.model';

const PORT = process.env.PORT || 3001;

// httpServer only exists once `app.listen()` has actually run (see bootstrap() below) — it stays
// undefined for the brief pre-boot window while the accounting binding feeder is being awaited.
// `gracefulShutdown()` guards for that (a SIGTERM arriving before boot finishes has no HTTP
// server to close, but still must exit cleanly rather than throw on `undefined.close()`).
let httpServer: Server | undefined;

/**
 * BE-INCR-BINDING-FEEDER (Fatia B, F-FEEDER-4 + F-FEEDER-5, ADR-INCR-BINDING-FEEDER.md §5/§6).
 *
 * PRÉ-BOOT: `server.ts` passa a aguardar a inicialização do alimentador de bindings contábeis
 * ANTES de `app.listen()` — a primeira vez que o bootstrap do projeto bloqueia o `listen()` numa
 * Promise (o Qdrant, logo abaixo, continua fire-and-forget DELIBERADAMENTE — precedente contrário
 * registrado, não revogado; Qdrant não é uma pré-condição para servir contabilidade corretamente,
 * bindings ativos são).
 *
 * MODO DE FALHA (F-FEEDER-4): se `initializeAccountingSyncFromBindings()` rejeitar — zero
 * `AccountingBinding` `Active` no banco (`NoActiveAccountingBindingsError`) ou colisão de
 * `eventKey` dentro da mesma unidade (`AccountingEventMapperCollisionError`) — o BOOT FALHA: o
 * processo NUNCA chama `app.listen()` e sai com código 1. `process.on('unhandledRejection')`
 * abaixo, de propósito, só loga e CONTINUA (não seria fatal) — por isso este catch chama
 * `process.exit(1)` explicitamente, não depende do handler global.
 */
async function bootstrap(): Promise<void> {
  await ApplicationFactory.getInstance().initializeAccountingSyncFromBindings();

  httpServer = app.listen(PORT, () => {
    console.log(`Luminaris Server running on http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);

    // Initialize external infra at bootstrap (not on module import). Fire-and-forget: the function
    // logs and swallows its own errors, so a Qdrant outage never crashes the API process.
    void runQdrantInitialization();

    // Só aqui: o alimentador já trocou o accountingSync (o await acima), então o primeiro
    // tick do reconcile enxerga os mappers vindos dos bindings Active, nunca a fixture.
    accountingSyncScheduler.start();
  });
}

bootstrap().catch((error) => {
  logger.error(
    'Boot ABORTADO — o alimentador de bindings contábeis falhou antes de app.listen() ' +
      '(ver docs/adr/ADR-INCR-BINDING-FEEDER.md §5/§8: chart de contas → binding Active → boot é ' +
      'ordem obrigatória). O processo NÃO vai aceitar tráfego HTTP.',
    { error },
  );
  process.exit(1);
});

// LGPD/R38 — 90-day soft-delete purge job
// First run 60 s after startup, then every 24 h.
const PURGE_INITIAL_DELAY_MS = 60 * 1000;
const PURGE_INTERVAL_MS = 24 * 60 * 60 * 1000;

setTimeout(() => {
  purgeOldDeletedRecords().catch((err) => logger.error('Purge job failed', { err }));
  setInterval(() => {
    purgeOldDeletedRecords().catch((err) => logger.error('Purge job failed', { err }));
  }, PURGE_INTERVAL_MS);
}, PURGE_INITIAL_DELAY_MS);

// R18 — PROCESSING watchdog: every 5 minutes, fail documents stuck in PROCESSING for > 10 minutes.
setInterval(() => {
  const cutoff = new Date(Date.now() - 10 * 60 * 1000);
  prisma.document.updateMany({
    where: {
      status: DocumentStatus.PROCESSING,
      updatedAt: { lt: cutoff },
    },
    data: {
      status: DocumentStatus.FAILED,
      processingError: 'Processing timeout',
      processingDate: new Date(),
    },
  }).then((result) => {
    if (result.count > 0) {
      logger.warn(`Processing watchdog: marked ${result.count} stuck document(s) as FAILED`);
    }
  }).catch((err) => {
    logger.error('Processing watchdog failed', { err });
  });
}, 300000);

// B.1 — AccountingSync reconciliation: re-drive Won opportunities lacking a journal
// entry. Periodic, non-overlapping (process-local lock). Interval/delay configurable
// via env (defaults: 5 min interval, 1 min initial delay); no-op under NODE_ENV=test.
//
// O start() NÃO acontece aqui: ele é disparado dentro do callback de app.listen(), em
// bootstrap(). Motivo (achado do review do BE-INCR-BINDING-FEEDER): arrancando no
// module-load, o relógio do scheduler começa a correr ANTES de o pré-boot trocar o
// accountingSync pelo alimentado do banco. Sob o delay padrão de 60 s isso é inofensivo,
// mas com o delay reduzido por env (ou um banco lento) o primeiro tick do reconcile
// pegaria o valor de bootstrap síncrono — a fixture estática do salão — em vez dos
// mappers vindos dos bindings Active, reabrindo exatamente a divergência silenciosa que
// este incremento existe para fechar.

// Graceful shutdown
function gracefulShutdown() {
  logger.info('Shutting down gracefully...');
  accountingSyncScheduler.stop();

  // Force-exit safety net after 10 seconds
  const forceExitTimer = setTimeout(() => {
    logger.error('Graceful shutdown timed out — forcing exit', {});
    process.exit(1);
  }, 10000);
  // Allow the timer to be garbage-collected if shutdown completes in time
  if (forceExitTimer.unref) forceExitTimer.unref();

  const disconnectAndExit = () => {
    prisma.$disconnect().then(() => {
      logger.info('Database disconnected');
      process.exit(0);
    }).catch((err) => {
      logger.error('Error disconnecting database', { err });
      process.exit(1);
    });
  };

  // httpServer is undefined if a shutdown signal arrives during the pre-boot window (bootstrap()
  // still awaiting the accounting binding feeder) — nothing is listening yet, so there is nothing
  // to close; go straight to disconnecting Prisma.
  if (httpServer) {
    httpServer.close(() => {
      logger.info('HTTP server closed');
      disconnectAndExit();
    });
  } else {
    disconnectAndExit();
  }
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Promise Rejection', { reason });
  // do NOT exit — log and continue to avoid crashing on transient failures
});
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception — shutting down', { error });
  gracefulShutdown();
});

export default app;
