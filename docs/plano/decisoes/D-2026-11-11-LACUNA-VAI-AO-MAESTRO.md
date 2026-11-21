---
id: "D-2026-11-11-LACUNA-VAI-AO-MAESTRO"
tipo: "decisao"
dominio: "processo"
titulo: "Lacuna, débito ou achado fora de escopo que uma sessão encontra vai à caixa do maestro, e o maestro abre a sessão que o resolve"
estado: "decided"
autorizacao: "dono, chat, 2026-11-11: \"se as sessões que estão realizando tarefas acharem lacunas, elas precisam enviar essas lacunas já direto pro orquestrador e o orquestrador já vai lançar outras sessões que vão resolver essas lacunas que ficaram. Senão fica lá esperando parado e perdendo tempo.\""
atualizado: "2026-11-21"
---
# D-2026-11-11-LACUNA-VAI-AO-MAESTRO

**Estado:** `decided`. Emenda a [D-2026-10-28-FLUXO-AUTONOMO](D-2026-10-28-FLUXO-AUTONOMO.md) e o prompt `.claude/prompts/maestro.md`.

**Por quê:** as cinco sessões terminavam com uma seção "Achados fora de escopo" no relatório e paravam ali. Ninguém
lia a seção depois: a lacuna ficava no transcript e só voltava se o dono lembrasse dela. Exemplo: os follow-ups da faixa
1 de 10/11 só viraram trabalho porque a orquestração do dia 2 os juntou e perguntou ao dono.

## Regra

### 1. Na sessão que acha a lacuna

1. **O que é da sua tarefa você resolve, não reporta.** Caso que a spec pede, teste que o próprio diff exige, erro que
   o seu código introduziu, arquivo da sua localização: termine antes de fechar. "Fora de escopo" é só o que está fora da
   localização (correção/instrumentação), fora da spec (feature/planejamento) ou fora do conteúdo revisado (integração).
2. **Todo o resto vai à caixa, um por linha, antes do relatório final:**
   ```
   node scripts/lacunas.mjs add --local <arquivo:linha> --classe <defeito|debito|spec|feature|fork|gate> \
     --o-que "<o que falta ou está errado>" --evidencia "<o que você leu ou rodou>" \
     [--como-provar "<teste ou comando que falharia>"] [--no <NÓ>] [--pr <n>] [--pai <id, se esta sessão veio de uma lacuna>]
   ```
   A caixa fica em `<git-common-dir>/lacunas/` (o `.git` da checkout principal): toda worktree da máquina enxerga, nada
   é versionado. Sem `--local` e `--evidencia` o script recusa: suspeita sem arquivo lido não entra.
3. **A 1ª linha do relatório final** diz `LACUNAS NA CAIXA: <n> (<ids>)`, ou `LACUNAS NA CAIXA: 0`. É ela que aparece
   nos 400 caracteres da nota que o maestro recebe. A seção "Achados fora de escopo" continua no relatório e no corpo do
   PR, com o id de cada linha.
4. **Não mande a lacuna ao maestro por `SendMessage`.** Turno aberto por mensagem de outra sessão não pode abrir
   sessão (o app só deixa propor cartão), e isso quebra a cadeia em que o maestro abre as sessões seguintes. O maestro lê
   a caixa quando volta.
5. Sessão que o dono abriu à mão, fora do maestro, faz o mesmo. Se não houver maestro rodando, a lacuna espera na caixa
   o próximo ciclo; a sessão diz isso no relatório.

### 2. No maestro

A cada volta ao passo 1 do ciclo, `node scripts/lacunas.mjs list --abertas`. Para cada lacuna `aberta`:

