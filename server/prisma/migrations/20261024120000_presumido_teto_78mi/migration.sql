-- PRESUMIDO-TETO-78MI (BRIEF docs/accounting/BE-INCR-PRESUMIDO-TETO-78MI-brief.md itens 1 e 5; forks F-PT-2 c e F-PT-7 a
-- ratificados em 22/10/2026; executa: dono, chat, 2026-10-24). Aditiva:
--  - `company_fiscal_profiles.receitaTotalAnoAnteriorCents` (BigInt, nullable) — receita total do ano anterior declarada
--    (IN RFB 1.700/2017 art. 59 § 1º). `ALTER TABLE ... ADD COLUMN`, sem RedefineTables (precedente
--    20261021120000_add_partners_irrf_distribuicao). SQLite não é transacional: abort depois do ALTER e retry morre em
--    "duplicate column" — conferir com `PRAGMA table_info("company_fiscal_profiles")` e `prisma migrate resolve --applied`
--    depois de rodar os INSERTs à mão (memória migracao-sqlite-nao-e-transacional). Os INSERTs são retomáveis.
--  - 2 linhas de `TAX_ASSESSMENT` em REAIS (`valorInt` é Int de 32 bits; R$ 78 mi em centavos não cabe — F-PT-7 a). Os
--    INSERTs são o texto de prisma/data/legal_parameters_presumido_teto_v1.sql (teste-guarda de igualdade). Fonte = Lei
--    9.718 do acervo ctresb/leis, compilada, sem alerta (dossiê pesquisas-legais/presumido-teto-78mi [D01]).

-- AlterTable
ALTER TABLE "company_fiscal_profiles" ADD COLUMN "receitaTotalAnoAnteriorCents" BIGINT;

-- Dado
INSERT OR IGNORE INTO "legal_parameters" ("id","tabela","chave","discriminador","valorInt","valorTexto","valorJson","fonte","fonteUrl","fonteSha256","vigenteDesde","vigenteAte","status","supersedesId","motivo","proposedById","publishedById","publishedAt","createdAt") VALUES ('lpt-presumido-teto-ano', 'TAX_ASSESSMENT', 'PRESUMIDO_TETO_ANO_REAIS', NULL, 78000000, NULL, NULL, 'Lei 9.718/1998 art. 13 caput e art. 14 I (red. Lei 12.814/2013)', 'https://normas.leg.br/?urn=urn:lex:br:federal:lei:1998-11-27;9718', 'b15173fa6f57c3ef3a6c7709268c5757ad900c2f567a08f2e646ec014feadf12', '2014-01-01', NULL, 'PUBLISHED', NULL, 'PRESUMIDO-TETO-78MI item 1 (F-PT-7 a): teto da opção pelo Lucro Presumido, em reais', 'migracao:PRESUMIDO-TETO-78MI', 'migracao:PRESUMIDO-TETO-78MI', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO "legal_parameters" ("id","tabela","chave","discriminador","valorInt","valorTexto","valorJson","fonte","fonteUrl","fonteSha256","vigenteDesde","vigenteAte","status","supersedesId","motivo","proposedById","publishedById","publishedAt","createdAt") VALUES ('lpt-presumido-teto-mes', 'TAX_ASSESSMENT', 'PRESUMIDO_TETO_MES_REAIS', NULL, 6500000, NULL, NULL, 'Lei 9.718/1998 art. 13 caput e art. 14 I (red. Lei 12.814/2013)', 'https://normas.leg.br/?urn=urn:lex:br:federal:lei:1998-11-27;9718', 'b15173fa6f57c3ef3a6c7709268c5757ad900c2f567a08f2e646ec014feadf12', '2014-01-01', NULL, 'PUBLISHED', NULL, 'PRESUMIDO-TETO-78MI item 1 (F-PT-7 a): teto proporcional por mês de atividade do ano anterior, em reais', 'migracao:PRESUMIDO-TETO-78MI', 'migracao:PRESUMIDO-TETO-78MI', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
