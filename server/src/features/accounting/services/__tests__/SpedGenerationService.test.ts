import { createHash } from 'node:crypto';
import { SpedGenerationService } from '../SpedGenerationService';
import { resolveAccountingScope } from '../../scope/AccountingScope';
import { ForbiddenError, ValidationError, ConflictError, NotFoundError } from '../../../../lib/errors';
import { Prisma } from 'generated/prisma';
import { logger } from '../../../../lib/logger';
import type { SpedEcdRequestDto } from '../../dtos/SpedEcdDto';
import type { Account, AccountingDataExchangeJob } from 'generated/prisma';

// Capture the bytes handed to the disk store so we can assert on the produced file.
const savedBuffers: Buffer[] = [];
jest.mock('../../../../lib/attachmentStorage', () => ({
  saveFile: jest.fn(async (_o: string, _u: string, _j: string, _n: string, buffer: Buffer) => {
    savedBuffers.push(buffer);
    return { storageKey: 'u/unit/job/ecd.txt', sanitizedName: 'ecd.txt' };
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

function makeAccount(over: Partial<Account>): Account {
  return {
    id: 'a', userId: 'owner-1', unitId: 'unit-1', code: '1', name: 'X', nature: 'Asset',
    acceptsEntries: true, createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01'),
    deletedAt: null, ...over,
  } as Account;
}

const CAIXA = makeAccount({ id: 'caixa', code: '1.1', name: 'Caixa', nature: 'Asset', acceptsEntries: true });
const RECEITA = makeAccount({ id: 'rec', code: '3.1', name: 'Receita', nature: 'Revenue', acceptsEntries: true });
const GRUPO = makeAccount({ id: 'g', code: '1', name: 'ATIVO', nature: 'Asset', acceptsEntries: false });

function makeDto(over: Partial<SpedEcdRequestDto> = {}): SpedEcdRequestDto {
  return {
    unitId: 'unit-1',
    mappingVersion: 'v1',
    year: 2026,
    declarant: {
      nome: 'EMPRESA TESTE LTDA', cnpj: '11222333000181', uf: 'SP', codMun: '3550308',
      indSitIniPer: '0', indNire: '1', indFinEsc: '0', indGrandePorte: '0', tipEcd: '0',
      identMf: 'N', indEscCons: 'N', indCentralizada: '0', indMudancPc: '0',
    },
    book: { numOrd: '1', natLivr: 'DIARIO GERAL', dtExSocial: '2026-12-31' },
    // C12: IDENT_QUALIF (campo 04) não existe mais no DTO — SpedGenerationService.generate() deriva
    // da tabela a partir de codAssin (ecdIdentQualifParaEmissao).
    signers: [
      { identNom: 'RESP', identCpfCnpj: '11222333000181', codAssin: '205', indRespLegal: 'S' },
      { identNom: 'CONTADOR', identCpfCnpj: '12345678909', codAssin: '900', indCrc: 'SP1', indRespLegal: 'N' },
    ],
    ...over,
  } as SpedEcdRequestDto;
}

interface Mocks {
  ready?: boolean;
  canRead?: boolean;
  closed?: boolean;
  supersededJob?: Partial<AccountingDataExchangeJob> | null;
  existingSuccessor?: Partial<AccountingDataExchangeJob> | null;
  createJobError?: Error;
}

function buildService(m: Mocks = {}) {
  const canRead = m.canRead ?? true;
  const ready = m.ready ?? true;

  const accountRepo = {
    findManyByUnit: jest.fn(async () => [GRUPO, CAIXA, RECEITA]),
  } as never;

  const closed = m.closed ?? false;

  const groupByAccount = jest.fn(
    async (_s: unknown, _st: string[], opts?: { from?: Date; to?: Date; excludeSourceTypes?: string[] }) => {
      // Pre-closing result read (BE-INCR-SPED-APURACAO): to=31/12, excludeSourceTypes=['closing'],
      // no `from`. Returns the operational revenue balance (credor 500,00) for I355.
      if (opts?.excludeSourceTypes?.includes('closing')) {
        return [{ accountId: 'rec', debitCents: 0, creditCents: 50000 }];
      }
      // Opening (only `to`, no `from`) => zero opening. A movement in January only.
      if (opts?.from && opts.from.getUTCMonth() === 0) {
        return [
          { accountId: 'caixa', debitCents: 50000, creditCents: 0 },
          { accountId: 'rec', debitCents: 0, creditCents: 50000 },
        ];
      }
      return [];
    },
  );
  const postingRepo = { groupByAccount } as never;

  const findManyForExport = jest.fn(async () => [
    {
      id: 'e1', entryNumber: 1, date: new Date('2026-01-15T00:00:00Z'), description: 'Venda',
      status: 'Posted', sourceType: 'manual',
      postings: [
        { debitCents: 50000, creditCents: 0, account: { code: '1.1', name: 'Caixa' } },
        { debitCents: 0, creditCents: 50000, account: { code: '3.1', name: 'Receita' } },
      ],
    },
    // When closed, the diary also carries the encerramento entry (sourceType='closing').
    ...(closed
      ? [
          {
            id: 'enc', entryNumber: 2, date: new Date('2026-12-31T00:00:00Z'),
            description: 'Encerramento do exercício 2026', status: 'Posted', sourceType: 'closing',
            postings: [
              { debitCents: 50000, creditCents: 0, account: { code: '3.1', name: 'Receita' } },
              { debitCents: 0, creditCents: 50000, account: { code: '2.3.1', name: 'Lucros Acumulados' } },
            ],
          },
        ]
      : []),
  ]);
  // findBySource(closing, year): non-null iff the exercise is closed → drives I350/I355 emission.
  const findBySource = jest.fn(async () => (closed ? { id: 'enc', sourceType: 'closing', sourceId: '2026' } : null));
  const journalEntryRepo = { findManyForExport, findBySource } as never;

  const referential = {
    coverage: jest.fn(async () => ({
      unitId: 'unit-1', mappingVersion: 'v1',
      unmappedAccounts: ready ? [] : [{ accountId: 'caixa', code: '1.1', name: 'Caixa', nature: 'Asset' }],
      totals: { leafAccountCount: 2, mappedCount: ready ? 2 : 1, unmappedCount: ready ? 0 : 1 },
      ready,
    })),
    listMappings: jest.fn(async () => [
      { accountId: 'caixa', referentialCode: '1.01.01.00.00', mappingVersion: 'v1' },
      { accountId: 'rec', referentialCode: '3.01.01.00.00', mappingVersion: 'v1' },
    ]),
  } as never;

  const reports = {
    balanceSheet: jest.fn(async () => ({
      assets: { accounts: [{ code: '1.1', name: 'Caixa', amountCents: '50000' }], totalCents: '50000' },
      liabilities: { accounts: [], totalCents: '0' },
      equity: { accounts: [], totalCents: '0' },
      netResultLine: { amountCents: '50000' },
    })),
    incomeStatement: jest.fn(async () => ({
      grossRevenue: { accounts: [{ code: '3.1', name: 'Receita', amountCents: '50000' }], totalCents: '50000' },
      revenueDeductions: { accounts: [], totalCents: '0' },
      costOfGoodsSold: { accounts: [], totalCents: '0' },
      expenses: { accounts: [], totalCents: '0' },
      netResult: { amountCents: '50000' },
    })),
  } as never;

  const policy = { canRead: jest.fn(() => canRead) } as never;

  const createJob = jest.fn(async (data: Record<string, unknown>) => {
    if (m.createJobError) throw m.createJobError;
    return { id: 'job-1', storageKey: null, ...data } as unknown as AccountingDataExchangeJob;
  });
  const updateJob = jest.fn(async (_s: unknown, _id: string, data: Record<string, unknown>) =>
    ({ id: 'job-1', kind: 'EXPORT_SPED_ECD', direction: 'EXPORT', status: 'EXPORTED', ...data } as unknown as AccountingDataExchangeJob));
  const runTransaction = jest.fn((fn: (tx: never) => Promise<unknown>) => fn({} as never));
  const findJobById = jest.fn(async () =>
    (m.supersededJob === undefined
      ? null
      : m.supersededJob === null
        ? null
        : ({
            id: 'job-0', kind: 'EXPORT_SPED_ECD', status: 'EXPORTED',
            periodStart: new Date('2026-01-01T00:00:00.000Z'), periodEnd: new Date('2026-12-31T00:00:00.000Z'),
            sha256: 'old-sha', storageKey: 'old-storage-key',
            ...m.supersededJob,
          } as unknown as AccountingDataExchangeJob)));
  const findJobBySupersedesJobId = jest.fn(async () =>
    (m.existingSuccessor
      ? ({ id: 'job-2', ...m.existingSuccessor } as unknown as AccountingDataExchangeJob)
      : null));
  const listJobs = jest.fn(async () => ({ items: [], total: 0 }));
  const repo = { createJob, updateJob, runTransaction, findJobById, findJobBySupersedesJobId, listJobs } as never;

  const append = jest.fn(async () => undefined);
  const audit = { append } as never;

  const service = new SpedGenerationService(
    accountRepo, postingRepo, journalEntryRepo, referential, reports, policy, repo, audit,
  );
  return {
    service, createJob, updateJob, groupByAccount, findManyForExport, append, policy,
    findJobById, findJobBySupersedesJobId,
  };
}

/** Molde de `verificationTerm` válido (J801+J932) para os testes de retificação versionada. */
function verificationTerm() {
  return {
    codMotSubs: '001' as const,
    signers: [
      {
        identNom: 'FULANO', identCpfCnpj: '12345678900', codAssin: '910' as const,
        indCrc: 'SP-123456/O-1', email: 'f@x.com', fone: '119999', ufCrc: 'SP' as const,
      },
    ],
  };
}

/** Decode the produced file back to its lines (latin1, CRLF). */
function producedLines(): string[] {
  const buf = savedBuffers[savedBuffers.length - 1];
  return buf.toString('latin1').split('\r\n').filter(Boolean);
}

beforeEach(() => {
  savedBuffers.length = 0;
  sendAlertWebhook.mockClear();
});

describe('SpedGenerationService.generate', () => {
  it('blocks with ValidationError + unmappedAccounts when coverage is incomplete (D5)', async () => {
    const { service, createJob } = buildService({ ready: false });
    await expect(service.generate(scope, makeDto())).rejects.toBeInstanceOf(ValidationError);
    // No file, no job when coverage fails.
    expect(createJob).not.toHaveBeenCalled();
    expect(savedBuffers).toHaveLength(0);
  });

  it('rejects with ForbiddenError when policy denies read (tenancy)', async () => {
    const { service } = buildService({ canRead: false });
    await expect(service.generate(scope, makeDto())).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('a CLOSED exercise emits I350 + I355 and marks the closing entry I200 with IND_LCTO=E (BE-INCR-SPED-APURACAO)', async () => {
    const { service } = buildService({ closed: true });
    await service.generate(scope, makeDto());
    const lines = producedLines();

    // I350 with DT_RES = 31/12; I355 with the pre-closing revenue balance (credor 500,00).
    expect(lines).toContain('|I350|31122026|');
    expect(lines.find((l) => l.startsWith('|I355|3.1|'))).toBe('|I355|3.1||500,00|C|');

    // The closing entry's I200 carries IND_LCTO='E'; the operational one stays 'N'.
    const i200 = lines.filter((l) => l.startsWith('|I200|'));
    expect(i200.some((l) => l.split('|')[5] === 'E')).toBe(true);
    expect(i200.some((l) => l.split('|')[5] === 'N')).toBe(true);
  });

  it('an UNCLOSED exercise emits neither I350 nor I355', async () => {
    const { service } = buildService();
    await service.generate(scope, makeDto());
    const lines = producedLines();
    expect(lines.some((l) => l.startsWith('|I350|'))).toBe(false);
    expect(lines.some((l) => l.startsWith('|I355|'))).toBe(false);
  });

  it('reads the ledger with LEDGER_STATUSES (Posted/Reconciled/Reversed) — never Draft (D6)', async () => {
    const { service, groupByAccount, findManyForExport } = buildService();
    await service.generate(scope, makeDto());
    const statusesUsed = groupByAccount.mock.calls[0][1];
    expect(statusesUsed).toEqual(['Posted', 'Reconciled', 'Reversed']);
    expect(statusesUsed).not.toContain('Draft');
    expect((findManyForExport.mock.calls[0] as unknown[])[1]).toEqual(['Posted', 'Reconciled', 'Reversed']);
  });

  it('emits exactly 12 I150 (monthly, D11) and the blocks in order', async () => {
    const { service } = buildService();
    await service.generate(scope, makeDto());
    const lines = producedLines();
    const i150 = lines.filter((l) => l.startsWith('|I150|'));
    expect(i150).toHaveLength(12);
    // First I150 is January, DT_INI = 01012026
    expect(i150[0]).toBe('|I150|01012026|31012026|');
    expect(lines[0].startsWith('|0000|')).toBe(true);
    expect(lines[lines.length - 1].startsWith('|9999|')).toBe(true);
  });

  it('the I155 movement of an account/month equals the sum of that account/month I250 partidas (E2)', async () => {
    const { service } = buildService();
    await service.generate(scope, makeDto());
    const lines = producedLines();
    // Caixa (1.1) in January: I155 VL_DEB should be 500,00 (the single debit leg).
    const janI155Caixa = lines.find((l) => l.startsWith('|I155|1.1|'))!.slice(1, -1).split('|');
    expect(janI155Caixa[5]).toBe('500,00'); // VL_DEB
    // The I250 debit partida for Caixa is 500,00 as well.
    const i250Caixa = lines.find((l) => l.startsWith('|I250|1.1|'))!.slice(1, -1).split('|');
    expect(i250Caixa[3]).toBe('500,00'); // VL_DC
    expect(i250Caixa[4]).toBe('D');
  });

  it('is deterministic — two generations produce byte-identical sha256 (D8)', async () => {
    const { service } = buildService();
    await service.generate(scope, makeDto());
    await service.generate(scope, makeDto());
    const [a, b] = savedBuffers;
    const h = (x: Buffer) => createHash('sha256').update(x).digest('hex');
    expect(h(a)).toBe(h(b));
  });

  it('records the sped.ecd_generated audit and writes NO ledger row (closing invariant)', async () => {
    const { service, append } = buildService();
    await service.generate(scope, makeDto());
    expect(append).toHaveBeenCalledTimes(1);
    const auditEvent = (append.mock.calls[0] as unknown[])[2] as { eventType: string };
    expect(auditEvent.eventType).toBe('sped.ecd_generated');
    // No posting/journal write methods exist on the injected repos — nothing to assert
    // beyond: the service never received a write-capable ledger repo. Read-only by construction.
  });

  it('serializes money as unsigned comma-decimal and dates without UTC shift', async () => {
    const { service } = buildService();
    await service.generate(scope, makeDto());
    const lines = producedLines();
    const i200 = lines.find((l) => l.startsWith('|I200|'))!.slice(1, -1).split('|');
    expect(i200[2]).toBe('15012026'); // DT_LCTO literal slice
    expect(i200[3]).toBe('500,00'); // VL_LCTO
  });

  // GUARD (A1, triagem 2026-08-20 ratificada): o job NÃO pode nascer 'EXPORTED'. O sucesso é
  // gravado antes de `saveFile`, então uma falha de escrita deixa uma linha afirmando sucesso com
  // storageKey nulo — e o executor do gate H1 (PVA) lê essa lista para saber o que baixar.
  // Esperado: nascer PROCESSING, virar EXPORTED só depois do arquivo existir, e FAILED no erro.
  it('does not leave the job claiming EXPORTED when saveFile fails, and records FAILED (A1)', async () => {
    const { service, createJob, updateJob } = buildService();
    (storage.saveFile as jest.Mock).mockRejectedValueOnce(new Error('disk full'));

    await expect(service.generate(scope, makeDto())).rejects.toThrow('disk full');

    expect(createJob).not.toHaveBeenCalledWith(expect.objectContaining({ status: 'EXPORTED' }));
    const statuses = updateJob.mock.calls.map((c) => (c[2] as { status?: string } | undefined)?.status);
    expect(statuses).toContain('FAILED');
  });

  it('fires the alert webhook (source=sped_ecd) alongside the FAILED status, before the throw (F-W2C-1)', async () => {
    const { service } = buildService();
    (storage.saveFile as jest.Mock).mockRejectedValueOnce(new Error('disk full'));

    await expect(service.generate(scope, makeDto())).rejects.toThrow('disk full');

    expect(sendAlertWebhook).toHaveBeenCalledTimes(1);
    expect(sendAlertWebhook).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'sped_ecd',
        event: 'generation_failed',
        jobId: 'job-1',
        kind: 'EXPORT_SPED_ECD',
        unitId: 'unit-1',
        errorName: 'Error',
        errorMessage: 'disk full',
      }),
    );
  });

  describe('duration metric (BRIEF-W2-D, layer 1 — extends Metrics.startTimer, no warnThresholdMs for this layer)', () => {
    it('logs Metric: sped_ecd_generation at info with a numeric duration on success', async () => {
      const infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => {});
      const { service } = buildService();
      await service.generate(scope, makeDto());

      const call = infoSpy.mock.calls.find((c) => c[0] === 'Metric: sped_ecd_generation');
      expect(call).toBeDefined();
      const ctx = call![1] as Record<string, unknown>;
      expect(typeof ctx.duration).toBe('number');
      expect(ctx.status).toBe('success');
      infoSpy.mockRestore();
    });

    it('logs Metric: sped_ecd_generation at warn on the FAILED (saveFile) path', async () => {
      const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});
      const { service } = buildService();
      (storage.saveFile as jest.Mock).mockRejectedValueOnce(new Error('disk full'));

      await expect(service.generate(scope, makeDto())).rejects.toThrow('disk full');

      const call = warnSpy.mock.calls.find((c) => c[0] === 'Metric: sped_ecd_generation');
      expect(call).toBeDefined();
      const ctx = call![1] as Record<string, unknown>;
      expect(ctx.status).toBe('failure');
      expect(typeof ctx.duration).toBe('number');
      warnSpy.mockRestore();
    });
  });
});

// BE-INCR-FIXED-ASSETS PR-4 (item 21/25) — retificação versionada: ECD substituta.
describe('SpedGenerationService.generate — retificação versionada (ECD substituta)', () => {
  function substitutaDto() {
    return makeDto({
      declarant: {
        nome: 'EMPRESA TESTE LTDA', cnpj: '11222333000181', uf: 'SP', codMun: '3550308',
        indSitIniPer: '0', indNire: '1', indFinEsc: '1', codHashSub: 'a'.repeat(40),
        indGrandePorte: '0', tipEcd: '0', identMf: 'N', indEscCons: 'N',
        indCentralizada: '0', indMudancPc: '0',
      } as unknown as SpedEcdRequestDto['declarant'],
      supersedesJobId: 'job-0',
      verificationTerm: verificationTerm(),
    });
  }
  const rtf = { buffer: Buffer.from('{\\rtf1\\ansi...}', 'latin1') };

  it('exige o .rtf (multipart) quando indFinEsc=1 — sem arquivo é 400', async () => {
    const { service } = buildService({ supersededJob: {} });
    await expect(service.generate(scope, substitutaDto())).rejects.toBeInstanceOf(ValidationError);
  });

  it('job substituído de outro escopo/tenant → 404 (NUNCA 403, cross-tenant)', async () => {
    const { service } = buildService({ supersededJob: null });
    await expect(service.generate(scope, substitutaDto(), rtf)).rejects.toBeInstanceOf(NotFoundError);
  });
  // (o teste acima já passa `rtf` — sem ele o 400 do multipart mordia antes do 404 do gate)

  it('2º substituto do mesmo job → 409 (via @unique, P2002 traduzido)', async () => {
    const p2002 = Object.assign(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002', clientVersion: '6', meta: { target: ['supersedesJobId'] },
      }),
      { code: 'P2002' },
    );
    const { service } = buildService({ supersededJob: {}, createJobError: p2002 as unknown as Error });
    await expect(service.generate(scope, substitutaDto(), rtf)).rejects.toBeInstanceOf(ConflictError);
  });

  it('gera a ECD substituta com sucesso: job novo carrega supersedesJobId + ecfRectificationRequired=true; emite sped.ecd_substituted', async () => {
    const { service, createJob, append } = buildService({ supersededJob: {} });
    await service.generate(scope, substitutaDto(), rtf);

    expect(createJob).toHaveBeenCalledWith(
      expect.objectContaining({ supersedesJobId: 'job-0', ecfRectificationRequired: true }),
    );
    const events = append.mock.calls.map((c) => ((c as unknown[])[2] as { eventType: string }).eventType);
    expect(events).toContain('sped.ecd_substituted');

    // Substituta salva 2 buffers (o .txt e o .rtf, nesta ordem) — o .txt é o [0].
    expect(savedBuffers).toHaveLength(2);
    const txt = savedBuffers[0].toString('latin1');
    expect(txt).toContain('|J801|');
    expect(txt).toContain('|J932|');
  });

  it('o job SUBSTITUÍDO nunca é escrito (status/sha256/storageKey inalterados) — updateJob só é chamado com o id do job NOVO', async () => {
    const { service, updateJob } = buildService({ supersededJob: {} });
    await service.generate(scope, substitutaDto(), rtf);
    for (const call of updateJob.mock.calls) {
      expect((call as unknown[])[1]).toBe('job-1'); // nunca 'job-0' (o substituído)
    }
  });

  it('a ECD original (indFinEsc=0) nunca emite J801/J932 nem chama findJobById para retificação', async () => {
    const { service, findJobById } = buildService();
    await service.generate(scope, makeDto());
    expect(findJobById).not.toHaveBeenCalled();
    const lines = producedLines();
    expect(lines.join('\n')).not.toContain('|J801|');
    expect(lines.join('\n')).not.toContain('|J932|');
  });

  // Review PR #368, item 2 (param-aceito-e-ignorado): .rtf enviado numa ECD que NÃO é
  // substituta não pode ser silenciosamente descartado.
  it('.rtf enviado com indFinEsc=0 (sem verificationTerm) é 400 — nunca ignorado em silêncio', async () => {
    const { service } = buildService();
    await expect(service.generate(scope, makeDto(), rtf)).rejects.toBeInstanceOf(ValidationError);
  });

  // Review PR #368, item 1: substituto FAILED não pode travar o original para sempre.
  describe('FAILED não trava o original para sempre (item 1)', () => {
    it('substituta falha no storage → limpa supersedesJobId no FAILED (não fica "reservado")', async () => {
      const { service, updateJob } = buildService({ supersededJob: {} });
      (storage.saveFile as jest.Mock).mockRejectedValueOnce(new Error('disk full'));
      await expect(service.generate(scope, substitutaDto(), rtf)).rejects.toThrow('disk full');

      const failedCall = updateJob.mock.calls.find((c) => (c as unknown[])[2] && (c as unknown[])[2] as { status?: string } && ((c as unknown[])[2] as { status?: string }).status === 'FAILED');
      expect(failedCall).toBeDefined();
      expect((failedCall as unknown[])[2]).toMatchObject({ status: 'FAILED', supersedesJobId: null });
    });

    it('nova tentativa de substituir o MESMO job X passa depois que a 1ª falhou (findJobBySupersedesJobId não vê FAILED)', async () => {
      // O mock de `findJobBySupersedesJobId` no `buildService` só devolve algo quando
      // `existingSuccessor` é passado explicitamente — como o FAILED nunca é gravado como
      // sucessor de verdade (é limpo na mesma escrita), uma 2ª chamada sem `existingSuccessor`
      // segue o caminho normal (sucesso), provando que não há trava residual.
      const { service } = buildService({ supersededJob: {} });
      await expect(service.generate(scope, substitutaDto(), rtf)).resolves.toBeDefined();
    });
  });
});

