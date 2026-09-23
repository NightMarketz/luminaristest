import type { FixedAsset, Payable } from 'generated/prisma';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../../lib/errors';
import type {
  ActivateFixedAssetInput,
  CreateFixedAssetInput,
  DisposeFixedAssetInput,
  UpdateFixedAssetInput,
} from '../dtos/FixedAssetDto';
import type { IFixedAssetRepository } from '../repositories/IFixedAssetRepository';
import type { IFixedAssetClassRepository } from '../repositories/IFixedAssetClassRepository';
import type { IDepreciationRateRepository } from '../repositories/IDepreciationRateRepository';
import type { IAccountRepository } from '../repositories/IAccountRepository';
import type { IAccountingPeriodRepository } from '../repositories/IAccountingPeriodRepository';
import type { AccountingScopeSettingsService } from './AccountingScopeSettingsService';
import type { PostingService } from './PostingService';
import type { DepreciationService } from './DepreciationService';
import type { AuditService } from './AuditService';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { AccountingScope } from '../scope/AccountingScope';
import { accountingScopeWhere } from '../scope/AccountingScope';
import type { IFixedAssetDraftCreator, ResolvedFixedAssetItem } from './IFixedAssetDraftCreator';

export const FIXED_ASSET_CREATED = 'fixed_asset.created';
export const FIXED_ASSET_ACTIVATED = 'fixed_asset.activated';
export const FIXED_ASSET_DISPOSED = 'fixed_asset.disposed';

/**
 * FixedAssetService — bem do imobilizado (BE-INCR-FIXED-ASSETS, nó C8, Blocos B + D). FIRST-CLASS
 * PRISMA. ACC-016: comandos, nunca `PATCH status` — `activate`/`dispose` são os únicos caminhos que
 * mudam `status`.
 *
 * **Baixa sequencial (execution-plan Passo 14, PR-3):** `dispose` posta a quota do mês de
 * `disposedAt` (via `DepreciationService.postQuotaForDisposal`, idempotente pelo mesmo mecanismo
 * do `runMonth`) ANTES de montar o entry de baixa — troca o 400 temporário do PR-2 pela postagem
 * automática.
 */
export class FixedAssetService implements IFixedAssetDraftCreator {
  constructor(
    private readonly assetRepo: IFixedAssetRepository,
    private readonly classRepo: IFixedAssetClassRepository,
    private readonly rateRepo: IDepreciationRateRepository,
    private readonly accountRepo: IAccountRepository,
    private readonly periodRepo: IAccountingPeriodRepository,
    private readonly settingsService: AccountingScopeSettingsService,
    private readonly postingService: PostingService,
    private readonly depreciationService: DepreciationService,
    private readonly auditService: AuditService,
    private readonly policy: IAccountingPolicy,
  ) {}

  // ── Reads ──────────────────────────────────────────────────────────────────
  async listAssets(scope: AccountingScope, filter: { status?: string; classId?: string }): Promise<FixedAsset[]> {
    if (!this.policy.canRead(scope)) throw new ForbiddenError('Você não tem permissão para listar ativos.');
    return this.assetRepo.findManyByUnit(scope, filter);
  }

  async getAsset(scope: AccountingScope, id: string): Promise<FixedAsset> {
    if (!this.policy.canRead(scope)) throw new ForbiddenError('Você não tem permissão para ler ativos.');
    return this.requireAsset(scope, id);
  }

  async requireAsset(scope: AccountingScope, id: string): Promise<FixedAsset> {
    const found = await this.assetRepo.findById(scope, id);
    if (!found) throw new NotFoundError(`Ativo '${id}' não foi encontrado.`);
    return found;
  }

