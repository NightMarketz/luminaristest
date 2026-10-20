/**
 * BE-INCR-SEED-UNIDADE-E-ENV item 7 — `SystemProvisioningService` com fakes das dependências (sem banco):
 * ordem (i)→(iv); guarda one-shot (policy) sem instalar nada; compensação em falha da unidade e do perfil fiscal;
 * `NAO_SEI`/ausente → `pendente`; purga que falha → `OnboardingRollbackFailedError`.
 * BE-INCR-RESET-CONSISTENTE itens 1–4: a compensação chama só os três de sempre; o reset chama o conjunto do item 2,
 * nessa ordem, invalida o cache de KPI e passa pela policy.
 */
import { resolverObrigacoes, type PerfilParaObrigacoes } from '@/features/accounting/models/obrigacoesPorRegime';
import { MATRIZ_OBRIGACOES_SEMENTE } from '@test/helpers/legalParams';
import logger from '../../../lib/logger';
import {
  ForbiddenError,
  OnboardingRolledBackError,
  OnboardingRollbackFailedError,
  SystemResetBlockedByAccountingError,
} from '../../../lib/errors';
import type { UserContext } from '../../../types/UserContext';
import { Role } from '../../users/models/User.model';
import { SystemProvisioningPolicy } from '../policies/SystemProvisioningPolicy';
import { SystemProvisioningService } from '../services/SystemProvisioningService';
import type { ISystemProvisioningPolicy } from '../policies/ISystemProvisioningPolicy';
import type {
  ProvisionInput,
  ProvisioningFiscalService,
  ProvisioningTableService,
  ProvisioningUnitFiscalService,
} from '../services/SystemProvisioningService';

const ctx: UserContext = {
  id: 'u1', userId: 'u1', name: 'U', username: 'u', email: 'u@t.local', role: Role.USER, userRole: 'USER', userEmail: 'u@t.local',
  createdAt: new Date(0), updatedAt: new Date(0),
};
const input = (fiscal?: ProvisionInput['fiscal'], sectorKey?: string | null): ProvisionInput => ({
  preset: { tables: {} },
  unit: { name: 'Matriz', type: 'Own' },
  fiscal,
  sectorKey,
});

