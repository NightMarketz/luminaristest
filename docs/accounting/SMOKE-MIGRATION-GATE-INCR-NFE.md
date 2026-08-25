# SMOKE-MIGRATION-GATE — BE-INCR-NFE (`20260825120000_nfe_multi_item_discriminator`)

> Executado em **2026-08-25** pelo agente (gate de script, não gate humano), na sessão de feature da
> re-implementação do BE-INCR-NFE (branch `claude/nfe-fase-b`). Padrão dos relatórios
> `SMOKE-MIGRATION-GATE-INCR-INVENTORY.md` / `-COUNTERPARTY-NOTNULL.md`.

## O que a migração faz

```sql
-- AlterTable
ALTER TABLE "payables" ADD COLUMN "inventoryMultiItem" BOOLEAN;
```

Coluna **nullable de propósito** (F0-1b / F-NFE7→a): NOT-NULL-com-default forçaria rebuild de tabela
no SQLite — a lição do `expenseAccountId` RESTRICT→SET NULL está citada no comentário do
`schema.prisma`. `null` = linha legada = não-multi-item; o caminho de create grava boolean explícito.

## Procedimento (não-vácuo por construção)

As tabelas AP/AR do `dev.db` real estão **vazias** — um gate cru passaria por vacuidade
(memória `smoke-gate-s6-x-migracao-de-dado`; precedente do INCR-COUNTERPARTY-NOTNULL). Por isso:

1. Cópia do `dev.db` **real aninhado** (`server/prisma/prisma/dev.db`, 1.208.320 bytes, mtime 2026-08-15).
2. **Seed via SQL raw** na cópia, ANTES da migração, só com colunas pré-migração:
   1 `Counterparty` (`smoke-cp-1`) + 1 `Payable` (`smoke-pay-1`, `amountCents=12345`,
   `counterpartyId` FK válida) — `payables` passou de 0 → 1 linha.
3. `npm run smoke:migration -- --db <cópia semeada>` (o script copia de novo e roda
   `prisma migrate deploy` na cópia da cópia; original intocado — S1).

## Resultado — PASS

```
migrações aplicadas na cópia: 2
tabelas=44 · journal_entries=15 · postings=30 · accounts=41 · audit_events=110
OK: 2 migração(ões) aplicada(s) na cópia sem perda. Original intocado (S1).
```

- **2 migrações** porque o `dev.db` real (2026-08-15) ainda não tinha a
  `20260821090000_accounting_binding` — as duas aplicaram em sequência sem perda.
- Linha semeada de `payables` preservada (contagem por tabela sem perda), FKs/índices íntegros,
  `integrity_check` limpo — critérios do próprio script (S2–S8).
- A migração da NF-e saiu como `ADD COLUMN` puro (sem rebuild), como o desenho exige.

## Grau

**Verificado** (execução real, cópia semeada). Residual: nenhum deste gate. O merge do incremento
segue travado pelo gate DELIBERADO de proveniência (`nfe-fixture-provenance.test.ts` — XML real
anonimizado pendente, F0-3), que não é assunto deste relatório.
