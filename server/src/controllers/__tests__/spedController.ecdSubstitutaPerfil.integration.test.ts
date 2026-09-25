/**
 * Cobertura da composição do merge 0de76108 (C8 PR-4 × X13) em `generateSpedEcd`: corpo multipart (campos JSON
 * como string, `year` string) → decodeMultipartJsonFields → expandCompanyProfile → expandSignerContacts → DTO →
 * o .rtf do campo `rtf` chega à geração. Revisado PASS por leitura; este é o teste que faltava.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';
import { anoCorrente } from '@/features/accounting/services/CompanyFiscalProfileService';

const app = makeApp();
const UNIT = 'unit-ecd-subst-perfil';
const ANO = anoCorrente({ timeZone: 'America/Sao_Paulo' } as never) - 1; // dentro do prazo de substituição

describe('ECD substituta multipart × perfil fiscal da empresa (0de76108)', () => {
  let dono: { id: string; username: string };

  beforeAll(async () => {
    pushTestSchema();
    dono = await prisma.user.create({ data: { name: 'subst', username: 'ecd-subst-perfil', email: 'esp@test.local', password: 'x', role: 'USER' } });
    const c = await prisma.accountingContact.create({
      data: { userId: dono.id, unitId: UNIT, name: 'Contabil Subst', email: 'cs@c.com', cpf: '52998224725', phone: '1133334444', crcNumber: 'SP-000999/O-1', crcUf: 'SP' },
    });
    const s = await request(app)
      .post('/api/accounting/company-signers')
      .set(authHeader(dono))
      .send({ unitId: UNIT, nome: 'SOCIA SUBST', cpf: '55566677720', qualifEcd: '205', qualifEcf: '205', email: 's@p.com', fone: '11987654321' });
    const p = await request(app).put(`/api/accounting/company-fiscal-profile/${ANO}`).set(authHeader(dono)).send({
      unitId: UNIT,
      regime: 'PRESUMIDO',
      grandePorte: false,
      condicoes: { aporteInvestidorAnjo: false, livroCaixaSemEscrituracao: false, distribuicaoAcimaBase: false },
      declarante: { nome: 'SALAO PERFIL LTDA', cnpj: '12345678000195', uf: 'SP', codMun: '3550308' },
      ecd: { indNire: '0', numOrd: '42', natLivr: 'DIARIO DO PERFIL' },
      contadorContactId: c.id,
      representanteLegalSignerId: s.body.data.id,
    });
    expect(p.status).toBe(200);
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('multipart com rtf + campos string: perfil aplicado, corpo vence (sobrescritos) e o .rtf vira J801', async () => {
    const original = await request(app)
      .post('/api/accounting/sped/ecd/generate')
      .set(authHeader(dono))
      .send({ unitId: UNIT, mappingVersion: 'RFB-2024', year: ANO, book: { dtExSocial: `${ANO}-12-31` } });
    expect(original.status).toBe(201);

    const r = await request(app)
      .post('/api/accounting/sped/ecd/generate')
      .set(authHeader(dono))
      .field('unitId', UNIT)
      .field('mappingVersion', 'RFB-2024')
      .field('year', String(ANO))
      .field('supersedesJobId', original.body.data.id)
      .field('declarant', JSON.stringify({ nome: 'CORPO VENCE LTDA', indFinEsc: '1', codHashSub: 'a'.repeat(40) }))
      .field('book', JSON.stringify({ dtExSocial: `${ANO}-12-31` }))
      .field(
        'verificationTerm',
        JSON.stringify({
          codMotSubs: '001',
          signers: [{ identNom: 'Contabil Subst', identCpfCnpj: '52998224725', codAssin: '910', indCrc: 'SP-000999/O-1', email: 'cs@c.com', fone: '1133334444', ufCrc: 'SP' }],
        }),
      )
      .attach('rtf', Buffer.from('{\\rtf1\\ansi Termo de verificacao}'), { filename: 'termo.rtf', contentType: 'application/rtf' });

    expect(r.status).toBe(201);
    expect(r.body.perfilFiscal.aplicado).toBe(true);
    expect(r.body.perfilFiscal.sobrescritos).toContain('declarant.nome');

    const txt = String(
      (await request(app).get(`/api/accounting/data-exchange/jobs/${r.body.data.id}/download`).query({ unitId: UNIT }).set(authHeader(dono))).text,
    );
    expect(txt).toContain('|J801|');
    expect(txt).toContain('CORPO VENCE LTDA');
    expect(txt).not.toContain('SALAO PERFIL LTDA');
    expect(txt).toContain('12345678000195'); // CNPJ veio do perfil (não estava no corpo)
  });
});
