/**
 * ReferentialCatalogDto — a coerção de `analyticOnly`, que o gate de forma NÃO representa.
 *
 * O snapshot registra `analyticOnly` como a união de ENTRADA
 * (`anyOf: [boolean, enum["true","false"]]`); o `.transform` que a converte na SAÍDA booleana
 * é invisível para `z.toJSONSchema()`. Isso importa porque o controller alimenta este schema
 * com `req.query` (`referentialCatalogController.ts:74`), onde TODO valor chega string: sem a
 * união explícita + transform, `?analyticOnly=false` viraria `true` e o picker devolveria
 * também os códigos sintéticos, que não são destino válido de mapeamento.
 *
 * Este DTO é o exemplo CORRETO do padrão. O mesmo campo booleano de query em
 * `CounterpartyDto`/`DimensionDto` usa `z.coerce.boolean()`, que NÃO tem esse cuidado —
 * achado reportado no PR, fora do escopo deste arquivo.
 *
 * Molde: InventoryDto.test.ts — todo negativo com seu controle positivo.
 */
import {
  ImportReferentialCatalogSchema,
  ReferentialCatalogQuerySchema,
} from '../ReferentialCatalogDto';

const validQuery = { unitId: 'unit-1', version: '2025' };
const validImport = { unitId: 'unit-1', layoutVersion: '2025' };

/** Saída de `analyticOnly` para cada entrada aceita — é a tabela que o snapshot não cobre. */
const parseAnalyticOnly = (input: Record<string, unknown>) => {
  const parsed = ReferentialCatalogQuerySchema.safeParse({ ...validQuery, ...input });
  expect(parsed.success).toBe(true);
  return parsed.success ? parsed.data.analyticOnly : undefined;
};

describe('ReferentialCatalogQuerySchema — analyticOnly (união + transform)', () => {
  it('accepts a query mínima (CONTROLE — sem isto todo negativo abaixo é vazio)', () => {
    expect(ReferentialCatalogQuerySchema.safeParse(validQuery).success).toBe(true);
  });

  it('converte a STRING "false" em false — a invariante que o z.coerce.boolean() erra', () => {
    expect(parseAnalyticOnly({ analyticOnly: 'false' })).toBe(false);
  });

  it('converte a string "true" em true, e preserva os booleanos de verdade', () => {
    expect(parseAnalyticOnly({ analyticOnly: 'true' })).toBe(true);
    expect(parseAnalyticOnly({ analyticOnly: true })).toBe(true);
    expect(parseAnalyticOnly({ analyticOnly: false })).toBe(false);
  });

  it('a ausência do campo vira false, nunca undefined (a saída é sempre booleana)', () => {
    expect(parseAnalyticOnly({})).toBe(false);
    expect(typeof parseAnalyticOnly({})).toBe('boolean');
  });

  it('rejects qualquer outra string — a união é fechada em "true"|"false"', () => {
    for (const bad of ['yes', 'no', '1', '0', 'TRUE', 'False', '']) {
      expect(
        ReferentialCatalogQuerySchema.safeParse({ ...validQuery, analyticOnly: bad }).success,
      ).toBe(false);
    }
  });
});

describe('ReferentialCatalogDto — campos e fechamento', () => {
  it('accepts o import bem-formado (CONTROLE)', () => {
    expect(ImportReferentialCatalogSchema.safeParse(validImport).success).toBe(true);
  });

  it('rejects unitId fora do charset de id (guarda anti-travessia)', () => {
    for (const bad of ['../etc', 'a/b', 'a.b', '']) {
      expect(ImportReferentialCatalogSchema.safeParse({ ...validImport, unitId: bad }).success).toBe(false);
      expect(ReferentialCatalogQuerySchema.safeParse({ ...validQuery, unitId: bad }).success).toBe(false);
    }
  });

  it('rejects versão só de espaços (trim antes do min(1) — minLength do snapshot não vê)', () => {
    expect(ImportReferentialCatalogSchema.safeParse({ ...validImport, layoutVersion: '  ' }).success).toBe(false);
    expect(ReferentialCatalogQuerySchema.safeParse({ ...validQuery, version: '\t' }).success).toBe(false);
  });

  it('rejects filtro q acima de 120 caracteres, e aceita exatamente 120', () => {
    expect(ReferentialCatalogQuerySchema.safeParse({ ...validQuery, q: 'x'.repeat(121) }).success).toBe(false);
    expect(ReferentialCatalogQuerySchema.safeParse({ ...validQuery, q: 'x'.repeat(120) }).success).toBe(true);
  });

  it('rejects chave desconhecida nos dois schemas (.strict())', () => {
    expect(ImportReferentialCatalogSchema.safeParse({ ...validImport, version: '2025' }).success).toBe(false);
    expect(ReferentialCatalogQuerySchema.safeParse({ ...validQuery, analyticOnl: 'true' }).success).toBe(false);
  });
});
