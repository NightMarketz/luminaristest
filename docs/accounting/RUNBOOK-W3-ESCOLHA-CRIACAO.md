# RUNBOOK: W3-CHOICE — Sign-off de browser da escolha "criar × customizar" por botões (FE-INCR-W3-CHOICE, item 14)

> Preparado por agente em 2026-10-03 contra a branch `claude/w3-choice-fe-items-7-14`. **Em branco de propósito:**
> EVIDÊNCIA, desfecho e assinatura são do executor humano — runbook sem assinatura é nulo
> (`docs/operating-manual/RUNBOOK-FORMAT.md`). Spec: `docs/accounting/WIZARD-W3-ESCOLHA-CRIACAO-brief.md` itens 7–12.

Executor: [nome — humano]           Data: [____]
Autorização: dono, 2026-09-30 — "(a), corrige e depois b" / "Autorizar W3 + ratificar F-W3-2" (nota `docs/plano/nos/W3.md`).
Rastreio: `docs/plano/nos/W3.md` (`estado_detalhe`) — registrar o desfecho ali.

---

## Pré-condições (verificar TODAS antes do passo 1)

| # | Pré-condição | Como verificar | OK? |
|---|---|---|---|
| P1 | Código = PR do FE-INCR-W3-CHOICE (commit: ______) em `main` ou a branch checada (anote qual) | `git branch --show-current` / `git log --oneline -3` | [ ] |
| P2 | BE #455 presente (`choicePrompt` na resposta) | `git log --oneline --grep=455` ou `grep -rn choicePrompt server/src` | [ ] |
| P3 | Servidor sobe (precisa de `AccountingBinding` `Active`; ver P2 do `RUNBOOK-H2-WIZARD-ENTREVISTA.md`) e `OPENAI_API_KEY` real em `server/.env` | `curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api` → `200` | [ ] |
| P4 | Front em **build de produção** (`cd my-app && npm run build && npm run start`), não `next dev` | `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/` → `200` | [ ] |
| P5 | Dois usuários **sem tabelas** (um para o caminho "criar", outro para "customizar") | `GET /api/dynamic-tables` → `data: []` | [ ] |
| P6 | DevTools na aba Network, filtro `ChatInterview` | — | [ ] |

## Passos

EVIDÊNCIA é sempre artefato colado/anexado (screenshot, corpo da requisição no Network) — nunca frase.

1. Com o usuário 1, abrir `/dashboard/setup` → aba **Entrevista com IA** e conduzir a conversa até a IA propor o preset.
   Resultado esperado: aparecem dois botões **"Criar o sistema agora"** e **"Customizar"** acima do campo de texto; o campo de texto continua visível.
   EVIDÊNCIA: [screenshot]

2. Clicar em **Criar o sistema agora**.
   Resultado esperado: abre modal com o nome do preset e **Confirmar** / **Voltar**; nenhuma chamada `ChatInterview` nova no Network.
   EVIDÊNCIA: [screenshot do modal + Network sem chamada nova]

3. Clicar em **Voltar**.
   Resultado esperado: o modal fecha; nada é enviado; os botões seguem na tela.
   EVIDÊNCIA: [screenshot + Network]

4. Clicar em **Criar o sistema agora** → **Confirmar**; dar duplo clique rápido em Confirmar.
   Resultado esperado: **1** `POST ChatInterview` com `"choice":"create"` no corpo; depois pergunta fiscal e `POST /api/dashboard/create` único.
   EVIDÊNCIA: [corpo da requisição (aba Payload) + lista do Network]

5. Com o usuário 2, repetir até os botões e clicar em **Customizar**.
   Resultado esperado: **sem modal**; 1 `POST ChatInterview` com `"choice":"customize"`; o painel de customização abre.
   EVIDÊNCIA: [payload + screenshot]

6. Com um usuário sem tabelas, no estágio dos botões, digitar "não quero customizar" e enviar.
   Resultado esperado: abre sozinho o modal "Você prefere não customizar…" com **Criar agora** / **Customizar mesmo assim**; os botões do modal enviam `create` / `customize` (sem 2º modal).
   EVIDÊNCIA: [screenshot do modal + payload do botão clicado]

