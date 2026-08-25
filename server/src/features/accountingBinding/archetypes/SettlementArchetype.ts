import type { LancamentoArchetype } from '../models/types';

/**
 * A Prensa (BE-INCR-BINDING-PRESS, Corpo A, item 4 do BRIEF) — arquétipo `settlement`
 * ('liquidacao' no dossiê). Extraído 1:1 de
 * `server/src/features/accounting/sync/mappers/SaleSettledMapper.ts` (`P1-DOSSIER-arquetipos.md` §2.2).
 *
 *   Débito  caixa-por-metodo    = amount   (SaleSettledMapper.ts:36-42 — resolvido por
 *                                            sub-chave `paymentMethod`; papel→conta MÚLTIPLO,
 *                                            não uma conta fixa — o binding carrega um accountCode
 *                                            literal por método, F-P1-5a)
 *   Crédito controle-recebível  = amount   (SaleSettledMapper.ts:27)
 *
 * Entry SEPARADA do reconhecimento de receita — mesmo `saleId`, `sourceType` distinto evita
 * colisão em `@@unique([userId,unitId,sourceType,sourceId])` (comentário original :11-15).
 */
export const settlementArchetype: LancamentoArchetype = {
  kind: 'postEntry',
  name: 'liquidacao',
  sourceType: 'sale.settled',
  slots: [
    {
      name: 'amount',
      type: 'moneyReais',
      // Guards do mapper original (SaleSettledMapper.ts:52-67).
      guards: ['isFinite', 'round', 'isSafeInteger', 'positive'],
    },
    {
      name: 'paymentMethod',
      type: 'enumLookup',
      // Lookup fixo, sem default silencioso (SaleSettledMapper.ts:72-82): não-vazio, existe
      // no mapa método→papel resolvido pelo binding. `packageBalanceNeverCash` preserva F-BP-5
      // (guard defensivo verbatim de `SaleSettledMapper.ts:85-89` — Package Balance NUNCA
      // pode resolver para uma conta de caixa/banco, sempre para o papel `passivo-adiantamento`).
      guards: ['nonEmpty', 'knownPaymentMethod', 'packageBalanceNeverCash'],
    },
    // Slot opcional de etiqueta de dimensão (emenda 2, ADR §11) — ver nota completa em
    // `RevenueRecognitionArchetype.ts`; mesma limitação de shape (`ArchetypeLine` sem campo de
    // dimensão por linha nesta Fase 0), mesmo tratamento.
    {
      name: 'dimension',
      type: 'string',
      guards: ['dimensionOptionalPassthrough'],
    },
  ],
  lines: [
    { role: 'caixa-por-metodo', side: 'debit', amountSlot: 'amount' },
    { role: 'controle-recebível', side: 'credit', amountSlot: 'amount' },
  ],
  invariants: [
    'payment-method-fixed-lookup-no-silent-default',
    'package-balance-never-cash',
    'separate-entry-from-revenue-recognition',
    'money-boundary-single-conversion',
    'dimension-slot-optional',
  ],
};
