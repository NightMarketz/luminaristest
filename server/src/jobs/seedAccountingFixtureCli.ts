/**
 * seedAccountingFixtureCli — SEED-MY (`docs/accounting/SEED-MULTI-EXERCICIO-brief.md`): seed
 * multi-exercício do `dev.db` (alvo dos runbooks H1/H2). Popula DOIS tenants-fixture por regime
 * (F-SEED-3 → b; layout decidido pelo dono 24/09: `seed-presumido` e `seed-real`, ambos salão) com
 * lançamentos mensais, AP/AR, exercício 2025 ENCERRADO + `HARD_CLOSED` e o ano corrente OPEN até o
 * mês de hoje — tudo pelos SERVIÇOS (`postEntry`, `PeriodService`, `PayableService`,
 * `ReceivableService`, `ExerciseClosingService`, `FiscalProfileService`), nunca `prisma.*` escrevendo
 * no razão, para que débito=crédito, gate de período, numeração e auditoria sejam os da operação real.
 *
 * atomicUntil: cada `postEntry`/`createPayable`/`registerPayment`/… é um commit PRÓPRIO — o seed NÃO
 * é atômico (Contrato §2.3). Reconcile = rodar de novo: a idempotência (item 2 do BRIEF) é por
 * `sourceType='seed'`+`sourceId` nos lançamentos, por `documentNumber` no AP/AR e por "exercício já
 * encerrado + dezembro HARD_CLOSED" no ano fechado. Uma queda no meio deixa o mês parcial; a 2ª
 * execução completa o que falta sem duplicar o que já existe.
 *
 * Decisões do dono aplicadas (24/09, via questionário — lacunas da spec registradas no relatório):
 *   - tenants = usuários `seed-presumido`/`seed-real`; `--tenant clinic` fica para o H3.
 *   - regime materializado num `FiscalProfile` por unidade (PRESUMIDO/CUMULATIVO · REAL/NAO_CUMULATIVO).
 *   - encerramento de 2025 pelo `ExerciseClosingService.closeExercise` canônico (BE-INCR-SPED-APURACAO
 *     D1–D7: I355 / IND_LCTO='E'), ANTES do hard close.
 *   - pacote pré-pago: venda D 1.1.1 / C 2.1.1; consumo no mês seguinte D 2.1.1 / C 3.1.
 *   - valores de R$ 100 a R$ 5.000 por lançamento, determinísticos por `--seed`.
 *
 * NÃO ativa binding (ADR-INCR-BINDING-FEEDER §7 proíbe seed direto) — imprime o comando a rodar.
 * NÃO é chamado por boot/Dockerfile.
 *
 * Run:
 *   SEED_ACCOUNTING_PASSWORD=... npm run db:seed:accounting -- --years 2025,2026 --i-have-a-backup
 */
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { ApplicationFactory } from '../lib/factory';
import prisma from '../lib/prisma';
import { MAX_CENTS } from '../features/accounting/models/money';
import { scopeToday } from '../features/accounting/models/dates';
import { CLOSING_SOURCE_TYPE, closingSourceId } from '../features/accounting/models/closing';
import type { AccountingScope } from '../features/accounting/scope/AccountingScope';
import type { PostEntryInput } from '../features/accounting/dtos/PostingDto';
import { UpsertFiscalProfileSchema } from '../features/accounting/dtos/FiscalProfileDto';

export const SEED_SOURCE_TYPE = 'seed';

// ─── Contrato de entrada (argv) ───────────────────────────────────────────────

export const SeedAccountingArgsSchema = z
  .object({
    years: z.array(z.number().int().gte(2015).lte(2100)).min(1),
    tenant: z.literal('salon'),
    seed: z.number().int().min(0),
    unitId: z.string().min(1),
    iHaveABackup: z.literal(true, {
      message:
        '--i-have-a-backup é obrigatório (F-SEED-2 → a): rode `npm run db:backup` (e o ensaio B-4) ANTES — o seed escreve no razão.',
    }),
  })
  .strict();
