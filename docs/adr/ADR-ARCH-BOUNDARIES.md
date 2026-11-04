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
| B7 | motor `features/dynamicTables/**` não importa `features/(chat\|analytics\|integration)/services/` — "o motor nunca chama o consumidor" (Contrato §2.1). Emenda 2026-10-20, BE-INCR-DT-NO-CONSUMER-CALLS (dono, chat, 19/10: opção (b), F5 → β). Baseline antes/depois: 2 → **0** (as duas arestas `DynamicTableService → KnowledgeGraphService/KpiCacheService` removidas no mesmo PR; nunca entraram no arquivo de known violations). Prova de que morde: import plantado em `DynamicTableService.ts` → `B7` exit 1 | **0** |
| F1 | libs fiscais puras (`lib/{sped,ecf,ecfReal,nfe*,nfse*,mit,cnab,ofx,cnpj,cpf,referentialCatalog}.ts`) só leem `features/*/models/` — nada de service/repository/Prisma/HTTP | 0 |
| X1 | `lib/` (exceto `factory.ts`) não importa lógica de feature (models permitidos) | 0 |
| X2 | produção não importa teste | 0 |
| X3 | sem ciclo de import (ciclo que passa por `lib/factory.ts` é isento) | 16 |
| D1 | núcleo do DP `features/dp/**` não importa submódulo opcional `features/dp<Nome>/**` (F-DP-10). Emenda 2026-11-03 (§1.1) | **0** (em 03/11) |
| I6 | `src/controllers/` não importa `features/accounting/scope/resolveAccountingScopeInternal.ts` — controller resolve o escopo pelo `AccountingScopeResolver` (F-I6-7; dono, 2026-10-15, [`D-2026-10-15-I6-FORKS`](../plano/decisoes/D-2026-10-15-I6-FORKS.md)) — **exceção nomeada:** `controllers/crmController.ts`, cujo único uso é o hook Won `maybeSyncOpportunityWon` (unitId da oportunidade já gravada → chamador interno, F-I6-1 d; L-I6-3, dono, questionário, 2026-10-16: *"Exceção nomeada"*) | 42 em 16/10 (os controllers ainda não migrados; encolhe nos PR-2…PR-5 do I6 até 0) |

**Imports `type`-only contam.** Interface de repository dentro de policy é exatamente o sinal de policy impura que L5 quer ver.

### 1.1 Emenda 2026-11-03 — D1 (F-DP-10)

- **Decisão:** F-DP-10 → (a), dono, questionário, 02/11/2026: *"Cria a trava"*
  ([`D-2026-11-02-DP-PRE-ADR`](../plano/decisoes/D-2026-11-02-DP-PRE-ADR.md)). Executada pelo item 6 do
  [`BE-INCR-DP-F0-F1`](../accounting/BE-INCR-DP-F0-F1-brief.md), no primeiro PR de código do nó PES-4.
- **Regra:** `D1-dp-core-not-optional`, severidade de erro: `from ^src/features/dp/` (fora testes) →
  `to ^src/features/dp[A-Z][A-Za-z0-9]*/`. O núcleo do DP nunca importa um submódulo opcional; o opcional entra por porta
  com adaptador nulo, e só o `lib/factory.ts` (composition root, X1) importa `features/dp<Nome>/`.
- **Cobertura:** a exceção de 13/10 (§4), como a `B7`: gate estático que lê o código; não é bancada, rodada nem revisor.
- **Baseline antes/depois:** 28 violações conhecidas antes e 28 depois (o `.dependency-cruiser-known-violations.json` não
  mudou); a `D1` nasce com 0 e não entra no arquivo.
- **Prova de que morde (condição que falha, 03/11):** plantados `src/features/dpSondaD1/x.ts` e
  `src/features/dp/__sondaD1.ts`, este importando aquele ⇒ `npm run check:arch` exit 1 com
  `error D1-dp-core-not-optional: src/features/dp/__sondaD1.ts → src/features/dpSondaD1/x.ts`. Sem o plantio: exit 0
  ("no dependency violations found", 28 conhecidas ignoradas). Plantio removido.
- **Ponto cego declarado:** a regra olha `features/dp/`. Controller e rota do núcleo (`src/controllers/dp*.ts`,
  `src/routes/dp.ts`) ficam fora e falam só com o `getFactory()`; se um deles passar a chamar serviço de opcional, nenhuma
  regra pega. A regra entre opcionais (opcional só importa outro opcional declarado em `dependsOn`) também não existe.

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

