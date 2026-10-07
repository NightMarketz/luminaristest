/**
 * NfePreviewService — BE-INCR-NFE-PREVIEW (rodada 2a). Comportamentos 3, 4, 5, 10 e 14:
 *  - policy → parse → lookup, nesta ordem; construtor = (IPayableRepository, IAccountingPolicy);
 *  - erros do parser propagam INALTERADOS (mesmas mensagens do import);
 *  - 403 quando nem canManagePayable nem canReconcile;
 *  - alreadyImported/existingPayableId a partir de `findByDocumentNumber(scope, chaveAcesso)`;
 *  - zero escrita, zero auditoria (o módulo não importa auditCanonical/AuditService).
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import * as nfeLib from '../../../../lib/nfe';
import { ForbiddenError, ValidationError } from '../../../../lib/errors';
import { NfePreviewSchema } from '../../dtos/NfeDto';
import { NfePreviewService } from '../NfePreviewService';
import { NfeImportService } from '../NfeImportService';
import type { IPayableRepository } from '../../repositories/IPayableRepository';
import type { IAccountingPolicy } from '../../policies/IAccountingPolicy';
import type { AccountingScope } from '../../scope/AccountingScope';
import type { Payable } from 'generated/prisma';
import { signNfeForTest } from '@test/helpers/nfeSignature';

import { legalParamsSemente } from '@test/helpers/legalParams';
const FIXTURE_DIR = join(__dirname, '../../../../lib/__tests__/fixtures/nfe');
const PURCHASE = readFileSync(join(FIXTURE_DIR, 'purchase-multi-item.SYNTHETIC.xml'), 'utf8');
const CHAVE = '35250712345678000195550010000000011000000012';

const scope = { userId: 'user-1', unitId: 'unit-1', actorUserId: 'user-1', timeZone: 'America/Sao_Paulo' } as unknown as AccountingScope;

/** ITEM-DESTINATION PR-2: repositório de defaults vazio — nenhum produto com destinação padrão. */
const NO_DEFAULTS = { findManyByProductRefs: async () => [] } as never;

function build(opts: { existing?: Payable | null; canManage?: boolean; canReconcile?: boolean } = {}) {
  const findByDocumentNumber = jest.fn(async () => opts.existing ?? null);
  const payableRepo = { findByDocumentNumber } as unknown as IPayableRepository;
  const policy = {
    canManagePayable: () => opts.canManage ?? true,
    canReconcile: () => opts.canReconcile ?? false,
  } as unknown as IAccountingPolicy;
  // X6 (F-X6-6 a): o preview exige perfil fiscal — stub neutro (não-contribuinte, CUMULATIVO).
  const fiscalProfile = {
    requireCostRegime: async () => ({
      icmsContribuinte: false, pisCofinsRegime: 'CUMULATIVO', pisCofinsCreditExcludesIcms: true, pisCofinsCreditIncludesIpi: false, pisCofinsCreditFromSimplesSupplier: false,
      icmsRecuperavelAccountId: null, pisCofinsRecuperavelAccountId: null,
    }),
  } as never;
  return { service: new NfePreviewService(payableRepo, policy, fiscalProfile, NO_DEFAULTS, legalParamsSemente), findByDocumentNumber };
}

