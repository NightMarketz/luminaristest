import { SectorKitV1Schema, type SectorKitV1 } from '../../dtos/SectorKitDto';
import { SALE_BINDING_V1, SALE_OPERATIONAL_SCHEMA_SNAPSHOT } from '../../../accountingBinding/fixtures/saleBinding';

/**
 * Referencial RFB 2025 (L100A/L300A e P100A/P150A, mesmos códigos nos dois regimes) das 15 folhas canônicas
 * (BE-INCR-H1-REFERENCIAL-3-4 item 9; F-HR-1 a, F-HR-2 a — dono, 11/10). Fonte: PROPOSTA-REFERENCIAL-D1-2026-10-10 §0
 * (os 14 mapeamentos que já existem no dev.db) e §1.1 (3.4 → `.98`, delegação do contador via dono — D-1 de 10/10 e
 * decisão (b) de 11/10). `label` = descrição oficial da linha (`referential_accounts`, leiaute 2025).
 */
const REFERENCIAL_2025 = [
  { accountCode: '1.1.1', referentialCode: '1.01.01.02.01', label: 'Bancos Conta Movimento - No País' },
  { accountCode: '1.1.2', referentialCode: '1.01.02.02.01', label: 'Duplicatas a Receber – Operações com Partes Não Relacionadas - no País' },
  { accountCode: '1.1.3', referentialCode: '1.01.01.01.01', label: 'Caixa Matriz' },
  { accountCode: '1.1.4', referentialCode: '1.01.02.02.01', label: 'Duplicatas a Receber – Operações com Partes Não Relacionadas - no País' },
  { accountCode: '1.1.5', referentialCode: '1.01.02.02.01', label: 'Duplicatas a Receber – Operações com Partes Não Relacionadas - no País' },
  { accountCode: '1.1.6', referentialCode: '1.01.03.01.01', label: 'Mercadorias para Revenda' },
  { accountCode: '2.1.1', referentialCode: '2.01.01.05.01', label: 'Adiantamentos de Clientes - no País' },
  { accountCode: '2.1.2', referentialCode: '2.01.01.03.01', label: 'Fornecedores - Operações com Partes Não Relacionadas - No País – Circulante' },
  { accountCode: '2.3.1', referentialCode: '2.03.04.01.01', label: 'Lucros Acumulados e/ou Saldo à Disposição da Assembleia' },
  { accountCode: '3.1', referentialCode: '3.01.01.01.01.06', label: 'Receita da Prestação de Serviços no Mercado Interno' },
  { accountCode: '3.2', referentialCode: '3.01.01.01.02.01', label: '(-) Vendas Canceladas e Devoluções de Vendas' },
  { accountCode: '3.3', referentialCode: '3.01.01.01.01.05', label: 'Receita da Revenda de Mercadorias no Mercado Interno' },
  { accountCode: '3.4', referentialCode: '3.01.01.01.01.98', label: 'Outras Receitas da Atividade Geral' },
  { accountCode: '4.1', referentialCode: '3.01.01.09.01.99', label: '(-) Outras Despesas Operacionais' },
  { accountCode: '4.2', referentialCode: '3.01.01.03.01.02', label: '(-) Custo das Mercadorias Revendidas' },
];

/**
 * Kit do salão, v2 — o v1 + o referencial 2025 (BE-INCR-H1-REFERENCIAL-3-4 PR-2; F-KB-9 a: o salão é o 1º kit com
 * conteúdo). Só PRESUMIDO e REAL (F-HR-2 a): a ECD é facultativa no Simples e o plano referencial dele não foi
 * conferido. Publicado: nunca edite este arquivo; uma versão nova é `kit.v3.ts` (a emenda 3.3 traz as 9 folhas, F-HR-4 a).
 */
export const BEAUTY_SALON_KIT_V2: SectorKitV1 = SectorKitV1Schema.parse({
  kitKey: 'beautySalon',
  kitVersion: 2,
  label: 'Salão de beleza',
  changelog: [
    'v1: migração literal do binding padrão do salão (SALE_BINDING_V1), sem conteúdo novo.',
    'v2: referencial 2025 das 15 folhas canônicas (Presumido e Real); 3.4 → 3.01.01.01.01.98 por delegação do contador ' +
      'via dono (D-2026-10-10-TRIAGEM-CONTADOR-DELEGACAO D-1; D-2026-10-11-QUESTIONARIO-DONO (b)).',
  ],
  chartExtension: [],
  binding: SALE_BINDING_V1,
  operationalSchema: SALE_OPERATIONAL_SCHEMA_SNAPSHOT,
  roleDefaults: {},
  serviceFiscalDefaults: [],
  referential: [
    { regime: 'PRESUMIDO', mappingVersion: '2025', entries: REFERENCIAL_2025 },
    { regime: 'REAL', mappingVersion: '2025', entries: REFERENCIAL_2025 },
  ],
});
