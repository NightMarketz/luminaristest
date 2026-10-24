-- BE-INCR-IRRF-DISTRIBUICAO PR-1 (BRIEF itens 1, 5, 7 e 8; forks F-IRD-2, F-IRD-13, F-IRD-14, F-IRD-15, F-IRD-18 ratificados
-- pelo dono em 2026-10-17; executa: dono, chat, 2026-10-21). Aditiva: tabela `partners` (sócios, PJ-wide), 4 contas em
-- `fiscal_profiles` (FK Restrict, nullable = "não configurado", molde F-TA-7) e o mapa `jcpBaseContas` em
-- `company_fiscal_profiles`. `ALTER TABLE ... ADD COLUMN` em vez do RedefineTables do `prisma migrate diff`, mesmo motivo do
-- precedente `20261005120000_add_tax_assessment_anual_fields` (sem janela de perda de dado). Abort no meio deixa as
-- primeiras colunas criadas e o retry morre em "duplicate column": conferir com `PRAGMA table_info`, criar as que faltam
-- e `prisma migrate resolve --applied` (memória migracao-sqlite-nao-e-transacional).
--
-- Dado: tabelas novas IRRF_DISTRIBUICAO e TJLP de parâmetros legais (item 5). Os INSERTs são o texto de
-- prisma/data/legal_parameters_irrf_distribuicao_v1.sql (teste-guarda de igualdade). INSERT OR IGNORE com id fixo.
-- Fontes e sha256 = dossiê pesquisas-legais/irrf-distribuicao [D02] [D05] [D12] [D19].

-- CreateTable
CREATE TABLE IF NOT EXISTS "partners" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "taxId" TEXT NOT NULL,
    "tipoPessoa" TEXT NOT NULL,
    "residenteBrasil" BOOLEAN NOT NULL,
    "participacaoBp" INTEGER NOT NULL,
    "entradaEm" TEXT NOT NULL,
    "saidaEm" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "partners_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "partners_userId_taxId_idx" ON "partners"("userId", "taxId");

-- AlterTable fiscal_profiles
ALTER TABLE "fiscal_profiles" ADD COLUMN "dividendosPagarAccountId" TEXT REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fiscal_profiles" ADD COLUMN "jcpPagarAccountId" TEXT REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fiscal_profiles" ADD COLUMN "irrfRecolherAccountId" TEXT REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fiscal_profiles" ADD COLUMN "jcpDespesaAccountId" TEXT REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable company_fiscal_profiles
ALTER TABLE "company_fiscal_profiles" ADD COLUMN "jcpBaseContas" JSONB;