**Emenda 2026-10-20 (dono, chat: "cria a regra de ESLint contra fetch cru") — ponto cego fechado no lint.** Regra
**R2b** no `my-app/eslint.gate.config.mjs` (`no-restricted-globals` + `no-restricted-properties` de
`window`/`globalThis`/`self.fetch`, em `pages/`, `features/`, `components/`, fora testes); spec em
`docs/architecture/lint-layer-gate.md` §R2b. Baseline antes/depois: 24 sites sem regra (+3 em `features/dev/`, fora da
contagem de 13/10) → **27 marcados `DEBT: fetch`** e declarados no bloco `debt-ledger` (que passou a contar
`no-restricted-globals`/`-properties` como regra de camada). Só encolhe. Prova de que morde: sem os marcadores, o
lint gate dá exit 1 com exatamente esses 27. Fica fora: `lib/context/AuthContext.tsx` (2 `fetch` em `lib/`).

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

## 6. Fase 3 — mutation testing (Stryker, fiscal/contábil) — emenda 2026-10-14

_Pendente: rodada em andamento; resultado entra aqui ao terminar._

## 7. Fase 4 — hook PostToolUse de fronteira (PROPOSTA, não ligada) — emenda 2026-10-14

**Status: proposta.** Nada foi gravado em `.claude/settings.json`; ligar é decisão do dono.

Feedback de fronteira no momento da edição, em vez de só no `check:arch` do CI. O script
`scripts/arch-hook.mjs` lê o JSON do hook no stdin (`tool_input.file_path`), decide o pacote pelo caminho,
roda o dependency-cruiser **só nesse arquivo** com a config e o baseline do pacote
(`--ignore-known`), e devolve as violações novas cujo `from` é o arquivo (ou ciclo que passa por ele) como
`hookSpecificOutput.additionalContext`. **Sai 0 sempre**, inclusive em erro interno, que vira texto.
Ignora: arquivo fora de `server/src/` ou de `my-app/{pages,features,components,lib,types}/`, testes
(`__tests__`, `*.test.*`, `*.spec.*`), `.d.ts` e não-código. Chama o binário com `process.execPath`, sem shell,
então roda igual no Git Bash/Windows e no Linux.

JSON proposto para `.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          { "type": "command", "command": "node \"$CLAUDE_PROJECT_DIR/scripts/arch-hook.mjs\"", "timeout": 30 }
        ]
      }
    ]
  }
}
```

**Ponto cego declarado:** cruza a partir do arquivo editado. Vê o que ele importa e o ciclo que passa por ele,
mas **não** vê quem passou a importá-lo. O gate continua sendo `npm run check:arch`.

**Prova em seco (14/10, `printf '{"tool_name":"Edit","tool_input":{"file_path":"<abs>"}}' | node scripts/arch-hook.mjs`):**

| Caso | Exit | Saída |
|---|---|---|
| my-app: `features/__archhook_probe/Probe.ts` plantado importando `lib/api/api-client` | 0 | `U1-no-direct-api-client: features/__archhook_probe/Probe.ts → lib/api/api-client.ts` |
| my-app: ciclo plantado `A.ts ↔ B.ts` | 0 | `U7-no-circular: …/A.ts → …/B.ts (ciclo: …/B.ts → …/A.ts)` |
| my-app: `components/ui/feedback/Toast.tsx` (limpo) | 0 | vazio (0 bytes) |
| my-app: `lib/context/ToastContext.tsx` (U2 **no baseline**) | 0 | vazio |
| server: `src/controllers/__archhookProbeController.ts` plantado importando `PayableRepository` | 0 | `L2-controller-not-repository: src/controllers/__archhookProbeController.ts → src/features/accounting/repositories/PayableRepository.ts` |
| server: `src/controllers/accountantAssignmentController.ts` (limpo) | 0 | vazio |
| server: `AccountingBindingPolicy.ts` (L5 **no baseline**) | 0 | vazio; o mesmo arquivo **sem** `--ignore-known` → depcruise exit 2 com L5 |
| arquivo de teste / `scripts/plano-vault.mjs` (fora de escopo) | 0 | vazio |
| stdin não-JSON | 0 | `[arch-hook] erro interno (edição não bloqueada): …` |

Concordância com o gate: com os plantios presentes, `npm run check:arch` deu exit 2 (my-app: U1 + U7) e exit 1
(server: L2), as mesmas violações que o hook apontou. Tempo por chamada: 1,0–1,5 s. Plantios removidos
(`git status` limpo).
