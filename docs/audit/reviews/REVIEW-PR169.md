# Revisão independente — PR #169

- **Revisor:** agente isolado (claude-opus-5), sessão distinta da que emitiu a AV-R7 e da que a triou.
- **Data:** 2026-08-07
- **Alvo:** PR #169 `claude/triagem-av-r7`, mergeado em `8ae02b23` (2026-08-06T23:19:37Z) — artefato `docs/audit/TRIAGEM-AV-R7.json` (`triagem/1.0`, 5 itens).
- **Worktree de revisão:** `C:/Users/smurf/Downloads/Luminaris/.claude/worktrees/rv-169`, detached em `18b14b12c1b50a4afd16e8ab16ddbe56d008daea`.
- **Estado ao fechar:** `git status --porcelain` **vazio** no `rv-169` (conferido depois da mutação de gate, restaurada de `.bak` guardado FORA do repo; `git diff --numstat` vazio).
- **Nada foi corrigido.** Nenhum `git add`, commit, push ou merge. Nenhum `git checkout -- <arquivo>`.

---

## 2. Veredito — `revisado_com_ressalva`

**A alegação central sobrevive: reimplementei a derivação do `gateMap` do zero e ela devolve `bloqueia_primeiro_cliente` nos cinco — o portão é mecânico e reproduz o artefato 5/5.** O que não sobrevive é a alegação de que essa derivação seja *o único ponto onde o processo contradiz o autor*: encontrei três contradições que o processo do autor não pegou, e a mais cara é que **as barreiras dos ranks 3 e 4 já estavam escritas num branch irmão do mesmo commit-base horas antes da triagem ser mergeada** — os dois itens de maior dano entraram na fila com dono e data já satisfeitos, e `barriers_searched` não enxergou.

**Risco principal:** a "prova objetiva no lugar de revisão" que o próprio artefato oferece (executar o falsificador a partir do JSON relido) é um controle de *fidelidade de string*, não de *substância*. Ela pegou 1 defeito; uma passagem independente pegou 4 mais no mesmo material, incluindo um segundo falsificador da mesma classe que o autor declarou ter procurado. Eu **reprovaria a alegação de suficiência do controle**; a triagem em si é boa e os cinco vereditos ficam de pé. Por proibição de corrigir, fica `revisado_com_ressalva`.

---

## 3. O que reexecutei — os cinco falsificadores, um por um

Método: extraí `findings[].falsifier_static` do `AV-R7-FORCA-DA-SUITE-SUBFILA.json` **relido** com `node`, gravei cada string verbatim num `.sh` no scratchpad e rodei cada um com `bash arquivo.sh` a partir da raiz do worktree — **shell padrão, sem `set -o pipefail`, sem `set -e`**, um processo por falsificador (nada de encadear os cinco). Comando de laço:

```sh
for f in F1 F2 F3 F4 F5; do
  echo "########## $f ##########"
  ( cd "$R" && bash "$D/f_$f.sh" ); echo "EXIT=$?"
done
```

### F1 — `repositorios-da-subfila-sem-cobertura-alcancavel` (rank 4, dano 4)

| | |
|---|---|
| Saída em `18b14b12` (HEAD) | `3` |
| Exit code | `0` |
| Reproduz? | **NÃO** |
| Saída em `8ae02b23` (commit do PR) | `0` |

**Não reproduz mais porque foi consertado, não porque a triagem errasse.** Verificado: `git grep -lE "CounterpartyRepository\|DimensionRepository\|ReferentialMappingRepository" 8ae02b23 -- 'server/src/**/*.test.ts' | wc -l` devolve **0** no commit do próprio PR. Os três arquivos que hoje casam são `…/repositories/__tests__/{Counterparty,Dimension,ReferentialMapping}Repository.integration.test.ts`, introduzidos em `b1464747`, `0a24d3f9`, `928933bc` — ver achado novo **N3**.

**Meus controles (não os dele — usei `git grep` + `git ls-tree`, ferramentas diferentes do `grep -rl` + `find` do autor):**
- `git ls-tree -r --name-only 8ae02b23 -- server/src | grep -c '\.test\.ts$'` → **139** (o corpus não está vazio);
- `git grep -lE "PostingRepository" 8ae02b23 -- 'server/src/**/*.test.ts' | wc -l` → **10** (a busca enxerga quem aparece);
- controle discriminante meu, varredura em `node` sobre 645 arquivos `.ts`: símbolo inexistente devolve **0**, `PostingService` devolve **7**.

