/**
 * DepreciationRateService (BE-INCR-FIXED-ASSETS, nó C8, Bloco A). Unit: repo/audit são dublês e a fotografia legal é a
 * semente da migração; prova-se ORDEM (policy antes de dado), o catálogo Anexo de plataforma + CUSTOM (BE-INCR-LEGAL-
 * PARAMS PR-3), a tradução cross-tenant → NotFound (D11), e o conteúdo do payload de auditoria.
 */
import { ForbiddenError, NotFoundError } from '@/lib/errors';
import { DepreciationRateService } from '@/features/accounting/services/DepreciationRateService';
import { legalParamsSemente } from '@test/helpers/legalParams';
import type {
  CreateDepreciationRateData,
  IDepreciationRateRepository,
} from '@/features/accounting/repositories/IDepreciationRateRepository';
import type { AccountingScope } from '@/features/accounting/scope/AccountingScope';
import type { IAccountingPolicy } from '@/features/accounting/policies/IAccountingPolicy';
import type { AuditService } from '@/features/accounting/services/AuditService';
import { resolveAccountingScope } from '@/features/accounting/scope/AccountingScope';
import { DEPRECIATION_RATE_CREATED, DEPRECIATION_RATE_HIDDEN } from '@/features/accounting/models/FixedAsset.model';

const scope = resolveAccountingScope({ userId: 'dono-a' }, 'unit-1');

const rateRow = {
  id: 'rate-1',
  userId: 'dono-a',
  unitId: 'unit-1',
  ncm: null as string | null,
  sourceRow: null as number | null,
  description: 'Torno CNC',
  lifeYears: 10,
  annualRateBp: 1000,
  source: 'CUSTOM',
  sourceUrl: null as string | null,
  sourceSha256: null as string | null,
  justification: 'Laudo técnico do fornecedor',
  hiddenAt: null as Date | null,
  createdById: 'dono-a',
  createdAt: new Date('2026-09-18T12:00:00Z'),
};

function build(opts: { canRead?: boolean; canManage?: boolean; found?: typeof rateRow | null } = {}) {
  const auditAppend = jest.fn(async (_tx: unknown, _scope: AccountingScope, _input: { eventType: string; targetId: string; payload: Record<string, unknown> }) => undefined);
  const create = jest.fn(async (_data: CreateDepreciationRateData, _tx?: unknown) => rateRow);
  const findById = jest.fn(async () => (opts.found === undefined ? rateRow : opts.found));
  const findManyByUnit = jest.fn(async () => [rateRow]);
  const hide = jest.fn(async (_scope: AccountingScope, _id: string, _tx?: unknown) => ({ ...rateRow, hiddenAt: new Date() }));
  const runTransaction = jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({ tx: true }));
  const fotografia = jest.fn(legalParamsSemente.fotografia);

  const repo = { create, findById, findManyByUnit, hide, runTransaction } as unknown as IDepreciationRateRepository;
  const policy = {
    canRead: () => opts.canRead ?? true,
    canManageFixedAssets: () => opts.canManage ?? true,
  } as unknown as IAccountingPolicy;
  const auditService = { append: auditAppend } as unknown as AuditService;

  return {
    service: new DepreciationRateService(repo, { fotografia }, auditService, policy),
    create, findById, findManyByUnit, hide, runTransaction, fotografia, auditAppend,
  };
}

describe('DepreciationRateService.listRates', () => {
  it('nega ANTES de tocar fotografia/repo quando canRead=false', async () => {
    const { service, fotografia, findManyByUnit } = build({ canRead: false });
    await expect(service.listRates(scope, false)).rejects.toBeInstanceOf(ForbiddenError);
    expect(fotografia).not.toHaveBeenCalled();
    expect(findManyByUnit).not.toHaveBeenCalled();
  });

  it('PR-3: união no mesmo shape — 222 linhas do Anexo de PLATAFORMA + as CUSTOM do escopo (origem diz de onde)', async () => {
    const { service, fotografia, findManyByUnit } = build();
    const lista = await service.listRates(scope, true);
    expect(fotografia).toHaveBeenCalledWith(['DEPRECIACAO_ANEXO_III']);
    expect(findManyByUnit).toHaveBeenCalledWith(scope, true);
    expect(lista.filter((t) => t.origem === 'PLATAFORMA')).toHaveLength(222);
    expect(lista.filter((t) => t.origem === 'ESCOPO').map((t) => t.id)).toEqual(['rate-1']);
    // Linha do Anexo lida da plataforma com os mesmos números do fixture (ex.: sourceRow 2, INSTALAÇÕES 10%).
    expect(lista.find((t) => t.id === 'lp3-dep-anexo-2')).toMatchObject({
      sourceRow: 2, description: 'INSTALAÇÕES', lifeYears: 10, annualRateBp: 1000, source: 'ANEXO_III_IN_1700_2017', hiddenAt: null,
    });
    expect(lista.find((t) => t.id === 'lp3-dep-nota1-nota')).toMatchObject({ sourceRow: null, ncm: '8417', annualRateBp: 3330, source: 'ANEXO_III_NOTA_1' });
  });
});

