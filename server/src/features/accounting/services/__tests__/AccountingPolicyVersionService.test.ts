/**
 * BE-INCR-ACCOUNTING-POLICY-VERSION (nó GOV-CONTADOR) — testes de unidade com dublês.
 * 15c: gate dentro da tx, nas DUAS direções, determinístico (memória windows-serializa-sqlite-ci-linux-nao):
 *   - PUT (perfil fiscal e settings): `findActive` null no preflight e ACTIVE na releitura com `tx` → 409.
 *   - approve: ACTIVE no preflight e null na releitura → 403, sem CAS (a versão segue PROPOSED).
 *   Retirar o gate de dentro da tx de qualquer dos três derruba um teste daqui.
 * 15h: o payload gravado na proposta não tem a chave `unitId` (condição do REKEY), e o DTO a recusa.
 * Contrato: o payload da proposta conserva o `superRefine` do PUT (no Zod 4, `.omit()` o descarta).
 */
import type { Prisma } from 'generated/prisma';
import { AccountantRequiredError, PolicyApprovalRequiredError, PolicyNoAccountantError } from '../../../../lib/errors';
import { AccountingPolicy } from '../../policies/AccountingPolicy';
import type { ActiveAccountant } from '../../policies/IAccountingPolicy';
import { resolveAccountingScope, type AccountingScope } from '../../scope/AccountingScope';
import type { IAccountantAssignmentRepository } from '../../repositories/IAccountantAssignmentRepository';
import type { IAccountingPolicyVersionRepository } from '../../repositories/IAccountingPolicyVersionRepository';
import type { IFiscalProfileRepository } from '../../repositories/IFiscalProfileRepository';
import type { ICompanyFiscalProfileRepository } from '../../repositories/ICompanyFiscalProfileRepository';
import type { IBankSettlementRepository } from '../../repositories/IBankSettlementRepository';
import type { IAccountRepository } from '../../repositories/IAccountRepository';
import type { ILalurRepository } from '../../repositories/ILalurRepository';
import type { AuditService } from '../AuditService';
import { FiscalProfileService } from '../FiscalProfileService';
import { AccountingScopeSettingsService } from '../AccountingScopeSettingsService';
import { AccountingPolicyVersionService } from '../AccountingPolicyVersionService';
import { ProposePolicyVersionSchema } from '../../dtos/AccountingPolicyVersionDto';
import { UpsertFiscalProfileSchema } from '../../dtos/FiscalProfileDto';

const policy = new AccountingPolicy();
const owner = resolveAccountingScope({ userId: 'dono' }, 'unit-1');
const delegated: AccountingScope = { ...owner, actorUserId: 'contador' };
const active: ActiveAccountant = {
  id: 'asg-1', ownerUserId: 'dono', unitId: 'unit-1', accountantUserId: 'contador', crcNumber: 'SP-123456/O-1',
};
const TX = { tx: true } as unknown as Prisma.TransactionClient;
const runTx = jest.fn(async (fn: (tx: Prisma.TransactionClient) => Promise<unknown>) => fn(TX));
const PERFIL = { regimeTributario: 'REAL', icmsContribuinte: false, pisCofinsRegime: 'CUMULATIVO' } as const;

/** `findActive` devolve `pre` sem tx (preflight) e `inTx` com tx (releitura autoritativa). */
function assignmentRepo(pre: ActiveAccountant | null, inTx: ActiveAccountant | null) {
  return {
    findActive: jest.fn(async (_s: AccountingScope, tx?: Prisma.TransactionClient) => (tx ? inTx : pre)),
  } as unknown as IAccountantAssignmentRepository;
}

function policyVersionRepo(over: Partial<Record<keyof IAccountingPolicyVersionRepository, jest.Mock>> = {}) {
  return {
    findById: jest.fn(async () => ({ id: 'pv-1', target: 'FISCAL_PROFILE', status: 'PROPOSED', payload: PERFIL })),
    findPending: jest.fn(async () => null),
    nextVersion: jest.fn(async () => 1),
    create: jest.fn(async (data: object) => ({ id: 'pv-new', ...data, createdAt: new Date(), decidedAt: null })),
    transition: jest.fn(),
    setAppliedSnapshot: jest.fn(),
    runTransaction: runTx,
    ...over,
  } as unknown as jest.Mocked<IAccountingPolicyVersionRepository>;
}