export type SeedAccountingArgs = z.infer<typeof SeedAccountingArgsSchema>;

// ─── Contrato de saída (relatório impresso) ──────────────────────────────────

export const SeedTenantReportSchema = z
  .object({
    username: z.string(),
    regime: z.enum(['PRESUMIDO', 'REAL']),
    userId: z.string(),
    unitId: z.string(),
    entriesCreated: z.number().int().min(0),
    entriesExisting: z.number().int().min(0),
    payablesCreated: z.number().int().min(0),
    receivablesCreated: z.number().int().min(0),
    closedYears: z.array(z.number().int()),
    tieOut: z.array(
      z.object({
        asOf: z.string(),
        debitCents: z.number().int(),
        creditCents: z.number().int(),
        trialBalanceBalanced: z.boolean(),
        balanceSheetBalanced: z.boolean(),
      }),
    ),
  })
  .strict();
export type SeedTenantReport = z.infer<typeof SeedTenantReportSchema>;

export const SEED_TENANTS = [
  { username: 'seed-presumido', regime: 'PRESUMIDO', pisCofinsRegime: 'CUMULATIVO' },
  { username: 'seed-real', regime: 'REAL', pisCofinsRegime: 'NAO_CUMULATIVO' },
] as const;
type SeedTenant = (typeof SEED_TENANTS)[number];

// ─── Parse / recusas ─────────────────────────────────────────────────────────

function readFlag(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(name);
  return i === -1 ? undefined : argv[i + 1];
}

export function parseArgs(argv: string[]): SeedAccountingArgs {
  const tenant = readFlag(argv, '--tenant') ?? 'salon';
  if (tenant === 'clinic') {
    throw new Error("--tenant clinic ainda não é suportado (decisão 24/09: fica para o H3 — use o CLI de binding da clínica).");
  }
  const parsed = SeedAccountingArgsSchema.safeParse({
    years: (readFlag(argv, '--years') ?? '2025,2026').split(',').map((y) => Number(y.trim())),
    tenant,
    seed: Number(readFlag(argv, '--seed') ?? '1'),
    unitId: readFlag(argv, '--unit-id') ?? 'seed-unit',
    iHaveABackup: argv.includes('--i-have-a-backup'),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => `${i.path.join('.') || 'args'}: ${i.message}`).join('; '));
  }
  return { ...parsed.data, years: [...new Set(parsed.data.years)].sort((a, b) => a - b) };
}

/** Recusa de ambiente (item 1 do BRIEF): nunca em produção, nunca fora de SQLite `file:`. */
export function assertSafeEnvironment(env: NodeJS.ProcessEnv): void {
  if (env.NODE_ENV === 'production') {
    throw new Error('recusado: NODE_ENV=production — o seed é só para dev/staging.');
  }
  if (!env.DATABASE_URL || !env.DATABASE_URL.startsWith('file:')) {
    throw new Error('recusado: DATABASE_URL não é `file:` (SQLite local) — o seed não roda contra outro banco.');
  }
}

// ─── Plano mensal determinístico (puro) ──────────────────────────────────────

/** mulberry32 — PRNG determinístico de 32 bits (valores reprodutíveis por `--seed`). */
function prng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MIN_CENTS = 10_000; // R$ 100
const MAX_SEED_CENTS = 500_000; // R$ 5.000 — bem abaixo de MAX_CENTS

export interface MonthPlan {
  entries: Omit<PostEntryInput, 'unitId'>[];
  payables: { documentNumber: string; description: string; issueDate: string; dueDate: string; amountCents: number; paidCents: number; paidAt: string }[];
  receivables: { documentNumber: string; description: string; issueDate: string; dueDate: string; amountCents: number; receivedCents: number; receivedAt: string }[];
}

/**
 * Plano de um mês. `lastDay` limita as datas (mês corrente: hoje) — nenhum lançamento no futuro.
 * `consumePriorPackageCents` = valor do pacote vendido no mês anterior (reconhecido agora).
 */
