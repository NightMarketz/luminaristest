# RUNBOOK: W7 — sign-off de browser da higiene do wizard (FE-INCR-WIZARD-HYGIENE, item 13)

> Preparado por agente em 2026-10-15 contra a branch `claude/w7-pr1-comportamento` (PR-1). **Em branco de propósito:**
> EVIDÊNCIA, desfecho e assinatura são do executor humano — runbook sem assinatura é nulo
> (`docs/operating-manual/RUNBOOK-FORMAT.md`). Spec: `docs/accounting/FE-INCR-WIZARD-HYGIENE-brief.md` itens 1–5
> (PR-1), 6–8 (PR-2) e 10–11 (PR-3).

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

### PR-2 — i18n e paleta (itens 6–8; código = PR-2 do W7, commit: ______)

5. Trocar o idioma para **inglês** e abrir `/dashboard/setup` nas três abas (**Rápido**, **Controle Total**, **Entrevista com IA**); no Controle Total, escolher um modelo e ir até "Select the tables"; na Entrevista, ir até o painel esquerdo de funcionalidades aparecer.
   Resultado esperado: nenhum texto em português nas três abas e no painel esquerdo (o painel **direito** fica para o PR-3); a frase de ajuda no rodapé em inglês.
   EVIDÊNCIA: [um screenshot por aba + o painel esquerdo]

6. Ligar o **modo escuro** e repetir o passo 5 em português.
   Resultado esperado: fundos e textos em cinza neutro (sem tom azulado de `slate`), cards com cantos arredondados iguais aos das outras telas.
   EVIDÊNCIA: [um screenshot por aba]

### PR-3 — painel direito (itens 10–11; código = PR-3 do W7, commit: ______)

7. Em **inglês**, na **Entrevista com IA**, abrir o painel direito ("Show customization panel") com uma tabela selecionada. No modo **Manual**: clicar em **New field** e abrir o seletor de tipo; marcar/desmarcar **Visible** num campo; clicar em **Save changes**.
   Resultado esperado: nenhum texto em português no cabeçalho, nos campos, no formulário (rótulos, placeholders, as 8 opções de tipo, botões) nem na mensagem "Changes saved successfully!".
   EVIDÊNCIA: [screenshot do formulário aberto com o seletor de tipo + screenshot após salvar]

8. Ainda em inglês, trocar para **Conversational AI**, digitar uma frase e enviar.
   Resultado esperado: boas-vindas e saudação em inglês (com o nome da tabela em negrito); placeholder e "Finish conversation" em inglês. Enquanto o FE do W6 não sair, a rota `CustomizeFields` ainda dá **404** (ADR-W6 D1) — o esperado aqui é a bolha de erro **em inglês**, não uma resposta da IA.
   EVIDÊNCIA: [screenshot da conversa + a linha 404 no Network]

9. Ligar o **modo escuro** e repetir os passos 7–8 em português.
   Resultado esperado: textos em português, fundos e bordas em cinza neutro, cards dos campos e balões com cantos `rounded-2xl`.
   EVIDÊNCIA: [um screenshot do modo Manual e um do modo IA]

## Desfecho (marcar UM)
[ ] PASSOU — todos os passos com evidência conferindo com o esperado
[ ] FALHOU — passo __ divergiu; evidência da divergência colada acima; NENHUM passo seguinte foi executado após a falha
[ ] BLOQUEADO — pré-condição __ não se sustentava; execução nem começou

## Registro
- Achados no caminho (fora do escopo deste runbook): [lista ou "nenhum"]
- Atualização do artefato de rastreio: [linha de `docs/plano/nos/W7.md` atualizada com o desfecho + data]
- Assinatura do executor: ____________
