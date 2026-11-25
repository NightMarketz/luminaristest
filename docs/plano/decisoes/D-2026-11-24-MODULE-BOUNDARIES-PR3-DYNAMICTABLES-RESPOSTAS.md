---
id: "D-2026-11-24-MODULE-BOUNDARIES-PR3-DYNAMICTABLES-RESPOSTAS"
tipo: "decisao"
dominio: "plataforma"
titulo: "Respostas do dono às lacunas de spec do primeiro PR-3.x do BRIEF MODULE-BOUNDARIES (renome de dynamicTables e regra M2) — questionário de 24/11"
estado: "decided"
autorizacao: "dono, 2026-11-24, chat: \"Executa o BRIEF inteiro\" (fork novo para o nó e vira pergunta). Questionário (AskUserQuestion) da sessão de feature do PR-3.x de dynamicTables, quatro perguntas, respostas literais: como a troca dos caminhos do check-registries.mjs entra no PR, se a pasta é negada para escrita de agente → \"Você aplica o patch (Recommended)\"; 4 arestas M1 de interview/models e interview/dtos para presets/ → \"Extrair para models/ (Recommended)\"; 8 ciclos X3 que passam por presets/index.ts → \"Quebrar os ciclos (Recommended)\"; 3 arestas M1 de presets/ para analytics/core/models/ → \"Porta em analytics/public (Recommended)\""
atualizado: "2026-11-24"
---
# D-2026-11-24-MODULE-BOUNDARIES-PR3-DYNAMICTABLES-RESPOSTAS — respostas do dono no PR-3.x de `dynamicTables`

**Estado:** `decided`
**Autorização:** dono, 2026-11-24, um questionário (respostas literais no cabeçalho). Escopo: **cada resposta fecha uma
lacuna** que a sessão de feature achou e não podia escolher sozinha. Não ratifica fork novo do BRIEF além dos quatro
pontos abaixo, e vale para a feature `dynamicTables`: os PR-3.x das outras features perguntam de novo se o caso se
repetir.

Base: [`MODULE-BOUNDARIES-brief.md`](../../architecture/MODULE-BOUNDARIES-brief.md) §5.3 e item 10 do §6 (emenda no
§13.1) e [`ADR-MODULE-BOUNDARIES.md`](../../adr/ADR-MODULE-BOUNDARIES.md) §11.6. Nó: [[MODULE-BOUNDARIES]]. Respostas
anteriores da execução: [[D-2026-11-24-MODULE-BOUNDARIES-EXECUCAO-RESPOSTAS]].

## O que o BRIEF não cobria

O renome de `dynamicTables/{presets,utils,validation}` muda a chave (`regra + from → to`) de 45 entradas do baseline do
`check:arch`: 37 `M1` e 8 `X3`. O BRIEF manda o baseline só encolher e não dizia o que fazer com entrada que só troca
de caminho. 30 das 37 `M1` se pagam com reexport em `dynamicTables/public/`; as outras 15 pedem mudança de conteúdo
(lacuna `L-20261124-214609-44a5`). E o `check-registries.mjs` cita os caminhos antigos numa pasta que o agente não
pode escrever (lacuna `L-20261124-214606-ba98`).

## Respostas

| # | Lacuna | Resposta literal | Efeito | Opção recusada |
|---|---|---|---|---|
| 1 | O gate de wiring (`.claude/skills/skill-audit/check-registries.mjs`, roda no `skill-audit run` do CI) cita 6 caminhos de `dynamicTables/presets/`; a pasta é negada para escrita de agente no `.claude/settings.json` | "Você aplica o patch (Recommended)" | A sessão gera o `.patch` (só caminho) e o dono aplica com `git apply`; a sessão commita o resultado. O deny não é contornado | Abrir o PR com o `skill-audit run` reprovando |
| 2 | 4 arestas `M1`: `interview/models/InterviewTypes.ts` e 2 DTOs de `interview` importam de `presets/` o vocabulário de módulos (`ModuleKey`, `moduleSelectorSchema`) e o tipo `TableLock`. Model e DTO só importam `public/*.types.ts`, que pela `M4` só lê `models/` e `dtos/` da feature | "Extrair para models/ (Recommended)" | Chaves, grupos e seletor de módulo em `dynamicTables/models/PresetModuleKeys.ts`; a trava em `models/TableLock.ts`; saem por `public/presets.types.ts`. `registry.ts` e `removability.ts` importam de `models/` e reexportam | Regravar as 4 entradas com o caminho novo |
| 3 | 8 dos 11 ciclos `X3` passam por `presets/index.ts`, que declara os tipos do preset e agrega as suítes | "Quebrar os ciclos (Recommended)" | Tipos e pontes em `domain/presets/presetTypes.ts` (arquivo-folha); o `index.ts` reexporta e quem está em `domain/` importa da folha. `X3` 11 → 3 | Regravar as 8 entradas com o caminho novo |
| 4 | 3 arestas `M1` com origem em `presets/` para o tipo `AnalyticsConfiguration`, em `analytics/core/models/`. Um `analytics/public/x.types.ts` não passa na `M4` (`core/models/` não é `models/`) | "Porta em analytics/public (Recommended)" | `analytics/public/analyticsConfiguration.ts` reexporta só o tipo; os presets importam de lá | Regravar e pagar no PR-3.x da `analytics`; mudar a `M4` para aceitar `models/` aninhado |

## Consequências

- **Baseline do server: 421 → 376, só remoção** (`M1` 359 → 322, `X3` 11 → 3). A `M2` nasce em 0 para
  `dynamicTables`.
- **O padrão das três respostas é o mesmo das respostas 4 e 5 de [[D-2026-11-24-MODULE-BOUNDARIES-EXECUCAO-RESPOSTAS]]:**
  entrada do baseline que troca de chave por causa de um movimento se paga; não se regrava com o caminho novo.
- **`analytics` ganhou a pasta `public/` antes do PR-3.x dela**, com um arquivo que só reexporta tipo e não é
  `*.types.ts`. Se aquele PR levar `core/models/` para `models/`, o arquivo pode trocar de sufixo.
- **A skill `dynamic-table-preset-generator` muda uma instrução:** a suíte importa `PresetSuite` de `../presetTypes`,
  não de `..` (o import do agregador fecha ciclo).
- **A classe prevista no BRIEF mudou:** o PR-3.x de `dynamicTables` era verde na tabela §2; saiu vermelho com revisor
  obrigatório (arquivo de skill que não é `.md`).

## O que esta decisão não faz

- Não decide o que fazer com arquivo fora de pasta de camada sem importador, que a `M2` não vê
  (`L-20261124-222007-2aaa`).
- Não decide o destino de `domain/RelationUtils.ts` e `domain/TableUtils.ts`, sem importador
  (`L-20261124-222009-90dd`), nem do perímetro do `proveP2ZeroDiffCli.ts` (`L-20261124-222012-137a`).
- Não move pasta de outra feature nem acrescenta outra feature à `M2`.
