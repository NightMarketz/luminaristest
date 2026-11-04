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

## Conciliação com o questionário da sessão "Playwright" (04/11)

As mesmas Q1–Q5 também foram respondidas num questionário da sessão "Playwright: screenshot, CLI e DevTools", que repassou
as respostas por mensagem: Q1 *"Cabe: é inventário (Recomendado)"*; Q2 *"Acrescentar no #1067 agora"*; Q3 *"Um cenário
compartilhado"*; Q4 *"Um 409 e um 200 (Recomendado)"*; Q5 *"Ligar aos nós existentes (Recomendado)"*. Q1 e Q4 coincidem com
as daqui. Para Q2, Q3 e Q5, o dono resolveu a diferença num questionário nesta sessão, no mesmo dia:

| # | Resposta do dono (literal) | Efeito |
|---|---|---|
| Q2 | "Está bom (b3 pendente)" | Fica como está no #1067: pontos 1 e 2 no texto, o ponto 3 como opção b3 do F-PIL-5, pendente. |
| Q3 | "Fica ratificado (b)" | O F-PIL-2 → (b) fica. A dependência está explícita nos blocos do DFE-ADN-EMISSOR, do ASSINADOR-LOCAL e do DFE-EVENTOS. |
| Q5 | "As duas coisas" | A nota [[FIX-TESTES]] fica, e cada nó dono recebe uma linha (fold): [[I1b]], [[H2]], [[I8]] e [[FIX-AUTH-CONTA]] (este, com a refutação do "sem teste" da troca de senha). O aperto do IMO-1 está anotado no fold de 04/11 do [[H2]]. |

## Executa e forks (04/11, mais tarde no mesmo dia)

Pergunta do questionário: os 5 itens do [[FIX-TESTES]] não têm `executa` e têm forks pendentes; como escrever os prompts
das sessões? Resposta do dono (literal): **"Executa, forks na recomendação (Recomendado)"**.

- **Executa** dos 5 BRIEFs inteiros, todos os lotes, um PR por lote, **sem merge**.
- **Forks ratificados na recomendação:** F-I1B-1 (a), F-I1B-2 (a) com a queda para (b); F-VPT-1 (a), F-VPT-2 (b), F-VPT-3 (a);
  F-CRM-1 (a) com a queda para (b), F-CRM-2 (a); F-RF-2 (a), F-RF-3 (b); F-MSG-1 (a), F-MSG-2 (a1), F-MSG-3 (a).
- **Ordem:** o lote 1 do `FIX-MENSAGENS-ID-INTERNO` (imobilizado) espera a correção do IMO-1 (#1053) entrar, porque toca o mesmo
  serviço e o mesmo arquivo de teste.

**O que esta decisão não autoriza:** merge, nem os itens fora dos 5 BRIEFs.
