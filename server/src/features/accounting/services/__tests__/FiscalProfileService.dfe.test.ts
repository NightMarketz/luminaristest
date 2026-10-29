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
import { ForbiddenError, NotFoundError, ValidationError } from '../../../../lib/errors';
import type { AccountingScope } from '../../scope/AccountingScope';
import type { IFiscalProfileRepository, FiscalProfileData } from '../../repositories/IFiscalProfileRepository';
import type { IServiceFiscalProfileRepository, ServiceFiscalProfileData } from '../../repositories/IServiceFiscalProfileRepository';
import type { IAccountRepository } from '../../repositories/IAccountRepository';
import type { IAccountingPolicy } from '../../policies/IAccountingPolicy';
import type { AuditService } from '../AuditService';
import type { IAccountantAssignmentRepository } from '../../repositories/IAccountantAssignmentRepository';
import type { IAccountingPolicyVersionRepository } from '../../repositories/IAccountingPolicyVersionRepository';
import type { FiscalProfile, Prisma, ServiceFiscalProfile } from 'generated/prisma';

import { legalParamsSemente } from '@test/helpers/legalParams';
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
  // GOV-CONTADOR política versionada: sem contador ativo (F-GOV-4 a) — o PUT aplica e grava a versão APPLIED.
  const assignmentRepo = { findActive: jest.fn(async () => null) } as unknown as IAccountantAssignmentRepository;
  const policyVersionRepo = {
    findPending: jest.fn(async () => null),
    nextVersion: jest.fn(async () => 1),
    create: jest.fn(async () => ({ id: 'pv-1' })),
    setAppliedSnapshot: jest.fn(async () => ({ id: 'pv-1' })),
  } as unknown as IAccountingPolicyVersionRepository;
  return {
    svc: new FiscalProfileService(repo, accounts, policy, audit, companyRepo, assignmentRepo, policyVersionRepo),
    repo, append, companyRepo, accounts,
  };
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
    expect(s).toEqual({ completo: true, faltantes: [], pendingExternalValidation: [], opSimpNac: 1 });
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

  it('GET de perfil X6 existente (linha pré-DFE) devolve emissao.completo=false com faltantes e os 14 campos D1f pendentes (12 do X10b + 2 prazos do X11 item 2)', async () => {
    const { svc } = build({ existing: rowFrom({ regimeTributario: 'PRESUMIDO' }) });
    const v = await svc.get(scope);
    expect(v?.emissao.completo).toBe(false);
    expect(v?.emissao.faltantes).toContain('codMun');
    expect(v?.emissao.pendingExternalValidation).toHaveLength(14);
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
  function buildSvc(opts: { canManage?: boolean; ibsCbsCst?: string | null } = {}) {
    const rows = new Map<string, ServiceFiscalProfile>();
    const repo: IServiceFiscalProfileRepository = {
      findByServiceRef: jest.fn(async (_s, ref: string) => rows.get(ref) ?? null),
      findManyByServiceRefs: jest.fn(async (_s, refs: string[]) => refs.map((r) => rows.get(r)).filter(Boolean) as ServiceFiscalProfile[]),
      listByScope: jest.fn(async () => [...rows.values()]),
      upsert: jest.fn(async (_s, ref: string, data: ServiceFiscalProfileData) => {
        const row = { id: `sfp-${ref}`, userId: 'u1', unitId: 'unit-1', serviceRef: ref, cTribMun: null, cNBS: null, cLocPrestacao: null, xDescServ: null, finalidade: null, elegivelHospitalar: false, fundamentoHospitalar: null, ...rows.get(ref), ...data, createdById: 'u1', updatedById: 'u1', createdAt: new Date(), updatedAt: new Date('2026-09-17T00:00:00Z'), deletedAt: null } as ServiceFiscalProfile;
        rows.set(ref, row);
        return row;
      }),
      softDelete: jest.fn(async (_s, ref: string) => (rows.delete(ref) ? 1 : 0)),
      runTransaction: jest.fn(async (fn: (tx: Prisma.TransactionClient) => Promise<unknown>) => fn({} as Prisma.TransactionClient)),
    } as unknown as IServiceFiscalProfileRepository;
    const policy = { canReadFiscalProfile: jest.fn(() => true), canManageServiceFiscalProfile: jest.fn(() => opts.canManage ?? true) } as unknown as IAccountingPolicy;
    const append = jest.fn(async () => undefined);
    const fiscalProfiles = { findByScope: jest.fn(async () => (opts.ibsCbsCst === undefined ? null : { ibsCbsCst: opts.ibsCbsCst })) } as never;
    return { svc: new ServiceFiscalProfileService(repo, policy, { append } as unknown as AuditService, legalParamsSemente, fiscalProfiles), repo, append };
  }

  it('upsert idempotente devolve a view com a descrição da lista nacional e audita só códigos', async () => {
    const { svc, append } = buildSvc();
    const v = await svc.upsert(scope, 'svc-corte', UpsertServiceFiscalProfileSchema.parse({ unitId: 'unit-1', cTribNac: '060101', cNBS: '126021000' }));
    expect(v.cTribNacDescricao).toBe('Barbearia, cabeleireiros, manicuros, pedicuros e congêneres.');
    expect(v.cIndOp).toBe('030101');
    const call = (append as jest.Mock).mock.calls[0][2];
    expect(call.eventType).toBe('service_fiscal_profile.updated');
    expect(call.payload).toEqual({ serviceRef: 'svc-corte', cTribNac: '060101', cTribMun: '', cNBS: '126021000', cIndOp: '030101', cLocPrestacao: '', cClassTrib: '', finalidade: '', elegivelHospitalar: 'false' });
    expect(JSON.parse(canonicalizeAuditPayload('service_fiscal_profile.updated', call.payload))).toMatchObject({ cTribNac: '060101' });
  });

  // IBS-CBS-2027 PR-1 — L1 (dono, questionário, 21/10: E0959 ao salvar) e L2 (cClassTrib na trilha).
  it('cClassTrib com prefixo ≠ CST do perfil → 400 (RN E0959) e nada é gravado', async () => {
    const { svc, repo } = buildSvc({ ibsCbsCst: '000' });
    await expect(svc.upsert(scope, 'svc-corte', UpsertServiceFiscalProfileSchema.parse({ unitId: 'unit-1', cTribNac: '060101', cClassTrib: '410001' }))).rejects.toBeInstanceOf(ValidationError);
    expect(repo.upsert).not.toHaveBeenCalled();
  });

  it('cClassTrib coerente com o CST grava e entra no payload da auditoria (canônico aceita)', async () => {
    const { svc, append } = buildSvc({ ibsCbsCst: '000' });
    const v = await svc.upsert(scope, 'svc-corte', UpsertServiceFiscalProfileSchema.parse({ unitId: 'unit-1', cTribNac: '060101', cClassTrib: '000001' }));
    expect(v.cClassTrib).toBe('000001');
    const payload = (append as jest.Mock).mock.calls[0][2].payload;
    expect(payload.cClassTrib).toBe('000001');
    expect(JSON.parse(canonicalizeAuditPayload('service_fiscal_profile.updated', payload))).toMatchObject({ cClassTrib: '000001' });
  });

  it('perfil sem CST (ou sem perfil): cClassTrib não tem com o que conferir e grava', async () => {
    await expect(buildSvc({ ibsCbsCst: null }).svc.upsert(scope, 'a', UpsertServiceFiscalProfileSchema.parse({ unitId: 'unit-1', cTribNac: '060101', cClassTrib: '410001' }))).resolves.toMatchObject({ cClassTrib: '410001' });
    await expect(buildSvc().svc.upsert(scope, 'b', UpsertServiceFiscalProfileSchema.parse({ unitId: 'unit-1', cTribNac: '060101', cClassTrib: '410001' }))).resolves.toMatchObject({ cClassTrib: '410001' });
  });

  it('get de serviceRef sem perfil → NotFoundError; delete audita service_fiscal_profile.deleted', async () => {
    const { svc, append } = buildSvc();
    await expect(svc.get(scope, 'svc-x')).rejects.toBeInstanceOf(NotFoundError);
    await svc.upsert(scope, 'svc-x', UpsertServiceFiscalProfileSchema.parse({ unitId: 'unit-1', cTribNac: '060201' }));
    await svc.delete(scope, 'svc-x');
    expect((append as jest.Mock).mock.calls.map((c) => c[2].eventType)).toEqual(['service_fiscal_profile.updated', 'service_fiscal_profile.deleted']);
    await expect(svc.get(scope, 'svc-x')).rejects.toBeInstanceOf(NotFoundError);
  });

  // EFICIENCIA-FISCAL PR-5 (BRIEF item 25; ADR §7; F-EF-10/11 a)
  it('item 25: finalidade + hospitalar gravam e entram na trilha sem o fundamento (texto livre)', async () => {
    const { svc, append } = buildSvc();
    const v = await svc.upsert(scope, 'svc-proc', UpsertServiceFiscalProfileSchema.parse({ unitId: 'unit-1', cTribNac: '040101', finalidade: 'TERAPEUTICA', elegivelHospitalar: true, fundamentoHospitalar: 'Atribuição 4 — sala de procedimentos' }));
    expect(v).toMatchObject({ finalidade: 'TERAPEUTICA', elegivelHospitalar: true, fundamentoHospitalar: 'Atribuição 4 — sala de procedimentos' });
    const kept = JSON.parse(canonicalizeAuditPayload('service_fiscal_profile.updated', (append as jest.Mock).mock.calls[0][2].payload));
    expect(kept).toMatchObject({ finalidade: 'TERAPEUTICA', elegivelHospitalar: 'true' });
    expect(kept).not.toHaveProperty('fundamentoHospitalar');
  });

  it('item 25: campo omitido mantém o gravado; trocar a finalidade de um elegível para ESTETICA → 400 HOSPITALAR_SO_TERAPEUTICA_COM_FUNDAMENTO', async () => {
    const { svc, repo } = buildSvc();
    await svc.upsert(scope, 'svc-proc', UpsertServiceFiscalProfileSchema.parse({ unitId: 'unit-1', cTribNac: '040101', finalidade: 'TERAPEUTICA', elegivelHospitalar: true, fundamentoHospitalar: 'Atribuição 4' }));
    await expect(svc.upsert(scope, 'svc-proc', UpsertServiceFiscalProfileSchema.parse({ unitId: 'unit-1', cTribNac: '040101' }))).resolves.toMatchObject({ finalidade: 'TERAPEUTICA', elegivelHospitalar: true });
    await expect(svc.upsert(scope, 'svc-proc', UpsertServiceFiscalProfileSchema.parse({ unitId: 'unit-1', cTribNac: '040101', finalidade: 'ESTETICA' }))).rejects.toThrow(/HOSPITALAR_SO_TERAPEUTICA_COM_FUNDAMENTO/);
    expect(repo.upsert).toHaveBeenCalledTimes(2);
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

  // F-XP-4 → (b) (dono, chat, 29/10/2026): a emissão de MEI sai com opSimpNac=2; Anexo I v1.01 E0710/E0174/E0583.
  it('item 17 (F-XP-4 b): empresa MEI → opSimpNac=2 e completo SEM pTotTribSN (E0710)', () => {
    const s = fiscalProfileEmissaoStatus(rowFrom({ regimeTributario: 'SIMPLES', codMun: '3550308', pTotTribSNCent: null, ibsCbsInformar: false }), 'MEI');
    expect(s).toMatchObject({ completo: true, faltantes: [], opSimpNac: 2 });
    // a mesma unidade sob empresa SIMPLES é ME/EPP e exige o pTotTribSN
    const me = fiscalProfileEmissaoStatus(rowFrom({ regimeTributario: 'SIMPLES', codMun: '3550308', pTotTribSNCent: null, ibsCbsInformar: false }), 'SIMPLES');
    expect(me).toMatchObject({ completo: false, faltantes: ['pTotTribSNCent'], opSimpNac: 3 });
    expect(fiscalProfileEmissaoStatus(rowFrom({ regimeTributario: 'PRESUMIDO' })).opSimpNac).toBe(1);
  });

  it('item 17 (F-XP-4 b): perfil que contraria a RN do MEI vira faltante, nunca é ignorado (E0174, E0583, IBS/CBS)', () => {
    const s = fiscalProfileEmissaoStatus(rowFrom({ regimeTributario: 'SIMPLES', codMun: '3550308', regEspTrib: 3, issRetidoTomadorPj: true, ibsCbsInformar: true }), 'MEI');
    expect(s.completo).toBe(false);
    expect(s.faltantes).toEqual([
      'regEspTrib — MEI exige regime especial "Nenhum" (0) (E0174)',
      'issRetidoTomadorPj — MEI não tem retenção de ISS (E0583): desmarque no perfil',
      'ibsCbsInformar — MEI não destaca IBS/CBS (Res. CGSN 140 art. 106 § 1º V)',
    ]);
  });

  // Revisão independente do #976 (achado 1): regApTribSN, issAliquotaBp e pTotTribSNCent de um perfil que era ME/EPP
  // eram descartados em silêncio pelo montador, com completo=true. Dono, 29/10: "Nada é aceito e ignorado em silêncio."
  it('item 17 (F-XP-4 b): regApTribSN, alíquota e pTotTribSN herdados de ME/EPP viram faltante (E0162, E0600, E0710)', () => {
    const s = fiscalProfileEmissaoStatus(rowFrom({ regimeTributario: 'SIMPLES', codMun: '3550308', regApTribSN: 1, issAliquotaBp: 200, pTotTribSNCent: 600, ibsCbsInformar: false }), 'MEI');
    expect(s.completo).toBe(false);
    expect(s.faltantes).toEqual([
      'regApTribSN — MEI não informa o regime de apuração do SN (E0162): limpe no perfil',
      'issAliquotaBp — MEI não informa alíquota de ISS (E0600): limpe no perfil',
      'pTotTribSNCent — MEI não informa pTotTribSN (E0710): limpe no perfil',
    ]);
  });

  it('item 17: GET da unidade devolve emissao.opSimpNac=2 (lê o regime da empresa)', async () => {
    const { svc } = build({ regimeEmpresa: 'MEI', existing: rowFrom({ regimeTributario: 'SIMPLES', codMun: '3550308', pTotTribSNCent: null, ibsCbsInformar: false }) });
    expect((await svc.get(scope))?.emissao).toMatchObject({ completo: true, opSimpNac: 2 });
  });
});

// ── ITEM-DESTINATION item 20 (F-ID-5 a): conta de despesa do insumo no perfil ──────────────────────────
describe('FiscalProfileService.upsert — insumoExpenseAccountId (ITEM-DESTINATION item 20)', () => {
  const base = UpsertFiscalProfileSchema.parse({ unitId: 'unit-1', regimeTributario: 'REAL', icmsContribuinte: true, pisCofinsRegime: 'NAO_CUMULATIVO' });
  const acc = (over: Record<string, unknown>) => ({ id: 'acc-1', code: '4.1.9', nature: 'Expense', acceptsEntries: true, deletedAt: null, ...over });

  it.each([
    ['de ATIVO', acc({ code: '1.1.6', nature: 'Asset' }), /natureza Asset; esperado Expense/],
    ['de outro escopo (findById escopado devolve null)', null, /não existe neste escopo/],
    ['sintética', acc({ acceptsEntries: false }), /não aceita lançamentos/],
  ])('conta %s → 400, nada gravado', async (_n, found, msg) => {
    const { svc, repo, accounts } = build();
    (accounts.findById as jest.Mock).mockResolvedValue(found);
    await expect(svc.upsert(scope, { ...base, insumoExpenseAccountId: 'acc-1' })).rejects.toThrow(msg);
    expect(repo.upsert).not.toHaveBeenCalled();
  });

  it('conta de despesa folha do escopo → gravada, devolvida na view e no evento fiscal_profile.updated (allowlist)', async () => {
    const { svc, repo, accounts, append } = build();
    (accounts.findById as jest.Mock).mockResolvedValue(acc({}));
    const view = await svc.upsert(scope, { ...base, insumoExpenseAccountId: 'acc-1' });
    expect((repo.upsert as jest.Mock).mock.calls[0][1]).toMatchObject({ insumoExpenseAccountId: 'acc-1' });
    expect(view.insumoExpenseAccountId).toBe('acc-1');
    const evt = (append.mock.calls[0] as unknown[])[2] as { eventType: string; payload: Record<string, unknown> };
    expect(JSON.parse(canonicalizeAuditPayload(evt.eventType, evt.payload))).toMatchObject({ insumoExpenseAccountId: 'acc-1' });
  });
});
