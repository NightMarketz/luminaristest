/**
 * BE-INCR-P2-VERTICAL-CLINICA — Bloco I, comportamento 1: "existe um preset `aestheticClinic`,
 * composto por módulos existentes, registrado no catálogo." Prova: (a) o preset resolve pelo
 * registro (`tablePresetSuites`), (b) as chaves de tabela que as 4 pontes contábeis exigem existem
 * — `sales`/`saleItems`, o invariante duro do comportamento — e (c) a amplitude operacional
 * (F-P2-8a) inclui produto+pacote, não só serviço puro.
 */
import { tablePresetSuites } from '../../index';
import AestheticClinicPreset from '../AestheticClinicPreset';
import BeautySalonPreset from '../BeautySalonPreset';
import { composeSuiteDefaultTables } from '../../modules/moduleSelection';
import { aestheticClinicCustomerModule } from '../../modules/people/AestheticClinicCustomerModule';

// BE-INCR-MODULOS-BASE-SUBMODULOS PR-2: as tabelas de PESSOAS/VENDAS vêm dos módulos; o que a suíte instala por padrão.
const clinicTables = composeSuiteDefaultTables(AestheticClinicPreset);
const salonTables = composeSuiteDefaultTables(BeautySalonPreset);

// Contrato §5 (testes): beforeEach(() => jest.clearAllMocks()) sempre.
beforeEach(() => jest.clearAllMocks());

describe('AestheticClinicPreset — resolve pelo registro (comportamento 1)', () => {
  it('tablePresetSuites.services.aestheticClinic aponta para este preset', () => {
    expect(tablePresetSuites.services.aestheticClinic).toBe(AestheticClinicPreset);
  });

  it('key/name identificam o setor — F-P2-1 (clínica estética)', () => {
    expect(AestheticClinicPreset.key).toBe('aestheticClinic');
    expect(AestheticClinicPreset.name.toLowerCase()).toContain('clínica');
  });
});

describe('AestheticClinicPreset — invariante duro: internalName sales/saleItems (comportamento 1)', () => {
  it('as chaves sales/saleItems existem — é por elas que as 4 pontes contábeis acham a tabela', () => {
    expect(clinicTables.sales).toBeDefined();
    expect(clinicTables.saleItems).toBeDefined();
  });

  it('sales/saleItems reusam LITERALMENTE o módulo do salão (mesmo schema, zero-diff no módulo)', () => {
    expect(clinicTables.sales.schema).toEqual(salonTables.sales.schema);
    expect(clinicTables.saleItems.schema).toEqual(salonTables.saleItems.schema);
  });
});

describe('AestheticClinicPreset — amplitude operacional F-P2-8 → RATIFICADO (a)', () => {
  it('inclui products/packages/stockMovements — os 3 módulos que fazem cogs/performance_liability dispararem', () => {
    expect(clinicTables.products).toBeDefined();
    expect(clinicTables.packages).toBeDefined();
    expect(clinicTables.stockMovements).toBeDefined();
  });

  it('inclui customers com o módulo NOVO da clínica (não o customerModule compartilhado)', () => {
    const clinicFields = clinicTables.customers.schema.fields.map((f) => f.name);
    expect(clinicFields).toContain('clinicalRecordNumber');
  });

  it('BE-INCR-MODULOS-BASE-SUBMODULOS item 11a: customers da clínica vem do módulo da ficha (override do PES-0)', () => {
    expect(AestheticClinicPreset.modules).toContain('PES-0');
    expect(AestheticClinicPreset.tables).not.toHaveProperty('customers');
    expect(AestheticClinicPreset.moduleOverrides).toEqual({ customers: aestheticClinicCustomerModule });
    expect(clinicTables.customers.name).toBe(aestheticClinicCustomerModule.name);
    expect(clinicTables.customers.schema).toEqual(aestheticClinicCustomerModule.schema);
    // a ficha é superconjunto da base: nenhum campo do customerModule (lido por plugin/ponte) some na clínica
    const salonFields = salonTables.customers.schema.fields.map((f) => f.name);
    expect(clinicTables.customers.schema.fields.map((f) => f.name)).toEqual(expect.arrayContaining(salonFields));
    expect(clinicTables.customers.meta?.lockedBy).toBe('accounting');
  });
});
