import type { FixedAsset, FixedAssetClass } from 'generated/prisma';
import logger from '../../../lib/logger';
import { AccountingPeriodNotOpenError, ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../../lib/errors';
import { quotaCumulativa } from '../models/FixedAsset.model';
import type { RunDepreciationFailure, RunDepreciationInput, RunDepreciationResult, ReconcileFixedAssetsInput, ReconcileFixedAssetsResult } from '../dtos/DepreciationDto';
import type { IFixedAssetRepository } from '../repositories/IFixedAssetRepository';
import type { IFixedAssetClassRepository } from '../repositories/IFixedAssetClassRepository';
import type { IAccountRepository } from '../repositories/IAccountRepository';
import type { IJournalEntryRepository } from '../repositories/IJournalEntryRepository';
import type { IPostingRepository } from '../repositories/IPostingRepository';
import type { AccountingScopeSettingsService, AccountingScopeSettingsView } from './AccountingScopeSettingsService';
import type { PostingService } from './PostingService';
import type { AuditService } from './AuditService';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { AccountingScope } from '../scope/AccountingScope';

export const DEPRECIATION_POSTED = 'depreciation.posted';

/** `sourceType` das quotas mensais — chave de idempotência é `${assetId}:${yearMonth}` (item 13). */
const DEPRECIATION_SOURCE_TYPE = 'fixed_asset.depreciation';

function minBigInt(a: bigint, b: bigint): bigint {
  return a < b ? a : b;
}

/** Meses de `from` até `to`, INCLUSIVE dos dois extremos (item 12: "mês de ativação e de baixa
 *  contam inteiros") — MESMA fórmula de `FixedAssetService.ts` (duplicada de propósito: são dois
 *  serviços do mesmo nó lendo a mesma regra de domínio, não uma dependência entre eles). */
function monthsBetweenInclusive(from: Date, to: Date): number {
  return (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + (to.getUTCMonth() - from.getUTCMonth()) + 1;
}

function lastDayOfMonthUTC(year: number, month: number): Date {
  return new Date(Date.UTC(year, month, 0));
}

function yearMonthOf(dateOnly: string): string {
  return dateOnly.slice(0, 7);
}

/**
 * DepreciationService — depreciação mensal + reconcile (BE-INCR-FIXED-ASSETS, nó C8, PR-3, Bloco
 * C itens 12-17). FIRST-CLASS PRISMA, via os repositórios do próprio nó (Contrato §2/§3).
 *
 * **ACC-TIEOUT em DUAS txs (item 14, parecer D3 emendado):** `PostingService.postEntry` abre sua
 * PRÓPRIA tx raiz e não aceita `tx` externo — logo tx1 = `postEntry` (idempotente por `sourceId`)
 * e tx2 = CAS `addAccumulated` + auditoria, num `runTransaction` separado. A janela de crash entre
 * as duas converge por DOIS caminhos: (a) o predicado barato do read-first desta classe — uma
 * chamada seguinte de `runMonth` acha a entry (tx1 já feita) e, se `acumulado` ainda não reflete a
 * cumulativa esperada, completa SÓ a tx2 (sem repostar); (b) `reconcile`, que recomputa
 * `accumulatedDepreciationCents` a partir da SOMA do razão — a rede de segurança para qualquer
 * drift que (a) não pegou (ex.: ninguém rodou aquele mês de novo).
 */
export class DepreciationService {
  constructor(
    private readonly assetRepo: IFixedAssetRepository,
    private readonly classRepo: IFixedAssetClassRepository,
    private readonly accountRepo: IAccountRepository,
    private readonly journalEntryRepo: IJournalEntryRepository,
    private readonly postingRepo: IPostingRepository,
    private readonly settingsService: AccountingScopeSettingsService,
    private readonly postingService: PostingService,
    private readonly auditService: AuditService,
    private readonly policy: IAccountingPolicy,
  ) {}

  /**
   * POST /fixed-assets/depreciation/run (item 12). Processa UM mês para TODOS os ativos `ACTIVE`
   * depreciáveis do escopo. Pré-checagem das contas (despesa do escopo + acumulada de CADA classe
   * envolvida) roda ANTES de postar qualquer ativo (item 16). Por ativo: só
   * `AccountingPeriodNotOpenError` vira `failed[]` (memória `erro-especifico-para-skip-em-job`);
   * qualquer outro erro aborta a chamada inteira.
   */
  async runMonth(scope: AccountingScope, dto: RunDepreciationInput): Promise<RunDepreciationResult> {
    if (!this.policy.canManageFixedAssets(scope)) {
      throw new ForbiddenError('Você não tem permissão para rodar a depreciação mensal.');
    }
    const settings = await this.settingsService.get(scope);
    if (!settings.depreciationExpenseAccountId) {
      throw new ValidationError(
        'depreciationExpenseAccountId não configurado em AccountingScopeSettings — configure antes de rodar a depreciação (item 16).',
      );
    }

    const [year, month] = dto.yearMonth.split('-').map(Number);
    const endOfMonth = lastDayOfMonthUTC(year, month);
    const assets = await this.assetRepo.findActiveDepreciable(scope, endOfMonth);

    // Item 16 — nomeia a conta ausente ANTES de postar qualquer ativo: valida TODAS as classes
    // envolvidas num passo prévio, não lazily dentro do loop de postagem.
    const classesById = new Map<string, FixedAssetClass>();
    for (const classId of new Set(assets.map((a) => a.classId))) {
      const klass = await this.classRepo.findById(scope, classId);
      if (!klass) throw new NotFoundError(`Classe de bem '${classId}' não foi encontrada.`);
      if (!klass.accumulatedDepreciationAccountId) {
        throw new ValidationError(
          `Classe '${klass.code}' não tem accumulatedDepreciationAccountId configurada — configure antes de rodar a depreciação (item 16).`,
        );
      }
      classesById.set(classId, klass);
    }

    let posted = 0;
    let skipped = 0;
    const failed: RunDepreciationFailure[] = [];

    for (const asset of assets) {
      const klass = classesById.get(asset.classId)!;
      try {
        const { outcome } = await this.postQuotaStep(scope, asset, klass, settings, dto.yearMonth, endOfMonth);
        if (outcome === 'posted') posted += 1;
        else skipped += 1;
      } catch (error) {
        if (error instanceof AccountingPeriodNotOpenError) {
          failed.push({ assetId: asset.id, code: 'PERIOD_NOT_OPEN', message: error.message });
          continue;
        }
        throw error;
      }
    }

    return { yearMonth: dto.yearMonth, posted, skipped, failed };
  }

  /**
   * Chamado pelo `FixedAssetService.disposeAsset` (execution-plan Passo 14 — "baixa sequencial"):
   * posta a quota do MÊS de `disposedAt` para este ativo, idempotente pelo mesmo mecanismo do
   * `runMonth`, antes do entry de baixa. Substitui o 400 temporário do PR-2. Classe não-depreciável
   * (LAND) não tem quota — no-op.
   */
  async postQuotaForDisposal(scope: AccountingScope, assetId: string, disposedAtDateOnly: string): Promise<void> {
    if (!this.policy.canManageFixedAssets(scope)) {
      throw new ForbiddenError('Você não tem permissão para rodar a depreciação mensal.');
    }
    const asset = await this.assetRepo.findById(scope, assetId);
    if (!asset) throw new NotFoundError(`Ativo '${assetId}' não foi encontrado.`);
    const klass = await this.classRepo.findById(scope, asset.classId);
    if (!klass) throw new NotFoundError(`Classe de bem '${asset.classId}' não foi encontrada.`);
    if (!klass.depreciable) return;
    if (!klass.accumulatedDepreciationAccountId) {
      throw new ValidationError(`Classe '${klass.code}' não tem accumulatedDepreciationAccountId configurada (item 16).`);
    }
    const settings = await this.settingsService.get(scope);
    if (!settings.depreciationExpenseAccountId) {
      throw new ValidationError('depreciationExpenseAccountId não configurado em AccountingScopeSettings (item 16).');
    }
    const yearMonth = yearMonthOf(disposedAtDateOnly);
    const [year, month] = yearMonth.split('-').map(Number);
    await this.postQuotaStep(scope, asset, klass, settings, yearMonth, lastDayOfMonthUTC(year, month));
  }

  /**
   * Um ativo, um mês (item 12/13). Read-first decide `posted` vs `skipped`; dentro do ramo
   * `skipped` (entry já existe), o predicado barato [D3] completa a tx2 sozinho se ela ficou
   * pendente de um crash anterior — sem repostar tx1.
   */
  private async postQuotaStep(
    scope: AccountingScope,
    asset: FixedAsset,
    klass: FixedAssetClass,
    settings: AccountingScopeSettingsView,
    yearMonth: string,
    endOfMonth: Date,
  ): Promise<{ asset: FixedAsset; outcome: 'posted' | 'skipped' }> {
    const sourceId = `${asset.id}:${yearMonth}`;
    const base = asset.costCents - asset.residualValueCents;
    const bp = asset.bookAnnualRateBp ?? asset.annualRateBp;
    const k = monthsBetweenInclusive(asset.activatedAt!, endOfMonth);
    const cumK = minBigInt(quotaCumulativa(base, bp, k), base);

    const existing = await this.journalEntryRepo.findBySource(scope, DEPRECIATION_SOURCE_TYPE, sourceId);
    if (existing) {
      // [D3] predicado barato — sem somar o razão: o que falta para bater com a cumulativa
      // esperada até este mês, sem contar o opening (que já entrou no accumulated no activate()).
      const owed = cumK - (asset.accumulatedDepreciationCents - asset.openingAccumulatedCents);
      if (owed <= 0n) return { asset, outcome: 'skipped' };
      const nextStatus = cumK === base ? ('FULLY_DEPRECIATED' as const) : undefined;
      const repaired = await this.completeTx2(scope, asset, owed, nextStatus, yearMonth, existing.id);
      return { asset: repaired, outcome: 'skipped' };
    }

    const cumK1 = k > 1 ? minBigInt(quotaCumulativa(base, bp, k - 1), base) : 0n;
    const rawDelta = cumK - cumK1;
    const quota = minBigInt(rawDelta, base - asset.accumulatedDepreciationCents);
    if (quota <= 0n) return { asset, outcome: 'skipped' };

    const despesaAccount = await this.requireAccount(scope, settings.depreciationExpenseAccountId!, 'despesa de depreciação (depreciationExpenseAccountId)');
    const acumuladaAccount = await this.requireAccount(scope, klass.accumulatedDepreciationAccountId!, 'depreciação acumulada da classe (accumulatedDepreciationAccountId)');

    const dateStr = `${yearMonth}-${String(endOfMonth.getUTCDate()).padStart(2, '0')}`;
    const entry = await this.postingService.postEntry(scope, {
      unitId: scope.unitId,
      date: dateStr,
      description: `Depreciação de ${asset.code} — ${klass.name} (${yearMonth})`,
      sourceType: DEPRECIATION_SOURCE_TYPE,
      sourceId,
      lines: [
        { accountCode: despesaAccount.code, debitCents: Number(quota), creditCents: 0 },
        { accountCode: acumuladaAccount.code, debitCents: 0, creditCents: Number(quota) },
      ],
    });

    const nextStatus = asset.accumulatedDepreciationCents + quota === base ? ('FULLY_DEPRECIATED' as const) : undefined;
    const posted = await this.completeTx2(scope, asset, quota, nextStatus, yearMonth, entry.id);
    return { asset: posted, outcome: 'posted' };
  }

  /** tx2 — CAS de `accumulatedDepreciationCents` (+ `status` quando esgota a base) + auditoria (item 17). */
  private async completeTx2(
    scope: AccountingScope,
    asset: FixedAsset,
    deltaCents: bigint,
    nextStatus: 'FULLY_DEPRECIATED' | undefined,
    yearMonth: string,
    entryId: string,
  ): Promise<FixedAsset> {
    return this.assetRepo.runTransaction(async (tx) => {
      const updated = await this.assetRepo.addAccumulated(
        scope,
        asset.id,
        deltaCents,
        { accumulatedDepreciationCents: asset.accumulatedDepreciationCents, version: asset.version },
        nextStatus,
        tx,
      );
      if (!updated) {
        throw new ConflictError(`Ativo '${asset.id}' foi alterado por outra operação durante a depreciação — releia e tente de novo.`);
      }
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType: DEPRECIATION_POSTED,
        targetType: 'fixed_asset',
        targetId: asset.id,
        payload: { assetId: asset.id, yearMonth, quotaCents: deltaCents.toString(), entryId },
      });
      return updated;
    });
  }

  /**
   * POST /fixed-assets/reconcile (item 13/14) — espelho de `InventoryService.reconcileInventory`:
   * recomputa `accumulatedDepreciationCents` a partir de `opening + Σcréditos do razão` e repara
   * drift com `logger.warn`. Best-effort por item (um ativo falhando não aborta o passo).
   * `draftsCreated` é o gancho do re-drive de payables com `fixedAssetItems` sem rascunho — vazio
   * até o PR-5 existir (item 22).
   */
  async reconcile(scope: AccountingScope, _dto: ReconcileFixedAssetsInput): Promise<ReconcileFixedAssetsResult> {
    if (!this.policy.canManageFixedAssets(scope)) {
      throw new ForbiddenError('Você não tem permissão para reconciliar ativos.');
    }
    let checked = 0;
    let repaired = 0;
    const assets = await this.assetRepo.findManyByUnit(scope, {});
    for (const asset of assets) {
      checked += 1;
      try {
        const creditedCents = await this.postingRepo.sumCreditsBySourcePrefix(scope, DEPRECIATION_SOURCE_TYPE, `${asset.id}:`);
        const expected = asset.openingAccumulatedCents + BigInt(creditedCents);
        if (expected !== asset.accumulatedDepreciationCents) {
          await this.assetRepo.reconcileAccumulated(scope, asset.id, expected);
          repaired += 1;
          logger.warn('Fixed asset reconcile: accumulated drift repaired from ledger', {
            assetId: asset.id,
            was: asset.accumulatedDepreciationCents.toString(),
            expected: expected.toString(),
          });
        }
      } catch (error) {
        logger.warn('Fixed asset reconcile: item re-drive failed', { assetId: asset.id, error });
      }
    }

    // Gancho de re-drive de payables com fixedAssetItems sem rascunho (item 13/22) — vazio até o
    // PR-5 existir; o teste desta PR chama e espera 0 (o gancho, não o vazio).
    const draftsCreated = 0;

    logger.info('Fixed asset reconcile pass complete', { checked, repaired, draftsCreated });
    return { checked, repaired, draftsCreated };
  }

  private async requireAccount(scope: AccountingScope, id: string, label: string) {
    const account = await this.accountRepo.findById(scope, id);
    if (!account || account.deletedAt) throw new ValidationError(`${label} '${id}' não existe neste escopo.`);
    if (!account.acceptsEntries) throw new ValidationError(`${label} '${account.code}' não aceita lançamentos (não é folha).`);
    return account;
  }
}
