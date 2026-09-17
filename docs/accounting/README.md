# `docs/accounting/` — índice por categoria (2026-09-14)

> **Como usar:** a pasta é plana de propósito (~130 arquivos na raiz; mover quebraria ~60 referências em
> memória, skills e testes, e conflitaria com PRs em voo). Este índice é a organização. **Status** aqui é
> apontador para a evidência (PR/sha/cédula), não a evidência — em dúvida, o [master map](ACCOUNTING-MASTER-MAP.md)
> vence, e `git merge-base --is-ancestor <sha> origin/main` é o oráculo de "mergeado".
> Legenda: ✅ mergeado em `main` · 🔄 em voo (PR aberto / branch) · 📐 spec pronta (BRIEF, forks
> ratificados) · ⏸ BRIEF com forks pendentes · 📜 histórico (superado, mantido por registro) · 🧑 gate
> humano em branco.

## 1. Fonte de verdade (leia estes três primeiro)

| Doc | Papel | Estado 14/09 |
|---|---|---|
| [`ACCOUNTING-MASTER-MAP.md`](ACCOUNTING-MASTER-MAP.md) | grafo-mestre reconciliado: §1 travadas · §4 rejeitadas · §5 diferidos · **§5.1 fila** · **§7.1 régua** · fold no topo | régua **44/57**; último fold: 17/09 sessão 5 (#342, C6b ✅) |
| [`GRAFO-DEPENDENCIAS-2026-09-14.md`](GRAFO-DEPENDENCIAS-2026-09-14.md) | dependências nó a nó + algoritmo do próximo nó (R6) | vigente — supersede [09-11](GRAFO-DEPENDENCIAS-2026-09-11.md) 📜 e [09-07](GRAFO-DEPENDENCIAS-2026-09-07.md) 📜 |
| [`PROXIMOS-PASSOS-2026-09-17.md`](PROXIMOS-PASSOS-2026-09-17.md) | prompt de orquestração pós-C6b + **detalhamento por passo** (sucede o 09-14, que fechou 11/12) | vigente — 1 ✅ #338, 2 ✅ #340, 3 ✅ #339, 4–8 [H] |

## 2. Cédulas de decisão (citáveis, ORCH-006) — cronológicas

| Data | Doc | O que fixou |
|---|---|---|
| 08-31 | [`CEDULA-DECISAO-2026-08-31.md`](CEDULA-DECISAO-2026-08-31.md) | forks das ondas 1/2 (BRIEFS-WAVE*) |
| 09-03 | [`CEDULA-DECISAO-2026-09-03-modulos.md`](CEDULA-DECISAO-2026-09-03-modulos.md) | partição contábil/financeiro/fiscal (F-M1..M7), camada zero F-Z0, escopo máximo |
| 09-03 | [`CEDULA-DECISAO-2026-09-03-integracao.md`](CEDULA-DECISAO-2026-09-03-integracao.md) | denominador do Núcleo 3 (integração), regra (j) do D3 |
| 09-07 | [`CEDULA-DECISAO-2026-09-07-forks-sdd.md`](CEDULA-DECISAO-2026-09-07-forks-sdd.md) | forks do plano SDD sequencial; delegação de ratificação por recomendação |
| 09-10 | [`CEDULA-DECISAO-2026-09-10-entrevista.md`](CEDULA-DECISAO-2026-09-10-entrevista.md) | 23 respostas + 4 forks → re-baseline 49→57 |
| 09-14 | [`CEDULA-DECISAO-2026-09-14-gates-humanos.md`](CEDULA-DECISAO-2026-09-14-gates-humanos.md) (#318) | 16/16 respostas; **superada em R6/R5/#315/R8-texto** pela irmã abaixo |
| 09-14 | [`CEDULA-DECISAO-2026-09-14-forks-ratificacoes.md`](CEDULA-DECISAO-2026-09-14-forks-ratificacoes.md) (#319) | R5..R10, F-X6-1..6, SEED-MY/X4-14/#315/C8 — **prevalece onde diverge** |
| 09-16 | [`CEDULA-DECISAO-2026-09-16-forks-c11-c12-c6b-c8-seed.md`](CEDULA-DECISAO-2026-09-16-forks-c11-c12-c6b-c8-seed.md) | 20/20 forks C11·C12·C6b·C8·SEED-MY ratificados (todos na recomendação); C11 ✅ #334 na mesma sessão; C12/C6b/C8 `ready`, sem "executa" |

## 3. BRIEFs por nó — backend

| Nó / incremento | Doc | Status | Evidência |
|---|---|---|---|
| INCR-2 auditoria | [`INCR2-execution-brief.md`](INCR2-execution-brief.md) | ✅ | ADR-INCR2 |
| INCR-3 numeração | [`INCR3-execution-brief.md`](INCR3-execution-brief.md) | ✅ | ADR-INCR3; smoke-gate 001 |
| INCR-4 BP/DRE | [`INCR4-execution-brief.md`](INCR4-execution-brief.md) | ✅ | ADR-INCR4 |
| INCR-5 anexos/evidência | [`BE-INCR5-attachments-evidence-brief.md`](BE-INCR5-attachments-evidence-brief.md) · [`BE-INCR5-closeout.md`](BE-INCR5-closeout.md) · [`BE-INCR5-VALIDATION-STATUS.md`](BE-INCR5-VALIDATION-STATUS.md) | ✅ 📜 | closeout |
| INCR-6 / 6B import-export | [`BE-INCR6-data-exchange-brief.md`](BE-INCR6-data-exchange-brief.md) · [`BE-INCR6B-import-closeout.md`](BE-INCR6B-import-closeout.md) · [`ADR-INCR6B-import-idempotency.md`](ADR-INCR6B-import-idempotency.md) (ADR fora de `docs/adr/` — histórico, não mover) | ✅ 📜 | closeout; `fixtures/incr6-validation/` |
| INCR-7 OFX / CNAB / conciliação | [`BE-INCR7-OFX-scope-brief.md`](BE-INCR7-OFX-scope-brief.md) · [`BE-INCR7-CNAB-scope-brief.md`](BE-INCR7-CNAB-scope-brief.md) · [`BE-INCR7-reconciliation-scope-brief.md`](BE-INCR7-reconciliation-scope-brief.md) | ✅ | #59 · #61 (parser de **extrato** CNAB-E) · ADR-INCR7 |
| INCR-8 proveniência | [`BE-INCR8-source-document-provenance-scope-brief.md`](BE-INCR8-source-document-provenance-scope-brief.md) | ✅ | #43 |
| INCR-9 / 9B referencial RFB | [`BE-INCR9-referential-chart-mapping-scope-brief.md`](BE-INCR9-referential-chart-mapping-scope-brief.md) · [`BE-INCR9B-referential-catalog-scope-brief.md`](BE-INCR9B-referential-catalog-scope-brief.md) · [`BE-INCR9B-fork2-rfb-catalog-transcription-spec.md`](BE-INCR9B-fork2-rfb-catalog-transcription-spec.md) | ✅ (Fork 2 = X2 🧑) | #58 · #71 · #74 |
| SPED ECD / Apuração / ECF Fase 2 | [`BE-INCR-SPED-ECD-scope-brief.md`](BE-INCR-SPED-ECD-scope-brief.md) · [`BE-INCR-SPED-APURACAO-scope-brief.md`](BE-INCR-SPED-APURACAO-scope-brief.md) · [`BE-INCR-SPED-ECF-scope-brief.md`](BE-INCR-SPED-ECF-scope-brief.md) · [`BE-INCR-SPED-ECF-layout-transcription.md`](BE-INCR-SPED-ECF-layout-transcription.md) | ✅ (PVA = H1 🧑) | #62 · #63 · #78 |
| **X4** ECF Fase 3 Lucro Real | [`BE-INCR-SPED-ECF-FASE3-lucro-real-brief.md`](BE-INCR-SPED-ECF-FASE3-lucro-real-brief.md) (esqueleto) · [`BE-INCR-SPED-ECF-FASE3B-blocos-LMN-brief.md`](BE-INCR-SPED-ECF-FASE3B-blocos-LMN-brief.md) · [`BE-INCR-SPED-ECF-FASE3C-parte-b-brief.md`](BE-INCR-SPED-ECF-FASE3C-parte-b-brief.md) · [`BE-INCR-SPED-ECF-FASE3-layout-transcription-LMN.md`](BE-INCR-SPED-ECF-FASE3-layout-transcription-LMN.md) · [`RECONFERENCIA-ECF-FASE3-2026-09-10.md`](RECONFERENCIA-ECF-FASE3-2026-09-10.md) | ✅ parcial; **X4-14** ⬜ (item 14 do 3C) | #263 · #313 · #316 |
| NF-e (ingestão) | [`BE-INCR-NFE-destino-brief.md`](BE-INCR-NFE-destino-brief.md) · [`BE-INCR-NFE-fase-b-spec.md`](BE-INCR-NFE-fase-b-spec.md) · [`BE-INCR-NFE-impl-plan.md`](BE-INCR-NFE-impl-plan.md) · [`BE-INCR-NFE-integration-plan.md`](BE-INCR-NFE-integration-plan.md) · [`BE-INCR-NFE-layout-transcription.md`](BE-INCR-NFE-layout-transcription.md) · [`BE-INCR-NFE-fixtures-README.md`](BE-INCR-NFE-fixtures-README.md) · [`BE-INCR-NFE-PREVIEW-brief.md`](BE-INCR-NFE-PREVIEW-brief.md) | ✅ | #267 · #283 (preview) · #286 (UI) |
| **X6** custo D3 por regime | [`BE-INCR-NFE-COST-REGIME-brief.md`](BE-INCR-NFE-COST-REGIME-brief.md) | 📐 forks ✅ (5a + F-X6-3 **b**) — **emenda do BRIEF antes da feature** | #309; cédula #318 §1 |
| CNPJ alfanumérico | [`BE-INCR-CNPJ-ALFA-brief.md`](BE-INCR-CNPJ-ALFA-brief.md) | ✅ | #280 |
| Estoque | [`BE-INCR-INVENTORY-impl-plan.md`](BE-INCR-INVENTORY-impl-plan.md) · [`BE-INCR-INVENTORY-TIEOUT-brief.md`](BE-INCR-INVENTORY-TIEOUT-brief.md) · [`BE-INCR-PURCHASE-PHYSICAL-SYNC-brief.md`](BE-INCR-PURCHASE-PHYSICAL-SYNC-brief.md) | ✅ | #130 · #259 (LAC) · #267 (LAC-E) |
| Contraparte NOT NULL | [`BE-INCR-COUNTERPARTY-NOTNULL-brief.md`](BE-INCR-COUNTERPARTY-NOTNULL-brief.md) | ✅ | #196 |
| Filtros de subrazão | [`BE-INCR-SUBLEDGER-FILTERS-brief.md`](BE-INCR-SUBLEDGER-FILTERS-brief.md) | ✅ | #190 (+FE #191) |
| Proveniência anexada (seam) | [`BE-INCR-PROVENANCE-ATTACH-brief.md`](BE-INCR-PROVENANCE-ATTACH-brief.md) | ✅ | #228 |
| Máscara em campo livre da auditoria | [`BE-INCR-AUDIT-FREETEXT-MASK-brief.md`](BE-INCR-AUDIT-FREETEXT-MASK-brief.md) | ✅ | #301 |
| Prensa de binding (P1) | [`BE-INCR-BINDING-PRESS-brief.md`](BE-INCR-BINDING-PRESS-brief.md) · [`BE-INCR-BINDING-FEEDER-brief.md`](BE-INCR-BINDING-FEEDER-brief.md) · dossiês P1 (§6) | ✅ | #211 · #213 |
| Rename salon→sale (RN) | [`BE-INCR-RN-salon-to-sale-brief.md`](BE-INCR-RN-salon-to-sale-brief.md) | ✅ | #222 |
| **C10** P2 clínica | [`BE-INCR-P2-VERTICAL-CLINICA-brief.md`](BE-INCR-P2-VERTICAL-CLINICA-brief.md) · [`P2-DOSSIER-prova.md`](P2-DOSSIER-prova.md) | ✅ 10/11; comportamento 11 🔄 **PR #320** | #282; ADR-P2 EMENDA R7 |
| Onboarding — 1ª unidade (I1) | [`BE-INCR-ONBOARDING-FIRST-UNIT-brief.md`](BE-INCR-ONBOARDING-FIRST-UNIT-brief.md) · [`ONBOARDING-WIZARD-plano-grafo-brief.md`](ONBOARDING-WIZARD-plano-grafo-brief.md) | ⏸ BRIEF (wizard: 18 nós, 21 forks pendentes) | #271/#273 (plano); memória `onboarding-wizard-plano-grafo` |
| Pendências do reconcile (rodada 3) | [`BE-INCR-RECONCILE-PENDING-brief.md`](BE-INCR-RECONCILE-PENDING-brief.md) · [`F-W2F-4-DOSSIE.md`](F-W2F-4-DOSSIE.md) | ✅ (+ C7r) | #296 · #308 |
| **F3** baixa parcial AP/AR | [`BE-INCR-PARTIAL-SETTLEMENT-brief.md`](BE-INCR-PARTIAL-SETTLEMENT-brief.md) | ✅ | #307 |
| **C6** entrega ao contador | [`BE-INCR-CONTADOR-DELIVERY-brief.md`](BE-INCR-CONTADOR-DELIVERY-brief.md) | ✅ | #305 |
| **F7** baixa por retorno bancário | [`BE-INCR-BANK-SETTLEMENT-brief.md`](BE-INCR-BANK-SETTLEMENT-brief.md) | ✅ (forks → a, 15/09) | #326 |
| **C11** revisão profissional editável | [`BE-INCR-REVIEW-LAYER-brief.md`](BE-INCR-REVIEW-LAYER-brief.md) | ✅ BRIEF · 6 forks ao dono | #321 |
| **C12** máscaras de identidade no SPED | [`BE-INCR-SPED-IDENTITY-MASKS-brief.md`](BE-INCR-SPED-IDENTITY-MASKS-brief.md) | ✅ BRIEF · 4 forks ao dono | #322 |
| **C6b** pacote ampliado ao contador | [`BE-INCR-CONTADOR-PACKAGE-EXTENDED-brief.md`](BE-INCR-CONTADOR-PACKAGE-EXTENDED-brief.md) · [`…-execution-plan.md`](BE-INCR-CONTADOR-PACKAGE-EXTENDED-execution-plan.md) | ✅ **MERGEADO 17/09** — PR-1 #337 · PR-2 #338 · PR-3 #340 `373d00d4`; contábil 19/22 | #324 · #333 · #336 · #337 · #338 · #340 |
| **SEED-MY** seed multi-exercício | [`SEED-MULTI-EXERCICIO-brief.md`](SEED-MULTI-EXERCICIO-brief.md) | ✅ BRIEF · bloqueado até B-4 | #325 |
| **X6** custo D3 por regime | [`BE-INCR-NFE-COST-REGIME-brief.md`](BE-INCR-NFE-COST-REGIME-brief.md) | ✅ (emenda 15/09 + ERRATA) | #327 · #328 |
| **C8** imobilizado + depreciação | [`BE-INCR-FIXED-ASSETS-brief.md`](BE-INCR-FIXED-ASSETS-brief.md) · [ADR](../adr/ADR-INCR-FIXED-ASSETS.md) | ✅ ADR+BRIEF · F-FA10/12/13 ao dono; execução não autorizada | #330 |
| **X12** · **X7/X8/X9** · **X10b** | — | ⬜ sem BRIEF (ver grafo §3) | — |
| Ondas paralelas de 08/2026 | [`BRIEFS-WAVE1.md`](BRIEFS-WAVE1.md) · [`BRIEFS-WAVE2-BACKEND.md`](BRIEFS-WAVE2-BACKEND.md) · [`BRIEFS-WAVE2-SCHEMA.md`](BRIEFS-WAVE2-SCHEMA.md) · [`BRIEFS-WAVE2-FE.md`](BRIEFS-WAVE2-FE.md) | ✅ 📜 (estado de fork lá pode estar desatualizado — o master map vence) | cédula 08-31; `pr-bodies/` |

## 4. BRIEFs por nó — frontend

| Tela | Doc | Status | Evidência |
|---|---|---|---|
| FE-INCR-1 (ledger) | [`FE-INCR1-execution-brief.md`](FE-INCR1-execution-brief.md) · [`FE-INCR1-functional-validation.md`](FE-INCR1-functional-validation.md) · [`FE-INCR1-VALIDATION-STATUS.md`](FE-INCR1-VALIDATION-STATUS.md) | ✅ 📜 | 06/2026 |
| FE-INCR-6 import/export | [`FE-INCR6-import-export-validation-plan.md`](FE-INCR6-import-export-validation-plan.md) · [`FE-INCR6-functional-validation.md`](FE-INCR6-functional-validation.md) · [`FE-INCR6-VALIDATION-STATUS.md`](FE-INCR6-VALIDATION-STATUS.md) | ✅ 📜 | 07/2026 |
| FE-INCR-7 conciliação | [`FE-INCR7-reconciliation-plan.md`](FE-INCR7-reconciliation-plan.md) | ✅ 📜 | — |
| Aging AP/AR | [`BRIEF-FE-AGING.md`](BRIEF-FE-AGING.md) | ✅ | #248 |
| Ações da venda / valoração da compra / date-only | [`FE-INCR-SALE-ACTIONS-brief.md`](FE-INCR-SALE-ACTIONS-brief.md) · [`FE-INCR-PURCHASE-VALUATION-brief.md`](FE-INCR-PURCHASE-VALUATION-brief.md) · [`FE-FIX-DATEONLY-UTC-brief.md`](FE-FIX-DATEONLY-UTC-brief.md) | ✅ (LAC) · date-only: 13 sites instrumentados (GAP-MAP nº 5) | #259 |
| Ativação do binding (LAC-B, UI da prensa) | [`FE-INCR-BINDING-ACTIVATION-brief.md`](FE-INCR-BINDING-ACTIVATION-brief.md) | 📐 forks ratificados 09-02; **não mergeado** | #273 (ativada na fila) |
| NF-e (UI) | [`FE-INCR-NFE-brief.md`](FE-INCR-NFE-brief.md) | ✅ | #286 |
| Auditoria + proveniência no painel | [`FE-INCR-AUDIT-PROVENANCE-brief.md`](FE-INCR-AUDIT-PROVENANCE-brief.md) | ✅ | #293 |
| Compliance 2 (ECF Real + import catálogo) | [`FE-INCR-COMPLIANCE-2-brief.md`](FE-INCR-COMPLIANCE-2-brief.md) | ✅ | #295 |
| Caixa projetado | [`FE-INCR-CASH-FORECAST-brief.md`](FE-INCR-CASH-FORECAST-brief.md) | ✅ | #298 |
| e-Lalur/e-Lacs (aba Compliance) | [`FE-INCR-LALUR-brief.md`](FE-INCR-LALUR-brief.md) | ✅ PR 1 (#315); **PR 2** (M410 + fechar + diagnóstico) `ready` | #315 |

## 5. Gates humanos — runbooks (todos 🧑 em branco em 14/09; `grep "^- \[x\]"` = 0)

| Gate | Doc | Pré-condição / nota |
|---|---|---|
| B-4 ensaio de restauração | [`RUNBOOK-B4-RESTORE-REHEARSAL.md`](RUNBOOK-B4-RESTORE-REHEARSAL.md) | executado **por referência SQL** no #318; **não assinado** — pré-condição do SEED-MY |
| X2 import referencial RFB | [`RUNBOOK-X2-RFB-REFERENCIAL.md`](RUNBOOK-X2-RFB-REFERENCIAL.md) | arquivo baixado 31/08 |
| H1 PVA (Presumido) + 2ª passada (Real) | [`RUNBOOK-H1-PVA.md`](RUNBOOK-H1-PVA.md) | 2P-1..2P-4 preparados; alvo passa a ser o seed multi-exercício (decisão 12/09) |
| H2 sign-off de browser · wizard | [`RUNBOOK-H2-BROWSER-SIGNOFF.md`](RUNBOOK-H2-BROWSER-SIGNOFF.md) · [`RUNBOOK-H2-WIZARD-ENTREVISTA.md`](RUNBOOK-H2-WIZARD-ENTREVISTA.md) | ganha passo "cadastrar perfil fiscal" quando X6 mergear |
| H3 sign-off P2 clínica | [`RUNBOOK-H3-P2-CLINICA.md`](RUNBOOK-H3-P2-CLINICA.md) | depende de H1 e C10 |
| M2 host + 1º deploy | [`RUNBOOK-M2-DEPLOY-SMOKE.md`](RUNBOOK-M2-DEPLOY-SMOKE.md) | ainda não sabe de certificado A1 nem conta por unidade (R8) — atualizar antes de executar |
| Preflight dos gates (agente) | [`KITS-PREFLIGHT-2026-09-02.md`](KITS-PREFLIGHT-2026-09-02.md) | preparação, **não** evidência |

## 6. Dossiês, contador, auditorias e registros

| Grupo | Docs | Estado |
|---|---|---|
| Dossiês P1 (prensa) | [`P1-DOSSIER-arquetipos.md`](P1-DOSSIER-arquetipos.md) · [`P1-DOSSIER-schema-binding.md`](P1-DOSSIER-schema-binding.md) · [`P1-DOSSIER-interprete.md`](P1-DOSSIER-interprete.md) · [`P1-DOSSIER-validador.md`](P1-DOSSIER-validador.md) · [`P1-DOSSIER-golden-test.md`](P1-DOSSIER-golden-test.md) | ✅ 📜 (base do #211) |
| Contador (D1) | [`PEDIDO-CONTADOR-2026-09-03.md`](PEDIDO-CONTADOR-2026-09-03.md) · [`TRIAGEM-CONTADOR-2026-09-03-SIMULACAO.md`](TRIAGEM-CONTADOR-2026-09-03-SIMULACAO.md) | pedido pronto; **4 linhas novas** a acrescentar (plano 14/09 passo 11); envio = dono |
| Auditoria 08/2026 | [`AUDIT-2026-08-15.md`](AUDIT-2026-08-15.md) · [`TRIAGEM-AUDIT-2026-08-15.md`](TRIAGEM-AUDIT-2026-08-15.md) | 📜 (bancada desligada 09/08) |
| Councils 07/2026 | [`COUNCIL-BOARD-2026-07-20-decisions-review.md`](COUNCIL-BOARD-2026-07-20-decisions-review.md) · [`…-v1-v2-comparison.md`](COUNCIL-BOARD-2026-07-20-v1-v2-comparison.md) · [`…-v2-rebuttal.md`](COUNCIL-BOARD-2026-07-20-v2-rebuttal.md) | 📜 (decisões viraram ADR-CRM-*) |
| Registros pontuais | [`LIMITE-MAX-CENTS.md`](LIMITE-MAX-CENTS.md) (teto é política, BigInt desde #245) · [`PRE-DADOS-REAIS-2026-08-30.md`](PRE-DADOS-REAIS-2026-08-30.md) (inventário de 16 itens) | ✅ 📜 |

## 7. Smoke-migration gates (um por migração; histórico de deploy-clear)

`SMOKE-MIGRATION-GATE-001` · `-INCR1-INCR2-DEPLOY` · `-INCR3-POSTFIX-DEPLOY` · `-BE-INCR6` · `-BE-INCR7` ·
`-BE-INCR7-DEPLOY` · `-BE-INCR9` · `-BE-INCR9B` · `-INCR-AP` · `-INCR-AR` · `-INCR-DIM` · `-INCR-COUNTERPARTY-DIM-RUNBOOK` ·
`-INCR-COUNTERPARTY-NOTNULL` · `-INCR-INVENTORY` · `-INCR-NFE` · `-D1-JOURNAL-DATE-INDEX` (16 arquivos). Regra viva:
`npm run smoke:migration` a cada migração nova; S6/S7 são falsos positivos documentados em `RUNBOOK-H1-PVA.md` P2b.

## 8. Planejamento histórico (📜 — banner no topo de cada um; não use para escolher nó)

| Doc | Superado por |
|---|---|
| [`PLANEJAMENTO-buildout-contabil.md`](PLANEJAMENTO-buildout-contabil.md) → [`…-v2.md`](PLANEJAMENTO-buildout-contabil-v2.md) | ADRs INCR1–4 (v2 foi a fonte de execução) |
| [`LEITURA-DA-FILA-2026-08-28.md`](LEITURA-DA-FILA-2026-08-28.md) · [`PROXIMOS-PASSOS-2026-08-28.md`](PROXIMOS-PASSOS-2026-08-28.md) → [`08-31`](PROXIMOS-PASSOS-2026-08-31.md) → [`09-01`](PROXIMOS-PASSOS-2026-09-01.md) → [`09-02`](PROXIMOS-PASSOS-2026-09-02.md) → [`09-14`](PROXIMOS-PASSOS-2026-09-14.md) | [`PROXIMOS-PASSOS-2026-09-17.md`](PROXIMOS-PASSOS-2026-09-17.md) |
| [`PLANO-SDD-SEQUENCIAL-2026-09-07.md`](PLANO-SDD-SEQUENCIAL-2026-09-07.md) (rodadas 1–13) | rodadas 1/2a/2b/3/4/5/7/8/9 ✅, 10 = X6 📐; o resto vive no grafo 14/09 |
| [`GRAFO-DEPENDENCIAS-2026-09-07.md`](GRAFO-DEPENDENCIAS-2026-09-07.md) → [`09-11`](GRAFO-DEPENDENCIAS-2026-09-11.md) | [`GRAFO-DEPENDENCIAS-2026-09-14.md`](GRAFO-DEPENDENCIAS-2026-09-14.md) |

## 9. Subpastas

- [`fontes-oficiais/`](fontes-oficiais/LEIA-ME.md) — corpus de 23 normas (`MANIFEST.md` com sha256), em `main` desde #311.
- [`fixtures/incr6-validation/`](fixtures/incr6-validation/README.md) — fixtures da validação do INCR-6.
- `pr-bodies/` — corpos das PRs 1–7 do lote paralelo de 07/2026.
