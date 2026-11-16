---
id: "D-2026-11-10-BRANCH-DE-INTEGRACAO-E-GAP-MAP-POR-FEATURE"
tipo: "decisao"
dominio: "processo"
titulo: "Branch de integração por feature/tema (merge na main uma vez, quando a feature fecha) e GAP-MAP em fragmentos, um arquivo por achado, com a lacuna como máquina de estados"
estado: "decided"
autorizacao: "dono, chat, 2026-11-10: \"Adota essa estratégia em todo o sistema assim como vamos separar o gap-map em uma máquina de estados, assim cada feature tem seu próprio gap-map e não ficam vários mexendo no mesmo arquivo toda hora\""
atualizado: "2026-11-10"
---
# D-2026-11-10-BRANCH-DE-INTEGRACAO-E-GAP-MAP-POR-FEATURE

**Estado:** `decided`. **Emenda** a seção "Pilhas e tamanho de PR" do CLAUDE.md (dono, 08/11): troca a unidade de merge
na `main` de "um PR por item" para "uma branch de integração por feature". Não cria gate, rodada nem revisor
(regra ⛔ do CLAUDE.md).

## Por que

Medido em 10/11 no lote "Estruturas implícitas, faixa 1" (orquestração + 5 filhas + 1 neta, 40 PRs ou mais, todos com
base no branch do #1153):

- os 5 temas editam o mesmo `GAP-MAP.md` e o mesmo `docs/estruturas-implicitas/CORRECOES.md`; cada PR conflita com o
  vizinho (#1170 × #1145) e, quando o #1153 entrar, cada filho precisa de `rebase --onto` + troca de base + nova CI, um a um;
- cada PR é um commit, um push e uma fila no lote do dono; a autorização repetida de commit/push é o sintoma, não a causa.

## Regra 1 — branch de integração

1. **Feature/tema** = conjunto de 2 ou mais PRs que dependem entre si ou editam arquivos em comum (um nó do plano com
   PR-0..PR-n, uma faixa de correções, um incremento com emenda). Cada um ganha **uma** branch `integration/<slug>`,
   criada a partir da `main` por quem abre o primeiro PR do tema.
2. **Os PRs do tema formam uma pilha nativa do GitHub cuja base (trunk) é `integration/<slug>`**, criada com
   `gh stack init --base integration/<slug>` e enviada com `gh stack submit`. **Dentro da integração a pilha é livre**:
   a regra de profundidade 2 de 08/11 passa a valer só entre `main` e a integração, e um PR pode ficar sobre outro PR do
   mesmo tema. Nunca se aponta um PR do tema direto para a `main`. Só 2 camadas foram testadas (piloto abaixo) e a
   documentação do GitHub não informa profundidade máxima: pilha acima de 4 camadas é reportada no lote, para medir.
3. **Merge em `integration/<slug>`** com `gh stack merge <PR> --yes --squash` (merge atômico do PR escolhido e de tudo
   que está abaixo dele): a sessão que coordena o tema mergeia com CI verde, sem conflito e fora de draft, sem passar
   pelo lote do dono. A `main` não é tocada. Os PRs acima do mergeado são rebaseados pelo GitHub; **não se faz
   `rebase --onto` manual**. Se a pilha perder o histórico linear, `gh stack rebase` + `gh stack push`.
4. **Revisor independente** continua rodando por PR vermelho de código, como em `D-2026-11-06-REVISAO-CONVERGENCIA`,
   **antes** do merge na integração (o diff é pequeno e a rodada é barata).
5. **Fechamento:** quando o tema fecha, abre-se **um** PR `integration/<slug>` → `main`. Ele entra pela
   `classe-risco.mjs` (verde: maestro mergeia; vermelho: lote diário do dono, com o resumo dos PRs que ele contém).
   A integração atualiza com a `main` por merge (não rebase), para não reescrever histórico que as filhas já usam.
6. **Sem irmãos, sem integração:** PR isolado de item único, sem tema, segue direto para a `main` (a regra de 08/11).
7. **Prazo:** integração parada há mais de 14 dias sem PR aberto contra ela é reportada no lote; não fica viva por inércia.
8. **Automação de permissão:** o hook `PermissionRequest` do usuário aprova `git commit` e `git push` simples de
   branch `claude/*` e `integration/*`. `--force`/`-f`/`--delete`, push para `main` e `gh pr merge` continuam com prompt.

## Regra 2 — GAP-MAP em fragmentos, um arquivo por achado

*(Revisada em 10/11, mesmo dia: o desenho inicial era um arquivo por feature. Dois PRs da mesma feature ainda colidiriam
no arquivo; o padrão de "news fragments" do towncrier — cada PR cria o seu arquivo e o índice é montado depois — não
colide nunca.)*

1. **O `GAP-MAP.md` único deixa de ser editado por PR de achado.** Ele passa a ser o **índice e o glossário** (níveis
   1–5/O, convenção `[COBERTO]/[PARCIAL]/…`, regra nº 1 "status vem de comando") e é **gerado** a partir dos fragmentos.
2. **Um arquivo por achado:** `docs/gap-map/<ID>.md` (ex.: `docs/gap-map/BRD-F-02.1.md`), com a lacuna, o nível, o estado
   e o `Comando que prova`. O PR que trata o achado cria ou altera **só** o fragmento dele; nenhum PR edita o índice.
   O `<slug>` da feature entra como campo do fragmento (`feature: estruturas-implicitas`), não como nome de arquivo.
3. **A lacuna é uma máquina de estados**, e o estado é **derivado de comando**, nunca escrito à mão:
   `aberto` → `instrumentado` (teste-guarda vermelho pelo motivo certo) → `corrigido` (teste verde) → `verificado`
   (gate de CI verde na main) · `oraculo` (só validador externo alcança) · `rejeitado` (com motivo). Cada linha leva
   a coluna `Comando que prova`; a transição é a mudança do resultado do comando.
4. **O índice é gerado:** um script (`scripts/gap-map.mjs index`) lê os fragmentos, roda ou confere o comando de cada um
   e regenera o índice por nível e por feature. O índice gerado não é versionado, como o `_INDEX.md` do vault.
5. **`CORRECOES.md`** (achados de estruturas implícitas) segue o mesmo caminho: cada achado vira um fragmento, com os
   identificadores `F-nn.m` preservados.
6. **Escritor único é transição, não regime.** Hoje (D-2026-11-10-FAIXA1-MERGE-LIVRE, #1208/#1209) o orquestrador escreve
   o GAP-MAP sozinho e os PRs de correção não o tocam; funciona, mas o commit que devolveu o arquivo à base mudou a cabeça
   de 31 PRs e exigiu uma emenda para o PASS do revisor continuar valendo. Com fragmentos isso deixa de existir.

## Sequência

1. Este PR: decisão + CLAUDE.md + hook (já feito no usuário). **Não toca** `GAP-MAP.md` nem `CORRECOES.md`.
2. **A Faixa 1 fica fora da integração.** Em 10/11 o dono liberou o merge dela direto na `main`
   (`D-2026-11-10-FAIXA1-MERGE-LIVRE`), e o orquestrador já rebaseou os PRs para a `main` (19 mergeados entre 15h e 18h UTC).
   Nada é migrado para `integration/estruturas-implicitas`; a regra de integração vale para os **próximos** temas.
3. **BRIEF de execução** (`sessao-planejamento`, autorizado por esta decisão): formato do fragmento, o script
   `gap-map.mjs`, a migração das linhas do `GAP-MAP.md` e do `CORRECOES.md` para fragmentos e o teste que reprova
   fragmento sem comando. A migração só roda **depois** que a Faixa 1 fechar (`GAP-MAP.md` sem linha `[ABERTO]`/`[EM PR]`
   na seção da faixa 1), para não reabrir conflito nos PRs em voo.

## Piloto do `gh stack` (10/11, luminaristest, branches e PRs apagados depois)

Extensão oficial `github/gh-stack` v0.3.0. `integration/piloto-stack` + pilha de 2 PRs (#1186, #1187, stack #1188):
`gh stack init --base` → `submit --auto` → `gh stack merge 1186 --yes --squash`. **Resultado:** o #1187 trocou a base para
a integração sozinho e ficou com 1 commit (o dele); o merge do #1187 deixou os dois commits em ordem na integração. Medido
no mesmo piloto: a CI (`pull_request` sem filtro) roda nos PRs com base `integration/*`; o `push` só dispara na `main`; o
repositório não tem rulesets e `delete_branch_on_merge` está `false` (825 branches remotas). **Não testado:** o PR
`integration/<slug>` → `main`, a merge queue (o repo não usa) e pilha com 3+ camadas.

## Medido no fluxo ao vivo (10/11, 15h–18h UTC)

19 PRs mergeados na `main` (cerca de 6 por hora), ~50 abertos; CI de PR com mediana de 26 min (máximo 33) e 17 checks;
**dos 19 runs de push na `main` hoje, 12 foram cancelados e 5 passaram** (o grupo `ci-${{ github.ref }}` mantém só um
pendente, e o `ci.yml` não tem `merge_group`): a `main` quase não é testada por commit. A proteção da `main` não pôde ser
lida (token sem permissão) e o estado `BEHIND` dos PRs veio `UNKNOWN`.

## Pendente (não decidido aqui)

- ~~`delete_branch_on_merge`~~ **ligado** pelo dono em 10/11 (lido `true` três vezes seguidas).
- **Merge queue na `main` (decisão do dono, configuração do GitHub)**, com `merge_group` no `ci.yml` e concorrência de
  build de 3 ou mais (CI de 26 min e ~6 merges/h); até lá, agrupar o `ci.yml` de push por SHA para cada merge ter o seu run.
- PRs parados a triar: #951, #952, #1061 (dependabot com falhas), #1133 e os empilhados em `claude/*` (#1198, #1210, #1211),
  que devem migrar para `gh stack`.
- Auto-aprovação de `gh pr merge` quando a base do PR for `integration/*` (o hook não vê a base pelo texto do comando;
  exige consultar `gh pr view`). Hoje o merge na integração pede confirmação.
