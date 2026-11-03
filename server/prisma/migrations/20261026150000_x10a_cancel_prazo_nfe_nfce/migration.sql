-- BE-INCR-NFCE PR-5 (nó X10a, item 27; EMENDA 2026-10-11 §3 E3-1; executa: dono, chat, 2026-10-26 "faz o X10a EMENDA-2
-- PR-1..PR-6 e EMENDA-3 (#757)"). Prazo do cancelamento 110111 no perfil fiscal da unidade: NF-e em horas, NFC-e em
-- minutos. Colunas novas e anuláveis (null ⇒ prazo nacional): nenhuma linha existente muda.
ALTER TABLE "fiscal_profiles" ADD COLUMN "nfeCancelPrazoHoras" INTEGER;
ALTER TABLE "fiscal_profiles" ADD COLUMN "nfceCancelPrazoMinutos" INTEGER;
