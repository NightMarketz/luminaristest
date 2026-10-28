---
id: "FE-INCR-KANBAN-REORDER"
tipo: "fe"
dominio: "motor"
titulo: "Reordenar cards dentro da coluna do Kanban, com a ordem salva no servidor"
estado: "inflight"
estado_detalhe: "26/10 (fold): **#895 (fix mínimo do passo 4) e #896 (BRIEF da EMENDA 1 — refetch no evento `online`, forks F-KRO-1..5 ratificados na recomendação, dono 25/10) em `main`** pelo consolidado #902 (25/10). A EMENDA 1 ainda não tem 'executa'; passos 5–10 do runbook por rodar; alinhar tela × rebalanceio parcial segue com o dono · 21/10: BRIEF escrito (sessao-planejamento). 21/10: forks F-KR-1..6 RATIFICADOS na recomendação (dono, chat, 2026-10-21: \"Pode tomar as decisões de acordo com o recomendado\"). 21/10: código mergeado no #824 (CI verde; testes de unidade com servidor simulado). Conferência na tela (#830) rodada 24/10 e fechada 25/10 como FALHOU no passo 4 (#886; assinatura do agente, persona revisor, D-2026-10-25-RUNBOOK-TELA-AGENTE-EXECUTOR): falha de rede no meio do rebalanceio esvazia o quadro até o F5. 25/10: guarda + fix mínimo no #895 (quadro mantém os cards); passos 5–10 não rodados. 25/10: Emenda 1 (refetch no `online`) planejada e forks F-KRO-1..5 ratificados (#896). 27/10: Emenda 1 implementada no #931 (EXECUTA, dono, chat, 2026-10-27: “Executa a EMENDA 1 do FE-INCR-KANBAN-REORDER (#896) — sessao-feature, sem merge; depois roda os passos 5–10 do runbook em build de produção.”; sem merge). Rodada de 27/10 do runbook em build de produção: passo 4 (aceite da Emenda) e passo 5 conferem; passo 6 FALHOU (soltar na área vazia da coluna põe o card antes do último, não no fim; comportamento do #824/F-KR-4, decisão do dono); passos 7–10 não rodados. 28/10: passo 6 instrumentado e corrigido no #961 (colisão `pointerWithin` primeiro; “Instrumentar o passo 6” e “Sim, corrigir”, dono, 28/10; sem merge). Rodada de 28/10 do runbook (build de produção, branch do #961): passo 6 e regressão “soltar sobre card” conferem; passo 7 FALHOU (a barra do Kanban não oferece ordenação: `SortSelect` lê `record.data`, ausente no `Task`); passos 8–10 não rodados"
depende_de: []
autorizacao: "dono, chat, 2026-10-21, sobre o item 22 do §3.5 retirado no #813: \"Esse nao pode voltar?\" + clique no cartão da sessão de planejamento — só o BRIEF (sessao-planejamento); sem código, sem executa · dono, chat, 2026-10-21: \"Pode tomar as decisões de acordo com o recomendado\" — forks F-KR-1..6 ratificados na recomendação; sem executa · **EXECUTA** (dono, chat, 2026-10-21): \"Executa o FE-INCR-KANBAN-REORDER — sessao-feature, sem merge.\" — sem merge"
prs: ["#824", "#830", "#886", "#895", "#896", "#931", "#961"]
ancora_sdd: "—"
perfil_previsto: "opus-medio"
perfil_evidencia: "FE de um hook + leitura de um campo de preset que já existe; risco no backfill de linhas com order=0 e em tabelas kanban criadas pelo usuário sem o campo"
atualizado: "2026-10-28"
---
# FE-INCR-KANBAN-REORDER — reordenar cards na coluna, ordem persistida

