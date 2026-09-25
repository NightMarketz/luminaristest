/**
 * BE-INCR-DFE PR-1 (BRIEF itens 6–9) — FiscalProfileService com os campos do emitente + D1f configurável.
 * Repo FALSO: prova a lógica do serviço (status de emissão, default por regime, d1fConfirmado, audit);
 * o schema é provado em FiscalDocument.integration.test.ts (repos reais).
 */
import { FiscalProfileService, fiscalProfileEmissaoStatus, D1F_FIELDS } from '../FiscalProfileService';
import type { ICompanyFiscalProfileRepository } from '../../repositories/ICompanyFiscalProfileRepository';
import { ServiceFiscalProfileService } from '../ServiceFiscalProfileService';
import { UpsertFiscalProfileSchema } from '../../dtos/FiscalProfileDto';
import { UpsertServiceFiscalProfileSchema } from '../../dtos/ServiceFiscalProfileDto';
import { canonicalizeAuditPayload } from '../../audit/auditCanonical';
import { ForbiddenError, NotFoundError } from '../../../../lib/errors';
import type { AccountingScope } from '../../scope/AccountingScope';
import type { IFiscalProfileRepository, FiscalProfileData } from '../../repositories/IFiscalProfileRepository';
import type { IServiceFiscalProfileRepository, ServiceFiscalProfileData } from '../../repositories/IServiceFiscalProfileRepository';
import type { IAccountRepository } from '../../repositories/IAccountRepository';
import type { IAccountingPolicy } from '../../policies/IAccountingPolicy';
import type { AuditService } from '../AuditService';
import type { FiscalProfile, Prisma, ServiceFiscalProfile } from 'generated/prisma';

const scope: AccountingScope = { ownerUserId: 'u1', actorUserId: 'u1', unitId: 'unit-1', ledgerCode: 'DEFAULT', baseCurrencyCode: 'BRL', timeZone: 'America/Sao_Paulo' };

function rowFrom(data: Partial<FiscalProfileData> & { regimeTributario: string }): FiscalProfile {
  return {
    id: 'fp-1', userId: 'u1', unitId: 'unit-1',
    icmsContribuinte: false, pisCofinsRegime: data.regimeTributario === 'SIMPLES' ? 'SIMPLES' : 'CUMULATIVO',
    pisCofinsCreditExcludesIcms: true, pisCofinsCreditIncludesIpi: false, pisCofinsCreditFromSimplesSupplier: false,
    icmsRecuperavelAccountId: null, pisCofinsRecuperavelAccountId: null, partnerAccountRef: null,
    codMun: null, inscricaoMunicipal: null, cnae: null, dpsSerie: 1, regEspTrib: 0, regApTribSN: null, issAliquotaBp: null,
    issRetidoTomadorPj: false, pacoteFatoGerador: 'CONSUMO', ibsCbsInformar: true, ibsCbsCst: null, ibsCbsClassTrib: null,
    pTotTribFedCent: null, pTotTribEstCent: null, pTotTribMunCent: null, pTotTribSNCent: null, emissaoForaDoMes: 'AVISAR', d1fConfirmado: false,
    createdById: 'u1', updatedById: 'u1', createdAt: new Date('2026-09-17T00:00:00Z'), updatedAt: new Date('2026-09-17T00:00:00Z'), deletedAt: null,
    ...data,
  } as FiscalProfile;
}

function build(opts: { existing?: FiscalProfile | null; canManage?: boolean; regimeEmpresa?: string | null } = {}) {
  let stored: FiscalProfile | null = opts.existing ?? null;
  const repo: IFiscalProfileRepository = {
    findByScope: jest.fn(async () => stored),
    upsert: jest.fn(async (_s, data) => {
      stored = rowFrom({ ...(stored ?? {}), ...data } as FiscalProfileData & { regimeTributario: string });
      return stored;
    }),
    softDelete: jest.fn(async () => 1),
    runTransaction: jest.fn(async (fn: (tx: Prisma.TransactionClient) => Promise<unknown>) => fn({} as Prisma.TransactionClient)),
  } as unknown as IFiscalProfileRepository;
  const accounts = { findById: jest.fn(async () => null) } as unknown as IAccountRepository;
  const policy = {
    canReadFiscalProfile: jest.fn(() => true),
    canManageFiscalProfile: jest.fn(() => opts.canManage ?? true),
  } as unknown as IAccountingPolicy;
  const append = jest.fn(async () => undefined);
  const audit = { append } as unknown as AuditService;
  // X13 PR-2: perfil da EMPRESA no ano corrente (itens 15/17) — `null` = sem perfil da empresa.
  const companyRepo = {
    findByYear: jest.fn(async () => (opts.regimeEmpresa ? { regime: opts.regimeEmpresa } : null)),
  } as unknown as ICompanyFiscalProfileRepository;
  return { svc: new FiscalProfileService(repo, accounts, policy, audit, companyRepo), repo, append, companyRepo };
}

