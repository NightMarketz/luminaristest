/**
 * PurgeDeletedRecords — LGPD/R38 compliance job.
 *
 * Hard-deletes records that were soft-deleted more than 90 days ago.
 *
 * Guarda fiscal (CTN art. 195 p.ú.: comprovantes dos lançamentos "até que ocorra a prescrição"; LGPD art. 16 I): a venda
 * lançada no razão nunca chega aqui — o razão só lança venda Finalized (depois Cancelled/Returned), e o immutableAfter
 * scope:'all' do preset bloqueia o soft-delete desses estados. Guarda: `__tests__/purgeVendaLancada.test.ts`
 * (verificação legal de 17/10, dossiê verif-2026-10-17-lgpd-cdc-obrigacoes §4.4).
 *
 * Models with a `deletedAt` column (as of schema inspection):
 *   - DynamicTableData  ✓
 *   - InterviewSession  ✓ — janela própria de 7 dias, e também a sessão EXPIRADA (`expiresAt`), não só a apagada
 *     (BE-INCR-INTERVIEW-SESSION item 9, F-W4-5 b: minimização LGPD — o `state` guarda texto livre do negócio).
 *
 * User, DynamicTable, Document, ChatInstance, and ChatMessage do NOT have
 * a deletedAt column in the current schema and are therefore excluded.
 * Add them here if those columns are introduced in future migrations.
 */

import prisma from '../lib/prisma';
import { logger } from '../lib/logger';

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
/** F-W4-5 b (dono, questionário, 2026-10-16): sessão da entrevista expirada ou apagada some em 7 dias. */
export const INTERVIEW_SESSION_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

export async function purgeOldDeletedRecords(): Promise<void> {
  const cutoffDate = new Date(Date.now() - NINETY_DAYS_MS);

  logger.info(`[PurgeJob] Running purge for records soft-deleted before ${cutoffDate.toISOString()}`);

  // DynamicTableData — only model with deletedAt in current schema
  const dynamicTableDataResult = await prisma.dynamicTableData.deleteMany({
    where: { deletedAt: { lt: cutoffDate } },
  });
  logger.info(`[PurgeJob] DynamicTableData: purged ${dynamicTableDataResult.count} record(s)`);

  const interviewCutoff = new Date(Date.now() - INTERVIEW_SESSION_RETENTION_MS);
  const interviewSessionResult = await prisma.interviewSession.deleteMany({
    where: { OR: [{ expiresAt: { lt: interviewCutoff } }, { deletedAt: { lt: interviewCutoff } }] },
  });
  logger.info(`[PurgeJob] InterviewSession: purged ${interviewSessionResult.count} record(s) expired/deleted before ${interviewCutoff.toISOString()}`);
}
