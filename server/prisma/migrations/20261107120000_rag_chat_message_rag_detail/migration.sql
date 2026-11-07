-- BE-INCR-RAG-DOCUMENTOS, emenda de 07/11 (dois modos de resposta), item 15e (F-RAG-M7 = salvar): as citações e os
-- dados técnicos do turno RAG ficam com a mensagem do ASSISTANT, para o chat reaberto mostrar o mesmo.
--
-- Prólogo defensivo (memória migracao-sqlite-nao-e-transacional): a migração é um único ALTER TABLE ... ADD COLUMN,
-- que o SQLite aplica por inteiro ou não aplica — não há estado intermediário a recuperar. Coluna anulável, sem default:
-- mensagens existentes ficam com NULL (anteriores à emenda), nenhum dado é copiado nem reescrito.
ALTER TABLE "ChatMessage" ADD COLUMN "ragDetail" JSONB;