export function buildMonthPlan(
  seed: number,
  tenantIndex: number,
  year: number,
  month: number,
  lastDay: number,
  consumePriorPackageCents: number,
): MonthPlan & { packageSoldCents: number } {
  const rnd = prng(seed * 1_000_003 + tenantIndex * 100_003 + year * 13 + month);
  const amount = (): number => MIN_CENTS + Math.floor(rnd() * (MAX_SEED_CENTS - MIN_CENTS));
  const mm = String(month).padStart(2, '0');
  const day = (d: number): string => `${year}-${mm}-${String(Math.min(d, lastDay)).padStart(2, '0')}`;
  const src = (k: string): string => `${year}-${mm}-${k}`;
  const leg = (accountCode: string, debitCents: number, creditCents: number) => ({ accountCode, debitCents, creditCents });

  const cmv = amount();
  const purchase = cmv + amount(); // estoque nunca fica negativo: compra ≥ CMV no mesmo mês
  const resale = cmv + amount(); // revenda com margem
  const service1 = amount();
  const service2 = amount();
  const expense = amount();
  const packageSold = amount();

  const entries: MonthPlan['entries'] = [
    { date: day(2), description: `Seed: compra de mercadorias ${mm}/${year}`, sourceType: SEED_SOURCE_TYPE, sourceId: src('estoque'), lines: [leg('1.1.6', purchase, 0), leg('1.1.1', 0, purchase)] },
    { date: day(5), description: `Seed: receita de serviços (caixa) ${mm}/${year}`, sourceType: SEED_SOURCE_TYPE, sourceId: src('servico-caixa'), lines: [leg('1.1.3', service1, 0), leg('3.1', 0, service1)] },
    { date: day(8), description: `Seed: receita de serviços (banco) ${mm}/${year}`, sourceType: SEED_SOURCE_TYPE, sourceId: src('servico-banco'), lines: [leg('1.1.1', service2, 0), leg('3.1', 0, service2)] },
    { date: day(12), description: `Seed: revenda de mercadorias ${mm}/${year}`, sourceType: SEED_SOURCE_TYPE, sourceId: src('revenda'), lines: [leg('1.1.4', resale, 0), leg('3.3', 0, resale)] },
    { date: day(12), description: `Seed: CMV ${mm}/${year}`, sourceType: SEED_SOURCE_TYPE, sourceId: src('cmv'), lines: [leg('4.2', cmv, 0), leg('1.1.6', 0, cmv)] },
    { date: day(15), description: `Seed: venda de pacote pré-pago ${mm}/${year}`, sourceType: SEED_SOURCE_TYPE, sourceId: src('pacote-venda'), lines: [leg('1.1.1', packageSold, 0), leg('2.1.1', 0, packageSold)] },
    { date: day(20), description: `Seed: despesas operacionais ${mm}/${year}`, sourceType: SEED_SOURCE_TYPE, sourceId: src('despesa'), lines: [leg('4.1', expense, 0), leg('1.1.1', 0, expense)] },
  ];
  if (consumePriorPackageCents > 0) {
    entries.push({ date: day(3), description: `Seed: consumo do pacote do mês anterior ${mm}/${year}`, sourceType: SEED_SOURCE_TYPE, sourceId: src('pacote-consumo'), lines: [leg('2.1.1', consumePriorPackageCents, 0), leg('3.1', 0, consumePriorPackageCents)] });
  }

  const ap1 = amount();
  const ap2 = amount();
  const ar1 = amount();
  const ar2 = amount();
  return {
    entries,
    // item 6: 2 payables (1 liquidado, 1 parcial) e 2 receivables (1 recebido, 1 aberto)
    payables: [
      { documentNumber: `SEED-AP-${src('1')}`, description: `Seed: fornecedor (liquidado) ${mm}/${year}`, issueDate: day(6), dueDate: day(25), amountCents: ap1, paidCents: ap1, paidAt: day(25) },
      { documentNumber: `SEED-AP-${src('2')}`, description: `Seed: fornecedor (parcial) ${mm}/${year}`, issueDate: day(7), dueDate: day(28), amountCents: ap2, paidCents: Math.floor(ap2 / 2), paidAt: day(26) },
    ],
    receivables: [
      { documentNumber: `SEED-AR-${src('1')}`, description: `Seed: cliente (recebido) ${mm}/${year}`, issueDate: day(9), dueDate: day(24), amountCents: ar1, receivedCents: ar1, receivedAt: day(24) },
      { documentNumber: `SEED-AR-${src('2')}`, description: `Seed: cliente (aberto) ${mm}/${year}`, issueDate: day(10), dueDate: day(28), amountCents: ar2, receivedCents: 0, receivedAt: day(28) },
    ],
    packageSoldCents: packageSold,
  };
}

