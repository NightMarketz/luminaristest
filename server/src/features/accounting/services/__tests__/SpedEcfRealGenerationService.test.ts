/**
 * SpedEcfRealGenerationService — esqueleto do Lucro Real (ADR-INCR-SPED-ECF-FASE3).
 * Espelha `SpedEcfGenerationService.test.ts` padrão por padrão, mais os comportamentos que
 * são PRÓPRIOS do Real no BRIEF:
 *  - item 5: injeta `AccountingReportService` e chama `balanceSheet`/`incomeStatement` (mock
 *    confirma a chamada — não duplica lógica de somatório);
 *  - item 9: FORMA_APUR/FORMA_TRIB/FORMA_TRIB_PER chegam do DTO ao 0010 (parâmetro, não default);
 *  - item 10: conta Revenue fora de 3.1/3.3 NÃO bloqueia (gate de exaustividade não portado);
 *  - item 13: audit reusa `sped.ecf_generated`, payload só com as chaves da allowlist;
 *  - item 17: o job nasce carimbado com o escopo (userId/unitId) — tenancy.
 */
import { SpedEcfRealGenerationService, SPED_ECF_REAL_JOB_KIND } from '../SpedEcfRealGenerationService';
import { resolveAccountingScope } from '../../scope/AccountingScope';
import { ForbiddenError } from '../../../../lib/errors';
import { logger } from '../../../../lib/logger';
import { PAYLOAD_ALLOWLIST } from '../../audit/auditCanonical';
import type { SpedEcfRealRequestDto } from '../../dtos/SpedEcfRealDto';
import type { AccountingDataExchangeJob } from 'generated/prisma';
import type { BalanceSheetReport, IncomeStatementReport } from '../AccountingReportService';

const savedBuffers: Buffer[] = [];
jest.mock('../../../../lib/attachmentStorage', () => ({
  saveFile: jest.fn(async (_o: string, _u: string, _j: string, _n: string, buffer: Buffer) => {
    savedBuffers.push(buffer);
    return { storageKey: 'u/unit/job/ecf_real.txt', sanitizedName: 'ecf_real.txt' };
  }),
  resolveReadPath: jest.fn((k: string) => `/abs/${k}`),
}));
import * as storage from '../../../../lib/attachmentStorage';
const sendAlertWebhook = jest.fn();
jest.mock('../../../../lib/alertWebhook', () => ({
  __esModule: true,
  sendAlertWebhook: (...a: unknown[]) => sendAlertWebhook(...a),
}));

const scope = resolveAccountingScope({ userId: 'owner-1' }, 'unit-1');

function makeDto(over: Partial<SpedEcfRealRequestDto> = {}): SpedEcfRealRequestDto {
  return {
    unitId: 'unit-1',
    year: 2025,
    declarant: {
      cnpj: '11222333000181', nome: 'INDUSTRIA TESTE LTDA', codNat: '2062', cnaeFiscal: '9602501',
      endereco: 'RUA DAS FLORES', num: '100', bairro: 'CENTRO', uf: 'DF', codMun: '5300108',
      cep: '70000000', numTel: '6133334444', email: 'industria@teste.com',
    },
    // formaTrib/formaTribPer: placeholders de teste — em produção vêm do caller (sem default).
    fiscal: { formaTrib: '1', formaTribPer: 'XXXX', formaApur: 'T', indAliqCsll: '1', indRecReceita: '2' },
    signers: [
      { identNom: 'CONTADOR', identCpfCnpj: '12345678900', identQualif: '900', indCrc: '1DF123', email: 'c@d.com', fone: '6133334444' },
      { identNom: 'SOCIO', identCpfCnpj: '98765432100', identQualif: '205', email: 's@d.com', fone: '6133335555' },
    ],
    ...over,
  } as SpedEcfRealRequestDto;
}

