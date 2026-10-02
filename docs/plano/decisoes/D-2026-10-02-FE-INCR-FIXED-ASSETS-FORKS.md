---
id: "D-2026-10-02-FE-INCR-FIXED-ASSETS-FORKS"
tipo: "decisao"
dominio: "contabil"
titulo: "Ratificação por questionário: forks F-FAFE-1..7 do BRIEF FE-INCR-FIXED-ASSETS"
estado: "decided"
autorizacao: "dono, chat, 2026-10-02: \"ratifica os forks F-FAFE por questionário\" + 2 AskUserQuestion (7/7 na opção recomendada) — sem 'executa'"
atualizado: "2026-10-02"
---
# D-2026-10-02-FE-INCR-FIXED-ASSETS-FORKS — cédulas

**Estado:** `decided`
**Autorização:** dono, chat, 2026-10-02, por questionário (AskUserQuestion), todas na recomendação.
**Não é "executa":** implementar o [[FE-INCR-FIXED-ASSETS]] segue exigindo o "executa" do dono (ORCH-006).

BRIEF: [`FE-INCR-FIXED-ASSETS-brief.md`](../../accounting/FE-INCR-FIXED-ASSETS-brief.md) §3.

| Fork | Decisão |
|---|---|
| F-FAFE-1 | **(a)** O operador declara por item (controle "Tipo"); a tela não lê CFOP; nada novo no BE. Substitui o F-B2-2 → a de [[D-2026-09-28-FE-CONTRATO-GERADO-E-FORKS-FE]], que ficou sem objeto com o #461 (EMENDA item 23 do ITEM-DESTINATION) |
| F-FAFE-2 | **(a)** Seletor de 2 opções (Produto · Imobilizado), sem `destination`, nascido como `<select>` para o par FE do ITEM-DESTINATION acrescentar "Insumo do serviço" |
| F-FAFE-3 | **(a)** Seção "Contas" dentro da aba Imobilizado; PUT parcial só de `depreciationExpenseAccountId`, `disposalGainAccountId`, `disposalLossAccountId` |
| F-FAFE-4 | **(a)** Aba nova "Imobilizado" (Bens / Classes / Taxas / Contas) |
| F-FAFE-5 | **(a)** Depreciação de um mês por clique (contrato do BE) |
| F-FAFE-6 | **(a)** `nfeMappingMemory` não lembra classe; segue só `productRef`, chave `v1` intacta |
| F-FAFE-7 | **(a)** `<table>` + `Modal` + `StandardPagination` + `CatalogCombobox` (precedente F-FE-2 → a); `GenericTable` não é adaptado |
