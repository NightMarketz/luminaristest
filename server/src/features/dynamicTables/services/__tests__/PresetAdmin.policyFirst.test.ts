/**
 * Policy-first (Contrato §2) nos services de administração de preset — R3 da auditoria de regressão
 * arquitetural 2026-10 (`ModuleInstallService`, `PresetSyncService` "sem policy"). Correção 2026-10-19
 * (autorização do dono em chat). Provado VERMELHO antes: `installTableFromPreset` de um USER chegava ao
 * repositório ("Expected constructor: ForbiddenError / Received constructor: NotFoundError").
 *
 * A decisão é `DynamicTablePolicy.canAdministerPresets` (ADMIN); os controllers não repetem o check.
 */
import { PresetSyncService } from '../PresetSyncService';
import { ModuleInstallService } from '../ModuleInstallService';
import { DynamicTablePolicy } from '../../policies/DynamicTablePolicy';
import { ForbiddenError } from '../../../../lib/errors';
import { Role } from '../../../users/models/User.model';
import type { UserContext } from '../../../../lib/authUtils';
import type { DynamicTableService } from '../DynamicTableService';
import type { IDynamicTableRepository } from '../../repositories/IDynamicTableRepository';

const asUser = (role: Role): UserContext => ({
  id: 'u1', userId: 'u1', name: 'n', username: 'u', email: 'u@test.co', userEmail: 'u@test.co',
  role, userRole: role, createdAt: new Date(), updatedAt: new Date(),
});

function repoSpy() {
  return {
    findTableByInternalName: jest.fn(async () => null),
    findTablesByUserId: jest.fn(async () => []),
    createTable: jest.fn(async () => ({ id: 't' })),
  };
}

describe('PresetSyncService — policy-first', () => {
  it.each(['syncInstalledTableFromPreset', 'installTableFromPreset'] as const)(
    '%s: USER → ForbiddenError antes de qualquer leitura do repositório',
    async (method) => {
      const repo = repoSpy();
      const svc = new PresetSyncService({} as DynamicTableService, repo as unknown as IDynamicTableRepository, new DynamicTablePolicy());
      await expect(svc[method](asUser(Role.USER), 'crmOpportunities')).rejects.toBeInstanceOf(ForbiddenError);
      expect(repo.findTableByInternalName).not.toHaveBeenCalled();
      expect(repo.createTable).not.toHaveBeenCalled();
    },
  );

  it('ADMIN passa pela policy (e segue para a leitura: a tabela não existe → NotFoundError, não Forbidden)', async () => {
    const repo = repoSpy();
    const svc = new PresetSyncService({} as DynamicTableService, repo as unknown as IDynamicTableRepository, new DynamicTablePolicy());
    await expect(svc.syncInstalledTableFromPreset(asUser(Role.ADMIN), 'leads')).rejects.not.toBeInstanceOf(ForbiddenError);
    expect(repo.findTableByInternalName).toHaveBeenCalled();
  });
});

describe('ModuleInstallService — policy-first', () => {
  it('USER → ForbiddenError antes de qualquer leitura e sem instalar nada', async () => {
    const repo = repoSpy();
    const presetSync = { installTableFromPreset: jest.fn(), syncInstalledTableFromPreset: jest.fn(), getPresetDefinitionForInternalName: jest.fn() };
    const svc = new ModuleInstallService(presetSync as unknown as PresetSyncService, repo as unknown as IDynamicTableRepository, new DynamicTablePolicy());
    await expect(svc.installModule(asUser(Role.USER), 'CRM-2')).rejects.toBeInstanceOf(ForbiddenError);
    expect(repo.findTableByInternalName).not.toHaveBeenCalled();
    expect(presetSync.installTableFromPreset).not.toHaveBeenCalled();
  });
});
