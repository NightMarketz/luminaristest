const findTableByInternalName = jest.fn(async (_u: string, name: string) => (name === 'units' ? { id: 'tbl-units' } : null));
const findDataById = jest.fn(async (id: string) => (id === 'unit-1' ? { id, data: { cnpj: '11222333000181' } } : null));

// Seleção real, com override para o caso "emite o tipo mas não inutiliza" (nenhum adaptador real é assim hoje).
let mockSelectOverride: unknown = null;
jest.mock('../../dfe/selectDfeEmissor', () => {
  const actual = jest.requireActual('../../dfe/selectDfeEmissor');
  return { ...actual, selectDfeEmissor: (env: NodeJS.ProcessEnv, kind: string) => mockSelectOverride ?? actual.selectDfeEmissor(env, kind) };
});

jest.mock('../../../../lib/factory', () => ({
  __esModule: true,
  getFactory: () => ({ getDynamicTableRepository: () => ({ findTableByInternalName, findDataById }) }),
}));

import { FiscalNumberVoidService } from '../FiscalNumberVoidService';
import { PAYLOAD_ALLOWLIST } from '../../audit/auditCanonical';
import { VoidNumberRangeSchema } from '../../dtos/FiscalDocumentDto';
import { NFCE_PRESUNCAO } from '../../models/inutilizacao';
import type { AccountingScope } from '../../scope/AccountingScope';
import { legalParamsSemente } from '@test/helpers/legalParams';

/**
 * BE-INCR-NFCE (nó X10a, PR-4) — item 24 (`POST …/inutilizacoes`: guardas antes da porta, um caso por guarda; faixa válida +
 * Null ⇒ HOMOLOGATED + audit), item 25 (pendentes com o aviso da EMENDA-3) e item 26 (allowlist do `dfe.number_voided`).
 */
const SCOPE: AccountingScope = { ownerUserId: 'u1', actorUserId: 'u1', unitId: 'unit-1', ledgerCode: 'DEFAULT', baseCurrencyCode: 'BRL', timeZone: 'America/Sao_Paulo' };
const INPUT = { kind: 'NFCE' as const, serie: 1, nIni: 3, nFin: 3, xJust: 'nota rejeitada e abandonada pelo operador' };

function montar(opts: { last?: bigint; numerados?: Array<{ numero: bigint; status: string }>; sobrepostos?: unknown[]; codMun?: string | null } = {}) {
  const docRepo = {
    listSequences: jest.fn(async () => [{ ambiente: 'homologacao', serie: 1, last: opts.last ?? 5n }]),
    listNumbered: jest.fn(async () =>
      (opts.numerados ?? []).map((d) => ({ id: `doc-${d.numero}`, ambiente: 'homologacao', serie: 1, numero: d.numero, status: d.status })),
    ),
  };
  const rows = new Map<string, Record<string, unknown>>();
  const voidRepo = {
    runTransaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({ tx: true })),
    findOverlapping: jest.fn(async () => opts.sobrepostos ?? []),
    listByKind: jest.fn(async () => []),
    create: jest.fn(async (_s: unknown, data: Record<string, unknown>) => {
      const row = { id: 'void-1', ...data, status: 'REQUESTED', nProt: null, errorsJson: null };
      rows.set('void-1', row);
      return row;
    }),
    applyResult: jest.fn(async (_s: unknown, id: string, patch: Record<string, unknown>) => {
      const row = { ...rows.get(id), ...patch };
      rows.set(id, row);
      return row;
    }),
  };
  const fiscalProfileService = { get: jest.fn(async () => ({ codMun: opts.codMun === undefined ? '3550308' : opts.codMun, partnerAccountRef: null })) };
  const auditService = { append: jest.fn() };
  const policy = { canCancelFiscalDocument: () => true, canReadFiscalDocument: () => true };
  const service = new FiscalNumberVoidService(
    docRepo as never,
    voidRepo as never,
    fiscalProfileService as never,
    policy as never,
    auditService as never,
    legalParamsSemente,
  );
  return { service, docRepo, voidRepo, auditService };
}

