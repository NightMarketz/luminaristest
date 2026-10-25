/**
 * PRESUMIDO-TETO-78MI (BRIEF `docs/accounting/BE-INCR-PRESUMIDO-TETO-78MI-brief.md` itens 4–10; forks F-PT-1..7
 * ratificados em 22/10/2026) — teto de R$ 78 mi do Lucro Presumido ponta a ponta: a soma da receita total de Y−1 no
 * razão (repositório real), o campo declarado no perfil, os avisos nas obrigações e na prévia e o 400 na confirmação.
 *
 * Números: Y = 2026, Y−1 = 2025. Teto anual R$ 78.000.000,00 = 7.800.000.000 centavos; mensal R$ 6.500.000,00.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader, seedUnit } from '@test/helpers';
import { PostingRepository } from '@/features/accounting/repositories/PostingRepository';
import { TaxAssessmentRepository } from '@/features/accounting/repositories/TaxAssessmentRepository';
import { PAYLOAD_ALLOWLIST } from '@/features/accounting/audit/auditCanonical';
import { LEDGER_STATUSES } from '@/features/accounting/models/ledgerStatus';
import { CLOSING_SOURCE_TYPE } from '@/features/accounting/models/closing';
import { getFactory } from '@/lib/factory';
import type { AccountingScope } from '@/features/accounting/scope/AccountingScope';

const app = makeApp();
const PERFIL = '/api/accounting/company-fiscal-profile';
const APUR = '/api/accounting/tax-assessments';
const TETO = 7_800_000_000; // centavos
type Dono = { id: string; username: string; unitId: string };

let seq = 0;
async function novoDono(regime: string, extra: Record<string, unknown> = {}, ano = 2026): Promise<Dono> {
  seq += 1;
  const u = await prisma.user.create({ data: { name: `pt-${seq}`, username: `pt-${seq}`, email: `pt-${seq}@test.local`, password: 'x', role: 'USER' } });
  await prisma.companyFiscalProfile.create({
    data: { userId: u.id, anoCalendario: ano, regime, ecfIndAliqCsll: '1', ecfIndRecReceita: '2', createdById: u.id, updatedById: u.id, ...extra },
  });
  const unitId = `unit-pt-${seq}`;
  await seedUnit({ userId: u.id, id: unitId });
  return { ...u, unitId };
}

async function conta(dono: Dono, unitId: string, code: string, nature: string, acceptsEntries = true) {
  return (
    (await prisma.account.findFirst({ where: { userId: dono.id, unitId, code } })) ??
    prisma.account.create({ data: { userId: dono.id, unitId, code, name: code, nature, acceptsEntries } })
  );
}

/** Lançamento de 2 pernas: `cents > 0` credita a receita (débito no caixa); `< 0` debita a receita. */
async function lancar(dono: Dono, unitId: string, data: string, cents: number, code = '3.1', sourceType = 'manual'): Promise<void> {
  const caixa = await conta(dono, unitId, '1.1', 'Asset');
  const receita = await conta(dono, unitId, code, 'Revenue');
  const e = await prisma.journalEntry.create({ data: { userId: dono.id, unitId, date: new Date(`${data}T12:00:00.000Z`), description: 'mov', status: 'Posted', sourceType } });
  const v = Math.abs(cents);
  await prisma.posting.create({ data: { userId: dono.id, unitId, entryId: e.id, accountId: caixa.id, debitCents: cents > 0 ? v : 0, creditCents: cents > 0 ? 0 : v } });
  await prisma.posting.create({ data: { userId: dono.id, unitId, entryId: e.id, accountId: receita.id, debitCents: cents > 0 ? 0 : v, creditCents: cents > 0 ? v : 0 } });
}

const obrigacoes = (dono: Dono, ano = 2026) => request(app).get(`${PERFIL}/${ano}/obligations`).set(authHeader(dono)).query({ unitId: dono.unitId });
const put = (dono: Dono, ano: number, body: Record<string, unknown>) => request(app).put(`${PERFIL}/${ano}`).set(authHeader(dono)).send({ unitId: dono.unitId, ...body });
const preview = (dono: Dono) => request(app).post(`${APUR}/preview`).set(authHeader(dono)).send({ unitId: dono.unitId, anoCalendario: 2026, periodo: 'T01' });
const confirm = (dono: Dono, irpj: string, csll: string) =>
  request(app).post(APUR).set(authHeader(dono)).send({ unitId: dono.unitId, anoCalendario: 2026, periodo: 'T01', expectedAPagarCents: { IRPJ: irpj, CSLL: csll } });
