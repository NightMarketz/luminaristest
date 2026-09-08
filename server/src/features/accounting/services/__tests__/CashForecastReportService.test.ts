/**
 * CashForecastReportService — fluxo de caixa PROJETADO (FE-INCR-CASH-FORECAST), read-only,
 * FIRST-CLASS PRISMA.
 *
 * What is mocked: PAYABLE + RECEIVABLE repositories, `AccountingReportService.balancesAsOf` e a
 * POLICY (os colaboradores injetados). Nenhum prisma client é necessário — o service nunca abre
 * transação. O WHERE-clause de `findOutstanding` (inclui OPEN/PAYING/RECEIVING, exclui
 * PAID/RECEIVED/CANCELLED/soft-deleted) já é provado contra SQLite real em
 * `AgingOutstanding.integration.test.ts` (mesmo repositório, reusado via `models/outstandingLines`);
 * este arquivo cobre a lógica NOVA (janela diária, saldo inicial, drill por documento).
 *
 * Estas suítes fixam:
 *  - vazio (sem AP/AR em aberto) ⇒ 91 linhas zeradas, saldo projetado === saldo inicial em todas;
 *  - AP e AR no MESMO dia: inflow/outflow separados, net correto;
 *  - título em trânsito (PAYING/RECEIVING) É contado (herdado de findOutstanding, sem filtro extra);
 *  - título JÁ VENCIDO (dueDate < asOf) fica FORA da janela — nem nas linhas, nem nos totais
 *    (leitura literal do contrato do BRIEF: "dueDate NO período" — risco silencioso nº 1);
 *  - título além do horizonte (dueDate > asOf+90) também fica fora;
 *  - fronteira do horizonte: dueDate == asOf+90 ENTRA, dueDate == asOf+91 NÃO;
 *  - saldo inicial: soma SÓ contas de caixa (1.1.1/1.1.3), ignora não-caixa;
 *  - saldo projetado acumula corretamente dia a dia (openingBalance + Σ net até ali);
 *  - asOf custom muda a janela;
 *  - policy: falta canReadPayable OU canReadReceivable ⇒ ForbiddenError (F-CF5→a, AND das duas);
 *  - asOf inválido ⇒ ValidationError;
 *  - invariante: totalInflow/totalOutflow === Σ das linhas (inteiro exato, nenhuma linha produz "NaN").
 */
import { CashForecastReportService, CASH_FORECAST_HORIZON_DAYS } from '../CashForecastReportService';
import { ForbiddenError, ValidationError } from '../../../../lib/errors';
import type { AccountingScope } from '../../scope/AccountingScope';
import { scopeToday, dayNumberFromDateOnly, dateOnlyFromDayNumber } from '../../models/dates';

const scope: AccountingScope = {
  ownerUserId: 'u1',
  actorUserId: 'u1',
  unitId: 'unit-1',
  ledgerCode: 'DEFAULT',
  baseCurrencyCode: 'BRL',
  timeZone: 'America/Sao_Paulo',
};

/** Minimal Payable/Receivable-shaped row (only the fields the service reads). */
function line(over: {
  id: string;
  dueDate: string; // YYYY-MM-DD
  amountCents: number;
  counterpartyId?: string | null;
  name?: string;
  documentNumber?: string | null;
  status?: string;
}) {
  return {
    id: over.id,
    documentNumber: over.documentNumber ?? `NF-${over.id}`,
    dueDate: new Date(`${over.dueDate}T00:00:00.000Z`), // exatamente como createPayable/createReceivable persiste
    amountCents: over.amountCents,
    counterpartyId: over.counterpartyId ?? 'cp-A',
    supplierName: over.name ?? 'Fornecedor',
    customerName: over.name ?? 'Cliente',
    status: over.status ?? 'OPEN',
  };
}

function fullPolicy(over: Record<string, unknown> = {}) {
  return {
    canManage: jest.fn(() => true),
    canPost: jest.fn(() => true),
    canRead: jest.fn(() => true),
    canClosePeriod: jest.fn(() => true),
    canReconcile: jest.fn(() => true),
    canReadReferential: jest.fn(() => true),
    canManageReferential: jest.fn(() => true),
    canManagePayable: jest.fn(() => true),
    canReadPayable: jest.fn(() => true),
    canManageReceivable: jest.fn(() => true),
    canReadReceivable: jest.fn(() => true),
    canManageDimension: jest.fn(() => true),
    canReadDimension: jest.fn(() => true),
    canManageCounterparty: jest.fn(() => true),
    canReadCounterparty: jest.fn(() => true),
    canManageEntryApproval: jest.fn(() => true),
    canApproveEntry: jest.fn(() => true),
    enforcesSegregationOfDuties: jest.fn(() => false),
    ...over,
  };
}

