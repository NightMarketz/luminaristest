/**
 * BE-INCR-P2-VERTICAL-CLINICA — Bloco I, comportamento 2: "a ficha clínica existe nos `customers`
 * do vertical 2 sem editar o módulo compartilhado." Teste literal do BRIEF: "a tabela `customers`
 * instanciada para um tenant de clínica tem o campo; a instanciada para um tenant de salão NÃO tem."
 */
import { aestheticClinicCustomerModule } from '../AestheticClinicCustomerModule';
import { customerModule } from '../CustomerModule';
import { createTableFromModule } from '../../../../utils/TableFactory';

describe('aestheticClinicCustomerModule — campo próprio da clínica (comportamento 2)', () => {
  it('tem clinicalRecordNumber; o customerModule do salão NÃO tem', () => {
    const clinicFieldNames = aestheticClinicCustomerModule.schema.fields.map((f) => f.name);
    const salonFieldNames = customerModule.schema.fields.map((f) => f.name);

    expect(clinicFieldNames).toContain('clinicalRecordNumber');
    expect(salonFieldNames).not.toContain('clinicalRecordNumber');
  });

  it('reusa TODOS os campos base do customerModule compartilhado, sem omitir nenhum', () => {
    const clinicFieldNames = new Set(aestheticClinicCustomerModule.schema.fields.map((f) => f.name));
    for (const field of customerModule.schema.fields) {
      expect(clinicFieldNames.has(field.name)).toBe(true);
    }
  });

  it('o campo novo NÃO carrega conteúdo de saúde — é um identificador administrativo (LGPD, BRIEF §7 item 4)', () => {
    const field = aestheticClinicCustomerModule.schema.fields.find((f) => f.name === 'clinicalRecordNumber')!;
    expect(field.type).toBe('string');
    expect(field.required).toBe(false);
    // Nenhum campo de anamnese/contraindicação/consentimento é declarado — pendente de validação externa.
    const fieldNames = aestheticClinicCustomerModule.schema.fields.map((f) => f.name.toLowerCase());
    expect(fieldNames.some((n) => /anamnes|contraindic|consent/.test(n))).toBe(false);
  });

  it('createTableFromModule() materializa a tabela por instância independente (tenant clínica ≠ tenant salão)', () => {
    const clinicTable = createTableFromModule(aestheticClinicCustomerModule);
    const salonTable = createTableFromModule(customerModule);

    expect(clinicTable.schema.fields.map((f) => f.name)).toContain('clinicalRecordNumber');
    expect(salonTable.schema.fields.map((f) => f.name)).not.toContain('clinicalRecordNumber');
  });
});
