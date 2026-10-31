import type { ITableSchema } from '../../models/DynamicTable.model';
import { createTableFromModule } from '../../utils/TableFactory';
import { productUnitModule } from '../modules/product/ProductModule';
import { stockMovementsModule } from '../modules/inventory/StockMovementsModule';
import { appointmentsModule } from '../modules/planning/AppointmentsModule';
import type { ModuleKey } from '../modules/registry';

/**
 * @description
 * A complete and robust ERP preset for beauty salon chains, optimized for BI, scalability, and governance.
 * Supports multiple units, customer management (LGPD), appointments, detailed inventory, sales, full financials,
 * strategic goals, and granular auditing.
 *
 * @version 4.0
 * @author Business Intelligence & Strategy Team
 * @updated 2025-07-07
 */
const BeautySalonPreset = {
  key: 'beautySalon',
  name: 'Advanced Beauty Salon ERP',
  description: 'Complete management solution for salons with scheduling, inventory, sales, financials, and marketing.',
  // I8 comportamento 5 (F-CRM-2 → a, ratificado 2026-09-07): CRM-0 (Funil) + CRM-1 (Propostas); CRM-2/3 OFF.
  modules: ['CRM-0', 'CRM-1', 'CRM-CAMP', 'PES-0', 'PES-FORN', 'VEN-0', 'VEN-SERV', 'VEN-PROD', 'VEN-PAC', 'VEN-COM',
    'FIN-0', 'FIN-REC', 'FIN-BASE', 'GES-0', 'GES-META'] as ModuleKey[],
  // BE-INCR-MODULOS-BASE-SUBMODULOS item 11b: as 4 tabelas que a contabilidade lê pelo nome (W2 / F-W2-2) seguem
  // travadas; viraram tabelas de módulo (PES-0, VEN-0, VEN-PAC), então a trava vem daqui até o PR-5.
  lockedModuleTables: ['customers', 'packages', 'sales', 'saleItems'],
  // W5 item 2 (F-W5-1 → b): perfil da IA movido byte a byte do `presetKnowledgeBase` escrito à mão (`8ba1ed8f`).
  aiProfile: {
    name: 'Salão de Beleza',
    // BE-INCR-P2-VERTICAL-CLINICA, comportamento 3: emenda à descrição — este preset reivindicava
    // literalmente "clínicas de estética" (`PresetKnowledgeBase.ts:17`, verificado no BRIEF §2), o
    // que faria o matcher resolver qualquer descrição de clínica para `beautySalon` mesmo depois de
    // `aestheticClinic` existir (as duas entradas competiriam pela mesma descrição). Removido aqui;
    // "clínicas de estética" migrou para a entrada nova abaixo.
    description: 'Um sistema completo de gestão para negócios na área da beleza, como salões, barbearias ou spas. Otimizado para gerenciar o relacionamento com clientes e a agenda. Inclui tabelas para: Clientes (com histórico de visitas), Serviços (catálogo de serviços oferecidos com preço e duração), Agendamentos (para marcar horários, vinculando cliente, serviço e funcionário), Produtos (para venda ou uso interno), Vendas (registrando serviços e produtos), e Funcionários (para comissões e agenda).',
  },
  // BE-INCR-MODULOS-BASE-SUBMODULOS PR-4 (item 21–22): FINANCEIRO, GESTÃO e Campanhas (CRM-CAMP) saíram daqui.
  tables: {
    productUnits: createTableFromModule(productUnitModule),
    appointments: createTableFromModule(appointmentsModule),
    stockMovements: createTableFromModule(stockMovementsModule),
  },
};

export default BeautySalonPreset;
