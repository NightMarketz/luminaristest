/**
 * CONTRATO HTTP do e-Lalur/e-Lacs (BE-INCR-SPED-ECF-FASE3B item 11, Fork 4→b) — app Express REAL sobre
 * supertest + SQLite REAL (molde: `accountingContactController.integration.test.ts`). O que só a fiação
 * prova: deny-by-default, `.strict()` na borda, a @@unique SEM deletedAt (D-M2) fechando duplicidade viva
 * de verdade + rename-on-key liberando a chave, tenancy cross-scope = 404, e as regras de catálogo (item
 * 9) chegando como 400 com código e motivo. Cada negativo carrega o seu controle positivo.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';

const app = makeApp();
const UNIT = 'unit-lalur-http';

let dono: { id: string; username: string };
let outro: { id: string; username: string };
let contaResultado: { id: string };

const criarUsuario = (username: string) =>
  prisma.user.create({ data: { name: username, username, email: `${username}@test.local`, password: 'x', role: 'USER' } });

const parteBBody = (over: Record<string, unknown> = {}) => ({
  unitId: UNIT,
  codCtaB: 'PF-2024',
  descricao: 'Prejuízo fiscal 2024',
  dtCriacao: '2024-12-31',
  codPbRfb: '1000', // Prejuízo Fiscal Operacional — tributo I (PARTEB_PADRAO)
  codTributo: 'I',
  saldoIniCents: 500000,
  indSaldoIni: 'D',
  ...over,
});

const entryBody = (over: Record<string, unknown> = {}) => ({
  unitId: UNIT,
  year: 2025,
  quarter: 'T01',
  livro: 'lalur',
  codigo: '7', // Custos não dedutíveis — E, tipoLanc A
  valorCents: 123456,
  indRelacao: '4',
  histLancamento: 'Custos não dedutíveis do trimestre',
  ...over,
});

describe('/api/lalur — contrato HTTP', () => {
  beforeAll(async () => {
    pushTestSchema();
    dono = await criarUsuario('lalur-http-a');
    outro = await criarUsuario('lalur-http-b');
    contaResultado = await prisma.account.create({
      data: { userId: dono.id, unitId: UNIT, code: '4.1.1', name: 'Despesas gerais', nature: 'Expense' },
    });
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('sem Bearer, as 8 rotas respondem 401 (nascem protegidas)', async () => {
    expect((await request(app).get('/api/lalur/entries').query({ unitId: UNIT })).status).toBe(401);
    expect((await request(app).post('/api/lalur/entries').send(entryBody())).status).toBe(401);
    expect((await request(app).patch('/api/lalur/entries/x').send({ unitId: UNIT })).status).toBe(401);
    expect((await request(app).post('/api/lalur/entries/x/archive').send({ unitId: UNIT })).status).toBe(401);
    expect((await request(app).get('/api/lalur/parte-b').query({ unitId: UNIT })).status).toBe(401);
    expect((await request(app).post('/api/lalur/parte-b').send(parteBBody())).status).toBe(401);
    expect((await request(app).patch('/api/lalur/parte-b/x').send({ unitId: UNIT })).status).toBe(401);
    expect((await request(app).post('/api/lalur/parte-b/x/archive').send({ unitId: UNIT })).status).toBe(401);
  });

  // ── Parte B ──────────────────────────────────────────────────────────────
  it('CONTROLE Parte B: POST cria (201), GET lista, PATCH altera, chave (codCtaB+codTributo) duplicada é 400', async () => {
    const created = await request(app).post('/api/lalur/parte-b').set(authHeader(dono)).send(parteBBody());
    expect(created.status).toBe(201);
    expect(created.body.data.codTributo).toBe('I');

    const dup = await request(app).post('/api/lalur/parte-b').set(authHeader(dono)).send(parteBBody());
    expect(dup.status).toBe(400);
    expect(String(dup.body.message)).toMatch(/PF-2024.*tributo I/);

    // mesma conta para o OUTRO tributo é outra chave (lacuna 6, p.237) — codPbRfb 1003 é CSLL
    const csll = await request(app).post('/api/lalur/parte-b').set(authHeader(dono)).send(parteBBody({ codTributo: 'C', codPbRfb: '1003' }));
    expect(csll.status).toBe(201);

    const listed = await request(app).get('/api/lalur/parte-b').set(authHeader(dono)).query({ unitId: UNIT, codTributo: 'I' });
    expect(listed.status).toBe(200);
    expect(listed.body.data.map((a: { codTributo: string }) => a.codTributo)).toEqual(['I']);

    const patched = await request(app).patch(`/api/lalur/parte-b/${created.body.data.id}`).set(authHeader(dono)).send({ unitId: UNIT, descricao: 'Prejuízo fiscal 2024 (rev.)' });
    expect(patched.status).toBe(200);
    expect(patched.body.data.descricao).toBe('Prejuízo fiscal 2024 (rev.)');
  });

  it('codPbRfb fora da PARTEB_PADRAO para o tributo é 400 (REGRA_M010_COD_PB_RFB_TRIBUTO, p.237)', async () => {
    const errado = await request(app).post('/api/lalur/parte-b').set(authHeader(dono)).send(parteBBody({ codCtaB: 'X', codPbRfb: '1003' })); // 1003 = BC negativa CSLL, tributo C
    expect(errado.status).toBe(400);
    expect(String(errado.body.message)).toMatch(/1003.*tributo I/);
    const inexistente = await request(app).post('/api/lalur/parte-b').set(authHeader(dono)).send(parteBBody({ codCtaB: 'Y', codPbRfb: '999999' }));
    expect(inexistente.status).toBe(400);
  });

  // ── Entries ──────────────────────────────────────────────────────────────
  it('CONTROLE ajuste: POST cria (201) com indRelacao=4; GET filtra por year/livro; PATCH revalida', async () => {
    const created = await request(app).post('/api/lalur/entries').set(authHeader(dono)).send(entryBody());
    expect(created.status).toBe(201);
    expect(created.body.data.codigo).toBe('7');
    expect(Number(created.body.data.valorCents)).toBe(123456);

    const listed = await request(app).get('/api/lalur/entries').set(authHeader(dono)).query({ unitId: UNIT, year: 2025, livro: 'lalur' });
    expect(listed.status).toBe(200);
    expect(listed.body.data).toHaveLength(1);

    // PATCH: trocar para indRelacao=2 sem accountId reprova pelo merge (REGRA_RELACAO_INEXISTENTE)
    const bad = await request(app).patch(`/api/lalur/entries/${created.body.data.id}`).set(authHeader(dono)).send({ unitId: UNIT, indRelacao: '2' });
    expect(bad.status).toBe(400);
    expect(JSON.stringify(bad.body)).toMatch(/accountId/);
    // controle: com accountId do escopo, passa e histLancamento pode ficar
    const ok = await request(app).patch(`/api/lalur/entries/${created.body.data.id}`).set(authHeader(dono)).send({ unitId: UNIT, indRelacao: '2', accountId: contaResultado.id, valorCents: 200000 });
    expect(ok.status).toBe(200);
    expect(ok.body.data.accountId).toBe(contaResultado.id);
    expect(Number(ok.body.data.valorCents)).toBe(200000);
  });

  it('item 9: código CNA, código inexistente e código não vigente no ano são 400 com o código e o motivo', async () => {
    const cna = await request(app).post('/api/lalur/entries').set(authHeader(dono)).send(entryBody({ codigo: '2', quarter: 'T02' }));
    expect(cna.status).toBe(400);
    expect(String(cna.body.message)).toMatch(/'2'.*CNA/);

    const nope = await request(app).post('/api/lalur/entries').set(authHeader(dono)).send(entryBody({ codigo: 'zzz', quarter: 'T02' }));
    expect(nope.status).toBe(400);
    expect(String(nope.body.message)).toMatch(/'zzz'/);

    const futuro = await request(app).post('/api/lalur/entries').set(authHeader(dono)).send({ unitId: UNIT, year: 2025, quarter: 'T02', livro: 'n630', codigo: '6.1', valorCents: 1 });
    expect(futuro.status).toBe(400);
    expect(String(futuro.body.message)).toMatch(/6\.1/);
  });

  it('D-M2: duplicidade VIVA (mesma chave) é 400 pela constraint; archive libera a chave e o re-cadastro passa', async () => {
    const dup = await request(app).post('/api/lalur/entries').set(authHeader(dono)).send(entryBody());
    expect(dup.status).toBe(400);
    expect(String(dup.body.message)).toMatch(/'7'.*lalur\/T01\/2025/);

    const listed = await request(app).get('/api/lalur/entries').set(authHeader(dono)).query({ unitId: UNIT, year: 2025, livro: 'lalur' });
    const id = listed.body.data[0].id as string;
    const archived = await request(app).post(`/api/lalur/entries/${id}/archive`).set(authHeader(dono)).send({ unitId: UNIT });
    expect(archived.status).toBe(200);
    expect(archived.body.data.deletedAt).not.toBeNull();
    expect(archived.body.data.codigo).toBe(`deleted:${id}:7`); // rename-on-key
    // idempotente
    expect((await request(app).post(`/api/lalur/entries/${id}/archive`).set(authHeader(dono)).send({ unitId: UNIT })).status).toBe(200);

    const again = await request(app).post('/api/lalur/entries').set(authHeader(dono)).send(entryBody());
    expect(again.status).toBe(201);

    const hidden = await request(app).get('/api/lalur/entries').set(authHeader(dono)).query({ unitId: UNIT, year: 2025, livro: 'lalur' });
    expect(hidden.body.data).toHaveLength(1);
    const all = await request(app).get('/api/lalur/entries').set(authHeader(dono)).query({ unitId: UNIT, year: 2025, livro: 'lalur', includeArchived: 'true' });
    expect(all.body.data).toHaveLength(2);
  });

  it('Parte B relacionada: indRelacao=1 exige conta do MESMO tributo do livro (lacs → C); compensação (tipoLanc P) exige indRelacao=1', async () => {
    const contas = await request(app).get('/api/lalur/parte-b').set(authHeader(dono)).query({ unitId: UNIT });
    const irpj = contas.body.data.find((a: { codTributo: string }) => a.codTributo === 'I') as { id: string };
    const csll = contas.body.data.find((a: { codTributo: string }) => a.codTributo === 'C') as { id: string };

    // lacs com conta IRPJ → 400 (REGRA_PARTE_B_PARTE_A)
    const cruzado = await request(app).post('/api/lalur/entries').set(authHeader(dono)).send({ unitId: UNIT, year: 2025, quarter: 'T01', livro: 'lacs', codigo: '7', valorCents: 10, indRelacao: '1', parteBId: irpj.id });
    expect(cruzado.status).toBe(400);
    expect(String(cruzado.body.message)).toMatch(/tributo I.*exige C/);
    // controle: conta CSLL passa
    const ok = await request(app).post('/api/lalur/entries').set(authHeader(dono)).send({ unitId: UNIT, year: 2025, quarter: 'T01', livro: 'lacs', codigo: '7', valorCents: 10, indRelacao: '1', parteBId: csll.id });
    expect(ok.status).toBe(201);

    // compensação de prejuízo (M300A código com TIPO LANÇ = P) com indRelacao=2 → 400 (REGRA_IND_RELACAO p.247)
    const { ECF_L12_CATALOG } = await import('@/features/accounting/models/Lalur.model');
    const p = ECF_L12_CATALOG.abas.M300A.find((r) => r.tipo === 'E' && r.tipoLanc === 'P' && !r.dtFim)!;
    const comp = await request(app).post('/api/lalur/entries').set(authHeader(dono)).send({ unitId: UNIT, year: 2025, quarter: 'T03', livro: 'lalur', codigo: p.codigo, valorCents: 10, indRelacao: '2', accountId: contaResultado.id });
    expect(comp.status).toBe(400);
    expect(String(comp.body.message)).toMatch(/REGRA_IND_RELACAO/);

    // conta da Parte B com ajuste vivo não arquiva (ordem de remoção)
    const blocked = await request(app).post(`/api/lalur/parte-b/${csll.id}/archive`).set(authHeader(dono)).send({ unitId: UNIT });
    expect(blocked.status).toBe(400);
  });

  it('tenancy: id de outro escopo é 404 em PATCH/archive/parteBId/accountId — nunca vazamento nem 500', async () => {
    const mine = await request(app).get('/api/lalur/entries').set(authHeader(dono)).query({ unitId: UNIT, year: 2025, livro: 'lalur' });
    const id = mine.body.data[0].id as string;
    const contas = await request(app).get('/api/lalur/parte-b').set(authHeader(dono)).query({ unitId: UNIT });
    const irpj = contas.body.data.find((a: { codTributo: string }) => a.codTributo === 'I') as { id: string };

    expect((await request(app).patch(`/api/lalur/entries/${id}`).set(authHeader(outro)).send({ unitId: UNIT, valorCents: 1 })).status).toBe(404);
    expect((await request(app).post(`/api/lalur/entries/${id}/archive`).set(authHeader(outro)).send({ unitId: UNIT })).status).toBe(404);
    expect((await request(app).post(`/api/lalur/parte-b/${irpj.id}/archive`).set(authHeader(outro)).send({ unitId: UNIT })).status).toBe(404);
    // referências cross-scope no corpo
    const refB = await request(app).post('/api/lalur/entries').set(authHeader(outro)).send({ unitId: UNIT, year: 2025, quarter: 'T01', livro: 'lalur', codigo: '7', valorCents: 1, indRelacao: '1', parteBId: irpj.id });
    expect(refB.status).toBe(404);
    const refA = await request(app).post('/api/lalur/entries').set(authHeader(outro)).send({ unitId: UNIT, year: 2025, quarter: 'T01', livro: 'lalur', codigo: '7', valorCents: 1, indRelacao: '2', accountId: contaResultado.id });
    expect(refA.status).toBe(404);
    // e o outro escopo não vê nada do dono
    const theirs = await request(app).get('/api/lalur/entries').set(authHeader(outro)).query({ unitId: UNIT });
    expect(theirs.body.data).toEqual([]);
  });

  it('.strict() na borda: descricao/tipoLancamento no corpo (derivados do catálogo) são 400', async () => {
    const res = await request(app).post('/api/lalur/entries').set(authHeader(dono)).send(entryBody({ quarter: 'T04', descricao: 'x' }));
    expect(res.status).toBe(400);
  });

  it('audit: cada mutação gravou evento lalur.* sem histLancamento no payload (item 18 — sem texto livre)', async () => {
    const events = await prisma.auditEvent.findMany({ where: { eventType: { startsWith: 'lalur.' } } });
    const types = new Set(events.map((e) => e.eventType));
    expect(types).toEqual(new Set(['lalur.entry_created', 'lalur.entry_updated', 'lalur.entry_archived', 'lalur.parte_b_created', 'lalur.parte_b_updated']));
    for (const e of events) expect(e.payload).not.toMatch(/Custos não dedutíveis do trimestre|histLancamento/);
  });
});

// ─── ECF Fase 3C (ADR EMENDA 2026-09-12, 3ª) — M410, fechamento, diagnóstico sobre SQLite REAL ─────

describe('/api/lalur — Parte B 3C (movimentos M410, fechamento trimestral, diagnóstico)', () => {
  const UNIT3 = 'unit-lalur-3c'; // escopo limpo: os testes acima deixaram estado em UNIT
  let pf: { id: string };
  let bc: { id: string };
  let prov: { id: string };
  let contaDespesa: { id: string };

  const mvBody = (over: Record<string, unknown> = {}) => ({
    unitId: UNIT3, parteBId: pf.id, year: 2025, quarter: 'T01', indicador: 'DB', valorCents: 1000, historico: 'Ajuste manual', indLanAnt: 'N', ...over,
  });

  beforeAll(async () => {
    contaDespesa = await prisma.account.create({ data: { userId: dono.id, unitId: UNIT3, code: '4.1.9', name: 'Despesas indedutíveis', nature: 'Expense' } });
    const mk = async (b: Record<string, unknown>) => {
      const r = await request(app).post('/api/lalur/parte-b').set(authHeader(dono)).send(parteBBody({ unitId: UNIT3, ...b }));
      expect(r.status).toBe(201);
      return r.body.data as { id: string };
    };
    pf = await mk({ codCtaB: 'PF', codPbRfb: '1000', codTributo: 'I', saldoIniCents: 500000 });
    bc = await mk({ codCtaB: 'BC', codPbRfb: '1003', codTributo: 'C', saldoIniCents: 0 });
    prov = await mk({ codCtaB: 'PROV', codPbRfb: '1010', codTributo: 'I', saldoIniCents: 0 });
  });

  it('sem Bearer, as 7 rotas novas respondem 401', async () => {
    expect((await request(app).get('/api/lalur/parte-b/movements').query({ unitId: UNIT3 })).status).toBe(401);
    expect((await request(app).post('/api/lalur/parte-b/movements').send(mvBody())).status).toBe(401);
    expect((await request(app).patch('/api/lalur/parte-b/movements/x').send({ unitId: UNIT3 })).status).toBe(401);
    expect((await request(app).post('/api/lalur/parte-b/movements/x/archive').send({ unitId: UNIT3 })).status).toBe(401);
    expect((await request(app).post('/api/lalur/parte-b/close').send({ unitId: UNIT3, year: 2025, quarter: 'T01' })).status).toBe(401);
    expect((await request(app).post('/api/lalur/parte-b/reopen').send({ unitId: UNIT3, year: 2025, quarter: 'T01' })).status).toBe(401);
    expect((await request(app).get('/api/lalur/parte-b/balances').query({ unitId: UNIT3, year: 2025 })).status).toBe(401);
  });

  it('M410: POST deriva codTributo/origem, aceita processos (M415) e a rota estática não é capturada por /parte-b/:id', async () => {
    const created = await request(app).post('/api/lalur/parte-b/movements').set(authHeader(dono)).send(mvBody({ contrapartidaId: prov.id, processos: [{ indProc: '1', numProc: '0001234-56' }] }));
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({ codTributo: 'I', origem: 'user', indicador: 'DB', contrapartidaId: prov.id, valorCents: 1000 });
    const procs = await prisma.lalurProcess.findMany({ where: { movementId: created.body.data.id } });
    expect(procs.map((p) => [p.parentId, p.indProc, p.numProc])).toEqual([[created.body.data.id, '1', '0001234-56']]);

    // contrapartida de outro tributo (REGRA_MESMO_TRIBUTO) → 400; PF com contrapartida → 400 (DTO); '|' → 400
    expect((await request(app).post('/api/lalur/parte-b/movements').set(authHeader(dono)).send(mvBody({ contrapartidaId: bc.id }))).status).toBe(400);
    expect((await request(app).post('/api/lalur/parte-b/movements').set(authHeader(dono)).send(mvBody({ indicador: 'PF', contrapartidaId: prov.id }))).status).toBe(400);
    expect((await request(app).post('/api/lalur/parte-b/movements').set(authHeader(dono)).send(mvBody({ historico: 'a|b' }))).status).toBe(400);
    // codTributo como input é rejeitado pelo .strict()
    expect((await request(app).post('/api/lalur/parte-b/movements').set(authHeader(dono)).send(mvBody({ codTributo: 'I' }))).status).toBe(400);

    const listed = await request(app).get('/api/lalur/parte-b/movements').set(authHeader(dono)).query({ unitId: UNIT3, year: 2025, quarter: 'T01' });
    expect(listed.status).toBe(200);
    expect(listed.body.data).toHaveLength(1);

    // PATCH substitui o conjunto de processos; [] limpa
    const patched = await request(app).patch(`/api/lalur/parte-b/movements/${created.body.data.id}`).set(authHeader(dono)).send({ unitId: UNIT3, historico: 'rev', processos: [] });
    expect(patched.status).toBe(200);
    expect(await prisma.lalurProcess.count({ where: { movementId: created.body.data.id } })).toBe(0);

    // tenancy: outro dono → 404
    expect((await request(app).patch(`/api/lalur/parte-b/movements/${created.body.data.id}`).set(authHeader(outro)).send({ unitId: UNIT3, historico: 'x' })).status).toBe(404);
  });

  it('C2 no banco: processo duplicado (mesmo pai, IND_PROC+NUM_PROC) é P2002 — a chave por parentId fecha o que pais NULL não fechariam', async () => {
    const e = await request(app).post('/api/lalur/entries').set(authHeader(dono)).send(entryBody({ unitId: UNIT3, codigo: '166', indRelacao: '2', accountId: contaDespesa.id, histLancamento: undefined, processos: [{ indProc: '2', numProc: 'ADM-1' }] }));
    expect(e.status).toBe(201);
    await expect(prisma.lalurProcess.create({ data: { parentId: e.body.data.id, entryId: e.body.data.id, indProc: '2', numProc: 'ADM-1' } })).rejects.toMatchObject({ code: 'P2002' });
    // mesmo processo em OUTRO pai passa
    const e2 = await request(app).post('/api/lalur/entries').set(authHeader(dono)).send(entryBody({ unitId: UNIT3, codigo: '7', processos: [{ indProc: '2', numProc: 'ADM-1' }] }));
    expect(e2.status).toBe(201);
    // M312: lançamento inexistente → 404; DTO exige indRelacao 2/3
    expect((await request(app).post('/api/lalur/entries').set(authHeader(dono)).send(entryBody({ unitId: UNIT3, codigo: '95', indRelacao: '2', accountId: contaDespesa.id, histLancamento: undefined, journalEntryIds: ['nope'] }))).status).toBe(404);
  });

  it('fechamento: T02 antes de T01 é 400; T01 fecha (linha-pai + M500 por conta); PF derivado da base negativa (exclusão > adição); T02 lê o sdIni materializado', async () => {
    expect((await request(app).post('/api/lalur/parte-b/close').set(authHeader(dono)).send({ unitId: UNIT3, year: 2025, quarter: 'T02' })).status).toBe(400);
    // Parte A em T01 (escopo UNIT3, razão vazio ⇒ resultado 0): A 123.456 (código 7) + E 123.456 (166) já criados acima ⇒ base I = 0.
    // Acrescenta exclusão para forçar base negativa: E 300.000 (96) ⇒ base = −300.000 ⇒ PF system de 300.000 na conta PF.
    const excl = await request(app).post('/api/lalur/entries').set(authHeader(dono)).send(entryBody({ unitId: UNIT3, codigo: '96', valorCents: 300000, indRelacao: '2', accountId: contaDespesa.id, histLancamento: undefined }));
    expect(excl.status).toBe(201);

    const t1 = await request(app).post('/api/lalur/parte-b/close').set(authHeader(dono)).send({ unitId: UNIT3, year: 2025, quarter: 'T01' });
    expect(t1.status).toBe(200);
    expect(t1.body.data.balances).toHaveLength(3);
    const byId = Object.fromEntries((t1.body.data.balances as Array<Record<string, unknown>>).map((b) => [b.parteBId, b]));
    // PF: sdIni 5.000,00 D; Parte B = +1.000 (DB user) + 300.000 (PF system) = 301.000 D; sdFim 801.000 D
    expect(byId[pf.id]).toMatchObject({ sdIniCents: 500000, indSdIni: 'D', vlParteACents: 0, vlParteBCents: 301000, indVlParteB: 'D', sdFimCents: 801000, indSdFim: 'D' });
    // PROV: contrapartida do DB de 1.000 ⇒ −1.000 (C)
    expect(byId[prov.id]).toMatchObject({ vlParteBCents: 1000, indVlParteB: 'C', sdFimCents: 1000, indSdFim: 'C' });
    const sys = await prisma.lalurParteBMovement.findMany({ where: { unitId: UNIT3, origem: 'system', deletedAt: null } });
    expect(sys.map((m) => [m.indicador, m.valorCents, m.parteBId])).toEqual([['PF', 300000n, pf.id]]); // base da CSLL = 0 ⇒ nenhum BC
    expect(await prisma.lalurParteBClosing.count({ where: { userId: dono.id, unitId: UNIT3, year: 2025 } })).toBe(1);

    const t2 = await request(app).post('/api/lalur/parte-b/close').set(authHeader(dono)).send({ unitId: UNIT3, year: 2025, quarter: 'T02' });
    expect(t2.status).toBe(200);
    const pfT2 = (t2.body.data.balances as Array<Record<string, unknown>>).find((b) => b.parteBId === pf.id)!;
    expect(pfT2).toMatchObject({ sdIniCents: 801000, indSdIni: 'D', sdFimCents: 801000 });

    // reabrir T01 com T02 fechado → 400; reabrir T02 → 200 e a cascata apaga os saldos
    expect((await request(app).post('/api/lalur/parte-b/reopen').set(authHeader(dono)).send({ unitId: UNIT3, year: 2025, quarter: 'T01' })).status).toBe(400);
    const re = await request(app).post('/api/lalur/parte-b/reopen').set(authHeader(dono)).send({ unitId: UNIT3, year: 2025, quarter: 'T02' });
    expect(re.status).toBe(200);
    expect(await prisma.lalurParteBBalance.count({ where: { closing: { unitId: UNIT3, quarter: 'T02' } } })).toBe(0);

    // audit: fechamento carrega sha256 e contagem, nunca os valores
    const ev = await prisma.auditEvent.findFirst({ where: { scopeUserId: dono.id, unitId: UNIT3, eventType: 'lalur.parte_b_closed' }, orderBy: { createdAt: 'desc' } });
    expect(ev).not.toBeNull();
    expect(ev!.payload).toMatch(/balancesSha256/);
    expect(ev!.payload).not.toContain('801000');
  });

  it('diagnóstico: movimento novo em T01 fechado ⇒ divergência em vlB/sdFim; GET devolve os 4 períodos; refechar zera', async () => {
    const late = await request(app).post('/api/lalur/parte-b/movements').set(authHeader(dono)).send(mvBody({ valorCents: 7 }));
    expect(late.status).toBe(201);
    let d = await request(app).get('/api/lalur/parte-b/balances').set(authHeader(dono)).query({ unitId: UNIT3, year: 2025 });
    expect(d.status).toBe(200);
    expect(d.body.data.periods.map((p: { quarter: string; closed: boolean }) => [p.quarter, p.closed])).toEqual([['T01', true], ['T02', false], ['T03', false], ['T04', false]]);
    expect(d.body.data.divergences.map((x: { field: string; codCtaB: string }) => [x.codCtaB, x.field])).toEqual([['PF', 'vlB'], ['PF', 'sdFim']]);
    await request(app).post('/api/lalur/parte-b/close').set(authHeader(dono)).send({ unitId: UNIT3, year: 2025, quarter: 'T01' });
    d = await request(app).get('/api/lalur/parte-b/balances').set(authHeader(dono)).query({ unitId: UNIT3, year: 2025 });
    expect(d.body.data.divergences).toEqual([]);
  });

  it('archive da conta da Parte B com movimento vivo (inclusive como contrapartida) é 400; item 19: excluir conta contábil com ajuste vivo é 409', async () => {
    expect((await request(app).post(`/api/lalur/parte-b/${prov.id}/archive`).set(authHeader(dono)).send({ unitId: UNIT3 })).status).toBe(400);
    const del = await request(app).delete(`/api/accounting/accounts/${contaDespesa.id}`).set(authHeader(dono)).query({ unitId: UNIT3 });
    expect([400, 409]).toContain(del.status);
    expect((await prisma.account.findUnique({ where: { id: contaDespesa.id } }))!.deletedAt).toBeNull();
  });
});
