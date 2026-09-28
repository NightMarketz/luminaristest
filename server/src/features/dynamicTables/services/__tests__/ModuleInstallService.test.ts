/**
 * BE-INCR-CRM-MODULE-COMPOSITION (I8) — comportamento 8: ligar módulo depois.
 * BE-INCR-CRM-SUBMODULES — itens 7 (submódulo e grupo 'CRM-2' no install) e 9 (tenant legado sem migração).
 */
import { ModuleInstallService } from '../ModuleInstallService';
import { ValidationError } from '../../../../lib/errors';
import { composeModuleTables } from '../../presets/modules/registry';
import { CoreSystemPreset } from '../../presets/systems/CoreSystemPreset';

beforeEach(() => jest.clearAllMocks());

const user = { userId: 'u1', role: 'ADMIN' } as any;
const DEFS: Record<string, any> = { ...CoreSystemPreset.tables, ...composeModuleTables(['CRM-0', 'CRM-1', 'CRM-2A', 'CRM-2B', 'CRM-3']) };

function build(installed: string[]) {
  const present = new Set(installed);
  const repository = {
    findTableByInternalName: jest.fn(async (_u: string, n: string) => (present.has(n) ? { id: `${n}-id`, internalName: n } : null)),
    findTablesByUserId: jest.fn(async () => [...present].map((n) => ({ id: `${n}-id`, internalName: n }))),
  };
  const presetSyncService = {
    installTableFromPreset: jest.fn(async (_u: unknown, n: string) => {
      present.add(n);
      return { tableId: `${n}-id`, created: true };
    }),
    syncInstalledTableFromPreset: jest.fn(async () => ({ added: ['x'], optionsAdded: {} })),
    getPresetDefinitionForInternalName: jest.fn((n: string) => DEFS[n] ?? null),
  };
  const svc = new ModuleInstallService(presetSyncService as any, repository as any);
  return { svc, presetSyncService };
}

const CORE = ['units', 'employees', 'tasks', 'stakeholders'];
const CRM0 = ['leadPipelines', 'leadStages', 'leads', 'leadActivities'];

describe('ModuleInstallService.installModule', () => {
  it("tenant CRM-0 → grupo 'CRM-2' instala CRM-2A e CRM-2B em ordem; resultado agregado com modules atômicos", async () => {
    const { svc, presetSyncService } = build([...CORE, ...CRM0]);
    const r = await svc.installModule(user, 'CRM-2');
    expect(r).toEqual({ status: 'installed', tables: ['crmAccounts', 'crmContacts'], synced: ['leads'], modules: ['CRM-2A', 'CRM-2B'] });
    expect(presetSyncService.installTableFromPreset.mock.calls.map((c) => c[1])).toEqual(['crmAccounts', 'crmContacts']);
    expect(presetSyncService.syncInstalledTableFromPreset).toHaveBeenCalledWith(user, 'leads');
  });

  it('item 7a: tenant com Contas só → CRM-2B instala só crmContacts; resposta atômica sem `modules`', async () => {
    const { svc, presetSyncService } = build([...CORE, ...CRM0, 'crmAccounts']);
    const r = await svc.installModule(user, 'CRM-2B');
    expect(r).toEqual({ status: 'installed', tables: ['crmContacts'], synced: ['leads'] });
    expect(presetSyncService.installTableFromPreset.mock.calls.map((c) => c[1])).toEqual(['crmContacts']);
  });

  it('item 7b: tenant com Contatos só → CRM-2A sincroniza crmContacts e leads (accountId volta)', async () => {
    const { svc } = build([...CORE, ...CRM0, 'crmContacts']);
    const r = await svc.installModule(user, 'CRM-2A');
    expect(r.status).toBe('installed');
    expect(r.tables).toEqual(['crmAccounts']);
    expect([...r.synced].sort()).toEqual(['crmContacts', 'leads']);
  });

  it('item 9: tenant legado com crmAccounts sem crmContacts → CRM-2A already-installed; CRM-2B instala só crmContacts', async () => {
    const { svc, presetSyncService } = build([...CORE, ...CRM0, 'crmAccounts']);
    await expect(svc.installModule(user, 'CRM-2A')).resolves.toEqual({ status: 'already-installed', tables: ['crmAccounts'], synced: [] });
    expect(presetSyncService.installTableFromPreset).not.toHaveBeenCalled();
    const r = await svc.installModule(user, 'CRM-2B');
    expect(r.status).toBe('installed');
    expect(presetSyncService.installTableFromPreset.mock.calls.map((c) => c[1])).toEqual(['crmContacts']);
  });

  it('tenant sem CRM → instalar CRM-0 sincroniza tasks (tasks.leadId)', async () => {
    const { svc } = build(CORE);
    const r = await svc.installModule(user, 'CRM-0');
    expect(r.status).toBe('installed');
    expect(r.synced).toEqual(['tasks']);
  });

  it('idempotente: módulo (ou grupo) já instalado → already-installed, nada instala nem sincroniza', async () => {
    const { svc, presetSyncService } = build([...CORE, ...CRM0, 'crmAccounts', 'crmContacts']);
    await expect(svc.installModule(user, 'CRM-2')).resolves.toEqual({
      status: 'already-installed',
      tables: ['crmAccounts', 'crmContacts'],
      synced: [],
      modules: ['CRM-2A', 'CRM-2B'],
    });
    await expect(svc.installModule(user, 'CRM-2B')).resolves.toEqual({ status: 'already-installed', tables: ['crmContacts'], synced: [] });
    expect(presetSyncService.installTableFromPreset).not.toHaveBeenCalled();
    expect(presetSyncService.syncInstalledTableFromPreset).not.toHaveBeenCalled();
  });

  it('dependência não instalada → 400 nomeando o módulo faltante, sem escrita', async () => {
    const { svc, presetSyncService } = build(CORE);
    const err = await svc.installModule(user, 'CRM-3').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ValidationError);
    expect((err as ValidationError).details).toEqual({ module: 'CRM-3', missingModule: 'CRM-0' });
    expect(presetSyncService.installTableFromPreset).not.toHaveBeenCalled();
  });
});
