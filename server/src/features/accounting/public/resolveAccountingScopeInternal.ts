/**
 * Porta pública da feature `accounting` para o resolvedor síncrono do escopo contábil, que NÃO valida o `unitId`
 * (BE-INCR-SCOPE-UNIT-GUARD, nó I6, F-I6-1 d): é só de chamador interno cujo `unitId` vem de linha já gravada
 * (`sales/services/RegisterPaymentService`, `onboarding/services/SystemProvisioningService`).
 * Regra `M1` (ADR-MODULE-BOUNDARIES §10 e §11.10; dono, questionário, 26/11/2026: "Destinos propostos"). Só reexporta
 * por nome; a função mora em `models/resolveAccountingScopeInternal`.
 *
 * Arquivo próprio de propósito: a regra `I6-controller-not-internal-scope` cita este caminho junto com o de `models/`,
 * para que controller HTTP não alcance a função pela porta. Não junte este reexport a outra porta.
 */
export { resolveAccountingScopeInternal } from '../models/resolveAccountingScopeInternal';
