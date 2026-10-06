/**
 * BE-INCR-PIS-COFINS PR-1 (nó X8) — contratos materializados em Zod:
 *  - item 1 (F-X8-3 a): PRESUMIDO + NAO_CUMULATIVO ⇒ erro no `pisCofinsRegime` (o refine é invisível ao snapshot de shape —
 *    o teste é este), no PUT e na proposta de política (mesmo refine);
 *  - item 5 (F-X8-7 a): linha `PIS_COFINS` de `recoverableTaxLines` aceita base/parcelas opcionais com pis + cofins = amount.
 */
import { FiscalProfilePolicyPayloadSchema, UpsertFiscalProfileSchema } from '../FiscalProfileDto';
import { CreatePayableSchema } from '../PayableDto';

describe('item 1 — regime coerente na unidade', () => {
  const perfil = (regimeTributario: string, pisCofinsRegime: string) => ({ unitId: 'u1', regimeTributario, icmsContribuinte: false, pisCofinsRegime });

  it('PRESUMIDO + NAO_CUMULATIVO ⇒ erro no path pisCofinsRegime citando o art. 122', () => {
    const r = UpsertFiscalProfileSchema.safeParse(perfil('PRESUMIDO', 'NAO_CUMULATIVO'));
    expect(r.success).toBe(false);
    const issue = r.error!.issues.find((i) => i.path.join('.') === 'pisCofinsRegime');
    expect(issue?.message).toContain('IN RFB 2.121/2022 art. 122');
    const { unitId: _u, ...payload } = perfil('PRESUMIDO', 'NAO_CUMULATIVO');
    expect(FiscalProfilePolicyPayloadSchema.safeParse(payload).success).toBe(false);
  });

  it('PRESUMIDO + CUMULATIVO, REAL + NAO_CUMULATIVO e REAL + CUMULATIVO passam (o último é recusado só na prévia, item 9)', () => {
    for (const [r, p] of [['PRESUMIDO', 'CUMULATIVO'], ['REAL', 'NAO_CUMULATIVO'], ['REAL', 'CUMULATIVO']]) {
      expect(UpsertFiscalProfileSchema.safeParse(perfil(r, p)).success).toBe(true);
    }
  });
});

describe('item 5 — linha PIS_COFINS com base e parcelas', () => {
  const nota = (pcLine: Record<string, unknown>) => ({
    unitId: 'unit-1', supplierName: 'ACME', documentNumber: 'NF-1', description: 'x',
    issueDate: '2026-06-10', dueDate: '2026-07-10', amountCents: 19333,
    inventoryMultiItem: true,
    inventoryItems: [{ productRef: 'p1', qty: 1, valueCents: 19333 - 784 }],
    recoverableTaxLines: [{ accountId: 'acc-pc', amountCents: 784, kind: 'PIS_COFINS', ...pcLine }],
  });

  it('aceita a linha sem os campos (nota anterior) e com pis + cofins = amount', () => {
    expect(CreatePayableSchema.safeParse(nota({})).success).toBe(true);
    expect(CreatePayableSchema.safeParse(nota({ baseCents: 8473, pisCents: 140, cofinsCents: 644 })).success).toBe(true);
  });

  it('recusa soma diferente de amountCents, parcela sozinha e parcelas na linha de ICMS', () => {
    expect(CreatePayableSchema.safeParse(nota({ pisCents: 140, cofinsCents: 645 })).success).toBe(false);
    expect(CreatePayableSchema.safeParse(nota({ pisCents: 140 })).success).toBe(false);
    expect(CreatePayableSchema.safeParse(nota({ kind: 'ICMS', pisCents: 140, cofinsCents: 644 })).success).toBe(false);
  });
});
