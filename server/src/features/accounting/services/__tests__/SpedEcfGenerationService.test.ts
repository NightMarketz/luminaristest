import { CANONICAL_ACCOUNTS, RECEITA_NAO_USO_CODE } from '../../fixtures/ChartOfAccountsFixture';
import { SpedEcfGenerationService } from '../SpedEcfGenerationService';
import { resolveAccountingScopeInternal } from '../../scope/resolveAccountingScopeInternal';
import { ForbiddenError, ValidationError } from '../../../../lib/errors';
import { logger } from '../../../../lib/logger';
import type { SpedEcfRequestDto } from '../../dtos/SpedEcfDto';
import type { Account, AccountingDataExchangeJob, Partner } from 'generated/prisma';

// Capture the bytes handed to the disk store so we can assert on the produced file.
const savedBuffers: Buffer[] = [];
jest.mock('../../../../lib/attachmentStorage', () => ({
  saveFile: jest.fn(async (_o: string, _u: string, _j: string, _n: string, buffer: Buffer) => {
    savedBuffers.push(buffer);
    return { storageKey: 'u/unit/job/ecf.txt', sanitizedName: 'ecf.txt' };
  }),
  resolveReadPath: jest.fn((k: string) => `/abs/${k}`),
  deleteFile: jest.fn(async () => undefined),
}));
import * as storage from '../../../../lib/attachmentStorage';
import { legalParamsSemente } from '@test/helpers/legalParams';
const sendAlertWebhook = jest.fn();
jest.mock('../../../../lib/alertWebhook', () => ({
  __esModule: true,
  sendAlertWebhook: (...a: unknown[]) => sendAlertWebhook(...a),
}));

const scope = resolveAccountingScopeInternal({ userId: 'owner-1' }, 'unit-1');

function makeAccount(over: Partial<Account>): Account {
  return {
    id: 'a', userId: 'owner-1', unitId: 'unit-1', code: '1', name: 'X', nature: 'Asset',
    acceptsEntries: true, createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01'),
    deletedAt: null, ...over,
  } as Account;
}

const GRUPO_REC = makeAccount({ id: 'g3', code: '3', name: 'Receita', nature: 'Revenue', acceptsEntries: false });
const SERVICO = makeAccount({ id: 'rec31', code: '3.1', name: 'Receita de Serviços', nature: 'Revenue', acceptsEntries: true });
const REVENDA = makeAccount({ id: 'rec33', code: '3.3', name: 'Receita de Revenda', nature: 'Revenue', acceptsEntries: true });
const REC_FIN = makeAccount({ id: 'rec39', code: '3.9', name: 'Receita Financeira', nature: 'Revenue', acceptsEntries: true });

/** BE-INCR-ECF-Y600: uma vigência do cadastro de sócios (IRRF-DISTRIBUICAO PR-1). CPF com DV válido. */
function makePartner(over: Partial<Partner> = {}): Partner {
  return {
    id: 'p-1', userId: 'owner-1', nome: 'SOCIA UNICA', taxId: '52998224725', tipoPessoa: 'PF', residenteBrasil: true,
    participacaoBp: 10000, entradaEm: '2020-01-01', saidaEm: null, createdById: 'owner-1',
    createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01'), deletedAt: null, ...over,
  } as Partner;
}
const Y600_ZEROS = { remTrabCents: 0, lucDivCents: 0, jurCapCents: 0, demRendCents: 0, irRetCents: 0 };

// Y600: `over` aceita literais soltos (qualif como string) — o cast final é o mesmo de antes.
function makeDto(over: Partial<Record<keyof SpedEcfRequestDto, unknown>> = {}): SpedEcfRequestDto {
  return {
    unitId: 'unit-1',
    year: 2025,
    declarant: {
      cnpj: '11222333000181', nome: 'SALAO TESTE LTDA', codNat: '2062', cnaeFiscal: '9602501',
      endereco: 'RUA DAS FLORES', num: '100', bairro: 'CENTRO', uf: 'DF', codMun: '5300108',
      cep: '70000000', numTel: '6133334444', email: 'salao@teste.com',
    },
    fiscal: { indAliqCsll: '1', indRecReceita: '2' },
    signers: [
      { identNom: 'CONTADOR', identCpfCnpj: '12345678900', identQualif: '900', indCrc: '1DF123', email: 'c@d.com', fone: '6133334444' },
      { identNom: 'SOCIO', identCpfCnpj: '98765432100', identQualif: '205', email: 's@d.com', fone: '6133335555' },
    ],
    // BE-INCR-ECF-Y600: complemento ECF da vigência default do cadastro (`makePartner`), valores zero explícitos.
    socios: [{ partnerId: 'p-1', qualif: '02', valores: Y600_ZEROS }],
    dirigentes: [],
    ...over,
  } as SpedEcfRequestDto;
}

