/**
 * I8, F-I8-COMP3-b (ratificado 2026-09-26): o PresetSyncService resolve a definição de tabela pelo registro de
 * módulos (Core + módulos). Falsificador: as suítes são esvaziadas por mock — antes do fork (b) a única fonte
 * das tabelas de lead fora do Core era a suíte `crmModule`, então sem ela `leads` não seria achado.
 */
jest.mock('../../presets', () => ({ __esModule: true, tablePresetSuites: {} }));

import { PresetSyncService } from '../PresetSyncService';
import { composeModuleTables, moduleOfTable } from '../../presets/modules/registry';
import { CoreSystemPreset } from '../../presets/systems/CoreSystemPreset';

beforeEach(() => jest.clearAllMocks());

describe('PresetSyncService — definição pelo registro de módulos (F-I8-COMP3-b)', () => {
  const svc = new PresetSyncService({} as any, {} as any);

  it.each(['leadPipelines', 'leadStages', 'leads', 'leadActivities', 'leadProposals', 'crmAccounts', 'crmContacts', 'crmOpportunities'])(
    '%s resolve pelo registro, com o mesmo schema do módulo',
    (name) => {
      expect(CoreSystemPreset.tables[name]).toBeUndefined();
      const all = composeModuleTables(['CRM-0', 'CRM-1', 'CRM-2A', 'CRM-2B', 'CRM-3']);
      expect(svc.getPresetDefinitionForInternalName(name)).toEqual(all[name]);
    },
  );

  it('BE-INCR-CRM-SUBMODULES item 10: crmContacts resolve via CRM-2B e crmAccounts via CRM-2A, mesma definição', () => {
    expect(moduleOfTable('crmContacts')).toBe('CRM-2B');
    expect(moduleOfTable('crmAccounts')).toBe('CRM-2A');
    expect(svc.getPresetDefinitionForInternalName('crmContacts')).toEqual(composeModuleTables(['CRM-2B']).crmContacts);
    expect(svc.getPresetDefinitionForInternalName('crmAccounts')).toEqual(composeModuleTables(['CRM-2A']).crmAccounts);
  });

  it('tabela de Core segue resolvendo pelo Core; desconhecida → null', () => {
    expect(svc.getPresetDefinitionForInternalName('units')).toBe(CoreSystemPreset.tables.units);
    expect(svc.getPresetDefinitionForInternalName('nope')).toBeNull();
  });
});
