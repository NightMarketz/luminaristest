import type { PostEntryInput } from '../../accounting/dtos/PostingDto';
import type { IAccountingEventMapper } from '../../accounting/sync/mappers/IAccountingEventMapper';
import type { EventBinding } from '../dtos/AccountingBindingDto';
import type { Archetype } from '../models/types';
import { type AccountingEventLike, interpret, isSubledgerCommand } from './interpret';

/**
 * `InterpretedEventMapper` — adaptador fino (P1-DOSSIER-interprete.md §b, literal) implementando
 * `IAccountingEventMapper`. Fecha sobre UM `EventBinding` já resolvido + o `Archetype` que
 * `binding.archetypeKey` referencia — a resolução `archetypeKey → Archetype` (lookup no catálogo)
 * é responsabilidade de quem CONSTRÓI o array de mappers (Fase B, `lib/factory.ts:402-408`), fora
 * do escopo deste corpo (BRIEF item 14).
 *
 * `sourceType` vem de `binding.eventKey` — a mesma chave que `AccountingSyncService` já usa como
 * chave de registro (`this.mappers.get(event.sourceType)`, `AccountingSyncService.ts:45,51`),
 * preservando o ponto de extensão T10 sem tocar `AccountingSyncPort`/`AccountingSyncService`
 * (dossiê §b: "Nada muda em AccountingSyncPort.ts... AccountingSyncService.ts... zero linha tocada").
 *
 * `map()` só aceita arquétipos `kind: 'postEntry'` — `IAccountingEventMapper.map()` retorna
 * `PostEntryInput`, nunca `SubledgerCommand` (a classe 2 não implementa este contrato; é consumida
 * por outro ponto de wiring, fora de escopo desta fase). Um binding apontando para um arquétipo
 * classe 2 aqui é erro de FIAÇÃO (constrói o mapper errado para o efeito errado), não um erro de
 * dado de evento — falha na construção do adaptador, não no runtime de um evento específico.
 */
export class InterpretedEventMapper implements IAccountingEventMapper {
  public readonly sourceType: AccountingEventLike['sourceType'];

  constructor(
    private readonly archetype: Archetype,
    private readonly binding: EventBinding,
  ) {
    if (archetype.kind !== 'postEntry') {
      throw new Error(
        `InterpretedEventMapper só serve arquétipos 'postEntry' — '${archetype.name}' é ` +
          `'${archetype.kind}' (fiação errada: a classe createSubledgerRecord não implementa ` +
          `IAccountingEventMapper).`,
      );
    }
    // eventKey do binding é a chave de registro do evento (mesmo valor que AccountingEvent.sourceType
    // usa) — o cast é estreito porque EventBindingSchema.eventKey é `string` livre na FORMA; a
    // pertinência à union fechada de sourceType é checada pelo validador determinístico (Corpo B)
    // antes de o binding poder ativar (F-BP-2b), não aqui.
    this.sourceType = binding.eventKey as AccountingEventLike['sourceType'];
  }

  public map(event: AccountingEventLike): PostEntryInput {
    const result = interpret({ archetype: this.archetype, binding: this.binding, event });
    if (isSubledgerCommand(result)) {
      // Não deveria ser alcançável (guard no construtor já rejeita arquétipo classe 2) — defesa em
      // profundidade contra o `archetype` mutar depois da construção.
      throw new Error('interpret() retornou SubledgerCommand para um arquétipo postEntry — bug de dispatch.');
    }
    return result;
  }
}
