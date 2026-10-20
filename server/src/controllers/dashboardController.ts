import type { Request, Response } from 'express';
import { handleApiError } from '@/lib/apiUtils';
import { getUserContextFromRequest } from '@/lib/authUtils';
import { getFactory } from '@/lib/factory';
import logger from '@/lib/logger';

import { z } from 'zod';
import { CustomCreationSchema, QuickCreationSchema } from '@/features/dynamicTables/dtos/CreateDashboard.dto';
import { OnboardingFiscalSchema } from '@/features/accounting/dtos/CompanyFiscalProfileDto';
import type { OnboardingFiscalInput } from '@/features/accounting/dtos/CompanyFiscalProfileDto';
import { buildQuickPreset, InvalidAnalyticsConfigError, UnknownSuiteError } from '@/features/onboarding/services/buildQuickPreset';

/**
 * X13 PR-3 item 19: o controller (camada de integração — Contrato §2.1) compõe o body do motor de tabelas com o bloco
 * `fiscal` da contabilidade. O DTO do `dynamicTables` não conhece a contabilidade.
 */
const UnifiedCreationSchema = z.union([
  QuickCreationSchema.extend({ fiscal: OnboardingFiscalSchema.optional() }),
  CustomCreationSchema.extend({ fiscal: OnboardingFiscalSchema.optional() }),
]);

import type { UnitInput } from '@/features/dynamicTables/dtos/CreateDashboard.dto';
import type { UserContext } from '@/lib/authUtils';

import { ForbiddenError, OnboardingRolledBackError, OnboardingRollbackFailedError, ValidationError } from '@/lib/errors';
import { InstallModuleSchema } from '@/features/dynamicTables/dtos/InstallModule.dto';
import { Role } from '@/features/users/models/User.model';
import { ISchemaField } from '@/features/dynamicTables/models/DynamicTable.model';
import { keyToPascalCase } from '@/features/dynamicTables/presets/PresetManager';
import { SECTOR_BINDING_REGISTRY } from '@/features/accountingBinding/fixtures/sectorBindingRegistry';
import { resolveBindingScope } from '@/features/accountingBinding/scope/BindingScope';
import { reloadAccountingMappersSerialized } from '@/features/accountingBinding/runtime/mapperReload';
import { OnboardingAccountingResultSchema } from '@/features/accountingBinding/dtos/ActivateDefaultBindingDto';
import type { ActivateDefaultBindingResult, OnboardingAccountingResult } from '@/features/accountingBinding/dtos/ActivateDefaultBindingDto';
import { composeModuleTables, expandModuleSelectors, type ModuleSelector } from '@/features/dynamicTables/presets/modules/registry';
import { applyModuleRemovals, applySelectOverrides, assertAddedFieldsRespectModules, resolveModuleSelection } from '@/features/dynamicTables/presets/modules/moduleSelection';
import { assertRemovalsAllowed } from '@/features/dynamicTables/presets/removability';
import { CoreSystemPreset, PresetTableDefinition } from '@/features/dynamicTables/presets';
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

    // Guarda one-shot ANTES de qualquer montagem de preset (404/400 de montagem não vencem o 403) — a policy mora no serviço.
    try {
      await getFactory().getSystemProvisioningService().assertCanProvision(ctx);
    } catch (error) {
      if (error instanceof ForbiddenError) return respondProvisioningError(error, res);
      throw error;
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
        payload.selectOverrides,
        res
      );
    } else {
      return await handleQuickCreation(
        ctx,
        payload.suiteKey,
        payload.unit,
        payload.fiscal,
        payload.modules,
        payload.selectOverrides,
        res
      );
    }
  } catch (error) {
    return handleApiError(error, res);
  }
}

/**
 * Mapeia os erros do `SystemProvisioningService` para os status/corpos que o `POST /dashboard/create` sempre devolveu
 * (BE-INCR-SEED-UNIDADE-E-ENV item 5): 403 one-shot, 500 `ONBOARDING_ROLLED_BACK` / `ONBOARDING_ROLLBACK_FAILED`.
 */
function respondProvisioningError(error: unknown, res: Response): Response | null {
  if (error instanceof ForbiddenError) {
    return res.status(403).json({ success: false, error: 'Forbidden', message: error.message });
  }
  if (error instanceof OnboardingRolledBackError || error instanceof OnboardingRollbackFailedError) {
    return res.status(500).json({ success: false, errorCode: error.errorCode, error: error.message });
  }
  return null;
}

/**
 * BE-INCR-ONBOARDING-ACTIVATION (nó I4) item 9 (F-I4-3 a) — o setor do binding contábil do preset escolhido: a chave do
 * `SECTOR_BINDING_REGISTRY` cujo nome, normalizado por `keyToPascalCase`, é o da suíte pedida. Os dois modos do create
 * só chegam aqui com a chave do registro (`beautySalon`): desde o W5 (dono, 2026-10-16, "Só a chave do registro") o
 * Controle Total recusa `beauty_salon` com 404 antes desta função. Preset sem binding (`crmModule`) ⇒ `null`.
 */
