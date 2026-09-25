/**
 * BE-INCR-FISCAL-OBLIGATION-PROFILE (nó X13, PR-2, BRIEF itens 12, 13, 15, 16, 17, 18) — contrato HTTP ponta a ponta:
 * a geração SPED lê o perfil fiscal da EMPRESA do ano, recusa o regime errado, a trava pós-ECF segura o regime e a
 * unidade segue o regime da empresa. A ECD gera 201 em banco vazio (precedente: accountingContactController test).
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';
import { anoCorrente } from '@/features/accounting/services/CompanyFiscalProfileService';

const app = makeApp();
const UNIT = 'unit-x13-sped';
const PERFIL = '/api/accounting/company-fiscal-profile';
const HOJE = anoCorrente({ timeZone: 'America/Sao_Paulo' } as never);
// Anos RELATIVOS ao corrente: o ano corrente fica livre para os itens 15/17 (o item 16 trava ANO).
const ANO = HOJE - 1;
const SEM_PERFIL = HOJE - 2;
const ANO_SIMPLES = HOJE - 3;

let dono: { id: string; username: string };
let contadorId: string;
let signerId: string;

const putPerfil = (ano: number, body: Record<string, unknown>) =>
  request(app).put(`${PERFIL}/${ano}`).set(authHeader(dono)).send({ unitId: UNIT, ...body });
const gerar = (rota: string, body: Record<string, unknown>) =>
  request(app).post(`/api/accounting/sped/${rota}/generate`).set(authHeader(dono)).send({ unitId: UNIT, ...body });
const baixar = async (jobId: string) =>
  String((await request(app).get(`/api/accounting/data-exchange/jobs/${jobId}/download`).query({ unitId: UNIT }).set(authHeader(dono))).text);

const PERFIL_PRESUMIDO = () => ({
  regime: 'PRESUMIDO',
  grandePorte: false,
  condicoes: { aporteInvestidorAnjo: false, livroCaixaSemEscrituracao: false, distribuicaoAcimaBase: false },
  declarante: { nome: 'SALAO PERFIL LTDA', cnpj: '12345678000195', uf: 'SP', codMun: '3550308' },
  ecd: { indNire: '0', numOrd: '42', natLivr: 'DIARIO DO PERFIL' },
  contadorContactId: contadorId,
  representanteLegalSignerId: signerId,
});

describe('X13 PR-2 — geração SPED lê o perfil da empresa', () => {
  beforeAll(async () => {
    pushTestSchema();
    dono = await prisma.user.create({ data: { name: 'x13s', username: 'x13-sped', email: 'x13s@test.local', password: 'x', role: 'USER' } });
    const c = await prisma.accountingContact.create({
      data: { userId: dono.id, unitId: UNIT, name: 'Contabil Perfil', email: 'cp@c.com', cpf: '52998224725', phone: '1133334444', crcNumber: 'SP-000999/O-1', crcUf: 'SP' },
    });
    contadorId = c.id;
    const s = await request(app)
      .post('/api/accounting/company-signers')
      .set(authHeader(dono))
      .send({ unitId: UNIT, nome: 'SOCIA PERFIL', cpf: '55566677720', qualifEcd: '205', qualifEcf: '205', email: 's@p.com', fone: '11987654321' });
    signerId = s.body.data.id;
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('F-XP-1 (c): sem perfil no ano a ECD segue pelo corpo e a resposta avisa', async () => {
    const r = await gerar('ecd', {
      mappingVersion: 'RFB-2024', year: SEM_PERFIL,
      declarant: { nome: 'CORPO', cnpj: '11222333000181', uf: 'SP', codMun: '3550308', indNire: '0', indGrandePorte: '0' },
      book: { numOrd: '1', natLivr: 'Livro', dtExSocial: `${SEM_PERFIL}-12-31` },
      signers: [{ identNom: 'Sócio', identCpfCnpj: '55566677720', codAssin: '309', indRespLegal: 'S' }],
      signerContactIds: [contadorId],
    });
    expect(r.status).toBe(201);
    expect(r.body.perfilFiscal).toEqual({ aplicado: false, sobrescritos: [] });
    expect(r.body.avisos).toEqual([expect.stringMatching(new RegExp(`perfil fiscal da empresa ausente para ${SEM_PERFIL}`))]);
  });

  it('item 12: ECD com corpo mínimo gera 201 e o arquivo traz declarante, livro e os 2 signatários do PERFIL', async () => {
    expect((await putPerfil(ANO, PERFIL_PRESUMIDO())).status).toBe(200);
    const r = await gerar('ecd', { mappingVersion: 'RFB-2024', year: ANO, book: { dtExSocial: `${ANO}-12-31` } });
    expect(r.status).toBe(201);
    expect(r.body.perfilFiscal).toEqual({ aplicado: true, sobrescritos: [] });
    const txt = await baixar(r.body.data.id);
    expect(txt).toContain('12345678000195');
    expect(txt).toContain('SALAO PERFIL LTDA');
    expect(txt).toContain('DIARIO DO PERFIL');
    const j930 = txt.split(/\r?\n/).filter((l) => l.startsWith('|J930|'));
    expect(j930.some((l) => l.includes('SOCIA PERFIL') && l.includes('|205|'))).toBe(true); // responsável legal (perfil)
    expect(j930.some((l) => l.includes('SP-000999/O-1') && l.includes('|900|'))).toBe(true); // contador (perfil → expandSignerContacts)
  });

  it('item 12: campo no corpo vence e aparece em sobrescritos', async () => {
    const r = await gerar('ecd', { mappingVersion: 'RFB-2024', year: ANO, book: { numOrd: '99', dtExSocial: `${ANO}-12-31` } });
    expect(r.status).toBe(201);
    expect(r.body.perfilFiscal.sobrescritos).toEqual(['book.numOrd']);
    expect(await baixar(r.body.data.id)).not.toContain('|42|'); // o nº de ordem do perfil NÃO entrou
  });

  it('item 13: perfil PRESUMIDO → ECF Real recusada (REGIME_DIVERGENTE); perfil SIMPLES → ECF recusada (IN 2.004 art. 1º §1º I)', async () => {
    const real = await gerar('ecf/real', { year: ANO, fiscal: { formaTrib: '1', formaTribPer: 'RRRR' } });
    expect(real.status).toBe(400);
    expect(JSON.stringify(real.body)).toMatch(/REGIME_DIVERGENTE/);
    expect((await putPerfil(ANO_SIMPLES, { regime: 'SIMPLES' })).status).toBe(200);
    const simples = await gerar('ecf', { year: ANO_SIMPLES });
    expect(simples.status).toBe(400);
    expect(JSON.stringify(simples.body)).toMatch(/OBRIGACAO_NAO_SE_APLICA.*2\.004\/2021 art\. 1º §1º I/);
    // nenhum job de ECF nasceu dos dois pedidos recusados
    expect(await prisma.accountingDataExchangeJob.count({ where: { kind: { contains: 'ECF' } } })).toBe(0);
  });

  it('item 16: ecf-transmitida trava o regime — PUT mudando regime 409, mesmo regime 200, DELETE 409; recibo sem perfil 404', async () => {
    expect((await request(app).post(`${PERFIL}/2019/ecf-transmitida`).set(authHeader(dono)).send({ unitId: UNIT, recibo: 'R-0' })).status).toBe(404);
    const t = await request(app).post(`${PERFIL}/${ANO}/ecf-transmitida`).set(authHeader(dono)).send({ unitId: UNIT, recibo: 'RECIBO-1' });
    expect(t.status).toBe(200);
    expect(t.body.data).toMatchObject({ ecfRecibo: 'RECIBO-1', regimeTravadoEm: expect.any(String) });
    const travadoEm = t.body.data.regimeTravadoEm;

    const muda = await putPerfil(ANO, { ...PERFIL_PRESUMIDO(), regime: 'REAL', condicoes: { aporteInvestidorAnjo: false } });
    expect(muda.status).toBe(409);
    expect(JSON.stringify(muda.body)).toMatch(/REGIME_TRAVADO/);
    expect((await putPerfil(ANO, { ...PERFIL_PRESUMIDO(), grandePorte: null })).status).toBe(200); // outros campos seguem editáveis
    expect((await request(app).delete(`${PERFIL}/${ANO}`).set(authHeader(dono)).query({ unitId: UNIT })).status).toBe(409);

    // retificadora: recibo novo, a data da trava fica a da primeira transmissão
    const r2 = await request(app).post(`${PERFIL}/${ANO}/ecf-transmitida`).set(authHeader(dono)).send({ unitId: UNIT, recibo: 'RECIBO-2' });
    expect(r2.body.data).toMatchObject({ ecfRecibo: 'RECIBO-2', regimeTravadoEm: travadoEm });
    const ev = await prisma.auditEvent.findMany({ where: { eventType: 'company_fiscal_profile.ecf_transmitted' } });
    expect(ev).toHaveLength(2);
  });

  it('item 15 + F-XP-8 (a): unidade divergente do regime da empresa no ano corrente → PUT da unidade 400; PUT da empresa lista a divergência', async () => {
    // unidade REAL criada ANTES do perfil da empresa do ano corrente — sem perfil da empresa, nada é exigido
    const unidade = await request(app)
      .put('/api/accounting/fiscal-profile')
      .set(authHeader(dono))
      .send({ unitId: UNIT, regimeTributario: 'REAL', icmsContribuinte: false, pisCofinsRegime: 'NAO_CUMULATIVO' });
    expect(unidade.status).toBe(200);
    const empresa = await putPerfil(HOJE, { regime: 'SIMPLES' });
    expect(empresa.status).toBe(200);
    expect(empresa.body.data.unidadesDivergentes).toEqual([UNIT]);

    const divergente = await request(app)
      .put('/api/accounting/fiscal-profile')
      .set(authHeader(dono))
      .send({ unitId: UNIT, regimeTributario: 'REAL', icmsContribuinte: false, pisCofinsRegime: 'NAO_CUMULATIVO' });
    expect(divergente.status).toBe(400);
    expect(JSON.stringify(divergente.body)).toMatch(/regime_divergente_da_empresa/);
    const ok = await request(app)
      .put('/api/accounting/fiscal-profile')
      .set(authHeader(dono))
      .send({ unitId: UNIT, regimeTributario: 'SIMPLES', icmsContribuinte: false, pisCofinsRegime: 'SIMPLES' });
    expect(ok.status).toBe(200);
  });

  it('item 17: empresa MEI no ano corrente → GET da unidade mostra a emissão bloqueada com o motivo', async () => {
    await prisma.companyFiscalProfile.update({ where: { userId_anoCalendario: { userId: dono.id, anoCalendario: HOJE } }, data: { regime: 'MEI' } });
    const g = await request(app).get('/api/accounting/fiscal-profile').set(authHeader(dono)).query({ unitId: UNIT });
    expect(g.status).toBe(200);
    expect(g.body.data.emissao.completo).toBe(false);
    expect(g.body.data.emissao.faltantes).toContain('regime MEI — emissão fora do escopo (opSimpNac=2)');
  });
});
