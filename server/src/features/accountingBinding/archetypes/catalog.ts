import type { Archetype, ArchetypeCatalog } from '../models/types';
import { revenueRecognitionArchetype } from './RevenueRecognitionArchetype';
import { settlementArchetype } from './SettlementArchetype';
import { reversalArchetype } from './ReversalArchetype';
import { performanceLiabilityArchetype } from './PerformanceLiabilityArchetype';
import { cogsArchetype } from './CogsArchetype';
import { subledgerCreateReceivableArchetype } from './SubledgerCreateReceivableArchetype';

/**
 * A Prensa (BE-INCR-BINDING-PRESS, Corpo A, item 4/5 do BRIEF) — catálogo concreto de arquétipos.
 *
 * A chave do `Map` é o `ArchetypeKey` do binding compilado (`AccountingBindingDto.ts`,
 * `ArchetypeKeySchema` — `revenue_recognition | settlement | reversal | performance_liability |
 * cogs | subledger_command`), NÃO o slug em português do dossiê (`archetype.name`, ex.
 * 'reconhecimento-receita') — é essa chave que `AccountingBindingV1.eventBindings[].archetypeKey`
 * carrega e que a checagem #1 do validador (Corpo B, `P1-DOSSIER-validador.md` §1) resolve via
 * `catalog.get(binding.archetypeKey)`. `archetype.name` permanece o rótulo humano/legível do
 * dossiê, mantido por fidelidade ao esboço original — as duas strings coexistem sem conflito
 * porque servem públicos diferentes (máquina vs. leitor).
 *
 * Fechado por construção: um `Map` privado, sem método de inserção exposto — `get('chave
 * desconhecida')` devolve `undefined` (nunca lança, nunca cria), `all()` devolve sempre os mesmos
 * 6 itens. Congelar aqui é o que torna a checagem #1 do validador ("arquétipo existe") uma simples
 * comparação, não uma consulta a fonte mutável.
 */
const ARCHETYPES: ReadonlyMap<string, Archetype> = new Map<string, Archetype>([
  ['revenue_recognition', revenueRecognitionArchetype],
  ['settlement', settlementArchetype],
  ['reversal', reversalArchetype],
  ['performance_liability', performanceLiabilityArchetype],
  ['cogs', cogsArchetype],
  ['subledger_command', subledgerCreateReceivableArchetype],
]);

export class StaticArchetypeCatalog implements ArchetypeCatalog {
  public get(key: string): Archetype | undefined {
    return ARCHETYPES.get(key);
  }

  public all(): Archetype[] {
    return [...ARCHETYPES.values()];
  }
}

/** Instância única — o catálogo é dado estático em código (invariante 1 do ADR-P1), não precisa
 *  de injeção por Factory própria (a fiação para os consumidores dos Corpos B/C/D é da Fase B). */
export const archetypeCatalog: ArchetypeCatalog = new StaticArchetypeCatalog();
