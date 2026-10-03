---
id: "D-2026-10-03-I1B-LACUNAS-L-RK"
tipo: "decisao"
dominio: "plataforma"
titulo: "Ratificação por questionário: lacunas L-RK-1..5 do re-key (I1b) + classificação da tabela nova + entrega"
estado: "decided"
autorizacao: "dono, chat, 2026-10-03 (\"Me faz a entrevista pra documentar e criar os briefs das lacunas\"; AskUserQuestion) — sem 'executa'"
atualizado: "2026-10-03"
---
# D-2026-10-03-I1B-LACUNAS-L-RK — cédulas da entrevista das lacunas do I1b

**Estado:** `decided` (9/9)
**Autorização:** dono, chat, 03/10/2026: *"Me faz a entrevista pra documentar e criar os briefs das lacunas"*. As
respostas vieram pelo AskUserQuestion: o agente apresentou cada opção com contexto e o dono escolheu.
**Não é "executa"** (ORCH-006): a resposta à pergunta 8 foi *"Só o BRIEF agora"*.

Documentos:
- [`ADR-INCR-UNIT-REKEY-migration.md`](../../adr/ADR-INCR-UNIT-REKEY-migration.md) §10 (L-RK-1..5, abertas em 03/10, no
  PR #480)
- BRIEF da correção: [`BE-INCR-UNIT-REKEY-LACUNAS-brief.md`](../../accounting/BE-INCR-UNIT-REKEY-LACUNAS-brief.md)

## Rodada 1

### L-RK-2 — o `--verify` não confere para onde o `unitId` foi
- **Contexto dado:** o revisor do #480 devolveu uma conta ao legado e deu um `unitId` inventado a uma conta de outro
  dono. O verify saiu com exit 0.
- **Opções:** (a) linha a linha: o `unitId` só muda de `(dono, legado)` para `(dono, novo)`, e toda linha
  `(dono, legado)` muda (**recomendada**) · (b) manter a letra; o passo 7 do runbook deixa de provar o mapeamento.
- **Resposta literal:** *"Linha a linha (Recomendado)"* → ✅ (a).

### L-RK-3 — o verify não vê o re-key quando o legado não tem trilha
- **Opções:** (b) inferir os pares pelo diff pré × pós (**recomendada**) · (a) pares explícitos `--pair` · (c) gravar
  a âncora sempre (muda o §5).
- **Resposta literal:** *"Inferir pelo diff (Recomendado)"* → ✅ (b).

### L-RK-4 — nenhum gate dentro da tx exige "≥ 1 linha movida"
- **Opções:** (a) gate dentro da tx: soma de linhas movidas = 0 → rollback e `NOTHING_TO_DO` (**recomendada**) ·
  (b) aceitar como teto do F-RK-10.
- **Resposta literal:** *"Gate dentro da tx (Recomendado)"* → ✅ (a).

### L-RK-1 — exit code sem `--backup-path` (o §5 diz 2, o item 15 diz 1)
- **Opções:** (a) exit 2, args inválidos; o item 15 do ADR é emendado (**recomendada**) · (b) exit 1, pré-condição;
  o §5 é emendado.
- **Resposta literal:** *"Exit 2, args (Recomendado)"* → ✅ (a).

## Rodada 2

### L-RK-5 — `units` apagada por soft delete é classificada como `LEGACY`
- **Opções:** (b) classe nova `DELETED_REAL_UNIT` no `--plan`, recusa (exit 1) no `--apply` (**recomendada**) ·
  (a) manter `LEGACY`, com conferência no runbook.
- **Resposta literal:** *"Recusar (Recomendado)"* → ✅ (b).

### Tabela nova `ProductDestinationDefault` (#481) — REKEY ou KEEP
- **Contexto dado:** no merge de `main` (`9ec74cc4`) ela foi classificada como REKEY pelo critério do F-RK-5 (fica no
  legado só a trilha de auditoria, que tem o `unitId` no hash).
- **Opções:** confirmar REKEY (**recomendada**) · KEEP.
- **Resposta literal:** *"Confirmo REKEY (Recomendado)"* → ✅ REKEY. O inventário passa a 48 (46 REKEY + 2 KEEP).

### Onde entra a correção
- **Opções:** no mesmo PR #480 (**recomendada**) · PR novo depois do merge do #480.
- **Resposta literal:** *"PR novo depois do merge"* → ✅ PR novo. O dono **divergiu** da recomendação. Consequência
  registrada: enquanto o PR novo não mergear, o passo 7 do `RUNBOOK-I1B-UNIT-REKEY.md` não vale como prova.

### Execução
- **Opções:** só o BRIEF agora · executar em seguida.
- **Resposta literal:** *"Só o BRIEF agora"* → ✅ sem "executa". O BRIEF espera a autorização de código.

## Rodada 3 — fork aberto pelo detalhamento do BRIEF

### F-RKL-1 — linha de `units` APAGADA de outro dono
- **Contexto dado:** hoje o `UNIT_OWNER_MISMATCH` olha só a unidade viva de outro dono.
- **Opções:** (a) recusar também, `UNIT_OWNER_MISMATCH` exit 1 (**recomendada**) · (b) ignorar a apagada e seguir
  como `LEGACY`.
- **Resposta literal:** *"Recusar também (Recomendado)"* → ✅ (a).