describe('fiscalProfileEmissaoStatus (BRIEF item 7 — função pura)', () => {
  it('perfil X6 puro (só custo) → incompleto: falta codMun e os 3 pTotTrib (não-optante, RN E0713) e CST/cClassTrib (ibsCbsInformar=true)', () => {
    const s = fiscalProfileEmissaoStatus(rowFrom({ regimeTributario: 'REAL' }));
    expect(s.completo).toBe(false);
    expect(s.faltantes).toEqual(['codMun', 'pTotTribFedCent', 'pTotTribEstCent', 'pTotTribMunCent', 'ibsCbsCst', 'ibsCbsClassTrib']);
    expect(s.pendingExternalValidation).toEqual([...D1F_FIELDS]);
  });

  it('SIMPLES exige pTotTribSNCent (RN E0712) e, com IBSCBS desligado, não pede CST/cClassTrib', () => {
    const s = fiscalProfileEmissaoStatus(rowFrom({ regimeTributario: 'SIMPLES', codMun: '3550308', ibsCbsInformar: false }));
    expect(s.faltantes).toEqual(['pTotTribSNCent']);
  });

  it('completo quando tudo que a DPS exige está lá; pendingExternalValidation esvazia com d1fConfirmado', () => {
    const s = fiscalProfileEmissaoStatus(rowFrom({ regimeTributario: 'REAL', codMun: '3550308', pTotTribFedCent: 1300, pTotTribEstCent: 0, pTotTribMunCent: 500, ibsCbsCst: '000', ibsCbsClassTrib: '000001', d1fConfirmado: true }));
    expect(s).toEqual({ completo: true, faltantes: [], pendingExternalValidation: [] });
  });
});

describe('FiscalProfileService — BE-INCR-DFE (itens 6/7/9)', () => {
  it('PUT sem ibsCbsInformar: default true fora do SIMPLES e false no SIMPLES (leiaute [336]: Simples só 2027); marca d1fConfirmado', async () => {
    const real = build();
    const v1 = await real.svc.upsert(scope, UpsertFiscalProfileSchema.parse({ unitId: 'unit-1', regimeTributario: 'REAL', icmsContribuinte: false, pisCofinsRegime: 'CUMULATIVO' }));
    expect(v1.ibsCbsInformar).toBe(true);
    expect(v1.d1fConfirmado).toBe(true);
    expect(v1.emissao.pendingExternalValidation).toEqual([]);
    const sn = build();
    const v2 = await sn.svc.upsert(scope, UpsertFiscalProfileSchema.parse({ unitId: 'unit-1', regimeTributario: 'SIMPLES', icmsContribuinte: false, pisCofinsRegime: 'SIMPLES' }));
    expect(v2.ibsCbsInformar).toBe(false);
  });

  it('GET de perfil X6 existente (linha pré-DFE) devolve emissao.completo=false com faltantes e os 12 campos D1f pendentes', async () => {
    const { svc } = build({ existing: rowFrom({ regimeTributario: 'PRESUMIDO' }) });
    const v = await svc.get(scope);
    expect(v?.emissao.completo).toBe(false);
    expect(v?.emissao.faltantes).toContain('codMun');
    expect(v?.emissao.pendingExternalValidation).toHaveLength(12);
  });

  it('audit fiscal_profile.updated leva os campos DFE como string, sem IM/CNAE (texto livre) — e a allowlist os mantém', async () => {
    const { svc, append } = build();
    await svc.upsert(scope, UpsertFiscalProfileSchema.parse({ unitId: 'unit-1', regimeTributario: 'REAL', icmsContribuinte: false, pisCofinsRegime: 'CUMULATIVO', codMun: '3550308', inscricaoMunicipal: 'IM-123', cnae: '9602501', issAliquotaBp: 500, pTotTribFedCent: 1300, pTotTribEstCent: 0, pTotTribMunCent: 500 }));
    const call = (append as jest.Mock).mock.calls[0][2];
    expect(call.eventType).toBe('fiscal_profile.updated');
    expect(call.payload).toMatchObject({ codMun: '3550308', issAliquotaBp: '500', pTotTribFedCent: '1300', ibsCbsInformar: 'true', pacoteFatoGerador: 'CONSUMO', emissaoForaDoMes: 'AVISAR' });
    expect(call.payload).not.toHaveProperty('inscricaoMunicipal');
    expect(call.payload).not.toHaveProperty('cnae');
    const kept = JSON.parse(canonicalizeAuditPayload('fiscal_profile.updated', call.payload));
    expect(kept).toMatchObject({ codMun: '3550308', issAliquotaBp: '500', emissaoForaDoMes: 'AVISAR' });
  });

  it('policy: canManageFiscalProfile=false → 403 antes de tocar o repositório', async () => {
    const { svc, repo } = build({ canManage: false });
    await expect(svc.upsert(scope, UpsertFiscalProfileSchema.parse({ unitId: 'unit-1', regimeTributario: 'REAL', icmsContribuinte: false, pisCofinsRegime: 'CUMULATIVO' }))).rejects.toBeInstanceOf(ForbiddenError);
    expect(repo.upsert).not.toHaveBeenCalled();
  });
});