### F2 — `controller-de-contabilidade-sem-alcance-http` (rank 3, dano 3)

| | |
|---|---|
| Saída em HEAD | `14` / `1` / `2` |
| Exit code | `0` (cadeia inteira, o controle rodou) |
| Reproduz? | **NÃO** (o achado exige `0` no número do meio) |
| Saída em `8ae02b23` | `0` accounting, `2` users |

Mesmo mecanismo do F1: `src/controllers/__tests__/accountingController.integration.test.ts` nasceu em `8d124293`. No commit do PR, o achado era verdadeiro.

**Meus controles:** busca larga (não o padrão `.get('/api/accounting` do autor, mas o literal `api/accounting` em *qualquer* `*.test.ts`) → **9 linhas** em três arquivos; controle `api/users` → 5 arquivos; controle discriminante `api/naoexiste` → **0**. Esses 9 são o achado novo **N1**.

**Armadilha 1 do briefing reproduzida ao vivo, e é minha:** a mesma busca escrita `"/api/accounting"` (com barra inicial) no `git grep` devolve **0**. Rodei as duas formas de propósito; sem o controle eu teria assinado "zero ocorrências" e confirmado o autor pela razão errada.

### F3 — `softdelete-etiquetado-em-unidade-que-nao-tem-soft-delete` (rank 2, dano 2)

| | |
|---|---|
| Saída em HEAD | `0` |
| Exit code | **`1`** |
| Reproduz? | **SIM** — e **para antes do próprio controle**, exatamente como o autor registrou |

O `grep -c` sai `1` quando conta zero, o `&&` quebra a cadeia, o segundo `awk` (que **é** o controle) nunca roda. **Confirmado sem `pipefail`** — o defeito é do comando publicado, não de opção de shell.

**Meu controle, por método diferente (parser de `schema.prisma` em `node`, não `awk`+`grep -c`):** 43 `model` reconhecidos no arquivo (o parser não está cego); `ReferentialMapping` → 15 campos, **sem** `deletedAt`; `Counterparty` → 17 campos, **com** `deletedAt`; `Account` → **com**. Achado confirmado.

**Tentei ampliar o F3 para uma varredura de classe e FALHEI, o que registro como negativo:** hipótese de que `DimensionRepository` também estivesse mal-etiquetado. Medido: os models que ele toca (`DimensionDefinition`, `DimensionValue`) **têm** `deletedAt`. A etiqueta está certa lá. O F3 acertou o escopo — 1 linha errada, não 2.

### F4 — `fan-in-do-simbolo-concreto-le-um-sob-injecao-por-interface` (rank 5, dano 1)

| | |
|---|---|
| Saída em HEAD | `1 3` / `1 5` / `1 1` |
| Exit code | `0` |
| Reproduz? | **SIM**, idêntico ao registrado |

**Meu controle, por varredura própria em `node` (645 arquivos `.ts`, `__tests__` fora):** concreto = 1 nos três, e o único importador é `src/lib/factory.ts` nos três. Interface, excluindo o próprio arquivo de implementação e o factory: `ICounterpartyRepository` **3**, `IDimensionRepository` **5**, `IReferentialMappingRepository` **1** — bate com 1/3, 1/5, 1/1. Controles discriminantes: símbolo inexistente **0**, `PostingService` **7**. Bônus que *reforça* o achado: `PostingRepository` também lê **1**, o que sustenta a generalização "lê 1 para todo repositório Prisma sob injeção por interface".

**Aqui está o SEGUNDO defeito da classe do F3** — ver achado novo **N2**.

### F5 — `agent-authored-ratio-sem-denominador-declarado` (rank 1, dano 2)

| | |
|---|---|
| Saída em HEAD | `443/676 432/451` |
| Exit code | `0` |
| Reproduz? | **SIM** — 0,6553 e 0,9579, lados opostos do teto 0,70 |

**Meu controle, por método diferente:** em vez do regex do autor sobre `%B`, usei o parser de trailer do próprio git — `git log --format='%H\|%P\|%(trailers:key=Co-authored-by,valueonly)'`. Números idênticos: 443/676 e 432/451. Achado confirmado por instrumento independente.

**E esse método mediu uma coisa que o do autor não mede:** dos 225 merges, **11 carregam o trailer** — ver achado novo **N4**.

