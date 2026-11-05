/**
 * FIX-TESTES item 4, lote 1 (BRIEF `FIX-TESTES-REPO-FALSO-POR-ROTA`, itens 3–4): as 8 rotas que escrevem no razão, no
 * período ou no job fiscal e não tinham `request(app)` em integração (`docs/operating-manual/COBERTURA-ROTAS-CONTABIL-2026-11-05.md`).
 *
 * Cada rota: caminho feliz pela HTTP (`makeApp` + `authHeader`, policy, auditoria e repositório reais, SQLite de integração)
 * com 2ª leitura depois da escrita, e uma guarda no estado em que ela morde (A2). Não repete os valores dos units (A1).
 *
 * O que vem por `prisma.*` (fora do razão): usuário, unidade, período OPEN e a linha do job de exportação SPED. Gerar uma
 * ECD de verdade só para ter um job EXPORTED não é o que estas rotas testam; o mesmo atalho está em
 * `deliveryList.integration.test.ts:22`. Lançamentos entram pela rota `POST /api/accounting/post`.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader, seedUnit } from '@test/helpers';
import { getFactory } from '@/lib/factory';
import { resolveAccountingScopeInternal } from '@/features/accounting/scope/resolveAccountingScopeInternal';

const app = makeApp();
type U = { id: string; username: string };

async function criarDono(tag: string): Promise<U> {
  return prisma.user.create({
    data: { name: tag, username: tag, email: `${tag}@test.local`, password: 'x', role: 'USER' },
  });
}

const abrirPeriodo = (u: U, unitId: string, year: number, month: number) =>
  prisma.accountingPeriod.create({
    data: { userId: u.id, unitId, year, month, status: 'OPEN', openedAt: new Date(), openedById: u.id },
  });

async function fecharPeriodo(u: U, unitId: string, year: number, month: number) {
  const p = await abrirPeriodo(u, unitId, year, month);
  const scope = resolveAccountingScopeInternal({ userId: u.id }, unitId);
  await getFactory().getPeriodService().softClosePeriod(scope, p.id, 'fechamento do mês');
}

async function lancar(u: U, unitId: string, date: string, debito: string, credito: string, cents: number) {
  const res = await request(app)
    .post('/api/accounting/post')
    .set(authHeader(u))
    .send({
      unitId,
      date,
      description: `lançamento ${debito}/${credito}`,
      lines: [
        { accountCode: debito, debitCents: cents, creditCents: 0 },
        { accountCode: credito, debitCents: 0, creditCents: cents },
      ],
    });
  expect(res.status).toBe(201);
  return res.body.data.id as string;
}

/** Postings de um lançamento, por código de conta: `{ '3.1': 'D10000' }`. */
async function pernas(entryId: string): Promise<Record<string, string>> {
  const ps = await prisma.posting.findMany({ where: { entryId }, include: { account: true } });
  return Object.fromEntries(
    ps.map((p) => [p.account.code, p.debitCents > 0n ? `D${p.debitCents}` : `C${p.creditCents}`]),
  );
}

const criarJobEcd = (u: U, unitId: string, extra: Record<string, unknown> = {}) =>
  prisma.accountingDataExchangeJob.create({
    data: {
      userId: u.id,
      unitId,
      direction: 'EXPORT',
      kind: 'EXPORT_SPED_ECD',
      status: 'EXPORTED',
      requestedById: u.id,
      sha256: 'a'.repeat(64),
      periodStart: new Date(Date.UTC(2026, 0, 1)),
      periodEnd: new Date(Date.UTC(2026, 11, 31)),
      ...extra,
    },
  });

beforeAll(() => {
  pushTestSchema();
}, 120000);

afterAll(async () => {
  await prisma.$disconnect();
});

