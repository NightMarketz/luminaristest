import type { Request, Response } from 'express';
import { handleApiError } from '@/lib/apiUtils';
import { getUserContextFromRequest } from '@/lib/authUtils';
import { getFactory } from '@/lib/factory';
// eslint-disable-next-line no-restricted-imports -- DEBT: prisma.* em controller, viola contrato §2 (só Repository). Backlog: docs/architecture/lint-layer-gate.md. Remover ao migrar para repository.
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

import { z } from 'zod';
import { CustomCreationSchema, QuickCreationSchema } from '@/features/dynamicTables/dtos/CreateDashboard.dto';
import { OnboardingFiscalSchema, UpsertCompanyFiscalProfileSchema } from '@/features/accounting/dtos/CompanyFiscalProfileDto';
import type { OnboardingFiscalInput } from '@/features/accounting/dtos/CompanyFiscalProfileDto';
import { anoCorrente } from '@/features/accounting/services/CompanyFiscalProfileService';
import { resolverObrigacoes } from '@/features/accounting/models/obrigacoesPorRegime';
import type { ObrigacaoResolvida } from '@/features/accounting/models/obrigacoesPorRegime';
import { resolveAccountingScope } from '@/features/accounting/scope/AccountingScope';

/**
 * X13 PR-3 item 19: o controller (camada de integração — Contrato §2.1) compõe o body do motor de tabelas com o bloco
 * `fiscal` da contabilidade. O DTO do `dynamicTables` não conhece a contabilidade.
 */
const UnifiedCreationSchema = z.union([
  QuickCreationSchema.extend({ fiscal: OnboardingFiscalSchema.optional() }),
  CustomCreationSchema.extend({ fiscal: OnboardingFiscalSchema.optional() }),
]);

interface FiscalDoOnboarding {
  status: 'criado' | 'pendente';
  ano: number;
  obrigacoes?: ObrigacaoResolvida[];
}
import type { UnitInput } from '@/features/dynamicTables/dtos/CreateDashboard.dto';
import type { UserContext } from '@/lib/authUtils';

import { ForbiddenError, UnauthorizedError, ValidationError } from '@/lib/errors';
import { InstallModuleSchema } from '@/features/dynamicTables/dtos/InstallModule.dto';
import { Role } from '@/features/users/models/User.model';
import { ISchemaField, ITableSchema } from '@/features/dynamicTables/models/DynamicTable.model';
import { getPresetByKey } from '@/features/dynamicTables/presets/PresetManager';
import { composeModuleTables, type ModuleKey } from '@/features/dynamicTables/presets/modules/registry';
import { assertAddedFieldsRespectModules, resolveModuleSelection } from '@/features/dynamicTables/presets/modules/moduleSelection';
import { CoreSystemPreset, tablePresetSuites, PresetSuite, PresetTableDefinition } from '@/features/dynamicTables/presets';
import { DYNAMIC_TABLE_CATEGORY_CONFIG, DynamicTableCategoryConfig } from '@/features/dynamicTables/models/TableCategories';
import { presetService } from '@/features/dynamicTables/services/PresetService';
import { CreateDynamicTableDto } from '@/features/dynamicTables/dtos/DynamicTable.dto';

export async function createDashboard(req: Request, res: Response) {
  try {
    const ctx = getUserContextFromRequest(req);
    if (!ctx) return res.status(401).json({ success: false, error: 'Authentication required' });

    const validationResult = UnifiedCreationSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Payload inválido',
        details: validationResult.error.issues,
      });
    }

    const payload = validationResult.data;

    const dynamicTableService = getFactory().getDynamicTableService();
    const existingTables = await dynamicTableService.getTablesForUser(ctx.userId);

    if (existingTables.length > 0) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Setup já foi concluído. Este usuário já possui tabelas.',
      });
    }

    if (payload.mode === 'custom') {
      return await handleCustomCreation(
        ctx,
        payload.presetKey,
        payload.removedTables || [],
        payload.addedFields || {},
        payload.unit,
        payload.fiscal,
        payload.modules,
        res
      );
    } else {
      return await handleQuickCreation(
        ctx,
        payload.suiteKey,
        payload.unit,
        payload.fiscal,
        payload.modules,
        res
      );
    }
  } catch (error) {
    return handleApiError(error, res);
  }
}

/**
 * Limpa o sistema gerado do usuário: tabelas dinâmicas + KnowledgeGraph + ActionProposals (R27). Fonte única do
 * reset (`deleteUserSystem`) e da compensação do onboarding (I1, F-I1-4 b) — "o mesmo que o reset faz".
 */
