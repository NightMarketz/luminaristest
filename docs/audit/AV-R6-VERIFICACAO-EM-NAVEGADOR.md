# AV-R6 · Verificação em navegador da própria bancada — modos de falha de runtime

**A bancada tem cinco defeitos que o gate não vê porque o gate lê arquivo e eles só existem
com a página rodando. O pior: o listener delegado de `#ficha` dobra a cada decisão respondida
no passo 2 — medido `2 → 4 → 8 → 16 → 32 → 64 → 128` handlers por evento, e depois de sete
decisões um clique em "Copiar" executa a rotina de payload 257 vezes.** Os outros quatro são
a barra de contadores que se declara fixa e nunca fixa (curso de sticky medido em zero), o
banner que imprime `0.941` e `0,70` na mesma frase, `aria-selected` pendurado em 29 elementos
de papel `button`, e o anel de foco da mesma cor do fundo no item selecionado.

> `node scripts/bancada-gate.mjs` sai **0** com os cinco vivos. Isso **não é regra quebrada**:
> nenhuma das dezessete checagens alega ler comportamento — elas leem estrutura de arquivo.
> É a primeira vez que a bancada mede a distância entre "gate verde" e "ferramenta funciona".

---

## Recorte e execução

| | |
|---|---|
| Commit | `59c1eb9b` · worktree `vigilant-gauss-232a9b`, árvore limpa antes e depois |
| Recorte | `docs/audit/bancada.html` — só ele; `server/`, `my-app/` e `scripts/` fora |
| Engine | Chromium do painel de preview, `file://` direto |
| Instâncias | 4 carregamentos independentes (1 página + 3 iframes same-origin), viewports de 900 px e 1200 px |
| Reprodução | as 5 medições rodaram **2×**, em instância limpa a cada vez |
| Tipos / build / suíte | **não rodaram** — esta worktree não tem `node_modules` em lugar nenhum |
| Runtime | **rodou** — é a primeira rodada da bancada com `reduced_capabilities.runtime = true` |
| Correções aplicadas | **nenhuma** — o AV-00 bloco 9 proíbe corrigir o não triado |

**AV-R6 não é um instrumento do catálogo.** Nenhum dos 21 códigos `AV-*` da bancada cobre
"executar um artefato HTML e medir o comportamento dele". A rodada emprestou o envelope v4.1;
a lacuna está em `inquiry[]` e é feedback de instrumento, não licença.

### A armadilha que contaminaria a medição, e como foi desviada

O painel de preview **executa JS normalmente** — a afirmação contrária que circulou é falsa e
já foi corrigida no `CONTINUACAO.md`. O que ele não faz é **recarregar a mesma URL `file://`**:
`navigate` e `location.reload()` devolvem o mesmo documento com o estado anterior vivo. Toda
medição desta rodada que precisava de estado limpo foi feita em **iframe same-origin criado
dentro da própria página** (`f.src='bancada.html'`), que carrega um documento novo de verdade —
conferido: `contentDocument` acessível, `readyState: complete`, `typeof select === 'function'`.

---

## Peça central · modos de falha de runtime

| Modo | Sítio | Gatilho no fluxo do dono | O que foi medido | Veredito |
|---|---|---|---|---|
| **D1** listener delegado acumula a cada render | `bancada.html:2769-2776` × `:2956` × `:256` | responder as decisões do passo 2 | 2→4→8→16→32→64→128 handlers por evento; 257 execuções em um clique | **confirmado** |
| **D2** a barra fixa nunca fixa | `bancada.html:185` dentro de `:2743` | preencher o passo 2 olhando os contadores | curso de sticky **= 0**; topo anda 1:1 com o scroll | **confirmado** |
| **D3** separador decimal misturado | `bancada.html:3089` e `:3091` | abrir qualquer relatório no visualizador | banner renderizado com `0.941` e `0,70` | **confirmado** |
| **D4** `aria-selected` em papel `button` | `bancada.html:2925` e `:2945` | navegar o trilho com leitor de tela | 29/29 são `<button>`; 0 elementos com papel de lista | **estrutura confirmada, consequência não observada** |
| **D5** anel de foco da cor do fundo | `bancada.html:47` × `:59` | chegar ao item selecionado por Tab | `outline-color` = `background-color` = `rgb(34,38,42)` | **confirmado** |

> **Números de linha.** O `CONTINUACAO.md` cita `:2727` para o listener, `:2694` para o `#sbar`
> e `:2876` para o `aria-selected`. Os três estão **defasados** no arquivo em `59c1eb9b`: os
> sítios reais são `:2769`, `:2743` e `:2925`. O conteúdo apontado é o mesmo; quem pular direto
> para a linha citada cai no lugar errado. Corrigido aqui, não lá.

---

## D1 · o listener delegado de `#ficha` dobra a cada decisão · dano 4