// ── 1. POST /api/accounting/closing/exercise ─────────────────────────────────────────────────────────────────────
describe('POST /api/accounting/closing/exercise', () => {
  const UNIT = 'unit-l1-closing';
  const UNIT_FECHADO = 'unit-l1-closing-dez-fechado';
  let dono: U;

  beforeAll(async () => {
    dono = await criarDono('l1-closing');
    for (const unit of [UNIT, UNIT_FECHADO]) {
      await seedUnit({ userId: dono.id, id: unit });
      await abrirPeriodo(dono, unit, 2025, 11);
      await lancar(dono, unit, '2025-11-10', '1.1.1.01', '3.1', 10000);
      await lancar(dono, unit, '2025-11-12', '4.1', '1.1.1.01', 4000);
    }
    await abrirPeriodo(dono, UNIT, 2025, 12);
    await fecharPeriodo(dono, UNIT_FECHADO, 2025, 12);
  }, 120000);

  it('201: o encerramento zera 3.1 e 4.1 contra 2.3.1.01; a releitura do razão tem as 3 pernas e a 2ª chamada devolve o mesmo lançamento', async () => {
    const res = await request(app).post('/api/accounting/closing/exercise').set(authHeader(dono)).send({ unitId: UNIT, year: 2025 });
    expect(res.status).toBe(201);

    const gravado = await prisma.journalEntry.findMany({ where: { userId: dono.id, unitId: UNIT, sourceType: 'closing' } });
    expect(gravado.map((e) => e.id)).toEqual([res.body.data.id]);
    expect(await pernas(res.body.data.id)).toEqual({ '3.1': 'D10000', '4.1': 'C4000', '2.3.1.01': 'C6000' });

    const de_novo = await request(app).post('/api/accounting/closing/exercise').set(authHeader(dono)).send({ unitId: UNIT, year: 2025 });
    expect(de_novo.body.data.id).toBe(res.body.data.id);
  });

  it('guarda: dezembro já SOFT_CLOSED, com saldo de resultado em novembro → 422 ACCOUNTING_PERIOD_NOT_OPEN e nenhum lançamento de encerramento', async () => {
    const res = await request(app)
      .post('/api/accounting/closing/exercise')
      .set(authHeader(dono))
      .send({ unitId: UNIT_FECHADO, year: 2025 });
    expect(res.status).toBe(422);
    expect(JSON.stringify(res.body)).toContain('ACCOUNTING_PERIOD_NOT_OPEN');
    expect(await prisma.journalEntry.count({ where: { userId: dono.id, unitId: UNIT_FECHADO, sourceType: 'closing' } })).toBe(0);
  });
});

