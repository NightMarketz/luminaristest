# FE-INCR-KANBAN-REORDER — EMENDA 1 (refetch quando a rede volta)

> Documento da `sessao-planejamento`, 2026-10-25. É uma **emenda** ao BRIEF canônico, que está na nota
> [`docs/plano/nos/FE-INCR-KANBAN-REORDER.md`](../plano/nos/FE-INCR-KANBAN-REORDER.md) (forks F-KR-1..6 ratificados em 21/10,
> código no #824). Não tem código de aplicação. **Implementar exige "executa" próprio** (ORCH-006).
>
> **Autorização deste BRIEF:** dono, chat, 2026-10-25: *"Quando a rede voltar (evento online), o Kanban refaz o refetch se
> o último falhou. Planeja isso pela sessao-planejamento antes de codar."* A autorização cobre só o planejamento deste item.
>
> **Origem:** é o que sobrou do passo 4 do `docs/runbooks/RUNBOOK-KANBAN-REORDER.md`, que fechou FALHOU no #886.
> O #895 (guarda + fix mínimo) fez o quadro manter os cards quando o refetch falha. Ficou aberto um ponto: depois da falha,
> a tela mostra o snapshot do rollback e o servidor fica com o rebalanceio parcial. O F5 muda a ordem, e o runbook pede
> "a mesma que a tela mostrava antes do F5".

## 0. Fatos lidos no código (verificado em 25/10, branch do #895 sobre `1072f7a0`)

| Ponto | Fato |
|---|---|
| Quem busca | `useKanbanData.tsx:25` `fetchData`, exposto como `refetch`. É chamado no mount (`useEffect`, `:101-103`) e pelo `useKanbanLogic` depois de cada arrasto (`useKanbanLogic.tsx:179` no sucesso, `:183` no `catch` quando houve rebalanceio) |
| Falha por tabela | `getTableById`/`getTableData` têm `.catch(() => null)` (`:41-42`). A falha **não lança**: cai no `else` (`:84-86`), e com o #895 a tabela vai para `failedTableIds`, mantendo os cards de antes. O `catch` externo (`:93`) só pega erro fora disso e seta `error` |
| Sinal "último falhou" | **Não existe hoje.** `failedTableIds` é local de cada `fetchData` e o `error` não é setado na falha por tabela |
| Sincronização tela × dados | `useKanbanLogic.tsx:32-34`: `useEffect(() => setLocalTasks(tasks), [tasks])`. Um refetch bem-sucedido substitui o snapshot do rollback pela ordem do servidor |
| Hook de rede canônico | **Não há.** Não acho `'online'`, `navigator.onLine` nem `useOnline` em `my-app` fora de `node_modules` (grep, 25/10). Logo não há canônico a reusar (`_REUSE-CRITERION.md`) |
| Consumidor único | `KanbanView.tsx:13` é o único chamador de `useKanbanData` |

**Dependência:** este BRIEF assume o comportamento do #895, que mantém os cards da tabela que falhou. Sem o #895, um
refetch bem-sucedido no `online` ainda corrige a tela, mas entre a falha e a volta da rede o quadro fica vazio. Ver F-KRO-5.

## 1. Checklist (comportamentos, cada um testável)

1. **Marca de falha.** `fetchData` registra se a última busca falhou. Conta como falha: alguma tabela em
   `failedTableIds` (ver F-KRO-1) ou o `catch` externo. Uma busca que termina sem falha limpa a marca. Teste: busca que
   falha → marca ligada. Busca seguinte bem-sucedida → marca desligada.
2. **Refetch no `online`.** Com a marca ligada, o evento `online` do `window` chama `fetchData` uma vez. Com a marca
   desligada, o evento não faz nada. Teste: `window.dispatchEvent(new Event('online'))` depois de uma busca que falhou →
   `getTableData` chamado de novo, e `tasks` passa a ser o que o servidor devolveu. Depois de uma busca bem-sucedida, o
   mesmo evento não chama `getTableData`.
3. **Falha de novo no `online`.** Se o refetch disparado pelo `online` também falhar, a marca segue ligada e o próximo
   `online` tenta de novo (sem laço, sem timer). Teste: duas falhas seguidas e depois sucesso, com dois eventos.
4. **Ciclo de vida do listener.** O listener é registrado uma vez por montagem e removido no unmount. Teste: depois do
   `unmount`, o `online` não chama `getTableData`.
5. **Alinhamento tela × servidor (o passo 4 do runbook).** Depois de um arrasto cujo rebalanceio falhou, o `online` deixa
   `localTasks` igual à ordem do servidor. Teste no nível do `useKanbanLogic` com `useKanbanData` real e service
   mockado: rebalanceio parcial (2 PUTs ok, o 3º rejeita) → `online` → ordem = a do mock do servidor.
6. **Aceite na tela:** repetir o passo 4 do `RUNBOOK-KANBAN-REORDER.md` no build de produção (com o "Offline" do
   DevTools ou a simulação registrada no #886): a ordem que a tela mostra depois que a rede volta é a mesma depois do F5.
   O roteiro não muda; isto é só a rodada de conferência.
7. **Gates do diff:** `cd my-app && npx tsc --noEmit`, `npm run test:types`, `npm run check:arch` e a suíte do vitest.
   Sem i18n novo, **salvo** se F-KRO-4 = (b). Sem rota, DTO, eventType nem preset. Não toca `server/`.

## 2. Contratos (esboço)

```ts
// useKanbanData — retorno (o que muda está marcado)
type UseKanbanDataResult = {
  kanbanTables: IDynamicTable[];
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  schemaByTableId: Record<string, unknown>;
  stale?: boolean;            // NOVO só se F-KRO-4 = (b): a última busca falhou
};

// estado interno novo (não exportado)
const lastFetchFailed: React.MutableRefObject<boolean>; // ref, para o listener não precisar re-registrar (F-KRO-2)

// efeito novo, dentro de useKanbanData (F-KRO-2 = a)
useEffect(() => {
  const onOnline = () => { if (lastFetchFailed.current) void fetchData(); };
  window.addEventListener('online', onOnline);
  return () => window.removeEventListener('online', onOnline);
}, [fetchData]);
```

Nenhum contrato com o servidor muda: as mesmas `GET /api/dynamic-tables/:id` e `GET /api/dynamic-tables/:id/data`.

## 3. Forks — RATIFICADOS 25/10 na recomendação

Dono, chat, 2026-10-25: *"Ratifico F-KRO-1..5 na recomendação."* Cada fork fica com a opção marcada como *Recomendação*. **Isso não autoriza implementar**: falta "executa" (ORCH-006).

**F-KRO-1 · O que conta como "o último falhou".** (a) qualquer tabela kanban que falhou na busca, ou o `catch` externo;
(b) só quando **todas** as tabelas falharam; (c) só o `catch` externo.
*Recomendação: (a).* O caso do runbook é uma tabela só, mas com várias tabelas kanban uma falha isolada também deixa
cards velhos na tela. (c) nunca liga hoje, porque a falha por tabela não lança (§0).
✅ **RATIFICADO na recomendação** (dono, chat, 2026-10-25).

**F-KRO-2 · Onde mora o listener.** (a) dentro de `useKanbanData`, junto do `fetchData` e da marca; (b) em
`useKanbanLogic`, que já chama o `refetch`; (c) hook genérico novo `useOnlineRefetch(refetch, failed)` em `lib/hooks`.
*Recomendação: (a).* Quem busca sabe se falhou. (b) exigiria exportar a marca. (c) cria um canônico com um consumidor
só, e o `_REUSE-CRITERION.md` pede dois lados vivos.
✅ **RATIFICADO na recomendação** (dono, chat, 2026-10-25).

**F-KRO-3 · Sinal além do `online`.** O `online` só dispara na transição offline→online do navegador. Back fora do ar,
timeout ou 5xx com a rede de pé não disparam o evento, e a marca fica ligada sem gatilho. (a) só o `online`, como o dono
descreveu; (b) `online` + `visibilitychange` (aba volta a ficar visível com a marca ligada); (c) `online` + nova tentativa
com backoff.
*Recomendação: (a).* É o pedido, e cobre o passo 4 do runbook. (b) e (c) mudam o escopo; se o dono quiser, viram emenda
própria.
✅ **RATIFICADO na recomendação** (dono, chat, 2026-10-25).

**F-KRO-4 · Aviso na tela enquanto a marca está ligada.** (a) nenhum aviso: o quadro mantém os cards (o #895) e se corrige
sozinho no `online`; (b) faixa discreta "Sem conexão: o quadro pode estar desatualizado" enquanto a marca estiver ligada
(i18n pt/en, `stale` no retorno); (c) toast na volta ("Quadro atualizado").
*Recomendação: (a).* O pedido é o refetch. Aviso é UI nova, com i18n e decisão de texto. Hoje a falha já aparece no
toast de erro do `updateRecord`.
✅ **RATIFICADO na recomendação** (dono, chat, 2026-10-25).

**F-KRO-5 · Ordem de entrega × #895.** (a) executar depois do merge do #895, numa branch a partir da `main`;
(b) empilhar no #895.
*Recomendação: (a).* A memória do repo registra que squash quebra PRs empilhados, e o #895 é pequeno e independente.
✅ **RATIFICADO na recomendação** (dono, chat, 2026-10-25).

## 4. Pendente de validação externa

Nenhuma. Não há regra contábil, fiscal ou legal.

## 5. Insumos ausentes

- Comportamento do "Offline" do DevTools sobre o evento `online` no navegador embutido do app: na rodada de 24/10 a falha foi
  simulada trocando o `fetch`, o que **não** dispara `offline`/`online`. O aceite (item 6) precisa do DevTools de verdade ou de
  `window.dispatchEvent(new Event('online'))` registrado como método na evidência.

## 6. Achados fora de escopo

- Uma falha de rebalanceio deixa `order` repetido na coluna (no teste de 25/10, dois cards com 1000). Isso é registrado
  no #895 e não é tratado aqui.
- O mesmo padrão (`.catch(() => null)` + refetch sem retomada) pode existir em outras telas que usam
  `DynamicTableService`. Não varri (moratória).
