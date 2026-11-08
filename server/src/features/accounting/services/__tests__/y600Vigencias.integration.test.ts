/**
 * FE-INCR-ECF-Y600 PR-0 (BRIEF itens 1–2; F-FE-Y600-1 → b) — `GET /api/accounting/sped/ecf/y600/vigencias` ponta a ponta
 * (app Express real, SQLite real, cadastro criado pela rota de sócios).
 *  - (b) paridade: complemento só para os `partnerId` da rota ⇒ a ECF Presumido gera (201); tirar um ⇒ 400
 *    `ECF_Y600_COMPLEMENTO_FALTANDO` com aquele id. A tela e o gerador leem o mesmo conjunto.
 *  - (c) tenancy: `unitId` de outro dono ⇒ 404.
 *  - (d) PII: a leitura não é auditada e o corpo não leva o CPF/CNPJ inteiro.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader, seedUnit } from '@test/helpers';

const app = makeApp();
const UNIT = 'unit-y600-vig';
const UNIT_B = `${UNIT}-b`;
const ZEROS = { remTrabCents: 0, lucDivCents: 0, jurCapCents: 0, demRendCents: 0, irRetCents: 0 };

let dono: { id: string; username: string };
let outro: { id: string; username: string };
const ids: Record<string, string> = {};

const criarSocio = async (key: string, body: Record<string, unknown>) => {
  const r = await request(app).post('/api/accounting/partners').set(authHeader(dono)).send({ unitId: UNIT, residenteBrasil: true, ...body });
  expect(r.status).toBe(201);
  ids[key] = r.body.data.id as string;
};

const vigencias = (who = dono, query: Record<string, unknown> = { unitId: UNIT, year: 2025 }) =>
  request(app).get('/api/accounting/sped/ecf/y600/vigencias').set(authHeader(who)).query(query);

const gerarEcf = (partnerIds: string[]) =>
  request(app)
    .post('/api/accounting/sped/ecf/generate')
    .set(authHeader(dono))
    .send({
      unitId: UNIT,
      year: 2025,
      declarant: {
        cnpj: '11222333000181', nome: 'SALAO TESTE LTDA', codNat: '2062', cnaeFiscal: '9602501',
        endereco: 'RUA DAS FLORES', num: '100', bairro: 'CENTRO', uf: 'DF', codMun: '5300108',
        cep: '70000000', email: 'salao@teste.com',
      },
      signers: [
        { identNom: 'CONTADOR', identCpfCnpj: '11122233396', identQualif: '900', indCrc: 'DF-123456/O-1', email: 'c@d.com', fone: '6133334444' },
        { identNom: 'SOCIO', identCpfCnpj: '98765432100', identQualif: '205', email: 's@d.com', fone: '6133335555' },
      ],
      socios: partnerIds.map((partnerId) => ({ partnerId, qualif: '02', valores: ZEROS })),
    });

describe('GET /api/accounting/sped/ecf/y600/vigencias — FE-INCR-ECF-Y600 PR-0', () => {
  beforeAll(async () => {
    pushTestSchema();
    dono = await prisma.user.create({ data: { name: 'y6v', username: 'y600-vig-dono', email: 'y6v@test.local', password: 'x', role: 'USER' } });
    outro = await prisma.user.create({ data: { name: 'y6v2', username: 'y600-vig-outro', email: 'y6v2@test.local', password: 'x', role: 'USER' } });
    await seedUnit({ userId: dono.id, id: UNIT });
    await seedUnit({ userId: outro.id, id: UNIT_B });
    await criarSocio('fica', { nome: 'SOCIA FICA', taxId: '52998224725', participacaoBp: 6000, entradaEm: '2020-01-01' });
    await criarSocio('saiu', { nome: 'SOCIO SAIU', taxId: '39053344705', participacaoBp: 0, entradaEm: '2020-01-01', saidaEm: '2025-06-30' });
    await criarSocio('mudouAntes', { nome: 'SOCIO MUDOU', taxId: '86288366757', participacaoBp: 3000, entradaEm: '2020-01-01', saidaEm: '2025-03-31' });
    await criarSocio('mudouDepois', { nome: 'SOCIO MUDOU', taxId: '86288366757', participacaoBp: 4000, entradaEm: '2025-04-01' });
    await criarSocio('futuro', { nome: 'ENTRA DEPOIS', taxId: '11144477735', participacaoBp: 0, entradaEm: '2026-01-01' });
    await criarSocio('apagado', { nome: 'APAGADO', taxId: '12345678909', participacaoBp: 0, entradaEm: '2020-01-01' });
    const del = await request(app).delete(`/api/accounting/partners/${ids.apagado}`).set(authHeader(dono)).query({ unitId: UNIT });
    expect(del.status).toBeLessThan(300);
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('itens 1 e 2a: devolve as vigências do ano (saída de fato com dtFimSoc; mudança de participação sem); fora do ano e apagada ficam fora', async () => {
    const r = await vigencias();
    expect(r.status).toBe(200);
    const v = r.body.data.vigencias as Array<{ partnerId: string; dtFimSoc: string | null; vigenteNoFim: boolean; taxIdFinal: string }>;
    const porId = new Map(v.map((x) => [x.partnerId, x]));
    expect([...porId.keys()].sort()).toEqual([ids.fica, ids.saiu, ids.mudouAntes, ids.mudouDepois].sort());
    expect(porId.get(ids.saiu)).toMatchObject({ dtFimSoc: '2025-06-30', vigenteNoFim: false });
    expect(porId.get(ids.mudouAntes)).toMatchObject({ dtFimSoc: null, vigenteNoFim: false });
    expect(porId.get(ids.mudouDepois)).toMatchObject({ dtFimSoc: null, vigenteNoFim: true });
    expect(porId.get(ids.fica)?.taxIdFinal).toBe('4725');
    expect(r.body.data.somaParticipacaoFimBp).toBe(10000);
  });

  it('item 2b: paridade — complemento só para os ids da rota gera a ECF (201); tirar um dá ECF_Y600_COMPLEMENTO_FALTANDO com aquele id', async () => {
    const daRota = ((await vigencias()).body.data.vigencias as Array<{ partnerId: string }>).map((x) => x.partnerId);
    const ok = await gerarEcf(daRota);
    expect([ok.status, ok.body.data?.kind]).toEqual([201, 'EXPORT_SPED_ECF']);

    const semUm = await gerarEcf(daRota.filter((id) => id !== ids.saiu));
    expect(semUm.status).toBe(400);
    expect(JSON.stringify(semUm.body)).toContain('ECF_Y600_COMPLEMENTO_FALTANDO');
    expect(JSON.stringify(semUm.body)).toContain(ids.saiu);

    const comFuturo = await gerarEcf([...daRota, ids.futuro]);
    expect(comFuturo.status).toBe(400);
    expect(JSON.stringify(comFuturo.body)).toContain('ECF_Y600_PARTNER_FORA_DO_ANO');
  });

  it('item 2c: tenancy — unitId de outro dono dá 404; ano fora de 2015..2100 e chave extra dão 400', async () => {
    expect((await vigencias(outro)).status).toBe(404);
    expect((await vigencias(dono, { unitId: UNIT, year: 2014 })).status).toBe(400);
    expect((await vigencias(dono, { unitId: UNIT, year: 2025, data: '2025-01-01' })).status).toBe(400);
  });

  it('item 2d: PII — a leitura não grava auditoria e o corpo não leva CPF inteiro', async () => {
    const antes = await prisma.auditEvent.count();
    const r = await vigencias();
    expect(r.status).toBe(200);
    expect(await prisma.auditEvent.count()).toBe(antes);
    for (const cpf of ['52998224725', '39053344705', '86288366757']) expect(JSON.stringify(r.body)).not.toContain(cpf);
  });
});
