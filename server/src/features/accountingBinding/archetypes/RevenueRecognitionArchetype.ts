import type { LancamentoArchetype } from '../models/types';

/**
 * A Prensa (BE-INCR-BINDING-PRESS, Corpo A, item 4 do BRIEF) — arquétipo `revenue_recognition`
 * ('reconhecimento-receita' no dossiê). Extraído 1:1 de
 * `server/src/features/accounting/sync/mappers/SalonSaleFinalizedMapper.ts` +
 * `revenueSplit.ts` (`P1-DOSSIER-arquetipos.md` §2.1).
 *
 *   Débito  controle-recebível   = amount            (SalonSaleFinalizedMapper.ts:22,60)
 *   Crédito receita-serviço      = amount (split)     (revenueSplit.ts:22,50)
 *   Crédito receita-revenda      = amount (split, opcional se cair a zero) (revenueSplit.ts:23,53)
 *
 * As duas linhas de crédito referenciam o MESMO slot `amount` (não um sub-total próprio): o
 * splitter (`revenueSplit.ts`, técnica canônica) é quem decide COMO o valor de `amount` se reparte
 * entre as duas — o arquétipo só declara que ambas as linhas partem do mesmo total, e a linha
 * `receita-revenda` é a única que pode ser omitida quando a base do split é zero (mesma regra de
 * `revenueSplit.ts:41-43`, fallback para crédito único em `receita-serviço`). Isso é o que torna o
 * balanceamento por construção verificável simbolicamente: Σ(amountSlot no débito) ===
 * Σ(amountSlot no crédito) quando comparado por NOME de slot (teste de propriedade em
 * `__tests__/archetypes.balance.test.ts`) — o valor exato de cada perna é responsabilidade do
 * intérprete (Corpo D), não deste catálogo.
 *
 * `paymentStatus` é ignorado (mesmo uma venda `Paid` posta para A Receber — liquidação é evento
 * separado, arquétipo `settlement`) — registrado como invariante, não reimplementado aqui.
 */
export const revenueRecognitionArchetype: LancamentoArchetype = {
  kind: 'postEntry',
  name: 'reconhecimento-receita',
  sourceType: 'salon.sale.finalized',
  slots: [
    {
      name: 'amount',
      type: 'moneyReais',
      // Guards do mapper original (SalonSaleFinalizedMapper.ts:32-47) — nomeados aqui, aplicados
      // pelo intérprete fixo (F-P1-4a): número finito → round(*100) → safe-integer → > 0.
      guards: ['isFinite', 'round', 'isSafeInteger', 'positive'],
    },
    {
      name: 'revenueByNature',
      type: 'revenueByNatureReais',
      // Consultado pelo splitter canônico (revenueSplit.ts) para decidir a proporção 3.1×3.3 do
      // slot `amount`; ausente ou com base<=0 ⇒ fallback de crédito único em receita-serviço.
      guards: ['revenueSplitByNature'],
    },
    // Slot opcional de etiqueta de dimensão (emenda 2, ADR §11) — nenhum dos 5 mappers do corpus
    // preenche isto hoje (nenhuma conta do salão tem requiresDimension=true), mas o arquétipo
    // precisa poder RECEBER a etiqueta sem travar quando um vertical novo tiver contas com
    // requiresDimension=true (INCR-DIM-COMPLETENESS, achado A3 do parecer). NOTA: `ArchetypeLine`
    // (Fase 0, `models/types.ts`) ainda não tem um campo de dimensão por linha — este slot fica
    // declarado e disponível para o binding mapear (fieldSlots), mas não wireado a nenhuma `line`
    // aqui; `PostEntryLine.dimensions?: string[]` (PostingDto.ts) é quem a carrega em runtime,
    // wiring que cabe ao Corpo D (intérprete). Gap de shape registrado, não inventado por este
    // arquivo — ver nota de retorno desta sessão.
    {
      name: 'dimension',
      type: 'string',
      guards: ['dimensionOptionalPassthrough'],
    },
  ],
  lines: [
    { role: 'controle-recebível', side: 'debit', amountSlot: 'amount' },
    { role: 'receita-serviço', side: 'credit', amountSlot: 'amount' },
    { role: 'receita-revenda', side: 'credit', amountSlot: 'amount', optional: true },
  ],
  invariants: [
    'revenue-split-by-nature',
    'payment-status-ignored',
    'money-boundary-single-conversion',
    'dimension-slot-optional',
  ],
};