// ── 2–4. Revisão profissional: acerto, sign-off, rejeição ────────────────────────────────────────────────────────
describe('revisões: POST /reviews/:id/findings/:findingId/adjustment, /sign-off, /reject', () => {
  const UNIT = 'unit-l1-review';
  let dono: U;
  const CRC = 'SP-000777/O-1';

  const abrirRevisao = async () => {
    const job = await criarJobEcd(dono, UNIT);
    const res = await request(app).post('/api/accounting/reviews').set(authHeader(dono)).send({ unitId: UNIT, year: 2026, ecdJobId: job.id });
    expect(res.status).toBe(201);
    return res.body.data.id as string;
  };
  const achado = async (reviewId: string, severity: 'BLOCKER' | 'NOTE') => {
    const res = await request(app)
      .post(`/api/accounting/reviews/${reviewId}/findings`)
      .set(authHeader(dono))
      .send({ unitId: UNIT, register: 'I250', locator: 'linha 12', description: 'valor divergente', severity });
    expect(res.status).toBe(201);
    return res.body.data.id as string;
  };
  const ler = async (reviewId: string) => {
    const res = await request(app).get(`/api/accounting/reviews/${reviewId}`).query({ unitId: UNIT }).set(authHeader(dono));
    expect(res.status).toBe(200);
    return res.body.data as { review: { status: string; reviewerCrc: string | null; closeReason: string | null }; findings: Array<{ finding: { id: string; resolution: string | null; resolutionTargetId: string | null } }> };
  };
  const acerto = (reviewId: string, findingId: string, postingDate: string) =>
    request(app)
      .post(`/api/accounting/reviews/${reviewId}/findings/${findingId}/adjustment`)
      .set(authHeader(dono))
      .send({
        unitId: UNIT,
        postingDate,
        description: 'acerto da revisão',
        lines: [
          { accountCode: '4.1', debitCents: 1000, creditCents: 0 },
          { accountCode: '1.1.1.01', debitCents: 0, creditCents: 1000 },
        ],
      });
  const assinar = (reviewId: string) =>
    request(app)
      .post(`/api/accounting/reviews/${reviewId}/sign-off`)
      .set(authHeader(dono))
      .send({ unitId: UNIT, reviewerName: 'Contadora Teste', reviewerCrc: CRC, statement: 'Revisei a ECD de 2026.' });
  const rejeitar = (reviewId: string) =>
    request(app).post(`/api/accounting/reviews/${reviewId}/reject`).set(authHeader(dono)).send({ unitId: UNIT, reason: 'ECD com saldo errado' });

  beforeAll(async () => {
    dono = await criarDono('l1-review');
    await seedUnit({ userId: dono.id, id: UNIT });
    await abrirPeriodo(dono, UNIT, 2026, 6);
    await fecharPeriodo(dono, UNIT, 2026, 5);
  }, 120000);

  it('acerto 201: grava o lançamento review_adjustment e a releitura da revisão mostra o achado apontando para ele', async () => {
    const reviewId = await abrirRevisao();
    const findingId = await achado(reviewId, 'NOTE');

    const res = await acerto(reviewId, findingId, '2026-06-30');
    expect(res.status).toBe(201);
    const entryId = res.body.data.entryId as string;

    const lido = await ler(reviewId);
    expect(lido.findings.map((f) => f.finding)).toEqual([
      expect.objectContaining({ id: findingId, resolution: 'ADJUSTMENT_ENTRY', resolutionTargetId: entryId }),
    ]);
    const entry = await prisma.journalEntry.findUniqueOrThrow({ where: { id: entryId } });
    expect(entry).toMatchObject({ sourceType: 'review_adjustment', sourceId: findingId, status: 'Posted' });
    expect(await pernas(entryId)).toEqual({ '4.1': 'D1000', '1.1.1.01': 'C1000' });
  });

  it('guarda do acerto: data em maio já SOFT_CLOSED → 422 ACCOUNTING_PERIOD_NOT_OPEN; o achado segue sem resolução e nada entra no razão', async () => {
    const reviewId = await abrirRevisao();
    const findingId = await achado(reviewId, 'NOTE');

    const res = await acerto(reviewId, findingId, '2026-05-31');
    expect(res.status).toBe(422);
    expect(JSON.stringify(res.body)).toContain('ACCOUNTING_PERIOD_NOT_OPEN');
    expect((await ler(reviewId)).findings[0].finding.resolution).toBeNull();
    expect(await prisma.journalEntry.count({ where: { sourceType: 'review_adjustment', sourceId: findingId } })).toBe(0);
  });

  it('sign-off 200: a releitura mostra SIGNED_OFF com o CRC normalizado', async () => {
    const reviewId = await abrirRevisao();

    const res = await assinar(reviewId);
    expect(res.status).toBe(200);
    expect((await ler(reviewId)).review).toMatchObject({ status: 'SIGNED_OFF', reviewerCrc: CRC });
  });

  it('guarda do sign-off: revisão com achado BLOCKER sem resolução → 409 REVIEW_STALE e a revisão segue OPEN', async () => {
    const reviewId = await abrirRevisao();
    await achado(reviewId, 'BLOCKER');

    const res = await assinar(reviewId);
    expect(res.status).toBe(409);
    expect(JSON.stringify(res.body)).toContain('REVIEW_STALE');
    expect((await ler(reviewId)).review.status).toBe('OPEN');
  });

  it('reject 200: a releitura mostra REJECTED com o motivo', async () => {
    const reviewId = await abrirRevisao();

    const res = await rejeitar(reviewId);
    expect(res.status).toBe(200);
    expect((await ler(reviewId)).review).toMatchObject({ status: 'REJECTED', closeReason: 'ECD com saldo errado' });
  });

  it('guarda do reject: revisão já SIGNED_OFF → 409 REVIEW_NOT_OPEN e a assinatura fica', async () => {
    const reviewId = await abrirRevisao();
    expect((await assinar(reviewId)).status).toBe(200);

    const res = await rejeitar(reviewId);
    expect(res.status).toBe(409);
    expect(JSON.stringify(res.body)).toContain('REVIEW_NOT_OPEN');
    expect((await ler(reviewId)).review).toMatchObject({ status: 'SIGNED_OFF', closeReason: null });
  });
});

