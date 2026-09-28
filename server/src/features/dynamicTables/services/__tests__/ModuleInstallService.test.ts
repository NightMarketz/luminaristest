/**
 * BE-INCR-CRM-MODULE-COMPOSITION (I8) — comportamento 8: ligar módulo depois.
 */
import { ModuleInstallService } from '../ModuleInstallService';
import { ValidationError } from '../../../../lib/errors';
import { composeModuleTables } from '../../presets/modules/registry';
import { CoreSystemPreset } from '../../presets/systems/CoreSystemPreset';

beforeEach(() => jest.clearAllMocks());

const user = { userId: 'u1', role: 'ADMIN' } as any;
const DEFS: Record<string, any> = { ...CoreSystemPreset.tables, ...composeModuleTables(['CRM-0', 'CRM-1', 'CRM-2', 'CRM-3']) };

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
  it('tenant CRM-0 → instala CRM-2 em ordem e sincroniza só quem aponta para ele (leads)', async () => {
    const { svc, presetSyncService } = build([...CORE, ...CRM0]);
    const r = await svc.installModule(user, 'CRM-2');
    expect(r).toEqual({ status: 'installed', tables: ['crmAccounts', 'crmContacts'], synced: ['leads'] });
    expect(presetSyncService.installTableFromPreset.mock.calls.map((c) => c[1])).toEqual(['crmAccounts', 'crmContacts']);
    expect(presetSyncService.syncInstalledTableFromPreset).toHaveBeenCalledWith(user, 'leads');
  });

  it('tenant sem CRM → instalar CRM-0 sincroniza tasks (tasks.leadId)', async () => {
    const { svc } = build(CORE);
    const r = await svc.installModule(user, 'CRM-0');
    expect(r.status).toBe('installed');
    expect(r.synced).toEqual(['tasks']);
  });

  it('idempotente: módulo já instalado → already-installed, nada instala nem sincroniza', async () => {
    const { svc, presetSyncService } = build([...CORE, ...CRM0, 'crmAccounts', 'crmContacts']);
    await expect(svc.installModule(user, 'CRM-2')).resolves.toEqual({
      status: 'already-installed',
      tables: ['crmAccounts', 'crmContacts'],
      synced: [],
    });
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
