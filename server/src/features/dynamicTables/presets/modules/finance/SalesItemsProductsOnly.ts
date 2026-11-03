import type { ITableSchema } from '../../../models/DynamicTable.model';
import { saleId } from '../../fields/relation/RelationPresets';
import { description } from '../../fields/text/TextPresets';
import { quantity, unitPrice, catalogUnitPrice, discountCents, custoSnapshotCents } from '../../fields/number/NumberPresets';
import { kitRef } from '../../fields/text/TextPresets';
import { principalItem } from '../../fields/boolean/BooleanPresets';
import { productId } from '../../fields/relation/RelationPresets';

export const saleItemsProductsOnlyModule = {
  name: 'Sale Items',
  description: 'Details each product item of a sale.',
  category: 'finance',
  meta: {
    requiresCapabilities: ['inventory.stock'],
  },
  schema: {
    defaultDisplayField: 'description',
    ui: { presentation: 'embedded' },
    fields: [
      saleId,
      productId,
      { ...description, label: 'Description' },
      quantity,
      unitPrice,
      // EFICIENCIA-FISCAL PR-1 item 1 (combo itemizado, desconto por item, piso de custo, kit).
      catalogUnitPrice,
      discountCents,
      custoSnapshotCents,
      kitRef,
      principalItem,
    ],
  } as ITableSchema,
};