function buildService(
  over: {
    payableRows?: any[];
    receivableRows?: any[];
    policy?: any;
    /** Linhas de balancete devolvidas por balancesAsOf (accountId + code + balanceCents NORMALIZADO). */
    balanceRows?: any[];
  } = {},
) {
  const payableRepo = { findOutstanding: jest.fn(async () => over.payableRows ?? []) };
  const receivableRepo = { findOutstanding: jest.fn(async () => over.receivableRows ?? []) };
  const reportService = { balancesAsOf: jest.fn(async () => over.balanceRows ?? []) };
  const policy = over.policy ?? fullPolicy();
  const svc = new CashForecastReportService(
    payableRepo as any,
    receivableRepo as any,
    reportService as any,
    policy as any,
  );
  return { svc, payableRepo, receivableRepo, reportService, policy };
}

const AS_OF = '2026-07-16';

describe('CashForecastReportService.forecast — janela vazia', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sem AP/AR em aberto ⇒ 91 linhas (asOf..asOf+90 inclusive) zeradas; saldo projetado === saldo inicial', async () => {
    const { svc } = buildService({});
    const r = await svc.forecast(scope, { asOf: AS_OF });
    expect(r.lines).toHaveLength(CASH_FORECAST_HORIZON_DAYS + 1);
    expect(r.openingBalanceCents).toBe('0');
    expect(r.totalInflowCents).toBe('0');
    expect(r.totalOutflowCents).toBe('0');
    expect(r.totalNetCents).toBe('0');
    for (const l of r.lines) {
      expect(l.inflowCents).toBe('0');
      expect(l.outflowCents).toBe('0');
      expect(l.netCents).toBe('0');
      expect(l.projectedBalanceCents).toBe('0');
      expect(l.documents).toEqual([]);
    }
    expect(r.lines[0].periodStart).toBe(AS_OF);
    expect(r.lines[0].periodStart).toBe(r.lines[0].periodEnd);
  });
});

describe('CashForecastReportService.forecast — AP e AR no mesmo dia', () => {
  beforeEach(() => jest.clearAllMocks());

  it('separa inflow (AR) de outflow (AP) no mesmo dia; net = inflow - outflow', async () => {
    const dueDay = '2026-07-20';
    const { svc } = buildService({
      payableRows: [line({ id: 'p1', dueDate: dueDay, amountCents: 30000 })],
      receivableRows: [line({ id: 'r1', dueDate: dueDay, amountCents: 50000 })],
    });
    const r = await svc.forecast(scope, { asOf: AS_OF });
    const day = r.lines.find((l) => l.periodStart === dueDay)!;
    expect(day.inflowCents).toBe('50000');
    expect(day.outflowCents).toBe('30000');
    expect(day.netCents).toBe('20000');
    expect(day.documents.map((d) => d.id).sort()).toEqual(['p1', 'r1']);
    expect(day.documents.find((d) => d.id === 'p1')!.kind).toBe('payable');
    expect(day.documents.find((d) => d.id === 'r1')!.kind).toBe('receivable');

    expect(r.totalInflowCents).toBe('50000');
    expect(r.totalOutflowCents).toBe('30000');
    expect(r.totalNetCents).toBe('20000');
  });

  it('duas linhas no MESMO dia e MESMO lado somam (não sobrescrevem)', async () => {
    const dueDay = '2026-07-20';
    const { svc } = buildService({
      payableRows: [
        line({ id: 'p1', dueDate: dueDay, amountCents: 1000 }),
        line({ id: 'p2', dueDate: dueDay, amountCents: 2000 }),
      ],
    });
    const r = await svc.forecast(scope, { asOf: AS_OF });
    const day = r.lines.find((l) => l.periodStart === dueDay)!;
    expect(day.outflowCents).toBe('3000');
    expect(day.documents).toHaveLength(2);
  });
});

describe('CashForecastReportService.forecast — títulos em trânsito (F-CF4→a, herdado)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('PAYING/RECEIVING são contados (o mock de findOutstanding já os devolveria; o service não filtra por status)', async () => {
    const { svc, payableRepo, receivableRepo } = buildService({
      payableRows: [line({ id: 'p1', dueDate: '2026-07-20', amountCents: 1000, status: 'PAYING' })],
      receivableRows: [line({ id: 'r1', dueDate: '2026-07-20', amountCents: 2000, status: 'RECEIVING' })],
    });
    const r = await svc.forecast(scope, { asOf: AS_OF });
    // O service confia inteiramente no findOutstanding do repositório (nenhum filtro de status
    // extra no service) — o que é o comportamento F-CF4→a: custo zero, nenhum código para excluir.
    expect(payableRepo.findOutstanding).toHaveBeenCalledWith(scope);
    expect(receivableRepo.findOutstanding).toHaveBeenCalledWith(scope);
    const day = r.lines.find((l) => l.periodStart === '2026-07-20')!;
    expect(day.outflowCents).toBe('1000');
    expect(day.inflowCents).toBe('2000');
  });
});