// ── 5–7. Conciliação bancária: auto-match, match manual, unmatch ─────────────────────────────────────────────────
describe('conciliação: POST /statements/:id/auto-match, /matches, /matches/:id/unmatch', () => {
  let dono: U;

  async function cenario(unitId: string) {
    await seedUnit({ userId: dono.id, id: unitId });
    await abrirPeriodo(dono, unitId, 2026, 6);
    const entryId = await lancar(dono, unitId, '2026-06-15', '1.1.1.01', '3.1', 15000);
    const banco = await prisma.account.findFirstOrThrow({ where: { userId: dono.id, unitId, code: '1.1.1.01' } });
    const csv = Buffer.from('date,amountCents,description,externalRef\n2026-06-15,15000,PIX recebido,tx-1\n', 'utf8');
    const imp = await request(app)
      .post('/api/accounting/reconciliation/statements')
      .set(authHeader(dono))
      .field('unitId', unitId)
      .field('glAccountId', banco.id)
      .field('periodStart', '2026-06-01')
      .field('periodEnd', '2026-06-30')
      .attach('file', csv, { filename: 'extrato.csv', contentType: 'text/csv' });
    expect(imp.status).toBe(201);
    const statementId = imp.body.data.statement?.id ?? imp.body.data.id;
    const line = await prisma.bankStatementLine.findFirstOrThrow({ where: { statementId } });
    const posting = await prisma.posting.findFirstOrThrow({ where: { entryId, accountId: banco.id } });
    return { entryId, statementId: statementId as string, lineId: line.id, postingId: posting.id };
  }
  const ativos = (lineId: string) => prisma.reconciliationMatch.findMany({ where: { statementLineId: lineId, unmatchedAt: null } });
  const autoMatch = (unitId: string, statementId: string) =>
    request(app).post(`/api/accounting/reconciliation/statements/${statementId}/auto-match`).set(authHeader(dono)).send({ unitId });
  const manual = (unitId: string, lineId: string, postingId: string) =>
    request(app).post('/api/accounting/reconciliation/matches').set(authHeader(dono)).send({ unitId, statementLineId: lineId, postingIds: [postingId] });
  const unmatch = (unitId: string, matchId: string) =>
    request(app).post(`/api/accounting/reconciliation/matches/${matchId}/unmatch`).set(authHeader(dono)).send({ unitId, reason: 'vínculo errado' });

  beforeAll(async () => {
    dono = await criarDono('l1-recon');
  }, 120000);

  it('auto-match 200: casa a única candidata; a releitura tem a linha MATCHED, um vínculo AUTO e o lançamento Reconciled', async () => {
    const c = await cenario('unit-l1-recon-auto');

    const res = await autoMatch('unit-l1-recon-auto', c.statementId);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ matched: 1 });
    expect((await prisma.bankStatementLine.findUniqueOrThrow({ where: { id: c.lineId } })).status).toBe('MATCHED');
    expect((await ativos(c.lineId)).map((m) => [m.postingId, m.matchType])).toEqual([[c.postingId, 'AUTO']]);
    expect((await prisma.journalEntry.findUniqueOrThrow({ where: { id: c.entryId } })).status).toBe('Reconciled');
  });

  it('guarda do auto-match: extrato já conciliado → a 2ª rodada não casa nada nem duplica o vínculo (ACC-013)', async () => {
    const c = await cenario('unit-l1-recon-auto2');
    expect((await autoMatch('unit-l1-recon-auto2', c.statementId)).body.data).toMatchObject({ matched: 1 });

    const res = await autoMatch('unit-l1-recon-auto2', c.statementId);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ matched: 0 });
    expect(await prisma.reconciliationMatch.count({ where: { statementLineId: c.lineId } })).toBe(1);
  });

  describe('match manual e unmatch sobre a mesma linha', () => {
    const UNIT = 'unit-l1-recon-manual';
    let c: Awaited<ReturnType<typeof cenario>>;

    beforeAll(async () => {
      c = await cenario(UNIT);
    }, 120000);

    it('match manual 201: a releitura tem a linha MATCHED, um vínculo MANUAL e o lançamento Reconciled', async () => {
      const res = await manual(UNIT, c.lineId, c.postingId);
      expect(res.status).toBe(201);
      expect((await prisma.bankStatementLine.findUniqueOrThrow({ where: { id: c.lineId } })).status).toBe('MATCHED');
      expect((await ativos(c.lineId)).map((m) => [m.postingId, m.matchType])).toEqual([[c.postingId, 'MANUAL']]);
      expect((await prisma.journalEntry.findUniqueOrThrow({ where: { id: c.entryId } })).status).toBe('Reconciled');
    });

    it('guarda do match manual: linha já MATCHED → 400 e continua um vínculo só (ACC-011)', async () => {
      const res = await manual(UNIT, c.lineId, c.postingId);
      expect(res.status).toBe(400);
      expect(await prisma.reconciliationMatch.count({ where: { statementLineId: c.lineId } })).toBe(1);
    });

    it('unmatch 200: a releitura tem o vínculo desfeito (unmatchedAt), a linha UNMATCHED e o lançamento de volta a Posted', async () => {
      const [m] = await ativos(c.lineId);
      const res = await unmatch(UNIT, m.id);
      expect(res.status).toBe(200);

      const lido = await prisma.reconciliationMatch.findUniqueOrThrow({ where: { id: m.id } });
      expect(lido.unmatchedAt).not.toBeNull();
      expect(lido.unmatchedById).toBe(dono.id);
      expect((await prisma.bankStatementLine.findUniqueOrThrow({ where: { id: c.lineId } })).status).toBe('UNMATCHED');
      expect((await prisma.journalEntry.findUniqueOrThrow({ where: { id: c.entryId } })).status).toBe('Posted');
    });

    it('guarda do unmatch: vínculo já desfeito → 400 e o unmatchedAt gravado não muda', async () => {
      const m = await prisma.reconciliationMatch.findFirstOrThrow({ where: { statementLineId: c.lineId } });
      const res = await unmatch(UNIT, m.id);
      expect(res.status).toBe(400);
      expect((await prisma.reconciliationMatch.findUniqueOrThrow({ where: { id: m.id } })).unmatchedAt).toEqual(m.unmatchedAt);
    });
  });
});

