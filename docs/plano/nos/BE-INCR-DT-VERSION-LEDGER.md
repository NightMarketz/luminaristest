---
id: "BE-INCR-DT-VERSION-LEDGER"
tipo: "plataforma"
dominio: "motor"
titulo: "Ledger de versões das DynamicTables (linhas + schema; ver, diff, restaurar)"
estado: "planned"
estado_detalhe: "17/10: BRIEF escrito (22 itens, 1 PR) sobre as decisões D1–D3 do dono; forks F-DTV-1..7 RATIFICADOS 17/10, todos na recomendação (ator no repo, snapshot, BASELINE preguiçoso, cascade LGPD, 409 em linha apagada, schema sem restore, guarda tudo e mede). Código exige executa"
depende_de: []
autorizacao: "dono, chat, 2026-10-17: \"Ledger de versões para as tabelas dinamicas\" + questionário ([[D-2026-10-17-DT-VERSION-LEDGER]]): \"Só planejar o BRIEF (Recomendado)\" — só o BRIEF (sessao-planejamento); sem código, sem executa · dono, chat, 2026-10-17: \"Ratify F-DTV-1..7 as recommended (no executa)\" — forks ratificados; sem executa"
perfil_previsto: "opus-medio"
perfil_evidencia: "BRIEF com 22 itens num só domínio (motor DT), 2 models + migração aditiva, 6 rotas; risco concentrado na varredura dos write-paths (item 2) e no restore pelo caminho de update"
write_set: ["server/prisma/schema.prisma", "server/prisma/migrations/**", "server/src/features/dynamicTables/**", "server/src/controllers/dynamicTablesController.ts", "server/src/routes/dynamic-tables.ts", "server/test/helpers/db.ts", "server/test/helpers/templateDb.ts", "server/public/openapi.json"]
registros: ["server/src/lib/factory.ts"]
ancora_sdd: "—"
atualizado: "2026-10-17"
prs: []
---
# BE-INCR-DT-VERSION-LEDGER — ledger de versões das tabelas dinâmicas

**Estado:** `planned` — 17/10: BRIEF escrito (22 itens, 1 PR) sobre as decisões D1–D3 do dono; forks F-DTV-1..7 RATIFICADOS 17/10, todos na recomendação (ator no repo, snapshot, BASELINE preguiçoso, cascade LGPD, 409 em linha apagada, schema sem restore, guarda tudo e mede). Código exige executa  
**Desbloqueia:** FE do histórico de versões (frente futura, sem autorização).

## Docs
- [`BE-INCR-DT-VERSION-LEDGER-brief.md`](../../accounting/BE-INCR-DT-VERSION-LEDGER-brief.md)
- Decisão: [[D-2026-10-17-DT-VERSION-LEDGER]]
- Pesquisa legal: `pesquisas-legais/lgpd-versoes-dt/relatorio.md` (LGPD art. 16 caput, art. 18 VI)