async function purgeUserSystem(userId: string): Promise<void> {
  await getFactory().getDynamicTableService().deleteAllTablesForUser(userId);
  await prisma.knowledgeGraph.deleteMany({ where: { userId } });
  await prisma.actionProposal.deleteMany({ where: { userId } });
}

/**
 * BE-INCR-ONBOARDING-FIRST-UNIT (nó I1, BRIEF itens 2–3; F-I1-1 → b, F-I1-4 → b).
 *
 * Passo 2 do create: a primeira linha de `units` nasce pelo caminho de escrita NORMAL (`createTableData`), para que os
 * plugins de `units` rodem (pipeline de CRM, estoque por unidade). `units` é tabela do Core — sempre instalada.
 * Falha aqui ⇒ COMPENSAÇÃO: apaga o sistema recém-instalado (mesma limpeza do reset) e responde 500
 * `ONBOARDING_ROLLED_BACK`, de modo que um novo create não esbarre no 403 "setup já concluído". Janela residual
 * declarada no BRIEF: entre a instalação e a compensação, um 2º request concorrente do mesmo usuário vê o 403.
 * Devolve o id da unidade, ou `null` quando já respondeu (compensado).
 */
async function createFirstUnitOrRollback(ctx: UserContext, unit: UnitInput, res: Response): Promise<string | null> {
  const service = getFactory().getDynamicTableService();
  try {
    const unitsTable = (await service.getTablesForUser(ctx.userId)).find((t) => t.internalName === 'units');
    if (!unitsTable) throw new Error("Tabela 'units' ausente após a instalação do preset.");
    const data: Record<string, unknown> = { name: unit.name };
    if (unit.cnpj) data.cnpj = unit.cnpj;
    if (unit.type) data.type = unit.type;
    const row = await service.createTableData(ctx, unitsTable.id, { data });
    return row.id;
  } catch (error) {
    logger.error(`Onboarding: falha ao criar a primeira unidade do usuário ${ctx.userId} — compensando.`, { error });
    try {
      await purgeUserSystem(ctx.userId);
    } catch (purgeError) {
      logger.error(`Onboarding: a compensação falhou para o usuário ${ctx.userId}.`, { purgeError });
      res.status(500).json({
        success: false,
        errorCode: 'ONBOARDING_ROLLBACK_FAILED',
        error: 'A unidade não foi criada e a limpeza do sistema instalado falhou. Use "Resetar sistema" antes de tentar de novo.',
      });
      return null;
    }
    const detail = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      success: false,
      errorCode: 'ONBOARDING_ROLLED_BACK',
      error: `Não foi possível criar a unidade (${detail}). A instalação foi desfeita; tente novamente.`,
    });
    return null;
  }
}

/**
 * X13 PR-3 itens 19 e 21 (F-OBP-6 → c) — passo 3 do create, DEPOIS da unidade (mesmo padrão de dois passos +
 * compensação do F-I1-4 b): com regime conhecido, nasce o perfil fiscal da EMPRESA do ano corrente (fuso do escopo)
 * pelo serviço da contabilidade (policy + auditoria + gates dele). `NAO_SEI` ou bloco ausente ⇒ nada é criado e a
 * resposta diz `pendente`. Falha ⇒ o sistema recém-instalado é desfeito (500 ONBOARDING_ROLLED_BACK).
 * O `FiscalProfile` da UNIDADE não é criado aqui — lacuna de spec L-PR3-1 (o F-X6-6 a proíbe inventar
 * `icmsContribuinte`/`pisCofinsRegime`); a consistência com a empresa é cobrada quando ele for cadastrado (item 15).
 * Devolve o resumo, ou `null` quando já respondeu (compensado).
 */
async function createCompanyFiscalProfileOrRollback(
  ctx: UserContext,
  unitId: string,
  fiscal: OnboardingFiscalInput | undefined,
  res: Response
): Promise<FiscalDoOnboarding | null> {
  const scope = resolveAccountingScope(ctx, unitId);
  const ano = anoCorrente(scope);
  if (!fiscal || fiscal.regime === 'NAO_SEI') return { status: 'pendente', ano };
  const regime = fiscal.regime;
  try {
    const input = UpsertCompanyFiscalProfileSchema.parse({ unitId, regime, grandePorte: fiscal.grandePorte ?? null });
    const perfil = await getFactory().getCompanyFiscalProfileService().upsert(scope, ano, input);
    return { status: 'criado', ano, obrigacoes: resolverObrigacoes({ regime, inativa: perfil.inativa, condicoes: perfil.condicoes }) };
  } catch (error) {
    logger.error(`Onboarding: falha ao criar o perfil fiscal da empresa do usuário ${ctx.userId} — compensando.`, { error });
    try {
      await purgeUserSystem(ctx.userId);
    } catch (purgeError) {
      logger.error(`Onboarding: a compensação falhou para o usuário ${ctx.userId}.`, { purgeError });
      res.status(500).json({
        success: false,
        errorCode: 'ONBOARDING_ROLLBACK_FAILED',
        error: 'O perfil fiscal não foi criado e a limpeza do sistema instalado falhou. Use "Resetar sistema" antes de tentar de novo.',
      });
      return null;
    }
    const detail = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      success: false,
      errorCode: 'ONBOARDING_ROLLED_BACK',
      error: `Não foi possível criar o perfil fiscal da empresa (${detail}). A instalação foi desfeita; tente novamente.`,
    });
    return null;
  }
}

