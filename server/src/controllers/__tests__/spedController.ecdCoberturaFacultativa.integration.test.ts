/**
 * TESTE-GUARDA (C2 do HANDOFF-2026-11-02-delegacao-dono; D-2026-11-02-DELEGACAO-DONO §4) — gate de
 * cobertura referencial só onde a lei exige o código.
 *
 * O Manual de Orientação da ECD (leiaute de maio/2026), item 1.17, diz que o mapeamento para os planos
 * de contas referenciais é facultativo ([D09] de `pesquisas-legais/gates-humanos-lei`). Mesmo assim
 * `SpedGenerationService.generate` recusa a ECD com 400 `unmappedAccounts` quando uma conta analítica
 * não tem código referencial na versão.
 *
 * Comportamento correto esperado: na ECD a conta sem código sai sem I051, a geração dá 201 e a resposta
 * traz o aviso com `unmappedAccounts`; a conta mapeada continua com I051. Na ECF a mesma conta continua
 * barrando pelo gate da própria ECF (exaustividade da receita, `unmappedRevenueAccounts`) — a ECF nunca
 * teve gate de cobertura referencial no código; o controle prova que ela não foi afrouxada junto.
 *
 * App Express REAL (supertest) + SQLite REAL; o lançamento entra pelo PostingService real.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader, seedUnit } from '@test/helpers';
import { ApplicationFactory } from '@/lib/factory';
import type { AccountingScope } from '@/features/accounting/scope/AccountingScope';

const app = makeApp();
const UNIT = 'unit-ecd-cobertura-facultativa';
const YEAR = 2025;
const VERSION = 'RFB-2025';
const BANCO = '1.1.1.01'; // folha do plano padrão (ensureChartOfAccounts)

const ecdBody = () => ({
  unitId: UNIT,
  mappingVersion: VERSION,
  year: YEAR,
  declarant: {
    nome: 'SALAO COBERTURA LTDA', cnpj: '11222333000181', uf: 'SP', codMun: '3550308',
    indSitIniPer: '0', indNire: '0', indFinEsc: '0', indGrandePorte: '0', tipEcd: '0',
    identMf: 'N', indEscCons: 'N', indCentralizada: '0', indMudancPc: '0',
    // As outras folhas estão mapeadas ⇒ há I051 ⇒ a trava do COD_PLAN_REF (L5) continua valendo.
    codPlanRef: '1',
  },
  book: { numOrd: '1', natLivr: 'DIARIO GERAL', dtExSocial: `${YEAR}-12-31` },
  signers: [
    { identNom: 'SOCIA', identCpfCnpj: '98765432100', codAssin: '205', indRespLegal: 'S' },
    { identNom: 'CONTADOR', identCpfCnpj: '11122233396', codAssin: '900', indCrc: 'SP-123456/O-1', ufCrc: 'SP', email: 'c@d.com', fone: '1133334444', indRespLegal: 'N' },
  ],
});

const ecfBody = () => ({
  unitId: UNIT,
  year: YEAR,
  declarant: {
    cnpj: '11222333000181', nome: 'SALAO COBERTURA LTDA', codNat: '2062', cnaeFiscal: '9602501',
    endereco: 'RUA DAS FLORES', num: '100', bairro: 'CENTRO', uf: 'SP', codMun: '3550308',
    cep: '01000000', email: 'salao@teste.com',
  },
  fiscal: { indAliqCsll: '1', indRecReceita: '2' },
  signers: [
    { identNom: 'CONTADOR', identCpfCnpj: '11122233396', identQualif: '900', indCrc: 'SP-123456/O-1', email: 'c@d.com', fone: '1133334444' },
    { identNom: 'SOCIA', identCpfCnpj: '98765432100', identQualif: '205', email: 's@d.com', fone: '1133335555' },
  ],
  socios: [],
  dirigentes: [{ nome: 'DIRETORA', cpf: '52998224725', qualif: '10', dtAltSoc: '2020-01-01', valores: { remTrabCents: 0, lucDivCents: 0, jurCapCents: 0, demRendCents: 0, irRetCents: 0 } }],
});

describe('ECD sem código referencial numa conta analítica (Manual da ECD 1.17) — teste-guarda C2', () => {
  let dono: { id: string; username: string };

  beforeAll(async () => {
    pushTestSchema();
    dono = await prisma.user.create({
      data: { name: 'cobertura', username: 'ecd-cobertura-facultativa', email: 'ecf@test.local', password: 'x', role: 'USER' },
    });
    await seedUnit({ userId: dono.id, id: UNIT });
    const scope: AccountingScope = {
      ownerUserId: dono.id, actorUserId: dono.id, unitId: UNIT,
      ledgerCode: 'DEFAULT', baseCurrencyCode: 'BRL', timeZone: 'America/Sao_Paulo',
    };
    const posting = ApplicationFactory.getInstance().getPostingService();
    // O plano padrão nasce no 1º acesso (ensureChartOfAccounts) — materializa ANTES de criar a conta do caso.
    await posting.ensureChartOfAccounts(scope);
    // A conta do caso: analítica, com movimento, SEM código referencial na versão.
    await prisma.account.create({
      data: { userId: dono.id, unitId: UNIT, code: '3.9', name: 'Receita sem referencial', nature: 'Revenue', acceptsEntries: true },
    });
    // Toda outra folha do plano ganha código, para que a 3.9 seja a ÚNICA sem mapeamento.
    const outrasFolhas = await prisma.account.findMany({
      where: { userId: dono.id, unitId: UNIT, acceptsEntries: true, code: { not: '3.9' } },
    });
    expect(outrasFolhas.map((a) => a.code)).toContain(BANCO);
    for (const a of outrasFolhas) {
      await prisma.referentialMapping.create({
        data: { userId: dono.id, unitId: UNIT, accountId: a.id, referentialCode: `1.01.${a.code}`, label: a.name, mappingVersion: VERSION },
      });
    }
    await prisma.accountingPeriod.create({
      data: { userId: dono.id, unitId: UNIT, year: YEAR, month: 3, status: 'OPEN', openedAt: new Date() },
    });
    await posting.postEntry(scope, {
      unitId: UNIT,
      date: `${YEAR}-03-10`,
      sourceType: 'manual',
      description: 'Receita lançada numa conta sem referencial',
      lines: [
        { accountCode: BANCO, debitCents: 100_000, creditCents: 0 },
        { accountCode: '3.9', debitCents: 0, creditCents: 100_000 },
      ],
    });
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('ECD: 201 com aviso (unmappedAccounts = [3.9]); a 3.9 sai sem I051 e a folha mapeada mantém o I051', async () => {
    const r = await request(app).post('/api/accounting/sped/ecd/generate').set(authHeader(dono)).send(ecdBody());

    expect({ status: r.status, error: r.status === 201 ? undefined : r.body }).toEqual({ status: 201, error: undefined });
    expect(r.body.coberturaReferencial).toEqual({
      mappingVersion: VERSION,
      unmappedAccounts: [expect.objectContaining({ code: '3.9', name: 'Receita sem referencial' })],
    });
    expect((r.body.avisos as string[]).join(' ')).toMatch(/3\.9.*I051|I051.*3\.9/);

    const txt = String(
      (await request(app).get(`/api/accounting/data-exchange/jobs/${r.body.data.id}/download`).query({ unitId: UNIT }).set(authHeader(dono))).text,
    );
    const lines = txt.split(/\r?\n/);
    const i050 = (code: string) => lines.findIndex((l) => l.startsWith('|I050|') && l.includes(`|${code}|`));
    expect(i050('3.9')).toBeGreaterThanOrEqual(0);
    expect(lines[i050('3.9') + 1].startsWith('|I051|')).toBe(false);
    expect(lines[i050(BANCO) + 1]).toContain('|I051|');
    expect(lines[i050(BANCO) + 1]).toContain(`1.01.${BANCO}`);
  });

  it('CONTROLE ECF: a mesma 3.9 continua 400 pelo gate da ECF (unmappedRevenueAccounts) e não cria job', async () => {
    const antes = await prisma.accountingDataExchangeJob.count({ where: { userId: dono.id, unitId: UNIT, kind: 'EXPORT_SPED_ECF' } });
    const r = await request(app).post('/api/accounting/sped/ecf/generate').set(authHeader(dono)).send(ecfBody());

    expect(r.status).toBe(400);
    expect(JSON.stringify(r.body)).toContain('unmappedRevenueAccounts');
    expect(JSON.stringify(r.body)).toContain('3.9');
    expect(await prisma.accountingDataExchangeJob.count({ where: { userId: dono.id, unitId: UNIT, kind: 'EXPORT_SPED_ECF' } })).toBe(antes);
  });
});
