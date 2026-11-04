-- BE-INCR-TAX-ASSESSMENT-C EMENDA RASTREIO (item 1, F-RT-4 b): origem de cada linha da memória de cálculo, gravada na
-- confirmação (RastreioApuracaoSchema). ADD COLUMN simples (uma instrução, atômica no SQLite); coluna nula, sem backfill —
-- as apurações anteriores à emenda ficam com rastreio NULL e exportam com as colunas novas vazias.
ALTER TABLE "tax_assessments" ADD COLUMN "rastreio" JSONB;
