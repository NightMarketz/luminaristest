/**
 * BE-INCR-TAX-ASSESSMENT-C — EMENDA RASTREIO (BRIEF `docs/accounting/BE-INCR-TAX-ASSESSMENT-C-EMENDA-RASTREIO-brief.md`
 * itens 1–3, 6–8) pelo HTTP e pelo banco: a confirmação grava `rastreio` (coluna nova, F-RT-4 b) com as contas do razão e o
 * saldo congelado (F-RT-2 a); o export lê o que foi gravado — lançamento retroativo posterior não muda o arquivo.
 *
 * Números: Presumido 2026, só serviço, CSLL 9%. T01 receita 1.000.000,00 (IRPJ 74.000,00; CSLL 28.800,00 — ver
 * `taxAssessment.integration.test.ts`); T02 receita 100.000,00 (IRPJ 4.800,00; CSLL 2.880,00). Real T01: receita
 * 150.000,00 (3.1) − despesa 50.000,00 (4.1) = LAIR 100.000,00 (IRPJ 19.000,00; CSLL 9.000,00).
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader, seedUnit } from '@test/helpers';
import { RastreioApuracaoSchema } from '@/features/accounting/models/taxAssessmentRastreio';
import { MEMO_COLUMNS } from '@/features/accounting/models/taxAssessmentMemoExport';

const app = makeApp();
const UNIT = 'unit-x7-rastreio';
const BASE = '/api/accounting/tax-assessments';
type Dono = { id: string; username: string; unitId: string };

let seq = 0;
async function novoDono(regime: string, extra: Record<string, unknown> = {}): Promise<Dono> {
  seq += 1;
  const u = await prisma.user.create({ data: { name: `x7rt-${seq}`, username: `x7rt-${seq}`, email: `x7rt-${seq}@test.local`, password: 'x', role: 'USER' } });
  await prisma.companyFiscalProfile.create({
    data: { userId: u.id, anoCalendario: 2026, regime, ecfIndAliqCsll: '1', ecfIndRecReceita: '2', createdById: u.id, updatedById: u.id, ...extra },
  });
  const unitId = `${UNIT}-${seq}`;
  await seedUnit({ userId: u.id, id: unitId });
  return { ...u, unitId };
}

/** Lançamento de 2 pernas: débito em `deb`, crédito em `cred` (contas criadas sob demanda com a natureza dada). */
async function lancar(dono: Dono, data: string, cents: number, deb: [string, string], cred: [string, string], sourceType = 'MANUAL'): Promise<void> {
  const conta = async ([code, nature]: [string, string]) =>
    (await prisma.account.findFirst({ where: { userId: dono.id, unitId: dono.unitId, code } })) ??
    prisma.account.create({ data: { userId: dono.id, unitId: dono.unitId, code, name: `Conta ${code}`, nature, acceptsEntries: true } });
  const d = await conta(deb);
  const c = await conta(cred);
  const e = await prisma.journalEntry.create({
    data: { userId: dono.id, unitId: dono.unitId, date: new Date(`${data}T12:00:00.000Z`), description: 'lançamento', status: 'Posted', sourceType },
  });
  await prisma.posting.create({ data: { userId: dono.id, unitId: dono.unitId, entryId: e.id, accountId: d.id, debitCents: cents, creditCents: 0 } });
  await prisma.posting.create({ data: { userId: dono.id, unitId: dono.unitId, entryId: e.id, accountId: c.id, debitCents: 0, creditCents: cents } });
}
const CAIXA: [string, string] = ['1.1', 'Asset'];
const SERVICO: [string, string] = ['3.1', 'Revenue'];
const DESPESA: [string, string] = ['4.1', 'Expense'];

const confirm = (dono: Dono, periodo: string, irpj: string, csll: string) =>
  request(app).post(BASE).set(authHeader(dono)).send({ unitId: dono.unitId, anoCalendario: 2026, periodo, expectedAPagarCents: { IRPJ: irpj, CSLL: csll } });
const linha = (dono: Dono, periodo: string, tributo = 'IRPJ') =>
  prisma.taxAssessment.findFirstOrThrow({ where: { userId: dono.id, periodo, tributo, status: 'CONFIRMED' } });

