import { Prisma } from 'generated/prisma';
import { PackageBalanceService } from '../PackageBalanceService';
import type { PackageCreditCommand, PackageMovementCommand } from '../PackageBalanceService';
import type { IPackageBalanceRepository } from '../../repositories/IPackageBalanceRepository';
import type { IPackageBalancePolicy } from '../../policies/IPackageBalancePolicy';
import type { AccountingScope } from '../../../accounting/scope/AccountingScope';
import { ValidationError, ForbiddenError, PackageBalanceExpiredError } from '../../../../lib/errors';

const scope: AccountingScope = {
  ownerUserId: 'u1',
  actorUserId: 'u1',
  unitId: 'unit-1',
  ledgerCode: 'DEFAULT',
  baseCurrencyCode: 'BRL',
  timeZone: 'America/Sao_Paulo',
};

const cmd: PackageMovementCommand = {
  customerId: 'cust-1',
  packageId: 'pkg-1',
  saleId: 'sale-1',
  amountCents: 20000,
};

const credit: PackageCreditCommand = { ...cmd, saleDate: '2026-03-01', validityDays: 30 };

/** Minimal balance row for the mocks (centsFromDb accepts the bigint). */
function balanceRow(balanceCents: bigint, expiresOn: string | null) {
  return {
    id: 'bal-1',
    customerId: 'cust-1',
    packageId: 'pkg-1',
    balanceCents,
    expiresAt: expiresOn ? new Date(`${expiresOn}T00:00:00.000Z`) : null,
  };
}

function p2002(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
  });
}

function buildRepo(over: Partial<Record<keyof IPackageBalanceRepository, jest.Mock>> = {}) {
  const repo = {
    findBalance: jest.fn(async () => null),
    findBalanceById: jest.fn(async () => null),
    listBalances: jest.fn(async () => []),
    upsertCredit: jest.fn(async () => undefined),
    tryDecrement: jest.fn(async () => true),
    findMovement: jest.fn(async () => null),
    createMovement: jest.fn(async () => ({ id: 'mv-1' })),
    // Execute the callback with a fake tx handle; reject if it throws (mirrors $transaction).
    runTransaction: jest.fn((fn: (tx: unknown) => unknown) => fn({})),
    ...over,
  };
  return repo as unknown as IPackageBalanceRepository & Record<string, jest.Mock>;
}

const allowPolicy: IPackageBalancePolicy = { canMutate: () => true, canRead: () => true };