describe('CashForecastReportService.forecast — janela [asOf, asOf+90]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('título JÁ VENCIDO (dueDate < asOf) fica FORA da janela — nem linha, nem total (risco silencioso nº 1)', async () => {
    const { svc } = buildService({
      payableRows: [line({ id: 'overdue', dueDate: '2026-07-01', amountCents: 99999 })], // 15 dias antes de AS_OF
    });
    const r = await svc.forecast(scope, { asOf: AS_OF });
    expect(r.totalOutflowCents).toBe('0');
    expect(r.lines.every((l) => l.documents.every((d) => d.id !== 'overdue'))).toBe(true);
  });

  it('fronteira do horizonte: dueDate == asOf+90 ENTRA, asOf+91 NÃO', async () => {
    const asOfDay = dayNumberFromDateOnly(AS_OF);
    const lastDay = dateOnlyFromDayNumber(asOfDay + CASH_FORECAST_HORIZON_DAYS);
    const pastHorizon = dateOnlyFromDayNumber(asOfDay + CASH_FORECAST_HORIZON_DAYS + 1);
    const { svc } = buildService({
      payableRows: [
        line({ id: 'in-horizon', dueDate: lastDay, amountCents: 100 }),
        line({ id: 'out-of-horizon', dueDate: pastHorizon, amountCents: 200 }),
      ],
    });
    const r = await svc.forecast(scope, { asOf: AS_OF });
    expect(r.lines).toHaveLength(CASH_FORECAST_HORIZON_DAYS + 1);
    expect(r.lines[r.lines.length - 1].periodStart).toBe(lastDay);
    expect(r.lines[r.lines.length - 1].outflowCents).toBe('100');
    expect(r.totalOutflowCents).toBe('100'); // out-of-horizon NUNCA entra em nenhuma linha
  });

  it('dueDate == asOf (dia 0) entra na primeira linha', async () => {
    const { svc } = buildService({
      receivableRows: [line({ id: 'r-today', dueDate: AS_OF, amountCents: 500 })],
    });
    const r = await svc.forecast(scope, { asOf: AS_OF });
    expect(r.lines[0].inflowCents).toBe('500');
  });
});

describe('CashForecastReportService.forecast — saldo inicial (F-CF2→a, derivado do razão)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('soma SÓ contas de caixa (1.1.1 Banco / 1.1.3 Caixa); ignora contas não-caixa', async () => {
    const { svc, reportService } = buildService({
      balanceRows: [
        { accountId: 'a1', code: '1.1.1', balanceCents: 100000 }, // Banco — caixa
        { accountId: 'a2', code: '1.1.3', balanceCents: 5000 }, // Caixa — caixa
        { accountId: 'a3', code: '1.1.2', balanceCents: 999999 }, // A Receber — NÃO é caixa
        { accountId: 'a4', code: '2.1.2', balanceCents: -50000 }, // Fornecedores — NÃO é caixa
      ],
    });
    const r = await svc.forecast(scope, { asOf: AS_OF });
    expect(r.openingBalanceCents).toBe('105000');
    expect(reportService.balancesAsOf).toHaveBeenCalledWith(scope, new Date(`${AS_OF}T23:59:59.999Z`));
  });

  it('saldo projetado acumula dia a dia: openingBalance + Σ net até ali (inclusive)', async () => {
    const day1 = dateOnlyFromDayNumber(dayNumberFromDateOnly(AS_OF) + 1);
    const day2 = dateOnlyFromDayNumber(dayNumberFromDateOnly(AS_OF) + 2);
    const { svc } = buildService({
      balanceRows: [{ accountId: 'a1', code: '1.1.1', balanceCents: 10000 }],
      receivableRows: [line({ id: 'r1', dueDate: day1, amountCents: 3000 })],
      payableRows: [line({ id: 'p1', dueDate: day2, amountCents: 8000 })],
    });
    const r = await svc.forecast(scope, { asOf: AS_OF });
    // dia 0 (asOf): sem movimento ⇒ saldo = 10000
    expect(r.lines[0].projectedBalanceCents).toBe('10000');
    // dia 1: +3000 ⇒ 13000
    expect(r.lines[1].projectedBalanceCents).toBe('13000');
    // dia 2: -8000 ⇒ 5000
    expect(r.lines[2].projectedBalanceCents).toBe('5000');
    // dia 3 em diante: sem novo movimento, saldo se mantém em 5000
    expect(r.lines[3].projectedBalanceCents).toBe('5000');
  });

  it('saldo projetado pode ficar NEGATIVO — é exatamente a pergunta que o produto responde', async () => {
    const { svc } = buildService({
      balanceRows: [{ accountId: 'a1', code: '1.1.1', balanceCents: 1000 }],
      payableRows: [line({ id: 'p1', dueDate: AS_OF, amountCents: 5000 })],
    });
    const r = await svc.forecast(scope, { asOf: AS_OF });
    expect(r.lines[0].projectedBalanceCents).toBe('-4000');
  });
});