async function exportar(dono: Dono, periodStart: string, periodEnd: string): Promise<string[][]> {
  const res = await request(app).post('/api/accounting/data-exchange/exports').set(authHeader(dono))
    .send({ kind: 'EXPORT_TAX_ASSESSMENT_MEMO', format: 'csv', unitId: dono.unitId, periodStart, periodEnd });
  expect(res.status).toBe(201);
  const file = await request(app).get(`/api/accounting/data-exchange/jobs/${res.body.data.id}/download`).query({ unitId: dono.unitId }).set(authHeader(dono));
  expect(file.status).toBe(200);
  const lines = String(file.text).replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.length > 0);
  expect(lines[0]).toContain('rastreio=v1');
  expect(lines[1]).toBe(MEMO_COLUMNS.join(','));
  return lines.slice(2).map(celulas);
}
/** Uma linha de CSV (RFC 4180: célula entre aspas pode ter vírgula; "" é aspa literal). */
function celulas(linha: string): string[] {
  const out: string[] = [];
  let cur = '';
  let aspas = false;
  for (let i = 0; i < linha.length; i += 1) {
    const ch = linha[i];
    if (aspas) {
      if (ch === '"' && linha[i + 1] === '"') { cur += '"'; i += 1; } else if (ch === '"') aspas = false; else cur += ch;
    } else if (ch === '"') aspas = true;
    else if (ch === ',') { out.push(cur); cur = ''; } else cur += ch;
  }
  out.push(cur);
  return out;
}
const col = (nome: (typeof MEMO_COLUMNS)[number]): number => MEMO_COLUMNS.indexOf(nome);