describe('NfePreviewService.preview', () => {
  afterEach(() => jest.restoreAllMocks());

  it('CONTROLE: fixture de compra → preview que passa no NfePreviewSchema, alreadyImported=false (comportamento 3)', async () => {
    const { service, findByDocumentNumber } = build();
    const preview = await service.preview(scope, PURCHASE);
    expect(NfePreviewSchema.safeParse(preview).success).toBe(true);
    expect(preview.chaveAcesso).toBe(CHAVE);
    expect(preview.itens).toHaveLength(3);
    expect(preview.alreadyImported).toBe(false);
    expect(preview.existingPayableId).toBeNull();
    expect(findByDocumentNumber).toHaveBeenCalledWith(scope, CHAVE);
  });

  it('chama o MESMO parseNfe do import exatamente uma vez (sem segundo parser)', async () => {
    const spy = jest.spyOn(nfeLib, 'parseNfe');
    const { service } = build();
    await service.preview(scope, PURCHASE);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('403 quando nem canManagePayable nem canReconcile; canReconcile sozinho basta (F-PREV-2 → a)', async () => {
    const denied = build({ canManage: false, canReconcile: false });
    await expect(denied.service.preview(scope, PURCHASE)).rejects.toThrow(ForbiddenError);
    expect(denied.findByDocumentNumber).not.toHaveBeenCalled();
    const reconcileOnly = build({ canManage: false, canReconcile: true });
    await expect(reconcileOnly.service.preview(scope, PURCHASE)).resolves.toMatchObject({ chaveAcesso: CHAVE });
  });

  it('erros do parser propagam inalterados e o repositório NÃO é consultado (comportamento 4; policy → parse → lookup)', async () => {
    const { service, findByDocumentNumber } = build();
    const cstat110 = PURCHASE.replace('<cStat>100</cStat>', '<cStat>110</cStat>');
    await expect(service.preview(scope, cstat110)).rejects.toThrow(ValidationError);
    await expect(service.preview(scope, cstat110)).rejects.toThrow(/cStat "110"/);
    // SIG-NFE: a chave vive no <infNFe> — re-assina para o cDV ser o que falha (F-SIG-4 b).
    const badDv = signNfeForTest(PURCHASE.replace(/35250712345678000195550010000000011000000012/g, '35250712345678000195550010000000011000000017'));
    await expect(service.preview(scope, badDv)).rejects.toThrow(/dígito verificador da chave/);
    await expect(service.preview(scope, '<!DOCTYPE x><NFe/>')).rejects.toThrow(ValidationError);
    expect(findByDocumentNumber).not.toHaveBeenCalled();
  });

  it('alreadyImported=true + existingPayableId quando há título vivo com documentNumber = chave (comportamento 14)', async () => {
    const { service } = build({ existing: { id: 'pay-42' } as Payable });
    const preview = await service.preview(scope, PURCHASE);
    expect(preview.alreadyImported).toBe(true);
    expect(preview.existingPayableId).toBe('pay-42');
    expect(NfePreviewSchema.safeParse(preview).success).toBe(true);
  });

  it('o módulo não importa auditoria nem transação: dry-run por construção (comportamento 10)', () => {
    const src = readFileSync(join(__dirname, '../NfePreviewService.ts'), 'utf8');
    const imports = src.split('\n').filter((l) => l.startsWith('import ')).join('\n');
    expect(imports).not.toMatch(/auditCanonical|AuditService|runTransaction|PostingService|lib\/prisma|AttachmentService/);
    expect(src).not.toMatch(/runTransaction\(|\.create\(|\.update\(|\.delete\(/);
  });
});

// ── ITEM-DESTINATION item 14 (F-ID-8 a): preview = import a seco ─────────────────────────────────────
describe('NfePreviewService.preview — destinação por item (ITEM-DESTINATION)', () => {
  const profile = {
    icmsContribuinte: true, pisCofinsRegime: 'NAO_CUMULATIVO', pisCofinsCreditExcludesIcms: true, pisCofinsCreditIncludesIpi: false,
    pisCofinsCreditFromSimplesSupplier: false, icmsRecuperavelAccountId: 'acc-icms', pisCofinsRecuperavelAccountId: 'acc-pc',
    insumoExpenseAccountId: 'acc-insumo',
  };
  const PC = readFileSync(join(FIXTURE_DIR, 'purchase-pis-cofins.SYNTHETIC.xml'), 'utf8');
  const MAPPINGS = [
    { cProd: 'SHAMP-500', productRef: 'p1', destination: 'INSUMO_SERVICO' as const },
    { cProd: 'COND-500', productRef: 'p2' },
    { cProd: 'MASC-300', productRef: 'p3', destination: 'INSUMO_SERVICO' as const },
  ];
  const previewSvc = () =>
    new NfePreviewService(
      { findByDocumentNumber: async () => null } as unknown as IPayableRepository,
      { canManagePayable: () => true, canReconcile: () => false } as unknown as IAccountingPolicy,
      { requireCostRegime: async () => profile } as never,
      NO_DEFAULTS, legalParamsSemente,
    );

  it('sem mapeamento: tudo REVENDA/FALLBACK, custoInsumoCents 0 e números iguais aos de hoje', async () => {
    const preview = await previewSvc().preview(scope, PURCHASE);
    expect(NfePreviewSchema.safeParse(preview).success).toBe(true);
    expect(preview.custo.destinacoes.map((d) => `${d.destination}/${d.origem}`)).toEqual(Array(3).fill('REVENDA/FALLBACK'));
    expect(preview.custo.custoInsumoCents).toBe(0);
    expect(preview.custo.creditoIcmsCents).toBe(3300);
  });

  it('com o MESMO mapeamento do import: mesmos créditos, mesmo custo de insumo, mesmas destinações e warnings', async () => {
    const preview = await previewSvc().preview(scope, PC, MAPPINGS);
    expect(NfePreviewSchema.safeParse(preview).success).toBe(true);

    let captured: { recoverableTaxLines?: { amountCents: number; kind: string }[]; insumoItems?: { costCents: number }[] } = {};
    const importSvc = new NfeImportService(
      { createPayable: async (_s: unknown, input: typeof captured) => { captured = input; return { id: 'pay-1' }; } } as never,
      { findById: async () => null } as never,
      { canManagePayable: () => true } as never,
      { requireCostRegime: async () => profile } as never,
      NO_DEFAULTS, legalParamsSemente,
    );
    const imported = await importSvc.importPurchase(scope, PC, { unitId: 'unit-1', itemMappings: MAPPINGS });

    const credit = (kind: string) => (captured.recoverableTaxLines ?? []).filter((l) => l.kind === kind).reduce((a, l) => a + l.amountCents, 0);
    expect(preview.custo.creditoIcmsCents).toBe(credit('ICMS'));
    expect(preview.custo.creditoPisCofinsCents).toBe(credit('PIS_COFINS'));
    expect(preview.custo.custoInsumoCents).toBe((captured.insumoItems ?? []).reduce((a, i) => a + i.costCents, 0));
    expect(preview.custo.custoInsumoCents).toBeGreaterThan(0);
    expect(preview.custo.destinacoes).toEqual(imported.destinacoes);
    expect(preview.custo.warnings).toEqual(imported.warnings);
  });
});

// ── ITEM-DESTINATION PR-2 (item 9 origem PRODUTO, F-ID-2 a; item 19): default por produto no preview E no import ──
describe('NfePreviewService.preview — default por produto (ITEM-DESTINATION PR-2)', () => {
  const profile = {
    icmsContribuinte: true, pisCofinsRegime: 'NAO_CUMULATIVO', pisCofinsCreditExcludesIcms: true, pisCofinsCreditIncludesIpi: false,
    pisCofinsCreditFromSimplesSupplier: false, icmsRecuperavelAccountId: 'acc-icms', pisCofinsRecuperavelAccountId: 'acc-pc',
    insumoExpenseAccountId: 'acc-insumo',
  };
  const PC = readFileSync(join(FIXTURE_DIR, 'purchase-pis-cofins.SYNTHETIC.xml'), 'utf8');
  // p1 tem override explícito REVENDA (vence o default INSUMO de p1); p2 sem override → default; p3 sem default → FALLBACK.
  const MAPPINGS = [
    { cProd: 'SHAMP-500', productRef: 'p1', destination: 'REVENDA' as const },
    { cProd: 'COND-500', productRef: 'p2' },
    { cProd: 'MASC-300', productRef: 'p3' },
  ];
  const defaultsRepo = () => {
    const findManyByProductRefs = jest.fn(async () => [
      { productRef: 'p1', destination: 'INSUMO_SERVICO' },
      { productRef: 'p2', destination: 'INSUMO_SERVICO' },
    ]);
    return { repo: { findManyByProductRefs } as never, findManyByProductRefs };
  };

  it('override > PRODUTO > FALLBACK; UMA query com os productRefs mapeados; preview = import', async () => {
    const pd = defaultsRepo();
    const preview = await new NfePreviewService(
      { findByDocumentNumber: async () => null } as unknown as IPayableRepository,
      { canManagePayable: () => true, canReconcile: () => false } as unknown as IAccountingPolicy,
      { requireCostRegime: async () => profile } as never,
      pd.repo, legalParamsSemente,
    ).preview(scope, PC, MAPPINGS);
    expect(NfePreviewSchema.safeParse(preview).success).toBe(true);
    expect(preview.custo.destinacoes.map((d) => `${d.cProd}:${d.destination}/${d.origem}`)).toEqual([
      'SHAMP-500:REVENDA/OVERRIDE',
      'COND-500:INSUMO_SERVICO/PRODUTO',
      'MASC-300:REVENDA/FALLBACK',
    ]);
    expect(pd.findManyByProductRefs).toHaveBeenCalledTimes(1);
    expect(pd.findManyByProductRefs).toHaveBeenCalledWith(scope, ['p1', 'p2', 'p3']);
    expect(preview.custo.custoInsumoCents).toBeGreaterThan(0);

    let captured: { recoverableTaxLines?: { amountCents: number; kind: string }[]; insumoItems?: { costCents: number; cProd: string }[] } = {};
    const importDefaults = defaultsRepo();
    const imported = await new NfeImportService(
      { createPayable: async (_s: unknown, input: typeof captured) => { captured = input; return { id: 'pay-1' }; } } as never,
      { findById: async () => null } as never,
      { canManagePayable: () => true } as never,
      { requireCostRegime: async () => profile } as never,
      importDefaults.repo, legalParamsSemente,
    ).importPurchase(scope, PC, { unitId: 'unit-1', itemMappings: MAPPINGS });

    expect(importDefaults.findManyByProductRefs).toHaveBeenCalledTimes(1);
    expect(imported.destinacoes).toEqual(preview.custo.destinacoes);
    expect(imported.warnings).toEqual(preview.custo.warnings);
    expect((captured.insumoItems ?? []).map((i) => i.cProd)).toEqual(['COND-500']);
    expect(preview.custo.custoInsumoCents).toBe((captured.insumoItems ?? []).reduce((a, i) => a + i.costCents, 0));
    const credit = (kind: string) => (captured.recoverableTaxLines ?? []).filter((l) => l.kind === kind).reduce((a, l) => a + l.amountCents, 0);
    expect(preview.custo.creditoIcmsCents).toBe(credit('ICMS'));
    expect(preview.custo.creditoPisCofinsCents).toBe(credit('PIS_COFINS'));
  });
});