O mecanismo, lido no código e não inferido:

| Linha | O que faz |
|---|---|
| `:256` | `<main class="ficha" id="ficha">` — **o mesmo nó em todo render** |
| `:2769` | `const f = el("ficha")` dentro de `wireConductor` |
| `:2770`, `:2772`, `:2776` | três `addEventListener` pendurados nesse nó |
| `:2774` | o handler de `change` chama `select("REGÊNCIA")` quando o select é pendente e `STEP===2` |
| `:2956` | `select()` troca `f.innerHTML` e chama `wireConductor()` **de novo** |

`innerHTML` troca os **filhos**; o nó que escuta nunca é substituído. O arquivo inteiro tem
**zero** `removeEventListener` contra 17 `addEventListener`. O laço fecha em `:2774 → :2956 → :2769`.

Medido em iframe limpo, com `wireConductor` embrulhado por contador **antes** de qualquer
interação, despachando um `change` por decisão do passo 2:

| Decisão | Handlers disparados | ms (1ª execução) | ms (2ª execução, viewport diferente) |
|---|---|---|---|
| 1 · `deployed` | **2** | 2 | 8 |
| 2 · `users` | **4** | 3 | 19 |
| 3 · `paid` | **8** | 6 | 11 |
| 4 · `humanGate` | **16** | 19 | 35 |
| 5 · `rigor` | **32** | 37 | 55 |
| 6 · `fpTol` | **64** | 97 | 101 |
| 7 · `audience` | **128** | 187 | 235 |
| 8 · (mesma sessão) | **258** | 392 | — |
| 9 · (mesma sessão) | **516** | 996 | — |

E o custo do clique, na mesma instância, depois de sete decisões: **257 execuções da rotina de
payload em um único clique em "Copiar"**, contadas embrulhando `payloadBy`.

**Atribuição verificada: é código v3 pré-existente**, reproduzido sem alteração na reconstrução
(`e0dccad`). O registro em nó persistente e o laço `change → select` já eram a forma da página
antes dela — **não é regressão da v4**.

**O que este relatório NÃO afirma.** A palavra "trava" pertence à sessão anterior. Eu parei no
9º evento, com 516 handlers e 996 ms: isso é degradação medida, não travamento. E o `5477 ms`
do clique em Copiar é número dela, em Chromium via puppeteer — aqui o mesmo clique custou
**33 ms**, e a diferença é de ambiente de clipboard, não do defeito. Os dois números herdados
estão marcados como herdados no JSON (`S2` e `NM4`).

**Falsificador estático — rode agora:**

```bash
cd docs/audit && grep -n 'const f=el("ficha")' bancada.html; grep -n 'conductorHTML();wireConductor()' bancada.html; grep -n 'PENDING.includes(t.dataset.p)&&STEP===2' bancada.html; grep -c removeEventListener bancada.html
```

Saída no commit, colada da execução: o primeiro `grep` devolve **três** sítios que pegam o mesmo
nó — `2752` (`refreshMeta`), `2769` (`wireConductor`, onde os três listeners são registrados) e
`2955` (`select`) —, depois `2956`, `2774` e `0`. O comando **sai 1**, porque o último `grep -c`
devolve zero: a saída é o dado, o código de saída não é o veredito. Se qualquer um dos três
sítios sumir, ou se a contagem de remoções passar de zero, o mecanismo do achado cai.

Controle discriminante, porque um zero é o resultado mais fácil de obter por acidente:
`grep -c addEventListener` devolve **17** no mesmo arquivo — o padrão enxerga o arquivo, o zero
é ausência real.

**Demonstração (§6b, 20 s, exige só um navegador com a página aberta):** cole no console e
observe `2`, `4`, `8` — o comando completo está em `findings[0].demonstration.command` do JSON.

---

## D2 · a barra "fixa" nunca fixa · dano 2

`.sticky` (`:185`) é `position:sticky; bottom:0` — e o computado confirma: `sticky` / `0px`, a
declaração está **ativa**. O que falta é curso. A barra está embrulhada em `<div id="sbar">`
(`:2743`), e `stickyBar()` (`:2730`) devolve **um único** `.sticky`, então o embrulho não tem
outro conteúdo que lhe dê altura:

| Medida | Valor |
|---|---|
| altura de `#sbar` | **59 px** |
| altura de `#sbar .sticky` | **59 px** |
| **curso de sticky disponível** | **0 px** |

Consequência, medida em três posições de scroll na mesma instância:

| `scrollY` | topo da barra | anda |
|---|---|---|
| 0 | 4282 | — |
| 1905 | 2377 | −1905 |
| 3809 | 473 | −1904 |

**1:1 com o scroll** — comportamento de elemento estático. Com viewport de 696 px, os
contadores (perfil %, decisões respondidas, teto) só entram em tela no fim de uma página de
4505 px, exatamente enquanto o dono preenche o passo 2 que os move.

