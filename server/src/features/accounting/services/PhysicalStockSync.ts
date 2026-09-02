import type { UserContext } from '../../../types/UserContext';
import type { DynamicTableService } from '../../dynamicTables/services/DynamicTableService';
import type { IDynamicTableRepository } from '../../dynamicTables/repositories/IDynamicTableRepository';
import type { AccountingScope } from '../scope/AccountingScope';
import logger from '../../../lib/logger';

/**
 * PhysicalStockSync — BE-INCR-PURCHASE-PHYSICAL-SYNC (LAC-D, F-D2=(b) ratificado).
 *
 * Quando um Payable de INVENTÁRIO é criado, o subrazão valorado sobe via `receiveStock` — mas o
 * estoque FÍSICO (DT `productUnits.stock`, alimentado por linhas em `stockMovements`) não.
 * Este serviço de integração fecha esse elo: cria o movimento físico `In` (o
 * StockMovementsApplyPlugin aplica o delta) e, no cancelamento, o CONTRA-MOVIMENTO `Out`
 * (F-PS1 ratificado: nunca delete — o log físico é história, espelhando o estorno contábil).
 *
 * Fronteira (Contrato §2.1): accounting LÊ/ESCREVE DynamicTable pelo DynamicTableService
 * (escrita `isSystem`, precedente RegisterPaymentService) — nunca o inverso, nunca dentro do motor.
 *
 * Idempotência e discriminação: TUDO pela chave `detailKey` (campo string DECLARADO no módulo;
 * o `sourceId` do preset é RELATION para `sales` e não pode carregar payableId, e um `sourceType`
 * custom NÃO SOBREVIVE ao strip do buildZodSchema do motor — finding do review independente:
 * chave fora do schema é removida antes do plugin). O plugin isenta a validação manual de compra
 * pelo PREFIXO 'ACCOUNTING_PAYABLE:' do detailKey. `unique` de DynamicTable é scan TOCTOU, então
 * o read-first cobre o retry do reconcile.
 * // ponytail: corrida residual de dois requests simultâneos pode duplicar o movimento físico —
 * // a passada físico×contábil do job (LAC-E) acusa; chave dura exigiria mover o log p/ Prisma.
 */

/** Prefixo do detailKey — o discriminador que o StockMovementsApplyPlugin reconhece. */
export const PHYSICAL_SYNC_SOURCE_TYPE = 'ACCOUNTING_PAYABLE';

const inboundKey = (payableId: string) => `${PHYSICAL_SYNC_SOURCE_TYPE}:${payableId}`;
const reversalKey = (payableId: string) => `${PHYSICAL_SYNC_SOURCE_TYPE}:${payableId}:reversal`;

export interface RecordPurchaseInboundParams {
  productRef: string;
  unitId: string;
  qty: number;
  payableId: string;
  occurredAt: Date;
  /** TOTAL da compra em centavos — gravado como `cost` (reais) INFORMATIVO (F-PS2; verdade = razão). */
  totalValueCents: number;
}

export interface ReversePurchaseInboundParams {
  payableId: string;
  reversalDate: Date;
}

export interface IPhysicalStockSync {
  recordPurchaseInbound(
    scope: AccountingScope,
    params: RecordPurchaseInboundParams,
  ): Promise<'created' | 'already-exists' | 'skipped'>;
  reversePurchaseInbound(
    scope: AccountingScope,
    params: ReversePurchaseInboundParams,
  ): Promise<'reversed' | 'already-reversed' | 'not-found' | 'skipped'>;
}

export class DynamicTablePhysicalStockSync implements IPhysicalStockSync {
  constructor(
    private readonly dynamicTableService: DynamicTableService,
    private readonly repo: IDynamicTableRepository,
  ) {}

  /**
   * Contexto mínimo do DONO para a escrita `isSystem`. Verificado no código (CBM-001):
   * `DynamicTablePolicy.canManageData` consulta apenas `user.userId` × `table.userId`.
   */
  private ownerContext(scope: AccountingScope): UserContext {
    return { userId: scope.ownerUserId, id: scope.ownerUserId } as UserContext;
  }

