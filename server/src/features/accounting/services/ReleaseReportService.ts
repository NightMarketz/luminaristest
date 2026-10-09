import type { BankStatement, PaymentAccount, Prisma } from 'generated/prisma';
import { ConflictError, ForbiddenError, ValidationError } from '../../../lib/errors';
import logger from '../../../lib/logger';
import { loadKeyring, open, type Keyring } from '../../../lib/secretBox';
import { parseMpReleaseReport, type MpReleaseParsed } from '../../../lib/mpReleaseReport';
import {
  CollectionProviderError,
  type CollectionProviderPort,
  type ResolvedAccount,
} from '../collection/CollectionProviderPort';
import {
  PAYMENT_ACCOUNT_RELEASE_REPORT_IMPORTED,
  RELEASE_REPORT_BALANCE_FROM_FILE,
  RELEASE_REPORT_NO_PAYMENT_ACCOUNT,
  RELEASE_REPORT_OVERLAP,
  brtDateOnly,
  brtMidnightOf,
  releaseOverlapKey,
  releaseReportWatermarkKey,
} from '../models/ReleaseReport.model';
import type { ImportBankStatementDto } from '../dtos/ReconciliationDto';
import type { IPaymentAccountRepository } from '../repositories/IPaymentAccountRepository';
import type { IReconciliationRepository } from '../repositories/IReconciliationRepository';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { AuditService } from './AuditService';
import type { ReconciliationService } from './ReconciliationService';
import { resolveAccountingScope, type AccountingScope } from '../scope/AccountingScope';

export interface ReleaseReportFetchSummary {
  accounts: number;
  imported: number;
  requested: number;
  skipped: number;
  failed: number;
}

export interface WatermarkStore {
  get(job: string): Promise<Date | null>;
  set(job: string, watermarkAt: Date): Promise<void>;
}

const PROVIDER = 'MERCADO_PAGO';

/**
 * ReleaseReportService — relatório de liberações do Mercado Pago → extrato da PaymentAccount (BE-INCR-PAYMENT-PROVIDER
 * PR-3, nó F5; BRIEF P3-1..P3-5 e P3-12; D-2026-10-10-F5-PR3-FORKS G1/G2/G4/G5/G6/G8).
 *
 * Só IMPORTA: nenhuma baixa (resposta 20 da entrevista; PP-D5). A proposta de baixa é o scan do F7 (P3-6) e o efeito
 * é o confirm humano. O import reusa `ReconciliationService.importStatement` (mesmo gate de linhas, sha256 e tx); este
 * serviço só resolve a PaymentAccount, normaliza o CSV (lib/mpReleaseReport) e acrescenta, DENTRO da tx do import, a
 * guarda de sobreposição (P3-4) e o audit (G8).
 *
 * atomicUntil: sem postEntry — 1 commit (o do import); a watermark do job (P3-5) é gravada DEPOIS dele: queda entre os
 * dois re-importa o mesmo arquivo no ciclo seguinte e o sha256 devolve o extrato existente (idempotente).
 */
