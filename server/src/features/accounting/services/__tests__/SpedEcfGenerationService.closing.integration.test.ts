/**
 * TESTE-GUARDA (sessão de instrumentação) — GAP-MAP: ECF Presumido lê o lançamento de
 * encerramento como movimento.
 *
 * `ExerciseClosingService.closeExercise` posta em `${year}-12-31` com sourceType 'closing'
 * (`models/closing.ts`), zerando toda conta analítica Revenue/Expense. `SpedEcfGenerationService`
 * lê `groupByAccount(scope, LEDGER_STATUSES, { from, to })` SEM `excludeSourceTypes:
 * [CLOSING_SOURCE_TYPE]` — tanto na janela anual (gate de exaustividade) quanto na do T04.
 * A DRE (`AccountingReportService.incomeStatement`) e o próprio closing já excluem o 'closing'.
 *
 * Comportamento correto esperado: a ECF de um exercício encerrado segrega a mesma receita e
 * dispara o mesmo gate que a ECF do exercício ainda aberto — o encerramento não é receita.
 *
 * Cada caso tem CONTROLE pré-encerramento (mesma unidade, mesmo dado): ele passa, então o
 * vermelho só pode vir do lançamento de encerramento. SQLite real, sem mock de repositório.
 */
import { readFile } from 'node:fs/promises';
import prisma from '@/lib/prisma';
import { pushTestSchema } from '@test/helpers/db';
import { ApplicationFactory } from '@/lib/factory';
import { resolveReadPath } from '@/lib/attachmentStorage';
import type { AccountingScope } from '@/features/accounting/scope/AccountingScope';
import type { SpedEcfRequestDto } from '@/features/accounting/dtos/SpedEcfDto';

const DONO = 'u-ecf-closing';
const YEAR = 2025;
const UNIT_T04 = 'unit-ecf-closing-t04';
const UNIT_GATE = 'unit-ecf-closing-gate';

const scopeOf = (unitId: string): AccountingScope => ({
  ownerUserId: DONO,
  actorUserId: DONO,
  unitId,
  ledgerCode: 'DEFAULT',
  baseCurrencyCode: 'BRL',
  timeZone: 'America/Sao_Paulo',
});

const dtoOf = (unitId: string): SpedEcfRequestDto =>
  ({
    unitId,
    year: YEAR,
    declarant: {
      cnpj: '11222333000181', nome: 'SALAO TESTE LTDA', codNat: '2062', cnaeFiscal: '9602501',
      endereco: 'RUA DAS FLORES', num: '100', bairro: 'CENTRO', uf: 'DF', codMun: '5300108',
      cep: '70000000', numTel: '6133334444', email: 'salao@teste.com',
    },
    fiscal: { indAliqCsll: '1', indRecReceita: '2' },
    signers: [
      { identNom: 'CONTADOR', identCpfCnpj: '11122233396', identQualif: '900', indCrc: 'DF-123456/O-1', email: 'c@d.com', fone: '6133334444' },
      { identNom: 'SOCIO', identCpfCnpj: '98765432100', identQualif: '205', email: 's@d.com', fone: '6133335555' },
    ],
  }) as SpedEcfRequestDto;

async function seedUnit(unitId: string, revenueCodes: string[]) {
  const chart = [
    { code: '1.1.1', name: 'Banco', nature: 'Asset' },
    { code: '2.3.1', name: 'Lucros ou Prejuízos Acumulados', nature: 'Equity' },
    ...revenueCodes.map((code) => ({ code, name: `Receita ${code}`, nature: 'Revenue' })),
  ];
  for (const acc of chart) {
    await prisma.account.create({ data: { userId: DONO, unitId, ...acc, acceptsEntries: true } });
  }
  for (const month of [10, 12]) {
    await prisma.accountingPeriod.create({
      data: { userId: DONO, unitId, year: YEAR, month, status: 'OPEN', openedAt: new Date() },
    });
  }
}