const linhas = (dono: Dono) => prisma.taxAssessment.findMany({ where: { userId: dono.id } });
const de2025 = { from: new Date(Date.UTC(2025, 0, 1)), to: new Date(Date.UTC(2025, 11, 31, 23, 59, 59, 999)) };

describe('PRESUMIDO-TETO-78MI — teto do Lucro Presumido (Lei 9.718/1998 arts. 13–14)', () => {
  beforeAll(async () => {
    pushTestSchema();
  }, 120000);

  afterEach(() => jest.restoreAllMocks());

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('item 4 / invariantes 5, 6, 9: soma por dono — 2 unidades, financeira e devolução entram; encerramento, dedução de PIS/COFINS, 2026 e sintética não', async () => {
    const dono = await novoDono('PRESUMIDO');
    const repo = new PostingRepository();
    expect(await repo.sumRevenueNetByOwner(dono.id, LEDGER_STATUSES, de2025.from, de2025.to, [])).toBeNull(); // sem posting ⇒ null

    await lancar(dono, dono.unitId, '2025-03-10', 2_000_000_000); // 3.1 serviço, unidade 1
    await lancar(dono, 'unit-pt-filial', '2025-06-10', 2_000_000_000); // 3.1, unidade 2 do mesmo dono (invariante 6)
    await lancar(dono, dono.unitId, '2025-07-10', 50_000, '3.5.1'); // receita financeira entra (F-PT-3 a)
    await lancar(dono, dono.unitId, '2025-08-10', -20_000, '3.2'); // devolução reduz
    await lancar(dono, dono.unitId, '2025-12-31', -4_000_030_000, '3.1', CLOSING_SOURCE_TYPE); // encerramento NÃO entra (invariante 5)
    await lancar(dono, dono.unitId, '2025-09-10', -1_000, '3.9'); // conta de dedução de PIS/COFINS — sai (invariante 5)
    await lancar(dono, dono.unitId, '2026-01-10', 9_999_999, '3.1'); // fora de Y−1
    const sintetica = await conta(dono, dono.unitId, '3.5', 'Revenue', false);
    const e = await prisma.journalEntry.create({ data: { userId: dono.id, unitId: dono.unitId, date: new Date('2025-05-05T12:00:00Z'), description: 'x', status: 'Posted' } });
    await prisma.posting.create({ data: { userId: dono.id, unitId: dono.unitId, entryId: e.id, accountId: sintetica.id, debitCents: 0, creditCents: 777 } });
    const deducao = await conta(dono, dono.unitId, '3.9', 'Revenue');

    const soma = await repo.sumRevenueNetByOwner(dono.id, LEDGER_STATUSES, de2025.from, de2025.to, [deducao.id]);
    expect(soma).toBe(4_000_000_000n + 50_000n - 20_000n); // > 2³¹ centavos, sem estouro (invariante 9)
  });

  it('item 9a / invariante 1: PRESUMIDO com receita de 2025 = teto ⇒ sem aviso; +1 centavo ⇒ aviso de EXCEDIDO com artigo; MEI/SIMPLES nunca leem o teto (invariante 8)', async () => {
    const igual = await novoDono('PRESUMIDO');
    await lancar(igual, igual.unitId, '2025-04-10', TETO);
    const a = await obrigacoes(igual);
    expect(a.status).toBe(200);
    expect(a.body.data.avisos.filter((x: string) => !x.startsWith('meses de atividade'))).toEqual([]);

    const acima = await novoDono('PRESUMIDO');
    await lancar(acima, acima.unitId, '2025-04-10', TETO + 1);
    const b = await obrigacoes(acima);
    expect(b.body.data.avisos.join(' ')).toContain('acima do teto do Lucro Presumido');
    expect(b.body.data.avisos.join(' ')).toContain('Lei 9.718/1998 art. 13 caput e art. 14 I');

    const spy = jest.spyOn(PostingRepository.prototype, 'sumRevenueNetByOwner');
    for (const regime of ['SIMPLES', 'MEI']) {
      const d = await novoDono(regime);
      await lancar(d, d.unitId, '2025-04-10', TETO + 1);
      expect((await obrigacoes(d)).body.data.avisos).toEqual([]);
    }
    expect(spy).not.toHaveBeenCalled();
  });

  it('item 3 (F-PT-4 a): início em 2025-07 ⇒ 6 meses, teto R$ 39 mi — R$ 39.000.000,01 é EXCEDIDO; início em 2026 ⇒ NAO_SE_APLICA, sem aviso (invariante 2)', async () => {
    const meio = await novoDono('PRESUMIDO', { inicioAtividadeEm: '2025-07-15' });
    await lancar(meio, meio.unitId, '2025-08-10', 3_900_000_001);
    const r = await obrigacoes(meio);
    expect(r.body.data.avisos.join(' ')).toContain('6 meses de atividade');
    expect(r.body.data.avisos.join(' ')).toContain('R$ 39.000.000,00');

    const novo = await novoDono('PRESUMIDO', { inicioAtividadeEm: '2026-02-01' });
    expect((await obrigacoes(novo)).body.data.avisos).toEqual([]);
  });

  it('itens 6 e 7 / invariante 3: sem receita ⇒ NAO_CONFERIDO; razão × declarada ⇒ a maior, com aviso; 2025 no caixa ⇒ só a declarada', async () => {
    const nada = await novoDono('PRESUMIDO');
    expect((await obrigacoes(nada)).body.data.avisos.join(' ')).toContain('teto do Lucro Presumido não conferido');

    const diverge = await novoDono('PRESUMIDO', { receitaTotalAnoAnteriorCents: BigInt(TETO + 1) });
    await lancar(diverge, diverge.unitId, '2025-04-10', 1_000_00);
    const d = (await obrigacoes(diverge)).body.data.avisos.join(' ');
    expect(d).toContain('difere da declarada');
    expect(d).toContain('acima do teto'); // a declarada (maior) venceu

    const caixa = await novoDono('PRESUMIDO');
    await prisma.companyFiscalProfile.create({
      data: { userId: caixa.id, anoCalendario: 2025, regime: 'PRESUMIDO', ecfIndAliqCsll: '1', ecfIndRecReceita: '1', createdById: caixa.id, updatedById: caixa.id },
    });
    await lancar(caixa, caixa.unitId, '2025-04-10', TETO + 1); // o razão (competência) não é a medida
    const c = (await obrigacoes(caixa)).body.data.avisos.join(' ');
    expect(c).toContain('regime de caixa');
    expect(c).not.toContain('acima do teto');
  });

  it('item 10 (F-PT-5 a): REAL com lucroRealObrigatorio = false e receita EXCEDIDO ⇒ aviso do 0220; true com receita dentro ⇒ nada', async () => {
    const optante = await novoDono('REAL', { lucroRealObrigatorio: false });
    await lancar(optante, optante.unitId, '2025-04-10', TETO + 1);
    expect((await obrigacoes(optante)).body.data.avisos.join(' ')).toContain('0220');

    const obrigada = await novoDono('REAL', { lucroRealObrigatorio: true });
    await lancar(obrigada, obrigada.unitId, '2025-04-10', 1_000_00);
    expect((await obrigacoes(obrigada)).body.data.avisos).toEqual([]);
  });

  it('item 5 / invariantes 7 e 9: PUT aceita R$ 78.000.000,01 no PRESUMIDO e audita; SIMPLES com o campo ⇒ 400; cópia de perfil zera o campo', async () => {
    const dono = await novoDono('PRESUMIDO', {}, 2024);
    const ok = await put(dono, 2025, { regime: 'PRESUMIDO', receitaTotalAnoAnteriorCents: TETO + 1 });
    expect(ok.status).toBe(200);
    expect(ok.body.data.receitaTotalAnoAnteriorCents).toBe(String(TETO + 1));
    const ev = (await prisma.auditEvent.findMany({ where: { scopeUserId: dono.id, eventType: 'company_fiscal_profile.updated' }, orderBy: { seq: 'asc' } })).map((e) => JSON.parse(e.payload));
    expect(ev.at(-1)).toMatchObject({ receitaTotalAnoAnteriorCents: String(TETO + 1) });
    expect(Object.keys(ev.at(-1)!).every((k) => PAYLOAD_ALLOWLIST['company_fiscal_profile.updated'].includes(k))).toBe(true);

    const simples = await put(dono, 2025, { regime: 'SIMPLES', receitaTotalAnoAnteriorCents: 1 });
    expect(simples.status).toBe(400);
    expect(JSON.stringify(simples.body)).toContain('receitaTotalAnoAnteriorCents');

    const copia = await request(app).post(`${PERFIL}/2026/copiar-de/2025`).set(authHeader(dono)).send({ unitId: dono.unitId });
    expect(copia.status).toBe(201);
    expect((await prisma.companyFiscalProfile.findFirstOrThrow({ where: { userId: dono.id, anoCalendario: 2026 } })).receitaTotalAnoAnteriorCents).toBeNull();
  });

  it('item 9b/9c / invariante 4: prévia avisa e devolve números; confirmação com EXCEDIDO ⇒ 400 nomeado, nada gravado; NAO_CONFERIDO confirma', async () => {
    const dono = await novoDono('PRESUMIDO', { receitaTotalAnoAnteriorCents: BigInt(TETO + 1) });
    await lancar(dono, dono.unitId, '2026-02-10', 100_000_00);
    const p = await preview(dono);
    expect(p.status).toBe(200);
    expect(p.body.data.avisos.join(' ')).toContain('acima do teto do Lucro Presumido');
    const c = await confirm(dono, p.body.data.irpj.aPagarCents, p.body.data.csll.aPagarCents);
    expect(c.status).toBe(400);
    expect(JSON.stringify(c.body)).toContain('PRESUMIDO_TETO_EXCEDIDO');
    expect(JSON.stringify(c.body)).toContain('Lei 9.718/1998 art. 14 I');
    expect(await linhas(dono)).toHaveLength(0);
    expect((await prisma.companyFiscalProfile.findFirstOrThrow({ where: { userId: dono.id, anoCalendario: 2026 } })).formaApuracaoTravadaEm).toBeNull();

    const semDado = await novoDono('PRESUMIDO');
    await lancar(semDado, semDado.unitId, '2026-02-10', 100_000_00);
    const p2 = await preview(semDado);
    expect(p2.body.data.avisos.join(' ')).toContain('não conferido');
    expect((await confirm(semDado, p2.body.data.irpj.aPagarCents, p2.body.data.csll.aPagarCents)).status).toBe(201);
  });

  it('item 9d: declarar a receita entre o cálculo e a tx da confirmação ⇒ 409 do gate "perfil igual ao lido", não confirmação com dado velho', async () => {
    const dono = await novoDono('PRESUMIDO', { receitaTotalAnoAnteriorCents: 1_000_00n });
    await lancar(dono, dono.unitId, '2026-02-10', 100_000_00);
    const p = await preview(dono);
    const original = TaxAssessmentRepository.prototype.runTransaction;
    jest.spyOn(TaxAssessmentRepository.prototype, 'runTransaction').mockImplementationOnce(async function (this: TaxAssessmentRepository, fn) {
      await prisma.companyFiscalProfile.updateMany({ where: { userId: dono.id, anoCalendario: 2026 }, data: { receitaTotalAnoAnteriorCents: BigInt(TETO + 1) } });
      return original.call(this, fn);
    } as typeof original);
    const c = await confirm(dono, p.body.data.irpj.aPagarCents, p.body.data.csll.aPagarCents);
    expect(c.status).toBe(409);
    expect(JSON.stringify(c.body)).toContain('TAX_ASSESSMENT_STALE');
    expect(await linhas(dono)).toHaveLength(0);
  });

  it('item 9c: a confirmação do job (`confirmarPeloSistema`) também recusa EXCEDIDO com o 400 nomeado', async () => {
    const dono = await novoDono('PRESUMIDO', { receitaTotalAnoAnteriorCents: BigInt(TETO + 1) });
    await lancar(dono, dono.unitId, '2026-02-10', 100_000_00);
    const svc = getFactory().getTaxAssessmentService();
    const scope: AccountingScope = { ownerUserId: dono.id, actorUserId: 'PLATFORM', unitId: dono.unitId, ledgerCode: 'DEFAULT', baseCurrencyCode: 'BRL', timeZone: 'America/Sao_Paulo' };
    const input = { unitId: dono.unitId, anoCalendario: 2026, periodo: 'T01', deducoes: [], expectedAPagarCents: { IRPJ: '0', CSLL: '0' } };
    await expect(svc.confirmarPeloSistema(scope, input as never, null)).rejects.toMatchObject({ errorCode: 'PRESUMIDO_TETO_EXCEDIDO' });
    expect(await linhas(dono)).toHaveLength(0);
  });
});
