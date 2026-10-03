/**
 * BE-INCR-SEED-UNIDADE-E-ENV item 7 — `SystemProvisioningService` com fakes das dependências (sem banco):
 * ordem (i)→(iv); guarda one-shot (policy) sem instalar nada; compensação em falha da unidade e do perfil fiscal;
 * `NAO_SEI`/ausente → `pendente`; purga que falha → `OnboardingRollbackFailedError`.
 */
import { ForbiddenError, OnboardingRolledBackError, OnboardingRollbackFailedError } from '../../../lib/errors';
import type { UserContext } from '../../../types/UserContext';
import { Role } from '../../users/models/User.model';
import { SystemProvisioningPolicy } from '../policies/SystemProvisioningPolicy';
import { SystemProvisioningService } from '../services/SystemProvisioningService';
import type { ProvisionInput, ProvisioningFiscalService, ProvisioningTableService } from '../services/SystemProvisioningService';

const ctx: UserContext = {
  id: 'u1', userId: 'u1', name: 'U', username: 'u', email: 'u@t.local', role: Role.USER, userRole: 'USER', userEmail: 'u@t.local',
  createdAt: new Date(0), updatedAt: new Date(0),
};
const input = (fiscal?: ProvisionInput['fiscal']): ProvisionInput => ({ preset: { tables: {} }, unit: { name: 'Matriz', type: 'Own' }, fiscal });

function build(opts: { tablesBefore?: number; unitFails?: boolean; fiscalFails?: boolean; purgeFails?: boolean } = {}) {
  const calls: string[] = [];
  let installed = false;
  const tables = {
    getTablesForUser: jest.fn(async () => {
      calls.push('getTables');
      return installed ? [{ id: 't-units', internalName: 'units' }] : Array.from({ length: opts.tablesBefore ?? 0 }, (_, i) => ({ id: `t${i}`, internalName: `x${i}` }));
    }),
    installPresetAsSystem: jest.fn(async () => {
      calls.push('install');
      installed = true;
      return { installed: 1 };
    }),
    createTableData: jest.fn(async () => {
      calls.push('unit');
      if (opts.unitFails) throw new Error('falha injetada');
      return { id: 'unit-1' };
    }),
    deleteAllTablesForUser: jest.fn(async () => {
      calls.push('purge:tables');
      if (opts.purgeFails) throw new Error('purga quebrou');
    }),
  };
  const fiscal = {
    upsert: jest.fn(async () => {
      calls.push('fiscal');
      if (opts.fiscalFails) throw new Error('perfil recusado');
      return { inativa: false, condicoes: {} };
    }),
  };
  const actionProposals = { deleteByUserId: jest.fn(async () => void calls.push('purge:proposals')) };
  const knowledgeGraphs = { deleteByUserId: jest.fn(async () => void calls.push('purge:graph')) };
  const service = new SystemProvisioningService(
    tables as unknown as ProvisioningTableService,
    fiscal as unknown as ProvisioningFiscalService,
    actionProposals as never,
    knowledgeGraphs as never,
    new SystemProvisioningPolicy(),
  );
  return { service, calls, tables, fiscal, actionProposals, knowledgeGraphs };
}