/** Gera a ECF e devolve o texto do arquivo persistido. */
async function generateEcfText(unitId: string): Promise<string> {
  const job = await ApplicationFactory.getInstance().getSpedEcfGenerationService().generate(scopeOf(unitId), dtoOf(unitId));
  const row = await prisma.accountingDataExchangeJob.findUniqueOrThrow({ where: { id: job.id } });
  return (await readFile(resolveReadPath(row.storageKey!))).toString('latin1');
}

/** Bloco P do T04: do P030 de T04 até o fim do bloco P. */
const t04Block = (text: string) => {
  const start = text.indexOf(`|P030|01102025|31122025|T04|`);
  expect(start).toBeGreaterThanOrEqual(0);
  return text.slice(start, text.indexOf('|P990|', start));
};

describe('ECF Presumido × encerramento do exercício (ExerciseClosingService) — teste-guarda', () => {
  beforeAll(async () => {
    pushTestSchema();
    await prisma.user.create({
      data: { id: DONO, name: DONO, username: DONO, email: `${DONO}@test.local`, password: 'x', role: 'USER' },
    });
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('T04: receita de serviço de outubro continua em P200(8)/P400(4) depois do encerramento', async () => {
    await seedUnit(UNIT_T04, ['3.1']);
    const factory = ApplicationFactory.getInstance();
    await factory.getPostingService().postEntry(scopeOf(UNIT_T04), {
      unitId: UNIT_T04,
      date: `${YEAR}-10-15`,
      sourceType: 'manual',
      description: 'Serviço prestado em outubro',
      lines: [
        { accountCode: '1.1.1', debitCents: 1_000_000, creditCents: 0 },
        { accountCode: '3.1', debitCents: 0, creditCents: 1_000_000 },
      ],
    });

    // CONTROLE: exercício aberto → T04 carrega R$ 10.000,00 de serviço.
    const before = t04Block(await generateEcfText(UNIT_T04));
    expect(before).toContain('|P200|8||10000,00|');
    expect(before).toContain('|P400|4||10000,00|');

    await factory.getExerciseClosingService().closeExercise(scopeOf(UNIT_T04), YEAR);

    // LACUNA: o crédito de 3.1 zerado pelo 'closing' de 31/12 entra na janela do T04.
    const after = t04Block(await generateEcfText(UNIT_T04));
    expect(after).toContain('|P200|8||10000,00|');
    expect(after).toContain('|P400|4||10000,00|');
  });

  it('gate de exaustividade: conta Revenue fora de 3.1/3.3 com movimento no ano bloqueia a ECF depois do encerramento', async () => {
    await seedUnit(UNIT_GATE, ['3.1', '3.9']);
    const factory = ApplicationFactory.getInstance();
    await factory.getPostingService().postEntry(scopeOf(UNIT_GATE), {
      unitId: UNIT_GATE,
      date: `${YEAR}-10-15`,
      sourceType: 'manual',
      description: 'Serviço + receita financeira',
      lines: [
        { accountCode: '1.1.1', debitCents: 1_050_000, creditCents: 0 },
        { accountCode: '3.1', debitCents: 0, creditCents: 1_000_000 },
        { accountCode: '3.9', debitCents: 0, creditCents: 50_000 },
      ],
    });
    const service = factory.getSpedEcfGenerationService();
    const expected = { details: { unmappedRevenueAccounts: [{ code: '3.9', name: 'Receita 3.9' }] } };

    // CONTROLE: exercício aberto → gate dispara nomeando 3.9.
    await expect(service.generate(scopeOf(UNIT_GATE), dtoOf(UNIT_GATE))).rejects.toMatchObject(expected);

    await factory.getExerciseClosingService().closeExercise(scopeOf(UNIT_GATE), YEAR);

    // LACUNA: saldo anual líquido de 3.9 vira 0 com o 'closing' → gate não dispara e a ECF sai.
    await expect(service.generate(scopeOf(UNIT_GATE), dtoOf(UNIT_GATE))).rejects.toMatchObject(expected);
  });
});
