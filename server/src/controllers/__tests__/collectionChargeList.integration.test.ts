/**
 * FE-INCR-PAYMENT-PROVIDER-EMENDA-1 (nó F5), PR-0 — lista de cobranças da unidade, pela borda HTTP.
 * Item 0e: isolamento por escopo (2 unidades × 2 usuários), filtros status/kind, paginação sem repetição,
 * `payer` ausente mesmo para gestor (F9), 400 para status inválido e parâmetro desconhecido, 403 sem
 * `canReadReceivable`. Leitura pura: nenhum AuditEvent. As cobranças entram direto pelo Prisma (sem provedor).
 */
import { randomBytes } from 'node:crypto';
import request from 'supertest';
import prisma from '@/lib/prisma';
import { ForbiddenError } from '@/lib/errors';
import { CollectionChargeService } from '@/features/accounting/services/CollectionChargeService';
import type { ICollectionChargeRepository } from '@/features/accounting/repositories/ICollectionChargeRepository';
import type { IAccountingPolicy } from '@/features/accounting/policies/IAccountingPolicy';
import type { AccountingScope } from '@/features/accounting/scope/AccountingScope';
import { makeApp, pushTestSchema, authHeader, seedUnit } from '@test/helpers';

const app = makeApp();
const UNIT_A = 'unit-f5-pr0-a';
const UNIT_A2 = 'unit-f5-pr0-a2';
const UNIT_B = 'unit-f5-pr0-b';
const PAYER = JSON.stringify({ firstName: 'Ana', lastName: 'Lima', email: 'ana@cliente.test', identification: { type: 'CPF', number: '12345678901' } });

let dono: { id: string; username: string };
let outro: { id: string; username: string };

async function contaETitulos(userId: string, unitId: string) {
  const gl = await prisma.account.create({ data: { userId, unitId, code: '1.1.9', name: 'Saldo MP', nature: 'Asset', acceptsEntries: true } });
  const rev = await prisma.account.create({ data: { userId, unitId, code: '3.1.1', name: 'Receita', nature: 'Revenue', acceptsEntries: true } });
  const conta = await prisma.paymentAccount.create({
    data: { userId, unitId, provider: 'MERCADO_PAGO', label: 'MP', glAccountId: gl.id, configJson: '{}', status: 'ACTIVE' },
  });
  const cp = await prisma.counterparty.create({ data: { userId, unitId, type: 'CUSTOMER', name: 'Cliente', nameNormalized: 'cliente', taxId: '12345678901' } });
  return { contaId: conta.id, revenueId: rev.id, cpId: cp.id };
}

/** Uma cobrança por título (o banco recusa duas vivas no mesmo título). `createdAt` explícito para a ordem. */
async function cobranca(userId: string, unitId: string, base: { contaId: string; revenueId: string; cpId: string }, o: { kind: string; status: string; at: Date }) {
  const titulo = await prisma.receivable.create({
    data: {
      userId, unitId, customerName: 'Cliente', documentNumber: `FAT-${randomBytes(3).toString('hex')}`, description: 'Serviço',
      issueDate: new Date('2026-10-01'), dueDate: new Date('2026-10-30'), amountCents: 10000n, receivedCents: 0n,
      revenueAccountId: base.revenueId, counterpartyId: base.cpId, status: 'OPEN',
    },
  });
  return prisma.collectionCharge.create({
    data: {
      userId, unitId, paymentAccountId: base.contaId, receivableId: titulo.id, counterpartyId: base.cpId, kind: o.kind, amountCents: 10000n,
      expiresAt: new Date('2026-11-05T12:00:00.000Z'), status: o.status, payerSnapshotJson: PAYER, createdAt: o.at,
    },
  });
}

const listar = (user: { id: string; username: string }, qs: string) =>
  request(app).get(`/api/collection-charges?${qs}`).set(authHeader(user));

