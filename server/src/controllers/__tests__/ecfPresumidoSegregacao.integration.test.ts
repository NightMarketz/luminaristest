/**
 * TESTE-GUARDA (sessão de instrumentação; achado 1 de fora do escopo do #1021, C8) — a ECF Presumido não segrega a receita
 * hospitalar nem a do 16 %.
 *
 * `SpedEcfGenerationService` põe toda a 3.1 (+ 3.4) em P200 8 / P400 4 (32 %). Já a memória da apuração do mesmo trimestre
 * aplica 8 %/12 % à parte hospitalar (`PRESUNCAO_HOSPITALAR`, Lei 9.249/1995 art. 15 § 1º III "a"; art. 20 III) e 16 % ao
 * prestador exclusivo de serviços (`PRESUNCAO_REDUZIDA_16`, Lei 9.250/1995 art. 40). A tabela dinâmica (leiaute 12,
 * 28/05/2026, dossiê `pc1-memoria-calculo` [D02]) tem as linhas próprias: P200 4 (8 %), P200 6 (16 %), P200 8 (32 %);
 * P400 2 (12 %) e P400 4 (32 %, "exceto a de serviços hospitalares"). O PVA calcula a P200 10 / P400 6 a partir das linhas
 * `E` do arquivo; com tudo na 8 / 4, a base do PVA fica maior que a da memória.
 *
 * Comportamento correto esperado: a ECF e a memória do mesmo trimestre dão a mesma base — cada linha da ECF marcada na
 * memória bate com o arquivo (linha `E`) ou com a fórmula da tabela dinâmica aplicada às linhas `E` do arquivo
 * (`confrontarMemoriaComEcf`, o mesmo confronto do teste-guarda da C8).
 *
 * Números (T01/2025, CSLL 9 %, 3.1 = R$ 100.000,00 em 10/02):
 *  - hospitalar: R$ 40.000,00 do procedimento elegível + R$ 60.000,00 da consulta ⇒ IRPJ 22.400,00 (memória) × 32.000,00
 *    (PVA sobre P200 8 = 100.000); CSLL 24.000,00 × 32.000,00.
 *  - 16 %: tudo serviço, prestadora exclusiva, receita do ano ≤ R$ 120 mil ⇒ IRPJ 16.000,00 (memória) × 32.000,00.
 * Controle: o teste-guarda da C8 (`taxAssessmentMemoEcf`, seed sem hospitalar nem 16 %) passa com o mesmo confronto.
 */
import { readFile } from 'node:fs/promises';
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader, seedUnit } from '@test/helpers';
import { ApplicationFactory } from '@/lib/factory';
import { resolveReadPath } from '@/lib/attachmentStorage';
import { parseTable } from '@/lib/spreadsheet';
import type { AccountingScope } from '@/features/accounting/scope/AccountingScope';
import type { SpedEcfRequestDto } from '@/features/accounting/dtos/SpedEcfDto';
import { MEMO_COLUMNS } from '@/features/accounting/models/taxAssessmentMemoExport';
import { confrontarMemoriaComEcf, oraculoEcfPresumidoT01 } from '@test/helpers/ecfPresumidoOraculo';

const app = makeApp();
const ANO = 2025; // a ECF de 2026 ainda não tem leiaute em LEIAUTE_SPED
type Dono = { id: string; username: string; unitId: string };

let seq = 0;
async function novoDono(perfil: Record<string, unknown>): Promise<Dono> {
  seq += 1;
  const u = await prisma.user.create({ data: { name: `ecfseg-${seq}`, username: `ecfseg-${seq}`, email: `ecfseg-${seq}@test.local`, password: 'x', role: 'USER' } });
  await prisma.companyFiscalProfile.create({
    data: {
      userId: u.id, anoCalendario: ANO, regime: 'PRESUMIDO', ecfIndAliqCsll: '1', ecfIndRecReceita: '2', formaApuracaoIrpjCsll: 'TRIMESTRAL',
      createdById: u.id, updatedById: u.id, ...perfil,
    },
  });
  const unitId = `unit-ecfseg-${seq}`;
  await seedUnit({ userId: u.id, id: unitId });
  return { ...u, unitId };
}

