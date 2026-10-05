---
id: "D-2026-10-05-PACOTE-VALIDADE-PENDENCIAS-FORKS"
tipo: "decisao"
dominio: "financeiro"
titulo: "Forks F-PP-1..7 das pendências do PACOTE-VALIDADE (mensagem, quem, data da receita, data na UI, ordem do aceite), por delegação"
estado: "decided"
autorizacao: "dono, chat, 2026-10-05: \"Pode ratificar os forks\" (depois do BRIEF listar os 7 com recomendação). depois: \"Pode executar em sequencia\""
atualizado: "2026-10-05"
---
# D-2026-10-05-PACOTE-VALIDADE-PENDENCIAS-FORKS — forks das pendências do PACOTE-VALIDADE

**Estado:** `decided` (7 forks; **por delegação, não fork a fork**; nenhum contra a recomendação)
**Autorização:** dono, chat, 05/10/2026, depois de o agente entregar o BRIEF
[`PACOTE-VALIDADE-PENDENCIAS-brief.md`](../../accounting/PACOTE-VALIDADE-PENDENCIAS-brief.md) com os forks e as recomendações:
*"Pode ratificar os forks"*. Lido como ratificação das recomendações (mesmo gesto de *"Ratificar as recomendações"*, 29/09,
nota [[I5]]). **A ratificação não é "executa"** (ORCH-006); o "executa" veio depois, na mesma data: *"Pode executar em sequencia"* (F2 → F3 → F1).

Nós: [[FE-INCR-PACOTE-VALIDADE]], [[PACOTE-VALIDADE]], [[FIX-SALE-DATE-AS-WRITTEN]], [[FE-FIX-SALES-DATE-D1]].

## Cédulas

| Fork | Pergunta (resumo) | Recomendação | Ratificado | Contra? |
|---|---|---|---|---|
| F-PP-1 | Mensagem do saldo vencido | texto do BE, só a data, sem ids | (a) | não |
| F-PP-2 | "Quem" do aceite no detalhe | `acceptedByLabel` na resposta | (a) | não |
| F-PP-3 | Quanto das pontes de venda lê o dia escrito | receita + fallbacks de liquidação e estorno | (b) | não |
| F-PP-4 | Lançamentos de venda já postados com D-1 | não re-datar | (a), **condicionado ao I4** | não |
| F-PP-5 | Onde corrigir D-1 na UI de vendas | normalizar no carregamento do módulo | (c) | não |
| F-PP-6 | Onde o aceite entra quando o wizard finalizar | antes do `PUT Finalized` | (a), **condicionado ao I1** | não |
| F-PP-7 | Validar o `customerId` no aceite | deixar | (b) | não |

## Consequências

- **I4 é pré-condição do deploy** (F-PP-4): confirmar que nenhum tenant tem venda real postada com D-1 antes de implantar. Se houver, o
  F-PP-4 volta ao dono (estorno + relançamento).
- **I1 trava o item 11 do BRIEF** (F-PP-6): só se decide o desenho do aceite quando a sessão do fix do wizard "Finalizar Venda" terminar.
- **F-PP-3 (b) amplia o alcance** além do que quebrou a prova do pacote (o BRIEF §9 declara o viés): muda a competência da receita de
  venda de produto e serviço. Vai antes do sign-off H2, que confere vendas no razão.
- Os dois defeitos de data têm nota própria, `planned` e **sem 'executa'**: [[FIX-SALE-DATE-AS-WRITTEN]] (F2) e [[FE-FIX-SALES-DATE-D1]] (F3).
