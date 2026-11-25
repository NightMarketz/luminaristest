import { z } from 'zod';

/**
 * Vocabulário do registro de módulos de preset: chaves atômicas, chaves de grupo e o seletor de entrada.
 *
 * Mora em `models/` (folha: só Zod) para que model e DTO de outra feature o importem por
 * `dynamicTables/public/presets.types.ts` — a `M4` só deixa esse arquivo ler `models/` e `dtos/` da própria feature
 * (ADR-MODULE-BOUNDARIES §11.6; dono, questionário, 24/11/2026: "Extrair para models/"). O registro
 * (`domain/presets/modules/registry.ts`) importa daqui e reexporta os mesmos nomes.
 */

export const MODULE_KEYS = [
  'CRM-0', 'CRM-1', 'CRM-2A', 'CRM-2B', 'CRM-3', 'CRM-CAMP',
  'PES-0', 'PES-FORN',
  'VEN-0', 'VEN-SERV', 'VEN-PROD', 'VEN-PAC', 'VEN-COM',
  'EST-0', 'AGE-0',
  'FIN-0', 'FIN-REC', 'FIN-BASE',
  'GES-0', 'GES-META',
] as const;
export const moduleKeySchema = z.enum(MODULE_KEYS);
export type ModuleKey = z.infer<typeof moduleKeySchema>;

/** BRIEF item 7: um grupo por categoria, com a chave da categoria em maiúsculas — só as categorias que já têm módulos. */
export const MODULE_GROUP_KEYS = ['CRM-2', 'PESSOAS', 'VENDAS', 'ESTOQUE', 'AGENDA', 'FINANCEIRO', 'GESTAO'] as const;
export const moduleGroupKeySchema = z.enum(MODULE_GROUP_KEYS);
export type ModuleGroupKey = z.infer<typeof moduleGroupKeySchema>;

/** Entrada de seleção (`modules` do create, `moduleKey` do install): chave atômica OU chave de grupo. */
export const moduleSelectorSchema = z.union([moduleKeySchema, moduleGroupKeySchema]);
export type ModuleSelector = z.infer<typeof moduleSelectorSchema>;
