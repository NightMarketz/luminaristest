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
   Resultado esperado: nenhum texto em português no cabeçalho, nos campos, no formulário (rótulos, placeholders, as opções de tipo — 7 hoje: texto, número, sim/não, data, data e hora, e-mail e telefone —, botões) nem na mensagem "Changes saved successfully!".
   EVIDÊNCIA: [screenshot do formulário aberto com o seletor de tipo + screenshot após salvar]

8. Ainda em inglês, trocar para **Conversational AI**, digitar uma frase e enviar.
   Resultado esperado: boas-vindas e saudação em inglês (com o nome da tabela em negrito); placeholder e "Finish conversation" em inglês. Com o FE do W6 já em `main`, `CustomizeFields` responde **200** (o 404 do ADR-W6 D1 acabou): o esperado é a proposta da IA aparecer (cartão "AI proposal", botões Discard/Apply em inglês). O **texto que o modelo escreve** e o rótulo que propõe seguem o idioma que o servidor receber; hoje a rota não recebe `locale` (lacuna `L-20261111-214837-3484`).
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


## Execução 2026-11-11 (2ª) — AI tester — PASSOU nos passos 1–3 e 5–9, com roteiro emendado no passo 5 (passo 4 não reexecutado)

Executor: agente claude-sonnet-5-5, AI tester           Data: 2026-11-11 (18:10–19:00 -03:00)
Autorização (citada): dono, chat, 2026-11-11, pedido de destravar e corrigir o que falhou nos runbooks H2/W7 (a correção mínima das lacunas `L-20261111-204322-f834/-37cb/-8a05` e a reexecução do passo 5 ao 9); regra de assinatura em `RUNBOOK-FORMAT.md` §Fronteira, só neste runbook e nesta execução.

**Ambiente:** branch `claude/fix-w7-i18n-wizard-8899c2` (código = `main` + o fix `useAiInterview`/`onboardingErrorNetwork`), `server` de produção (`npm run build` + `node dist/server.js`) em `127.0.0.1:4571`, front `next build` + `next start -H 127.0.0.1 -p 3571`, banco descartável novo (`w7-2.db`: migrações + seed contábil + binding do salão, só para o boot subir). `OPENAI_API_KEY` presente em `server/.env` (não impressa; o modelo respondeu de verdade). Runner `scripts/runbook-tela.mjs` (Chromium sem janela, 1280×900, um perfil por usuário). Usuários `w7-ga` (passos 1–3) e `w7-gb` (5–9), criados por `POST /api/users` → `201`, sem tabelas.

**Análise antes do código (leitura):** o roteiro esperava "nenhum texto em português" no passo 5, mas o contrato (BRIEF itens 6–7) só manda passar pelo `t()` as strings do front e diz que texto do servidor não é traduzido. Só a lacuna `-8a05` é do front (item 7: fallback local vira chave) e foi corrigida (teste-guarda vermelho em commit separado, depois o fix). `-37cb` (nome/descrição de preset: o endpoint não recebe `locale`; o salão já é inglês, clínica e CRM são português) e `-f834` (`Tabela de <nome>` é gravada no estado da sessão e entra em 4 prompts da IA) têm duas leituras legítimas de produto/projeto: ficam com o dono (estado `com-dono` na caixa) e o roteiro do passo 5 foi emendado para excluí-las até a resposta.

### Passos

**Passo 1 — PASSOU** (`w7-ga`, UI em inglês). Uma bolha de saudação, sem Debug; `POST ChatInterview … "stage":"GREETING","locale":"en"` único na abertura. [print](runbook-evidence/W7-2026-11-11-2/passo1-entrevista.png) · [texto](runbook-evidence/W7-2026-11-11-2/passo1-entrevista.txt) · [rede](runbook-evidence/W7-2026-11-11-2/u1-net.txt)