/** DRE mock — inclui uma conta Revenue FORA de 3.1/3.3 (3.9) com movimento (item 10). */
function makeDre(asOf: Date): IncomeStatementReport {
  const toDate = asOf.toISOString().slice(0, 10);
  return {
    unitId: 'unit-1',
    periodSemantics: 'year_to_date',
    fromDate: `${asOf.getUTCFullYear()}-01-01`,
    toDate,
    mappingVersion: 'v1',
    grossRevenue: {
      accounts: [
        { accountId: 'rec31', code: '3.1', name: 'Receita de Serviços', amountCents: '15000000' },
        { accountId: 'rec39', code: '3.9', name: 'Receita Financeira', amountCents: '1000000' },
      ],
      totalCents: '16000000',
    },
    revenueDeductions: { accounts: [], totalCents: '0' },
    costOfGoodsSold: { accounts: [], totalCents: '0' },
    expenses: { accounts: [{ accountId: 'exp41', code: '4.1', name: 'Despesas', amountCents: '-4000000' }], totalCents: '-4000000' },
    netResult: { amountCents: '12000000', isComputed: true, computation: 'income_statement_net_result' },
    reportStatus: 'OK',
    diagnostics: { mappingVersion: 'v1', unmappedAccounts: [], removedAccountsReferenced: [], hasUnclosedPriorYearResult: false, priorYearResultCents: 0, warnings: [] },
  };
}

function makeBp(asOf: Date): BalanceSheetReport {
  const asOfIso = asOf.toISOString().slice(0, 10);
  return {
    unitId: 'unit-1',
    periodSemantics: 'as_of',
    asOf: asOfIso,
    mappingVersion: 'v1',
    assets: { accounts: [], totalCents: '30000000' },
    liabilities: { accounts: [], totalCents: '10000000' },
    equity: { accounts: [], totalCents: '8000000' },
    netResultLine: { amountCents: '12000000', isComputed: true, computation: 'income_statement_net_result', fromDate: `${asOf.getUTCFullYear()}-01-01`, toDate: asOfIso },
    balanced: true,
    reportStatus: 'OK',
    diagnostics: { mappingVersion: 'v1', unmappedAccounts: [], removedAccountsReferenced: [], hasUnclosedPriorYearResult: false, priorYearResultCents: 0, warnings: [] },
  };
}

interface Mocks {
  canRead?: boolean;
}

function buildService(m: Mocks = {}) {
  const canRead = m.canRead ?? true;

  const balanceSheet = jest.fn(async (_s: unknown, asOf: Date) => makeBp(asOf));
  const incomeStatement = jest.fn(async (_s: unknown, asOf: Date) => makeDre(asOf));
  const reportService = { balanceSheet, incomeStatement } as never;

  const policy = { canRead: jest.fn(() => canRead) } as never;

  const createJob = jest.fn(async (data: Record<string, unknown>) =>
    ({ id: 'job-1', storageKey: null, ...data } as unknown as AccountingDataExchangeJob));
  const updateJob = jest.fn(async (_s: unknown, _id: string, data: Record<string, unknown>) =>
    ({ id: 'job-1', kind: SPED_ECF_REAL_JOB_KIND, direction: 'EXPORT', status: 'EXPORTED', ...data } as unknown as AccountingDataExchangeJob));
  const runTransaction = jest.fn((fn: (tx: never) => Promise<unknown>) => fn({} as never));
  const repo = { createJob, updateJob, runTransaction } as never;

  const append = jest.fn(async () => undefined);
  const audit = { append } as never;

  const service = new SpedEcfRealGenerationService(reportService, policy, repo, audit);
  return { service, createJob, updateJob, balanceSheet, incomeStatement, append, policy };
}

function producedLines(): string[] {
  const buf = savedBuffers[savedBuffers.length - 1];
  return buf.toString('latin1').split('\r\n').filter(Boolean);
}

beforeEach(() => {
  savedBuffers.length = 0;
  sendAlertWebhook.mockClear();
});

