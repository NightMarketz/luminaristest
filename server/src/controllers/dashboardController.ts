import type { Request, Response } from 'express';
import { handleApiError } from '@/lib/apiUtils';
import { getUserContextFromRequest } from '@/lib/authUtils';
import { getFactory } from '@/lib/factory';
// eslint-disable-next-line no-restricted-imports -- DEBT: prisma.* em controller, viola contrato §2 (só Repository). Backlog: docs/architecture/lint-layer-gate.md. Remover ao migrar para repository.
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

import { UnifiedCreationSchema } from '@/features/dynamicTables/dtos/CreateDashboard.dto';
import type { UnitInput } from '@/features/dynamicTables/dtos/CreateDashboard.dto';
import type { UserContext } from '@/lib/authUtils';

import { UnauthorizedError, ValidationError } from '@/lib/errors';
import { ISchemaField, ITableSchema } from '@/features/dynamicTables/models/DynamicTable.model';
import { getPresetByKey } from '@/features/dynamicTables/presets/PresetManager';
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
        res
      );
    } else {
      return await handleQuickCreation(
        ctx,
        payload.suiteKey,
        payload.unit,
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

async function handleCustomCreation(
  ctx: UserContext,
  presetKey: string,
  removedTables: string[],
  addedFields: Record<string, unknown[]>,
  unit: UnitInput,
  res: Response
) {
  const userId = ctx.id;
  try {
    const originalPreset = await getPresetByKey(presetKey);

    const finalTablesConfig: Record<string, PresetTableDefinition> = {
      ...CoreSystemPreset.tables,
      ...originalPreset.tables,
    };

    const coreTableKeys = Object.keys(CoreSystemPreset.tables);

    for (const tableKey of removedTables) {
      if (!coreTableKeys.includes(tableKey)) {
        delete finalTablesConfig[tableKey];
      }
    }

    if (addedFields) {
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

    const coreTableList = Object.keys(CoreSystemPreset.tables);
    return res.status(201).json({
      success: true,
      message: 'Dashboard criado com sucesso usando configurações customizadas!',
      data: {
        ...result,
        presetKey,
        unitId,
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
    // Mescla Core + Business em um único preset para permitir referências cruzadas via @@PRESET_TABLE_KEY::
    const mergedPreset = {
      tables: {
        ...CoreSystemPreset.tables,
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

    const coreTableList = Object.keys(CoreSystemPreset.tables);
    const businessTableList = Object.keys(selectedPreset.tables || {});

    return res.status(201).json({
      success: true,
      message: 'Dashboard e tabelas criados com sucesso!',
      data: {
        suiteKey,
        unitId,
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


