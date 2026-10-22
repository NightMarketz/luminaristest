-- IBS-CBS-2027 PR-3 (BRIEF item 14; dono 21/10, lacuna "crédito × razão": razão completo). Contas de IBS e CBS a
-- recuperar (Asset) no perfil fiscal da unidade — D na entrada da NF-e, C na compensação da apuração mensal. FK Restrict,
-- nullable = "não configurado" (molde X6 F-X6-8 a: o código é do contador). ALTER TABLE ... ADD COLUMN, como no PR-2.
ALTER TABLE "fiscal_profiles" ADD COLUMN "ibsRecuperarAccountId" TEXT REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fiscal_profiles" ADD COLUMN "cbsRecuperarAccountId" TEXT REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
