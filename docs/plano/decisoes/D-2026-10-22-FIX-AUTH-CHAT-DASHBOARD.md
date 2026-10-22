---
id: "D-2026-10-22-FIX-AUTH-CHAT-DASHBOARD"
tipo: "decisao"
dominio: "plataforma"
titulo: "Itens de decisão do dono em FIX-AUTH-CONTA lote 3 (#7 #8 #13 #14 #16 #17 #18 #19), FIX-FE-DASHBOARD item 23 e a sequência do FIX-CHAT-AGENTE §3.3"
estado: "decided"
autorizacao: "dono, chat, 2026-10-22, respostas ao AskUserQuestion: #7 \"Só admin\"; #16 \"JWT de 30 dias se marcado\"; #19 \"Cookie httpOnly do server\"; \"#8 remover 'Make admin', #13 e #14 remover rotas, #17 rate limit no cadastro, #18 trust proxy\"; item 23 \"Concordo, fecha\"; FIX-CHAT-AGENTE \"Todos os 22 em série\"; Kanban \"Sim, prepara\". NÃO é merge"
atualizado: "2026-10-22"
---
# D-2026-10-22-FIX-AUTH-CHAT-DASHBOARD

**Estado:** `decided`. **Autorização:** dono, chat, 22/10/2026, respostas ao questionário (texto literal no campo
`autorizacao`). Origem dos itens: [`ACHADOS-2026-10-19`](../../operating-manual/ACHADOS-2026-10-19-DYNAMICTABLE-E-MODULOS-ANTIGOS.md)
§3.3, §3.4 e §3.5. Sem merge: vale a regra "merge só com PR nomeado".

## [[FIX-AUTH-CONTA]] — lote 3, itens que dependiam do dono

| # | Achado | Decisão |
|---|---|---|
| 7 | README diz `GET /users/:id` "self or admin"; middleware nega USER; a tela de edição abre para USER e quebra | **Só admin.** O middleware fica como está; a tela de edição não oferece a rota a USER e o README é corrigido |
| 8 | Botão "Make admin" temporário no perfil (backend já responde 403) | **Remover** do FE |
| 13 | `POST /reports/generate-chart-data` sem consumidor | **Remover** rota e controller |
| 14 | `GET /dashboard-layout/:id` sem consumidor | **Remover** a rota |
| 16 | "Lembrar-me 30 dias" × JWT fixo de 7 dias | **JWT de 30 dias quando marcado** (cookie com o mesmo prazo); desmarcado segue 7 dias. Revogação continua pelo `tokenVersion` do lote 1 |
| 17 | `/register` e `POST /users` sem rate limit específico | **Limiter específico** nas duas rotas, no padrão do login |
| 18 | `trust proxy` nunca definido | **`app.set('trust proxy', 1)`** — assume um proxy na frente no deploy; revisar se o deploy tiver outra topologia |
| 19 | Cookie `auth_token` gravado pelo JS (sem `httpOnly`); backend aceita cookie como fallback | **Cookie `httpOnly` emitido pelo servidor** (login/logout setam e limpam; o FE deixa de ler o token). Raio grande: `AuthContext`, SSR do `withAuth`, ApiClient e proteção CSRF. A forma da proteção CSRF (SameSite=Strict só, token duplo, checagem de Origin) **não foi decidida** — vai para BRIEF antes do código |

Continuam abertos (não perguntados nesta rodada): #10/#11 (cobertura da purga × guarda fiscal; binário do anexo
apagado até a purga), #20 (`createdAt` no contexto). #5 e #15 seguem fora do nó (e-mail; página mock).

## [[FIX-FE-DASHBOARD]] — item 23

**Não é defeito.** Paginar no cliente é escolha do loader (busca todas as páginas de propósito) e zerar os filtros na
troca de aba é deliberado ("paridade com handleTabChange"), como a instrumentação do PR #810 concluiu. Item fechado sem guarda.

## [[FIX-CHAT-AGENTE]] — §3.3

#1, #4 e #7 corrigidos (#803 e `c7218b59` na main). Os **22 itens restantes** seguem **em série**, lotes de até 8,
cada lote instrumentação → correção, sem merge, sob a autorização de 21/10 ("Autorizo instrumentar e corrigir os
achados de … FIX-CHAT-AGENTE (§3.3) … lotes de até 8 itens por PR, sem merge"). Item que, ao instrumentar, se mostrar
decisão de produto (ex.: remover rota sem consumidor, #17/#20) volta ao dono em vez de ser corrigido.

## [[FE-INCR-KANBAN-REORDER]] — conferência na tela

O agente prepara as pré-condições do [`RUNBOOK-KANBAN-REORDER`](../../runbooks/RUNBOOK-KANBAN-REORDER.md) e preenche
só a EVIDÊNCIA delas com saída literal de comando que ele executou. Passos na tela, desfecho e assinatura: dono.
