/**
 * Database helpers for integration tests.
 *
 * All integration tests share one isolated SQLite file (test-integration.db, pointed at by
 * test/jest.setupEnv.ts). The integration Jest project runs --runInBand, so files never race on it.
 *  - pushTestSchema(): create the file fresh from schema.prisma via a cached template (call once, in beforeAll).
 *  - resetDb():        wipe all rows between tests (call in afterEach) — FK-safe order.
 *  - disconnectDb():   close the Prisma connection (call in afterAll).
 */
import { execSync } from 'child_process';
import { createHash } from 'crypto';
import path from 'path';
import fs from 'fs';
import prisma from '@/lib/prisma';
import { invalidateLegalParameterCache, storePublished } from '@/features/legalParameters/services/legalParameterCache';

const SERVER_DIR = path.resolve(__dirname, '../..'); // test/helpers -> server
const DB_FILE = path.join(SERVER_DIR, 'prisma', 'test-integration.db');
/**
 * BE-INCR-LEGAL-PARAMS PR-1 (BRIEF item 14): coeficientes de lei são dado de PLATAFORMA que a migração semeia. O
 * `db push` não roda migração, então o modelo aplica o mesmo arquivo de dados que o `migration.sql` carrega
 * (teste-guarda de igualdade em legalParameterSeed.test.ts) e o `resetDb()` o reaplica. BE-INCR-SIMPLES-NACIONAL PR-1
 * acrescenta o segundo arquivo (tabelas do Simples, `simplesAnexosSeed.test.ts`).
 */
// BE-INCR-LEGAL-PARAMS: uma semente por PR de migração (v1 = PR-1, v2 = PR-2) + a do Simples (X14 PR-1), aplicadas em ordem.
const LEGAL_PARAMS_SEEDS = ['legal_parameters_v1.sql', 'legal_parameters_v2.sql', 'legal_parameters_simples_v1.sql'].map((f) => path.join(SERVER_DIR, 'prisma', 'data', f));

/**
 * Banco-modelo: o `db push` (~3–5 s, um subprocesso `npx`) roda UMA vez por versão do schema e cada arquivo de
 * integração copia o resultado (ms). Antes eram 83 pushes por execução da suíte. O hash do schema.prisma no nome
 * invalida o modelo sozinho quando o schema muda.
 * ponytail: modelos de hashes antigos ficam em prisma/ (gitignored, *.db) — apague à mão se incomodar.
 */
function templateDb(): string {
  const schema = fs.readFileSync(path.join(SERVER_DIR, 'prisma', 'schema.prisma'));
  const hash = createHash('sha1').update(schema).update(LEGAL_PARAMS_SEEDS.map((f) => fs.readFileSync(f, 'utf8')).join('')).digest('hex').slice(0, 12);
  const template = path.join(SERVER_DIR, 'prisma', `test-integration.template-${hash}.db`);
  if (!fs.existsSync(template)) {
    // Push num nome temporário + rename: um modelo pela metade (push abortado) nunca fica com o nome definitivo.
    const tmpName = `test-integration.template-${hash}.${process.pid}.tmp.db`;
    execSync('npx prisma db push --skip-generate --accept-data-loss', {
      cwd: SERVER_DIR,
      env: { ...process.env, DATABASE_URL: `file:./${tmpName}` },
      stdio: 'inherit',
    });
    for (const seed of LEGAL_PARAMS_SEEDS) {
      execSync(`npx prisma db execute --file "${seed}" --url "file:${path.join(SERVER_DIR, 'prisma', tmpName)}"`, { cwd: SERVER_DIR, stdio: 'inherit' });
    }
    fs.renameSync(path.join(SERVER_DIR, 'prisma', tmpName), template);
  }
  return template;
}

/** Empties any existing test DB and recreates the schema (copied from the template, see templateDb()). */
export function pushTestSchema(): void {
  const template = templateDb();
  for (const f of [DB_FILE, `${DB_FILE}-journal`, `${DB_FILE}-wal`, `${DB_FILE}-shm`]) {
    // Truncar, não apagar: no Windows o SQLite abre sem FILE_SHARE_DELETE e o engine do Prisma de uma suíte anterior
    // (mesmo processo jest, já desconectado) ainda segura o handle → unlink = EBUSY. Truncar é permitido e um arquivo
    // vazio é um SQLite vazio. -wal/-shm também: o app liga WAL (lib/prisma), e um WAL velho ao lado do arquivo novo
    // não pode sobrar.
    if (fs.existsSync(f)) fs.truncateSync(f, 0);
  }
  fs.copyFileSync(template, DB_FILE);
}

