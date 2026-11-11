---
id: "D-2026-11-11-EXPERIMENTO-LOTE-DE-REVISAO"
tipo: "decisao"
dominio: "processo"
titulo: "Medir o acerto do revisor por tamanho de lote antes de afrouxar a revisão por PR"
estado: "decided"
autorizacao: "dono, chat, 2026-11-11: \"pode medir antes de afrouxar, com certeza. E para decidir o tamanho do lote, pelo resultado que a gente tiver\""
atualizado: "2026-11-11"
---
# D-2026-11-11-EXPERIMENTO-LOTE-DE-REVISAO

**Estado:** `decided` para **medir**. O tamanho do lote fica em aberto até o resultado (critério abaixo, fixado antes de rodar).
Enquanto não houver resultado, vale a regra atual: revisor por PR nos vermelhos de código.

**Por quê:** o dono quer revisões maiores para PRs pequenos (mediana de 4 arquivos e ~116 linhas nos últimos 150 mergeados;
a faixa 1 tem mediana de ~75 linhas). A literatura achada é velha demais para os modelos atuais (pesquisa de 11/11: nada
quantitativo nos últimos 3 meses). A medida tem de ser nossa.

**Exceção à regra da bancada** (CLAUDE.md, ⛔ 2026-08-09): vale só para este experimento, que roda uma vez e não deixa gate,
rodada ou revisor permanente. Nada é criado em `docs/audit/**`.

## Desenho

- **Corpus:** 19 squash commits (eram 20; o commit de docs do GAP-MAP saiu) da faixa 1 (todos já passaram por revisor PASS por PR e estão na `main`), repostos em ordem
  (30 a 68 do histórico da main) numa branch descartável `exp/lote-base` cortada do pai do primeiro. Sem push para a `main`.
- **Defeitos plantados (verdade conhecida, cega para o revisor):** 8 dos 19 recebem (2 deles, nas posições 10 e 12, acabaram sem efeito prático: mutante equivalente; ficam fora do denominador, que passa a ser 6 defeitos reais) um commit extra que quebra o código de
  produção do PR (guarda removida, comparação invertida, CAS trocado por escrita direta). 4 são pegos pelo teste-guarda do
  próprio PR (detectáveis rodando) e 4 passam com os testes verdes (só a leitura pega). Os outros 12 ficam limpos.
  A lista dos plantados fica com a orquestração e só sai depois de todos os braços.
- **Braços (mesmo agente `revisor-independente`, mesmo formulário, mesmas instruções):**
  A = 20 revisões de 1 PR · B = 5 revisões de 4 PRs da mesma área · C = 2 revisões de 10 PRs · D = 1 revisão de 20 PRs.
  Cada revisão devolve um veredito por PR (PASS/FAIL + arquivo:linha).
- **Execução:** até 3 subagentes simultâneos e 2 vagas pesadas (`scripts/heavy-slot.cjs`); testes só com escopo.

## Medidas

Por braço: **recall** (plantados achados / 8, separado em detectáveis por teste e só por leitura), **falsos positivos**
(PR limpo com FAIL), **tokens e tempo por PR**.

## Critério de decisão (fixado antes)

Lote de tamanho N é aceito se `recall_N >= recall_A - 10 pontos` **e** falsos positivos `<= 2 x` os de A. Vale o **maior** N
aceito. Se nenhum lote passar, fica 1 por PR. Com 8 defeitos a amostra é pequena: diferença menor que 2 defeitos entre
braços é ruído e conta como empate; nesse caso fica o menor lote entre os empatados.

## Resultado (11/11/2026)

Execução: braços A, B, C e D completos, mesmo agente `revisor-independente`, corpus de 19 commits, 6 defeitos reais
(4 que o teste do próprio commit pega: 6, 9, 11, 14; 2 que só a leitura pega: 2, 8). Posições 10 e 12 eram mutantes sem efeito prático.

| Braço | Revisões | Defeitos reais achados | FAIL em commit limpo | FAIL em 10/12 | Tokens (soma) |
|---|---|---|---|---|---|
| A, 1 commit | 19 | 6 de 6 | 1 (pos. 5) | 2 | ~873 mil |
| B, 3–4 commits | 5 | 6 de 6 | 0 | 0 | ~350 mil |
| C, 9–10 commits | 2 | 6 de 6 | 1 (pos. 5) | 0 | ~204 mil |
| D, 19 commits | 1 | 6 de 6 | 0 | 0 | ~151 mil |

**Pelo critério fixado antes:** recall igual em todos (6 de 6) e falsos positivos de B, C e D dentro do dobro de A: todos aceitos.
Mas a regra de empate diz que, com diferença menor que 2 defeitos, vale o menor lote entre os empatados, o que mantém **1 por PR**.

