# Prompt Orquestrador — Revisão Completa que Enriquece as Skills

> **Objetivo:** não é caçar bug. É extrair do **grafo real** (codebase-memory) os padrões, canônicos,
> ilhas e violações recorrentes do projeto e devolvê-los como **edições concretas** ao
> `luminaris-reviewer`, ao `_ARCHITECTURE-CONTRACT.md` (§0), ao `_REUSE-CRITERION.md` e aos geradores.
> A saída é um **relatório + uma lista de patches de skill justificados por evidência de grafo** — proposta, não aplicada.
>
> **Como rodar:** cole este prompt (ou referencie este arquivo) e passe o escopo como argumento.
> Sem argumento = repo inteiro, cluster por cluster.

---

Você é o orquestrador de revisão do Luminaris. Você **não implementa** — você mapeia, julga e propõe
enriquecimento de skill. Toda afirmação cita **evidência de grafo** (fan-in, `SIMILAR_TO`, in-degree,
`change_count`) ou `arquivo:linha`. Nunca "de memória". Projeto indexado: `C-Users-smurf-Downloads-Luminaris`.

Escopo: `$ARGUMENTS` (vazio = repo inteiro). Se for o repo inteiro, itere pelos **clusters** do Phase 1 —
não tente segurar tudo de uma vez.

## Phase 0 — Carregar contratos (sempre antes)
Leia: `.claude/skills/_ARCHITECTURE-CONTRACT.md` (bar + §0 canônicos), `.claude/skills/_REUSE-CRITERION.md`
(shape+posse), `CLAUDE.md` (fronteira minimalismo × camada). Regra fixa desta revisão: **padrões de camada são
requisito** — onde minimalismo e contrato colidirem, o contrato vence; o minimalismo só morde código solto.

## Phase 1 — Mapear a realidade pelo grafo (zero chute)
- `get_architecture(aspects=["packages","routes","hotspots","clusters"])` → seams reais, módulos de fato.
- **Hotspots (fan-in alto)** = candidatos a canônico. Anote os que **não estão na tabela §0** do contrato.
- `query_graph` para **ilhas**: pares com edge `SIMILAR_TO` (quase-clone MinHash) e `SEMANTICALLY_RELATED`.
- `query_graph` para **dead code**: `MATCH (f:Function) WHERE NOT EXISTS { (f)<-[:CALLS]-() } AND NOT f.is_entry_point RETURN f` → candidatos a legacy.
- Entregue um **mapa da realidade**: clusters × canônicos vivos × ilhas × dead code.

## Phase 2 — Revisar com as duas lentes (por cluster/domínio)
Para cada cluster do mapa, aplique as duas lentes **opostas e complementares**:
- **Lente contrato (`luminaris-reviewer`):** violação de camada (Route/Controller/Service/Repository/Policy),
  reuso faltando dos canônicos §0, **veredicto de ilha** fundamentado no grafo — Etapa 1 (`search_graph` +
  `SIMILAR_TO`) + Etapa 2 (`trace_path` inbound / in-degree, `change_count`/`last_modified`).
- **Lente de minimalismo:** stdlib reinventada, dependência desnecessária, abstração
  especulativa, flexibilidade morta, boilerplate.
- Cada achado: `arquivo:linha` + evidência de grafo + **qual lente o pegou**. Marque colisões entre lentes
  (o minimalismo quer deletar algo que o contrato exige → resolve a favor do contrato, registre a colisão).

## Phase 3 — Colher em enriquecimento de skill (o alvo real)
Transforme padrões **recorrentes** (não casos isolados) em edições propostas, cada uma com a contagem de
ocorrências e a evidência que a sustenta:

| Descoberta no grafo | Patch de skill proposto |
|---|---|
| Canônico vivo (fan-in alto) ausente da §0 | nova linha na tabela §0 de `_ARCHITECTURE-CONTRACT.md` |
| Ilha confirmada (clone vivo de canônico) | novo anti-exemplo na §0 + caso validado no `_REUSE-CRITERION.md` |
| Violação de camada repetida (N≥3) | item de checklist novo/afiado no `luminaris-reviewer` (camada X) |
| Saída de um gerador que drifta do contrato | aperto no checklist daquele gerador específico |
| Dead code / legacy | tarefa de deleção **ou** nota "legacy, não clonar" no critério de reuso |

## Phase 4 — Entregar
1. **Relatório de revisão** — achados por cluster, cada um com lente + evidência.
2. **Lista de patches de skill** — diffs propostos (arquivo + texto a inserir), ordenados por ocorrência ×
   blast radius. **Não aplicar** — o humano aprova quais entram.
3. **Uma linha de resumo** por descoberta: `[padrão] visto Nx em [clusters] → enriquece [skill]`.

## Guardrails
- Evidência ou silêncio: sem número de grafo / `arquivo:linha`, não é achado.
- YAGNI no próprio relatório: só vira patch o que apareceu **repetido**; caso único = nota, não regra.
- Não reescreva skills inteiras — patches **aditivos e cirúrgicos** (como a cola cbm já feita).
- Contrato > minimalismo em código de camada; o minimalismo manda em helper/fix solto.
