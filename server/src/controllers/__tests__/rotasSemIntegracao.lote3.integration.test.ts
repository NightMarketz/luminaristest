/**
 * FIX-TESTES item 4, lote 3 (BRIEF `FIX-TESTES-REPO-FALSO-POR-ROTA`, itens 3–4): as 8 escritas cadastrais que o lote 2
 * deixou sem `request(app)` em integração (`docs/operating-manual/COBERTURA-ROTAS-CONTABIL-2026-11-05.md`): anexo de
 * evidência POST/DELETE, documento de origem num lançamento, extrato DELETE, linha de extrato ignore, achado de revisão
 * resolve, troca dos jobs da revisão e PATCH de classe de bem.
 *
 * Cada rota: caminho feliz pela HTTP (`makeApp` + `authHeader`, policy, auditoria e repositório reais, SQLite de integração)
 * com 2ª leitura depois da escrita, e uma guarda no estado em que ela morde (A2). Não repete os valores dos units (A1).
 *
 * Por `prisma.*` (fora das rotas testadas): usuário, unidade, período OPEN, contas próprias da classe de bem e a linha do
 * job de exportação SPED (mesmo atalho do lote 1). Lançamentos e extratos entram pelas rotas `POST /post` e
 * `POST /reconciliation/statements`. A guarda do PATCH de classe não cria bem (não passa pelo `FixedAssetService`, IMO-1).
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader, seedUnit } from '@test/helpers';
import { AccountingReviewRepository } from '@/features/accounting/repositories/AccountingReviewRepository';

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

const criarJobEcd = (u: U, unitId: string) =>
  prisma.accountingDataExchangeJob.create({
    data: {
      userId: u.id,
      unitId,
      direction: 'EXPORT',
      kind: 'EXPORT_SPED_ECD',
      status: 'EXPORTED',
      requestedById: u.id,
      sha256: 'b'.repeat(64),
      periodStart: new Date(Date.UTC(2026, 0, 1)),
      periodEnd: new Date(Date.UTC(2026, 11, 31)),
    },
  });

const PDF = Buffer.from('%PDF-1.4\n% lote 3\n%%EOF\n');

beforeAll(() => {
  pushTestSchema();
}, 120000);

afterAll(async () => {
  await prisma.$disconnect();
});

// ── 1–2. Anexo de evidência: POST /attachments, DELETE /attachments/:id ──────────────────────────────────────────
describe('anexos: POST /api/accounting/attachments, DELETE /api/accounting/attachments/:id', () => {
  const UNIT = 'unit-l3-anexo';
  const UNIT_OUTRO = 'unit-l3-anexo-outro';
  let dono: U;
  let outro: U;
  let entryId: string;
  let entryDoOutro: string;

  const anexar = (u: U, unitId: string, targetId: string) =>
    request(app)
      .post('/api/accounting/attachments')
      .set(authHeader(u))
      .field('unitId', unitId)
      .field('targetId', targetId)
      .attach('file', PDF, { filename: 'nota.pdf', contentType: 'application/pdf' });
  const baixar = (id: string) => request(app).get(`/api/accounting/attachments/${id}`).query({ unitId: UNIT }).set(authHeader(dono));
  const apagar = (id: string) => request(app).delete(`/api/accounting/attachments/${id}`).query({ unitId: UNIT }).set(authHeader(dono));

  beforeAll(async () => {
    dono = await criarDono('l3-anexo');
    outro = await criarDono('l3-anexo-outro');
    await seedUnit({ userId: dono.id, id: UNIT });
    await seedUnit({ userId: outro.id, id: UNIT_OUTRO });
    await abrirPeriodo(dono, UNIT, 2026, 6);
    await abrirPeriodo(outro, UNIT_OUTRO, 2026, 6);
    entryId = await lancar(dono, UNIT, '2026-06-10', '1.1.1.01', '3.1', 5000);
    entryDoOutro = await lancar(outro, UNIT_OUTRO, '2026-06-10', '1.1.1.01', '3.1', 5000);
  }, 120000);

  it('POST 201: a releitura pelo download devolve os mesmos bytes, e a linha e o evento attachment.uploaded ficam gravados', async () => {
    const res = await anexar(dono, UNIT, entryId);
    expect(res.status).toBe(201);
    const id = res.body.data.id as string;
    expect(res.body.data).toMatchObject({ targetType: 'JOURNAL_ENTRY', targetId: entryId, mimeType: 'application/pdf', fileSize: PDF.length });

    const lido = await baixar(id).buffer(true).parse((r, cb) => {
      const partes: Buffer[] = [];
      r.on('data', (c: Buffer) => partes.push(c));
      r.on('end', () => cb(null, Buffer.concat(partes)));
    });
    expect(lido.status).toBe(200);
    expect(Buffer.compare(lido.body as Buffer, PDF)).toBe(0);
    expect(await prisma.auditEvent.count({ where: { eventType: 'attachment.uploaded', targetId: id } })).toBe(1);
  });

  it('guarda do POST: lançamento de outro tenant → 404 e nenhum anexo gravado para ele', async () => {
    const res = await anexar(dono, UNIT, entryDoOutro);
    expect(res.status).toBe(404);
    expect(await prisma.documentAttachment.count({ where: { targetId: entryDoOutro } })).toBe(0);
  });

  it('DELETE 200: a releitura pelo download dá 404, a linha fica com deletedAt e o evento attachment.deleted', async () => {
    const id = (await anexar(dono, UNIT, entryId)).body.data.id as string;

    const res = await apagar(id);
    expect(res.status).toBe(200);
    expect((await baixar(id)).status).toBe(404);
    const linha = await prisma.documentAttachment.findUniqueOrThrow({ where: { id } });
    expect(linha.deletedAt).not.toBeNull();
    expect(await prisma.auditEvent.count({ where: { eventType: 'attachment.deleted', targetId: id } })).toBe(1);
  });

  it('guarda do DELETE: anexo já apagado → 404, o deletedAt gravado não muda e não há 2º evento', async () => {
    const id = (await anexar(dono, UNIT, entryId)).body.data.id as string;
    expect((await apagar(id)).status).toBe(200);
    const antes = await prisma.documentAttachment.findUniqueOrThrow({ where: { id } });

    const res = await apagar(id);
    expect(res.status).toBe(404);
    expect((await prisma.documentAttachment.findUniqueOrThrow({ where: { id } })).deletedAt).toEqual(antes.deletedAt);
    expect(await prisma.auditEvent.count({ where: { eventType: 'attachment.deleted', targetId: id } })).toBe(1);
  });
});

// ── 3. POST /journal-entries/:entryId/source-documents ───────────────────────────────────────────────────────────
describe('POST /api/accounting/journal-entries/:entryId/source-documents', () => {
  const UNIT = 'unit-l3-proveniencia';
  const CHAVE = '35261112345678000199550010000001231000001234';
  let dono: U;

  const vincular = (entryId: string, externalRef: string) =>
    request(app)
      .post(`/api/accounting/journal-entries/${entryId}/source-documents`)
      .set(authHeader(dono))
      .send({ unitId: UNIT, externalRef, documentDate: '2026-06-12', description: 'NF-e de venda', sourceType: 'nfe.sale' });
  const listar = (entryId: string) =>
    request(app).get(`/api/accounting/journal-entries/${entryId}/source-documents`).query({ unitId: UNIT }).set(authHeader(dono));

  beforeAll(async () => {
    dono = await criarDono('l3-prov');
    await seedUnit({ userId: dono.id, id: UNIT });
    await abrirPeriodo(dono, UNIT, 2026, 6);
  }, 120000);

  it('201: a releitura do lançamento lista o documento com a chave, e o evento entry.source_recorded fica gravado', async () => {
    const entryId = await lancar(dono, UNIT, '2026-06-12', '1.1.1.01', '3.1', 7000);

    const res = await vincular(entryId, CHAVE);
    expect(res.status).toBe(201);
    const docId = res.body.data.id as string;

    const lido = await listar(entryId);
    expect(lido.status).toBe(200);
    expect(JSON.stringify(lido.body.data)).toContain(docId);
    expect(JSON.stringify(lido.body.data)).toContain(CHAVE);
    expect(await prisma.journalEntrySource.count({ where: { journalEntryId: entryId, sourceDocumentId: docId } })).toBe(1);
    expect(await prisma.auditEvent.count({ where: { eventType: 'entry.source_recorded', targetId: entryId } })).toBe(1);
  });

  it('guarda: mesma chave já vinculada ao lançamento → devolve o mesmo documento, sem 2º SourceDocument nem 2º evento (T7)', async () => {
    const entryId = await lancar(dono, UNIT, '2026-06-13', '1.1.1.01', '3.1', 8000);
    const primeiro = await vincular(entryId, `${CHAVE.slice(0, -1)}9`);
    expect(primeiro.status).toBe(201);

    const res = await vincular(entryId, `${CHAVE.slice(0, -1)}9`);
    expect(res.status).toBe(201);
    expect(res.body.data.id).toBe(primeiro.body.data.id);
    expect(await prisma.journalEntrySource.count({ where: { journalEntryId: entryId } })).toBe(1);
    expect(await prisma.auditEvent.count({ where: { eventType: 'entry.source_recorded', targetId: entryId } })).toBe(1);
  });
});

// ── 4–5. Conciliação: DELETE /statements/:id, POST /lines/:id/ignore ─────────────────────────────────────────────
describe('conciliação: DELETE /reconciliation/statements/:id, POST /reconciliation/lines/:id/ignore', () => {
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
    const statementId = (imp.body.data.statement?.id ?? imp.body.data.id) as string;
    const line = await prisma.bankStatementLine.findFirstOrThrow({ where: { statementId } });
    const posting = await prisma.posting.findFirstOrThrow({ where: { entryId, accountId: banco.id } });
    return { statementId, lineId: line.id, postingId: posting.id };
  }
  const casar = async (unitId: string, lineId: string, postingId: string) => {
    const res = await request(app)
      .post('/api/accounting/reconciliation/matches')
      .set(authHeader(dono))
      .send({ unitId, statementLineId: lineId, postingIds: [postingId] });
    expect(res.status).toBe(201);
  };
  const apagarExtrato = (unitId: string, statementId: string) =>
    request(app).delete(`/api/accounting/reconciliation/statements/${statementId}`).query({ unitId }).set(authHeader(dono));
  const ignorar = (unitId: string, lineId: string, ignored: boolean) =>
    request(app).post(`/api/accounting/reconciliation/lines/${lineId}/ignore`).set(authHeader(dono)).send({ unitId, ignored });
  const statusDaLinha = async (lineId: string) => (await prisma.bankStatementLine.findUniqueOrThrow({ where: { id: lineId } })).status;

  beforeAll(async () => {
    dono = await criarDono('l3-recon');
  }, 120000);

  it('DELETE 200: a releitura da lista de extratos não traz mais o extrato; a linha fica com deletedAt e o evento statement_deleted', async () => {
    const UNIT = 'unit-l3-recon-del';
    const c = await cenario(UNIT);

    const res = await apagarExtrato(UNIT, c.statementId);
    expect(res.status).toBe(200);
    const lista = await request(app).get('/api/accounting/reconciliation/statements').query({ unitId: UNIT }).set(authHeader(dono));
    expect(lista.status).toBe(200);
    expect(JSON.stringify(lista.body.data)).not.toContain(c.statementId);
    expect((await prisma.bankStatement.findUniqueOrThrow({ where: { id: c.statementId } })).deletedAt).not.toBeNull();
    expect(await prisma.auditEvent.count({ where: { eventType: 'reconciliation.statement_deleted', targetId: c.statementId } })).toBe(1);
  });

  it('guarda do DELETE: extrato com vínculo ativo → 400, o extrato segue vivo e o vínculo fica', async () => {
    const UNIT = 'unit-l3-recon-del-vinculo';
    const c = await cenario(UNIT);
    await casar(UNIT, c.lineId, c.postingId);

    const res = await apagarExtrato(UNIT, c.statementId);
    expect(res.status).toBe(400);
    expect((await prisma.bankStatement.findUniqueOrThrow({ where: { id: c.statementId } })).deletedAt).toBeNull();
    expect(await prisma.reconciliationMatch.count({ where: { statementLineId: c.lineId, unmatchedAt: null } })).toBe(1);
  });

  it('ignore 200: a linha vai a IGNORED e volta a UNMATCHED com ignored=false; um evento por troca', async () => {
    const UNIT = 'unit-l3-recon-ign';
    const c = await cenario(UNIT);

    expect((await ignorar(UNIT, c.lineId, true)).status).toBe(200);
    expect(await statusDaLinha(c.lineId)).toBe('IGNORED');
    expect((await ignorar(UNIT, c.lineId, false)).status).toBe(200);
    expect(await statusDaLinha(c.lineId)).toBe('UNMATCHED');
    const eventos = await prisma.auditEvent.findMany({ where: { targetId: c.lineId, eventType: { startsWith: 'reconciliation.line_' } }, orderBy: { createdAt: 'asc' } });
    expect(eventos.map((e) => e.eventType)).toEqual(['reconciliation.line_ignored', 'reconciliation.line_unignored']);
  });

  it('guarda do ignore: linha MATCHED → 400, segue MATCHED e nenhum evento line_ignored', async () => {
    const UNIT = 'unit-l3-recon-ign-casada';
    const c = await cenario(UNIT);
    await casar(UNIT, c.lineId, c.postingId);

    const res = await ignorar(UNIT, c.lineId, true);
    expect(res.status).toBe(400);
    expect(await statusDaLinha(c.lineId)).toBe('MATCHED');
    expect(await prisma.auditEvent.count({ where: { targetId: c.lineId, eventType: 'reconciliation.line_ignored' } })).toBe(0);
  });
});

// ── 6–7. Revisão: POST /reviews/:id/findings/:findingId/resolve, PATCH /reviews/:id/jobs ─────────────────────────
describe('revisões: POST /reviews/:id/findings/:findingId/resolve, PATCH /reviews/:id/jobs', () => {
  const UNIT = 'unit-l3-review';
  let dono: U;

  const abrirRevisao = async () => {
    const job = await criarJobEcd(dono, UNIT);
    const res = await request(app).post('/api/accounting/reviews').set(authHeader(dono)).send({ unitId: UNIT, year: 2026, ecdJobId: job.id });
    expect(res.status).toBe(201);
    return { reviewId: res.body.data.id as string, ecdJobId: job.id };
  };
  const achado = async (reviewId: string) => {
    const res = await request(app)
      .post(`/api/accounting/reviews/${reviewId}/findings`)
      .set(authHeader(dono))
      .send({ unitId: UNIT, register: 'I250', locator: 'linha 7', description: 'histórico a conferir', severity: 'NOTE' });
    expect(res.status).toBe(201);
    return res.body.data.id as string;
  };
  const resolver = (reviewId: string, findingId: string, resolutionNote: string) =>
    request(app)
      .post(`/api/accounting/reviews/${reviewId}/findings/${findingId}/resolve`)
      .set(authHeader(dono))
      .send({ unitId: UNIT, resolution: 'NO_ACTION', resolutionNote });
  const trocarJobs = (reviewId: string, ecdJobId: string) =>
    request(app).patch(`/api/accounting/reviews/${reviewId}/jobs`).set(authHeader(dono)).send({ unitId: UNIT, ecdJobId });
  const ler = async (reviewId: string) => {
    const res = await request(app).get(`/api/accounting/reviews/${reviewId}`).query({ unitId: UNIT }).set(authHeader(dono));
    expect(res.status).toBe(200);
    return res.body.data as {
      review: { status: string; ecdJobId: string | null };
      findings: Array<{ finding: { id: string; resolution: string | null; resolutionNote: string | null } }>;
    };
  };
  // Revisões abertas são únicas por par de jobs: cada teste fecha a sua para não colidir com a do próximo.
  const rejeitar = async (reviewId: string) => {
    const res = await request(app).post(`/api/accounting/reviews/${reviewId}/reject`).set(authHeader(dono)).send({ unitId: UNIT, reason: 'fim do teste' });
    expect(res.status).toBe(200);
  };

  beforeAll(async () => {
    dono = await criarDono('l3-review');
    await seedUnit({ userId: dono.id, id: UNIT });
  }, 120000);

  it('resolve 200: a releitura da revisão mostra o achado NO_ACTION com a nota', async () => {
    const { reviewId } = await abrirRevisao();
    const findingId = await achado(reviewId);

    const res = await resolver(reviewId, findingId, 'saldo conferido com o balancete');
    expect(res.status).toBe(200);
    expect((await ler(reviewId)).findings.map((f) => f.finding)).toEqual([
      expect.objectContaining({ id: findingId, resolution: 'NO_ACTION', resolutionNote: 'saldo conferido com o balancete' }),
    ]);
    await rejeitar(reviewId);
  });

  it('guarda do resolve: achado já resolvido → 409 FINDING_ALREADY_RESOLVED e a nota gravada não muda', async () => {
    const { reviewId } = await abrirRevisao();
    const findingId = await achado(reviewId);
    expect((await resolver(reviewId, findingId, 'primeira nota')).status).toBe(200);

    const res = await resolver(reviewId, findingId, 'segunda nota');
    expect(res.status).toBe(409);
    expect(JSON.stringify(res.body)).toContain('FINDING_ALREADY_RESOLVED');
    expect((await ler(reviewId)).findings[0].finding.resolutionNote).toBe('primeira nota');
    await rejeitar(reviewId);
  });

  it('PATCH /jobs 200: a releitura da revisão aponta para o job ECD novo e o evento de troca fica gravado', async () => {
    const { reviewId, ecdJobId } = await abrirRevisao();
    const novo = await criarJobEcd(dono, UNIT);

    const res = await trocarJobs(reviewId, novo.id);
    expect(res.status).toBe(200);
    expect((await ler(reviewId)).review).toMatchObject({ status: 'OPEN', ecdJobId: novo.id });
    const evento = await prisma.auditEvent.findFirstOrThrow({ where: { targetId: reviewId, eventType: { contains: 'jobs' } } });
    expect(JSON.parse(evento.payload as string)).toMatchObject({ fromEcdJobId: ecdJobId, toEcdJobId: novo.id });
    await rejeitar(reviewId);
  });

  it('guarda do PATCH /jobs: revisão já REJECTED → 409 REVIEW_NOT_OPEN e o job ECD fica o antigo', async () => {
    const { reviewId, ecdJobId } = await abrirRevisao();
    await rejeitar(reviewId);
    const novo = await criarJobEcd(dono, UNIT);

    const res = await trocarJobs(reviewId, novo.id);
    expect(res.status).toBe(409);
    expect(JSON.stringify(res.body)).toContain('REVIEW_NOT_OPEN');
    expect((await ler(reviewId)).review).toMatchObject({ status: 'REJECTED', ecdJobId });
  });
});

// ── 8. PATCH /fixed-asset-classes/:id ────────────────────────────────────────────────────────────────────────────
describe('PATCH /api/accounting/fixed-asset-classes/:id', () => {
  const UNIT = 'unit-l3-classe';
  let dono: U;
  let custo: string;
  let custoNovo: string;
  let depAcumulada: string;

  const conta = async (code: string) =>
    (await prisma.account.create({ data: { userId: dono.id, unitId: UNIT, code, name: `Conta ${code}`, nature: 'Asset', acceptsEntries: true } })).id;
  const criarClasse = async (code: string, extra: Record<string, unknown>) => {
    const res = await request(app)
      .post('/api/accounting/fixed-asset-classes')
      .set(authHeader(dono))
      .send({ unitId: UNIT, code, name: `Classe ${code}`, costAccountId: custo, ...extra });
    expect(res.status).toBe(201);
    return res.body.data.id as string;
  };
  const editar = (id: string, body: Record<string, unknown>) =>
    request(app).patch(`/api/accounting/fixed-asset-classes/${id}`).set(authHeader(dono)).send({ unitId: UNIT, classId: id, ...body });
  const lerClasse = async (id: string) => {
    const res = await request(app).get('/api/accounting/fixed-asset-classes').query({ unitId: UNIT }).set(authHeader(dono));
    expect(res.status).toBe(200);
    return (res.body.data as Array<{ id: string; name: string; costAccountId: string; depreciable: boolean; accumulatedDepreciationAccountId: string | null }>).find((c) => c.id === id);
  };

  beforeAll(async () => {
    dono = await criarDono('l3-classe');
    await seedUnit({ userId: dono.id, id: UNIT });
    custo = await conta('9.8.1');
    custoNovo = await conta('9.8.2');
    depAcumulada = await conta('9.8.9');
  }, 120000);

  it('200: a releitura da lista traz o nome e a conta do bem novos, sem mexer no resto', async () => {
    const id = await criarClasse('L3-MOV', { depreciable: true, accumulatedDepreciationAccountId: depAcumulada });

    const res = await editar(id, { name: 'Móveis e utensílios', costAccountId: custoNovo });
    expect(res.status).toBe(200);
    expect(await lerClasse(id)).toMatchObject({
      name: 'Móveis e utensílios',
      costAccountId: custoNovo,
      depreciable: true,
      accumulatedDepreciationAccountId: depAcumulada,
    });
  });

  it('guarda: classe gravada sem conta de depreciação acumulada → depreciable=true é 400 e a classe segue não depreciável', async () => {
    const id = await criarClasse('L3-TER', { depreciable: false });

    const res = await editar(id, { depreciable: true });
    expect(res.status).toBe(400);
    expect(await lerClasse(id)).toMatchObject({ depreciable: false, accumulatedDepreciationAccountId: null });
  });
});

// ── FIX-MENSAGENS-ID-INTERNO lote 3 (FIX-TESTES item 5; F-MSG-1 a, F-MSG-2 a1) ───────────────────────────────────────────
// Rótulos ratificados pelo dono (chat, 05/11, regra 5): job ECD/ECF = "<tipo> de dd/mm/aaaa a dd/mm/aaaa" (sem período:
// "<tipo> gerada em dd/mm/aaaa"); revisão = "revisão do exercício <ano>"; achado = "achado <registro> — <descrição>".
// Eco do id do pedido sem registro achado FICA; id de registro já carregado (job, revisão, achado) é nomeado pelo rótulo.
describe('FIX-MENSAGENS-ID-INTERNO lote 3 — revisão: a mensagem nomeia o job, a revisão e o achado, nunca pelo cuid', () => {
  const UNIT = 'unit-l3-msg-review';
  let dono: U;

  /** Status certo, a mensagem contém o rótulo e não contém nenhum dos cuids. A `msg` vai no objeto para o diff mostrá-la. */
  const nomeiaSemId = (res: request.Response, status: number, rotulo: string, ...ids: string[]) => {
    const msg = String(res.body.message);
    expect({ status: res.status, nomeiaRotulo: msg.includes(rotulo), cuidNaMensagem: ids.filter((id) => msg.includes(id)), msg }).toEqual({
      status,
      nomeiaRotulo: true,
      cuidNaMensagem: [],
      msg,
    });
  };
  const dmy = (d: Date) => `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
  const criarJob = (over: Record<string, unknown> = {}) =>
    prisma.accountingDataExchangeJob.create({
      data: {
        userId: dono.id,
        unitId: UNIT,
        direction: 'EXPORT',
        kind: 'EXPORT_SPED_ECD',
        status: 'EXPORTED',
        requestedById: dono.id,
        sha256: 'c'.repeat(64),
        periodStart: new Date(Date.UTC(2026, 0, 1)),
        periodEnd: new Date(Date.UTC(2026, 11, 31)),
        ...over,
      },
    });
  const abrir = (ecdJobId: string, year = 2026) => request(app).post('/api/accounting/reviews').set(authHeader(dono)).send({ unitId: UNIT, year, ecdJobId });
  const abrirOk = async () => {
    const job = await criarJob();
    const res = await abrir(job.id);
    expect(res.status).toBe(201);
    return res.body.data.id as string;
  };
  const novoAchado = async (reviewId: string) => {
    const res = await request(app)
      .post(`/api/accounting/reviews/${reviewId}/findings`)
      .set(authHeader(dono))
      .send({ unitId: UNIT, register: 'I250', locator: 'linha 7', description: 'histórico a conferir', severity: 'NOTE' });
    expect(res.status).toBe(201);
    return res.body.data.id as string;
  };
  const resolver = (reviewId: string, findingId: string) =>
    request(app)
      .post(`/api/accounting/reviews/${reviewId}/findings/${findingId}/resolve`)
      .set(authHeader(dono))
      .send({ unitId: UNIT, resolution: 'NO_ACTION', resolutionNote: 'conferido' });

  beforeAll(async () => {
    dono = await criarDono('l3-msg-review');
    await seedUnit({ userId: dono.id, id: UNIT });
  }, 120000);

  it('AccountingReviewService:551 — job que não é ECD (400) nomeia o job por tipo + período, não o cuid', async () => {
    const ecf = await criarJob({ kind: 'EXPORT_SPED_ECF' });
    const res = await abrir(ecf.id);
    nomeiaSemId(res, 400, 'ECF de 01/01/2026 a 31/12/2026', ecf.id);
  });

  it('AccountingReviewService:553 — job que não está EXPORTED (400) nomeia o job por tipo + período, não o cuid', async () => {
    const job = await criarJob({ status: 'FAILED' });
    const res = await abrir(job.id);
    nomeiaSemId(res, 400, 'ECD de 01/01/2026 a 31/12/2026', job.id);
  });

  it('AccountingReviewService:556 — job sem período gravado (400) nomeia o job pela data de geração, não o cuid', async () => {
    const job = await criarJob({ periodStart: null, periodEnd: null });
    const res = await abrir(job.id);
    nomeiaSemId(res, 400, `ECD gerada em ${dmy(job.createdAt)}`, job.id);
  });

  it('AccountingReviewService:560 — job de outro exercício (400) nomeia o job por tipo + período, não o cuid', async () => {
    const job = await criarJob({ periodStart: new Date(Date.UTC(2025, 0, 1)), periodEnd: new Date(Date.UTC(2025, 11, 31)) });
    const res = await abrir(job.id, 2026);
    nomeiaSemId(res, 400, 'ECD de 01/01/2025 a 31/12/2025', job.id);
  });

  it('AccountingReviewService:521 — 2ª revisão aberta para o mesmo par (409) nomeia a revisão do exercício, não o cuid', async () => {
    const job = await criarJob();
    const primeira = await abrir(job.id);
    expect(primeira.status).toBe(201);
    const res = await abrir(job.id);
    expect(res.body.code).toBe('REVIEW_ALREADY_OPEN');
    nomeiaSemId(res, 409, 'revisão do exercício 2026', primeira.body.data.id, job.id);
  });

  it('AccountingReviewService:515 — achado numa revisão já encerrada (409) nomeia a revisão do exercício, não o cuid', async () => {
    const reviewId = await abrirOk();
    const rej = await request(app).post(`/api/accounting/reviews/${reviewId}/reject`).set(authHeader(dono)).send({ unitId: UNIT, reason: 'fim do teste' });
    expect(rej.status).toBe(200);
    const res = await request(app)
      .post(`/api/accounting/reviews/${reviewId}/findings`)
      .set(authHeader(dono))
      .send({ unitId: UNIT, register: 'I250', locator: 'linha 7', description: 'tarde demais', severity: 'NOTE' });
    expect(res.body.code).toBe('REVIEW_NOT_OPEN');
    nomeiaSemId(res, 409, 'revisão do exercício 2026', reviewId);
  });

  it('AccountingReviewService:253 — resolver achado já resolvido (409) nomeia o achado por registro + descrição, não o cuid', async () => {
    const reviewId = await abrirOk();
    const findingId = await novoAchado(reviewId);
    expect((await resolver(reviewId, findingId)).status).toBe(200);
    const res = await resolver(reviewId, findingId);
    expect(res.body.code).toBe('FINDING_ALREADY_RESOLVED');
    nomeiaSemId(res, 409, 'achado I250 — histórico a conferir', findingId, reviewId);
  });

  it('AccountingReviewService:305 — acerto sobre achado já resolvido por outro caminho (409) nomeia o achado, não o cuid', async () => {
    const reviewId = await abrirOk();
    const findingId = await novoAchado(reviewId);
    expect((await resolver(reviewId, findingId)).status).toBe(200);
    const res = await request(app)
      .post(`/api/accounting/reviews/${reviewId}/findings/${findingId}/adjustment`)
      .set(authHeader(dono))
      .send({
        unitId: UNIT,
        postingDate: '2026-03-10',
        description: 'acerto da revisão',
        lines: [
          { accountCode: '4.1', debitCents: 1000, creditCents: 0 },
          { accountCode: '1.1.1.01', debitCents: 0, creditCents: 1000 },
        ],
      });
    expect(res.body.code).toBe('FINDING_ALREADY_RESOLVED');
    nomeiaSemId(res, 409, 'achado I250 — histórico a conferir', findingId, reviewId);
  });

  it('AccountingReviewService:412 — revisão sumida entre a leitura e a tx do sign-off (404) nomeia a revisão do exercício, não o cuid', async () => {
    const reviewId = await abrirOk();
    const original = AccountingReviewRepository.prototype.findById;
    let chamadas = 0;
    // 1ª leitura (preflight) real; a 2ª, dentro da tx (gate autoritativo), acha a revisão apagada por outra requisição.
    const spy = jest.spyOn(AccountingReviewRepository.prototype, 'findById').mockImplementation(function (this: AccountingReviewRepository, ...args) {
      chamadas += 1;
      return chamadas === 2 ? Promise.resolve(null) : original.apply(this, args);
    });
    try {
      const res = await request(app)
        .post(`/api/accounting/reviews/${reviewId}/sign-off`)
        .set(authHeader(dono))
        .send({ unitId: UNIT, reviewerName: 'Contadora Teste', reviewerCrc: 'SP-000777/O-1', statement: 'Revisei a ECD de 2026.' });
      nomeiaSemId(res, 404, 'revisão do exercício 2026', reviewId);
    } finally {
      spy.mockRestore();
    }
  });
});