// guarda de sanidade estática: o teto do seed cabe na política de centavos
if (MAX_SEED_CENTS * 3 > MAX_CENTS) throw new Error('MAX_SEED_CENTS incompatível com MAX_CENTS');

// ─── Orquestração ────────────────────────────────────────────────────────────

type Services = ApplicationFactory['services'];

async function ensureUser(t: SeedTenant, password: string | undefined): Promise<string> {
  const existing = await prisma.user.findUnique({ where: { username: t.username } });
  if (existing) return existing.id; // nunca reescreve senha (mesmo invariante do prisma/seed.ts)
  const hash = await bcrypt.hash(password ?? randomBytes(24).toString('hex'), 10);
  const created = await prisma.user.create({
    data: { username: t.username, email: `${t.username}@seed.local`, name: `Seed ${t.regime}`, password: hash, locale: 'pt' },
  });
  return created.id;
}

async function accountId(scope: AccountingScope, code: string): Promise<string> {
  const acc = await prisma.account.findFirst({ where: { userId: scope.ownerUserId, unitId: scope.unitId, code } });
  if (!acc) throw new Error(`conta ${code} não encontrada no plano do tenant (o chart deveria ter sido instalado pelo postEntry).`);
  return acc.id;
}

async function isYearDone(scope: AccountingScope, year: number): Promise<boolean> {
  const [closing, dec] = await Promise.all([
    prisma.journalEntry.findFirst({ where: { userId: scope.ownerUserId, unitId: scope.unitId, sourceType: CLOSING_SOURCE_TYPE, sourceId: closingSourceId(year) } }),
    prisma.accountingPeriod.findFirst({ where: { userId: scope.ownerUserId, unitId: scope.unitId, year, month: 12 } }),
  ]);
  return !!closing && dec?.status === 'HARD_CLOSED';
}