interface Mocks {
  canRead?: boolean;
  accounts?: Account[];
  extraRevenueMove?: boolean; // add movement on a non-3.1/3.3 revenue account
  extraRevenueAccountId?: string; // which account receives that movement (default rec39)
  /** F-PCB-1R: débito de PIS/COFINS sobre a receita (ano e trimestre) nestas contas. */
  deducaoMoveIds?: string[];
  /** Perfil fiscal do escopo (só os 2 campos que o gate lê); `null` = sem perfil. */
  perfil?: { pisDespesaAccountId: string | null; cofinsDespesaAccountId: string | null } | null;
  /** BE-INCR-ECF-Y600: vigências vivas do cadastro de sócios (default: uma, `makePartner()`). */
  partners?: Partner[];
}

function buildService(m: Mocks = {}) {
  const canRead = m.canRead ?? true;
  const accounts = m.accounts ?? [GRUPO_REC, SERVICO, REVENDA];

  const accountRepo = { findManyByUnit: jest.fn(async () => accounts) } as never;

  const groupByAccount = jest.fn(
    async (_s: unknown, _st: string[], opts?: { from?: Date; to?: Date }) => {
      const toM = opts?.to?.getUTCMonth();
      const fromM = opts?.from?.getUTCMonth();
      const isYear = fromM === 0 && toM === 11;
      const rows = [
        // 3.1 serviço: 150k/tri (600k ano); 3.3 revenda: 50k/tri (200k ano). Crédito líquido.
        { accountId: 'rec31', debitCents: 0, creditCents: isYear ? 60000000 : 15000000 },
        { accountId: 'rec33', debitCents: 0, creditCents: isYear ? 20000000 : 5000000 },
      ];
      for (const id of m.deducaoMoveIds ?? []) rows.push({ accountId: id, debitCents: isYear ? 2190000 : 547500, creditCents: 0 });
      if (m.extraRevenueMove) {
        rows.push({ accountId: m.extraRevenueAccountId ?? 'rec39', debitCents: 0, creditCents: isYear ? 4000000 : 1000000 });
      }
      return rows;
    },
  );
  const postingRepo = { groupByAccount } as never;

  const policy = { canRead: jest.fn(() => canRead) } as never;

  const createJob = jest.fn(async (data: Record<string, unknown>) =>
    ({ id: 'job-1', storageKey: null, ...data } as unknown as AccountingDataExchangeJob));
  const updateJob = jest.fn(async (_s: unknown, _id: string, data: Record<string, unknown>) =>
    ({ id: 'job-1', kind: 'EXPORT_SPED_ECF', direction: 'EXPORT', status: 'EXPORTED', ...data } as unknown as AccountingDataExchangeJob));
  const runTransaction = jest.fn((fn: (tx: never) => Promise<unknown>) => fn({} as never));
  const repo = { createJob, updateJob, runTransaction } as never;

  const append = jest.fn(async () => undefined);
  const audit = { append } as never;

  const fiscalProfileRepo = { findByScope: jest.fn(async () => m.perfil ?? null) } as never;

  const partnerList = jest.fn(async (_s: unknown) => m.partners ?? [makePartner()]);

  const service = new SpedEcfGenerationService(accountRepo, postingRepo, policy, repo, audit, legalParamsSemente, fiscalProfileRepo, { list: partnerList });
  return { service, createJob, updateJob, groupByAccount, append, policy, partnerList };
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

describe('SpedEcfGenerationService.generate', () => {
  it('rejects with ForbiddenError when policy denies read', async () => {
    const { service, createJob } = buildService({ canRead: false });
    await expect(service.generate(scope, makeDto())).rejects.toBeInstanceOf(ForbiddenError);
    expect(createJob).not.toHaveBeenCalled();
    expect(savedBuffers).toHaveLength(0);
  });

  it('blocks with ValidationError + unmappedRevenueAccounts when a Revenue account is not 3.1/3.3 (exhaustiveness gate)', async () => {
    // 3.9 Receita Financeira has movement but no presunção line → would escape the base.
    const { service, createJob } = buildService({
      accounts: [GRUPO_REC, SERVICO, REVENDA, REC_FIN],
      extraRevenueMove: true,
    });
    await expect(service.generate(scope, makeDto())).rejects.toBeInstanceOf(ValidationError);
    // The FAIL-1 guard: no silent drop, no file, no job.
    expect(createJob).not.toHaveBeenCalled();
    expect(savedBuffers).toHaveLength(0);
  });

  // BE-INCR-H1-REFERENCIAL-3-4 item 4 (decisão (b) do dono, 2026-10-11 — D-2026-10-11-QUESTIONARIO-DONO): a 3.4
  // Receita de Pacotes Não Utilizados é receita bruta da atividade (DL 1.598 art. 12 IV), presunção de serviço. Antes
  // (BE-INCR-PACOTE-VALIDADE item 13, F-PV-4 a) ela reprovava o gate "até o PE-2"; a PE-2 fechou por delegação (D-1).
  it('ECF Presumido com movimento na 3.4 (pacote vencido) gera o arquivo e soma a 3.4 no P200(8)/P400(4) de serviço', async () => {
    const naoUso = CANONICAL_ACCOUNTS.find((a) => a.code === RECEITA_NAO_USO_CODE)!;
    const REC_NAO_USO = makeAccount({ id: 'rec34', code: naoUso.code, name: naoUso.name, nature: naoUso.nature, acceptsEntries: naoUso.acceptsEntries });
    const { service } = buildService({
      accounts: [GRUPO_REC, SERVICO, REVENDA, REC_NAO_USO],
      extraRevenueMove: true,
      extraRevenueAccountId: 'rec34',
    });
    await service.generate(scope, makeDto());
    const lines = producedLines();
    // 3.1 150.000,00 + 3.4 10.000,00 por trimestre = 160.000,00 de serviço; revenda intacta.
    expect(lines).toContain('|P200|8||160000,00|');
    expect(lines).toContain('|P400|4||160000,00|');
    expect(lines).toContain('|P200|4||50000,00|');
  });

  // Item 4 (invariância): a 3.4 sem movimento não muda um byte do arquivo.
  it('3.4 sem movimento: arquivo byte a byte igual ao do plano sem a 3.4', async () => {
    const REC_NAO_USO = makeAccount({ id: 'rec34', code: RECEITA_NAO_USO_CODE, name: 'Receita de Pacotes Não Utilizados', nature: 'Revenue', acceptsEntries: true });
    await buildService({ accounts: [GRUPO_REC, SERVICO, REVENDA] }).service.generate(scope, makeDto());
    const sem = savedBuffers[savedBuffers.length - 1];
    await buildService({ accounts: [GRUPO_REC, SERVICO, REVENDA, REC_NAO_USO] }).service.generate(scope, makeDto());
    const com = savedBuffers[savedBuffers.length - 1];
    expect(com.equals(sem)).toBe(true);
  });

  // Item 1 (guarda): o mapa não virou "toda Revenue" — a 3.2 Devoluções com movimento continua 400.
  it('3.2 Devoluções com movimento continua reprovando o gate de exaustividade', async () => {
    const DEVOL = makeAccount({ id: 'rec32', code: '3.2', name: 'Devoluções de Vendas', nature: 'Revenue', acceptsEntries: true });
    const { service, createJob } = buildService({ accounts: [GRUPO_REC, SERVICO, REVENDA, DEVOL], extraRevenueMove: true, extraRevenueAccountId: 'rec32' });
    const err = await service.generate(scope, makeDto()).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ValidationError);
    expect((err as ValidationError).details).toEqual({ unmappedRevenueAccounts: [{ code: '3.2', name: 'Devoluções de Vendas' }] });
    expect(createJob).not.toHaveBeenCalled();
  });

  // F-PCB-1R (a), dono 13/10 — o teste (f) do F-PCB-1: PIS/COFINS sobre a receita é dedução (Revenue, saldo devedor);
  // as 2 contas do perfil saem do gate e a ECF gera, com a base presumida intacta (a dedução não reduz a receita bruta).
  describe('F-PCB-1R — contas de dedução de PIS/COFINS do perfil', () => {
    const PIS = makeAccount({ id: 'rec361', code: '3.6.1', name: 'PIS sobre a receita', nature: 'Revenue', acceptsEntries: true });
    const COFINS = makeAccount({ id: 'rec362', code: '3.6.2', name: 'COFINS sobre a receita', nature: 'Revenue', acceptsEntries: true });
    const accounts = [GRUPO_REC, SERVICO, REVENDA, PIS, COFINS];

    it('configuradas no perfil e com movimento ⇒ a ECF gera, P200/P400 sem a dedução', async () => {
      const { service, createJob } = buildService({
        accounts,
        deducaoMoveIds: ['rec361', 'rec362'],
        perfil: { pisDespesaAccountId: 'rec361', cofinsDespesaAccountId: 'rec362' },
      });
      await expect(service.generate(scope, makeDto())).resolves.toBeDefined();
      expect(createJob).toHaveBeenCalled();
      expect(producedLines()).toContain('|P200|8||150000,00|');
      expect(producedLines()).toContain('|P200|4||50000,00|');
    });

    it('a mesma conta com movimento, fora do perfil ⇒ 400 (exatamente as contas configuradas, não o prefixo)', async () => {
      const { service } = buildService({
        accounts,
        deducaoMoveIds: ['rec361', 'rec362'],
        perfil: { pisDespesaAccountId: 'rec361', cofinsDespesaAccountId: null },
      });
      const err = await service.generate(scope, makeDto()).catch((e: unknown) => e);
      expect(err).toBeInstanceOf(ValidationError);
      expect((err as ValidationError).details).toEqual({ unmappedRevenueAccounts: [{ code: '3.6.2', name: 'COFINS sobre a receita' }] });
    });

    it('sem perfil fiscal ⇒ o gate reprova as duas, como antes', async () => {
      const { service } = buildService({ accounts, deducaoMoveIds: ['rec361', 'rec362'], perfil: null });
      const err = await service.generate(scope, makeDto()).catch((e: unknown) => e);
      expect((err as ValidationError).details).toEqual({
        unmappedRevenueAccounts: [
          { code: '3.6.1', name: 'PIS sobre a receita' },
          { code: '3.6.2', name: 'COFINS sobre a receita' },
        ],
      });
    });
  });

  it('does NOT block when the extra Revenue account has ZERO movement', async () => {
    // 3.9 present but no movement (extraRevenueMove=false) → gate passes.
    const { service } = buildService({ accounts: [GRUPO_REC, SERVICO, REVENDA, REC_FIN] });
    await expect(service.generate(scope, makeDto())).resolves.toBeDefined();
  });

  it('segregates receita bruta by activity per trimester and records an EXPORT_SPED_ECF job', async () => {
    const { service, createJob, updateJob, append } = buildService();
    await service.generate(scope, makeDto());

    const lines = producedLines();
    // Four quarterly periods (D3).
    expect(lines.filter((l) => l.startsWith('|P030|'))).toHaveLength(4);
    // 3.1 → P200(8) 32% IRPJ & P400(4) 32% CSLL; 3.3 → P200(4) 8% & P400(2) 12%.
    expect(lines).toContain('|P200|8||150000,00|');
    expect(lines).toContain('|P400|4||150000,00|');
    expect(lines).toContain('|P200|4||50000,00|');
    expect(lines).toContain('|P400|2||50000,00|');
    // Job carries the ECF kind and the file metadata. Nasce PROCESSING (A1) e só vira EXPORTED
    // depois que o arquivo existe — a expectativa anterior (`status: 'EXPORTED'` no createJob)
    // codificava o contrato defeituoso.
    expect(createJob).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'EXPORT_SPED_ECF', direction: 'EXPORT', status: 'PROCESSING', mimeType: 'text/plain',
    }));
    expect(updateJob).toHaveBeenCalledWith(
      scope, 'job-1', expect.objectContaining({ status: 'EXPORTED' }), expect.anything(),
    );
    // Audit event in the same tx.
    expect(append).toHaveBeenCalledWith(
      expect.anything(), scope,
      expect.objectContaining({ eventType: 'sped.ecf_generated', targetType: 'data_exchange_job' }),
    );
  });

  it('emits 0010 as Lucro Presumido (FORMA_TRIB=5, FORMA_APUR=T, TIP_ESC_PRE=C)', async () => {
    const { service } = buildService();
    await service.generate(scope, makeDto());
    expect(producedLines()).toContain('|0010||N|5|T|01|PPPP||C||||2|');
  });

  it('writes ISO-8859-1 (latin1) bytes, CRLF-terminated, 0000…9999', async () => {
    const { service } = buildService();
    await service.generate(scope, makeDto());
    const buf = savedBuffers[savedBuffers.length - 1];
    const text = buf.toString('latin1');
    expect(text.endsWith('\r\n')).toBe(true);
    const lines = producedLines();
    expect(lines[0].startsWith('|0000|')).toBe(true);
    expect(lines[lines.length - 1].startsWith('|9999|')).toBe(true);
  });

  it('is byte-deterministic (two generations produce the same sha256)', async () => {
    const { service } = buildService();
    await service.generate(scope, makeDto());
    const first = savedBuffers[savedBuffers.length - 1].toString('latin1');
    await service.generate(scope, makeDto());
    const second = savedBuffers[savedBuffers.length - 1].toString('latin1');
    expect(first).toBe(second);
  });

  it('never writes to the ledger (no posting/journal create-update): only reads + job metadata', async () => {
    const { service, groupByAccount } = buildService();
    await service.generate(scope, makeDto());
    // groupByAccount is a read; the service holds no posting/journal write repo at all.
    expect(groupByAccount).toHaveBeenCalled();
    // 1 year read (gate) + 4 quarter reads.
    expect(groupByAccount).toHaveBeenCalledTimes(5);
  });

  // GUARD (lacuna 10, cédula D-2026-10-28-LACUNAS-EXECUTA-27-28): o arquivo já foi gravado e a
  // tx do EXPORTED falha (aqui, a auditoria dentro dela). O rollback desfaz o EXPORTED, e nada
  // fora da tx volta o job: ele fica PROCESSING para sempre, com o artefato órfão no disco.
  // Esperado: FAILED gravado FORA da tx que falhou, o arquivo apagado, e o erro relançado.
  it('does not leave the job PROCESSING when the EXPORTED tx fails after the file was written (lacuna 10)', async () => {
    const { service, updateJob, append } = buildService();
    append.mockRejectedValueOnce(new Error('audit insert failed'));

    await expect(service.generate(scope, makeDto())).rejects.toThrow('audit insert failed');

    const outOfTx = updateJob.mock.calls
      .filter((c) => (c as unknown[])[3] === undefined)
      .map((c) => c[2] as { status?: string; supersedesJobId?: string | null });
    const lastOutOfTx = outOfTx[outOfTx.length - 1];
    expect(lastOutOfTx?.status).toBe('FAILED');
    expect(lastOutOfTx).toEqual(expect.objectContaining({ supersedesJobId: null }));
    expect(storage.deleteFile).toHaveBeenCalledWith('u/unit/job/ecf.txt');
  });

  // GUARD (A1, triagem 2026-08-20 ratificada) — mesmo defeito do ECD, segundo sítio dos três.
  // Ver a nota da classe em SpedGenerationService.test.ts.
  it('does not leave the job claiming EXPORTED when saveFile fails, and records FAILED (A1)', async () => {
    const { service, createJob, updateJob } = buildService();
    (storage.saveFile as jest.Mock).mockRejectedValueOnce(new Error('disk full'));

    await expect(service.generate(scope, makeDto())).rejects.toThrow('disk full');

    expect(createJob).not.toHaveBeenCalledWith(expect.objectContaining({ status: 'EXPORTED' }));
    const statuses = updateJob.mock.calls.map((c) => (c[2] as { status?: string } | undefined)?.status);
    expect(statuses).toContain('FAILED');
  });

  it('fires the alert webhook (source=sped_ecf) alongside the FAILED status, before the throw (F-W2C-1)', async () => {
    const { service } = buildService();
    (storage.saveFile as jest.Mock).mockRejectedValueOnce(new Error('disk full'));

    await expect(service.generate(scope, makeDto())).rejects.toThrow('disk full');

    expect(sendAlertWebhook).toHaveBeenCalledTimes(1);
    expect(sendAlertWebhook).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'sped_ecf',
        event: 'generation_failed',
        jobId: 'job-1',
        kind: 'EXPORT_SPED_ECF',
        unitId: 'unit-1',
        errorName: 'Error',
        errorMessage: 'disk full',
      }),
    );
  });

  describe('duration metric (BRIEF-W2-D, layer 1 — extends Metrics.startTimer, no warnThresholdMs for this layer)', () => {
    it('logs Metric: sped_ecf_generation at info with a numeric duration on success', async () => {
      const infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => {});
      const { service } = buildService();
      await service.generate(scope, makeDto());

      const call = infoSpy.mock.calls.find((c) => c[0] === 'Metric: sped_ecf_generation');
      expect(call).toBeDefined();
      const ctx = call![1] as Record<string, unknown>;
      expect(typeof ctx.duration).toBe('number');
      expect(ctx.status).toBe('success');
      infoSpy.mockRestore();
    });

    it('logs Metric: sped_ecf_generation at warn on the FAILED (saveFile) path', async () => {
      const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});
      const { service } = buildService();
      (storage.saveFile as jest.Mock).mockRejectedValueOnce(new Error('disk full'));

      await expect(service.generate(scope, makeDto())).rejects.toThrow('disk full');

      const call = warnSpy.mock.calls.find((c) => c[0] === 'Metric: sped_ecf_generation');
      expect(call).toBeDefined();
      const ctx = call![1] as Record<string, unknown>;
      expect(ctx.status).toBe('failure');
      expect(typeof ctx.duration).toBe('number');
      warnSpy.mockRestore();
    });
  });
});

