/**
 * BE-INCR-RETENCOES-FONTE PR-1 (BRIEF itens 5, 6 e 8; F-RET-5 a, F-RET-16 a, F-RET-19 a) — contrato HTTP ponta a ponta do
 * regime da contraparte, do perfil de retenção e dos papéis das retenções no perfil fiscal.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { getFactory } from '@/lib/factory';
import type { AccountingScope } from '@/features/accounting/scope/AccountingScope';
import { makeApp, pushTestSchema, authHeader, seedUnit } from '@test/helpers';

const app = makeApp();
const UNIT = 'unit-ret';
const UNIT_OUTRO = 'unit-ret-outro';
const CPF = '52998224725';
const CNPJ = '11222333000181';
const PROF = '/api/accounting/withholding-profiles';

let dono: { id: string; username: string };
let outro: { id: string; username: string };

const ultimoEvento = async (eventType: string): Promise<Record<string, string>> =>
  JSON.parse((await prisma.auditEvent.findFirst({ where: { eventType }, orderBy: { seq: 'desc' } }))?.payload ?? '{}');
const criarContraparte = (body: Record<string, unknown>, who = dono, unitId = UNIT) =>
  request(app).post('/api/counterparties').set(authHeader(who)).send({ unitId, type: 'SUPPLIER', ...body });
const setRegime = (id: string, body: Record<string, unknown>) =>
  request(app).post(`/api/counterparties/${id}/regime`).set(authHeader(dono)).send({ unitId: UNIT, ...body });
const documento = (userId: string, unitId: string) =>
  prisma.sourceDocument.create({ data: { userId, unitId, sourceType: 'UPLOAD', description: 'declaração de optante' } });

const PERFIL = {
  unitId: UNIT,
  naturezaServico: 'SERVICO_PROFISSIONAL',
  natRend: '15022',
  irrf: true,
  csrf: true,
  inss: false,
  issRetido: false,
  fonte: 'RIR/2018 art. 714 § 1º XX (fisioterapia)',
  vigenteDesde: '2026-01-01',
};
const postPerfil = (body: Record<string, unknown>, who = dono) => request(app).post(PROF).set(authHeader(who)).send(body);

describe('RETENCOES-FONTE PR-1 — regime da contraparte (item 5)', () => {
  beforeAll(async () => {
    pushTestSchema();
    dono = await prisma.user.create({ data: { name: 'ret', username: 'ret-dono', email: 'ret@test.local', password: 'x', role: 'USER' } });
    await seedUnit({ userId: dono.id, id: UNIT });
    outro = await prisma.user.create({ data: { name: 'ret2', username: 'ret-outro', email: 'ret2@test.local', password: 'x', role: 'USER' } });
    await seedUnit({ userId: outro.id, id: UNIT_OUTRO });
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('criação: PF com CPF → 201; PF com CNPJ ou sem taxId → 400; auditoria com o regime, sem taxId nem nome', async () => {
    const pf = await criarContraparte({ name: 'Autônomo Silva', taxId: CPF, regimeTributario: 'PF' });
    expect([pf.status, pf.body.data.regimeTributario, pf.body.data.declaracaoOptanteDocumentId]).toEqual([201, 'PF', null]);
    const ev = await ultimoEvento('counterparty.created');
    expect(ev).toMatchObject({ counterpartyId: pf.body.data.id, type: 'SUPPLIER', regimeTributario: 'PF' });
    expect(JSON.stringify(ev)).not.toContain(CPF);
    expect((await criarContraparte({ name: 'Errada', taxId: CNPJ, regimeTributario: 'PF' })).status).toBe(400);
    expect((await criarContraparte({ name: 'Sem doc', regimeTributario: 'PF' })).status).toBe(400);
    expect((await criarContraparte({ name: 'Regime inventado', taxId: CNPJ, regimeTributario: 'LUCRO' })).status).toBe(400);
  });

  it('comando de regime: grava regime e declaração do mesmo escopo; documento de outro escopo → 400; null limpa', async () => {
    const pj = await criarContraparte({ name: 'Clínica Fisio Ltda', taxId: CNPJ });
    expect([pj.status, pj.body.data.regimeTributario]).toEqual([201, null]);
    const id = pj.body.data.id as string;
    const doc = await documento(dono.id, UNIT);
    const ok = await setRegime(id, { regimeTributario: 'SIMPLES', declaracaoOptanteDocumentId: doc.id });
    expect([ok.status, ok.body.data.regimeTributario, ok.body.data.declaracaoOptanteDocumentId]).toEqual([200, 'SIMPLES', doc.id]);
    expect(await ultimoEvento('counterparty.regime_set')).toEqual({ counterpartyId: id, regimeTributario: 'SIMPLES', declaracaoOptanteDocumentId: doc.id });

    const alheio = await documento(outro.id, UNIT_OUTRO);
    expect((await setRegime(id, { regimeTributario: 'SIMPLES', declaracaoOptanteDocumentId: alheio.id })).status).toBe(400);
    expect((await setRegime(id, { regimeTributario: 'PF' })).status).toBe(400); // CNPJ com PF
    const limpo = await setRegime(id, { regimeTributario: null, declaracaoOptanteDocumentId: null });
    expect([limpo.status, limpo.body.data.regimeTributario, limpo.body.data.declaracaoOptanteDocumentId]).toEqual([200, null, null]);
    expect((await setRegime(id, { regimeTributario: 'REAL', extra: 1 })).status).toBe(400); // .strict()
  });

  it('comando de regime: contraparte de outro escopo → 404', async () => {
    const alheia = await criarContraparte({ name: 'Outra', taxId: CNPJ }, outro, UNIT_OUTRO);
    expect((await setRegime(alheia.body.data.id, { regimeTributario: 'REAL' })).status).toBe(404);
  });
});

describe('RETENCOES-FONTE PR-1 — perfil de retenção (item 6)', () => {
  let pjId: string;
  let pfId: string;

  beforeAll(async () => {
    pjId = (await criarContraparte({ name: 'Fisio Perfil Ltda', taxId: CNPJ, regimeTributario: 'PRESUMIDO' })).body.data.id;
    pfId = (await criarContraparte({ name: 'Autônoma Perfil', taxId: '39053344705', regimeTributario: 'PF' })).body.data.id;
  });

  it('cria com natRend da Tabela 01; auditoria com ids, natureza e flags, sem taxId', async () => {
    const r = await postPerfil({ ...PERFIL, counterpartyId: pjId });
    expect(r.status).toBe(201);
    expect(r.body.data).toMatchObject({ counterpartyId: pjId, naturezaServico: 'SERVICO_PROFISSIONAL', natRend: '15022', irrf: true, csrf: true, avisos: [] });
    const ev = await ultimoEvento('withholding_profile.created');
    expect(ev).toEqual({
      profileId: r.body.data.id, counterpartyId: pjId, naturezaServico: 'SERVICO_PROFISSIONAL', natRend: '15022',
      irrf: 'true', csrf: 'true', inss: 'false', issRetido: 'false', vigenteDesde: '2026-01-01', vigenteAte: '',
    });
    expect(JSON.stringify(ev)).not.toContain(CNPJ);
  });

  it('flag sem o campo obrigatório → 400: issRetido sem codMun/alíquota, inss sem tpServico, irrf sem natRend', async () => {
    const base = { ...PERFIL, counterpartyId: pjId, naturezaServico: 'OUTRO', vigenteDesde: '2030-01-01' };
    expect((await postPerfil({ ...base, issRetido: true })).status).toBe(400);
    expect((await postPerfil({ ...base, issRetido: true, issCodMun: '3550308' })).status).toBe(400);
    expect((await postPerfil({ ...base, inss: true })).status).toBe(400);
    expect((await postPerfil({ ...base, natRend: null })).status).toBe(400);
    expect((await postPerfil({ ...base, natRend: '1502' })).status).toBe(400);
    expect((await postPerfil({ ...base, fonte: '  ' })).status).toBe(400);
    const ok = await postPerfil({ ...base, issRetido: true, issCodMun: '3550308', issAliquotaBp: 200, inss: true, inssTpServico: '100000003' });
    expect(ok.status).toBe(201);
  });

  it('natRend fora da Tabela 01 → 400; natRend só em DRAFT → 201 com aviso NATUREZA_RENDIMENTO_DRAFT', async () => {
    const r = await postPerfil({ ...PERFIL, counterpartyId: pjId, naturezaServico: 'COMISSAO_PROPAGANDA', natRend: '15049' });
    expect(r.status).toBe(400);
    expect(JSON.stringify(r.body)).toContain('15049');
    await prisma.legalParameter.create({
      data: {
        id: 'teste-natrend-15049', tabela: 'NATUREZA_RENDIMENTO', chave: '15049', valorJson: JSON.stringify({ descricao: 'x', grupo: 15, declarante: 'PJ', tributos: ['IR'], tiposIsencao: [] }),
        fonte: 'teste', vigenteDesde: '2023-09-01', status: 'DRAFT', motivo: 'teste', proposedById: 'teste',
      },
    });
    const d = await postPerfil({ ...PERFIL, counterpartyId: pjId, naturezaServico: 'COMISSAO_PROPAGANDA', natRend: '15049' });
    expect(d.status).toBe(201);
    expect(d.body.data.avisos).toEqual([expect.stringContaining('NATUREZA_RENDIMENTO_DRAFT')]);
  });

  it('contraparte PF só aceita irrf: CSRF, INSS ou ISS → 400; só IRRF → 201', async () => {
    const pf = { ...PERFIL, counterpartyId: pfId, naturezaServico: 'TRABALHO_NAO_ASSALARIADO_PF', natRend: '15099' };
    expect((await postPerfil(pf)).status).toBe(400);
    expect((await postPerfil({ ...pf, csrf: false, issRetido: true, issCodMun: '3550308', issAliquotaBp: 200 })).status).toBe(400);
    expect((await postPerfil({ ...pf, csrf: false })).status).toBe(201);
  });

  it('vigência que se cruza no mesmo par (contraparte, natureza) → 409; outra natureza ou depois do fim passa; PATCH não colide consigo', async () => {
    const r = await postPerfil({ ...PERFIL, counterpartyId: pjId, vigenteDesde: '2026-06-01' });
    expect([r.status, JSON.stringify(r.body)]).toEqual([409, expect.stringContaining('VIGENCIA_SOBREPOSTA')]);
    const lista = await request(app).get(PROF).set(authHeader(dono)).query({ unitId: UNIT, counterpartyId: pjId });
    const atual = lista.body.data.find((p: { naturezaServico: string }) => p.naturezaServico === 'SERVICO_PROFISSIONAL');
    const fecha = await request(app).patch(`${PROF}/${atual.id}`).set(authHeader(dono)).send({ ...PERFIL, vigenteAte: '2026-06-30' });
    expect([fecha.status, fecha.body.data.vigenteAte]).toEqual([200, '2026-06-30']);
    expect((await postPerfil({ ...PERFIL, counterpartyId: pjId, vigenteDesde: '2026-07-01' })).status).toBe(201);
    expect((await request(app).patch(`${PROF}/${atual.id}`).set(authHeader(dono)).send({ ...PERFIL, counterpartyId: pjId, vigenteAte: '2026-06-30' })).status).toBe(400); // counterpartyId não muda (.strict)
  });

  it('duas criações concorrentes sobrepostas → exatamente uma 201 e uma 409 (gate dentro da tx)', async () => {
    const corpo = { ...PERFIL, counterpartyId: pjId, naturezaServico: 'LIMPEZA_CONSERVACAO_SEGURANCA_LOCACAO', natRend: '15043' };
    const [a, b] = await Promise.all([postPerfil({ ...corpo, vigenteDesde: '2026-02-01' }), postPerfil({ ...corpo, vigenteDesde: '2026-03-01' })]);
    expect([a.status, b.status].sort()).toEqual([201, 409]);
    expect(await prisma.withholdingProfile.count({ where: { counterpartyId: pjId, naturezaServico: corpo.naturezaServico, deletedAt: null } })).toBe(1);
  });

  it('tenancy e soft-delete: id de outro escopo → 404; contraparte de outro escopo → 404; DELETE some e libera a vigência', async () => {
    const lista = await request(app).get(PROF).set(authHeader(dono)).query({ unitId: UNIT, counterpartyId: pjId });
    const alvo = lista.body.data.find((p: { naturezaServico: string }) => p.naturezaServico === 'LIMPEZA_CONSERVACAO_SEGURANCA_LOCACAO');
    expect((await request(app).get(`${PROF}/${alvo.id}`).set(authHeader(outro)).query({ unitId: UNIT_OUTRO })).status).toBe(404);
    const alheia = await criarContraparte({ name: 'Alheia Perfil', taxId: CNPJ }, outro, UNIT_OUTRO);
    expect((await postPerfil({ ...PERFIL, counterpartyId: alheia.body.data.id })).status).toBe(404);
    expect((await request(app).delete(`${PROF}/${alvo.id}`).set(authHeader(dono)).query({ unitId: UNIT })).status).toBe(200);
    expect((await request(app).get(`${PROF}/${alvo.id}`).set(authHeader(dono)).query({ unitId: UNIT })).status).toBe(404);
    expect(await ultimoEvento('withholding_profile.deleted')).toEqual({ profileId: alvo.id });
    expect(await prisma.withholdingProfile.count({ where: { id: alvo.id, deletedAt: { not: null } } })).toBe(1);
    const corpo = { ...PERFIL, counterpartyId: pjId, naturezaServico: 'LIMPEZA_CONSERVACAO_SEGURANCA_LOCACAO', natRend: '15043' };
    expect((await postPerfil({ ...corpo, vigenteDesde: '2026-02-01' })).status).toBe(201);
  });
});

describe('RETENCOES-FONTE PR-1 — papéis das retenções no perfil fiscal (item 8; F-RET-19 a)', () => {
  const conta = (code: string, nature: string) => prisma.account.create({ data: { userId: dono.id, unitId: UNIT, code, name: code, nature, acceptsEntries: true } });
  const putUnidade = (body: Record<string, unknown>) =>
    request(app)
      .put('/api/accounting/fiscal-profile')
      .set(authHeader(dono))
      .send({ unitId: UNIT, regimeTributario: 'PRESUMIDO', icmsContribuinte: false, pisCofinsRegime: 'CUMULATIVO', ...body });
  const scope = (): AccountingScope => ({
    ownerUserId: dono.id, actorUserId: dono.id, unitId: UNIT, ledgerCode: 'DEFAULT', baseCurrencyCode: 'BRL', timeZone: 'America/Sao_Paulo',
  });

  it('ensureCanonicalAccounts preenche só o IRRF retido com a 2.1.7.03; os outros 6 papéis ficam nulos (folhas fora até o P-RET-4)', async () => {
    expect((await putUnidade({})).status).toBe(200);
    await request(app).get('/api/accounting/accounts').set(authHeader(dono)).query({ unitId: UNIT }); // ensureChartOfAccounts
    expect(await prisma.account.count({ where: { userId: dono.id, unitId: UNIT, code: { startsWith: '2.1.9' } } })).toBe(0);
    expect(await prisma.account.count({ where: { userId: dono.id, unitId: UNIT, code: { startsWith: '1.1.8' } } })).toBe(0);
    await getFactory().getFiscalProfileService().ensureCanonicalAccounts(scope());
    const irrf = await prisma.account.findFirstOrThrow({ where: { userId: dono.id, unitId: UNIT, code: '2.1.7.03' } });
    const fp = await prisma.fiscalProfile.findFirstOrThrow({ where: { userId: dono.id, unitId: UNIT } });
    expect(fp.retencaoIrrfRecolherAccountId).toBe(irrf.id);
    expect([fp.retencaoCsrfRecolherAccountId, fp.retencaoInssRecolherAccountId, fp.retencaoIssRecolherAccountId, fp.retencaoIrrfCompensarAccountId, fp.retencaoCsllCompensarAccountId, fp.retencaoInssCompensarAccountId]).toEqual([null, null, null, null, null, null]);
  });

  it('cada papel com a natureza certa grava; natureza errada → 400 com o rótulo; evento com os ids', async () => {
    const passivo = await conta('2.1.99.01', 'Liability');
    const ativo = await conta('1.1.99.01', 'Asset');
    const papeis = [
      ['retencaoIrrfRecolherAccountId', passivo, ativo, 'IRRF retido a recolher'],
      ['retencaoCsrfRecolherAccountId', passivo, ativo, 'CSRF retida a recolher'],
      ['retencaoInssRecolherAccountId', passivo, ativo, 'INSS retido a recolher'],
      ['retencaoIssRecolherAccountId', passivo, ativo, 'ISS retido a recolher'],
      ['retencaoIrrfCompensarAccountId', ativo, passivo, 'IRRF retido a compensar'],
      ['retencaoCsllCompensarAccountId', ativo, passivo, 'CSLL retida a compensar'],
      ['retencaoInssCompensarAccountId', ativo, passivo, 'INSS retido a compensar'],
    ] as const;
    const ok = await putUnidade(Object.fromEntries(papeis.map(([campo, certa]) => [campo, certa.id])));
    expect(ok.status).toBe(200);
    expect(ok.body.data).toMatchObject(Object.fromEntries(papeis.map(([campo, certa]) => [campo, certa.id])));
    expect(await ultimoEvento('fiscal_profile.updated')).toMatchObject({ retencaoCsrfRecolherAccountId: passivo.id, retencaoInssCompensarAccountId: ativo.id });
    for (const [campo, , errada, rotulo] of papeis) {
      const r = await putUnidade({ [campo]: errada.id });
      expect([campo, r.status]).toEqual([campo, 400]);
      expect(JSON.stringify(r.body)).toContain(rotulo);
    }
  });
});
