---
name: module-boundary-selector
description: Seleciona e organiza a fronteira de um módulo/entidade — Prisma first-class × DynamicTable, e dentro do motor, módulo canônico selecionável × extensão custom — produzindo um Registro de Fronteira com evidência graduada e o roteamento de skills geradoras. Use antes de planejar/gerar qualquer módulo novo, ao classificar um existente, ou ao avaliar um vertical novo.
argument-hint: "[entidade/módulo a classificar] [setor/vertical se relevante]"
allowed-tools: Read, Grep, Glob
metadata:
  governance-skill-id: SKL-BOUNDARY-SELECTOR
  governance-version: "1.0.0"
  governance-status: draft
  governance-owner: engineering
  governance-doc: ./governance.md
---

# Module Boundary Selector

## Purpose

Responde, com evidência e por formulário, as quatro perguntas que todo módulo novo (ou reclassificação de existente) exige — **antes** de qualquer scaffolding:

1. A entidade vive em **Prisma first-class** ou **DynamicTable**?
2. Se DynamicTable: é **módulo canônico selecionável** (preset de sistema) ou **extensão custom** do usuário?
3. Que **alfândega** (evento → bridge → arquétipo) a verdade financeira dela exige?
4. Quais **skills geradoras**, em que ordem, materializam a decisão?

Esta skill **decide e registra; não implementa** — a saída alimenta o `luminaris-orchestrator`/`sessao-planejamento`. Ela aprofunda o STEP 0 do orquestrador (ORCH-002), não o substitui.

## Contrato obrigatório

Leia `.claude/skills/_ARCHITECTURE-CONTRACT.md` §2.1 antes de classificar — os anti-padrões AC-2.1-B1..B5 são gate e prevalecem sobre qualquer conclusão desta skill. Em contradição, o contrato ganha e a skill está errada.

## Etapa 0 — Reuso antes de classificar

- Pergunte ao codebase-memory se a entidade/módulo (ou quase-clone) já existe: `search_graph` por nome/shape, `SIMILAR_TO` para ilhas. Confirme por `Read` (CBM-001 — o grafo localiza, o código prova).
- Já existe canônico vivo → o resultado é **reusar/estender**, não criar. Registre e encerre.

## Etapa 1 — Camada: Prisma × DynamicTable

**[SEL-001] A camada é decidida pelas 4 perguntas de segurança + tripwires de plataforma; qualquer resposta na coluna Prisma → Prisma first-class; em dúvida → Prisma.**

| # | Pergunta | DynamicTable se… | Prisma se… |
|---|---|---|---|
| 1 | Errado-e-corrigido-depois é aceitável? | sim — estado recuperável/reconciliável | não — o valor é definitivo ao nascer |
| 2 | Algum número dela seria **fonte única** de verdade financeira/legal? | não — a verdade autoritativa mora (ou morará) no razão/subledger | sim |
| 3 | Alguma unicidade dela é invariante (idempotência, segurança)? | não — unicidade é só conveniência de UX | sim — precisa de `@@unique` real (preset é scan TOCTOU) |
| 4 | Toda escrita crítica pode passar por serviço `isSystem` com whitelist? | sim | não — há write-path fora do motor |

**Tripwires de plataforma** (qualquer um presente → Prisma, independente das 4 perguntas):
- Dinheiro que precisa de aritmética confiável (preset `currency` é float JSON; centavos int é convenção, não tipo).
- Hierarquia recursiva/self-relation (BOM, plano de contas — o motor não expressa).
- Atomicidade cross-tabela garantida pelo banco.
- **Lente setorial:** o regulador enxerga esta operação? (ex.: Bloco K enxerga produção/consumo; NF-e enxerga a venda). O que o auditor enxerga precisa de verdade autoritativa — a entidade pode *nascer* no motor, mas a verdade dela exige espelho Prisma via alfândega (Etapa 3).

## Etapa 2 — Dentro do motor: canônico selecionável × custom

**[SEL-002] Módulo é canônico selecionável quando pelo menos um vale: (a) mais de um vertical/tenant o usa; (b) tem comportamento cross-entidade (plugin/bridge o lê); (c) uma tela canônica o descobre. Caso contrário é extensão custom — aditiva e inerte (sem plugin, sem bridge, sem efeito fora de si).**

