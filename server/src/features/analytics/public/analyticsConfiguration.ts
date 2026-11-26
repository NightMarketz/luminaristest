/**
 * Porta pública da feature `analytics` para o tipo da configuração de KPI que um preset de tabela declara
 * (`PresetTableDefinition.analytics`). Só o tipo: nenhuma outra feature alcança `analytics/models/` direto
 * (regra `M1`, ADR-MODULE-BOUNDARIES §10 e §11.6).
 *
 * Nasceu sem o sufixo `*.types.ts` porque o tipo morava em `core/models/`, que a `M4` não aceita (dono, questionário,
 * 24/11/2026: "Porta em analytics/public"). Desde 25/11 o tipo está em `analytics/models/` (dono, questionário:
 * "analytics/models/"), e a troca de sufixo passou a ser possível; o nome ficou para não mexer nos importadores.
 * Enquanto não for `*.types.ts`, policy, model e DTO de outra feature não podem importar este arquivo (`L5`/`L6`).
 */
export type { AnalyticsConfiguration } from '../models/AnalyticsConfiguration';
