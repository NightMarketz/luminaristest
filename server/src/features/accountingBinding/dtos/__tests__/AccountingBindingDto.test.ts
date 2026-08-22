/**
 * AccountingBindingDto — gate de forma da fronteira do binding compilado (BE-INCR-BINDING-PRESS
 * Fase 0, item 2/3 do BRIEF). Cobre exatamente o que `dtoShapeSnapshot.test.ts` NÃO enxerga (este
 * módulo mora em `features/accountingBinding/`, fora do diretório varrido pelo snapshot de
 * `features/accounting/dtos/` — ver nota no retorno estruturado) e o que `z.toJSONSchema()` não
 * representa: os 3 pontos onde um fork do ADR-P1 foi ratificado e o shape TEM que refletir isso —
 *   - F-P1-5(a): `roleSlots[].accountCode` é OBRIGATÓRIO (nunca o shape condicional do dossiê).
 *   - F-P1-1(b): `archetypeKey` aceita as 5 chaves classe-1 + `subledger_command` (6 no total).
 *   - invariante 5 do ADR: `fieldSlots[].transform` é um enum FECHADO de 2 valores, nunca string livre.
 */
import { AccountingBindingV1Schema, EventBindingSchema, FieldSlotSchema, RoleSlotSchema } from '../AccountingBindingDto';

const roleSlot = (role = 'controle-recebível', accountCode = '1.1.2') => ({ role, accountCode });
const fieldSlot = (slotName = 'amountCents', sourceField = 'event.amount', transform?: string) =>
  transform === undefined ? { slotName, sourceField } : { slotName, sourceField, transform };

const validEventBinding = {
  eventKey: 'salon.sale.finalized',
  archetypeKey: 'revenue_recognition',
  fieldSlots: [fieldSlot()],
  roleSlots: [roleSlot()],
};

const validBinding = {
  sectorKey: 'beautySalon',
  bindingVersion: 1,
  compiledAt: '2026-08-21T00:00:00.000Z',
  compiledFromHash: 'sha256:abc123',
  eventBindings: [validEventBinding],
};

describe('AccountingBindingV1Schema — CONTROLE (sem isto os negativos são vazios)', () => {
  it('accepts um binding bem-formado com 1 eventBinding', () => {
    expect(AccountingBindingV1Schema.safeParse(validBinding).success).toBe(true);
  });
});

describe('RoleSlotSchema — F-P1-5(a) ratificada: accountCode OBRIGATÓRIO', () => {
  it('accepts role+accountCode juntos (CONTROLE)', () => {
    expect(RoleSlotSchema.safeParse(roleSlot()).success).toBe(true);
  });

  it('rejects roleSlot SEM accountCode — o shape condicional do dossiê (F-P1-5b) colapsou', () => {
    const parsed = RoleSlotSchema.safeParse({ role: 'controle-recebível' });
    expect(parsed.success).toBe(false);
  });

  it('rejects accountCode vazio (min(1))', () => {
    expect(RoleSlotSchema.safeParse({ role: 'controle-recebível', accountCode: '' }).success).toBe(false);
  });

  it('o binding inteiro reprova quando UM roleSlot no meio do array não tem accountCode', () => {
    const broken = {
      ...validBinding,
      eventBindings: [
        {
          ...validEventBinding,
          roleSlots: [roleSlot('controle-recebível', '1.1.2'), { role: 'receita-serviço' }],
        },
      ],
    };
    expect(AccountingBindingV1Schema.safeParse(broken).success).toBe(false);
  });
});

describe('archetypeKey — enum FECHADO de 6 chaves (F-P1-1b ratificada)', () => {
  it.each([
    'revenue_recognition',
    'settlement',
    'reversal',
    'performance_liability',
    'cogs',
    'subledger_command',
  ])('accepts a chave classe-1/classe-2 "%s"', (archetypeKey) => {
    expect(
      EventBindingSchema.safeParse({ ...validEventBinding, archetypeKey }).success,
    ).toBe(true);
  });

  it('rejects uma chave fora do catálogo fechado (typo ou arquétipo inventado)', () => {
    expect(
      EventBindingSchema.safeParse({ ...validEventBinding, archetypeKey: 'receita_generica' }).success,
    ).toBe(false);
  });
});

describe('fieldSlots[].transform — enum FECHADO, nunca expressão livre (invariante 5 do ADR-P1)', () => {
  it.each(['cents_from_reais', 'identity'])('accepts o transform do catálogo fixo "%s"', (transform) => {
    expect(FieldSlotSchema.safeParse(fieldSlot('amountCents', 'event.amount', transform)).success).toBe(true);
  });

  it('default é "identity" quando o campo é omitido', () => {
    const parsed = FieldSlotSchema.safeParse(fieldSlot('amountCents', 'event.amount', undefined));
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.transform).toBe('identity');
  });

  it('rejects uma expressão livre no lugar do enum — isto reabriria o templateJson rejeitado (master map §4)', () => {
    expect(
      FieldSlotSchema.safeParse(fieldSlot('amountCents', 'event.amount', 'amount * 100')).success,
    ).toBe(false);
  });
});

describe('AccountingBindingV1Schema — `.strict()` em todo nível', () => {
  it('rejects chave desconhecida no topo', () => {
    expect(AccountingBindingV1Schema.safeParse({ ...validBinding, extra: true }).success).toBe(false);
  });

  it('rejects chave desconhecida em eventBindings[]', () => {
    const broken = {
      ...validBinding,
      eventBindings: [{ ...validEventBinding, notes: 'oops' }],
    };
    expect(AccountingBindingV1Schema.safeParse(broken).success).toBe(false);
  });

  it('rejects chave desconhecida em fieldSlots[] e roleSlots[]', () => {
    expect(FieldSlotSchema.safeParse({ ...fieldSlot(), extra: 1 }).success).toBe(false);
    expect(RoleSlotSchema.safeParse({ ...roleSlot(), extra: 1 }).success).toBe(false);
  });

  it('rejects bindingVersion não-positivo ou fracionário (monotônico, invariante 4 do ADR)', () => {
    expect(AccountingBindingV1Schema.safeParse({ ...validBinding, bindingVersion: 0 }).success).toBe(false);
    expect(AccountingBindingV1Schema.safeParse({ ...validBinding, bindingVersion: -1 }).success).toBe(false);
    expect(AccountingBindingV1Schema.safeParse({ ...validBinding, bindingVersion: 1.5 }).success).toBe(false);
  });

  it('rejects compiledAt que não é datetime ISO', () => {
    expect(AccountingBindingV1Schema.safeParse({ ...validBinding, compiledAt: '2026-08-21' }).success).toBe(false);
  });

  it('rejects eventBindings vazio (min(1))', () => {
    expect(AccountingBindingV1Schema.safeParse({ ...validBinding, eventBindings: [] }).success).toBe(false);
  });

  it('rejects fieldSlots ou roleSlots vazios dentro de um eventBinding (min(1) cada)', () => {
    expect(
      EventBindingSchema.safeParse({ ...validEventBinding, fieldSlots: [] }).success,
    ).toBe(false);
    expect(
      EventBindingSchema.safeParse({ ...validEventBinding, roleSlots: [] }).success,
    ).toBe(false);
  });
});
