/**
 * ReconcilePendingRecorder — BE-INCR-CANCELAMENTO-CANCELLING PR-0 (item 0.9, lacuna 9d3e).
 *
 * O `BLOCKED` determinístico do reconcile do AP/AR (estorno do pagamento/recebimento com o razão já estornado e o saldo que não o
 * comporta, imposto retido já recolhido, estorno do título que não conclui) era só `logger.warn` + contador: nada gravado, e a passada
 * seguinte o reencontrava do zero. Este helper o grava na bandeja que já existe (`reconcile_pending_items`) e alerta na 1ª captura.
 *
 * UM SÓ ESCRITOR da tabela: delega a `IReconcilePendingRepository.upsertPending`/`resolvePending`/`markAlerted` (o mesmo que o
 * `reportPending` do job e o `rescan` usam — nenhuma 2ª via de escrita no service). Decide só o alerta:
 *   - "1ª captura" = o CAS `markAlerted` (alertedAt nulo → agora) devolveu 1; o webhook sai FORA de qualquer tx e uma 2ª passada não repete
 *     (CAS, não leitura-e-escrita: duas passadas simultâneas alertam uma vez só). `resolvePending` zera a marca ⇒ reaparecer alerta de novo.
 *   - `alert: 'none'` (transitório) grava sem alertar; o alerta por IDADE é do job de re-drive (PR-2).
 *
 * Best-effort: NUNCA lança. Quem chama já está num caminho de erro/blocked e o erro original é o que deve subir/ser contado; uma falha ao
 * gravar a pendência (banco, webhook) vira `logger.warn` e o item volta a ser achado na passada seguinte.
 */
import logger from '../../../lib/logger';
import { sendAlertWebhook, type AlertPayload } from '../../../lib/alertWebhook';
import type { Prisma } from 'generated/prisma';
import type { AccountingScope } from '../models/AccountingScope';
import type { IReconcilePendingRepository } from '../repositories/IReconcilePendingRepository';
import type { ReconcilePendingReasonCodeValue } from '../dtos/ReconcilePendingDto';

export type PendingAlertMode = 'permanent' | 'none';

export interface RecordPendingInput {
  sourceType: string;
  sourceId: string;
  reasonCode: ReconcilePendingReasonCodeValue;
  /** Mensagem do erro (sem PII: o texto dos `AppError` do subrazão cita só ids e valores). */
  reasonDetail: string;
  alert: PendingAlertMode;
}

const MAX_DETAIL_LENGTH = 500;

export class ReconcilePendingRecorder {
  constructor(
    private readonly repo: IReconcilePendingRepository,
    private readonly alert: (payload: AlertPayload) => void = sendAlertWebhook,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /** Grava (ou reabre) a pendência e, se `alert: 'permanent'`, alerta uma única vez por captura. Nunca lança. */
  async record(scope: AccountingScope, input: RecordPendingInput): Promise<void> {
    try {
      const row = await this.repo.upsertPending(scope, {
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        reasonCode: input.reasonCode,
        reasonDetail: input.reasonDetail.slice(0, MAX_DETAIL_LENGTH),
      });
      if (input.alert !== 'permanent' || row.alertedAt != null) return;
      if ((await this.repo.markAlerted(scope, input.sourceType, input.sourceId)) !== 1) return;
      this.alert({
        source: 'subledger_redrive',
        event: 'blocked_permanent',
        timestamp: this.now().toISOString(),
        // Sem PII: ids, tipo e motivo (nunca o texto livre do erro).
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        reasonCode: input.reasonCode,
      });
    } catch (error) {
      logger.warn('Reconcile pending: não foi possível gravar a pendência do cancelamento/estorno — reaparece na próxima passada', {
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Fecha a pendência de `(sourceType, sourceId)` (idempotente: 0 linhas = nunca houve). Com `tx`, na MESMA tx da conclusão do
   * subrazão — concluir por qualquer caminho (retomada do usuário, `/reconcile`, job) fecha o item sem depender do `rescan`.
   */
  async resolve(scope: AccountingScope, sourceType: string, sourceId: string, tx?: Prisma.TransactionClient): Promise<void> {
    await this.repo.resolvePending(scope, sourceType, sourceId, tx);
  }
}
