# BRIEF — GAP-MAP em fragmentos: um arquivo por achado, índice gerado

> Objetivo: PR que trata de um achado escreve só no fragmento dele. A tabela do GAP-MAP deixa de ser texto
> guardado e passa a ser gerada. Sai o conflito de merge entre PRs de achados diferentes.
>
> É o "BRIEF de execução" que a `D-2026-11-10-BRANCH-DE-INTEGRACAO-E-GAP-MAP-POR-FEATURE` (PR #1183) pede na
> sua Sequência, item 3.
>
> **Estado deste BRIEF (2026-11-10):** os 13 forks estão ratificados pelo dono em questionário; nenhum
> pendente. **A execução não está autorizada**: falta o "executa", e há duas pré-condições (seção
> "Pré-condições").

## Contexto fixo

- **Item:** trocar as tabelas de lacuna do `docs/operating-manual/GAP-MAP.md` por fragmentos em
  `docs/gap-map/<ID>.md`, com o índice gerado por `scripts/gap-map.mjs`. Não é nó do vault; é item de processo.
- **Autorização:**
  - dono, chat, 2026-11-10: "Sim, abre o BRIEF", em resposta a "Abro o BRIEF de 'um arquivo por lacuna, tabela
    gerada'?";
  - `D-2026-11-10-BRANCH-DE-INTEGRACAO-E-GAP-MAP-POR-FEATURE`, Sequência 3: "BRIEF de execução
    (`sessao-planejamento`, autorizado por esta decisão)". Lida no PR #1183, commit `190818287`. **O #1183 não
    está na `main`** (título: "não mergear sem o dono").
  - As duas cobrem este documento, nada além.
- **Estado medido (2026-11-10, `origin/main` = `094b0bec7`):**
  - `GAP-MAP.md`: 504 linhas de arquivo; **237 linhas de lacuna** em 9 tabelas de cabeçalho `| Lacuna |`
    (Nível 1: 28 · Nível 2: 19 · Nível 3: 66 · Nível 4: 23 · Nível 5: 42 · Nível O: 6 · Transversais: 4 ·
    faixa 1: 46 · faixa 1 dia 2: 3). Cada lacuna é uma linha só de texto, de 500 a 4.600 caracteres.
  - **9 das 237 linhas têm número de colunas diferente do cabeçalho** (`|` sem escape dentro da célula), 7
    delas fora da faixa 1: a tabela já está quebrada nelas, e separar por `|` não as migra.
  - **A coluna Status não é um enum limpo.** Primeira etiqueta, nas 228 linhas legíveis: `CORRIGIDO` 110 ·
    `ABERTO` 34 · `EM PR` 33 (faixa 1) · `PARCIAL` 15 · `FECHADO` 14 · `COBERTO` 9 · `INSTRUMENTADO` 2 ·
    `ORÁCULO` 2 · `PAPEL`, `SUSPENSO`, `EXAMINADO`, `FECHADO POR INSPEÇÃO` 1 cada · 5 sem etiqueta em colchete
    (linhas 90, 104, 150 e 229 começam por "**FECHADO <data>**"; a 129, por "aberto —"). Em 144 linhas a célula
    traz texto depois do colchete (mediana de 123 caracteres, máximo de 2.321).
  - **Dois tipos de linha convivem na mesma tabela.** Fora da faixa 1, das 181 linhas legíveis: 155 começam por
    título em negrito (um defeito com ciclo de vida) e 26 não (célula do mapa lacuna × instrumento, como "Rede
    degradada" ou "Borda de entrada").
  - 83 dos 671 commits da `main` desde 10/10 tocaram o arquivo; 59 desses 83 mexeram em exatamente uma linha de
    tabela (148 linhas novas, 85 edições de linha existente).
  - 10/11: depois de 12 merges, 12 dos 37 PRs abertos conflitavam só no `GAP-MAP.md`
    (`docs/estruturas-implicitas/CORRECOES.md:135`, medido lá com `git merge-tree`; não refeito aqui).
- **Insumos (lidos):**
  - A decisão do #1183, Regra 1 (branch de integração) e Regra 2 (fragmentos, máquina de estados, índice
    gerado e não versionado, `CORRECOES.md` no mesmo caminho, migração só depois de a faixa 1 fechar).
  - `scripts/plano-vault.mjs` (218 linhas): molde. Frontmatter de uma chave por linha com valor JSON
    (`parseNote`), `walk`, `index [--stdout]`, `check`, `fold`. Teste em `scripts/plano-vault.test.mjs`
    (`node --test`).
  - `scripts/regen-generated.sh` e `scripts/git-hooks/plano-index.sh`: hooks que geram o `_INDEX` na máquina;
    `.gitignore:32-34` tira o gerado do git.
  - `scripts/classe-risco.mjs`: `.claude/**`, `CLAUDE.md`, `.github/**` e `docs/plano/decisoes/**` são
    vermelhos; vermelho só de `.md` vai ao lote sem revisor (linhas 137–139). Lista lida até a linha 62.
  - `docs/plano/decisoes/D-2026-11-10-FAIXA1-MERGE-LIVRE.md`, com a emenda "GAP-MAP fora dos PRs".
  - `.github/workflows/ci.yml:439-440`: passo "Plano vault íntegro" (`node scripts/plano-vault.mjs check`).
  - `gh extension list`: `github/gh-stack` v0.3.0 instalado nesta máquina.
- **Nós vizinhos (quem lê ou escreve a linha do GAP-MAP hoje):**
  - `.claude/skills/sessao-instrumentacao/SKILL.md`: linhas 27, 33–39, 83, 118 (passo 4: atualizar a linha).
  - `.claude/skills/sessao-correcao/SKILL.md`: linhas 26, 39–40, 48–53, 83–84.
  - `.claude/skills/sessao-planejamento/SKILL.md:23`.
  - `.claude/agents/revisor-independente.md:51,54,89` (achado pré-existente vira linha `[ABERTO]` proposta).
  - `CLAUDE.md:150` ("Um PR por item do GAP-MAP") e `docs/README.md:34`.
  - Citações que **não** dependem da tabela existir: 82 arquivos em `server/`, 28 em `my-app/`, 55 em
    `docs/accounting/`, 45 em `docs/plano/`. Citam por nível e título ou pelo número da seção "Fila corrigida"
    ("GAP-MAP 7": 35 vezes; "GAP-MAP 8": 34).

## Pré-condições da execução

- **P-1** O #1183 mergeado. A regra da branch de integração e a própria Regra 2 só existem nele.
- **P-2** A migração (PR-1) só roda depois que a faixa 1 fechar: seção "Estruturas implícitas — faixa 1" do
  `GAP-MAP.md` sem linha `[ABERTO]` nem `[EM PR #n]` (decisão do #1183, Sequência 3; confirmado pelo dono no
  questionário). A ferramenta (PR-0) não depende disso.

## Travas conhecidas (fatos, não forks)

- **T-A** `.claude/**`, `CLAUDE.md`, `.github/**` e `docs/plano/decisoes/**` são vermelhos. Tocar
  `.claude/skills/**` pede `node .claude/skills/skill-audit/skill-audit.mjs run` com 0 findings.
- **T-B** O GitHub não roda merge driver (memória `github-ignora-merge-driver`): `merge=union` no
  `.gitattributes` não resolve, e duplicaria linha editada. Por isso a saída é dividir o arquivo.
- **T-C** Limite do desenho: dois PRs sobre **o mesmo** achado (pai e filho) continuam conflitando no
  fragmento dele. É conflito legítimo e raro.
- **T-D** O PR da migração remove as tabelas do `GAP-MAP.md`: qualquer PR aberto que toque esse arquivo
  conflita com ele.

## Checklist de comportamentos

Cada item é testável sozinho. "Teste" = caso em `scripts/gap-map.test.mjs` (`node --test`), no molde do
`plano-vault.test.mjs`, salvo indicação.

**Dado**

1. Cada lacuna é um fragmento `docs/gap-map/<ID>.md`, com frontmatter no formato do vault e corpo com quatro
   seções fixas: `## Lacuna`, `## Instrumento`, `## Estado`, `## Comando que prova`. O conteúdo de cada seção é
   markdown livre, em várias linhas. O estado mora no frontmatter (`estado`, `estado_detalhe`); a seção
   `## Estado` guarda só o texto que hoje vem depois do colchete e pode ficar vazia.
2. O nome do arquivo é o `id`: o ID que a linha já tem (`BRD-F-02.1`, `SM-F-01.2`, `VP-1b`, `IMO-2`, `L11`)
   ou, quando não tem, o slug do título em negrito. Não há contador.
3. Todo fragmento tem `tipo`:
   - `achado` (defeito com ciclo de vida) usa a máquina de estados do #1183:
     `aberto` → `instrumentado` → `corrigido` → `verificado`, mais `oraculo` e `rejeitado` (com motivo);
   - `celula` (linha do mapa lacuna × instrumento, sem defeito a corrigir) usa as cinco etiquetas da convenção:
     `COBERTO`, `PARCIAL`, `PAPEL`, `ABERTO`, `ORÁCULO`.
4. A feature ou o tema entra no campo `feature` (ex.: `"estruturas-implicitas"`), nunca no nome do arquivo.
5. A ordem na tabela é: `ordem` (inteiro, só nos migrados, para preservar a ordem de hoje) e depois
   `criado` + `id`. Fragmento novo não recebe `ordem`.

**Script `scripts/gap-map.mjs`**

6. `index` grava `docs/gap-map/_INDEX.md` (fora do git, no `.gitignore`); `index --stdout` imprime sem gravar.
   Uma tabela por nível e uma lista por `feature`, colunas `Lacuna | Instrumento | Estado | Comando que prova`,
   na ordem do item 5. Filtros `--nivel <n>`, `--estado <e>`, `--feature <f>`, `--tipo <t>`.
7. `index --prs` acrescenta a coluna "PR aberto": uma chamada a
   `gh pr list --state open --json number,files` e, para cada fragmento, os PRs cujo diff o toca.
   `[EM PR #n]` **não é estado guardado**. Sem `gh` ou sem rede, a coluna sai `?` e o comando não falha.
8. `achar <texto>` lista `id`, nível, estado e caminho dos fragmentos cujo `id` ou título contém o texto (sem
   diferenciar maiúsculas e acentos). É como uma citação antiga ("GAP-MAP Nível 3 'DPS — pAliq'") chega ao
   fragmento.
9. `transicao <ID> --para <estado> [--pr <n>] [--motivo <texto>]` grava `estado`, `prs` e `atualizado` só no
   fragmento, preservando as demais chaves e o fim de linha. Em `achado`, só aceita as transições da tabela
   em "Contratos"; `rejeitado` e a reabertura exigem `--motivo`.
10. `check` devolve exit 1 com a lista de problemas: frontmatter inválido, `id` ≠ nome do arquivo, `id`
    duplicado, chave obrigatória ausente, `nivel`, `tipo` ou `estado` fora do enum, estado que não é do `tipo`,
    seção fixa ausente, e **fragmento sem comando**: `achado` em `instrumentado`, `corrigido` ou `verificado`,
    ou `celula` em `COBERTO`, `PARCIAL` ou `PAPEL`, com "Comando que prova" vazio (regra nº 1 do GAP-MAP;
    é "o teste que reprova fragmento sem comando" da decisão do #1183). Pasta sem fragmento passa.
11. `index` com fragmento malformado sai com exit 1 e nomeia o arquivo; não gera índice parcial.
11a. `verificar <ID>` roda o campo `comando` do fragmento (uma linha de shell, na raiz do repositório), imprime
    o comando antes de rodar e compara o resultado (`passa` = exit 0; `falha` = exit ≠ 0) com o que o estado
    pede: em `instrumentado`, o contrário de `esperado`; em `corrigido`, `verificado` e em `celula`, o próprio
    `esperado`. Divergência dá exit 1 e não grava nada. Com `--gravar`, um `achado` em `corrigido` cujo
    resultado bate passa a `verificado`. **É o único caminho para `verificado`.** Roda um fragmento por vez;
    nunca é chamado pelo `index`, pelo `check` nem pelo CI. Fragmento sem `comando` dá exit 1 com a mensagem
    "sem comando executável" (F-GM-13).

**Migração (uma vez; pré-condição P-2)**

12. Antes de migrar, um commit separado corrige no próprio `GAP-MAP.md` as linhas que não se deixam ler: as de
    número de colunas diferente do cabeçalho (escape do `|`) e as sem etiqueta em colchete. O antes e o depois
    ficam visíveis no diff.
13. `migrar` cria um fragmento por linha, copiando cada célula para a seção correspondente sem alterar o texto.
    `tipo` sai do título (em negrito → `achado`; sem negrito → `celula`). A primeira etiqueta da célula Status
    passa pela tabela de troca abaixo; o que vem depois dela dentro do colchete vai para `estado_detalhe`; o
    resto da célula vai para a seção `## Estado`. Nas tabelas da faixa 1, as colunas "Nível" e "D" vão para
    `nivel` e `d`, e `feature` recebe `"estruturas-implicitas"`.

    Contagem de hoje, fora da faixa 1 (181 linhas legíveis). A faixa 1 é contada no dia da migração.

    | Linha hoje | Linhas | Fragmento |
    |---|---|---|
    | sem negrito, `COBERTO`/`PARCIAL`/`PAPEL`/`ABERTO`/`ORÁCULO` | 23 | `celula`, a mesma etiqueta |
    | sem negrito, `SUSPENSO` (linha 195) | 1 | `celula`, `ABERTO`, detalhe "suspenso pela regra ⛔" (dono, linha a linha) |
    | negrito, `CORRIGIDO` (98) ou `FECHADO` (18) | 116 | `achado`, `corrigido`, com data e PR no detalhe |
    | negrito, `ABERTO` | 26 | `achado`, `aberto` |
    | negrito, `INSTRUMENTADO` (linha 183) | 1 | `achado`, `instrumentado` |
    | negrito, `EXAMINADO` (linha 109) | 1 | `achado`, `rejeitado`, motivo "inócuo; sem ação" (dono: descartado) |
    | **a decidir uma a uma** | 13 | pergunta ao dono no PR da migração |

    As 13 a decidir: 8 em negrito com `COBERTO` e 2 com `PARCIAL` (achado com etiqueta de célula); a linha 59
    (`INSTRUMENTADO/COBERTO`; o dono respondeu "COBERTO" quando só havia etiquetas); as linhas 24 (`CORRIGIDO`)
    e 231 (`FECHADO POR INSPEÇÃO`), que são achados sem título em negrito.
14. `migrar` **não adivinha**: linha que não fecha com o cabeçalho, etiqueta fora da tabela de troca, linha
    `[EM PR #n]` (P-2 não cumprida) ou caso da lista "a decidir" sem resposta registrada faz o comando parar e
    listar. A migração **nunca grava `verificado`** nem preenche `comando`: `verificado` só nasce de comando rodado
    (item 11a), e o fragmento migrado guarda o comando em prosa na seção, como está hoje.
15. Oráculo da migração (teste, contra o `GAP-MAP.md` depois do commit do item 12): para cada uma das 9
    tabelas, o índice gerado com o filtro correspondente tem as mesmas linhas, na mesma ordem e com as mesmas
    células do original, comparadas com espaço normalizado. A célula Status é comparada depois de aplicar a
    tabela de troca à etiqueta do original. Diferença em qualquer célula reprova.
16. Depois da migração o `GAP-MAP.md` **continua versionado, só com a prosa** (F-GM-12): o glossário (níveis,
    convenção das etiquetas, a máquina de estados, regra nº 1) e as seções "Backtest", "Predição", "Fila
    corrigida" e "Uso em projeto em andamento", como estão. Cada tabela migrada vira um parágrafo que aponta
    `docs/gap-map/` e o comando que gera o índice (`docs/gap-map/_INDEX.md`, fora do git). O texto passa a
    dizer: "onde uma regra citar 'a linha do GAP-MAP', leia 'o fragmento do achado'".
17. Nenhuma citação em `server/`, `my-app/` ou `docs/` é reescrita. A seção "Fila corrigida" não muda, então
    "GAP-MAP 7", "GAP-MAP 8" e as demais continuam resolvendo.
18. **`CORRECOES.md`** (decisão do #1183, Regra 2 item 5): cada achado de estruturas implícitas vira fragmento,
    com o identificador `F-nn.m` preservado. **Trecho pausado**: ver "Insumos ausentes".

**Geração na máquina**

19. `scripts/git-hooks/plano-index.sh` passa a gerar também `docs/gap-map/_INDEX.md`, com as mesmas guardas de
    hoje (só onde o gerado é ignorado; nunca reprova a operação do git). `scripts/regen-generated.sh` chama
    `gap-map.mjs index` junto do índice do plano.

**Regra das sessões (texto)**

20. `sessao-instrumentacao`: "a linha exata do GAP-MAP" vira "o fragmento do achado". A linha 27 vira: não há
    fragmento com `autorizacao` preenchida → nenhuma sessão. **O fragmento pode nascer no próprio PR de
    instrumentação**, com `autorizacao` citando a decisão do dono. O passo 4 vira: registrar o teste nas seções
    Instrumento e Comando que prova e rodar `transicao <ID> --para instrumentado`. O comando-guarda isolado
    mora na seção "Comando que prova".
21. `sessao-correcao`: os campos do formulário apontam o fragmento; depois do teste verde, o PR roda
    `transicao <ID> --para corrigido --pr <n>`. Essa edição entra na lista do que a sessão pode tocar fora da
    localização, ao lado do fold da nota do nó.
22. `revisor-independente`: achado pré-existente passa a trazer o **fragmento proposto** (frontmatter + quatro
    seções, `estado: "aberto"`, `autorizacao` vazia) no bloco do relatório, no lugar da linha `[ABERTO]`.
23. `sessao-planejamento:23`, `CLAUDE.md:150` e `docs/README.md:34` passam a citar o fragmento e o script.
24. `skill-audit` roda com 0 findings no PR que toca `.claude/skills/**` (T-A).

**Gate e registro**

25. O passo "Plano vault íntegro" do `ci.yml` passa a rodar também `node scripts/gap-map.mjs check`. O
    `CLAUDE.md` §⛔ ganha a exceção, no formato das anteriores: "Idem (dono, 2026-11-10, F-GM-4 de
    `GAP-MAP-POR-LACUNA-brief.md`): o `check` dos fragmentos do GAP-MAP, no passo do CI que já roda o do vault."
26. Os forks ratificados deste BRIEF ficam registrados numa cédula em `docs/plano/decisoes/`, com a citação de
    cada resposta, ligada à decisão do #1183.

**Como entra (branch de integração — Regra 1 do #1183; depende de P-1)**

Os PRs têm base em `integration/gap-map`. A `main` recebe um PR só, no fechamento.

| PR | Itens | Quando |
|---|---|---|
| PR-0 — ferramenta | 1–11a, 19 (script, teste, `.gitignore`, hook; nenhum fragmento) | assim que houver "executa" e P-1 |
| PR-1 — migração | 12–17, 26 (só `.md`) | depois de P-2 |
| PR-2 — regra | 20–25 (sessões, revisor, `CLAUDE.md`, `docs/README.md`, passo do CI) | junto do PR-1 |
| PR-3 — `CORRECOES.md` | 18 | depois do insumo ausente levantado |
| Fechamento | `integration/gap-map` → `main` | classe sai de `classe-risco.mjs pr <n>`; toca `.claude/**`, `CLAUDE.md` e `ci.yml`: vermelho, lote do dono |

Como a `main` recebe migração e regra das sessões no mesmo PR, não há intervalo em que as sessões citem uma
linha que não existe mais.

## Contratos

**Fragmento** (frontmatter: uma chave por linha, valor JSON; lido pelo `parseNote` do vault)

```
---
id: "BRD-F-02.1"
tipo: "achado"
titulo: "…"
nivel: "3"
feature: "estruturas-implicitas"
estado: "instrumentado"
estado_detalhe: ""
d: "D2"
prs: ["#1234"]
autorizacao: "dono, chat, 2026-11-10: \"…\""
origem: "INVENTARIO-BRD.md, ficha BRD-02"
criado: "2026-11-10"
atualizado: "2026-11-12"
ordem: 212
---
## Lacuna
…
## Instrumento
…
## Estado
…
## Comando que prova
…
```

Os valores acima são exemplo de forma.

| Chave | Tipo | Obrigatória | Regra |
|---|---|---|---|
| `id` | string | sim | igual ao nome do arquivo (item 2) |
| `tipo` | `"achado"` \| `"celula"` | sim | item 3 |
| `titulo` | string | sim | uma linha; é o que `achar` procura |
| `nivel` | `"1"`…`"5"` \| `"O"` \| `"T"` | sim | `T` = Transversais |
| `estado` | achado: `aberto` \| `instrumentado` \| `corrigido` \| `verificado` \| `oraculo` \| `rejeitado` · celula: `COBERTO` \| `PARCIAL` \| `PAPEL` \| `ABERTO` \| `ORÁCULO` | sim | "em PR" nunca é guardado (item 7) |
| `estado_detalhe` | string | não | data, PR ou motivo; obrigatório em `rejeitado` |
| `criado`, `atualizado` | `AAAA-MM-DD` | sim | data de calendário válida |
| `prs` | string[] | não | `"#n"` |
| `autorizacao` | string | não | vazio = registrado, não roteia (ORCH-006), como no vault |
| `feature`, `d`, `origem` | string | não | tema, dano (D2/D3), de onde veio |
| `comando` | string | não | uma linha de shell, com escopo (nunca a suíte inteira); é o que `verificar` roda |
| `esperado` | `"passa"` \| `"falha"` | não | resultado do `comando` **com a lacuna fechada**; ausente = `"passa"` |
| `ordem` | inteiro | não | só migrados |

**Transições aceitas por `transicao` em `achado`**

| De | Para | Exige |
|---|---|---|
| `aberto` | `instrumentado` | "Comando que prova" preenchido |
| `instrumentado` | `corrigido` | `--pr` |
| `aberto` | `corrigido` | `--pr` e comando preenchido (nível leve do OPS-006: teste e fix no mesmo PR) |
| `corrigido` | `verificado` | só por `verificar <ID> --gravar` (item 11a); `transicao` recusa |
| `aberto`, `instrumentado` | `rejeitado` | `--motivo` |
| `aberto` | `oraculo` | `--motivo` |
| `corrigido`, `verificado` | `aberto` (regressão) | `--motivo` |

**CLI**

| Comando | Entrada | Saída | Exit |
|---|---|---|---|
| `index [--stdout] [--nivel n] [--estado e] [--feature f] [--tipo t] [--prs]` | fragmentos | `_INDEX.md` ou stdout | 0; 1 se algum fragmento é inválido |
| `achar <texto>` | texto | `id · nível · estado · caminho`, uma por linha | 0 com ou sem resultado |
| `transicao <ID> --para e [--pr n] [--motivo t]` | id existente | fragmento regravado; imprime `<ID>: <de> → <para>` | 0; 1 se o id não existe ou a transição não é aceita |
| `check` | fragmentos | problemas, um por linha, em stderr | 0 íntegro; 1 com problema |
| `verificar <ID> [--gravar]` | fragmento com `comando` | o comando, o resultado e `bate`/`diverge` | 0 bate; 1 diverge ou não há `comando` |
| `migrar [--de <ref>]` | `GAP-MAP.md` no ref | fragmentos criados; resumo por tabela | 0; 1 nos casos do item 14 ou se o oráculo do item 15 falha |

**Índice gerado** (`_INDEX.md`): cabeçalho "GERADO — não edite", uma seção `## Nível <n>` por nível, linha
`| <Lacuna> | <Instrumento> | [<estado> <estado_detalhe>] <Estado> | <Comando que prova> |`, com `|` e
quebras de linha escapados como no `buildIndex` do vault, e ao fim uma lista por `feature`.

## Forks

### Ratificados (dono, questionário no chat, 2026-11-10)

A primeira rodada foi respondida antes de eu ler a decisão do #1183. Onde resposta e decisão divergiam, o dono
respondeu de novo na segunda rodada; a coluna "Vale" traz o resultado. F-GM-12 e F-GM-13 foram respondidos
numa terceira rodada, com o PR do BRIEF já aberto; a resposta está na coluna da segunda.

| Fork | Pergunta | 1ª rodada | 2ª rodada (conciliação com o #1183) | Vale |
|---|---|---|---|---|
| F-GM-1 | Pasta | "docs/lacunas/" | "docs/gap-map/" | `docs/gap-map/` |
| F-GM-2 | Forma do `id` | "ID existente ou slug" | — | ID existente ou slug |
| F-GM-3 | Onde nasce o fragmento novo | "No PR de instrumentação" | — | no PR de instrumentação |
| F-GM-4 | `check` no CI | "Sim, com exceção à regra ⛔" | — | sim, com a exceção |
| F-GM-5 | Faixa 1 migra quando | "Agora, emendando a decisão" | "Depois que a faixa 1 fechar" | depois (P-2) |
| F-GM-6 | Linhas encerradas viram fragmento | "Sim, migram todas" | — | todas |
| F-GM-7 | Como os PRs entram | "Três" | "Três PRs sobre integration/gap-map" | integração, um PR para a `main` |
| F-GM-8 | Etiquetas fora da convenção | "Normaliza na migração" | — | normaliza (tabela do item 13) |
| F-GM-9 | Quem grava `CORRIGIDO` nos PRs da faixa 1 já abertos | "A orquestração, em PR de docs" | — | sem objeto: com P-2 não há PR da faixa 1 aberto na migração |
| F-GM-10 | Estados | (não perguntado) | "Máquina para achados, etiquetas para células" | item 3 |
| F-GM-12 | O que é o `GAP-MAP.md` depois | (não perguntado) | "Versionado, só com a prosa" | item 16 |
| F-GM-13 | O script roda o comando | (não perguntado) | "Também roda, um por vez" | item 11a |
| F-GM-11 | Três linhas, uma a uma | linha 59 "COBERTO" · linha 109 "Etiqueta nova DESCARTADO" · linha 195 "ABERTO, com 'suspenso' no detalhe" | — | 109 → `rejeitado`; 195 → célula `ABERTO`; 59 volta à lista "a decidir" (é achado, e `COBERTO` é etiqueta de célula) |

### Pendentes

Nenhum. O `esperado` com padrão `"passa"` e a inversão em `instrumentado` (item 11a) são detalhe do contrato
dentro da resposta do F-GM-13, não decisão nova: o dono ratificou os campos `comando` e `esperado` e o comando
`verificar`.

## Pendente de validação externa

Nenhuma. O item não carrega regra contábil, fiscal ou legal.

## Insumos ausentes

- **Formato do `CORRECOES.md`** (item 18). Li só as linhas 125–203: o registro da orquestração e o começo da
  tabela de desfechos. Não levantei quantas tabelas e achados o arquivo tem, nem como as faixas 2 a 4 se
  relacionam com as linhas do GAP-MAP. O trecho fica pausado até esse levantamento; não varri o arquivo.
- **Passo de CI dos testes de script.** `grep 'node --test'` em `.github/workflows/ci.yml` e no `package.json`
  da raiz não acha nada: não localizei onde `scripts/*.test.mjs` roda no CI. O implementador confirma antes de
  contar com o teste do item 15 como proteção contínua.
- **`classe-risco.mjs` além da linha 62.** A classe de `scripts/**` e de `docs/gap-map/**` sai de
  `node scripts/classe-risco.mjs pr <n>` no PR, não desta leitura.
- **Etiqueta das 9 linhas com colunas quebradas.** Não entraram na contagem; são lidas depois do item 12.
- **`gh stack` com 3 camadas e o PR `integration/*` → `main`.** A decisão do #1183 registra que nenhum dos dois
  foi testado no piloto.

## Achados fora de escopo

- Este BRIEF foi aberto sem que a sessão soubesse do #1183, aberto no mesmo dia. A decisão não está na `main`,
  então `grep` em `docs/plano/decisoes/` não a mostra; apareceu na busca de PRs abertos pelo título.
- A seção "Fila corrigida" do `GAP-MAP.md` tem dois itens numerados `16.` (GOV-CONTADOR e I1b).
- A lista numerada da "Fila corrigida" também é ponto comum de escrita. Teve 1 commit em 30 dias; não entra.
