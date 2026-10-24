# RUNBOOK: Kanban — reordenação persistida (FE-INCR-KANBAN-REORDER, #824) + lote 4 do FIX-FE-DASHBOARD (#813)

> Formato: `docs/operating-manual/RUNBOOK-FORMAT.md`. Quem preenche é o humano: evidência, desfecho e assinatura.
> O agente só preparou os passos. Runbook sem assinatura é nulo.

Executor: ____________ (humano)           Data: ____________
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

5. Arraste um card para **outra coluna**, soltando **sobre um card** dela.
   Resultado esperado: o card entra na posição daquele card (F-KR-4) e muda de status. 1 update com
   `status` + `order`. Continua igual depois do F5.
   EVIDÊNCIA: ____

6. Arraste um card para outra coluna soltando na **área vazia** da coluna.
   Resultado esperado: o card vai para o **fim** da coluna. Continua igual depois do F5.
   EVIDÊNCIA: ____

7. Escolha uma **ordenação** na barra do Kanban (por exemplo, prioridade) e tente reordenar dentro da coluna.
   Resultado esperado: a ordem não muda (com ordenação escolhida, arrastar só muda de coluna). Nenhum update.
   EVIDÊNCIA: ____

8. Abra uma tabela Kanban **criada pelo usuário, sem campo `order`**. Se não existir nenhuma, marque N/A.
   Resultado esperado: aparece a dica "A ordem dos cards nesta tabela não é salva: arrastar só muda o card
   de coluna." Arrastar entre colunas funciona; dentro da coluna não reordena.
   EVIDÊNCIA: ____

9. Lote 4 (#813): abra o detalhe de um card, troque o idioma para EN e confira os textos (Quick Actions,
   Archive, Detailed Information, Created at…). Feche com Esc ou clique fora.
   Resultado esperado: nenhum texto em PT na tela EN. O inspetor mostra `role="dialog"` no overlay.
   EVIDÊNCIA (screenshot EN + trecho do inspetor): ____

10. Lote 4 (#813): numa tabela com coluna de relação (ex.: cliente), limpe o localStorage do site e abra
    a tabela.
    Resultado esperado: a coluna de relação aparece visível, e não oculta até alguém ligá-la à mão.
    EVIDÊNCIA: ____

## Desfecho (marcar UM)
[ ] PASSOU — todos os passos com evidência conferindo com o esperado
[ ] FALHOU — passo __ divergiu; evidência da divergência colada acima;
    NENHUM passo seguinte foi executado após a falha
[ ] BLOQUEADO — pré-condição __ não se sustentava; execução nem começou

## Registro
- Achados no caminho (fora do escopo deste runbook): agente, 2026-10-24 — (1) POST de card na `Tasks` sem `date` (campo
  obrigatório do preset) devolve 400 com a mensagem "Invalid input: expected date, received Date", que confunde;
  (2) o `next start` do front saiu com exit 1 sem erro no log, cerca de 2 min depois de subir; (3) depois do F5, a barra
  lateral marca "All Tables" enquanto o Kanban está aberto. Passos 5 a 10 **não** foram executados (regra do FALHOU).
- Atualização do artefato de rastreio: `docs/plano/nos/FE-INCR-KANBAN-REORDER.md` (estado + data)
- Assinatura do executor: ____________
