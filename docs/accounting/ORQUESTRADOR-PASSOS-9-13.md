# Orquestrador — Passos 9–13 (Fold + Motor + Boundary Test)

**Escopo:** automação de 5 passos doc-only + testes mecânicos, alternando Haiku (tarefas de leitura/grep/fold) e Sonnet (decisão/fork).

**Entrada:** `origin/main` = `0548d19a` (C8 PR-3 mergeado 20/09). Nenhuma tarefa deste documento roda antes disso.

**Saída:** `main` com passos 9–13 completados (ou bloqueados por aguardar autorização do dono).

---

## Despacho (sequência de agentes)

| Passo | Task | Modelo | Entrada | Saída | Gate | Próximo |
|---|---|---|---|---|---|---|
| **9** | **Fold**: master map + grafo + PROXIMOS-PASSOS | **Haiku** | `origin/main` + arquivo de estado 22/09 | banner 45/57 → 47/57 (C12 ✅ + C8 espera PR-5 ou declaração); GRAFO corrigido; PROXIMOS-PASSOS coluna Estado atualizada | grep "46/57\|47/57\|contábil.*20/22" | ✅ → 10 |
| **10** | **Docs PR**: Contrato §2.1/§2.2/§2.3 + ADR + GAP-MAP + skills + gates | **Haiku** | branch `claude/domain-motor-architecture-7ec49d` (uncommitted no worktree, ou committed localmente) | Commit mergeado em `main`; 22 arquivos; skill-audit 0 findings | `git log --oneline main -1 \| grep -c "atomicUntil"` → ≥1 | ✅ → espera "11 instrumenta" |
| **11** | **GAP-MAP 7**: teste `it.failing` — `unique`/`compositeUnique` sem gate in-tx | **Haiku** | `main` com passo 10 mergeado; arquivo `NoOverlapConcurrency.integration.test.ts` como molde | `server/src/features/dynamicTables/__tests__/UniqueFieldConcurrency.integration.test.ts` vermelho na CI Linux | `npx jest UniqueFieldConcurrency --no-coverage 2>&1 \| grep failing` | espera "instrumenta" dono |
| **12** | **GAP-MAP 8**: teste `it.failing` — `deleteTableData` ignora `immutableAfter` | **Haiku + Sonnet** | `main` com passo 10 mergeado; `DynamicTableService.ts` + schema | teste vermelho; fork (a) vs (b) apresentado ao dono | `npx jest immutableAfter.test --no-coverage 2>&1 \| grep failing` | espera dono: fork + "corrige" |
| **13** | **PR-B**: `atomicUntil.boundary.test.ts` (população=8) + retrofit 8 JSDocs | **Haiku** | `main` com passo 10 mergeado; población validada = 8 arquivos | teste verde; GAP-MAP Nível 3 `[PAPEL]→[COBERTO]`; coverage `AC-2.3-2` ✅ | `npx jest atomicUntil.boundary --no-coverage` = verde | espera "executa" dono |

---

## Passo 9 — Fold (Haiku)

**O quê:**
1. Atualizar `docs/accounting/ACCOUNTING-MASTER-MAP.md` §5: banner 45/57 → 47/57; C12 ✅; C8 depende PR-5.
2. Atualizar `docs/accounting/GRAFO-DEPENDENCIAS-2026-09-14.md`: C9 absorvido no C8.
3. Atualizar `PROXIMOS-PASSOS-2026-09-17.md`: coluna Estado para passos 4–5; seção "Estado em 2026-09-22".

**Gate:** `grep "contábil 20/22" docs/accounting/ACCOUNTING-MASTER-MAP.md | wc -l` → ≥1

---

## Passo 10 — Docs PR (Haiku)

**Status:** ✅ cherry-pickado como `4b5b04c5` em `main` (22/09).

**Confirmação:**
```bash
git log --oneline main | grep -i "atomicUntil\|motor de domínio" | head -1
ls docs/adr/ADR-DOMAIN-MOTOR-rejected.md
node .claude/skills/skill-audit/skill-audit.mjs run --all  # → 0 findings
```

---

## Passo 11 — GAP-MAP 7, Instrumentação (Haiku)

**Autorização:** "instrumenta" (dono).

