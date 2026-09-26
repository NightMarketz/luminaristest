/**
 * BE-INCR-CRM-MODULE-COMPOSITION (I8) — comportamentos 2 (seleção) e 10 (addedFields por módulo).
 */
import { ValidationError } from '../../../../lib/errors';
import { MODULE_REGISTRY, composeModuleTables, type ModuleDef, type ModuleKey } from '../modules/registry';
import { assertAddedFieldsRespectModules, resolveModuleSelection } from '../modules/moduleSelection';

beforeEach(() => jest.clearAllMocks());

describe('resolveModuleSelection (comportamento 2)', () => {
  it("['CRM-1'] instala CRM-0 + CRM-1 (CRM-0 implícito)", () => {
    expect(resolveModuleSelection(['CRM-1'])).toEqual(['CRM-0', 'CRM-1']);
  });

  it("['CRM-3'] sem CRM-2 instala CRM-0 + CRM-3 (F-CRM-5 → a: CRM-2 só enriquece)", () => {
    expect(resolveModuleSelection(['CRM-3'])).toEqual(['CRM-0', 'CRM-3']);
  });

  it('soma o default da suíte e devolve na ordem do registro, sem duplicar', () => {
    expect(resolveModuleSelection(['CRM-3', 'CRM-1'], ['CRM-0', 'CRM-1'])).toEqual(['CRM-0', 'CRM-1', 'CRM-3']);
  });

  it('nada pedido e suíte sem módulos → nenhum módulo (tenant sem CRM)', () => {
    expect(resolveModuleSelection([], [])).toEqual([]);
  });

  it('dependência NÃO-fixa ausente → 400 com o módulo faltante nomeado', () => {
    // Registro de teste: CRM-3 passa a exigir CRM-2 (não-fixo) — o ramo que o registro real não exercita hoje.
    const fake: Record<ModuleKey, ModuleDef> = {
      ...MODULE_REGISTRY,
      'CRM-3': { ...MODULE_REGISTRY['CRM-3'], dependsOn: ['CRM-0', 'CRM-2'] },
    };
    let err: unknown;
    try {
      resolveModuleSelection(['CRM-3'], [], fake);
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(ValidationError);
    expect((err as ValidationError).details).toEqual({ module: 'CRM-3', missingModule: 'CRM-2' });
  });
});

describe('assertAddedFieldsRespectModules (comportamento 10, F-CRM-7 → a)', () => {
  const tables = composeModuleTables(['CRM-0']);

  it("addedFields.leads: [{ name: 'status' }] → 400 (select lido por serviço)", () => {
    expect(() => assertAddedFieldsRespectModules({ leads: [{ name: 'status', type: 'string' }] }, tables)).toThrow(
      ValidationError,
    );
  });

  it('sombrear qualquer campo declarado pelo módulo → 400', () => {
    expect(() => assertAddedFieldsRespectModules({ leadStages: [{ name: 'type' }] }, tables)).toThrow(ValidationError);
  });

  it('campo novo em tabela de módulo é aceito; tabela fora de módulo não é checada aqui', () => {
    expect(() =>
      assertAddedFieldsRespectModules(
        { leads: [{ name: 'instagram', type: 'string' }], customers: [{ name: 'name' }] },
        { ...tables, customers: { name: 'C', category: 'business', schema: { fields: [{ name: 'name', label: 'N', type: 'string' }] } } } as never,
      ),
    ).not.toThrow();
  });
});
