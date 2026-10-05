/**
 * BE-INCR-TAX-ASSESSMENT Fase A PR-1 (nó X7, BRIEF itens 1, 2b e 3) — perfil da empresa (forma, trava, liminar) e
 * contas da provisão no perfil da unidade, ponta a ponta pelo HTTP já existente (o PR-1 não cria rota).
 * A trava (`formaApuracaoTravadaEm`) só é gravada pela confirmação do PR-2; aqui ela é posta direto no banco.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';

const app = makeApp();
const UNIT = 'unit-x7';
const BASE = '/api/accounting/company-fiscal-profile';
const ECF = { indAliqCsll: '1', indRecReceita: '2' };

let dono: { id: string; username: string };

const put = (ano: number, body: Record<string, unknown>) =>
  request(app).put(`${BASE}/${ano}`).set(authHeader(dono)).send({ unitId: UNIT, ...body });
const putUnidade = (body: Record<string, unknown>) =>
  request(app)
    .put('/api/accounting/fiscal-profile')
    .set(authHeader(dono))
    .send({ unitId: UNIT, regimeTributario: 'REAL', icmsContribuinte: false, pisCofinsRegime: 'NAO_CUMULATIVO', ...body });
const ultimoEvento = async (eventType: string): Promise<Record<string, string>> =>
  JSON.parse((await prisma.auditEvent.findFirst({ where: { eventType }, orderBy: { seq: 'desc' } }))?.payload ?? '{}');
const conta = (code: string, nature: string, acceptsEntries = true) =>
  prisma.account.create({ data: { userId: dono.id, unitId: UNIT, code, name: code, nature, acceptsEntries } });

describe('X7 PR-1 — perfil (itens 1, 2b) e contas da provisão (item 3)', () => {
  beforeAll(async () => {
    pushTestSchema();
    dono = await prisma.user.create({ data: { name: 'x7', username: 'x7-dono', email: 'x7@test.local', password: 'x', role: 'USER' } });
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('item 1: grava forma/obrigatoriedade/datas; ANUAL ⇒ 400 "Fase B"; evento com os 3 campos e sem datas', async () => {
    const r = await put(2026, {
      regime: 'REAL', ecf: ECF, formaApuracaoIrpjCsll: 'TRIMESTRAL', lucroRealObrigatorio: false,
      inicioAtividadeEm: '2026-02-01', lc224LiminarReferencia: null,
    });
    expect(r.status).toBe(200);
    expect(r.body.data).toMatchObject({ formaApuracaoIrpjCsll: 'TRIMESTRAL', lucroRealObrigatorio: false, inicioAtividadeEm: '2026-02-01', formaApuracaoTravadaEm: null });
    const ev = await ultimoEvento('company_fiscal_profile.updated');
    expect(ev).toMatchObject({ formaApuracaoIrpjCsll: 'TRIMESTRAL', formaApuracaoTravadaEm: '', lucroRealObrigatorio: 'false', lc224AcrescimoSuspenso: 'false' });
    expect(ev).not.toHaveProperty('inicioAtividadeEm');
    const anual = await put(2026, { regime: 'REAL', ecf: ECF, formaApuracaoIrpjCsll: 'ANUAL' });
    expect(anual.status).toBe(400);
    expect(JSON.stringify(anual.body)).toContain('forma anual é da Fase B');
  });

  it('item 1 (D2): travado ⇒ PUT que troca regime/forma/obrigatoriedade 400; mesma forma efetiva passa; DELETE 400', async () => {
    await prisma.companyFiscalProfile.update({
      where: { userId_anoCalendario: { userId: dono.id, anoCalendario: 2026 } },
      data: { formaApuracaoTravadaEm: new Date('2026-04-30T12:00:00Z') },
    });
    const travado = { regime: 'REAL', ecf: ECF, formaApuracaoIrpjCsll: 'TRIMESTRAL', lucroRealObrigatorio: false };
    for (const troca of [{ regime: 'PRESUMIDO', lucroRealObrigatorio: null }, { lucroRealObrigatorio: true }]) {
      const r = await put(2026, { ...travado, ...troca });
      expect(r.status).toBe(400);
      expect(JSON.stringify(r.body)).toContain('FORMA_TRAVADA');
    }
    // REAL com forma nula = TRIMESTRAL efetivo (D1) — não é troca
    expect((await put(2026, { ...travado, formaApuracaoIrpjCsll: null })).status).toBe(200);
    // PRESUMIDO só é trimestral (D1): nula × TRIMESTRAL também não é troca
    await put(2027, { regime: 'PRESUMIDO', ecf: ECF });
    await prisma.companyFiscalProfile.update({
      where: { userId_anoCalendario: { userId: dono.id, anoCalendario: 2027 } },
      data: { formaApuracaoTravadaEm: new Date('2027-04-30T12:00:00Z') },
    });
    expect((await put(2027, { regime: 'PRESUMIDO', ecf: ECF, formaApuracaoIrpjCsll: 'TRIMESTRAL' })).status).toBe(200);
    const del = await request(app).delete(`${BASE}/2026`).set(authHeader(dono)).query({ unitId: UNIT });
    expect(del.status).toBe(400);
    expect(JSON.stringify(del.body)).toContain('FORMA_TRAVADA');
  });

  it('item 2b: a chave da liminar muda com a forma travada; evento leva o booleano e NUNCA o processo', async () => {
    const r = await put(2026, {
      regime: 'REAL', ecf: ECF, lucroRealObrigatorio: false, lc224AcrescimoSuspenso: true, lc224LiminarReferencia: '5001234-56.2026.4.03.6100',
    });
    expect(r.status).toBe(200);
    expect(r.body.data).toMatchObject({ lc224AcrescimoSuspenso: true, lc224LiminarReferencia: '5001234-56.2026.4.03.6100' });
    const ev = await ultimoEvento('company_fiscal_profile.updated');
    expect(ev.lc224AcrescimoSuspenso).toBe('true');
    expect(JSON.stringify(ev)).not.toContain('5001234');
    const semProcesso = await put(2026, { regime: 'REAL', ecf: ECF, lucroRealObrigatorio: false, lc224AcrescimoSuspenso: true });
    expect(semProcesso.status).toBe(400);
    expect(JSON.stringify(semProcesso.body)).toContain('informe o processo da liminar');
  });

  it('Fase B item 3b (F-TB-5 b): prestadoraExclusivaServicos grava e audita; com a forma travada, trocar ⇒ 400', async () => {
    const livre = await put(2028, { regime: 'REAL', ecf: ECF, lucroRealObrigatorio: false, prestadoraExclusivaServicos: true });
    expect(livre.status).toBe(200);
    expect(livre.body.data.prestadoraExclusivaServicos).toBe(true);
    expect((await ultimoEvento('company_fiscal_profile.updated')).prestadoraExclusivaServicos).toBe('true');
    await prisma.companyFiscalProfile.update({
      where: { userId_anoCalendario: { userId: dono.id, anoCalendario: 2028 } },
      data: { formaApuracaoTravadaEm: new Date('2028-02-27T12:00:00Z') },
    });
    const troca = await put(2028, { regime: 'REAL', ecf: ECF, lucroRealObrigatorio: false, prestadoraExclusivaServicos: false });
    expect(troca.status).toBe(400);
    expect(JSON.stringify(troca.body)).toContain('prestadoraExclusivaServicos');
    expect((await put(2028, { regime: 'REAL', ecf: ECF, lucroRealObrigatorio: false, prestadoraExclusivaServicos: true })).status).toBe(200);
  });

  it('item 3 (F-TA-6 a): 4 contas da provisão com natureza checada; evento com os ids', async () => {
    const desp = await conta('4.9.1', 'Expense');
    const despCsll = await conta('4.9.2', 'Expense');
    const rec = await conta('2.1.9.1', 'Liability');
    const recCsll = await conta('2.1.9.2', 'Liability');
    const sintetica = await conta('2.1.9', 'Liability', false);

    expect((await putUnidade({ irpjDespesaAccountId: rec.id })).status).toBe(400); // passivo como despesa
    expect((await putUnidade({ irpjRecolherAccountId: desp.id })).status).toBe(400); // despesa como a recolher
    expect((await putUnidade({ csllRecolherAccountId: sintetica.id })).status).toBe(400); // não é folha
    expect((await putUnidade({ csllDespesaAccountId: 'nao-existe' })).status).toBe(400);

    const ok = await putUnidade({ irpjDespesaAccountId: desp.id, csllDespesaAccountId: despCsll.id, irpjRecolherAccountId: rec.id, csllRecolherAccountId: recCsll.id });
    expect(ok.status).toBe(200);
    expect(ok.body.data).toMatchObject({ irpjDespesaAccountId: desp.id, csllDespesaAccountId: despCsll.id, irpjRecolherAccountId: rec.id, csllRecolherAccountId: recCsll.id });
    expect(await ultimoEvento('fiscal_profile.updated')).toMatchObject({ irpjDespesaAccountId: desp.id, csllRecolherAccountId: recCsll.id });
    // FK Restrict: a conta configurada não some por hard-delete
    await expect(prisma.account.delete({ where: { id: desp.id } })).rejects.toThrow();
  });
});
