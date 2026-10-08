-- BE-INCR-SIMPLES-NACIONAL PR-3 (nó X14, itens 19–21 + lacuna 1 do PR-2). Aditiva: tabela simples_apuracoes, coluna
-- tipo (default VENDA) em receita_fiscal_linhas e 2 contas anuláveis em fiscal_profiles. O SQLite reconstrói
-- fiscal_profiles para as FKs novas (padrão do Prisma: copia todas as linhas) — smoke:migration sobre o dev.db real.

-- CreateTable
CREATE TABLE "simples_apuracoes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "competencia" TEXT NOT NULL,
    "regime" TEXT NOT NULL,
    "valorOficialCents" BIGINT NOT NULL,
    "numeroDocumento" TEXT NOT NULL,
    "vencimento" TEXT NOT NULL,
    "sourceDocumentId" TEXT,
    "totalCalculadoCents" BIGINT NOT NULL,
    "divergenciaCents" BIGINT NOT NULL,
    "memoria" JSONB NOT NULL,
    "tabelaVersao" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "supersedesId" TEXT,
    "provisaoEntryId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "simples_apuracoes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_fiscal_profiles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "regimeTributario" TEXT NOT NULL,
    "icmsContribuinte" BOOLEAN NOT NULL DEFAULT false,
    "pisCofinsRegime" TEXT NOT NULL,
    "pisCofinsCreditExcludesIcms" BOOLEAN NOT NULL DEFAULT true,
    "pisCofinsCreditIncludesIpi" BOOLEAN NOT NULL DEFAULT false,
    "pisCofinsCreditFromSimplesSupplier" BOOLEAN NOT NULL DEFAULT false,
    "icmsRecuperavelAccountId" TEXT,
    "pisCofinsRecuperavelAccountId" TEXT,
    "insumoExpenseAccountId" TEXT,
    "irpjDespesaAccountId" TEXT,
    "csllDespesaAccountId" TEXT,
    "irpjRecolherAccountId" TEXT,
    "csllRecolherAccountId" TEXT,
    "pisDespesaAccountId" TEXT,
    "cofinsDespesaAccountId" TEXT,
    "pisRecolherAccountId" TEXT,
    "cofinsRecolherAccountId" TEXT,
    "pisCofinsCreditoOutrosAccountId" TEXT,
    "pisCofinsRetidoCompensarAccountId" TEXT,
    "pisCofinsRetencaoConciliarAccountId" TEXT,
    "simplesDasDeducaoAccountId" TEXT,
    "simplesRecolherAccountId" TEXT,
    "irpjSaldoNegativoAccountId" TEXT,
    "csllSaldoNegativoAccountId" TEXT,
    "partnerAccountRef" TEXT,
    "codMun" TEXT,
    "inscricaoMunicipal" TEXT,
    "cnae" TEXT,
    "dpsSerie" INTEGER NOT NULL DEFAULT 1,
    "regEspTrib" INTEGER NOT NULL DEFAULT 0,
    "regApTribSN" INTEGER,
    "issAliquotaBp" INTEGER,
    "issRetidoTomadorPj" BOOLEAN NOT NULL DEFAULT false,
    "pacoteFatoGerador" TEXT NOT NULL DEFAULT 'CONSUMO',
    "pacoteCTribNac" TEXT,
    "pacoteCNBS" TEXT,
    "ibsCbsInformar" BOOLEAN NOT NULL DEFAULT true,
    "ibsCbsCst" TEXT,
    "ibsCbsClassTrib" TEXT,
    "pTotTribFedCent" INTEGER,
    "pTotTribEstCent" INTEGER,
    "pTotTribMunCent" INTEGER,
    "pTotTribSNCent" INTEGER,
    "emissaoForaDoMes" TEXT NOT NULL DEFAULT 'AVISAR',
    "d1fConfirmado" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "fiscal_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "fiscal_profiles_icmsRecuperavelAccountId_fkey" FOREIGN KEY ("icmsRecuperavelAccountId") REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "fiscal_profiles_pisCofinsRecuperavelAccountId_fkey" FOREIGN KEY ("pisCofinsRecuperavelAccountId") REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "fiscal_profiles_insumoExpenseAccountId_fkey" FOREIGN KEY ("insumoExpenseAccountId") REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "fiscal_profiles_irpjDespesaAccountId_fkey" FOREIGN KEY ("irpjDespesaAccountId") REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "fiscal_profiles_csllDespesaAccountId_fkey" FOREIGN KEY ("csllDespesaAccountId") REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "fiscal_profiles_irpjRecolherAccountId_fkey" FOREIGN KEY ("irpjRecolherAccountId") REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "fiscal_profiles_csllRecolherAccountId_fkey" FOREIGN KEY ("csllRecolherAccountId") REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "fiscal_profiles_pisDespesaAccountId_fkey" FOREIGN KEY ("pisDespesaAccountId") REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "fiscal_profiles_cofinsDespesaAccountId_fkey" FOREIGN KEY ("cofinsDespesaAccountId") REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "fiscal_profiles_pisRecolherAccountId_fkey" FOREIGN KEY ("pisRecolherAccountId") REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "fiscal_profiles_cofinsRecolherAccountId_fkey" FOREIGN KEY ("cofinsRecolherAccountId") REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "fiscal_profiles_pisCofinsCreditoOutrosAccountId_fkey" FOREIGN KEY ("pisCofinsCreditoOutrosAccountId") REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "fiscal_profiles_pisCofinsRetidoCompensarAccountId_fkey" FOREIGN KEY ("pisCofinsRetidoCompensarAccountId") REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "fiscal_profiles_pisCofinsRetencaoConciliarAccountId_fkey" FOREIGN KEY ("pisCofinsRetencaoConciliarAccountId") REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "fiscal_profiles_simplesDasDeducaoAccountId_fkey" FOREIGN KEY ("simplesDasDeducaoAccountId") REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "fiscal_profiles_simplesRecolherAccountId_fkey" FOREIGN KEY ("simplesRecolherAccountId") REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "fiscal_profiles_irpjSaldoNegativoAccountId_fkey" FOREIGN KEY ("irpjSaldoNegativoAccountId") REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "fiscal_profiles_csllSaldoNegativoAccountId_fkey" FOREIGN KEY ("csllSaldoNegativoAccountId") REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_fiscal_profiles" ("cnae", "codMun", "cofinsDespesaAccountId", "cofinsRecolherAccountId", "createdAt", "createdById", "csllDespesaAccountId", "csllRecolherAccountId", "csllSaldoNegativoAccountId", "d1fConfirmado", "deletedAt", "dpsSerie", "emissaoForaDoMes", "ibsCbsClassTrib", "ibsCbsCst", "ibsCbsInformar", "icmsContribuinte", "icmsRecuperavelAccountId", "id", "inscricaoMunicipal", "insumoExpenseAccountId", "irpjDespesaAccountId", "irpjRecolherAccountId", "irpjSaldoNegativoAccountId", "issAliquotaBp", "issRetidoTomadorPj", "pTotTribEstCent", "pTotTribFedCent", "pTotTribMunCent", "pTotTribSNCent", "pacoteCNBS", "pacoteCTribNac", "pacoteFatoGerador", "partnerAccountRef", "pisCofinsCreditExcludesIcms", "pisCofinsCreditFromSimplesSupplier", "pisCofinsCreditIncludesIpi", "pisCofinsCreditoOutrosAccountId", "pisCofinsRecuperavelAccountId", "pisCofinsRegime", "pisCofinsRetencaoConciliarAccountId", "pisCofinsRetidoCompensarAccountId", "pisDespesaAccountId", "pisRecolherAccountId", "regApTribSN", "regEspTrib", "regimeTributario", "unitId", "updatedAt", "updatedById", "userId") SELECT "cnae", "codMun", "cofinsDespesaAccountId", "cofinsRecolherAccountId", "createdAt", "createdById", "csllDespesaAccountId", "csllRecolherAccountId", "csllSaldoNegativoAccountId", "d1fConfirmado", "deletedAt", "dpsSerie", "emissaoForaDoMes", "ibsCbsClassTrib", "ibsCbsCst", "ibsCbsInformar", "icmsContribuinte", "icmsRecuperavelAccountId", "id", "inscricaoMunicipal", "insumoExpenseAccountId", "irpjDespesaAccountId", "irpjRecolherAccountId", "irpjSaldoNegativoAccountId", "issAliquotaBp", "issRetidoTomadorPj", "pTotTribEstCent", "pTotTribFedCent", "pTotTribMunCent", "pTotTribSNCent", "pacoteCNBS", "pacoteCTribNac", "pacoteFatoGerador", "partnerAccountRef", "pisCofinsCreditExcludesIcms", "pisCofinsCreditFromSimplesSupplier", "pisCofinsCreditIncludesIpi", "pisCofinsCreditoOutrosAccountId", "pisCofinsRecuperavelAccountId", "pisCofinsRegime", "pisCofinsRetencaoConciliarAccountId", "pisCofinsRetidoCompensarAccountId", "pisDespesaAccountId", "pisRecolherAccountId", "regApTribSN", "regEspTrib", "regimeTributario", "unitId", "updatedAt", "updatedById", "userId" FROM "fiscal_profiles";
