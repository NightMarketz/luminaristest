/**
 * Porta pública do motor DynamicTable para o tipo do serviço, que outra feature recebe por injeção (o
 * `lib/factory.ts` é quem instancia). Só o tipo: nenhuma feature constrói o serviço por aqui.
 * Regra `M1` (ADR-MODULE-BOUNDARIES §10 e §11.8; dono, questionário, 25/11/2026: "Pagar as 29").
 */
export type { DynamicTableService } from '../services/DynamicTableService';