- Canônico → módulo em `presets/modules/<categoria>/`, composto por suíte em `systems/`, registrado em `tablePresetSuites`, com `providesCapabilities`/`requiresCapabilities` declarados. Gera via `dynamic-table-preset-generator`.
- Custom → nasce em runtime pelo usuário (tabela própria ou campo adicional); nenhum artefato de código.

**[SEL-003] Customização que toca módulo canônico (remover/renomear tabela ou campo que plugin/bridge/tela lê por nome) é zona de risco declarável: o motor hoje falha em silêncio (skip+log), não recusa. O Registro de Fronteira DEVE anotar quais nomes de tabela/campo são contrato implícito de código, citando os consumidores encontrados por grep.**

## Etapa 3 — Alfândega (mundo operacional → verdade autoritativa)

**[SEL-004] Entidade DynamicTable com consequência financeira exige alfândega nomeada no registro: evento (`<dominio>.<fato>`), bridge pós-commit, arquétipo de binding e chave de idempotência — e a idempotência SEMPRE mora no `@@unique` do model Prisma, nunca no preset. Arquétipo inexistente no catálogo é código de motor: registre como incremento próprio (com autorização do dono), nunca improvise postagem fora do binding.**

Checklist da alfândega no registro:
- [ ] Evento nomeado no vocabulário (`sale.*` como referência de forma).
- [ ] Bridge best-effort pós-commit + passada correspondente no job de reconcile.
- [ ] Arquétipo existente (`revenue_recognition | settlement | reversal | performance_liability | cogs | subledger_command`) ou incremento de catálogo sinalizado.
- [ ] `sourceType/sourceId` definidos para o `@@unique` do `JournalEntry` (ou do subledger alvo).
- [ ] Se o regulador enxerga a operação (lente setorial): qual registro fiscal consome esse espelho.

## Etapa 4 — Saída: Registro de Fronteira

**[SEL-005] A saída é um Registro de Fronteira no formato abaixo, com grau de evidência (verificado/inferido/assumido) por claim; a skill não implementa, não edita arquivo de aplicação e não substitui autorização citável do dono para o trabalho que recomenda.**

```
## Registro de Fronteira — <entidade>
- Camada: Prisma first-class | DynamicTable        [grau + evidência: qual pergunta/tripwire decidiu]
- Tipo (se DT): canônico selecionável | custom     [grau + critério a/b/c]
- Contratos implícitos de nome: <tabela.campo → consumidores>   (SEL-003)
- Alfândega: evento | bridge | arquétipo | idempotência | fiscal   (SEL-004; "n/a" só com justificativa)
- Riscos anotados: <ex.: alfândega incompleta a montante, aposta de produto pendente>
- Roteamento: <skills geradoras em ordem> — entregar ao luminaris-orchestrator
- Forks do dono: <decisões que esta skill NÃO pode tomar>
```

Roteamento típico: DynamicTable canônico → `dynamic-table-preset-generator` (+ plugin via contrato §2.2 se houver comportamento); Prisma → cadeia `backend-prisma-model-generator → repository → policy → service → dto → controller → route` (ou `fullstack-feature-generator`); alfândega → incremento de bridge/binding (sessão de planejamento).

## Limites declarados (onde esta skill falha em si mesma)

- **Não decide aposta de produto.** Ex.: manter `sales` no motor pressupõe a tese de customização por vertical — se essa premissa cai, a classificação muda. Premissa de produto contestada → fork do dono no registro, não decisão da skill.
- **O critério assume a alfândega íntegra.** Onde ela está furada a montante (ex.: entrada de estoque sem valoração), a classificação continua correta e o risco operacional continua real — o registro anota, não mascara.
- **Contratos implícitos são levantados por grep, não por prova.** Consumidor gerado dinamicamente pode escapar; o grau máximo desse claim é "inferido".

## When to use

- Antes de planejar/gerar qualquer módulo ou entidade nova (qualquer vertical).
- Ao classificar/organizar um módulo existente cuja camada está em dúvida.
- Ao avaliar um vertical novo (que capacidades ligam, o que é composição × o que é motor).

## When NOT to use

- Para implementar (roteie ao orquestrador/geradoras) ou para auditar skills (`skill-audit`).
- Para ratificar forks de produto — isso é do dono, via sessão de planejamento.
