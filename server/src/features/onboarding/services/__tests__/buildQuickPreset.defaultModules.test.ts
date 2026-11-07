/**
 * BE-INCR-MODULOS-BASE-SUBMODULOS PR-6 item 34: o onboarding rápido (`buildQuickPreset`) produz a mesma seleção default
 * do salão (BRIEF §1) que a sessão da Entrevista com IA (item 33).
 */
import { buildQuickPreset } from '../buildQuickPreset';
import BeautySalonPreset from '../../../dynamicTables/presets/systems/BeautySalonPreset';
import { resolveModuleSelection } from '../../../dynamicTables/presets/modules/moduleSelection';

beforeEach(() => jest.clearAllMocks());

const DEFAULT_SALAO_BRIEF = ['CRM-0', 'CRM-1', 'CRM-CAMP', 'PES-0', 'PES-FORN', 'VEN-0', 'VEN-SERV', 'VEN-PROD',
  'VEN-PAC', 'VEN-COM', 'EST-0', 'AGE-0', 'FIN-0', 'FIN-REC', 'FIN-BASE', 'GES-0', 'GES-META'];

describe('PR-6 item 34 — buildQuickPreset = seleção default', () => {
  it('salão sem pedido: installedModules = default §1 = resolução da sessão', () => {
    const { installedModules } = buildQuickPreset('beautySalon', []);
    expect([...installedModules].sort()).toEqual([...DEFAULT_SALAO_BRIEF].sort());
    expect(installedModules).toEqual(resolveModuleSelection([], BeautySalonPreset.modules ?? []));
  });
});
