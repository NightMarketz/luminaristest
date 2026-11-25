import type { Prisma } from 'generated/prisma';
import { AppError } from '../../../../lib/errors';
import type { ILalurRepository } from '../../repositories/ILalurRepository';
import type { AccountingScope } from '../../scope/AccountingScope';
import type { AccountDeletionGuard } from '../../ports/LedgerPorts';

/**
 * ECF 3C item 19 (espelho de `LalurService.archiveParteB`): um ajuste vivo da Parte A com a conta sairia no M310/M360
 * apontando para conta morta. Contado DENTRO da tx do soft-delete (item 16). Onda 1.2: saiu do `PostingService` para a
 * borda BR; o núcleo só conhece a porta `AccountDeletionGuard`.
 */
export class LalurAccountDeletionGuard implements AccountDeletionGuard {
  constructor(private readonly lalurRepo: Pick<ILalurRepository, 'countLiveEntriesByAccount'>) {}

  async assertAccountDeletable(scope: AccountingScope, accountId: string, tx: Prisma.TransactionClient): Promise<void> {
    const lalurLive = await this.lalurRepo.countLiveEntriesByAccount(scope, accountId, tx);
    if (lalurLive > 0) {
      throw new AppError('Arquive os ajustes do e-Lalur/e-Lacs relacionados a esta conta antes de excluí-la.', 409, 'CONFLICT');
    }
  }
}
