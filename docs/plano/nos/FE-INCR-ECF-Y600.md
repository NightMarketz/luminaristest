---
id: "FE-INCR-ECF-Y600"
tipo: "fe"
dominio: "fiscal"
titulo: "Painéis da ECF (Presumido e Real) coletam o Y600: sócios do cadastro + complemento, dirigentes"
estado: "planned"
estado_detalhe: "29/10: BRIEF escrito (docs/accounting/FE-INCR-ECF-Y600-brief.md, 17 itens: PR-0 BE de leitura condicional ao F-FE-Y600-1, PR-1 editor + 2 painéis + teste-guarda, PR-2 cadastro de sócios condicional ao F-FE-Y600-2). 29/10: forks F-FE-Y600-1..6 ratificados na recomendação ([[D-2026-10-29-FE-ECF-Y600-FORKS]]), entram o PR-0 e o PR-2; falta o executa. Origem: passo 14 do H2 FALHOU (29/10, PR #982): ECF Presumido 400 ECF_Y600_COMPLEMENTO_FALTANDO, ECF Real 400 ECF_Y600_SEM_SOCIOS — os painéis mandam socios: [] fixo; o FE não tem tela nem service de sócios; GET /partners só lista vigentes numa data"
depende_de: ["[[D-2026-10-22-ECF-Y600-FORKS]]", "[[IRRF-DISTRIBUICAO]]", "[[D-2026-10-29-FE-ECF-Y600-FORKS]]"]
autorizacao: "dono, chat, 2026-10-29: \"Pode disparar uma sessão de correção\" + \"As duas\" (esta = planejamento do Y600) — só o BRIEF e a nota; forks ratificados no questionário do mesmo dia (D-2026-10-29-FE-ECF-Y600-FORKS); sem 'executa'"
ancora_sdd: "—"
perfil_previsto: "sonnet-alto"
perfil_evidencia: "regra 1 não casa (F-FE-Y600-1..6 ratificados 29/10). Por PR: PR-1 = sonnet-alto (17 itens, FE, regra fiscal só espelhada do BE); PR-0 = sonnet-medio (só leitura, função extraída); PR-2 = sonnet-medio (CRUD com contrato gerado)"
write_set: ["my-app/features/accounting/components/SpedGenerationPanel.tsx", "my-app/features/accounting/components/SpedEcfRealPanel.tsx", "my-app/features/accounting/components/EcfY600Editor.tsx", "my-app/features/accounting/lib/ecfY600.ts", "my-app/features/accounting/hooks/useY600Vigencias.ts", "my-app/features/accounting/components/__tests__/**", "my-app/features/accounting/lib/__tests__/**", "my-app/lib/services/sped.service.ts", "my-app/public/locales/*/accounting.json", "server/src/features/accounting/services/y600FromPartners.ts", "server/src/features/accounting/dtos/SpedEcfDto.ts", "server/src/controllers/spedController.ts", "server/src/routes/docs/accounting.sped.paths.ts", "server/src/features/accounting/**/__tests__/**", "my-app/features/accounting/components/PartnersSection.tsx", "my-app/lib/services/partners.service.ts"]
registros: ["server/src/routes/accounting.ts", "server/src/lib/factory.ts", "my-app/types/contracts/accounting/SpedEcfDto.gen.ts"]
atualizado: "2026-10-29"
---
# FE-INCR-ECF-Y600 — Painéis da ECF coletam o Y600

**Estado:** `planned` — 29/10: BRIEF escrito; forks F-FE-Y600-1..6 ratificados na recomendação ([[D-2026-10-29-FE-ECF-Y600-FORKS]]); falta o executa. Origem: passo 14 do [[H2]] FALHOU em 29/10 (PR #982).  
**Autorização:** dono, chat, 2026-10-29: *"Pode disparar uma sessão de correção"* e, perguntado qual sessão, *"As duas"* (esta é a de planejamento do Y600). Cobre só o BRIEF e esta nota. Forks ratificados no questionário do mesmo dia; sem 'executa'.  
**Depende de:** [[D-2026-10-22-ECF-Y600-FORKS]] (BE-INCR-ECF-Y600 em `main`), [[IRRF-DISTRIBUICAO]] (cadastro `Partner`, PR-1)  
**Desbloqueia:** passo 14 do [[H2]] (ECF Presumido e Real pela tela)  
**Âncora no SDD consolidado:** —

## Docs

- [`docs/accounting/FE-INCR-ECF-Y600-brief.md`](../../accounting/FE-INCR-ECF-Y600-brief.md) — BRIEF (29/10): checklist de 17 itens em 3 PRs, contratos, forks F-FE-Y600-1..6
- [`docs/accounting/BE-INCR-ECF-Y600-brief.md`](../../accounting/BE-INCR-ECF-Y600-brief.md) — o backend; §7 lista este nó como vizinho
- Decisão do BE: [[D-2026-10-22-ECF-Y600-FORKS]]
- Decisão deste nó: [[D-2026-10-29-FE-ECF-Y600-FORKS]]

## Forks (ratificados 29/10, todos na recomendação)

| Fork | Ponto | Escolha do dono |
|---|---|---|
| F-FE-Y600-1 | De onde a tela tira as vigências do ano | (b) rota de leitura da ECF pela mesma função do `montarY600` (PR-0, toca `server/`) |
| F-FE-Y600-2 | Cadastro de sócios pela tela | (a) PR-2 deste nó (amplia o item) |
| F-FE-Y600-3 | Dirigentes | (a) editor manual, sem importar de `company-signers` |
| F-FE-Y600-4 | Select de QUALIF filtra por caso | (a) filtra no FE (tabela da p. 574) |
| F-FE-Y600-5 | Onde fica a seção Sócios | (a) aba Perfil fiscal |
| F-FE-Y600-6 | Complemento persiste? | (a) não (D4) |

## Teste-guarda

`EcfY600.guard.test.tsx` (vitest, item 13a): com uma vigência cadastrada, gerar a ECF pelos dois painéis chama o
service com `socios[0].partnerId` preenchido; hoje falha porque o body sai com `socios: []`. Oráculo real: reexecutar
o passo 14 do RUNBOOK-H2 em build de produção (gate humano).
