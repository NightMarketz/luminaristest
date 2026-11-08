import type { ITableSchema } from '../../models/DynamicTable.model';
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
    'EST-0', 'AGE-0', 'FIN-0', 'FIN-REC', 'FIN-BASE', 'GES-0', 'GES-META'] as ModuleKey[],
  // BE-INCR-MODULOS-BASE-SUBMODULOS PR-3 (item 16): ESTOQUE (productUnits + stockMovements) e AGENDA (appointments)
  // viraram módulos; saíram de `tables`.
  // BE-INCR-MODULOS-BASE-SUBMODULOS PR-5 (itens 26 e 28): a ponte de vendas exige PES-0 e VEN-0, que ficam travados
  // pela contabilidade (`lockedBy` do módulo); a trava por tabela (`lockedModuleTables`) saiu e VEN-PAC destravou (F-MB-5).
  bridges: ['sales@1' as const],
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
  },
};

export default BeautySalonPreset;