async function handleCustomCreation(
  ctx: UserContext,
  presetKey: string,
  removedTables: string[],
  addedFields: Record<string, unknown[]>,
  unit: UnitInput,
  fiscal: OnboardingFiscalInput | undefined,
  modules: ModuleKey[],
  res: Response
) {
  const userId = ctx.id;
  try {
    const originalPreset = await getPresetByKey(presetKey);

    // I8 comportamentos 2–3: as tabelas de lead não vêm mais do Core; entram pelos módulos selecionados
    // (body `modules` ∪ default da suíte, fechado pelas dependências do registro).
    const installedModules = resolveModuleSelection(modules, originalPreset.modules ?? []);
    const finalTablesConfig: Record<string, PresetTableDefinition> = {
      ...CoreSystemPreset.tables,
      ...composeModuleTables(installedModules),
      ...originalPreset.tables,
    };

    const coreTableKeys = Object.keys(CoreSystemPreset.tables);

    for (const tableKey of removedTables) {
      if (!coreTableKeys.includes(tableKey)) {
        delete finalTablesConfig[tableKey];
      }
    }

    if (addedFields) {
      // I8 comportamento 10 (F-CRM-7 → a): campo extra não sombreia campo declarado por módulo.
      assertAddedFieldsRespectModules(addedFields, finalTablesConfig);
      for (const tableKey in addedFields) {
        const fields = addedFields[tableKey] || [];
        // Validação forte de cada campo adicionado usando o DTO de criação (schema.fields)
        for (const f of fields) {
          const single = CreateDynamicTableDto.shape.schema.safeParse({ fields: [f] });
          if (!single.success) {
            res.status(400).json({ error: `Campo inválido em addedFields para a tabela '${tableKey}'.`, details: single.error.flatten() });
            return;
          }
        }
        if (finalTablesConfig[tableKey] && fields.length > 0) {
          const tableSchema = finalTablesConfig[tableKey].schema;
          if (tableSchema) {
            tableSchema.fields.push(...(fields as ISchemaField[]));
          }
        }
      }
    }

    if (Object.keys(finalTablesConfig).length === 0) {
      res.status(400).json({
        error: 'A configuração final não pode estar vazia. Nenhuma tabela foi selecionada.',
      });
      return;
    }

    const service = getFactory().getDynamicTableService();

    const finalPayload: { tables: Record<string, PresetTableDefinition & { internalName: string }> } = { tables: {} };
    for (const internalName in finalTablesConfig) {
      const tableData = finalTablesConfig[internalName];
      finalPayload.tables[internalName] = {
        name: tableData.name || internalName.replace(/_/g, ' '),
        category: tableData.category,
        schema: tableData.schema,
        internalName: internalName,
      };
    }
    // Verificar dependências quebradas localmente antes de chamar o service.
    // Uma relação OPCIONAL cross-módulo cujo alvo não foi selecionado (ex.: leads.accountId
    // → crmAccounts sem o módulo CRM) é descartada do schema final em vez de bloquear a
    // instalação — o campo é enriquecimento condicional, não uma dependência real.
    for (const key in finalPayload.tables) {
      const def = finalPayload.tables[key];
      if (!def?.schema?.fields) continue;
      const keptFields: ISchemaField[] = [];
      let droppedAny = false;
      for (const field of def.schema.fields as ISchemaField[]) {
        if (field.type === 'relation' && field.relation?.targetTable) {
          const target = field.relation.targetTable;
          if (target.startsWith('@@PRESET_TABLE_KEY::')) {
            const targetKey = target.replace('@@PRESET_TABLE_KEY::', '');
            if (!finalPayload.tables[targetKey]) {
              if (field.required) {
                res.status(400).json({ error: `Configuração inválida: relação '${key}.${field.name}' aponta para presetKey inexistente '${targetKey}'.` });
                return;
              }
              droppedAny = true;
              continue;
            }
          }
        }
        keptFields.push(field);
      }
      if (droppedAny) {
        // Reassign (never mutate) — `def.schema` may be the shared preset module singleton.
        def.schema = { ...def.schema, fields: keptFields };
      }
    }

    const result = await service.installPresetAsSystem(userId, finalPayload);
    const unitId = await createFirstUnitOrRollback(ctx, unit, res);
    if (unitId === null) return;
    const fiscalDoOnboarding = await createCompanyFiscalProfileOrRollback(ctx, unitId, fiscal, res);
    if (fiscalDoOnboarding === null) return;

    const coreTableList = Object.keys(CoreSystemPreset.tables);
    return res.status(201).json({
      success: true,
      message: 'Dashboard criado com sucesso usando configurações customizadas!',
      data: {
        ...result,
        presetKey,
        unitId,
        fiscal: fiscalDoOnboarding,
        modules: { installed: installedModules },
        tables: {
          core: coreTableList,
          business: Object.keys(finalPayload.tables).filter((k) => !coreTableList.includes(k)),
        },
      },
    });
  } catch (error) {
    return handleApiError(error, res);
  }
}