-- Data: legal_parameters (IRRF_DISTRIBUICAO, TJLP)
INSERT OR IGNORE INTO "legal_parameters" ("id","tabela","chave","discriminador","valorInt","valorTexto","valorJson","fonte","fonteUrl","fonteSha256","vigenteDesde","vigenteAte","status","supersedesId","motivo","proposedById","publishedById","publishedAt","createdAt") VALUES ('ird-aliquota-pf-bp', 'IRRF_DISTRIBUICAO', 'ALIQUOTA_PF_BP', NULL, 1000, NULL, NULL, 'Lei 9.250/1995 art. 6º-A (incl. Lei 15.270/2025)', 'https://www.planalto.gov.br/ccivil_03/leis/l9250.htm', '578dffc60cbec05e06a560e583ae217a1ac19d6c154c548abdb3126bfb68ede1', '2026-01-01', NULL, 'PUBLISHED', NULL, 'BE-INCR-IRRF-DISTRIBUICAO item 5 (F-IRD-13, F-IRD-18; forks dono 2026-10-17); executa: dono, chat, 2026-10-21', 'migracao:IRRF-DISTRIBUICAO', 'migracao:IRRF-DISTRIBUICAO', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO "legal_parameters" ("id","tabela","chave","discriminador","valorInt","valorTexto","valorJson","fonte","fonteUrl","fonteSha256","vigenteDesde","vigenteAte","status","supersedesId","motivo","proposedById","publishedById","publishedAt","createdAt") VALUES ('ird-limite-mensal-pf-cents', 'IRRF_DISTRIBUICAO', 'LIMITE_MENSAL_PF_CENTS', NULL, 5000000, NULL, NULL, 'Lei 9.250/1995 art. 6º-A (incl. Lei 15.270/2025)', 'https://www.planalto.gov.br/ccivil_03/leis/l9250.htm', '578dffc60cbec05e06a560e583ae217a1ac19d6c154c548abdb3126bfb68ede1', '2026-01-01', NULL, 'PUBLISHED', NULL, 'BE-INCR-IRRF-DISTRIBUICAO item 5 (F-IRD-13, F-IRD-18; forks dono 2026-10-17); executa: dono, chat, 2026-10-21', 'migracao:IRRF-DISTRIBUICAO', 'migracao:IRRF-DISTRIBUICAO', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO "legal_parameters" ("id","tabela","chave","discriminador","valorInt","valorTexto","valorJson","fonte","fonteUrl","fonteSha256","vigenteDesde","vigenteAte","status","supersedesId","motivo","proposedById","publishedById","publishedAt","createdAt") VALUES ('ird-aliquota-jcp-bp', 'IRRF_DISTRIBUICAO', 'ALIQUOTA_JCP_BP', NULL, 1750, NULL, NULL, 'Lei 9.249/1995 art. 9º § 2º (red. LC 224/2025, art. 14 III)', 'https://normas.leg.br/?urn=urn:lex:br:federal:lei:1995-12-26;9249', '18cb96b64a850a3f9b738da870044230b76a336068e3fae79cb83f10b14d4699', '2026-01-01', NULL, 'PUBLISHED', NULL, 'BE-INCR-IRRF-DISTRIBUICAO item 5 (F-IRD-13, F-IRD-18; forks dono 2026-10-17); executa: dono, chat, 2026-10-21', 'migracao:IRRF-DISTRIBUICAO', 'migracao:IRRF-DISTRIBUICAO', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO "legal_parameters" ("id","tabela","chave","discriminador","valorInt","valorTexto","valorJson","fonte","fonteUrl","fonteSha256","vigenteDesde","vigenteAte","status","supersedesId","motivo","proposedById","publishedById","publishedAt","createdAt") VALUES ('ird-transicao-2025-12-31', 'IRRF_DISTRIBUICAO', 'TRANSICAO_APROVACAO_ATE', NULL, NULL, '2025-12-31', NULL, 'Lei 9.250/1995 art. 6º-A § 3º II (incl. Lei 15.270/2025)', 'https://www.planalto.gov.br/ccivil_03/leis/l9250.htm', '578dffc60cbec05e06a560e583ae217a1ac19d6c154c548abdb3126bfb68ede1', '2026-01-01', NULL, 'PUBLISHED', NULL, 'BE-INCR-IRRF-DISTRIBUICAO item 5 (F-IRD-13, F-IRD-18; forks dono 2026-10-17); executa: dono, chat, 2026-10-21', 'migracao:IRRF-DISTRIBUICAO', 'migracao:IRRF-DISTRIBUICAO', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO "legal_parameters" ("id","tabela","chave","discriminador","valorInt","valorTexto","valorJson","fonte","fonteUrl","fonteSha256","vigenteDesde","vigenteAte","status","supersedesId","motivo","proposedById","publishedById","publishedAt","createdAt") VALUES ('ird-transicao-2026-01-31', 'IRRF_DISTRIBUICAO', 'TRANSICAO_APROVACAO_ATE', NULL, NULL, '2026-01-31', NULL, 'STF, ADIs 7.912 e 7.914 — liminar ad referendum (Min. Nunes Marques, 26/12/2025): prazo de aprovação prorrogado para 31/01/2026', 'https://noticias.stf.jus.br/postsnoticias/stf-prorroga-prazo-para-aprovacao-de-lucros-e-dividendos-ate-janeiro-de-2026/', '83ebed6621e2036ebfa204a84773527fda8ac12ff00588d34c71ff05788a7737', '2026-01-01', NULL, 'PUBLISHED', 'ird-transicao-2025-12-31', 'BE-INCR-IRRF-DISTRIBUICAO item 5 (F-IRD-13, F-IRD-18; forks dono 2026-10-17); executa: dono, chat, 2026-10-21', 'migracao:IRRF-DISTRIBUICAO', 'migracao:IRRF-DISTRIBUICAO', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO "legal_parameters" ("id","tabela","chave","discriminador","valorInt","valorTexto","valorJson","fonte","fonteUrl","fonteSha256","vigenteDesde","vigenteAte","status","supersedesId","motivo","proposedById","publishedById","publishedAt","createdAt") VALUES ('tjlp-2026-T01', 'TJLP', '2026-T01', NULL, 7658, NULL, NULL, 'RFB — Taxa de Juros de Longo Prazo (TJLP), taxa mensal do trimestre (atualizada em 30/09/2026)', 'https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/pagamentos-e-parcelamentos/taxa-de-juros-de-longo-prazo-tjlp', '6767cf34c415ec3ba78724cdfd7758e523e8c44df50dc34070ec0ec36dba8427', '2026-01-01', '2026-03-31', 'PUBLISHED', NULL, 'BE-INCR-IRRF-DISTRIBUICAO item 5 (F-IRD-13, F-IRD-18; forks dono 2026-10-17); executa: dono, chat, 2026-10-21', 'migracao:IRRF-DISTRIBUICAO', 'migracao:IRRF-DISTRIBUICAO', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO "legal_parameters" ("id","tabela","chave","discriminador","valorInt","valorTexto","valorJson","fonte","fonteUrl","fonteSha256","vigenteDesde","vigenteAte","status","supersedesId","motivo","proposedById","publishedById","publishedAt","createdAt") VALUES ('tjlp-2026-T02', 'TJLP', '2026-T02', NULL, 7608, NULL, NULL, 'RFB — Taxa de Juros de Longo Prazo (TJLP), taxa mensal do trimestre (atualizada em 30/09/2026)', 'https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/pagamentos-e-parcelamentos/taxa-de-juros-de-longo-prazo-tjlp', '6767cf34c415ec3ba78724cdfd7758e523e8c44df50dc34070ec0ec36dba8427', '2026-04-01', '2026-06-30', 'PUBLISHED', NULL, 'BE-INCR-IRRF-DISTRIBUICAO item 5 (F-IRD-13, F-IRD-18; forks dono 2026-10-17); executa: dono, chat, 2026-10-21', 'migracao:IRRF-DISTRIBUICAO', 'migracao:IRRF-DISTRIBUICAO', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO "legal_parameters" ("id","tabela","chave","discriminador","valorInt","valorTexto","valorJson","fonte","fonteUrl","fonteSha256","vigenteDesde","vigenteAte","status","supersedesId","motivo","proposedById","publishedById","publishedAt","createdAt") VALUES ('tjlp-2026-T03', 'TJLP', '2026-T03', NULL, 7617, NULL, NULL, 'RFB — Taxa de Juros de Longo Prazo (TJLP), taxa mensal do trimestre (atualizada em 30/09/2026)', 'https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/pagamentos-e-parcelamentos/taxa-de-juros-de-longo-prazo-tjlp', '6767cf34c415ec3ba78724cdfd7758e523e8c44df50dc34070ec0ec36dba8427', '2026-07-01', '2026-09-30', 'PUBLISHED', NULL, 'BE-INCR-IRRF-DISTRIBUICAO item 5 (F-IRD-13, F-IRD-18; forks dono 2026-10-17); executa: dono, chat, 2026-10-21', 'migracao:IRRF-DISTRIBUICAO', 'migracao:IRRF-DISTRIBUICAO', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO "legal_parameters" ("id","tabela","chave","discriminador","valorInt","valorTexto","valorJson","fonte","fonteUrl","fonteSha256","vigenteDesde","vigenteAte","status","supersedesId","motivo","proposedById","publishedById","publishedAt","createdAt") VALUES ('tjlp-2026-T04', 'TJLP', '2026-T04', NULL, 7742, NULL, NULL, 'RFB — Taxa de Juros de Longo Prazo (TJLP), taxa mensal do trimestre (atualizada em 30/09/2026)', 'https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/pagamentos-e-parcelamentos/taxa-de-juros-de-longo-prazo-tjlp', '6767cf34c415ec3ba78724cdfd7758e523e8c44df50dc34070ec0ec36dba8427', '2026-10-01', '2026-12-31', 'PUBLISHED', NULL, 'BE-INCR-IRRF-DISTRIBUICAO item 5 (F-IRD-13, F-IRD-18; forks dono 2026-10-17); executa: dono, chat, 2026-10-21', 'migracao:IRRF-DISTRIBUICAO', 'migracao:IRRF-DISTRIBUICAO', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