**Passo 2 — PASSOU, e o achado `-8a05` fechado.** Entrevista até a pergunta fiscal ("Simples Nacional", porte "No"); o processo que escuta `:4571` foi finalizado (`taskkill`; `curl` → `000`); "Create system" abriu o modal, agora com o corpo em inglês:
```text
(modal) Error creating project · Could not reach the server. Check your connection and try again. · Try again
```
[antes](runbook-evidence/W7-2026-11-11-2/passo2-antes-de-criar.png) · [modal](runbook-evidence/W7-2026-11-11-2/passo2-modal-erro.png) · [texto](runbook-evidence/W7-2026-11-11-2/passo2-modal-erro.txt). (Na 1ª execução o corpo era `Não foi possível conectar ao servidor…`.)

**Passo 3 — PASSOU.** Servidor religado (`curl` → `200`); "Try again" na mesma página:
```text
[eval] {"marca":"mesma-pagina","path":"/dashboard","nav":1}
POST /api/dashboard/create -> 201  req: {"suiteKey":"beautySalon","unit":{"name":"beautySalon"},"fiscal":{"regime":"SIMPLES","grandePorte":false},"modules":["CRM-0",…]}
```
A marca da janela sobreviveu e há 1 navegação: a página não recarregou; o `create` com resposta é um só e o sistema foi criado (`/dashboard`). [print](runbook-evidence/W7-2026-11-11-2/passo3-depois-do-retry.png) · [rede](runbook-evidence/W7-2026-11-11-2/u1-net.txt)

**Passo 4 — NÃO REEXECUTADO.** A mudança de código está só no ramo "sem resposta do servidor" (`useAiInterview.ts`); o ramo do 403 (modal "Your system has already been created.") é outro e segue coberto pelo teste `item 4` e pela 1ª execução. Dito aqui para que ninguém leia como reexecutado.

**Passo 5 — PASSOU com a emenda de roteiro** (`w7-gb`, inglês, modo claro). Aba Rápido, Controle Total até "Next: customize tables" e Entrevista até o painel esquerdo: títulos, abas, botões, frases de ajuda, "Suggested modules", "System features", "Core", "Fields: …" em inglês. (1ª passagem desta execução: restavam só os textos excluídos pela emenda — `ERP para Clínica de Estética`, `Módulo CRM`, `Tabela de <nome>` — e por isso o passo foi reexecutado depois da localização do catálogo, ver "Passo 5 reexecutado" no fim.) [rápido](runbook-evidence/W7-2026-11-11-2/passo5-a-rapido.png) · [controle total](runbook-evidence/W7-2026-11-11-2/passo5-b-controle-total-2.png) · [entrevista](runbook-evidence/W7-2026-11-11-2/passo5-c-entrevista-escolha.png) · [painel esquerdo](runbook-evidence/W7-2026-11-11-2/passo5-c-entrevista-painel-esquerdo.png) ([texto](runbook-evidence/W7-2026-11-11-2/passo5-c-entrevista-painel-esquerdo.txt))

**Passo 6 — PASSOU** (português, `theme=dark`, `class=dark`). Fundos e textos em cinza neutro, cards com cantos arredondados. [rápido](runbook-evidence/W7-2026-11-11-2/passo6-a-rapido-escuro.png) · [controle total](runbook-evidence/W7-2026-11-11-2/passo6-b-controle-total-escuro.png) · [entrevista](runbook-evidence/W7-2026-11-11-2/passo6-c-entrevista-escuro.png). (A 1ª tentativa saiu clara por eu ter alternado o tema duas vezes; refeita com `localStorage.theme=dark` conferido por `eval`.)

**Passo 7 — PASSOU** (inglês). Painel direito aberto na tabela `LeadProposals`, modo Manual: "Add new field" com "Technical name / Label / Data type / Required field / Cancel / Add" e o seletor com as 7 opções (`Text, Number, Yes/No, Date, Date and time, Email, Phone`); `Visible` desmarcado em um campo; "Save changes" → `Changes saved successfully!`; rede: `POST CustomizeFields {"kind":"manual","changes":[{"action":"setHidden","name":"estimatedCloseDate","hidden":true}]} -> 200`. [formulário](runbook-evidence/W7-2026-11-11-2/passo7-formulario-novo-campo.png) · [após salvar](runbook-evidence/W7-2026-11-11-2/passo7-depois-de-salvar.png) · [rede](runbook-evidence/W7-2026-11-11-2/u3-net.txt)

