/**
 * Onda 3.1 (auditoria 24/11/2026) — CNPJ alfanumérico PONTA A PONTA no sócio PJ: cadastro (`POST /accounting/partners`) →
 * vigência do ano → Y600 da ECF baixada. Antes o DTO só aceitava `\d{11}|\d{14}` e o sócio PJ alfanumérico recebia 400
 * (IN RFB 2.229/2024; Manual da ECF L12 §2.4 `CNPJ C 014`). Cada negativo carrega o seu controle positivo.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader, seedUnit } from '@test/helpers';
import { cnpjCheckDigits } from '@/lib/cnpj';

const app = makeApp();
const UNIT = 'unit-cnpj-alfa';
const BASE12 = '12ABC34501DE';
const CNPJ_ALFA = `${BASE12}${cnpjCheckDigits(BASE12)}`; // '12ABC34501DE35'
const SOCIO = { unitId: UNIT, nome: 'HOLDING ALFA', taxId: CNPJ_ALFA, residenteBrasil: true, participacaoBp: 10000, entradaEm: '2020-01-01' };

let dono: { id: string; username: string };

describe('Onda 3.1 — sócio PJ com CNPJ alfanumérico gera Y600', () => {
  beforeAll(async () => {
    pushTestSchema();
    dono = await prisma.user.create({ data: { name: 'alfa', username: 'cnpj-alfa', email: 'alfa@test.local', password: 'x', role: 'USER' } });
    await seedUnit({ userId: dono.id, id: UNIT });
    for (const quarter of ['T01', 'T02', 'T03', 'T04']) {
      const r = await request(app).post('/api/lalur/parte-b/close').set(authHeader(dono)).send({ unitId: UNIT, year: 2025, quarter });
      expect(r.status).toBe(200);
    }
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('DV errado → 400; letra minúscula → 400; CNPJ alfanumérico com DV certo → 201 PJ (o controle do negativo)', async () => {
    const post = (taxId: string) => request(app).post('/api/accounting/partners').set(authHeader(dono)).send({ ...SOCIO, taxId });
    expect((await post(`${BASE12}36`)).status).toBe(400);
    expect((await post(`${BASE12.toLowerCase()}35`)).status).toBe(400);
    const ok = await post(CNPJ_ALFA);
    expect(ok.status).toBe(201);
    expect(ok.body.data).toMatchObject({ taxId: CNPJ_ALFA, tipoPessoa: 'PJ' });
  });

  it('a ECF baixada traz o Y600 do sócio PJ com as 14 posições alfanuméricas intactas', async () => {
    const partner = await prisma.partner.findFirstOrThrow({ where: { userId: dono.id, taxId: CNPJ_ALFA, deletedAt: null } });
    const res = await request(app)
      .post('/api/accounting/sped/ecf/real/generate')
      .set(authHeader(dono))
      .send({
        unitId: UNIT,
        year: 2025,
        declarant: {
          cnpj: '11222333000181', nome: 'INDUSTRIA TESTE LTDA', codNat: '2062', cnaeFiscal: '9602501',
          endereco: 'RUA DAS FLORES', num: '100', bairro: 'CENTRO', uf: 'DF', codMun: '5300108', cep: '70000000', email: 'industria@teste.com',
        },
        fiscal: { formaTrib: '1', formaTribPer: 'RRRR' },
        signers: [
          { identNom: 'CONTADOR', identCpfCnpj: '11122233396', identQualif: '900', indCrc: 'DF-123456/O-1', email: 'c@d.com', fone: '6133334444' },
          { identNom: 'SOCIO', identCpfCnpj: '98765432100', identQualif: '205', email: 's@d.com', fone: '6133335555' },
        ],
        socios: [{ partnerId: partner.id, qualif: '03', valores: { remTrabCents: 0, lucDivCents: 1000000, jurCapCents: 0, demRendCents: 0, irRetCents: 0 } }],
      });
    expect(res.status).toBe(201);
    const dl = await request(app).get(`/api/accounting/data-exchange/jobs/${res.body.data.id}/download`).query({ unitId: UNIT }).set(authHeader(dono));
    expect(dl.status).toBe(200);
    const texto = Buffer.from(dl.body instanceof Buffer ? dl.body : String(dl.text ?? '')).toString('latin1');
    expect(texto).toContain(`|Y600|01012020||105|PJ|${CNPJ_ALFA}|HOLDING ALFA|03|100|100|||0,00|10000,00|0,00|0,00|0,00|`);
  });
});