describe('ServiceFiscalProfileService (BRIEF item 8/9)', () => {
  function buildSvc(opts: { canManage?: boolean } = {}) {
    const rows = new Map<string, ServiceFiscalProfile>();
    const repo: IServiceFiscalProfileRepository = {
      findByServiceRef: jest.fn(async (_s, ref: string) => rows.get(ref) ?? null),
      findManyByServiceRefs: jest.fn(async (_s, refs: string[]) => refs.map((r) => rows.get(r)).filter(Boolean) as ServiceFiscalProfile[]),
      listByScope: jest.fn(async () => [...rows.values()]),
      upsert: jest.fn(async (_s, ref: string, data: ServiceFiscalProfileData) => {
        const row = { id: `sfp-${ref}`, userId: 'u1', unitId: 'unit-1', serviceRef: ref, cTribMun: null, cNBS: null, cLocPrestacao: null, xDescServ: null, ...data, createdById: 'u1', updatedById: 'u1', createdAt: new Date(), updatedAt: new Date('2026-09-17T00:00:00Z'), deletedAt: null } as ServiceFiscalProfile;
        rows.set(ref, row);
        return row;
      }),
      softDelete: jest.fn(async (_s, ref: string) => (rows.delete(ref) ? 1 : 0)),
      runTransaction: jest.fn(async (fn: (tx: Prisma.TransactionClient) => Promise<unknown>) => fn({} as Prisma.TransactionClient)),
    } as unknown as IServiceFiscalProfileRepository;
    const policy = { canReadFiscalProfile: jest.fn(() => true), canManageServiceFiscalProfile: jest.fn(() => opts.canManage ?? true) } as unknown as IAccountingPolicy;
    const append = jest.fn(async () => undefined);
    return { svc: new ServiceFiscalProfileService(repo, policy, { append } as unknown as AuditService), repo, append };
  }

  it('upsert idempotente devolve a view com a descrição da lista nacional e audita só códigos', async () => {
    const { svc, append } = buildSvc();
    const v = await svc.upsert(scope, 'svc-corte', UpsertServiceFiscalProfileSchema.parse({ unitId: 'unit-1', cTribNac: '060101', cNBS: '126021000' }));
    expect(v.cTribNacDescricao).toBe('Barbearia, cabeleireiros, manicuros, pedicuros e congêneres.');
    expect(v.cIndOp).toBe('030101');
    const call = (append as jest.Mock).mock.calls[0][2];
    expect(call.eventType).toBe('service_fiscal_profile.updated');
    expect(call.payload).toEqual({ serviceRef: 'svc-corte', cTribNac: '060101', cTribMun: '', cNBS: '126021000', cIndOp: '030101', cLocPrestacao: '' });
    expect(JSON.parse(canonicalizeAuditPayload('service_fiscal_profile.updated', call.payload))).toMatchObject({ cTribNac: '060101' });
  });

  it('get de serviceRef sem perfil → NotFoundError; delete audita service_fiscal_profile.deleted', async () => {
    const { svc, append } = buildSvc();
    await expect(svc.get(scope, 'svc-x')).rejects.toBeInstanceOf(NotFoundError);
    await svc.upsert(scope, 'svc-x', UpsertServiceFiscalProfileSchema.parse({ unitId: 'unit-1', cTribNac: '060201' }));
    await svc.delete(scope, 'svc-x');
    expect((append as jest.Mock).mock.calls.map((c) => c[2].eventType)).toEqual(['service_fiscal_profile.updated', 'service_fiscal_profile.deleted']);
    await expect(svc.get(scope, 'svc-x')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('policy: canManageServiceFiscalProfile=false → 403', async () => {
    const { svc, repo } = buildSvc({ canManage: false });
    await expect(svc.upsert(scope, 'svc-x', UpsertServiceFiscalProfileSchema.parse({ unitId: 'unit-1', cTribNac: '060101' }))).rejects.toBeInstanceOf(ForbiddenError);
    expect(repo.upsert).not.toHaveBeenCalled();
  });
});

describe('X13 PR-2 — regime da EMPRESA governa a unidade (itens 15 e 17)', () => {
  const base = { unitId: 'u1', icmsContribuinte: false, pisCofinsCreditExcludesIcms: true, pisCofinsCreditIncludesIpi: false, pisCofinsCreditFromSimplesSupplier: false, dpsSerie: 1, regEspTrib: 0, issRetidoTomadorPj: false, pacoteFatoGerador: 'CONSUMO', emissaoForaDoMes: 'AVISAR' } as const;

  it('item 15: unidade REAL sob empresa PRESUMIDO no ano corrente → 400 regime_divergente_da_empresa, nada gravado', async () => {
    const { svc, repo } = build({ regimeEmpresa: 'PRESUMIDO' });
    await expect(svc.upsert(scope, { ...base, regimeTributario: 'REAL', pisCofinsRegime: 'NAO_CUMULATIVO' } as never)).rejects.toThrow(/regime_divergente_da_empresa/);
    expect(repo.upsert).not.toHaveBeenCalled();
  });

  it('item 15: empresa MEI → a unidade é SIMPLES (LC 123 art. 18-A §1º) e passa; sem perfil da empresa, nada é exigido', async () => {
    await expect(build({ regimeEmpresa: 'MEI' }).svc.upsert(scope, { ...base, regimeTributario: 'SIMPLES', pisCofinsRegime: 'SIMPLES' } as never)).resolves.toBeDefined();
    await expect(build({ regimeEmpresa: null }).svc.upsert(scope, { ...base, regimeTributario: 'REAL', pisCofinsRegime: 'NAO_CUMULATIVO' } as never)).resolves.toBeDefined();
  });

  it('item 17 (F-XP-4 a): empresa MEI → a emissão fica incompleta com o motivo explícito (opSimpNac=2 fora do MVP)', () => {
    const s = fiscalProfileEmissaoStatus(rowFrom({ regimeTributario: 'SIMPLES', codMun: '3550308', pTotTribSNCent: 600, ibsCbsInformar: false }), 'MEI');
    expect(s.completo).toBe(false);
    expect(s.faltantes).toEqual(['regime MEI — emissão fora do escopo (opSimpNac=2)']);
    // a mesma unidade sob empresa SIMPLES emite
    expect(fiscalProfileEmissaoStatus(rowFrom({ regimeTributario: 'SIMPLES', codMun: '3550308', pTotTribSNCent: 600, ibsCbsInformar: false }), 'SIMPLES').completo).toBe(true);
  });

  it('item 17: GET da unidade devolve emissao com o faltante do MEI (lê o regime da empresa)', async () => {
    const { svc } = build({ regimeEmpresa: 'MEI', existing: rowFrom({ regimeTributario: 'SIMPLES', codMun: '3550308', pTotTribSNCent: 600, ibsCbsInformar: false }) });
    expect((await svc.get(scope))?.emissao.faltantes).toContain('regime MEI — emissão fora do escopo (opSimpNac=2)');
  });
});
