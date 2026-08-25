# Índice de ADRs — Luminaris

> Registro de **decisões arquiteturais** do projeto (o "por quê / vencedor" durável). Ponteiro rápido
> para o orquestrador e revisores localizarem a decisão antes de re-decidir. Uma linha por documento;
> o arquivo é o índice — sem camada separada.
>
> **Convenção:** `ADR-<trilho><n>` = decisão; `D0-*` = registro de ratificação humana (gate G0) de uma fase.
> Onde uma decisão de módulo **não** tem ADR próprio, o ponteiro para onde ela vive está em §Fora-de-ADR.
> Última atualização: **2026-07-22**.

## Buildout contábil (INCR-*)

| ADR | Título | Status | Data | Classe |
|---|---|---|---|---|
| [INCR-1](ADR-INCR1-accounting-periods.md) | Períodos Contábeis + Gate de Fechamento | Accepted w/ amendments (ratif.) | 2026-06-27 | PRISMA_FIRST_CLASS |
| [INCR-2](ADR-INCR2-audit-trail.md) | AuditEvent append-only (hash-chain, tamper-evident) | Accepted w/ amendments (ratif.) | 2026-06-27 | PRISMA_FIRST_CLASS |
| [INCR-3](ADR-INCR3-entry-numbering.md) | Numeração sequencial gapless (Livro Diário) | Accepted w/ amendments (ratif.) | 2026-06-27 | PRISMA_FIRST_CLASS |
| [INCR-4](ADR-INCR4-bp-dre.md) | Demonstrações BP + DRE | Accepted w/ amendments (ratif.) | 2026-06-27 | READ_ONLY_REPORT |
| [INCR-7](ADR-INCR7-bank-reconciliation.md) | Conciliação Bancária (7 decisões) | Accepted w/ amendments (ratif. por delegação) — backend implementado (PRs #32–#37+) | 2026-07-03 | PRISMA_FIRST_CLASS |
| [INCR-8](ADR-INCR8-source-document-provenance.md) | Proveniência Formal (SourceDocument + JournalEntrySource) | Accepted — altitude A1 (seam fino) ratif.; impl. não iniciada (PRE-ADR fechado) | 2026-07-03 | PRISMA_FIRST_CLASS |
| [SPED-ECF](ADR-INCR-SPED-ECF-file-generation.md) | Geração do arquivo ECF (SPED Fiscal · IRPJ/CSLL · Lucro Presumido) | **FASE 2 implementada (commit `6192799`, não mergeada); Emenda FASE 2 corrigiu 3 pontos inferidos (C/E recuperados pelo PVA, numeração Bloco P, PVA computa o imposto — só segregamos receita bruta)** | 2026-07-12 | PRISMA_FIRST_CLASS (READ/EXPORT) |
| [RECIBOS](ADR-RECIBOS-pdf-generation.md) | Comprovante de lançamento em PDF (puppeteer HTML→PDF, sem persistência) | Accepted (escolha do dono do produto); backend Fase A+B **mergeado** (PR #84); dep nova puppeteer/Chromium → smoke-launch-gate no deploy | 2026-07-13 | READ_ONLY (geração de documento) |
| [INCR-AP](ADR-INCR-AP-accounts-payable.md) | Contas a Pagar operacional (`Payable`+`PayablePayment`, duplo fato gerador, `2.1.2 Fornecedores`) | **Accepted — RATIFICADO 2026-07-14** (F0→(a) `postEntry` direto; F1–F6 conforme recomendado); impl. + FE mergeados (PRs #102/#106) | 2026-07-14 | PRISMA_FIRST_CLASS |
| [INCR-APPROVAL](ADR-INCR-APPROVAL-maker-checker.md) | Torre de aprovação (maker-checker / SoD) — `Draft→PendingApproval→Posted` no `JournalEntry` | **Accepted — MERGEADO** (PR #108, `1f4ff78`); **Emenda F3 re-ratificada fork-a-fork 2026-07-14** (§9): SoD hard→desligada single-user (`enforcesSegregationOfDuties = owner≠actor`), staging usável, endurece via membership | 2026-07-14 | PRISMA_FIRST_CLASS |
| [INCR-AR](ADR-INCR-AR-accounts-receivable.md) | Contas a Receber (AR) operacional (`Receivable`+`ReceivableReceipt`, duplo fato gerador, conta dedicada `1.1.5`) | **Accepted — RATIFICADO FORK-A-FORK 2026-07-14; IMPLEMENTADO E MERGEADO** (PR #111 `87ab95b`, 2026-07-15; review indep. PASS; smoke-gate DEPLOY-CLEARED) — F7→(a) conta dedicada `1.1.5`; F0→(a) `postEntry` direto; F1–F6 espelho do AP | 2026-07-15 | PRISMA_FIRST_CLASS |
| [INCR-DIM](ADR-INCR-DIM-dimensions.md) | Dimensões (centro de custo/projeto) — `DimensionDefinition`+`DimensionValue`(hierárquico)+`PostingDimension`, etiqueta ortogonal ao ledger | **Accepted — RATIFICADO FORK-A-FORK 2026-07-15; IMPLEMENTADO E MERGEADO** (PR #113 `9a73392` + FE #116 `eeb33c1`; review indep. PASS; 1114/1114 jest; smoke-gate DEPLOY-CLEARED) — F0→CONSTRUIR build completa; F1→(a) catálogo Prisma; F2→(a) partida; F3→ponte + F4→N eixos; F5→(a) opcional/não-reabre-§4; F6→(a) razão/balancete + DRE por dimensão. **EMENDA 2026-07-15 (fork-a-fork): F5 emendado** por [DIM-COMPLETENESS](ADR-INCR-DIM-COMPLETENESS-mandatory-axis.md) → "opcional por padrão, condicionalmente obrigatória por flag de conta" (B1) | 2026-07-15 | PRISMA_FIRST_CLASS |
| [COUNTERPARTY](ADR-INCR-COUNTERPARTY-first-class.md) | Contraparte (Fornecedor/Cliente) first-class × ref DynamicTable — identidade do subledger p/ aging | **Accepted — RATIFICADO FORK-A-FORK 2026-07-15** (F-CP0→(a) sim; **F-CP1→A1** `Counterparty` Prisma first-class + FK — dono escolheu integridade máxima sobre a rec. A2 do par); impl. NÃO iniciada | 2026-07-15 | DECISÃO ARQUITETURAL |
| [AGING](ADR-INCR-AP-AR-AGING.md) | Aging / posição por contraparte (AP+AR) — report read-only por faixa de vencimento | **Accepted — RATIFICADO (F-AG0 humano + F-AG1..4 delegação) + IMPLEMENTADO + REVIEW PASS 2026-07-15** (branch `claude/incr-aging` @ `083ad5c`, PR #127 draft, empilhado sobre A1 #119); read-time, buckets fixos, OPEN+trânsito, só-aging (tie-out follow-on); read-only, SEM migração/smoke-gate; FE diferido | 2026-07-15 | READ_ONLY_REPORT |
| [DIM-COMPLETENESS](ADR-INCR-DIM-COMPLETENESS-mandatory-axis.md) | Completude da DRE por dimensão (opcional × obrigatório × bucket "Não alocado") — **EMENDA INCR-DIM F5** | **Accepted — RATIFICADO FORK-A-FORK 2026-07-15** (**F-DC0→B1** etiqueta obrigatória por classe de conta = flag `requiresDimension` por `Account` + gate no `postEntry`; inclui B0 bucket; NÃO reintroduz §4 — é gate de validação, não motor); impl. NÃO iniciada | 2026-07-15 | DECISÃO ARQUITETURAL |
| [INCR-INVENTORY](ADR-INCR-INVENTORY-stock-subledger.md) | Estoque — subrazão de inventário perpétuo + CMV (`InventoryItem`+`StockMovement`, custo médio móvel, `1.1.6 Estoques`/`4.2 CMV`, baixa de CMV via bridge de venda + entrada via seed manual + ponte de compra AP→estoque) | **Accepted — RATIFICADO FORK-A-FORK 2026-07-20 (via AskUserQuestion); IMPLEMENTADO E MERGEADO** (PR #130, merge `5c04bd1`, 2026-07-22; review indep. PASS por corpo; jest accounting 762/762; guard exaustivo do tie-out ganhou `salon.sale.cogs` `5590a3f`; residual = smoke-migration-gate no dev.db real + browser sign-off). Perna A (Prisma first-class perpétuo) + reuso máximo (F-INV2 bridge-only, CRUD público diferido); **F-INV1→custo médio móvel**; **F-INV3→seed manual + ponte compra AP→estoque** (merge destrava F-NFE5 → parser NF-e = **próximo incremento sequenciado** `ADR-INCR-NFE`). Insumo: council `plan-council` (A 3/4 lentes). Imobilizado = ADR próprio | 2026-07-20 | DECISÃO ARQUITETURAL |
| [INCR-NFE](ADR-INCR-NFE-fiscal-ingestion.md) | Ingestão fiscal de NF-e — parser puro `lib/nfe.ts` (XML→`ParsedNfe`) que pré-preenche a `Payable`/entrada de estoque (compra) e cruza com a venda de salão (venda), sem subrazão fiscal novo | **Accepted — RATIFICADO FORK-A-FORK 2026-07-20** (**F-NFE1→(b) COMPRA+VENDA** divergiu da rec. compra-only; F-NFE5→(a) impl bloqueada até PR #130 mergear; F-NFE6→(a) custo = `vProd−vDesc+vFrete+vOutro+vIPI+vICMS-ST`; F-NFE2→(a) `fast-xml-parser`; F-NFE3→(a) ingestão; F-NFE4→(a) `SourceDocument`); impl. NÃO iniciada (bloqueada por #130) | 2026-07-20 | INGESTÃO (reusa Payable/estoque/SourceDocument) |
| [RC](ADR-RC-SUBLEDGER-AP-AR-reuse-sanction.md) | Reuso vs. divergência sancionada AP × AR — where-builder de filtro compartilhado (`buildSubledgerFilterWhere`) + sanção por escrito da criação/liquidação | **Ratificado 2026-08-13 (dono, via sessão)** — extração escopada da fatia de listagem (espelho literal, F6/`ea91f406`); 5 pontos sancionados (direção contábil, estoque só-AP, `CrmReceivableBridge` só-AR, naming cosmético, cláusula viva); gatilhos de reversão (`if` de lado na função compartilhada; cópia manual de CAS num 3º subrazão). Pré-requisito de A2 Imobilizado / A3 Folha | 2026-08-13 | REUSE-VS-BESPOKE (gate de reuso) |

## Bridges de integração (venda DynamicTable → ledger Prisma)

| ADR | Título | Status | Data | Classe |
|---|---|---|---|---|
| [C01](ADR-C01-salon-sales-accounting-bridge.md) | Salon Sales Accounting Bridge (reconhecimento de receita) | Approved (R2/Q3 ratif.) | 2026-06-25 | PRISMA_FIRST_CLASS + origem DynamicTable |
| [D01](ADR-D01-settlement-reversal.md) | Settlement & Reversal (baixa de A Receber + estorno) | Retroactively ratified | 2026-06-26 | PRISMA_FIRST_CLASS + origem DynamicTable |
| [D0-d-settlement](D0-d-settlement-ratification.md) | Ratificação humana — fase D-settlement (gate G0) | Retroactively ratified | 2026-06-26 | (registro de ratificação) |
| [D0-d-reversal](D0-d-reversal-ratification.md) | Ratificação humana — fase D-reversal (gate G0) | Retroactively ratified | 2026-06-26 | (registro de ratificação) |
| [CRM-SEAM](ADR-CRM-SEAM-revenue-recognition.md) | Reconhecimento de receita do seam CRM → razão (forks F1–F4: subrazão AR × direta, binding conta-por-papel, guard terminal, `Won` imbookável) | **Draft — PRE-ADR, ratificação humana PENDENTE (§5.1)**; origem: Design Council CRM 2026-07-20 (resolução D1); nenhum código de receita CRM→razão antes da assinatura do dono + kit D6 verde | 2026-07-20 | PRISMA_FIRST_CLASS + origem DynamicTable (seam CRM) |

## CRM — molde salão (modelagem de produto)

| ADR | Título | Status | Data | Classe |
|---|---|---|---|---|
| [CRM-LEAD-OPP](ADR-CRM-lead-opportunity-model.md) | Modelo de produto Lead × Opportunity no molde salão (quantas pipelines de valor; portadora de fechamento) | **Draft — PRE-ADR, ratificação humana PENDENTE (§5.1)**; devolvido ao dono pelo board v3 (D3: 4 defer + 1 abstain); recomendação = interino reversível (ocultar 2ª pipeline sem deletar código) | 2026-07-20 | PRODUTO / MODELAGEM DE MOLDE (DynamicTable) |

## Fábrica de verticais (Parte B do roadmap — `docs/ROADMAP-PLATAFORMA.md`)

| ADR | Título | Status | Data | Classe |
|---|---|---|---|---|
| [P1](ADR-P1-binding-press.md) | A Prensa — engine de binding em tempo de geração (1 intérprete fixo de runtime + N bindings compilados; substitui mappers à mão) | **Accepted — RATIFICADO FORK-A-FORK 2026-08-21** (via AskUserQuestion, após parecer independente [PARECER-ARCHITECT-ADR-P1](PARECER-ARCHITECT-ADR-P1.md)): F-P1-1→(b) 2 classes de arquétipo; F-P1-2→(b) tabela Prisma `AccountingBinding`; F-P1-3→(a) swap do salão pós-golden; F-P1-4→(a) dinheiro no intérprete + discriminador; F-P1-5→(a) papel→conta na compilação; F-P1-6→(b1) validate-only (emenda §8); F-P1-7→módulo irmão `features/accountingBinding/`; 6 emendas do parecer aceitas (§11); **pré-condição de PVA REVOGADA pelo dono** — impl. autorizada, nó ⏳ | 2026-08-21 | DECISÃO ARQUITETURAL (fronteira §2.1 / pipeline de geração) |
| [BINDING-FEEDER](ADR-INCR-BINDING-FEEDER.md) | O alimentador — bindings `Active` do banco chegando ao dispatcher (`AccountingSyncService`), fechando o gap entre `POST /accounting-binding/compile` e o runtime | **Accepted — RATIFICADO PELO DONO 2026-08-22** (via AskUserQuestion, duas rodadas, sobre `docs/accounting/BE-INCR-BINDING-FEEDER-brief.md`): F-FEEDER-1→ADR próprio (não emenda ao P1); F-FEEDER-2→`factory.ts` DENTRO do perímetro zero-diff do P2 (emenda incorporada ao `ADR-P2-second-vertical.md` §2); F-FEEDER-3→chave composta `unitId:sourceType` no `Map` de mappers (fora do BRIEF original, medição posterior; premissa de unicidade de `unitId` ABERTA); F-FEEDER-4→boot FALHA sem binding `Active`; F-FEEDER-5→PRÉ-BOOT (`server.ts` aguarda o alimentador antes de `listen()` — 1ª vez que o bootstrap bloqueia; Qdrant é fire-and-forget, precedente contrário); F-FEEDER-6→migração de dado via `BindingCompileService.compile()` real (não seed, não auto-compilação no boot), encaixa no job do ADR-M2 decisão 4; impl. NÃO iniciada | 2026-08-22 | DECISÃO ARQUITETURAL (bootstrap / dispatcher) |
| [P2](ADR-P2-second-vertical.md) | O segundo vertical — prova da prensa (setor novo sem diff em motor/ledger/intérprete/`factory.ts`; entrevista→ERP→fechamento→ECD própria; métrica *time-to-first-ECD*) | **Draft — F-P2-1 RATIFICADO 2026-08-21 → CLÍNICA ESTÉTICA** (corroborado por OQ-1 do dossiê: barbearia casaria o preset beautySalon existente e a prova seria vácua); F-P2-2 RATIFICADO 2026-08-22 → (a) tenant-fixture sintético; **EMENDA 2026-08-22 ao §2 incorporada**: `server/src/lib/factory.ts` entra no perímetro zero-diff (recomendação do [PARECER-ARCHITECT-ADR-P2](PARECER-ARCHITECT-ADR-P2.md) §1.5, alcançável só após [BINDING-FEEDER](ADR-INCR-BINDING-FEEDER.md) Accepted); F-P2-3 aberto por dependência (H1/PVA); F-P2-4 pendente | 2026-08-21 (emenda 2026-08-22) | PROVA DE PRODUTO (preset + binding; zero código de motor) |

Plano-sequência dos degraus (gates humanos → P1 → P2): `docs/PLANO-MODULO-COMPLETO-REPLICAVEL.md`.

## Plataforma (não-contábil)

| ADR | Título | Status | Data | Classe |
|---|---|---|---|---|
| [ANALYTICS-DEFS](ADR-ANALYTICS-DEFS-write-unblock.md) | Escrita de definições de analytics — destravar × apagar as rotas × manter congelado (forks F-AD0..F-AD6) | **Accepted (parcial) — F-AD0 → (c) MANTER CONGELADO, ratificado 2026-08-01**; barreira implementada e mutation-testada (`DynamicTableService.systemTableWriteLock.test.ts`, 8 casos). **F-AD6 → (a) MANTER, RATIFICADO POR SINAL HUMANO 2026-08-02** (dono confirmou superfície de execução ad-hoc de KPI no roadmap) — **duas análises independentes rodaram o `_REUSE-CRITERION.md` e divergiram na Etapa 1** (§2.4 "diferente em espécie" × §2.6 "mesmo objeto"); **convergem em que o critério NÃO obriga (c)**, e a §2.6 concede a §2.4. **Objeção de (b) registrada e NÃO vista pelo dono ao decidir: F-AD6.5.** Consertos do passivo de `custom-kpis` **fechados por PR #162** (doc no controller 137→138, teste, teto por recusa, `tableId` divergente → 400) + comentário da policy por `424bc56`; **furo do gate de wiring FECHADO** (`route-spec-wiring.test.ts`, mutation-testado 4/4). **3 sessões paralelas tocaram este fork** — nota de colisão em F-AD6.6. **F-AD5 (a tela) segue ABERTO**; F-AD1..F-AD4 dormentes. Origem: achado N1 da revisão independente do PR #157 (`6500249`) | 2026-08-01 (emendas 2026-08-02) | DECISÃO ARQUITETURAL (DynamicTable / policy) |
| [M2-DEPLOY](ADR-M2-deploy-topology.md) | Topologia de deploy — VPS própria com encaixe CLEAN para PaaS, uma instância por cliente, BYOK por env da instância, migração como etapa separada do pipeline | **Accepted — RATIFICADO PELO DONO 2026-08-22** (via `AskUserQuestion`, sem fork/parecer intermediário): (1) alvo→VPS própria agora + encaixe CLEAN p/ PaaS; (2) topologia→1 instância/cliente; (3) BYOK→chave de IA do cliente, custo zero de código, KMS/BYOC explicitamente fora de escopo; (4) migração→job próprio separado do swap de container, nunca boot/manual. Desbloqueia a pré-condição de alvo do `RUNBOOK-M2-DEPLOY-SMOKE.md`; **aberto:** VPS/provedor concreto, Qdrant gerenciado ou não | 2026-08-22 | DECISÃO ARQUITETURAL (deploy / infraestrutura) |

## Fora-de-ADR — decisões de módulo que vivem em outro lugar

Nem todo incremento tem ADR próprio; alguns foram documentados por brief ou ainda estão pré-ADR.
Registrado aqui para a rastreabilidade não ter buraco silencioso:

| Módulo | Onde a decisão vive | Estado |
|---|---|---|
| INCR-5 Anexos/Evidências | `docs/accounting/BE-INCR5-attachments-evidence-brief.md` | Mergeado (sem ADR dedicado) |
| INCR-6 Data Exchange (import/export) | `docs/accounting/BE-INCR6-data-exchange-brief.md` (+ closeouts) | Mergeado (sem ADR dedicado) |
| ~~INCR-7 Conciliação Bancária~~ | ~~PRE-ADR~~ → **backend implementado** [ADR-INCR7](ADR-INCR7-bank-reconciliation.md) | 7 decisões travadas 2026-07-03; backend mergeado (PRs #32–#37+); FE deferido |
| Roadmap/decisões travadas & rejeitadas | `docs/accounting/ACCOUNTING-MASTER-MAP.md` (§1, §4) | Fonte de verdade do roadmap |
| ADR-B01 (idempotência AccountingSync) | referenciado por C01/D01 como *Related* | **Ausente deste dir** — decisão vive na memória `accounting-sync-b1` |

> **Manutenção:** ao ratificar um ADR novo, adicione uma linha aqui na mesma tarefa (é o passo de
> closeout, não trabalho separado). Ao promover um incremento no master map (`ORCH-007`), confira
> se a decisão correspondente tem entrada aqui.
