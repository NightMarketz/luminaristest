/**
 * Porta pública da feature `sectorKits` para o registro de kits por setor, que o `accountingBinding` lê para montar o
 * registro de binding por setor.
 * Regra `M1` (ADR-MODULE-BOUNDARIES §10 e §11.8; dono, questionário, 25/11/2026: "Pagar as 29").
 */
export { KIT_REGISTRY, latestKit } from '../domain/registry';
