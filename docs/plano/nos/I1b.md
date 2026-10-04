---
id: "I1b"
tipo: "plataforma"
dominio: "plataforma"
titulo: "Backfill CLI do unitId legado (re-key como ADR de migração, B-4 antes)"
estado: "inflight"
estado_detalhe: "ADR-INCR-UNIT-REKEY mergeado #392 529c7463 (28/09) com 12 forks pendentes do dono; código não iniciado · 28/09: o [[SEED-UNITS]] muda a premissa do F-RK-2 (os donos do seed passam a ter units → seed-unit-* viram LEGACY no --plan, não EXCLUDED_TENANT); re-decidir o F-RK-2 depois dele · 02/10 (ratificação): ADR: 12/12 forks F-RK fechados ([[D-2026-10-02-C8-EMENDA-3-2-E-I1B-FORKS]]) — 11 ratificados pelo dono (1 a · 3 b · 4 a · 5 a · 6 b · 7 a · 8 b caminho normal · 9 a · 10 a · 11 a · 12 a) + F-RK-2 → a (exclusão por lista explícita dos 2 seed-unit-*) decidido por delegação; a premissa do SEED-UNITS deixou de bloquear; B-4 done; falta só 'executa' (execução no dev.db = gate humano, runbook) · 03/10: CLI + testes mergeados no #480 (`311dac6b`); runbook em branco em `RUNBOOK-I1B-UNIT-REKEY.md`. A colisão com o #484 deixou o `main` vermelho (`PaymentAccount` sem classificação); o dono decidiu REKEY para `PaymentAccount` e `AccountantAssignment`, e o inventário entrou em `main` como 50 = 48 REKEY + 2 KEEP pelo #482 ([[D-2026-10-03-INTEGRACAO-REKEY-ECF-X7]]). Falta: BRIEF das lacunas L-RK-1..5 (sem 'executa') e a execução no dev.db (gate humano, runbook) · 04/10: lacunas L-RK-1..5 FECHADAS no #501 (`93af35b1`; review independente PASS-COM-RESSALVAS, CI 13/13); o passo 7 do runbook passa a valer como prova. As 2 ressalvas do review viraram L-RK-6 (regra v) e L-RK-7 (cabeças do pré) ([[D-2026-10-04-I1B-RESSALVAS-501]]), com BRIEF sem 'executa'. Falta: código das L-RK-6/7 (sem 'executa') e a execução no dev.db (gate humano, runbook)"
autorizacao: "F-I1-3 → (b) 2026-09-07; dono, 2026-10-02 (ratificação por questionário): 11 forks F-RK ratificados + F-RK-2 decidido por delegação (\"Toma a decisão logica aqui entao e feche as pendencia\") — sem 'executa'; dono, 2026-10-03: \"Executa o código do I1b — só o CLI e os testes; rodar contra o dev.db real NÃO está autorizado\" (execução no dev.db = runbook, gate humano); dono, 2026-10-03: \"Executa o código das lacunas L-RK-1..5 do I1b\" (merge do #501 autorizado em 2026-10-04); L-RK-6/7 sem 'executa'; dono, 2026-10-04: \"Preenche pra a autorização, começa o runbook\" (execução do RUNBOOK-I1B-UNIT-REKEY no dev.db real autorizada)"
prs: ["#392", "#480", "#482", "#501"]
ancora_sdd: "§M5.1 Bloco A I1/I1b"
perfil_previsto: "opus-medio"
perfil_evidencia: "regra 2: re-key do unitId nas 31 tabelas contábeis. A spec é o ADR-INCR-UNIT-REKEY; os 12/12 forks F-RK que a regra 1 esperava foram fechados em 02/10 (#463), F-RK-2 incluso, e o B-4 está done; falta só o executa"
atualizado: "2026-10-04"
depende_de: []
---
# I1b — Backfill CLI do unitId legado (re-key como ADR de migração, B-4 antes)