**O embrulho não é gratuito, e isto muda o conserto:** `refreshMeta()` (`:2751`) reescreve o
`innerHTML` de `#sbar` para atualizar os contadores sem tocar o resto da ficha. Apagar o `div`
quebra essa atualização. O conserto é mover `position:sticky` para o próprio `#sbar`.

**Falsificador estático** (em `findings[1].falsifier_static`): devolve `true | true | 0` — barra
embrulhada, embrulho com um único filho, e **zero seletores de ID em toda a folha de estilo**.
Esse terceiro número é mais forte do que perguntar por `#sbar`: prova que a ausência de altura
não é da minha regex. **E ele exige um desconto que a primeira versão do comando não fazia:** a
varredura crua devolve **16** ocorrências de `#`, e as dezesseis são cores (`#C7CCC3`, `#fff`,
`#F0BE10`…). Sem descontar hexadecimal, o falsificador mentiria na direção do próprio achado —
peguei isso executando a string como ela ficou salva, não como eu a escrevi.

**`static_gap` declarado:** o *efeito* geométrico exige motor de layout e não é alcançável por
comando estático. O falsificador prova a **causa**; os números da tabela são de execução.

---

## D3 · `0.941` com ponto e `0,70` com vírgula, no mesmo banner · dano 1

Renderizado no visualizador da própria página, pelo caminho normal (colar JSON, clicar em
Renderizar). Texto lido do DOM:

```
Origem do código · 0.941 … acima de 0,70 só verification_mode: execucao sustenta confiança alta.
```

O valor sai de `${esc(rt.value)}` (`:3089`) — número JavaScript cru, sem locale. O limiar está
escrito à mão com vírgula (`:3091`). A prosa do instrumento (`:659`) também usa `0,941`: a
página é consistente em texto e inconsistente no que renderiza.

Checagem adversarial que **enfraqueceu** o achado, e por isso o dano é 1 e não 2: é defensável
que o valor apareça como está no JSON. O que não é defensável é a frase seguinte, **no mesmo
banner**, escrever o limiar de outro jeito.

---

## D4 e D5 · os dois "de menor porte" — por que ambos entram como achado

