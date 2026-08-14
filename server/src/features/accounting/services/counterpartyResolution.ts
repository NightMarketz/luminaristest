import { Prisma } from 'generated/prisma';
import { ForbiddenError, ValidationError } from '../../../lib/errors';
import {
  COUNTERPARTY_CREATED,
  COUNTERPARTY_NAME_MAX_LENGTH,
  type CounterpartyType,
} from '../models/Counterparty.model';
import type { ICounterpartyRepository } from '../repositories/ICounterpartyRepository';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { AuditService } from './AuditService';
import type { AccountingScope } from '../scope/AccountingScope';
import { accountingScopeWhere } from '../scope/AccountingScope';

/**
 * Shared counterparty resolution for the AP/AR create paths (BE-INCR-COUNTERPARTY-NOTNULL, SEC-A1-5,
 * fork F-NN1(a) ratified 2026-08-14).
 *
 * WHY SHARED: `PayableService.resolveCounterpartyId` and `ReceivableService.resolveCounterpartyId`
 * were a LITERAL mirror — identical but for the type string and the message. That is the same shape
 * the reuse gate extracted for the listing filter in
 * [ADR-RC](../../../../../docs/adr/ADR-RC-SUBLEDGER-AP-AR-reuse-sanction.md) (`subledgerFilters.ts`),
 * so the same verdict applies: the mirrored half is shared, the diverging half (direction of the
 * posting, inventory, CRM bridge) stays in each service. The type/message travel as parameters.
 *
 * WHAT CHANGED vs. the nullable increment: this NEVER returns null. When no counterpartyId is
 * supplied, the name snapshot (`supplierName`/`customerName`) resolves — or mints — the catalog
 * identity, which is what lets the FK be NOT NULL without breaking a single caller (the DTO keeps
 * `counterpartyId` optional and `CrmReceivableBridge` keeps passing none).
 *
 * Invariants carried:
 * - SEC-A1-1 (IDOR #1): a body-supplied id is re-scoped via `findById(scope, …)`, never trusted.
 * - SEC-A1-2: dedupe is per SCOPE — `findByName` carries userId+unitId, so two tenants named "ACME"
 *   stay two identities.
 * - SEC-A1-4: `findByName` reads LIVE rows only; an archived name mints a NEW counterparty instead of
 *   resurrecting the archived one.
 * - T8/ACC-020: an implicit mint emits `counterparty.created` in the SAME tx as the subledger row —
 *   the catalog gains an identity, and a catalog state change is auditable (golden ref
 *   `CounterpartyService.createCounterparty`). No new eventType ⇒ the audit allowlist is unchanged.
 * - ACC-012: `tx` is REQUIRED, not optional — the mint and the AP/AR row commit or roll back together.
 */
export interface CounterpartyResolutionDeps {
  counterpartyRepo: ICounterpartyRepository;
  auditService: AuditService;
  /** Policy DO CATÁLOGO — a cunhagem implícita é escrita em `counterparties`, não em AP/AR. */
  policy: IAccountingPolicy;
}

export async function resolveOrCreateCounterpartyId(
  deps: CounterpartyResolutionDeps,
  scope: AccountingScope,
  type: CounterpartyType,
  /** Body-supplied id (SEC-A1-1 path) — when present it WINS and the name snapshot is not consulted. */
  explicitId: string | undefined,
  /** `supplierName` / `customerName` — the snapshot that names the identity when no id was supplied. */
  fallbackName: string,
  /** Wrong-type message, e.g. 'A contraparte de uma conta a pagar deve ser um fornecedor (SUPPLIER).' */
  wrongTypeMessage: string,
  tx: Prisma.TransactionClient,
): Promise<string> {
  if (explicitId) {
    const counterparty = await deps.counterpartyRepo.findById(scope, explicitId, tx);
    if (!counterparty) {
      throw new ValidationError('Contraparte informada não existe nesta unidade.');
    }
    if (counterparty.type !== type) {
      throw new ValidationError(wrongTypeMessage);
    }
    return counterparty.id;
  }

  const existing = await deps.counterpartyRepo.findByName(scope, type, fallbackName, tx);
  if (existing) return existing.id;

  return mintCounterparty(deps, scope, type, fallbackName, tx);
}

/**
 * Create the catalog identity + its audit event inside the caller's tx. The P2002 branch is the race
 * net: two creates for the same (scope, type, name) can interleave between the `findByName` miss and
 * the insert, and `@@unique([userId,unitId,type,name])` is what actually decides the winner. The loser
 * re-reads and adopts the winner's id instead of surfacing a duplicate-key error for a name the
 * operator merely typed twice.
 */
async function mintCounterparty(
  deps: CounterpartyResolutionDeps,
  scope: AccountingScope,
  type: CounterpartyType,
  name: string,
  tx: Prisma.TransactionClient,
): Promise<string> {
  // As duas guardas que a rota HTTP do catálogo aplica e que a cunhagem implícita não via (achado C
  // do review independente de 2026-08-14). Este é um caminho de ESCRITA em `counterparties`:
  //  • policy DO CATÁLOGO — `canManagePayable` autoriza criar a conta a pagar, não a criar identidade
  //    de catálogo. Hoje as duas devolvem `!!actorUserId`, então não há mudança de comportamento; a
  //    guarda existe para que o dia em que elas divergirem não abra um portal por baixo.
  //  • limite de `name` — `supplierName`/`customerName` não têm `.max` próprio, então um nome de 201
  //    caracteres nasceria como identidade que o DTO do catálogo recusaria. Recusar é a única saída
  //    honesta: truncar fabricaria uma identidade que pode colidir com outro fornecedor.
  if (!deps.policy.canManageCounterparty(scope)) {
    throw new ForbiddenError('Você não tem permissão para criar contrapartes.');
  }
  if (name.length > COUNTERPARTY_NAME_MAX_LENGTH) {
    throw new ValidationError(
      `O nome da contraparte excede ${COUNTERPARTY_NAME_MAX_LENGTH} caracteres. ` +
        'Informe uma contraparte existente ou encurte o nome.',
    );
  }

  const { userId, unitId } = accountingScopeWhere(scope);

  // O try abraça SÓ o create. Se abraçasse também o append, um P2002 da cadeia de auditoria
  // (`AuditEvent @@unique([scopeUserId,unitId,seq])`) seria engolido pelo ramo da corrida — e
  // `AuditService` garante o contrário, literalmente: "P2002 on seq/hash is NEVER swallowed —
  // propagates to rollback the outer tx" (T8). Aqui só o P2002 DO CATÁLOGO decide a corrida.
  let created;
  try {
    created = await deps.counterpartyRepo.create(
      {
        userId,
        unitId,
        type,
        name,
        // ref stays null: the backfill of 20260715060000 minted every historical counterparty with
        // ref=NULL, and supplierRef/customerRef are the SUBLEDGER's own DynamicTable pointer (F1(c)),
        // not the catalog's. Populating it here would invent data the spec does not ask for.
        ref: null,
        createdById: scope.actorUserId,
      },
      tx,
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const raced = await deps.counterpartyRepo.findByName(scope, type, name, tx);
      if (raced) return raced.id;
    }
    throw error;
  }

  await deps.auditService.append(tx, scope, {
    actorUserId: scope.actorUserId,
    eventType: COUNTERPARTY_CREATED,
    targetType: 'counterparty',
    targetId: created.id,
    payload: { counterpartyId: created.id, type: created.type, ref: created.ref },
  });
  return created.id;
}
