import type { LancamentoArchetype } from '../models/types';

/**
 * A Prensa (BE-INCR-BINDING-PRESS, Corpo A, item 4 do BRIEF) — arquétipo `reversal`
 * ('estorno-origem' no dossiê, = DEVOLUÇÃO). Extraído 1:1 de
 * `server/src/features/accounting/sync/mappers/SalonSaleReturnedMapper.ts` (`P1-DOSSIER-arquetipos.md` §2.3).
 *
 * EMENDA 1 do ADR §11 (legenda T5 corrigida): este arquétipo é uma DEVOLUÇÃO — um lançamento novo
 * e separado que debita a conta de contra-receita — e NÃO o mecanismo `reversedById` do núcleo
 * (`reverseEntry`, fora do catálogo de arquétipos e fora do golden test). O `sale.finalized`
 * original permanece `Posted`; nenhuma edição/reversão acontece aqui.
 *
 *   Débito  contra-receita       = amount   (SalonSaleReturnedMapper.ts:21)
 *   Crédito controle-recebível   = amount   (SalonSaleReturnedMapper.ts:22)
 */
export const reversalArchetype: LancamentoArchetype = {
  kind: 'postEntry',
  name: 'estorno-origem',
  sourceType: 'sale.returned',
  slots: [
    {
      name: 'amount',
      type: 'moneyReais',
      // Guards do mapper original (SalonSaleReturnedMapper.ts:32-46).
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
    { role: 'contra-receita', side: 'debit', amountSlot: 'amount' },
    { role: 'controle-recebível', side: 'credit', amountSlot: 'amount' },
  ],
  invariants: [
    'devolucao-not-reversedById', // Emenda 1 — cerca contra reintroduzir o mecanismo de reversão do núcleo
    'new-separate-entry-original-stays-posted',
    'money-boundary-single-conversion',
    'dimension-slot-optional',
  ],
};
