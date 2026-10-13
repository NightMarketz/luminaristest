/**
 * Referencial RFB 2025 das 9 folhas da emenda 3.3 (BE-INCR-ENCARGOS-DESCONTOS, PR-1; F-HR-4 a, dono 11/10): folha nova
 * sem mapeamento derruba a prontidão da ECD em todo escopo (`ReferentialMappingService`, gate de cobertura). Códigos da
 * PROPOSTA-REFERENCIAL-D1-2026-10-10 §1.2 (BE-INCR-H1-REFERENCIAL-3-4 item 13); a tarifa está em `4.6` e não em `4.5`
 * (o kit v3 usa 4.5.1/4.5.2 — dono, 13/10). `label` = descrição oficial em `referential_accounts` (leiaute 2025, `dev.db`
 * lido em 13/10). Mesmos códigos em Presumido e Real.
 */
export const REFERENCIAL_2025_EMENDA_3_3: readonly { accountCode: string; referentialCode: string; label: string }[] = [
  { accountCode: '3.5.1', referentialCode: '3.01.01.05.01.05', label: 'Outras Receitas Financeiras' },
  { accountCode: '3.5.2', referentialCode: '3.01.01.05.01.05', label: 'Outras Receitas Financeiras' },
  { accountCode: '3.5.3', referentialCode: '3.01.01.05.01.05', label: 'Outras Receitas Financeiras' },
  { accountCode: '4.3.1', referentialCode: '3.01.01.09.01.08', label: '(-) Outras Despesas Financeiras' },
  { accountCode: '4.3.2', referentialCode: '3.01.01.07.01.22', label: '(-) Multas' },
  { accountCode: '4.3.3', referentialCode: '3.01.01.09.01.08', label: '(-) Outras Despesas Financeiras' },
  { accountCode: '4.4.1', referentialCode: '3.01.01.07.01.22', label: '(-) Multas' },
  { accountCode: '4.4.2', referentialCode: '3.01.01.07.01.22', label: '(-) Multas' },
  { accountCode: '4.6', referentialCode: '3.01.01.07.01.04', label: '(-) Outros Serviços Prestados por Pessoa Física ou Jurídica' },
];
