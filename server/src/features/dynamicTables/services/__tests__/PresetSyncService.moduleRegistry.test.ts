/**
 * I8, F-I8-COMP3-b (ratificado 2026-09-26): o PresetSyncService resolve a definição de tabela pelo registro de
 * módulos (Core + módulos). Falsificador: as suítes são esvaziadas por mock — antes do fork (b) a única fonte
 * das tabelas de lead fora do Core era a suíte `crmModule`, então sem ela `leads` não seria achado.
 */
jest.mock('../../presets', () => ({ __esModule: true, tablePresetSuites: {} }));

import { PresetSyncService } from '../PresetSyncService';
import { composeModuleTables } from '../../presets/modules/registry';
import { CoreSystemPreset } from '../../presets/systems/CoreSystemPreset';

beforeEach(() => jest.clearAllMocks());

describe('PresetSyncService — definição pelo registro de módulos (F-I8-COMP3-b)', () => {
  const svc = new PresetSyncService({} as any, {} as any);

  it.each(['leadPipelines', 'leadStages', 'leads', 'leadActivities', 'leadProposals', 'crmAccounts', 'crmOpportunities'])(
    '%s resolve pelo registro, com o mesmo schema do módulo',
    (name) => {
      expect(CoreSystemPreset.tables[name]).toBeUndefined();
      const all = composeModuleTables(['CRM-0', 'CRM-1', 'CRM-2', 'CRM-3']);
      expect(svc.getPresetDefinitionForInternalName(name)).toEqual(all[name]);
    },
  );

  it('tabela de Core segue resolvendo pelo Core; desconhecida → null', () => {
    expect(svc.getPresetDefinitionForInternalName('units')).toBe(CoreSystemPreset.tables.units);
    expect(svc.getPresetDefinitionForInternalName('nope')).toBeNull();
  });
});