/** 3.1 = R$ 100.000,00 em 10/02, com a subrazão por serviço: R$ 40 mil do procedimento elegível e R$ 60 mil da consulta. */
async function receitaDoTrimestre(dono: Dono): Promise<void> {
  const conta = async (c: string, nature: string) => prisma.account.create({ data: { userId: dono.id, unitId: dono.unitId, code: c, name: c, nature, acceptsEntries: true } });
  const caixa = await conta('1.1', 'Asset');
  const receita = await conta('3.1', 'Revenue');
  const e = await prisma.journalEntry.create({ data: { userId: dono.id, unitId: dono.unitId, date: new Date(`${ANO}-02-10T12:00:00.000Z`), description: 'venda', status: 'Posted' } });
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
      data: { userId: dono.id, unitId: dono.unitId, competencia: `${ANO}-02`, dia: `${ANO}-02-10`, saleId: 'sale-1', itemRef, natureza: 'SERVICO', cTribNac: '040101', serviceRef, receitaCents, excluir: [] },
    });
  await linha('i-1', 'svc-proc', 40_000_00n);
  await linha('i-2', 'svc-consulta', 60_000_00n);
}

const scopeOf = (d: Dono): AccountingScope => ({
  ownerUserId: d.id, actorUserId: d.id, unitId: d.unitId, ledgerCode: 'DEFAULT', baseCurrencyCode: 'BRL', timeZone: 'America/Sao_Paulo',
});

const ecfDto = (unitId: string): SpedEcfRequestDto =>
  ({
    unitId,
    year: ANO,
    declarant: {
      cnpj: '11222333000181', nome: 'CLINICA TESTE LTDA', codNat: '2062', cnaeFiscal: '8630503',
      endereco: 'RUA DAS FLORES', num: '100', bairro: 'CENTRO', uf: 'SP', codMun: '3550308',
      cep: '01000000', numTel: '1133334444', email: 'clinica@teste.local',
    },
    fiscal: { indAliqCsll: '1', indRecReceita: '2' },
    signers: [
      { identNom: 'CONTADOR', identCpfCnpj: '11122233396', identQualif: '900', indCrc: 'SP-123456/O-1', email: 'c@d.com', fone: '1133334444' },
      { identNom: 'SOCIO', identCpfCnpj: '98765432100', identQualif: '205', email: 's@d.com', fone: '1133335555' },
    ],
    socios: [] as SpedEcfRequestDto['socios'],
    dirigentes: [{ nome: 'DIRETORA', cpf: '52998224725', qualif: '10', dtAltSoc: '2020-01-01', valores: { remTrabCents: 0, lucDivCents: 0, jurCapCents: 0, demRendCents: 0, irRetCents: 0 } }] as SpedEcfRequestDto['dirigentes'],
  }) as SpedEcfRequestDto;

/** `|P200|8||150000,00|` ⇒ { 'P200:8': 15000000n } — só o bloco P do T01. */
function linhasEDoT01(texto: string): Map<string, bigint> {
  const ini = texto.indexOf(`|P030|0101${ANO}|3103${ANO}|T01|`);
  expect(ini).toBeGreaterThanOrEqual(0);
  const prox = texto.indexOf('|P030|', ini + 1);
  const fim = prox > 0 ? prox : texto.indexOf('|P990|', ini);
  const out = new Map<string, bigint>();
  for (const l of texto.slice(ini, fim).split(/\r?\n/)) {
    const m = /^\|(P200|P400)\|([^|]+)\|[^|]*\|(-?\d+),(\d{2})\|$/.exec(l);
    if (m) out.set(`${m[1]}:${m[2]}`, BigInt(m[3]) * 100n + BigInt(m[4]));
  }
  return out;
}