**Placar:** 3 de 5 ainda reproduzem em `18b14b12`; **5 de 5 reproduzem em `8ae02b23`**, o commit que o PR entregou. Nenhum veredito da triagem cai por reexecução.

---

## 4. Minha derivação independente do `gateMap`

Não citei o mapa: **extraí a função do HTML e a executei**.

```js
const src = html.match(/function gateMap\(\)\{[\s\S]*?\n\}/)[0];
const gateMap = new Function('P', '"use strict";' + src + '; return gateMap();');
gateMap({ deployed: 'nao' });   // ramo "nunca implantado"
```

Ramo devolvido, verbatim:

```
irreversível ou perda de dado → bloqueia_deploy · ja_exposto → bloqueia_primeiro_cliente ·
com_dado_de_terceiro → bloqueia_primeiro_cliente · apos_deploy não irreversível → bloqueia_primeiro_cliente ·
latente_por_dependencia → aceitavel_com_registro com gatilho nomeado ·
com_volume e apenas_teorico → aceitavel_com_registro com gatilho
```

Bate byte a byte (a menos de acentos) com `profile_decision.branch_nunca_implantado`. Apliquei os pares aos campos do relatório:

| Achado | `exposure` | `reversibility` | Regra 1 dispara? | Portão derivado por MIM | Portão do artefato | Bate? |
|---|---|---|---|---|---|---|
| F1 (rank 4) | `ja_exposto` | `reversivel` | não pelo campo; **SIM pelo texto** de `business_impact` ("perda de dado cruzando inquilino") | `bloqueia_primeiro_cliente` | `bloqueia_primeiro_cliente` | **SIM** |
| F2 (rank 3) | `ja_exposto` | `reversivel` | não | `bloqueia_primeiro_cliente` | `bloqueia_primeiro_cliente` | **SIM** |
| F3 (rank 2) | `ja_exposto` | `reversivel` | não | `bloqueia_primeiro_cliente` | `bloqueia_primeiro_cliente` | **SIM** |
| F4 (rank 5) | `ja_exposto` | `reversivel` | não | `bloqueia_primeiro_cliente` | `bloqueia_primeiro_cliente` | **SIM** |
| F5 (rank 1) | `ja_exposto` | `reversivel` | não | `bloqueia_primeiro_cliente` | `bloqueia_primeiro_cliente` | **SIM** |

**5/5. A derivação é mecânica e o artefato a aplicou corretamente.** (verificado)

**Ataque que tentei e que caiu:** promover o F1 a `bloqueia_deploy` pela regra 1, já que o `business_impact` dele literalmente diz "perda de dado". Fui ao precedente: a TRIAGEM-R1-R3 aplicou a regra 1 à *substância* (o item Qdrant, `apos_deploy`, virou `bloqueia_deploy` por divulgação irreversível + escrita), **mas** o item 4 dela — "caminho de escrita do razão sem cobertura de integração", dano 4, `ja_exposto`, ausência de teste sobre operação irreversível declarada pelo dono — recebeu `bloqueia_primeiro_cliente` com a razão exata que o F1 usa. **O precedente é coerente e o meu ataque falha.** (verificado)

**Segunda hipótese, a que o briefing manda testar — os *inputs* foram escolhidos para produzir o portão?** Aqui a resposta muda de tom. O mapa tem 6 entradas; a rodada usou **1**. Comparado às outras triagens da bancada:

| Triagem | Exposures usadas | `gates_summary` | Não-`ja_exposto`? |
|---|---|---|---|
| AV-L1 (`deployed=interno`) | `ja_exposto`×2, `apos_deploy`×1, `apenas_teorico`×1 | 0 / 3 / 1 | **sim** (`apenas_teorico`) |
| TRIAGEM-R1-R3 | `ja_exposto`×3, `apos_deploy`×3, `latente_por_dependencia`×1 | 1 / 5 / 1 | **sim** (2 tipos) |
| TRIAGEM-AV-R6 | `ja_exposto`×4, `apenas_teorico`×1 | 0 / 4 / 1 | **sim** (`apenas_teorico`) |
| **TRIAGEM-AV-R7** | **`ja_exposto`×5** | **0 / 5 / 0** | **NÃO** |

Em **toda** rodada anterior, a variação do portão veio do campo `exposure` — nunca do mapa. **"5 de 5" é propriedade do rótulo de exposição, não dos achados nem do mapa.** (verificado por medição dos quatro artefatos) — e ao menos um dos cinco rótulos é insustentável pelo critério que o próprio autor fixou: achado novo **N5**.