**Passo 8 — PASSOU, com o esperado emendado.** "Conversational AI": boas-vindas em inglês ("Welcome to smart customization!", `LeadProposals` em negrito), placeholder `Describe what you need…`, "Back to manual mode". O 404 do roteiro acabou (W6 em `main`): `POST CustomizeFields {"kind":"message",…} -> 200`, cartão "AI proposal" com Discard/Apply. **Achado:** a resposta do modelo veio em português (`Proponho adicionar um campo para armazenar notas das propostas.`, rótulo `Notas da Proposta`) com a UI em inglês, porque a rota não recebe `locale` — lacuna `L-20261111-214837-3484`. [print](runbook-evidence/W7-2026-11-11-2/passo8-conversa.png) · [texto](runbook-evidence/W7-2026-11-11-2/passo8-conversa.txt)

**Passo 9 — PASSOU** (português, escuro). Modo Manual: "Novo Campo" aberto, `Alterações salvas com sucesso!`; modo "IA Humanizada": pergunta, resposta e "Proposta da IA / Descartar / Aplicar" em português, cinza neutro, balões arredondados. [novo campo](runbook-evidence/W7-2026-11-11-2/passo9-manual-novo-campo-escuro.png) · [salvo](runbook-evidence/W7-2026-11-11-2/passo9-manual-depois-de-salvar-escuro.png) · [modo IA](runbook-evidence/W7-2026-11-11-2/passo9-modo-ia-escuro.png)

### Desfecho (execução 2026-11-11, 2ª)
[x] PASSOU — passos 1–3 e 5–9 com evidência conferindo com o esperado **do roteiro emendado**; o passo 4 não foi reexecutado (declarado acima). (Atualização: o passo 5 foi reexecutado depois da localização do catálogo e passou sem a emenda; ver o fim.) Texto original: o passo 5 só fechava com a emenda; se o dono decidisse que o catálogo de presets e o `Tabela de …` devem seguir o idioma, as lacunas `-37cb`/`-f834` reabrem esse passo.

### Registro (execução 2026-11-11, 2ª)
- **Desvios de roteiro:** UI em inglês nos passos 1–3 e 5–8 (idioma padrão do usuário novo); servidor parado por `taskkill` (não Ctrl+C); DevTools → log de rede do runner; passo 4 não reexecutado; modo escuro refeito uma vez (descrito no passo 6).
- **Achados fora do escopo (caixa do maestro):** `L-20261111-214837-3484` (`FieldCustomizationService/index.ts:211`, `CustomizeFields` sem `locale`), `L-20261111-214837-d745` (`FloatingChatBubble.tsx:20`, `aria-label="Abrir chat"` em português na UI em inglês). `L-20261111-204322-37cb` e `-f834` passaram a `com-dono` (pergunta de produto). `L-20261111-204322-8a05` corrigida neste PR.
- Rastreio: `docs/plano/nos/W7.md` (`estado_detalhe`) atualizado.
- Assinatura do executor: agente claude-sonnet-5-5, AI tester, sob autorização do dono (chat, 2026-11-11). Atesta a execução e a conferência da evidência; não substitui oráculo humano (a decisão de produto sobre idioma do catálogo e a leitura do passo 5 emendado são do dono).