  // ── Create/Update/Delete (PENDING_ACTIVATION apenas) ────────────────────────
  async createAsset(scope: AccountingScope, dto: CreateFixedAssetInput): Promise<FixedAsset> {
    if (!this.policy.canManageFixedAssets(scope)) throw new ForbiddenError('Você não tem permissão para criar ativos.');
    const klass = await this.classRepo.findById(scope, dto.classId);
    if (!klass) throw new NotFoundError(`Classe de bem '${dto.classId}' não foi encontrada.`);

    let annualRateBp: number;
    let rateId: string | null = null;
    if (dto.rateId) {
      const rate = await this.rateRepo.findById(scope, dto.rateId);
      if (!rate) throw new NotFoundError(`Taxa de depreciação '${dto.rateId}' não foi encontrada.`);
      annualRateBp = rate.annualRateBp;
      rateId = rate.id;
    } else {
      // XOR garantido pelo DTO (superRefine) — annualRateBp sempre presente neste ramo.
      annualRateBp = dto.annualRateBp as number;
    }

    const { userId, unitId } = accountingScopeWhere(scope);
    return this.assetRepo.runTransaction(async (tx) => {
      const created = await this.assetRepo.create(
        {
          userId,
          unitId,
          classId: klass.id,
          code: dto.code,
          description: dto.description,
          ncmPrefix: dto.ncmPrefix ?? null,
          quantity: dto.quantity,
          costCents: BigInt(dto.costCents),
          residualValueCents: BigInt(dto.residualValueCents),
          rateId,
          annualRateBp,
          bookAnnualRateBp: dto.bookAnnualRateBp ?? null,
          bookRateJustification: dto.bookRateJustification ?? null,
          acquiredAt: new Date(`${dto.acquiredAt}T00:00:00.000Z`),
          createdById: scope.actorUserId,
        },
        tx,
      );
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType: FIXED_ASSET_CREATED,
        targetType: 'fixed_asset',
        targetId: created.id,
        payload: { assetId: created.id },
      });
      return created;
    });
  }

  /** Só `PENDING_ACTIVATION` (ACC-016 — nunca muda status aqui). */
  async updateAsset(scope: AccountingScope, id: string, dto: UpdateFixedAssetInput): Promise<FixedAsset> {
    if (!this.policy.canManageFixedAssets(scope)) throw new ForbiddenError('Você não tem permissão para editar ativos.');
    const current = await this.requireAsset(scope, id);
    if (current.status !== 'PENDING_ACTIVATION') {
      throw new ValidationError(`Ativo '${id}' está em status ${current.status}; só PENDING_ACTIVATION pode ser editado.`);
    }
    if (dto.classId) {
      const klass = await this.classRepo.findById(scope, dto.classId);
      if (!klass) throw new NotFoundError(`Classe de bem '${dto.classId}' não foi encontrada.`);
    }
    if (dto.rateId) {
      const rate = await this.rateRepo.findById(scope, dto.rateId);
      if (!rate) throw new NotFoundError(`Taxa de depreciação '${dto.rateId}' não foi encontrada.`);
    }
    const nextCost = dto.costCents !== undefined ? BigInt(dto.costCents) : current.costCents;
    const nextResidual = dto.residualValueCents !== undefined ? BigInt(dto.residualValueCents) : current.residualValueCents;
    if (nextResidual >= nextCost) {
      throw new ValidationError('residualValueCents deve ser menor que costCents.');
    }
    const nextBookRate = dto.bookAnnualRateBp !== undefined ? dto.bookAnnualRateBp : current.bookAnnualRateBp;
    const nextBookJustification =
      dto.bookRateJustification !== undefined ? dto.bookRateJustification : current.bookRateJustification;
    if (nextBookRate !== null && !nextBookJustification) {
      throw new ValidationError('bookRateJustification é obrigatória quando bookAnnualRateBp é informado (item 8).');
    }

    return this.assetRepo.update(scope, id, {
      ...(dto.classId !== undefined ? { classId: dto.classId } : {}),
      ...(dto.code !== undefined ? { code: dto.code } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.ncmPrefix !== undefined ? { ncmPrefix: dto.ncmPrefix } : {}),
      ...(dto.quantity !== undefined ? { quantity: dto.quantity } : {}),
      ...(dto.costCents !== undefined ? { costCents: BigInt(dto.costCents) } : {}),
      ...(dto.residualValueCents !== undefined ? { residualValueCents: BigInt(dto.residualValueCents) } : {}),
      ...(dto.acquiredAt !== undefined ? { acquiredAt: new Date(`${dto.acquiredAt}T00:00:00.000Z`) } : {}),
      ...(dto.rateId !== undefined ? { rateId: dto.rateId } : {}),
      ...(dto.annualRateBp !== undefined ? { annualRateBp: dto.annualRateBp } : {}),
      ...(dto.bookAnnualRateBp !== undefined ? { bookAnnualRateBp: dto.bookAnnualRateBp } : {}),
      ...(dto.bookRateJustification !== undefined ? { bookRateJustification: dto.bookRateJustification } : {}),
    });
  }

  /** Soft-delete só em PENDING_ACTIVATION ou ACTIVE sem quota postada (item 8). */
  async deleteAsset(scope: AccountingScope, id: string): Promise<FixedAsset> {
    if (!this.policy.canManageFixedAssets(scope)) throw new ForbiddenError('Você não tem permissão para remover ativos.');
    const current = await this.requireAsset(scope, id);
    if (current.status === 'DISPOSED' || current.status === 'FULLY_DEPRECIATED') {
      throw new ValidationError(`Ativo '${id}' está em status ${current.status}; não pode ser removido.`);
    }
    if (current.accumulatedDepreciationCents > 0n) {
      throw new ValidationError(`Ativo '${id}' já tem quota de depreciação postada — não pode ser removido.`);
    }
    return this.assetRepo.softDelete(scope, id);
  }

  // ── Comandos (ACC-016) ───────────────────────────────────────────────────────
  async activateAsset(scope: AccountingScope, id: string, dto: ActivateFixedAssetInput): Promise<FixedAsset> {
    if (!this.policy.canManageFixedAssets(scope)) throw new ForbiddenError('Você não tem permissão para ativar ativos.');
    const current = await this.requireAsset(scope, id);
    if (current.status !== 'PENDING_ACTIVATION') {
      throw new ValidationError(`Ativo '${id}' está em status ${current.status}; só PENDING_ACTIVATION pode ser ativado.`);
    }

    const activatedAtDate = new Date(`${dto.activatedAt}T00:00:00.000Z`);
    const earliestOpen = await this.periodRepo.findEarliestOpenOrSoftClosed(scope);
    const isRetroactive = earliestOpen
      ? activatedAtDate < new Date(Date.UTC(earliestOpen.year, earliestOpen.month - 1, 1))
      : false;
    if (isRetroactive && dto.openingAccumulatedCents === undefined) {
      throw new ValidationError(
        `activatedAt (${dto.activatedAt}) é anterior ao primeiro período OPEN/SOFT_CLOSED do escopo — informe openingAccumulatedCents (item 9).`,
      );
    }
    const openingAccumulatedCents = BigInt(dto.openingAccumulatedCents ?? 0);

    return this.assetRepo.runTransaction(async (tx) => {
      const updated = await this.assetRepo.activate(scope, id, { activatedAt: activatedAtDate, openingAccumulatedCents }, dto.version, tx);
      if (!updated) throw new ConflictError(`Ativo '${id}' foi alterado por outra operação (version divergente) — releia e tente de novo.`);
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType: FIXED_ASSET_ACTIVATED,
        targetType: 'fixed_asset',
        targetId: id,
        payload: { assetId: id, activatedAt: dto.activatedAt, openingAccumulatedCents: openingAccumulatedCents.toString() },
      });
      return updated;
    });
  }

  async disposeAsset(scope: AccountingScope, id: string, dto: DisposeFixedAssetInput): Promise<FixedAsset> {
    if (!this.policy.canManageFixedAssets(scope)) throw new ForbiddenError('Você não tem permissão para baixar ativos.');
    let asset = await this.requireAsset(scope, id);
    if (asset.status !== 'ACTIVE') {
      throw new ValidationError(`Ativo '${id}' está em status ${asset.status}; só ACTIVE pode ser baixado.`);
    }
    const klass = await this.classRepo.findById(scope, asset.classId);
    if (!klass) throw new NotFoundError(`Classe de bem '${asset.classId}' não foi encontrada.`);

    const disposedAtDate = new Date(`${dto.disposedAt}T00:00:00.000Z`);
    if (!asset.activatedAt || disposedAtDate < asset.activatedAt) {
      throw new ValidationError(`disposedAt (${dto.disposedAt}) não pode ser anterior a activatedAt.`);
    }

    // CAS de leitura: o `version` que o CLIENTE leu antes de chamar dispose precisa bater AGORA,
    // antes de qualquer efeito colateral (a postagem sequencial abaixo vai avançar o version deste
    // mesmo ativo por conta própria — checar depois dela compararia com um valor que a própria
    // chamada já mudou, nunca o de um ator externo).
    if (asset.version !== dto.version) {
      throw new ConflictError(`Ativo '${id}' foi alterado por outra operação (version divergente) — releia e tente de novo.`);
    }

    // Baixa sequencial (execution-plan Passo 14): posta a quota do mês de disposedAt antes do
    // entry de baixa, idempotente pelo mesmo mecanismo do runMonth. LAND (depreciable=false) é
    // no-op dentro do próprio DepreciationService. Recarrega o ativo — accumulatedDepreciationCents
    // e version podem ter mudado.
    await this.depreciationService.postQuotaForDisposal(scope, id, dto.disposedAt);
    asset = await this.requireAsset(scope, id);

    // Valor contábil líquido = custo − depreciação acumulada (item 18). `residualValueCents` é só
    // o PISO que a fórmula de quota respeita (base = costCents − residualValueCents) — não entra
    // de novo aqui.
    const netBookValueCents = asset.costCents - asset.accumulatedDepreciationCents;
    const proceedsCents = BigInt(dto.proceedsCents);
    const gainOrLoss = proceedsCents - netBookValueCents; // > 0 ganho, < 0 perda, 0 nenhuma

    const costAccount = await this.requireEntryAccount(scope, klass.costAccountId, 'conta do bem (costAccountId)');
    const lines: { accountCode: string; debitCents: number; creditCents: number }[] = [];
    if (asset.accumulatedDepreciationCents > 0n) {
      if (!klass.accumulatedDepreciationAccountId) {
        throw new ValidationError(`Classe '${klass.code}' não tem accumulatedDepreciationAccountId configurada.`);
      }
      const accumulatedAccount = await this.requireEntryAccount(scope, klass.accumulatedDepreciationAccountId, 'conta de depreciação acumulada');
      lines.push({ accountCode: accumulatedAccount.code, debitCents: Number(asset.accumulatedDepreciationCents), creditCents: 0 });
    }
    lines.push({ accountCode: costAccount.code, debitCents: 0, creditCents: Number(asset.costCents) });

    if (proceedsCents > 0n) {
      if (!dto.counterpartAccountId) throw new ValidationError('counterpartAccountId é obrigatório quando proceedsCents > 0 (F-FA13 → a).');
      const counterpart = await this.requireEntryAccount(scope, dto.counterpartAccountId, 'contrapartida (counterpartAccountId)');
      lines.push({ accountCode: counterpart.code, debitCents: Number(proceedsCents), creditCents: 0 });
    }

    const settings = await this.settingsService.get(scope);
    if (gainOrLoss > 0n) {
      if (!settings.disposalGainAccountId) throw new ValidationError('disposalGainAccountId não configurado em AccountingScopeSettings.');
      const gainAccount = await this.requireEntryAccount(scope, settings.disposalGainAccountId, 'ganho na baixa');
      lines.push({ accountCode: gainAccount.code, debitCents: 0, creditCents: Number(gainOrLoss) });
    } else if (gainOrLoss < 0n) {
      if (!settings.disposalLossAccountId) throw new ValidationError('disposalLossAccountId não configurado em AccountingScopeSettings.');
      const lossAccount = await this.requireEntryAccount(scope, settings.disposalLossAccountId, 'perda na baixa');
      lines.push({ accountCode: lossAccount.code, debitCents: Number(-gainOrLoss), creditCents: 0 });
    }

    // tx1 — postEntry abre a própria tx raiz (PostingService.ts) e é idempotente por sourceId:
    // uma 2ª chamada com o mesmo assetId devolve a MESMA entry, nunca duplica (item 18 adversarial).
    const entry = await this.postingService.postEntry(scope, {
      unitId: scope.unitId,
      date: dto.disposedAt,
      description: `Baixa do ativo ${asset.code} — ${klass.name}`,
      sourceType: 'fixed_asset.disposal',
      sourceId: id,
      lines,
    });

    // tx2 — CAS de status/disposalEntryId + auditoria. Usa `asset.version` (RELIDO após a
    // postagem sequencial, linha 227), não `dto.version`: a quota postada acima já incrementou o
    // version deste MESMO ativo dentro desta MESMA chamada — comparar com o `dto.version` que o
    // cliente leu antes de chamar `dispose` sempre daria 409 (falso conflito, não uma corrida
    // real). A checagem de status (ACTIVE) já cobre "outro ator baixou/reativou nesse meio-tempo";
    // uma corrida genuína (ex.: um `runMonth` concorrente) ainda é pega aqui, porque este é o
    // valor mais recente lido antes do CAS final.
    return this.assetRepo.runTransaction(async (tx) => {
      const updated = await this.assetRepo.dispose(scope, id, { disposedAt: disposedAtDate, disposalEntryId: entry.id }, asset.version, tx);
      if (!updated) throw new ConflictError(`Ativo '${id}' foi alterado por outra operação (version divergente) — releia e tente de novo.`);
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType: FIXED_ASSET_DISPOSED,
        targetType: 'fixed_asset',
        targetId: id,
        payload: { assetId: id, entryId: entry.id, gainLossCents: gainOrLoss.toString() },
      });
      return updated;
    });
  }

  // ── Rascunho por NF-e modo 4 (execution-plan Passo 28, F-FA12 → a) ──────────────────────────

  /**
   * Cria 1 `FixedAsset` `PENDING_ACTIVATION` por item de imobilizado de uma NF-e (BRIEF item 22).
   * **Read-first** por `(payableId, sourceItemRef)` — item já com rascunho é PULADO (a chamada é
   * idempotente por desenho: um re-drive que releia a MESMA NF-e e chame de novo com os MESMOS
   * itens nunca duplica, `@@unique` fecha a corrida). `sourceItemRef` é o `nItem` da NF-e (posição
   * da linha, nunca `cProd` — review #366, achado 3: 2 linhas de imobilizado podem repetir o
   * `cProd`, e chavear por ele faria a 2ª ler o rascunho da 1ª como "já existe" e perder o custo).
   * `quantity` = `item.qty` (qCom inteiro da NF-e, resolvido em `NfeImportService.allocate`);
   * `acquiredAt` = `payable.issueDate` (a `dhEmi` da nota, já a data usada para o reconhecimento).
   *
   * **Taxa (fork "annualRateBp do rascunho", decidido pelo dono 23/09; review #366, achado 1):**
   * `item.rateId`/`item.annualRateBp` chegam JÁ RESOLVIDOS por `PayableService.resolveFixedAssetLines`
   * (`resolveRateForNcm`, `models/FixedAsset.model.ts`) — **ANTES** do `postEntry`. Esta função NÃO
   * re-deriva a taxa: fazê-lo aqui reabriria o buraco que o review achou (a validação só rodava
   * DEPOIS do débito estar postado, e a falha aqui era só `logger.warn` best-effort — a nota subia
   * com `201` e o ativo nunca nascia).
   */
  async createDraftFromPayable(
    scope: AccountingScope,
    payable: Payable,
    items: ResolvedFixedAssetItem[],
    sourceDocumentId?: string | null,
  ): Promise<{ created: number }> {
    if (!this.policy.canManageFixedAssets(scope)) {
      throw new ForbiddenError('Você não tem permissão para criar ativos.');
    }
    const { userId, unitId } = accountingScopeWhere(scope);
    let created = 0;
    for (const item of items) {
      // Read-first (idempotência do re-drive) — ANTES de resolver a classe, para um item já
      // rascunhado nunca pagar o custo (nem o risco de erro) de reprocessar dado que já convergiu.
      const existing = await this.assetRepo.findByPayableAndSourceItemRef(scope, payable.id, item.sourceItemRef);
      if (existing) continue;

      const klass = await this.classRepo.findById(scope, item.classId);
      if (!klass) {
        throw new NotFoundError(
          `Classe de bem '${item.classId}' não foi encontrada (rascunho do payable '${payable.id}', item '${item.cProd}').`,
        );
      }

      await this.assetRepo.runTransaction(async (tx) => {
        const draft = await this.assetRepo.create(
          {
            userId,
            unitId,
            classId: klass.id,
            code: this.draftCode(payable, item.sourceItemRef),
            description: `${klass.name} — NF-e ${payable.documentNumber ?? payable.id} (item ${item.cProd})`,
            ncmPrefix: item.ncm ?? null,
            quantity: item.qty,
            costCents: BigInt(item.costCents),
            residualValueCents: 0n,
            rateId: item.rateId,
            annualRateBp: item.annualRateBp,
            bookAnnualRateBp: null,
            bookRateJustification: null,
            acquiredAt: payable.issueDate,
            createdById: scope.actorUserId,
            payableId: payable.id,
            sourceDocumentId: sourceDocumentId ?? null,
            sourceItemRef: item.sourceItemRef,
          },
          tx,
        );
        await this.auditService.append(tx, scope, {
          actorUserId: scope.actorUserId,
          eventType: FIXED_ASSET_CREATED,
          targetType: 'fixed_asset',
          targetId: draft.id,
          payload: { assetId: draft.id, payableId: payable.id, cProd: item.cProd, rateId: item.rateId, annualRateBp: item.annualRateBp },
        });
      });
      created += 1;
    }
    return { created };
  }

  /** Chave determinística e estável do rascunho (mesma em toda chamada de re-drive — não é decisão
   *  de negócio, só um identificador único e legível): `NFE-<documentNumber ou payableId>-<sourceItemRef>`. */
  private draftCode(payable: Payable, sourceItemRef: string): string {
    const doc = payable.documentNumber ?? payable.id;
    return `NFE-${doc}-${sourceItemRef}`.slice(0, 190); // folga sob qualquer teto de coluna razoável
  }

  private async requireEntryAccount(scope: AccountingScope, id: string, label: string) {
    const account = await this.accountRepo.findById(scope, id);
    if (!account || account.deletedAt) throw new ValidationError(`${label} '${id}' não existe neste escopo.`);
    if (!account.acceptsEntries) throw new ValidationError(`${label} '${account.code}' não aceita lançamentos (não é folha).`);
    return account;
  }
}
