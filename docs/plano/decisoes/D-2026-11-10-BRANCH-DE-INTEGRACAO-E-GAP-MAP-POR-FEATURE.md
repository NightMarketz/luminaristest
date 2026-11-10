---
id: "D-2026-11-10-BRANCH-DE-INTEGRACAO-E-GAP-MAP-POR-FEATURE"
tipo: "decisao"
dominio: "processo"
titulo: "Branch de integração por feature/tema (merge na main uma vez, quando a feature fecha) e GAP-MAP partido em um arquivo por feature, com a lacuna como máquina de estados"
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
2. **Os PRs do tema têm como base `integration/<slug>`**, nunca outro PR filho e nunca a `main`. Profundidade: `main` →
   `integration/<slug>` → PR (pilha de filho sobre filho continua proibida; a regra de profundidade 2 de 08/11 passa a
   valer entre `main` e a integração).
3. **Merge em `integration/<slug>`** (squash, um por PR): a sessão que coordena o tema mergeia com CI verde, sem conflito
   e fora de draft, sem passar pelo lote do dono. A `main` não é tocada.
4. **Revisor independente** continua rodando por PR vermelho de código, como em `D-2026-11-06-REVISAO-CONVERGENCIA`,
   **antes** do merge na integração (o diff é pequeno e a rodada é barata).
5. **Fechamento:** quando o tema fecha, abre-se **um** PR `integration/<slug>` → `main`. Ele entra pela
   `classe-risco.mjs` (verde: maestro mergeia; vermelho: lote diário do dono, com o resumo dos PRs que ele contém).
   A integração atualiza com a `main` por merge (não rebase), para não reescrever histórico que as filhas já usam.
6. **Sem irmãos, sem integração:** PR isolado de item único, sem tema, segue direto para a `main` (a regra de 08/11).
7. **Prazo:** integração parada há mais de 14 dias sem PR aberto contra ela é reportada no lote; não fica viva por inércia.
8. **Automação de permissão:** o hook `PermissionRequest` do usuário aprova `git commit` e `git push` simples de
   branch `claude/*` e `integration/*`. `--force`/`-f`/`--delete`, push para `main` e `gh pr merge` continuam com prompt.

## Regra 2 — GAP-MAP por feature

1. **O `GAP-MAP.md` único deixa de ser editado por tema.** Ele passa a ser o **índice e o glossário** (níveis 1–5/O,
   convenção `[COBERTO]/[PARCIAL]/…`, regra nº 1 "status vem de comando") e aponta para os arquivos de feature.
2. **Um arquivo por feature:** `docs/gap-map/<slug>.md` (o mesmo `<slug>` da `integration/<slug>`), com uma linha por
   lacuna. A mudança no arquivo de uma feature não conflita com a de outra; o conflito residual é só no índice, que só
   ganha linha quando nasce feature.
3. **A lacuna é uma máquina de estados**, e o estado é **derivado de comando**, nunca escrito à mão:
   `aberto` → `instrumentado` (teste-guarda vermelho pelo motivo certo) → `corrigido` (teste verde) → `verificado`
   (gate de CI verde na main) · `oraculo` (só validador externo alcança) · `rejeitado` (com motivo). Cada linha leva
   a coluna `Comando que prova`; a transição é a mudança do resultado do comando.
4. **O estado de cada lacuna é gerado:** um script (`scripts/gap-map.mjs index`) lê os arquivos de feature, roda ou
   confere o comando de cada linha e regenera o índice. O índice gerado não é versionado, como o `_INDEX.md` do vault.
5. **`CORRECOES.md`** (achados de estruturas implícitas) segue o mesmo caminho: vira `docs/gap-map/<slug>.md` por tema
   (INV, SOT, SM, BRD, EFX), com os identificadores `F-nn.m` preservados.

## Sequência (nada disso mexe nos 40 PRs em voo)

1. Este PR: decisão + CLAUDE.md + hook (já feito no usuário). **Não toca** `GAP-MAP.md` nem `CORRECOES.md`.
2. **Faixa 1 em andamento:** a sessão orquestradora decide se migra os PRs abertos para `integration/estruturas-implicitas`
   (troca de base, sem reescrever o código) ou deixa fechar como está. Por mensagem, quando o dono mandar.
3. **BRIEF de execução** (`sessao-planejamento`, autorizado por esta decisão): formato de `docs/gap-map/<slug>.md`, o
   script `gap-map.mjs`, a migração das linhas do `GAP-MAP.md` por nível → feature e o teste que reprova linha sem comando.
   A migração só roda **depois** que a faixa 1 mergear, para não gerar o conflito que se quer acabar.

## Pendente (não decidido aqui)

- Auto-aprovação de `gh pr merge` quando a base do PR for `integration/*` (o hook não vê a base pelo texto do comando;
  exige consultar `gh pr view`). Hoje o merge na integração pede confirmação.
