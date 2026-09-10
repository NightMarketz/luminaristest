import { randomUUID } from 'crypto';
import type { Prisma } from 'generated/prisma';
import { ForbiddenError } from '../../../lib/errors';
import type { IAuditRepository } from '../repositories/IAuditRepository';
import type { IPostingRepository } from '../repositories/IPostingRepository';
import type { ICounterpartyRepository } from '../repositories/ICounterpartyRepository';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { AccountingScope } from '../scope/AccountingScope';
import {
  GENESIS_HASH,
  HASH_VERSION,
  CANONICAL_VERSION,
  buildAuditCanonicalTuple,
  canonicalizeAuditPayload,
  hashAuditCanonical,
} from '../audit/auditCanonical';
import { MASKABLE_FREE_TEXT_KEYS, maskThirdPartyNames } from '../audit/auditFreeTextMask';

export type VerifyFailureReason =
  | 'MISSING_GENESIS'
  | 'SEQ_GAP'
  | 'PREV_HASH_MISMATCH'
  | 'HASH_MISMATCH'
  | 'HEAD_MISMATCH';

export interface VerifyResult {
  ok:            boolean;
  checkedEvents: number;
  firstSeq:      bigint | null;
  lastSeq:       bigint | null;
  headHash:      string | null;
  failure?: { seq: bigint; reason: VerifyFailureReason };
}

export interface AuditEventInput {
  actorUserId: string | null;
  actorType?:  string;
  eventType:   string;
  targetType:  string;
  targetId:    string;
  payload:     Record<string, unknown>;
}

export class AuditService {
  constructor(
    private readonly auditRepo: IAuditRepository,
    private readonly postingRepo: IPostingRepository,
    private readonly policy: IAccountingPolicy,
    private readonly counterpartyRepo: ICounterpartyRepository,
  ) {}

  /**
   * BE-INCR-AUDIT-FREETEXT-MASK — mascara nome de contraparte digitado à mão nos campos de texto
   * livre deste eventType, ANTES da canonicalização (e portanto antes do hash: a chain é
   * append-only, ADR-INCR2 Q2 — não há conserto depois).
   *
   * A leitura das contrapartes usa a MESMA `tx` do append (exigência vinculada à ratificação do
   * Fork D): fora dela, uma contraparte criada/arquivada entre a leitura e o append deixaria uma
   * janela de inconsistência. `includeArchived: false` porque o arquivamento mangla o nome para
   * `deleted:<id>:<name>` (SEC-A1-4) — a forma arquivada não é o que o operador digita.
   *
   * A consulta só acontece quando este eventType TEM campo livre e ele veio preenchido: a maioria
   * dos eventos é id-only, e `reason` é opcional em quase todos os DTOs — não faz sentido pagar uma
   * leitura por append que não tem o que mascarar.
   */
  private async maskFreeText(
    tx: Prisma.TransactionClient,
    scope: AccountingScope,
    input: AuditEventInput,
  ): Promise<Record<string, unknown>> {
    const maskableKeys = MASKABLE_FREE_TEXT_KEYS[input.eventType] ?? [];
    const presentKeys = maskableKeys.filter((key) => typeof input.payload[key] === 'string');
    if (presentKeys.length === 0) return input.payload;

    const counterparties = await this.counterpartyRepo.findManyByUnit(
      scope,
      { includeArchived: false },
      tx,
    );
    if (counterparties.length === 0) return input.payload;

    const masked: Record<string, unknown> = { ...input.payload };
    for (const key of presentKeys) {
      masked[key] = maskThirdPartyNames(masked[key] as string, counterparties);
    }
    return masked;
  }

  /**
   * Append one audit event in the same tx as the originating mutation.
   * tx is REQUIRED — append outside a tx is prohibited (Q10).
   * P2002 on seq/hash is NEVER swallowed — propagates to rollback the outer tx.
   */
  async append(
    tx: Prisma.TransactionClient,
    scope: AccountingScope,
    input: AuditEventInput,
  ): Promise<void> {
    const head = await this.auditRepo.getOrCreateHead(scope, tx);

    const eventId      = randomUUID();
    const seq          = head.nextSeq;
    const prevHash     = head.headHash;
    const createdAt    = new Date();
    const createdAtISO = createdAt.toISOString();
    const actorType    = input.actorType ?? 'USER';

    // O hash é computado sobre o valor JÁ mascarado — mascarar depois seria impossível (chain
    // append-only), e antes da canonicalização é o único ponto em que todo evento passa.
    const maskedPayload = await this.maskFreeText(tx, scope, input);
    const payloadCanonical = canonicalizeAuditPayload(input.eventType, maskedPayload);

    const tupleJson = buildAuditCanonicalTuple({
      eventId,
      scopeUserId:  scope.ownerUserId,
      unitId:       scope.unitId,
      seq,
      actorUserId:  input.actorUserId,
      actorType,
      eventType:    input.eventType,
      targetType:   input.targetType,
      targetId:     input.targetId,
      payloadCanonical,
      createdAtISO,
      prevHash,
    });

    const hash = hashAuditCanonical(tupleJson);

    // Both INSERT and bumpHead must succeed in the same tx; P2002 → throw → outer rollback.
    await this.auditRepo.append(
      {
        id:               eventId,
        scopeUserId:      scope.ownerUserId,
        unitId:           scope.unitId,
        seq,
        actorUserId:      input.actorUserId,
        actorType,
        eventType:        input.eventType,
        targetType:       input.targetType,
        targetId:         input.targetId,
        payload:          payloadCanonical,
        prevHash,
        hash,
        hashVersion:      HASH_VERSION,
        canonicalVersion: CANONICAL_VERSION,
        createdAt,
      },
      tx,
    );

    await this.auditRepo.bumpHead(scope, seq + 1n, hash, head.version, tx);
  }

