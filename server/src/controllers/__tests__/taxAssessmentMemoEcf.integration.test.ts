/**
 * Emenda C8 ao BRIEF X7-C (§1 C3 item 5; nota D-2026-11-02-DELEGACAO-DONO §9) — TESTE-GUARDA DECISIVO da
 * correspondência memória de cálculo → linha da ECF (`taxAssessmentEcfLinhas.ts`).
 *
 * Sobre o seed real (`seedTenant`, tenant `seed-presumido`, ano 2025 semeado e encerrado): apura e confirma o T01/2025
 * (IRPJ e CSLL) pelo HTTP, gera a ECF Presumido de 2025 pelo serviço real e exporta a memória do T01. 2025 porque é a ECF
 * do leiaute 12 (entregue em 2026); o ano 2026 ainda não tem leiaute em `LEIAUTE_SPED` e a ECF recusa (correto). Para cada (registro, linha)
 * marcada na memória, a SOMA das linhas `MEMORIA` marcadas com ela (regra do módulo) tem de bater com a ECF:
 *  - linha `E` (a que o arquivo traz: P200 4/8, P400 2/4) ⇒ o valor do arquivo;
 *  - linha `CNA`/`CA` (o PVA calcula) ⇒ a fórmula da tabela dinâmica (leiaute 12, 28/05/2026, dossiê [D02]) aplicada às
 *    linhas `E` do MESMO arquivo — transcrita em `test/helpers/ecfPresumidoOraculo.ts`, com o texto da fórmula ao lado.
 * As linhas `RESUMO` marcadas batem uma a uma. Linha marcada sem oráculo aqui ⇒ vermelho (marca nova exige fórmula).
 * E o inverso: toda linha `E` de P200/P400 do T01 no arquivo tem passo na memória que a explica.
 *
 * Real: o seed não tem apuração do Real (nem Parte B fechada do e-Lalur), e a ECF do Real só traz as linhas `E` do
 * e-Lalur que o usuário digitou — nada a comparar aqui; a parte Real da tabela fica com grau inferido.
 */
import { readFile } from 'node:fs/promises';
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, authHeader } from '@test/helpers';
import { pushTestSchema, resetDb } from '@test/helpers/db';
import { ApplicationFactory } from '@/lib/factory';
import { resolveReadPath } from '@/lib/attachmentStorage';
import { parseTable } from '@/lib/spreadsheet';
import type { AccountingScope } from '@/features/accounting/scope/AccountingScope';
import type { SpedEcfRequestDto } from '@/features/accounting/dtos/SpedEcfDto';
import { SEED_TENANTS, seedTenant } from '@/jobs/seedAccountingFixtureCli';
import { MEMO_COLUMNS } from '@/features/accounting/models/taxAssessmentMemoExport';
import { confrontarMemoriaComEcf, oraculoEcfPresumidoT01 } from '@test/helpers/ecfPresumidoOraculo';

const app = makeApp();
const TODAY = '2026-04-10';
const ANO = 2025;

type Dono = { id: string; username: string; unitId: string };
let dono: Dono;

const scopeOf = (d: Dono): AccountingScope => ({
  ownerUserId: d.id, actorUserId: d.id, unitId: d.unitId, ledgerCode: 'DEFAULT', baseCurrencyCode: 'BRL', timeZone: 'America/Sao_Paulo',
});

