# SMOKE-MIGRATION-GATE-INCR-COUNTERPARTY-NOTNULL — Relatório de Execução (dev.db real, rebuild ×2)

- **Data:** 2026-08-14
- **Executado por:** Agente (worktree `h1-sign-off-runbook-ef46f2`, a partir de `main` `a5bb5cee`)
- **Migration alvo:** `20260814120000_counterparty_notnull` (BE-INCR-COUNTERPARTY-NOTNULL / SEC-A1-5) —
  backfill idempotente + asserção de zero NULL + **rebuild de `payables` E `receivables`**
  (`counterpartyId` NULL → NOT NULL, FK `SET NULL` → `RESTRICT`), temp+copy+drop+rename, não `ADD COLUMN`.
- **Resultado:** **PASS com ressalva declarada.** O gate automático (`npm run smoke:migration`) aprova
  sobre o `dev.db` real; sobre uma cópia **semeada** ele reprova em **S6 por desenho** (o backfill MUDA
  uma coluna pré-existente — é o objetivo do incremento), e a verificação dirigida que substitui S6
  nesse caso passa em 10/10. Detalhe em §S6.
- **Atualização 2026-08-15:** as duas execuções foram **re-medidas** sobre o commit `d89d900f` e a
  verificação dirigida deixou de ser avulsa — virou o gate versionado
  [`server/scripts/smoke-gate-incr-counterparty-notnull.mjs`](../../server/scripts/smoke-gate-incr-counterparty-notnull.mjs).
  Ver §Gate versionado.

> Por que o gate não era dispensável: `NOT NULL` no SQLite não é `ALTER COLUMN` — é rebuild da tabela
> inteira, e rebuild malfeito dropa FK/índice/linha em silêncio (lição literal do relatório
> INCR-INVENTORY, que é a mesma tabela `payables`).

## Execução A — `dev.db` real, intocado

| Item | Evidência |
|---|---|
| Banco real | `server/prisma/prisma/dev.db` — md5 `2bff49efc8dd6666a7d358d2e32a81d8`, 1.159.168 bytes |
| Prova de não-toque | md5 idêntico antes e depois (S1 do próprio script) |
| Migrações aplicadas na cópia | 1 (a alvo) |
| Estado | tabelas=43 · journal_entries=15 · postings=30 · accounts=41 · audit_events=92 |
| Veredito | **OK: 1 migração aplicada na cópia sem perda. Original intocado (S1).** |

**Avisos W1 (mudança de ação de FK) — os dois INTENCIONAIS, fork F-NN2(a) ratificado:**

```
aviso: W1: FK de "payables" mudou — antes: counterpartyId->counterparties(id) on_delete=SET NULL
aviso: W1: FK de "receivables" mudou — antes: counterpartyId->counterparties(id) on_delete=SET NULL
```

**Achado corrigido durante a execução (o gate pegou):** a primeira versão da migração declarava
`payables_expenseAccountId_fkey` como `ON DELETE RESTRICT`, e o gate emitiu um **terceiro** W1. A tabela
viva tem `SET NULL` desde `20260720115019` (INCR-INVENTORY tornou a coluna opcional) e o schema declara o
mesmo. O rebuild estava, de carona, revertendo o risco latente registrado no master map §5.1 item 12 —
frente que **ninguém autorizou aqui**. Corrigido para `SET NULL`; o W1 sumiu. Sem o gate, essa alteração
teria entrado silenciosa.

## Armadilha do gate vazio — por que a Execução A sozinha NÃO fecha

O `dev.db` real tem **`payables` = 0 linhas e `receivables` = 0 linhas** (medido: `SELECT COUNT(*)`).
As duas tabelas que esta migração rebuilda estão vazias, então S5/S6 (preservação de linha e de conteúdo)
passaram **por vacuidade** — mesma classe de armadilha do relatório INCR-INVENTORY. O gate real exigiu
estado pré-migração **com linha viva**.

