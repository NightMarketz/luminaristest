---
id: "CENTAVOS-EXATOS"
tipo: "regua"
dominio: "contabil"
titulo: "Um conversor reais→centavos com arredondamento decimal exato em razão e subrazão fiscal (BE-INCR-CENTAVOS-EXATOS)"
estado: "planned"
estado_detalhe: "24/11: BRIEF pronto (PR #1371) e forks F-CE-1..9 RATIFICADOS pelo dono por questionário, todos na recomendação ([[D-2026-11-24-CENTAVOS-EXATOS-FORKS]]): meio-para-cima decimal, borda e origem em etapas, corte único antes do go-live, tudo em PRs separados, núcleo em lib/decimalMoney.ts, trava de ESLint · depende do #1360 mergeado antes do PR-1 · sem 'executa'"
depende_de: ["[[X14]]", "[[D-2026-11-24-CENTAVOS-EXATOS-FORKS]]", "[[X10a]]?"]
autorizacao: "dono, chat, 2026-11-24: questionário (AskUserQuestion) da sessão de planejamento — F-CE-6 e nó → \"Simétrico + criar o nó (Recommended)\" (autoriza esta nota com write_set) e os forks F-CE-1..9 ratificados ([[D-2026-11-24-CENTAVOS-EXATOS-FORKS]]). Cobre o BRIEF e esta nota; não é 'executa' de PR algum — cada PR de código pede o 'executa' do dono"
ancora_sdd: "—"
atualizado: "2026-11-24"
prs: ["#1371"]
perfil_previsto: "opus-medio"
perfil_evidencia: "PR-0..PR-2 são oráculo e roteamento mecânico sem mudar valor; PR-3 é a virada num núcleo único com pins, goldens e integração de tie-out; PR-4 toca o SalesPlugin (motor) com a ordem por linha já decidida (F-CE-3)"
write_set: ["docs/accounting/BE-INCR-CENTAVOS-EXATOS-brief.md", "server/src/lib/decimalMoney.ts", "server/src/lib/saleLine.ts", "server/src/lib/__tests__/reaisToCentsExato.oraculo.test.ts", "server/src/features/accountingBinding/interpreter/money.ts", "server/src/features/accounting/sync/mappers/**", "server/src/features/accounting/sync/bridges/SalePackageSoldBridge.ts", "server/src/features/accounting/sync/bridges/CrmReceivableBridge.ts", "server/src/features/accounting/sync/bridges/saleItems.ts", "server/src/features/sales/services/RegisterPaymentService.ts", "server/src/features/packages/services/PackageAcceptanceService.ts", "server/src/jobs/accountingSyncReconcile.job.ts", "server/src/features/accounting/services/ReceitaFiscalService.ts", "server/src/features/accounting/services/ReceitaFiscalRecebimentoService.ts", "server/src/features/accounting/services/__tests__/receitaFiscalFloat.*", "server/src/features/dynamicTables/rules/plugins/SalesPlugin.ts", "server/src/features/dynamicTables/rules/plugins/sales/discountGuard.ts", "server/src/features/accounting/dtos/NfeIbsCbsDto.ts", "server/src/features/accounting/dtos/NfePayloadDto.ts", "server/src/features/accounting/services/FiscalDocumentEmissionService.ts", "server/eslint.config.mjs"]
registros: ["server/eslint.config.mjs"]
---
# CENTAVOS-EXATOS — um conversor reais→centavos, decimal exato

**Estado:** `planned` — 24/11: BRIEF pronto (#1371) e forks F-CE-1..9 ratificados ([[D-2026-11-24-CENTAVOS-EXATOS-FORKS]]); depende do #1360 mergeado antes do PR-1; sem `executa`
**Autorização:** frontmatter. Cobre o BRIEF e esta nota; cada PR de código pede o `executa` do dono.
**Depende de:** [[X14]] (subrazão fiscal e `tieOut`); pontilhada [[X10a]] (parsers de documento, lacuna 33b2).
**Desbloqueia:** —

## Docs
- [`BE-INCR-CENTAVOS-EXATOS-brief.md`](../../accounting/BE-INCR-CENTAVOS-EXATOS-brief.md) — BRIEF de 24/11 (estrutural, incremental, remendo, forks F-CE-1..9)
- [[D-2026-11-24-CENTAVOS-EXATOS-FORKS]] — ratificação dos forks

## Origem
Lacunas `L-20261124-062159-5b0a` (fork), `L-20261124-062159-9d1e` (`splitRevenueCredit`) e `L-20261124-062201-33b2` (`NfeIbsCbsDto`),
nascidas na onda 2.3 da auditoria fiscal/contábil de 24/11/2026 (PR #1360).
