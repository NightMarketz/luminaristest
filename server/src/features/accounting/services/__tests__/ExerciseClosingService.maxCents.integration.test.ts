/**
 * TESTE-GUARDA (Onda 1.1 do plano de correção de 24/11/2026; F-W2B-2 → (b), decisão do dono) —
 * o teto de política `MAX_CENTS` não pode ficar em R$ 21,47 mi.
 *
 * `MAX_CENTS` valia 2_147_483_647 centavos (o teto do antigo `Int` de 32 bits). Desde
 * BE-INCR-MONEY-BIGINT toda coluna `*Cents` é BigInt, e o dono decidiu (questionário de 24/11,
 * F-W2B-2 → b) subir o teto de política para o limite seguro de `Number` (2^53−1), mantendo
 * `Number.isSafeInteger` na borda `centsFromDb`.
 *
 * Caso real que o teto antigo barrava: uma clínica/salão com receita anual de R$ 78 mi
 * (7_800_000_000 centavos) — abaixo do teto do Simples (R$ 4,8 mi não, mas Presumido até R$ 78 mi):
 *   1. o lançamento da receita (uma perna de 7,8 bi centavos) tem de postar;
 *   2. `ExerciseClosingService.closeExercise` tem de encerrar o exercício (saldo de resultado > teto antigo);
 *   3. a ECD do ano encerrado tem de sair com I350/I355 (saldo antes do encerramento) sem erro.
 * Controle: um valor acima do NOVO teto continua barrado (400/ MaxCentsExceededError).
 *
 * App Express REAL (supertest) + SQLite REAL; nada mockado no caminho do razão.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader, seedUnit } from '@test/helpers';
import { ApplicationFactory } from '@/lib/factory';
import { MAX_CENTS } from '@/features/accounting/models/money';
import type { AccountingScope } from '@/features/accounting/models/AccountingScope';

const app = makeApp();
const UNIT = 'unit-closing-max-cents';
const YEAR = 2025;
const VERSION = 'RFB-2025';
const BANCO = '1.1.1.01';
const RECEITA = '3.1';

/** R$ 78.000.000,00 — receita anual de uma PJ no limite do Presumido; > 3,6× o teto antigo (2_147_483_647). */
const RECEITA_ANUAL_CENTS = 7_800_000_000;
/** R$ 30.000.000,00 de despesa no ano (resultado líquido de R$ 48 mi → linha de PL > teto antigo). */
const DESPESA_ANUAL_CENTS = 3_000_000_000;
const DESPESA = '4.1';

const ecdBody = () => ({
  unitId: UNIT,
  mappingVersion: VERSION,
  year: YEAR,
  declarant: {
    nome: 'EMPRESA TETO LTDA', cnpj: '11222333000181', uf: 'SP', codMun: '3550308',
    indSitIniPer: '0', indNire: '0', indFinEsc: '0', indGrandePorte: '0', tipEcd: '0',
    identMf: 'N', indEscCons: 'N', indCentralizada: '0', indMudancPc: '0', codPlanRef: '1',
  },
  book: { numOrd: '1', natLivr: 'DIARIO GERAL', dtExSocial: `${YEAR}-12-31` },
  signers: [
    { identNom: 'SOCIA', identCpfCnpj: '98765432100', codAssin: '205', indRespLegal: 'S' },
    { identNom: 'CONTADOR', identCpfCnpj: '11122233396', codAssin: '900', indCrc: 'SP-123456/O-1', ufCrc: 'SP', email: 'c@d.com', fone: '1133334444', indRespLegal: 'N' },
  ],
});