describe('SystemProvisioningService.provision', () => {
  it('executa (i) policy → (ii) instala → (iii) unidade → (iv) perfil fiscal, nessa ordem, e devolve installResult + unitId + fiscal', async () => {
    const { service, calls, tables } = build();
    const r = await service.provision(ctx, input({ regime: 'PRESUMIDO' }));
    expect(calls).toEqual(['getTables', 'install', 'getTables', 'unit', 'fiscal']);
    expect(r.installResult).toEqual({ installed: 1 });
    expect(r.unitId).toBe('unit-1');
    expect(r.fiscal).toMatchObject({ status: 'criado' });
    expect(r.fiscal.obrigacoes?.length).toBeGreaterThan(0);
    // a unidade nasce pelo caminho de escrita normal, com o nome/tipo do input
    expect(tables.createTableData).toHaveBeenCalledWith(ctx, 't-units', { data: { name: 'Matriz', type: 'Own' } });
  });

  it('canProvision falso (já tem tabelas) ⇒ ForbiddenError com a mensagem de hoje e NADA instalado', async () => {
    const { service, calls } = build({ tablesBefore: 3 });
    await expect(service.provision(ctx, input())).rejects.toThrow(new ForbiddenError('Setup já foi concluído. Este usuário já possui tabelas.'));
    expect(calls).toEqual(['getTables']);
  });

  it('falha ao criar a unidade ⇒ purga (tabelas, grafo, propostas) e OnboardingRolledBackError com o detalhe; perfil fiscal NÃO é tentado', async () => {
    const { service, calls, fiscal } = build({ unitFails: true });
    const err = await service.provision(ctx, input({ regime: 'REAL' })).catch((e) => e);
    expect(err).toBeInstanceOf(OnboardingRolledBackError);
    expect(err).toMatchObject({ statusCode: 500, errorCode: 'ONBOARDING_ROLLED_BACK' });
    expect(err.message).toBe('Não foi possível criar a unidade (falha injetada). A instalação foi desfeita; tente novamente.');
    expect(calls.slice(-3)).toEqual(['purge:tables', 'purge:graph', 'purge:proposals']);
    expect(fiscal.upsert).not.toHaveBeenCalled();
  });

  it('falha ao criar o perfil fiscal ⇒ purga e OnboardingRolledBackError com a mensagem do perfil', async () => {
    const { service, calls } = build({ fiscalFails: true });
    const err = await service.provision(ctx, input({ regime: 'PRESUMIDO' })).catch((e) => e);
    expect(err).toBeInstanceOf(OnboardingRolledBackError);
    expect(err.message).toBe('Não foi possível criar o perfil fiscal da empresa (perfil recusado). A instalação foi desfeita; tente novamente.');
    expect(calls.slice(-3)).toEqual(['purge:tables', 'purge:graph', 'purge:proposals']);
  });

  it('NAO_SEI e bloco ausente ⇒ `pendente`, nada é criado no perfil fiscal', async () => {
    for (const fiscalInput of [{ regime: 'NAO_SEI' as const }, undefined]) {
      const { service, fiscal } = build();
      const r = await service.provision(ctx, input(fiscalInput));
      expect(r.fiscal).toEqual({ status: 'pendente', ano: expect.any(Number) });
      expect(fiscal.upsert).not.toHaveBeenCalled();
    }
  });

  it('a purga que falha ⇒ OnboardingRollbackFailedError (outro código), nunca o "desfeito"', async () => {
    const unit = build({ unitFails: true, purgeFails: true });
    const e1 = await unit.service.provision(ctx, input()).catch((e) => e);
    expect(e1).toBeInstanceOf(OnboardingRollbackFailedError);
    expect(e1).toMatchObject({ statusCode: 500, errorCode: 'ONBOARDING_ROLLBACK_FAILED' });
    expect(e1.message).toBe('A unidade não foi criada e a limpeza do sistema instalado falhou. Use "Resetar sistema" antes de tentar de novo.');

    const fisc = build({ fiscalFails: true, purgeFails: true });
    const e2 = await fisc.service.provision(ctx, input({ regime: 'REAL' })).catch((e) => e);
    expect(e2).toBeInstanceOf(OnboardingRollbackFailedError);
    expect(e2.message).toBe('O perfil fiscal não foi criado e a limpeza do sistema instalado falhou. Use "Resetar sistema" antes de tentar de novo.');
  });
});

describe('SystemProvisioningService.assertCanProvision', () => {
  it('só consulta a policy: passa sem tabelas; com tabelas lança o 403 de hoje e não instala nada', async () => {
    const livre = build();
    await expect(livre.service.assertCanProvision(ctx)).resolves.toBeUndefined();
    expect(livre.calls).toEqual(['getTables']);

    const ocupado = build({ tablesBefore: 1 });
    await expect(ocupado.service.assertCanProvision(ctx)).rejects.toBeInstanceOf(ForbiddenError);
    expect(ocupado.tables.installPresetAsSystem).not.toHaveBeenCalled();
  });
});

describe('SystemProvisioningService.purgeUserSystem', () => {
  it('limpa tabelas, KnowledgeGraph e ActionProposals do usuário pedido', async () => {
    const { service, tables, knowledgeGraphs, actionProposals } = build();
    await service.purgeUserSystem('u9');
    expect(tables.deleteAllTablesForUser).toHaveBeenCalledWith('u9');
    expect(knowledgeGraphs.deleteByUserId).toHaveBeenCalledWith('u9');
    expect(actionProposals.deleteByUserId).toHaveBeenCalledWith('u9');
  });
});

describe('SystemProvisioningPolicy', () => {
  it('canProvision: só com 0 tabelas dinâmicas (a guarda one-shot)', () => {
    const policy = new SystemProvisioningPolicy();
    expect(policy.canProvision(ctx, 0)).toBe(true);
    expect(policy.canProvision(ctx, 1)).toBe(false);
  });
});
