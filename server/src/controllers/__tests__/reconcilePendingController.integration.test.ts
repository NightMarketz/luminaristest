/**
 * CONTRATO HTTP do reconcilePendingController — app Express REAL sobre supertest + SQLite REAL,
 * sem mock de prisma e sem mock de serviço. Mesmo molde de `accountingController.integration.test.ts`
 * / `accountingController.periods.integration.test.ts` (dono A × dono B).
 *
 * PÓS-REVIEW (PR #296, achado 2 — ALTO): a tenancy de `reconcile-pending` só tinha prova em dois
 * níveis mais baixos — `ReconcilePendingRepository.integration.test.ts:140` (SQLite real, repo
 * direto) e `ReconcilePendingService.test.ts` (policy MOCKADA → `ForbiddenError`) — nunca
 * ponta-a-ponta pela rota+auth real (`authMiddleware → rota → DTO → controller → service →
 * repository → Prisma`, produção rodando).
 *
 * A FORMA DA RECUSA (conforme a policy real, lida em `AccountingPolicy.ts`, não assumida): este
 * módulo NÃO tem NotFoundError/ForbiddenError por id cross-tenant — `canReadReconcilePending`/
 * `canManageReconcilePending` só checam `!!scope.actorUserId` (qualquer autenticado passa) e o
 * isolamento inteiro mora no WHERE (`accountingScopeWhere`, `userId` vem do TOKEN via
 * `resolveAccountingScope`, nunca de input do atacante) — comentário explícito em
 * `AccountingPolicy.ts`: "a wrong unitId only creates a separate sub-partition under that same
 * userId, never a cross-tenant leak". Por isso a listagem cross-tenant é 200 com o item do OUTRO
 * dono AUSENTE (não 404), e o rescan cross-tenant é 200 com `attempted: 0` (nada casou o WHERE) —
 * mesmo padrão da leitura de balancete em `accountingController.integration.test.ts`, não do
 * `reverse` (que tem lookup por id único e aí sim 404 anti-enumeração).
 *
 * CADA CASO NEGATIVO TEM CONTROLE — dono A enxergando/re-varrendo o PRÓPRIO item prova que o 200
 * vazio acima é a guarda mordendo, não o endpoint quebrado para todo mundo.
 *
 * FALSEAMENTO (colado no relatório da sessão): com `accountingScopeWhere` temporariamente editado
 * em `ReconcilePendingRepository.ts` (`findManyByUnit`/`findUnresolved`) para IGNORAR `userId` no
 * WHERE, os dois testes abaixo (`leitura` e `rescan`) foram executados e falharam pelo motivo
 * certo — o item do dono A vazou para a listagem do dono B, e o rescan do dono B tocou o item do
 * dono A (`attempted: 1`, `attempts` incrementado). Revertido antes do commit.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';

const app = makeApp();

const UNIT = 'unit-reconcile-http';

let donoA: { id: string; username: string };
let donoB: { id: string; username: string };

const criarUsuario = (username: string) =>
  prisma.user.create({
    data: { name: username, username, email: `${username}@test.local`, password: 'x', role: 'USER' },
  });

/** Insere a pendência DIRETO na base — o fixture não depende do job real capturá-la. */
const criarPendencia = (userId: string, sourceId: string) =>
  prisma.reconcilePendingItem.create({
    data: {
      userId,
      unitId: UNIT,
      sourceType: 'sale.finalized',
      sourceId,
      reasonCode: 'FAILED',
      reasonDetail: 'fixture de teste HTTP',
      resolvedAt: null,
      attempts: 1,
    },
  });

describe('reconcilePendingController — contrato HTTP em SQLite real (tenancy, pós-review PR #296 achado 2)', () => {
  beforeAll(async () => {
    pushTestSchema();
    donoA = await criarUsuario('reconcile-http-a');
    donoB = await criarUsuario('reconcile-http-b');
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('inquilino (GET): listagem do dono B não devolve a pendência do dono A, mesma unitId', async () => {
    const pendA = await criarPendencia(donoA.id, 'sale-tenant-http-a');

    const doB = await request(app)
      .get('/api/reconcile-pending')
      .set(authHeader(donoB))
      .query({ unitId: UNIT });
    expect(doB.status).toBe(200);
    expect(doB.body.data.items.map((i: { id: string }) => i.id)).not.toContain(pendA.id);

    // Controle: o PRÓPRIO dono enxerga — o array vazio acima é a guarda, não um endpoint quebrado.
    const doA = await request(app)
      .get('/api/reconcile-pending')
      .set(authHeader(donoA))
      .query({ unitId: UNIT });
    expect(doA.status).toBe(200);
    expect(doA.body.data.items.map((i: { id: string }) => i.id)).toContain(pendA.id);
  });

  it('inquilino (POST /rescan): dono B não toca a pendência do dono A — attempted:0, nada gravado do lado de A', async () => {
    const pendA = await criarPendencia(donoA.id, 'sale-tenant-http-rescan-a');

    const resB = await request(app)
      .post('/api/reconcile-pending/rescan')
      .set(authHeader(donoB))
      .send({ unitId: UNIT, ids: [pendA.id] });

    expect(resB.status).toBe(200);
    expect(resB.body.data).toEqual({ attempted: 0, resolved: 0, stillPending: 0 });

    const aindaDeA = await prisma.reconcilePendingItem.findUnique({ where: { id: pendA.id } });
    expect(aindaDeA!.attempts).toBe(1); // não incrementou — o retry do B nunca alcançou a linha
    expect(aindaDeA!.resolvedAt).toBeNull();

    // Controle: o PRÓPRIO dono re-varre e ALCANÇA a linha (attempted:1) — sourceId não existe
    // como DynamicTable row de verdade, então fica still_pending (retry sem crash), não resolved;
    // o que importa aqui é que o WHERE do escopo casou, ao contrário do caso cross-tenant acima.
    const resA = await request(app)
      .post('/api/reconcile-pending/rescan')
      .set(authHeader(donoA))
      .send({ unitId: UNIT, ids: [pendA.id] });
    expect(resA.status).toBe(200);
    expect(resA.body.data).toEqual({ attempted: 1, resolved: 0, stillPending: 1 });

    const depoisDeA = await prisma.reconcilePendingItem.findUnique({ where: { id: pendA.id } });
    expect(depoisDeA!.attempts).toBe(2); // bumpAttempts rodou — a linha foi de fato alcançada
  });
});