describe('BE-INCR-NFCE PR-4 — inutilização (item 24)', () => {
  const OLD_ENV = process.env;
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] }).setSystemTime(new Date('2026-10-26T15:00:00Z'));
    process.env = { ...OLD_ENV, DFE_PARTNER: 'null', DFE_PARTNER_ENV: 'homologacao', NODE_ENV: 'test' };
  });
  afterEach(() => jest.useRealTimers());
  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('faixa válida + NullEmissor ⇒ HOMOLOGATED com nProt, audit dfe.number_voided na tx do resultado (payload = allowlist, sem xJust)', async () => {
    const { service, voidRepo, auditService } = montar({ numerados: [{ numero: 3n, status: 'REJECTED' }] });
    const view = await service.inutilizar(SCOPE, INPUT);
    expect(view).toMatchObject({ status: 'HOMOLOGATED', kind: 'NFCE', ambiente: 'homologacao', serie: 1, nIni: '3', nFin: '3', ano: 2026, partner: 'null' });
    expect(view.nProt).toMatch(/^NULL[0-9A-F]{11}$/);
    expect(voidRepo.create).toHaveBeenCalledWith(SCOPE, expect.objectContaining({ nIni: 3n, nFin: 3n, ano: 2026, ambiente: 'homologacao' }), { tx: true });
    expect(auditService.append).toHaveBeenCalledTimes(1);
    const [tx, , evento] = auditService.append.mock.calls[0];
    expect(tx).toEqual({ tx: true });
    expect(evento).toMatchObject({ eventType: 'dfe.number_voided', targetType: 'fiscal_number_void', targetId: 'void-1' });
    expect(Object.keys(evento.payload).sort()).toEqual([...PAYLOAD_ALLOWLIST['dfe.number_voided']].sort());
    expect(JSON.stringify(evento.payload)).not.toContain('abandonada');
  });

  it('dono 26/10 — REJECTED não ocupa o número (rej. 241 só para SENT/PROCESSING/AUTHORIZED*/CANCELLED)', async () => {
    for (const status of ['SENT', 'PROCESSING', 'AUTHORIZED', 'AUTHORIZED_DIVERGENT', 'CANCELLED']) {
      const { service, voidRepo } = montar({ numerados: [{ numero: 3n, status }] });
      await expect(service.inutilizar(SCOPE, INPUT)).rejects.toMatchObject({ statusCode: 409, errorCode: 'INUT_NUMERO_USADO' });
      expect(voidRepo.create).not.toHaveBeenCalled();
    }
  });

  it('rej. 256/563 — faixa que cruza pedido REQUESTED/HOMOLOGATED ⇒ 409, nada gravado, porta não chamada', async () => {
    const { service, voidRepo } = montar({ sobrepostos: [{ nIni: 2n, nFin: 4n, status: 'HOMOLOGATED' }] });
    await expect(service.inutilizar(SCOPE, INPUT)).rejects.toMatchObject({ statusCode: 409, errorCode: 'INUT_FAIXA_JA_PEDIDA' });
    expect(voidRepo.create).not.toHaveBeenCalled();
    expect(voidRepo.findOverlapping).toHaveBeenCalledWith(SCOPE, expect.objectContaining({ nIni: 3n, nFin: 3n }), ['REQUESTED', 'HOMOLOGATED'], { tx: true });
  });

  it('guardas da Tabela 5-12 chegam como 400 nomeado (224, 201) e a do dono (acima do último)', async () => {
    await expect(montar().service.inutilizar(SCOPE, { ...INPUT, nIni: 4, nFin: 3 })).rejects.toThrow(/inut_faixa_invertida/);
    await expect(montar({ last: 20_000n }).service.inutilizar(SCOPE, { ...INPUT, nIni: 1, nFin: 10_001 })).rejects.toThrow(/inut_faixa_excede_10000/);
    await expect(montar({ last: 5n }).service.inutilizar(SCOPE, { ...INPUT, nIni: 5, nFin: 6 })).rejects.toThrow(/inut_acima_do_ultimo/);
  });

  it('adaptador que emite o tipo mas não declara inutilização ⇒ 409 DFE_INUT_NAO_SUPORTADA, nada gravado', async () => {
    const { NullEmissor } = await import('../../dfe/NullEmissor');
    const port = new NullEmissor();
    Object.assign(port, { capabilities: { ...port.capabilities, inutilizar: false } });
    mockSelectOverride = { port, ambiente: 'homologacao', enabled: true };
    try {
      const { service, voidRepo } = montar();
      await expect(service.inutilizar(SCOPE, INPUT)).rejects.toMatchObject({ statusCode: 409, errorCode: 'DFE_INUT_NAO_SUPORTADA' });
      expect(voidRepo.create).not.toHaveBeenCalled();
    } finally {
      mockSelectOverride = null;
    }
  });

  it('porta desabilitada (sem DFE_PARTNER) ⇒ 400 dfe_disabled', async () => {
    process.env = { ...OLD_ENV, NODE_ENV: 'test' };
    delete process.env.DFE_PARTNER;
    delete process.env.DFE_PARTNER_NFCE;
    await expect(montar().service.inutilizar(SCOPE, INPUT)).rejects.toMatchObject({ statusCode: 400, message: expect.stringContaining('dfe_disabled') });
  });

  it('resultado REJECTED da porta ⇒ REJECTED com os erros, sem audit; falha de rede ⇒ fica REQUESTED com dfe_inutilizar_failed', async () => {
    const { service, auditService } = montar();
    const { NullEmissor } = await import('../../dfe/NullEmissor');
    const spy = jest.spyOn(NullEmissor.prototype, 'inutilizar').mockResolvedValueOnce({ status: 'REJECTED', errors: [{ code: '241', message: 'Um número da faixa já foi utilizado' }] });
    expect(await service.inutilizar(SCOPE, INPUT)).toMatchObject({ status: 'REJECTED', errors: [{ code: '241' }] });
    expect(auditService.append).not.toHaveBeenCalled();
    spy.mockRejectedValueOnce(new Error('ECONNRESET'));
    expect(await montar().service.inutilizar(SCOPE, INPUT)).toMatchObject({ status: 'REQUESTED', errors: [{ code: 'dfe_inutilizar_failed' }] });
    spy.mockRestore();
  });

  it('E3-1 (c) — SP depois de 01/11/2026 também chama a porta (sem tabela de exclusão)', async () => {
    jest.setSystemTime(new Date('2026-11-05T15:00:00Z'));
    const { service } = montar();
    expect((await service.inutilizar(SCOPE, INPUT)).status).toBe('HOMOLOGATED');
  });

  it('sem permissão ⇒ 403', async () => {
    const { service } = montar();
    (service as unknown as { policy: { canCancelFiscalDocument: () => boolean } }).policy.canCancelFiscalDocument = () => false;
    await expect(service.inutilizar(SCOPE, INPUT)).rejects.toMatchObject({ statusCode: 403 });
  });
});

