---
id: "D-2026-10-17-DT-VERSION-LEDGER-EXECUCAO"
tipo: "decisao"
dominio: "plataforma"
titulo: "Ledger de versões das DT: executa autorizado; 6 lacunas da spec decididas (merge no restore, readOnly sai do snapshot, rota de diff de schema, smoke de migração, pontes contábeis no restore, --verify do rekey)"
estado: "decided"
autorizacao: "dono, chat, 2026-10-17: \"Executa o BE-INCR-DT-VERSION-LEDGER — sessao-feature, sem merge.\"; questionário do mesmo dia: \"Merge: mantém o atual (Recomendado)\", \"Tira readOnly do snapshot (Recomendado)\", \"Rota …/schema-versions/:v/diff (Recomendado)\", \"Roda e cola no PR (Recomendado)\", \"Sim, igual ao PUT (Recomendado)\", \"Strict ledger rule (Recommended)\""
atualizado: "2026-10-17"
---
# D-2026-10-17-DT-VERSION-LEDGER-EXECUCAO — execução do ledger de versões

**Estado:** `decided`
**Autorização:** dono, chat, 2026-10-17: *"Executa o BE-INCR-DT-VERSION-LEDGER — sessao-feature, sem merge."* Cobre os itens 1–22
do [BRIEF](../../accounting/BE-INCR-DT-VERSION-LEDGER-brief.md) do [[BE-INCR-DT-VERSION-LEDGER]]. **Não cobre** merge nem o FE.

## Lacunas da spec levantadas antes do código (questionários de 17/10)

| # | Lacuna | Decisão | Palavras |
|---|---|---|---|
| L1 | Restaurar a v1 de linha que ganhou campo depois: o update faz merge, o BRIEF diz "data = v1" | **Merge**: campo ausente na versão fica com o valor atual; "data = v1" vale para os campos que a v1 tinha | *"Merge: mantém o atual (Recomendado)"* |
| L2 | Campos `readOnly` no snapshot: com `isSystem:false` (item 17) o Guard 1 do update recusa → 400 em toda tabela com campo calculado | Os `readOnly` do schema **atual** saem do snapshot; ficam com o valor atual e os plugins recalculam | *"Tira readOnly do snapshot (Recomendado)"* |
| L3 | Item 13 pede diff de schema, mas os contratos/OpenAPI (item 20) só listam lista + detalhe | Rota `GET …/schema-versions/:version/diff` (`?against=n\|current`); OpenAPI +7 paths em vez de +6 | *"Rota …/schema-versions/:v/diff (Recomendado)"* |
| L4 | A migração adiciona coluna em `dynamic_tables` (tabela com dado); o gate `smoke:migration` não estava no checklist | Roda sobre cópia do `dev.db` real e a saída vai no PR | *"Roda e cola no PR (Recomendado)"* |
| L5 | O PUT de linha chama as pontes contábeis da venda depois do commit (controller, §2.1); o restore pode mudar o status da venda | O controller do restore chama as **mesmas** pontes (`maybeSyncSaleFinalized`, `maybeSyncSalePackageSold`) | *"Sim, igual ao PUT (Recomendado)"* |
| L6 | Achada na suíte de integração: o `--verify` do CLI de rekey (nó I1b) exige toda tabela fora do inventário idêntica pré × pós, salvo 3 especiais; o `--apply` cria a unidade pelo `createTableData`, e o ledger grava versões | `dynamic_table_row_versions` vira especial com regra própria: versão do pré intacta (append-only); versão nova só de linha criada no pós. Teste do lado vermelho no próprio CLI | *"Strict ledger rule (Recommended)"* |
