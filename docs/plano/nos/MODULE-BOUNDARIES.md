---
id: "MODULE-BOUNDARIES"
tipo: "plataforma"
dominio: "plataforma"
titulo: "Fronteira entre features (public/), peça fora de pasta de camada, job como entrypoint e posse de model do Prisma (ADR-MODULE-BOUNDARIES)"
estado: "planned"
estado_detalhe: "24/11: ADR-MODULE-BOUNDARIES Accepted (forks F-MB-1..12 ratificados; D-2026-11-24-MODULE-BOUNDARIES-FORKS, PR #1366) · 24/11: BRIEF de execução escrito (sessao-planejamento), com a medida nova na main d3f3a201c (M1 393, M1a 49, M2 879, J1 18, U8 11, U9 45; posse 138/146) e 11 forks novos F-MBE-1..11 com RATIFICAÇÃO PENDENTE · execução de código NÃO autorizada (falta 'executa'); nenhuma regra ligada, nenhum arquivo movido"
depende_de: []
autorizacao: "dono, 2026-11-24, questionário (AskUserQuestion) da sessão de planejamento: \"Sim, planejar o BRIEF\" — cobre o BRIEF, esta nota com write_set, a medida nova e um PR só de documentação. Não é 'executa' de nenhum PR do BRIEF. A ratificação dos forks F-MB-1..12 (dono, 2026-11-24, questionário; D-2026-11-24-MODULE-BOUNDARIES-FORKS) também não é 'executa'"
ancora_sdd: "—"
atualizado: "2026-11-24"
prs: []
perfil_previsto: "precisa-de-planejamento"
perfil_evidencia: "11 forks F-MBE-1..11 pendentes (onde os PRs entram, tamanho do PR da M2, public/ × regras de camada, reader em transação, forma da regra de posse, destino de fixtures/ e do widget de chat); depois deles, PR-0/PR-1/PR-2 são mecânicos e o renome é diff grande de path"
write_set: ["docs/architecture/MODULE-BOUNDARIES-brief.md", "docs/adr/ADR-MODULE-BOUNDARIES.md", "server/src/features/*/public/**", "server/src/features/*/domain/**", "server/src/features/*/adapters/**", "server/src/features/dynamicTables/**", "server/src/features/analytics/**", "server/src/features/sectorKits/**", "server/src/features/accountingBinding/**", "server/src/features/interview/**", "server/src/features/crm/**", "server/src/features/fx/clients/**", "server/src/features/sales/services/**", "server/src/features/packages/services/**", "server/src/features/attachments/services/**", "server/src/features/chat/{models,repositories,services}/**", "server/src/features/accounting/{scope,sync,dfe,collection,audit,fixtures}/**", "server/src/features/accounting/models/{issLimite,lc116ListaNacional,outstandingLines}.ts", "server/src/features/accounting/repositories/{I,}AccountantAssignmentRepository.ts", "server/src/features/accounting/policies/IAccountingPolicy.ts", "server/src/jobs/**", "server/prisma-model-owners.cjs", "server/eslint-rules/**", "docs/architecture/lint-layer-gate.md", "docs/claude-skills/GENERATION_CONTRACTS.md", ".claude/skills/**", "scripts/{activate-salon-binding,anexo-iii-to-fixture,anexo-xi-to-fixture,classe-risco,ecf-tabelas-dinamicas-to-catalog}.mjs", "my-app/components/widgets/**", "my-app/components/layout/Navbar.tsx", "my-app/features/{dashboard,crm,chat,shell}/**", "my-app/pages/_app.tsx"]
registros: ["server/.dependency-cruiser.cjs", "server/.dependency-cruiser-known-violations.json", "my-app/.dependency-cruiser.cjs", "my-app/.dependency-cruiser-known-violations.json", "docs/adr/ADR-ARCH-BOUNDARIES.md", "server/src/lib/factory.ts", "server/eslint.config.mjs", "CLAUDE.md"]
---
# MODULE-BOUNDARIES — fronteira entre features, peça fora de camada, job como entrypoint, posse de model

