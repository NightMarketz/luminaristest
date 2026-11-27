/**
 * Porta pública da feature `accounting` para a ponte do recebimento da venda (`maybeSyncSaleSettled`), que o registro
 * de pagamento (`sales/services/RegisterPaymentService`) chama depois de gravar o pagamento.
 * Regra `M1` (ADR-MODULE-BOUNDARIES §10 e §11.10; dono, questionário, 26/11/2026: "Destinos propostos"). Só reexporta
 * por nome; a função mora em `services/bridges/SaleSettlementBridge`.
 */
export { maybeSyncSaleSettled } from '../services/bridges/SaleSettlementBridge';
