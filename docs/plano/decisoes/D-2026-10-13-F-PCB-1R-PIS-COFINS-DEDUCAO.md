---
id: "D-2026-10-13-F-PCB-1R-PIS-COFINS-DEDUCAO"
tipo: "decisao"
dominio: "fiscal"
titulo: "F-PCB-1 reaberto → (a): PIS/COFINS sobre o faturamento é dedução da receita; E-5 do kit mantido; PR do accounting antes do PR-K2"
estado: "decided"
autorizacao: "dono, chat, 2026-10-13, questionário (sessão do PR-K2): \"Accounting primeiro, PR-K2 completo\" (opção: 'Reabro o F-PCB-1 → (a) e faço primeiro o PR do accounting (validador + gate + testes da ECF). Depois o PR-K2 completo') + \"Manter E-5: bloqueia\""
atualizado: "2026-10-13"
---
# D-2026-10-13-F-PCB-1R — PIS/COFINS como dedução da receita

## Por que reabriu

Ao executar o PR-K2 do KIT-SETOR (EMENDA-1), o F-KE-2 (a) (PIS/COFINS em 3.6.1/3.6.2, natureza `Revenue`, gravadas em
`pis|cofinsDespesaAccountId`) bateu no F-PCB-1 (b) de 02/10: `FiscalProfileService.ts:256-257` exige `Expense`
nesses campos, e o gate de `receitaBrutaPorAtividade` reprova toda conta `Revenue` com movimento fora de 3.1/3.3/3.4.
A instalação do kit falharia em toda unidade com perfil fiscal. O dono pediu pesquisa com referência em líderes.

## Pesquisa (13/10)

- **Lei:** a receita líquida é a bruta diminuída dos tributos sobre ela incidentes (DL 1.598/77 art. 12 §1º III,
  redação da Lei 12.973/2014); a DRE discrimina as deduções antes da receita líquida (Lei 6.404/76 art. 187 I–II).
  Dossiê: `pesquisas-legais/pis-cofins-deducao-receita/relatorio.md`.
- **OCA l10n-brazil (Odoo), branch 16.0, código-fonte:**
  - `l10n_br_coa_generic/data/account.account.template.csv`: `6.1.1.2.05 COFINS s/ Vendas` e `6.1.1.2.06 PIS s/ Vendas`,
    `account_type=income_other`, tag `account_tag_revenue_deduction`; `l10n_br_coa.account.tax.group.account.template.csv`
    liga PIS/COFINS a elas como `ded_account_id`. Despesa (`expense`) só para "PIS/COFINS s/ Outras Receitas" (5.1.1.5.05/06).
  - `l10n_br_coa_simple`: PIS/COFINS em `3.1.2.01.01/02`, grupo `3.1.2 DEDUÇÕES DA RECEITA BRUTA`
    (`account_group_template.xml`).
- **Referencial RFB 2025** (catálogo no `dev.db`): `3.01.01.01.02.05 (-) PIS/PASEP Sobre Receita Bruta` e
  `3.01.01.01.02.04 (-) COFINS Sobre Receita Bruta`, dentro das deduções da receita bruta.

Conclusão: o F-KE-2 (a) está certo; o F-PCB-1 (b) contraria a lei e a referência.

## Cédulas

| Fork | Decisão |
|---|---|
| F-PCB-1R | **(a)** — o que o F-PCB-1 (a) já descrevia: contas `Revenue`; o gate ignora **exatamente** as 2 contas configuradas no perfil fiscal (nunca um prefixo: o PIS/COFINS cumulativo não reduz a base presumida). Sequência: **PR do accounting primeiro** (emenda `BE-INCR-PIS-COFINS-EMENDA-F-PCB-1R-brief.md`), depois o PR-K2 completo |
| E-5 (kit) | **mantida**: kit com `roleDefaults.fiscalProfile` exige perfil fiscal na unidade; a ativação bloqueia sem ele (`KIT_FISCAL_PROFILE_REQUIRED`) |
