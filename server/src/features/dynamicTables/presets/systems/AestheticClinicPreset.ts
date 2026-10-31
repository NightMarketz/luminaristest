import { createTableFromModule } from '../../utils/TableFactory';
import { aestheticClinicCustomerModule } from '../modules/people/AestheticClinicCustomerModule';
import { productUnitModule } from '../modules/product/ProductModule';
import { stockMovementsModule } from '../modules/inventory/StockMovementsModule';
import { appointmentsModule } from '../modules/planning/AppointmentsModule';
import { goalsModule } from '../modules/business/GoalsModule';
import { reportsModule } from '../modules/business/ReportsModule';
import { campaignsModule } from '../modules/business/CampaignsModule';
import { expensesModule } from '../modules/finance/ExpensesModule';
import { otherRevenuesModule } from '../modules/finance/OtherRevenuesModule';
import { financialBaselinesModule } from '../modules/finance/FinancialBaselinesModule';
import type { ModuleKey } from '../modules/registry';

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
  // I8, F-I8-COMP3-a (ratificado 2026-09-26): CRM-0 + CRM-1 por padrão, igual ao salão (antes vinham do Core).
  modules: ['CRM-0', 'CRM-1', 'PES-0', 'PES-FORN', 'VEN-0', 'VEN-SERV', 'VEN-PROD', 'VEN-PAC', 'VEN-COM'] as ModuleKey[],
  // BE-INCR-MODULOS-BASE-SUBMODULOS item 11b: as 4 tabelas que a contabilidade lê pelo nome (W2 / F-W2-2) seguem
  // travadas; viraram tabelas de módulo (PES-0, VEN-0, VEN-PAC), então a trava vem daqui até o PR-5.
  lockedModuleTables: ['customers', 'packages', 'sales', 'saleItems'],
  // Item 11a: a ficha da clínica (F-P2-5 a) substitui a fonte de `customers` do PES-0 — mesmo internalName.
  moduleOverrides: { customers: aestheticClinicCustomerModule },
  // W5 item 2 (F-W5-1 → b): perfil da IA movido byte a byte do `presetKnowledgeBase` escrito à mão (`8ba1ed8f`).
  aiProfile: {
    name: 'Clínica de Estética',
    // BE-INCR-P2-VERTICAL-CLINICA, comportamento 3: entrada NOVA — sem ela o matcher devolveria
    // `beautySalon` para qualquer descrição de clínica (a prova mediria o próprio preset do
    // vertical 1, não o vertical 2). Conteúdo clínico sensível (anamnese/contraindicação/consentimento)
    // NÃO é mencionado aqui — a ficha clínica só promete um campo administrativo próprio (ver
    // `AestheticClinicCustomerModule.ts`), a decisão de conteúdo de saúde está pendente de validação
    // externa (BRIEF §7 item 4).
    description: 'Um sistema completo de gestão para clínicas de estética — procedimentos estéticos, protocolos de tratamento e pacotes de sessões pré-pagas. Otimizado para o relacionamento com o paciente/cliente e a agenda de atendimentos. Inclui tabelas para: Clientes (ficha com registro administrativo próprio da clínica), Serviços (catálogo de procedimentos com preço e duração), Agendamentos (marcação de atendimentos vinculando cliente, procedimento e profissional), Produtos (cosméticos/insumos para revenda ou uso interno, com controle de estoque), Pacotes (sessões pré-pagas), Vendas (registrando procedimentos e produtos), e Comissões (por profissional).',
  },
  tables: {
    productUnits: createTableFromModule(productUnitModule),
    appointments: createTableFromModule(appointmentsModule),
    goals: createTableFromModule(goalsModule),
    reports: createTableFromModule(reportsModule),
    campaigns: createTableFromModule(campaignsModule),
    expenses: createTableFromModule(expensesModule),
    otherRevenues: createTableFromModule(otherRevenuesModule),
    financialBaselines: createTableFromModule(financialBaselinesModule),
    stockMovements: createTableFromModule(stockMovementsModule),
  },
};

export default AestheticClinicPreset;
