/**
 * Porta pública da feature `analytics` para o tipo da configuração de KPI que um preset de tabela declara
 * (`PresetTableDefinition.analytics`). Só o tipo: nenhuma outra feature alcança `analytics/core/` direto
 * (regra `M1`, ADR-MODULE-BOUNDARIES §10 e §11.6).
 *
 * Não é `*.types.ts` de propósito: a `M4` só deixa esse sufixo ler `models/` e `dtos/` na raiz da feature, e o tipo
 * mora em `core/models/` (dono, questionário, 24/11/2026: "Porta em analytics/public"). Consequência: policy, model e
 * DTO de outra feature não podem importar este arquivo (`L5`/`L6`).
 */
export type { AnalyticsConfiguration } from '../core/models/AnalyticsConfiguration';
