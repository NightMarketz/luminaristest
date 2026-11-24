---
id: "D-2026-11-14-MOTOR-DE-LEIS"
tipo: "decisao"
dominio: "plataforma"
titulo: "Motor de leis da plataforma: a forma da regra legal também vira dado; reabre F-DP-5/F-PES-9 por pedido do dono (14/11)"
estado: "decided"
autorizacao: "dono, chat, 2026-11-14: \"Basta construir aqui tbm um motor em que vc encaixa as leis e pode modificar apenas as leis e o comportamento vai se modificando com mais facilidade\" + \"Acho que podemos abstrair e criar um motor de leis para o projeto todo, não?\" + \"Sim, reescreve\" (resposta a \"Reescrevo o BRIEF como motor de leis da plataforma, com nó próprio?\") — decide a direção e autoriza nó e BRIEF; não é 'executa' e não ratifica os forks F-ML-0..14"
atualizado: "2026-11-14"
---
# D-2026-11-14-MOTOR-DE-LEIS — motor de leis da plataforma (14/11/2026)

**Estado:** `decided` quanto à **direção**; os forks de desenho (F-ML-0..14) seguem **RATIFICAÇÃO PENDENTE** no BRIEF
[`BE-INCR-LEGAL-REGRAS-brief.md`](../../accounting/BE-INCR-LEGAL-REGRAS-brief.md). **Autorização:** dono, chat, 14/11/2026
(frontmatter). Nó: [[LEGAL-REGRAS]]. Contexto: [[LEGAL-PARAMS]], [[PES-4]], [[D-2026-11-06-DP-BRIEF-F2]],
[[D-2026-11-14-DP-ESCOPO-LACUNAS-2]].

## Como saiu

Na mesma conversa, em três passos: (1) o dono pediu o motor para o DP; (2) propôs abstraí-lo para o projeto todo; (3)
confirmou a reescrita do BRIEF como peça de plataforma, com nó próprio. O rascunho só-DP (`BE-INCR-DP-MOTOR-LEIS-brief.md`)
nunca foi commitado e foi substituído.

## O que estava decidido e passa a estar superado

| Decisão anterior | Texto | Efeito de 14/11 |
|---|---|---|
| F-DP-5 / F-PES-9 (a), dono 02/11 e 12/10 | Catálogo **fechado** de rubricas **em código**, funções puras; valores da CCT como dado. A árvore de expressão só voltaria "por incidente, com PR" | **Reaberto pelo dono.** A forma da regra passa a ser dado publicado. O catálogo de rubricas em código segue por ora (F-ML-4) |
| BRIEF do F2 do DP §0.1, "limite declarado" | "lei que traga uma regra de forma nova ainda pede PR de código com teste. Tirar esse limite seria reabrir o F-DP-5, e isso é fork à parte" | **Este é o fork à parte.** O limite que sobra é "primitiva nova pede PR" (F-ML-8) |

## O que **não** muda

- [[R-motor-regras]] (motor que gera lançamento) e [[R-motor-dominio]] (orquestração, DAG, fila): continuam rejeitados.
  O motor de leis é função pura de cálculo: devolve valor e prova.
- A fronteira DynamicTable × Prisma: o motor é só para regra que a lei desenha.
- Leiautes e serializers (SPED, ECD/ECF, NF-e, eSocial, Reinf) continuam código.
- O cálculo fiscal que já roda **não** é migrado por esta decisão: só por gatilho, um por vez, com equivalência (F-ML-11).
- O BRIEF do F2 do DP e o `executa` dele.

## Revisão independente (15/11)

Relatório em `docs/adr/revisoes/REVIEW-pais-na-borda-e-motor-de-leis-2026-11-15.md`. Efeito sobre esta decisão: a **direção**
("a lei muda num lugar só, com data, e o comportamento acompanha") segue valendo; o **meio** deixou de ser dado. O BRIEF
ganhou o fork F-ML-0: motor de leis (regra como dado interpretado) × variantes de código por vigência (função tipada
escolhida pela data de efeito). A recomendação passou a ser a segunda, salvo se em 2027 uma pessoa for publicar regra sem
PR. Enquanto o dono não decidir o F-ML-0, nada do BRIEF é ratificável.

## Próximo passo

Ratificar F-ML-0..14 e dar o `executa`; a execução é da `sessao-feature`. O conteúdo legal de cada regra publicada
continua passando por `VERIFICACAO-LEGAL.md` e, no que for interpretação, pelo contador: o motor garante fidelidade à
regra publicada, não a correção dela.

**Publicação (24/11):** escrito em 14–15/11 na worktree `claude/personal-dept-coverage-c7fea7` e publicado em 24/11 sem mudar o conteúdo, só com esta nota. Os forks do país na borda (F-PB-1..9) foram ratificados em 24/11 (`docs/plano/decisoes/D-2026-11-24-FORKS-DA-CAIXA-E-PAIS-NA-BORDA.md`, PR #1331), e a regra reescrita está em `docs/adr/ADR-PAIS-NA-BORDA.md` (PR da sessão de planejamento de 24/11, branch `claude/adr-pais-na-borda-emendas`). Lacuna de origem: `L-20261124-032018-f96d`.