async function handleQuickCreation(
  ctx: UserContext,
  suiteKey: string,
  unit: UnitInput,
  fiscal: OnboardingFiscalInput | undefined,
  modules: ModuleKey[],
  res: Response
) {
  const userId = ctx.id;
  try {
    let selectedPreset: PresetSuite | undefined;
    for (const category in tablePresetSuites) {
      const categoryPresets = tablePresetSuites[category as keyof typeof tablePresetSuites];
      if (Object.prototype.hasOwnProperty.call(categoryPresets, suiteKey)) {
        selectedPreset = categoryPresets[suiteKey as keyof typeof categoryPresets];
        break;
      }
    }

    if (!selectedPreset) {
      res.status(404).json({ error: `Preset com chave '${suiteKey}' não encontrado.` });
      return;
    }

    const service = getFactory().getDynamicTableService();
    // I8 comportamentos 2–3: módulos selecionados (body ∪ default da suíte) entram entre o Core e a suíte.
    const installedModules = resolveModuleSelection(modules, selectedPreset.modules ?? []);
    // Mescla Core + Módulos + Business em um único preset para permitir referências cruzadas via @@PRESET_TABLE_KEY::
    const mergedPreset = {
      tables: {
        ...CoreSystemPreset.tables,
        ...composeModuleTables(installedModules),
        ...(selectedPreset.tables || {}),
      },
    };

    // Validate analytics configurations if present
    const analyticsConfigs = (selectedPreset as { analytics?: unknown[] }).analytics;
    if (Array.isArray(analyticsConfigs) && analyticsConfigs.length > 0) {
      const { validateConfigurations } = await import('@/features/analytics/services/AnalyticsValidator');
      const tableSchemas = new Map<string, ITableSchema>();

      // Build schema map from preset tables
      for (const [key, table] of Object.entries(mergedPreset.tables)) {
        tableSchemas.set(key, table.schema);
      }

      const validationResult = validateConfigurations(analyticsConfigs as Parameters<typeof validateConfigurations>[0], tableSchemas);
      if (!validationResult.valid) {
        const errorMessages = validationResult.errors.map(e => `${e.field}: ${e.message}`).join('; ');
        res.status(400).json({
          error: `Analytics configuration validation failed: ${errorMessages}`
        });
        return;
      }
    }

    await service.installPresetAsSystem(userId, mergedPreset);
    const unitId = await createFirstUnitOrRollback(ctx, unit, res);
    if (unitId === null) return;
    const fiscalDoOnboarding = await createCompanyFiscalProfileOrRollback(ctx, unitId, fiscal, res);
    if (fiscalDoOnboarding === null) return;

    const coreTableList = Object.keys(CoreSystemPreset.tables);
    const businessTableList = Object.keys(mergedPreset.tables).filter((k) => !coreTableList.includes(k));

    return res.status(201).json({
      success: true,
      message: 'Dashboard e tabelas criados com sucesso!',
      data: {
        suiteKey,
        unitId,
        fiscal: fiscalDoOnboarding,
        modules: { installed: installedModules },
        tables: {
          core: coreTableList,
          business: businessTableList,
        },
      },
    });
  } catch (error) {
    return handleApiError(error, res);
  }
}

