/**
 * reconcilePhysicalInventory — passada WARN-ONLY físico (DT productUnits.stock) × subrazão valorado
 * (InventoryItem.qtyOnHand), por escopo, agregada por produto (LAC-E, F-E3(a)).
 *
 * What is mocked: TODAS as colaborações via PhysicalInventoryDeps (o padrão das demais passadas do
 * job). Nada de prisma/factory — a função é pura sobre os deps.
 *
 * These tests pin:
 *  - a assinatura da LAC-D: estoque físico > 0 SEM linha de subrazão → divergência (o caso
 *    receita-sem-CMV que a passada existe para tornar visível);
 *  - o simétrico: linha valorada sem físico → divergência;
 *  - quantidades iguais → sem divergência;
 *  - F-E1(a): o self-repair do subrazão (reconcileSubledger) roda ANTES da comparação, uma vez por
 *    escopo, e falha dele NÃO mata a comparação (isolada, warn-only);
 *  - falha de um escopo não derruba os demais (fault isolation, mesmo contrato das outras passadas);
 *  - o retorno é {checked, divergences} — a passada NUNCA devolve ReconcileSummary, portanto nunca
 *    entra no merge que congela o watermark (F-W2F-4).
 */
import { reconcilePhysicalInventory, type PhysicalInventoryDeps } from '../accountingSyncReconcile.job';
import type { AccountingScope } from '../../features/accounting/scope/AccountingScope';

const SCOPE_A = { ownerUserId: 'u1', unitId: 'unit-1' };

function buildDeps(over: Partial<PhysicalInventoryDeps> = {}): PhysicalInventoryDeps & {
  reconcileSubledgerMock: jest.Mock;
} {
  const reconcileSubledgerMock = jest.fn(async () => ({ itemsChecked: 0, itemsRepaired: 0 }));
  return {
    listInventoryScopes: jest.fn(async () => [SCOPE_A]),
    listSubledgerItems: jest.fn(async () => [] as Array<{ productRef: string; qtyOnHand: number }>),
    sumPhysicalByProduct: jest.fn(async () => new Map<string, number>()),
    reconcileSubledger: reconcileSubledgerMock,
    reconcileSubledgerMock,
    ...over,
  };
}

describe('reconcilePhysicalInventory — divergências por produto', () => {
  it('assinatura da LAC-D: físico 5 sem linha de subrazão → 1 divergência', async () => {
    const deps = buildDeps({
      sumPhysicalByProduct: jest.fn(async () => new Map([['prod-1', 5]])),
    });
    const r = await reconcilePhysicalInventory(deps);
    expect(r).toEqual({ checked: 1, divergences: 1 });
  });

  it('simétrico: subrazão qty 3 sem físico → 1 divergência; iguais → 0', async () => {
    const deps = buildDeps({
      listSubledgerItems: jest.fn(async () => [
        { productRef: 'orfao', qtyOnHand: 3 }, // sem físico → diverge
        { productRef: 'ok', qtyOnHand: 7 }, // bate com o físico → não diverge
      ]),
      sumPhysicalByProduct: jest.fn(async () => new Map([['ok', 7]])),
    });
    const r = await reconcilePhysicalInventory(deps);
    expect(r).toEqual({ checked: 2, divergences: 1 });
  });

  it('quantidade divergente no MESMO produto (físico 10 × subrazão 4) → acusa', async () => {
    const deps = buildDeps({
      listSubledgerItems: jest.fn(async () => [{ productRef: 'p', qtyOnHand: 4 }]),
      sumPhysicalByProduct: jest.fn(async () => new Map([['p', 10]])),
    });
    const r = await reconcilePhysicalInventory(deps);
    expect(r).toEqual({ checked: 1, divergences: 1 });
  });
});

describe('reconcilePhysicalInventory — F-E1(a) e fault isolation', () => {
  it('chama o self-repair do subrazão UMA vez por escopo, antes da comparação', async () => {
    const order: string[] = [];
    const deps = buildDeps({
      reconcileSubledger: jest.fn(async () => {
        order.push('repair');
        return { itemsChecked: 2, itemsRepaired: 1 };
      }),
      listSubledgerItems: jest.fn(async () => {
        order.push('compare');
        return [];
      }),
    });
    await reconcilePhysicalInventory(deps);
    expect(deps.reconcileSubledger).toHaveBeenCalledTimes(1);
    expect(order[0]).toBe('repair'); // repara ANTES de ler para comparar
  });

  it('falha do self-repair NÃO mata a comparação do escopo (warn-only isolado)', async () => {
    const deps = buildDeps({
      reconcileSubledger: jest.fn(async () => {
        throw new Error('repair boom');
      }),
      sumPhysicalByProduct: jest.fn(async () => new Map([['p', 2]])),
    });
    const r = await reconcilePhysicalInventory(deps);
    expect(r).toEqual({ checked: 1, divergences: 1 }); // comparou mesmo assim
  });

  it('falha de um escopo não derruba os demais', async () => {
    const scopeB = { ownerUserId: 'u2', unitId: 'unit-2' };
    const deps = buildDeps({
      listInventoryScopes: jest.fn(async () => [SCOPE_A, scopeB]),
      listSubledgerItems: jest.fn(async (scope: AccountingScope) => {
        if (scope.ownerUserId === 'u1') throw new Error('scope A boom');
        return [{ productRef: 'p', qtyOnHand: 1 }];
      }),
      sumPhysicalByProduct: jest.fn(async () => new Map([['p', 1]])),
    });
    const r = await reconcilePhysicalInventory(deps);
    // Escopo A falhou inteiro (isolado); escopo B comparou 1 produto sem divergência.
    expect(r).toEqual({ checked: 1, divergences: 0 });
  });
});
