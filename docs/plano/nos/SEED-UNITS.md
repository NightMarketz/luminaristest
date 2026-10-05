---
id: "SEED-UNITS"
tipo: "plataforma"
dominio: "plataforma"
titulo: "Tenants do seed nascem com unidade real (SystemProvisioningService) + seed lê o .env (BE-INCR-SEED-UNIDADE-E-ENV)"
estado: "done"
estado_detalhe: "BRIEF de 28/09 com 19 itens; F-S1..F-S3 decididos pelo dono e F-P1..F-P7 por delegação dele; falta 'executa'. Achado no teste de browser de 28/09: seed-presumido/seed-real não têm tabela units → a Contabilidade mostra 'Nenhuma unidade' e o RUNBOOK-H1:151 / H2:28 não rodam (vale também no dev.db real). Depois do merge: re-semear o dev.db (Parte E, humano) · 29/09: o pré-requisito 'seletor de unidade' fechou no #438; é o próximo da fila do agente (decisão 2 de 29/09), antes da FE-INCR-DFE; falta o 'executa' · 01/10: 'executa' dado pelo dono (teste Sonnet × Opus) · 03/10: PR #487 mergeado (`3ac99c99`): SystemProvisioningService (Partes A e B — o tenant do seed nasce com o salão inteiro e a unidade real, `--unit-id` vira o NOME), seed lê o .env sem override e BOM fora do .env.example (Parte C), runbooks H1/H2 sem id literal + re-semear no P0 (Parte D). Residual: Parte E = re-semear o dev.db, humano (destrava o PR-0 do [[FE-INCR-DFE]] e os passos de tela do H1/H2) · 05/10: preflight do gate-copilot sobre cópia do dev.db real — a Parte E precisa de `prisma migrate deploy` (4 pendentes) e `prisma generate` antes do seed; ordem completa na EMENDA 2026-10-05 do RUNBOOK-H1"
depende_de: ["[[SEED-MY]]", "[[I1]]", "[[CRC-CFC]]?"]
autorizacao: "planejar: \"Prepare planos para os achados fora do escopo\"; F-S1 → (a1): \"Pode seguir planejando de acordo com a recomendação a\"; F-P1..F-P7: \"Pesquise e decida as pendentes\" (dono, chat, 2026-09-28) — sem 'executa'"
prs: ["#487"]
ancora_sdd: "§III.2 (fora da régua — pré-requisito de H1/H2)"
autorizacao: "EXECUTA: dono, chat, 2026-10-01 (AskUserQuestion): \"Vamos testar os sonnet e o opus para implementar as tarefas\" + 'executa' marcado para SEED-UNITS, ITEM-DESTINATION, PASSO-13 e LAC-B; PR + revisor Opus, merge após OK do dono"
perfil_previsto: "sonnet-alto"
perfil_evidencia: "regra 4 (BRIEF lido na íntegra): 19 itens em 5 partes (a Parte E é humana); forks todos decididos; sem migração de schema e sem regra contábil (§5) — a regra 2 não casa"
atualizado: "2026-10-05"
---
# SEED-UNITS — Tenants do seed nascem com unidade real + seed lê o .env (BE-INCR-SEED-UNIDADE-E-ENV)

**Estado:** `done` — BRIEF de 28/09 com 19 itens; F-S1..F-S3 decididos pelo dono e F-P1..F-P7 por delegação dele; falta 'executa'. Achado no teste de browser de 28/09: seed-presumido/seed-real não têm tabela units → a Contabilidade mostra 'Nenhuma unidade' e o RUNBOOK-H1:151 / H2:28 não rodam (vale também no dev.db real). Depois do merge: re-semear o dev.db (Parte E, humano) · 29/09: o pré-requisito 'seletor de unidade' fechou no #438; é o próximo da fila do agente (decisão 2 de 29/09), antes da FE-INCR-DFE; falta o 'executa' · 01/10: 'executa' dado pelo dono (teste Sonnet × Opus) · 03/10: PR #487 mergeado (`3ac99c99`): SystemProvisioningService (Partes A e B — o tenant do seed nasce com o salão inteiro e a unidade real, `--unit-id` vira o NOME), seed lê o .env sem override e BOM fora do .env.example (Parte C), runbooks H1/H2 sem id literal + re-semear no P0 (Parte D). Residual: Parte E = re-semear o dev.db, humano (destrava o PR-0 do [[FE-INCR-DFE]] e os passos de tela do H1/H2) · 05/10: preflight do gate-copilot sobre cópia do dev.db real — a Parte E precisa de `prisma migrate deploy` (4 pendentes) e `prisma generate` antes do seed; ordem completa na EMENDA 2026-10-05 do RUNBOOK-H1  
**Autorização:** EXECUTA: dono, chat, 2026-10-01 (AskUserQuestion): "Vamos testar os sonnet e o opus para implementar as tarefas" + 'executa' marcado para SEED-UNITS, ITEM-DESTINATION, PASSO-13 e LAC-B; PR + revisor Opus, merge após OK do dono  
**Depende de:** [[SEED-MY]], [[I1]], [[CRC-CFC]] (pontilhada — os dois editam o RUNBOOK-H1; este entra depois)
**Desbloqueia:** [[H1]], [[H2]], [[I1b]] (pontilhada — muda a premissa do F-RK-2)
**Âncora no SDD consolidado:** §III.2 (fora da régua — pré-requisito de H1/H2)
**PRs:** #487  

## Docs

- [`BE-INCR-SEED-UNIDADE-E-ENV-brief.md`](../../accounting/BE-INCR-SEED-UNIDADE-E-ENV-brief.md) — fatos E1–E25, checklist de 19 itens (Partes A–E), contratos, forks decididos
- [ADR-INCR-UNIT-REKEY](../../adr/ADR-INCR-UNIT-REKEY-migration.md) — F-RK-2 / item 6 (premissa muda com este nó)
- Decisão: [[D-2026-09-28-CRC-CFC-SEED-UNIDADE-E-ORDEM]]

## O que é

O `db:seed:accounting` cria os tenants do H1/H2 sem tabela `units`; o razão fica sob o id literal
`seed-unit-presumido`/`seed-unit-real`, que a tela não oferece. Plano: tirar a criação de sistema do
`dashboardController` para um `SystemProvisioningService` (feature nova `features/onboarding/`, policy one-shot,
compensação, purga pelos repositórios donos) que o onboarding e o seed usam; o seed instala o salão inteiro e usa o
id gerado. Junto: `import 'dotenv/config'` no `prisma/seed.ts` (sem override) e o BOM fora do `.env.example`.

## Operação humana depois do merge (Parte E — o agente prepara, o dono executa)

`npm run db:backup` → `db:seed:accounting … --i-have-a-backup` → `activate-salon-binding.mjs` com o **novo**
`unitId` de cada tenant. Os lançamentos e bindings antigos sob `seed-unit-*` ficam (órfãos, sem colisão).
