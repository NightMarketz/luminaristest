# RUNBOOK: W7 — sign-off de browser da higiene do wizard (FE-INCR-WIZARD-HYGIENE, item 13)

> Preparado por agente em 2026-10-15 contra a branch `claude/w7-pr1-comportamento` (PR-1). **Em branco de propósito:**
> EVIDÊNCIA, desfecho e assinatura são do executor humano — runbook sem assinatura é nulo
> (`docs/operating-manual/RUNBOOK-FORMAT.md`). Spec: `docs/accounting/FE-INCR-WIZARD-HYGIENE-brief.md` itens 1–5
> (PR-1). Os passos do PR-2 (idioma inglês, modo escuro) e do PR-3 (painel direito) entram neste arquivo nos PRs deles.

Executor: [nome — humano]           Data: [____]
Autorização: dono, chat, 2026-10-15 — "executa" sobre o BRIEF do W7 (nota `docs/plano/nos/W7.md`).
Rastreio: `docs/plano/nos/W7.md` (`estado_detalhe`) — registrar o desfecho ali.

---

## Pré-condições (verificar TODAS antes do passo 1)

| # | Pré-condição | Como verificar | OK? |
|---|---|---|---|
| P1 | Código = PR-1 do W7 (commit: ______) em `main` ou a branch checada (anote qual) | `git branch --show-current` / `git log --oneline -3` | [ ] |
| P2 | Servidor sobe e `OPENAI_API_KEY` real em `server/.env` (a entrevista chama o modelo) | `curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api` → `200` | [ ] |
| P3 | Front em **build de produção** (`cd my-app && npm run build && npm run start`), não `next dev` | `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/` → `200` | [ ] |
| P4 | Dois usuários **sem tabelas** (U1 e U2) | `GET /api/dynamic-tables` → `data: []` para cada um | [ ] |
| P5 | DevTools na aba Network, filtro `ChatInterview` ou `create` | — | [ ] |

## Passos

EVIDÊNCIA é sempre artefato colado/anexado (screenshot, lista do Network, corpo da requisição) — nunca frase.

1. Com U1, abrir `/dashboard/setup` → aba **Entrevista com IA**.
   Resultado esperado: **uma** bolha de saudação; **1** `POST ChatInterview` com `"stage":"GREETING"` no Network; não há botão **Debug** ao lado do título.
   EVIDÊNCIA: [screenshot da tela + lista do Network]

2. Conduzir a entrevista até a pergunta fechada de regime/porte (antes de clicar em criar). **Parar o servidor** (Ctrl+C no `server`). Responder a pergunta e clicar em criar.
   Resultado esperado: modal **"Erro ao criar projeto"** com o botão **"Tentar novamente"**.
   EVIDÊNCIA: [screenshot do modal]

3. **Subir o servidor de novo** e clicar em **Tentar novamente**.
   Resultado esperado: a página **não recarrega** (a aba Network não mostra novo documento `setup`); sai **1** `POST /api/dashboard/create` com o **mesmo corpo** do passo 2 (`suiteKey`, `unit.name`, `fiscal`); o sistema é criado e a tela vai para `/dashboard`.
   EVIDÊNCIA: [corpo das duas requisições `create` (aba Payload) + lista do Network]

4. Com U2, abrir `/dashboard/setup` → **Entrevista com IA** em **duas abas** (A e B) e conduzir as duas até a pergunta de regime/porte. Na aba A, responder e criar (sucesso). Na aba B, responder e criar.
   Resultado esperado: na aba B, modal com **"Seu sistema já foi criado."**, **sem** "Tentar novamente", e o link **"Ir para o painel"** que leva a `/dashboard`.
   EVIDÊNCIA: [screenshot do modal da aba B + resposta 403 no Network]

## Desfecho (marcar UM)
[ ] PASSOU — todos os passos com evidência conferindo com o esperado
[ ] FALHOU — passo __ divergiu; evidência da divergência colada acima; NENHUM passo seguinte foi executado após a falha
[ ] BLOQUEADO — pré-condição __ não se sustentava; execução nem começou

## Registro
- Achados no caminho (fora do escopo deste runbook): [lista ou "nenhum"]
- Atualização do artefato de rastreio: [linha de `docs/plano/nos/W7.md` atualizada com o desfecho + data]
- Assinatura do executor: ____________