describe('PackageBalanceService', () => {
  describe('creditFromSale', () => {
    it('applies a credit: appends the movement then increments the balance', async () => {
      const repo = buildRepo();
      const svc = new PackageBalanceService(repo, allowPolicy);
      await svc.creditFromSale(scope, credit);
      expect(repo.createMovement).toHaveBeenCalledWith(
        expect.objectContaining({ saleId: 'sale-1', kind: 'credit', deltaCents: 20000 }),
        expect.anything(),
      );
      expect(repo.upsertCredit).toHaveBeenCalledWith(
        scope, 'cust-1', 'pkg-1', 20000, new Date('2026-03-31T00:00:00.000Z'), expect.anything(),
      );
    });

    it('is idempotent: an existing credit movement skips the transaction entirely', async () => {
      const repo = buildRepo({ findMovement: jest.fn(async () => ({ id: 'mv-existing' })) });
      const svc = new PackageBalanceService(repo, allowPolicy);
      await svc.creditFromSale(scope, credit);
      expect(repo.runTransaction).not.toHaveBeenCalled();
      expect(repo.upsertCredit).not.toHaveBeenCalled();
    });

    it('treats a P2002 race as an idempotent no-op (no double-credit)', async () => {
      const repo = buildRepo({
        runTransaction: jest.fn(async () => {
          throw p2002();
        }),
      });
      const svc = new PackageBalanceService(repo, allowPolicy);
      await expect(svc.creditFromSale(scope, credit)).resolves.toBeUndefined();
    });
  });

  // Item 2 — the validity is written in the SAME tx as the credit movement, by the F-PV-2 a junction.
  describe('creditFromSale — validade (item 2, junção F-PV-2 a)', () => {
    const expiresArg = (repo: IPackageBalanceRepository) => (repo.upsertCredit as jest.Mock).mock.calls[0][4];

    it('1ª compra (sem linha): expiresAt = venda + N, lido DENTRO da tx', async () => {
      const repo = buildRepo();
      await new PackageBalanceService(repo, allowPolicy).creditFromSale(scope, credit);
      expect(repo.findBalance).toHaveBeenCalledWith(scope, 'cust-1', 'pkg-1', expect.anything());
      expect(expiresArg(repo)).toEqual(new Date('2026-03-31T00:00:00.000Z'));
    });

    it('recompra com saldo > 0 estende para o MAIOR prazo', async () => {
      const repo = buildRepo({ findBalance: jest.fn(async () => balanceRow(5000n, '2026-03-10')) });
      await new PackageBalanceService(repo, allowPolicy).creditFromSale(scope, credit);
      expect(expiresArg(repo)).toEqual(new Date('2026-03-31T00:00:00.000Z'));
    });

    it('recompra com saldo > 0 não ENCURTA um prazo maior já existente', async () => {
      const repo = buildRepo({ findBalance: jest.fn(async () => balanceRow(5000n, '2026-06-30')) });
      await new PackageBalanceService(repo, allowPolicy).creditFromSale(scope, credit);
      expect(expiresArg(repo)).toEqual(new Date('2026-06-30T00:00:00.000Z'));
    });

    it('recompra com saldo 0 reinicia (mesmo se o prazo antigo era maior)', async () => {
      const repo = buildRepo({ findBalance: jest.fn(async () => balanceRow(0n, '2026-12-31')) });
      await new PackageBalanceService(repo, allowPolicy).creditFromSale(scope, credit);
      expect(expiresArg(repo)).toEqual(new Date('2026-03-31T00:00:00.000Z'));
    });

    it('saldo sem validade (null) com saldo > 0 continua null — null vence', async () => {
      const repo = buildRepo({ findBalance: jest.fn(async () => balanceRow(5000n, null)) });
      await new PackageBalanceService(repo, allowPolicy).creditFromSale(scope, credit);
      expect(expiresArg(repo)).toBeNull();
    });

    it('pacote sem validade (validityDays null/0) → null', async () => {
      for (const validityDays of [null, 0]) {
        const repo = buildRepo();
        await new PackageBalanceService(repo, allowPolicy).creditFromSale(scope, { ...credit, validityDays });
        expect(expiresArg(repo)).toBeNull();
      }
    });

    it('re-drive do mesmo saleId não move a validade (portão do movimento)', async () => {
      const repo = buildRepo({ findMovement: jest.fn(async () => ({ id: 'mv-existing' })) });
      await new PackageBalanceService(repo, allowPolicy).creditFromSale(scope, { ...credit, validityDays: 365 });
      expect(repo.upsertCredit).not.toHaveBeenCalled();
    });
  });

  describe('debitForConsumption', () => {
    it('debits when the balance is sufficient (atomic decrement succeeds)', async () => {
      const repo = buildRepo({ tryDecrement: jest.fn(async () => true) });
      const svc = new PackageBalanceService(repo, allowPolicy);
      await svc.debitForConsumption(scope, cmd);
      expect(repo.createMovement).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'debit', deltaCents: 20000 }),
        expect.anything(),
      );
      expect(repo.tryDecrement).toHaveBeenCalledWith(scope, 'cust-1', 'pkg-1', 20000, expect.anything());
    });

    it('blocks (ValidationError) when the balance is insufficient — never goes negative', async () => {
      const repo = buildRepo({ tryDecrement: jest.fn(async () => false) });
      const svc = new PackageBalanceService(repo, allowPolicy);
      await expect(svc.debitForConsumption(scope, cmd)).rejects.toBeInstanceOf(ValidationError);
    });

    it('is idempotent: an existing debit movement skips the transaction', async () => {
      const repo = buildRepo({ findMovement: jest.fn(async () => ({ id: 'mv-existing' })) });
      const svc = new PackageBalanceService(repo, allowPolicy);
      await svc.debitForConsumption(scope, cmd);
      expect(repo.runTransaction).not.toHaveBeenCalled();
      expect(repo.tryDecrement).not.toHaveBeenCalled();
    });
  });

  describe('assertSufficient', () => {
    it('throws when the balance cannot cover the amount', async () => {
      const repo = buildRepo({ findBalance: jest.fn(async () => ({ balanceCents: 100 })) });
      const svc = new PackageBalanceService(repo, allowPolicy);
      await expect(svc.assertSufficient(scope, 'cust-1', 'pkg-1', 200)).rejects.toBeInstanceOf(
        ValidationError,
      );
    });

    it('passes when the balance covers the amount', async () => {
      const repo = buildRepo({ findBalance: jest.fn(async () => ({ balanceCents: 200 })) });
      const svc = new PackageBalanceService(repo, allowPolicy);
      await expect(svc.assertSufficient(scope, 'cust-1', 'pkg-1', 200)).resolves.toBeUndefined();
    });
  });

  // Item 4 — the consumption pre-check refuses from expiresOn + 1 (scope's day, America/Sao_Paulo).
  describe('assertSufficient — vencido (item 4)', () => {
    afterEach(() => jest.useRealTimers());
    const at = (iso: string) => jest.useFakeTimers({ now: new Date(iso), doNotFake: ['nextTick', 'setImmediate'] });

    it('no último dia válido consome', async () => {
      at('2026-03-31T23:30:00-03:00');
      const repo = buildRepo({ findBalance: jest.fn(async () => balanceRow(20000n, '2026-03-31')) });
      await expect(new PackageBalanceService(repo, allowPolicy).assertSufficient(scope, 'cust-1', 'pkg-1', 100)).resolves.toBeUndefined();
    });

    it('em expiresOn + 1 (fuso do escopo) recusa com PACKAGE_BALANCE_EXPIRED', async () => {
      at('2026-04-01T00:30:00-03:00');
      const repo = buildRepo({ findBalance: jest.fn(async () => balanceRow(20000n, '2026-03-31')) });
      const err = await new PackageBalanceService(repo, allowPolicy)
        .assertSufficient(scope, 'cust-1', 'pkg-1', 100)
        .catch((e: unknown) => e);
      expect(err).toBeInstanceOf(PackageBalanceExpiredError);
      expect((err as PackageBalanceExpiredError).errorCode).toBe('PACKAGE_BALANCE_EXPIRED');
      expect((err as PackageBalanceExpiredError).statusCode).toBe(400);
    });

    it('21h de 31/03 em BRT ainda é 31/03 (UTC já é 01/04) — consome', async () => {
      at('2026-04-01T00:30:00Z');
      const repo = buildRepo({ findBalance: jest.fn(async () => balanceRow(20000n, '2026-03-31')) });
      await expect(new PackageBalanceService(repo, allowPolicy).assertSufficient(scope, 'cust-1', 'pkg-1', 100)).resolves.toBeUndefined();
    });
  });

  // Item 6 — expireDue: movement first (fixes the amount), then the conditional decrement, ONE tx.
  describe('expireDue (item 6)', () => {
    it('vence o saldo inteiro em expiresOn + 2', async () => {
      const repo = buildRepo({ findBalanceById: jest.fn(async () => balanceRow(7000n, '2026-03-31')) });
      const r = await new PackageBalanceService(repo, allowPolicy).expireDue(scope, 'bal-1', '2026-04-02');
      expect(r).toEqual({ movementKey: 'expiry:bal-1:2026-03-31', amountCents: 7000, expiresOn: '2026-03-31' });
      expect(repo.findBalanceById).toHaveBeenCalledWith(scope, 'bal-1', expect.anything());
      expect(repo.createMovement).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'expiry', saleId: 'expiry:bal-1:2026-03-31', deltaCents: 7000 }),
        expect.anything(),
      );
      expect(repo.tryDecrement).toHaveBeenCalledWith(scope, 'cust-1', 'pkg-1', 7000, expect.anything());
      expect((repo.createMovement as jest.Mock).mock.invocationCallOrder[0]).toBeLessThan((repo.tryDecrement as jest.Mock).mock.invocationCallOrder[0]);
    });

    it('carência: em expiresOn + 1 não vence', async () => {
      const repo = buildRepo({ findBalanceById: jest.fn(async () => balanceRow(7000n, '2026-03-31')) });
      expect(await new PackageBalanceService(repo, allowPolicy).expireDue(scope, 'bal-1', '2026-04-01')).toBeNull();
      expect(repo.createMovement).not.toHaveBeenCalled();
    });

    it.each([
      ['saldo 0', balanceRow(0n, '2026-03-31')],
      ['sem validade', balanceRow(7000n, null)],
      ['linha inexistente', null],
    ])('%s → no-op', async (_label, row) => {
      const repo = buildRepo({ findBalanceById: jest.fn(async () => row) });
      expect(await new PackageBalanceService(repo, allowPolicy).expireDue(scope, 'bal-1', '2026-04-02')).toBeNull();
      expect(repo.createMovement).not.toHaveBeenCalled();
    });

    it('duplicata (P2002) → no-op', async () => {
      const repo = buildRepo({ runTransaction: jest.fn(async () => { throw p2002(); }) });
      expect(await new PackageBalanceService(repo, allowPolicy).expireDue(scope, 'bal-1', '2026-04-02')).toBeNull();
    });

    it('policy canMutate', async () => {
      const deny: IPackageBalancePolicy = { canMutate: () => false, canRead: () => true };
      await expect(new PackageBalanceService(buildRepo(), deny).expireDue(scope, 'bal-1', '2026-04-02')).rejects.toBeInstanceOf(ForbiddenError);
    });
  });

  // Item 5 — the post-commit debit does NOT check the validity.
  describe('debitForConsumption — não confere validade (item 5)', () => {
    it('debita mesmo com o saldo já vencido (consumo legítimo re-dirigido depois)', async () => {
      const repo = buildRepo({ findBalance: jest.fn(async () => balanceRow(20000n, '2020-01-01')) });
      await new PackageBalanceService(repo, allowPolicy).debitForConsumption(scope, cmd);
      expect(repo.tryDecrement).toHaveBeenCalled();
      expect(repo.findBalance).not.toHaveBeenCalled();
    });
  });

  describe('money boundary', () => {
    it.each([0, -5, 10.5, NaN])('rejects non-positive / non-integer amount %p', async (bad) => {
      const svc = new PackageBalanceService(buildRepo(), allowPolicy);
      await expect(svc.assertSufficient(scope, 'cust-1', 'pkg-1', bad as number)).rejects.toBeInstanceOf(
        ValidationError,
      );
    });
  });

  describe('getBalanceCents', () => {
    it('returns the stored balance, or 0 when no row exists', async () => {
      const withRow = new PackageBalanceService(
        buildRepo({ findBalance: jest.fn(async () => ({ balanceCents: 350 })) }),
        allowPolicy,
      );
      expect(await withRow.getBalanceCents(scope, 'cust-1', 'pkg-1')).toBe(350);
      const noRow = new PackageBalanceService(buildRepo(), allowPolicy);
      expect(await noRow.getBalanceCents(scope, 'cust-1', 'pkg-1')).toBe(0);
    });
  });

  describe('authorization', () => {
    it('denies mutation when policy.canMutate is false', async () => {
      const denyPolicy: IPackageBalancePolicy = { canMutate: () => false, canRead: () => true };
      const svc = new PackageBalanceService(buildRepo(), denyPolicy);
      await expect(svc.creditFromSale(scope, credit)).rejects.toBeInstanceOf(ForbiddenError);
    });
  });
});