export class ReleaseReportService {
  constructor(
    private readonly paymentAccountRepo: IPaymentAccountRepository,
    private readonly reconciliationRepo: Pick<IReconciliationRepository, 'findLineRawsByPaymentAccount'>,
    private readonly reconciliation: ReconciliationService,
    private readonly auditService: AuditService,
    private readonly policy: IAccountingPolicy,
    private readonly providerFor: (provider: string) => CollectionProviderPort,
    private readonly watermarks: WatermarkStore,
    private readonly onCredentialInvalid: (account: PaymentAccount) => Promise<void>,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /** Upload manual (`format = mp_release`, G6) — mesma rota do import de extrato. */
  async importManual(scope: AccountingScope, dto: ImportBankStatementDto, buffer: Buffer) {
    if (!this.policy.canReconcile(scope)) throw new ForbiddenError('Você não tem permissão para conciliar.');
    if (dto.openingBalanceCents !== undefined || dto.closingBalanceCents !== undefined) {
      throw new ValidationError(
        `${RELEASE_REPORT_BALANCE_FROM_FILE}: no relatório de liberações os saldos vêm só das linhas de saldo do arquivo — não informe openingBalanceCents/closingBalanceCents.`,
        { code: RELEASE_REPORT_BALANCE_FROM_FILE },
      );
    }
    const candidates = await this.paymentAccountRepo.findByGlAccount(scope, PROVIDER, dto.glAccountId);
    // F-PP-9 (a): no máximo uma ACTIVE por (escopo, provedor) — ela vence; sem ACTIVE, só se for a única da folha.
    const account = candidates.find((c) => c.status === 'ACTIVE') ?? (candidates.length === 1 ? candidates[0] : undefined);
    if (!account) {
      throw new ConflictError(
        candidates.length === 0
          ? `${RELEASE_REPORT_NO_PAYMENT_ACCOUNT}: a conta contábil não tem conta Mercado Pago — o relatório de liberações só entra no extrato de uma conta de provedor.`
          : `${RELEASE_REPORT_NO_PAYMENT_ACCOUNT}: a conta contábil tem ${candidates.length} contas Mercado Pago e nenhuma ativa — ative a conta dona do relatório.`,
        RELEASE_REPORT_NO_PAYMENT_ACCOUNT,
      );
    }
    return this.importFor(scope, account, dto, parseMpReleaseReport(buffer), buffer);
  }

  private async importFor(scope: AccountingScope, account: PaymentAccount, dto: ImportBankStatementDto, parsed: MpReleaseParsed, buffer: Buffer) {
    const incoming = parsed.table.rows.map((r) => JSON.parse(r[4]) as Record<string, string>);
    return this.reconciliation.importStatement(
      scope,
      { ...dto, openingBalanceCents: undefined, closingBalanceCents: undefined },
      { buffer, format: 'csv' },
      {
        table: parsed.table,
        paymentAccountId: account.id,
        openingBalanceCents: parsed.openingBalanceCents,
        closingBalanceCents: parsed.closingBalanceCents,
        guardInTx: async (tx) => this.assertNoOverlap(scope, account.id, incoming, tx),
        afterCreateInTx: async (tx: Prisma.TransactionClient, statement: BankStatement, lineCount: number) => {
          await this.auditService.append(tx, scope, {
            actorUserId: scope.actorUserId,
            eventType: PAYMENT_ACCOUNT_RELEASE_REPORT_IMPORTED,
            targetType: 'payment_account',
            targetId: account.id,
            payload: {
              statementId: statement.id,
              lineCount: String(lineCount),
              fromUtc: parsed.fromUtc ?? '',
              toUtc: parsed.toUtc ?? '',
            },
          });
        },
      },
    );
  }

  /** P3-4 (F-PPB-4 a): `SOURCE_ID` + `DESCRIPTION` já importado para a MESMA conta ⇒ 400 com os ids; nada entra. */
  private async assertNoOverlap(
    scope: AccountingScope,
    paymentAccountId: string,
    incoming: Array<Record<string, string>>,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    const existing = new Set<string>();
    for (const raw of await this.reconciliationRepo.findLineRawsByPaymentAccount(scope, paymentAccountId, tx)) {
      let parsed: Record<string, string>;
      try {
        parsed = JSON.parse(raw) as Record<string, string>;
      } catch {
        continue;
      }
      const key = releaseOverlapKey(parsed);
      if (key) existing.add(key);
    }
    const repeated = [
      ...new Set(incoming.filter((r) => existing.has(releaseOverlapKey(r) ?? '')).map((r) => r.SOURCE_ID)),
    ];
    if (repeated.length > 0) {
      throw new ValidationError(
        `${RELEASE_REPORT_OVERLAP}: ${repeated.length} SOURCE_ID já importado(s) para esta conta Mercado Pago — nada foi importado.`,
        { code: RELEASE_REPORT_OVERLAP, sourceIds: repeated.slice(0, 50) },
      );
    }
  }

  /**
   * Job diário (P3-5, F-PPB-6 a). Por conta MP ACTIVE: faixa `[watermark, hoje 00:00 BRT)` em UTC, fechado-aberto e
   * contígua. G4: sem watermark, começa às 00:00 BRT do dia em que a credencial foi gravada. G5: roda em nome de quem
   * gravou a credencial, revalidado a cada ciclo (usuário existe + policy). Arquivo da faixa ainda não listado ⇒ pede
   * (202) e tenta no ciclo seguinte SEM avançar a watermark (insumo ausente 6). A watermark só anda depois do import.
   */
  async fetchAll(): Promise<ReleaseReportFetchSummary> {
    const accounts = await this.paymentAccountRepo.findAllActiveAnyScope(PROVIDER);
    const summary: ReleaseReportFetchSummary = { accounts: accounts.length, imported: 0, requested: 0, skipped: 0, failed: 0 };
    if (accounts.length === 0) return summary;
    let keyring: Keyring;
    try {
      keyring = loadKeyring();
    } catch (error) {
      logger.warn('mp_release_report_fetch: sem chave-mestra — nada buscado', { error: error instanceof Error ? error.message : String(error) });
      summary.failed = accounts.length;
      return summary;
    }
    for (const account of accounts) {
      try {
        const outcome = await this.fetchOne(account, keyring);
        summary[outcome] += 1;
      } catch (error) {
        summary.failed += 1;
        if (error instanceof CollectionProviderError && error.httpStatus === 401) await this.onCredentialInvalid(account);
        logger.warn('mp_release_report_fetch: falha na conta', {
          paymentAccountId: account.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    return summary;
  }

  private async fetchOne(account: PaymentAccount, keyring: Keyring): Promise<'imported' | 'requested' | 'skipped'> {
    const actor = account.credentialSetById;
    if (!actor || !(await this.paymentAccountRepo.userExists(actor))) {
      logger.warn('mp_release_report_fetch: conta sem ator válido (G5) — pulada', { paymentAccountId: account.id });
      return 'skipped';
    }
    const scope: AccountingScope = { ...resolveAccountingScope({ userId: account.userId }, account.unitId), actorUserId: actor };
    if (!this.policy.canReconcile(scope) || !this.policy.canManagePaymentAccounts(scope)) {
      logger.warn('mp_release_report_fetch: ator sem permissão (G5) — pulada', { paymentAccountId: account.id });
      return 'skipped';
    }
    const key = releaseReportWatermarkKey(account.id);
    const from = (await this.watermarks.get(key)) ?? brtMidnightOf(account.credentialSetAt ?? account.createdAt);
    const to = brtMidnightOf(this.now());
    if (from.getTime() >= to.getTime()) return 'skipped';

    const port = this.providerFor(account.provider);
    const resolved = this.resolve(account, keyring);
    // Arquivo que começa NA watermark e termina até hoje 00:00 BRT; o de maior fim vence (faixa pedida num ciclo
    // anterior continua servindo depois que `to` andou — senão nunca casaria).
    const file = (await port.listReleaseReports(resolved))
      .filter((f) => new Date(f.beginDate).getTime() === from.getTime() && new Date(f.endDate).getTime() <= to.getTime())
      .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())[0];
    if (!file) {
      await port.requestReleaseReport(resolved, { fromUtc: from.toISOString(), toUtc: to.toISOString() });
      return 'requested';
    }
    const end = new Date(file.endDate);
    if (end.getTime() <= from.getTime()) return 'skipped';
    const buffer = await port.downloadReleaseReport(resolved, file.fileName);
    const dto: ImportBankStatementDto = {
      unitId: account.unitId,
      glAccountId: account.glAccountId,
      statementRef: file.fileName.slice(0, 120),
      periodStart: brtDateOnly(from),
      periodEnd: brtDateOnly(new Date(end.getTime() - 1)),
      format: 'mp_release',
    };
    await this.importFor(scope, account, dto, parseMpReleaseReport(buffer), buffer);
    await this.watermarks.set(key, end);
    return 'imported';
  }

  private resolve(account: PaymentAccount, keyring: Keyring): ResolvedAccount {
    if (!account.credentialCiphertext || account.credentialKeyVersion == null) {
      throw new ValidationError('A conta não tem credencial gravada.');
    }
    const credential = JSON.parse(open(account.credentialCiphertext, account.id, account.credentialKeyVersion, keyring)) as {
      accessToken: string;
      webhookSecret: string;
    };
    return { id: account.id, credentialSource: 'OWN', credential };
  }
}
