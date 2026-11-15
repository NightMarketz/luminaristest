---
id: "D-2026-11-11-LACUNA-VAI-AO-MAESTRO"
tipo: "decisao"
dominio: "processo"
titulo: "Lacuna, débito ou achado fora de escopo que uma sessão encontra vai à caixa do maestro, e o maestro abre a sessão que o resolve"
estado: "decided"
autorizacao: "dono, chat, 2026-11-11: \"se as sessões que estão realizando tarefas acharem lacunas, elas precisam enviar essas lacunas já direto pro orquestrador e o orquestrador já vai lançar outras sessões que vão resolver essas lacunas que ficaram. Senão fica lá esperando parado e perdendo tempo.\""
atualizado: "2026-11-11"
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
