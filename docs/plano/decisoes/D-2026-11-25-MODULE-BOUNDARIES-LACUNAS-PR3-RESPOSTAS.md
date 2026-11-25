---
id: "D-2026-11-25-MODULE-BOUNDARIES-LACUNAS-PR3-RESPOSTAS"
tipo: "decisao"
dominio: "plataforma"
titulo: "Respostas do dono às três lacunas que o PR-3.x de dynamicTables deixou na caixa (M2 sem importador, D2 × lib/factory, CLI do P2) — questionário de 25/11"
estado: "decided"
autorizacao: "dono, 2026-11-25, chat da sessão de feature do PR-3.x de dynamicTables: \"aborda as lacunas\" (as três abertas no relatório do #1387). Questionário (AskUserQuestion) da mesma sessão, quatro perguntas, respostas literais: a M2 só vê arquivo fora de pasta de camada quando alguém de produção o importa → \"Fechar no check:arch (Recommended)\"; RelationUtils.ts e TableUtils.ts sem importador, e a D2 não barra lib/factory → \"Apagar e travar a D2 (Recommended)\"; o que fazer com o proveP2ZeroDiffCli.ts, cujo perímetro é por caminho → \"Congelar como histórico (Recommended)\"; onde entram as correções → \"PR novo sobre o #1387 (Recommended)\""
atualizado: "2026-11-25"
---
# D-2026-11-25-MODULE-BOUNDARIES-LACUNAS-PR3-RESPOSTAS — as três lacunas do PR-3.x de `dynamicTables`

**Estado:** `decided`
**Autorização:** dono, 2026-11-25, chat ("aborda as lacunas") e um questionário (respostas literais no cabeçalho).
Escopo: as lacunas `L-20261124-222007-2aaa`, `L-20261124-222009-90dd` e `L-20261124-222012-137a`. Não ratifica fork
novo do BRIEF além dos quatro pontos abaixo.

Base: [`ADR-MODULE-BOUNDARIES.md`](../../adr/ADR-MODULE-BOUNDARIES.md) §11.7,
[`ADR-ARCH-BOUNDARIES.md`](../../adr/ADR-ARCH-BOUNDARIES.md) §8.3,
[`ADR-P2-second-vertical.md`](../../adr/ADR-P2-second-vertical.md) (emenda de 25/11) e o §13.2 do
[`MODULE-BOUNDARIES-brief.md`](../../architecture/MODULE-BOUNDARIES-brief.md). Nó: [[MODULE-BOUNDARIES]]. Respostas do
PR anterior: [[D-2026-11-24-MODULE-BOUNDARIES-PR3-DYNAMICTABLES-RESPOSTAS]].

## Respostas

| # | Lacuna | Resposta literal | Efeito | Opção recusada |
|---|---|---|---|---|
| 1 | `2aaa`: a `M2` casa pelo `to` e não vê arquivo fora de pasta de camada que ninguém de produção importa | "Fechar no check:arch (Recommended)" | Três regras com o mesmo alvo no gate que já existe: `M2` (arquivo importado; importador de teste passa a contar), `M2b` (arquivo que importa algo) e `M2c` (órfão). Todo `.ts` de produção fora de pasta de camada reprova. Nenhum gate novo | Deixar o ponto cego declarado e conferir por `find` |
| 2 | `90dd`: `dynamicTables/domain/RelationUtils.ts` e `TableUtils.ts` sem importador; o primeiro chama `getFactory()` de dentro de `domain/`, e a `D2` não barra `lib/factory` | "Apagar e travar a D2 (Recommended)" | Os dois arquivos saem; a `D2` passa a barrar `^src/lib/factory\.ts$`. `D2` segue em 0 | Só apagar; deixar para o knip |
| 3 | `137a`: o `jobs/proveP2ZeroDiffCli.ts` declara o perímetro zero-diff do ADR-P2 por caminho, e cada PR de renome o desloca | "Congelar como histórico (Recommended)" | Cabeçalho no CLI e emenda de 25/11 no ADR-P2: as listas descrevem a árvore do #1387 e não são mais traduzidas; o CLI não é gate; o teste das funções puras fica | Manter vivo e traduzir a cada renome; apagar CLI e teste |
| 4 | Onde entram as correções, com o #1387 de CI verde e sem revisão | "PR novo sobre o #1387 (Recommended)" | Um PR pequeno na pilha, com base na branch do #1387 | Commits novos no #1387; um PR por lacuna |

## Consequências

- **O item 10 do checklist do BRIEF passa a ser provado pelo gate.** Os próximos PR-3.x não precisam do `find`.
- **A `D2` ficou mais estreita para todas as features que ganharem `domain/`.** O PR-3.x do `accountingBinding` já
  previa tirar o `computeCompiledFromHash` do service antes de mover `fixtures/` para `domain/` (BRIEF §5.3); com a
  `D2` barrando `lib/factory`, arquivo que chame `getFactory()` também não entra em `domain/`.
- **Os PR-3.x de `accountingBinding` e `accounting` não mexem no `proveP2ZeroDiffCli.ts`**, embora as listas dele citem
  `accountingBinding/{archetypes,interpreter,models}` e `accounting/`.
- **Baseline do server sem mudança:** 376.

## O que esta decisão não faz

- Não reativa a prova zero-diff para um terceiro vertical: isso pede emenda própria no ADR-P2, com o perímetro
  redefinido sobre a árvore do dia.
- Não apaga os outros módulos sem importador que a medida de 24/11 listou (`L-20261124-135610-07f5`).
- Não acrescenta outra feature à `M2`.
