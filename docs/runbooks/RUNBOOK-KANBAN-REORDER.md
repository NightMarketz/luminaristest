# RUNBOOK: Kanban — reordenação persistida (FE-INCR-KANBAN-REORDER, #824) + lote 4 do FIX-FE-DASHBOARD (#813)

> Formato: `docs/operating-manual/RUNBOOK-FORMAT.md`. Quem preenche é o humano: evidência, desfecho e assinatura.
> O agente só preparou os passos. Runbook sem assinatura é nulo.

Executor: ____________ (humano)           Data: ____________
Autorização: dono, chat, 2026-10-21: "prepara o roteiro da conferência na tela" (#824 e #813 já mergeados)
Pré-condições (conferir e colar a evidência de cada uma):
- [ ] Checkout no main com os dois PRs (merge do #824 = `3ddd33dc`). `git log --oneline -1` mostra commit igual a ou depois de `3ddd33dc`.
      EVIDÊNCIA: ____
- [ ] **Build de produção** do front, nunca `next dev`: `cd my-app && npm run build && npm start`. O servidor
      foi reiniciado desse mesmo commit: `cd server && npm run build && npm start`. Servidor velho serve código velho.
      EVIDÊNCIA (últimas linhas dos dois terminais): ____
- [ ] Banco populado: `server/prisma/prisma/dev.db`, não o `server/prisma/dev.db` de 0 byte. Usuário logado.
- [ ] Uma tabela Kanban **do preset** (tem o campo `order`) com **pelo menos 6 cards numa coluna** e pelo
      menos 2 colunas. Se não houver, crie os cards antes de começar.
- [ ] DevTools aberto nas abas Console e Network, com o filtro de Network nas chamadas de update de registro.

## Passos
Pare no primeiro passo que divergir. Não execute os seguintes (regra do FALHOU).

1. Na coluna com 6+ cards, arraste o **último** card para o **topo** e solte sobre o primeiro card.
   Resultado esperado: o card fica no topo. Na Network aparece pelo menos 1 update com `order`. Se a
   coluna nunca tinha sido ordenada, aparecem vários updates, um por card (backfill), sem toast repetido.
   Console sem erro.
   EVIDÊNCIA (screenshot + linhas da Network): ____

2. Recarregue a página (F5).
   Resultado esperado: a ordem do passo 1 **continua igual** (é o que antes voltava).
   EVIDÊNCIA (screenshot depois do F5): ____

3. Arraste um card do meio da coluna para entre outros dois cards, 3 vezes seguidas em lugares diferentes.
   Depois recarregue.
   Resultado esperado: depois do F5 a ordem é exatamente a última vista antes do F5. No caso comum, cada
   arrasto gera **1** update.
   EVIDÊNCIA (screenshot antes e depois do F5 + número de updates por arrasto): ____

4. **Risco principal, o rebalanceio parcial.** Na Network, ative throttling "Offline" **logo depois** de
   soltar um card que dispare vários updates (repita o passo 1 numa coluna nova, ainda não ordenada) e
   volte para "No throttling".
   Resultado esperado: a tela volta para a ordem do servidor (rollback + refetch), sem card duplicado nem
   sumido. Depois do F5, a ordem pode ser a antiga ou uma parcialmente gravada, mas é **a mesma** que a
   tela mostrava antes do F5.
   EVIDÊNCIA (screenshot antes e depois do F5 + erro da Network): ____

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
- Achados no caminho (fora do escopo deste runbook): ____
- Atualização do artefato de rastreio: `docs/plano/nos/FE-INCR-KANBAN-REORDER.md` (estado + data)
- Assinatura do executor: ____________
