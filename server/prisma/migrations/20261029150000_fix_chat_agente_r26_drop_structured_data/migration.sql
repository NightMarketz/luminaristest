-- FIX-CHAT-AGENTE lote D (dono, 2026-10-29, D-2026-10-29-FIX-CHAT-AGENTE-FECHAMENTO): R26 aposentado.
-- A extração estruturada saiu do pipeline de documentos; a tabela não tem mais leitor nem escritor.
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "StructuredData";
PRAGMA foreign_keys=on;