describe('MAX_CENTS é teto de política (F-W2B-2 → b): exercício de R$ 78 mi fecha e gera I350/I355', () => {
  let dono: { id: string; username: string };
  let scope: AccountingScope;

  beforeAll(async () => {
    pushTestSchema();
    dono = await prisma.user.create({
      data: { name: 'teto', username: 'closing-max-cents', email: 'teto@test.local', password: 'x', role: 'USER' },
    });
    await seedUnit({ userId: dono.id, id: UNIT });
    scope = {
      ownerUserId: dono.id, actorUserId: dono.id, unitId: UNIT,
      ledgerCode: 'DEFAULT', baseCurrencyCode: 'BRL', timeZone: 'America/Sao_Paulo',
    };
    const posting = ApplicationFactory.getInstance().getPostingService();
    await posting.ensureChartOfAccounts(scope);
    const folhas = await prisma.account.findMany({ where: { userId: dono.id, unitId: UNIT, acceptsEntries: true } });
    for (const a of folhas) {
      await prisma.referentialMapping.create({
        data: { userId: dono.id, unitId: UNIT, accountId: a.id, referentialCode: `1.01.${a.code}`, label: a.name, mappingVersion: VERSION },
      });
    }
    for (const month of [3, 12]) {
      await prisma.accountingPeriod.create({
        data: { userId: dono.id, unitId: UNIT, year: YEAR, month, status: 'OPEN', openedAt: new Date() },
      });
    }
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('o novo teto de política é 2^43−1 (≈ R$ 87,96 bi): cobre R$ 78 mi e deixa folga para a soma no relatório', () => {
    expect(MAX_CENTS).toBe(2 ** 43 - 1);
    expect(MAX_CENTS).toBeGreaterThan(RECEITA_ANUAL_CENTS);
    expect(MAX_CENTS * 1024).toBeLessThanOrEqual(Number.MAX_SAFE_INTEGER + 1024);
  });

  it('posta a receita anual (perna única > teto antigo), encerra o exercício e a ECD sai com I350/I355 exatos', async () => {
    const factory = ApplicationFactory.getInstance();
    const posting = factory.getPostingService();

    await posting.postEntry(scope, {
      unitId: UNIT, date: `${YEAR}-03-10`, sourceType: 'manual', description: 'Receita anual de serviços',
      lines: [
        { accountCode: BANCO, debitCents: RECEITA_ANUAL_CENTS, creditCents: 0 },
        { accountCode: RECEITA, debitCents: 0, creditCents: RECEITA_ANUAL_CENTS },
      ],
    });
    await posting.postEntry(scope, {
      unitId: UNIT, date: `${YEAR}-03-20`, sourceType: 'manual', description: 'Despesas operacionais do ano',
      lines: [
        { accountCode: DESPESA, debitCents: DESPESA_ANUAL_CENTS, creditCents: 0 },
        { accountCode: BANCO, debitCents: 0, creditCents: DESPESA_ANUAL_CENTS },
      ],
    });

    const closing = await factory.getExerciseClosingService().closeExercise(scope, YEAR);
    const contas = await prisma.account.findMany({ where: { userId: dono.id, unitId: UNIT } });
    const codeById = new Map(contas.map((a) => [a.id, a.code]));
    const legs = closing.postings.map((p) => ({
      code: codeById.get(p.accountId), d: Number(p.debitCents), c: Number(p.creditCents),
    }));
    // Receita zerada a débito pelo saldo cheio; despesa a crédito; lucro (R$ 48 mi) ao PL.
    expect(legs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: RECEITA, d: RECEITA_ANUAL_CENTS, c: 0 }),
        expect.objectContaining({ code: DESPESA, d: 0, c: DESPESA_ANUAL_CENTS }),
        expect.objectContaining({ code: '2.3.1.01', d: 0, c: RECEITA_ANUAL_CENTS - DESPESA_ANUAL_CENTS }),
      ]),
    );

    const r = await request(app).post('/api/accounting/sped/ecd/generate').set(authHeader(dono)).send(ecdBody());
    expect({ status: r.status, error: r.status === 201 ? undefined : r.body }).toEqual({ status: 201, error: undefined });
    const txt = String(
      (await request(app).get(`/api/accounting/data-exchange/jobs/${r.body.data.id}/download`).query({ unitId: UNIT }).set(authHeader(dono))).text,
    );
    const lines = txt.split(/\r?\n/);
    expect(lines.some((l) => l.startsWith('|I350|'))).toBe(true);
    const i355 = lines.filter((l) => l.startsWith('|I355|'));
    expect(i355.some((l) => l.includes(`|${RECEITA}|`) && l.includes('|78000000,00|'))).toBe(true);
    expect(i355.some((l) => l.includes(`|${DESPESA}|`) && l.includes('|30000000,00|'))).toBe(true);
  });

  it('CONTROLE: uma perna acima do novo teto continua barrada com erro de negócio, não com erro de banco', async () => {
    const posting = ApplicationFactory.getInstance().getPostingService();
    await expect(
      posting.postEntry(scope, {
        unitId: UNIT, date: `${YEAR}-03-25`, sourceType: 'manual', description: 'Acima do teto',
        lines: [
          { accountCode: BANCO, debitCents: MAX_CENTS + 2, creditCents: 0 },
          { accountCode: RECEITA, debitCents: 0, creditCents: MAX_CENTS + 2 },
        ],
      }),
    ).rejects.toThrow(/excede o teto de centavos suportado/);
  });

  it('CONTROLE: dois lançamentos NO teto na mesma conta não envenenam o balancete (folga do _sum; achado de 24/11)', async () => {
    const posting = ApplicationFactory.getInstance().getPostingService();
    for (const day of ['27', '28']) {
      await posting.postEntry(scope, {
        unitId: UNIT, date: `${YEAR}-03-${day}`, sourceType: 'manual', description: `No teto ${day}`,
        lines: [
          { accountCode: BANCO, debitCents: MAX_CENTS, creditCents: 0 },
          { accountCode: RECEITA, debitCents: 0, creditCents: MAX_CENTS },
        ],
      });
    }
    const r = await request(app).get('/api/accounting/trial-balance').set(authHeader(dono)).query({ unitId: UNIT });
    expect({ status: r.status, error: r.status === 200 ? undefined : r.body }).toEqual({ status: 200, error: undefined });
  });

  it('CONTROLE: cada perna no teto, mas a SOMA perde precisão (> 2^53−1) → ValidationError, nunca lançamento calado', async () => {
    const posting = ApplicationFactory.getInstance().getPostingService();
    const pernas = 1100; // 1100 × (2^43−1) > 2^53−1
    const lines = [
      ...Array.from({ length: pernas }, () => ({ accountCode: BANCO, debitCents: MAX_CENTS, creditCents: 0 })),
      ...Array.from({ length: pernas }, () => ({ accountCode: RECEITA, debitCents: 0, creditCents: MAX_CENTS })),
    ];
    await expect(
      posting.validateEntry(scope, { unitId: UNIT, date: `${YEAR}-03-26`, sourceType: 'manual', description: 'Soma acima do limite seguro', lines }),
    ).rejects.toThrow(/soma das partidas excede o limite seguro/i);
  });
});
