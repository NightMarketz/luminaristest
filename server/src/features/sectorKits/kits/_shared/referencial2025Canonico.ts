import { codigoPosL8 } from '../../../accounting/fixtures/ChartOfAccountsFixture';
/**
 * Referencial RFB 2025 (L100A/L300A e P100A/P150A, mesmos códigos nos dois regimes) das 15 folhas do plano CANÔNICO —
 * compartilhado pelos kits porque o de-para é do canônico, não do setor (BE-INCR-KIT-SETOR-EMENDA-1, PR-K1, item 1;
 * F-KB-9R, dono 13/10). Conteúdo idêntico ao `REFERENCIAL_2025` do `beautySalon/kit.v2.ts`, que é publicado e não se
 * edita: o deep-equal em `__tests__/referencial2025Canonico.test.ts` trava a divergência.
 *
 * Fonte: PROPOSTA-REFERENCIAL-D1-2026-10-10 §0 (os 14 mapeamentos que já existem no dev.db) e §1.1 (3.4 → `.98`,
 * delegação do contador via dono — D-1 de 10/10 e decisão (b) de 11/10). `label` = descrição oficial da linha
 * (`referential_accounts`, leiaute 2025).
 */
export const REFERENCIAL_2025_CANONICO: readonly { accountCode: string; referentialCode: string; label: string }[] = [
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
 * BE-INCR-PLANO-4-NIVEIS (L8; F-L8-7 a): o mesmo de-para no plano de 4 níveis — só o `accountCode` muda (pelo
 * `RENOMEACAO_CANONICA_L8`); o código referencial e o rótulo oficial são os mesmos. É o que o kit v3 embute; a lista
 * acima segue congelada para os kits v2 publicados.
 */
export const REFERENCIAL_2025_CANONICO_V2: readonly { accountCode: string; referentialCode: string; label: string }[] =
  REFERENCIAL_2025_CANONICO.map((e) => ({ ...e, accountCode: codigoPosL8(e.accountCode) }));