**Estado:** `inflight` — 26/10 (fold): **#895 (fix mínimo do passo 4) e #896 (BRIEF da EMENDA 1 — refetch no evento `online`, forks F-KRO-1..5 ratificados na recomendação, dono 25/10) em `main`** pelo consolidado #902 (25/10). A EMENDA 1 ainda não tem 'executa'; passos 5–10 do runbook por rodar; alinhar tela × rebalanceio parcial segue com o dono · 21/10: BRIEF escrito (sessao-planejamento). 21/10: forks F-KR-1..6 RATIFICADOS na recomendação (dono, chat, 2026-10-21: "Pode tomar as decisões de acordo com o recomendado"). 21/10: código mergeado no #824 (CI verde; testes de unidade com servidor simulado). Conferência na tela (#830) rodada 24/10 e fechada 25/10 como FALHOU no passo 4 (#886; assinatura do agente, persona revisor, D-2026-10-25-RUNBOOK-TELA-AGENTE-EXECUTOR): falha de rede no meio do rebalanceio esvazia o quadro até o F5. 25/10: guarda + fix mínimo no #895 (quadro mantém os cards); passos 5–10 não rodados. 25/10: Emenda 1 (refetch no `online`) planejada e forks F-KRO-1..5 ratificados (#896). 27/10: Emenda 1 implementada no #931 (EXECUTA, dono, chat, 2026-10-27: “Executa a EMENDA 1 do FE-INCR-KANBAN-REORDER (#896) — sessao-feature, sem merge; depois roda os passos 5–10 do runbook em build de produção.”; sem merge). Rodada de 27/10 do runbook em build de produção: passo 4 (aceite da Emenda) e passo 5 conferem; passo 6 FALHOU (soltar na área vazia da coluna põe o card antes do último, não no fim; comportamento do #824/F-KR-4, decisão do dono); passos 7–10 não rodados. 28/10: passo 6 instrumentado e corrigido no #961 (colisão `pointerWithin` primeiro; “Instrumentar o passo 6” e “Sim, corrigir”, dono, 28/10; sem merge). Rodada de 28/10 do runbook (build de produção, branch do #961): passo 6 e regressão “soltar sobre card” conferem; passo 7 FALHOU (a barra do Kanban não oferece ordenação: `SortSelect` lê `record.data`, ausente no `Task`); passos 8–10 não rodados  
**Autorização:** dono, chat, 2026-10-21: "Esse nao pode voltar?" (sobre a reordenação retirada no item 22 do §3.5, PR #813). Cobre só este BRIEF.
**Depende de:** —
**Desbloqueia:** —

Origem: FIX-FE-DASHBOARD §3.5 item 22 (#813) tirou o `arrayMove` em `localTasks` porque a ordem voltava no
próximo refetch. O dono quer a reordenação de volta, desta vez gravada.

## Fronteira (ADR-PERSISTENCE-BOUNDARY)

Tabela Kanban = DynamicTable desenhada pelo usuário → a ordem é **campo de schema**, sem model Prisma, sem
serviço Prisma no motor, sem mexer em `DynamicTableService.ts` para integrar nada.

## Fatos lidos no código (verificado, 21/10)

- `useKanbanLogic.tsx:112-138` — `handleDragEnd` só trata soltar **sobre uma coluna** (`updateRecord` com
  `{ status }` + `refetch`). Soltar sobre um card não faz nada (comentário da linha 137, decisão de 21/10).
- `useKanbanLogic.tsx:61-76` — `filteredTasks` filtra e aplica `sortRecords(result, sortConfig)`; sem
  `sortConfig` a ordem é a da API.
- `useKanbanData.tsx:25-100` — busca `getTableData(table.id)` por tabela da categoria `kanban`; não lê `order`.
- **`server/.../presets/modules/core/TasksModule.ts:59-67` já declara o campo `order`**: `number`,
  `numberFormat: 'integer'`, `required: true`, `defaultValue: 0`, `hidden: true`. Nenhum consumidor do FE o
  lê (único uso: `KanbanCardDetailModal.tsx:133`, para escondê-lo). Ou seja, as linhas existentes têm
  `order = 0` (ou ausente, se anteriores ao campo — **não verificado em banco**).
- Categoria `kanban` existe em `TableCategories.ts:39`: o usuário pode criar tabela kanban própria, **sem**
  o campo `order` (inferido do motor; não verificado com tabela real).
- O motor tem `batch-delete` (`routes/dynamic-tables.ts:45`), mas **não tem update em lote**.

## 1. Checklist (comportamentos, cada um testável)

1. **Ordenação de leitura:** dentro de cada coluna, sem `sortConfig` do usuário, os cards saem por
   `order` ascendente; empate desempata por `createdAt` (depois `id`). Com `sortConfig` escolhido, vale o
   `sortConfig` (a ordem manual é o default, não sobrepõe a escolha). Teste: unit sobre a função pura de
   ordenação.
2. **Soltar sobre card da mesma coluna:** calcula a nova posição (contrato §2), aplica otimista em
   `localTasks`, grava via `DynamicTableService.updateRecord(tableId, id, { data: { order } })` — escopo
   conforme F-KR-3 — e, em erro, faz rollback para o snapshot anterior. Teste: estende
   `hooks/__tests__/useKanbanLogic.reorder.test.ts` (hoje guarda que *não* reordena — passa a guardar que
   reordena **e** chama o update com o `order` esperado).
3. **Persistência sobrevive ao refetch:** após `refetch()`, a ordem é a gravada. Teste: mock do
   `getTableData` devolvendo o `order` gravado → mesma ordem.
4. **Soltar em outra coluna** (sobre a coluna ou sobre um card dela): comportamento conforme F-KR-4; a
   gravação de `status` e `order` vai **num único** `updateRecord` (um request, uma versão no ledger).
5. **Card novo** entra com `order` conforme F-KR-5 (o default do preset hoje é 0).
6. **Tabela kanban sem campo `order`:** conforme F-KR-6; nunca 400 silencioso nem drag que "volta".
7. **Backfill** das linhas existentes conforme F-KR-2.
8. **Gates do diff:** `tsc` (`my-app` e, se F-KR-6 tocar preset, `server`), `npm run test:types`,
   `check:arch`; se mudar o preset `Tasks` → snapshot de shape/preset e i18n pt/en do label; sem eventType
   novo (não toca `auditCanonical.ts`); sem rota nova (openapi intocado) — **salvo** se F-KR-3 escolher
   endpoint em lote.

## 2. Contratos (esboço)

```ts
// campo já existente no preset Tasks (TasksModule.ts:59) — mudança só se F-KR-1 = (b)
{ name: 'order', type: 'number', numberFormat: 'integer', required: true, defaultValue: 0, hidden: true }

// FE — função pura, sem I/O (nova, em hooks/ ou utils do kanban)
type OrderedTask = { id: string; status: string; order: number | null; createdAt?: string };
function sortByManualOrder(tasks: OrderedTask[]): OrderedTask[];           // item 1
function computeDropOrder(                                                  // item 2/4
  column: OrderedTask[],          // já ordenada, sem o card movido
  targetIndex: number,
): { order: number } | { rebalance: Array<{ id: string; order: number }> };

// gravação — rota existente, sem contrato novo
DynamicTableService.updateRecord(tableId, recordId, { data: { order /*, status*/ } });
```

## 3. Forks — RATIFICADOS 21/10 na recomendação

Dono, chat, 2026-10-21: "Pode tomar as decisões de acordo com o recomendado". Cada fork abaixo fica com a opção marcada *Recomendação* ✅. Não autoriza implementar.

**F-KR-1 ✅ · Tipo do campo.** (a) reusar o `order` inteiro que já existe, com **lacunas** (passo 1000;
inserção no meio = média; sem espaço → rebalanceia a coluna); (b) trocar para fracionário (`decimal`,
média sempre; rebalanceio raro por precisão); (c) campo novo `position`.
*Recomendação: (a).* O campo já está no preset e escondido no modal; inteiro com lacunas cobre o uso
humano (rebalanceio só depois de ~10 inserções no mesmo vão) sem mudar schema nem criar segundo campo de
ordem. (c) duplicaria semântica com `order`.

**F-KR-2 ✅ · Backfill das linhas existentes** (todas `order = 0`/ausente). (a) preguiçoso no FE: ao primeiro
drag numa coluna em que há empate, grava a coluna inteira com lacunas na ordem visível atual; (b) script
de migração de dado no servidor (ordem por `createdAt`), uma vez; (c) nada — empate desempata por
`createdAt` e só o card movido recebe valor.
*Recomendação: (a).* Sem script nem migração (memória: migração de dado SQLite não é transacional e o S6
reprova backfill); a ordem gravada é a que o usuário está vendo. (c) parece mais barato mas quebra: card
movido para o meio de cards com 0 não tem vão inteiro.

**F-KR-3 ✅ · Escopo da gravação.** (a) só o card movido (1 `updateRecord`), e N chamadas só quando
rebalancear/backfill; (b) sempre a coluna inteira; (c) endpoint novo de update em lote no motor.
*Recomendação: (a).* 1 request no caso comum; rebalanceio em N `updateRecord` sequenciais, com rollback
total do estado local em falha e `refetch` no fim. (c) é atômico mas cria rota + write-path no motor
(frente BE própria); se o dono quiser atomicidade no rebalanceio, (c) vira nó BE vizinho.

**F-KR-4 ✅ · Soltar em outra coluna.** (a) soltar sobre card → entra **naquela posição**; soltar sobre a
área da coluna → vai **para o fim**; (b) sempre para o fim, ignorando o card alvo; (c) sempre para o topo.
*Recomendação: (a)* — é o que o dnd-kit já entrega (`over.id` = card ou coluna) e o que o usuário espera
de um Kanban; grava `status` + `order` num só update.

**F-KR-5 ✅ · Card novo.** (a) fim da coluna (`max(order)+1000`, calculado no FE ao criar pelo Kanban;
criado fora do Kanban fica com 0 → topo, empate por `createdAt`); (b) topo; (c) mudar o default do preset.
*Recomendação: (a)* sem mexer no preset. **Insumo ausente:** não li o fluxo de criação de card do Kanban
(onde o create é montado); a sessão de feature confirma.

**F-KR-6 ✅ · Tabela kanban criada pelo usuário sem `order`.** (a) desabilita a reordenação nessa tabela (drag
só muda coluna) com dica na UI; (b) o FE adiciona o campo ao schema na primeira reordenação; (c) o motor
garante o campo para toda tabela da categoria `kanban`.
*Recomendação: (a).* (b) muta schema do usuário por efeito colateral de drag; (c) é regra de categoria no
motor (frente BE). **Inferido**, não medido: quantas tabelas kanban sem o preset existem.

## 4. Pendente de validação externa

Nenhuma — sem regra contábil/fiscal/legal.

## 5. Insumos ausentes

- Fluxo de criação de card no Kanban (F-KR-5).
- Se linhas antigas do preset `Tasks` têm `order` gravado ou ausente (backfill de F-KR-2 trata os dois).
- Se o `updateRecord` com `{ data: { order } }` faz merge parcial ou exige o registro inteiro
  (memória: Zod 4 `.partial()` resetava campo — corrigido no #385; a sessão de feature confirma com teste).

## 6. Achados fora de escopo

- Não existe update em lote no motor DynamicTable (só `batch-delete`) — só vira frente se F-KR-3 = (c).