const audit = { append: jest.fn(async () => undefined) } as unknown as AuditService;
const accounts = { findById: jest.fn(async () => null) } as unknown as IAccountRepository;
const lalur = { findParteBById: jest.fn(async () => null) } as unknown as ILalurRepository;

function fiscalService(assign: IAccountantAssignmentRepository, pv: IAccountingPolicyVersionRepository) {
  const repo = { upsert: jest.fn(), runTransaction: runTx } as unknown as IFiscalProfileRepository & { upsert: jest.Mock };
  const company = { findByYear: jest.fn(async () => null) } as unknown as ICompanyFiscalProfileRepository;
  return { svc: new FiscalProfileService(repo, accounts, policy, audit, company, assign, pv), repo };
}

function settingsService(assign: IAccountantAssignmentRepository, pv: IAccountingPolicyVersionRepository) {
  const repo = { upsertSettings: jest.fn(), getSettings: jest.fn(async () => null) } as unknown as IBankSettlementRepository & { upsertSettings: jest.Mock };
  return { svc: new AccountingScopeSettingsService(repo, accounts, lalur, policy, assign, pv), repo };
}

beforeEach(() => jest.clearAllMocks());

describe('15c — PUT: contador aceito entre o preflight e a tx → 409, nada gravado', () => {
  it('perfil fiscal', async () => {
    const pv = policyVersionRepo();
    const { svc, repo } = fiscalService(assignmentRepo(null, active), pv);
    await expect(svc.upsert(owner, UpsertFiscalProfileSchema.parse({ unitId: 'unit-1', ...PERFIL }))).rejects.toBeInstanceOf(PolicyApprovalRequiredError);
    expect(repo.upsert).not.toHaveBeenCalled();
    expect(pv.create).not.toHaveBeenCalled();
  });

  it('configuração por escopo', async () => {
    const pv = policyVersionRepo();
    const { svc, repo } = settingsService(assignmentRepo(null, active), pv);
    await expect(svc.update(owner, { unitId: 'unit-1', disposalGainAccountId: null })).rejects.toBeInstanceOf(PolicyApprovalRequiredError);
    expect(repo.upsertSettings).not.toHaveBeenCalled();
    expect(pv.create).not.toHaveBeenCalled();
  });
});

describe('15c — approve: atribuição encerrada entre o preflight e a tx → 403, sem CAS', () => {
  function build(pre: ActiveAccountant | null, inTx: ActiveAccountant | null) {
    const pv = policyVersionRepo();
    const assign = assignmentRepo(pre, inTx);
    const fiscal = { applyInTx: jest.fn(), validate: jest.fn() } as unknown as FiscalProfileService & { applyInTx: jest.Mock };
    const settings = { applyInTx: jest.fn(), validate: jest.fn() } as unknown as AccountingScopeSettingsService;
    const svc = new AccountingPolicyVersionService(pv, assign, policy, audit, fiscal, settings, accounts, lalur);
    return { svc, pv, fiscal };
  }

  it('approve', async () => {
    const { svc, pv, fiscal } = build(active, null);
    await expect(svc.approve(delegated, 'pv-1')).rejects.toBeInstanceOf(AccountantRequiredError);
    expect(pv.transition).not.toHaveBeenCalled();
    expect(fiscal.applyInTx).not.toHaveBeenCalled();
  });

  it('reject', async () => {
    const { svc, pv } = build(active, null);
    await expect(svc.reject(delegated, 'pv-1', 'não')).rejects.toBeInstanceOf(AccountantRequiredError);
    expect(pv.transition).not.toHaveBeenCalled();
  });

  it('controle: com ACTIVE nas duas leituras, o CAS acontece e aplica com o payload re-parseado', async () => {
    const { svc, pv, fiscal } = build(active, active);
    pv.transition.mockResolvedValue({ id: 'pv-1', target: 'FISCAL_PROFILE', version: 1, payload: PERFIL } as never);
    fiscal.applyInTx.mockResolvedValue({ unitId: 'unit-1' });
    pv.setAppliedSnapshot.mockResolvedValue({
      id: 'pv-1', unitId: 'unit-1', target: 'FISCAL_PROFILE', version: 1, status: 'APPLIED', payload: PERFIL,
      appliedSnapshot: { unitId: 'unit-1' }, createdAt: new Date(), decidedAt: new Date(),
    } as never);
    await svc.approve(delegated, 'pv-1');
    expect(pv.transition).toHaveBeenCalledWith('pv-1', 'PROPOSED', 'APPLIED', expect.objectContaining({ assignmentId: 'asg-1', decidedById: 'contador' }), TX);
    expect(fiscal.applyInTx).toHaveBeenCalledWith(delegated, expect.objectContaining({ pisCofinsCreditFromSimplesSupplier: false }), TX, 'pv-1');
  });
});