### Passo 5 reexecutado depois da localização do catálogo (2026-11-11, mesmo PR) — PASSOU, sem emenda
Decisão do dono (chat, 2026-11-11): *"Sim, localizar"*. Corrigidas `L-20261111-204322-37cb` (`presetText.ts`; `GET /dashboard/presets?locale=`; o front manda o idioma da UI) e `-f834` (`TableExtractor` usa `INTERVIEW_TEXT[locale].tableFallbackDescription`; a sessão da entrevista recebe o `locale`). Server e front reconstruídos da branch (`npm run build`, `next build`/`next start` em `127.0.0.1:4571/3571`), mesmo banco descartável, usuário `w7-gb`, inglês, modo claro (`theme=light`, `lang=en`).
```text
grep -c "Tabela de\|ERP para\|Módulo CRM\|CRM completo"  passo5-a-rapido.txt passo5-b-controle-total-2.txt passo5-c-entrevista-escolha.txt passo5-c-entrevista-painel-esquerdo.txt   ->  0 · 0 · 0 · 0
(tela, aba Rápido)  Advanced Beauty Salon ERP · Aesthetic Clinic ERP · CRM Module
(tela, painel esquerdo)  System: Advanced Beauty Salon ERP · Table of LeadPipelines · Table of LeadStages · Table of Leads
```
Os arquivos `passo5-*` da pasta de evidência foram regravados por esta passagem: [rápido](runbook-evidence/W7-2026-11-11-2/passo5-a-rapido.png) · [controle total](runbook-evidence/W7-2026-11-11-2/passo5-b-controle-total-2.png) · [entrevista](runbook-evidence/W7-2026-11-11-2/passo5-c-entrevista-escolha.png) · [painel esquerdo](runbook-evidence/W7-2026-11-11-2/passo5-c-entrevista-painel-esquerdo.png). A emenda do passo 5 deixa de ser necessária; o texto do roteiro volta a valer como foi escrito (o servidor continua sem traduzir os rótulos de tabela/campo, que o roteiro nunca cobriu). Assinatura: agente claude-sonnet-5-5, AI tester, sob autorização do dono (chat, 2026-11-11).

## Execução 2026-11-12 (3ª) — AI tester — FALHOU no passo 5 (passos 1–4 PASSARAM; 6–9 não executados)

Executor: agente claude-sonnet-5-5, AI tester           Data: 2026-11-12
Autorização (citada): dono, chat, 2026-11-12, *"Pode reexecutar e seguir com sign-off humano por mim, preciso que tenha a assinatura AI tester antes de eu fazer tbm"*; regra de assinatura em `RUNBOOK-FORMAT.md` §Fronteira, só neste runbook e nesta execução. A assinatura atesta a execução, não substitui o sign-off humano do dono.