describe('F5 PR-0 — GET /api/collection-charges (lista da unidade)', () => {
  const idsA: string[] = []; // ordem de criação (createdAt crescente)
  let apagadaId: string;
  let auditAntes: number;

  beforeAll(async () => {
    pushTestSchema();
    dono = await prisma.user.create({ data: { name: 'f5p0', username: 'f5-pr0', email: 'f5pr0@test.local', password: 'x', role: 'USER' } });
    outro = await prisma.user.create({ data: { name: 'f5p0b', username: 'f5-pr0-b', email: 'f5pr0b@test.local', password: 'x', role: 'USER' } });
    await seedUnit({ userId: dono.id, id: UNIT_A });
    await seedUnit({ userId: dono.id, id: UNIT_A2 });
    await seedUnit({ userId: outro.id, id: UNIT_B });
    const a = await contaETitulos(dono.id, UNIT_A);
    const a2 = await contaETitulos(dono.id, UNIT_A2);
    const b = await contaETitulos(outro.id, UNIT_B);
    // 5 na unidade A: 3 PIX (PENDING, PAID, PENDING) e 2 BOLETO (PENDING, EXPIRED); createdAt 1 min apart.
    const plano = [
      { kind: 'PIX', status: 'PENDING' },
      { kind: 'BOLETO', status: 'PENDING' },
      { kind: 'PIX', status: 'PAID' },
      { kind: 'BOLETO', status: 'EXPIRED' },
      { kind: 'PIX', status: 'PENDING' },
    ];
    for (const [i, p] of plano.entries()) {
      idsA.push((await cobranca(dono.id, UNIT_A, a, { ...p, at: new Date(Date.UTC(2026, 9, 20, 12, i)) })).id);
    }
    const apagada = await cobranca(dono.id, UNIT_A, a, { kind: 'PIX', status: 'CANCELLED', at: new Date(Date.UTC(2026, 9, 20, 13)) });
    apagadaId = apagada.id;
    await prisma.collectionCharge.update({ where: { id: apagadaId }, data: { deletedAt: new Date() } });
    await cobranca(dono.id, UNIT_A2, a2, { kind: 'PIX', status: 'PENDING', at: new Date(Date.UTC(2026, 9, 20, 14)) });
    await cobranca(outro.id, UNIT_B, b, { kind: 'PIX', status: 'PENDING', at: new Date(Date.UTC(2026, 9, 20, 14)) });
    auditAntes = await prisma.auditEvent.count();
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('0c/0e: só as cobranças vivas da unidade pedida, createdAt desc, com total/page/limit; sem pagador mesmo para gestor', async () => {
    const r = await listar(dono, `unitId=${UNIT_A}`);
    expect(r.status).toBe(200);
    expect(r.body.data).toMatchObject({ total: 5, page: 1, limit: 20 });
    expect(r.body.data.items.map((c: { id: string }) => c.id)).toEqual([...idsA].reverse());
    expect(r.body.data.items.map((c: { id: string }) => c.id)).not.toContain(apagadaId);
    for (const c of r.body.data.items) {
      expect(c.unitId).toBe(UNIT_A);
      expect(c.payer).toBeUndefined();
    }
    expect(JSON.stringify(r.body)).not.toContain('ana@cliente.test');
  });

  it('0e (isolamento): outro usuário não lê a unidade A; cada unidade só vê as suas', async () => {
    const alheio = await listar(outro, `unitId=${UNIT_A}`);
    expect(alheio.status).not.toBe(200);
    expect(JSON.stringify(alheio.body)).not.toContain(idsA[0]);
    const proprio = await listar(outro, `unitId=${UNIT_B}`);
    expect(proprio.status).toBe(200);
    expect(proprio.body.data.total).toBe(1);
    expect(proprio.body.data.items[0].unitId).toBe(UNIT_B);
    const a2 = await listar(dono, `unitId=${UNIT_A2}`);
    expect(a2.body.data.total).toBe(1);
    expect(a2.body.data.items[0].unitId).toBe(UNIT_A2);
  });

  it('0a/0e: filtros por status e por kind, sozinhos e juntos', async () => {
    const pend = await listar(dono, `unitId=${UNIT_A}&status=PENDING`);
    expect(pend.body.data.total).toBe(3);
    expect(pend.body.data.items.every((c: { status: string }) => c.status === 'PENDING')).toBe(true);
    const boleto = await listar(dono, `unitId=${UNIT_A}&kind=BOLETO`);
    expect(boleto.body.data.items.map((c: { id: string }) => c.id)).toEqual([idsA[3], idsA[1]]);
    const pixPend = await listar(dono, `unitId=${UNIT_A}&kind=PIX&status=PENDING`);
    expect(pixPend.body.data.items.map((c: { id: string }) => c.id)).toEqual([idsA[4], idsA[0]]);
  });

  it('0b/0e: paginação — total certo em toda página, sem repetição, cobre tudo', async () => {
    const vistos: string[] = [];
    for (const page of [1, 2, 3]) {
      const r = await listar(dono, `unitId=${UNIT_A}&page=${page}&limit=2`);
      expect(r.status).toBe(200);
      expect(r.body.data).toMatchObject({ total: 5, page, limit: 2 });
      vistos.push(...r.body.data.items.map((c: { id: string }) => c.id));
    }
    expect(vistos).toEqual([...idsA].reverse());
    expect(new Set(vistos).size).toBe(5);
    const alem = await listar(dono, `unitId=${UNIT_A}&page=4&limit=2`);
    expect(alem.body.data).toMatchObject({ items: [], total: 5 });
  });

  it('0a/0e: 400 para status/kind inválido, parâmetro desconhecido, limit fora da faixa e unitId ausente', async () => {
    for (const qs of [
      `unitId=${UNIT_A}&status=PAGO`,
      `unitId=${UNIT_A}&kind=CARTAO`,
      `unitId=${UNIT_A}&receivableId=x`,
      `unitId=${UNIT_A}&includePayer=true`,
      `unitId=${UNIT_A}&limit=101`,
      `unitId=${UNIT_A}&page=0`,
      'status=PENDING',
    ]) {
      const r = await listar(dono, qs);
      expect([qs, r.status]).toEqual([qs, 400]);
    }
  });

  it('16b (D-2026-10-29-F5-16B-E-P-RET-4 item 2): cada item traz o nº do título como escrito, também do título cancelado', async () => {
    const r = await listar(dono, `unitId=${UNIT_A}`);
    for (const c of r.body.data.items) {
      expect(c.receivableDocumentNumber).toMatch(/^FAT-[0-9a-f]{6}$/);
      expect(c.receivableCancelled).toBe(false);
    }
    // Título cancelado como o ReceivableService.cancel grava: status, deletedAt e o nº reescrito para `deleted:<id>:<nº>`
    // (rename-on-delete). A lista mostra o nº original e marca o título como cancelado (D-2026-10-29-F5-16B-TITULO-CANCELADO).
    const alvo = await prisma.collectionCharge.findUniqueOrThrow({ where: { id: idsA[3] } });
    await prisma.receivable.update({
      where: { id: alvo.receivableId },
      data: { status: 'CANCELLED', deletedAt: new Date(), documentNumber: `deleted:${alvo.receivableId}:FAT-CANC` },
    });
    const depois = await listar(dono, `unitId=${UNIT_A}&kind=BOLETO&status=EXPIRED`);
    expect(
      depois.body.data.items.map((c: { id: string; receivableDocumentNumber: string; receivableCancelled: boolean }) => [c.id, c.receivableDocumentNumber, c.receivableCancelled]),
    ).toEqual([[idsA[3], 'FAT-CANC', true]]);
  });

  it('0d: GET /:id continua respondendo depois da rota da lista', async () => {
    const r = await request(app).get(`/api/collection-charges/${idsA[0]}?unitId=${UNIT_A}`).set(authHeader(dono));
    expect(r.status).toBe(200);
    expect(r.body.data.id).toBe(idsA[0]);
  });

  it('0e: leitura não emite AuditEvent', async () => {
    expect(await prisma.auditEvent.count()).toBe(auditAntes);
  });

  it('0c/0e: sem canReadReceivable ⇒ 403 (ForbiddenError) antes de tocar o repositório', async () => {
    const repo = { findPageByUnit: jest.fn() } as unknown as ICollectionChargeRepository;
    const policy = { canReadReceivable: () => false } as unknown as IAccountingPolicy;
    const svc = new CollectionChargeService(repo, {} as never, {} as never, {} as never, {} as never, policy, () => {
      throw new Error('sem provedor numa leitura');
    });
    const scope = { ownerUserId: dono.id, unitId: UNIT_A } as unknown as AccountingScope;
    await expect(svc.listByUnit(scope, { unitId: UNIT_A, page: 1, limit: 20 })).rejects.toBeInstanceOf(ForbiddenError);
    expect(repo.findPageByUnit).not.toHaveBeenCalled();
  });
});