  async recordPurchaseInbound(
    scope: AccountingScope,
    params: RecordPurchaseInboundParams,
  ): Promise<'created' | 'already-exists' | 'skipped'> {
    const movementsTable = await this.repo.findTableByInternalName(scope.ownerUserId, 'stockMovements');
    if (!movementsTable) {
      // Tenant sem módulo de estoque físico instalado — nada a sincronizar (capability desligada).
      logger.warn('PhysicalStockSync: tenant sem tabela stockMovements — inbound físico pulado', {
        payableId: params.payableId,
      });
      return 'skipped';
    }

    // Read-first (idempotência do retry do reconcile).
    const existing = await this.repo.findRowsByFieldValue(
      movementsTable.id,
      'detailKey',
      inboundKey(params.payableId),
    );
    if (existing.length > 0) return 'already-exists';

    await this.ensureProductUnitRow(scope, params.productRef, params.unitId);

    const user = this.ownerContext(scope);
    await this.dynamicTableService.createTableData(
      user,
      movementsTable.id,
      {
        data: {
          productId: params.productRef,
          unitId: params.unitId,
          type: 'In',
          quantity: params.qty,
          date: params.occurredAt.toISOString(),
          reason: 'Purchase',
          // F-PS2: custo TOTAL informativo em reais (a tela de movimentos exibe a coluna);
          // a fonte de verdade do valor segue sendo o razão/subrazão em centavos.
          cost: params.totalValueCents / 100,
          detailKey: inboundKey(params.payableId),
        },
      },
      { isSystem: true },
    );
    return 'created';
  }

  async reversePurchaseInbound(
    scope: AccountingScope,
    params: ReversePurchaseInboundParams,
  ): Promise<'reversed' | 'already-reversed' | 'not-found' | 'skipped'> {
    const movementsTable = await this.repo.findTableByInternalName(scope.ownerUserId, 'stockMovements');
    if (!movementsTable) return 'skipped';

    const [original] = await this.repo.findRowsByFieldValue(
      movementsTable.id,
      'detailKey',
      inboundKey(params.payableId),
    );
    if (!original) return 'not-found'; // físico nunca foi criado — nada a reverter

    const reversed = await this.repo.findRowsByFieldValue(
      movementsTable.id,
      'detailKey',
      reversalKey(params.payableId),
    );
    if (reversed.length > 0) return 'already-reversed';

    const data = original.data as Record<string, unknown>;
    const user = this.ownerContext(scope);
    // F-PS1: contra-movimento Out (preserva o log físico como história — espelho do estorno
    // contábil, que nunca apaga lançamento). Reason 'Adjustment': 'Return' é semântica de venda.
    await this.dynamicTableService.createTableData(
      user,
      movementsTable.id,
      {
        data: {
          productId: String(data.productId ?? ''),
          unitId: String(data.unitId ?? ''),
          type: 'Out',
          quantity: Number(data.quantity ?? 0),
          date: params.reversalDate.toISOString(),
          reason: 'Adjustment',
          detailKey: reversalKey(params.payableId),
        },
      },
      { isSystem: true },
    );
    return 'reversed';
  }

  /**
   * Bootstrap da linha `productUnits` (produto nunca movimentado nesta unidade): o
   * StockMovementsApplyPlugin RECUSA movimento sem a linha de estoque — verificado no código
   * (insumo ausente 1 do BRIEF, resolvido aqui: não há auto-provisão no caminho do create).
   */
  private async ensureProductUnitRow(
    scope: AccountingScope,
    productRef: string,
    unitId: string,
  ): Promise<void> {
    const puTable = await this.repo.findTableByInternalName(scope.ownerUserId, 'productUnits');
    if (!puTable) return; // sem tabela o plugin acusa — deixe o erro nomeado dele subir no create
    const rows = await this.repo.findRowsByFieldValue(puTable.id, 'productId', productRef);
    const exists = rows.some(
      (r) => String((r.data as Record<string, unknown>)?.unitId ?? '') === unitId,
    );
    if (exists) return;
    await this.dynamicTableService.createTableData(
      this.ownerContext(scope),
      puTable.id,
      { data: { productId: productRef, unitId, stock: 0 } },
      { isSystem: true },
    );
  }
}
