/**
 * BE-INCR-ONBOARDING-ACTIVATION (nó I4) item 9 (F-I4-3 a) — o setor do binding a partir da chave do Rápido (`suiteKey`)
 * ou do Controle Total (`presetKey`, normalizado como o `getPresetByKey`).
 */
import { resolveOnboardingSectorKey } from '../dashboardController';

describe('resolveOnboardingSectorKey (item 9)', () => {
  it.each([
    ['beautySalon', 'beautySalon'],
    ['beauty_salon', 'beautySalon'],
    ['aestheticClinic', 'aestheticClinic'],
    ['aesthetic_clinic', 'aestheticClinic'],
  ])('%s ⇒ %s', (key, sector) => {
    expect(resolveOnboardingSectorKey(key)).toBe(sector);
  });

  it.each(['crmModule', 'crm_module', 'padaria'])('%s ⇒ null (preset sem binding)', (key) => {
    expect(resolveOnboardingSectorKey(key)).toBeNull();
  });
});
