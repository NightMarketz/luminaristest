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

## Desfecho W6 (marcar UM)
[ ] PASSOU — todos os passos com evidência conferindo com o esperado
[ ] FALHOU — passo __ divergiu; evidência da divergência colada acima; NENHUM passo seguinte foi executado após a falha
[ ] BLOQUEADO — pré-condição __ não se sustentava; execução nem começou

## Registro W6
- Achados no caminho (fora do escopo deste runbook): [lista ou "nenhum"]
- Atualização do artefato de rastreio: [nota `docs/plano/nos/W6.md` (estado) + `docs/plano/gates/H2.md` atualizadas com o desfecho + data]
- Assinatura do executor: ____________
