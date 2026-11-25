/**
 * Porta pública da feature `analytics` para quem roda um processador fora dela (hoje, os serviços de relatório do
 * CRM): o contrato do processador, os tipos do pipeline de agregação e o processador de agregação.
 * Regra `M1` (ADR-MODULE-BOUNDARIES §10 e §11.8; dono, questionário, 25/11/2026: "Pagar as 29").
 *
 * Não é `*.types.ts`: a `M4` só deixa esse sufixo ler `models/` e `dtos/`, e estes tipos moram com o registro de
 * processadores.
 */
export type { AnalyticsProcessorContext, ChartDataPoint, TableDataRow } from '../domain/core/ProcessorRegistry';
export type { Dimension, Filter, Measure, PipelineSpec } from '../domain/core/pipeline/Pipeline';
export { aggregatePipelineProcessor } from '../domain/dynamic/processors/AggregatePipelineProcessor';
