-- BE-INCR-PACOTE-VALIDADE item 13a (F-PV-9b a): cTribNac (6 dígitos, lista nacional) do pacote no perfil fiscal da unidade — insumo da
-- NFS-e do pacote VENDA e da NFS-e do saldo vencido em CONSUMO. Coluna nullable, sem default, sem FK; nenhuma
-- outra tabela é tocada e não há migração de dado (o contador preenche; sem o campo, a nota não sai).
--
-- Memória `migracao-sqlite-nao-e-transacional`: o SQLite não tem `ADD COLUMN IF NOT EXISTS`, então o prólogo
-- idempotente que o BRIEF pede não existe para esta forma. Cada coluna vai num arquivo de UM statement
-- (precedente `20261002120000_add_fiscal_profile_insumo_expense_account`): não há estado intermediário dentro
-- do arquivo — ou a coluna existe, ou não; retry após sucesso morre em "duplicate column".

-- AlterTable
ALTER TABLE "fiscal_profiles" ADD COLUMN "pacoteCTribNac" TEXT;
