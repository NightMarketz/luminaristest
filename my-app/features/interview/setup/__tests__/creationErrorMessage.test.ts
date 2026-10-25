import { describe, it, expect } from 'vitest';
import { creationErrorMessage } from '../creationErrorMessage';

// W1 item 10: 400 do create custom → chave i18n pelo `details` do corpo.
describe('creationErrorMessage', () => {
  it.each([
    ['MODULE_PARTIAL', 'onboardingCreateErrorModulePartial'],
    ['FIXED_MODULE_PARTIAL', 'onboardingCreateErrorFixedModulePartial'],
    ['DEPENDENT_MODULE_KEPT', 'onboardingCreateErrorDependentModuleKept'],
    ['TABLE_LOCKED', 'onboardingCreateErrorTableLocked'],
    ['ADDED_TABLE_EXISTS', 'onboardingCreateErrorAddedTableExists'],
    ['ADDED_TABLE_INVALID', 'onboardingCreateErrorAddedTableInvalid'],
  ])('%s → %s', (reason, key) => {
    expect(creationErrorMessage({ details: { reason, table: 't', moduleKey: 'CRM-1' } })?.key).toBe(key);
  });

  it('colisão de campo com módulo (sem reason, só table/field/moduleKey)', () => {
    expect(creationErrorMessage({ details: { table: 'leads', field: 'status', moduleKey: 'CRM-0' } })).toEqual({
      key: 'onboardingCreateErrorFieldDeclaredByModule',
      params: { table: 'leads', field: 'status', moduleKey: 'CRM-0', dependents: '', tables: '' },
    });
  });

  it('listas viram texto: dependentes e tabelas removidas', () => {
    expect(
      creationErrorMessage({ details: { reason: 'DEPENDENT_MODULE_KEPT', moduleKey: 'CRM-0', dependents: ['CRM-1', 'CRM-3'] } })?.params.dependents,
    ).toBe('CRM-1, CRM-3');
  });

  it('sem details, details array (Zod) ou motivo desconhecido → null', () => {
    expect(creationErrorMessage({})).toBeNull();
    expect(creationErrorMessage(null)).toBeNull();
    expect(creationErrorMessage({ details: [{ path: ['x'] }] })).toBeNull();
    expect(creationErrorMessage({ details: { reason: 'OUTRO' } })).toBeNull();
  });
});