7. No estágio dos botões, enviar texto ambíguo (ex.: "hmm").
   Resultado esperado: a mensagem do servidor aparece e os dois botões seguem; **nenhum** modal abre.
   EVIDÊNCIA: [screenshot]

8. Trocar o idioma para inglês e repetir os passos 1–2.
   Resultado esperado: rótulos e modal em inglês ("Create the system now", "Customize", "Back", "Confirm").
   EVIDÊNCIA: [screenshot]

## Desfecho (marcar UM)
[ ] PASSOU — todos os passos com evidência conferindo com o esperado
[ ] FALHOU — passo __ divergiu; evidência da divergência colada acima; NENHUM passo seguinte foi executado após a falha
[ ] BLOQUEADO — pré-condição __ não se sustentava; execução nem começou

## Registro
- Achados no caminho (fora do escopo deste runbook): [lista ou "nenhum"]
- Atualização do artefato de rastreio: [linha de `docs/plano/nos/W3.md` atualizada com o desfecho + data]
- Assinatura do executor: ____________

---

## Execução 2026-11-06: agente, persona revisor

Executor: agente claude-opus-5-5, persona revisor, sob comando do dono para este runbook. O comando é o questionário de
06/11, resposta *"Agente roda"* (registro em `docs/plano/decisoes/D-2026-11-06-PARADOS-NO-DONO.md` §4, PR #1107). Regra:
`docs/operating-manual/RUNBOOK-FORMAT.md` §Fronteira, exceção de 2026-10-25 (conferência na tela do próprio app; W3 não é
H1/H2/M2/X1/X2). Data: 2026-11-06, ≈16:09–16:19 UTC (13:09–13:19 -03:00).

**Ambiente:** build de produção do commit `075a00de9` (`main`; worktree `blissful-hermann-0e62ff`). Servidor
`node dist/server.js` em `http://127.0.0.1:4100/api`, app `next start` em `http://127.0.0.1:3100`. Banco: **cópia** do
`server/prisma/prisma/dev.db` real (com `-wal`/`-shm`). SHA-256 do `dev.db` copiado:
`f959c9a1a482e9a5babf4456134ad51aac43fddd3ebd9aba5d0b08e892aa1e6f`. `prisma migrate status` na cópia → `152 migrations
found … Database schema is up to date!`. `OPENAI_API_KEY` = a do `server/.env` real (as respostas abaixo vêm do modelo).
Tela dirigida por Puppeteer sobre o headless shell do Playwright (`chromium_headless_shell-1243`), sem janela, com vaga de
`scripts/heavy-slot.cjs`. Evidência em [`runbook-evidence/W3-ESCOLHA-2026-11-06/`](runbook-evidence/W3-ESCOLHA-2026-11-06/).

**Desvios de método (todos fora do código do app):**
- (a) portas `127.0.0.1:3100`/`:4100` em vez de `localhost:3000`/`:3001`, que são as do dono;
- (b) banco: cópia do `dev.db`, não o arquivo real. O passo 4 cria tabelas e o passo 6 avança o estágio, então o `dev.db`
  real ficou intacto;
- (c) as senhas de `wiz2-c7-20261104`, `h2-ai-u4` e `h2c7contador` não estão registradas (foram definidas por sessões
  anteriores). Na **cópia**, o hash delas foi trocado pelo do `seed-presumido` (`SEED_ACCOUNTING_PASSWORD`). Nome e estado
  dos usuários (sem tabelas) não mudaram;
- (d) P6 (DevTools/Network) foi trocado pelo log de rede do driver, que grava método, URL, status e o corpo integral da
  requisição, com senha e `token` redigidos. Arquivos `passoN-net.txt` e `uN-net-completo.txt`;
- (e) o texto do usuário foi posto no campo pelo setter nativo + evento `input` e enviado pelo botão **Enviar**. Pela linha
  de comando do Git Bash o acento chegava como U+FFFD (achado do ambiente de teste, não do app);
- (f) "duplo clique rápido" = clique do mouse seguido de duplo clique (`clickCount: 2`) no mesmo ponto do botão, sem pausa;
- (g) o usuário 2 (`h2-ai-u4`) tem locale `en`, então o idioma foi trocado para Português (BR) pelo seletor da Navbar antes
  da entrevista. Os passos 6 e 7 usaram um 3º usuário sem tabelas (`h2c7contador`), porque o usuário 1 já tinha tabelas
  depois do passo 4.

### Pré-condições

| # | Evidência | OK? |
|---|---|---|
| P1 | `main` em `075a00de9` (`git rev-parse --short HEAD` → `075a00de9`), que contém o #477 (`b580f425d`) do FE-INCR-W3-CHOICE. | [x] |
| P2 | `git log` traz `b580f425d feat(w3): FE-INCR-W3-CHOICE …(#477)`. A resposta do passo 1 traz `"choicePrompt":{"kind":"creation_type","reason":"initial"}` (BE #455). | [x] |
| P3 | `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4100/api` → `200`. Chave real: o modelo respondeu (ex.: `"response":"Quais são os principais desafios que você enfrenta atualmente na gestão da agenda, estoque e financeiro do salão?"`). | [x] |
| P4 | `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3100/` → `200`; `next start` sobre `npm run build` (`EXIT 0`). | [x] |
| P5 | No log da tela de cada usuário, antes do passo: `GET /api/dynamic-tables -> 200` / `res: {"success":true,"data":[]}` (u1 16:14:41Z, u2 16:15:53Z, u3 16:17:36Z, em `uN-net-completo.txt`). | [x] |
| P6 | Substituído pelo log de rede do driver (desvio d). | [x] |

### Passos

1. **Usuário 1 `wiz2-c7-20261104`**: `/pt/dashboard/setup` → **Entrevista com IA**, com três falas (salão de beleza →
   "Hoje uso agenda de papel…" → "Sim, está correto."). EVIDÊNCIA: `passo1-botoes.png`. Resposta do 3º turno:
   `"nextStage":"AWAITING_CREATION_TYPE_CONFIRMATION","presetKey":"beautySalon","choicePrompt":{"kind":"creation_type","reason":"initial"}`.
   Medida no DOM:
   `{"dialogs":0,"botoesEscolha":["Criar o sistema agora","Customizar"],"campo":["Digite sua resposta..."],"botoesAcimaDoCampo":true}`.
   **Confere.**
2. Clique em **Criar o sistema agora**. EVIDÊNCIA: `passo2-modal.png`. Texto do `[role=dialog]` (`passo2-modal.txt`):
   `Criar o sistema agora? | FORMULÁRIO ADMINISTRATIVO | Vamos criar o sistema com o padrão "beautySalon". Você poderá ajustar depois. | Voltar | Confirmar`.
   Requisições `/api/` antes do clique: `10`; depois: `10`. **Confere.** O nome do preset sai como a chave `beautySalon`
   (ver achados).
3. Clique em **Voltar**. EVIDÊNCIA: `passo3-voltar.png`;
   `{"dialogs":0,"botoesEscolha":["Criar o sistema agora","Customizar"],…}`; requisições: `10`. **Confere.**
4. **Criar o sistema agora** → duplo clique rápido em **Confirmar**. EVIDÊNCIA (`passo4a-net.txt`): `ChatInterview: 1`.
   Fim do corpo: `],"stage":"AWAITING_CREATION_TYPE_CONFIRMATION","presetKey":"beautySalon","choice":"create"}`.
   `res: {"response":"Ótimo! Seu sistema será criado diretamente com as configurações padrão.","nextStage":"COMPLETED","presetKey":"beautySalon"}`.
   `passo4-pergunta-fiscal.png` mostra Regime tributário, Grande porte e **Criar sistema**. Escolhido "Não sei — o contador
   informa", com duplo clique em **Criar sistema** (`passo4b-net.txt`):
   `2026-11-06T16:15:30.944Z POST /api/dashboard/create -> 201`, **1** ocorrência (`grep -c` → `1`),
   `req: {"suiteKey":"beautySalon",…,"fiscal":{"regime":"NAO_SEI","grandePorte":null},…}`,
   `res: {"success":true,"message":"Dashboard e tabelas criados com sucesso!",…}`. URL final
   `http://127.0.0.1:3100/pt/dashboard` (`passo4-apos-criar.png`). **Confere.**
5. **Usuário 2 `h2-ai-u4`** (idioma trocado para PT, desvio g): mesmas três falas, depois clique em **Customizar**.
   EVIDÊNCIA (`passo5-net.txt`): diálogos logo após o clique `0` e após a resposta `0`. 1 requisição:
   `POST /api/dashboard/ai/ChatInterview -> 200`, fim do corpo
   `],"stage":"AWAITING_CREATION_TYPE_CONFIRMATION","presetKey":"beautySalon","choice":"customize","modules":["CRM-0",…,"GES-META"]}`,
   resposta `"nextStage":"CUSTOMIZATION_IN_PROGRESS"`. `passo5-customizacao.png` mostra o painel "Funcionalidades do
   Sistema — Sistema: Advanced Beauty Salon ERP" aberto. **Confere.**
6. **Usuário 3 `h2c7contador`** (sem tabelas): até os botões, depois digitado "não quero customizar" + Enviar. EVIDÊNCIA
   (`passo6a-net.txt`): fim do corpo
   `{"sender":"user","text":"não quero customizar"}],"stage":"AWAITING_CREATION_TYPE_CONFIRMATION","presetKey":"beautySalon"}`;
   `res: {"response":"Entendi que você prefere não customizar. Quer **criar o sistema agora** com as configurações padrão?",…,"choicePrompt":{"kind":"creation_type","reason":"declined_customize"}}`.
   Diálogos: `1`. Texto (`passo6-modal.txt`):
   `Você prefere não customizar | FORMULÁRIO ADMINISTRATIVO | Você prefere não customizar. Criar o sistema agora com o padrão? | Customizar mesmo assim | Criar agora`
   (`passo6-modal-negacao.png`). Clique em **Criar agora** do modal (`passo6b-net.txt`): diálogos `0` logo após e `0` após
   a resposta (sem 2º modal). 1 requisição, fim do corpo
   `],"stage":"AWAITING_CREATION_TYPE_CONFIRMATION","presetKey":"beautySalon","choice":"create"}`, com `res: …"nextStage":"COMPLETED"…`.
   A pergunta fiscal ("Regime tributário") aparece (`passo6-apos-criar-agora.png`). O sistema não foi criado, porque o
   passo não pede. **Confere.**
7. Mesmo usuário 3: página recarregada, três falas de novo até os botões, depois enviado "hmm". EVIDÊNCIA
   (`passo7-net.txt`): fim do corpo
   `{"sender":"user","text":"hmm"}],"stage":"AWAITING_CREATION_TYPE_CONFIRMATION","presetKey":"beautySalon"}`;
   `res: {"response":"Não entendi sua escolha. Você prefere **criar o sistema agora** ou **customizar** primeiro?","nextStage":"AWAITING_CREATION_TYPE_CONFIRMATION","presetKey":"beautySalon","choicePrompt":{"kind":"creation_type","reason":"unclear"}}`.
   Depois: `{"dialogs":0,"botoesEscolha":["Criar o sistema agora","Customizar"],…}`, ou seja, os botões seguem e nenhum
   modal abre. **Mas a mensagem do servidor não aparece na tela:** em `passo7-ambiguo.png`, entre o título e "Módulos
   sugeridos" só há espaço em branco. Medida no DOM (`passo7-medida-dom.json`):
   `"msgRect":{"top":156,"bottom":204,"h":48}` ·
   `"areaDeMensagens":{"classe":"flex-grow overflow-y-auto p-4 space-y-4","clientHeight":32,"scrollHeight":1016,"scrollTop":984,"top":220,"bottom":252}` ·
   `"mensagemEhOElementoNoPonto":false` (o ponto da mensagem cai no card, não nela). A mensagem está no DOM, mas fora da
   área de mensagens, que tem 32 px de altura útil. **DIVERGE** do esperado ("a mensagem do servidor aparece").
8. **Não executado** (regra do FALHOU).

**Diagnóstico do passo 7 (sem correção de código):** as alturas dos filhos do card foram medidas
(`passo7-alturas-card.json`). O card `…flex flex-col h-[600px]`
(`my-app/features/interview/components/AiInterviewSetup/index.tsx:158`) tem 600 px. Dentro dele ficam:

- o título (32 px);
- a área de mensagens `ChatArea` (`flex-grow overflow-y-auto p-4`, 32 px);
- o fieldset "Módulos sugeridos" (`ModuleChecklist`, **433 px**);
- a caixa dos botões `CreationChoice` (86 px);
- o campo (48 px);
- e 4 margens de 16 px (`mt-4`/`mb-4`).

Isso soma ≈ 695 px, contra 552 px úteis (600 − `p-6`). O `flex-grow` da `ChatArea` encolhe até o mínimo do próprio padding
(32 px), e os botões e o campo transbordam o card (topo do card 147 + 600 = 747; campo em 819–867). A lista de módulos
entrou com o W5 PR-3 (`eb92c5cc9`, #728, 16/10), depois do FE do W3 (#477). O teste do item 11 passa no vitest porque o
jsdom não faz layout.

Grau: as alturas são **verificadas** (medidas na página). A causa (soma das alturas no card fixo) é **inferida** dessas
medidas, sem bisect. O mesmo esmagamento já aparece no passo 1 (`passo1-botoes.png`): a proposta da IA ("encontrei o
sistema Salão de Beleza…") também fica invisível.

## Desfecho (execução 2026-11-06)
[ ] PASSOU
[x] FALHOU — o passo **7** divergiu: a mensagem do servidor (`reason: unclear`) não aparece na tela, porque a área de
mensagens fica com 32 px quando a lista "Módulos sugeridos" está aberta. A evidência da divergência está colada acima.
Nenhum passo seguinte foi executado, então o passo 8 ficou pendente. Os passos 1–6 conferiram.
[ ] BLOQUEADO

## Registro (execução 2026-11-06)
- Achados no caminho (fora do escopo deste runbook, sem correção):
  1. O modal de confirmação mostra a chave `"beautySalon"`, não o nome do preset ("Salão de Beleza" / "Advanced Beauty
     Salon ERP"). O BRIEF item 9 diz "com o nome do preset", e `CreationChoice.tsx:57` passa `presetKey`.
  2. Os dois modais (item 9 e negação) trazem o subtítulo "FORMULÁRIO ADMINISTRATIVO", que é o padrão do `Modal`
     canônico e não combina com o contexto.
  3. A caixa dos botões e o campo de texto ficam para fora da borda do card de 600 px. É a mesma causa do passo 7, já
     visível no passo 1.
  4. Ambiente de teste: argumento com acento passado pela linha de comando do Git Bash chega como U+FFFD. Comando com
     acento vai por arquivo UTF-8.
- Atualização do artefato de rastreio: `docs/plano/nos/W3.md`, `estado_detalhe` com "sign-off do item 14 FALHOU no passo
  7 (06/11)", no mesmo PR.
- Próximo passo (não feito aqui): instrumentar e depois corrigir o layout do card com a lista de módulos aberta, por
  sessão autorizada. Em seguida, rodar este runbook de novo **inteiro** (passos 1–8).
- Assinatura do executor: agente claude-opus-5-5, persona revisor, sob comando do dono (questionário, 2026-11-06)

---

## Execução 2026-11-06 (2ª, depois do fix): passos 7 e 8, agente, persona revisor

Executor: agente claude-opus-5-5, persona revisor, sob o mesmo comando do dono (questionário de 06/11, *"Agente roda"*,
`D-2026-11-06-PARADOS-NO-DONO.md` §4) e a frase do dono no chat de 06/11: *"O que falhou, abre uma sessão a parte para
fecharmos"*. Regra: `RUNBOOK-FORMAT.md` §Fronteira, exceção de 2026-10-25. Data: 2026-11-06, 19:49–19:53 UTC.

**O que mudou no código** (branch `claude/w3-fix-passo7`, sobre a 1ª execução):
- `3d00e83eb` — teste-guarda `AiInterviewSetup/__tests__/AiInterviewSetup.layout.test.tsx`, **vermelho** antes do fix
  (2 casos, `AssertionError: expected false to be true` na asserção de piso da `ChatArea` e de teto da lista; os 22 testes
  antigos da pasta verdes);
- `d59b0e2c1` + o ajuste deste commit — só classes CSS: `ChatArea` ganhou `basis-0 min-h-32` (cede altura primeiro, com
  piso de 128 px); o `fieldset` do `ModuleChecklist` ganhou `max-h-40 min-h-0 shrink overflow-y-auto` (teto de 160 px,
  rola por dentro). Guarda **verde** depois (24/24), `npx tsc --noEmit` limpo.
- 1ª tentativa sem `basis-0` (medida, não commitada como final): a mensagem aparecia, mas a lista encolhia a 72 px e
  nenhum checkbox ficava visível. Por isso o `basis-0`.

**Ambiente:** build de produção do commit `d59b0e2c1` + `ChatArea` com `basis-0` (árvore deste PR), `node dist/server.js`
em `127.0.0.1:4100`, `next start` em `127.0.0.1:3100` (build com `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:4100/api`,
`EXIT 0`). Banco: **cópia** nova do `server/prisma/prisma/dev.db` real, SHA-256
`f959c9a1a482e9a5babf4456134ad51aac43fddd3ebd9aba5d0b08e892aa1e6f` (o mesmo da 1ª execução); `prisma migrate status` →
`Database schema is up to date!`. Na cópia, o hash da senha de `h2c7contador` e `h2-ai-u4` foi trocado pelo do
`seed-presumido` (desvio c da 1ª execução); ambos com `tabelas 0`. `OPENAI_API_KEY` real. Driver:
`node scripts/runbook-tela.mjs` (headless shell, viewport 1280×900). Evidência em
[`runbook-evidence/W3-ESCOLHA-2026-11-06-fix/`](runbook-evidence/W3-ESCOLHA-2026-11-06-fix/); a medida no DOM é a mesma
função nos três pontos (card, área de mensagens, última mensagem, `elementFromPoint` na mensagem, lista, botões, campo).

### Passos

7. **Usuário 3 `h2c7contador`** (pt): três falas até os botões ("Tenho um salão de beleza" → "Hoje uso agenda de papel e
   planilha para estoque e financeiro" → "Sim, está correto."), depois "hmm" + **Enviar**. EVIDÊNCIA (`run-pt-net.txt`,
   5 `POST ChatInterview -> 200`), resposta do último:
   `res: {"response":"Não entendi sua escolha. Você prefere **criar o sistema agora** ou **customizar** primeiro?","nextStage":"AWAITING_CREATION_TYPE_CONFIRMATION","presetKey":"beautySalon","choicePrompt":{"kind":"creation_type","reason":"unclear"}}`.
   `passo7-ambiguo.png` mostra "hmm" e a resposta inteira, a lista com 6 módulos visíveis, os dois botões e o campo dentro
   do card. Medida (`passo1-passo7-medida-dom.jsonl`, 2ª linha):
   `"areaDeMensagens":{"top":292,"bottom":452,"h":160,…}` ·
   `"ultimaMsg":{"top":348,"bottom":420,"h":72,"texto":"Não entendi sua escolha. Você prefere criar o sistema agora ou customizar primeiro?"}` ·
   `"ultimaMsgEhOElementoNoPonto":true` · `"listaModulos":{"top":468,"bottom":628,"h":160,"clientHeight":158,"scrollHeight":412}` ·
   `"botoesEscolha":[{"t":"Criar o sistema agora",…},{"t":"Customizar",…}]` · `"campo":{"top":746,"bottom":794,"h":48}` ·
   `"botoesECampoDentroDoCard":true` · `"dialogs":0`. Antes do fix: área 32 px, `mensagemEhOElementoNoPonto:false`, campo
   em 819–867 com o card terminando em 747. **Confere.**

   Ainda no passo 7, o ponto do passo 1 que o mesmo defeito escondia: antes do "hmm", a proposta da IA ("Oi! Fico muito
   animado em compartilhar que encontrei o sistema \"Salão de Beleza\"…") está na área de 160 px, com a rolagem no fim e
   `"ultimaMsgEhOElementoNoPonto":true` (1ª linha do `.jsonl`, `passo1-proposta-visivel.png`).

   **Classificação do ambíguo:** `reason: "unclear"` para "hmm" é o desenho, não bug. O BRIEF
   (`WIZARD-W3-ESCOLHA-CRIACAO-brief.md`, l. 40) define `unclear` como "texto ambíguo", e o item 11 diz que o ambíguo não
   abre modal e mostra a mensagem do servidor com os dois botões. Nada corrigido aqui.

8. **Usuário 2 `h2-ai-u4`**: abriu em PT (`/pt/dashboard/setup`); idioma trocado pelo seletor da Navbar (`🇧🇷 PT` →
   `🇺🇸 English (US)`) → URL `/dashboard/setup`, aba `["AI Interview"]` (`passo8-idioma-en.png`). Três falas em inglês até
   os botões: `"botoesEscolha":[{"t":"Create the system now",…},{"t":"Customize",…}]`, `"botoesECampoDentroDoCard":true`,
   `"dialogs":0` (`passo8-medida-dom.jsonl`, `passo8-botoes-en.png`); resposta com
   `choicePrompt":{"kind":"creation_type","reason":"initial"}`. Clique em **Create the system now** → `{"dialogs":1}`,
   texto (`passo8-modal-en.txt`):
   `Create the system now? | ADMINISTRATIVE FORM | We will create the system with the "beautySalon" default. You can adjust it later. | Back | Confirm`
   (`passo8-modal-en.png`). **Confere.**

Os passos 1–6 não foram repetidos nesta execução: conferiram na 1ª (mesmo dia), e o fix só troca classes CSS de dois
elementos (sem mudança de estado, rede ou modal). Isso é **inferido** do diff, não medido de novo; o registro da 1ª execução
pedia rodar 1–8 de novo, e a sessão que abriu esta pediu 7 e 8. Se o dono quiser a rodada inteira, é o mesmo roteiro.

## Desfecho (2ª execução, 2026-11-06)
[x] PASSOU — passos 7 e 8 com evidência conferindo com o esperado; passos 1–6 da 1ª execução (mesmo dia), sobre código
de fluxo inalterado.
[ ] FALHOU
[ ] BLOQUEADO

## Registro (2ª execução)
- Achados no caminho (fora do escopo, sem correção):
  1. Com a UI em inglês, a IA segue respondendo em português ("Olá! Para começarmos…", "Oi! Estou super empolgado…") —
     o runbook só pede rótulos e modal em inglês, que conferiram.
  2. O botão **Enviar** do campo é texto fixo em português, também com a UI em inglês (`InputArea.tsx`).
  3. Seguem os achados 1 e 2 da 1ª execução: o modal mostra a chave `"beautySalon"` em vez do nome do preset, e o
     subtítulo "FORMULÁRIO ADMINISTRATIVO"/"ADMINISTRATIVE FORM" do `Modal` canônico.
  4. A lista "Módulos sugeridos" agora rola dentro de 160 px (6 de 12 itens visíveis em 1280 px); não há indicação
     visual de que rola além da barra do navegador.
- Atualização do artefato de rastreio: `docs/plano/nos/W3.md`, `estado_detalhe` com "sign-off do item 14 PASSOU na
  2ª execução de 06/11", no mesmo PR.
- Assinatura do executor: agente claude-opus-5-5, persona revisor, sob comando do dono (questionário e chat, 2026-11-06)

### Achados da 2ª execução resolvidos (dono, chat, 2026-11-06: "Já resolve os agentes fora do escopo")

Conferência na tela, mesmo ambiente e mesma cópia do banco, build de produção com as mudanças abaixo (2026-11-07,
02:00–02:04 UTC). Evidência em [`runbook-evidence/W3-ESCOLHA-2026-11-06-achados/`](runbook-evidence/W3-ESCOLHA-2026-11-06-achados/).

| Achado | Mudança | Evidência |
|---|---|---|
| Modal com a chave `beautySalon` (BRIEF item 9 pede o nome) | `usePresetName` (hook novo) busca o nome em `GET /dashboard/presets`, a mesma lista do Modo Rápido; o `CreationChoice` recebe `presetName`; sem a lista, cai na chave | `achados-pt-modal.txt`: `Vamos criar o sistema com o padrão "Advanced Beauty Salon ERP".` · `achados-en-modal.txt`: `…with the "Advanced Beauty Salon ERP" default.` |
| Subtítulo "Formulário Administrativo" nos dois modais | `Modal` canônico ganhou `subtitle?: string \| null` (ausente = o padrão de sempre; `null` = sem linha); os dois modais do W3 passam `null` | os dois `.txt` acima não têm a linha |
| "Enviar" fixo em PT | chave `onboardingInterviewSend` (pt "Enviar", en "Send") no `InputArea` | `[eval] ["Create the system now","Customize","Send"]` (`run-net.txt`) |
| Lista rola sem indicação | degradê fixo (`sticky bottom-0`) na base da lista | `achados-pt-lista-degrade.png` (última linha esmaecida com `scrollTop` 0) · `achados-pt-lista-fim.png` (rolada até o fim, nenhum item coberto) |
| IA responde em PT com a UI em EN | resolvido depois — ver a seção seguinte (dono, chat, 2026-11-06: "Seguir o idioma da UI") | [`…-idioma/`](runbook-evidence/W3-ESCOLHA-2026-11-06-idioma/) |

Testes: `CreationChoice.test.tsx` (+2: nome do preset no modal; sem subtítulo nos dois modais), `InputArea.test.tsx` (novo),
`Modal.subtitle.test.tsx` (novo: padrão, `null`, string). `npx vitest run features/interview components/ui/__tests__/Modal`
→ 121/121; `npx tsc --noEmit` e `npm run test:types` limpos.

### A entrevista segue o idioma da UI (dono, chat, 2026-11-06: "Seguir o idioma da UI")

**Mudança:**
- Contrato: `ChatInterviewSchema` aceita `locale: 'pt' | 'en'` (opcional; ausente = português, o comportamento de antes;
  outro valor → 400). Snapshot de DTO e `ChatInterviewDto.gen.ts` com só a linha nova.
- Servidor: `features/interview/models/interviewText.ts` tem os textos fixos em pt/en e a frase de idioma (`replyIn`) que
  fecha os prompts de resposta. O `locale` atravessa `processTurn` → `StageHandlers` → `CustomizationService` →
  `AIInteractions`. O texto livre da escolha entende inglês ("I don't want to customize", "create it now"). O resumo
  perdeu o ponto duplicado ("planilhas.. Isso está correto?"), que já existia em PT.
- Front: o `useAiInterview` manda o idioma da UI (`i18n.language`) em todo POST da entrevista.

**Conferência na tela** (build de produção, 2026-11-07, 02:28–02:31 UTC, `h2c7contador`, OpenAI real; evidência em
[`runbook-evidence/W3-ESCOLHA-2026-11-06-idioma/`](runbook-evidence/W3-ESCOLHA-2026-11-06-idioma/), `run-net.txt`):
- UI trocada para English (US): saudação `Hi! To get started, please tell me about your business…`; pergunta da IA
  `What specific services do you offer at your beauty salon?`; resumo `Got it. So, in short, your business is: …`;
  proposta `Hey there! I'm super excited to share that I found the perfect system…` (`en-proposta.png`);
  "hmm" → `I didn't get your choice. Would you rather create the system now or customize it first?` (`en-ambiguo.png`);
  **Customize** → `Customizing the "Advanced Beauty Salon ERP" System` (`en-customizacao.png`). Corpos com
  `"locale":"en"` (5 POSTs).
- UI de volta a Português (BR): saudação `Olá! Para começarmos…` (`pt-saudacao.png`), corpo com `"locale":"pt"`.

**Fora do alcance desta mudança (seguem em PT):** o motivo da recusa de remoção que vem de `describeTableLock` /
`bridgeRequirementsOfTable` (módulo de presets), os nomes de preset e de tabela (dado do preset) e o painel de campos por
IA (`POST /dashboard/ai/CustomizeFields`, outro endpoint; o prompt dele pede `friendlyMessage` "em português").

Testes: `StageHandlers.choice.test.ts` (+7: `locale` chega ao `processTurn`; `fr` → 400; saudação en/pt; ambíguo em
inglês; texto livre em inglês; prompt do MATCHING_PRESET em inglês com nomes de módulo em inglês; resumo sem ponto
duplicado), `useAiInterview.locale.test.tsx` (novo). Jest unit da entrevista e dos controllers 143/143; integração
`interviewSession.integration.test.ts` 7/7; vitest 123/123; `tsc` do my-app e `test:types` limpos. `tsc` do server: só os
2 erros de `nfeSignature.ts`/`nfseSignature.ts` do ambiente (o `@xmldom/xmldom` 0.9.12 sumiu do depósito compartilhado
de dependências numa operação npm interrompida às 22:51; arquivos não tocados aqui).
