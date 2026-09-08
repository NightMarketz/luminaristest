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
    expect(AestheticClinicPreset.tables.sales).toBeDefined();
    expect(AestheticClinicPreset.tables.saleItems).toBeDefined();
  });

  it('sales/saleItems reusam LITERALMENTE o módulo do salão (mesmo schema, zero-diff no módulo)', () => {
    expect(AestheticClinicPreset.tables.sales.schema).toEqual(BeautySalonPreset.tables.sales.schema);
    expect(AestheticClinicPreset.tables.saleItems.schema).toEqual(BeautySalonPreset.tables.saleItems.schema);
  });
});

describe('AestheticClinicPreset — amplitude operacional F-P2-8 → RATIFICADO (a)', () => {
  it('inclui products/packages/stockMovements — os 3 módulos que fazem cogs/performance_liability dispararem', () => {
    expect(AestheticClinicPreset.tables.products).toBeDefined();
    expect(AestheticClinicPreset.tables.packages).toBeDefined();
    expect(AestheticClinicPreset.tables.stockMovements).toBeDefined();
  });

  it('inclui customers com o módulo NOVO da clínica (não o customerModule compartilhado)', () => {
    const clinicFields = AestheticClinicPreset.tables.customers.schema.fields.map((f) => f.name);
    expect(clinicFields).toContain('clinicalRecordNumber');
  });
});