**Estado:** `planned`. **ADR:** [`ADR-MODULE-BOUNDARIES.md`](../../adr/ADR-MODULE-BOUNDARIES.md), Accepted em 24/11/2026 (o §10 prevalece sobre os §2–§4).
**Autorização:** frontmatter. Cobre o BRIEF; cada PR de código pede o `executa` do dono.
**Desbloqueia:** —

## Origem

Medida de encapsulamento pedida pelo dono em 20/10 (ADR proposto) e ratificada por questionário em 24/11: API pública por pasta `features/<x>/public/`, todas as regras de import ligadas já com baseline, a `M2` ligada no PR que move as pastas, `DynamicTableReader` com a guarda de tenant num lugar só, porta estreita `RuleDataAccess` no motor e regra de posse de model no ESLint do server (exceção nova à regra ⛔ do `CLAUDE.md` raiz).

## Medida de 24/11 (`main` = `d3f3a201c`)

| Regra | 20/10 | 24/11 |
|---|---|---|
| `M1` (alvo `public/`) | 264 | 393 |
| `M1a` | 45 | 49 |
| `M2` (como o §10 escreve) | 823 | 879 arestas, 196 módulos |
| `J1` | 16 | 18 |
| `U8` | 3 | 11 |
| `U9` (alvo `public/`) | 40 | 45 |
| Posse: models com escrita / escritas fora de `repositories/` | 138 / exceções nomeadas | 138 / 15 chamadas + 1 SQL cru |

## Forks pendentes (BRIEF §7)

F-MBE-1 onde os PRs entram (`main` × `integration/module-boundaries`) · F-MBE-2 tamanho do PR da `M2` (único × por feature) · F-MBE-3 `public/` cega `L2`/`L5`/`L6`/`M1a` (regra `M3`) · F-MBE-4 nome `D1` já em uso (`D2`) · F-MBE-5 `M2` × `paises/<cc>/` · F-MBE-6 destino de `accounting/fixtures/` · F-MBE-7 `DynamicTableReader` dentro de transação · F-MBE-8 widget de chat no frontend · F-MBE-9 feature do `Navbar` · F-MBE-10 como a regra de posse reconhece o Prisma · F-MBE-11 branches `modulos-base-pr5/pr6` × renome de `presets/`.

## Docs

- BRIEF: [`MODULE-BOUNDARIES-brief.md`](../../architecture/MODULE-BOUNDARIES-brief.md) (24/11; forks F-MBE-1..11 pendentes, sem `executa`).
- ADR: [`ADR-MODULE-BOUNDARIES.md`](../../adr/ADR-MODULE-BOUNDARIES.md); mecânica do gate em [`ADR-ARCH-BOUNDARIES.md`](../../adr/ADR-ARCH-BOUNDARIES.md) §3–§5.
- Decisão dos forks F-MB-1..12: `docs/plano/decisoes/D-2026-11-24-MODULE-BOUNDARIES-FORKS.md` (entra na `main` pelo PR #1366; o link de vault entra aqui no fold seguinte ao merge dele).
- Vizinhos: [[PAIS-NA-BORDA]] (mesmos choke points, `paises/<cc>/`, `ChartOfAccountsFixture`), [[BUILDER-VERTICAIS]] (`dynamicTables/presets`).

## Lacunas registradas na sessão de planejamento (caixa do maestro)

- `L-20261124-135606-0dc7` — nota do BUILDER-VERTICAIS cita #1114/#1115, fechados sem merge.
- `L-20261124-135607-990d` — a régua de classe de risco não lista as configs dos gates de fronteira.
- `L-20261124-135608-6827` — hooks de chat duplicados em `components/widgets/{chat,shared}/hooks/`.
- `L-20261124-135609-e7de` — 8 models do schema sem escrita direta em produção.
- `L-20261124-135610-07f5` — 13 módulos fora de camada sem importador de produção.