  /**
   * Verify the full audit chain for this scope.
   * Diagnostic only — does NOT repair the chain.
   */
  async verifyAuditChain(scope: AccountingScope): Promise<VerifyResult> {
    if (!this.policy.canRead(scope)) {
      throw new ForbiddenError('Você não tem permissão para ler a trilha de auditoria.');
    }

    const events = await this.auditRepo.listByScope(scope);

    if (events.length === 0) {
      return { ok: true, checkedEvents: 0, firstSeq: null, lastSeq: null, headHash: null };
    }

    // 1. Genesis must start at seq=1.
    if (events[0].seq !== 1n) {
      return {
        ok: false, checkedEvents: 0,
        firstSeq: events[0].seq, lastSeq: null, headHash: null,
        failure: { seq: events[0].seq, reason: 'MISSING_GENESIS' },
      };
    }

    // 2. prevHash of seq=1 must be GENESIS_HASH.
    if (events[0].prevHash !== GENESIS_HASH) {
      return {
        ok: false, checkedEvents: 1,
        firstSeq: 1n, lastSeq: events[0].seq, headHash: null,
        failure: { seq: 1n, reason: 'PREV_HASH_MISMATCH' },
      };
    }

    let prevHash = GENESIS_HASH;

    for (let i = 0; i < events.length; i++) {
      const ev = events[i];

      // 3. No seq gaps.
      if (ev.seq !== BigInt(i + 1)) {
        return {
          ok: false, checkedEvents: i,
          firstSeq: 1n, lastSeq: events[i - 1]?.seq ?? null, headHash: null,
          failure: { seq: ev.seq, reason: 'SEQ_GAP' },
        };
      }

      // 4. prevHash chain continuity.
      if (ev.prevHash !== prevHash) {
        return {
          ok: false, checkedEvents: i,
          firstSeq: 1n, lastSeq: events[i - 1]?.seq ?? null, headHash: null,
          failure: { seq: ev.seq, reason: 'PREV_HASH_MISMATCH' },
        };
      }

      // 5. Recompute and verify hash.
      const tupleJson = buildAuditCanonicalTuple({
        eventId:          ev.id,
        scopeUserId:      ev.scopeUserId,
        unitId:           ev.unitId,
        seq:              ev.seq,
        actorUserId:      ev.actorUserId,
        actorType:        ev.actorType,
        eventType:        ev.eventType,
        targetType:       ev.targetType,
        targetId:         ev.targetId,
        payloadCanonical: ev.payload,
        createdAtISO:     ev.createdAt.toISOString(),
        prevHash:         ev.prevHash,
      });
      const recomputedHash = hashAuditCanonical(tupleJson);
      if (recomputedHash !== ev.hash) {
        return {
          ok: false, checkedEvents: i,
          firstSeq: 1n, lastSeq: ev.seq, headHash: null,
          failure: { seq: ev.seq, reason: 'HASH_MISMATCH' },
        };
      }

      prevHash = ev.hash;
    }

    // 6. Head must match last event.
    const lastEvent = events[events.length - 1];
    const headHash = lastEvent.hash;
    const expectedNextSeq = lastEvent.seq + 1n;

    const headCheck = await this.postingRepo.runTransaction(async (tx) => {
      return this.auditRepo.getOrCreateHead(scope, tx);
    });

    if (headCheck.headHash !== headHash || headCheck.nextSeq !== expectedNextSeq) {
      return {
        ok: false, checkedEvents: events.length,
        firstSeq: 1n, lastSeq: lastEvent.seq, headHash: headCheck.headHash,
        failure: { seq: lastEvent.seq, reason: 'HEAD_MISMATCH' },
      };
    }

    return {
      ok:            true,
      checkedEvents: events.length,
      firstSeq:      1n,
      lastSeq:       lastEvent.seq,
      headHash:      lastEvent.hash,
    };
  }
}
