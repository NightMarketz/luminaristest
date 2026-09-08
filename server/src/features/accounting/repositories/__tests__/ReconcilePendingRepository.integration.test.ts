/**
 * CONTRATO DO ReconcilePendingRepository — integração contra SQLite REAL, sem mock de prisma.
 *
 * BE-INCR-RECONCILE-PENDING (nó C7). Memória do repo: "repositórios de contabilidade não são
 * exercitados" (repo falso nos testes de serviço = mutation_score 0/7) — este arquivo é a
 * contraparte: exercita o `@@unique` real do SQLite, o REOPEN forçado pela constraint (checklist
 * item 2 — não há caminho de "criar nova linha" quando a chave já existe, então o teste prova o
 * upsert real, não um mock que aceitaria qualquer coisa), e o isolamento de tenant (item 9).
 *
 * CADA CASO NEGATIVO TEM SEU CONTROLE — um repositório que nunca escreve também "passaria" em
 * qualquer asserção de ausência.
 */
import prisma from '@/lib/prisma';
import { pushTestSchema, resetDb, disconnectDb } from '@test/helpers/db';
import { ReconcilePendingRepository } from '@/features/accounting/repositories/ReconcilePendingRepository';
import { resolveAccountingScope } from '@/features/accounting/scope/AccountingScope';
import type { AccountingScope } from '@/features/accounting/scope/AccountingScope';

const UNIT = 'unit-rp';
const DONO_A = 'u-rp-a';
const DONO_B = 'u-rp-b';

const escopo = (userId: string, unitId: string = UNIT): AccountingScope =>
  resolveAccountingScope({ userId }, unitId);

const repo = new ReconcilePendingRepository();