DROP TABLE "fiscal_profiles";
ALTER TABLE "new_fiscal_profiles" RENAME TO "fiscal_profiles";
CREATE UNIQUE INDEX "fiscal_profiles_userId_unitId_key" ON "fiscal_profiles"("userId", "unitId");
CREATE TABLE "new_receita_fiscal_linhas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "competencia" TEXT NOT NULL,
    "dia" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "itemRef" TEXT NOT NULL,
    "natureza" TEXT NOT NULL,
    "cTribNac" TEXT,
    "productRef" TEXT,
    "receitaCents" BIGINT NOT NULL,
    "excluir" JSONB NOT NULL,
    "parceriaContratoId" TEXT,
    "cotaProfissionalCents" BIGINT NOT NULL DEFAULT 0,
    "tipo" TEXT NOT NULL DEFAULT 'VENDA',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "receita_fiscal_linhas_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_receita_fiscal_linhas" ("cTribNac", "competencia", "cotaProfissionalCents", "createdAt", "dia", "excluir", "id", "itemRef", "natureza", "parceriaContratoId", "productRef", "receitaCents", "saleId", "unitId", "userId") SELECT "cTribNac", "competencia", "cotaProfissionalCents", "createdAt", "dia", "excluir", "id", "itemRef", "natureza", "parceriaContratoId", "productRef", "receitaCents", "saleId", "unitId", "userId" FROM "receita_fiscal_linhas";