function build(opts: {
  tablesBefore?: number;
  unitFails?: boolean;
  fiscalFails?: boolean;
  unitFiscalFails?: boolean;
  purgeFails?: boolean;
  policy?: ISystemProvisioningPolicy;
  deleteFileFails?: boolean;
  accountingBlocks?: boolean;
} = {}) {
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
    // BE-INCR-LEGAL-PARAMS PR-2: a matriz vem do serviço da contabilidade (fotografia OBRIGACAO_REGIME) — aqui, a semente.
    resolverObrigacoesEm: jest.fn(async (_data: string, perfil: PerfilParaObrigacoes) => resolverObrigacoes(perfil, MATRIZ_OBRIGACOES_SEMENTE)),
  };
  const unitFiscal = {
    upsert: jest.fn(async () => {
      calls.push('unitFiscal');
      if (opts.unitFiscalFails) throw new Error('perfil da unidade recusado');
      return {};
    }),
  };
  const actionProposals = { deleteByUserId: jest.fn(async () => void calls.push('purge:proposals')) };
  const knowledgeGraphs = { deleteByUserId: jest.fn(async () => void calls.push('purge:graph')) };
  const resetOwners = {
    accountingReset: {
      purgeSetupIfNoMovement: jest.fn(async () => {
        calls.push('reset:accounting');
        if (opts.accountingBlocks) throw new SystemResetBlockedByAccountingError({ blocking: [{ table: 'JournalEntry', count: 1 }] });
        return { removed: [] };
      }),
    },
    dashboardLayouts: { deleteByUserId: jest.fn(async () => void calls.push('reset:layouts')) },
    chatInstances: { deleteByUserId: jest.fn(async () => void calls.push('reset:chats')) },
    savedTableViews: { softDeleteByUserId: jest.fn(async () => void calls.push('reset:views')) },
    crmReportDefinitions: { softDeleteByUserId: jest.fn(async () => void calls.push('reset:reports')) },
    attachments: {
      softDeleteByUserId: jest.fn(async () => {
        calls.push('reset:attachments');
        return [{ id: 'a1', storageKey: 'k1' }, { id: 'a2', storageKey: 'k2' }];
      }),
    },
    attachmentStorage: {
      deleteFile: jest.fn(async (key: string) => {
        calls.push(`reset:file:${key}`);
        if (opts.deleteFileFails && key === 'k1') throw new Error('disco recusou');
      }),
    },
    kpiCache: { invalidate: jest.fn(() => void calls.push('reset:kpiCache')) },
  };
  const writeEffects = { afterDataWrite: jest.fn(), afterStructureWrite: jest.fn() };
  const service = new SystemProvisioningService(
    tables as unknown as ProvisioningTableService,
    fiscal as unknown as ProvisioningFiscalService,
    unitFiscal as unknown as ProvisioningUnitFiscalService,
    actionProposals as never,
    knowledgeGraphs as never,
    opts.policy ?? new SystemProvisioningPolicy(),
    resetOwners as never,
    writeEffects,
  );
  return { service, calls, tables, fiscal, unitFiscal, actionProposals, knowledgeGraphs, resetOwners, writeEffects };
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

  it('BE-INCR-DT-NO-CONSUMER-CALLS: invalida o KPI do dono depois de provisionar (o motor não chama mais o cache)', async () => {
    const { service, writeEffects } = build();
    await service.provision(ctx, input({ regime: 'PRESUMIDO' }));
    expect(writeEffects.afterDataWrite).toHaveBeenCalledWith(ctx.userId);
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
    // I7 item 1: a compensação chama SÓ os três de sempre — nada do reset (layouts, chats, anexos, cache).
    expect(calls.slice(-3)).toEqual(['purge:tables', 'purge:graph', 'purge:proposals']);
    expect(calls.filter((c) => c.startsWith('reset:'))).toEqual([]);
    expect(fiscal.upsert).not.toHaveBeenCalled();
  });

  it('falha ao criar o perfil fiscal ⇒ purga e OnboardingRolledBackError com a mensagem do perfil', async () => {
    const { service, calls } = build({ fiscalFails: true });
    const err = await service.provision(ctx, input({ regime: 'PRESUMIDO' })).catch((e) => e);
    expect(err).toBeInstanceOf(OnboardingRolledBackError);
    expect(err.message).toBe('Não foi possível criar o perfil fiscal da empresa (perfil recusado). A instalação foi desfeita; tente novamente.');
    expect(calls.slice(-3)).toEqual(['purge:tables', 'purge:graph', 'purge:proposals']);
    expect(calls.filter((c) => c.startsWith('reset:'))).toEqual([]);
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

describe('SystemProvisioningService.provision — passo 3b, perfil fiscal da UNIDADE (I4 EMENDA 14/10, item 9c)', () => {
  afterEach(() => jest.restoreAllMocks());

  it('PRESUMIDO + icmsContribuinte:false ⇒ upsert do perfil da unidade DEPOIS do da empresa, com CUMULATIVO e o escopo da unidade', async () => {
    const { service, calls, unitFiscal } = build();
    await service.provision(ctx, input({ regime: 'PRESUMIDO', icmsContribuinte: false }, 'beautySalon'));
    expect(calls.slice(-2)).toEqual(['fiscal', 'unitFiscal']);
    expect(unitFiscal.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ ownerUserId: 'u1', unitId: 'unit-1' }),
      expect.objectContaining({ unitId: 'unit-1', regimeTributario: 'PRESUMIDO', icmsContribuinte: false, pisCofinsRegime: 'CUMULATIVO' }),
    );
  });

  it('sem derivação possível (NAO_SEI, ausente, PRESUMIDO "não sei", REAL da clínica) ⇒ nada é criado', async () => {
    const casos: Array<[ProvisionInput['fiscal'], string | null]> = [
      [{ regime: 'NAO_SEI' }, 'beautySalon'],
      [undefined, 'beautySalon'],
      [{ regime: 'PRESUMIDO', icmsContribuinte: null }, 'beautySalon'],
      [{ regime: 'REAL', icmsContribuinte: false }, 'aestheticClinic'],
    ];
    for (const [fiscalInput, sector] of casos) {
      const { service, unitFiscal } = build();
      await service.provision(ctx, input(fiscalInput, sector));
      expect(unitFiscal.upsert).not.toHaveBeenCalled();
    }
  });

  it('falha no upsert da unidade (F-I4-10 a) ⇒ logger.error e segue: provision resolve, nenhuma purga', async () => {
    const err = jest.spyOn(logger, 'error').mockImplementation(() => undefined as never);
    const { service, calls } = build({ unitFiscalFails: true });
    const r = await service.provision(ctx, input({ regime: 'SIMPLES' }, 'beautySalon'));
    expect(r.unitId).toBe('unit-1');
    expect(r.fiscal.status).toBe('criado');
    expect(calls).not.toContain('purge:tables');
    expect(err).toHaveBeenCalledWith(expect.stringContaining('perfil fiscal da unidade'), expect.anything());
  });

  it('falha no perfil da EMPRESA ⇒ compensa antes do 3b: o perfil da unidade nem é tentado', async () => {
    const { service, unitFiscal } = build({ fiscalFails: true });
    await expect(service.provision(ctx, input({ regime: 'SIMPLES' }, 'beautySalon'))).rejects.toBeInstanceOf(OnboardingRolledBackError);
    expect(unitFiscal.upsert).not.toHaveBeenCalled();
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

describe('SystemProvisioningService.resetUserSystem (BE-INCR-RESET-CONSISTENTE itens 1–4)', () => {
  const ctx9: UserContext = { ...ctx, id: 'u9', userId: 'u9' };

  it('item 2: purga pelos donos canônicos na ordem do BRIEF, binário por anexo, e invalida o cache de KPI por último', async () => {
    const { service, calls, tables, knowledgeGraphs, actionProposals, resetOwners } = build();
    await service.resetUserSystem(ctx9);
    expect(calls).toEqual([
      'reset:accounting',
      'purge:tables', 'purge:graph', 'purge:proposals',
      'reset:layouts', 'reset:chats', 'reset:views', 'reset:reports', 'reset:attachments',
      'reset:file:k1', 'reset:file:k2',
      'reset:kpiCache',
    ]);
    expect(tables.deleteAllTablesForUser).toHaveBeenCalledWith('u9');
    expect(knowledgeGraphs.deleteByUserId).toHaveBeenCalledWith('u9');
    expect(actionProposals.deleteByUserId).toHaveBeenCalledWith('u9');
    expect(resetOwners.dashboardLayouts.deleteByUserId).toHaveBeenCalledWith('u9');
    expect(resetOwners.chatInstances.deleteByUserId).toHaveBeenCalledWith('u9');
    expect(resetOwners.savedTableViews.softDeleteByUserId).toHaveBeenCalledWith('u9');
    expect(resetOwners.crmReportDefinitions.softDeleteByUserId).toHaveBeenCalledWith('u9');
    expect(resetOwners.attachments.softDeleteByUserId).toHaveBeenCalledWith('u9');
    expect(resetOwners.kpiCache.invalidate).toHaveBeenCalledWith('u9');
    expect(resetOwners.accountingReset.purgeSetupIfNoMovement).toHaveBeenCalledWith('u9');
  });

  it('item 12: o reset contábil vem PRIMEIRO — se ele recusa (409), nada não contábil é apagado', async () => {
    const { service, calls } = build({ accountingBlocks: true });
    await expect(service.resetUserSystem(ctx9)).rejects.toBeInstanceOf(SystemResetBlockedByAccountingError);
    expect(calls).toEqual(['reset:accounting']);
  });

  it('item 2: falha ao remover o binário de um anexo ⇒ logger.warn e o reset segue (outros arquivos + cache)', async () => {
    const warn = jest.spyOn(logger, 'warn').mockImplementation(() => logger);
    try {
      const { service, calls } = build({ deleteFileFails: true });
      await expect(service.resetUserSystem(ctx9)).resolves.toBeUndefined();
      expect(calls.slice(-3)).toEqual(['reset:file:k1', 'reset:file:k2', 'reset:kpiCache']);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(String(warn.mock.calls[0][0])).toContain('a1');
    } finally {
      warn.mockRestore();
    }
  });

  it('item 4: policy recusa ⇒ ForbiddenError e NADA é apagado', async () => {
    const deny: ISystemProvisioningPolicy = { canProvision: () => true, canResetSystem: () => false };
    const { service, calls } = build({ policy: deny });
    await expect(service.resetUserSystem(ctx9)).rejects.toBeInstanceOf(ForbiddenError);
    expect(calls).toEqual([]);
  });
});

describe('SystemProvisioningPolicy', () => {
  it('canProvision: só com 0 tabelas dinâmicas (a guarda one-shot)', () => {
    const policy = new SystemProvisioningPolicy();
    expect(policy.canProvision(ctx, 0)).toBe(true);
    expect(policy.canProvision(ctx, 1)).toBe(false);
  });

  it('canResetSystem (I7 item 4, E13): o autenticado reseta o próprio sistema — USER e ADMIN', () => {
    const policy = new SystemProvisioningPolicy();
    expect(policy.canResetSystem(ctx)).toBe(true);
    expect(policy.canResetSystem({ ...ctx, role: Role.ADMIN, userRole: 'ADMIN' })).toBe(true);
  });
});
