/**
 * EFICIENCIA-FISCAL PR-5 (BRIEF itens 27, 30, 31, 32; lacuna 4 do dono, 28/10) — POST /tax-optimization/servicos/avaliar pelo HTTP.
 *
 * Item 27 (Presumido, 2025 — sem LC 224, CSLL 9 %): 3.1 = R$ 100.000,00 no T01, todo do serviço TERAPEUTICA não equiparado.
 *  - hoje: IRPJ 32.000 × 15 % = 4.800,00; CSLL 32.000 × 9 % = 2.880,00 ⇒ 7.680,00
 *  - a 8 %/12 %: IRPJ 8.000 × 15 % = 1.200,00; CSLL 12.000 × 9 % = 1.080,00 ⇒ 2.280,00
 *  - economia estimada = 5.400,00 (540000 centavos).
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader, seedUnit } from '@test/helpers';
import { canonicalizeAuditPayload } from '@/features/accounting/audit/auditCanonical';

const app = makeApp();
const URL = '/api/accounting/tax-optimization/servicos/avaliar';
type Dono = { id: string; username: string; unitId: string };

let seq = 0;
async function novoDono(ano: number, extra: Record<string, unknown>): Promise<Dono> {
  seq += 1;
  const u = await prisma.user.create({ data: { name: `ef5a-${seq}`, username: `ef5a-${seq}`, email: `ef5a-${seq}@test.local`, password: 'x', role: 'USER' } });
  await prisma.companyFiscalProfile.create({ data: { userId: u.id, anoCalendario: ano, ecfIndAliqCsll: '1', ecfIndRecReceita: '2', createdById: u.id, updatedById: u.id, regime: 'PRESUMIDO', ...extra } });
  const unitId = `unit-ef5a-${seq}`;
  await seedUnit({ userId: u.id, id: unitId });
  return { ...u, unitId };
}

async function receita(dono: Dono, dia: string, serviceRef: string, cents: number): Promise<void> {
  const conta = async (c: string, nature: string) =>
    (await prisma.account.findFirst({ where: { userId: dono.id, unitId: dono.unitId, code: c } })) ??
    prisma.account.create({ data: { userId: dono.id, unitId: dono.unitId, code: c, name: c, nature, acceptsEntries: true } });
  const caixa = await conta('1.1', 'Asset');
  const r = await conta('3.1', 'Revenue');
  const e = await prisma.journalEntry.create({ data: { userId: dono.id, unitId: dono.unitId, date: new Date(`${dia}T12:00:00.000Z`), description: 'venda', status: 'Posted' } });
  await prisma.posting.create({ data: { userId: dono.id, unitId: dono.unitId, entryId: e.id, accountId: caixa.id, debitCents: cents, creditCents: 0 } });
  await prisma.posting.create({ data: { userId: dono.id, unitId: dono.unitId, entryId: e.id, accountId: r.id, debitCents: 0, creditCents: cents } });
  await prisma.receitaFiscalLinha.create({
    data: { userId: dono.id, unitId: dono.unitId, competencia: dia.slice(0, 7), dia, saleId: `sale-${e.id}`, itemRef: 'i-1', natureza: 'SERVICO', serviceRef, receitaCents: BigInt(cents), excluir: [] },
  });
}

const perfilServico = (dono: Dono, serviceRef: string, data: Record<string, unknown>) =>
  prisma.serviceFiscalProfile.create({ data: { userId: dono.id, unitId: dono.unitId, serviceRef, cTribNac: '040101', ...data } });
const avaliar = (dono: Dono, ano: number) => request(app).post(`${URL}?unitId=${dono.unitId}&ano=${ano}`).set(authHeader(dono)).send();

describe('EFICIENCIA-FISCAL PR-5 — avaliação dos serviços (itens 27, 30, 31, 32)', () => {
  beforeAll(() => pushTestSchema(), 120000);
  afterAll(() => prisma.$disconnect());

  it('item 27: TERAPEUTICA a 32 % no Presumido ⇒ PRESUNCAO_HOSPITALAR com a economia pelo X7 e o checklist do que falta; idempotente; auditada sem PII', async () => {
    const dono = await novoDono(2025, {});
    await perfilServico(dono, 'svc-proc', { finalidade: 'TERAPEUTICA' });
    await receita(dono, '2025-02-10', 'svc-proc', 100_000_00);

    const r1 = await avaliar(dono, 2025);
    expect(r1.status).toBe(200);
    const s = r1.body.data.sugestoes.find((x: { practice: string }) => x.practice === 'PRESUNCAO_HOSPITALAR');
    expect(s).toMatchObject({ serviceRef: 'svc-proc', estimatedSavingCents: '540000' });
    expect(s.faltando).toEqual(expect.arrayContaining(['ELEGIVEL_HOSPITALAR', 'SOCIEDADE_EMPRESARIA', 'ALVARA_VIGENTE']));

    const r2 = await avaliar(dono, 2025);
    expect(r2.body.data.sugestoes.find((x: { practice: string }) => x.practice === 'PRESUNCAO_HOSPITALAR').suggestionId).toBe(s.suggestionId);
    const linhas = await prisma.taxOptimizationSuggestion.findMany({ where: { userId: dono.id, practice: 'PRESUNCAO_HOSPITALAR' } });
    expect(linhas).toHaveLength(1);
    expect(linhas[0]).toMatchObject({ status: 'PROPOSED', proposedBy: 'SYSTEM', subjectType: 'SERVICO', subjectId: 'svc-proc' });

    const ev = await prisma.auditEvent.findMany({ where: { scopeUserId: dono.id, eventType: 'tax.suggestion.proposed' } });
    expect(ev).toHaveLength(1);
    expect(() => canonicalizeAuditPayload('tax.suggestion.proposed', JSON.parse(ev[0].payload))).not.toThrow();
  });

  it('itens 30 e 32: 16 % com esteticista ⇒ WARN; estético com NBS de saúde ⇒ NBS_SAUDE_2027 (CBS 2027 DRAFT ⇒ economia 0 + aviso)', async () => {
    const dono = await novoDono(2026, { prestadoraExclusivaServicos: true, declaraNaoProfissaoRegulamentada: true });
    await perfilServico(dono, 'svc-botox', { finalidade: 'ESTETICA', cNBS: '123012200' });
    await receita(dono, '2026-02-10', 'svc-botox', 10_000_00);
    const r = await avaliar(dono, 2026);
    expect(r.status).toBe(200);
    expect(r.body.data.alertas).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'PROFISSAO_REGULAMENTADA_TIRA_16', severity: 'WARN', serviceRefs: ['svc-botox'] }),
        expect.objectContaining({ code: 'MEDICO_COM_SERVICO_ESTETICO', serviceRefs: ['svc-botox'] }),
      ]),
    );
    expect(r.body.data.sugestoes).toEqual([expect.objectContaining({ practice: 'NBS_SAUDE_2027', serviceRef: 'svc-botox', estimatedSavingCents: '0' })]);
    expect(r.body.data.avisos.join(' ')).toContain('LC 214 art. 349 I');
  });

  it('item 31: pacote VENDA no Simples ⇒ INFO; sem perfil do ano ⇒ 400', async () => {
    const dono = await novoDono(2026, { regime: 'SIMPLES', ecfIndAliqCsll: null, ecfIndRecReceita: null });
    await prisma.fiscalProfile.create({ data: { userId: dono.id, unitId: dono.unitId, regimeTributario: 'SIMPLES', icmsContribuinte: false, pisCofinsRegime: 'CUMULATIVO', pacoteFatoGerador: 'VENDA' } });
    const r = await avaliar(dono, 2026);
    expect(r.status).toBe(200);
    expect(r.body.data.alertas).toEqual([expect.objectContaining({ code: 'PACOTE_FATO_GERADOR_FORA_DO_PADRAO', severity: 'INFO' })]);
    expect((await avaliar(dono, 2027)).status).toBe(400);
  });
});