const ecfDto = (unitId: string): SpedEcfRequestDto =>
  ({
    unitId,
    year: ANO,
    declarant: {
      cnpj: '11222333000181', nome: 'SALAO SEED LTDA', codNat: '2062', cnaeFiscal: '9602501',
      endereco: 'RUA DAS FLORES', num: '100', bairro: 'CENTRO', uf: 'SP', codMun: '3550308',
      cep: '01000000', numTel: '1133334444', email: 'salao@seed.local',
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

describe('C8 — memória de cálculo × ECF Presumido no seed (teste-guarda decisivo)', () => {
  beforeAll(async () => {
    pushTestSchema();
    await resetDb();
    const rep = await seedTenant(
      ApplicationFactory.getInstance().services,
      { years: [ANO], tenant: 'salon', seed: 1, unitId: 'c8-unit', iHaveABackup: true },
      0, SEED_TENANTS[0], 'senha-de-teste', TODAY,
    );
    dono = { id: rep.userId, username: rep.username, unitId: rep.unitId };
    // Perfil fiscal da empresa de 2025 (o provisionamento cria só o do ano corrente): Presumido, CSLL 9%, competência, trimestral.
    await prisma.companyFiscalProfile.create({
      data: {
        userId: dono.id, anoCalendario: ANO, regime: 'PRESUMIDO', ecfIndAliqCsll: '1', ecfIndRecReceita: '2',
        formaApuracaoIrpjCsll: 'TRIMESTRAL', createdById: dono.id, updatedById: dono.id,
      },
    });
  }, 300_000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('cada linha da ECF marcada na memória do T01/2025 bate com a ECF (arquivo ou fórmula da tabela dinâmica)', async () => {
    // 1) apuração do T01 pelo HTTP (prévia → confirmação com o a pagar da prévia)
    const prev = await request(app).post('/api/accounting/tax-assessments/preview').set(authHeader(dono))
      .send({ unitId: dono.unitId, anoCalendario: ANO, periodo: 'T01' });
    expect(prev.status).toBe(200);
    const ok = await request(app).post('/api/accounting/tax-assessments').set(authHeader(dono)).send({
      unitId: dono.unitId, anoCalendario: ANO, periodo: 'T01',
      expectedAPagarCents: { IRPJ: prev.body.data.irpj.aPagarCents, CSLL: prev.body.data.csll.aPagarCents },
    });
    expect(ok.status).toBe(201);

    // 2) ECF Presumido do ano pelo serviço real; linhas E do T01
    const job = await ApplicationFactory.getInstance().getSpedEcfGenerationService().generate(scopeOf(dono), ecfDto(dono.unitId));
    const row = await prisma.accountingDataExchangeJob.findUniqueOrThrow({ where: { id: job.id } });
    const e = linhasEDoT01((await readFile(resolveReadPath(row.storageKey!))).toString('latin1'));
    expect(e.get('P200:8') ?? 0n).toBeGreaterThan(0n); // o seed tem receita de serviço no T01
    const oraculo = oraculoEcfPresumidoT01(e, false); // 2025: sem as linhas da LC 224

    // 3) memória do T01 pelo HTTP (xlsx: a linha-meta tem ';')
    const exp = await request(app).post('/api/accounting/data-exchange/exports').set(authHeader(dono))
      .send({ kind: 'EXPORT_TAX_ASSESSMENT_MEMO', format: 'xlsx', unitId: dono.unitId, periodStart: `${ANO}-01-01`, periodEnd: `${ANO}-03-31` });
    expect(exp.status).toBe(201);
    const memoJob = await prisma.accountingDataExchangeJob.findUniqueOrThrow({ where: { id: exp.body.data.id } });
    const table = await parseTable(await readFile(resolveReadPath(memoJob.storageKey!)), 'xlsx');
    expect(table.rows[0]).toEqual([...MEMO_COLUMNS]);
    const col = (n: (typeof MEMO_COLUMNS)[number]) => MEMO_COLUMNS.indexOf(n);
    const linhas = table.rows.slice(1).map((r) => ({
      tipo: String(r[col('tipoLinha')]), codigo: String(r[col('codigo')]), reg: String(r[col('registroEcf')] ?? ''),
      linha: String(r[col('linhaEcf')] ?? ''), valor: BigInt(String(r[col('valorCents')])),
    }));

    const { soma: somaMemoria, divergencias } = confrontarMemoriaComEcf(
      linhas.filter((x) => x.tipo === 'MEMORIA' && x.reg).map((l) => [`${l.reg}:${l.linha}`, l.valor] as const),
      linhas.filter((x) => x.tipo === 'RESUMO' && x.reg).map((l) => [l.codigo, `${l.reg}:${l.linha}`, l.valor] as const),
      e,
      oraculo,
    );
    expect(divergencias).toEqual([]);

    // A guarda cobre o que o contador confere: receitas, presunção, base, imposto e a pagar dos dois tributos.
    expect([...somaMemoria.keys()]).toEqual(
      expect.arrayContaining(['P200:8', 'P200:10', 'P200:26', 'P300:3', 'P300:4', 'P300:15', 'P400:4', 'P400:6', 'P400:21', 'P500:2', 'P500:4', 'P500:13']),
    );
    // e a vigência: em 2025 a LC 224 não tem linha na tabela (P200 desde 01/01/2026, P400 desde 01/04/2026)
    expect([...somaMemoria.keys()].some((k) => /^P200:25\d{3}$|^P400:20\d{3}$|^P300:14\.10$|^P500:12\.10$/.test(k))).toBe(false);
  }, 120_000);
});
