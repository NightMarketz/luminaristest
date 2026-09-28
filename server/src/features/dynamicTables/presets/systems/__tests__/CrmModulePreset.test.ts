/**
 * BE-INCR-CRM-MODULE-COMPOSITION (I8) — comportamento 4: `crmModule` vira composição
 * CRM-0 + CRM-1 + CRM-2 + CRM-3 "sem alterar o resultado para quem a escolhe".
 * O "antes" está congelado aqui: a composição literal que o arquivo declarava até ab5c42a3.
 */
import { createTableFromModule } from '../../../utils/TableFactory';
import { leadPipelinesModule } from '../../modules/core/LeadPipelinesModule';
import { leadStagesModule } from '../../modules/core/LeadStagesModule';
import { leadsModule } from '../../modules/core/LeadsModule';
import { leadProposalsModule } from '../../modules/core/LeadProposalsModule';
import { leadActivitiesModule } from '../../modules/core/LeadActivitiesModule';
import { crmAccountsModule } from '../../modules/crm/CrmAccountsModule';
import { crmContactsModule } from '../../modules/crm/CrmContactsModule';
import { opportunitiesModule } from '../../modules/crm/OpportunitiesModule';
import { tablePresetSuites } from '../../index';
import { CrmModulePreset } from '../CrmModulePreset';

beforeEach(() => jest.clearAllMocks());

const BEFORE = {
  leadPipelines: createTableFromModule(leadPipelinesModule),
  leadStages: createTableFromModule(leadStagesModule),
  leads: createTableFromModule(leadsModule),
  leadProposals: createTableFromModule(leadProposalsModule),
  leadActivities: createTableFromModule(leadActivitiesModule),
  crmAccounts: createTableFromModule(crmAccountsModule),
  crmContacts: createTableFromModule(crmContactsModule),
  crmOpportunities: createTableFromModule(opportunitiesModule),
};

describe('crmModule = composição dos módulos CRM-0..3 (comportamento 4)', () => {
  it('instala exatamente as mesmas tabelas, com os mesmos schemas', () => {
    expect(Object.keys(CrmModulePreset.tables).sort()).toEqual(Object.keys(BEFORE).sort());
    expect(CrmModulePreset.tables).toEqual(BEFORE);
  });

  it('identidade da suíte e registro no catálogo inalterados', () => {
    expect(CrmModulePreset.key).toBe('crmModule');
    expect(tablePresetSuites.sales.crmModule).toBe(CrmModulePreset);
  });
});