// ── 8. POST /api/accounting/data-exchange/jobs/:jobId/waive-ecf-rectification ────────────────────────────────────
describe('POST /api/accounting/data-exchange/jobs/:jobId/waive-ecf-rectification', () => {
  const UNIT = 'unit-l1-waive';
  const JUST = 'ECF original já reflete os saldos da ECD substituta.';
  let dono: U;
  const waive = (jobId: string) =>
    request(app)
      .post(`/api/accounting/data-exchange/jobs/${jobId}/waive-ecf-rectification`)
      .set(authHeader(dono))
      .send({ unitId: UNIT, justification: JUST });
  const eventos = (jobId: string) => prisma.auditEvent.count({ where: { eventType: 'sped.ecf_rectification_waived', targetId: jobId } });

  beforeAll(async () => {
    dono = await criarDono('l1-waive');
    await seedUnit({ userId: dono.id, id: UNIT });
  }, 120000);

  it('200: a releitura do job tem a dispensa e o motivo; a 2ª chamada não grava 2º evento', async () => {
    const job = await criarJobEcd(dono, UNIT, { ecfRectificationRequired: true });

    const res = await waive(job.id);
    expect(res.status).toBe(200);
    const lido = await prisma.accountingDataExchangeJob.findUniqueOrThrow({ where: { id: job.id } });
    expect(lido.ecfRectificationWaivedAt).not.toBeNull();
    expect(lido.ecfRectificationWaiverReason).toBe(JUST);
    expect(await eventos(job.id)).toBe(1);

    expect((await waive(job.id)).status).toBe(200);
    expect(await eventos(job.id)).toBe(1);
    expect((await prisma.accountingDataExchangeJob.findUniqueOrThrow({ where: { id: job.id } })).ecfRectificationWaivedAt).toEqual(
      lido.ecfRectificationWaivedAt,
    );
  });

  it('guarda: job que não exige retificação → 400 e nada é gravado', async () => {
    const job = await criarJobEcd(dono, UNIT, { ecfRectificationRequired: false });

    const res = await waive(job.id);
    expect(res.status).toBe(400);
    expect((await prisma.accountingDataExchangeJob.findUniqueOrThrow({ where: { id: job.id } })).ecfRectificationWaivedAt).toBeNull();
    expect(await eventos(job.id)).toBe(0);
  });
});
