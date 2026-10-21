/**
 * BE-INCR-RESET-CONSISTENTE item 9 (nó I7, F-I7-1 → "409 só com movimento") — classificação FECHADA das tabelas
 * contábeis para o "Resetar sistema". Todo `model` do schema com `unitId` ou com `userId` contábil cai em exatamente uma
 * classe (teste-guarda `accountingResetClassification.test.ts` lê o `schema.prisma`):
 *   - TRAIL: a trilha encadeada. Nunca apagada, nunca bloqueia (`audit-log-no-fk-cascade`).
 *   - SETUP: exatamente o que o onboarding escreve (E7), MEDIDO pelo item 10 — sai pelo serviço da contabilidade.
 *   - BLOCKING: todo o resto. Uma linha qualquer ⇒ 409. Regra: o que o onboarding não escreve, bloqueia; tabela nova
 *     nasce BLOCKING até alguém a classificar.
 */
export const ACCOUNTING_RESET_TRAIL = ['AuditEvent', 'AuditChainHead'] as const;

/**
 * Ordem = ordem segura de remoção (filhos antes dos pais): quem referencia `Account` (`onDelete: Restrict`) sai antes,
 * `Account` por último entre eles; `AccountingPeriodTransition` antes do `AccountingPeriod`.
 */
export const ACCOUNTING_RESET_SETUP = [
  // MEDIDO no item 10: o perfil fiscal da unidade grava uma versão APPLIED "sem contador" no onboarding. Tabela DIVIDIDA
  // (ACCOUNTING_RESET_SPLIT): só as versões sem contador são SETUP; as com contador bloqueiam.
  'AccountingPolicyVersion',
  // X10i PR-1 (dono, questionário, 2026-10-17, na integração do #650: "SETUP (sai no reset)"). Sem FK: posição livre.
  'FiscalCertificate',
  'ReferentialMapping',
  'RoleAccountOverride',
  'FiscalProfile',
  'AccountingScopeSettings',
  'ServiceFiscalProfile',
  'AccountingBinding',
  'KitInstallation',
  'AccountingPeriodTransition',
  'AccountingPeriod',
  'CompanyFiscalProfile',
  'Account',
] as const;

export const ACCOUNTING_RESET_BLOCKING = [
  'JournalEntry',
  'JournalEntrySequence',
  'Posting',
  'PostingDimension',
  'DimensionDefinition',
  'DimensionValue',
  'JournalEntrySource',
  'SourceDocument',
  'DocumentAttachment',
  'AccountingDataExchangeJob',
  'AccountingDataExchangeRow',
  'BankStatement',
  'BankStatementLine',
  'ReconciliationMatch',
  'ReconcilePendingItem',
  'BankSettlementItem',
  'CustomerPackageBalance',
  'PackageBalanceMovement',
  'PackageValidityAcceptance',
  'Payable',
  'PayablePayment',
  'Receivable',
  'ReceivableReceipt',
  'Counterparty',
  'InventoryItem',
  'KitUpgradeRun',
  'KitUpgradePending',
  'CompanySigner',
  'IssBeneficioMunicipal',
  'ProductDestinationDefault',
  'FiscalDocument',
  'FiscalDocumentPendingAttachment',
  'FiscalDocumentSequence',
  'FixedAssetClass',
  'DepreciationRate',
  'FixedAsset',
  'AccountingContact',
  'AccountingDeliveryLog',
  'AccountingReview',
  'AccountingReviewFinding',
  'LalurEntry',
  'LalurParteBAccount',
  'LalurParteBMovement',
  'LalurParteBClosing',
  'AccountantAssignment',
  'PaymentAccount',
  'CollectionCharge',
  'TaxAssessment',
  'ConsumptionTaxAssessment', // IBS-CBS-2027 PR-2 — tabela nova nasce BLOCKING
  'MitExport',
  'SimplesHistoricoMensal',
  'SimplesSegregacaoManual',
  'SalaoParceriaContrato',
  'ReceitaFiscalLinha',
  'SimplesDeclaracaoAnual',
  'SimplesApuracao',
  // X14-CAIXA PR-1 (dono, questionário, 2026-10-16, na integração do lote: "Os dois bloqueiam o reset").
  'ReceitaFiscalRecebimento',
  // X14-CAIXA PR-3 (mesma decisão do dono, 2026-10-16).
  'SimplesCreditoIncobravel',
] as const;

/**
 * SETUP dividido por linha (EMENDA 2026-10-16; dono, chat: "Mas ela tbm deve depender de ter contador"): a parte "com
 * contador" de cada uma bloqueia como BLOCKING (entra no 409 com o próprio nome); o resto é SETUP e sai no reset. O
 * critério por linha mora no repositório (`AccountingPolicyVersion`: `proposedById` ou `assignmentId` preenchido — o
 * `propose` exige contador ativo e o PUT direto grava os dois nulos, `policyVersionApply.applyDirectInTx`).
 */
export const ACCOUNTING_RESET_SPLIT = ['AccountingPolicyVersion'] as const satisfies readonly SetupTable[];

/** Os de SETUP sem `unitId` (da EMPRESA, chaveados só por `userId`): contados fora da quebra por unidade. */
export const ACCOUNTING_RESET_SETUP_USER_LEVEL = ['CompanyFiscalProfile'] as const satisfies readonly SetupTable[];

export type TrailTable = (typeof ACCOUNTING_RESET_TRAIL)[number];
export type SetupTable = (typeof ACCOUNTING_RESET_SETUP)[number];
export type SplitTable = (typeof ACCOUNTING_RESET_SPLIT)[number];
/** O que pode aparecer no 409: as BLOCKING e a parte "com contador" das divididas. */
export type BlockingTable = (typeof ACCOUNTING_RESET_BLOCKING)[number] | SplitTable;

/** Valores do `details.blocking[].table` do 409. */
export const ACCOUNTING_RESET_BLOCKING_REPORT = [...ACCOUNTING_RESET_BLOCKING, ...ACCOUNTING_RESET_SPLIT] as const;

/** `details` do 409 `SYSTEM_RESET_BLOCKED_BY_ACCOUNTING` (o schema Zod é `SystemResetBlockedDetailsSchema`). */
export type SystemResetBlockedDetails = {
  blocking: Array<{ table: BlockingTable; count: number }>;
};

/** O que o reset contábil removeu, por unidade. Vazio = não havia contabilidade. */
export interface AccountingResetOutcome {
  removed: Array<{ unitId: string; counts: Partial<Record<SetupTable, number>> }>;
}
