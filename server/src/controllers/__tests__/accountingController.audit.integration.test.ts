/**
 * CONTRATO HTTP de `GET /api/accounting/audit/verify-chain` — app Express REAL sobre
 * supertest + SQLite REAL, sem mock de prisma e sem mock de serviço.
 *
 * BRIEF-W1-A (item A-2): chamador de produção para `AuditService.verifyAuditChain`
 * (`server/src/features/accounting/services/AuditService.ts:113`), hoje sem nenhum caller de
 * produção. Par vermelho→verde exigido pelo gate de saída do BRIEF:
 *   (1) cadeia íntegra criada via `POST /post` real → `ok: true`.
 *   (2) hash de um `AuditEvent` adulterado DIRETO no banco de teste → `ok: false` com
 *       `failure.reason === 'HASH_MISMATCH'` e `failure.seq` correto.
 * Mais 401 (sem token) e 400 (`unitId` ausente) — a mesma dupla de guarda que todo outro GET
 * de relatório deste controller já cobre (`getTieOutDiagnostic`, `getAging`).
 *
 * F-A2 (fork decidido pelo orquestrador): `firstSeq`/`lastSeq`/`failure.seq` são `bigint` no
 * serviço; o controller serializa para `string` antes do `res.json` — as asserções abaixo
 * conferem STRING, não `bigint`, porque é isso que atravessa o JSON de verdade.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';

const app = makeApp();

const UNIT = 'unit-audit-verify';
const DATA = '2026-06-15';

let dono: { id: string; username: string };

const criarUsuario = (username: string) =>
  prisma.user.create({
    data: { name: username, username, email: `${username}@test.local`, password: 'x', role: 'USER' },
  });

const abrirPeriodo = (userId: string, unitId: string) =>
  prisma.accountingPeriod.create({
    data: { userId, unitId, year: 2026, month: 6, status: 'OPEN', openedAt: new Date(), openedById: userId },
  });

const criarConta = (userId: string, unitId: string, code: string, nature: string) =>
  prisma.account.create({
    data: { userId, unitId, code, name: `Conta ${code}`, nature, acceptsEntries: true },
  });

/** Lançamento balanceado mínimo: D 4.1 despesa / C 1.1.1 banco, em centavos inteiros. */
const lancamento = (descricao: string, centavos: number) => ({
  unitId: UNIT,
  date: DATA,
  description: descricao,
  sourceType: 'manual',
  lines: [
    { accountCode: '4.1', debitCents: centavos, creditCents: 0 },
    { accountCode: '1.1.1', debitCents: 0, creditCents: centavos },
  ],
});

const post = (ator: { id: string; username: string } | null, body: object) => {
  const req = request(app).post('/api/accounting/post');
  return ator ? req.set(authHeader(ator)).send(body) : req.send(body);
};

const verifyChain = (ator: { id: string; username: string } | null) => {
  const req = request(app).get('/api/accounting/audit/verify-chain').query({ unitId: UNIT });
  return ator ? req.set(authHeader(ator)) : req;
};

/** Mesma rota, SEM `unitId` na query — caso 400 dedicado (não pode reusar `verifyChain`). */
const verifyChainSemUnitId = (ator: { id: string; username: string }) =>
  request(app).get('/api/accounting/audit/verify-chain').set(authHeader(ator));

describe('accountingController — GET /api/accounting/audit/verify-chain (BRIEF-W1-A)', () => {
  beforeAll(async () => {
    pushTestSchema();
    dono = await criarUsuario('audit-verify-owner');
    await abrirPeriodo(dono.id, UNIT);
    await criarConta(dono.id, UNIT, '4.1', 'Expense');
    await criarConta(dono.id, UNIT, '1.1.1', 'Asset');
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('401 sem token', async () => {
    const res = await verifyChain(null);
    expect(res.status).toBe(401);
  });

  it('400 sem unitId', async () => {
    const res = await verifyChainSemUnitId(dono);
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('cadeia íntegra criada via POST /post real → ok:true, firstSeq/lastSeq como STRING', async () => {
    // Arranja a cadeia pelo caminho de produção real — postEntry chama AuditService.append
    // dentro da mesma tx do lançamento (não é o teste que grava o AuditEvent diretamente).
    const posted = await post(dono, lancamento('venda à vista', 12345));
    expect(posted.status).toBe(201);

    const res = await verifyChain(dono);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.ok).toBe(true);
    expect(res.body.data.checkedEvents).toBeGreaterThanOrEqual(1);
    expect(typeof res.body.data.firstSeq).toBe('string');
    expect(typeof res.body.data.lastSeq).toBe('string');
    expect(res.body.data.firstSeq).toBe('1');
    expect(res.body.data.failure).toBeUndefined();
  });

  it('hash de um AuditEvent adulterado DIRETO no banco → ok:false, HASH_MISMATCH, failure.seq correto', async () => {
    // Confia que o caso anterior já criou pelo menos o evento seq=1 deste escopo/unidade;
    // lê a linha real da base (não confia em memória) e adultera só o campo hash.
    const evento = await prisma.auditEvent.findFirstOrThrow({
      where: { scopeUserId: dono.id, unitId: UNIT, seq: 1n },
    });
    await prisma.auditEvent.update({
      where: { id: evento.id },
      data: { hash: 'hash-adulterado-pelo-teste' },
    });

    const res = await verifyChain(dono);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.ok).toBe(false);
    expect(res.body.data.failure).toEqual({ seq: '1', reason: 'HASH_MISMATCH' });
  });
});
