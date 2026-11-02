-- X10a PR-8 (correção do QR no consultar, #986) — a UF devolveu 407 ao QR v3: emissão e remontagem do nfeProc usam o v2.
-- ADD COLUMN simples (uma instrução, atômica no SQLite); DEFAULT false preserva as linhas existentes.
ALTER TABLE "nfce_cscs" ADD COLUMN "qrV3Recusado" BOOLEAN NOT NULL DEFAULT false;