describe('SpedEcfGenerationService.generate — L6: texto fora do Latin-1 (RUNBOOK-H1, PVA 13/10)', () => {
  // Mesma classe dos 173 erros do PVA da ECD em 13/10: Buffer.from(…, 'latin1') trunca o code point, e o "—"
  // (U+2014) sai como o byte 0x14. Decisão do dono (13/10): transliterar a pontuação tipográfica.
  it('translitera "—" e aspas curvas no 0000.NOME, sem byte de controle no arquivo', async () => {
    const { service } = buildService();
    const dto = makeDto();
    await service.generate(scope, { ...dto, declarant: { ...dto.declarant, nome: 'SALAO \u2014 TESTE \u201cX\u201d LTDA' } });
    const buf = savedBuffers[savedBuffers.length - 1];
    expect([...buf].filter((b) => (b < 0x20 && b !== 0x0d && b !== 0x0a) || (b >= 0x7f && b <= 0x9f))).toEqual([]);
    expect(producedLines()[0]).toContain('|SALAO - TESTE "X" LTDA|');
  });
});

// ─── L11 / BE-INCR-ECF-Y600 itens 8–12 (forks F-Y600-1..10 → a; Manual ECF L12 pp. 56, 570–575) ─────────────

describe('SpedEcfGenerationService.generate — Y600 (BE-INCR-ECF-Y600)', () => {
  const y600Lines = () => producedLines().filter((l) => l.startsWith('|Y600|'));
  const complemento = (partnerId: string, over: Record<string, unknown> = {}) => ({ partnerId, qualif: '02', valores: Y600_ZEROS, ...over });

  it('item 8: lê o cadastro pelo repositório e só as vigências vivas que cruzam o ano entram', async () => {
    const partners = [
      makePartner({ id: 'p-1' }),
      makePartner({ id: 'p-antes', taxId: '11144477735', nome: 'SAIU EM 2024', saidaEm: '2024-12-31' }),
      makePartner({ id: 'p-depois', taxId: '39053344705', nome: 'ENTRA EM 2026', entradaEm: '2026-01-01' }),
    ];
    const { service, partnerList } = buildService({ partners });
    await service.generate(scope, makeDto({ socios: [complemento('p-1')] }));
    expect(partnerList).toHaveBeenCalledWith(scope);
    expect(y600Lines()).toEqual(['|Y600|01012020||105|PF|52998224725|SOCIA UNICA|02|100|100|||0,00|0,00|0,00|0,00|0,00|']);
    expect(producedLines()).toContain('|Y001|0|');
    expect(producedLines()).toContain('|Y990|3|');
  });

  it('item 9: complemento de partnerId inexistente ou fora do ano → 400 ECF_Y600_PARTNER_FORA_DO_ANO, sem job', async () => {
    const partners = [makePartner({ id: 'p-1' }), makePartner({ id: 'p-antes', taxId: '11144477735', saidaEm: '2024-12-31' })];
    for (const id of ['nao-existe', 'p-antes']) {
      const { service, createJob } = buildService({ partners });
      const err = await service.generate(scope, makeDto({ socios: [complemento('p-1'), complemento(id)] })).catch((e) => e);
      expect(err).toBeInstanceOf(ValidationError);
      expect(err.errorCode).toBe('ECF_Y600_PARTNER_FORA_DO_ANO');
      expect(err.message).toContain(id);
      expect(createJob).not.toHaveBeenCalled();
    }
  });

  it('item 9: vigência do ano sem complemento → 400 ECF_Y600_COMPLEMENTO_FALTANDO listando o partnerId, sem nome nem CPF', async () => {
    const partners = [makePartner({ id: 'p-1' }), makePartner({ id: 'p-2', taxId: '11144477735', nome: 'SEM COMPLEMENTO' })];
    const err = await buildService({ partners }).service.generate(scope, makeDto({ socios: [complemento('p-1')] })).catch((e) => e);
    expect(err.errorCode).toBe('ECF_Y600_COMPLEMENTO_FALTANDO');
    expect(err.message).toContain('p-2');
    expect(err.message).not.toContain('SEM COMPLEMENTO');
    expect(err.message).not.toContain('11144477735');
  });

  it('item 9 (F-Y600-10): residente com pais, ou não residente sem pais → 400 ECF_Y600_PAIS_INCOERENTE', async () => {
    const r1 = await buildService().service.generate(scope, makeDto({ socios: [complemento('p-1', { pais: '249' })] })).catch((e) => e);
    expect(r1.errorCode).toBe('ECF_Y600_PAIS_INCOERENTE');
    const ext = [makePartner({ residenteBrasil: false })];
    const r2 = await buildService({ partners: ext }).service.generate(scope, makeDto({ socios: [complemento('p-1', { qualif: '05' })] })).catch((e) => e);
    expect(r2.errorCode).toBe('ECF_Y600_PAIS_INCOERENTE');
  });

  it('item 9 (M11): QUALIF incompatível com tipo de pessoa × residência → 400 ECF_Y600_QUALIF_INCOERENTE; os 4 casos válidos passam', async () => {
    const pj = { taxId: '11222333000181', tipoPessoa: 'PJ', nome: 'HOLDING SA' };
    const casos: Array<[Record<string, unknown>, Record<string, unknown>, boolean]> = [
      [{}, { qualif: '03' }, false], // Brasil PF não aceita 03
      [{}, { qualif: '09' }, true],
      [pj, { qualif: '01' }, false], // Brasil PJ só 03/04
      [pj, { qualif: '04' }, true],
      [{ residenteBrasil: false }, { qualif: '02', pais: '249' }, false], // exterior PF só 05/06/14
      [{ residenteBrasil: false }, { qualif: '14', pais: '249' }, true],
      [{ ...pj, residenteBrasil: false }, { qualif: '05', pais: '249' }, false], // exterior PJ só 07/08
      [{ ...pj, residenteBrasil: false }, { qualif: '08', pais: '249' }, true],
      [pj, { qualif: '03', representanteLegal: { cpf: '52998224725', qualif: '03' } }, false], // rep. de PJ só 01/06
      [pj, { qualif: '03', representanteLegal: { cpf: '52998224725', qualif: '06' } }, true],
    ];
    for (const [p, c, ok] of casos) {
      const res = await buildService({ partners: [makePartner(p)] }).service.generate(scope, makeDto({ socios: [complemento('p-1', c)] })).then(() => 'ok', (e) => e.errorCode);
      expect([p, c, res]).toEqual([p, c, ok ? 'ok' : 'ECF_Y600_QUALIF_INCOERENTE']);
    }
  });

  it('item 10 (F-Y600-4): uma ocorrência por vigência; mudança de participação não é saída; saída de fato preenche DT_FIM_SOC', async () => {
    const partners = [
      makePartner({ id: 'v1', participacaoBp: 6000, saidaEm: '2025-06-30' }), // muda para 40% em 01/07
      makePartner({ id: 'v2', participacaoBp: 4000, entradaEm: '2025-07-01' }),
      makePartner({ id: 'x1', taxId: '11144477735', nome: 'SAIU', participacaoBp: 6000, entradaEm: '2019-05-10', saidaEm: '2025-09-15' }),
    ];
    const socios = [
      complemento('v1', { valores: { ...Y600_ZEROS, lucDivCents: 100 } }),
      complemento('v2', { valores: { ...Y600_ZEROS, lucDivCents: 300 } }),
      complemento('x1', { qualif: '01', percCapVotBp: 0 }),
    ];
    await buildService({ partners }).service.generate(scope, makeDto({ socios }));
    expect(y600Lines()).toEqual([
      // vigente em DT_FIN primeiro; depois as demais por DT_ALT_SOC decrescente (item 3)
      '|Y600|01072025||105|PF|52998224725|SOCIA UNICA|02|40,00|40,00|||0,00|3,00|0,00|0,00|0,00|',
      '|Y600|01012020||105|PF|52998224725|SOCIA UNICA|02|60,00|60,00|||0,00|1,00|0,00|0,00|0,00|',
      '|Y600|10052019|15092025|105|PF|11144477735|SAIU|01|60,00|0,00|||0,00|0,00|0,00|0,00|0,00|',
    ]);
  });

  it('item 10: não residente sai com o PAIS do complemento e CPF_CNPJ vazio; representante legal no par 11–12', async () => {
    const partners = [makePartner({ residenteBrasil: false })];
    await buildService({ partners }).service.generate(
      scope,
      makeDto({ socios: [complemento('p-1', { qualif: '06', pais: '249', representanteLegal: { cpf: '11144477735', qualif: '01' } })] }),
    );
    expect(y600Lines()).toEqual(['|Y600|01012020||249|PF||SOCIA UNICA|06|100|100|11144477735|01|0,00|0,00|0,00|0,00|0,00|']);
  });

  it('item 5: dirigente não sócio sai com PAIS 105, PF e percentuais 0', async () => {
    const dirigentes = [{ nome: 'DIRETORA', cpf: '11144477735', qualif: '10', dtAltSoc: '2023-02-01', valores: { ...Y600_ZEROS, remTrabCents: 500000 } }];
    await buildService().service.generate(scope, makeDto({ socios: [complemento('p-1')], dirigentes }));
    expect(y600Lines()).toEqual([
      '|Y600|01022023||105|PF|11144477735|DIRETORA|10|0,00|0,00|||5000,00|0,00|0,00|0,00|0,00|',
      '|Y600|01012020||105|PF|52998224725|SOCIA UNICA|02|100|100|||0,00|0,00|0,00|0,00|0,00|',
    ]);
  });

  it('item 11 (F-Y600-7): cadastro vazio no ano e sem dirigentes → 400 ECF_Y600_SEM_SOCIOS antes de gerar', async () => {
    const { service, createJob } = buildService({ partners: [] });
    const err = await service.generate(scope, makeDto({ socios: [] })).catch((e) => e);
    expect(err).toBeInstanceOf(ValidationError);
    expect(err.errorCode).toBe('ECF_Y600_SEM_SOCIOS');
    expect(createJob).not.toHaveBeenCalled();
    expect(savedBuffers).toHaveLength(0);
  });

  it('item 11 (F-Y600-8): soma das participações ≠ 100% em DT_FIN não bloqueia', async () => {
    const partners = [makePartner({ participacaoBp: 3000 })];
    await expect(buildService({ partners }).service.generate(scope, makeDto({ socios: [complemento('p-1')] }))).resolves.toBeDefined();
    expect(y600Lines()).toHaveLength(1);
  });

  it('item 3 (F-Y600-6): mais de 500 vigentes → 400 ECF_Y600_LIMITE, sem truncar', async () => {
    const dirigentes = Array.from({ length: 501 }, (_, i) => ({ nome: `D${i}`, cpf: '11144477735', qualif: '10', dtAltSoc: '2023-02-01', valores: Y600_ZEROS }));
    const err = await buildService({ partners: [] }).service.generate(scope, makeDto({ socios: [], dirigentes })).catch((e) => e);
    expect(err.errorCode).toBe('ECF_Y600_LIMITE');
  });

  it('item 12: o payload auditado não ganha nome nem CPF/CNPJ de sócio', async () => {
    const { service, append } = buildService();
    await service.generate(scope, makeDto());
    const payloads = JSON.stringify((append.mock.calls as unknown[][]).map((c) => (c[2] as { payload: unknown }).payload));
    expect(payloads).not.toContain('52998224725');
    expect(payloads).not.toContain('SOCIA UNICA');
  });
});