**Estado:** `inflight` — ADR-INCR-UNIT-REKEY mergeado #392 529c7463 (28/09) com 12 forks pendentes do dono; código não iniciado · 28/09: o [[SEED-UNITS]] muda a premissa do F-RK-2 (os donos do seed passam a ter units → seed-unit-* viram LEGACY no --plan, não EXCLUDED_TENANT); re-decidir o F-RK-2 depois dele · 02/10 (ratificação): ADR: 12/12 forks F-RK fechados ([[D-2026-10-02-C8-EMENDA-3-2-E-I1B-FORKS]]) — 11 ratificados pelo dono (1 a · 3 b · 4 a · 5 a · 6 b · 7 a · 8 b caminho normal · 9 a · 10 a · 11 a · 12 a) + F-RK-2 → a (exclusão por lista explícita dos 2 seed-unit-*) decidido por delegação; a premissa do SEED-UNITS deixou de bloquear; B-4 done; falta só 'executa' (execução no dev.db = gate humano, runbook) · 03/10: CLI + testes mergeados no #480 (`311dac6b`); runbook em branco em `RUNBOOK-I1B-UNIT-REKEY.md`. A colisão com o #484 deixou o `main` vermelho (`PaymentAccount` sem classificação); o dono decidiu REKEY para `PaymentAccount` e `AccountantAssignment`, e o inventário entrou em `main` como 50 = 48 REKEY + 2 KEEP pelo #482 ([[D-2026-10-03-INTEGRACAO-REKEY-ECF-X7]]). Falta: BRIEF das lacunas L-RK-1..5 (sem 'executa') e a execução no dev.db (gate humano, runbook) · 04/10: lacunas L-RK-1..5 FECHADAS no #501 (`93af35b1`; review independente PASS-COM-RESSALVAS, CI 13/13); o passo 7 do runbook passa a valer como prova. As 2 ressalvas do review viraram L-RK-6 (regra v) e L-RK-7 (cabeças do pré) ([[D-2026-10-04-I1B-RESSALVAS-501]]), com BRIEF sem 'executa'. Falta: código das L-RK-6/7 (sem 'executa') e a execução no dev.db (gate humano, runbook)  
**Autorização:** F-I1-3 → (b) 2026-09-07; dono, 2026-10-02 (ratificação por questionário): 11 forks F-RK ratificados + F-RK-2 decidido por delegação ("Toma a decisão logica aqui entao e feche as pendencia") — sem 'executa'; dono, 2026-10-03: "Executa o código do I1b — só o CLI e os testes; rodar contra o dev.db real NÃO está autorizado" (execução no dev.db = runbook, gate humano); dono, 2026-10-03: "Executa o código das lacunas L-RK-1..5 do I1b" (merge do #501 autorizado em 2026-10-04); L-RK-6/7 sem 'executa'  
**Depende de:** — (a aresta pontilhada com [[SEED-UNITS]] caiu em 02/10: F-RK-2 decidido por lista explícita, vale antes e depois do merge)  
**Desbloqueia:** —  
**Âncora no SDD consolidado:** §M5.1 Bloco A I1/I1b  
**PRs:** #392, #480, #482, #501

## Docs

- **Lacunas 03/10 (PR #480):** [`ADR-INCR-UNIT-REKEY-migration.md` §10](../../adr/ADR-INCR-UNIT-REKEY-migration.md) — L-RK-1..5 ratificadas em [[D-2026-10-03-I1B-LACUNAS-L-RK]]; BRIEF da correção: [`BE-INCR-UNIT-REKEY-LACUNAS-brief.md`](../../accounting/BE-INCR-UNIT-REKEY-LACUNAS-brief.md) — ✅ FECHADO no #501
- **Ressalvas do review do #501 (04/10):** L-RK-6 (regra v) + L-RK-7 (cabeças do pré) — [[D-2026-10-04-I1B-RESSALVAS-501]]; BRIEF [`BE-INCR-UNIT-REKEY-VERIFY-V-brief.md`](../../accounting/BE-INCR-UNIT-REKEY-VERIFY-V-brief.md) (sem "executa")

- [`docs/accounting/BE-INCR-ONBOARDING-FIRST-UNIT-brief.md`](../../accounting/BE-INCR-ONBOARDING-FIRST-UNIT-brief.md)
- [`docs/accounting/ONBOARDING-WIZARD-plano-grafo-brief.md`](../../accounting/ONBOARDING-WIZARD-plano-grafo-brief.md)

## Evidência

- `docs/SDD-LUMINARIS.md:1189` → | **I1 / I1b** | **BE-INCR-ONBOARDING-FIRST-UNIT** — a primeira linha de `units` nasce no onboarding (`unit?: {name,cnpj?,type?}` no create, resposta devolve `unitId`, plugins de pipeline/estoque rodam pelo caminho de escrita) + CLI de backfill do `unitId` legado do `dev.db` (F-I1-3 → b) | BE increment ⏳ (BRIEF pronto, **forks RATIFICADOS 2026-09-07**: F-I1-1/4 (b) controller + compensação, F-I1-2 (b) `unit` obrigatório, F-I1b-1 (b) re-key como ADR de migração com B-4 antes — todos na opção COMPLETA (preferência do dono registrada 2026-09-07: "cobrir todas as lacunas, não MVP"; a recomendação 
- [`docs/accounting/ONBOARDING-WIZARD-plano-grafo-brief.md:95`](../../accounting/ONBOARDING-WIZARD-plano-grafo-brief.md)
- [`docs/accounting/ONBOARDING-WIZARD-plano-grafo-brief.md:148`](../../accounting/ONBOARDING-WIZARD-plano-grafo-brief.md)

## Linhas de origem (verbatim do SDD consolidado)

> Copiadas das tabelas das Partes II/III de `docs/SDD-LUMINARIS.md` (snapshot 23/09). O estado **vivo** é o frontmatter acima.

`SDD:1189`

| **I1 / I1b** | **BE-INCR-ONBOARDING-FIRST-UNIT** — a primeira linha de `units` nasce no onboarding (`unit?: {name,cnpj?,type?}` no create, resposta devolve `unitId`, plugins de pipeline/estoque rodam pelo caminho de escrita) + CLI de backfill do `unitId` legado do `dev.db` (F-I1-3 → b) | BE increment ⏳ (BRIEF pronto, **forks RATIFICADOS 2026-09-07**: F-I1-1/4 (b) controller + compensação, F-I1-2 (b) `unit` obrigatório, F-I1b-1 (b) re-key como ADR de migração com B-4 antes — todos na opção COMPLETA (preferência do dono registrada 2026-09-07: "cobrir todas as lacunas, não MVP"; a recomendação do agente estava calibrada para o menor diff); código NÃO iniciado) | [BE-INCR-ONBOARDING-FIRST-UNIT-brief.md](../../accounting/BE-INCR-ONBOARDING-FIRST-UNIT-brief.md). Primeiro degrau da espinha; serial com I2 (mesma tx) e I8 (mesmo body). |

## Fold 28/09 — premissa do F-RK-2 muda

- O ADR define `EXCLUDED_TENANT` como "dono sem `dynamic_tables.internalName = 'units'`" (item 6). O [[SEED-UNITS]]
  re-semeia sobre os **mesmos** usuários e dá `units` a eles → o `--plan` passaria a marcar `seed-unit-presumido`/
  `seed-unit-real` como `LEGACY`. Se o F-RK-2 (a) for ratificado, a exclusão tem de ser por lista explícita desses 2
  ids (ou pelo e-mail `@seed.local`). A escolha "re-semear" do dono em 28/09 **não** ratifica o F-RK-2 (F-P6 → b,
  [[D-2026-09-28-CRC-CFC-SEED-UNIDADE-E-ORDEM]]).
