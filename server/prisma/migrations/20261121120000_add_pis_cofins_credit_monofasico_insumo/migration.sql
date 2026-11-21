-- Lacuna L-20261120-224253-c516 (nó ITEM-DESTINATION; D-5 reaberta pelo dono em 21/11, padrão ligado):
-- crédito de PIS/COFINS do monofásico por NCM usado como insumo do serviço no não cumulativo (IN RFB 2.121 art. 178).
-- Perfis existentes ficam com a chave ligada (padrão escolhido); o contador desliga por cliente.
ALTER TABLE "fiscal_profiles" ADD COLUMN "pisCofinsCreditMonofasicoInsumo" BOOLEAN NOT NULL DEFAULT true;
