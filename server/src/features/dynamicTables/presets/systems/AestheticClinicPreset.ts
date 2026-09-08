import { createTableFromModule } from '../../utils/TableFactory';
import { aestheticClinicCustomerModule } from '../modules/people/AestheticClinicCustomerModule';
import { serviceModule } from '../modules/service/ServiceModule';
import { productModule, productUnitModule } from '../modules/product/ProductModule';
import { salesModule } from '../modules/finance/SalesModule';
import { saleItemsMixedModule } from '../modules/finance/SalesItemsMixed';
import { packageCatalogModule } from '../modules/finance/PackageCatalogModule';
import { stockMovementsModule } from '../modules/inventory/StockMovementsModule';
import { appointmentsModule } from '../modules/planning/AppointmentsModule';
import { goalsModule } from '../modules/business/GoalsModule';
import { reportsModule } from '../modules/business/ReportsModule';
import { campaignsModule } from '../modules/business/CampaignsModule';
import { expensesModule } from '../modules/finance/ExpensesModule';
import { suppliersModule } from '../modules/people/SuppliersModule';
import { otherRevenuesModule } from '../modules/finance/OtherRevenuesModule';
import { financialBaselinesModule } from '../modules/finance/FinancialBaselinesModule';
import { commissionsModule } from '../modules/finance/CommissionsModule';

/**
 * BE-INCR-P2-VERTICAL-CLINICA — Bloco I, comportamento 1. O segundo vertical da prova (ADR-P2,
 * F-P2-1 → RATIFICADO "clínica estética"), composto EXCLUSIVAMENTE por módulos JÁ EXISTENTES
 * (reuso literal, sem edição — mesmos módulos que `BeautySalonPreset.ts` usa) mais um módulo NOVO
 * para a ficha do cliente (`aestheticClinicCustomerModule`, F-P2-5 → (a)). Nenhum arquivo
 * compartilhado de `presets/modules/` é editado por este preset — só citado.
 *
 * **Invariante duro (BRIEF §3, comportamento 1):** as tabelas `sales` e `saleItems` preservam os
 * MESMOS `internalName` do salão (`'sales'`/`'saleItems'`, definidos pelos próprios módulos
 * `salesModule`/`saleItemsMixedModule`, reusados sem alteração) — é por `internalName`, não por
 * preset/setor, que as pontes contábeis (`SaleSalesAccountingBridge.ts` e as 3 irmãs) localizam a
 * tabela (`findTableByInternalName(actor.userId, 'sales'|'saleItems')`). Sem essa preservação, o
 * vertical 2 não dispararia NENHUM dos 5 arquétipos — não por falta de binding, mas por a ponte
 * nunca achar a tabela.
 *
 * **Amplitude operacional — F-P2-8 → RATIFICADO (a):** serviço + revenda de cosmético (produto com
 * estoque, via `productModule`/`stockMovementsModule`) + pacote pré-pago (`packageCatalogModule`) —
 * os 3 módulos que fazem os 5 arquétipos (reconhecimento, liquidação, estorno, CMV, passivo de
 * performance) disparem, os MESMOS 5 que o vertical 1 já exercita. Sob (b) (serviço puro), `cogs` e
 * `performance_liability` nunca disparariam (parecer, `SaleSalesAccountingBridge.ts:146`) e a prova
 * cobriria MENOS que o salão já cobre.
 */
const AestheticClinicPreset = {
  key: 'aestheticClinic',
  name: 'ERP para Clínica de Estética',
  description:
    'Complete management solution for aesthetic clinics: appointments, clinical customer registry, ' +
    'inventory of cosmetics/products, service catalog, prepaid packages, sales, and full financials.',
  tables: {
    customers: createTableFromModule(aestheticClinicCustomerModule),
    suppliers: createTableFromModule(suppliersModule),
    services: createTableFromModule(serviceModule),
    packages: createTableFromModule(packageCatalogModule),
    products: createTableFromModule(productModule),
    productUnits: createTableFromModule(productUnitModule),
    appointments: createTableFromModule(appointmentsModule),
    // Invariante duro — internalName 'sales'/'saleItems', ver docstring acima.
    sales: createTableFromModule(salesModule),
    saleItems: createTableFromModule(saleItemsMixedModule),
    goals: createTableFromModule(goalsModule),
    reports: createTableFromModule(reportsModule),
    campaigns: createTableFromModule(campaignsModule),
    expenses: createTableFromModule(expensesModule),
    otherRevenues: createTableFromModule(otherRevenuesModule),
    financialBaselines: createTableFromModule(financialBaselinesModule),
    stockMovements: createTableFromModule(stockMovementsModule),
    commissions: createTableFromModule(commissionsModule),
  },
};

export default AestheticClinicPreset;