export async function getDashboardData(req: Request, res: Response) {
  try {
    const ctx = getUserContextFromRequest(req);
    if (!ctx) return res.status(401).json({ success: false, error: 'Authentication required' });

    const dynamicTableService = getFactory().getDynamicTableService();
    const tables = await dynamicTableService.getTablesForUser(ctx.userId);
    return res.status(200).json({ success: true, data: tables });
  } catch (error) {
    return handleApiError(error, res);
  }
}

export async function getDashboardPresets(req: Request, res: Response) {
  try {
    const ctx = getUserContextFromRequest(req);
    if (!ctx) return res.status(401).json({ success: false, error: 'Authentication required' });

    const allPresets = presetService.getAllPresetSummaries();
    return res.status(200).json({ success: true, data: allPresets });
  } catch (error) {
    return handleApiError(error, res);
  }
}

export async function getDashboardPresetByKey(req: Request, res: Response) {
  try {
    const ctx = getUserContextFromRequest(req);
    if (!ctx) return res.status(401).json({ success: false, error: 'Authentication required' });

    const { presetKey } = req.params;
    if (!presetKey) throw new ValidationError('Invalid preset key');

    const preset = presetService.getPresetByKey(presetKey);
    if (preset) {
      return res.status(200).json({ success: true, data: preset });
    } else {
      return res.status(404).json({ success: false, message: 'Preset not found.' });
    }
  } catch (error) {
    return handleApiError(error, res);
  }
}

export async function getDashboardSidebar(req: Request, res: Response) {
  try {
    const ctx = getUserContextFromRequest(req);
    if (!ctx) return res.status(401).json({ success: false, error: 'Authentication required' });

    const repository = getFactory().getDynamicTableRepository();
    const tableCounts = await repository.countTablesByCategory(ctx.userId);

    const countsMap = new Map<string, number>();
    for (const item of tableCounts) {
      countsMap.set(item.category, item.count);
    }

    // Get all tables for virtual category calculations
    const allTables = await getFactory().getDynamicTableService().getTablesForUser(ctx.userId);

    // Compute counts; include virtual categories
    const sidebarData = DYNAMIC_TABLE_CATEGORY_CONFIG
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map(categoryConfig => {
        if (!categoryConfig.isVirtual) {
          return {
            key: categoryConfig.key,
            displayName: categoryConfig.displayName,
            i18nKey: categoryConfig.i18nKey,
            icon: categoryConfig.icon,
            count: countsMap.get(categoryConfig.key) || 0,
          } satisfies DynamicTableCategoryConfig & { count: number };
        }

        // Virtual category (e.g., 'sales'): derive count from source categories and name matching
        const sourceCats = categoryConfig.sourceCategories || [];
        let count = 0;
        if (sourceCats.length > 0) {
          const nameMatchers = (categoryConfig.virtualNameMatchers || []).map(s => s.toLowerCase());
          count = allTables.filter(t => sourceCats.includes(t.category) && (nameMatchers.length === 0 || nameMatchers.includes(t.name.toLowerCase()))).length;
        }

        return {
          key: categoryConfig.key,
          displayName: categoryConfig.displayName,
          i18nKey: categoryConfig.i18nKey,
          icon: categoryConfig.icon,
          count,
        } satisfies DynamicTableCategoryConfig & { count: number };
      });

    return res.status(200).json({ success: true, data: sidebarData });
  } catch (error) {
    return handleApiError(error, res);
  }
}

export async function deleteUserSystem(req: Request, res: Response) {
  try {
    const ctx = getUserContextFromRequest(req);
    if (!ctx) return res.status(401).json({ success: false, error: 'Authentication required' });

    // Tabelas + KnowledgeGraph + ActionProposals órfãs — o agente não injeta referências a tabelas apagadas (R27).
    await purgeUserSystem(ctx.id);

    logger.info(`User system reset: tables, KnowledgeGraph, and proposals cleaned for user ${ctx.id}`);

    return res.status(204).end();
  } catch (error) {
    return handleApiError(error, res);
  }
}



/**
 * POST /api/dashboard/modules/install — BE-INCR-CRM-MODULE-COMPOSITION (I8), comportamento 8.
 * Liga UM módulo do registro num tenant existente. ADMIN-ONLY (cria tabelas), como o `install-table`.
 */
export async function installModule(req: Request, res: Response) {
  try {
    const ctx = getUserContextFromRequest(req);
    if (!ctx) return res.status(401).json({ success: false, error: 'Authentication required' });
    if (ctx.role !== Role.ADMIN) {
      throw new ForbiddenError('Apenas administradores podem instalar módulos.');
    }
    const body = InstallModuleSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json({ success: false, error: 'Payload inválido', details: body.error.issues });
    const data = await getFactory().getModuleInstallService().installModule(ctx, body.data.moduleKey);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
}