export async function seedTenant(
  services: Services,
  args: SeedAccountingArgs,
  tenantIndex: number,
  t: SeedTenant,
  password: string | undefined,
  today: string,
): Promise<SeedTenantReport> {
  const userId = await ensureUser(t, password);
  const scope: AccountingScope = {
    ownerUserId: userId,
    actorUserId: userId,
    unitId: args.unitId,
    ledgerCode: 'DEFAULT',
    baseCurrencyCode: 'BRL',
    timeZone: 'America/Sao_Paulo',
  };
  const report: SeedTenantReport = {
    username: t.username, regime: t.regime, userId, unitId: args.unitId,
    entriesCreated: 0, entriesExisting: 0, payablesCreated: 0, receivablesCreated: 0, closedYears: [], tieOut: [],
  };

  const [ty, tm, td] = today.split('-').map(Number);
  // Consumo de janeiro do 1º ano pedido: pacote de dezembro do ano anterior, se ele foi semeado
  // (rodar só `--years 2026` depois de 2025 não pode perder o reconhecimento — review 24/09).
  const firstYear = args.years[0];
  const priorDecSold = await prisma.journalEntry.count({ where: { userId, unitId: args.unitId, sourceType: SEED_SOURCE_TYPE, sourceId: `${firstYear - 1}-12-pacote-venda` } });
  let priorPackage = priorDecSold > 0 ? buildMonthPlan(args.seed, tenantIndex, firstYear - 1, 12, 31, 0).packageSoldCents : 0;

  for (const year of args.years) {
    if (year > ty) continue; // ano inteiro no futuro: nada a lançar
    const closedYear = year < ty; // item 4: ano anterior ao corrente = exercício fechado
    if (closedYear && (await isYearDone(scope, year))) {
      report.closedYears.push(year);
      // o consumo de janeiro seguinte usa o pacote vendido em dezembro (independe do consumo anterior)
      const dec = buildMonthPlan(args.seed, tenantIndex, year, 12, 31, 0);
      priorPackage = dec.packageSoldCents;
      continue;
    }

    await services.period.seedYear(scope, year);
    const lastMonth = closedYear ? 12 : tm;
    const periods = await services.period.listPeriods(scope, year);
    for (const p of periods) {
      if (p.month <= lastMonth && p.status === 'FUTURE') await services.period.openPeriod(scope, p.id);
    }

    const statusByMonth = new Map(periods.map((p) => [p.month, p.status]));
    for (let month = 1; month <= lastMonth; month++) {
      // Queda no meio do fechamento (review 24/09): mês já SOFT/HARD_CLOSED foi lançado ANTES do
      // fechamento — postEntry checa o período ANTES da idempotência e lançaria. Só avança o carry.
      if (statusByMonth.get(month) === 'SOFT_CLOSED' || statusByMonth.get(month) === 'HARD_CLOSED') {
        priorPackage = buildMonthPlan(args.seed, tenantIndex, year, month, 31, 0).packageSoldCents;
        continue;
      }
      const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
      const lastDay = year === ty && month === tm ? td : daysInMonth;
      const plan = buildMonthPlan(args.seed, tenantIndex, year, month, lastDay, priorPackage);
      priorPackage = plan.packageSoldCents;

      for (const e of plan.entries) {
        const before = await prisma.journalEntry.count({ where: { userId, unitId: args.unitId, sourceType: SEED_SOURCE_TYPE, sourceId: e.sourceId } });
        await services.posting.postEntry(scope, { ...e, unitId: args.unitId });
        if (before === 0) report.entriesCreated++;
        else report.entriesExisting++;
      }

      const expenseId = await accountId(scope, '4.1');
      for (const ap of plan.payables) {
        let payable = await prisma.payable.findFirst({ where: { userId, unitId: args.unitId, documentNumber: ap.documentNumber } });
        if (!payable) {
          payable = await services.payable.createPayable(scope, {
            unitId: args.unitId, supplierName: 'Fornecedor Seed', documentNumber: ap.documentNumber, description: ap.description,
            issueDate: ap.issueDate, dueDate: ap.dueDate, amountCents: ap.amountCents, expenseAccountId: expenseId,
          });
          report.payablesCreated++;
        }
        if ((await prisma.payablePayment.count({ where: { payableId: payable.id } })) === 0) {
          await services.payable.registerPayment(scope, payable.id, { unitId: args.unitId, method: 'Pix', paidAt: ap.paidAt, amountCents: ap.paidCents });
        }
      }

      const revenueId = await accountId(scope, '3.1');
      for (const ar of plan.receivables) {
        let receivable = await prisma.receivable.findFirst({ where: { userId, unitId: args.unitId, documentNumber: ar.documentNumber } });
        if (!receivable) {
          receivable = await services.receivable.createReceivable(scope, {
            unitId: args.unitId, customerName: 'Cliente Seed', documentNumber: ar.documentNumber, description: ar.description,
            issueDate: ar.issueDate, dueDate: ar.dueDate, amountCents: ar.amountCents, revenueAccountId: revenueId,
          });
          report.receivablesCreated++;
        }
        if (ar.receivedCents > 0 && (await prisma.receivableReceipt.count({ where: { receivableId: receivable.id } })) === 0) {
          await services.receivable.registerReceipt(scope, receivable.id, { unitId: args.unitId, method: 'Pix', receivedAt: ar.receivedAt, amountCents: ar.receivedCents });
        }
      }
    }

    if (closedYear) {
      // Encerramento canônico (idempotente por sourceId=ano) ANTES do hard close — dezembro precisa estar OPEN.
      const closed = await prisma.journalEntry.count({ where: { userId, unitId: args.unitId, sourceType: CLOSING_SOURCE_TYPE, sourceId: closingSourceId(year) } });
      if (closed === 0) await services.exerciseClosing.closeExercise(scope, year);
      const fresh = await services.period.listPeriods(scope, year);
      for (const p of fresh.sort((a, b) => a.month - b.month)) {
        if (p.status === 'OPEN') await services.period.softClosePeriod(scope, p.id, 'SEED-MY: exercício fechado');
      }
      for (const p of (await services.period.listPeriods(scope, year)).sort((a, b) => a.month - b.month)) {
        if (p.status === 'SOFT_CLOSED') await services.period.hardClosePeriod(scope, p.id, 'SEED-MY: exercício fechado');
      }
      report.closedYears.push(year);
    }
  }

  // FiscalProfile (decisão 24/09): o regime do tenant fica persistido. Upsert = idempotente.
  await services.fiscalProfile.upsert(
    scope,
    UpsertFiscalProfileSchema.parse({ unitId: args.unitId, regimeTributario: t.regime, icmsContribuinte: false, pisCofinsRegime: t.pisCofinsRegime }),
  );

  // Item 8 — tie-out por ano: balancete fecha E BP fecha (ativo = passivo + PL + resultado).
  for (const year of args.years.filter((y) => y <= ty)) {
    const asOf = year < ty ? `${year}-12-31` : today;
    const asOfDate = new Date(`${asOf}T23:59:59.999Z`);
    const [tb, bs] = await Promise.all([
      services.accountingReport.trialBalance(scope, asOfDate),
      services.accountingReport.balanceSheet(scope, asOfDate),
    ]);
    report.tieOut.push({
      asOf, debitCents: tb.totals.debitCents, creditCents: tb.totals.creditCents,
      trialBalanceBalanced: tb.balanced && tb.totals.debitCents === tb.totals.creditCents, balanceSheetBalanced: bs.balanced,
    });
  }

  return SeedTenantReportSchema.parse(report);
}

