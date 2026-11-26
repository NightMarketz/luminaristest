---
id: "D-2026-11-25-MODULE-BOUNDARIES-PR3-ANALYTICS-SECTORKITS-RESPOSTAS"
tipo: "decisao"
dominio: "plataforma"
titulo: "Respostas do dono às lacunas de spec do PR-3.x de analytics e sectorKits do BRIEF MODULE-BOUNDARIES — questionário de 25/11"
estado: "decided"
autorizacao: "dono, 2026-11-24, chat: \"Executa o BRIEF inteiro\" (fork novo para o nó e vira pergunta); dono, 2026-11-25, chat da sessão de feature: \"Pode seguir executando aqui\". Questionário (AskUserQuestion) da sessão de feature do PR-3.x de analytics e sectorKits, duas perguntas, respostas literais: 29 entradas M1 do baseline que o renome trocaria de caminho (15 de analytics, 14 de sectorKits) → \"Pagar as 29 (Recommended)\"; para onde vão os 4 arquivos de tipo de analytics/core/models/ → \"analytics/models/ (Recommended)\""
atualizado: "2026-11-25"
---
# D-2026-11-25-MODULE-BOUNDARIES-PR3-ANALYTICS-SECTORKITS-RESPOSTAS — respostas do dono no PR-3.x de `analytics` e `sectorKits`

**Estado:** `decided`
**Autorização:** dono, 2026-11-25, um questionário (respostas literais no cabeçalho). Escopo: **cada resposta fecha uma
lacuna** que a sessão de feature achou e não podia escolher sozinha. Vale para as features `analytics` e `sectorKits`:
os PR-3.x das outras features perguntam de novo se o caso se repetir.

Base: [`MODULE-BOUNDARIES-brief.md`](../../architecture/MODULE-BOUNDARIES-brief.md) §5.3 (emenda no §13.3) e
[`ADR-MODULE-BOUNDARIES.md`](../../adr/ADR-MODULE-BOUNDARIES.md) §11.8. Nó: [[MODULE-BOUNDARIES]]. Respostas anteriores
do mesmo tipo: [[D-2026-11-24-MODULE-BOUNDARIES-PR3-DYNAMICTABLES-RESPOSTAS]].

## O que o BRIEF não cobria

O renome de `analytics/{kpis,dynamic,core,utils,engine}` e de `sectorKits/{kits,registry.ts}` muda a chave
(`regra + from → to`) de 29 entradas `M1` do baseline do `check:arch`: 15 de `analytics` (6 com destino nas pastas
movidas, 9 com origem nelas) e 14 de `sectorKits` (1 com destino, 13 com origem). A resposta de 24/11 sobre o mesmo
caso valia só para `dynamicTables`. E a tabela §5.3 mandava `analytics/core/` para `domain/` dizendo que
"`core/models/` já casa", sem dizer onde esses 4 arquivos ficam.

## Respostas

| # | Lacuna | Resposta literal | Efeito | Opções recusadas |
|---|---|---|---|---|
| 1 | 29 entradas `M1` do baseline trocam de caminho com o renome | "Pagar as 29 (Recommended)" | 10 arquivos de porta em `public/` de seis features: `analytics` (`processor.ts`, `crmKpis.ts`, `money.ts`), `dynamicTables` (`dynamicTable.types.ts`, `dynamicTableService.ts`), `crm` (`constants.ts`), `sectorKits` (`registry.ts`), `accountingBinding` (`clinicBinding.ts`, `saleBinding.ts`) e `accounting` (`chartOfAccounts.ts`, só `codigoPosL8`). Baseline 376 → 347 | Pagar 28 e regravar a aresta do `ChartOfAccountsFixture`, deixando-a para o PR-3.x da `accounting`; regravar as 29 com o caminho novo |
| 2 | Destino dos 4 arquivos de tipo de `analytics/core/models/` | "analytics/models/ (Recommended)" | `core/models/` → `analytics/models/`, pasta de camada na raiz da feature, que a `M4` aceita para um `public/*.types.ts`. A pasta `core/` deixa de existir; o resto dela vai para `domain/core/` | Mover junto para `domain/core/models/`; deixar em `core/models/` |

## Consequências

- **Baseline do server: 376 → 347, só remoção** (`M1` 322 → 293). A `M2` nasce em 0 para `analytics` e `sectorKits`.
- **`accounting` e `crm` ganharam `public/` antes dos PR-3.x delas.** A porta da `accounting` reexporta `codigoPosL8` do
  plano de contas padrão, que o F-MBE-6 (a) leva para `paises/br/`: quando isso acontecer, muda só a linha de reexport.
- **O teste-guarda `sectorKits/__tests__/importBoundary.test.ts`** (lista do que o kit importa de `accounting`, decisão
  de 08/10) ganhou a porta nova, só com o nome `codigoPosL8`, que a lista já aceitava do fixture.
- **`analytics/index.ts` foi apagado** sem pergunta: o BRIEF já dava "apagar ou `public/`", condicionado a conferir o
  registro dos processadores, e a conferência mostrou que ele não tinha importador.
- **Forma do PR:** as duas features saem num PR de fase em draft, um commit por item
  (`D-2026-11-25-BRANCH-LONGA-E-TURNOS`, na `main` desde o #1419).

## O que esta decisão não faz

- Não aplica o patch do `.claude/skills/skill-audit/check-registries.mjs` (2 linhas, `analytics/kpis`): a pasta é negada
  para escrita de agente e o patch fica com o dono.
- Não decide o caso das outras features do renome (`accountingBinding`, `interview`, `crm`, `fx`, `accounting`).
- Não troca o sufixo de `analytics/public/analyticsConfiguration.ts` para `*.types.ts`.
