import { ForbiddenError, NotFoundError } from '../../../lib/errors';
import { AccountingBindingV1Schema } from '../../accountingBinding/dtos/AccountingBindingDto';
import type { BindingScope, IAccountingBindingRepository } from '../../accountingBinding/repositories/IAccountingBindingRepository';
import type { KitTraceView } from '../dtos/KitTraceDto';
import type { ISectorKitPolicy } from '../policies/ISectorKitPolicy';
import type { JournalEntryTracePort } from './kitTracePorts';

/**
 * Rastro evento → fato → lançamento (BE-INCR-KIT-SETOR PR-6, item 50; decisão 3 do PRE-ADR). Só leitura.
 *
 * O `JournalEntry` guarda o evento (`sourceType`/`sourceId`) e, desde o PR-6, o binding que o interpretou
 * (`bindingId`/`bindingVersion` — dono, chat, 13/10: "Gravar a versão"). A linha do binding guarda `eventKey →
 * archetypeKey` (o fato contábil). Nada é inferido por data: os mappers só recarregam no boot (F9), então a versão
 * ativa num instante não é necessariamente a que lançou.
 */
export class KitTraceService {
  constructor(
    private readonly policy: ISectorKitPolicy,
    private readonly entries: JournalEntryTracePort,
    private readonly bindingRepo: Pick<IAccountingBindingRepository, 'findById'>,
  ) {}

  async trace(scope: BindingScope, sourceType: string, sourceId: string): Promise<KitTraceView> {
    if (!this.policy.canReadKitTrace(scope)) {
      throw new ForbiddenError('Você não tem permissão para ler o rastro do lançamento.');
    }
    const entry = await this.entries.findBySource(sourceType, sourceId);
    if (!entry) throw new NotFoundError(`Nenhum lançamento para o evento '${sourceType}' / '${sourceId}' nesta unidade.`);

    let archetypeKey: string | null = null;
    if (entry.bindingId) {
      const row = await this.bindingRepo.findById(scope, entry.bindingId);
      if (row) {
        const payload = AccountingBindingV1Schema.parse(JSON.parse(row.payload));
        archetypeKey = payload.eventBindings.find((b) => b.eventKey === entry.sourceType)?.archetypeKey ?? null;
      }
    }
    return {
      eventKey: entry.sourceType,
      archetypeKey,
      bindingVersion: entry.bindingVersion,
      journalEntryId: entry.id,
    };
  }
}