export function tieOutPasses(reports: SeedTenantReport[]): boolean {
  return reports.every((r) => r.tieOut.length > 0 && r.tieOut.every((t) => t.trialBalanceBalanced && t.balanceSheetBalanced));
}

/** Fluxo completo. Nunca chama `process.exit` (testável) — devolve o código de saída. */
export async function runCli(argv: string[] = process.argv.slice(2), env: NodeJS.ProcessEnv = process.env): Promise<number> {
  let args: SeedAccountingArgs;
  try {
    assertSafeEnvironment(env);
    args = parseArgs(argv);
  } catch (error) {
    console.error(`erro: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }

  try {
    const services = ApplicationFactory.getInstance().services;
    const today = scopeToday({ timeZone: 'America/Sao_Paulo' });
    const reports: SeedTenantReport[] = [];
    for (const [i, t] of SEED_TENANTS.entries()) {
      reports.push(await seedTenant(services, args, i, t, env.SEED_ACCOUNTING_PASSWORD, today));
    }
    console.log(JSON.stringify(reports, null, 2));
    for (const r of reports) {
      console.log(
        `próximo passo (binding NÃO é semeado — ADR-FEEDER §7/§8): node scripts/activate-salon-binding.mjs --owner-user-id ${r.userId} --unit-id ${r.unitId}`,
      );
    }
    if (!tieOutPasses(reports)) {
      console.error('FALHOU: tie-out não fecha (balancete ou BP desbalanceado) — ver relatório acima.');
      return 1;
    }
    console.log('OK: seed multi-exercício aplicado e tie-out fechado.');
    return 0;
  } catch (error) {
    console.error(`erro: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  runCli().then((code) => {
    process.exitCode = code;
  });
}
