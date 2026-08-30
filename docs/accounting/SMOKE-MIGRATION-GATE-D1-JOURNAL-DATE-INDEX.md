# SMOKE-MIGRATION-GATE — D-1 (`JournalEntry` date index)

**Data:** 2026-08-30 · **Migração:** `20260830120000_add_journal_entry_date_index` · **Resultado: PASS**

## Objetivo
Provar que a migração aditiva de D-1 (`CREATE INDEX "journal_entries_userId_unitId_date_idx" ON
"journal_entries"("userId", "unitId", "date")`, sem `IF NOT EXISTS` — padrão observado nas 13
migrações existentes do repo, `grep` confirmou zero uso da cláusula) aplica limpa sobre o `dev.db`
**real populado**, sem tocar em nenhum dado de ledger e sem alterar o banco original.

## Banco alvo
`server/prisma/prisma/dev.db` (1.208.320 bytes, 15 lançamentos) — o caminho aninhado populado, não o
`server/prisma/dev.db` de 0 bytes na raiz de `server/prisma/` (isca — memória
`dev-db-real-path-is-nested`).

## Método
1. `node scripts/smoke-migration-gate.mjs --db <path real> --keep` (script automatizado, cobre
   S1–S8: hash md5 do original antes/depois, `integrity_check`, `foreign_key_check`, nenhuma tabela
   perde linha, colunas antigas sobrevivem byte-a-byte, nenhum índice nomeado desaparece, partida
   dobrada Σdébito=Σcrédito). Rodou contra cópia em `%TEMP%`, mantida com `--keep` para inspeção
   adicional.
2. Verificação adicional (o script genérico prova que índices VELHOS sobrevivem, não que o NOVO
   nasceu): `PRAGMA index_list('journal_entries')` + `PRAGMA index_info('journal_entries_userId_unitId_date_idx')`
   sobre a cópia pós-migração.
3. Fingerprint canônico (`SELECT userId,unitId,sourceType,sourceId,fiscalYear,entryNumber,status FROM
   journal_entries ORDER BY id`, sha256) — original (pré-migração, lido direto, sem escrita) vs. cópia
   (pós-migração).
4. md5 do arquivo original antes e depois de toda a operação.

## Evidência

### Gate automatizado (`smoke-migration-gate.mjs`)
```
original: C:\Users\smurf\Downloads\Luminaris\server\prisma\prisma\dev.db (md5 bf4f8bb404395697822eada4bf985709)
cópia:    C:\Users\smurf\AppData\Local\Temp\smoke-migration-CulwXg\copy.db
migrações aplicadas na cópia: 3
tabelas=44 · journal_entries=15 · postings=30 · accounts=41 · audit_events=110

OK: 3 migração(ões) aplicada(s) na cópia sem perda. Original intocado (S1).
```
(3 migrações aplicadas porque o `dev.db` real estava atrás de 2 migrações anteriores além da nova de
D-1 — `20260821090000_accounting_binding` e `20260825120000_rename_salon_to_sale_vocabulary` não
tinham sido aplicadas ao arquivo local ainda; nenhuma delas é objeto deste gate, mas o script aplica
todas as pendentes por desenho.)

Nenhum `S1`–`S8` reprovado (script sai 0, sem linha `erro:`).

### Fingerprint do ledger
| Momento | entries | fingerprint (sha256) |
|---|---|---|
| ANTES (original, leitura direta) | 15 | `b98fbee13e57d6fcbc775a7555a1a7066f1ab459bcb254cb5bfc730e3ea865ec` |
| DEPOIS (cópia, pós-migração) | 15 | `b98fbee13e57d6fcbc775a7555a1a7066f1ab459bcb254cb5bfc730e3ea865ec` |

Byte-idêntico.

### Índice novo (`PRAGMA index_list` / `index_info`, sobre a cópia pós-migração)
```
PRAGMA index_list('journal_entries') inclui:
  { seq: 0, name: 'journal_entries_userId_unitId_date_idx', unique: 0, origin: 'c', partial: 0 }

PRAGMA index_info('journal_entries_userId_unitId_date_idx'):
  [0] userId
  [1] unitId
  [2] date
```
Colunas na ordem correta (`userId`, `unitId`, `date`), não-único, criado (`origin: 'c'`).

### DB real intocado
- md5 ANTES: `bf4f8bb404395697822eada4bf985709`
- md5 DEPOIS (re-hash após toda a operação): `bf4f8bb404395697822eada4bf985709` — idêntico.
- Cópia temporária apagada ao final.

## Nota sobre o risco "migração não-transacional"
Esta migração é uma única instrução `CREATE INDEX`, sem `DROP TABLE`/rebuild — não tem "metade" para
ficar aplicada em caso de aborto (a preocupação da memória `migracao-sqlite-nao-e-transacional` mira o
padrão de rebuild do SQLite ao alterar coluna/tabela, que não se aplica aqui). Registrado para quem
revisar não reabrir esse medo à toa.

## Veredicto
**PASS — deploy-cleared** para a migração aditiva `20260830120000_add_journal_entry_date_index`.
Índice novo nasce com as colunas corretas na ordem certa, nenhum lançamento alterado, `dev.db` original
comprovadamente intocado.