/**
 * Deletes every row, children before parents, so tests start from a clean slate.
 *
 * Covers the accounting module (AccountingPeriod … AccountingBinding in schema.prisma) in
 * addition to the original 11 tables — F-Q3 (pipeline S3): resetDb() used to leave all ~31
 * accounting tables untouched, so accounting state leaked between test files under
 * --runInBand. LIVE guard: resetDb.accounting.integration.test.ts (derived from schema.prisma).
 * The historical symptom was the local cleanup block ProvenanceAttachIdempotency.integration.test.ts
 * carried; it was REMOVED once this function covered those tables, so it is cited WITHOUT a line
 * range on purpose — a pointer at code that no longer exists is the dead-pointer class (8c30f7c8).
 * Order below is a hardcoded FK-safe topological sort (children before parents) derived from
 * schema.prisma; the two self-relations
 * (JournalEntry.reversedById, DimensionValue.parentId) are nulled out just before their table's
 * deleteMany() so a single-table self-referencing pair never trips SQLite's FK check mid-delete.
 */
export async function resetDb(): Promise<void> {
  // Accounting — leaf tables first (nothing else references them).
  await prisma.postingDimension.deleteMany();
  await prisma.reconciliationMatch.deleteMany();
  await prisma.documentAttachment.deleteMany();
  await prisma.journalEntrySource.deleteMany();
  await prisma.accountingDataExchangeRow.deleteMany();
  await prisma.accountingPeriodTransition.deleteMany();
  await prisma.payablePayment.deleteMany();
  await prisma.receivableReceipt.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.referentialMapping.deleteMany();
  await prisma.auditEvent.deleteMany();
  await prisma.auditChainHead.deleteMany();
  await prisma.referentialAccount.deleteMany();
  await prisma.journalEntrySequence.deleteMany();
  await prisma.customerPackageBalance.deleteMany();
  await prisma.packageBalanceMovement.deleteMany();
  await prisma.packageValidityAcceptance.deleteMany(); // FE-INCR-PACOTE-VALIDADE: prova append-only, sem FK — folha pura
  await prisma.accountingBinding.deleteMany();
  await prisma.reconcilePendingItem.deleteMany();
  // BE-INCR-FIXED-ASSETS (nó C8): nada referencia FixedAsset por FK — folha pura; cai antes de
  // fixedAssetClass/depreciationRate (que ele referencia) e de journalEntry/sourceDocument/payable.
  await prisma.fixedAsset.deleteMany();
  // BE-INCR-BANK-SETTLEMENT (nó F7): item cascade da linha do extrato; settings tem FK RESTRICT para
  // `accounts` — os dois caem ANTES de accounts/statements ou o deleteMany deles falha por violação.
  await prisma.bankSettlementItem.deleteMany();
  await prisma.accountingScopeSettings.deleteMany();
  // BE-INCR-NFE-COST-REGIME (nó X6): perfil fiscal tem FK RESTRICT para as duas contas 'a recuperar' — antes de accounts.
  await prisma.fiscalProfile.deleteMany();
  // BE-INCR-DFE (nó X10b, PR-1): attempt tem FK Cascade ao documento — cai antes; sequence e perfil de serviço são folhas.
  await prisma.fiscalDocumentAttempt.deleteMany();
  await prisma.fiscalDocument.deleteMany();
  await prisma.fiscalDocumentSequence.deleteMany();
  await prisma.serviceFiscalProfile.deleteMany();
  // ITEM-DESTINATION PR-2: default de destinação por produto — folha (só FK Cascade para User).
  await prisma.productDestinationDefault.deleteMany();
  // C6b PR-3: o item do pacote tem FK RESTRICT para o log de entrega E para o job de
  // data-exchange — cai ANTES dos dois (e antes do accountingDeliveryLog.deleteMany() abaixo).
  await prisma.accountingDeliveryItem.deleteMany();
  // BE-INCR-CONTADOR-DELIVERY: o log de entrega tem FK RESTRICT para o job de data-exchange E
  // para o contato — tem de cair ANTES dos dois, ou o deleteMany deles falha por violação.
  await prisma.accountingDeliveryLog.deleteMany();
  // BE-INCR-REVIEW-LAYER (C11): achado antes da revisão (FK Restrict), revisão antes do job e do User.
  await prisma.accountingReviewFinding.deleteMany();
  await prisma.accountingReview.deleteMany();

  // ECF Fase 3C (EMENDA 3ª): filhos value-object e saldos caem antes dos pais — processos (FK Restrict para
  // ajuste E movimento), links M312 (Restrict para ajuste e JournalEntry), saldos (Cascade do fechamento, mas
  // Restrict para a conta), depois movimentos (Restrict para a conta) e fechamentos.
  await prisma.lalurProcess.deleteMany();
  await prisma.lalurEntryJournalEntry.deleteMany();
  await prisma.lalurParteBBalance.deleteMany();
  await prisma.lalurParteBClosing.deleteMany();
  await prisma.lalurParteBMovement.deleteMany();
  // BE-INCR-SPED-ECF-FASE3B: ajuste (FK Restrict para a conta da Parte B + FK para Account) cai antes de ambos.
  await prisma.lalurEntry.deleteMany();
  await prisma.lalurParteBAccount.deleteMany();

  // Accounting — now safe: their own children are gone.
  await prisma.posting.deleteMany();
  await prisma.bankStatementLine.deleteMany();
  await prisma.dimensionValue.updateMany({ data: { parentId: null } }); // break self-relation
  await prisma.dimensionValue.deleteMany();
  await prisma.accountingDataExchangeJob.deleteMany();
  await prisma.sourceDocument.deleteMany();
  await prisma.accountingPeriod.deleteMany();
  await prisma.payable.deleteMany();
  await prisma.receivable.deleteMany();
  await prisma.inventoryItem.deleteMany();

  // Accounting — one more layer up.
  await prisma.journalEntry.updateMany({ data: { reversedById: null } }); // break self-relation
  await prisma.journalEntry.deleteMany();
  await prisma.bankStatement.deleteMany();
  await prisma.dimensionDefinition.deleteMany();
  await prisma.counterparty.deleteMany();
  await prisma.accountingPolicyVersion.deleteMany(); // GOV-CONTADOR política versionada — antes do accountantAssignment (FK Restrict)
  await prisma.accountantAssignment.deleteMany(); // GOV-CONTADOR — antes do accountingContact e do user (FK Restrict)
  // BE-INCR-FISCAL-OBLIGATION-PROFILE (nó X13): o perfil da empresa tem FK RESTRICT para o contador e para o
  // signatário — cai ANTES dos dois; o signatário cai antes do User.
  await prisma.companyFiscalProfile.deleteMany();
  await prisma.companySigner.deleteMany();
  await prisma.accountingContact.deleteMany(); // depois do accountingDeliveryLog (FK Restrict)

  // BE-INCR-FIXED-ASSETS (nó C8): fixedAssetClass tem FK Restrict para account — cai antes dele;
  // depreciationRate não referencia account, mas cai junto por proximidade temática.
  await prisma.fixedAssetClass.deleteMany();
  await prisma.depreciationRate.deleteMany();
  // BE-INCR-PAYMENT-PROVIDER (nó F5) PR-1: payment_accounts tem FK Restrict para account — cai antes dele.
  await prisma.paymentAccount.deleteMany();
  // BE-INCR-MIT-EXPORT PR-2 (nó X9): mit_exports só referencia User (Cascade) — sem ordem de FK.
  await prisma.mitExport.deleteMany();
  // BE-INCR-TAX-ASSESSMENT Fase A PR-2 (nó X7): tax_assessments só referencia User (Cascade) — sem ordem de FK.
  await prisma.taxAssessment.deleteMany();
  // BE-INCR-LEGAL-PARAMS PR-1: sem FK — volta ao estado da migração (linhas criadas/revogadas pelo teste somem).
  // PR-2: 529 INSERTs um a um por teste estouravam o hook de 5 s. Linha semeada só muda de STATUS (emenda §9 L-6),
  // então basta apagar as que o teste criou e devolver as semeadas a PUBLISHED; ids fixos = a semente.
  await prisma.legalParameter.deleteMany({ where: { id: { notIn: legalParamsSeedIds() } } });
  await prisma.legalParameter.updateMany({ where: { status: { not: 'PUBLISHED' } }, data: { status: 'PUBLISHED', revokedById: null, revokedAt: null } });
  if ((await prisma.legalParameter.count()) !== legalParamsSeedIds().length) {
    for (const stmt of legalParamsSeedStatements()) await prisma.$executeRawUnsafe(stmt); // banco sem a semente: reaplica
  }
  // PR-2 (L-8): reaquece o cache com o banco recém-semeado — o DTO estático o lê de forma síncrona.
  invalidateLegalParameterCache();
  const publicadas = await prisma.legalParameter.findMany({ where: { status: 'PUBLISHED' } });
  for (const t of new Set(publicadas.map((l) => l.tabela))) storePublished(t, publicadas.filter((l) => l.tabela === t));

  // Accounting — root of the module's FK tree (only User still references it).
  await prisma.account.deleteMany();

  await prisma.jobWatermark.deleteMany();
  await prisma.dynamicTableData.deleteMany();
  await prisma.dynamicTable.deleteMany();
  await prisma.dashboardLayout.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.chatInstance.deleteMany();
  await prisma.structuredData.deleteMany();
  await prisma.chunk.deleteMany();
  await prisma.document.deleteMany();
  await prisma.actionProposal.deleteMany();
  await prisma.knowledgeGraph.deleteMany();
  await prisma.user.deleteMany();
}

let seedIds: string[] | undefined;
function legalParamsSeedIds(): string[] {
  return (seedIds ??= legalParamsSeedStatements().map((l) => /VALUES \('([^']+)'/.exec(l)![1]));
}

function legalParamsSeedStatements(): string[] {
  return LEGAL_PARAMS_SEEDS.flatMap((f) => fs.readFileSync(f, 'utf8').split(/\r?\n/).filter((l) => l.startsWith('INSERT')));
}

export async function disconnectDb(): Promise<void> {
  await prisma.$disconnect();
}
