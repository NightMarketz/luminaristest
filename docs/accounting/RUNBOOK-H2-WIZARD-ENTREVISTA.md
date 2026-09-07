# RUNBOOK: H2-WIZARD — Sign-off de browser da aba "Entrevista com IA" (pós-fix do 401, PR #271)

> Preparado por agente em 2026-09-07 contra a branch `claude/chatbot-builder-status-153ba2`
> (commit `3362b0b7`, PR #271). **Em branco de propósito:** EVIDÊNCIA, desfecho e assinatura são do
> executor humano — runbook sem assinatura é nulo (`docs/operating-manual/RUNBOOK-FORMAT.md`).
> O "antes" já tem evidência de agente (2026-09-07: `POST /api/dashboard/ai/ChatInterview → 401` 2×
> ao abrir a aba e 1× ao enviar, chat mudo, "Desculpe, ocorreu um erro de comunicação."). Este runbook
> é o "depois", que só o humano fecha.

Executor: [nome — humano]           Data: [____]
Autorização: dono, 2026-09-07 — "Corrige o 401 mandando o Bearer no hook" (correção) e "Pode seguir a
ordem natural" (este sign-off é o item 1 da ordem). Rastreio: `ACCOUNTING-MASTER-MAP.md` §5.1 Bloco A,
item 4 (sign-offs de browser) — acrescentar "wizard Entrevista com IA" à lista; `GAP-MAP.md` Nível 3,
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
