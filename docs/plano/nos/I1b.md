---
id: "I1b"
tipo: "plataforma"
dominio: "plataforma"
titulo: "Backfill CLI do unitId legado (re-key como ADR de migração, B-4 antes)"
estado: "blocked"
estado_detalhe: "ADR-INCR-UNIT-REKEY mergeado #392 529c7463 (28/09) com 12 forks pendentes do dono; código não iniciado · 28/09: o [[SEED-UNITS]] muda a premissa do F-RK-2 (os donos do seed passam a ter units → seed-unit-* viram LEGACY no --plan, não EXCLUDED_TENANT); re-decidir o F-RK-2 depois dele"
autorizacao: "F-I1-3 → (b) 2026-09-07"
prs: ["#392"]
ancora_sdd: "§M5.1 Bloco A I1/I1b"
perfil_previsto: "precisa-de-planejamento"
perfil_evidencia: "regra 1 (BRIEF lido na íntegra): a spec do I1b é o ADR-INCR-UNIT-REKEY, com 12 forks pendentes e o F-RK-2 a re-decidir depois do SEED-UNITS; exige B-4 assinado antes. Depois: opus-medio (regra 2: re-key do unitId nas 31 tabelas contábeis)"
atualizado: "2026-10-01"
depende_de: ["[[SEED-UNITS]]?"]
---
# I1b — Backfill CLI do unitId legado (re-key como ADR de migração, B-4 antes)

**Estado:** `blocked` — ADR-INCR-UNIT-REKEY mergeado #392 529c7463 (28/09) com 12 forks pendentes do dono; código não iniciado · 28/09: o [[SEED-UNITS]] muda a premissa do F-RK-2 (os donos do seed passam a ter units → seed-unit-* viram LEGACY no --plan, não EXCLUDED_TENANT); re-decidir o F-RK-2 depois dele  
**Autorização:** F-I1-3 → (b) 2026-09-07  
**Depende de:** [[SEED-UNITS]] (pontilhada — premissa do F-RK-2)  
**Desbloqueia:** —  
**Âncora no SDD consolidado:** §M5.1 Bloco A I1/I1b  
**PRs:** #392

## Docs

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
