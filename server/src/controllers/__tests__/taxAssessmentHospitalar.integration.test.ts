/**
 * EFICIENCIA-FISCAL PR-5 (BRIEF item 26; I-14, I-15; D-2026-10-28-EFICIENCIA-FISCAL-PR5-EXECUCAO lacuna 1) — a prévia do X7 lê a
 * subrazão por serviço (`ReceitaFiscalLinha.serviceRef`) e aplica 8 %/12 % à parte hospitalar, pelo HTTP.
 *
 * Números (Presumido, T01/2026, CSLL 9 %, receita < limite da LC 224): 3.1 = R$ 100.000,00, dos quais R$ 40.000,00 do serviço
 * elegível e R$ 60.000,00 da consulta.
 *  - IRPJ: 60.000 × 32 % + 40.000 × 8 % = 22.400,00; 15 % = 3.360,00 (sem adicional: 22.400 < 60.000).
 *  - CSLL: 60.000 × 32 % + 40.000 × 12 % = 24.000,00; 9 % = 2.160,00.
 *  - Alvará vencido em 31/01 (antes da receita de 10/02): tudo a 32 % ⇒ IRPJ 32.000 × 15 % = 4.800,00 e aviso.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader, seedUnit } from '@test/helpers';

const app = makeApp();
const BASE = '/api/accounting/tax-assessments';
type Dono = { id: string; username: string; unitId: string };

let seq = 0;
async function novoDono(extra: Record<string, unknown>): Promise<Dono> {
  seq += 1;
  const u = await prisma.user.create({ data: { name: `ef5h-${seq}`, username: `ef5h-${seq}`, email: `ef5h-${seq}@test.local`, password: 'x', role: 'USER' } });
  await prisma.companyFiscalProfile.create({
    data: { userId: u.id, anoCalendario: 2026, regime: 'PRESUMIDO', ecfIndAliqCsll: '1', ecfIndRecReceita: '2', createdById: u.id, updatedById: u.id, ...extra },
  });
  const unitId = `unit-ef5h-${seq}`;
  await seedUnit({ userId: u.id, id: unitId });
  return { ...u, unitId };
}

async function cenario(dono: Dono): Promise<void> {
  const conta = async (c: string, nature: string) => prisma.account.create({ data: { userId: dono.id, unitId: dono.unitId, code: c, name: c, nature, acceptsEntries: true } });
  const caixa = await conta('1.1', 'Asset');
  const receita = await conta('3.1', 'Revenue');
  const e = await prisma.journalEntry.create({ data: { userId: dono.id, unitId: dono.unitId, date: new Date('2026-02-10T12:00:00.000Z'), description: 'venda', status: 'Posted' } });
  await prisma.posting.create({ data: { userId: dono.id, unitId: dono.unitId, entryId: e.id, accountId: caixa.id, debitCents: 100_000_00, creditCents: 0 } });
  await prisma.posting.create({ data: { userId: dono.id, unitId: dono.unitId, entryId: e.id, accountId: receita.id, debitCents: 0, creditCents: 100_000_00 } });
  const perfil = (serviceRef: string, elegivelHospitalar: boolean) =>
    prisma.serviceFiscalProfile.create({
      data: { userId: dono.id, unitId: dono.unitId, serviceRef, cTribNac: '040101', finalidade: 'TERAPEUTICA', elegivelHospitalar, fundamentoHospitalar: elegivelHospitalar ? 'Atribuição 4' : null },
    });
  await perfil('svc-proc', true);
  await perfil('svc-consulta', false);
  const linha = (itemRef: string, serviceRef: string, receitaCents: bigint) =>
    prisma.receitaFiscalLinha.create({
      data: { userId: dono.id, unitId: dono.unitId, competencia: '2026-02', dia: '2026-02-10', saleId: 'sale-1', itemRef, natureza: 'SERVICO', cTribNac: '040101', serviceRef, receitaCents, excluir: [] },
    });
  await linha('i-1', 'svc-proc', 40_000_00n);
  await linha('i-2', 'svc-consulta', 60_000_00n);
}

const preview = (dono: Dono) => request(app).post(`${BASE}/preview`).set(authHeader(dono)).send({ unitId: dono.unitId, anoCalendario: 2026, periodo: 'T01' });

describe('EFICIENCIA-FISCAL PR-5 item 26 — 8 %/12 % hospitalar por serviço na prévia do X7', () => {
  beforeAll(() => pushTestSchema(), 120000);
  afterAll(() => prisma.$disconnect());

  it('I-15: consulta a 32 % e procedimento elegível a 8 %/12 % no mesmo trimestre', async () => {
    const dono = await novoDono({ sociedadeEmpresaria: true, alvaraSanitarioValidoAte: '2026-12-31' });
    await cenario(dono);
    const p = await preview(dono);
    expect(p.status).toBe(200);
    expect(p.body.data.irpj).toMatchObject({ baseCents: '2240000', devidoCents: '336000' });
    expect(p.body.data.csll).toMatchObject({ baseCents: '2400000', devidoCents: '216000' });
    expect(JSON.stringify(p.body.data.irpj.memoria)).toContain('PRESUNCAO_HOSPITALAR');
    expect(p.body.data.avisos.join(' ')).not.toContain('HOSPITALAR_REQUISITO_AUSENTE');
  });

  it('I-14: alvará vencido antes do fato ⇒ 32 % e aviso HOSPITALAR_REQUISITO_AUSENTE com o requisito', async () => {
    const dono = await novoDono({ sociedadeEmpresaria: true, alvaraSanitarioValidoAte: '2026-01-31' });
    await cenario(dono);
    const p = await preview(dono);
    expect(p.status).toBe(200);
    expect(p.body.data.irpj).toMatchObject({ baseCents: '3200000', devidoCents: '480000' });
    expect(p.body.data.avisos.join(' ')).toContain('HOSPITALAR_REQUISITO_AUSENTE');
    expect(p.body.data.avisos.join(' ')).toContain('ALVARA_VIGENTE');
  });

  it('16 % declarado com receita hospitalar ⇒ 400 HOSPITALAR_INCOMPATIVEL_COM_16', async () => {
    const dono = await novoDono({ sociedadeEmpresaria: true, alvaraSanitarioValidoAte: '2026-12-31', prestadoraExclusivaServicos: true, declaraNaoProfissaoRegulamentada: true });
    await cenario(dono);
    const p = await preview(dono);
    expect(p.status).toBe(400);
    expect(JSON.stringify(p.body)).toContain('HOSPITALAR_INCOMPATIVEL_COM_16');
  });
});
