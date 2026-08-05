/**
 * InventoryDto — barreira do achado R3 F3 (`fronteira-de-dto-quase-nao-testada`).
 *
 * Este arquivo existe por uma mutação NOMEADA: M2 do AV-R3 (`InventoryDto.ts:22`, teto
 * `MAX_CENTS + 1`) sobreviveu porque nenhum teste atravessava este DTO. O caso
 * "rejects totalValueCents over MAX_CENTS" é o que mata M2; os demais fecham as outras
 * invariantes que a fronteira declara (qty positivo, data-only real, `.strict()`).
 *
 * Molde: PayableDto.test.ts. Todo caso negativo vem acompanhado do controle positivo —
 * um teste que espera falha passa por qualquer falha, inclusive por payload base quebrado.
 */
import {
  InventoryScopeQuerySchema,
  ListInventoryQuerySchema,
  ReceiveStockSchema,
} from '../InventoryDto';
import { MAX_CENTS } from '../../models/money';

const validReceive = {
  unitId: 'unit-1',
  productRef: 'SKU-1',
  description: 'Shampoo 500ml',
  qty: 10,
  totalValueCents: 250000,
  occurredAt: '2026-06-10',
};

describe('ReceiveStockSchema', () => {
  it('accepts a well-formed payload (CONTROLE — sem isto, todo caso negativo abaixo é vazio)', () => {
    expect(ReceiveStockSchema.safeParse(validReceive).success).toBe(true);
  });

  it('rejects totalValueCents over MAX_CENTS (teto Int32, ACC-014 — mata M2 do AV-R3)', () => {
    expect(
      ReceiveStockSchema.safeParse({ ...validReceive, totalValueCents: MAX_CENTS + 1 }).success,
    ).toBe(false);
  });

  it('accepts exactly MAX_CENTS (o teto é inclusivo — a barreira não é um off-by-one)', () => {
    expect(
      ReceiveStockSchema.safeParse({ ...validReceive, totalValueCents: MAX_CENTS }).success,
    ).toBe(true);
  });

  it('rejects negative and fractional cents (centavos são inteiros, nunca float)', () => {
    expect(ReceiveStockSchema.safeParse({ ...validReceive, totalValueCents: -1 }).success).toBe(false);
    expect(ReceiveStockSchema.safeParse({ ...validReceive, totalValueCents: 1.5 }).success).toBe(false);
  });

  it('accepts zero cents (recebimento sem custo é nonnegative, não positive)', () => {
    expect(ReceiveStockSchema.safeParse({ ...validReceive, totalValueCents: 0 }).success).toBe(true);
  });

  it('rejects qty zero / negative / fractional (média móvel divide por qtyOnHand)', () => {
    expect(ReceiveStockSchema.safeParse({ ...validReceive, qty: 0 }).success).toBe(false);
    expect(ReceiveStockSchema.safeParse({ ...validReceive, qty: -1 }).success).toBe(false);
    expect(ReceiveStockSchema.safeParse({ ...validReceive, qty: 2.5 }).success).toBe(false);
  });

  it('rejects a non-calendar date (2026-02-30 rola para 03-02; regex nu deixaria passar)', () => {
    expect(ReceiveStockSchema.safeParse({ ...validReceive, occurredAt: '2026-02-30' }).success).toBe(false);
    expect(ReceiveStockSchema.safeParse({ ...validReceive, occurredAt: '2026-06-31' }).success).toBe(false);
  });

  it('rejects a datetime string (occurredAt é data-only, não instante)', () => {
    expect(
      ReceiveStockSchema.safeParse({ ...validReceive, occurredAt: '2026-06-10T12:00:00Z' }).success,
    ).toBe(false);
  });

  it('rejects unknown keys (.strict — typo falha alto em vez de ser descartado em silêncio)', () => {
    expect(
      ReceiveStockSchema.safeParse({ ...validReceive, totalValueCent: 250000 }).success,
    ).toBe(false);
  });
});

describe('ListInventoryQuerySchema', () => {
  it('accepts the closed set of statuses and rejects anything outside it', () => {
    expect(ListInventoryQuerySchema.safeParse({ unitId: 'u1', status: 'ACTIVE' }).success).toBe(true);
    expect(ListInventoryQuerySchema.safeParse({ unitId: 'u1', status: 'ARCHIVED' }).success).toBe(true);
    expect(ListInventoryQuerySchema.safeParse({ unitId: 'u1', status: 'DELETED' }).success).toBe(false);
  });

  it('defaults page/limit and caps limit at 200 (paginação não é aberta)', () => {
    const parsed = ListInventoryQuerySchema.safeParse({ unitId: 'u1' });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.page).toBe(1);
      expect(parsed.data.limit).toBe(50);
    }
    expect(ListInventoryQuerySchema.safeParse({ unitId: 'u1', limit: 201 }).success).toBe(false);
    expect(ListInventoryQuerySchema.safeParse({ unitId: 'u1', page: 0 }).success).toBe(false);
  });
});

describe('InventoryScopeQuerySchema', () => {
  it('exige unitId não vazio (chave de escopo, não decoração)', () => {
    expect(InventoryScopeQuerySchema.safeParse({ unitId: 'u1' }).success).toBe(true);
    expect(InventoryScopeQuerySchema.safeParse({ unitId: '' }).success).toBe(false);
    expect(InventoryScopeQuerySchema.safeParse({}).success).toBe(false);
  });
});