describe('DepreciationRateService.resolverTaxa (PR-3, L-1)', () => {
  it('CUSTOM do escopo → rateId; Anexo de plataforma → legalParameterId; id desconhecido → NotFound', async () => {
    const custom = build();
    await expect(custom.service.resolverTaxa(scope, 'rate-1')).resolves.toEqual({ rateId: 'rate-1', legalParameterId: null, annualRateBp: 1000 });
    const semCustom = build({ found: null });
    await expect(semCustom.service.resolverTaxa(scope, 'lp3-dep-anexo-2')).resolves.toEqual({ rateId: null, legalParameterId: 'lp3-dep-anexo-2', annualRateBp: 1000 });
    await expect(semCustom.service.resolverTaxa(scope, 'nao-existe')).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('DepreciationRateService.createCustomRate', () => {
  it('nega ANTES de tocar o repo quando canManageFixedAssets=false', async () => {
    const { service, create } = build({ canManage: false });
    await expect(
      service.createCustomRate(scope, { unitId: 'unit-1', description: 'x', lifeYears: 5, annualRateBp: 2000, justification: 'j' }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(create).not.toHaveBeenCalled();
  });

  it('cria com source=CUSTOM, sourceRow=null (F-FA10 → a) e audita ids/números — nunca description/justification', async () => {
    const { service, create, auditAppend } = build();
    await service.createCustomRate(scope, {
      unitId: 'unit-1', ncm: '8471', description: 'Torno CNC', lifeYears: 10, annualRateBp: 1000, justification: 'Laudo técnico',
    });
    const [data] = create.mock.calls[0];
    expect(data).toMatchObject({ source: 'CUSTOM', sourceRow: null, ncm: '8471', createdById: 'dono-a' });

    const [, , auditInput] = auditAppend.mock.calls[0];
    expect(auditInput).toMatchObject({ eventType: DEPRECIATION_RATE_CREATED, targetId: rateRow.id });
    expect(auditInput.payload).not.toHaveProperty('description');
    expect(auditInput.payload).not.toHaveProperty('justification');
    expect(auditInput.payload).toMatchObject({ rateId: rateRow.id, source: 'CUSTOM' });
  });
});

describe('DepreciationRateService.hideRate', () => {
  it('PR-3: linha do Anexo (plataforma) não se oculta — não está em depreciation_rates ⇒ NotFound', async () => {
    const { service, hide } = build({ found: null });
    await expect(service.hideRate(scope, 'lp3-dep-anexo-2')).rejects.toBeInstanceOf(NotFoundError);
    expect(hide).not.toHaveBeenCalled();
  });

  it('id de outro escopo é NotFoundError (D11) — nunca Forbidden, nunca toca hide', async () => {
    const { service, hide } = build({ found: null });
    await expect(service.hideRate(scope, 'rate-alheio')).rejects.toBeInstanceOf(NotFoundError);
    expect(hide).not.toHaveBeenCalled();
  });

  it('oculta (soft) e audita rateId + source — nunca description', async () => {
    const { service, hide, auditAppend } = build();
    await service.hideRate(scope, 'rate-1');
    expect(hide).toHaveBeenCalledWith(scope, 'rate-1', { tx: true });
    const [, , auditInput] = auditAppend.mock.calls[0];
    expect(auditInput).toMatchObject({ eventType: DEPRECIATION_RATE_HIDDEN, targetId: 'rate-1' });
    expect(auditInput.payload).toEqual({ rateId: 'rate-1', source: 'CUSTOM' });
  });
});
