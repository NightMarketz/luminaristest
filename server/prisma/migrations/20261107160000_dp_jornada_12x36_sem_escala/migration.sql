-- BE-INCR-DP-F2 (nó PES-4, BRIEF item 68; decisão do dono, chat, 2026-11-07: "pode travar e calcular de acordo com escala
-- informada pelo usuário" — cédula docs/plano/decisoes/D-2026-11-07-PES4-F2-EMPREGO-UNICO-E-12X36.md): a migração
-- 20261107130000_dp_jornada_escala deu a toda jornada do F1 a escala de segunda a sábado, inclusive às 12×36
-- (tipoJornada '2'), e o motor as calcularia como 6×1 sem o usuário ter informado nada. Aqui a escala dessas jornadas
-- volta a vazio (diasTrabalho '' e minutosPorDia NULL): `escalaDaJornada` devolve null e o cálculo dá JORNADA_AUSENTE
-- até o usuário informar. A migração mergeada não se edita.
-- Prólogo defensivo: SQLite não reverte migração que aborta no meio; este arquivo é um só UPDATE, sem tabela temporária
-- a limpar, e o WHERE só pega linha que ainda tem escala — reaplicar não muda nada nem falha.
UPDATE "dp_jornadas" SET "diasTrabalho" = '', "minutosPorDia" = NULL WHERE "tipoJornada" = '2' AND ("diasTrabalho" <> '' OR "minutosPorDia" IS NOT NULL);
