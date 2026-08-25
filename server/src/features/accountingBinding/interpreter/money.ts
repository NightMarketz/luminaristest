import { ValidationError } from '../../../lib/errors';
import { MAX_CENTS } from '../../accounting/models/money';

/**
 * A Prensa (BE-INCR-BINDING-PRESS, Fase P1, Corpo D) — os DOIS pontos de conversão de dinheiro do
 * intérprete fixo de runtime (F-P1-4a: fronteira de dinheiro é do intérprete, código, não do
 * binding). Fonte: `docs/accounting/P1-DOSSIER-interprete.md` §c — migração VERBATIM das duas
 * variantes de guard hoje duplicadas/divergentes nos 5 mappers de `features/accounting/sync/mappers`.
 *
 * `centsFromReais` — Variante 1, verbatim de `SaleFinalizedMapper.ts:31-47` (idêntica, comentário
 * a comentário, em `SaleSettledMapper.ts:51-67`, `SaleReturnedMapper.ts:31-47` e
 * `SalePackageSoldMapper.ts:27-43`): `typeof===number && Number.isFinite` → `Math.round(v*100)` →
 * `Number.isSafeInteger` → `>0`. Propositalmente SEM teto `MAX_CENTS` — o único teto desta variante é
 * `Number.isSafeInteger`, mais alto que `MAX_CENTS`.
 *
 * `assertCentsInRange` — Variante 2, verbatim de `SaleCogsMapper.ts:36-51`: `Number.isSafeInteger`
 * → `>0` → `<=MAX_CENTS` (import de contrato público, `features/accounting/models/money` — o teto de
 * persistência compartilhado, ACC-HARDEN-POST-CENTS-001).
 *
 * DIVERGÊNCIA DE TETOS PRESERVADA (BRIEF fork F-BP-4 — DECORRÊNCIA do gate byte-idêntico do ADR §7,
 * não ratificação; revisão um-a-um pendente, reabrível sem custo antes do merge):
 * `centsFromReais` NÃO impõe `MAX_CENTS`; `assertCentsInRange` impõe os dois. **NÃO unificar sem
 * decisão do dono** — mudaria o comportamento observável de um evento hoje aceito pela Variante 1 com
 * `amountCents` entre `MAX_CENTS` e `Number.MAX_SAFE_INTEGER`.
 *
 * As mensagens de erro aqui são genéricas (parametrizadas por `context`), diferentes do texto
 * bespoke de cada mapper (ex.: "... para lançamento de receita ..." vs "... para liquidação ...") —
 * essa divergência de TEXTO não quebra nada testado por este corpo: o golden Fase 0 (item 12, parte
 * deste corpo) congela a saída dos mappers ATUAIS diretamente, nunca via este módulo; este módulo só
 * é exercitado pelo intérprete (`interpret.ts`), cujo próprio teste unitário cobre as mensagens que
 * de fato produz.
 */

/** Variante 1, verbatim — float reais → centavos inteiros. */
export function centsFromReais(value: unknown, context: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ValidationError(`Valor inválido para ${context}: não é um número finito.`);
  }
  const cents = Math.round(value * 100);
  if (!Number.isSafeInteger(cents)) {
    throw new ValidationError(`Valor fora da faixa segura de centavos (${context}).`);
  }
  if (cents <= 0) {
    throw new ValidationError(`Valor deve ser maior que zero para ${context}.`);
  }
  return cents;
}

/** Variante 2, verbatim — centavos já prontos, revalidados contra o teto de persistência. */
export function assertCentsInRange(value: unknown, context: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    throw new ValidationError(`Valor inválido para ${context}: não é um inteiro seguro.`);
  }
  if (value <= 0) {
    throw new ValidationError(`Valor deve ser maior que zero para ${context}.`);
  }
  if (value > MAX_CENTS) {
    throw new ValidationError(`Valor fora da faixa suportada de centavos (${context}).`);
  }
  return value;
}
