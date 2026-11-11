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
 * Allowlist (§3.4 #10, dono, questionário 06/11 — D-2026-11-06-PARADOS-NO-DONO §2): todo model com `deletedAt` tem
 * uma classe em `PURGE_CLASS`. `operacional` é purgado; `contabil-fiscal` a purga nunca apaga (guarda até a prescrição,
 * CTN art. 195 p.ú.; Lei 8.981/1995 art. 45 III). Model novo com `deletedAt` sem classe reprova em
 * `__tests__/purgeAllowlist.test.ts`. Na dúvida, a classe é `contabil-fiscal` (reter é reversível; apagar, não).
 *   - DynamicTableData, CrmReportDefinition, SavedTableView — 90 dias
 *   - CrmAttachment — 90 dias, linha E binário em disco (§3.4 #11: o DELETE só marca `deletedAt`)
 *   - InterviewSession — janela própria de 7 dias, e também a sessão EXPIRADA (`expiresAt`), não só a apagada
 *     (BE-INCR-INTERVIEW-SESSION item 9, F-W4-5 b: minimização LGPD — o `state` guarda texto livre do negócio).
 */

import prisma from '../lib/prisma';
import { logger } from '../lib/logger';
import * as storage from '../lib/attachmentStorage';
import { sendAlertWebhook, type AlertPayload } from '../lib/alertWebhook';

export type PurgeClass = 'operacional' | 'contabil-fiscal';

/** Classe de purga de cada model com `deletedAt` (§3.4 #10). */
export const PURGE_CLASS: Record<string, PurgeClass> = {
  DynamicTableData: 'operacional',
  InterviewSession: 'operacional',
  CrmAttachment: 'operacional',
  CrmReportDefinition: 'operacional',
  SavedTableView: 'operacional',
  Account: 'contabil-fiscal',
  AccountantAssignment: 'contabil-fiscal',
  AccountingBinding: 'contabil-fiscal',
  AccountingContact: 'contabil-fiscal',
  AccountingPolicyVersion: 'contabil-fiscal',
  BankSettlementItem: 'contabil-fiscal',
  BankStatement: 'contabil-fiscal',
  CollectionCharge: 'contabil-fiscal',
  CompanyFiscalProfile: 'contabil-fiscal',
  CompanySigner: 'contabil-fiscal',
  ConsumptionTaxAssessment: 'contabil-fiscal',
  Counterparty: 'contabil-fiscal',
  CustomerPackageBalance: 'contabil-fiscal',
  DimensionDefinition: 'contabil-fiscal',
  DimensionValue: 'contabil-fiscal',
  DocumentAttachment: 'contabil-fiscal',
  DpAfastamento: 'contabil-fiscal',
  DpCargo: 'contabil-fiscal',
  DpDependente: 'contabil-fiscal', // BE-INCR-DP-F2 PR-1: dado de folha, como o trabalhador
  DpConvencaoColetiva: 'contabil-fiscal',
  DpConvencaoParametro: 'contabil-fiscal',
  DpFeriasImplantacao: 'contabil-fiscal',
  DpJornada: 'contabil-fiscal',
  DpLancamento: 'contabil-fiscal', // BE-INCR-DP-F2 PR-1
  DpLotacao: 'contabil-fiscal',
  DpModuloAtivacao: 'contabil-fiscal',
  DpOutraRemuneracao: 'contabil-fiscal', // BE-INCR-DP-F2 PR-1
  DpSindicato: 'contabil-fiscal',
  DpTrabalhador: 'contabil-fiscal',
  DpVinculo: 'contabil-fiscal',
  FiscalCertificate: 'contabil-fiscal',
  FiscalDocument: 'contabil-fiscal',
  FiscalProfile: 'contabil-fiscal',
  FixedAsset: 'contabil-fiscal',
  FixedAssetClass: 'contabil-fiscal',
  InterestOnEquityCalculation: 'contabil-fiscal',
  InventoryItem: 'contabil-fiscal',
  IssBeneficioMunicipal: 'contabil-fiscal',
  KitInstallation: 'contabil-fiscal',
  LalurEntry: 'contabil-fiscal',
  LalurParteBAccount: 'contabil-fiscal',
  LalurParteBMovement: 'contabil-fiscal',
  NfceCsc: 'contabil-fiscal',
  Partner: 'contabil-fiscal',
  Payable: 'contabil-fiscal',
  PaymentAccount: 'contabil-fiscal',
  ProductDestinationDefault: 'contabil-fiscal',
  ProductFiscalProfile: 'contabil-fiscal',
  ProfitDistributionEvent: 'contabil-fiscal',
  PscCredential: 'contabil-fiscal',
  DfeSignerDevice: 'contabil-fiscal', // X10a EMENDA-4 AL-PR-2
  DfeSignerDeviceUnit: 'contabil-fiscal', // X10a EMENDA-4 AL-PR-2
  PscProvider: 'contabil-fiscal',
  Receivable: 'contabil-fiscal',
  RoleAccountOverride: 'contabil-fiscal',
  SalaoParceriaContrato: 'contabil-fiscal',
  ServiceCostEvidence: 'contabil-fiscal',
  ServiceFiscalProfile: 'contabil-fiscal',
  SimplesApuracao: 'contabil-fiscal',
  SimplesCreditoIncobravel: 'contabil-fiscal',
  SourceDocument: 'contabil-fiscal',
  TaxAssessment: 'contabil-fiscal',
  TaxOptimizationPolicy: 'contabil-fiscal',
  WithholdingProfile: 'contabil-fiscal',
  // BE-INCR-TEAMMATES PR-0: sem decisão do dono ainda, vale o "na dúvida, contabil-fiscal" do cabeçalho (reter é
  // reversível). Não são contábeis; a troca para `operacional` (com a purga de cada um) é pergunta ao dono no lote.
  AgentChannel: 'contabil-fiscal',
  LlmCredential: 'contabil-fiscal',
  McpServer: 'contabil-fiscal',
  Teammate: 'contabil-fiscal',
  TeammateRoutine: 'contabil-fiscal',
};

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
/** F-W4-5 b (dono, questionário, 2026-10-16): sessão da entrevista expirada ou apagada some em 7 dias. */
export const INTERVIEW_SESSION_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

const JOB = 'PurgeDeletedRecords';

export interface PurgeDeps {
  alert?: (payload: AlertPayload) => void;
}

export async function purgeOldDeletedRecords(deps: PurgeDeps = {}): Promise<void> {
  const alert = deps.alert ?? sendAlertWebhook;
  const cutoffDate = new Date(Date.now() - NINETY_DAYS_MS);

  logger.info(`[PurgeJob] Running purge for records soft-deleted before ${cutoffDate.toISOString()}`);

  // EFX F-19.1: cada passo é isolado — o que lança é registrado e alertado, e os seguintes rodam no mesmo ciclo.
  const step = async (name: string, run: () => Promise<void>): Promise<void> => {
    try {
      await run();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.event('error', 'job.failed', JOB, { job: JOB, step: name, error: message });
      alert({ source: 'purge_deleted_records', event: 'job_failed', timestamp: new Date().toISOString(), job: JOB, step: name, error: message });
    }
  };

  await step('DynamicTableData', async () => {
    const dynamicTableDataResult = await prisma.dynamicTableData.deleteMany({
      where: { deletedAt: { lt: cutoffDate } },
    });
    logger.info(`[PurgeJob] DynamicTableData: purged ${dynamicTableDataResult.count} record(s)`);
  });

  await step('InterviewSession', async () => {
    const interviewCutoff = new Date(Date.now() - INTERVIEW_SESSION_RETENTION_MS);
    const interviewSessionResult = await prisma.interviewSession.deleteMany({
      where: { OR: [{ expiresAt: { lt: interviewCutoff } }, { deletedAt: { lt: interviewCutoff } }] },
    });
    logger.info(`[PurgeJob] InterviewSession: purged ${interviewSessionResult.count} record(s) expired/deleted before ${interviewCutoff.toISOString()}`);
  });

  await step('CrmReportDefinition', async () => {
    const crmReportDefinitionResult = await prisma.crmReportDefinition.deleteMany({ where: { deletedAt: { lt: cutoffDate } } });
    logger.info(`[PurgeJob] CrmReportDefinition: purged ${crmReportDefinitionResult.count} record(s)`);
  });

  await step('SavedTableView', async () => {
    const savedTableViewResult = await prisma.savedTableView.deleteMany({ where: { deletedAt: { lt: cutoffDate } } });
    logger.info(`[PurgeJob] SavedTableView: purged ${savedTableViewResult.count} record(s)`);
  });

  // §3.4 #11 — o binário sai antes da linha: se o disco falhar, a linha fica e a próxima rodada tenta de novo.
  await step('CrmAttachment', async () => {
    const attachments = await prisma.crmAttachment.findMany({
      where: { deletedAt: { lt: cutoffDate } },
      select: { id: true, storageKey: true },
    });
    const removedIds: string[] = [];
    for (const att of attachments) {
      try {
        await storage.deleteFile(att.storageKey);
        removedIds.push(att.id);
      } catch (err) {
        logger.warn('[PurgeJob] CrmAttachment: binary not removed, row kept for the next run', { attachmentId: att.id, err });
      }
    }
    const crmAttachmentResult = await prisma.crmAttachment.deleteMany({ where: { id: { in: removedIds } } });
    logger.info(`[PurgeJob] CrmAttachment: purged ${crmAttachmentResult.count} record(s) and binaries`);
  });
}
