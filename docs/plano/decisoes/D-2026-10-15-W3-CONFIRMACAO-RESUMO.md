---
id: "D-2026-10-15-W3-CONFIRMACAO-RESUMO"
tipo: "decisao"
dominio: "plataforma"
titulo: "F-W3-1 ratificado: confirmação do resumo por botões + classificação estruturada (3 saídas); negar refaz o resumo; IDENTIFYING_ENTITIES entra junto"
estado: "decided"
autorizacao: "dono, 2026-10-15, chat (via sessão-mãe): \"Prepara a decisão do F-W3-1 (W3, gates determinísticos da entrevista) — sessao-planejamento, sem código\"; questionário do mesmo dia: F-W3-1 → \"Botões + IA estruturada (Recomendado)\"; negação → \"Volta e refaz o resumo (Recomendado)\"; entidades → \"Sim, mesma correção (Recomendado)\". Sem 'executa': o BRIEF fica em esboço"
atualizado: "2026-10-15"
---
# D-2026-10-15-W3-CONFIRMACAO-RESUMO — F-W3-1 (gate de confirmação do resumo)

**Estado:** `decided`
**Autorização:** dono, 2026-10-15, chat. Escopo: **decidir** o F-W3-1 e esboçar o BRIEF. **Não autoriza código**
(sem "executa"): o [[W3]] continua `inflight` e o BRIEF [`WIZARD-W3-CONFIRMACAO-RESUMO-brief.md`](../../accounting/WIZARD-W3-CONFIRMACAO-RESUMO-brief.md)
fica como esboço até nova autorização.

## Problema (medido no código em 15/10, `origin/main` 8ba1ed8f)

- `server/src/features/interview/InterviewService/InterviewService.ts:144` — `isCompleted = checkResult?.toLowerCase() === 'true'`.
  Uma 2ª chamada à IA (`CONFIG.MODELS.CHAT`, texto livre) tem que devolver exatamente `true`; "True.", "Verdadeiro"
  ou uma frase contam como **não**, e o usuário fica preso em `CONFIRMING_BUSINESS`.
- A mesma linha serve `IDENTIFYING_ENTITIES` (`PromptConfig.ts:28`) — mesmo defeito.
- Negar o resumo não tem caminho: o `systemPrompt` de `CONFIRMING_BUSINESS` (`PromptConfig.ts:22`) só manda
  responder "Obrigado", e o estágio não volta à descoberta.
- Fato novo desde o fork de 07/09: `OpenAIService.classifyIntoEnum` (structured outputs `json_schema` strict,
  `gpt-4o-mini`; BE-INCR-KIT-SETOR-EMENDA-1 PR-K3, 13/10) já é o canônico de "classificar num conjunto fechado".

## Decisões

| # | Tema | Decisão | Palavras |
|---|---|---|---|
| 1 | F-W3-1 · como decidir a confirmação | **(c) botões + classificação estruturada:** botões "Sim, está certo" / "Não, corrigir" decidem sem IA (mesmo desenho da parte (b), #455/#477); texto digitado vai ao `classifyIntoEnum` com 3 saídas `confirmed` / `rejected` / `unclear`. Entrega BE → FE (o BE sozinho já fecha o bug) | *"Botões + IA estruturada (Recomendado)"* |
| 2 | Negação do resumo | **Volta a `DISCOVERING_BUSINESS`** com a correção no histórico; a IA refaz o `SUMMARY:` e pergunta de novo | *"Volta e refaz o resumo (Recomendado)"* |
| 3 | `IDENTIFYING_ENTITIES` | **Entra na mesma correção** (classificação estruturada; sem botões — a pergunta é aberta) | *"Sim, mesma correção (Recomendado)"* |

Rejeitadas: (a) só classificação estruturada, sem botões — a decisão continuaria passando pela IA; (b) regex
tolerante — remendo, a IA pode responder uma frase e o defeito volta.

## Efeito no plano

- [[W3]]: F-W3-1 sai de "pendente" para "decidido, BRIEF em esboço". `estado` não muda (`inflight`), `autorizacao`
  do nó não se amplia — executar exige nova autorização citável do dono.
- Forks de desenho que sobram (F-W3-C1..C3) estão no BRIEF, **RATIFICAÇÃO PENDENTE**.
