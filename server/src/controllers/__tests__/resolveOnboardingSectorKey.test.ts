/**
 * BE-INCR-ONBOARDING-ACTIVATION (nó I4) item 9 (F-I4-3 a) — o setor do binding a partir da chave do Rápido (`suiteKey`)
 * ou do Controle Total (`presetKey`). A função normaliza por `keyToPascalCase`, mas desde o W5 o create só a chama com a
 * chave do registro (`beauty_salon` dá 404 antes; dono, 2026-10-16) — os casos snake_case abaixo provam só a função pura.
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
