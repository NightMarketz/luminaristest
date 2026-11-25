---
id: "LEGAL-REGRAS"
tipo: "plataforma"
dominio: "plataforma"
titulo: "Motor de leis da plataforma — a forma da regra legal como dado publicado com vigência (BE-INCR-LEGAL-REGRAS); continuação do LEGAL-PARAMS"
estado: "planned"
estado_detalhe: "14/11: BRIEF escrito (27 itens ML-1..27 em PR-0..PR-5); forks F-ML-0..14 RATIFICAÇÃO PENDENTE; sem executa. 15/11: revisão independente incorporada — fork novo F-ML-0 (motor × variantes de código por vigência) suspende os itens e os demais forks até o dono decidir; recomendação revista: variantes agora, motor só se uma pessoa for publicar regra sem PR. Direção decidida pelo dono em 14/11 ([[D-2026-11-14-MOTOR-DE-LEIS]]): núcleo genérico + vocabulário por domínio; o DP (PES-4) é o primeiro domínio a adotar; cálculo fiscal que já roda só migra por gatilho (F-ML-11)"
depende_de: ["[[LEGAL-PARAMS]]", "[[D-2026-11-14-MOTOR-DE-LEIS]]", "[[PES-4]]?"]
autorizacao: "dono, chat, 2026-11-14: \"Acho que podemos abstrair e criar um motor de leis para o projeto todo, não?\" + \"Sim, reescreve\" (resposta a \"Reescrevo o BRIEF como motor de leis da plataforma, com nó próprio?\") — nó e BRIEF; não é executa e não ratifica os forks F-ML-0..14"
ancora_sdd: "—"
atualizado: "2026-11-14"
write_set: ["server/src/features/legalParameters/**", "server/src/routes/legalParameters.ts", "server/src/routes/docs/legal-parameters.paths.ts", "server/src/controllers/legalParameterController.ts", "server/public/openapi.json", "server/.dependency-cruiser.cjs", "docs/adr/ADR-MOTOR-DE-LEIS.md", "docs/adr/ADR-ARCH-BOUNDARIES.md", "server/src/features/dp/models/folha/**", "server/prisma/data/legal_parameters_lei_regra_v1.sql"]
prs: []
---
# LEGAL-REGRAS — motor de leis da plataforma

**Estado:** `planned` — 14/11: BRIEF escrito (27 itens ML-1..27 em PR-0..PR-5); forks F-ML-0..14 RATIFICAÇÃO PENDENTE; sem executa. 15/11: revisão independente incorporada — fork novo F-ML-0 (motor × variantes de código por vigência) suspende os itens e os demais forks até o dono decidir; recomendação revista: variantes agora, motor só se uma pessoa for publicar regra sem PR. Direção decidida pelo dono em 14/11 ([[D-2026-11-14-MOTOR-DE-LEIS]]): núcleo genérico + vocabulário por domínio; o DP (PES-4) é o primeiro domínio a adotar; cálculo fiscal que já roda só migra por gatilho (F-ML-11)  
**Autorização:** dono, chat, 14/11/2026 — *"Acho que podemos abstrair e criar um motor de leis para o projeto todo, não?"* + *"Sim, reescreve"*: nó e BRIEF. **Não** é `executa`.  
**Depende de:** [[LEGAL-PARAMS]] ✅ (a tabela, o ciclo de publicação, as rotas e a fila de recálculo que hospedam a regra); [[D-2026-11-14-MOTOR-DE-LEIS]]. Condicional: o snapshot do F2 do [[PES-4]] (para o vocabulário `folha` e o PR-4 daqui).  
**Desbloqueia:** as regras do F3 do [[PES-4]] como dado; a migração por gatilho de cálculo fiscal (cada uma com decisão própria).

## O que é

O [[LEGAL-PARAMS]] pôs os **números** de lei em tabela versionada. Este nó põe a **forma** da regra: uma árvore de
expressão fechada (sem `eval`), publicada como linha `LEI_REGRA` de `LegalParameter`, com vigência, citação do artigo e
exemplos que precisam passar para publicar. O núcleo é função pura e não conhece domínio; cada domínio registra o seu
vocabulário de variáveis e monta o contexto.

**Fronteiras (não se reabrem aqui):** não gera lançamento ([[R-motor-regras]]); não orquestra, sem DAG nem fila própria
([[R-motor-dominio]]); não é motor de regra do usuário nem entra no motor DynamicTable; leiautes e serializers continuam
código.

## Docs

- [`BE-INCR-LEGAL-REGRAS-brief.md`](../../accounting/BE-INCR-LEGAL-REGRAS-brief.md) — 14/11: checklist, contratos, forks
  F-ML-0..14 pendentes, insumos ausentes (processador da fila de recálculo não lido; 47 consumidores fiscais só localizados)
- Decisão: [[D-2026-11-14-MOTOR-DE-LEIS]] (reabre F-DP-5 / F-PES-9 e o limite do BRIEF do F2 §0.1)
- Origem: `pesquisas-legais/dp-cobertura-100/COBERTURA-DP.md` e [[D-2026-11-14-DP-ESCOPO-LACUNAS-2]]

## Próximo

Decidir o **F-ML-0** (BRIEF §0.2). Só se for (a), ratificar F-ML-0..14 (a recomendação de cada um está no BRIEF) e o `executa`. PR-0 a PR-2 não dependem do F2 do DP.

**Publicação (24/11):** escrito em 14–15/11 na worktree `claude/personal-dept-coverage-c7fea7` e publicado em 24/11 sem mudar o conteúdo, só com esta nota. Os forks do país na borda (F-PB-1..9) foram ratificados em 24/11 (`docs/plano/decisoes/D-2026-11-24-FORKS-DA-CAIXA-E-PAIS-NA-BORDA.md`, PR #1331), e a regra reescrita está em `docs/adr/ADR-PAIS-NA-BORDA.md` (PR da sessão de planejamento de 24/11, branch `claude/adr-pais-na-borda-emendas`). Lacuna de origem: `L-20261124-032018-f96d`.
