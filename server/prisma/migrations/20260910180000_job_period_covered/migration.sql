-- BE-INCR-CONTADOR-DELIVERY - Fork Novo A -> (b), ratificado 2026-09-10 (cedula 10/09 s6, F3): o job
-- de data-exchange passa a persistir o PERIODO coberto pelo artefato SPED, para a entrega ler dele em
-- vez de um `year` digitado. Migracao separada da 20260910120000 de proposito: aquela e aditiva pura
-- (2 CREATE TABLE); esta toca tabela EXISTENTE com dado (`accounting_data_exchange_jobs`), entao acende
-- o smoke:migration por classe. `ADD COLUMN` nullable, sem default: o SQLite nao reconstroi a tabela
-- (a licao do expenseAccountId), e nenhum job anterior ganha periodo - os exports SPED gerados antes
-- desta migracao NAO sao entregaveis pela rota nova (400 "job sem periodo"), que e o comportamento
-- honesto: o sistema nao sabe o que eles cobrem.
ALTER TABLE "accounting_data_exchange_jobs" ADD COLUMN "periodStart" DATETIME;
ALTER TABLE "accounting_data_exchange_jobs" ADD COLUMN "periodEnd" DATETIME;
