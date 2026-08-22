import type { LancamentoArchetype } from '../models/types';

/**
 * A Prensa (BE-INCR-BINDING-PRESS, Corpo A, item 4 do BRIEF) — arquétipo `cogs` ('cmv' no
 * dossiê). Extraído 1:1 de `server/src/features/accounting/sync/mappers/SalonSaleCogsMapper.ts`
 * (`P1-DOSSIER-arquetipos.md` §2.5).
 *
 *   Débito  custo-mercadoria-vendida  = costCents   (SalonSaleCogsMapper.ts:29)
 *   Crédito estoque                   = costCents   (SalonSaleCogsMapper.ts:30)
 *
 * ÚNICA diferença de fronteira de dinheiro do catálogo: o valor chega JÁ EM CENTAVOS INTEIROS
 * (computado por `InventoryService.recordSaleCogs` numa tx diferente) — não há conversão
 * float→cents aqui, só revalidação de teto. `event.amount` (float genérico de receita) é
 * IGNORADO para este `sourceType` — daí o slot `costCents`, de tipo `moneyCentsExact`, ser um
 * slot NOMEADO diferente de `amount` (não uma variação do mesmo slot dos outros 4 arquétipos).
 */
export const cogsArchetype: LancamentoArchetype = {
  kind: 'postEntry',
  name: 'cmv',
  sourceType: 'salon.sale.cogs',
  slots: [
    {
      name: 'costCents',
      type: 'moneyCentsExact',
      // Guards do mapper original (SalonSaleCogsMapper.ts:37-51): já inteiro seguro, > 0, <= MAX_CENTS.
      // Nunca reconverte de float — o guard `isFinite`/`round` da classe moneyReais NÃO se aplica.
      guards: ['isSafeInteger', 'positive', 'maxCents'],
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
    { role: 'custo-mercadoria-vendida', side: 'debit', amountSlot: 'costCents' },
    { role: 'estoque', side: 'credit', amountSlot: 'costCents' },
  ],
  invariants: [
    'already-cents-no-float-conversion',
    'amount-field-ignored-for-this-source-type',
    'distinct-commit-from-inventory-subledger',
    'dimension-slot-optional',
  ],
};