**O quê:**
1. Criar `server/src/features/dynamicTables/__tests__/UniqueFieldConcurrency.integration.test.ts`:
   - Molde: `NoOverlapConcurrency.integration.test.ts` (Promise.all + `expect(count).toBe(1)`).
   - Preset com `compositeUnique: ['email', 'tenant']`.
   - 8 writes concorrentes do mesmo (email, tenant) → esperado: 1 persistido, 7 falhos.
   - `it.failing` com comentário citando GAP-MAP lacuna 7.

2. Referenciar no GAP-MAP "Nível 4 — Runtime sistêmico".

**Gate:** `npx jest UniqueFieldConcurrency --no-coverage 2>&1 | grep "failing"` → vermelho esperado.

---

## Passo 12 — GAP-MAP 8, Instrumentação + Fork Decision

**Autorização:** "instrumenta" (dono).

**Haiku:**
1. Criar `server/src/features/dynamicTables/__tests__/DynamicTableService.immutableAfter.test.ts`:
   - Preset com `immutableAfter: {scope: 'all', statusField: 'status'}`.
   - Linha em status `Paid` → `deleteTableData(id)` deve lançar.
   - `it.failing` citando GAP-MAP lacuna 8.

**Sonnet:**
1. Ler `DynamicTableService.ts` `deleteTableData` + Guards 2/3 do `updateTableData`.
2. Apresentar fork:
   - **(a)** Guard no delete (+20 linhas, cobre raiz).
   - **(b)** `deleteConstraints: RESTRICT` no preset (não cobre raiz).
3. Aguardar resposta do dono.

**Gate:** `npx jest immutableAfter.test --no-coverage 2>&1 | grep "failing"` → vermelho esperado.

---

## Passo 13 — PR-B: `atomicUntil` Boundary Test + Retrofit (Haiku)

**Autorização:** "executa" (dono).

**O quê:**
1. Criar `server/src/features/accounting/__tests__/atomicUntil.boundary.test.ts`:
   - Varre `grep -rlE "\.postEntry\(" server/src/features/*/services --include=*.ts | grep -v __tests__ -v PostingService`.
   - Asserte que o primeiro JSDoc de cada arquivo contém `atomicUntil:`.
   - `expect(offenders.length).toBe(0)`.

2. Retrofit 8 JSDocs (payable, receivable, depreciation, fixedAsset, review, bankSettlement, dataExchangeImport, exerciseClosing):
   - Inserir **acima da linha 1** (antes do `import`).
   - Template: `atomicUntil:`, `commit 1 — razão`, `commit 2 — subrazão` (ou `— nenhum`), `reconcile —`, `fora da tx —`.
   - Cada linha cita teste que prova.

3. `backend-service-generator/governance.md`: gate `type: static` + target = boundary test.

4. `governance/coverage.md`: `AC-2.3-2` = ✅.

5. `GAP-MAP.md` Nível 3: célula `atomicUntil` = `[COBERTO]`; fila item 9 = ✅.

**Gate:**
```bash
npx jest atomicUntil.boundary --no-coverage  # → verde (0 ofensores)
npx tsc --noEmit  # → limpo
npm run test:integration  # → sem regressão
node .claude/skills/skill-audit/skill-audit.mjs run --all  # → 0 findings
```

---

## Orquestração recomendada

```
tempo=0
Despachar: passo 9 (Haiku) + passo 10 (Haiku) em paralelo [não bloqueantes]

tempo=30min (após 10 verde)
Despachar: passo 11 (Haiku) + passo 12-Haiku (Haiku) em paralelo

tempo=45min (após 12-Haiku verde)
Sonnet avalia fork de passo 12; aguarda resposta do dono

tempo=60min (após dono responde fork 12 + 11 verde)
Despachar: passo 13 (Haiku) [depende 10 verde]

tempo=120min (após 13 verde)
✅ passos 9–13 completos. Próximo: C8 PR-4/PR-5, se dono autorizar.
```

---

## Modelo × Autorização × Bloqueador

| Passo | Modelo | Autorização | Bloqueador |
|---|---|---|---|
| 9 | Haiku | — | não |
| 10 | Haiku | — | não (já feito) |
| 11 | Haiku | "instrumenta" | sim (aguarda auth dono) |
| 12 | Haiku + Sonnet | "instrumenta" + fork | sim (aguarda auth + decisão fork) |
| 13 | Haiku | "executa" | sim (depende 10 verde + aguarda auth) |

**Padrão:** Haiku executa; Sonnet apenas quando há leitura de código + decisão design. "instrumenta" = teste vermelho sem lógica; "executa" = código com lógica.