---

## 5. Alegações que caíram

**(A1) "…e isso é o único ponto onde o processo contradiz o autor" (`deviations[0].mitigation`, `own_bias_named` (1)) — CAIU.**
O processo contradiz o autor em mais três pontos que ele não registrou, todos mensuráveis do material que ele mesmo entregou: N1 (contagem de 7 que é 9, com uma assertiva viva no meio), N2 (segundo falsificador sem controle alcançável), N3 (barreira dos ranks 3 e 4 já escrita). A frase seria verdadeira reescrita como "o único ponto onde *o meu* processo me contradisse".

**(A2) "O autor achou UM defeito de falsificador" implica que ele varreu a classe — CAIU.**
`new_findings_raised[1]` chega a nomear a classe ("todo falsificador do diretório que encadeie pipelines com `&&`") e declara "não foi medido nos outros relatórios". Mas dentro do **próprio AV-R7** existe um segundo caso, de mecanismo diferente e consequência idêntica, e ele não foi medido: o F4 (N2). A varredura de classe parou na primeira instância do mecanismo que ele já conhecia.

**(A3) "as 7 ocorrências de /api/accounting no corpus de teste foram listadas uma a uma… 4 são do teste do MIDDLEWARE e 3 são comentários de contagem" (`items[2].verification_note`, reafirmado como "verificada também a parte substantiva") — CAIU.**
São **9**, estáveis nos três commits (`40892baa`, `60c945bc`, `8ae02b23`). 4 em `middleware/__tests__/auth.test.ts` (bate), **4** comentários em `src/__tests__/openapi-paths.test.ts` (não 3), e **1 em `src/__tests__/route-spec-wiring.test.ts:36`, que não é comentário: é a string `'PATCH /api/accounting/accounts/{id}/requires-dimension'` dentro de uma lista viva de dívida de doc**. O veredito do F2 não muda (nenhuma das 9 sobe o app e requisita o handler), mas a enumeração exaustiva que a triagem reafirmou como verificada está errada em contagem *e* em classificação.

**(A4) "os 219 merges, que nunca carregam trailer" (`findings[F5].measured`) — CAIU.**
11 dos 225 merges carregam `Co-authored-by: …claude` (medido pelo parser de trailer do git). É a diferença 443−432 que sai do próprio comando do autor e que ele leu como zero. Não muda a direção do F5. (N4)

**(A5) "três `suggested_gate` meus foram sobrescritos" como inventário completo das sobrescritas — CAIU parcialmente.**
A triagem também sobrescreveu **dois `barrier_kind`** do relatório sem os declarar como override: F3 `nenhuma_conhecida` → `teste_de_fronteira` e F5 `alerta` → `teste_de_fronteira`. O `barrier_note` explica cada um, então não é ocultação; mas a sobrescrita do F3 é *substantivamente maior* que qualquer override de portão — é o instrumento voltando atrás num "não existe barreira possível" — e ela não aparece na manchete nem no `own_bias_named`.

---

## 6. Alegações que sobreviveram

1. **"Derivação mecânica do `gateMap`, `bloqueia_primeiro_cliente` nos cinco."** Reimplementei do zero, extraindo a função do HTML. 5/5. (verificado)
2. **"O falsificador do F3 para antes do próprio controle."** Reproduzi em shell padrão: saída `0`, exit `1`, sem o `2`. É defeito do comando publicado, não do wrapper. (verificado)
3. **"Nenhuma correção de código foi feita nesta passagem."** `git diff --name-only 8ae02b23^1 8ae02b23` devolve exatamente 4 arquivos, todos em `docs/audit/`. (verificado)
4. **"NÃO altera a TRIAGEM-R1-R3; ela ganha um ponteiro."** Comparei os dois lados do merge: `items[]` e `gates_summary` **byte-idênticos**; só `r2_decision` ganhou 3 chaves novas. Nenhuma chave de topo removida. (verificado)
5. **Os cinco achados eram verdadeiros no commit entregue.** Reexecutei F1 e F2 contra `8ae02b23` sem tocar a árvore (`git grep`/`git ls-tree`): 0 e 0, com controles 139/10 e 2/5. (verificado)
6. **A não-promoção do F1 a `bloqueia_deploy` é coerente com o precedente**, não conveniência. Fui atrás do contraexemplo e ele confirmou o autor. (verificado)
7. **F4 e F5 confirmados por instrumentos independentes** (varredura própria em `node`; parser de trailer do git). (verificado)
8. **Conformidade estrutural que o gate não cobre, medida por mim:** 5/5 itens com `owner` não-vazio, 5/5 com `due` não-vazio, 5/5 com `due_is_proposal: true`. Zero `barrier_kind: nenhuma_conhecida` na triagem. `barriers_searched` tem 1271 caracteres e **não é prosa vazia** — nomeia comandos e resultados numéricos reproduzíveis (`grep -rn "invariantes\|fanin" scripts/*.mjs` → 0; `grep -n agent_authored_ratio scripts/bancada-gate.mjs` → 2 linhas; `getFactory()` em integração → 2 arquivos). Reconferi três desses e batem. **A resposta à pergunta do briefing é: `barriers_searched` foi reemitido depois de procurar de verdade.** O que ele tem não é preguiça — é um **escopo de busca** que deixou passar N3. (verificado)

