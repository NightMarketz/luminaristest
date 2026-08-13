import { CreatePayableSchema, ListPayablesQuerySchema, RegisterPaymentSchema } from '../PayableDto';
import { MAX_CENTS } from '../../models/money';

const validCreate = {
  unitId: 'unit-1', supplierName: 'ACME', documentNumber: 'NF-1', description: 'x',
  issueDate: '2026-06-10', dueDate: '2026-07-10', amountCents: 50000, expenseAccountId: 'exp-1',
};

describe('CreatePayableSchema', () => {
  it('accepts a well-formed payload', () => {
    expect(CreatePayableSchema.safeParse(validCreate).success).toBe(true);
  });

  it('rejects amountCents over MAX_CENTS (Int32 ceiling, ACC-014)', () => {
    expect(CreatePayableSchema.safeParse({ ...validCreate, amountCents: MAX_CENTS + 1 }).success).toBe(false);
  });

  it('rejects zero / negative amount', () => {
    expect(CreatePayableSchema.safeParse({ ...validCreate, amountCents: 0 }).success).toBe(false);
    expect(CreatePayableSchema.safeParse({ ...validCreate, amountCents: -1 }).success).toBe(false);
  });

  it('rejects a non-calendar date (2026-02-30 rolls, so round-trip fails)', () => {
    expect(CreatePayableSchema.safeParse({ ...validCreate, issueDate: '2026-02-30' }).success).toBe(false);
  });

  it('rejects unknown keys (.strict — a typo fails loud, not silently dropped)', () => {
    expect(CreatePayableSchema.safeParse({ ...validCreate, amuntCents: 50000 }).success).toBe(false);
  });
});

describe('RegisterPaymentSchema', () => {
  const valid = { unitId: 'unit-1', method: 'Pix', paidAt: '2026-07-05', amountCents: 50000 };

  it('accepts the closed set of methods', () => {
    for (const method of ['Cash', 'Pix', 'TED', 'Boleto']) {
      expect(RegisterPaymentSchema.safeParse({ ...valid, method }).success).toBe(true);
    }
  });

  it('rejects a method outside the closed map', () => {
    expect(RegisterPaymentSchema.safeParse({ ...valid, method: 'Crypto' }).success).toBe(false);
  });

  it('rejects amountCents over MAX_CENTS', () => {
    expect(RegisterPaymentSchema.safeParse({ ...valid, amountCents: MAX_CENTS + 1 }).success).toBe(false);
  });
});

/**
 * BE-INCR-SUBLEDGER-FILTERS §2, comportamento 8 — a fronteira rejeita valor inválido em vez de
 * silenciá-lo. O caso que importa é a data: uma regex de YYYY-MM-DD aceita '2026-02-30', e o
 * `new Date` rola para 03-02 em SILÊNCIO — a faixa passaria a filtrar por um dia que ninguém pediu.
 */
describe('ListPayablesQuerySchema — filtros (BE-INCR-SUBLEDGER-FILTERS)', () => {
  const base = { unitId: 'u1' };

  it('aceita a query sem nenhum filtro novo (todos opcionais)', () => {
    const r = ListPayablesQuerySchema.safeParse(base);
    expect(r.success).toBe(true);
  });

  it('aceita os quatro filtros juntos', () => {
    const r = ListPayablesQuerySchema.safeParse({
      ...base,
      counterpartyId: 'cp-1',
      dueFrom: '2026-03-01',
      dueTo: '2026-03-31',
      q: 'aluguel',
    });
    expect(r.success).toBe(true);
  });

  it('rejeita data que a regex aceitaria mas o calendário não tem', () => {
    // Par positivo/negativo: sem o 03-01 abaixo, um schema totalmente quebrado também passaria.
    expect(ListPayablesQuerySchema.safeParse({ ...base, dueFrom: '2026-03-01' }).success).toBe(true);
    expect(ListPayablesQuerySchema.safeParse({ ...base, dueFrom: '2026-02-30' }).success).toBe(false);
    expect(ListPayablesQuerySchema.safeParse({ ...base, dueTo: '2026-06-31' }).success).toBe(false);
  });

  it('rejeita data fora do formato date-only', () => {
    expect(ListPayablesQuerySchema.safeParse({ ...base, dueFrom: '01/03/2026' }).success).toBe(false);
    expect(ListPayablesQuerySchema.safeParse({ ...base, dueTo: '2026-03-01T00:00:00Z' }).success).toBe(false);
  });

  it('rejeita filtro de texto vazio (string vazia casaria tudo)', () => {
    expect(ListPayablesQuerySchema.safeParse({ ...base, q: '' }).success).toBe(false);
    expect(ListPayablesQuerySchema.safeParse({ ...base, counterpartyId: '' }).success).toBe(false);
  });
});
