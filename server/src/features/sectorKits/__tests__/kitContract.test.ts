import { SectorKitV1Schema } from '../dtos/SectorKitDto';
import { BEAUTY_SALON_KIT_V1 } from '../kits/beautySalon/kit.v1';
import { AESTHETIC_CLINIC_KIT_V1 } from '../kits/aestheticClinic/kit.v1';
import { SALE_BINDING_V1, SALE_OPERATIONAL_SCHEMA_SNAPSHOT } from '../../accountingBinding/fixtures/saleBinding';
import { CLINIC_BINDING_V1, CLINIC_OPERATIONAL_SCHEMA_SNAPSHOT } from '../../accountingBinding/fixtures/clinicBinding';

/** BE-INCR-KIT-SETOR, PR-1 — contrato do kit (item 2) e kits v1 zero-diff (item 3). */

const base = () => structuredClone(BEAUTY_SALON_KIT_V1);
const messages = (input: unknown) => {
  const r = SectorKitV1Schema.safeParse(input);
  return r.success ? [] : r.error.issues.map((i) => i.message);
};

describe('SectorKitV1Schema — refinamentos do item 2', () => {
  it('aceita os kits v1 publicados', () => {
    expect(messages(BEAUTY_SALON_KIT_V1)).toEqual([]);
    expect(messages(AESTHETIC_CLINIC_KIT_V1)).toEqual([]);
  });

  it('rejeita kitVersion < 1 ou não inteiro', () => {
    expect(SectorKitV1Schema.safeParse({ ...base(), kitVersion: 0 }).success).toBe(false);
    expect(SectorKitV1Schema.safeParse({ ...base(), kitVersion: 1.5 }).success).toBe(false);
  });

  it('rejeita conta da extensão que já é do canônico e conta repetida', () => {
    const k = base();
    k.chartExtension = [
      { code: '3.1', name: 'Dup canônico', nature: 'Revenue', acceptsEntries: true },
      { code: '3.9', name: 'Nova', nature: 'Revenue', acceptsEntries: true },
      { code: '3.9', name: 'Nova de novo', nature: 'Revenue', acceptsEntries: true },
    ];
    expect(messages(k)).toEqual(['Conta 3.1 já é do plano canônico.', 'Conta 3.9 repetida na extensão.']);
  });

  it('rejeita accountCode inexistente ou não-folha (roleSlots e roleDefaults); aceita folha da extensão', () => {
    const k = base();
    k.binding.eventBindings[0].roleSlots[0].accountCode = '9.9';
    k.roleDefaults.fiscalProfile.irpjRecolherAccountCode = '3';
    k.roleDefaults.scopeSettings.depreciationExpenseAccountCode = '4.9';
    k.chartExtension = [{ code: '4.9', name: 'Depreciação', nature: 'Expense', acceptsEntries: true }];
    expect(messages(k)).toEqual([
      'Conta 9.9 não existe no canônico nem na extensão.',
      'Conta 3 não é folha (não aceita lançamento).',
    ]);
  });

  it('rejeita eventKey do binding fora dos emitíveis, e emitível sem binding (nos dois sentidos)', () => {
    const k = base();
    const schema: Record<string, unknown> = { ...k.operationalSchema, 'sale.extra': [] };
    delete schema['sale.cogs'];
    k.operationalSchema = schema;
    expect(messages(k)).toEqual([
      'Evento sale.cogs não é emitível pelo schema operacional.',
      'Evento emitível sale.extra sem binding.',
    ]);
  });

  it('rejeita referential com conta fora de canônico ∪ extensão, e cTribNac sem 6 dígitos', () => {
    const k = base();
    k.referential = [
      { regime: 'SIMPLES', mappingVersion: '2025', entries: [{ accountCode: '7.7', referentialCode: 'x', label: 'x' }] },
    ];
    expect(messages(k)).toEqual(['Conta 7.7 não existe no canônico nem na extensão.']);
    const s = base();
    s.serviceFiscalDefaults = [{ serviceRef: 'corte', cTribNac: '12345', cIndOp: '030101' }];
    expect(messages(s)).toEqual(['cTribNac tem 6 dígitos.']);
  });

  it('é strict em todo nível (chave desconhecida reprova)', () => {
    expect(SectorKitV1Schema.safeParse({ ...base(), extra: 1 }).success).toBe(false);
    const k = base();
    (k.roleDefaults.scopeSettings as Record<string, unknown>).foo = '1.1.1';
    expect(SectorKitV1Schema.safeParse(k).success).toBe(false);
  });

  it('changelog exige ao menos 1 linha (item 6)', () => {
    expect(SectorKitV1Schema.safeParse({ ...base(), changelog: [] }).success).toBe(false);
  });
});

describe('kits v1 — golden zero-diff (item 3)', () => {
  it.each([
    ['beautySalon', BEAUTY_SALON_KIT_V1, SALE_BINDING_V1, SALE_OPERATIONAL_SCHEMA_SNAPSHOT],
    ['aestheticClinic', AESTHETIC_CLINIC_KIT_V1, CLINIC_BINDING_V1, CLINIC_OPERATIONAL_SCHEMA_SNAPSHOT],
  ] as const)('%s: binding e schema deep-equal ao fixture, compiledFromHash igual, sem conteúdo novo', (key, kit, binding, schema) => {
    expect(kit.kitKey).toBe(key);
    expect(kit.binding).toStrictEqual(binding);
    expect(kit.binding.compiledFromHash).toBe(binding.compiledFromHash);
    expect(kit.operationalSchema).toStrictEqual(schema);
    expect(kit.chartExtension).toEqual([]);
    expect(kit.roleDefaults).toEqual({ scopeSettings: {}, fiscalProfile: {} });
    expect(kit.serviceFiscalDefaults).toEqual([]);
    expect(kit.referential).toEqual([]);
  });
});