describe('SpedEcfRealGenerationService.generate', () => {
  it('rejects with ForbiddenError when policy denies read — before any report read or job (policy-first)', async () => {
    const { service, createJob, balanceSheet, incomeStatement } = buildService({ canRead: false });
    await expect(service.generate(scope, makeDto())).rejects.toBeInstanceOf(ForbiddenError);
    expect(createJob).not.toHaveBeenCalled();
    expect(balanceSheet).not.toHaveBeenCalled();
    expect(incomeStatement).not.toHaveBeenCalled();
    expect(savedBuffers).toHaveLength(0);
  });

  it('item 5: reads BP/DRE through AccountingReportService, once per quarter end (Fork 5 trimestral)', async () => {
    const { service, balanceSheet, incomeStatement } = buildService();
    await service.generate(scope, makeDto());
    // 4 janelas (T01..T04) × 2 relatórios — nenhuma agregação própria de saldo.
    expect(balanceSheet).toHaveBeenCalledTimes(4);
    expect(incomeStatement).toHaveBeenCalledTimes(4);
    const ends = ['2025-03-31', '2025-06-30', '2025-09-30', '2025-12-31'];
    for (const [i, end] of ends.entries()) {
      expect((balanceSheet.mock.calls[i][1] as Date).toISOString().slice(0, 10)).toBe(end);
      expect((incomeStatement.mock.calls[i][1] as Date).toISOString().slice(0, 10)).toBe(end);
      expect(balanceSheet.mock.calls[i][0]).toBe(scope);
      expect(incomeStatement.mock.calls[i][0]).toBe(scope);
    }
  });

  it('item 10: a Revenue account outside 3.1/3.3 with movement does NOT block the Real generation', async () => {
    // makeDre carrega 3.9 (Receita Financeira) com movimento — no Presumido isto é ValidationError.
    const { service, createJob } = buildService();
    await expect(service.generate(scope, makeDto())).resolves.toBeDefined();
    expect(createJob).toHaveBeenCalledTimes(1);
    expect(savedBuffers).toHaveLength(1);
  });

  it('item 9: 0010 carries FORMA_TRIB / FORMA_APUR / FORMA_TRIB_PER from the DTO (no server default)', async () => {
    const { service } = buildService();
    await service.generate(scope, makeDto());
    expect(producedLines()).toContain('|0010||N|1|T|01|XXXX||C||||2|');
    await service.generate(scope, makeDto({ fiscal: { formaTrib: '3', formaTribPer: 'ZZZZ', formaApur: 'T', indAliqCsll: '4', indRecReceita: '1' } }));
    const lines = producedLines();
    expect(lines).toContain('|0010||N|3|T|01|ZZZZ||C||||1|');
    expect(lines.find((l) => l.startsWith('|0020|'))!.startsWith('|0020|4|0|')).toBe(true);
    // O 0010 default do Presumido nunca sai daqui.
    expect(lines).not.toContain('|0010||N|5|T|01|PPPP||C||||2|');
  });

  it('emits L/M/N (and P) as empty markers — Fase 3, conteúdo pendente (Forks 2/3/4)', async () => {
    const { service } = buildService();
    await service.generate(scope, makeDto());
    const lines = producedLines();
    for (const b of ['L', 'M', 'N', 'P']) {
      expect(lines).toContain(`|${b}001|1|`);
      expect(lines).toContain(`|${b}990|2|`);
    }
    // Nenhuma linha de receita do Presumido (P030/P200/P400) e nenhum valor de DRE/BP no arquivo.
    expect(lines.some((l) => /^\|P(030|200|400)\|/.test(l))).toBe(false);
    expect(lines.some((l) => l.includes('120000,00') || l.includes('300000,00'))).toBe(false);
  });

  it('records an EXPORT_SPED_ECF_REAL job (PROCESSING → EXPORTED) stamped with the scope, and the audit in the same tx', async () => {
    const { service, createJob, updateJob, append } = buildService();
    const out = await service.generate(scope, makeDto());

    expect(createJob).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'EXPORT_SPED_ECF_REAL', direction: 'EXPORT', status: 'PROCESSING', mimeType: 'text/plain',
      originalName: 'ecf_real_11222333000181_2025.txt',
      // item 17 — tenancy: o job nasce com o dono/unidade do ESCOPO, nunca do body.
      userId: scope.ownerUserId, unitId: scope.unitId, requestedById: scope.actorUserId,
    }));
    expect(updateJob).toHaveBeenCalledWith(
      scope, 'job-1', expect.objectContaining({ status: 'EXPORTED' }), expect.anything(),
    );
    expect(append).toHaveBeenCalledWith(
      expect.anything(), scope,
      expect.objectContaining({ eventType: 'sped.ecf_generated', targetType: 'data_exchange_job', targetId: 'job-1' }),
    );
    expect(out.kind).toBe('EXPORT_SPED_ECF_REAL');
  });

  it('item 13: audit payload carries ONLY allowlisted keys of sped.ecf_generated (kind distinguishes the regime; no PII)', async () => {
    const { service, append } = buildService();
    await service.generate(scope, makeDto());
    const input = (append.mock.calls[0] as unknown as [unknown, unknown, { payload: Record<string, unknown> }])[2];
    const allowed = PAYLOAD_ALLOWLIST['sped.ecf_generated'];
    expect(Object.keys(input.payload).sort()).toEqual([...allowed].sort());
    expect(input.payload.kind).toBe('EXPORT_SPED_ECF_REAL');
    // Nada do declarante/signatários (nome, CNPJ, CPF, e-mail, fone) chega ao payload.
    const json = JSON.stringify(input.payload);
    for (const pii of ['INDUSTRIA TESTE', '11222333000181', '12345678900', '@', '6133334444']) {
      expect(json.includes(pii)).toBe(false);
    }
  });

  it('writes ISO-8859-1 (latin1) bytes, CRLF-terminated, 0000…9999', async () => {
    const { service } = buildService();
    await service.generate(scope, makeDto());
    const text = savedBuffers[savedBuffers.length - 1].toString('latin1');
    expect(text.endsWith('\r\n')).toBe(true);
    const lines = producedLines();
    expect(lines[0].startsWith('|0000|')).toBe(true);
    expect(lines[lines.length - 1].startsWith('|9999|')).toBe(true);
  });

  it('is byte-deterministic (two generations produce the same bytes)', async () => {
    const { service } = buildService();
    await service.generate(scope, makeDto());
    const first = savedBuffers[savedBuffers.length - 1].toString('latin1');
    await service.generate(scope, makeDto());
    const second = savedBuffers[savedBuffers.length - 1].toString('latin1');
    expect(first).toBe(second);
  });

  it('never writes to the ledger: only report reads + job metadata (no posting/journal repo at all)', async () => {
    const { service, balanceSheet, incomeStatement, createJob, updateJob } = buildService();
    await service.generate(scope, makeDto());
    expect(balanceSheet).toHaveBeenCalled();
    expect(incomeStatement).toHaveBeenCalled();
    expect(createJob).toHaveBeenCalledTimes(1);
    expect(updateJob).toHaveBeenCalledTimes(1);
  });

  it('does not leave the job claiming EXPORTED when saveFile fails, and records FAILED (A1)', async () => {
    const { service, createJob, updateJob } = buildService();
    (storage.saveFile as jest.Mock).mockRejectedValueOnce(new Error('disk full'));

    await expect(service.generate(scope, makeDto())).rejects.toThrow('disk full');

    expect(createJob).not.toHaveBeenCalledWith(expect.objectContaining({ status: 'EXPORTED' }));
    const statuses = updateJob.mock.calls.map((c) => (c[2] as { status?: string } | undefined)?.status);
    expect(statuses).toContain('FAILED');
    expect(statuses).not.toContain('EXPORTED');
  });

  it('fires the alert webhook (source=sped_ecf, kind=EXPORT_SPED_ECF_REAL) alongside FAILED, before the throw', async () => {
    const { service } = buildService();
    (storage.saveFile as jest.Mock).mockRejectedValueOnce(new Error('disk full'));

    await expect(service.generate(scope, makeDto())).rejects.toThrow('disk full');

    expect(sendAlertWebhook).toHaveBeenCalledTimes(1);
    expect(sendAlertWebhook).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'sped_ecf',
        event: 'generation_failed',
        jobId: 'job-1',
        kind: 'EXPORT_SPED_ECF_REAL',
        unitId: 'unit-1',
        errorName: 'Error',
        errorMessage: 'disk full',
      }),
    );
  });

  describe('duration metric (mesma camada do Presumido — nome próprio por regime)', () => {
    it('logs Metric: sped_ecf_real_generation at info with a numeric duration on success', async () => {
      const infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => {});
      const { service } = buildService();
      await service.generate(scope, makeDto());

      const call = infoSpy.mock.calls.find((c) => c[0] === 'Metric: sped_ecf_real_generation');
      expect(call).toBeDefined();
      const ctx = call![1] as Record<string, unknown>;
      expect(typeof ctx.duration).toBe('number');
      expect(ctx.status).toBe('success');
      infoSpy.mockRestore();
    });

    it('logs Metric: sped_ecf_real_generation at warn on the FAILED (saveFile) path', async () => {
      const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});
      const { service } = buildService();
      (storage.saveFile as jest.Mock).mockRejectedValueOnce(new Error('disk full'));

      await expect(service.generate(scope, makeDto())).rejects.toThrow('disk full');

      const call = warnSpy.mock.calls.find((c) => c[0] === 'Metric: sped_ecf_real_generation');
      expect(call).toBeDefined();
      const ctx = call![1] as Record<string, unknown>;
      expect(ctx.status).toBe('failure');
      warnSpy.mockRestore();
    });
  });
});
