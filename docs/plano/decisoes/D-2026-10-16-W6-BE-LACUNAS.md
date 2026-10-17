---
id: "D-2026-10-16-W6-BE-LACUNAS"
tipo: "decisao"
dominio: "plataforma"
titulo: "W6 BE: executa autorizado; 3 lacunas da spec decididas (falha do modelo grava 2 linhas, presetKey só informa, turno vazio limpa a pendente)"
estado: "decided"
autorizacao: "dono, chat, 2026-10-16: \"Executa o BE do W6 — sessao-feature, sem merge\"; questionário do mesmo dia: \"Grava as 2 linhas (Recomendado)\", \"Só informa (Recomendado)\", \"Limpa a anterior (Recomendado)\""
atualizado: "2026-10-16"
---
# D-2026-10-16-W6-BE-LACUNAS — execução do BE do W6

**Estado:** `decided`
**Autorização:** dono, chat, 2026-10-16: *"Executa o BE do W6 — sessao-feature, sem merge"*. Cobre os itens 1–12 do
[BRIEF](../../accounting/WIZARD-W6-CUSTOMIZE-FIELDS-brief.md) (`BE-INCR-W6-CUSTOMIZE-FIELDS`) do [[W6]]. **Não cobre**
merge, o FE (itens 13–19) nem o item 20.

## Lacunas da spec levantadas antes do código (questionário de 16/10)

| # | Lacuna | Decisão | Palavras |
|---|---|---|---|
| 1 | Falha do modelo (exceção ou saída fora do schema): o BRIEF item 5 grava usuário + assistente em todo turno; o ADR-W6 §2.2 invariante 5 diz "nada muda além da linha do usuário"; a resposta não tem campo de mensagem | Grava as **duas** linhas (a do assistente com a mensagem padrão); campos e proposta pendente intactos. O invariante 5 lê-se "nada muda além do histórico" | *"Grava as 2 linhas (Recomendado)"* |
| 2 | Casou com preset (`presetKey` do modelo ou `findExactFieldMatch`): o corpo do campo vira o do preset? | **Não**: o `presetKey` só informa; o campo proposto é o do modelo, validado pelo `AdvancedFieldSchema` (BRIEF §2.2 lido ao pé da letra) | *"Só informa (Recomendado)"* |
| 3 | Turno que dá certo sem mudança válida: o que acontece com a pendente anterior? | **Limpa**: a resposta traz `proposal:null` e a sessão fica sem pendente; aplicar a velha → 409 `PROPOSAL_STALE` | *"Limpa a anterior (Recomendado)"* |