---

## 7. A mutação que passa no gate e mente — teto do contrato `triagem/1.0`

**Protocolo:** `cp docs/audit/TRIAGEM-AV-R7.json <scratchpad>/TRIAGEM-AV-R7.json.bak` (backup **fora** do repo, para não sujar `--porcelain`) → mutar → `git diff --numstat` → rodar o gate → restaurar do `.bak` → `numstat` vazio → `porcelain` vazio. Sem `git checkout`.

**A mutação (8 linhas, `git diff --numstat` = `8 8`):** rebaixar o item de rank 5 para aceite.

```js
it.gate            = 'aceito_com_registro';
it.accepted_reason = 'O dono avaliou em reuniao e aceitou: fan-in e criterio de medicao e nao afeta produto.';
it.accepted_by     = 'Desenvolvedor Luminaris';
it.review_trigger  = 'Reabrir no dia em que docs/audit/AV-R2.json for reemitido usando a coluna fanin para ranquear.';
it.owner = null; it.due = null;
j.gates_summary.bloqueia_primeiro_cliente = 4;
j.gates_summary.aceito_com_registro       = 1;
j.self_check.items_without_owner          = 0;
```

**Resultado medido:** `node scripts/bancada-gate.mjs` → **exit 0**, mesmos 22 avisos de antes, nenhum erro. Restaurado; `git diff --numstat` vazio; `git status --porcelain` vazio; gate verde de novo.

**O que a mutação prova.** O artefato passa a afirmar que **o dono avaliou e aceitou** um achado que ele nunca viu, e que a rodada teve um aceite que ela não teve. Isso remove um item da fila de trabalho, muda o `gates_summary` publicado e inventa um ato humano — e o gate não tem um só bloco capaz de reprovar:

- **B14** exige `accepted_reason`, `accepted_by` e `review_trigger`, e do gatilho exige **apenas que ele nomeie um caminho existente**. `docs/audit/AV-R2.json` existe. Passa.
- **B15** só confere aritmética entre `self_check` e `items[]`; atualizei os contadores junto. Passa.
- **B16** só confere que `barriers_searched` e `own_bias_named` **existem e não são vazios**. Não os toquei. Passa.
- **B12** amarra o `fingerprint` ao relatório; não mexi no fingerprint. Passa.

**Conclusão sobre o teto:** o contrato `triagem/1.0` valida **forma, aritmética e proveniência de fingerprint**. Ele não sabe (a) se o portão foi derivado do mapa, (b) se o `exposure` que alimenta o mapa é sustentável, (c) se o falsificador rodou de fato, (d) se `accepted_by` corresponde a alguém que consentiu, (e) se `barriers_searched` procurou onde importava. **`accepted_by` é o campo mais perigoso do contrato: é a única afirmação sobre um ato de um humano, e é texto livre que o gate aceita sem lastro.** O aviso do cabeçalho do `bancada-gate.mjs` ("prosa vazia compra a saída em B16") está certo e é **conservador demais** — prosa *cheia e falsa* compra a saída em B14.

---

## 8. Achados novos (NÃO corrigidos)

### N1 — A enumeração "7 ocorrências" é 9, e uma delas não é comentário
Dano estimado 2 · a triagem reafirmou o número como "verificada também a parte substantiva".
Falsificador de uma linha (cuidado com a armadilha 1 — **sem barra inicial**):
```sh
git grep -o "api/accounting" 8ae02b23 -- 'server/src/**/*.test.ts' | wc -l   # 9, nao 7
```
Controle: `git grep -o "api/users" …` → 51; `git grep -o "api/naoexiste" …` → 0.
A nona é `server/src/__tests__/route-spec-wiring.test.ts:36`, assertiva viva sobre rota de contabilidade. O veredito do F2 não muda; a *exaustividade* declarada, sim.