| Classe / situação | Destino, sem perguntar ao dono |
|---|---|
| Já existe linha no GAP-MAP, PR aberto ou lacuna em curso para o mesmo `arquivo:linha` | `descartada` com "duplicada de <ref>" |
| `defeito` ou `debito` com evidência | `sessao-instrumentacao` (teste-guarda vermelho) → `sessao-correcao`, um PR por lacuna. Teste que não falha: `descartada` com "não reproduzido" |
| `debito` sem comportamento a provar (código morto, duplicação, `atalho:` vencido, tipagem frouxa) | `sessao-correcao` com o comando-guarda que prova o débito (grep, `tsc`, `check:arch`, lint) |
| `spec`: o BRIEF de um nó com `executa` pedia e não foi entregue | `sessao-feature` do mesmo nó, no PR do BRIEF que faltou |
| `feature`: frente nova, sem spec | `sessao-planejamento`. O BRIEF que ela produz vai à pergunta do dia para ratificar; a execução espera a ratificação |
| `fork`, ou qualquer lacuna que exija escolha de produto, lei, arquitetura ou algo irreversível | `com-dono`: entra na pergunta única do dia (AskUserQuestion com contexto, recomendada primeiro) |
| `gate`: PVA, NF-e real, RFB, contador, deploy, sign-off | `com-dono`: linha em "Parado em mim" |
| Geração > 3 (lacuna de lacuna de lacuna) | `com-dono` com "repensar a abordagem": a cadeia não está convergindo |

- Ao abrir a sessão: `node scripts/lacunas.mjs set <id> --estado em-sessao --destino "<nome/id da sessão>"`; o brief
  cita o id, a autorização (esta decisão + a frase do dono acima) e `--pai <id>` para as lacunas que ela achar. Ao abrir o
  PR: `em-pr`; no merge: `resolvida`.
- **Autorização:** esta decisão é a autorização citável (ORCH-006) das sessões de instrumentação, correção e
  planejamento abertas para uma lacuna da caixa. A lacuna da caixa triada pelo maestro conta como lacuna **listada** para a
  `sessao-instrumentacao`; o maestro põe as linhas no GAP-MAP no seu PR só de docs do dia (a seção "Lacunas da caixa"), e
  os PRs de correção não mexem no GAP-MAP (mesmo motivo da emenda de 10/11 da D-2026-11-10-FAIXA1-MERGE-LIVRE).
- Capacidade: as sessões de lacuna entram na mesma fila das sessões de nó (no máximo 4 ao mesmo tempo, 2 vagas de
  trabalho pesado, pilha de no máximo 2). Defeito vem antes de débito; lacuna em código de PR ainda não mergeado espera o
  merge do pai e sai de `origin/main`.
- Merge: o PR de lacuna segue o `classe-risco.mjs` como qualquer PR: verde o maestro mergeia, vermelho vai ao revisor e ao
  lote. Esta decisão não abre exceção de merge.

### 3. No resumo do fim do dia

Seção nova, depois de "Mergeados hoje": **Lacunas da caixa** — `id · origem (sessão/PR) · classe · arquivo:linha · estado ·
destino`. Nenhuma lacuna aberta sai do dia sem destino: ou tem sessão, ou PR, ou está na pergunta, ou foi descartada com motivo.

## O que **não** muda

- A cerca de escopo das sessões: correção continua sem tocar fora da localização, feature continua sem fazer mais que a
  spec. A diferença é que o achado deixa de morrer no relatório.
- Fork de verdade continua do dono; o maestro não ratifica BRIEF nem escolhe produto, lei ou arquitetura.
- A moratória de aparato de auditoria (`CLAUDE.md` §⛔): a caixa é fila de trabalho, não rodada de descoberta. Sessão
  nenhuma sai **procurando** lacuna; registra a que apareceu no caminho da tarefa.

## Emenda de 11/11: em todo lugar (OPS-007)

Dono, chat, 2026-11-11: "Já atualiza todas as nossas skills com isso, sessão de execução, sessão de gap map,
planejamento, tudo. Então, porque isso é uma característica do seu modelo. Então, em todos os lugares vai acontecer."

- A regra vira **OPS-007** em `.claude/skills/_OPERATING-GATES.md` e vale para toda skill, agente, subagente e sessão.
- Toda `SKILL.md` de `.claude/skills/` e os 3 agentes de `.claude/agents/` ganham a seção "Lacunas e débitos (OPS-007)",
  com uma linha pelo papel (gerador, orquestrador, implementador, revisor, domínio, borda, auditoria, fronteira, log).
  Subagente sem Bash devolve as lacunas numa seção `Lacunas`; quem despachou põe na caixa.
- **Achado `P` (pré-existente) do revisor:** antes ia ao resumo como linha `[ABERTO]` proposta e esperava autorização
  própria (D-2026-11-06-REVISAO-CONVERGENCIA, dono, 06/11). Agora o revisor o põe na caixa e o maestro o despacha pelo
  passo 3b. O trilho continua separado do PR revisado, que segue sem FAIL por ele.
