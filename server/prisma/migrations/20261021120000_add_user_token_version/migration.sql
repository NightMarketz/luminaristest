-- FIX-AUTH-CONTA §3.4 #3 (fork ratificado pelo dono, chat, 2026-10-21: "tokenVersion no User").
-- O JWT carrega a versão; o logout incrementa e o authMiddleware recusa token de versão antiga.
-- Linhas existentes ficam em 0 = tokens já emitidos (sem a claim) continuam válidos até o próximo logout.
ALTER TABLE "User" ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0;
