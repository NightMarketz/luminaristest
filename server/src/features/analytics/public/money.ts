/**
 * Porta pública da feature `analytics` para a soma de dinheiro sem deriva de ponto flutuante (`addMoney`, Contrato §2).
 * Regra `M1` (ADR-MODULE-BOUNDARIES §10 e §11.8; dono, questionário, 25/11/2026: "Pagar as 29").
 */
export { addMoney } from '../utils/CurrencyUtils';
