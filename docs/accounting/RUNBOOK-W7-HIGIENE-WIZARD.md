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

---

## Execução 2026-11-11 — AI tester — FALHOU no passo 5 (texto em português com a UI em inglês)

Executor: agente claude-sonnet-5-5, AI tester           Data: 2026-11-11 (17:20–17:55 -03:00)
Autorização (citada literalmente): dono, chat, 2026-11-11: *"rode todos os runbooks que são possíveis"*; regra de assinatura em
`docs/operating-manual/RUNBOOK-FORMAT.md` §Fronteira (emenda de 2026-10-29), só neste runbook e nesta execução.

**Ambiente:** commit `54e5086d0` (`origin/main` no início; branch `claude/rb-dfe-w7-318a11`), que contém W7 PR-1 (#716), PR-2 (#717) e PR-3 (#722)
(`git merge-base --is-ancestor 9e5fdf368 HEAD` → verdadeiro). `server` de produção (`npm run build` + `node dist/server.js`) em `:4271`, front
`next build` + `next start -H 127.0.0.1 -p 3271`, banco descartável novo (`kro-rb.db`, migrações + seed contábil). Runner `scripts/runbook-tela.mjs`
(Chromium sem janela, um perfil de navegador por usuário). O DevTools (P5) foi trocado pelo log de rede do runner e, no passo 3, por um gancho de
`fetch`/XHR instalado na página. Senhas dos usuários de teste geradas na sessão e não registradas aqui.

### Pré-condições

| # | Resultado | Evidência |
|---|---|---|
| P1 | **OK** | `git rev-parse --short HEAD` → `54e5086d0`; PR-1/2/3 do W7 ancestrais do HEAD |
| P2 | **OK** | `OPENAI_API_KEY` presente e não vazia em `server/.env` (não impressa); `curl http://127.0.0.1:4271/api` → `200`; o modelo respondeu de verdade: `POST /api/dashboard/ai/ChatInterview -> 200` com bolhas diferentes a cada rodada ([rede](runbook-evidence/W7-2026-11-11/u1-net.txt)) |
| P3 | **OK** | `curl http://127.0.0.1:3271/` → `200`, `next start` sobre `next build` |
| P4 | **OK** (grau: verificado para `w7-ua` e `w7-ub`; inferido para `w7-ue` e `w7-uf`) | `POST /api/users -> 201` e `GET /api/dynamic-tables -> 200 []` para `w7-ua` e `w7-ub` logo após o cadastro. `w7-ue` (U1 do passo 1–3) e `w7-uf` (passo 5) foram criados do mesmo jeito (`201`) e só ganharam sistema dentro da execução |
| P5 | Trocado pelo log de rede do runner | `u1-net.txt`, `u2-net.txt`, `u3-net.txt` |

### Passos

**Passo 1 — PASSOU** (U1 = `w7-ue`). `/dashboard/setup` → aba "AI Interview" (a UI abre em **inglês** para o usuário novo; o roteiro está em português, desvio de idioma
só). Uma bolha de saudação, sem botão Debug (`grep -ci debug passo1-entrevista.txt` → 0), e um único `POST ChatInterview` com `"stage":"GREETING"` na abertura:
```text
POST /api/dashboard/ai/ChatInterview -> 200  req: {"messages":[],"stage":"GREETING","locale":"en"}
(tela) AI interview · Hi! To get started, please tell me about your business or project so I can understand how best to help you set up the system. · Send
```
[print](runbook-evidence/W7-2026-11-11/passo1-entrevista.png) · [texto](runbook-evidence/W7-2026-11-11/passo1-entrevista.txt) · [rede](runbook-evidence/W7-2026-11-11/u1-net.txt)

**Passo 2 — PASSOU.** Entrevista conduzida (3 respostas) até a pergunta fechada de regime/porte ("Create the system now" → "Confirm" → formulário fiscal; marquei
"Simples Nacional" e porte "No"). O servidor foi **parado** (kill do processo que escuta `:4271`, em vez de Ctrl+C; `ERR_CONNECTION_REFUSED` no console), e o clique em
"Create system" abriu o modal com título e botão em inglês ("Error creating project" / "Try again"):
```text
(modal) Error creating project · Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente. · Try again
```
[print do formulário](runbook-evidence/W7-2026-11-11/passo2-antes-de-criar.png) · [print do modal](runbook-evidence/W7-2026-11-11/passo2-modal-erro.png) ·
[texto](runbook-evidence/W7-2026-11-11/passo2-modal-erro.txt). **Achado (fora do passo):** o corpo do modal está em português com a UI em inglês
(`my-app/lib/api/api-client.ts:22`); lacuna `L-20261111-204322-8a05`.

**Passo 3 — PASSOU.** Servidor religado; "Try again" clicado na mesma página. Dump do gancho de `fetch` da página, antes de ela navegar:
```text
{"marca":"mesma-pagina","navegacoes":1,"create":[
 {"via":"fetch","url":"http://127.0.0.1:4271/api/dashboard/create","body":"{\"suiteKey\":\"beautySalon\",\"unit\":{\"name\":\"beautySalon\"},\"fiscal\":{\"regime\":\"SIMPLES\",\"grandePorte\":false},\"modules\":[\"CRM-0\",…,\"GES-META\"]}"},
 {"via":"fetch","url":"http://127.0.0.1:4271/api/dashboard/create","body":"<idêntico ao anterior>"}]}
POST /api/dashboard/create -> 201   (2ª tentativa, a que o servidor respondeu)   |   (tela) location.pathname = /dashboard
```
A marca `mesma-pagina` (variável da janela) sobreviveu e `navegacoes` = 1: a página não recarregou. Corpos das duas tentativas idênticos (`suiteKey`, `unit.name`, `fiscal`, `modules`), 1 `create` com
resposta, e o sistema foi criado com a tela indo a `/dashboard`.
[print](runbook-evidence/W7-2026-11-11/passo3-depois-do-retry.png) · [rede](runbook-evidence/W7-2026-11-11/u1-net.txt)

**Passo 4 — PASSOU, com desvio de método** (U2 = `w7-ub`). Só há uma aba no runner. A "aba A" foi a **mesma requisição `POST /api/dashboard/create`**, feita do shell com o token do U2 e o mesmo
corpo que a tela envia (`201`); a "aba B" é a tela, que estava na pergunta fiscal desde antes. O clique em "Create system" na B:
```text
POST /api/dashboard/create -> 403  req: {"suiteKey":"beautySalon","unit":{"name":"beautySalon"},"fiscal":{"regime":"SIMPLES","grandePorte":false},"modules":[…]}
(modal) Error creating project · Your system has already been created. · Go to dashboard      (sem "Try again")
(clique em "Go to dashboard") location.pathname = /dashboard
```
[print do modal](runbook-evidence/W7-2026-11-11/passo4-modal-abaB.png) · [print após o link](runbook-evidence/W7-2026-11-11/passo4-depois-ir-ao-painel.png) ·
[texto](runbook-evidence/W7-2026-11-11/passo4-modal-abaB.txt) · [rede](runbook-evidence/W7-2026-11-11/u2-net.txt)

**Passo 5 — FALHOU** (U3 = `w7-uf`, UI em inglês, nenhum passo seguinte executado). Há texto em português nas abas e no painel esquerdo:
- aba **Rápido** (e primeira tela do **Controle Total**): cartões `ERP para Clínica de Estética`, `Módulo CRM` e `CRM completo: funil de leads, propostas, atividades, contas e contatos.`
  (`CrmModulePreset.ts:23`, `AestheticClinicPreset.ts:28`) — [texto](runbook-evidence/W7-2026-11-11/passo5-a-rapido.txt) · [print](runbook-evidence/W7-2026-11-11/passo5-a-rapido.png);
- **Entrevista com IA** → Customize → painel esquerdo "System features": cada tabela com a descrição `Tabela de LeadPipelines`, `Tabela de Leads`, `Tabela de CrmContacts`, `Tabela de Campaigns`…
  (`server/src/features/interview/CustomizationService/TableExtractor.ts:42`) — [print](runbook-evidence/W7-2026-11-11/passo5-c-entrevista-painel-esquerdo.png).
- Conforme: aba **Controle Total** até "Select the tables" (módulos, "Unit name", "Back", "Finish and create system" em inglês) —
  [print](runbook-evidence/W7-2026-11-11/passo5-b-controle-total-2.png); a frase de ajuda e os rótulos da Entrevista (bolhas, "Create the system now", "Customize", "Suggested modules") em inglês.
Lacunas: `L-20261111-204322-f834` (TableExtractor) e `L-20261111-204322-37cb` (presets). Interpretação: o runbook espera "nenhum texto em português nas três abas e no painel esquerdo";
os nomes e descrições dos presets vêm do servidor, não do i18n do front, então o PR-2 não os alcançou. Pode ser decisão de produto (nome de preset é dado), por isso a lacuna vai como `defeito` para triagem do maestro.

**Passos 6–9 — NÃO EXECUTADOS** (regra do FALHOU: nenhum passo após a falha).

### Desfecho (execução 2026-11-11)
[x] FALHOU — passo 5 divergiu; evidência colada acima; NENHUM passo seguinte foi executado após a falha. Passos 1–4 (PR-1) passaram.

### Registro (execução 2026-11-11)
- **Desvios de roteiro:** (a) UI em inglês no lugar de português nos passos 1–4 (idioma padrão do usuário novo); (b) servidor parado por kill do processo, não Ctrl+C; (c) passo 4 com a aba A
  substituída pela mesma requisição via shell; (d) DevTools → log do runner + gancho de `fetch`. As primeiras tentativas do passo 2–3 foram descartadas (a 1ª e a 2ª porque o servidor não parou: o kill
  que usei falhou; a 3ª porque o dump do gancho tinha erro de regex); cada uma consumiu um usuário (`w7-ua`/`w7-uc`/`w7-ud`), sem efeito sobre as evidências finais.
- **Achados fora do escopo (3 lacunas na caixa do maestro):** `L-20261111-204322-f834` (`TableExtractor.ts:42`, "Tabela de …" em português), `L-20261111-204322-37cb` (nomes/descrições dos presets
  em português, `CrmModulePreset.ts:23`), `L-20261111-204322-8a05` (`api-client.ts:22`, mensagem de rede em português no modal de erro). A caixa vem do script do commit `cf863ba72`
  (ainda fora de `main`).
- Rastreio: `docs/plano/nos/W7.md` (`estado_detalhe`) atualizado nesta execução.
- Assinatura do executor: agente claude-sonnet-5-5, AI tester, sob autorização do dono (chat, 2026-11-11). A assinatura atesta a execução e a conferência da evidência. Não substitui oráculo humano
  (o julgamento de produto sobre nome de preset em português).
