---
id: "MAQUINA-DE-ESTADOS"
tipo: "plataforma"
dominio: "plataforma"
titulo: "Máquina de estados pura por agregado, com o repositório fechado (BE-INCR-MAQUINA-DE-ESTADOS)"
estado: "planned"
estado_detalhe: "26/11: BRIEF pronto e forks F-SM-1..7 RATIFICADOS pelo dono por questionário, todos na recomendação ([[D-2026-11-26-MAQUINA-DE-ESTADOS-FORKS]]): comandos {de, para} no model, repositório só com métodos de transição, 409 para quem perde o CAS, sem gate novo, AP/AR depois do CANCELLING, DF-e por último e só declaração; sem 'executa'"
depende_de: ["[[D-2026-11-26-MAQUINA-DE-ESTADOS-FORKS]]", "[[X10a]]?"]
autorizacao: "dono, chat, 2026-11-26: \"sim, planejar a A com o repositório fechado\" e questionário (AskUserQuestion) da sessão de planejamento — F-SM-1 → \"Criar o nó (Recommended)\" (autoriza esta nota com write_set) e os forks F-SM-1..7 ratificados ([[D-2026-11-26-MAQUINA-DE-ESTADOS-FORKS]]). Cobre o BRIEF e esta nota; não cobre código — cada PR pede o 'executa'"
ancora_sdd: "—"
atualizado: "2026-11-26"
prs: ["#1426"]
perfil_previsto: "opus-medio"
perfil_evidencia: "PR-0 é lib pura e docs; PR-1..PR-5 trocam a forma do repositório agregado a agregado, e cada escrita que passa a ser condicional pede teste-guarda de corrida por spy antes do fix; PR-3 toca PayableService (2.253 linhas) e depende do CANCELLING"
write_set: ["docs/accounting/BE-INCR-MAQUINA-DE-ESTADOS-brief.md", "server/src/lib/lifecycle.ts", "server/src/lib/__tests__/lifecycle.test.ts", "docs/adr/PRE-ADR-LIFECYCLE-TRANSITIONS.md", "docs/adr/INDEX.md", ".claude/skills/_ARCHITECTURE-CONTRACT.md", ".claude/skills/backend-repository-generator/SKILL.md", ".claude/skills/luminaris-reviewer/SKILL.md", "docs/operating-manual/TESTES.md", "server/src/features/accounting/models/{BankSettlement.model,CollectionCharge.model,ledgerStatus,FixedAsset.model,Payable.model,Receivable.model,DataExchange.model}.ts", "server/src/features/accounting/models/__tests__/*.lifecycle.test.ts", "server/src/features/accounting/repositories/{I,}{BankSettlement,CollectionCharge,JournalEntry,FixedAsset,Payable,Receivable,DataExchange,FiscalDocument}Repository.ts", "server/src/features/accounting/services/{BankSettlementService,PayableService,ReceivableService,WithholdingService,FiscalDocumentLifecycleService}.ts", "server/src/features/teammates/{models/AgentTurn.model,repositories/AgentTurnRepository,services/TeammateRunner}.ts", "server/src/features/accounting/dtos/**"]
registros: ["server/public/openapi.json", "server/src/features/accounting/dtos/__tests__/__dto-shapes__.json"]
---
# MAQUINA-DE-ESTADOS — máquina pura por agregado, com o repositório fechado

**Estado:** `planned` — 26/11: BRIEF pronto e forks F-SM-1..7 RATIFICADOS pelo dono por questionário, todos na recomendação ([[D-2026-11-26-MAQUINA-DE-ESTADOS-FORKS]]): comandos {de, para} no model, repositório só com métodos de transição, 409 para quem perde o CAS, sem gate novo, AP/AR depois do CANCELLING, DF-e por último e só declaração; sem 'executa'  
**Autorização:** frontmatter. Cobre o BRIEF e esta nota; cada PR de código pede o `executa` do dono.
**Depende de:** pontilhada [[X10a]] (o PR-5, do DF-e, espera a `integration/x10a` na `main`). O PR-3 (AP/AR) espera os PR-1 e
PR-2 do `BE-INCR-CANCELAMENTO-CANCELLING` (sem nó; BRIEF em `docs/accounting/`).
**Desbloqueia:** as fatias de front e de presets DynamicTable da mesma decisão, sem BRIEF ainda: lacunas
`L-20261126-181923-c16f` (front) e `L-20261126-181930-5f5d` (presets).
**Write-set:** exato para PR-0, PR-1 e PR-3. Os serviços chamadores de PR-2, PR-4, PR-5 e PR-7 só se fecham na leitura de
abertura de cada PR; quem abrir regrava o `write_set` antes de editar (até lá o `paralelo.mjs` não os enxerga).

## Docs
- [`BE-INCR-MAQUINA-DE-ESTADOS-brief.md`](../../accounting/BE-INCR-MAQUINA-DE-ESTADOS-brief.md) — BRIEF de 26/11 (fatos lidos, opções, checklist PR-0..PR-7, contratos, forks F-SM-1..7)
- [[D-2026-11-26-MAQUINA-DE-ESTADOS-FORKS]] — ratificação dos forks
- [`PRE-ADR-LIFECYCLE-TRANSITIONS.md`](../../adr/PRE-ADR-LIFECYCLE-TRANSITIONS.md) — inventário de 09/11 e fila de adoção (o PR-0 o emenda e promove)
- [`ADR-DOMAIN-MOTOR-rejected.md`](../../adr/ADR-DOMAIN-MOTOR-rejected.md) — o limite: sem fase, hook, evento, registry ou fila

## Origem
Pergunta do dono no chat em 26/11/2026 sobre o nível da arquitetura dos módulos. Medida da sessão: 41 colunas `status`, 2 tabelas
de transição declaradas, `assertTransition` em 1 sítio de runtime, e 11 escritas livres de `status` no AP e no AR.
