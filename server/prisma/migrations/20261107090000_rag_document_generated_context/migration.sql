-- BE-INCR-RAG-DOCUMENTOS RAG-PR-B item 18 (F-RAG-B1 a): contexto gerado do documento em coluna própria
-- ("generatedContext", validado pelo GeneratedContextSchema); o "contextJson" segue só com as estatísticas do pipeline.
--
-- Prólogo defensivo (memória migracao-sqlite-nao-e-transacional): a migração é um único ALTER TABLE ... ADD COLUMN,
-- que o SQLite aplica por inteiro ou não aplica — não há estado intermediário a recuperar. Coluna anulável, sem default:
-- linhas existentes ficam com NULL (o contexto gerado chega no RAG-PR-D, item 26), nenhum dado é copiado nem reescrito.
ALTER TABLE "Document" ADD COLUMN "generatedContext" JSONB;
