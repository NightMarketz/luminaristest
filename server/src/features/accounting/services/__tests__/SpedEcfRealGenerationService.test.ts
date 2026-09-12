/**
 * SpedEcfRealGenerationService — Lucro Real (ADR-INCR-SPED-ECF-FASE3 + BRIEF 3B, Blocos L/M/N).
 * Espelha `SpedEcfGenerationService.test.ts` padrão por padrão, mais o que é PRÓPRIO do Real:
 *  - item 6 (Fork 6→b): o serviço NÃO injeta mais `AccountingReportService` — Bloco L só tem períodos;
 *  - item 11 (Fork 4→b): o gerador LÊ do model (`ILalurRepository.findEntriesForYear` + `findManyParteB`)
 *    e resolve cada linha contra o catálogo (descricao copiada, TIPO_LANCAMENTO derivado, accountId →
 *    code + COD_NAT);
 *  - item 4 (Fork 7→a): `year` sem leiaute conhecido é erro explícito ANTES de qualquer job;
 *  - itens 2/9: FORMA_APUR/FORMA_TRIB/FORMA_TRIB_PER chegam do DTO ao 0010 (parâmetro, não default);
 *  - item 18: audit reusa `sped.ecf_generated`, payload = allowlist + `lalurEntries` (contagem);
 *  - item 17: o job nasce carimbado com o escopo (userId/unitId) — tenancy.
 */
import { SpedEcfRealGenerationService, SPED_ECF_REAL_JOB_KIND } from '../SpedEcfRealGenerationService';
import { resolveAccountingScope } from '../../scope/AccountingScope';
import { ForbiddenError, ValidationError } from '../../../../lib/errors';
import { logger } from '../../../../lib/logger';
import { PAYLOAD_ALLOWLIST } from '../../audit/auditCanonical';
import type { SpedEcfRealRequestDto } from '../../dtos/SpedEcfRealDto';
import type { AccountingDataExchangeJob, LalurParteBAccount } from 'generated/prisma';
import type { LalurClosingWithBalances, LalurEntryWithRelations, LalurMovementWithRelations } from '../../repositories/ILalurRepository';
import { LalurService, type LalurParteBBalancesDiagnostic } from '../LalurService';

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
    // formaTribPer 'RRRR' = Real nos 4 trimestres (alfabeto pp.71-72); formaTrib default '1' ratificado.
    fiscal: { formaTrib: '1', formaTribPer: 'RRRR', formaApur: 'T', indAliqCsll: '1', indRecReceita: '2' },
    signers: [
      { identNom: 'CONTADOR', identCpfCnpj: '12345678900', identQualif: '900', indCrc: '1DF123', email: 'c@d.com', fone: '6133334444' },
      { identNom: 'SOCIO', identCpfCnpj: '98765432100', identQualif: '205', email: 's@d.com', fone: '6133335555' },
    ],
    ...over,
  } as SpedEcfRealRequestDto;
}

const parteBIrpj = {
  id: 'pb-1', userId: 'owner-1', unitId: 'unit-1', codCtaB: 'PF-2024', descricao: 'Prejuízo fiscal 2024',
  dtCriacao: new Date('2024-12-31T00:00:00.000Z'), codPbRfb: '1000', dtLimite: null, codTributo: 'I',
  saldoIniCents: 500000n, indSaldoIni: 'D', cnpjSitEsp: null, createdById: 'owner-1',
  createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
} as unknown as LalurParteBAccount;

const baseEntry = {
  userId: 'owner-1', unitId: 'unit-1', year: 2025, histLancamento: null, parteBId: null, accountId: null,
  createdById: 'owner-1', createdAt: new Date(), updatedAt: new Date(), deletedAt: null, parteB: null, account: null,
};

/** 1 adição (M300/7, sem relação) + 1 exclusão (M300/166 com conta de resultado) que NÃO se cancelam + 1 dedução N630. */
function makeEntries(): LalurEntryWithRelations[] {
  return [
    { ...baseEntry, id: 'e1', quarter: 'T01', livro: 'lalur', codigo: '7', valorCents: 123456n, indRelacao: '4', histLancamento: 'Custos do T1' },
    { ...baseEntry, id: 'e2', quarter: 'T01', livro: 'lalur', codigo: '166', valorCents: 50000n, indRelacao: '2', accountId: 'acc-1', account: { id: 'acc-1', code: '3.1.1', nature: 'Revenue' } },
    { ...baseEntry, id: 'e3', quarter: 'T02', livro: 'lalur', codigo: '173', valorCents: 700n, indRelacao: '1', parteBId: 'pb-1', parteB: parteBIrpj },
    { ...baseEntry, id: 'e4', quarter: 'T04', livro: 'n630', codigo: '6', valorCents: 1000n, indRelacao: null },
  ] as unknown as LalurEntryWithRelations[];
}

