# AV-R8 · REVISÃO INDEPENDENTE DAS SEIS — O QUE A RODADA DE REVISÃO DE FATO DESCOBRIU

Instrumento **AV-17** · v4.1 · `centerpiece.type: review_reality` · projeto **Luminaris** ·
commit **`ca99c9ae`** · 2026-08-07 · agente `claude-opus-5`

**Os seis revisores listaram 35 achados novos. Reexecutei 25, e os 25 reproduziram; os outros
10 estão fora do alcance deste ambiente e cada um diz por quê. Os 21 que sustentam consequência
viraram 10 achados por classe.**

**Nenhum achado de revisor caiu — mas uma refutação MINHA caiu.** Declarei o `RV171-F5`
refutado a partir de uma medição que rodou só a árvore limpa, isto é **só o controle**. Medido
o par sob a condição em que o achado foi observado, ele reproduz: é o **F10**.

**O risco desta rodada é a própria rodada:** ela mede a realidade da revisão alheia e **não
tem revisor próprio**, e a classe que ela emite no F4 — prova de mordida sobre superfície que
o app não alcança — **me pegou duas vezes durante a medição**, as duas apanhadas pelo
controle e não pelo cuidado.

---

## Por que esta rodada existe

O `[B12]` do `scripts/bancada-gate.mjs` exige que todo `fingerprint` de um `triagem/1.0` seja
**cópia literal** de um `fingerprint` de relatório `auditoria/1.1` **emitido**. Relatório em
markdown não tem `fingerprint`, então os 35 achados das seis revisões **não podem ser
triados** enquanto não existir rodada emitida. É a mesma parede que a AV-R6 bateu, e o caminho
previsto está registrado em `docs/audit/CONTINUACAO.md`, item 4 de "o que continua em aberto":
**emitir → triar → só então corrigir**.

Esta é a emissão. Ela **não tria e não corrige nada**.

## O que este relatório NÃO é

Não é transcrição. Copiar o resultado de um revisor para dentro de um campo `measured`
transformaria a rodada em resumo de prosa, e resumo de prosa não é medição. **Todo falsificador
citado aqui foi reexecutado por mim**, com controle verde e controle vermelho no mesmo
processo, e com harness que **sai `!= 0` quando a mutação não aplica** — sem isso, "gate verde"
é indistinguível de "mutação não aplicada" (armadilha 9 do `CONTINUACAO.md`).

Onde a reexecução derrubou o revisor, está escrito. Onde o revisor errou o número mas acertou
o mecanismo, o número foi corrigido em vez de copiado.

---

## Peça central · `review_reality`

Tipo declarado no contrato desde a v4 e **nunca usado por relatório nenhum** — o
`bancada-gate` emitia `[B3] tipo declarado e ainda não usado` para ele até esta rodada.

| revisão | achados novos listados | reexecutados por mim | reproduziram | **REFUTADOS** | fora de alcance | dobrados em achado |
|---|---|---|---|---|---|---|
| REVIEW-PR167 · razão de revisão e fronteira de DTO | 5 | 5 | 5 | 0 | 0 | 5 |
| REVIEW-PR168 · AV-R7, força da suíte da subfila | 5 | 4 | 4 | 0 | 1 | 4 |
| REVIEW-PR169 · TRIAGEM-AV-R7 | 6 | 5 | 5 | 0 | 1 | 3 |
| REVIEW-PR170 · FE-INCR-APPROVAL | 5 | 4 | 4 | 0 | 1 | 2 |
| REVIEW-PR171 · barreiras da subfila | 5 | 2 | 2 | 0 | 3 | 2 |
| REVIEW-PR173 · B18, que **não está nesta árvore** | 9 | 5 | 5 | 0 | 4 | 5 |
| **TOTAL** | **35** | **25** | **25** | **0** | **10** | **21** |

A aritmética fecha nas duas direções: 25 + 10 = 35, e 25 + 0 = 25.

### A refutação que eu emiti — e que caiu

