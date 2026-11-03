import { CoreSystemPreset } from './systems/CoreSystemPreset';
import BeautySalonPreset from './systems/BeautySalonPreset';
import AestheticClinicPreset from './systems/AestheticClinicPreset';
import CrmModulePreset from './systems/CrmModulePreset';
import { ITableSchema } from '../models/DynamicTable.model';
import type { AnalyticsConfiguration } from '@/features/analytics/core/models/AnalyticsConfiguration';
import { DynamicTableCategory } from '../models/TableCategories';
import type { ModuleKey } from './modules/registry';

/**
 * The core system preset that is installed for every user.
 * It is exported separately as it is not a user-selectable option.
 */
export { CoreSystemPreset };

/**
 * A centralized object containing all available table preset suites, organized by category.
 * Each suite represents a complete, interconnected set of tables for a specific business type.
 * This makes it easy for the AI service to discover and use predefined, complex schemas.
 */
export const tablePresetSuites = {
  services: {
    beautySalon: BeautySalonPreset,
    // BE-INCR-P2-VERTICAL-CLINICA — segundo vertical da prova (ADR-P2, F-P2-1 → RATIFICADO).
    aestheticClinic: AestheticClinicPreset,
  },
  sales: {
    crmModule: CrmModulePreset,
  },
} satisfies Record<string, Record<string, SelectablePresetSuite>>;

// --- Utility Types for Working with Presets ---

// Type for a single table definition within a suite
export type PresetTableDefinition = {
  name: string;
  category: DynamicTableCategory;
  schema: ITableSchema;
  meta?: {
    /**
     * Lista de chaves de tabelas do mesmo preset que são obrigatórias
     * quando esta tabela estiver presente.
     */
    requiresTables?: string[];
    /**
     * Lista de chaves de tabelas que não podem coexistir com esta tabela.
     */
    excludesTables?: string[];
    /**
     * Capacidades que esta tabela fornece (ex.: 'inventory.stock').
     */
    providesCapabilities?: string[];
    /**
     * Capacidades necessárias para esta tabela operar (ex.: 'inventory.movements').
     */
    requiresCapabilities?: string[];
    /**
     * W2 / F-W2-2 (ratificado 2026-10-15): a tabela é lida pela contabilidade do setor e não pode ser removida no
     * onboarding. Declarado nas suítes (`lockedByAccounting`), nunca no módulo compartilhado.
     */
    lockedBy?: 'accounting';
  };
  /**
   * Optional analytics configurations integrated at the table level.
   * These will be merged with system preset analytics.
   */
  analytics?: AnalyticsConfiguration[];
};

// Type for a full preset suite.
// Identity fields are all optional — `BeautySalonPreset` uses `key/name/description`,
// older suites used `suiteName`. The only required field is `tables`.
export type PresetSuite = {
  tables: Record<string, PresetTableDefinition>;
  key?: string;
  name?: string;
  description?: string;
  /** @deprecated Use `name`. Kept for backward compatibility with older suites. */
  suiteName?: string;
  /**
   * BE-INCR-CRM-MODULE-COMPOSITION (I8): módulos do registro que a suíte compõe por padrão (somados ao
   * `modules` do body do create). Salão e clínica: CRM-0 + CRM-1 (F-CRM-2 → a, F-I8-COMP3-a); crmModule: CRM-0..3.
   */
  modules?: ModuleKey[];
  /**
   * BE-INCR-MODULOS-BASE-SUBMODULOS item 11a: troca a fonte de schema de uma tabela de módulo nesta suíte
   * (internalName → módulo-fonte; ex.: a clínica usa a ficha própria em `customers`). Só tabela de módulo do registro.
   */
  moduleOverrides?: Readonly<Record<string, unknown>>;
  /**
   * Item 11b: tabelas de módulo que a contabilidade do setor lê pelo nome (`meta.lockedBy: 'accounting'`). Vale até o
   * PR-5 (item 28) levar a trava para o módulo.
   */
  lockedModuleTables?: readonly string[];
};

/**
 * W5 / F-W5-1 → (b) (ratificado 2026-10-15): o perfil que a IA da entrevista lê para escolher a suíte. Mora na própria
 * suíte; o `presetKnowledgeBase` (`./ai/PresetKnowledgeBase.ts`) é DERIVADO de `tablePresetSuites`, sem lista à mão.
 */
export type PresetAiProfile = { name: string; description: string };

/**
 * Suíte selecionável: `key` e `aiProfile` obrigatórios. `tablePresetSuites` é declarado com `satisfies` deste tipo — uma
 * suíte sem perfil de IA não compila (o `CoreSystemPreset` fica fora: não é selecionável).
 */
export type SelectablePresetSuite = PresetSuite & { key: string; aiProfile: PresetAiProfile };

export type PresetSuiteCategory = keyof typeof tablePresetSuites;
export type PresetSuiteName<T extends PresetSuiteCategory> = keyof (typeof tablePresetSuites)[T];

