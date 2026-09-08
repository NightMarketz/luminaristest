import { AccountingBindingV1Schema } from '../../dtos/AccountingBindingDto';
import { computeCompiledFromHash } from '../../services/BindingCompileService';
import { CLINIC_BINDING_V1, CLINIC_OPERATIONAL_SCHEMA_SNAPSHOT } from '../clinicBinding';
import { SALE_BINDING_V1 } from '../saleBinding';

// Contrato §5 (testes): beforeEach(() => jest.clearAllMocks()) sempre.
beforeEach(() => jest.clearAllMocks());

/**
 * BE-INCR-P2-VERTICAL-CLINICA — Bloco II, comportamento 4. Espelho de `saleBinding.test.ts`
 * (o gate do binding do vertical 1) — prova que `CLINIC_BINDING_V1` (a) valida contra o schema
 * comum, (b) cobre os mesmos 5 sourceTypes classe-1 que a operação instalada da clínica emite,
 * (c) carrega os MESMOS accountCodes citados dos mappers (F-P2-8a: mesmo plano de contas, nenhuma
 * conta nova por papel), e (d) diverge do binding do salão APENAS em `sectorKey` e
 * `descriptionTemplate` — nunca em `eventKey`/`archetypeKey`/`accountCode` (F-P2-6b).
 */
describe('CLINIC_BINDING_V1 — CONTROLE', () => {
  it('valida contra o AccountingBindingV1Schema — o módulo já falharia no import se não validasse', () => {
    expect(AccountingBindingV1Schema.safeParse(CLINIC_BINDING_V1).success).toBe(true);
  });

  it('sectorKey é aestheticClinic (F-P2-1) e bindingVersion é 1 (fixture de referência)', () => {
    expect(CLINIC_BINDING_V1.sectorKey).toBe('aestheticClinic');
    expect(CLINIC_BINDING_V1.bindingVersion).toBe(1);
  });
});

describe('CLINIC_BINDING_V1 — cobertura dos 5 sourceTypes classe-1 (F-P2-8a)', () => {
  const eventKeys = CLINIC_BINDING_V1.eventBindings.map((eb) => eb.eventKey);

  it('cobre exatamente os 5 sourceTypes — os mesmos do vertical 1, nunca um vocabulário próprio (F-P2-6a)', () => {
    expect(eventKeys.sort()).toEqual(
      ['sale.package.sold', 'sale.cogs', 'sale.finalized', 'sale.returned', 'sale.settled'].sort(),
    );
  });

  it('todo eventKey/archetypeKey emitido pela operação instalada tem cobertura — Object.keys(schema) === eventKeys', () => {
    expect(Object.keys(CLINIC_OPERATIONAL_SCHEMA_SNAPSHOT).sort()).toEqual(eventKeys.sort());
  });
});

describe('CLINIC_BINDING_V1 — diverge do SALE_BINDING_V1 apenas em sectorKey/descriptionTemplate', () => {
  it('accountCodes e archetypeKeys são IDÊNTICOS ao binding do salão, por eventKey', () => {
    for (const eb of SALE_BINDING_V1.eventBindings) {
      const clinicEb = CLINIC_BINDING_V1.eventBindings.find((c) => c.eventKey === eb.eventKey)!;
      expect(clinicEb).toBeDefined();
      expect(clinicEb.archetypeKey).toBe(eb.archetypeKey);
      expect(clinicEb.roleSlots.map((r) => ({ role: r.role, accountCode: r.accountCode }))).toEqual(
        eb.roleSlots.map((r) => ({ role: r.role, accountCode: r.accountCode })),
      );
    }
  });

  it('descriptionTemplate é setorial — nunca reusa o texto "salão" do vertical 1', () => {
    for (const eb of CLINIC_BINDING_V1.eventBindings) {
      expect(eb.descriptionTemplate).toBeDefined();
      expect(eb.descriptionTemplate!.toLowerCase()).not.toContain('salão');
    }
  });

  it('sectorKey diverge (aestheticClinic ≠ beautySalon)', () => {
    expect(CLINIC_BINDING_V1.sectorKey).not.toBe(SALE_BINDING_V1.sectorKey);
  });
});

describe('CLINIC_BINDING_V1 — slot `dimension` presente em todo eventBinding', () => {
  it.each(CLINIC_BINDING_V1.eventBindings.map((eb) => eb.eventKey))(
    '%s carrega fieldSlot "dimension"',
    (eventKey) => {
      const eb = CLINIC_BINDING_V1.eventBindings.find((e) => e.eventKey === eventKey)!;
      const dimensionSlot = eb.fieldSlots.find((s) => s.slotName === 'dimension');
      expect(dimensionSlot).toBeDefined();
      expect(dimensionSlot!.transform).toBe('identity');
    },
  );
});

describe('CLINIC_BINDING_V1 — compiledFromHash é determinístico', () => {
  it('recalcular o hash do mesmo snapshot canônico produz o MESMO valor', () => {
    const recomputed = computeCompiledFromHash(CLINIC_OPERATIONAL_SCHEMA_SNAPSHOT, [
      { code: '1.1.1', nature: 'Asset', acceptsEntries: true },
      { code: '1.1.2', nature: 'Asset', acceptsEntries: true },
      { code: '1.1.3', nature: 'Asset', acceptsEntries: true },
      { code: '1.1.4', nature: 'Asset', acceptsEntries: true },
      { code: '1.1.6', nature: 'Asset', acceptsEntries: true },
      { code: '2.1.1', nature: 'Liability', acceptsEntries: true },
      { code: '3.1', nature: 'Revenue', acceptsEntries: true },
      { code: '3.2', nature: 'Revenue', acceptsEntries: true },
      { code: '3.3', nature: 'Revenue', acceptsEntries: true },
      { code: '4.2', nature: 'Expense', acceptsEntries: true },
    ]);
    expect(CLINIC_BINDING_V1.compiledFromHash).toBe(recomputed);
  });
});
