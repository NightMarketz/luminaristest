/**
 * StockMovementsApplyPlugin
 *
 * Applies manual inventory movements (In/Out) to Product Units, excluding those
 * generated via sales (which are handled atomically by SalesPlugin).
 *
 * - beforeCreate: validates and applies stock delta
 * - beforeUpdate: reverts previous effect and applies new effect
 * - beforeDelete: reverts movement effect
 *
 * Note: field formats/ranges/presence are enforced declaratively by the schema; this
 * plugin only handles the cross-table side-effect of applying movements to stock.
 */
import type { RulePlugin, RuleContext } from '../RuleTypes';
import type { IDynamicTableData } from '../../models/DynamicTable.model';
import { ValidationError } from '../../../../lib/errors';
import { resolveTable, tableMatches } from '../shared/tableFinder';

const SCHEMA_KEYS = {
  PRODUCT_UNITS: 'productUnits',
  MOVEMENTS: 'stockMovements',
};

export const StockMovementsApplyPlugin: RulePlugin = {
  name: 'StockMovementsApplyPlugin',
  supports(ctx) {
    return tableMatches(ctx.table, { categories: ['inventory'], internalNames: [SCHEMA_KEYS.MOVEMENTS], names: ['Stock Movements', 'stockMovements', 'Movimentações de Estoque'] });
  },
  async beforeCreate(ctx) {
    // Basic validation: required fields
    const productId = String(ctx.after?.productId || '');
    const unitId = String(ctx.after?.unitId || '');
    const type = String(ctx.after?.type || '');
    const quantity = Number(ctx.after?.quantity || 0);
    if (!productId) throw new ValidationError('productId é obrigatório para movimentações.');
    if (!unitId) throw new ValidationError('unitId é obrigatório para movimentações.');
    if (!(type === 'In' || type === 'Out')) throw new ValidationError('type inválido para movimentação.');
    if (!(quantity > 0)) throw new ValidationError('quantity deve ser maior que zero.');

    // Entradas vindas do Payable de inventário (BE-INCR-PURCHASE-PHYSICAL-SYNC) já nasceram
    // valoradas no razão (D 1.1.6 × C 2.1.2 + receiveStock) e trazem fornecedor via Counterparty.
    // O discriminador é o PREFIXO do detailKey — campo DECLARADO no preset stockMovements: o
    // buildZodSchema do motor REMOVE chaves fora do schema antes do plugin (finding do review
    // independente — um sourceType custom não sobrevive ao strip; detailKey sobrevive).
    // INV F-41.1 (resíduo, dono 10/11: "Exigir isSystem"): o prefixo é forjável num POST genérico; o isSystem não (o motor
    // tira `__isSystem` do payload e só o PhysicalStockSync grava com `{ isSystem: true }`). Sem os dois, é entrada manual.
    const isAccountingPayableRow =
      ctx.isSystem === true && String(ctx.after?.detailKey || '').startsWith('ACCOUNTING_PAYABLE:');

    // INV F-41.1: compra entra pelo Contas a Pagar (título de estoque: custo médio + D Estoques / C Fornecedores), nunca
    // pela movimentação manual — que subiria o estoque sem título, lançamento nem custo médio (venda seguinte sem CMV).
    if (type === 'In' && !isAccountingPayableRow && String(ctx.after?.reason || '') === 'Purchase') {
      throw new ValidationError('Entrada por compra é registrada pelo Contas a Pagar (título de estoque), não pela movimentação manual.');
    }

    // INV F-41.1: compra entra pelo Contas a Pagar (título de estoque: custo médio + D Estoques / C Fornecedores), nunca
    // pela movimentação manual — que subiria o estoque sem título, lançamento nem custo médio (venda seguinte sem CMV).
    if (type === 'In' && !isAccountingPayableRow && String(ctx.after?.reason || '') === 'Purchase') {
      throw new ValidationError('Entrada por compra é registrada pelo Contas a Pagar (título de estoque), não pela movimentação manual.');
    }

    // Regras financeiras para entradas manuais: exigir dados essenciais quando motivo for compra.
    // A validação manual de supplierId/cost não se aplica à linha do Payable; o delta abaixo SIM.
    if (type === 'In' && !isAccountingPayableRow) {
      const reason = String(ctx.after?.reason || '');
      const cost = ctx.after?.cost;
      if (reason === 'Purchase') {
        const supplierId = String(ctx.after?.supplierId || '');
        if (!supplierId) {
          throw new ValidationError('supplierId é obrigatório para entradas com motivo Compra.');
        }
        const n = Number(cost);
        if (!(isFinite(n) && n > 0)) {
          throw new ValidationError('cost (valor total) deve ser informado e maior que zero para entradas de Compra.');
        }
        const paymentStatus = String(ctx.after?.paymentStatus || '');
        if (!paymentStatus) {
          if (ctx.after) ctx.after['paymentStatus'] = 'Pending';
        }
      } else if (typeof cost !== 'undefined') {
        // Normalize custo não negativo quando fornecido
        const n = Number(cost);
        if (!isFinite(n) || n < 0) if (ctx.after) ctx.after['cost'] = 0;
      }
    }

    // Ensure Product Units table exists and resolve the row for (productId, unitId)
    const { productUnitsTableId, productUnitRow } = await findProductUnit(ctx, productId, unitId);
    if (!productUnitsTableId) throw new ValidationError('Tabela de estoque (Product Units) não encontrada.');
    if (!productUnitRow) throw new ValidationError('Produto/unidade não possui registro de estoque.');

    // Compute new stock and validate non-negative
    const currentStock = Number((productUnitRow?.data as Record<string, unknown>)?.stock ?? 0);
    const newStock = type === 'In' ? currentStock + quantity : currentStock - quantity;
    if (newStock < 0) throw new ValidationError('Operação inválida: estoque insuficiente.');
    assertNotBelowReserved(productUnitRow, currentStock, newStock);

    // Update Product Units stock immediately before creating movement
    await ctx.repository.updateData(String(productUnitRow.id), { ...(productUnitRow?.data as Record<string, unknown> || {}), stock: newStock });
  },
  async beforeUpdate(ctx) {
    const after = ctx.after ?? {};
    const before = ctx.before ?? {};
    const productId = String(after?.productId || before?.productId || '');
    const unitId = String(after?.unitId || before?.unitId || '');
    const prevType = String(before?.type || '');
    const nextType = String(after?.type || prevType);
    const prevQty = Number(before?.quantity || 0);
    const nextQty = Number(after?.quantity || prevQty);
    if (!productId || !unitId) return;
    const { productUnitRow } = await findProductUnit(ctx, productId, unitId);
    if (!productUnitRow) throw new ValidationError('Produto/unidade não possui registro de estoque.');
    const currentStock = Number((productUnitRow?.data as Record<string, unknown>)?.stock ?? 0);
    // Reverter efeito antigo e aplicar novo
    const revert = prevType === 'In' ? -prevQty : (prevType === 'Out' ? +prevQty : 0);
    const apply = nextType === 'In' ? +nextQty : (nextType === 'Out' ? -nextQty : 0);
    const newStock = currentStock + revert + apply;
    if (!(nextType === 'In' || nextType === 'Out')) throw new ValidationError('type inválido para movimentação.');
    if (nextQty <= 0) throw new ValidationError('quantity deve ser maior que zero.');
    if (newStock < 0) throw new ValidationError('Operação inválida: estoque insuficiente.');
    assertNotBelowReserved(productUnitRow, currentStock, newStock);
    // Validações financeiras para atualização: se continuar sendo entrada por Compra, mantenha requisitos
    if (nextType === 'In') {
      const reason = String(after?.reason || before?.reason || '');
      if (reason === 'Purchase') {
        const supplierId = String(after?.supplierId || before?.supplierId || '');
        if (!supplierId) throw new ValidationError('supplierId é obrigatório para entradas com motivo Compra.');
        const n = Number((after?.cost ?? before?.cost));
        if (!(isFinite(n) && n > 0)) throw new ValidationError('cost (valor total) deve ser maior que zero para entradas de Compra.');
      }
    }
    await ctx.repository.updateData(String(productUnitRow.id), { ...(productUnitRow?.data as Record<string, unknown> || {}), stock: newStock });
  },
  async beforeDelete(ctx) {
    const before = ctx.before ?? {};
    const productId = String(before?.productId || '');
    const unitId = String(before?.unitId || '');
    const type = String(before?.type || '');
    const quantity = Number(before?.quantity || 0);
    if (!productId || !unitId) return;
    const { productUnitRow } = await findProductUnit(ctx, productId, unitId);
    if (!productUnitRow) throw new ValidationError('Produto/unidade não possui registro de estoque.');
    const currentStock = Number((productUnitRow?.data as Record<string, unknown>)?.stock ?? 0);
    const delta = type === 'In' ? -quantity : (type === 'Out' ? +quantity : 0);
    const newStock = currentStock + delta;
    if (newStock < 0) throw new ValidationError('Operação inválida: estoque insuficiente.');
    assertNotBelowReserved(productUnitRow, currentStock, newStock);
    await ctx.repository.updateData(String(productUnitRow.id), { ...(productUnitRow?.data as Record<string, unknown> || {}), stock: newStock });
  },
};