- Versão portável no `docs/operating-manual/PORTABLE-GUIDE.md`.

## Emenda de 14/11: o script alcança toda sessão da máquina

Dono, chat, 2026-11-14: "Vamos escrever o script lacunas e deixar pronto para que qualquer sessão alcance ele"; no
questionário do mesmo dia escolheu "Global na máquina".

**Medido em 14/11:** `scripts/lacunas.mjs` só existe em worktree cortada depois do #1233. Das 55 worktrees da máquina, 2
tinham o arquivo; a checkout principal não tinha. Nelas `node scripts/lacunas.mjs add` morria com "Cannot find module" e
a lacuna se perdia. O script também saía calado, sem rodar e com exit 0, quando o seu caminho tinha espaço ou acento.

- `node scripts/lacunas.mjs instalar` copia o script para `~/.claude/tools/lacunas/lacunas.mjs`. A cópia aceita os
  mesmos comandos e grava na mesma caixa (`<git-common-dir>/lacunas/`), de qualquer worktree:
  `node "$HOME/.claude/tools/lacunas/lacunas.mjs" add …` (Bash e PowerShell).
- A fonte continua sendo `scripts/lacunas.mjs`, versionado. Quem mudar o script sobe `VERSAO` e roda `instalar`; enquanto
  a cópia estiver atrás, todo comando rodado do repo avisa no stderr. `instalar` recusa trocar uma cópia mais nova por
  uma mais velha.
- A cópia funciona em qualquer repositório git, cada um com a sua caixa. Fora do Luminaris não há maestro lendo: lá a
  caixa é só registro, e o cartão de sessão ou a pergunta ao dono continuam obrigatórios (`~/.claude/CLAUDE.md`).
## Emenda de 21/11: a metade "despachar" estava atrasada

Dono, chat, 2026-11-21: "Aplicar" (os quatro refinamentos propostos na revisão do dia).

**Medido em 21/11 (124 lacunas na caixa):** 49 `aberta`, 39 `em-pr`, 30 `resolvida`, 3 `com-dono`, 1 `em-sessao`. Dos 49
abertos, 6 eram `fork` e 3 `gate`, que a tabela §2 manda ao dono sem esperar; 5 defeitos com evidência estavam abertos
desde 11–13/11 sem sessão. `set --pr` não gravava o PR (L-20261121-035340-2b5e) e o `add` aceitou `--local` apontando
para outra worktree (L-20261120-220811-4e7d).

1. **`set --pr <n>` grava o PR; `--estado em-pr` exige `--pr`** (ou um `pr` já gravado). Sem o número a lacuna não se liga
   ao PR e o resumo do dia não consegue conferir `em-pr` contra o `gh`.
2. **Lacuna parada.** `list --paradas [dias]` (padrão 3) lista a `aberta` com idade ≥ N dias. O resumo do dia ganha, na
   seção "Lacunas da caixa", a linha **Paradas** com o motivo de cada uma (sem vaga, espera o pai, aguarda PR). "Nenhuma
   aberta sai do dia sem destino" continua valendo; parada sem motivo escrito é falha do ciclo.
3. **Triagem determinística: passo 0 do 3b.** `node scripts/lacunas.mjs triar` manda a `com-dono`, sem julgamento, toda
   `aberta` de classe `fork` ou `gate` e toda de geração > 3. `--simular` só mostra. O resto da tabela §2 continua sendo
   julgamento do maestro.
4. **`--local` é caminho da checkout onde o achado vive.** `../outra-worktree/…` e caminho absoluto fora da raiz do repo
   são recusados. Achado cujo arquivo está noutra checkout vai na caixa dela, ou no texto de `--o-que`, sem inventar caminho.

`scripts/lacunas.mjs` na VERSAO 3 (cópia global reinstalada). A caixa de 21/11 não foi triada por esta emenda: o primeiro
`triar` é do maestro, no ciclo seguinte.

## Emenda de 21/11 (2): o despacho medido, e o que o dono decidiu

Dono, chat, 2026-11-21: "Da pra refinar essa regra muito mais"; no questionário do mesmo dia: dreno → "Cartão de dreno";
rodadas → "Sim, marcada"; lacunas no mesmo arquivo → "Planeja como resolver tudo no macro em vez de vários remendos";
caixa real → "Rodar agora"; em seguida, "BRIEF de grupo sem fork pode executar sem a sua ratificação?" → "Sim, executa".