## Execução B — cópia do `dev.db` real SEMEADA com AP/AR

Cópia do real, semeada com 3 payables + 1 receivable escolhidos para pegar os cantos do backfill:

| Linha | Cenário |
|---|---|
| `pay_ligado` | `counterpartyId` **já preenchido** — o vínculo pré-existente não pode ser re-cunhado |
| `pay_orfao` | `counterpartyId` NULL, fornecedor **fora** do catálogo — o backfill tem de cunhar |
| `pay_orfao_morto` | NULL, **CANCELLED + soft-deleted**, MESMO nome do anterior — histórico entra no backfill e não pode gerar uma segunda contraparte |
| `rec_orfao` | NULL do lado AR — espelho |

Datas gravadas como `INTEGER` ms-epoch (forma real do Prisma no SQLite, memória
`sintetico-nao-cobre-formato-de-dado-real`); o backfill só lê colunas TEXT, então nada aqui depende do
encoding de data.

### <a id="s6"></a>S6 reprova por desenho — e o que foi verificado no lugar

O gate genérico exige que **toda coluna pré-existente sobreviva byte-a-byte**. Esta é uma migração **de
dado**: o backfill move `counterpartyId` de NULL para um id. Logo:

```
erro: S6: "payables" — conteúdo das colunas pré-existentes MUDOU no rebuild
erro: S6: "receivables" — conteúdo das colunas pré-existentes MUDOU no rebuild
FALHOU: 2 erro(s). Migração NÃO está deploy-cleared.
```

Isso **não é regressão**: é o script encodando "migração de dado" como falha. A asserção correta para
este caso — *tudo menos `counterpartyId` é byte-idêntico, e `counterpartyId` só sai de NULL para uma
contraparte do próprio escopo* — foi executada à parte, sobre a mesma cópia semeada:

| # | Verificação | Resultado |
|---|---|---|
| V1 | `payables`/`receivables`: todas as demais colunas byte-idênticas | OK |
| V2 | contagem preservada (3 AP / 1 AR) | OK |
| V3 | zero `counterpartyId` NULL após a migração | OK |
| V4 | vínculo pré-existente intacto (não re-cunhado) | OK |
| V5 | órfão vivo e órfão cancelado de mesmo nome compartilham UMA contraparte | OK |
| V6 | zero vínculo cross-escopo (SEC-A1-3) | OK |
| V7 | `NOT NULL` valendo — `INSERT` com NULL rejeitado | OK |
| V8 | índices preservados (3 AP / 3 AR) | OK |
| V9 | `PRAGMA foreign_key_check` limpo | OK |

> **Pendência para o dono — parcialmente resolvida em 2026-08-15.** O `scripts/smoke-migration-gate.mjs`
> continua sem como declarar "esta coluna muda de propósito", e **não foi tocado**: S6 segue reprovando
> esta migração, corretamente. O que mudou é que a verificação dirigida deixou de ser avulsa — virou
> `server/scripts/smoke-gate-incr-counterparty-notnull.mjs`, terceiro irmão de
> `smoke-gate-incr-counterparty.mjs` (A1) e `smoke-gate-incr-dim-completeness.mjs` (B1). Isso reusa a
> forma que o projeto já tinha para migração de dado em vez de montar aparato novo, o que mantém a
> moratória do `CLAUDE.md` de pé (ela veta gate sobre processo/texto; este lê o banco real).
> **Segue com o dono:** se o genérico ganha allowlist por coluna, ou se o par "genérico + gate do
> incremento" passa a ser a regra permanente para toda migração de dado.

## Falsificação da asserção SEC-A1-5

Uma asserção que nunca dispara é decorativa. Executando **só** o bloco de asserção contra uma cópia com
linha órfã (sem rodar o backfill antes):

```
Error: SQLite database error
SEC-A1-5: receivables com counterpartyId NULL apos o backfill — NOT NULL nao aplicado
EXIT=1
```

A migração **aborta antes de tocar a tabela**, como o contrato exige.