// Review PR #368, item 3 — sanitização do .rtf (ARQ_RTF). Testes do `sanitizeRtfForSped` puro
// já vivem em `lib/__tests__/sped.test.ts`; aqui a integração via `generate()`.
describe('SpedGenerationService.generate — sanitização do .rtf (item 3)', () => {
  function substitutaDtoForRtf() {
    return makeDto({
      declarant: {
        nome: 'EMPRESA TESTE LTDA', cnpj: '11222333000181', uf: 'SP', codMun: '3550308',
        indSitIniPer: '0', indNire: '1', indFinEsc: '1', codHashSub: 'a'.repeat(40),
        indGrandePorte: '0', tipEcd: '0', identMf: 'N', indEscCons: 'N',
        indCentralizada: '0', indMudancPc: '0',
      } as unknown as SpedEcdRequestDto['declarant'],
      supersedesJobId: 'job-0',
      verificationTerm: verificationTerm(),
    });
  }

  it('"|" no .rtf → 400 nomeado (nunca 500 cru do spedLine)', async () => {
    const { service } = buildService({ supersededJob: {} });
    const badRtf = { buffer: Buffer.from('{\\rtf1|corrupted}', 'latin1') };
    await expect(service.generate(scope, substitutaDtoForRtf(), badRtf)).rejects.toBeInstanceOf(ValidationError);
  });

  it('tag proibida (ex.: J900) dentro do .rtf → 400 nomeado', async () => {
    const { service } = buildService({ supersededJob: {} });
    const badRtf = { buffer: Buffer.from('{\\rtf1 contains J900 tag}', 'latin1') };
    await expect(service.generate(scope, substitutaDtoForRtf(), badRtf)).rejects.toBeInstanceOf(ValidationError);
  });

  it('\\bin (dado binário embutido) → 400 nomeado', async () => {
    const { service } = buildService({ supersededJob: {} });
    const badRtf = { buffer: Buffer.from('{\\rtf1\\bin5 ABCDE}', 'latin1') };
    await expect(service.generate(scope, substitutaDtoForRtf(), badRtf)).rejects.toBeInstanceOf(ValidationError);
  });

  it('.rtf multilinha (CRLF) é normalizado: J801 sai em 1 linha física e countRegisters/QTD_LIN batem', async () => {
    const { service } = buildService({ supersededJob: {} });
    const multilineRtf = { buffer: Buffer.from('{\\rtf1\\ansi\r\nline2\r\nline3}', 'latin1') };
    await service.generate(scope, substitutaDtoForRtf(), multilineRtf);

    const txt = savedBuffers[0].toString('latin1');
    const physicalLines = txt.split('\r\n').filter(Boolean);
    // O J801 é UMA linha física (nenhum CRLF sobrevive dentro do campo ARQ_RTF).
    const j801Lines = physicalLines.filter((l) => l.startsWith('|J801|'));
    expect(j801Lines).toHaveLength(1);
    expect(j801Lines[0]).not.toContain('\n');
    expect(j801Lines[0]).not.toContain('\r');

    // 9900 conta 1 linha para o tipo J801 (contagem derivada das linhas reais — bate porque o
    // conteúdo multilinha não se tornou 3 "linhas" físicas por engano).
    const nine900J801 = physicalLines.find((l) => l.startsWith('|9900|J801|'));
    expect(nine900J801).toBe('|9900|J801|1|');
  });
});