### N2 — SEGUNDO falsificador da AV-R7 cujo controle não é alcançável: o F4
Mecanismo **diferente** do F3 (lá o controle existe e a cadeia quebra antes; aqui o controle **não está em comando nenhum**), consequência idêntica: o §6b não é demonstrável a partir do artefato. Agravante: o F4 tem dano 1, então **B6 não exige `demonstration`**, e ele não tem — não há comando de reserva onde o controle pudesse morar.
Falsificador de uma linha:
```sh
node -e "const r=require('./docs/audit/AV-R7-FORCA-DA-SUITE-SUBFILA.json');const f=r.findings.find(x=>x.id==='F4');console.log('controle no expected:',/PostingService/.test(f.falsifier_static_expected),'| no comando:',/PostingService/.test(f.falsifier_static),'| tem demonstration:',!!f.demonstration)"
# true | false | false
```
Controle discriminante: o mesmo teste no F2 (`/api/users`) devolve `true | true`.

### N3 — As barreiras dos ranks 3 e 4 já estavam escritas quando a triagem foi mergeada
O achado mais caro da revisão. `barrier_note` do rank 4 diz *"PROPOSTA, e o MOLDE EXISTE… Nenhum dos 6 PRs abertos toca os três repositórios nem acrescenta teste de integração de contabilidade"*; o rank 3 diz o equivalente. **Medido:**

| commit | data (local) | arquivo |
|---|---|---|
| `b1464747` | 2026-08-05 21:22 | `…/__tests__/CounterpartyRepository.integration.test.ts` |
| `0a24d3f9` | 2026-08-06 12:09 | `…/__tests__/DimensionRepository.integration.test.ts` |
| `928933bc` | 2026-08-06 12:16 | `…/__tests__/ReferentialMappingRepository.integration.test.ts` |
| `8d124293` | 2026-08-06 12:35 | `src/controllers/__tests__/accountingController.integration.test.ts` |

Os quatro saem de `40892baa` — **o mesmo commit-base do relatório AV-R7** — e **nenhum é descendente de `8ae02b23`**. Vieram por PR #171, criado **2026-08-06T15:41Z**, 24 minutos depois do PR #169 (15:17Z) e **7h38 antes** de o PR #169 ser mergeado (23:19Z). Os quatro commits são **anteriores** à criação dos dois PRs.

Consequência: a triagem entrou em `main` abrindo dois itens `bloqueia_primeiro_cliente` com `due` 2026-08-24 e 2026-08-31 que, no momento do merge, já tinham PR aberto resolvendo-os. Ninguém pegou.

Falsificador de uma linha:
```sh
git merge-base --is-ancestor 8ae02b23 928933bc && echo "posterior" || echo "PARALELO — a barreira ja existia"
```
Controle: `git merge-base 8ae02b23 928933bc` → `40892baa` (mesmo base do relatório).

**Onde a metodologia falhou:** `barriers_searched` declara o próprio limite como *"revisões que vivam só na interface do provedor sem virar PR não foram alcançadas"*. O limite real é mais largo: **branch com commits, ainda sem PR, forkado do mesmo base**. Um `git log --all --oneline --since=...` ou `git branch -a --contains 40892baa` teria mostrado.

### N4 — 11 merges carregam o trailer; o F5 afirma que nenhum carrega
`findings[F5].measured` diz *"inclui 219 merges, que nunca carregam trailer"*. Medido pelo parser de trailer do git: 225 merges, **11 com** `Co-authored-by: …claude`. A diferença 443−432 sai do comando do próprio autor.
```sh
node -e "const {execFileSync}=require('child_process');const L=execFileSync('git',['log','--format=%P|%(trailers:key=Co-authored-by,valueonly)'],{encoding:'utf8',maxBuffer:1<<28}).split('\n').filter(Boolean);const m=L.filter(l=>l.split('|')[0].trim().split(/\s+/).length>1);console.log('merges:',m.length,'| com trailer:',m.filter(l=>/claude/i.test(l)).length)"
# merges: 225 | com trailer: 11
```
Não muda a direção do F5 (os dois ramos continuam em lados opostos de 0,70). Muda a frase que sustenta *por que* os denominadores divergem.