describe('BE-INCR-NFCE PR-4 — DTO do pedido (item 31)', () => {
  const ok = { unitId: 'unit-1', ...INPUT };
  it('aceita o pedido válido e recusa campo extra (.strict)', () => {
    expect(VoidNumberRangeSchema.safeParse(ok).success).toBe(true);
    expect(VoidNumberRangeSchema.safeParse({ ...ok, ano: 2026 }).success).toBe(false);
  });
  it('xJust 15–255 (Tabela 5-9), série 0–889, nNF 1–999.999.999, kind só NFE/NFCE', () => {
    expect(VoidNumberRangeSchema.safeParse({ ...ok, xJust: 'curta demais' }).success).toBe(false);
    expect(VoidNumberRangeSchema.safeParse({ ...ok, xJust: 'x'.repeat(256) }).success).toBe(false);
    expect(VoidNumberRangeSchema.safeParse({ ...ok, xJust: 'x'.repeat(15) }).success).toBe(true);
    expect(VoidNumberRangeSchema.safeParse({ ...ok, serie: 890 }).success).toBe(false);
    expect(VoidNumberRangeSchema.safeParse({ ...ok, nFin: 1_000_000_000 }).success).toBe(false);
    expect(VoidNumberRangeSchema.safeParse({ ...ok, nIni: 0 }).success).toBe(false);
    expect(VoidNumberRangeSchema.safeParse({ ...ok, kind: 'NFSE' }).success).toBe(false);
  });
});

describe('BE-INCR-NFCE PR-4 — pendentes (item 25 + EMENDA-3 E3-2 a)', () => {
  beforeEach(() => jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] }));
  afterEach(() => jest.useRealTimers());
  const numerados = [
    { numero: 1n, status: 'AUTHORIZED' },
    { numero: 2n, status: 'AUTHORIZED' },
    { numero: 3n, status: 'REJECTED' },
    { numero: 4n, status: 'CANCELLED' },
    { numero: 5n, status: 'AUTHORIZED' },
  ];

  it('SP (codMun 3550308) em 31/10/2026, no fuso do escopo (01/11 00:30 UTC ainda é 31/10 em SP) ⇒ [3] sem aviso', async () => {
    jest.setSystemTime(new Date('2026-11-01T02:30:00Z'));
    const { service } = montar({ numerados });
    expect(await service.pendentes(SCOPE, 'NFCE')).toEqual([{ ambiente: 'homologacao', serie: 1, numero: '3', documentId: 'doc-3', status: 'REJECTED', avisos: [] }]);
  });

  it('SP em 01/11/2026 ⇒ NFC-e com aviso e presunção; NF-e com aviso, sem presunção', async () => {
    jest.setSystemTime(new Date('2026-11-01T15:00:00Z'));
    const [nfce] = await montar({ numerados }).service.pendentes(SCOPE, 'NFCE');
    expect(nfce.avisos).toEqual([expect.stringContaining('38/26')]);
    expect(nfce.presuncao).toBe(NFCE_PRESUNCAO);
    const [nfe] = await montar({ numerados }).service.pendentes(SCOPE, 'NFE');
    expect(nfe.avisos).toEqual([expect.stringContaining('40/26')]);
    expect(nfe).not.toHaveProperty('presuncao');
  });

  it('unidade em MG (3106200) em 01/11/2026 ⇒ lacuna sem aviso', async () => {
    jest.setSystemTime(new Date('2026-11-01T15:00:00Z'));
    const [l] = await montar({ numerados, codMun: '3106200' }).service.pendentes(SCOPE, 'NFCE');
    expect(l).toMatchObject({ numero: '3', avisos: [] });
  });
});
