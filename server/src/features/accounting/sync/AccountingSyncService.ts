import { Prisma } from 'generated/prisma';
import { AccountingEventMapperCollisionError, ValidationError } from '../../../lib/errors';
import logger from '../../../lib/logger';
import type { PostingService } from '../services/PostingService';
import type { AccountingScope } from '../scope/AccountingScope';
import type { AccountingEvent, AccountingSyncPort, SyncResult } from './AccountingSyncPort';
import type { IAccountingEventMapper } from './mappers/IAccountingEventMapper';

/**
 * A mapper registered WITH a unit scope — used by BE-INCR-BINDING-FEEDER (F-FEEDER-3 → composite
 * key `unitId:sourceType`) so two `Active` bindings of DIFFERENT business units can register a
 * mapper for the SAME `eventKey` without colliding. `unitId` is the `AccountingBinding.unitId`
 * the mapper's binding was compiled for — NOT read from the mapper itself (`IAccountingEventMapper`
 * stays untouched; `InterpretedEventMapper`, Corpo D, is a neighbor node this feature does not
 * modify — only who CONSTRUCTS it changes).
 */
export interface ScopedAccountingMapperEntry {
  readonly unitId: string;
  readonly mapper: IAccountingEventMapper;
}

/**
 * An entry accepted by `AccountingSyncService`'s constructor: either a PLAIN mapper (today's
 * shape, every existing call site — `lib/factory.ts`'s `buildSaleAccountingMappers()` and the
 * unit tests) registered GLOBALLY (matches an event of ANY `unitId`, backward-compatible with the
 * single-fixture/single-vertical behavior that predates the feeder), or a `ScopedAccountingMapperEntry`
 * registered for exactly one `unitId`. Discriminated by the presence of `sourceType` (only a plain
 * mapper carries it).
 */
export type AccountingMapperEntry = IAccountingEventMapper | ScopedAccountingMapperEntry;

function isScopedEntry(entry: AccountingMapperEntry): entry is ScopedAccountingMapperEntry {
  return !('sourceType' in entry);
}

/** Transient DB errors worth retrying (SQLite busy / connection / tx timeout). */
function isTransientDbError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // P2024 = timed out fetching a connection from the pool; P1xxx = connection layer.
    return ['P2024', 'P1000', 'P1001', 'P1002', 'P1008', 'P1017'].includes(error.code);
  }
  if (error instanceof Error && /SQLITE_BUSY|database is locked|timed out/i.test(error.message)) {
    return true;
  }
  return false;
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * AccountingSyncService — application-level adapter that books journal entries for
 * domain events. It is the FIRST non-controller consumer of PostingService and is
 * legitimate precisely because it is an integration service (not the DynamicTable
 * engine). §2.1: it must never be injected into DynamicTableService/RuleContext/
 * RulePlugin, and must be invoked POST-COMMIT (never inside another tx).
 *
 * Idempotency is delegated ENTIRELY to PostingService (read-side findBySource +
 * write-side P2002 race-close on @@unique([userId,unitId,sourceType,sourceId])).
 * This service intentionally has NO idempotency pre-check of its own — that would
 * be a TOCTOU; postEntry is the single authority.
 */
export class AccountingSyncService implements AccountingSyncPort {
  private readonly mappers: Map<string, IAccountingEventMapper>;
  private readonly maxAttempts: number;
  private readonly retryDelayMs: number;

  constructor(
    private readonly postingService: PostingService,
    entries: AccountingMapperEntry[],
    opts: { maxAttempts?: number; retryDelayMs?: number } = {},
  ) {
    // F-FEEDER-3 → composite key `unitId:sourceType` (was: `sourceType` alone, AccountingSyncService.ts:45
    // pré-feeder). A SCOPED entry keys on `${unitId}:${sourceType}`; a PLAIN mapper keys on `sourceType`
    // alone (global — matches any unit, the fallback `sync()` uses below). Built with an explicit loop
    // (not `new Map(entries.map(...))`) so a duplicate key FAILS LOUD instead of last-write-wins silently
    // overwriting — the exact silent divergence this feature exists to close.
    this.mappers = new Map<string, IAccountingEventMapper>();
    for (const entry of entries) {
      const scoped = isScopedEntry(entry);
      const mapper = scoped ? entry.mapper : entry;
      const key = scoped ? `${entry.unitId}:${mapper.sourceType}` : mapper.sourceType;
      if (this.mappers.has(key)) {
        throw new AccountingEventMapperCollisionError(mapper.sourceType, scoped ? entry.unitId : undefined);
      }
      this.mappers.set(key, mapper);
    }
    this.maxAttempts = opts.maxAttempts ?? 3;
    this.retryDelayMs = opts.retryDelayMs ?? 50;
  }