describe('EMENDA RASTREIO — confirmação grava o rastreio; export lê o congelado', () => {
  beforeAll(async () => {
    pushTestSchema();
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('itens 1–3, 7: Presumido T01/T02 — rastreio válido por conta, saldo do exercício, T02 aponta T01; retroativo não muda o arquivo', async () => {
    const dono = await novoDono('PRESUMIDO');
    await lancar(dono, '2026-02-10', 1_000_000_00, CAIXA, SERVICO);
    expect((await confirm(dono, 'T01', '7400000', '2880000')).status).toBe(201);
    await lancar(dono, '2026-05-10', 100_000_00, CAIXA, SERVICO);
    expect((await confirm(dono, 'T02', '480000', '288000')).status).toBe(201);

    const t01 = await linha(dono, 'T01');
    const t02 = await linha(dono, 'T02');
    const r02 = RastreioApuracaoSchema.parse(t02.rastreio);
    const memoria02 = t02.memoria as { codigo: string; valorCents: string }[];
    expect(r02.map((l) => l.codigo)).toEqual([...new Set(memoria02.map((l) => l.codigo))]); // item 1: uma por código
    // Item 2: a receita do T02 vem da conta 3.1, na janela do trimestre; item 3: saldo = exercício até o fim do T02.
    expect(r02.find((l) => l.codigo === 'RECEITA_SERVICO')).toEqual({
      codigo: 'RECEITA_SERVICO', origemTipo: 'RAZAO',
      contas: [{ accountCode: '3.1', accountName: 'Conta 3.1', from: '2026-04-01', to: '2026-06-30', movimentoCents: '10000000', saldoFinalCents: '110000000' }],
    });
    // Item 4: a sobra do T02 aponta a apuração T01 confirmada do mesmo tributo.
    expect(r02.find((l) => l.codigo === 'LC224_SOBRA_ANTERIOR')).toMatchObject({ origemTipo: 'MEMORIA_ANTERIOR', origemApuracaoId: t01.id, origemPeriodo: 'T01' });
    const csll02 = RastreioApuracaoSchema.parse((await linha(dono, 'T02', 'CSLL')).rastreio);
    expect(csll02.find((l) => l.codigo === 'LC224_SOBRA_ANTERIOR')?.origemApuracaoId).toBe((await linha(dono, 'T01', 'CSLL')).id);

    const antes = await exportar(dono, '2026-04-01', '2026-06-30');
    const rastreioLinhas = antes.filter((l) => l[col('tipoLinha')] === 'RASTREIO');
    expect(rastreioLinhas.map((l) => [l[col('tributo')], l[col('codigo')], l[col('accountCode')], l[col('valorCents')], l[col('saldoFinalCents')]])).toEqual([
      ['CSLL', 'RECEITA_SERVICO', '3.1', '10000000', '110000000'],
      ['IRPJ', 'RECEITA_SERVICO', '3.1', '10000000', '110000000'],
    ]);
    // Item 7: a RASTREIO vem logo depois da MEMORIA-mãe.
    const i = antes.findIndex((l) => l[col('tipoLinha')] === 'RASTREIO');
    expect([antes[i - 1][col('tipoLinha')], antes[i - 1][col('codigo')]]).toEqual(['MEMORIA', 'RECEITA_SERVICO']);
    // Item 8: a versão dos parâmetros gravada desde o LEGAL-PARAMS PR-4 sai em toda linha.
    expect(antes.every((l) => l[col('parametrosSha256')] === t02.parametrosSha256 && l[col('parametrosSha256')] !== '')).toBe(true);
    expect(antes[0][col('vencimentoDarf')]).toBe('2026-07-31'); // item 9: T02/2026 ⇒ último dia útil de julho

    // Item 3: lançamento retroativo postado DEPOIS da confirmação, dentro da janela — o arquivo não muda.
    await lancar(dono, '2026-05-20', 7_777_00, CAIXA, SERVICO);
    const depois = await exportar(dono, '2026-04-01', '2026-06-30');
    expect(depois).toEqual(antes);
  });

  it('item 2: Real T01 com 2 contas analíticas no resultado ⇒ 2 entradas no LAIR; a soma = valorCents do LAIR', async () => {
    const dono = await novoDono('REAL', { lucroRealObrigatorio: false });
    await lancar(dono, '2026-02-10', 150_000_00, CAIXA, SERVICO);
    await lancar(dono, '2026-03-10', 50_000_00, DESPESA, CAIXA);
    await prisma.lalurParteBClosing.create({ data: { userId: dono.id, unitId: dono.unitId, year: 2026, quarter: 'T01', balancesSha256: 'x' } });
    expect((await confirm(dono, 'T01', '1900000', '900000')).status).toBe(201);

    const t01 = await linha(dono, 'T01');
    const lair = RastreioApuracaoSchema.parse(t01.rastreio).find((l) => l.codigo === 'LAIR')!;
    expect(lair.contas!.map((c) => [c.accountCode, c.movimentoCents, c.saldoFinalCents])).toEqual([
      ['3.1', '15000000', '15000000'],
      ['4.1', '-5000000', '-5000000'],
    ]);
    const valorLair = (t01.memoria as { codigo: string; valorCents: string }[]).find((l) => l.codigo === 'LAIR')!.valorCents;
    expect(lair.contas!.reduce((s, c) => s + BigInt(c.movimentoCents), 0n)).toBe(BigInt(valorLair));
  });

  it('item 1: apuração anterior à emenda (rastreio nulo) exporta sem erro, sem RASTREIO e com a origem vazia', async () => {
    const dono = await novoDono('PRESUMIDO');
    await prisma.taxAssessment.create({
      data: {
        userId: dono.id, unitId: dono.unitId, anoCalendario: 2026, tributo: 'IRPJ', regime: 'PRESUMIDO', forma: 'TRIMESTRAL', periodo: 'T01',
        modo: 'PRESUMIDO', codigoReceita: '208901', baseCents: 1n, devidoCents: 1n, deducoesCents: 0n, aPagarCents: 1n,
        memoria: [{ codigo: 'RB', descricao: 'Receita bruta', valorCents: '1', fonte: 'razão' }],
        tabelaVersao: 'v-antiga', status: 'CONFIRMED', confirmedById: dono.id, confirmedAt: new Date('2026-04-10T12:00:00.000Z'),
      },
    });
    const linhas = await exportar(dono, '2026-01-01', '2026-03-31');
    expect(linhas.map((l) => l[col('tipoLinha')])).toEqual([...Array(6).fill('RESUMO'), 'MEMORIA']);
    expect(linhas[6].slice(col('origemTipo'))).toEqual(['', '', '', '', '', '', '', '']);
  });
});