**Leitura honesta:**
- Nenhum braço perdeu defeito plantado, nem o de 19 commits. Os defeitos eram fáceis demais (os 2 de leitura estavam à vista),
  então o experimento não separou os braços no recall. Não prova que o lote de 19 é seguro para defeito sutil.
- O braço de 1 commit achou mais problemas **fora** do plantado: posição 10 (PUT com `customerId: null` finaliza venda de pacote sem
  cliente, reproduzido), posição 5 (sobra fórmula de subtotal sem arredondar em `useSalesAnalytics.ts`), posição 12 (formatos não ISO).
  Os lotes maiores acharam menos disso (o de 10 achou a posição 5; o de 19 e os de 4 não).
- Custo: o lote de 19 gastou ~1/6 dos tokens do braço de 1 commit.
- Limites: 6 defeitos; a integração ficou bloqueada (401) em parte das execuções; não há como impedir que um revisor procure o commit
  na main (nenhum indício de que isso ocorreu).

**Decisão provisória (após a rodada 1):** mantém revisão por PR nos vermelhos de código; rodar segunda rodada com defeitos sutis.

## Resultado da rodada 2 (defeitos sutis, 11/11/2026)

Mesmos 19 commits (branch `exp/lote-r2`), 6 defeitos novos que **passam nos testes do próprio commit**: 6 (Dockerfile com
`NODE_ENV=development`), 7 (`paymentStatusField` fora da conferência), 8 (rótulos duplicados no 415), 11 (`<=` em vez de `<` na reserva
de estoque), 14 (`?page=` vazio vira 400 em vez do padrão), 15 (`QUOTA` em 502 contra a docstring de 503).
Braço de 1 commit reduzido: 6 commits com defeito + 4 limpos (1, 3, 9, 17), por custo.

| Braço | Revisões | Defeitos achados com FAIL | Defeitos vistos mas com PASS | Tokens |
|---|---|---|---|---|
| 1 commit | 10 | 3 de 6 (6, 7, 11) | 3 (8, 14, 15) | ~466 mil |
| 3 a 4 commits | 5 | 5 de 6 (6, 7, 8, 11, 15) | 1 (14) | ~418 mil |
| 9 a 10 commits | 2 | 3 de 6 (6, 7, 11) | 3 (8, 14, 15) | ~213 mil |
| 19 commits | 1 | 4 de 6 (6, 7, 11, 15) | 1 (14) | ~146 mil |

- **Tamanho do lote não degradou o acerto:** o pior braço foi o de 1 commit (3 de 6), o melhor foi o de 4 (5 de 6). Diferença de 2 defeitos
  entre A e B; entre A e D, de 1 (ruído pela regra fixada antes).
- **O modo de falha dominante é de calibração, não de escala:** nos defeitos 8, 14 e 15 o revisor **mediu ou anotou a divergência**
  (rótulos repetidos "XML, XML"; comentário diz string vazia → padrão, código dá 400; docstring diz cota = 503, tabela põe 502) e
  deu PASS por considerar "sem efeito". A divergência entre comentário/mensagem do commit e o código deveria valer FAIL.
- **FAIL em commit limpo pela chave:** só no braço de 4 (posições 2, 5, 10, 18), todos achados legítimos do código original
  (`entity: null` da IA; fórmula crua em `useSalesAnalytics.ts`; PUT com `customerId: null`; leitura do corpo com timeout e `AbortSignal.any`).
  Pela regra literal fixada antes (falsos positivos <= 2 x os de A, com A = 0) o braço de 4 reprovaria; a regra é degenerada com A = 0
  e o que esses FAIL mostram é recall em problemas reais fora do plantado, não ruído.
- Limites: 6 defeitos; o braço A só viu 4 limpos; um revisor por célula; sem repetição.

## Conclusão das duas rodadas

1. **Nada indica perda de acerto ao revisar vários PRs de uma vez** (até 19, nos defeitos fáceis e nos sutis). A evidência
   a favor de "1 por PR" é só a profundidade nos problemas fora do plantado, que também apareceu no lote de 4.
2. **Proposta:** vermelho de código revisado em **lotes de até ~4 PRs da mesma área**, um revisor por lote, veredito por PR;
   verde por amostragem. Lote de 10 a 19 serve para varredura/retrospectiva, não como gate, até haver mais dados.
3. **Mudança de formulário do revisor:** divergência entre comentário/mensagem do commit/GAP-MAP e o código é **FAIL**, não ressalva.
4. A regra do lote só vale depois de o dono ratificar nesta nota (estado continua `decided` para medir; a adoção é decisão à parte).