Esta rodada chegou a declarar **`RV171-F5`** ("jest sem `--forceExit` nesta suíte termina e não
sai") como **refutado**. Estava errado, e o erro tem nome: **medi só a condição de controle.**

O achado original foi observado com a mutação de `publicApiRoutes` **aplicada** — é exatamente
o que fez o autor do PR ler "travamento" e re-medir com `-t "autoriza"`. Minha primeira passada
rodou a **árvore limpa**. Árvore limpa é o controle, não o caso.

Medido o par, com o mesmo harness nas duas linhas, teto explícito de 240 s, e reportando o exit
do **wrapper** (não o do jest — sem isso "ainda rodando" e "saiu" ficam indistinguíveis):

| linha (sem `--forceExit`) | execuções | wrapper | placar | `did not exit` |
|---|---|---|---|---|
| **1 · sem mutação — o CONTROLE** | 2 | **0** e **0** (12,5 s / 15 s) | `13 passed, 13 total` | **0 de 2** |
| **2 · com `match: 'prefix'` — a CONDIÇÃO** (`numstat 2 1`) | 4 | **124, 124, 124, 1** | `8 failed, 5 passed, 13 total` | **4 de 4** |

As duas linhas divergem, então o `refuted` cai e o achado do revisor é **verdadeiro sob
condição nomeada**. Promovido a achado próprio: **F10**.

**Duas afirmações com forças diferentes, e eu as separo:** o **handle aberto é determinístico**
(4 de 4 na condição contra 0 de 2 no controle — a suíte completa a medição, imprime o placar, e
só então o jest avisa que não vai sair); o **processo pendurar até o teto é intermitente**
(3 de 4). Descobri a intermitência **rodando o falsificador publicado verbatim depois de
publicá-lo** — ele devolveu `1` onde o harness tinha devolvido `124`.

Isto **reforça** a cadeia causal publicada em vez de derrubá-la, ao contrário do que a versão
anterior deste relatório dizia — e a intermitência a reforça ainda mais, porque um travamento
que aparece numa passada e some na outra é lido como "travou" uma vez e "ok" na seguinte.

---

## Os dez achados

### F1 · dano 3 · `razao-de-revisao-aceita-declaracao-sem-confronto-com-o-repositorio`

Dobra **A4** e **A5** da REVIEW-PR167, as quatro fugas do adendo do orquestrador, e **N7** da
REVIEW-PR173.

Harness próprio sobre `docs/audit/REVIEW-LEDGER.jsonl`, um campo por vez, `numstat 1 1`
conferido em cada, restauração de `.bak` com numstat vazio depois:

| mutação na entrada do PR 167 | exit | mensagem |
|---|---|---|
| **CONTROLE-VERDE** — arquivo intacto | **0** | `OK: 6 PR(s) com veredito declarado` |
| `reviewer := implementer.toUpperCase()` | **0** | — **fuga** |
| `artifact := "docs"` (um diretório) | **0** | — **fuga** |
| `commit := "deadbee"` (sha inexistente) | **0** | — **fuga** |
| `commit := "0000000"` | **0** | — **fuga** |
| `pr := 999999` (PR que nunca existiu) | **0** | — **fuga** |
| razão **truncado** de 6 entradas para 1 | **0** | — **fuga**, não há append-only |
| **CONTROLE-VERMELHO** `reviewer := implementer` | **1** | `[RL4] reviewer === implementer` |
| **CONTROLE-VERDE final** | **0** | numstat vazio |

**E a classe já tem instância viva, que nenhum dos revisores podia ver:** a entrada do PR 173
declara `commit fe27cc22`, e `fe27cc22` **não é ancestral de `ca99c9ae`** — o razão afirma um
veredito sobre um commit ausente da linha de história em que ele mesmo vive, e o gate está
verde. As outras cinco entradas são o controle: as cinco resolvem, com 5 a 27 commits até HEAD.

> **Correção de uma leitura minha que era falsa.** A primeira versão deste achado dizia que o
> PR #173 "não está mergeado". É falso: ele está em `origin/main` (`30d28d86`); é a árvore
> desta rodada que não o tem, porque `ca99c9ae` e `origin/main` são linhas irmãs forkadas de
> `18b14b12`. Conferir custou um `git merge-base`.

### F2 · dano 2 · `numero-publicado-como-medido-sem-conferencia-contra-a-fonte`

Dobra **N2**, **N4** e **N5** da REVIEW-PR168 e **N1** e **N4** da REVIEW-PR169, e estende o
`instrument_feedback` do F3 da AV-R7.

Cinco superfícies, cada uma recontada contra a fonte:

| o que o artefato publica | o que a fonte diz | controle |
|---|---|---|
| AV-R2, coluna `invariantes`: 10 rótulos `softdelete`+`dinheiro` | **5 sem lastro em código**, e nos 5 a única ocorrência é **comentário** (cru 1 / limpo 0) | `CounterpartyRepository` 3/2 · `PostingDto` 22/11 · símbolo inexistente 0 |
| AV-R2, coluna `linhas` | **108 de 110 divergem** de `wc -l`; 107 por exatamente **+1** | **2 batem** — a comparação não está uniformemente quebrada |
| AV-R7, peça central: sítio do M4 é "o `update`" | a linha 107 está dentro de **`updateValue`**; `update` é a linha 54 | — |
| AV-R7 F2: "as **7** ocorrências … listadas uma a uma, 3 são comentários" | são **9**, e a nona é uma **string viva** em `route-spec-wiring.test.ts:36` | `api/users` 52 · `api/naoexiste` 0 |
| AV-R7 F5: "os 219 merges, que **nunca** carregam trailer" | **13 de 227** carregam — é dali que sai a diferença entre os dois denominadores | — |

Dois deles dizem literalmente *"NO money"* no comentário que produziu o rótulo `dinheiro`. É a
**armadilha 8** do `CONTINUACAO.md`, agora medida em escala.

> **O controle por eixo salvou esta medição.** A primeira passada usou `/\bCents\b/`
> case-sensitive e devolveu **0 em 5 de 5** rótulos de dinheiro — inclusive em `InventoryDto.ts`,
> que tem `MAX_CENTS` em **código**. Zero em 5 de 5 é bom demais; o controle por eixo
> (`PostingDto` = 22/11) é a única razão pela qual eu não publiquei "5 de 5 sem lastro".

O que **não** afirmo: que o rótulo `softdelete` do `DocumentAttachmentDto` seja falso. Ele é
comentário-derivado e provavelmente **verdadeiro** — o próprio revisor do #168 registrou isso
contra a própria manchete. **Falso provado continua sendo um.**

### F3 · dano 3 · `portao-da-triagem-nao-e-derivado-do-exposure-por-nenhum-gate`

Dobra a §7 da REVIEW-PR168, e **N5** e a §7 da REVIEW-PR169.

| mutação em `TRIAGEM-AV-R7.json` | numstat | exit | resultado |
|---|---|---|---|
| **CONTROLE-VERDE** intacto | — | **0** | — |
| aceite **fabricado** no rank 5, `accepted_by` inventado, gatilho apontando arquivo que existe | `8 8` | **0** | **fuga** |
| portão **incoerente** com o exposure (`ja_exposto` → `bloqueia_deploy`) | `3 3` | **0** | **fuga** |
| exposure trocado sem tocar o portão (`ja_exposto` → `apenas_teorico`) | `1 1` | **0** | **fuga** |
| **CONTROLE-VERMELHO** gatilho aponta caminho inexistente | `8 8` | **1** | `[B14]` |
| **CONTROLE-VERMELHO** `verification := "banana"` | `1 1` | **1** | `[B13]` |
| **CONTROLE-VERDE final** | vazio | **0** | — |

E a causa está no gate: `exposure` aparece **duas** vezes em `scripts/bancada-gate.mjs` — um
comentário e o B7, que só confere pertinência à lista — e `gateMap` aparece **zero**. A
derivação que as quatro triagens desta bancada descrevem como *mecânica* é disciplina de prosa,
não regra executada: é a classe `gate eval prova o texto, não o app`, dentro do gate que existe
para impedi-la.

**O que isso já custou, medido:** na `TRIAGEM-AV-R7` os cinco itens são `ja_exposto` e o
`gates_summary` é 5/0/0. O critério operacional de `apenas_teorico` que o **mesmo autor** fixou
na `TRIAGEM-AV-R6` — *"nenhum caminho de dano foi MEDIDO"* — aplica-se ao rank 5 pelas palavras
dele mesmo (`why_rank_5`: *"e nesta rodada ninguém usou"*). Controle: o mesmo teste no rank 4
devolve `false`.

### F4 · dano 3 · `mordida-provada-em-superficie-que-o-app-nao-alcanca`

Dobra **(b1)** e **(b2)** da REVIEW-PR171 com o adendo do orquestrador, e **A2** da REVIEW-PR167.

| mutação em `middleware/auth.ts` | numstat | exit | placar |
|---|---|---|---|
| **CONTROLE-VERDE** árvore intacta | — | **0** | `Tests: 13 passed, 13 total` |
| regra pública `match: 'exact'` — **a forma que o autor escreveu** | `2 1` | **0** | `Tests: 13 passed, 13 total` |
| a **mesma linha** com `match: 'prefix'` | `2 1` | **1** | `Tests: 8 failed, 5 passed` |
| **CONTROLE-VERDE final** | vazio | **0** | `Tests: 13 passed, 13 total` |

A causa é estática e não depende de teste: em `auth.ts:84` a regra é avaliada como
`rule.match === 'exact' ? pathname === rule.path : matchesSegmentPrefix(...)`, ou seja o ramo
`exact` exige igualdade do caminho **inteiro** —
e das **55** rotas de `routes/accounting.ts` nenhuma é um `POST /api/accounting` exato. A regra
acrescentada **nunca é consultada**, e o verde dela não é evidência sobre o fail-closed — é
evidência de que a mutação não tocou o sistema. Essa leitura virou, no `TRIAGEM-R1-R3.json` e no
`REVIEW-LEDGER.jsonl`, a explicação de um `mutation_score`.

Segunda superfície, mesma classe: o `ReceiveStockSchema` — que o item 5 da fila apresenta como
a prova de mordida de dinheiro — tem **0** consumidores fora de `dtos/`. Controles no mesmo
comando: `CashFlowStatementQuerySchema` 1, `PeriodComparisonSchema` 1, símbolo inexistente 0.

> **A classe me pegou dentro desta rodada.** Ver "Onde eu errei", abaixo.

### F5 · dano 2 · `placar-de-mutacao-publicado-omite-uma-unidade-inteira`

Dobra **(b4)** da REVIEW-PR171.

O bloco `PROVA DE MORDIDA por unidade` do `TRIAGEM-R1-R3.json` enumera **três** das quatro
unidades. `"Counterparty" in <bloco>` → `false`; **controle**: `Dimension`,
`ReferentialMapping` e `controller` → `true`, então o recorte não está cego. A quarta unidade
foi medida pelos próprios autores: o corpo de `b1464747` declara *"3 mutações de 1 linha
(git diff --numstat 1/1)"*, todas mortas.

Somando os quatro commits: **16 mutações, 12 mortes** — contra as **13/9** publicadas, número
que o `REVIEW-LEDGER.jsonl` herdou literalmente. O erro anda nas **duas direções**: subconta o
trabalho dos autores em 3 mutações e superconta a narrativa deles pelo F4.

### F6 · dano 4 · `handlers-de-contabilidade-fora-do-alcance-de-qualquer-teste-de-rota`

Dobra **RV171-F2**, **M1/M2/M3** e **RV171-F3** da REVIEW-PR171, e **N3** da REVIEW-PR168.

**Par discriminante**, contra a suíte de integração **inteira** — que é o controle que o
revisor do #171 declarou explicitamente não ter rodado:

| árvore | numstat | placar |
|---|---|---|
| **CONTROLE-VERDE** baseline, duas execuções independentes | — | `36 suites / 398 tests` verdes |
| **CONTROLE-VERMELHO** `postEntry` com o dono trocado por um literal | `1 1` | **`6 failed, 392 passed`** |
| `deleteAccount` com a **mesma** mutação | `1 1` | **`36 suites / 398 tests` verdes** |

A mesma classe de quebra de inquilino mata num handler e é muda no outro. A diferença é
**alcance**, não desenho: `routes/accounting.ts` registra **55** rotas, o controller exporta
**23** handlers, e o único teste que sobe o app exercita **4** rotas distintas. Controle do
padrão de busca: o mesmo comando para `/api/users` devolve 4, então o 4 não é cegueira.

Apagar conta do plano contábil de outro dono é a operação mais destrutiva do mount, e nenhum
dos 398 testes reprova quando o escopo dela é trocado.

### F7 · dano 2 · `strict-de-dto-neutralizado-pelo-unico-chamador`

Dobra **A1** e **A3** da REVIEW-PR167.

`getPeriodComparison` monta um literal com **exatamente duas chaves** antes do `safeParse`, e
um `.strict()` só rejeita chave desconhecida se a chave chegar até ele. Medido no arquivo:
**11** `safeParse(req.query)` (onde o `.strict()` morde) contra **3** que montam literal. Os
quatro irmãos diretos do mesmo relatório passam `req.query` direto.

O cabeçalho do próprio DTO promete rejeição de chave desconhecida "em vez de silenciosamente
aceito-e-ignorado", e o teste novo ratifica a promessa **no schema** sem notar que o único
chamador a neutraliza. Segunda superfície: `DocumentAttachmentDto.ts` tem **0** ocorrências de
`strict()` e está listado entre "os que só declaram `.strict()`" — controle: `aging.dto.ts`
devolve 2.

O que **reduzi**: o literal é deliberado e há comentário explicando (`unitId` é escopo, não
data). O defeito é a **promessa do cabeçalho**, não a escolha.

### F8 · dano 2 · `campo-de-evidencia-de-gate-conferido-por-presenca-e-nao-por-conteudo`

Dobra **N1**, **N2**, **N4** e **N5** da REVIEW-PR173.

**Escopo primeiro, porque muda o que a afirmação vale:** o **B18 não existe nesta árvore**. Ele
veio pelo PR #173, que está em `origin/main` (`30d28d86`). Materializei `origin/main` **fora do
repositório** com `git archive` e rodei o gate dela ali.

| mutação (em `origin/main` materializado) | exit | leitura |
|---|---|---|
| **CONTROLE-VERDE** origin/main intacto | **0** | imprime a linha de isenção do B18 |
| os **cinco** campos de evidência := `"x"`, `unit` preservado | **0** | **fuga** |
| `measured := null` / `"n/a"` / `{}` / `false` | **0** | **fuga** (4×) |
| **ESCAPE:** apagar `+softdelete` da linha **e** o registro | **0** | **fuga — a alegação central cai** |
| linha nova `DocumentRepository.ts` etiquetada `softdelete` | **0** | **fuga por model irmão** |
| **CONTROLE-VERMELHO** `measured := "   "` | **1** | `registro sem evidência…` |
| **CONTROLE-VERMELHO** linha nova `AccountingPeriodRepository.ts` | **1** | a causa é o irmão, não "linha nova passa" |
| **CONTROLE-VERMELHO** `deletedAt` real no model | **1** | `registro obsoleto` — essa perna do PR é **verdadeira** |
| **CONTROLE-VERDE final** | **0** | árvore restaurada |

> **Refutei a forma literal do revisor e confirmei a substância.** Ele escreveu "os **seis**
> campos com `"x"` passam". Trocando os seis — inclusive `unit` — o gate **reprova**, porque o
> registro fica pendurado. São **cinco**. Corrigi o número em vez de copiá-lo.

E o vocabulário de `status` que o mesmo PR introduziu com quatro valores não é lido por gate
nenhum: `grep status` no `bancada-gate.mjs` de `origin/main` devolve **0**, enquanto
`verification` tem o B13 e `gate` tem o B14.

### F9 · dano 2 · `retry-apos-conflito-de-versao-reenvia-a-versao-velha`

Dobra **N1** e **N1b** da REVIEW-PR170. **Único achado desta rodada verificado por LEITURA** —
este worktree não tem `my-app/node_modules`, então nada de frontend foi executado por mim, e
a sonda que executou o defeito é do revisor.

O mecanismo é inequívoco: `runAction` começa com `const { entry } = action` — snapshot lido na
abertura do modal — e usa `entry.version` nos três comandos. O caminho de sucesso chama
`setAction(null)`; o ramo `CONFLICT` chama `setActionError` + `await fetchAll()` e **não toca
`action`**. Falsificador com controle, que qualquer um roda sem `node_modules`: `setAction(` no
bloco inteiro do `runAction` > 0, no `catch` = **0**. Se os dois fossem zero, o padrão estaria
cego.

O comentário da linha acima afirma o contrário: *"so the retry carries the fresh version"*.

Confiança **média** e não alta — com `ratio 0,9536` o teto do §2.2 proíbe alta sem execução, e
essa proibição está certa aqui.

### F10 · dano 2 · `jest-so-pendura-quando-o-teste-reprova-e-o-vermelho-vira-inconclusivo`

Promove **RV171-F5** da REVIEW-PR171, que eu havia declarado refutado. O par está na tabela
acima. O que reproduz **sempre** (4 de 4) é o handle: com a mutação aplicada o placar
`Tests: 8 failed, 5 passed, 13 total` sai **já impresso** e a linha `did not exit one second
after the test run has completed` vem depois dele — a medição termina, o processo é que não
encerra. O que reproduz em **3 de 4** é o processo ficar pendurado até o teto de 240 s.

**A consequência é a inversão do valor da medição:** as mutações inofensivas terminam limpas e
as que **matam** abrem o handle e, na maioria das vezes, penduram o processo. Quem mede sob teto
de tempo registra as mortes como inconclusivas e as sobrevivências como resultado — e foi
exatamente essa leitura que levou à redução de escopo com `-t "autoriza"` e produziu o rótulo
`SOBREVIVEU` que o placar publicou (o outro elo dessa cadeia é o **F4**). **A intermitência
piora o quadro:** quem mede uma vez só conclui que o travamento não existe — foi o que eu
conclui — ou que ele é a regra.

Irmão do F4 e da armadilha 5, e a família agora tem três membros com a mesma forma: **o
resultado publicado é propriedade da condição de medida, não do sistema.** A barreira aqui é
barata — `--forceExit`, que o próprio `package.json` já usa nos três scripts de teste; quem
monta uma linha de comando à mão para medir mutação é que a perde.

Fica separado do F4 de propósito: as barreiras são diferentes (uma exige controle por mutação,
a outra é uma flag na linha de comando), e fechar uma não fecha a outra.

---

## Onde eu errei, e o que me pegou

Quatro execuções completas da suíte foram **invalidadas e refeitas**. As duas classes valem
mais do que os achados:

1. **Duas execuções concorrentes de jest no mesmo worktree corromperam o banco uma da outra.**
   Três testes de `reports.routes` reprovaram com `Command failed: npx prisma db push` e
   `The table main.dynamic_table_data does not exist` — e eu quase li isso como mordida da
   minha mutação. Todas as suítes compartilham **um único** `server/prisma/test-integration.db`.

2. **A minha primeira mutação para o F6 era vacuosa — a classe que o próprio F4 emite.** Usei
   `(req.query.userId as string) ?? user.userId`, e o **controle** em `postEntry` — handler que
   *tem* teste — também sobreviveu, porque `req.query.userId` é `undefined` em todo teste e o
   `??` devolvia o valor original. Sem o controle eu teria publicado "sobrevive aos 398 testes"
   sobre uma mutação que não muda comportamento nenhum. Refeita com troca **incondicional** do
   dono, o par passou a discriminar (6 failed × 398 verdes).

3. **Marcador de busca sem controle por eixo produz zero convincente** — `/\bCents\b/`
   case-sensitive deu 0 em 5 de 5 rótulos de dinheiro, incluindo um arquivo com `MAX_CENTS` em
   código.

4. **Afirmei que o PR #173 "não estava mergeado".** Ele está em `origin/main`; é a árvore desta
   rodada que não o tem. Um `git merge-base` desfez a leitura.

5. **Um falsificador que eu publiquei apontava para o ramo errado.** O do F4 procurava
   `pathname === prefix`, que casa a **linha 52** — o corpo do helper `matchesSegmentPrefix`,
   isto é, o ramo `prefix` — quando o que sustenta o achado está na **linha 84**. O comando
   devolvia uma linha e *parecia* funcionar; só rodar os nove falsificadores publicados verbatim
   e conferir cada saída contra o arquivo mostrou o desvio. É a classe do F2 dentro do meu
   próprio artefato, e a lição do F3 da AV-R7 aplicada a mim: **falsificador publicado tem de
   ser rodado depois de publicado**, não antes.

6. **Publiquei um `refuted` medindo só o controle.** O `RV171-F5` foi declarado refutado a
   partir da árvore limpa, quando a condição do achado é a mutação aplicada. É o erro mais
   grave da rodada porque foi o único que produzia um resultado que me **favorecia** — refutar
   um revisor era o achado mais vistoso que esta rodada podia ter, e eu o escrevi a partir de
   meia medição. Nenhum controle me pegou: me pegou reler qual era a **condição** do achado
   original. A regra que eu aplicava às mutações alheias — rodar o par, nunca a linha sozinha —
   não foi aplicada à minha própria refutação. Corrigido no **F10**.

7. **E a correção do F10 também estava meio errada.** Escrevi que a suíte *pendura*, com base
   em **uma** execução do harness. Rodando o falsificador publicado verbatim, ela **saiu** —
   `wrapper=1`. Duas execuções a mais deram `124` de novo: 3 de 4. O efeito determinístico é o
   **handle** (4 de 4), não a não-saída. Emitir "pendura" como constante teria sido o mesmo
   erro de amostra de uma medição só, uma camada acima.

**Os dez falsificadores publicados foram executados verbatim a partir do JSON relido**, com
`<raiz>` substituído e `;` como separador em todos — nunca `&&`, que é o defeito que deixou o
controle do F3 da AV-R7 inalcançável. Oito rodam inteiros nesta árvore (F1, F2, F3, F4, F5, F6,
F7, F9), o **F10** roda aqui e leva até 8 min, e o **F8** exige a árvore de `origin/main`
materializada à parte.

**Rodar os publicados pagou duas vezes:** pegou o falsificador do F4 apontando para o ramo
errado, e pegou a **intermitência** do F10 — que o harness, rodado uma vez, tinha me feito
publicar como constante.

---

## O gate enxerga este artefato? — matriz de mutação

`node scripts/bancada-gate.mjs` sai **0** com os dois arquivos novos, contando **9** relatórios
`auditoria/1.1` (eram 8). Isso sozinho não prova que ele **leu** o arquivo novo. Seis mutações
de **um campo** no meu próprio JSON, cada uma reprovando com **código próprio**, mais controle
verde antes e depois com restauração **byte-idêntica** (`sha256` conferido):

| mutação | sha256 (12) | exit | código | mensagem |
|---|---|---|---|---|
| **CONTROLE-VERDE** artefato como emitido | `708a705653e4` | **0** | — | `9 relatório(s) auditoria/1.1` |
| `centerpiece.type := "revisao_da_revisao"` | `4daaa1d95f4c` | **1** | **B3** | tipo usado e não declarado no contrato |
| `run.review_of_this_run` **removido** | `6b9c94e3d359` | **1** | **B4** | envelope v4+ sem o campo do §9.4 |
| `findings[0].business_impact` **removido** | `040a60f3913f` | **1** | **B5** | `F1: sem business_impact` |
| `findings[F6].exposure := "muito_exposto"` | `2d1db21fb117` | **1** | **B7** | exposure fora da lista fechada |
| `findings[F6].demonstration` **removida** | `7921baf1fc44` | **1** | **B6** | `damage 4 sem demonstration` |
| `findings[F9].confidence := "alta"` | `4885018eb523` | **1** | **B8** | alta por "leitura" com ratio 0,9536 |
| **CONTROLE-VERDE final** | `708a705653e4` | **0** | — | byte-idêntico ao emitido |

> O `sha256` do controle é o do artefato **como emitido**; a matriz foi reexecutada depois da
> última edição do JSON, porque uma tabela de hash que não bate com o arquivo entregue é
> exatamente o defeito que o F2 desta rodada mede.

Seis códigos distintos. O harness sai `!= 0` se qualquer mutação não aplicar (o arquivo é
*untracked*, então a prova de aplicação é o hash mudar, não `git diff --numstat`).

---

## Placar

| dimensão | nível | teto | por quê |
|---|---|---|---|
| **T1** revisão com artefato reexecutável | **3** | 4 | 25 de 35 falsificadores foram reexecutáveis por outra sessão sem pedir nada a quem os escreveu; o teto 4 exigiria revisor **desta** rodada |
| **T2** gate que confronta o registro com o mundo | **0** | 4 | 6 fugas no `review-ledger-check`, 3 no `bancada-gate`, 7 no B18 — nenhum gate consulta git, o provedor ou o conteúdo de um artefato |
| **T6** determinismo | **2** | 4 | 4 das 8 execuções completas foram invalidadas e refeitas; e o F10 mede instabilidade **real** do harness — 4 execuções idênticas na condição de reprovação dão `124/124/124/1` |

## Não medido — sem arredondar

- **N1 da #168 / RV171-F4** (integração irrodável com `generated` junctionado): aqui o
  `generated` é local; reproduzir exigiria quebrar o único ambiente em que a suíte roda. O
  mecanismo está confirmado **só por leitura**.
- **Os 5 erros de `npm run test:types`**: sem `my-app/node_modules`. Medi a metade que dá — o
  script existe, o `tsconfig.json` exclui os testes, e o `ci.yml` **não o roda**.
- **N2 da #170** (dimensões apagadas na edição): exige frontend em execução.
- **N3 da #169** (barreiras já escritas quando a triagem mergeou): confirmei a topologia e não a
  consequência — ela já foi absorvida pelos merges.
- **N3, N6, N8 e N9 da #173**: três são a mesma classe do F8, que já carrega sete fugas; N6 não
  mede o gate.
- **RV171-F1 e RV171-F3**: orçamento — cada uma custa uma execução completa da suíte.
- **Runtime de qualquer achado**: sem stack HTTP, sem build de produção, sem navegador.
- **O comportamento do B18 nesta árvore**: ele não existe aqui (NM8).

## Três movimentos mais baratos

1. **Um teste de rota com supertest por grupo de handlers de escrita de `/api/accounting`**,
   cada um com caso de inquilino — fecha **F6** e **F7**. O molde está em `main` com mordida
   provada: a mutação que passa verde em `deleteAccount` mata 6 testes em `postEntry`.
2. **No `review-ledger-check`, confrontar `commit` com `git cat-file` e `git merge-base
   --is-ancestor`, e exigir `artifact` arquivo regular não vazio** — fecha **F1**, três linhas
   sobre campos que já existem, e a entrada do PR 173 mostra que a classe já tem instância viva.
3. **Uma checagem B-nova que recompute o portão a partir do `exposure`** pelo ramo de perfil
   vigente e reprove divergência sem razão declarada — fecha **F3**. A derivação já é descrita
   como mecânica em quatro triagens e já foi reimplementada do zero por um revisor; falta apenas
   virar regra executada.

## Inquérito

1. Quantos dos 23 handlers do `accountingController` têm a mesma quebra de inquilino
   sobrevivente que o `deleteAccount`?
2. A coluna `invariantes` das 110 linhas do AV-R2 foi produzida sem remover comentários em
   **todos** os quatro eixos, ou só nos dois que eu medi? O `ratified_subqueue_criterion` conta
   invariantes **simultâneas** — se o eixo `inquilino` também tiver rótulo sem lastro, o
   conjunto de quatro unidades pode não ser esse.
3. **Qual** handle mantém o processo vivo, e por que só quando há teste reprovando? Enquanto a
   causa não for nomeada, `--forceExit` é curativo: mascara o handle em vez de fechá-lo.
4. Quantas outras medições desta bancada foram feitas em **uma linha** em vez do par, como a
   minha refutação do `RV171-F5`? É a forma dos três achados de condição desta rodada; se for
   comum nos artefatos anteriores, há veredito publicado apoiado em meia medição.

## Auto-verificação

- **10 falsificadores emitidos, 10 executados.** **38 mutações aplicadas**, 38 com aplicação
  conferida e 38 restaurações conferidas vazias. **15 controles verdes, 8 controles vermelhos.**
  A conferência de aplicação muda de método conforme o alvo, e isso está declarado: `git diff
  --numstat` para arquivo rastreado, comparação de conteúdo para a árvore de `origin/main`
  materializada fora do repositório, e `sha256` para o meu próprio artefato, que é *untracked* e
  por isso **não aparece em `numstat`** — usar numstat ali teria dado "vazio" para toda mutação.
- **Zero `git checkout` de arquivo rastreado.** Zero commit, zero `git add`, zero push.
- **Zero resultados do tipo `Test Suites: falhou` com `Tests: 0 failed`** — nenhuma execução caiu
  no falso positivo da armadilha 1.
- **Sem revisão independente**, e esta rodada não terá. O agravante é próprio dela: o objeto são
  seis revisões independentes, e quem as mede não tem revisor. Controle não é revisão.
- **Escopo dos falsificadores:** todos contra `ca99c9ae`, exceto os do F8, contra `origin/main`
  (`30d28d86`) materializado fora do repositório — declarado no achado, no NM8 e em cada
  evidência dele.
- **Barreiras procuradas antes de emitir `barrier_kind`:** `gateMap` no gate devolve 0 e
  `exposure` devolve 2, então não há checagem a estender (F1, F3); o B18 já lê a coluna
  `invariantes` num eixo, por isso o F2 pede **estendê-lo**; o molde de teste de rota existe em
  `main` com mordida provada (F6, F7). **Nenhum achado saiu com `nenhuma_conhecida`.**

### Meus vieses, nomeados

0. **A refutação era minha e era falsa, e é o que mais me incomoda** — porque foi o único
   ponto da rodada onde eu produzi um resultado que me **favorecia**. "O revisor errou" era o
   achado mais vistoso disponível em 35, e eu o escrevi a partir de meia medição. Ver F10.
1. **Consolidar rende mais quando os achados sobrevivem** — agora são **25 de 25**, placar
   ainda mais suspeito que o anterior. O que o separa é que ele é resultado de eu ter derrubado
   a minha própria exceção, e não de eu ter parado de procurar; e que **reduzi manchete de
   revisor em três lugares**.
2. **Eu escolhi as dez classes.** Consolidar 35 em 10 é decisão minha sem falsificador: outro
   recorte daria outro número e nenhum comando distingue os dois. O contrapeso é que **todo
   achado não promovido está nomeado** em `not_measured` ou `latent_bugs`, com o motivo.
3. **O F8 me convém como aceite.** Foi o mais caro de medir e o único que eu poderia ter
   deixado de fora alegando escopo; emiti-lo como `apenas_teorico` é o único lugar da rodada
   onde o portão mais leve coincide com o achado mais trabalhoso. Derivei o rótulo do critério
   da AV-R6, e ainda assim o leitor deve desconfiar da coincidência.
4. **Cometi a classe do F4 dentro da rodada que a emite**, duas vezes — o que faz o meu erro
   parecer descoberta de classe. A medição está de pé; a leitura de que isso me credita, não.
