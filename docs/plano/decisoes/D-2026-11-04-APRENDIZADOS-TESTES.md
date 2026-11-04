---
id: "D-2026-11-04-APRENDIZADOS-TESTES"
tipo: "decisao"
dominio: "operacao"
titulo: "Régua de testes nos BRIEFs: medição por rota é inventário, cenário DF-e único, IMO-1 apertado, varredura de mensagens com id, nó FIX-TESTES"
estado: "decided"
autorizacao: "dono, chat, 2026-11-04, questionário do PR #1075 (Q1–Q5): respostas literais abaixo"
atualizado: "2026-11-04"
---
# D-2026-11-04-APRENDIZADOS-TESTES

**Estado:** `decided`. Origem: o pedido do dono no chat em 04/11 (*"Já vai atualizando todas os aprendizados nos locais onde
são briefs, e onde já estiver implementado, você também já cria briefs de correção de acordo com o aprendizado."*) e o
questionário das perguntas Q1–Q5 do PR #1075, no mesmo dia. A régua é a de
[`APRENDIZADOS-TESTES-2026-11-04.md`](../../operating-manual/APRENDIZADOS-TESTES-2026-11-04.md).

| # | Pergunta | Resposta do dono (literal) | Efeito |
|---|---|---|---|
| Q1 | A medição por rota do `FIX-TESTES-REPO-FALSO-POR-ROTA` cabe na regra ⛔? | "É inventário (Recomendado)" | **F-RF-1 → (a)**: a tabela fica num doc, o script no scratchpad, nada no CI. Não é gate nem rodada. |
| Q2 | O recado ao PILOTO-DFE (#1067) | "1–2 na branch, 3 vira b3 (Recomendado)" | Data fixa (item 7) e cópia do modelo fechado (item 13) entram como critério de aceite na branch do #1067. `:897`/`:925` viram a opção **b3** do F-PIL-5 (pendente). |
| Q3 | Um cenário de DF-e só? | "Amarrar + F-PIL-2 (b) (Recomendado)" | **F-PIL-2 → (b)** ratificado: módulo `jobs/scenarios/` + CLI com registro de cenários, chamado também pelos testes. DFE-ADN-EMISSOR, ASSINADOR-LOCAL, DFE-EVENTOS e NFCE-EMENDA-4 estendem o cenário `dfe-manual`. |
| Q4 | Teste concorrente do IMO-1 e mensagens com id | "Apertar para [200,409] (Recomendado), Varredura de classe (Recomendado), BRIEF só do imobilizado" → detalhe: "Varredura, imobilizado 1º lote (Recomendado)" | (a) A sessão de correção do IMO-1 aperta `fixedAssetController.integration.test.ts:288–289` para `[200, 409]` no mesmo PR da correção. (b) Um BRIEF de classe, `FIX-MENSAGENS-ID-INTERNO`, com o imobilizado no 1º lote. O DFE-1 segue no piloto (F-PIL-5). |
| Q5 | Onde os BRIEFs de correção entram no vault | "Nó FIX-TESTES (Recomendado)" | A nota [[FIX-TESTES]], no molde do [[FIX-AUTH-CONTA]], fica `planned`. Ela **não** tem `executa`: cada item pede o seu. |

**O que esta decisão não autoriza:** código, `executa` de qualquer item e merge. Os forks restantes dos BRIEFs novos (F-I1B,
F-VPT, F-CRM, F-RF-2/3, F-MSG) continuam pendentes.