**Medido em 21/11, no `historico` de cada lacuna (VERSAO 4 do script):**
- **O passo 3b quase não rodou.** Nenhuma lacuna passou por `em-sessao` antes de 20/11 (5 em 20/11, 5 em 21/11). O caminho
  mais comum foi `aberta → em-pr` (35), levado por sessões que pegaram a lacuna sozinhas. O dreno da caixa depende de
  uma sessão maestro aberta pelo dono; sem ela, nada anda.
- **O estado ficou atrás do GitHub.** 24 de 40 `em-pr` tinham PR mergeado; 21 desses PRs tocavam o arquivo da lacuna, 3
  não (conferido à mão, e o `sincronizar` chegou nos mesmos 3). Ninguém passava `em-pr → resolvida` no merge.
- **`com-dono` não tinha saída.** `L-…-051e` dizia "Fork respondido" e seguia `com-dono`; `L-…-4521` estava lá havia 9 dias.
- **A idade contava da criação.** Lacuna reaberta parecia velha, e `em-sessao` de sessão morta nunca aparecia.
- **Rodadas despejam em lote.** 34 lacunas em 2 min do teste de navegador de 13/11 (~20 viraram PR mergeado) e 13 da
  triagem de regras de 20/11.
- **Várias lacunas por arquivo.** 6 não finais em `PostingService.ts`, 5 no simulador do salão.

Aplicado na caixa real em 21/11 (dono: "Rodar agora"): `sincronizar` resolveu 22, deixou 3 em `conferir` (37cb, 7199,
7cfa); `triar` mandou 11 forks e gates a `com-dono`. Depois disso: 45 `aberta`, 19 `em-pr`, 14 `com-dono`, 53 `resolvida`.

### Regra nova