describe('CashForecastReportService.forecast — asOf', () => {
  beforeEach(() => jest.clearAllMocks());

  it('asOf custom desloca a janela', async () => {
    const { svc } = buildService({
      payableRows: [line({ id: 'p1', dueDate: '2026-08-01', amountCents: 100 })],
    });
    const before = await svc.forecast(scope, { asOf: '2026-07-01' }); // 2026-08-01 dentro (31 dias)
    expect(before.totalOutflowCents).toBe('100');

    const after = await svc.forecast(scope, { asOf: '2026-08-02' }); // 2026-08-01 já passou
    expect(after.totalOutflowCents).toBe('0');
  });

  it('asOf omitido ⇒ hoje NO FUSO DO ESCOPO (mesma fonte que o default da Aging)', async () => {
    const { svc } = buildService({});
    const r = await svc.forecast(scope, {});
    expect(r.asOf).toBe(scopeToday(scope));
  });

  it('asOf inválido (calendário impossível) ⇒ ValidationError', async () => {
    const { svc } = buildService({});
    await expect(svc.forecast(scope, { asOf: '2026-02-30' })).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('CashForecastReportService.forecast — policy (F-CF5→a, AND das duas)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('canReadPayable=false ⇒ ForbiddenError, mesmo com canReadReceivable=true', async () => {
    const policy = fullPolicy({ canReadPayable: jest.fn(() => false) });
    const { svc, payableRepo, receivableRepo } = buildService({ policy });
    await expect(svc.forecast(scope, { asOf: AS_OF })).rejects.toBeInstanceOf(ForbiddenError);
    expect(payableRepo.findOutstanding).not.toHaveBeenCalled();
    expect(receivableRepo.findOutstanding).not.toHaveBeenCalled();
  });

  it('canReadReceivable=false ⇒ ForbiddenError, mesmo com canReadPayable=true', async () => {
    const policy = fullPolicy({ canReadReceivable: jest.fn(() => false) });
    const { svc } = buildService({ policy });
    await expect(svc.forecast(scope, { asOf: AS_OF })).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('as duas permitidas ⇒ passa', async () => {
    const { svc } = buildService({});
    await expect(svc.forecast(scope, { asOf: AS_OF })).resolves.toBeDefined();
  });
});

describe('CashForecastReportService.forecast — invariante de soma exata', () => {
  beforeEach(() => jest.clearAllMocks());

  it('Σ inflowCents das linhas === totalInflowCents; Σ outflowCents === totalOutflowCents; nenhuma "NaN"', async () => {
    const { svc } = buildService({
      balanceRows: [{ accountId: 'a1', code: '1.1.1', balanceCents: 123456 }],
      receivableRows: [
        line({ id: 'r1', dueDate: '2026-07-18', amountCents: 12345 }),
        line({ id: 'r2', dueDate: '2026-08-01', amountCents: 67890 }),
      ],
      payableRows: [line({ id: 'p1', dueDate: '2026-07-20', amountCents: 11111 })],
    });
    const r = await svc.forecast(scope, { asOf: AS_OF });

    const sumInflow = r.lines.reduce((acc, l) => acc + parseInt(l.inflowCents, 10), 0);
    const sumOutflow = r.lines.reduce((acc, l) => acc + parseInt(l.outflowCents, 10), 0);
    expect(sumInflow).toBe(parseInt(r.totalInflowCents, 10));
    expect(sumOutflow).toBe(parseInt(r.totalOutflowCents, 10));
    expect(parseInt(r.totalNetCents, 10)).toBe(sumInflow - sumOutflow);

    for (const l of r.lines) {
      expect(l.inflowCents).not.toBe('NaN');
      expect(l.outflowCents).not.toBe('NaN');
      expect(l.netCents).not.toBe('NaN');
      expect(l.projectedBalanceCents).not.toBe('NaN');
      expect(Number.isInteger(parseInt(l.projectedBalanceCents, 10))).toBe(true);
    }
  });
});