describe('15c — propose: atribuição encerrada entre o preflight e a tx → 409 POLICY_NO_ACCOUNTANT, nada criado', () => {
  it('propose', async () => {
    const pv = policyVersionRepo();
    const fiscal = { validate: jest.fn() } as unknown as FiscalProfileService;
    const svc = new AccountingPolicyVersionService(pv, assignmentRepo(active, null), policy, audit, fiscal, {} as AccountingScopeSettingsService, accounts, lalur);
    const dto = ProposePolicyVersionSchema.parse({ unitId: 'unit-1', target: 'FISCAL_PROFILE', payload: PERFIL });
    await expect(svc.propose(owner, dto)).rejects.toBeInstanceOf(PolicyNoAccountantError);
    expect(pv.create).not.toHaveBeenCalled();
    expect(pv.transition).not.toHaveBeenCalled();
  });
});

describe('15h — payload sem unitId', () => {
  it('a proposta grava o parse do schema do alvo, com defaults e sem a chave unitId', async () => {
    const pv = policyVersionRepo();
    const fiscal = { validate: jest.fn() } as unknown as FiscalProfileService;
    const svc = new AccountingPolicyVersionService(pv, assignmentRepo(active, active), policy, audit, fiscal, {} as AccountingScopeSettingsService, accounts, lalur);
    const dto = ProposePolicyVersionSchema.parse({ unitId: 'unit-1', target: 'FISCAL_PROFILE', payload: PERFIL });
    await svc.propose(owner, dto);
    const stored = (pv.create as jest.Mock).mock.calls[0][0].payload as Record<string, unknown>;
    expect(stored).not.toHaveProperty('unitId');
    expect(stored).toMatchObject({ ...PERFIL, pisCofinsCreditFromSimplesSupplier: false, emissaoForaDoMes: 'AVISAR' });
  });

  it('o DTO recusa unitId dentro do payload (os dois alvos)', () => {
    expect(ProposePolicyVersionSchema.safeParse({ unitId: 'u', target: 'FISCAL_PROFILE', payload: { ...PERFIL, unitId: 'u' } }).success).toBe(false);
    expect(ProposePolicyVersionSchema.safeParse({ unitId: 'u', target: 'SCOPE_SETTINGS', payload: { unitId: 'u' } }).success).toBe(false);
  });
});

describe('contrato do payload FISCAL_PROFILE — o superRefine do PUT sobrevive', () => {
  it.each([
    ['regime normal com pisCofinsRegime SIMPLES', { regimeTributario: 'REAL', icmsContribuinte: false, pisCofinsRegime: 'SIMPLES' }],
    ['SIMPLES contribuinte de ICMS', { regimeTributario: 'SIMPLES', icmsContribuinte: true, pisCofinsRegime: 'SIMPLES' }],
    ['IPI na base do crédito', { ...PERFIL, pisCofinsCreditIncludesIpi: true }],
  ])('%s → 400 também na proposta', (_l, payload) => {
    expect(UpsertFiscalProfileSchema.safeParse({ unitId: 'u', ...payload }).success).toBe(false);
    expect(ProposePolicyVersionSchema.safeParse({ unitId: 'u', target: 'FISCAL_PROFILE', payload }).success).toBe(false);
  });
});
