import type { LancamentoArchetype } from '../models/types';

/**
 * A Prensa (BE-INCR-BINDING-PRESS, Corpo A, item 4 do BRIEF) — arquétipo `performance_liability`
 * ('passivo-performance' no dossiê). Extraído 1:1 de
 * `server/src/features/accounting/sync/mappers/SalonPackageSoldMapper.ts` (`P1-DOSSIER-arquetipos.md` §2.4).
 *
 *   Débito  controle-recebível  = amount   (SalonPackageSoldMapper.ts:21)
 *   Crédito passivo-diferido    = amount   (SalonPackageSoldMapper.ts:22)
 *
 * Vender um pacote NÃO é receita — cria passivo (deferred revenue); reconhecimento acontece só no
 * consumo. A liquidação DESTE recebível reusa o arquétipo `settlement` — não há arquétipo próprio
 * de liquidação de pacote (comentário original :13-14).
 */
export const performanceLiabilityArchetype: LancamentoArchetype = {
  kind: 'postEntry',
  name: 'passivo-performance',
  sourceType: 'salon.package.sold',
  slots: [
    {
      name: 'amount',
      type: 'moneyReais',
      // Guards do mapper original (SalonPackageSoldMapper.ts:28-41).
      guards: ['isFinite', 'round', 'isSafeInteger', 'positive'],
    },
    // Slot opcional de etiqueta de dimensão (emenda 2, ADR §11) — ver nota completa em
    // `RevenueRecognitionArchetype.ts`.
    {
      name: 'dimension',
      type: 'string',
      guards: ['dimensionOptionalPassthrough'],
    },
  ],
  lines: [
    { role: 'controle-recebível', side: 'debit', amountSlot: 'amount' },
    { role: 'passivo-diferido', side: 'credit', amountSlot: 'amount' },
  ],
  invariants: [
    'package-sale-is-not-revenue',
    'settlement-reuses-existing-archetype',
    'money-boundary-single-conversion',
    'dimension-slot-optional',
  ],
};
