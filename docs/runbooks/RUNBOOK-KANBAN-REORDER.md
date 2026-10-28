# RUNBOOK: Kanban — reordenação persistida (FE-INCR-KANBAN-REORDER, #824) + lote 4 do FIX-FE-DASHBOARD (#813)

> Formato: `docs/operating-manual/RUNBOOK-FORMAT.md`. Quem preenche é o humano: evidência, desfecho e assinatura.
> O agente só preparou os passos. Runbook sem assinatura é nulo.

Executor: agente Claude Opus 5.5, persona revisor — exceção de `RUNBOOK-FORMAT.md` §Fronteira (dono, chat, 2026-10-25:
"Pode preencher como persona do revisor, pode adicionar essa regra como executor ai")           Data: 2026-10-24 (execução) · 2026-10-25 (desfecho)
Autorização: dono, chat, 2026-10-21: "prepara o roteiro da conferência na tela" (#824 e #813 já mergeados)
Pré-condições (conferir e colar a evidência de cada uma):
- [ ] Checkout no main com os dois PRs (merge do #824 = `3ddd33dc`). `git log --oneline -1` mostra commit igual a ou depois de `3ddd33dc`.
      EVIDÊNCIA (agente, 2026-10-22, worktree `practical-haibt-74bbb8`; o 1º commit é só docs do #834, o código é o da main `882d69c9`):
      ```
      $ git log --oneline -2
      dda6efef docs(plano): decisões do dono 22/10 — FIX-AUTH-CONTA lote 3, FIX-FE-DASHBOARD item 23, FIX-CHAT-AGENTE em série
      882d69c9 fix(auth-conta): FIX-AUTH-CONTA lote 3 — #4 logout envia a sessão — não mergear sem OK (#831)
      $ git merge-base --is-ancestor 3ddd33dc HEAD && echo "3ddd33dc é ancestral de HEAD"
      3ddd33dc é ancestral de HEAD
      ```
- [ ] **Build de produção** do front, nunca `next dev`: `cd my-app && npm run build && npm start`. O servidor
      foi reiniciado desse mesmo commit: `cd server && npm run build && npm start`. Servidor velho serve código velho.
      EVIDÊNCIA (agente, 2026-10-22; `npm run build` exit 0 nos dois lados; servidores no painel do navegador, `npm run start`):
      ```
      [server] Luminaris Server running on http://localhost:3001
      [server] $ curl -s localhost:3001/health
               {"status":"degraded","uptime":61.5845403,"checks":{"database":"ok","qdrant":"error"}}
      [my-app] ▲ Next.js 15.3.1  - Local: http://localhost:3000   ✓ Ready in 399ms
      [my-app] $ curl -s -o /dev/null -w "frontend %{http_code}" localhost:3000/   →   frontend 200
      ```
      Qdrant fora do ar (degraded) — não afeta o Kanban.
- [ ] Banco populado: `server/prisma/prisma/dev.db`, não o `server/prisma/dev.db` de 0 byte. Usuário logado.
      EVIDÊNCIA (agente): cópia do `server/prisma/prisma/dev.db` do checkout principal para o worktree (o original não foi
      tocado) + `prisma migrate deploy` (1 pendente: `20261021130000_add_consumption_tax_assessments`).
      `-rw-r--r-- 9338880 Oct 22 01:40 prisma/prisma/dev.db`. Login: usuário `SEED_ADMIN_EMAIL` do `server/.env` (a***@luminaris.test) — o login na tela é do dono.
- [ ] Uma tabela Kanban **do preset** (tem o campo `order`) com **pelo menos 6 cards numa coluna** e pelo
      menos 2 colunas. Se não houver, crie os cards antes de começar.
      EVIDÊNCIA (agente): a tabela `Tasks` (preset, campo `order`) do admin estava vazia; 12 cards criados pela API
      (`POST /api/dynamic-tables/:id/data`, 201 cada), `order` 1..n por coluna. Contagem lida do banco depois:
      `a***@luminaris.test | Tasks | tasks | status: status | {"To Do":7,"In Progress":3,"Done":2}`.
      Atenção: como `order` é obrigatório no preset, toda coluna já nasce ordenada — o caminho de backfill dos passos 1 e 4
      ("coluna nunca ordenada") pode não aparecer; anote o que a Network mostrar.
- [ ] DevTools aberto nas abas Console e Network, com o filtro de Network nas chamadas de update de registro.

> **Rodada de 2026-10-24** (agente, sob comando do dono no chat: "Pode seguir"; worktree `fe-incr-kanban-reorder-309eda`,
> navegador embutido do app, sem DevTools — Network lida por `read_network_requests`/`performance.getEntriesByType`).
> Pré-condições desta rodada:
> ```
> $ git log --oneline -1            → 24758cdc (3ddd33dc é ancestral)
> server: npm run build → exit 0 ; my-app: npm run build → exit 0 ; ambos com `npm run start`
> $ curl -s localhost:3001/health   → {"status":"degraded",...,"checks":{"database":"ok","qdrant":"error"}}
> $ curl localhost:3000/            → frontend 200
> dev.db: cópia de server/prisma/prisma/dev.db do checkout principal + prisma migrate deploy ("All migrations have been
>   successfully applied") + npm run db:seed ("Admin user created/updated: admin@luminaris.test"); login na tela como esse admin
> Tasks estava vazia → 16 cards via POST /api/dynamic-tables/:id/data (201 cada). Lido do banco depois:
>   To Do: 7 cards order 0 | In Progress: 6 cards order 0 | Done: 3 cards order 1000/2000/3000
> ```
> O front de produção caiu sozinho (exit 1, sem erro no log) entre o preparo e o passo 2; foi reiniciado com `npm run start`
> do mesmo build antes do F5 do passo 2. O passo 1 rodou com o bundle já carregado e o back no ar.

> **Rodada de 2026-10-27** (agente, persona revisor; comando do dono no chat, 2026-10-27, repassado pelo orquestrador: "Executa a
> EMENDA 1 do FE-INCR-KANBAN-REORDER (#896) — sessao-feature, sem merge; depois roda os passos 5–10 do runbook em build de
> produção."). Passo 4 rodado de novo como aceite da Emenda 1 (item 6 do `FE-INCR-KANBAN-REORDER-EMENDA-1-brief.md`); 5 em
> diante pela primeira vez. Chrome headless pelo Puppeteer de `server/node_modules` (runner `kro.mjs` no scratchpad da sessão,
> 1800×1000); prints e logs em `docs/runbooks/evidencia-kanban-reorder-2026-10-27/`. Pré-condições desta rodada:
> ```
> $ git log --oneline -1   → 302c54cc feat(kanban): EMENDA 1 do FE-INCR-KANBAN-REORDER — refetch no evento online quando a última busca falhou
>                            (branch claude/kanban-reorder-emenda-1 sobre origin/main bd2b6fd1; #824 e #895 na base)
> server: npm run build → build exit=0 ; my-app: NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:3021/api npm run build → next build exit=0
> back: npm run start (PORT=3021, ALLOWED_ORIGIN=http://127.0.0.1:3020) ; front: next start -p 3020 -H 127.0.0.1
> $ curl -s 127.0.0.1:3021/health → {"status":"degraded","uptime":13.5417881,"checks":{"database":"ok","qdrant":"error"}}
> $ curl -s -o /dev/null -w "frontend %{http_code}" http://127.0.0.1:3020/ → frontend 200
> banco: cópia de server/prisma/prisma/dev.db do checkout principal → server/prisma/prisma/kro-rb.db (o original não foi tocado)
>   prisma migrate deploy → "All migrations have been successfully applied." ; npm run db:seed → "Admin user created/updated: admin@luminaris.test"
> Tasks (preset, campo order) do admin vazia → 15 cards via POST /api/dynamic-tables/:id/data, "201" em cada. Lido do banco:
>   To Do -> A fazer 1..6 = 0 | In Progress -> Em andamento 1..6 = 0 | Done -> Feito 1=1000, Feito 2=2000, Feito 3=3000
> ```
> Network e console lidos pelo runner (`page.on('response'|'requestfailed'|'console')`), não pelo DevTools.

## Passos
Pare no primeiro passo que divergir. Não execute os seguintes (regra do FALHOU).

1. Na coluna com 6+ cards, arraste o **último** card para o **topo** e solte sobre o primeiro card.
   Resultado esperado: o card fica no topo. Na Network aparece pelo menos 1 update com `order`. Se a
   coluna nunca tinha sido ordenada, aparecem vários updates, um por card (backfill), sem toast repetido.
   Console sem erro.
   EVIDÊNCIA (screenshot + linhas da Network): agente, 2026-10-24 — coluna To Do (7 cards, todos order 0), "A fazer 7"
   solto sobre "teste". Telas: `evidencia-kanban-reorder-2026-10-24/p1-antes.jpg`, `p1-depois.jpg` (1 toast "Registro
   atualizado com sucesso.").
   ```
   PUT /api/dynamic-tables/cmr2jy28w0062ci1kemqrt5vo/data/cmvmuact9000rcis0q6xxlmgb → 200 OK   (+ 6 PUTs, um por card, todos 200)
   banco depois: A fazer 7=1000, teste=2000, A fazer 2=3000, 3=4000, 4=5000, 5=6000, 6=7000
   console: só os 400 de /_next/image?url=/logo.png (anteriores ao arrasto); nenhum erro do arrasto
   ```

2. Recarregue a página (F5).
   Resultado esperado: a ordem do passo 1 **continua igual** (é o que antes voltava).
   EVIDÊNCIA (screenshot depois do F5): agente, 2026-10-24 — `p2-depois-f5.jpg`: To Do = A fazer 7, teste, A fazer 2, 3, 4, 5, 6
   (igual ao fim do passo 1).

3. Arraste um card do meio da coluna para entre outros dois cards, 3 vezes seguidas em lugares diferentes.
   Depois recarregue.
   Resultado esperado: depois do F5 a ordem é exatamente a última vista antes do F5. No caso comum, cada
   arrasto gera **1** update.
   EVIDÊNCIA (screenshot antes e depois do F5 + número de updates por arrasto): agente, 2026-10-24 — arrastos: "A fazer 3"
   sobre "teste"; "A fazer 5" sobre "A fazer 2"; "A fazer 7" sobre "A fazer 4". Telas `p3-antes-f5.jpg` e `p3-depois-f5.jpg`,
   ambas: A fazer 3, teste, A fazer 5, 2, 4, 7, 6.
   ```
   arrasto 1: PUT .../data/cmvmuacos000bcis01ehjtnco 200  + GETs do refetch   → 1 update
   arrasto 2: PUT .../data/cmvmuacr0000jcis0kijtidgn 200  + GETs do refetch   → 1 update
   arrasto 3: PUT .../data/cmvmuact9000rcis0q6xxlmgb 200  + GETs do refetch   → 1 update
   banco depois: A fazer 3=1500, teste=2000, A fazer 5=2500, 2=3000, 4=5000, 7=6000, 6=7000
   ```

4. **Risco principal, o rebalanceio parcial.** Na Network, ative throttling "Offline" **logo depois** de
   soltar um card que dispare vários updates (repita o passo 1 numa coluna nova, ainda não ordenada) e
   volte para "No throttling".
   Resultado esperado: a tela volta para a ordem do servidor (rollback + refetch), sem card duplicado nem
   sumido. Depois do F5, a ordem pode ser a antiga ou uma parcialmente gravada, mas é **a mesma** que a
   tela mostrava antes do F5.
   EVIDÊNCIA (screenshot antes e depois do F5 + erro da Network): agente, 2026-10-24 — **diverge do esperado.**
   Método (o painel não tem throttling "Offline"): `window.fetch` envolvido no console para deixar passar os 2 primeiros PUTs e
   rejeitar com `TypeError('Failed to fetch')` — o mesmo erro do modo offline — toda chamada a :3001 seguinte; restaurado ~3 s
   depois de soltar. Arrasto: "Em andamento 6" sobre "Em andamento 1" (coluna In Progress, 6 cards com order 0).
   ```
   OK        PUT .../data/cmvmuad05001fcis038kc3mjc {"data":{"order":1000}}   (Em andamento 6)
   OK        PUT .../data/cmvmuacud000vcis0bloti76c {"data":{"order":2000}}   (Em andamento 1)
   BLOQUEADO PUT .../data/cmvmuacvm000zcis0lai6i3iu
   BLOQUEADO GET /dynamic-tables/cmr2jy28w0062ci1kemqrt5vo
   BLOQUEADO GET /dynamic-tables/cmr2jy28w0062ci1kemqrt5vo/data   (+ GET .../data das outras 2 tabelas)
   console: TypeError: Failed to fetch ... at Object.updateRecord ; "Failed to fetch data for table Tasks"
   banco depois: Em andamento 6=1000, Em andamento 1=2000, Em andamento 2..5=0
   ```
   Antes do F5 (`p4-antes-f5-quadro-vazio.jpg`, com a rede já de volta e 5 s de espera): **o quadro inteiro ficou vazio** — as
   4 colunas com 0 cards, inclusive To Do e Done, que não foram tocadas. Não voltou sozinho.
   Depois do F5 (`p4-depois-f5.jpg`): 16 cards, sem duplicado; In Progress = Em andamento 2, 3, 4, 5, 6, 1 (ordem parcial do
   servidor). A tela antes do F5 (vazia) **não** é a mesma de depois do F5.
   Causa provável (inferida lendo o código, não provada por teste): no `catch` do `handleDragEnd`
   (`useKanbanLogic.tsx:180-183`) o `refetch()` roda ainda offline; `useKanbanData.tsx:40-41` engole a falha (`.catch(() => null)`),
   pula a tabela e faz `setAggregatedData([])` (linha 88), que sobrescreve o rollback em `localTasks`.

   **Rodada de 2026-10-27 — aceite da Emenda 1 (item 6), com o #895 e a Emenda 1 no build: confere.**
   Método: "Offline" de verdade pelo protocolo do DevTools (`page.setOfflineMode(true)` = `Network.emulateNetworkConditions`,
   que dispara `offline`/`online` na página), ligado no instante do 3º PUT (o runner aborta esse PUT com
   `internetdisconnected`); 2 s depois, `setOfflineMode(false)`. Arrasto: "Em andamento 6" sobre "Em andamento 1" (In Progress,
   6 cards com order 0). Log literal (60 linhas finais; o topo saiu cortado por `tail`): `evidencia-kanban-reorder-2026-10-27/p4.log`.
   ```
   200       PUT .../data/cmvreesjw001fcidckp50dbxe {"data":{"order":1000}}
   200       PUT .../data/cmvreeshq000vcidctnj7z4vq {"data":{"order":2000}}
   OFFLINE   (setOfflineMode(true) antes do PUT nº 3)
   ABORTADO  PUT .../data/cmvreesi7000zcidcye9yxkga {"data":{"order":3000}}
   FALHOU    GET /api/dynamic-tables/cmr2jy28w0062ci1kemqrt5vo/data (net::ERR_INTERNET_DISCONNECTED)   (+ 3 GETs iguais)
   ONLINE    (setOfflineMode(false) — dispara o evento online)
   --- Network (evento online) ---   200 GET /api/dynamic-tables/cmr2jy28w0062ci1kemqrt5vo/data  (+ GET da tabela e das 2 de relação)
   rede de volta, antes do F5:  IN PROGRESS: Em andamento 2, Em andamento 3, Em andamento 4, Em andamento 5, Em andamento 6, Em andamento 1
   depois do F5:                IN PROGRESS: Em andamento 2, Em andamento 3, Em andamento 4, Em andamento 5, Em andamento 6, Em andamento 1
   IGUAL antes×depois do F5: true
   banco depois: Em andamento 2..5=0, Em andamento 6=1000, Em andamento 1=2000
   ```
   Telas: `p4-antes.png`; `p4-offline-rollback.png` (offline, depois do rollback: os 15 cards na tela, In Progress na ordem
   antiga 1..6, nenhum sumido nem duplicado); `p4-antes-f5.png` (rede de volta: ordem do servidor, sem F5); `p4-depois-f5.png`
   (igual). Console: `TypeError: Failed to fetch` e `Failed to fetch data for table Tasks` só durante o offline.

5. Arraste um card para **outra coluna**, soltando **sobre um card** dela.
   Resultado esperado: o card entra na posição daquele card (F-KR-4) e muda de status. 1 update com
   `status` + `order`. Continua igual depois do F5.
   EVIDÊNCIA: agente, 2026-10-27 — "A fazer 1" solto sobre "Feito 2" (Done). Log `p5.log`; telas `p5-antes.png`,
   `p5-depois.png`, `p5-depois-f5.png`.
   ```
   200       PUT /api/dynamic-tables/cmr2jy28w0062ci1kemqrt5vo/data/cmvreesfo0007cidcyqk1hxv2 {"data":{"status":"Done","order":1500}}
   depois do arrasto: DONE: Feito 1, A fazer 1, Feito 2, Feito 3
   depois do F5:      DONE: Feito 1, A fazer 1, Feito 2, Feito 3
   IGUAL antes×depois do F5: true
   console.error: só 404 [/favicon.ico] e 400 [/_next/image?url=%2Flogo.png...], da carga da página
   ```

6. Arraste um card para outra coluna soltando na **área vazia** da coluna.
   Resultado esperado: o card vai para o **fim** da coluna. Continua igual depois do F5.
   EVIDÊNCIA: agente, 2026-10-27 — **diverge do esperado.** "A fazer 2" solto na área vazia de Done, 40 px acima da borda de
   baixo da coluna (`{"x":1598,"y":936}`; em `p6-antes.png` Done tem 4 cards e o último termina em y≈720). Log `p6.log`;
   telas `p6-antes.png`, `p6-depois.png`, `p6-depois-f5.png`.
   ```
   arrasto: "A fazer 2" → {"x":1598,"y":936}
   200       PUT /api/dynamic-tables/cmr2jy28w0062ci1kemqrt5vo/data/cmvreesg0000bcidcjyrujhhr {"data":{"status":"Done","order":2500}}
   depois do arrasto: DONE: Feito 1, A fazer 1, Feito 2, A fazer 2, Feito 3
   depois do F5:      DONE: Feito 1, A fazer 1, Feito 2, A fazer 2, Feito 3
   banco depois: Feito 1=1000, A fazer 1=1500, Feito 2=2000, A fazer 2=2500, Feito 3=3000
   ```
   O card entrou **antes do último** (order 2500, entre Feito 2 e Feito 3), não no fim (seria 4000). Persistiu igual depois
   do F5. Causa provável (inferida lendo o código, não provada por teste): `InternalKanbanView.tsx` usa
   `collisionDetection={closestCenter}`; o droppable da coluna é o card inteiro da coluna, cujo centro fica no meio da altura,
   então na área vazia de baixo o centro mais próximo é o do último card, e o `handleDragEnd` trata o soltar como "sobre o
   card" (F-KR-4: entra na posição dele). O teste de unidade do #824 (item 4) passa `over: { id: 'done' }` direto e não
   exercita a colisão.

7. Escolha uma **ordenação** na barra do Kanban (por exemplo, prioridade) e tente reordenar dentro da coluna.
   Resultado esperado: a ordem não muda (com ordenação escolhida, arrastar só muda de coluna). Nenhum update.
   EVIDÊNCIA: não executado na rodada de 27/10 (regra do FALHOU: o passo 6 divergiu).

8. Abra uma tabela Kanban **criada pelo usuário, sem campo `order`**. Se não existir nenhuma, marque N/A.
   Resultado esperado: aparece a dica "A ordem dos cards nesta tabela não é salva: arrastar só muda o card
   de coluna." Arrastar entre colunas funciona; dentro da coluna não reordena.
   EVIDÊNCIA: não executado na rodada de 27/10 (regra do FALHOU: o passo 6 divergiu).

9. Lote 4 (#813): abra o detalhe de um card, troque o idioma para EN e confira os textos (Quick Actions,
   Archive, Detailed Information, Created at…). Feche com Esc ou clique fora.
   Resultado esperado: nenhum texto em PT na tela EN. O inspetor mostra `role="dialog"` no overlay.
   EVIDÊNCIA (screenshot EN + trecho do inspetor): não executado na rodada de 27/10 (regra do FALHOU: o passo 6 divergiu).

10. Lote 4 (#813): numa tabela com coluna de relação (ex.: cliente), limpe o localStorage do site e abra
    a tabela.
    Resultado esperado: a coluna de relação aparece visível, e não oculta até alguém ligá-la à mão.
    EVIDÊNCIA: não executado na rodada de 27/10 (regra do FALHOU: o passo 6 divergiu).

## Desfecho da rodada de 2026-10-24/25 (marcar UM)
[ ] PASSOU — todos os passos com evidência conferindo com o esperado
[x] FALHOU — passo 4 divergiu; evidência da divergência colada acima;
    NENHUM passo seguinte foi executado após a falha
[ ] BLOQUEADO — pré-condição __ não se sustentava; execução nem começou

## Registro
- Achados no caminho (fora do escopo deste runbook): agente, 2026-10-24 — (1) POST de card na `Tasks` sem `date` (campo
  obrigatório do preset) devolve 400 com a mensagem "Invalid input: expected date, received Date", que confunde;
  (2) o `next start` do front saiu com exit 1 sem erro no log, cerca de 2 min depois de subir; (3) depois do F5, a barra
  lateral marca "All Tables" enquanto o Kanban está aberto. Passos 5 a 10 **não** foram executados (regra do FALHOU).
- Atualização do artefato de rastreio: `docs/plano/nos/FE-INCR-KANBAN-REORDER.md` (estado + data) — fold no mesmo PR (#886)
- Assinatura do executor: agente Claude Opus 5.5, persona revisor, sob comando do dono (chat, 2026-10-25) — não é assinatura humana

## Desfecho da rodada de 2026-10-27 (marcar UM)
[ ] PASSOU — todos os passos com evidência conferindo com o esperado
[x] FALHOU — passo 6 divergiu (soltar na área vazia da coluna põe o card antes do último, não no fim); evidência colada
    acima; o passo 4 (aceite da Emenda 1) e o passo 5 conferiram; NENHUM passo seguinte (7–10) foi executado
[ ] BLOQUEADO — pré-condição __ não se sustentava; execução nem começou

## Registro da rodada de 2026-10-27
- Achados no caminho (fora do escopo deste runbook): agente, 2026-10-27 — (1) na carga de toda página o console mostra
  404 em `/favicon.ico` e 400 em `/_next/image?url=%2Flogo.png` (o mesmo 400 da rodada de 24/10); (2) a cópia do `dev.db`
  tinha a `Tasks` do admin vazia de novo (a rodada de 24/10 rodou noutra cópia). O passo 8 não chegou a rodar; ao preparar,
  o agente leu que o único caminho de UI que cria tabela nova (`addedTables` da Entrevista com IA, `dashboardController.ts`)
  fixa `category: 'other'`, então uma "tabela Kanban criada pelo usuário" talvez não exista por construção — não verificado.
- Atualização do artefato de rastreio: `docs/plano/nos/FE-INCR-KANBAN-REORDER.md` (estado + data) — fold no mesmo PR da Emenda 1
- Assinatura do executor: agente Claude Opus 5.5, persona revisor, sob comando do dono (chat, 2026-10-27) — não é assinatura humana