export function resolveOnboardingSectorKey(presetOrSuiteKey: string): string | null {
  const id = keyToPascalCase(presetOrSuiteKey);
  return Object.keys(SECTOR_BINDING_REGISTRY).find((sectorKey) => keyToPascalCase(sectorKey) === id) ?? null;
}

/**
 * I4 itens 10–14 — liga a contabilidade da unidade recém-criada, DEPOIS de instalar → unidade → perfil fiscal (F-I4-1 a):
 * as compensações anteriores (`compensateProvisioning`) não limpam contabilidade, então nada que compensa roda depois de uma
 * escrita contábil. As duas flags em `true` fazem do onboarding uma chamada só (F-B2 a, F-I3-1 a).
 *   - preset sem setor ⇒ `not-applicable`; `activateDefault` nem é chamado (item 12).
 *   - `Draft` do `activateDefault` ou exceção ⇒ 201 com `Draft` e o tenant de pé, sem compensação (F-I4-2 b, item 11) —
 *     assimetria ratificada: *"a ativação contábil falhar não deve apagar o sistema do cliente"*.
 *   - `Active` ⇒ recarga serializada dos mappers (F-I4-4 a, item 13), para a 1ª venda lançar sem reiniciar; falha da
 *     recarga ⇒ `Draft` com `ACCOUNTING_SYNC_RELOAD_FAILED` (binding gravado).
 * A saída passa pelo `OnboardingAccountingResultSchema` (item 14).
 */
async function activateAccountingOrReport(ctx: UserContext, unitId: string, sectorKey: string | null): Promise<OnboardingAccountingResult> {
  if (!sectorKey) return OnboardingAccountingResultSchema.parse({ status: 'not-applicable' });
  const scope = resolveBindingScope(ctx, unitId);
  let result: ActivateDefaultBindingResult;
  try {
    result = await getFactory()
      .getAccountingBindingActivationService(scope)
      .activateDefault(scope, { sectorKey, installChartIfEmpty: true, openCurrentPeriodIfMissing: true });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    logger.error(`Onboarding: a ativação contábil da unidade ${unitId} do usuário ${ctx.userId} falhou — o tenant segue de pé (F-I4-2 b).`, { error: detail });
    return OnboardingAccountingResultSchema.parse({
      status: 'Draft',
      sectorKey,
      blocking: [{ code: 'ACCOUNTING_ACTIVATION_FAILED', message: `A ativação da contabilidade falhou (${detail}). O sistema foi criado; ative a contabilidade pela faixa da Contabilidade.` }],
    });
  }
  const bindingVersion = result.bindingVersion !== undefined ? { bindingVersion: result.bindingVersion } : {};
  if (result.status === 'Draft') {
    return OnboardingAccountingResultSchema.parse({ status: 'Draft', sectorKey, ...bindingVersion, blocking: result.blocking ?? [] });
  }
  if (result.status === 'Active') {
    try {
      await reloadAccountingMappersSerialized();
    } catch (error) {
      logger.error('Recarga dos mappers contábeis falhou depois da ativação do onboarding', {
        unitId,
        bindingVersion: result.bindingVersion,
        error: error instanceof Error ? error.message : String(error),
      });
      return OnboardingAccountingResultSchema.parse({
        status: 'Draft',
        sectorKey,
        ...bindingVersion,
        blocking: [
          {
            code: 'ACCOUNTING_SYNC_RELOAD_FAILED',
            message:
              'O binding foi ativado, mas a recarga dos mappers contábeis falhou: as vendas desta unidade só passam a ser lançadas depois do próximo reinício do servidor.',
          },
        ],
      });
    }
  }
  // `already-active` ⇒ `Active`: inalcançável numa unidade virgem; mapeado por completude.
  return OnboardingAccountingResultSchema.parse({ status: 'Active', sectorKey, ...bindingVersion });
}

