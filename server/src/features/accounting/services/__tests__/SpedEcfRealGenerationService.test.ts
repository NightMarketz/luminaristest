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
import type { LalurEntryWithRelations } from '../../repositories/ILalurRepository';

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
}

function buildService(m: Mocks = {}) {
  const canRead = m.canRead ?? true;

  const findEntriesForYear = jest.fn(async (_s: unknown, _year: number) => m.entries ?? makeEntries());
  const findManyParteB = jest.fn(async (_s: unknown, _f: unknown) => m.parteB ?? [parteBIrpj]);
  const lalurRepo = { findEntriesForYear, findManyParteB } as never;

  const policy = { canRead: jest.fn(() => canRead) } as never;

  const createJob = jest.fn(async (data: Record<string, unknown>) =>
    ({ id: 'job-1', storageKey: null, ...data } as unknown as AccountingDataExchangeJob));
  const updateJob = jest.fn(async (_s: unknown, _id: string, data: Record<string, unknown>) =>
    ({ id: 'job-1', kind: SPED_ECF_REAL_JOB_KIND, direction: 'EXPORT', status: 'EXPORTED', ...data } as unknown as AccountingDataExchangeJob));
  const runTransaction = jest.fn((fn: (tx: never) => Promise<unknown>) => fn({} as never));
  const repo = { createJob, updateJob, runTransaction } as never;

  const append = jest.fn(async () => undefined);
  const audit = { append } as never;

  const service = new SpedEcfRealGenerationService(lalurRepo, policy, repo, audit);
  return { service, createJob, updateJob, findEntriesForYear, findManyParteB, append, policy };
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

  it('toSerializerLine: linha persistida cujo código deixou de ser E no catálogo é erro explícito, nunca omitida (classe FAIL-1)', async () => {
    const bad = { ...makeEntries()[0], codigo: '2' } as LalurEntryWithRelations; // 2 = CNA
    expect(() => SpedEcfRealGenerationService.toSerializerLine(bad)).toThrow(ValidationError);
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