### N5 — O `exposure` do rank 5 contradiz o critério de `apenas_teorico` que o próprio autor fixou na TRIAGEM-AV-R6
Na AV-R6, o único item que não foi `ja_exposto` recebeu esta definição de critério, escrita pelo mesmo autor: *"`apenas_teorico` aqui NÃO quer dizer 'não é defeito': quer dizer que nenhum caminho de dano foi MEDIDO"* — e o aceite só foi legítimo por ter gatilho observável.
Aplicando esse critério ao rank 5 da AV-R7, com as palavras do próprio artefato: `cost_per_change` = *"nenhuma mudança de código — é critério de medição"*; `why_rank_5` = *"ele só morde quando alguém usar fan-in para ranquear, **e nesta rodada ninguém usou**"*. Isso é caminho de dano medido como **ausente** + gatilho nomeado — a definição literal de `apenas_teorico`. Rotulado `ja_exposto`.
```sh
node -e "const t=require('./docs/audit/TRIAGEM-AV-R7.json'),i=t.items.find(x=>x.rank===5);console.log(i.exposure, /nesta rodada ninguem usou/i.test(i.why_rank_5))"
# ja_exposto true
```
Controle discriminante: o mesmo teste no rank 4 (F1) → `ja_exposto false` (nenhum "ninguém usou"; o dano é presente). O rótulo do rank 4 é sustentável; o do rank 5 não é.
**Consequência:** um único rótulo corrigido faz `gates_summary` virar 0/4/1 e a distribuição "5 de 5, zero aceites" deixa de existir. Caso mais fraco, mesma direção, no F5 do relatório: o `adversarial_checks` dele conclui *"o risco é PROSPECTIVO"* e o `exposure` diz `ja_exposto`.

### N6 — A triagem sobrescreveu dois `barrier_kind` sem declará-los como override
F3 `nenhuma_conhecida` → `teste_de_fronteira`; F5 `alerta` → `teste_de_fronteira`. Justificados no `barrier_note`, mas ausentes da manchete que inventaria as sobrescritas (`three_suggested_gates_overridden`, `deviations[0].mitigation`). O gate não compara os dois artefatos — B7 valida o enum do relatório e nunca o confronta com a triagem.
```sh
node -e "const r=require('./docs/audit/AV-R7-FORCA-DA-SUITE-SUBFILA.json'),t=require('./docs/audit/TRIAGEM-AV-R7.json');const R=Object.fromEntries(r.findings.map(f=>[f.id,f.barrier_kind]));console.log(t.items.filter(i=>R[i.source_finding_id]!==i.barrier_kind).map(i=>i.source_finding_id+': '+R[i.source_finding_id]+'->'+i.barrier_kind))"
# [ 'F5: alerta->teste_de_fronteira', 'F3: nenhuma_conhecida->teste_de_fronteira' ]
```

---

### Julgamento do briefing (e): os "dois controles falsificáveis por fora" cortam a cadeia de 5 decisões?

**Não.** (inferido, com base nas medições acima)

- **Controle 1 — "a derivação de portão sobrescreveu três sugestões minhas".** Ele restringe apenas a **última** das cinco decisões, e o restringe por uma função cujo **único input relevante** (`exposure`) foi escolhido pelo mesmo autor, na decisão (d). Um controle que se aplica depois do ponto onde o resultado já foi determinado não é corte. A prova disso é N5: mudar um rótulo — decisão anterior ao mapa — muda o `gates_summary` inteiro sem que o mapa reclame.
- **Controle 2 — "a execução a partir do JSON relido pegou um defeito que eu não sabia existir".** É real e vale, mas o que ele audita é **fidelidade de string**: "a string que eu guardei é a string que roda?". Ele não pode pegar N1 (contagem errada), N3 (escopo de busca), N4 (premissa falsa) nem N5 (rótulo). E não pegou N2, que é do mesmo tipo de defeito que ele foi construído para pegar.
- **O que nenhum dos dois toca:** (a) a subfila virar fila própria, (b) o recorte de 4 unidades, (c) os 7 sítios de mutação. Três das cinco decisões seguem sem qualquer contraponto.
- **A evidência objetiva de que a cadeia não foi cortada é N3:** a triagem construiu sua fotografia do repositório a partir de `origin/main` + PRs abertos, e o resultado é uma fila de 5 itens bloqueantes cujos dois de maior dano já estavam sendo fechados em paralelo. Uma revisão independente naquele momento teria olhado `git branch -a --contains 40892baa` antes de escrever "não existe".