interface Mocks {
  canRead?: boolean;
  entries?: LalurEntryWithRelations[];
  parteB?: LalurParteBAccount[];
  /** ECF 3C: fechamentos do exercício (default: os 4, sem saldos — o suficiente para a geração passar). */
  closings?: LalurClosingWithBalances[];
  movements?: LalurMovementWithRelations[];
  divergences?: LalurParteBBalancesDiagnostic['divergences'];
  /** abertura C3 por conta (default: a coluna saldoIni com sinal — nenhum exercício anterior fechado). */
  opening?: Map<string, bigint>;
}

/** 4 fechamentos vazios (tenant sem saldo materializado) — C1: o fato "fechado" é a linha-pai. */
export function makeClosings(balances: LalurClosingWithBalances['balances'] = []): LalurClosingWithBalances[] {
  return ['T01', 'T02', 'T03', 'T04'].map((quarter, i) => ({
    id: `cl-${i + 1}`, userId: 'owner-1', unitId: 'unit-1', year: 2025, quarter, balancesSha256: 'x', closedAt: new Date('2026-01-10T00:00:00.000Z'), closedById: 'owner-1', balances,
  })) as unknown as LalurClosingWithBalances[];
}

function buildService(m: Mocks = {}) {
  const canRead = m.canRead ?? true;

  const findEntriesForYear = jest.fn(async (_s: unknown, _year: number) => m.entries ?? makeEntries());
  const findManyParteB = jest.fn(async (_s: unknown, _f: unknown) => m.parteB ?? [parteBIrpj]);
  const findClosingsForYear = jest.fn(async (_s: unknown, _year: number) => m.closings ?? makeClosings());
  const findMovementsForYear = jest.fn(async (_s: unknown, _year: number) => m.movements ?? []);
  const lalurRepo = { findEntriesForYear, findManyParteB, findClosingsForYear, findMovementsForYear } as never;
  const diagnoseYear = jest.fn(async (_s: unknown, year: number): Promise<LalurParteBBalancesDiagnostic> => ({ year, periods: [], divergences: m.divergences ?? [] }));
  // Sem exercício anterior fechado, a abertura é a COLUNA via a regra real (REGRA_DT_AP_ZERO dentro de anchorOpening).
  const openingBalances = jest.fn(async (_s: unknown, year: number, accounts: LalurParteBAccount[]) =>
    m.opening ?? new Map(accounts.map((a) => [a.id, LalurService.anchorOpening(a, year)])));
  const lalurService = { diagnoseYear, openingBalances } as never;

  const policy = { canRead: jest.fn(() => canRead) } as never;

  const createJob = jest.fn(async (data: Record<string, unknown>) =>
    ({ id: 'job-1', storageKey: null, ...data } as unknown as AccountingDataExchangeJob));
  const updateJob = jest.fn(async (_s: unknown, _id: string, data: Record<string, unknown>) =>
    ({ id: 'job-1', kind: SPED_ECF_REAL_JOB_KIND, direction: 'EXPORT', status: 'EXPORTED', ...data } as unknown as AccountingDataExchangeJob));
  const runTransaction = jest.fn((fn: (tx: never) => Promise<unknown>) => fn({} as never));
  const repo = { createJob, updateJob, runTransaction } as never;

  const append = jest.fn(async () => undefined);
  const audit = { append } as never;

  const service = new SpedEcfRealGenerationService(lalurRepo, policy, repo, audit, lalurService);
  return { service, createJob, updateJob, findEntriesForYear, findManyParteB, findClosingsForYear, findMovementsForYear, diagnoseYear, openingBalances, append, policy };
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
  it('rejects with ForbiddenError when policy denies read — before any model read or job (policy-first)', async () => {
    const { service, createJob, findEntriesForYear, findManyParteB } = buildService({ canRead: false });
    await expect(service.generate(scope, makeDto())).rejects.toBeInstanceOf(ForbiddenError);
    expect(createJob).not.toHaveBeenCalled();
    expect(findEntriesForYear).not.toHaveBeenCalled();
    expect(findManyParteB).not.toHaveBeenCalled();
    expect(savedBuffers).toHaveLength(0);
  });

  it('item 4 (Fork 7→a): year sem leiaute conhecido (2026) é erro explícito ANTES do job; fiscal.codVer sobrepõe', async () => {
    const { service, createJob } = buildService();
    await expect(service.generate(scope, makeDto({ year: 2026 }))).rejects.toThrow(/ECF_COD_VER desconhecido.*2026/);
    await expect(service.generate(scope, makeDto({ year: 2026 }))).rejects.toBeInstanceOf(ValidationError); // 400, não 500 (review I-1)
    expect(createJob).not.toHaveBeenCalled();
    await service.generate(scope, makeDto({ year: 2026, fiscal: { formaTrib: '1', formaTribPer: 'RRRR', formaApur: 'T', indAliqCsll: '1', indRecReceita: '2', codVer: '0013' } }));
    expect(producedLines()[0]).toMatch(/^\|0000\|LECF\|0013\|/);
    expect(producedLines()[0]).toContain('|01012026|31122026|');
  });

  it('item 11: o gerador LÊ do model — findEntriesForYear(scope, year) + findManyParteB(scope, live) — e o DTO não carrega ajustes', async () => {
    const { service, findEntriesForYear, findManyParteB } = buildService();
    await service.generate(scope, makeDto());
    expect(findEntriesForYear).toHaveBeenCalledWith(scope, 2025);
    expect(findManyParteB).toHaveBeenCalledWith(scope, { includeArchived: false });
    const lines = producedLines();
    // 1 adição + 1 exclusão que não se cancelam (valores distintos, ambos no arquivo, VALOR sempre positivo)
    expect(lines).toContain('|M300|7|Custos não dedutíveis|A|4|1234,56|Custos do T1|');
    expect(lines.some((l) => l.startsWith('|M300|166|') && l.includes('|E|2|500,00|'))).toBe(true);
    // accountId → Account.code (= I050/J050.COD_CTA) + COD_NAT 04 (Revenue) ⇒ exclusão em resultado = 'C'
    expect(lines).toContain('|M310|3.1.1||500,00|C|');
    // Parte B: M010 do cadastro + M305 da compensação (P ⇒ credita a Parte B)
    expect(lines).toContain('|M010|PF-2024|Prejuízo fiscal 2024|31122024|1000||I|5000,00|D||');
    expect(lines).toContain('|M305|PF-2024|7,00|C|');
    // N630 linha E
    expect(lines.some((l) => l.startsWith('|N630|6|') && l.endsWith('|10,00|'))).toBe(true);
  });

  it('item 13 / review I-3: M010 só de contas com dtCriacao ≤ 31/12/year (REGRA_MENOR_IGUAL_DT_FIN); criada no exercício com saldo ≠ 0 é 400 (REGRA_DT_AP_ZERO)', async () => {
    const futura = { ...parteBIrpj, id: 'pb-2', codCtaB: 'PF-2026', dtCriacao: new Date('2026-03-31T00:00:00.000Z') } as LalurParteBAccount;
    const { service } = buildService({ entries: [], parteB: [parteBIrpj, futura] });
    await service.generate(scope, makeDto());
    const M010 = producedLines().filter((l) => l.startsWith('|M010|'));
    expect(M010).toHaveLength(1);
    expect(M010[0].startsWith('|M010|PF-2024|')).toBe(true);

    const noAno = { ...parteBIrpj, id: 'pb-3', codCtaB: 'PF-2025', dtCriacao: new Date('2025-06-30T00:00:00.000Z'), saldoIniCents: 100n } as LalurParteBAccount;
    const { service: s2, createJob } = buildService({ entries: [], parteB: [noAno] });
    await expect(s2.generate(scope, makeDto())).rejects.toThrow(/PF-2025.*REGRA_DT_AP_ZERO/);
    expect(createJob).not.toHaveBeenCalled();
    // controle: criada no exercício COM saldo 0 passa
    const { service: s3 } = buildService({ entries: [], parteB: [{ ...noAno, saldoIniCents: 0n } as LalurParteBAccount] });
    await s3.generate(scope, makeDto());
    expect(producedLines().some((l) => l.startsWith('|M010|PF-2025|') && l.includes('|30062025|'))).toBe(true);
  });

  it('item 6 (Fork 6→b): Bloco L só com períodos — L001=0, L030 × 4, L990=6; nenhuma L100/L300', async () => {
    const { service } = buildService();
    await service.generate(scope, makeDto());
    const L = producedLines().filter((l) => l.startsWith('|L'));
    expect(L).toEqual(['|L001|0|', '|L030|01012025|31032025|T01|', '|L030|01042025|30062025|T02|', '|L030|01072025|30092025|T03|', '|L030|01102025|31122025|T04|', '|L990|6|']);
  });

  it('item 7: com ZERO ajustes e zero Parte B, M e N ainda têm 001(0) + 030 × 4 + 990=6', async () => {
    const { service } = buildService({ entries: [], parteB: [] });
    await service.generate(scope, makeDto());
    const lines = producedLines();
    for (const b of ['M', 'N']) {
      const B = lines.filter((l) => l.startsWith(`|${b}`));
      expect(B[0]).toBe(`|${b}001|0|`);
      expect(B.filter((l) => l.startsWith(`|${b}030|`))).toHaveLength(4);
      expect(B[B.length - 1]).toBe(`|${b}990|6|`);
    }
    expect(lines).toContain('|P001|1|');
  });

  it('toSerializerLine: linha persistida cujo código deixou de ser E no catálogo, ou não vigora no ano, é erro explícito — nunca omitida (classe FAIL-1)', async () => {
    const bad = { ...makeEntries()[0], codigo: '2' } as LalurEntryWithRelations; // 2 = CNA
    expect(() => SpedEcfRealGenerationService.toSerializerLine(bad)).toThrow(ValidationError);
    // linha E com DT_INI 2026 persistida para 2025 (só possível por via fora do DTO / catálogo novo) — review I-2
    const stale = { ...makeEntries()[0], codigo: '8.1101' } as LalurEntryWithRelations;
    expect(() => SpedEcfRealGenerationService.toSerializerLine(stale)).toThrow(/8\.1101.*não vigora em 2025/);
    const { service, createJob } = buildService({ entries: [bad] });
    await expect(service.generate(scope, makeDto())).rejects.toBeInstanceOf(ValidationError);
    expect(createJob).not.toHaveBeenCalled();
  });

  it('item 9: 0010 carries FORMA_TRIB / FORMA_APUR / FORMA_TRIB_PER from the DTO (no server default)', async () => {
    const { service } = buildService();
    await service.generate(scope, makeDto());
    expect(producedLines()).toContain('|0010||N|1|T|01|RRRR||C||||2|');
    await service.generate(scope, makeDto({ fiscal: { formaTrib: '3', formaTribPer: 'PPRR', formaApur: 'T', indAliqCsll: '4', indRecReceita: '1' } }));
    const lines = producedLines();
    expect(lines).toContain('|0010||N|3|T|01|PPRR||C||||1|');
    expect(lines.find((l) => l.startsWith('|0020|'))!.startsWith('|0020|4|0|')).toBe(true);
    // O 0010 default do Presumido nunca sai daqui; HASH_ECF_ANTERIOR vazio (Fork 2→d).
    expect(lines).not.toContain('|0010||N|5|T|01|PPPP||C||||2|');
    expect(lines.find((l) => l.startsWith('|0010|'))!.split('|')[2]).toBe('');
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

  it('item 18: audit payload = allowlist de sped.ecf_generated + lalurEntries (CONTAGEM, não conteúdo; sem PII)', async () => {
    const { service, append } = buildService();
    await service.generate(scope, makeDto());
    const input = (append.mock.calls[0] as unknown as [unknown, unknown, { payload: Record<string, unknown> }])[2];
    const allowed = PAYLOAD_ALLOWLIST['sped.ecf_generated'];
    expect(Object.keys(input.payload).sort()).toEqual([...allowed].sort());
    expect(input.payload.kind).toBe('EXPORT_SPED_ECF_REAL');
    expect(input.payload.lalurEntries).toBe('4');
    expect(JSON.stringify(input.payload)).not.toMatch(/Custos do T1|1234,56|PF-2024/);
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

  it('never writes to the ledger: only model reads + job metadata (no posting/journal repo at all)', async () => {
    const { service, findEntriesForYear, findManyParteB, createJob, updateJob } = buildService();
    await service.generate(scope, makeDto());
    expect(findEntriesForYear).toHaveBeenCalledTimes(1);
    expect(findManyParteB).toHaveBeenCalledTimes(1);
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

// ─── ECF Fase 3C (ADR EMENDA 2026-09-12, 3ª) — Parte B fechada, C3, M410/M500, MENOR 17/18/19 ─────

describe('SpedEcfRealGenerationService — ECF 3C', () => {
  const closingsWith = (balances: Array<Record<string, unknown>>) =>
    makeClosings(balances.map((b) => ({ id: 'bal', closingId: 'cl', parteB: parteBIrpj, sdIniCents: 0n, indSdIni: 'C', vlParteACents: 0n, indVlParteA: 'C', vlParteBCents: 0n, indVlParteB: 'C', sdFimCents: 0n, indSdFim: 'C', ...b })) as never);

  it('item 11: trimestre aberto ⇒ 400 nomeando o PRIMEIRO aberto, antes de qualquer job', async () => {
    const { service, createJob } = buildService({ closings: makeClosings().filter((c) => c.quarter !== 'T02') });
    await expect(service.generate(scope, makeDto())).rejects.toThrow(/Feche a Parte B .* de T02\/2025/);
    expect(createJob).not.toHaveBeenCalled();
    expect(savedBuffers).toHaveLength(0);
  });

  it('item 11: divergência materializado × recomputado ⇒ 400 "refeche", nunca arquivo silenciosamente errado', async () => {
    const { service, createJob, diagnoseYear } = buildService({
      divergences: [{ quarter: 'T03', codCtaB: 'PF-2024', codTributo: 'I', field: 'sdFim', materialized: '10', recomputed: '15' }],
    });
    await expect(service.generate(scope, makeDto())).rejects.toThrow(/divergente em T03\/2025: conta 'PF-2024' \(I\) campo sdFim materializado=10 recomputado=15/);
    expect(diagnoseYear).toHaveBeenCalledWith(scope, 2025);
    expect(createJob).not.toHaveBeenCalled();
  });

  it('C3: M010.VL_SALDO_INI é a ABERTURA (balance(N−1,T04).sdFim), não a coluna crua', async () => {
    const { service, openingBalances } = buildService({ entries: [], opening: new Map([['pb-1', -1234n]]) }); // saldo C 12,34 herdado de 2024/T04
    await service.generate(scope, makeDto());
    expect(openingBalances).toHaveBeenCalledWith(scope, 2025, [parteBIrpj]);
    const m010 = producedLines().find((l) => l.startsWith('|M010|PF-2024|'))!;
    expect(m010).toBe('|M010|PF-2024|Prejuízo fiscal 2024|31122024|1000||I|12,34|C||'); // coluna diz 5000,00 D — ignorada
  });

  it('item 5/8: M410(+M415) dos movimentos vivos e M500/M510 das linhas materializadas saem sob o M030 do período; audit conta ajustes', async () => {
    const movement = {
      id: 'mv-1', userId: 'owner-1', unitId: 'unit-1', parteBId: 'pb-1', year: 2025, quarter: 'T02', codTributo: 'I', valorCents: 12345n, indicador: 'PF',
      contrapartidaId: null, historico: 'Prejuízo do período', indLanAnt: 'N', origem: 'system', createdById: null, createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
      parteB: parteBIrpj, contrapartida: null, processos: [{ id: 'p1', parentId: 'mv-1', entryId: null, movementId: 'mv-1', indProc: '1', numProc: '0001' }],
    } as unknown as LalurMovementWithRelations;
    const { service } = buildService({
      entries: [],
      movements: [movement],
      closings: closingsWith([{ sdIniCents: 500000n, indSdIni: 'D', vlParteBCents: 12345n, indVlParteB: 'D', sdFimCents: 512345n, indSdFim: 'D' }]),
    });
    await service.generate(scope, makeDto());
    const lines = producedLines();
    const i410 = lines.findIndex((l) => l === '|M410|PF-2024|I|123,45|PF||Prejuízo do período|N|');
    expect(i410).toBeGreaterThan(-1);
    expect(lines[i410 + 1]).toBe('|M415|1|0001|');
    expect(lines[i410 - 1]).toBe('|M030|01042025|30062025|T02|'); // sob o M030 do T02, sem M300 antes (entries vazio)
    expect(lines.filter((l) => l.startsWith('|M500|'))).toHaveLength(4); // uma por trimestre fechado × 1 conta
    expect(lines.filter((l) => l.startsWith('|M500|'))[0]).toBe('|M500|PF-2024|I|5000,00|D|0,00|C|123,45|D|5123,45|D|');
    expect(lines.filter((l) => l.startsWith('|M510|'))[0]).toBe('|M510|1000|Prejuízo Fiscal Operacional - Atividade Geral|I|5000,00|D|0,00|C|123,45|D|5123,45|D|');
  });

  it('item 6: PF `user` E `system` no mesmo período/tributo ⇒ 400 (ambiguidade REGRA_PREJUIZO_FISCAL)', async () => {
    const base = { userId: 'owner-1', unitId: 'unit-1', parteBId: 'pb-1', year: 2025, quarter: 'T01', codTributo: 'I', valorCents: 1n, indicador: 'PF', contrapartidaId: null, historico: 'x', indLanAnt: 'N', createdById: null, createdAt: new Date(), updatedAt: new Date(), deletedAt: null, parteB: parteBIrpj, contrapartida: null, processos: [] };
    const { service } = buildService({ entries: [], movements: [{ ...base, id: 'a', origem: 'user' }, { ...base, id: 'b', origem: 'system' }] as unknown as LalurMovementWithRelations[] });
    await expect(service.generate(scope, makeDto())).rejects.toThrow(/T01\/2025: existe PF\/BC lançado manualmente E derivado pelo sistema para o tributo I/);
  });

  it('M312/M362 + M315: numLctos vêm de journalLinks.entryNumber (I200.NUM_LCTO); link sem entryNumber é 400', async () => {
    const e = { ...baseEntry, id: 'e1', quarter: 'T01', livro: 'lalur', codigo: '166', valorCents: 50000n, indRelacao: '2', accountId: 'acc-1', account: { id: 'acc-1', code: '3.1.1', nature: 'Revenue', deletedAt: null }, processos: [{ indProc: '2', numProc: 'ADM-9' }], journalLinks: [{ journalEntryId: 'je-1', journalEntry: { entryNumber: 42 } }] } as unknown as LalurEntryWithRelations;
    const { service } = buildService({ entries: [e] });
    await service.generate(scope, makeDto());
    const lines = producedLines();
    const i = lines.findIndex((l) => l.startsWith('|M310|3.1.1|'));
    expect(lines.slice(i + 1, i + 3)).toEqual(['|M312|42|', '|M315|2|ADM-9|']);
    const draft = { ...e, journalLinks: [{ journalEntryId: 'je-2', journalEntry: { entryNumber: null } }] } as unknown as LalurEntryWithRelations;
    await expect(buildService({ entries: [draft] }).service.generate(scope, makeDto())).rejects.toThrow(/sem NUM_LCTO/);
  });

  it('item 17: `|` em texto pré-existente (histLancamento) vira 400 nomeando o campo — não 500', async () => {
    const e = { ...baseEntry, id: 'e1', quarter: 'T01', livro: 'lalur', codigo: '7', valorCents: 1n, indRelacao: '4', histLancamento: 'a|b', processos: [], journalLinks: [] } as unknown as LalurEntryWithRelations;
    const { service, createJob } = buildService({ entries: [e] });
    const p = service.generate(scope, makeDto());
    await expect(p).rejects.toBeInstanceOf(ValidationError);
    await expect(p).rejects.toThrow(/não pode conter '\|'.*separador de campo/);
    expect(createJob).not.toHaveBeenCalled();
  });

  it('item 18: conta contábil com natureza fora de 01..04 (COD_NAT 09) ⇒ 400 na geração', async () => {
    const e = { ...baseEntry, id: 'e1', quarter: 'T01', livro: 'lalur', codigo: '166', valorCents: 1n, indRelacao: '2', accountId: 'acc-9', account: { id: 'acc-9', code: '9.9', nature: 'Memo', deletedAt: null }, processos: [], journalLinks: [] } as unknown as LalurEntryWithRelations;
    await expect(buildService({ entries: [e] }).service.generate(scope, makeDto())).rejects.toThrow(/COD_NAT 09\) fora do domínio 01\.\.04/);
  });

  it('item 19: conta contábil soft-deletada depois do ajuste ⇒ 400 nomeando ajuste e conta (não sai no M310)', async () => {
    const e = { ...baseEntry, id: 'e1', quarter: 'T01', livro: 'lalur', codigo: '166', valorCents: 1n, indRelacao: '2', accountId: 'acc-1', account: { id: 'acc-1', code: '3.1.1', nature: 'Revenue', deletedAt: new Date() }, processos: [], journalLinks: [] } as unknown as LalurEntryWithRelations;
    await expect(buildService({ entries: [e] }).service.generate(scope, makeDto())).rejects.toThrow(/Ajuste e1: a conta contábil '3\.1\.1' foi arquivada/);
  });
});