DROP TABLE "receita_fiscal_linhas";
ALTER TABLE "new_receita_fiscal_linhas" RENAME TO "receita_fiscal_linhas";
CREATE INDEX "receita_fiscal_linhas_userId_unitId_competencia_idx" ON "receita_fiscal_linhas"("userId", "unitId", "competencia");
CREATE UNIQUE INDEX "receita_fiscal_linhas_userId_unitId_saleId_itemRef_key" ON "receita_fiscal_linhas"("userId", "unitId", "saleId", "itemRef");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "simples_apuracoes_userId_unitId_competencia_status_idx" ON "simples_apuracoes"("userId", "unitId", "competencia", "status");


-- Dado (texto de prisma/data/legal_parameters_simples_v2.sql; teste-guarda de igualdade).
-- BE-INCR-SIMPLES-NACIONAL PR-3 (nó X14): linha de enquadramento da cota de gestão da parceria (à mão, com fonte).
INSERT OR IGNORE INTO "legal_parameters" ("id","tabela","chave","discriminador","valorInt","valorTexto","valorJson","fonte","fonteUrl","fonteSha256","vigenteDesde","vigenteAte","status","supersedesId","motivo","proposedById","publishedById","publishedAt","createdAt") VALUES ('sn2-enq-parceria-gestao', 'SIMPLES_ENQUADRAMENTO', 'PARCERIA_GESTAO', NULL, NULL, NULL, '{"anexo":"III","fatorR":false,"semIss":false}', 'Lei 12.592/2012 art. 1º-A § 4º (cota-parte retida a título de gestão, apoio administrativo, cobrança) → Anexo III com ISS: F-SN-12 → b ratificado (D-2026-10-07-SIMPLES-FORKS; BRIEF X14 item 13)', NULL, NULL, '2016-10-27', NULL, 'PUBLISHED', NULL, 'Carga do X14 PR-3 (cota de gestão da parceria; BRIEF item 13)', 'migracao:BE-INCR-SIMPLES-NACIONAL', 'migracao:BE-INCR-SIMPLES-NACIONAL', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO "legal_parameters" ("id","tabela","chave","discriminador","valorInt","valorTexto","valorJson","fonte","fonteUrl","fonteSha256","vigenteDesde","vigenteAte","status","supersedesId","motivo","proposedById","publishedById","publishedAt","createdAt") VALUES ('sn2-obr-pgdasd-simples', 'OBRIGACAO_REGIME', 'PGDAS_D', 'SIMPLES', NULL, NULL, '{"statusBase":"OBRIGATORIA","condicoes":[],"inativa":{"status":"OBRIGATORIA","fonte":"PGDAS-D do PA sem receita (Manual PGDAS-D e DEFIS, item 6.4.1)"}}', 'Res. CGSN 140/2018 art. 38 caput e § 2º II (mensal, até o vencimento do art. 40: dia 20 do mês seguinte; LC 123 art. 18 § 15-A)', NULL, NULL, '2018-01-01', NULL, 'PUBLISHED', NULL, 'Carga do X14 PR-3 (item 22; matriz de obrigações do Simples/MEI)', 'migracao:BE-INCR-SIMPLES-NACIONAL', 'migracao:BE-INCR-SIMPLES-NACIONAL', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO "legal_parameters" ("id","tabela","chave","discriminador","valorInt","valorTexto","valorJson","fonte","fonteUrl","fonteSha256","vigenteDesde","vigenteAte","status","supersedesId","motivo","proposedById","publishedById","publishedAt","createdAt") VALUES ('sn2-obr-defis-simples', 'OBRIGACAO_REGIME', 'DEFIS', 'SIMPLES', NULL, NULL, '{"statusBase":"OBRIGATORIA","condicoes":[],"inativa":{"status":"OBRIGATORIA","fonte":"Res. CGSN 140/2018 art. 72 caput (sem exceção para a inativa)"}}', 'Res. CGSN 140/2018 art. 72 caput e § 1º (anual, até 31/03 do ano seguinte); vale até a entrega da DEFIS do ano-calendário 2026 em 31/03/2027 (BRIEF X14 §5: a redação de 2027 do art. 25 não foi regulamentada; a matriz é lida na data de hoje)', NULL, NULL, '2018-01-01', '2027-03-31', 'PUBLISHED', NULL, 'Carga do X14 PR-3 (item 22; matriz de obrigações do Simples/MEI)', 'migracao:BE-INCR-SIMPLES-NACIONAL', 'migracao:BE-INCR-SIMPLES-NACIONAL', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO "legal_parameters" ("id","tabela","chave","discriminador","valorInt","valorTexto","valorJson","fonte","fonteUrl","fonteSha256","vigenteDesde","vigenteAte","status","supersedesId","motivo","proposedById","publishedById","publishedAt","createdAt") VALUES ('sn2-obr-livrocaixa-simples', 'OBRIGACAO_REGIME', 'LIVRO_CAIXA', 'SIMPLES', NULL, NULL, '{"statusBase":"NAO_SE_APLICA","condicoes":[],"inativa":{"status":"NAO_SE_APLICA","fonte":"Res. CGSN 140/2018 art. 63 § 3º"}}', 'Res. CGSN 140/2018 art. 63 § 3º: a escrituração contábil (Diário e Razão) dispensa o Livro Caixa do art. 63 I', NULL, NULL, '2018-01-01', NULL, 'PUBLISHED', NULL, 'Carga do X14 PR-3 (item 22; matriz de obrigações do Simples/MEI)', 'migracao:BE-INCR-SIMPLES-NACIONAL', 'migracao:BE-INCR-SIMPLES-NACIONAL', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO "legal_parameters" ("id","tabela","chave","discriminador","valorInt","valorTexto","valorJson","fonte","fonteUrl","fonteSha256","vigenteDesde","vigenteAte","status","supersedesId","motivo","proposedById","publishedById","publishedAt","createdAt") VALUES ('sn2-obr-dasnsimei-mei', 'OBRIGACAO_REGIME', 'DASN_SIMEI', 'MEI', NULL, NULL, '{"statusBase":"OBRIGATORIA","condicoes":[],"inativa":{"status":"OBRIGATORIA","fonte":"Res. CGSN 140/2018 art. 109 caput (sem exceção para o MEI sem receita)"}}', 'Res. CGSN 140/2018 art. 109 caput (anual, até o último dia de maio; receita bruta total, parcela sujeita ao ICMS e contratação de empregado)', NULL, NULL, '2018-01-01', NULL, 'PUBLISHED', NULL, 'Carga do X14 PR-3 (item 22; matriz de obrigações do Simples/MEI)', 'migracao:BE-INCR-SIMPLES-NACIONAL', 'migracao:BE-INCR-SIMPLES-NACIONAL', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
