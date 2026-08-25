const findFirstAccountingBinding = jest.fn();
const findManyAccount = jest.fn();
const disconnect = jest.fn(async () => {});
const compile = jest.fn();
const getAccountingBindingCompileService = jest.fn(() => ({ compile }));
const getInstance = jest.fn(() => ({ getAccountingBindingCompileService }));

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
  ApplicationFactory: { getInstance: () => getInstance() },
}));

import { parseArgs, runCli } from '../activateAccountingBindingCli';

describe('activateAccountingBindingCli', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  describe('parseArgs', () => {
    it('requires --owner-user-id', () => {
      expect(() => parseArgs(['--unit-id', 'unit-1'])).toThrow(/--owner-user-id/);
    });

    it('requires --unit-id', () => {
      expect(() => parseArgs(['--owner-user-id', 'u1'])).toThrow(/--unit-id/);
    });

    it('defaults actorUserId to ownerUserId and sectorKey to the salon binding sectorKey', () => {
      const args = parseArgs(['--owner-user-id', 'u1', '--unit-id', 'unit-1']);
      expect(args).toMatchObject({ ownerUserId: 'u1', actorUserId: 'u1', unitId: 'unit-1', sectorKey: 'beautySalon' });
    });

    it('honors explicit --actor-user-id and --sector-key', () => {
      const args = parseArgs([
        '--owner-user-id', 'u1', '--unit-id', 'unit-1', '--actor-user-id', 'u2', '--sector-key', 'other',
      ]);
      expect(args).toMatchObject({ ownerUserId: 'u1', actorUserId: 'u2', unitId: 'unit-1', sectorKey: 'other' });
    });
  });

  const argv = ['--owner-user-id', 'u1', '--unit-id', 'unit-1'];

  it('returns 1 and never touches the DB when required flags are missing', async () => {
    const code = await runCli(['--owner-user-id', 'u1']);
    expect(code).toBe(1);
    expect(findFirstAccountingBinding).not.toHaveBeenCalled();
    expect(disconnect).not.toHaveBeenCalled();
  });

  it('is idempotent: an existing Active binding short-circuits to 0 without calling compile()', async () => {
    findFirstAccountingBinding.mockResolvedValueOnce({ id: 'b1', bindingVersion: 3 });
    const code = await runCli(argv);
    expect(code).toBe(0);
    expect(compile).not.toHaveBeenCalled();
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it('fails clearly (exit 1) when the tenant chart of accounts is empty — never seeds accounts itself', async () => {
    findFirstAccountingBinding.mockResolvedValueOnce(null);
    findManyAccount.mockResolvedValueOnce([]);
    const code = await runCli(argv);
    expect(code).toBe(1);
    expect(compile).not.toHaveBeenCalled();
    expect(String((console.error as jest.Mock).mock.calls[0][0])).toMatch(/nenhuma conta encontrada/i);
  });

  it('compiles via the REAL BindingCompileService (same path as POST /compile) against the DB chart', async () => {
    findFirstAccountingBinding.mockResolvedValueOnce(null);
    findManyAccount.mockResolvedValueOnce([{ code: '1.1.1', nature: 'Asset', acceptsEntries: true }]);
    compile.mockResolvedValueOnce({
      binding: { id: 'b2', bindingVersion: 1 },
      validation: { ok: true, blocking: [], warnings: [] },
      status: 'Active',
    });

    const code = await runCli(argv);

    expect(code).toBe(0);
    expect(getAccountingBindingCompileService).toHaveBeenCalledWith({
      ownerUserId: 'u1',
      actorUserId: 'u1',
      unitId: 'unit-1',
    });
    const [scope, input] = compile.mock.calls[0];
    expect(scope).toEqual({ ownerUserId: 'u1', actorUserId: 'u1', unitId: 'unit-1' });
    expect(input.sectorKey).toBe('beautySalon');
    expect(input.chart).toEqual([{ code: '1.1.1', nature: 'Asset', acceptsEntries: true }]);
    expect(input.eventBindings.length).toBeGreaterThan(0);
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it('fails clearly (exit 1) when compile() lands on Draft (blocking validation issues)', async () => {
    findFirstAccountingBinding.mockResolvedValueOnce(null);
    findManyAccount.mockResolvedValueOnce([{ code: '1.1.1', nature: 'Asset', acceptsEntries: true }]);
    compile.mockResolvedValueOnce({
      binding: { id: 'b3', bindingVersion: 1 },
      validation: { ok: false, blocking: [{ code: 'ACCOUNT_NOT_FOUND', message: 'conta ausente' }], warnings: [] },
      status: 'Draft',
    });

    const code = await runCli(argv);
    expect(code).toBe(1);
    expect(String((console.error as jest.Mock).mock.calls[0][0])).toMatch(/Draft/);
  });

  it('disconnects Prisma even when compile() throws', async () => {
    findFirstAccountingBinding.mockResolvedValueOnce(null);
    findManyAccount.mockResolvedValueOnce([{ code: '1.1.1', nature: 'Asset', acceptsEntries: true }]);
    compile.mockRejectedValueOnce(new Error('boom'));

    const code = await runCli(argv);
    expect(code).toBe(1);
    expect(disconnect).toHaveBeenCalledTimes(1);
  });
});
