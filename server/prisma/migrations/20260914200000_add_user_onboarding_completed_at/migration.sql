-- BE-INCR-P2-VERTICAL-CLINICA comportamento 11 (ADR-P2 EMENDA 2026-09-14 R7; F-I2-1 -> a).
-- T0 do time-to-first-ECD: marco gravado na MESMA transacao de installPresetAsSystem.
-- ADD COLUMN puro (nullable, sem default) no SQLite - sem rebuild; usuarios existentes ficam NULL
-- (onboarding anterior ao marco nao tem T0 - nao se inventa backfill).
ALTER TABLE "User" ADD COLUMN "onboardingCompletedAt" DATETIME;
