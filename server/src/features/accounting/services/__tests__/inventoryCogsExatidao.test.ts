/**
 * Onda 2.3 (auditoria de 24/11/2026) — `InventoryService.recordSaleCogs`: CMV = total × qty ÷ qtyOnHand, meio-para-cima,
 * resíduo absorvido (D6). `qtyOnHand` é `Int` e a baixa só aceita inteiro positivo (`assertQty`; unidade fracionária está
 * fora do MVP), então 0,333 e 2,5 NÃO são quantidades alcançáveis: a recusa é o comportamento fixado aqui. O que sobra de
 * "float" é o produto `total × qty`, que passa de 2^53 com totais e quantidades altos.
 */
import { InventoryService } from '../InventoryService';
import { ValidationError } from '../../../../lib/errors';
import { resolveAccountingScopeInternal } from '../../scope/resolveAccountingScopeInternal';
import type { IInventoryRepository } from '../../repositories/IInventoryRepository';
import type { InventoryItem } from 'generated/prisma';

const scope = resolveAccountingScopeInternal({ userId: 'owner-1' }, 'unit-1');
const meioParaCima = (n: bigint, d: bigint): bigint => (2n * n + d) / (2n * d);

/** Só o que `recordSaleCogs` toca: leitura do item, CAS e movimento. A tx é passada adiante e ignorada. */
function servicoCom(item: Pick<InventoryItem, 'qtyOnHand' | 'totalValueCents'>) {
  const baixas: Array<{ qty: number; valueDelta: number }> = [];
  const repo = {
    runTransaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({}),
    findByProductRef: async () => ({ id: 'i1', description: 'Shampoo', ...item }),
    findMovementBySource: async () => null,
    decrementForCogs: async (_s: unknown, _id: string, qty: number, valueDelta: number) => (baixas.push({ qty, valueDelta }), 1),
    createMovement: async () => ({}),
  } as unknown as IInventoryRepository;
  const policy = { canManageInventory: () => true } as never;
  return { service: new InventoryService(repo, {} as never, {} as never, {} as never, policy), baixas };
}
const baixar = (s: InventoryService, qty: number) => s.recordSaleCogs(scope, { saleId: 'v1', unitId: 'unit-1', occurredAt: new Date('2026-11-10T12:00:00Z'), lines: [{ productRef: 'p1', qty }] });

describe('recordSaleCogs — quantidade fracionária é recusada (qtyOnHand é Int)', () => {
  it.each([0.333, 2.5, 1 / 3, -1, 0])('qty %p ⇒ ValidationError "A quantidade deve ser um inteiro positivo."', async (qty) => {
    const { service, baixas } = servicoCom({ qtyOnHand: 10, totalValueCents: 1000n });
    await expect(baixar(service, qty)).rejects.toThrow(new ValidationError('A quantidade deve ser um inteiro positivo.'));
    expect(baixas).toHaveLength(0);
  });
});

describe('recordSaleCogs — CMV pelo custo médio, meio-para-cima', () => {
  it.each([
    // [total em centavos, qtyOnHand, qty, CMV esperado]
    [3n, 2, 1, 2n], // 1,5 → 2
    [5n, 2, 1, 3n], // 2,5 → 3
    [1000n, 3, 1, 333n], // 333,33 → 333
    [1000n, 3, 2, 667n], // 666,67 → 667
    [2_147_483_647n, 3, 1, 715_827_882n], // 715.827.882,33
    [100n, 7, 7, 100n], // baixa o saldo todo: absorve o resíduo
  ])('total %p, saldo %p, baixa %p ⇒ %p', async (total, onHand, qty, esperado) => {
    const { service, baixas } = servicoCom({ qtyOnHand: onHand, totalValueCents: total });
    expect((await baixar(service, qty)).totalCogsCents).toBe(Number(esperado));
    expect(baixas).toEqual([{ qty, valueDelta: Number(esperado) }]);
  });

  it('total × qty acima de 2^53 (R$ 21,4 mi × 5.000.001 un.): igual ao oráculo BigInt (controle: o float antigo também acerta aqui)', async () => {
    const total = 2_147_483_647n;
    const qty = 5_000_001;
    const onHand = 10_000_002; // meio exato: 1.073.741.823,5
    expect(Number(total) * qty).toBeGreaterThan(Number.MAX_SAFE_INTEGER);
    const { service } = servicoCom({ qtyOnHand: onHand, totalValueCents: total });
    expect((await baixar(service, qty)).totalCogsCents).toBe(Number(meioParaCima(total * BigInt(qty), BigInt(onHand))));
  });

  it('contraexemplo que o float erra: 2146733094 × 3465662 ÷ 4931083 = 1508766189 exato (Math.round de float dava 1508766190)', async () => {
    const total = 2_146_733_094n;
    const qty = 3_465_662;
    const onHand = 4_931_083;
    // Prova que o caso morde: o código antigo (`Math.round((total * qty) / onHand)` em float) diverge do oráculo.
    expect(Math.round((Number(total) * qty) / onHand)).toBe(1_508_766_190);
    expect(meioParaCima(total * BigInt(qty), BigInt(onHand))).toBe(1_508_766_189n);
    const { service, baixas } = servicoCom({ qtyOnHand: onHand, totalValueCents: total });
    expect((await baixar(service, qty)).totalCogsCents).toBe(1_508_766_189);
    expect(baixas).toEqual([{ qty, valueDelta: 1_508_766_189 }]);
  });
});