1. **`sincronizar` antes de tudo no ciclo.** Lê o GitHub: PR mergeado **que toca o arquivo da lacuna** → `resolvida`;
   mergeado sem tocar → fica e sai em "conferir" (o maestro lê o diff e decide; o #1240 mergeou sem corrigir a 8a05);
   fechado sem merge → `aberta`; `em-sessao` com PR aberto → `em-pr`. Lacuna antiga sem campo `pr` tem o número lido
   do destino, só se o PR existir.
2. **Parada é tempo no estado atual, em todo estado não final:** `aberta` 3 d, `em-sessao` 2 d (sessão morreu sem PR),
   `com-dono` 3 d (pergunta não respondida, ou respondida e não devolvida), `em-pr` 7 d. `list --paradas` lista; o
   resumo do dia dá o motivo de cada uma.
3. **Saída de `com-dono`.** Resposta do dono a um fork ou gate devolve a lacuna à fila no mesmo ciclo:
   `set <id> --estado aberta --classe <a que a resposta definiu> --destino "dono, <data>: <resposta>"`, ou `descartada`
   com o motivo. A resposta vira cédula em `docs/plano/decisoes/` quando decide produto, lei ou arquitetura, como
   qualquer fork.
4. **Cartão de dreno (dono: "Cartão de dreno").** Toda sessão que registra lacuna roda `lacunas.mjs pulso` antes do
   relatório. Se ele imprimir `DRENO` (há lacuna aberta e nenhum despacho a `em-sessao` há 1 dia ou mais), a sessão propõe
   **um** cartão (`start_session`, `own_initiative`) "Drenar a caixa de lacunas (N abertas)", cujo brief é rodar o ciclo
   do `.claude/prompts/maestro.md` a partir do passo 3b, e roda `pulso --marcar-dreno`. Por 1 dia nenhuma outra sessão
   propõe o cartão de novo. O dono inicia o cartão. Sessão nascida de cartão proposto por outra sessão pode ter o
   `start_session` recusado (só propõe cartões, como em 21/10); o brief do cartão manda, nesse caso, pedir ao dono uma
   linha no próprio chat ("inicia"), que destrava os turnos seguintes.
5. **Rodada marcada (dono: "Sim, marcada").** Rodada de revisão **autorizada pelo dono** registra seus achados com
   `--rodada <nome>`. Não é "sair procurando": a rodada já foi pedida, e a caixa é onde o achado dela vira trabalho. O
   maestro trata a rodada como **grupo** (item 6) e despacha os achados do caminho de uma tarefa antes dos de rodada.
   Sessão que não foi pedida como rodada continua sem sair procurando.
6. **Grupo vai a planejamento macro (dono: "Planeja como resolver tudo no macro em vez de vários remendos").**
   `list --grupos` liga as lacunas não finais por arquivo em comum ou pela mesma rodada, transitivamente. Para cada grupo
   de 2 ou mais, depois do `triar`:
   - **uma** `sessao-planejamento` do grupo, com o id de todas as lacunas no brief. O BRIEF resolve o conjunto pela causa
     comum (refatoração, contrato, componente) e não por um remendo por linha. Ele lista, para cada lacuna, o item que a
     fecha e o comando que prova;
   - **BRIEF de grupo sem fork executa sem ratificação** (dono, chat, 21/11, à pergunta "BRIEF de grupo sem fork pode
     executar sem a sua ratificação?": "Sim, executa"). Essa resposta é a autorização citável (ORCH-006) para esse
     BRIEF; o maestro não ratifica nada, aplica a resposta do dono. "Sem fork" é binário: a seção de forks do BRIEF está
     vazia **e** nenhuma lacuna do grupo está `com-dono`. Aí o maestro abre a `sessao-feature` do BRIEF, citando essa
     linha no brief, no mesmo ciclo. Com um fork que seja, o BRIEF vai à pergunta do dia com os forks e a execução espera
     a resposta. Em qualquer caso: um PR por item; com 2+ PRs nos mesmos arquivos, `integration/<slug>` (regra de 10/11);
     o merge segue a classe de risco (vermelho continua no lote do dono). A dispensa vale só para BRIEF de grupo de
     lacunas da caixa, não para BRIEF de nó do plano;
   - **só as `aberta` do grupo** passam a `em-sessao` com o destino "planejamento do grupo <slug>". As `com-dono` ficam com
     o dono e entram no BRIEF como fork pendente; as `em-sessao`/`em-pr` seguem a sessão ou o PR delas, e o BRIEF as cita
     para não colidir.
   Lacuna **isolada** segue a tabela §2 como antes.
7. **O `add` não bloqueia por qualidade, só avisa.** A fraqueza da regra é a lacuna que não entra. O `add` avisa (stderr),
   sem recusar, quando: o arquivo não existe na checkout (trabalho não commitado; grava `arquivoForaDaCheckout` e o
   maestro abre a sessão na branch de origem ou espera o merge dela); já há lacuna não final no mesmo arquivo (o grupo
   do item 6); `defeito`/`debito` vem sem `--como-provar`. Continuam recusados: sem `--local`, sem `--evidencia`, classe
   fora da lista, `--local` fora da raiz da checkout (emenda anterior).

### Fora desta emenda (não decidido aqui)

- **#1223 em aberto** (`D-2026-11-10-METODO-FABLE-5-2`) junta instrumentação e correção numa sessão só, com commits `test:`
  e `fix:`. Se mergear, a linha `defeito/debito` da tabela §2 passa a ser essa sessão única; o resto desta emenda não muda.
  O #1223 também edita `maestro.md` e `_OPERATING-GATES.md`: quem mergear o segundo resolve o conflito de texto.
- **Fragmentos do GAP-MAP** (`D-2026-11-10-BRANCH-DE-INTEGRACAO-E-GAP-MAP-POR-FEATURE` regra 2, BRIEF pendente): quando a
  migração rodar, a caixa continua sendo a **entrada** (achado ainda não triado) e o fragmento passa a ser o **mapa**
  (estado derivado de comando). O `sincronizar` cobre o intervalo até lá; a passagem caixa → fragmento é do BRIEF.
- **Conferir mecanicamente que toda linha "fora de escopo" de relatório tem id na caixa:** seria gate novo, barrado pela
  moratória (`CLAUDE.md` §⛔). Fica como está: 1ª linha `LACUNAS NA CAIXA` e o revisor.

- **Fora do alcance:** sessão na nuvem não enxerga o `.git` desta máquina. Lacuna achada lá continua indo na seção
  "Achados fora de escopo" do relatório e do PR, e quem recebe o resultado aqui põe na caixa.