### O ABORT não reverte a migração — e o que isso obriga

Achado do review independente, verificado sob `prisma migrate deploy` (não só `db execute`): **SQLite/Prisma
não envolvem o arquivo de migração numa transação.** Depois do abort, o backfill já commitou e a sonda
(tabela `_sec_a1_5_probe` + os dois triggers) **sobrevive**. Sem prólogo idempotente, o retry morreria em
`CREATE TABLE ... already exists`, escondendo a causa real.

Corrigido: o bloco de asserção começa com `DROP TRIGGER IF EXISTS` ×2 + `DROP TABLE IF EXISTS`. Verificado
rodando o bloco **duas vezes** contra a mesma cópia com linha órfã — a segunda execução falha com a
asserção correta, não com erro de tabela existente:

```
--- 1a tentativa ---   SEC-A1-5: receivables com counterpartyId NULL apos o backfill — NOT NULL nao aplicado
--- 2a tentativa ---   SEC-A1-5: receivables com counterpartyId NULL apos o backfill — NOT NULL nao aplicado
```

**Consequência operacional:** se esta migração abortar em produção, o estado é *backfill aplicado, rebuild
não*. É seguro (a coluna segue nullable, nada foi perdido) e o retry é idempotente — mas não é "nada
aconteceu".

## <a id="gate-versionado"></a>Gate versionado — `smoke-gate-incr-counterparty-notnull.mjs` (2026-08-15)

A verificação dirigida de §S6 era um script avulso; agora é
[`server/scripts/smoke-gate-incr-counterparty-notnull.mjs`](../../server/scripts/smoke-gate-incr-counterparty-notnull.mjs),
com a mesma forma dos dois irmãos (`node:sqlite`, `check()`, `DEPLOY-CLEARED ✅` / exit 1).

```bash
node --experimental-sqlite scripts/smoke-gate-incr-counterparty-notnull.mjs <dev.db> [--keep] [--self-test]
```

Executado sobre `server/prisma/prisma/dev.db` (md5 `2bff49ef…`, intocado) no commit `d89d900f`:
**V1–V10 PASS + falsificação PASS → DEPLOY-CLEARED ✅**.

O que ele faz além do script avulso:

| | |
|---|---|
| **Semeia os cantos na cópia** | o `dev.db` real tem AP/AR vazias; sem semear, V1/V2 passariam por vacuidade. Emite `⚠ AVISO` quando o banco não tinha AP/AR próprios — o PASS é sobre linhas semeadas |
| **Escopo derivado do banco** | `SELECT userId, unitId, id FROM accounts LIMIT 1`; nada hardcoded, roda no `dev.db` de qualquer um |
| **Lê o `migration.sql` do disco** | não espelha o SQL — espelho diverge da fonte em silêncio |
| **V10** | a sonda `_sec_a1_5_probe` foi removida (importa porque o ABORT não reverte a migração — ver §ABORT) |
| **`--self-test`** | adultera o snapshot PRÉ e **exige** que V1 reprove, provando as duas metades: pega mudança em coluna comum, continua cego para `counterpartyId` |

**Limites deste gate, declarados:** só V1 tem falsificador — V2–V10 nunca foram observados vermelhos.
A semeadura são os 5 cantos que o autor imaginou (vínculo pré-existente, órfão, órfão cancelado
homônimo, órfão em outra unidade, órfão AR); um 6º canto não previsto passa sem ser visto. E, como o
genérico, prova **banco**, não serviço.

## Limite declarado

Prova **banco**, não serviço: não exercita a cadeia de camadas nem substitui browser sign-off. A garantia
de que nenhum write-path novo produz NULL é dos testes
(`CounterpartyResolution.integration.test.ts`, suítes de AP/AR e do `CrmReceivableBridge`), não deste
relatório.

## Veredito

**DEPLOY-CLEARED** para a migração, com a ressalva de S6 acima registrada e a verificação dirigida
anexada. Residual: review independente + browser sign-off.
