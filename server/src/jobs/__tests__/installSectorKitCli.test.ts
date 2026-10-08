import { KitInstallService } from '../../features/sectorKits/services/KitInstallService';
import { SectorKitPolicy } from '../../features/sectorKits/policies/SectorKitPolicy';
import type { IKitInstallationRepository } from '../../features/sectorKits/repositories/IKitInstallationRepository';

/**
 * BE-INCR-KIT-SETOR PR-2 (item 16) — o que o `installSectorKitCli` acrescenta ao CLI antigo (cujos casos seguem
 * em `activateAccountingBindingCli.test.ts`): o "já instalado" vale só para o MESMO kit. Unidade com o kit de
 * outro setor ⇒ exit 1 pelo "um kit por unidade" (item 9), nunca um exit 0 de sucesso falso (achado do review).
 */
const findFirstAccountingBinding = jest.fn();
const findManyAccount = jest.fn();
const disconnect = jest.fn(async () => {});
const compile = jest.fn();
let installed: { id: string; kitKey: string; kitVersion: number; status: string; steps: string } | null = null;

const repo: IKitInstallationRepository = {
  findByScope: async () => installed as never,
  begin: async () => installed as never,
  saveSteps: async () => installed as never,
  finish: async () => installed as never,
  runTransaction: async (fn) => fn({} as never),
};
const getKitInstallService = jest.fn(
  () =>
    new KitInstallService(
      new SectorKitPolicy(),
      repo,
      { findActive: async () => null },
      { compile },
      {
        listChart: async () => [{ code: '1.1.1', nature: 'Asset', acceptsEntries: true }],
        installCanonicalChart: async () => {},
        createAccountIfAbsent: async () => 'exists' as const,
        findLiveAccountId: async () => null,
      },
      { status: async () => 'OPEN' as const, seedAndOpen: async () => {} },
      { hasFiscalProfile: async () => false, fillNullScopeSettings: async () => [], fillNullFiscalProfile: async () => [] },
      { hasProfile: async () => false, upsert: async () => {} },
      { catalogLoaded: async () => false, mappedAccountIds: async () => new Set<string>(), batchSet: async () => {} },
      { companyRegime: async () => null, unitRegime: async () => null },
      { append: async () => {} },
    ),
);

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    accountingBinding: { findFirst: (...a: unknown[]) => findFirstAccountingBinding(...a) },
    account: { findMany: (...a: unknown[]) => findManyAccount(...a) },
    $disconnect: () => disconnect(),
  },
}));
jest.mock('../../lib/factory', () => ({
  __esModule: true,
  ApplicationFactory: { getInstance: () => ({ getKitInstallService }) },
}));

import { parseArgs, runCli } from '../installSectorKitCli';

describe('installSectorKitCli', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    findManyAccount.mockResolvedValue([{ code: '1.1.1', nature: 'Asset', acceptsEntries: true }]);
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  const argv = (kitKey: string) => ['--owner-user-id', 'u1', '--unit-id', 'unit-1', '--kit-key', kitKey];
  const doSalao = { id: 'k1', kitKey: 'beautySalon', kitVersion: 1, status: 'INSTALLED', steps: '{"lastCompletedStep":7,"warnings":[]}' };

  it('--kit-key é obrigatório e listado na mensagem', () => {
    expect(() => parseArgs(['--owner-user-id', 'u1', '--unit-id', 'unit-1'])).toThrow(/--kit-key.*beautySalon/);
  });

  it('mesmo kit INSTALLED ⇒ exit 0 sem compilar (idempotente)', async () => {
    installed = doSalao;
    await expect(runCli(argv('beautySalon'))).resolves.toBe(0);
    expect(compile).not.toHaveBeenCalled();
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it('kit de OUTRO setor já instalado na unidade ⇒ exit 1 (um kit por unidade), sem compilar', async () => {
    installed = doSalao;
    await expect(runCli(argv('aestheticClinic'))).resolves.toBe(1);
    expect(compile).not.toHaveBeenCalled();
    expect(String((console.error as jest.Mock).mock.calls[0][0])).toMatch(/um kit por unidade/);
  });
});