**O `own_bias_named` do autor está correto no diagnóstico e otimista na mitigação.** Os quatro vieses que ele nomeia são os certos. O que ele chama de "prova objetiva no lugar de revisão" é um controle a mais, não um substituto — e esta passagem mede quanto: 1 defeito para ele, 6 para uma sessão separada, sobre o mesmo material, em menos de uma hora.

---

## 9. O que ficou FORA

- **A campanha de mutação (7 mutações) e a sonda de alcance NÃO foram reexecutadas.** A triagem já as declara em `not_executed[0]` com custo (~40 min + ~10 min) e com a justificativa medida (`server/src` fora do diff `40892baa..60c945bc`). Confirmo a justificativa, não a medição: **tudo o que esta revisão diz sobre "sobreviveu sem ser executada" é HERDADO**, não remedido. (assumido)
- **`npx jest --selectProjects unit` não foi rodado.** Nenhuma alegação desta revisão depende do estado da suíte, e eu não alterei código. Consequência declarada: **não afirmo que as quatro barreiras de N3 são verdes** — só que existem e que fazem os falsificadores de F1 e F2 deixarem de reproduzir.
- **Não medi se o branch de N3 estava em `origin` no instante em que `barriers_searched` foi escrito.** Isso não é recuperável deste worktree. O que está medido são as datas de autoria dos commits e as datas de criação dos PRs. (declarado inverificável)
- **Não revisei o AV-R2, o AV-R3 nem a `bancada.html`** além do que os cinco achados exigem. `new_findings_raised[1]` afirma que a classe do `&&` "não foi medida nos outros relatórios" — **continua não medida**; eu varri só a AV-R7.
- **Não avaliei se os `due` (12/24/31 de agosto) são razoáveis.** São `due_is_proposal: true` nos cinco; a ratificação é do dono.

---

## 10. Meus próprios vieses, nomeados

1. **Fui contratado para refutar, e isso enviesa para achar.** Dos 6 achados novos, **N1, N2, N4 e N6 não mudam nenhum veredito** — são defeitos de artefato. Marquei isso em cada um em vez de deixar a contagem "6 achados" sugerir gravidade. Os que de fato mordem são N3 (custo operacional real) e N5 (muda o `gates_summary` publicado).
2. **Achei mais fácil atacar o instrumento do que os fatos.** Reexecutei os cinco falsificadores e **os cinco confirmaram** no commit do PR. Nenhum achado de código caiu. É o mesmo "5 de 5 confirmados" que critiquei no autor, agora produzido por mim — com a diferença de que eu usei ferramentas diferentes das dele em 4 dos 5 (`git grep`/`git ls-tree`, parser de `schema.prisma` em `node`, varredura de imports em `node`, `%(trailers)` do git), o que é o único motivo pelo qual meu "confirmado" vale mais do que o dele. Se alguém achar que não vale, o comando está em cada item da seção 3.
3. **N5 é o achado onde eu mais posso estar errado**, e o declaro: `ja_exposto` para o F4 é *defensável* se lido como "o rótulo errado está no artefato hoje" — a AV-R6 usou exatamente esse raciocínio para o seu F3 (0.941 com ponto). Meu argumento se apoia no `why_rank_5` do próprio autor, não numa definição externa. É o item onde o dono deve discordar de **mim**, se for discordar de alguém.
4. **Caí na armadilha 1 durante o trabalho** (`git grep "/api/..."` → 0) e só não assinei um falso positivo porque rodei a busca nas duas formas. Registrado na seção 3 em vez de apagado. Meu controle de mim mesmo é do mesmo tipo do que critiquei: melhor do que nada, pior do que outro par de olhos.
5. **Não sou revisão independente do PR #171**, que é o que fechou N3. Estou julgando a triagem com informação que a triagem não tinha no instante em que foi escrita — e isso é injusto para o autor **como censura** e justo **como medição do método**. Escrevi N3 como defeito de *escopo de busca*, não como mentira.
6. **A mutação da seção 7 é minha e escolhi a mais escandalosa** (`accepted_by` inventado). Uma mutação mais discreta — trocar um `verification_note` inteiro por ficção — também passa e é mais provável na prática. Escolhi a escandalosa porque ela nomeia o campo mais perigoso do contrato; a discreta é a que vai acontecer.
