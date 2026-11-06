# RUNBOOK: H2-WIZARD — Sign-off de browser da aba "Entrevista com IA" (pós-fix do 401, PR #271)

> Preparado por agente em 2026-09-07 contra a branch `claude/chatbot-builder-status-153ba2`
> (commit `3362b0b7`, PR #271). **Em branco de propósito:** EVIDÊNCIA, desfecho e assinatura são do
> executor humano — runbook sem assinatura é nulo (`docs/operating-manual/RUNBOOK-FORMAT.md`).
> O "antes" já tem evidência de agente (2026-09-07: `POST /api/dashboard/ai/ChatInterview → 401` 2×
> ao abrir a aba e 1× ao enviar, chat mudo, "Desculpe, ocorreu um erro de comunicação."). Este runbook
> é o "depois", que só o humano fecha.

Executor: [nome — humano]           Data: [____]
Autorização: dono, 2026-09-07 — "Corrige o 401 mandando o Bearer no hook" (correção) e "Pode seguir a
ordem natural" (este sign-off é o item 1 da ordem). Rastreio: nota [`docs/plano/gates/H2.md`](../plano/gates/H2.md) (ex-master map §5.1 Bloco A, item 4 — sign-offs de browser; emenda 05/10, dono em chat, 05/10: *"Pode emendar os 4"*) — acrescentar "wizard Entrevista com IA" à lista; `GAP-MAP.md` Nível 3,
linha do wizard (status `[CORRIGIDO 2026-09-07]` → `[CORRIGIDO + SIGN-OFF <data>]`).

---

## Pré-condições (verificar TODAS antes do passo 1)

| # | Pré-condição | Como verificar | OK? |
|---|---|---|---|
| P1 | Código = PR #271 **mergeado em `main`** (ou a branch checada, se o sign-off for pré-merge — anote qual) | `git log origin/main --oneline -3` mostra `3362b0b7`/o squash do #271; ou `git branch --show-current` | [ ] |
| P2 | **O servidor sobe.** Ele exige um `AccountingBinding` `Active` no banco antes do `listen()` (F-FEEDER-4). Em 2026-09-07 a cópia do `dev.db` do dono tinha **zero** bindings → `Boot ABORTADO`. Se for o caso: abrir o período do mês corrente (UI Períodos → `open`) e rodar `node scripts/activate-salon-binding.mjs --owner-user-id <id> --unit-id <id>` | `curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api` → `200`; log do server sem "Boot ABORTADO" | [ ] |
| P3 | `server/.env` com `OPENAI_API_KEY` real (a entrevista chama o modelo já no 2º turno) | `grep -c "OPENAI_API_KEY=sk" server/.env` → `1` | [ ] |
| P4 | Front em **build de produção** (`cd my-app && npm run build && npm run start`), não `next dev` — em dev a carga direta de `/dashboard/setup` cai em erro de hidratação da Navbar (achado 2026-09-07, fora do wizard) | `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/` → `200`; sem overlay vermelho do Next | [ ] |
| P5 | Um usuário **sem tabelas** (o wizard redireciona para `/dashboard` quando já existe sistema). Criar por `POST /api/auth/register` ou usar um novo | `GET /api/dynamic-tables` com o token → `data: []` | [ ] |
| P6 | DevTools aberto na aba Network, filtro `ChatInterview` | — | [ ] |

## Passos

Cada passo tem três campos. EVIDÊNCIA é obrigatória e é sempre um artefato colado ou anexado
(screenshot, linha do Network, saída de comando) — nunca uma frase descrevendo que deu certo.

1. Fazer login com o usuário de P5 e abrir `http://localhost:3000/dashboard/setup`.
   Resultado esperado: a tela "Configurar seu Sistema" com as três abas (Rápido, Controle Total, Entrevista com IA), sem redirecionar para `/dashboard`.
   EVIDÊNCIA: [screenshot da tela com a URL visível]

2. Clicar na aba **Entrevista com IA**.
   Resultado esperado: a saudação "Olá! Para começarmos, por favor me conte sobre o seu negócio…" aparece no chat; no Network, `POST /api/dashboard/ai/ChatInterview` → **200** (em produção, 1 chamada; em dev com StrictMode, 2). **Nenhum 401.**
   EVIDÊNCIA: [screenshot do chat com a saudação + linha do Network com status 200 e o header `Authorization: Bearer …` na aba Headers]

3. Digitar "Tenho um salão de beleza em Curitiba com 3 cabeleireiras" e enviar.
   Resultado esperado: a IA responde com UMA pergunta de detalhe (não "erro de comunicação"); Network → 200.
   EVIDÊNCIA: [screenshot do par pergunta/resposta + status]

4. Responder à pergunta com uma frase de contexto e, quando a IA resumir o negócio, responder "Sim, está correto." (repetir "Sim" uma segunda vez se ela não avançar — o gate de confirmação é instável, achado sup. 7, não faz parte deste sign-off).
   Resultado esperado: mensagem "Encontrei o sistema… **criar o sistema agora** ou **customizar**".
   EVIDÊNCIA: [screenshot]

5. Responder "criar o sistema agora".
   Resultado esperado: overlay "Criando seu projeto", `POST /api/dashboard/create` → 200, redirecionamento para `/dashboard` em ~2 s; `GET /api/dynamic-tables` passa a listar 27 tabelas.
   EVIDÊNCIA: [linha do Network do `/dashboard/create` com status + screenshot do dashboard]

6. Contraprova (o que este fix NÃO mudou): abrir `/dashboard/setup` com o MESMO usuário.
   Resultado esperado: redireciona para `/dashboard` (setup já concluído).
   EVIDÊNCIA: [URL final]

## Desfecho (marcar UM)
[ ] PASSOU — todos os passos com evidência conferindo com o esperado
[ ] FALHOU — passo __ divergiu; evidência da divergência colada acima; NENHUM passo seguinte foi executado após a falha
[ ] BLOQUEADO — pré-condição __ não se sustentava; execução nem começou

## Registro
- Achados no caminho (fora do escopo deste runbook): [lista ou "nenhum"]
- Atualização do artefato de rastreio: [linha do master map §5.1 item 4 + linha do GAP-MAP atualizadas com o desfecho + data]
- Assinatura do executor: ____________

---

# Seção W6 — modo IA do painel de campos (BRIEF WIZARD-W6 itens 19–20)

> Preparada por agente em 2026-10-20 junto com o PR do FE do W6 (`FE-INCR-W6-CUSTOMIZE-FIELDS`). **Em branco de
> propósito:** EVIDÊNCIA, desfecho e assinatura são do executor humano — runbook sem assinatura é nulo
> (`docs/operating-manual/RUNBOOK-FORMAT.md`). O agente não rodou este roteiro: não subiu backend com
> `OPENAI_API_KEY` real nem fez login em build de produção na sessão do PR.

Executor: [nome — humano]           Data: [____]
Autorização: BRIEF [`WIZARD-W6-CUSTOMIZE-FIELDS-brief.md`](WIZARD-W6-CUSTOMIZE-FIELDS-brief.md) item 20 (gate humano);
FE autorizado pelo dono em 2026-10-20 ("corrige o body do AIChatMode pro CustomizeFieldsDto"; "FE completo 13–19").
Rastreio: nota [`docs/plano/nos/W6.md`](../plano/nos/W6.md) e [`docs/plano/gates/H2.md`](../plano/gates/H2.md).

## Pré-condições W6 (verificar TODAS antes do passo W6-1)

| # | Pré-condição | Como verificar | OK? |
|---|---|---|---|
| W6-P1 | BE do W6 (#750) e FE do W6 em `main` (ou a branch do PR checada — anote qual) | `git log origin/main --oneline \| grep -i "W6"` ou `git branch --show-current` | [ ] |
| W6-P2 | P2, P3 e P5 da seção acima valem aqui (servidor sobe, `OPENAI_API_KEY` real, usuário sem tabelas) | os mesmos comandos de P2/P3/P5 | [ ] |
| W6-P3 | Front em **build de produção** (`cd my-app && npm run build && npm run start`) — `/dashboard/setup` está atrás de `withAuth` | `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/` → `200` | [ ] |
| W6-P4 | DevTools aberto na aba Network, filtro `CustomizeFields` | — | [ ] |

## Passos W6

1. W6-1 — Fazer login, abrir `/dashboard/setup`, aba **Entrevista com IA**, conduzir a entrevista até a escolha e responder **customizar**.
   Resultado esperado: o painel de customização abre com as tabelas do preset.
   EVIDÊNCIA: [screenshot do painel]

2. W6-2 — Escolher uma tabela (ex.: Clientes) e, no painel da direita, clicar no modo **IA**.
   Resultado esperado: as boas-vindas do modo IA e o botão "Voltar ao modo manual".
   EVIDÊNCIA: [screenshot]

3. W6-3 — Enviar "preciso guardar alergias do cliente".
   Resultado esperado: `POST /api/dashboard/ai/CustomizeFields` → **200**, corpo `{kind:"message", sessionId, tableKey, message}` **sem** `conversationHistory`; aparece o cartão "Proposta da IA" com o campo novo e o selo **"Dado sensível (LGPD)"**; o botão **Aplicar** está desabilitado.
   EVIDÊNCIA: [linha do Network com status + aba Payload + screenshot do cartão com o selo e o Aplicar cinza]

4. W6-4 — Marcar "Entendo que este campo guarda dado sensível" e clicar **Aplicar**.
   Resultado esperado: `POST /api/dashboard/ai/CustomizeFields` → **200**, corpo com `kind:"decision"`, `decision:"apply"` e `acknowledgeSensitive:true`; o cartão some e a conversa ganha a nota de proposta aplicada.
   EVIDÊNCIA: [linha do Network + aba Payload + screenshot]

5. W6-5 — Clicar em "Voltar ao modo manual".
   Resultado esperado: a lista de campos da tabela mostra o campo novo (ex.: Alergias).
   EVIDÊNCIA: [screenshot da lista de campos]

6. W6-6 — Contraprova do descarte: voltar ao modo IA, pedir outra mudança (ex.: "não preciso do fax") e clicar **Descartar**.
   Resultado esperado: `decision:"discard"` → 200; o cartão some; a lista do modo manual **não** muda.
   EVIDÊNCIA: [linha do Network + screenshot do modo manual]

7. W6-7 — Modo manual grava na sessão (emenda de 21/10, BRIEF `WIZARD-W6-MANUAL-SESSION-brief.md`): no modo **Manual**, clicar **Novo Campo**, criar "Apelido" (tipo Texto), desmarcar "Visível" de um campo existente e clicar **Salvar Alterações**.
   Resultado esperado: `POST /api/dashboard/ai/CustomizeFields` → **200**, corpo `{kind:"manual", …, changes:[{action:"setHidden",…},{action:"add",…}]}`; aparece "Alterações salvas com sucesso!" e o Salvar fica cinza (nada pendente). O tipo **Senha** não aparece no formulário.
   EVIDÊNCIA: [linha do Network + aba Payload + screenshot do painel]

8. W6-8 — O manual sobrevive à IA: voltar ao modo **IA**, pedir "quero também a data de nascimento" e clicar **Aplicar** na proposta.
   Resultado esperado: a proposta não reapresenta o "Apelido"; depois do Aplicar, o modo manual mostra "Apelido", a data de nascimento e o campo escondido continua escondido.
   EVIDÊNCIA: [screenshot do modo manual depois do Aplicar]

9. W6-9 — Campo sensível no manual: criar "Alergias" no modo manual.
   Resultado esperado: selo **"Dado sensível (LGPD)"**, o texto do art. 5º, II e a caixa "Entendo que este campo guarda dado sensível"; Salvar cinza até marcar; com a caixa marcada, o corpo leva `acknowledgeSensitive:true` → 200.
   EVIDÊNCIA: [screenshot do bloco com o Salvar cinza + linha do Network com o Payload]

## Desfecho W6 (marcar UM)
[ ] PASSOU — todos os passos com evidência conferindo com o esperado
[ ] FALHOU — passo __ divergiu; evidência da divergência colada acima; NENHUM passo seguinte foi executado após a falha
[ ] BLOQUEADO — pré-condição __ não se sustentava; execução nem começou

## Registro W6
- Achados no caminho (fora do escopo deste runbook): [lista ou "nenhum"]
- Atualização do artefato de rastreio: [nota `docs/plano/nos/W6.md` (estado) + `docs/plano/gates/H2.md` atualizadas com o desfecho + data]
- Assinatura do executor: ____________

## Execução 2026-11-04 — AI tester (C7, runbooks irmãos do H2) — seção principal (passos 1–6): PASSOU

Executor: agente claude-opus-5-5, AI tester, sob autorização do dono (chat, 2026-11-02)           Data: 2026-11-04 (≈10:15–10:20 -03:00)
Autorização (citada literalmente): dono, chat, 2026-11-02: *"gates humanos H1 e H2, as cédulas de decisão pendentes e o
#907. Faz e me substitui nas decisões"*; e dono, chat, 2026-11-04: *"Pode disparar uma sessão pra corrigir os achados e
outra para cada não feito"*. Regra de assinatura: `docs/operating-manual/RUNBOOK-FORMAT.md` §Fronteira (emenda 2026-10-29).

**Ambiente:** build de produção do commit `3077cda9` (worktree `agent-af93873e91c9b426b`, branch do #982 — **não** `main`),
servidor `http://127.0.0.1:4100/api` e app `http://127.0.0.1:3100`, dev.db real (backup feito pela sessão-mãe antes da
execução). `DFE_PARTNER=manual`. Tela dirigida por Puppeteer headless (runner `rb.mjs`, clique por DOM, perfil `wiz1`).
**Desvios de método:** (a) onde o roteiro diz `localhost:3000`/`:3001`, usei `127.0.0.1:3100`/`:4100` (as portas 3000/3001
são do dono); (b) P6 (DevTools/Network) foi trocado pelo log de rede do runner, que grava método, URL, status, se a
requisição levou `Authorization` (`[Authorization: Bearer <redigido>]`, nunca o token) e o início dos corpos — arquivos
`passoN-net.txt`, com JWT redigido; (c) o runner manteve o mesmo Chromium aberto entre os passos 2–5 (a entrevista vive na
memória da página).

### Pré-condições

| # | Evidência | OK? |
|---|---|---|
| P1 | Código = `3077cda9` (branch do #982), anotado acima; não é `main`. | [x] |
| P2 | `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4100/api` → `200` | [x] |
| P3 | Linha do launcher (`server.log` da sessão): `[launcher] OPENAI_API_KEY definida: true tamanho>20: true` (o valor da chave não foi lido nem impresso). A chave real se prova no passo 3: o modelo respondeu. | [x] |
| P4 | `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3100/` → `200` (`next start`, build de produção); nenhum overlay do Next nos prints. | [x] |
| P5 | Usuário novo criado para esta execução (valores de teste; senha só no arquivo de credencial do scratchpad): | [x] |

```text
POST /api/auth/register -> 201  res: user.id=cmw2541na0004cifw73gehtlp username=wiz1-c7-20261104 email=wiz1-c7-20261104@luminaris.test role=USER token=<jwt-redigido>
GET /api/dynamic-tables (Authorization: Bearer <redigido>) -> 200  res: {"success":true,"data":[]}
```

**Desvio de dado antes do passo 1 (idioma):** o usuário novo nasce com `locale: "en"` (`server/prisma/schema.prisma:24`,
`@default("en")`) e a 1ª carga de `/dashboard/setup` saiu em inglês ("Set Up Your System", "AI Interview"). Troquei o
idioma pela tela (seletor da Navbar → "Português (BR)") antes de seguir, porque o roteiro confere textos em português:
```text
[net] PATCH /api/users/me/preferences -> 200  [Authorization: Bearer <redigido>]  req: {"locale":"pt"}
   res: {"success":true,"data":{"id":"cmw2541na0004cifw73gehtlp","locale":"pt","currency":"BRL"}}
[eval] http://127.0.0.1:3100/pt/dashboard/setup
```
(`pre-idioma-net.txt`). Na 1ª carga do app, o login disparou dois `POST /api/dashboard-layout -> 201` idênticos (achado
WIZ-2 abaixo); não se repetiu no login seguinte.

### Passo 1 — confere
Logout, login com `wiz1-c7-20261104`, `goto /dashboard/setup`.
```text
[net] POST /api/auth/login -> 200  [sem Authorization]  req: {"identifier":"wiz1-c7-20261104","password":"<redigida>","rememberMe":false}
[eval] http://127.0.0.1:3100/pt/dashboard/setup
[ok] texto presente: "Configurar seu Sistema"
[controls] /pt/dashboard/setup
BTN: … | Modo Rápido | Controle Total | Entrevista com IA | Advanced Beauty Salon ERP … | Criar Dashboard | Abrir chat
```
A URL final é `/pt/dashboard/setup` (o prefixo `/pt` vem do idioma; não houve redirecionamento para `/dashboard`).
[Print](runbook-evidence/WIZARD-ENTREVISTA-2026-11-04/passo1-01-setup-tres-abas.png). Grau: verificado.

### Passo 2 — confere
Clique na aba **Entrevista com IA**.
```text
[net] POST /api/dashboard/ai/ChatInterview -> 200  [Authorization: Bearer <redigido>]  req: {"messages":[],"stage":"GREETING"}
   res: {"response":"Olá! Para começarmos, por favor me conte sobre o seu negócio ou projeto para que eu possa entender como melhor ajudá-lo com a configuração do sistema.","nextStage":"DISCOVERING_BUSINESS"}
```
Uma chamada só (build de produção), status 200, com `Authorization: Bearer`; nenhum 401 no `passo1-2-net.txt` (as
demais linhas são GET 200/304). O chat mostra a saudação literal acima ([print](runbook-evidence/WIZARD-ENTREVISTA-2026-11-04/passo2-01-saudacao.png),
texto em `passo2-chat.txt`). Grau: verificado.

### Passo 3 — confere
```text
[net] POST /api/dashboard/ai/ChatInterview -> 200  [Authorization: Bearer <redigido>]  req: {"messages":[…,{"sender":"user","text":"Tenho um salão de beleza em Curitiba com 3 cabeleireiras"}],"stage":"DISCOVERING_BUSINESS"}
   res: {"response":"Qual tipo de serviços você oferece no seu salão de beleza?","nextStage":"DISCOVERING_BUSINESS"}
```
Uma pergunta de detalhe; nenhum "erro de comunicação". [Print](runbook-evidence/WIZARD-ENTREVISTA-2026-11-04/passo3-01-pergunta-de-detalhe.png). Grau: verificado.

### Passo 4 — confere
Resposta de contexto e, no resumo, "Sim, está correto." (uma vez bastou).
```text
(turno a) req: …{"sender":"user","text":"Fazemos corte, coloração, escova e manicure. Atendemos com hora marcada e também vendemos produtos de cabelo; quero controlar agenda, clientes, estoque e o financeiro."}],"stage":"DISCOVERING_BUSINESS"}
[net] POST /api/dashboard/ai/ChatInterview -> 200  [Authorization: Bearer <redigido>]
   res: {"response":"Entendi. Então, em resumo, seu negócio é: Um salão de beleza em Curitiba que oferece cortes, coloração, escova e manicure, atendendo com hora marcada e vendendo produtos de cabelo, buscando controlar agenda, clientes, estoque e financeiro.. Isso está correto?","nextStage":"CONFIRMING_BUSINESS"}
(turno b) req: …{"sender":"user","text":"Sim, está correto."}],"stage":"CONFIRMING_BUSINESS"
[net] POST /api/dashboard/ai/ChatInterview -> 200  [Authorization: Bearer <redigido>]
   res: {"response":"Olá! Fiquei muito empolgado ao pensar no seu negócio e encontrei o sistema \"Salão de Beleza\" que é perfeito para você! … Que tal eu te ajudar a **criar o sistema agora** ou você prefere **customizar** antes?","nextStage":"AWAITING_CREATION_TYPE_CONFIRMATION","presetKey":"beautySalon","choicePrompt":{"kind":"creation_type","reason":"initial"},"moduleOptions":[{"key":"CRM-0",…
```
A tela mostra a mensagem, a lista "Módulos sugeridos" e os botões **Criar o sistema agora** / **Customizar**
([print](runbook-evidence/WIZARD-ENTREVISTA-2026-11-04/passo4-02-sim-esta-correto.png); turno a em
[print](runbook-evidence/WIZARD-ENTREVISTA-2026-11-04/passo4-01-turno-a.png)). Grau: verificado.

### Passo 5 — confere (com duas notas de roteiro desatualizado)
Digitei "criar o sistema agora" no campo do chat, como diz o roteiro (os botões do W3 também estavam na tela).
```text
[net] POST /api/dashboard/ai/ChatInterview -> 200  [Authorization: Bearer <redigido>]  req: {…,"stage":"AWAITING_CREATION_TYPE_CONFIRMATION","presetKey":"beautySalon"}
   res: {"response":"Ótimo! Seu sistema será criado diretamente com as configurações padrão.","nextStage":"COMPLETED","presetKey":"beautySalon"}
```
A tela pediu então a pergunta fechada de regime e porte (X13 PR-3, `FiscalQuestion.tsx`), que o roteiro de 07/09 não
conhece ([print](runbook-evidence/WIZARD-ENTREVISTA-2026-11-04/passo5-01-apos-criar-o-sistema-agora.png)). Respondi
"Simples Nacional" e porte "Não" ([print](runbook-evidence/WIZARD-ENTREVISTA-2026-11-04/passo5-02-pergunta-fiscal-respondida.png))
e cliquei **Criar sistema**:
```text
[eval] … Criando seu projeto / Um momento... / Estou configurando tudo para você. Isso pode levar alguns segundos.
[net] POST /api/dashboard/create -> 201  [Authorization: Bearer <redigido>]  req: {"suiteKey":"beautySalon","unit":{"name":"beautySalon"},"fiscal":{"regime":"SIMPLES","grandePorte":false},"modules":["CRM-0","CRM-1","CRM-CAMP","PES-0","PES-FORN","VEN-0","VEN-SERV","VEN-PROD","VEN-PAC","VEN-COM","EST-0","AGE-0","FIN-0","FIN-REC","FIN-BASE","GES-0","GES-META"]}
   res: {"success":true,"message":"Dashboard e tabelas criados com sucesso!","data":{"suiteKey":"beautySalon","unitId":"cmw258zmn004wcifwsnltmk88","fiscal":{"status":"criado","ano":2026,…
[eval] {"seen":["Criando seu projeto @0ms", … "Criando seu projeto @1688ms"],"url":"http://127.0.0.1:3100/pt/dashboard","ms":1795}
[eval] {"status":200,"total":27,"nomes":"Reports | Goals | Financial Baselines | Other Revenues | Expenses | Stock Movements | Appointments | Product Units | Packages | Commissions | Services | Products | Sale Items | Sales | Suppliers | Customers | Campaigns | Lead Activities | Lead Proposals | Leads | Lead Stages | Lead Pipelines | Analytics Definitions | Stakeholders | Tasks | Employees | Units"}
```
Prints: [overlay "Criando seu projeto"](runbook-evidence/WIZARD-ENTREVISTA-2026-11-04/passo5-04-overlay-criando.png) e
[dashboard](runbook-evidence/WIZARD-ENTREVISTA-2026-11-04/passo5-03-dashboard.png) ("Bem-vindo, AI tester wiz1").
O overlay apareceu, a criação teve sucesso, o redirecionamento para `/dashboard` saiu em 1,8 s e `GET /api/dynamic-tables`
lista **27** tabelas, como o esperado.
**Nota 1 — status 201, não 200:** o roteiro pede `→ 200`; veio `201 Created`. O `res.status(201)` do `createDashboard`
(`server/src/controllers/dashboardController.ts:375`) existe desde o commit de base `0db39612c` (2026-06-11), anterior ao
roteiro; o "200" é imprecisão de redação, não regressão. Li como sucesso. **Nota 2 — pergunta fiscal:** é etapa ratificada
posterior ao roteiro; respondê-la não muda o que o passo confere. Caso adversarial tentado: se a criação tivesse falhado
e o redirecionamento viesse de outro caminho, `GET /api/dynamic-tables` continuaria `[]` — deu 27. Grau: verificado.

### Passo 6 — confere
```text
== goto {"url":"/dashboard/setup","wait":5000}
[eval] http://127.0.0.1:3100/pt/dashboard
```
[Print](runbook-evidence/WIZARD-ENTREVISTA-2026-11-04/passo6-01-setup-redireciona.png). Grau: verificado.

### Desfecho (execução 2026-11-04, seção principal)
[x] PASSOU — todos os passos com evidência conferindo com o esperado (passo 5 com as notas 1 e 2: status 201 e pergunta
fiscal, ambos anteriores/ratificados em relação ao roteiro).
[ ] FALHOU
[ ] BLOQUEADO

### Registro (execução 2026-11-04, seção principal)
- **WIZ-1 (baixo: idioma do usuário novo)**: `server/prisma/schema.prisma:24` — `locale @default("en")`. Quem se registra
  pelo `POST /api/auth/register` sem `locale` cai no app em inglês, inclusive no wizard. Produto em português para
  empresa brasileira; a decisão do padrão é do dono. Instrumentação → correção: teste de integração do register que
  espera `locale: "pt"` (ou o idioma do navegador) quando o corpo não traz `locale`.
- **WIZ-2 (baixo: layout duplicado)**: `my-app/components/widgets/dashboard-grid/dashboard-grid.tsx:77` — na 1ª carga
  do usuário novo saíram dois `POST /api/dashboard-layout -> 201` com o mesmo corpo, criando dois layouts "Dashboard"
  ativos (`cmw255ocn0005cifwe1j2y23k` e `cmw255ocq0006cifwu6uup4he`). Inferido: efeito montado duas vezes ou duas
  instâncias do grid sem trava. Instrumentação → correção: teste do componente que monta o grid sem layouts e espera
  1 chamada de `DashboardLayoutService.create`.
- **WIZ-3 (texto)**: o nome da unidade criada pelo wizard é a chave técnica do preset (`"unit":{"name":"beautySalon"}`
  no `POST /api/dashboard/create`), e os nomes das tabelas listadas vêm em inglês ("Reports", "Customers"…) com o
  usuário em `pt`. A 1ª mensagem depois da confirmação começa com "Olá!" de novo e o resumo tem ".." duplo (texto do
  modelo/prompt). Fora do escopo do sign-off.
- **Roteiro desatualizado**: o passo 5 deveria citar a pergunta fiscal do X13 e o status `201`; P2/P4 citam
  `localhost:3001`/`:3000`.
- Desvios de dado no dev.db: usuário `wiz1-c7-20261104` (`wiz1-c7-20261104@luminaris.test`, id
  `cmw2541na0004cifw73gehtlp`) com `locale` `pt`; 2 dashboard-layouts; a suíte `beautySalon` com 27 tabelas e a unidade
  `cmw258zmn004wcifwsnltmk88` (perfil fiscal Simples, não grande porte).
- Rastreio: GAP-MAP (linha do wizard) e `docs/plano/gates/H2.md` ficam para o fold do dono.
- Assinatura do executor: agente claude-opus-5-5, AI tester, sob autorização do dono (chat, 2026-11-02). A assinatura
  atesta a execução e a conferência da evidência; não substitui oráculo externo.

## Execução 2026-11-04 — AI tester (C7, runbooks irmãos do H2) — Seção W6 (passos W6-1..W6-9): PASSOU

Executor: agente claude-opus-5-5, AI tester, sob autorização do dono (chat, 2026-11-02)           Data: 2026-11-04 (≈10:32–10:46 -03:00)
Autorização (citada literalmente): dono, chat, 2026-11-02: *"gates humanos H1 e H2, as cédulas de decisão pendentes e o
#907. Faz e me substitui nas decisões"*; e dono, chat, 2026-11-04: *"Pode disparar uma sessão pra corrigir os achados e
outra para cada não feito"*. Regra de assinatura: `docs/operating-manual/RUNBOOK-FORMAT.md` §Fronteira (emenda 2026-10-29).

**Ambiente:** o mesmo da seção principal (build de produção do `3077cda9`, `127.0.0.1:3100`/`:4100`, dev.db real,
`OPENAI_API_KEY` real pelo launcher). Runner em modo daemon (um Chromium aberto entre os passos, perfil `wiz2`).
**Desvios de método:** (a) portas `127.0.0.1` no lugar de `localhost:3000`; (b) W6-P4 (DevTools) trocado pelo log de
rede do runner (`w6*-net.txt`, JWT redigido); (c) **rodada A e rodada B**: na rodada A (arquivos `w6-*`), W6-1 a W6-4
conferiram; no W6-5, um JSON de passo mal escapado derrubou o runner e o Chromium, e o estado do wizard, que vive na
memória da página, se perdeu (`w6-retomada-net.txt`: a aba recomeça em `"stage":"GREETING"`). Refiz W6-1 a W6-4 na rodada B
(arquivos `w6b-*`, mesma sessão de usuário, página nova) com o mesmo resultado e segui dali. É falha do instrumento, não do
produto. (d) No W6-6 o exemplo do roteiro ("não preciso do fax") não gera proposta porque Customers não tem fax; usei outra
mudança (Country), já que o roteiro dá o fax como "ex.:".

### Pré-condições W6

| # | Evidência | OK? |
|---|---|---|
| W6-P1 | Código = `3077cda9` (branch do #982), não `main`; BE do W6 (#750) e FE do W6 estão na base desse commit (as rotas `CustomizeFields` respondem abaixo). | [x] |
| W6-P2 | P2/P3 da seção principal valem. P5: usuário novo `wiz2-c7-20261104`, sem tabelas: `GET /api/dynamic-tables (Authorization: Bearer <redigido>) -> 200  res: {"success":true,"data":[]}` | [x] |
| W6-P3 | Front em build de produção (`next start`, `127.0.0.1:3100` → 200). | [x] |
| W6-P4 | Substituído pelo log de rede do runner (desvio b). | [x] |

Antes do W6-1: o usuário nasce em `en` (WIZ-1); troquei para Português pela Navbar (`PATCH /api/users/me/preferences -> 200 req: {"locale":"pt"}`, `w6-pre-net.txt`).
No 1º login saíram de novo **dois** `POST /api/dashboard-layout -> 201` com o mesmo corpo (`cmw25pev300akcifwo0ezd2pb` e
`cmw25pev600alcifw4wpq0pez`, `w6-pre-net.txt`): WIZ-2 reproduzido num 2º usuário.

### W6-1 — confere
Entrevista até a escolha (rodada B: `w6b-1a..1d-net.txt`) e resposta "customizar":
```text
[net] POST /api/dashboard/ai/ChatInterview -> 200  [Authorization: Bearer <redigido>]  req: {…"text":"customizar"…}
   res: {"response":"# Customização do Sistema \"Advanced Beauty Salon ERP\"\n\nPor favor, observe o painel de customização à esquerda para ver todas as funcionalidades atuais do seu sistema.…","nextStage":"CUSTOMIZATION_IN_PROGRESS",…
```
O painel "Funcionalidades do Sistema — Sistema: Advanced Beauty Salon ERP" lista as tabelas do preset (LeadPipelines,
LeadStages, Leads, …, Customers, Sales, …, Goals; texto em `w6-1-painel.txt`). Prints: [rodada A](runbook-evidence/WIZARD-ENTREVISTA-2026-11-04/w6-1-01-painel-customizacao.png), [rodada B](runbook-evidence/WIZARD-ENTREVISTA-2026-11-04/w6b-1d-customizar.png). Grau: verificado.

### W6-2 — confere
Cliquei em Customers e no modo **IA Humanizada** (o rótulo do botão do modo IA):
```text
[ok] texto presente: "Bem-vindo à personalização inteligente!"
[ok] texto presente: "Voltar ao modo manual"
(texto) Olá! Estou aqui para ajudar você a personalizar a funcionalidade Customers. …
```
[Print](runbook-evidence/WIZARD-ENTREVISTA-2026-11-04/w6b-2-01-modo-ia.png) (rodada A: `w6-2-01-modo-ia.png`, `w6-2-modo-ia.txt`). Grau: verificado.

### W6-3 — confere
```text
[net] POST /api/dashboard/ai/CustomizeFields -> 200  [Authorization: Bearer <redigido>]  req: {"kind":"message","sessionId":"24268118-a044-4197-9d9c-97a948f1f56d","tableKey":"customers","message":"preciso guardar alergias do cliente"}
[eval] {"card":"Proposta da IA\nAdicionar\nAlergias\ntextarea\nDado sensível (LGPD)\n\nDado de saúde é dado sensível (LGPD, art. 5º, II), assim como as outras categorias desse inciso. A decisão de coletar é do controlador: a sua empresa.\n\nEntendo que este campo guarda dado sensível\nDescartar\nAplicar…","aplicarDisabled":true}
```
O corpo tem só `kind`, `sessionId`, `tableKey` e `message`, **sem** `conversationHistory`; o cartão tem o campo novo e o
selo; Aplicar está desabilitado. Cor do Aplicar desabilitado (rodada A): `disabled:bg-blue-400` → `rgb(96, 165, 250)`,
azul-claro, não cinza (nota de texto do roteiro; o esperado é "desabilitado"). [Print](runbook-evidence/WIZARD-ENTREVISTA-2026-11-04/w6b-3-01-proposta-selo-aplicar-desabilitado.png). Grau: verificado.

### W6-4 — confere
```text
[net] POST /api/dashboard/ai/CustomizeFields -> 200  [Authorization: Bearer <redigido>]  req: {"kind":"decision","sessionId":"24268118-a044-4197-9d9c-97a948f1f56d","tableKey":"customers","proposalId":"88366eb5-5da7-45c3-8ee4-32b070bcc6ce","decision":"apply","acknowledgeSensitive":true}
[eval] {"temProposta":false,"temAplicada":true}
```
O cartão sumiu e a conversa ganhou "Proposta aplicada.". Rodada A, igual: `w6-4-net.txt` (`proposalId 6356e80d-…`). [Print](runbook-evidence/WIZARD-ENTREVISTA-2026-11-04/w6b-4-01-aplicada.png). Grau: verificado.

### W6-5 — confere
"Voltar ao modo manual" → a lista de campos de Customers termina em:
```text
"visible-field-19: Total Sales Amount / number / totalSalesAmount / Visível [visivel=true]"
"visible-field-20: Alergias / textarea / allergies / Visível [visivel=true]"
```
[Print](runbook-evidence/WIZARD-ENTREVISTA-2026-11-04/w6b-5-01-manual-com-alergias.png). Grau: verificado.

### W6-6 — confere
"não preciso do fax" → `CustomizeFields -> 200`, resposta "Não encontrei um campo de fax na funcionalidade atual. Você
gostaria de revisar algum outro campo ou fazer outra alteração?" (sem proposta; `w6b-6-net.txt`, [print](runbook-evidence/WIZARD-ENTREVISTA-2026-11-04/w6b-6-00-fax-sem-proposta-timeout-do-runner.png)). Outra mudança, "não preciso do campo País (Country)":
```text
[eval] … Proponho remover o campo País (Country) da tabela de Customers. … Proposta da IA\nRemover\nCountry\nstring\nDescartar\nAplicar
[net] POST /api/dashboard/ai/CustomizeFields -> 200  [Authorization: Bearer <redigido>]  req: {"kind":"decision","sessionId":"24268118-a044-4197-9d9c-97a948f1f56d","tableKey":"customers","proposalId":"4a831337-64c0-4454-bbd1-e64ebf8e3022","decision":"discard"}
[eval] {"temProposta":false,"trecho":"… Proposta descartada. …"}
[eval] Main Unit [true] | … | ZIP Code [true] | Country [true] | Lifecycle Stage [true] | … | Total Sales Amount [true] | Alergias [true]
```
A lista do modo manual não mudou: Country continua. Prints: [proposta](runbook-evidence/WIZARD-ENTREVISTA-2026-11-04/w6b-6-01-proposta-antes-de-descartar.png), [manual depois](runbook-evidence/WIZARD-ENTREVISTA-2026-11-04/w6b-6-02-manual-apos-descartar.png). Grau: verificado.

### W6-7 — confere
Modo Manual → **Novo Campo**: Nome Técnico `nickname`, Rótulo `Apelido`, Tipo `Texto`. As opções de Tipo de Dado são
`string:Texto,number:Número,boolean:Sim/Não,date:Data,datetime:Data e Hora,email:E-mail,phone:Telefone`, **sem Senha**.
Adicionar; desmarquei "Visível" de Lead Source; **Salvar Alterações**:
```text
[net] POST /api/dashboard/ai/CustomizeFields -> 200  [Authorization: Bearer <redigido>]  req: {"kind":"manual","sessionId":"24268118-a044-4197-9d9c-97a948f1f56d","tableKey":"customers","changes":[{"action":"setHidden","name":"leadSource","hidden":true},{"action":"add","field":{"name":"nickname","label":"Apelido","type":"string","required":false}}]}
[eval] {"msg":true,"salvarDisabled":true,"salvarBg":"rgb(96, 165, 250)"}
```
"Alterações salvas com sucesso!" na tela; Salvar desabilitado (azul-claro, mesma nota do W6-3). Prints: [formulário](runbook-evidence/WIZARD-ENTREVISTA-2026-11-04/w6b-7-01-novo-campo-apelido.png), [salvo](runbook-evidence/WIZARD-ENTREVISTA-2026-11-04/w6b-7-02-salvo.png). Grau: verificado.

### W6-8 — confere
Modo IA, "quero também a data de nascimento":
```text
[eval] {"cartao":"Proposta da IA\nAdicionar\nData de Nascimento\ndate\nDescartar\nAplicar…","cartaoCitaApelido":false}
[net] POST /api/dashboard/ai/CustomizeFields -> 200  [Authorization: Bearer <redigido>]  req: {"kind":"decision","sessionId":"24268118-a044-4197-9d9c-97a948f1f56d","tableKey":"customers","proposalId":"2904f6f0-7423-485d-916b-4db943443dd8","decision":"apply"}
[eval] … | Lead Source (string) [false] | … | Alergias (textarea) [true] | Apelido (string) [true] | Data de Nascimento (date) [true]
```
A proposta não reapresenta o Apelido; depois do Aplicar o manual mostra Apelido e Data de Nascimento, e Lead Source
continua escondido (`[false]`). Prints: [proposta](runbook-evidence/WIZARD-ENTREVISTA-2026-11-04/w6b-8-01-proposta-nascimento.png), [manual](runbook-evidence/WIZARD-ENTREVISTA-2026-11-04/w6b-8-02-manual-apos-aplicar.png). Grau: verificado.

### W6-9 — confere (pelo fluxo ratificado F-MS-3 a)
Novo Campo `alergiasManual` / "Alergias" / Texto → Adicionar. Antes do 1º Salvar não há selo e o Salvar está habilitado
([print](runbook-evidence/WIZARD-ENTREVISTA-2026-11-04/w6b-9-01-antes-do-salvar-sem-selo.png)). Isso é o desenho: a ciência
só é pedida depois que o servidor aponta o campo (`my-app/features/interview/components/RightSidebar/index.tsx:169`, "Item 11
(F-MS-3 a)"). Salvar:
```text
[net] POST /api/dashboard/ai/CustomizeFields -> 400  [Authorization: Bearer <redigido>]  req: {"kind":"manual","sessionId":"24268118-a044-4197-9d9c-97a948f1f56d","tableKey":"customers","changes":[{"action":"add","field":{"name":"alergiasManual","label":"Alergias","type":"string","required":false}}]}
   res: {"code":"SENSITIVE_FIELD_NOT_ACKNOWLEDGED","message":"A proposta tem campo de dado sensível: confirme antes de aplicar.","details":{"fields":["alergiasManual"]}}
[eval] {"bloco":"Dado sensível (LGPD)\nAlergias\n\nDado de saúde é dado sensível (LGPD, art. 5º, II), assim como as outras categorias desse inciso. A decisão de coletar é do controlador: a sua empresa.\n\nEntendo que este campo guarda dado sensível","salvarDisabled":true,"salvarBg":"rgb(96, 165, 250)"}
(marquei a caixa) [eval] {"salvarDisabled":false}
[net] POST /api/dashboard/ai/CustomizeFields -> 200  [Authorization: Bearer <redigido>]  req: {"kind":"manual",…,"changes":[{"action":"add","field":{"name":"alergiasManual","label":"Alergias","type":"string","required":false}}],"acknowledgeSensitive":true}
[eval] {"msg":true,"bloco":false}
```
Selo, texto do art. 5º, II e caixa; Salvar desabilitado até marcar; com a caixa marcada, o corpo leva
`acknowledgeSensitive:true` → 200. Prints: [bloco](runbook-evidence/WIZARD-ENTREVISTA-2026-11-04/w6b-9-02-bloco-sensivel-salvar-desabilitado.png), [salvo](runbook-evidence/WIZARD-ENTREVISTA-2026-11-04/w6b-9-03-salvo-com-ciencia.png).
Caso adversarial: se o servidor não detectasse o rótulo "Alergias", o 1º Salvar teria dado 200 sem ciência. Deu 400
com o código. Grau: verificado.

### Desfecho W6 (execução 2026-11-04)
[x] PASSOU — todos os passos com evidência conferindo com o esperado (desvios c e d e notas de texto acima).
[ ] FALHOU
[ ] BLOQUEADO

### Registro W6 (execução 2026-11-04)
- WIZ-1 e WIZ-2 se repetiram com `wiz2` (ver o Registro da seção principal).
- **WIZ-4 (baixo)**: o modo manual aceita um 2º campo com o mesmo rótulo de um existente ("Alergias" `allergies` e
  "Alergias" `alergiasManual` na mesma tabela). Quem gerou o duplicado foi este roteiro, já que o W6-4 já tinha criado
  Alergias, mas a tela não avisa. Instrumentação: teste do `CustomizeFields` manual com `add` de rótulo repetido.
- **Roteiro desatualizado**: o botão do modo IA se chama "IA Humanizada"; o W6-9 deveria dizer que o selo aparece
  depois do 1º Salvar (F-MS-3 a); "Aplicar/Salvar cinza" é azul-claro desabilitado; o exemplo do fax não se aplica
  a Customers.
- Desvios de dado no dev.db: usuário `wiz2-c7-20261104` (`wiz2-c7-20261104@luminaris.test`, id `cmw259wq000abcifw7l0dae6l`)
  com `locale` `pt` e 2 dashboard-layouts. As sessões de customização (`156fb4a6-…` na rodada A, `24268118-…` na B) ficam no servidor;
  o sistema **não** foi criado (nenhuma tabela para `wiz2`).
- Rastreio: notas `docs/plano/nos/W6.md` e `docs/plano/gates/H2.md` ficam para o fold do dono.
- Assinatura do executor: agente claude-opus-5-5, AI tester, sob autorização do dono (chat, 2026-11-02). A assinatura
  atesta a execução e a conferência da evidência; não substitui oráculo externo.