async function handleCustomCreation(
  ctx: UserContext,
  presetKey: string,
  removedTables: string[],
  addedFields: Record<string, unknown[]>,
  unit: UnitInput,
  fiscal: OnboardingFiscalInput | undefined,
  modules: ModuleSelector[],
  selectOverrides: Record<string, Record<string, string[]>> | undefined,
  res: Response
) {
  try {
    // W5 item 6 (F-W5-2): o Controle Total resolve pelo registro, como o modo Rápido — chave fora de
    // `tablePresetSuites` (inclusive `coreSystem`, que o import dinâmico do `PresetManager` alcançava) → 404.
    // Só a chave do registro (dono, questionário, 2026-10-16: "Só a chave do registro"): `beauty_salon` → 404.
    const originalPreset = presetService.getPresetByKey(presetKey);
    if (!originalPreset) throw new UnknownSuiteError(presetKey);

    // I8 comportamentos 2–3: as tabelas de lead não vêm mais do Core; entram pelos módulos selecionados
    // (body `modules` ∪ default da suíte, fechado pelas dependências do registro).
    // BE-INCR-CRM-SUBMODULES item 3 (F-SUB-2 → a): chave de grupo expande para os membros antes da resolução.
    const installedModules = resolveModuleSelection(expandModuleSelectors(modules), originalPreset.modules ?? []);
    const finalTablesConfig: Record<string, PresetTableDefinition> = {
      ...CoreSystemPreset.tables,
      ...composeModuleTables(installedModules),
      ...originalPreset.tables,
    };

    const keptModules = applyModuleRemovals(installedModules, removedTables);
    // W2 item 7 (F-W2-3 → a): a mesma trava da Entrevista com IA, sobre o conjunto final (antes de apagar e antes do
    // `finalPayload`, que descarta `meta`). Módulos já foram decididos acima; Core em `removedTables` segue ignorado.
    const coreTableKeys = Object.keys(CoreSystemPreset.tables);
    assertRemovalsAllowed(finalTablesConfig, removedTables.filter((k) => !coreTableKeys.includes(k)));

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
        const def = finalTablesConfig[tableKey];
        if (def?.schema && fields.length > 0) {
          // reatribui, não empurra: `def` pode ser o singleton do preset, compartilhado no processo
          finalTablesConfig[tableKey] = {
            ...def,
            schema: { ...def.schema, fields: [...def.schema.fields, ...(fields as ISchemaField[])] },
          };
        }
      }
    }

    // I8 c11 (F-I8-C11): opções de selects livres — só select da allowlist; campo texto → 400 nomeado.
    Object.assign(finalTablesConfig, applySelectOverrides(selectOverrides, finalTablesConfig));

    if (Object.keys(finalTablesConfig).length === 0) {
      res.status(400).json({
        error: 'A configuração final não pode estar vazia. Nenhuma tabela foi selecionada.',
      });
      return;
    }

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

    const sectorKey = resolveOnboardingSectorKey(presetKey);
    const { installResult: result, unitId, fiscal: fiscalDoOnboarding } = await getFactory()
      .getSystemProvisioningService()
      .provision(ctx, { preset: finalPayload, unit, fiscal, sectorKey });
    const accounting = await activateAccountingOrReport(ctx, unitId, sectorKey);

    const coreTableList = Object.keys(CoreSystemPreset.tables);
    return res.status(201).json({
      success: true,
      message: 'Dashboard criado com sucesso usando configurações customizadas!',
      data: {
        ...result,
        presetKey,
        unitId,
        fiscal: fiscalDoOnboarding,
        accounting,
        modules: { installed: keptModules },
        tables: {
          core: coreTableList,
          business: Object.keys(finalPayload.tables).filter((k) => !coreTableList.includes(k)),
        },
      },
    });
  } catch (error) {
    if (error instanceof UnknownSuiteError) return res.status(404).json({ error: error.message });
    return respondProvisioningError(error, res) ?? handleApiError(error, res);
  }
}

async function handleQuickCreation(
  ctx: UserContext,
  suiteKey: string,
  unit: UnitInput,
  fiscal: OnboardingFiscalInput | undefined,
  modules: ModuleSelector[],
  selectOverrides: Record<string, Record<string, string[]>> | undefined,
  res: Response
) {
  try {
    const { preset, installedModules } = buildQuickPreset(suiteKey, modules, selectOverrides);
    const sectorKey = resolveOnboardingSectorKey(suiteKey);
    const { unitId, fiscal: fiscalDoOnboarding } = await getFactory().getSystemProvisioningService().provision(ctx, { preset, unit, fiscal, sectorKey });
    const accounting = await activateAccountingOrReport(ctx, unitId, sectorKey);

    const coreTableList = Object.keys(CoreSystemPreset.tables);
    const businessTableList = Object.keys(preset.tables).filter((k) => !coreTableList.includes(k));

    return res.status(201).json({
      success: true,
      message: 'Dashboard e tabelas criados com sucesso!',
      data: {
        suiteKey,
        unitId,
        fiscal: fiscalDoOnboarding,
        accounting,
        modules: { installed: installedModules },
        tables: {
          core: coreTableList,
          business: businessTableList,
        },
      },
    });
  } catch (error) {
    if (error instanceof UnknownSuiteError) return res.status(404).json({ error: error.message });
    if (error instanceof InvalidAnalyticsConfigError) return res.status(400).json({ error: error.message });
    return respondProvisioningError(error, res) ?? handleApiError(error, res);
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

    const preset = presetService.getPresetDetailByKey(presetKey);
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

    // BE-INCR-RESET-CONSISTENTE (nó I7): policy + purga pelos donos canônicos + cache de KPI — no serviço.
    await getFactory().getSystemProvisioningService().resetUserSystem(ctx);

    logger.info(`User system reset for user ${ctx.id}`);

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
