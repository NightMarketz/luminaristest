# BE-INCR-PIS-COFINS — EMENDA F-PCB-1R (PIS/COFINS como dedução da receita)

> 2026-10-13, base `origin/main` `38df6fe4`. Emenda ao BRIEF [`BE-INCR-PIS-COFINS-brief.md`](BE-INCR-PIS-COFINS-brief.md)
> (nó [`X8`](../plano/nos/X8.md)). Decisão: [[D-2026-10-13-F-PCB-1R-PIS-COFINS-DEDUCAO]].
>
> **Autorização, literal:** dono, chat, 13/10: *"Accounting primeiro, PR-K2 completo"* — opção que dizia "Reabro o
> F-PCB-1 → (a) e faço primeiro o PR do accounting (validador + gate + testes da ECF)". Cobre esta emenda e o PR dela.
>
> **Em duas linhas:** as contas de PIS/COFINS do perfil fiscal passam a ser deduções da receita (`Revenue`), e o gate de
> receita bruta ignora só essas duas contas. **Risco principal:** um perfil com conta `Expense` nesses campos passa a ser
> recusado no próximo PUT; no `dev.db` real nenhum dos 4 perfis tem esses campos preenchidos (consulta de 13/10).

## Checklist (PR único)

1. **Validador.** `FiscalProfileService`: `pisDespesaAccountId`/`cofinsDespesaAccountId` exigem natureza `Revenue`
   (`assertRevenueAccount`, a mesma do DAS do Simples). Os nomes dos campos não mudam (sem migração; o `Despesa` do
   nome é histórico). *Teste:* `Expense` ⇒ 400; `Revenue` ⇒ aceito.
2. **Gate.** `receitaBrutaPorAtividade` lê o perfil fiscal do escopo e tira do gate **exatamente** as contas de
   `pisDespesaAccountId`/`cofinsDespesaAccountId` (o repo do perfil entra no `Deps`, obrigatório, para nenhum
   chamador esquecer). A segregação (3.1/3.3/3.4) não muda. *Testes:* conta configurada com movimento ⇒ passa; a mesma
   conta sem estar no perfil ⇒ 400 `unmappedRevenueAccounts`; outra conta `Revenue` com movimento continua reprovando.
3. **Chamadores.** `PisCofinsAssessmentService`, `TaxAssessmentService` (2) e `SpedEcfGenerationService` (repo do perfil
   injetado pela factory). *Teste* (o (f) do F-PCB-1): a ECF Presumido gera com movimento nas contas de dedução.
4. **DRE.** Regra `Revenue` com `codePrefix '3.6'` → `revenueDeductions` (`credit_negative`), como a 3.2, para os
   códigos do F-KE-1/F-KE-2 do KIT-SETOR aparecerem em "Deduções da receita" (efeito que o F-PCB-1 (a) já previa).
   *Teste:* saldo devedor em 3.6.1 sai em `revenueDeductions`, não em `grossRevenue`.
5. **Comentários** que afirmam "Expense" para essas contas (`TaxAssessmentService`, `pisCofinsCalc`) passam a dizer
   dedução da receita. Sem mudança de lançamento: continua D conta de PIS/COFINS / C a recolher.

Fora: o kit (PR-K2 da EMENDA-1 do KIT-SETOR) é o PR seguinte e preenche os campos com 3.6.1/3.6.2.

## Verificação legal de 17/10

Dossiê `pesquisas-legais/verif-2026-10-17-pis-cofins/relatorio.md` (PR #754); os [Dnn] são as fontes dele.

- A dedução da receita bruta confere com o texto vigente: DL 1.598 art. 12 § 1º III ("tributos sobre ela incidentes"),
  cópia compilada de 13/10 [D08].
- Nada muda nesta emenda.
