/**
 * Porta pública da feature `accounting` para as leituras de pacote da venda (`loadSalePackageInfo`,
 * `loadPackageValidityDays`), que o aceite de pacote (`packages/services/PackageAcceptanceService`) usa para enxergar
 * a venda do mesmo jeito que a ponte contábil.
 * Regra `M1` (ADR-MODULE-BOUNDARIES §10 e §11.10; dono, questionário, 26/11/2026: "Destinos propostos"). Só reexporta
 * por nome; as funções moram em `sync/bridges/saleItems`.
 */
export { loadPackageValidityDays, loadSalePackageInfo } from '../sync/bridges/saleItems';