describe('ReconcilePendingRepository — contrato em SQLite real', () => {
  beforeAll(async () => {
    pushTestSchema();
    for (const id of [DONO_A, DONO_B]) {
      await prisma.user.create({
        data: { id, name: id, username: id, email: `${id}@test.local`, password: 'x', role: 'USER' },
      });
    }
  }, 120000);

  afterEach(async () => {
    await resetDb();
    // resetDb() apaga User também — recria os dois donos para o próximo teste.
    for (const id of [DONO_A, DONO_B]) {
      await prisma.user.create({
        data: { id, name: id, username: id, email: `${id}@test.local`, password: 'x', role: 'USER' },
      });
    }
  });

  afterAll(async () => {
    await disconnectDb();
  });

  // ------------------------------------------------------------------ controle do harness
  it('CONTROLE: upsertPending grava e findById devolve a linha dentro do próprio escopo', async () => {
    const scope = escopo(DONO_A);
    const created = await repo.upsertPending(scope, {
      sourceType: 'sale.finalized',
      sourceId: 'sale-1',
      reasonCode: 'FAILED',
      reasonDetail: 'boom',
    });
    expect(created.attempts).toBe(1);
    expect(created.resolvedAt).toBeNull();

    const found = await repo.findById(scope, created.id);
    expect(found).not.toBeNull();
    expect(found!.sourceId).toBe('sale-1');
  });

  // ------------------------------------------------------------------ item 2: idempotência real
  it('@@unique real: a MESMA identidade capturada 2x não duplica linha — incrementa attempts', async () => {
    const scope = escopo(DONO_A);
    await repo.upsertPending(scope, {
      sourceType: 'sale.finalized',
      sourceId: 'sale-dup',
      reasonCode: 'FAILED',
      reasonDetail: 'first',
    });
    const second = await repo.upsertPending(scope, {
      sourceType: 'sale.finalized',
      sourceId: 'sale-dup',
      reasonCode: 'ACCOUNTING_PERIOD_NOT_OPEN',
      reasonDetail: 'second',
    });

    expect(second.attempts).toBe(2);
    expect(second.reasonCode).toBe('ACCOUNTING_PERIOD_NOT_OPEN');

    const { items } = await repo.findManyByUnit(scope, { includeResolved: true, limit: 50 });
    const rows = items.filter((i) => i.sourceId === 'sale-dup');
    expect(rows).toHaveLength(1); // NUNCA 2 — a constraint real do SQLite é quem prova isto
  });

  // ------------------------------------------------------------------ item 2/5: reopen forçado
  it('REOPEN: item resolvido que falha de novo reabre a MESMA linha (resolvedAt volta a null, firstSeenAt preservado)', async () => {
    const scope = escopo(DONO_A);
    const first = await repo.upsertPending(scope, {
      sourceType: 'sale.settled',
      sourceId: 'sale-reopen',
      reasonCode: 'FAILED',
      reasonDetail: 'first failure',
    });
    const resolvedCount = await repo.resolvePending(scope, 'sale.settled', 'sale-reopen');
    expect(resolvedCount).toBe(1);

    const reopened = await repo.upsertPending(scope, {
      sourceType: 'sale.settled',
      sourceId: 'sale-reopen',
      reasonCode: 'FAILED',
      reasonDetail: 'failed again after being resolved',
    });

    expect(reopened.id).toBe(first.id); // SAME row — @@unique forbids a second one
    expect(reopened.resolvedAt).toBeNull(); // reopened
    expect(reopened.attempts).toBe(2);
    expect(reopened.firstSeenAt.getTime()).toBe(first.firstSeenAt.getTime()); // preserved
  });

  // ------------------------------------------------------------------ resolvePending negative
  it('resolvePending devolve 0 (nunca lança) quando não há pendência para aquela identidade', async () => {
    const scope = escopo(DONO_A);
    const count = await repo.resolvePending(scope, 'sale.finalized', 'never-existed');
    expect(count).toBe(0);
  });

  it('resolvePending NÃO re-resolve um item já resolvido (idempotente, count 0 na 2ª chamada)', async () => {
    const scope = escopo(DONO_A);
    await repo.upsertPending(scope, {
      sourceType: 'sale.finalized',
      sourceId: 'sale-idem-resolve',
      reasonCode: 'FAILED',
      reasonDetail: 'x',
    });
    const firstResolve = await repo.resolvePending(scope, 'sale.finalized', 'sale-idem-resolve');
    const secondResolve = await repo.resolvePending(scope, 'sale.finalized', 'sale-idem-resolve');
    expect(firstResolve).toBe(1);
    expect(secondResolve).toBe(0);
  });

  // ------------------------------------------------------------------ item 9: isolamento de tenant
  it('ISOLAMENTO: pendência do dono B não aparece na listagem nem é resolvível pelo escopo do dono A', async () => {
    const scopeA = escopo(DONO_A);
    const scopeB = escopo(DONO_B);
    await repo.upsertPending(scopeB, {
      sourceType: 'sale.finalized',
      sourceId: 'sale-tenant-b',
      reasonCode: 'FAILED',
      reasonDetail: 'tenant B item',
    });

    const { items: itemsA } = await repo.findManyByUnit(scopeA, { includeResolved: true, limit: 50 });
    expect(itemsA.find((i) => i.sourceId === 'sale-tenant-b')).toBeUndefined();

    // Cross-tenant resolve must be a no-op (count 0), never touch B's row via A's scope.
    const crossResolve = await repo.resolvePending(scopeA, 'sale.finalized', 'sale-tenant-b');
    expect(crossResolve).toBe(0);

    const { items: itemsB } = await repo.findManyByUnit(scopeB, { includeResolved: true, limit: 50 });
    expect(itemsB.find((i) => i.sourceId === 'sale-tenant-b')?.resolvedAt).toBeNull();
  });

  // ------------------------------------------------------------------ findManyByUnit filters
  it('findManyByUnit filtra por reasonCode e por includeResolved, e pagina por cursor (id)', async () => {
    const scope = escopo(DONO_A);
    await repo.upsertPending(scope, {
      sourceType: 'sale.finalized',
      sourceId: 's-1',
      reasonCode: 'FAILED',
      reasonDetail: 'a',
    });
    await repo.upsertPending(scope, {
      sourceType: 'sale.finalized',
      sourceId: 's-2',
      reasonCode: 'MAX_CENTS_EXCEEDED',
      reasonDetail: 'b',
    });
    const third = await repo.upsertPending(scope, {
      sourceType: 'sale.finalized',
      sourceId: 's-3',
      reasonCode: 'MAX_CENTS_EXCEEDED',
      reasonDetail: 'c',
    });
    await repo.resolvePending(scope, 'sale.finalized', 's-3');

    const onlyPoison = await repo.findManyByUnit(scope, {
      reasonCode: 'MAX_CENTS_EXCEEDED',
      includeResolved: false,
      limit: 50,
    });
    // s-2 is MAX_CENTS_EXCEEDED and unresolved; s-3 is MAX_CENTS_EXCEEDED but RESOLVED — excluded.
    expect(onlyPoison.items.map((i) => i.sourceId)).toEqual(['s-2']);

    const includingResolved = await repo.findManyByUnit(scope, {
      reasonCode: 'MAX_CENTS_EXCEEDED',
      includeResolved: true,
      limit: 50,
    });
    expect(includingResolved.items.map((i) => i.sourceId).sort()).toEqual(['s-2', 's-3']);
    expect(includingResolved.items.find((i) => i.id === third.id)?.resolvedAt).not.toBeNull();

    // Keyset pagination: limit 1 returns hasMore=true and a next page starting after the cursor.
    const page1 = await repo.findManyByUnit(scope, { includeResolved: true, limit: 1 });
    expect(page1.items).toHaveLength(1);
    expect(page1.hasMore).toBe(true);
    const page2 = await repo.findManyByUnit(scope, {
      includeResolved: true,
      limit: 50,
      cursor: page1.items[0].id,
    });
    expect(page2.items.find((i) => i.id === page1.items[0].id)).toBeUndefined();
  });

  // ------------------------------------------------------------------ findUnresolved (rescan input)
  it('findUnresolved devolve só resolvedAt IS NULL, e respeita o subconjunto `ids` quando dado', async () => {
    const scope = escopo(DONO_A);
    const p1 = await repo.upsertPending(scope, {
      sourceType: 'sale.finalized',
      sourceId: 'u-1',
      reasonCode: 'FAILED',
      reasonDetail: 'x',
    });
    const p2 = await repo.upsertPending(scope, {
      sourceType: 'sale.finalized',
      sourceId: 'u-2',
      reasonCode: 'FAILED',
      reasonDetail: 'x',
    });
    await repo.resolvePending(scope, 'sale.finalized', 'u-2');

    const all = await repo.findUnresolved(scope);
    expect(all.map((i) => i.id)).toEqual([p1.id]); // p2 já resolvido, fora

    const subset = await repo.findUnresolved(scope, [p1.id, p2.id]);
    expect(subset.map((i) => i.id)).toEqual([p1.id]); // p2 no subset, mas resolvido → ainda fora
  });

  // ------------------------------------------------------------------ bumpAttempts (rescan still-pending)
  it('bumpAttempts incrementa attempts sem tocar reasonCode/resolvedAt; no-op (0) se já resolvido', async () => {
    const scope = escopo(DONO_A);
    const created = await repo.upsertPending(scope, {
      sourceType: 'sale.finalized',
      sourceId: 'sale-bump',
      reasonCode: 'MAX_CENTS_EXCEEDED',
      reasonDetail: 'still exceeding',
    });
    const bumped = await repo.bumpAttempts(scope, 'sale.finalized', 'sale-bump');
    expect(bumped).toBe(1);

    const after = await repo.findById(scope, created.id);
    expect(after!.attempts).toBe(2);
    expect(after!.reasonCode).toBe('MAX_CENTS_EXCEEDED');
    expect(after!.resolvedAt).toBeNull();

    await repo.resolvePending(scope, 'sale.finalized', 'sale-bump');
    const noopCount = await repo.bumpAttempts(scope, 'sale.finalized', 'sale-bump');
    expect(noopCount).toBe(0);
  });
});