/** Apura e confirma o T01 pelo HTTP, gera a ECF do ano pelo serviço real e confronta com a memória exportada. */
async function confrontarT01(dono: Dono): Promise<{ divergencias: string[]; e: Map<string, bigint>; codigos: string[] }> {
  const prev = await request(app).post('/api/accounting/tax-assessments/preview').set(authHeader(dono))
    .send({ unitId: dono.unitId, anoCalendario: ANO, periodo: 'T01' });
  expect(prev.status).toBe(200);
  const ok = await request(app).post('/api/accounting/tax-assessments').set(authHeader(dono)).send({
    unitId: dono.unitId, anoCalendario: ANO, periodo: 'T01',
    expectedAPagarCents: { IRPJ: prev.body.data.irpj.aPagarCents, CSLL: prev.body.data.csll.aPagarCents },
  });
  expect(ok.status).toBe(201);

  const job = await ApplicationFactory.getInstance().getSpedEcfGenerationService().generate(scopeOf(dono), ecfDto(dono.unitId));
  const row = await prisma.accountingDataExchangeJob.findUniqueOrThrow({ where: { id: job.id } });
  const e = linhasEDoT01((await readFile(resolveReadPath(row.storageKey!))).toString('latin1'));

  const exp = await request(app).post('/api/accounting/data-exchange/exports').set(authHeader(dono))
    .send({ kind: 'EXPORT_TAX_ASSESSMENT_MEMO', format: 'xlsx', unitId: dono.unitId, periodStart: `${ANO}-01-01`, periodEnd: `${ANO}-03-31` });
  expect(exp.status).toBe(201);
  const memoJob = await prisma.accountingDataExchangeJob.findUniqueOrThrow({ where: { id: exp.body.data.id } });
  const table = await parseTable(await readFile(resolveReadPath(memoJob.storageKey!)), 'xlsx');
  const col = (n: (typeof MEMO_COLUMNS)[number]) => MEMO_COLUMNS.indexOf(n);
  const linhas = table.rows.slice(1).map((r) => ({
    tipo: String(r[col('tipoLinha')]), codigo: String(r[col('codigo')]), reg: String(r[col('registroEcf')] ?? ''),
    linha: String(r[col('linhaEcf')] ?? ''), valor: BigInt(String(r[col('valorCents')])),
  }));
  const { divergencias } = confrontarMemoriaComEcf(
    linhas.filter((x) => x.tipo === 'MEMORIA' && x.reg).map((l) => [`${l.reg}:${l.linha}`, l.valor] as const),
    linhas.filter((x) => x.tipo === 'RESUMO' && x.reg).map((l) => [l.codigo, `${l.reg}:${l.linha}`, l.valor] as const),
    e,
    oraculoEcfPresumidoT01(e, false), // 2025: sem as linhas da LC 224
  );
  return { divergencias, e, codigos: linhas.map((l) => l.codigo) };
}

describe('ECF Presumido × memória — segregação da receita hospitalar e do 16 % (teste-guarda)', () => {
  beforeAll(() => pushTestSchema(), 120_000);
  afterAll(() => prisma.$disconnect());

  it('receita hospitalar: a base da ECF (P200 10 / P400 6 pelo PVA) bate com a da memória', async () => {
    const dono = await novoDono({ sociedadeEmpresaria: true, alvaraSanitarioValidoAte: `${ANO}-12-31` });
    await receitaDoTrimestre(dono);
    const r = await confrontarT01(dono);
    expect(r.codigos).toContain('PRESUNCAO_HOSPITALAR'); // pré-condição: a memória aplicou 8 %/12 %
    expect(r.divergencias).toEqual([]);
  }, 120_000);

  it('prestadora exclusiva (16 %): a base da ECF (P200 10 pelo PVA) bate com a da memória', async () => {
    const dono = await novoDono({ prestadoraExclusivaServicos: true, declaraNaoProfissaoRegulamentada: true });
    await receitaDoTrimestre(dono);
    const r = await confrontarT01(dono);
    expect(r.codigos).toContain('PRESUNCAO_REDUZIDA_16'); // pré-condição: a memória aplicou 16 %
    expect(r.divergencias).toEqual([]);
  }, 120_000);
});