A sessão anterior deliberadamente não os chamou de quebra. **Entram como achado, não como
`conventions[]` e não como nada.** O critério é o do próprio contrato, não gosto:
`conventions[]` é para **alegação de prática corrente** que não é achado ("cobertura mínima de
X%", "componente deve ter teste de render"). Estes dois não são alegação de prática — são
condição verificável do artefato, **cada um com falsificador estático que roda hoje**. Sob o
rigor estrito que a bancada assume por omissão, o que tem falsificador e foi medido é emitido;
o que faz a triagem é o portão, não a omissão. Ficar de fora seria arredondar.

**Emitir engorda meu resultado, e isso está nomeado em `own_bias_named`.** A defesa é que a
decisão é falsificável: rode os dois comandos.

### D4 · `aria-selected` em papel `button` · dano 1 · `apenas_teorico`

29 elementos carregam `aria-selected`, e os 29 são `<button>` sem `role` explícito. A mesma
varredura conta **zero** elementos com papel `listbox`, `option`, `tab` ou `tablist` na página.
`aria-selected` é suportado por `gridcell`, `option`, `row`, `tab`, `columnheader`, `rowheader`
e `treeitem` — `button` não está na lista, e o atributo não vira estado. O atributo funciona
como gancho de **estilo** (`:59`), e é por isso que o defeito é invisível para quem só olha.

**Este é o único achado da rodada com confiança `media`, e o motivo é medido:** nenhuma
tecnologia assistiva foi exercida, e a árvore de acessibilidade do painel devolveu *página
vazia, viewport 0x0* (`NM2`). A estrutura é execução; a consequência é leitura de
especificação. Emitir com confiança alta seria promover leitura a medição — daí também o
`exposure: apenas_teorico`, que aqui significa **"nenhum caminho de dano foi medido"**, não
"não é defeito". No dia em que um leitor de tela abrir a página, a exposição vira `ja_exposto`
e o portão sobe sozinho.

### D5 · anel de foco da cor do fundo no item selecionado · dano 1 · `ja_exposto`

`:47` → `.item:focus-visible{outline:2px solid var(--graphite);outline-offset:1px}`
`:59` → `.item[aria-selected="true"]{background:var(--graphite);color:var(--paper)}`

Mesma variável, mesmo elemento, estados que coexistem. Medido com `:focus-visible` **real**:
`outline-color` = `rgb(34,38,42)` e `background-color` = `rgb(34,38,42)`, idênticos, separados
só pelo `outline-offset: 1px`.

**A checagem adversarial que quase derrubou este achado, e que é a lição de método da rodada:**
`.focus()` por script **não ativa** `:focus-visible` em Chromium — a primeira medição devolveu
`rgb(243,244,240)`, 3 px, offset 0, que é o anel padrão do navegador e **é bem visível**. Se eu
tivesse parado ali, teria emitido o achado ao contrário. Só com **Tab de teclado real** o
`matches(':focus-visible')` virou `true` e a regra de `:47` passou a valer. Medir estilo de
foco exige modalidade de teclado e a conferência explícita do `matches`.

Segundo contrapeso, que reduz o achado: atinge **um** item por vez, o selecionado. Nos outros
28 o anel grafite sobre fundo claro é perfeitamente visível.

---

## Placar

| Dimensão | Nível | Teto | Por quê |
|---|---|---|---|
| **R1** Sobrevivência do fluxo do dono | 1 | 3 | os três passos completam e o console fica limpo, mas o 9º evento custa 30× o primeiro |
| **R2** Legibilidade do estado enquanto se decide | **0** | 3 | os contadores existem e ficam fora da tela justamente no passo em que servem |
| **R3** Higiene de listeners | **0** | 3 | zero `removeEventListener` contra 17 `addEventListener`; três em nó persistente |
| **R4** Acessibilidade do trilho | 1 | 3 | foco visível nos 28 não selecionados e ausente no selecionado; seleção sem expressão não visual |
| **R5** Carregamento e erro silencioso | **3** | 3 | 4 instâncias, ~1500 re-renders, **zero** mensagens de console de qualquer nível |

Teto 3 em todas por contrato (sem dado de produção). **R5 é o resultado desconfortável:**
nenhum dos cinco defeitos se anuncia por erro. Console limpo mediu exatamente o que mede —
que a página não lança —, e foi lido na sessão anterior como sinal de saúde.

---

## Não medido

| | O quê | Consequência |
|---|---|---|
| **NM1** | segunda engine independente | as 5 medições foram reproduzidas 2× na **mesma** engine, em instâncias limpas e viewports diferentes; a reprodução em segunda engine no `CONTINUACAO.md` é da sessão anterior e é citada como tal |
| **NM2** | comportamento sob tecnologia assistiva | D4 tem estrutura medida e consequência derivada da especificação — é a razão do `apenas_teorico` + `media` |
| **NM3** | captura de tela | nenhuma afirmação visual se apoia em imagem; tudo foi medido por geometria e cor computada |
| **NM4** | congelamento com as 9 decisões | não reproduzido por mim; parei em 516 handlers / 996 ms |
| **NM5** | outro SO, outro DPI, engine Gecko/WebKit | os absolutos (59 px, 4505 px) variam; a **relação** medida não varia — sai de duas declarações de CSS |

---

## Movimentos mais baratos

1. **Registrar os três listeners de `#ficha` uma vez, fora de `wireConductor`** — fecha D1.
   `wireSteps` e `wireBar` já operam sobre nós recriados e não precisam mudar.
2. **Mover `position:sticky` para o `#sbar`**, mantendo o embrulho como alvo de `refreshMeta` — fecha D2.
3. **Uma cor de anel própria para `.item[aria-selected=true]:focus-visible`** — fecha D5; a
   página já usa `--signal` e `--paper` dentro do mesmo item selecionado.

**Nenhum deles foi aplicado.** O bloco 9 do AV-00 proíbe corrigir achado não triado, e a
tentação era concreta: D1 fecha com poucas linhas. A triagem é `docs/audit/TRIAGEM-AV-R6.json`.

---

## Limite honesto

**Esta rodada não foi revisada por agente separado** — o §9.4 rejeita PASS emitido por quem
executou, e é exatamente o caso: eu medi e eu emiti. `review_of_this_run: null` com
`review_gap` declarado.

**Recebi os três primeiros achados prontos, em prosa, de uma sessão anterior, e sabia o
resultado esperado antes de medir.** É o pior viés desta rodada: um medidor que já sabe a
resposta encontra a resposta. O contrapeso que existe é factual, não retórico — o falsificador
de D5 rodou **primeiro pelo caminho errado** e devolveu um resultado **contrário** ao esperado,
o que me obrigou a refazer. Quem só confirma não tropeça assim.

**Medi a ferramenta com a própria ferramenta:** os iframes vivem dentro da página medida e o
contador embrulha uma função dela. Se a página tivesse defeito que corrompesse `wireConductor`,
o instrumento estaria contaminado pelo mesmo defeito. O contrapeso é que a série é aritmética
exata — potências de 2 em duas instâncias independentes — e isso é difícil de produzir por
contaminação.

**O gate saiu 0 com os cinco vivos.** Não é regra quebrada; é cobertura declarada. Mas
significa que, até hoje, "gate verde" nunca disse nada sobre a bancada funcionar.
