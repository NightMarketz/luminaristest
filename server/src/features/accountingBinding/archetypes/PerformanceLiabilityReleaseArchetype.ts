import type { LancamentoArchetype } from '../models/types';

/**
 * BE-INCR-PACOTE-VALIDADE (BRIEF item 12, contrato §4.3) — arquétipo `performance_liability_release`:
 * a baixa do passivo de performance quando o pacote pré-pago vence sem uso (decisão 18, F-PV-4/6 a).
 *
 *   Débito  passivo-diferido  = releasedCents   (2.1.1 Pacotes Pré-pagos)
 *   Crédito receita-nao-uso   = releasedCents   (3.4 Receita de Pacotes Não Utilizados — provisória, PE-1)
 *
 * Fronteira de dinheiro igual à do `cogs` (`CogsArchetype.ts:23-27`): o valor chega JÁ EM CENTAVOS do
 * movimento `expiry` do subrazão (`PackageBalanceService.expireDue`) — nunca cruza float. `event.amount`
 * é ignorado para este `sourceType`.
 */
export const performanceLiabilityReleaseArchetype: LancamentoArchetype = {
  kind: 'postEntry',
  name: 'passivo-performance-baixa',
  sourceType: 'sale.package.expired',
  slots: [
    { name: 'releasedCents', type: 'moneyCentsExact', guards: ['isSafeInteger', 'positive', 'maxCents'] },
    { name: 'dimension', type: 'string', guards: ['dimensionOptionalPassthrough'] },
  ],
  lines: [
    { role: 'passivo-diferido', side: 'debit', amountSlot: 'releasedCents' },
    { role: 'receita-nao-uso', side: 'credit', amountSlot: 'releasedCents' },
  ],
  invariants: ['breakage-releases-deferred-liability', 'money-exact-cents-no-float', 'dimension-slot-optional'],
};