**Ambiente:** código = `claude/fix-w7-i18n-wizard-8899c2` @ `e719ab9d2` (PR #1240, com a localização do catálogo e sem a emenda do passo 5), checado nesta worktree. `server` de produção (`tsc` + `node dist/server.js`) em `127.0.0.1:4571`; front `next build` (com `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:4571/api`) + `next start -H 127.0.0.1 -p 3571`; banco descartável novo (migrações + seed contábil de dev + binding do salão); `OPENAI_API_KEY` real do `server/.env` (não impressa; o modelo respondeu). Runner `scripts/runbook-tela.mjs` (Chromium sem janela, 1280×900) e, só no passo 4 (duas abas), um script avulso do scratchpad. Usuários novos sem tabelas, criados por `POST /api/users` → `201`: `w7-ha` (passos 1–3), `w7-hc` (passo 4), `w7-hb` (passo 5). UI em inglês (idioma padrão do usuário novo), modo claro.

**Passo 1 — PASSOU.** Uma bolha de saudação; um `POST ChatInterview … "stage":"GREETING","locale":"en"` na abertura; sem botão Debug (`grep -ci debug` no texto da tela → 0). [print](runbook-evidence/W7-2026-11-12/passo1-entrevista.png) · [texto](runbook-evidence/W7-2026-11-12/passo1-entrevista.txt) · [rede](runbook-evidence/W7-2026-11-12/passos1-3-net.txt)

**Passo 2 — PASSOU.** Entrevista até a pergunta fiscal (Simples Nacional, porte "No"); servidor finalizado (`taskkill`; `curl` → `000`); "Create system" abriu o modal `Error creating project · Could not reach the server. Check your connection and try again. · Try again`. [antes](runbook-evidence/W7-2026-11-12/passo2-antes-de-criar.png) · [modal](runbook-evidence/W7-2026-11-12/passo2-modal-erro.png) · [texto](runbook-evidence/W7-2026-11-12/passo2-modal-erro.txt)

**Passo 3 — PASSOU.** Servidor religado (`curl` → `200`); "Try again" na mesma página: `[eval] {"marca":"mesma-pagina","path":"/dashboard","nav":1}` e um `POST /api/dashboard/create -> 201` com o mesmo corpo (`suiteKey`, `unit.name`, `fiscal`) do passo 2. [print](runbook-evidence/W7-2026-11-12/passo3-depois-do-retry.png) · [rede](runbook-evidence/W7-2026-11-12/passos1-3-net.txt)

**Passo 4 — PASSOU (reexecutado desta vez).** `w7-hc` em duas abas até a pergunta fiscal; aba A cria (`POST create -> 201`); aba B cria e recebe `403 {"error":"Forbidden","message":"Setup já foi concluído. Este usuário já possui tabelas."}`. Modal da aba B: `Error creating project · Your system has already been created.`, **sem** "Try again", só o link `Go to dashboard` (`href=/dashboard`), que levou a `/dashboard`. [aba A](runbook-evidence/W7-2026-11-12/passo4-aba-A-sucesso.png) · [aba B](runbook-evidence/W7-2026-11-12/passo4-aba-B-modal.png) · [rede](runbook-evidence/W7-2026-11-12/passo4-net.txt)

**Passo 5 — FALHOU.** Aba Rápido e painel esquerdo da Entrevista em inglês, sem português. Em **Controle Total**, ao escolher o modelo (`Advanced Beauty Salon ERP`), o cartão mostra o selo **`SELECIONADO`**, em português, com a UI em inglês:
```text
passo5-b1-controle-total-modelo.txt, linha 20:  SELECIONADO
my-app/features/interview/setup/TotalControlSetup.tsx:225:  Selecionado   (literal, fora do t(); .uppercase pelo CSS)
```
É texto do front, do contrato do item 6 do BRIEF (strings do front passam pelo `t()`), não do servidor. A tela "Select the tables" (`passo5-b2`) está limpa. [Rápido](runbook-evidence/W7-2026-11-12/passo5-a-rapido.png) · [modelo escolhido — a divergência](runbook-evidence/W7-2026-11-12/passo5-b1-controle-total-modelo.png) · [tabelas](runbook-evidence/W7-2026-11-12/passo5-b2-controle-total-tabelas.png) · [entrevista](runbook-evidence/W7-2026-11-12/passo5-c1-entrevista-escolha.png) · [painel esquerdo](runbook-evidence/W7-2026-11-12/passo5-c2-entrevista-painel-esquerdo.png)

**Correção ao registro das execuções de 11/11:** o selo existe em `main` (`Selecionado` em `TotalControlSetup.tsx:225`) e as duas passagens de 11/11 não o viram porque a evidência do Controle Total capturou só a tela seguinte ("Select the tables"), não a de "modelo escolhido" que o passo 5 manda atravessar. Os PASSOU do passo 5 de 11/11 ficam sem efeito a partir daqui.

**Passos 6–9 — NÃO EXECUTADOS** (regra do runbook: nenhum passo segue após a falha).

### Desfecho desta execução
[ ] PASSOU
[x] FALHOU — passo 5 divergiu (`SELECIONADO` em português no Controle Total, UI em inglês); evidência acima; nenhum passo seguinte foi executado.
[ ] BLOQUEADO

- **Achados fora do escopo:** `Abrir chat` (`aria-label`, botão flutuante) segue em português na UI em inglês — já em PR próprio (#1243, `L-20261111-214837-d745`).
- Assinatura do executor: agente claude-sonnet-5-5, AI tester, sob autorização do dono (chat, 2026-11-12). Atesta a execução e a conferência da evidência; não substitui o oráculo humano.

## Execução 2026-11-13 (4ª) — AI tester — PASSOU nos passos 5–9, com um achado no passo 6 (passos 1–4 não reexecutados)

Executor: agente claude-sonnet-5-5, AI tester           Data: 2026-11-13
Autorização (citada): dono, chat, 2026-11-12, *"Pode reexecutar e seguir com sign-off humano por mim, preciso que tenha a assinatura AI tester antes de eu fazer tbm"*; dono, chat, 2026-11-13, *"Corrigir e reexecutar"* (a correção do selo do passo 5 e a reexecução do passo 5 ao 9); dono, chat, 2026-11-13, no passo 6, sobre o campo de texto em modo escuro: *"Achado e seguir 6–9"*. Regra de assinatura em `RUNBOOK-FORMAT.md` §Fronteira, só neste runbook e nesta execução. A assinatura atesta a execução, não substitui o sign-off humano do dono.

**Correção feita antes de reexecutar (o que falhou no passo 5 da 3ª execução).** O selo do cartão do modelo em Controle Total era o literal `Selecionado` em `TotalControlSetup.tsx:225`. Agora sai de `t('onboardingTotalControlSelected')` (`en`: "Selected"; `pt`: "Selecionado"; 446 chaves nos dois lados). Teste-guarda escrito primeiro e visto **vermelho** (`my-app/features/interview/setup/__tests__/totalControlSelectedBadge.test.tsx`: com `t` devolvendo a chave, o selo tem de ser `onboardingTotalControlSelected` e `Selecionado` não pode aparecer; falhou por não achar a chave), depois verde junto com os outros 4 arquivos de `features/interview/setup` (25 testes); `npx tsc --noEmit` em `my-app` limpo.

**Ambiente:** código = `e719ab9d2` (head do PR #1240) **mais** a correção acima, ainda sem commit, nesta worktree. `server` de produção (`npm run build` + `node dist/server.js`) em `127.0.0.1:4571`; front `next build` (`NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:4571/api`) + `next start -H 127.0.0.1 -p 3571`; banco descartável novo (`migrate deploy`, `db:seed:accounting --i-have-a-backup` — banco vazio, a flag não protege nada — e `scripts/activate-salon-binding.mjs`, só para o boot subir); `OPENAI_API_KEY` real do `server/.env` (não impressa; o modelo respondeu de verdade). Runner `scripts/runbook-tela.mjs` (Chromium sem janela, 1280×900). Usuário novo `w7-ia`, criado por `POST /api/users` → `201`, sem tabelas; idioma de partida inglês, modo claro (`theme=light`). Servidor e front parados e banco/`.env` descartáveis apagados ao fim.

**Passos 1–4: não reexecutados.** A diferença de código em relação à 3ª execução (em que os 4 passaram) é só o selo do Controle Total (um arquivo, duas chaves de `locales`); nenhum caminho de PR-1 mudou. Grau: inferido, não verificado nesta execução.

### Passos

**Passo 5 — PASSOU** (`w7-ia`, inglês, claro). Aba Rápido, Controle Total com o modelo escolhido (`Advanced Beauty Salon ERP`) e até "Select the tables", e Entrevista até o painel esquerdo "System features". O selo agora é `SELECTED`:
```text
passo5-b1-controle-total-modelo.txt, linha 20:  SELECTED
grep -P "[ãõçéêíóúâà]|Selecion|Tabela de|Módulo|Próximo|Voltar|Criar|Concluir"  passo5-*.txt  ->  0 ocorrências (só a bandeira 🇺🇸, byte alto)
```
[Rápido](runbook-evidence/W7-2026-11-13/passo5-a-rapido.png) · [modelo escolhido](runbook-evidence/W7-2026-11-13/passo5-b1-controle-total-modelo.png) · [tabelas](runbook-evidence/W7-2026-11-13/passo5-b2-controle-total-tabelas.png) · [entrevista](runbook-evidence/W7-2026-11-13/passo5-c1-entrevista-escolha.png) · [painel esquerdo](runbook-evidence/W7-2026-11-13/passo5-c2-entrevista-painel-esquerdo.png) (textos `.txt` ao lado de cada print)

**Passo 6 — PASSOU nas telas do wizard, com um achado** (português, `lang=pt`, `class=dark`). Rápido, Controle Total (modelo escolhido e tabelas) e Entrevista (escolha e painel esquerdo) em cinza neutro, cards `rounded-2xl`/`3xl`. Medi as cores calculadas de tudo dentro de `main` com um detector de "tom azulado" (azul dominante, diferença ≥ 8 sobre o vermelho, saturação baixa, escuro). O único elemento que o detector pega, em todas as telas, é o campo de texto/`textarea` (`rgb(55,65,81)` de fundo e `rgb(75,85,99)` de borda, `gray-700/600`, com canto de 6 px):
```text
#quick-unit-name  classes: "…rounded-2xl border border-neutral-200 bg-white … dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
computado em escuro: {"bg":"rgb(55, 65, 81)","borda":"rgb(75, 85, 99)","raio":"6px"}
```
Causa: a regra global `input[type=text]…{ @apply … dark:bg-gray-700 … dark:border-gray-600 rounded-md }` em `my-app/styles/globals.css:84-91` (`@layer base`), com especificidade maior (`input[type=…]`) que a utilitária `.dark\:bg-neutral-800`, então as classes do wizard não valem para inputs. Vale para todo input do app e já existe na `main`; não é regressão do W7. Decisão do dono (chat, 2026-11-13): *"Achado e seguir 6–9"*, sem mexer em CSS global aqui. Fica como achado fora do escopo (ver Registro).
[Rápido](runbook-evidence/W7-2026-11-13/passo6-a-rapido-escuro.png) · [modelo](runbook-evidence/W7-2026-11-13/passo6-b1-controle-total-modelo-escuro.png) · [tabelas](runbook-evidence/W7-2026-11-13/passo6-b2-controle-total-tabelas-escuro.png) · [entrevista](runbook-evidence/W7-2026-11-13/passo6-c1-entrevista-escuro.png) · [painel esquerdo](runbook-evidence/W7-2026-11-13/passo6-c2-entrevista-painel-esquerdo-escuro.png) · [o campo, a divergência](runbook-evidence/W7-2026-11-13/achado-input-nome-unidade-escuro.png). Nota: os cabeçalhos de categoria `SERVICES`/`SALES` ficam em inglês também em português (vêm do catálogo do servidor); o passo 6 não cobra idioma e a 2ª execução os aceitou.

**Passo 7 — PASSOU** (inglês, claro). Entrevista → Customize → tabela `LeadProposals` (o painel direito abre ao escolher a tabela) → modo **Manual**: "Add new field" com `Technical name / Label / Data type / Required field / Cancel / Add`; seletor `field-type` com as 7 opções (`Text | Number | Yes/No | Date | Date and time | Email | Phone`); `Visible` desmarcado em `notes`; "Save changes" → `Changes saved successfully!` (texto, linha 184) e `POST CustomizeFields {"kind":"manual",…,"tableKey":"leadProposals","changes":[{"action":"setHidden","name":"notes","hidden":true}]} -> 200`. Nenhum português nos três textos (`grep -P` dos `passo7-*.txt` → 0).
[painel](runbook-evidence/W7-2026-11-13/passo7-a-painel-direito-manual.png) · [formulário com o seletor](runbook-evidence/W7-2026-11-13/passo7-b-formulario-novo-campo.png) · [após salvar](runbook-evidence/W7-2026-11-13/passo7-c-depois-de-salvar.png) · [rede](runbook-evidence/W7-2026-11-13/passo7-net.txt)

**Passo 8 — PASSOU, com o esperado lido como o texto do próprio passo manda.** "Conversational AI": `Welcome to smart customization!`, `Hi! I am here to help you customize the LeadProposals feature.` (nome da tabela), placeholder `Describe what you need…`. Mensagem enviada; `POST CustomizeFields {"kind":"message",…} -> 200` (o 404 do ADR-W6 D1 acabou) e o cartão `AI proposal · Add · Internal Notes · textarea` com `Discard` e `Apply` em inglês. Duas leituras honestas: (a) o texto que o modelo escreveu veio em português (`Proponho adicionar um novo campo "Internal Notes"…`) porque a rota não recebe `locale` — é a lacuna `L-20261111-214837-3484`, que o próprio passo 8 já nomeia como esperada; (b) o botão **"Finish conversation"** que o passo cita **não existe mais**: o W6 FE (#785, commit `ccb302981`) trocou a chave `onboardingFieldsAiFinish` ("Finish conversation") por `onboardingFieldsAiClose` ("Back to manual mode"), que é o botão que está na tela, em inglês. O texto do passo 8 ficou velho nesse ponto; não o alterei.
[boas-vindas](runbook-evidence/W7-2026-11-13/passo8-a-boas-vindas.png) · [conversa com a proposta](runbook-evidence/W7-2026-11-13/passo8-b-conversa.png) · [rede](runbook-evidence/W7-2026-11-13/passo8-net.txt)

**Passo 9 — PASSOU** (português, escuro). Manual: "Novo Campo" aberto (seletor com `Texto | Número | Sim/Não | Data | Data e Hora | E-mail | Telefone`), `Visível` desmarcado, "Salvar Alterações" → `Alterações salvas com sucesso!` e `POST CustomizeFields … "setHidden" -> 200`. Modo "IA Humanizada": pergunta em português, resposta do modelo em português, cartão `Proposta da IA · Adicionar · Notas Internas · textarea` com `Descartar` e `Aplicar`, `Voltar ao modo manual`; `POST CustomizeFields {"kind":"message",…} -> 200`. Fundos e bordas dos painéis, cards dos campos e balões em cinza neutro com cantos arredondados (16 px/24 px nos cards e balões; os raios de 4, 6 e 8 px medidos pelo detector parecem ser caixas de seleção, selos e inputs — grau: inferido, não conferi elemento por elemento). O detector de tom azulado só pegou o mesmo campo de texto do passo 6 (`#field-name`, `#field-label` e a caixa de resposta do chat).
[manual](runbook-evidence/W7-2026-11-13/passo9-a-manual-escuro.png) · [novo campo](runbook-evidence/W7-2026-11-13/passo9-b-novo-campo-escuro.png) · [salvo](runbook-evidence/W7-2026-11-13/passo9-c-manual-depois-de-salvar-escuro.png) · [IA, boas-vindas](runbook-evidence/W7-2026-11-13/passo9-d-modo-ia-boas-vindas-escuro.png) · [IA, proposta](runbook-evidence/W7-2026-11-13/passo9-e-modo-ia-proposta-escuro.png) · [rede](runbook-evidence/W7-2026-11-13/passo9-net.txt)

### Desfecho desta execução
[x] PASSOU — passos 5–9 com evidência conferindo com o esperado; passos 1–4 não reexecutados (mudança só no selo do Controle Total; ver acima). **Ressalva de grau:** o passo 6 passa para as telas do wizard e carrega um achado (campo de texto em `gray-700/600` com canto de 6 px em modo escuro, por regra global), aceito pelo dono para seguir; o PASSOU não o apaga.
[ ] FALHOU
[ ] BLOQUEADO

### Registro (execução 2026-11-13)
- **Desvios de roteiro:** UI em inglês (padrão do usuário novo) nos passos 5, 7 e 8; servidor/front reconstruídos desta worktree em vez de `npm run start` padrão; DevTools → log de rede do runner; passos 1–4 não reexecutados; entrevista conduzida em inglês/português com respostas livres (o modelo responde diferente a cada rodada: duas tentativas minhas terminaram antes do botão "Customize" aparecer e foram refeitas com espera, sem efeito sobre as evidências finais).
- **Achados fora do escopo:** (1) regra global de input em `my-app/styles/globals.css:84-91` sobrepondo as classes do wizard (acima) — entregue como cartão de sessão; (2) texto do passo 8 cita "Finish conversation", que o W6 FE (#785) renomeou para "Back to manual mode" — só documentação do runbook; (3) `Abrir chat` (`aria-label`) já tem PR próprio (#1243).
- **Correção ao registro de 11/11:** mantida a da 3ª execução (os PASSOU do passo 5 de 11/11 ficam sem efeito; este é o passo 5 que vale).
- Rastreio: `docs/plano/nos/W7.md` (`estado_detalhe`) atualizado.
- Assinatura do executor: agente claude-sonnet-5-5, AI tester, sob autorização do dono (chat, 2026-11-12 e 2026-11-13). Atesta a execução e a conferência da evidência; não substitui o oráculo humano.
