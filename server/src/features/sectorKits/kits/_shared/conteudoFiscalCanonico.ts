import type { SectorKitV1 } from '../../dtos/SectorKitDto';

/**
 * Conteúdo fiscal do kit, igual nos dois setores (BE-INCR-KIT-SETOR-EMENDA-1, PR-K2, itens 5–6; F-KB-6R/F-KB-9R, dono
 * 13/10). As contas de imposto são do plano, não do setor — o mesmo motivo do `referencial2025Canonico.ts`.
 *
 * - F-KE-1 (a), dono 13/10: a recolher 2.1.3–2.1.6 (passivo); IRPJ/CSLL do resultado em 4.5.1/4.5.2 (fora de 4.3/4.4,
 *   reservados pela emenda 3.3).
 * - F-KE-2 (a), dono 13/10, e F-PCB-1R (a): PIS/COFINS sobre a receita são dedução da receita bruta (natureza Revenue,
 *   3.6.1/3.6.2; DL 1.598/77 art. 12 §1º III; Lei 6.404/76 art. 187 II). O perfil fiscal aceita Revenue nesses campos
 *   e o gate da receita bruta da ECF ignora exatamente essas duas contas (#649).
 */
export const CONTAS_FISCAIS: SectorKitV1['chartExtension'] = [
  { code: '2.1.3', name: 'IRPJ a recolher', nature: 'Liability', acceptsEntries: true },
  { code: '2.1.4', name: 'CSLL a recolher', nature: 'Liability', acceptsEntries: true },
  { code: '2.1.5', name: 'PIS a recolher', nature: 'Liability', acceptsEntries: true },
  { code: '2.1.6', name: 'COFINS a recolher', nature: 'Liability', acceptsEntries: true },
  { code: '3.6.1', name: 'PIS sobre a receita', nature: 'Revenue', acceptsEntries: true },
  { code: '3.6.2', name: 'COFINS sobre a receita', nature: 'Revenue', acceptsEntries: true },
  { code: '4.5.1', name: 'IRPJ', nature: 'Expense', acceptsEntries: true },
  { code: '4.5.2', name: 'CSLL', nature: 'Expense', acceptsEntries: true },
];

/** Item 6 — contas-padrão do perfil fiscal; a instalação só preenche campo nulo (F13 (iii), já em `main`). */
export const PERFIL_FISCAL_PADRAO: SectorKitV1['roleDefaults']['fiscalProfile'] = {
  irpjRecolherAccountCode: '2.1.3',
  csllRecolherAccountCode: '2.1.4',
  pisRecolherAccountCode: '2.1.5',
  cofinsRecolherAccountCode: '2.1.6',
  irpjDespesaAccountCode: '4.5.1',
  csllDespesaAccountCode: '4.5.2',
  pisDespesaAccountCode: '3.6.1', // dedução da receita — o nome do campo é histórico (F-PCB-1R)
  cofinsDespesaAccountCode: '3.6.2',
};

/**
 * Item 5 — referencial RFB 2025 das 8 contas novas (F7: folha nova sem mapeamento derruba a prontidão da ECD). Cada
 * linha é a descrição oficial do catálogo `referential_accounts` (leiaute 2025, `dev.db` lido em 13/10), com o mesmo
 * nome da conta: a recolher → 2.01.01.09.x; PIS/COFINS → deduções da receita bruta 3.01.01.01.02.x; IRPJ/CSLL →
 * provisões 3.02.01.01.01.x. Mesmos códigos em Presumido e Real, como as 15 do canônico.
 */
export const REFERENCIAL_2025_FISCAL: readonly { accountCode: string; referentialCode: string; label: string }[] = [
  { accountCode: '2.1.3', referentialCode: '2.01.01.09.13', label: 'IRPJ a Recolher  – Circulante' },
  { accountCode: '2.1.4', referentialCode: '2.01.01.09.14', label: 'CSLL a Recolher  – Circulante' },
  { accountCode: '2.1.5', referentialCode: '2.01.01.09.04', label: 'PIS a Recolher – Circulante' },
  { accountCode: '2.1.6', referentialCode: '2.01.01.09.05', label: 'COFINS a Recolher – Circulante' },
  { accountCode: '3.6.1', referentialCode: '3.01.01.01.02.05', label: '(-) PIS/PASEP Sobre Receita Bruta' },
  { accountCode: '3.6.2', referentialCode: '3.01.01.01.02.04', label: '(-) COFINS Sobre Receita Bruta' },
  {
    accountCode: '4.5.1',
    referentialCode: '3.02.01.01.01.02',
    label: '(-) Provisão para Imposto de Renda - Pessoa Jurídica (Atividade Geral e Rural)',
  },
  { accountCode: '4.5.2', referentialCode: '3.02.01.01.01.01', label: '(-) Provisão para Contribuição Social sobre o Lucro Líquido (Atividade Geral)' },
];
