/**
 * queryPrimitives — o canônico `queryBoolean()` e os dois sítios que ele conserta.
 *
 * O defeito: `z.coerce.boolean()` delega ao `Boolean(v)` do JS, e todo valor de `req.query`
 * chega STRING → `Boolean("false") === true`. `GET /counterparties?includeArchived=false`
 * devolvia TAMBÉM as arquivadas; só omitir o parâmetro dava o comportamento correto.
 * Os controllers alimentam estes schemas direto com `req.query`
 * (`counterpartyController.ts:24`, `dimensionController.ts:26`).
 *
 * Por que o gate de forma não pegava: `z.toJSONSchema()` renderiza `z.coerce.boolean()` como
 * um inocente `{"type":"boolean"}` — a coerção é comportamento, não forma.
 *
 * Nota sobre o FE: `counterparties.service.ts:71` e `dimensions.service.ts:157` mandam
 * `query.includeArchived ? 'true' : undefined` — isto é, CONTORNAM o defeito nunca enviando
 * "false". O contorno é evidência de que a fronteira estava errada, e é também por que a
 * correção não quebra o cliente atual: "true" e a ausência seguem valendo o mesmo.
 */
import { queryBoolean } from '../queryPrimitives';
import { ListCounterpartiesQuerySchema } from '../CounterpartyDto';
import { ListDimensionsQuerySchema } from '../DimensionDto';
import { ReferentialCatalogQuerySchema } from '../ReferentialCatalogDto';
import { z } from 'zod';

describe('queryBoolean() — canônico de booleano de query-string', () => {
  const schema = z.object({ flag: queryBoolean() });
  const parse = (input: Record<string, unknown>) => {
    const parsed = schema.safeParse(input);
    expect(parsed.success).toBe(true);
    return parsed.success ? parsed.data.flag : undefined;
  };

  it('a STRING "false" vira false — a invariante que o z.coerce.boolean() inverte', () => {
    expect(parse({ flag: 'false' })).toBe(false);
  });

  it('a string "true" vira true e os booleanos de verdade passam intactos', () => {
    expect(parse({ flag: 'true' })).toBe(true);
    expect(parse({ flag: true })).toBe(true);
    expect(parse({ flag: false })).toBe(false);
  });

  it('ausente vira false, e a saída é SEMPRE booleana (nunca undefined)', () => {
    expect(parse({})).toBe(false);
    expect(typeof parse({})).toBe('boolean');
  });

  it('rejects qualquer outra string em vez de virar true silenciosamente', () => {
    for (const bad of ['yes', 'no', '1', '0', 'TRUE', 'False', '']) {
      expect(schema.safeParse({ flag: bad }).success).toBe(false);
    }
  });
});

describe('includeArchived — os dois sítios consertados', () => {
  const cases = [
    ['ListCounterpartiesQuerySchema', ListCounterpartiesQuerySchema] as const,
    ['ListDimensionsQuerySchema', ListDimensionsQuerySchema] as const,
  ];

  it.each(cases)('%s: "false" NÃO inclui arquivados (era o defeito)', (_name, schema) => {
    const parsed = schema.safeParse({ unitId: 'unit-1', includeArchived: 'false' });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.includeArchived).toBe(false);
  });

  it.each(cases)('%s: "true" e a omissão seguem valendo o que o FE já espera', (_name, schema) => {
    const on = schema.safeParse({ unitId: 'unit-1', includeArchived: 'true' });
    const off = schema.safeParse({ unitId: 'unit-1' });
    expect(on.success && on.data.includeArchived).toBe(true);
    expect(off.success && off.data.includeArchived).toBe(false);
  });

  it.each(cases)('%s: string fora do par fechado é 400', (_name, schema) => {
    expect(schema.safeParse({ unitId: 'unit-1', includeArchived: 'sim' }).success).toBe(false);
  });
});

describe('ReferentialCatalogQuerySchema — promovido ao canônico sem mudar de comportamento', () => {
  it('mantém a tabela de saída que já tinha antes da extração', () => {
    const out = (v: Record<string, unknown>) => {
      const p = ReferentialCatalogQuerySchema.safeParse({ unitId: 'unit-1', version: '2025', ...v });
      return p.success ? p.data.analyticOnly : 'REJEITADO';
    };
    expect(out({ analyticOnly: 'false' })).toBe(false);
    expect(out({ analyticOnly: 'true' })).toBe(true);
    expect(out({})).toBe(false);
    expect(out({ analyticOnly: 'yes' })).toBe('REJEITADO');
  });
});