/**
 * INV F-26.1 (Q-02, dono 10/11): `reserved <= stock` vale sempre — uma movimentação que baixa o estoque não o deixa
 * abaixo do que as vendas em aberto reservaram.
 */
function assertNotBelowReserved(productUnitRow: IDynamicTableData, currentStock: number, newStock: number): void {
  const reserved = Number((productUnitRow.data as Record<string, unknown>)?.reserved ?? 0) || 0;
  if (newStock < currentStock && newStock < reserved) {
    throw new ValidationError(`Operação inválida: o estoque ficaria em ${newStock}, abaixo do reservado por vendas em aberto (${reserved}).`);
  }
}

/**
 * Resolve Product Units table and the specific (productId, unitId) row.
 */
async function findProductUnit(ctx: RuleContext, productId: string, unitId: string): Promise<{ productUnitsTableId: string | null; productUnitRow: IDynamicTableData | null }> {
  const table = await resolveTable(ctx, {
    internalName: SCHEMA_KEYS.PRODUCT_UNITS,
    category: 'inventory',
    schemaMatch: (fields) => {
      const names = new Set(fields.map(f => f.name));
      return names.has('stock') && names.has('productId') && names.has('unitId');
    },
  });
  if (!table) return { productUnitsTableId: null, productUnitRow: null };
  const rows = await ctx.repository.findRowsByFieldValue(table.id, 'productId', String(productId));
  const productUnitRow = rows.find((e: IDynamicTableData) => String((e.data as Record<string, unknown>)?.unitId || '') === String(unitId)) || null;
  return { productUnitsTableId: table.id, productUnitRow };
}