  async sync(scope: AccountingScope, event: AccountingEvent): Promise<SyncResult> {
    // BE-INCR-BINDING-FEEDER (Fatia B) — DECISÃO SOBRE O FALLBACK GLOBAL (mantido, com
    // justificativa; a alternativa considerada e rejeitada foi removê-lo — ver ADR-INCR-BINDING-
    // FEEDER.md §4, "aberto"/premissas). Composite key primeiro; cai para a chave global (bare
    // `sourceType`) só se a composta não bater.
    //
    // Por que isto NÃO reabre o risco de cross-unit silencioso que esta fatia existe para fechar:
    // `AccountingBindingFeederService.buildActiveMapperRegistrations()` (o ÚNICO produtor do array
    // que alimenta o `AccountingSyncService` em produção, via
    // `ApplicationFactory.initializeAccountingSyncFromBindings()`, `lib/factory.ts`) SEMPRE emite
    // entradas ESCOPADAS (`{unitId, mapper}` — nunca um `IAccountingEventMapper` solto). Logo, na
    // instância que atende tráfego real, `this.mappers` NUNCA contém uma chave bare — o fallback
    // é estrutural e comprovadamente inalcançável ali (ver teste "instância só-escopada NUNCA cai
    // pro mapper de outra unidade" em `__tests__/AccountingSyncService.test.ts`).
    //
    // Onde o fallback SEGUE vivo, de propósito: (1) os testes desta própria classe, que exercitam
    // o registro global/plain como um contrato de PRIMEIRA CLASSE do construtor (não um artefato
    // de transição) — remover o fallback quebraria esse contrato, exigindo mudar o TIPO aceito
    // pelo construtor (`AccountingMapperEntry = IAccountingEventMapper | ScopedAccountingMapperEntry`)
    // para só-escopado — uma mudança de FORMA além do que F-FEEDER-3 decidiu (o ADR fecha a
    // colisão via chave composta, não via proibir entrada plain); isso seria fork, não
    // implementação desta fatia. (2) o valor de BOOTSTRAP síncrono de `lib/factory.ts`
    // (`buildSaleAccountingMappers()`, plain) — nunca observado por um `sync()` real, porque todo
    // consumidor é lazy e `server.ts` só chama `app.listen()` DEPOIS do pré-boot substituir a
    // instância (ver `initializeAccountingSyncFromBindings()`).
    const mapper = this.mappers.get(`${event.unitId}:${event.sourceType}`) ?? this.mappers.get(event.sourceType);
    if (!mapper) {
      // Invalid/unknown event kind: a wiring error, not a transient fault. Surface it.
      throw new ValidationError(`Nenhum mapper registrado para o evento '${event.sourceType}'.`);
    }

    // map() may throw ValidationError (bad money / unbalanced source) — NOT retried.
    const input = mapper.map(event);

    let lastError: unknown;
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        // postEntry owns the balance invariant, atomicity AND idempotency.
        const entry = await this.postingService.postEntry(scope, input);
        return { entryId: entry.id };
      } catch (error) {
        // ValidationError (and any non-transient fault) is deterministic — do not retry.
        if (error instanceof ValidationError || !isTransientDbError(error)) {
          throw error;
        }
        lastError = error;
        logger.warn('AccountingSync transient failure — will retry', {
          sourceType: event.sourceType,
          sourceId: event.sourceId,
          attempt,
          maxAttempts: this.maxAttempts,
        });
        if (attempt < this.maxAttempts) await sleep(this.retryDelayMs);
      }
    }

    // Retries exhausted: no partial write (postEntry is atomic per attempt). The
    // source fact stands; the reconciliation job will re-drive this idempotently.
    logger.error('AccountingSync exhausted retries — left for reconciliation', {
      sourceType: event.sourceType,
      sourceId: event.sourceId,
      error: lastError instanceof Error ? lastError.message : String(lastError),
    });
    throw lastError;
  }
}
