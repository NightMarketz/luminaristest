import type { PostEntryInput } from '../../dtos/PostingDto';
import type { AccountingEvent } from '../AccountingSyncPort';

/**
 * Maps a single kind of AccountingEvent to a balanced PostEntryInput.
 *
 * The mapper owns the chart-of-accounts knowledge (which account debits/credits)
 * AND the money boundary (float currency → integer cents). It must NOT re-implement
 * the balance invariant — it only constructs equal legs; PostingService.postEntry
 * is the authority that validates Σdébito === Σcrédito.
 *
 * DOC NOTE (BE-INCR-BINDING-PRESS, Fase P1, P1-DOSSIER-interprete.md §b): an implementation of this
 * contract need not be hand-written code anymore. `InterpretedEventMapper`
 * (`features/accountingBinding/interpreter/InterpretedEventMapper.ts`) is a thin adapter that closes
 * over a compiled `(archetype, binding)` pair and delegates to the fixed runtime interpreter
 * (`interpret()`) — for those instances, the chart-of-accounts knowledge and the money boundary are
 * owned by the `(archetype, binding)` pair, not by the class. The invariant this file states above
 * still holds either way: whoever "owns" the knowledge, the balance invariant is never re-implemented
 * here — `PostingService.postEntry` remains the sole authority.
 */
export interface IAccountingEventMapper {
  /** The event.sourceType this mapper handles (registry key). */
  readonly sourceType: AccountingEvent['sourceType'];
  /** Build the balanced posting input. Throws ValidationError on bad money. */
  map(event: AccountingEvent): PostEntryInput;
}
