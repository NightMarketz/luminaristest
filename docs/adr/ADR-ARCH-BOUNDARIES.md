# ADR-ARCH-BOUNDARIES — Fronteiras de camada mecanizadas (dependency-cruiser) + código morto e duplicação em modo relatório

- **Data:** 2026-10-13
- **Status:** **Accepted 2026-10-13 (dono, chat)** — fronteiras aprovadas no checkpoint da Fase 1; exceção à regra ⛔ do `CLAUDE.md` raiz ratificada no mesmo checkpoint (§4).
- **Classe:** DECISÃO ARQUITETURAL (gate estático de produtividade)
- **Depende de:** `.claude/skills/_ARCHITECTURE-CONTRACT.md` §2 (cadeia de camadas), §2.1 (`AC-2.1-B1`), §3 (frontend); `PRE-ADR-FE-CONTRACT-TYPES.md` (FE não importa backend).
- **Complementa, não substitui:** o layer-gate do ESLint (`server/eslint.config.mjs` R1/R1b, `my-app/eslint.gate.config.mjs`) + `scripts/debt-ledger-check.mjs`. O ESLint continua dono da trilha de supressão (debt-ledger); o dependency-cruiser cobre o grafo inteiro (todas as camadas, ciclos, fronteira entre features).

## TLDR (2 linhas)

As regras de camada do contrato viraram 11 regras (server) + 7 (my-app) no dependency-cruiser; `check:arch` **bloqueia** o CI, mas só para violação **nova** — as 35 (server) e 18 (my-app) existentes estão congeladas no baseline. `check:dead` (knip) e `check:dup` (jscpd) só reportam.

## 1. Fronteiras aprovadas — server (`server/.dependency-cruiser.cjs`)

```
Route → Controller → Service → Repository → Prisma (lib/prisma.ts)
                        ↘ Policy          models/ dtos/ = folhas
lib/factory.ts = composition root (única peça de lib/ que conhece features)
```

| ID | Regra | Baseline 13/10 |
|---|---|---|
| L1 | `routes/` não importa service/repository/`lib/prisma` | 0 |
| L2 | controller não importa repository nem `lib/prisma` | 3 (interface `IAccountingBindingRepository`) |
| L3 | service não importa controller/route/Express/`lib/prisma` | 3 (= as 3 supressões do ESLint: 1 SANCTIONED `DynamicTableService`, 2 DEBT) |
| L4 | repository não importa service/controller/route/policy | 4 |
| L5 | policy não importa repository/service/`lib/prisma` (nem interface) | 5 (todas type-only) |
| L6 | `models/`, `dtos/` não importam camada executável | 4 |
| B1 | motor `features/dynamicTables/**` não importa `accounting`, `accountingBinding`, `legalParameters`, `fx`, `sectorKits` (`AC-2.1-B1`) | **0** |
| F1 | libs fiscais puras (`lib/{sped,ecf,ecfReal,nfe*,nfse*,mit,cnab,ofx,cnpj,cpf,referentialCatalog}.ts`) só leem `features/*/models/` — nada de service/repository/Prisma/HTTP | 0 |
| X1 | `lib/` (exceto `factory.ts`) não importa lógica de feature (models permitidos) | 0 |
| X2 | produção não importa teste | 0 |
| X3 | sem ciclo de import (ciclo que passa por `lib/factory.ts` é isento) | 16 |

**Imports `type`-only contam.** Interface de repository dentro de policy é exatamente o sinal de policy impura que L5 quer ver.

## 2. Fronteiras aprovadas — my-app (`my-app/.dependency-cruiser.cjs`)

| ID | Regra | Baseline 13/10 |
|---|---|---|
| U1 | `pages/`, `features/`, `components/` não importam `lib/api/api-client` (só `lib/services/*.service.ts`) | 0 |
| U2 | `lib/` não importa `features/`, `components/`, `pages/` | 1 (`ToastContext` → `components/ui/feedback/Toast`) |
| U3 | `components/` não importa `features/`, `pages/` | 13 (`ErpViewWidget`, `AnalyticsWidget`, `GoldKpiWidgetView`) |
| U4 | `features/` não importa `pages/` | 0 |
| U5 | nada importa de `server/` | 0 |
| U6 | produção não importa teste | 0 |
| U7 | sem ciclo de import | 4 |

**Ponto cego declarado:** `fetch()` cru é global, não import — o dependency-cruiser **não** o vê. Em 13/10 havia 24 chamadas em `features/`/`components/` (fora `features/dev/`). Mecanizar isso é regra ESLint (`no-restricted-globals`), fatia própria.

## 3. Mecânica do gate

- `npm run check:arch` (em `server/` e `my-app/`) — `depcruise … --ignore-known .dependency-cruiser-known-violations.json`. Exit ≠ 0 só com violação fora do baseline.
- `npm run check:arch:baseline` — regenera o baseline. **Só ao PAGAR dívida** (o arquivo encolhe). Regenerar para engolir violação nova é burlar o gate; o diff do baseline aparece no PR.
- `npm run check:dead` (knip, `--no-exit-code`) e `npm run check:dup` (jscpd, `--exitCode 0`) — CI com `continue-on-error`. Promover a bloqueante = decisão nova.
- Prova de que o gate morde (13/10, condição que falha): controller plantado importando `PayableRepository` → `L2` exit 1; componente plantado importando `api-client` → `U1` exit 1; arquivo em `dynamicTables/services/` importando `PostingService` → `B1` exit 1. Sem o plantio: exit 0 com "35/18 known violations ignored".

Números de referência em 13/10 (relatório, não meta): duplicação server 3,53% / my-app 4,29% (jscpd, sem testes e sem `*.gen.ts`); knip server 19 arquivos não usados em `src/`, my-app 24 (contratos `*.gen.ts` ignorados).

## 4. Exceção à regra ⛔ do CLAUDE.md raiz

A regra "não monte aparato de auditoria novo — nem gate" (bancada desligada em 2026-08-09) foi levantada no checkpoint. Decisão do dono (chat, 13/10): **exceção explícita** — gate estático que lê o código (como o `tsc` e o lint de camada) é ferramenta de produtividade, não bancada de auditoria (rodada/revisor). A exceção cobre **este** gate; não reabre a bancada nem autoriza revisor/rodada nova.

## 5. Mudar uma fronteira

Mexer em regra, severidade ou escopo (inclusive promover `check:dead`/`check:dup`) = ADR novo ou emenda datada aqui, com o número do baseline antes/depois.
