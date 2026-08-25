-- BE-INCR-RN: rename do vocabulário de evento salon.* -> sale.* (ADR-RN-salon-to-sale-rename.md
-- §7 passo 4; BRIEF §6, F-RN-3 -> (b) "script de migração de dado" + F-RN-4 -> (a) "atômico").
--
-- Mapeamento exato (F-RN-2 -> (b), "colapsar o segmento redundante"):
--   salon.sale.finalized -> sale.finalized
--   salon.sale.settled   -> sale.settled
--   salon.sale.returned  -> sale.returned
--   salon.package.sold   -> sale.package.sold
--   salon.sale.cogs      -> sale.cogs
--
-- ESCOPO: reescreve EM LUGAR (nunca insere linha nova) o `sourceType` de `journal_entries` e
-- `stock_movements` (F-RN-3) e o vocabulário embutido no JSON de `accounting_bindings.payload`
-- (F-RN-4 — a MESMA migração cobre o binding persistido, sem janela código-novo × binding-velho).
-- O produto nunca foi deployado (ACCOUNTING-MASTER-MAP §5.1, "4 de 4" gates humanos/dado externo
-- abertos) — não há histórico de usuário real a preservar sob o prefixo antigo.
--
-- IDEMPOTÊNCIA: cada UPDATE abaixo é auto-idempotente por construção — a cláusula WHERE só casa
-- linhas ainda sob o vocabulário antigo; uma 2ª execução (retry pós-crash) não encontra nada para
-- reescrever e é um no-op. Nenhum CREATE TABLE/TRIGGER entra em jogo, então o risco de "already
-- exists" num retry pós-ABORT (memória do projeto: migração SQLite não é transacional) não se
-- aplica aqui — não há DDL para reaplicar, só DML idempotente.
--
-- @@unique([userId,unitId,sourceType,sourceId]) em JournalEntry e
-- @@unique([inventoryItemId,kind,sourceType,sourceId]) em StockMovement chaveiam por `sourceType`
-- LITERAL — reescrever em lugar (UPDATE, nunca INSERT) é o que mantém a identidade do fato de
-- negócio original e permite que uma reemissão pós-rename colida no índice (idempotência restaurada
-- ao invés de duplicada).

-- ─────────────────────────────────────────────────────────────────────────────────────────────────
-- 1. journal_entries.sourceType — reescrita em lugar, uma linha por vocabulário antigo.
-- ─────────────────────────────────────────────────────────────────────────────────────────────────

UPDATE "journal_entries" SET "sourceType" = 'sale.finalized'   WHERE "sourceType" = 'salon.sale.finalized';
UPDATE "journal_entries" SET "sourceType" = 'sale.settled'     WHERE "sourceType" = 'salon.sale.settled';
UPDATE "journal_entries" SET "sourceType" = 'sale.returned'    WHERE "sourceType" = 'salon.sale.returned';
UPDATE "journal_entries" SET "sourceType" = 'sale.package.sold' WHERE "sourceType" = 'salon.package.sold';
UPDATE "journal_entries" SET "sourceType" = 'sale.cogs'        WHERE "sourceType" = 'salon.sale.cogs';

-- ─────────────────────────────────────────────────────────────────────────────────────────────────
-- 2. stock_movements.sourceType — mesma disciplina (só `sale.cogs` é emitido hoje pela CMV, mas os
--    5 valores são cobertos por simetria/futuro-proof — nenhum custo extra, mesma forma de UPDATE).
-- ─────────────────────────────────────────────────────────────────────────────────────────────────

UPDATE "stock_movements" SET "sourceType" = 'sale.finalized'    WHERE "sourceType" = 'salon.sale.finalized';
UPDATE "stock_movements" SET "sourceType" = 'sale.settled'      WHERE "sourceType" = 'salon.sale.settled';
UPDATE "stock_movements" SET "sourceType" = 'sale.returned'     WHERE "sourceType" = 'salon.sale.returned';
UPDATE "stock_movements" SET "sourceType" = 'sale.package.sold' WHERE "sourceType" = 'salon.package.sold';
UPDATE "stock_movements" SET "sourceType" = 'sale.cogs'         WHERE "sourceType" = 'salon.sale.cogs';

-- ─────────────────────────────────────────────────────────────────────────────────────────────────
-- 3. accounting_bindings.payload — o vocabulário vive DENTRO do JSON (eventBindings[].eventKey +
--    as chaves do snapshot operacional), não numa coluna própria. REPLACE em cadeia, ancorado nas
--    aspas duplas do JSON (evita casar substring dentro de outro token e evita o gaguejo
--    'sale.sale.*' — mesmo cuidado da guarda de vocabulário). Idempotente pelo mesmo motivo do
--    UPDATE simples: na 2ª execução as substrings antigas já não existem, REPLACE é no-op.
-- ─────────────────────────────────────────────────────────────────────────────────────────────────

UPDATE "accounting_bindings"
SET "payload" = REPLACE(
    REPLACE(
        REPLACE(
            REPLACE(
                REPLACE("payload", '"salon.sale.finalized"', '"sale.finalized"'),
                '"salon.sale.settled"', '"sale.settled"'
            ),
            '"salon.sale.returned"', '"sale.returned"'
        ),
        '"salon.package.sold"', '"sale.package.sold"'
    ),
    '"salon.sale.cogs"', '"sale.cogs"'
)
WHERE "payload" LIKE '%salon.sale.%' OR "payload" LIKE '%salon.package.%';
