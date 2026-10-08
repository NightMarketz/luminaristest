---
id: "D-2026-10-08-KIT-SETOR-FORKS-KB6-KB9"
tipo: "decisao"
dominio: "plataforma"
titulo: "Forks F-KB-6 e F-KB-9 do BRIEF do KIT-SETOR + 2 lacunas do PR-1 (canônico no boundary, labels)"
estado: "decided"
autorizacao: "dono, chat, 2026-10-08: \"Ratifico os forks pendentes do BRIEF nas recomendações: F-KB-6 → (a) ... e F-KB-9 → (a)\" + \"Executa o PR-1 do BE-INCR-KIT-SETOR\""
atualizado: "2026-10-08"
---
# D-2026-10-08-KIT-SETOR-FORKS-KB6-KB9 — forks pendentes do BRIEF do KIT-SETOR

Documento dos forks: [`BE-INCR-KIT-SETOR-brief.md`](../../accounting/BE-INCR-KIT-SETOR-brief.md) §4.

## Cédulas (dono, chat, 08/10)

| Fork | Decisão | Texto do dono |
|---|---|---|
| F-KB-6 | (a) v1 = migração literal, sem conteúdo novo (`chartExtension`, `roleDefaults`, `serviceFiscalDefaults`, `referential` vazios); conteúdo entra como v2 | *"F-KB-6 → (a) (v1 = migração literal, sem conteúdo novo)"* |
| F-KB-9 | (a) o primeiro kit com conteúdo (v2) é o do salão | *"F-KB-9 → (a) (o primeiro kit com conteúdo, v2, é o do salão)"* |

## Lacunas do PR-1 decididas por questionário (08/10)

| Lacuna | Resposta literal | Decisão |
|---|---|---|
| Os refinamentos do item 2 precisam do plano canônico, que vive em `accounting/fixtures/ChartOfAccountsFixture.ts`, fora da allowlist do `accountingBinding`; o `CanonicalAccountSchema` do §3.1 não existia | *"Liberar só p/ sectorKits (Recommended)"* | `sectorKits` tem allowlist própria: só `CANONICAL_ACCOUNTS`/`CanonicalAccount`/`AccountNature` do `ChartOfAccountsFixture`; a allowlist do `accountingBinding` fica intocada; `CanonicalAccountSchema` = Zod strict de `{code, name, nature, acceptsEntries}` no DTO do kit |
| `label` de cada kit não especificado | *"Salão de beleza / Clínica estética (Recommended)"* | `beautySalon` → "Salão de beleza"; `aestheticClinic` → "Clínica estética" |
