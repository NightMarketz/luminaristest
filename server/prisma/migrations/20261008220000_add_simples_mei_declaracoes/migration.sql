-- BE-INCR-SIMPLES-NACIONAL PR-4 (nó X14, itens 25, 27–28). Aditiva: 2 colunas anuláveis em company_fiscal_profiles,
-- tabela simples_declaracoes_anuais e a carga de SALARIO_MINIMO (texto de prisma/data/legal_parameters_simples_v3.sql).

-- AlterTable
ALTER TABLE "company_fiscal_profiles" ADD COLUMN "meiContribuinteIcms" BOOLEAN;
ALTER TABLE "company_fiscal_profiles" ADD COLUMN "meiContribuinteIss" BOOLEAN;

-- CreateTable
CREATE TABLE "simples_declaracoes_anuais" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "dados" JSONB NOT NULL,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "simples_declaracoes_anuais_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "simples_declaracoes_anuais_userId_unitId_ano_tipo_key" ON "simples_declaracoes_anuais"("userId", "unitId", "ano", "tipo");


-- BE-INCR-SIMPLES-NACIONAL PR-4 (nó X14, item 25; fork L2 = migração com fonte, dono 08/10): SALARIO_MINIMO lido dos decretos
-- no Planalto em 2026-10-08 (sha256 do HTML baixado). O SIMEI usa 5% deste valor (Res. CGSN 140 art. 101 I "b").
INSERT OR IGNORE INTO "legal_parameters" ("id","tabela","chave","discriminador","valorInt","valorTexto","valorJson","fonte","fonteUrl","fonteSha256","vigenteDesde","vigenteAte","status","supersedesId","motivo","proposedById","publishedById","publishedAt","createdAt") VALUES ('sn3-salmin-2024', 'SALARIO_MINIMO', 'NACIONAL', NULL, 141200, NULL, NULL, 'Decreto nº 11.864/2023 art. 1º (R$ 1.412,00 a partir de 1º/01/2024)', 'https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2023/decreto/d11864.htm', '4840bb8f6fff5fae57a82b2d080689e136bb9a60dd84bf8dd600613ccfe65ac8', '2024-01-01', '2024-12-31', 'PUBLISHED', NULL, 'Carga do X14 PR-4 (BRIEF item 25), valor conferido no texto do decreto', 'migracao:BE-INCR-SIMPLES-NACIONAL', 'migracao:BE-INCR-SIMPLES-NACIONAL', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO "legal_parameters" ("id","tabela","chave","discriminador","valorInt","valorTexto","valorJson","fonte","fonteUrl","fonteSha256","vigenteDesde","vigenteAte","status","supersedesId","motivo","proposedById","publishedById","publishedAt","createdAt") VALUES ('sn3-salmin-2025', 'SALARIO_MINIMO', 'NACIONAL', NULL, 151800, NULL, NULL, 'Decreto nº 12.342/2024 art. 1º (R$ 1.518,00 a partir de 1º/01/2025)', 'https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2024/decreto/d12342.htm', '5959b3a398cb09d9148bc0b4a6f7bf118ef43926b1ff4d90153aa0ecc287d1c9', '2025-01-01', '2025-12-31', 'PUBLISHED', NULL, 'Carga do X14 PR-4 (BRIEF item 25), valor conferido no texto do decreto', 'migracao:BE-INCR-SIMPLES-NACIONAL', 'migracao:BE-INCR-SIMPLES-NACIONAL', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO "legal_parameters" ("id","tabela","chave","discriminador","valorInt","valorTexto","valorJson","fonte","fonteUrl","fonteSha256","vigenteDesde","vigenteAte","status","supersedesId","motivo","proposedById","publishedById","publishedAt","createdAt") VALUES ('sn3-salmin-2026', 'SALARIO_MINIMO', 'NACIONAL', NULL, 162100, NULL, NULL, 'Decreto nº 12.797/2025 art. 1º (R$ 1.621,00 a partir de 1º/01/2026)', 'https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/decreto/d12797.htm', 'da40cf7a7dedd317a1b171202dbaf4bb78de69f36c552f8e5d730b442300229f', '2026-01-01', NULL, 'PUBLISHED', NULL, 'Carga do X14 PR-4 (BRIEF item 25), valor conferido no texto do decreto', 'migracao:BE-INCR-SIMPLES-NACIONAL', 'migracao:BE-INCR-SIMPLES-NACIONAL', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
