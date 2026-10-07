# Vault do plano — Luminaris

Plano único do projeto em formato de notas (abre como vault no Obsidian; também é markdown comum no repo).
Estado vivo e fila moram **aqui**, no frontmatter de cada nota. O arquivo
[`docs/SDD-LUMINARIS.md`](../SDD-LUMINARIS.md) é a **versão consolidada de 23/09** (leitura corrida, histórico
de folds, snapshot da Parte II/III) — não é mais atualizado.

## Protocolo de leitura para agentes (economia de contexto)

Leia **só o que a tarefa pede**, nesta ordem, e pare assim que tiver a resposta:

1. **[[_INDEX]]** — régua calculada, "destravados agora" e a fila aberta por domínio (uma linha por nó).
2. **A nota do nó** (`nos/`, `gates/`) — estado, autorização, dependências, docs e as linhas de origem.
3. **Só se a tarefa encostar no assunto:** o trilho travado (`trilhos/T*`), a rejeição (`rejeitadas/`) ou o
   diferido (`diferidos/`) que a nota linka. Colisão com trilho/rejeitada = `DECISÃO ARQUITETURAL` → ADR, não tarefa.
4. **Só para visão de produto:** `destino/` (uma nota por seção do SDD).
5. **Nunca por padrão:** o SDD consolidado inteiro. Use a âncora em [[_ANCORAS]] para ir direto à seção.

Citação antiga "master map §5.1" / "§M5.1" / "Bloco A" → [[_ANCORAS]] resolve para as notas.

## Layout

| Pasta | Conteúdo |
|---|---|
| `_INDEX.md`, `_ANCORAS.md` | **gerados** — nunca edite à mão |
| `nos/` | nós de trabalho: régua contábil/financeiro/fiscal, motor, FE, plataforma/onboarding |
| `gates/` | gates humanos e dado externo — agente prepara, **não fecha** (RUNBOOK-FORMAT) |
| `decisoes/` | decisões ratificadas do dono (R*, F-M*, F-Z0) |
| `trilhos/` | T1–T12, decisões travadas |
| `rejeitadas/` | decisões rejeitadas — reabrir exige ADR + sinal humano |
| `diferidos/` | domínios diferidos, cada um com ADR/incremento próprio |
| `destino/` | a visão (SDD Parte I), uma nota por seção; divergências SDD × repo em [[18-caminho]] §18.4 |
| [[DUVIDAS-INVENTARIO]] | ambiguidades das fontes que o vault **não** decidiu (X6 na régua, X10a/X11/X12, C9, Z0-a…) — esperam o dono |

## Frontmatter

Uma chave por linha, valor em JSON (é YAML válido; o Obsidian mostra como propriedade e desenha as arestas
de `depende_de`).

- `estado`: `done` · `inflight` · `ready` · `planned` · `blocked` · `human-open` · `decided` · `rejected` · `deferred`
- `depende_de`: `["[[C12]]"]` — sufixo `?` = aresta pontilhada (condicional/inferida).
- `autorizacao`: citação curta + data. **Vazio = não roteia** (ORCH-006).
- `perfil_previsto` + `perfil_evidencia`: modelo/esforço previsto para o executor, pela taxonomia "Perfil de
  execução" do `.claude/agents/classificador.md` (`opus-medio` · `opus-baixo` · `sonnet-alto` · `sonnet-medio` ·
  `precisa-de-planejamento`). É **previsão, não decisão**; a calibração vem do `perfil-previsto` × `custo` dos
  retornos. Só em nó com BRIEF; em nó `done`, refere-se à emenda aberta citada na evidência.

## Fold (no próprio PR do trabalho, antes do push)

Desde 2026-10-07 o fold entra no PR que faz o trabalho — não há mais PR `docs(plano): fold do #N` separado
(F-2.1/F-2.2 de `docs/operating-manual/CERIMONIA-POR-RISCO-brief.md`).

1. `node scripts/plano-vault.mjs fold <NÓ> --pr <n> [--estado <e>]` — grava `estado`, `prs` e `atualizado`
   no frontmatter e no cabeçalho espelhado (`**Estado:**`/`**PRs:**`), depois regenera índice e régua.
   O PR que fecha o nó já grava `--estado done`: só chega a `main` se for mergeado, então `main` nunca mente.
2. `estado_detalhe` continua à mão (é texto, não estado), seguido de `node scripts/plano-vault.mjs index`.
3. `node scripts/plano-vault.mjs check` — tem de sair 0 (links, dependências, índice em dia).
4. Decisão nova do dono → nota em `decisoes/` citando a cédula.

Proposta nova (item PROPOSTO do destino) só vira nota em `nos/` depois de PRE-ADR ratificado.
