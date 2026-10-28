/**
 * EFICIENCIA-FISCAL PR-1 itens 5 e 7 (BRIEF §3, §4.3; ADR-INCR-EFICIENCIA-FISCAL D3, I-6, I-13; triagem 21/10; F-EF-3 a)
 * contra o banco real e as rotas: política versionada, troca para CARGA só pelo contador ACTIVE, ciclo da sugestão (CAS,
 * decisor, motivo), custo de serviço e auditoria sem PII.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader, seedUnit } from '@test/helpers';

const app = makeApp();
const P = '/api/accounting/tax-optimization';

interface Cena {
  dono: { id: string; username: string };
  contador: { id: string; username: string };
  unit: string;
}
let seq = 0;
async function cena(comContador: boolean): Promise<Cena> {
  const tag = `tx-opt-${++seq}-${Date.now()}`;
  const mk = (n: string) => prisma.user.create({ data: { name: n, username: n, email: `${n}@test.local`, password: 'x', role: 'USER' } });
  const dono = await mk(`${tag}-dono`);
  const contador = await mk(`${tag}-cont`);
  const unit = `unit-${tag}`;
  await seedUnit({ userId: dono.id, id: unit });
  if (comContador) {
    const contato = await prisma.accountingContact.create({
      data: { userId: dono.id, unitId: unit, name: 'Maria Contadora', email: `${tag}@cont.local`, cpf: '52998224725', crcNumber: 'SP-123456/O-1', crcUf: 'SP' },
    });
    await prisma.accountantAssignment.create({
      data: {
        userId: dono.id, unitId: unit, accountantUserId: contador.id, accountingContactId: contato.id, crcNumber: 'SP-123456/O-1', crcUf: 'SP',
        createdById: dono.id, status: 'ACTIVE', activeSlot: 'ACTIVE',
      },
    });
  }
  return { dono: { id: dono.id, username: dono.username }, contador: { id: contador.id, username: contador.username }, unit };
}
const put = (c: Cena, body: Record<string, unknown>) =>
  request(app).put(`${P}/policy`).set(authHeader(c.dono)).send({ unitId: c.unit, pisoServico: 'CUSTO_INFORMADO', vigenteDesde: '2026-11-01', ...body });
const decidir = (c: Cena, quem: { id: string; username: string }, id: string, acao: 'accept' | 'reject', body: Record<string, unknown> = {}) =>
  request(app)
    .post(`${P}/suggestions/${id}/${acao}`)
    .set(authHeader(quem))
    .send({ unitId: c.unit, ...(quem.id !== c.dono.id ? { ownerUserId: c.dono.id } : {}), ...body });

beforeAll(() => pushTestSchema());
afterAll(() => prisma.$disconnect());

describe('política de eficiência fiscal (item 5)', () => {
  it('sem versão gravada: padrões do BRIEF (PROPORCIONAL_CATALOGO, CUSTO_INFORMADO, piso WARN)', async () => {
    const c = await cena(false);
    const r = await request(app).get(`${P}/policy`).query({ unitId: c.unit }).set(authHeader(c.dono));
    expect(r.status).toBe(200);
    expect(r.body.data).toMatchObject({ id: null, criterioAlocacao: 'PROPORCIONAL_CATALOGO', pisoServico: 'CUSTO_INFORMADO', severidadePisoProporcional: 'WARN', versoes: [] });
  });

  it('PROPORCIONAL aplica direto e fecha a versão anterior na véspera; vigência retroativa ⇒ 409', async () => {
    const c = await cena(false);
    expect((await put(c, { criterioAlocacao: 'PROPORCIONAL_CATALOGO', vigenteDesde: '2026-01-01' })).status).toBe(200);
    const r = await put(c, { criterioAlocacao: 'PROPORCIONAL_CATALOGO', pisoServico: 'CATALOGO_MINIMO', vigenteDesde: '2026-06-01' });
    expect(r.status).toBe(200);
    expect(r.body.data.policy.versoes.map((v: { vigenteDesde: string; vigenteAte: string | null }) => [v.vigenteDesde, v.vigenteAte])).toEqual([
      ['2026-01-01', '2026-05-31'],
      ['2026-06-01', null],
    ]);
    expect((await put(c, { criterioAlocacao: 'PROPORCIONAL_CATALOGO', vigenteDesde: '2026-03-01' })).body).toMatchObject({ code: 'VIGENCIA_RETROATIVA' });
  });

  it('CARGA sem contador ACTIVE ⇒ 409 CRITERIO_CARGA_EXIGE_CONTADOR e nada gravado', async () => {
    const c = await cena(false);
    const r = await put(c, { criterioAlocacao: 'CARGA_TRIBUTARIA' });
    expect(r.status).toBe(409);
    expect(r.body).toMatchObject({ code: 'CRITERIO_CARGA_EXIGE_CONTADOR' });
    expect(await prisma.taxOptimizationPolicy.count({ where: { unitId: c.unit } })).toBe(0);
    expect(await prisma.taxOptimizationSuggestion.count({ where: { unitId: c.unit } })).toBe(0);
  });

  it('CARGA com contador ⇒ 202 + sugestão PROPOSED; só o contador aceita, com motivo; o aceite cria a versão CARGA', async () => {
    const c = await cena(true);
    const r = await put(c, { criterioAlocacao: 'CARGA_TRIBUTARIA' });
    expect(r.status).toBe(202);
    expect(r.body.data).toMatchObject({ applied: false, suggestion: { practice: 'CRITERIO_CARGA', status: 'PROPOSED', subjectType: 'UNIT', subjectId: c.unit, proposedBy: c.dono.id } });
    const id = r.body.data.suggestion.id as string;
    expect(await prisma.taxOptimizationPolicy.count({ where: { unitId: c.unit } })).toBe(0);

    expect((await decidir(c, c.dono, id, 'accept', { reason: 'quero carga' })).status).toBe(403); // dono não decide com contador
    expect((await decidir(c, c.contador, id, 'accept')).status).toBe(400); // aceite fora do padrão exige motivo
    const ok = await decidir(c, c.contador, id, 'accept', { reason: 'evidência de custo conferida' });
    expect(ok.status).toBe(200);
    expect(ok.body.data).toMatchObject({ status: 'ACCEPTED', decidedById: c.contador.id, decisionReason: 'evidência de custo conferida' });
    const pol = await request(app).get(`${P}/policy`).query({ unitId: c.unit }).set(authHeader(c.dono));
    expect(pol.body.data.versoes).toEqual([expect.objectContaining({ criterioAlocacao: 'CARGA_TRIBUTARIA', vigenteDesde: '2026-11-01', suggestionId: id })]);

    // CAS: a mesma sugestão não é decidida duas vezes.
    expect((await decidir(c, c.contador, id, 'reject', { reason: 'mudei de ideia' })).body).toMatchObject({ code: 'SUGESTAO_JA_DECIDIDA' });
  });

  it('nova proposta CARGA expira a viva (uma PROPOSED por assunto, supersedesId)', async () => {
    const c = await cena(true);
    const a = (await put(c, { criterioAlocacao: 'CARGA_TRIBUTARIA' })).body.data.suggestion.id;
    const b = (await put(c, { criterioAlocacao: 'CARGA_TRIBUTARIA', vigenteDesde: '2026-12-01' })).body.data.suggestion;
    expect(b.supersedesId).toBe(a);
    expect((await prisma.taxOptimizationSuggestion.findUnique({ where: { id: a } }))!.status).toBe('EXPIRED');
    expect((await decidir(c, c.contador, a, 'accept', { reason: 'tarde demais' })).status).toBe(409);
  });
});

describe('review do #913 (F2)', () => {
  it('voltar ao PROPORCIONAL expira a troca para CARGA pendente; o contador não a aceita depois', async () => {
    const c = await cena(true);
    const id = (await put(c, { criterioAlocacao: 'CARGA_TRIBUTARIA', vigenteDesde: '2026-12-01' })).body.data.suggestion.id;
    const prop = await put(c, { criterioAlocacao: 'PROPORCIONAL_CATALOGO', vigenteDesde: '2026-11-15' });
    expect(prop.status).toBe(200);
    expect((await prisma.taxOptimizationSuggestion.findUnique({ where: { id } }))!.status).toBe('EXPIRED');
    expect((await decidir(c, c.contador, id, 'accept', { reason: 'tarde demais' })).body).toMatchObject({ code: 'SUGESTAO_JA_DECIDIDA' });
    const pol = await request(app).get(`${P}/policy`).query({ unitId: c.unit }).set(authHeader(c.dono));
    expect(pol.body.data.versoes.map((v: { criterioAlocacao: string }) => v.criterioAlocacao)).toEqual(['PROPORCIONAL_CATALOGO']);
    const ev = await prisma.auditEvent.findFirst({ where: { unitId: c.unit, eventType: 'tax.policy.updated' } });
    const payload = typeof ev!.payload === 'string' ? JSON.parse(ev!.payload) : ev!.payload;
    expect(payload).toMatchObject({ expiredSuggestionId: id });
  });
});

describe('sugestão (item 7)', () => {
  it('rejeitar exige motivo; contador rejeita; a lista do contador (par contador × dono) enxerga', async () => {
    const c = await cena(true);
    const id = (await put(c, { criterioAlocacao: 'CARGA_TRIBUTARIA' })).body.data.suggestion.id;
    expect((await decidir(c, c.contador, id, 'reject')).status).toBe(400);
    expect((await decidir(c, c.contador, id, 'reject', { reason: 'sem evidência de custo' })).body.data).toMatchObject({ status: 'REJECTED' });
    const lista = await request(app).get(`${P}/suggestions`).query({ unitId: c.unit, ownerUserId: c.dono.id, status: 'REJECTED' }).set(authHeader(c.contador));
    expect(lista.status).toBe(200);
    expect(lista.body.data.map((s: { id: string }) => s.id)).toEqual([id]);
  });

  it('I-13: auditoria tax.suggestion.* e tax.policy.* sem nome, e-mail, CPF ou texto livre', async () => {
    const c = await cena(true);
    const id = (await put(c, { criterioAlocacao: 'CARGA_TRIBUTARIA' })).body.data.suggestion.id;
    await decidir(c, c.contador, id, 'accept', { reason: 'Maria Contadora 52998224725 aprovou' });
    const eventos = await prisma.auditEvent.findMany({ where: { unitId: c.unit, eventType: { startsWith: 'tax.' } }, orderBy: { createdAt: 'asc' } });
    expect(eventos.map((e) => e.eventType)).toEqual(['tax.suggestion.proposed', 'tax.policy.updated', 'tax.suggestion.accepted']);
    const texto = JSON.stringify(eventos.map((e) => e.payload));
    for (const pii of ['Maria', '52998224725', 'aprovou', '@cont.local', '@test.local']) expect(texto).not.toContain(pii);
  });
});

describe('custo de serviço (item 5, F-EF-1 a)', () => {
  it('custo informado exige evidência; lista em centavos-string; soft-delete', async () => {
    const c = await cena(false);
    const base = { unitId: c.unit, serviceRef: 'srv-1', vigenteDesde: '2026-01-01' };
    expect((await request(app).post(`${P}/service-costs`).set(authHeader(c.dono)).send({ ...base, custoCents: '4000' })).status).toBe(400);
    const r = await request(app).post(`${P}/service-costs`).set(authHeader(c.dono)).send({ ...base, custoCents: '4000', sourceDocumentId: 'sd-1', catalogoMinimoCents: '6000' });
    expect(r.status).toBe(201);
    expect(r.body.data).toMatchObject({ custoCents: '4000', catalogoMinimoCents: '6000', sourceDocumentId: 'sd-1' });
    expect((await request(app).delete(`${P}/service-costs/${r.body.data.id}`).query({ unitId: c.unit }).set(authHeader(c.dono))).status).toBe(200);
    expect((await request(app).get(`${P}/service-costs`).query({ unitId: c.unit }).set(authHeader(c.dono))).body.data).toEqual([]);
  });
});
