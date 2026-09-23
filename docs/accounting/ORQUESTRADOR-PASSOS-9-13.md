# Orquestrador — Passos 9–13 (Fold + Motor + Boundary Test)

> **⛔ SUPERSEDIDO em 2026-09-23** pelo plano único [`docs/SDD-LUMINARIS.md`](../SDD-LUMINARIS.md) — migrado para a **§III.4**. Mantido no mesmo caminho só como registro; não é fonte de fila nem de estado.


**Escopo:** automação de 5 passos doc-only + testes mecânicos, alternando Haiku (tarefas de leitura/grep/fold, sem dial de esforço) e Sonnet (decisão/fork, esforço `low…max` conforme o passo).

**Entrada (re-medida em 2026-09-22, após `git fetch`):** `origin/main` = `be80ea47` (#359, cerca de execução PR-2); `0548d19a` (C8 PR-3 #356) e `edb80ec8` (C12 #353) são ancestrais. **O passo 9 folda contra o tip de `origin/main` — não contra um SHA congelado neste doc; re-meça com `git fetch` antes de foldar** (entre a 1ª e a 2ª medição desta mesma sessão o tip andou de `0548d19a` para `be80ea47`). O passo 10 **está em `origin/main`** — entrou por **squash** no #358, ver § Passo 10. Nenhuma tarefa deste documento roda antes de `0548d19a`.

**Saída:** `origin/main` com passos 9–13 completados (ou bloqueados por aguardar autorização do dono) — `main` aqui é sempre o **remoto**, nunca o local; ver § Passo 10.

---

## Despacho (sequência de agentes)

Esforço só se aplica a chamadas Sonnet (dial `low…max`); Haiku não tem o dial — "—" na coluna.

| Passo | Task | Modelo | Esforço | Entrada | Saída | Gate | Próximo |
|---|---|---|---|---|---|---|---|
| **9** | **Fold**: master map + grafo + PROXIMOS-PASSOS | **Haiku** | — | `origin/main` + arquivo de estado 22/09 | banner 45/57 → **46/57 — contábil 20/22 · financeiro 17/19 · fiscal 9/16** (ramo (a), ratificado 22/09); C12 ✅; C8 aberto até PR-5; GRAFO corrigido; PROXIMOS-PASSOS coluna Estado atualizada | `grep -cE "46/57" docs/accounting/ACCOUNTING-MASTER-MAP.md` → ≥1 | ✅ → 10 |
| **10** | **Docs PR**: Contrato §2.1/§2.2/§2.3 + ADR + GAP-MAP + skills + gates | **Haiku** | — | branch `claude/domain-motor-architecture-7ec49d` (uncommitted no worktree, ou committed localmente) | Conteúdo em `origin/main`; 22 arquivos; skill-audit 0 findings | `git cat-file -e origin/main:docs/adr/ADR-DOMAIN-MOTOR-rejected.md` → exit 0 ✅ (predicado de **conteúdo**; ancestralidade de SHA não serve — ver § Passo 10) | ✅ → espera "11 instrumenta" |
| **11** | **GAP-MAP 7**: teste `it.failing` — `unique`/`compositeUnique` sem gate in-tx | **Haiku** | — | `origin/main` com o conteúdo do passo 10 (✅ desde #358 — § Passo 10); molde `server/src/features/dynamicTables/services/__tests__/NoOverlapConcurrency.integration.test.ts` | `server/src/features/dynamicTables/services/__tests__/UniqueFieldConcurrency.integration.test.ts` vermelho na CI Linux | `cd server && npm run test:integration -- UniqueFieldConcurrency` | espera "instrumenta" dono |
| **12** | **GAP-MAP 8**: teste `it.failing` — `deleteTableData` ignora `immutableAfter` | **Haiku** (teste) **Sonnet** (fork) | — / **medium** | `origin/main` com o conteúdo do passo 10 (✅ desde #358 — § Passo 10); `DynamicTableService.ts` + schema | teste vermelho; fork (a) vs (b) apresentado ao dono | `cd server && npm run test:unit -- immutableAfter` | espera dono: fork + "corrige" |
| **13** | **PR-B**: `atomicUntil.boundary.test.ts` (população=8) + retrofit 8 JSDocs | **Haiku** | — | `origin/main` com o conteúdo do passo 10 (✅ desde #358 — § Passo 10); población validada = 8 arquivos | teste verde; GAP-MAP Nível 3 `[PAPEL]→[COBERTO]`; coverage `AC-2.3-2` ✅ | `cd server && npm run test:unit -- atomicUntil.boundary` = verde | espera "executa" dono |

**Por que os gates de teste são os scripts do repositório (`server/package.json:30-31`), e nunca uma chamada crua de `npx jest` com a flag de coverage desligada:** `test:unit` = `jest --selectProjects unit --forceExit` e `test:integration` = `jest --selectProjects integration --runInBand --forceExit` — o `--runInBand` é o que serializa as suítes que tocam o `test-integration.db` (classes `integration-suite-precisa-de-runinband` e `jest-concorrente-windows-ebusy`: um 2º jest concorrente derruba 44–50 suítes com EBUSY no Windows, e o exit code 0 não serve de gate), e o `--selectProjects` é o que decide se o arquivo `*.integration.test.ts` sequer é coletado. Chamada crua perde as duas coisas — **não "simplifique" de volta**.

---

## Passo 9 — Fold (Haiku)

> **✅ Fork D1 RATIFICADO pelo dono em 2026-09-22 — ramo (a)** (*"Pode seguir em a"*). A régua é **soma das três parciais**.
> Estado de partida, medido: `45/57 — contábil 19/22 · financeiro 17/19 · fiscal 9/16` (19+17+9 = 45).
> **Alvo do fold:** `46/57 — contábil 20/22 · financeiro 17/19 · fiscal 9/16` (20+17+9 = 46).
> Só **C12** (#353 `edb80ec8`) fecha nó; **C8 segue aberto até PR-5** — #356 (`0548d19a`) abre com
> *"Terceiro dos 5 PRs seriais do incremento"*, e PR-4 (retificação/J801/J932) e PR-5 (NF-e modo 4) não existem
> em `origin/main`.
>
> Ramo **não** escolhido, registrado para não reabrir: `47/57 — contábil 21/22 · financeiro 17/19 · fiscal 9/16`
> — teria declarado C8 fechado já no PR-3. O defeito que originou o fork (pedir total 47 junto de uma parcial
> contábil de 20 em 22, quando 20+17+9 = 46) está fechado.
>
> **Ratificação não é "executa".** O número está decidido; o fold em si **não foi executado** — segue esperando
> a chamada do dono, como os demais passos.

**O quê:**
1. Atualizar `docs/accounting/ACCOUNTING-MASTER-MAP.md` §5 (banner do topo, linha da Régua e linha **Total** da tabela): banner 45/57 → **46/57** com as parciais do ramo (a) acima; C12 ✅; C8 **aberto até PR-5** (não marcar nó fechado).
2. Atualizar `docs/accounting/GRAFO-DEPENDENCIAS-2026-09-14.md`: C9 absorvido no C8.
3. Atualizar `PROXIMOS-PASSOS-2026-09-17.md`: coluna Estado para passos 4–5; seção "Estado em 2026-09-22".

**Gate:** `grep -cE "46/57" docs/accounting/ACCOUNTING-MASTER-MAP.md` → ≥1 **e** a linha da Régua tem de trazer as três parciais do ramo (a) (20 em 22 · 17 em 19 · 9 em 16) — total sem as parciais na mesma linha deixa a soma inauditável, que é exatamente o defeito D1. A ratificação de 22/09 vai citada no commit do fold.

---

## Passo 10 — Docs PR (Haiku)

**Status (3ª medição, 2026-09-22 — e as duas primeiras erraram por motivos diferentes):** o passo 10 **ESTÁ em `origin/main`**. O conteúdo entrou por **squash** no **#358** (cerca de execução PR-1), cuja branch carregava também o commit `4b5b04c5`. Medido: `git cat-file -e origin/main:docs/adr/ADR-DOMAIN-MOTOR-rejected.md` → exit 0; `atomicUntil` aparece 3× em `_ARCHITECTURE-CONTRACT.md` de `origin/main`; `git diff 4b5b04c5 origin/main` **vazio** para os 22 arquivos do commit.

> **⚠️ A armadilha, e ela é de CLASSE:** `git merge-base --is-ancestor 4b5b04c5 origin/main` continua retornando **falso**, porque **squash-merge não preserva o SHA** — o conteúdo entra, a ancestralidade não. Um gate escrito sobre ancestralidade de SHA **nunca ficaria verde**, e leria "não mergeado" para sempre. Este doc já nasceu com esse gate na 2ª medição e ele foi trocado por **predicado de conteúdo** (`git cat-file -e` no artefato que o passo 10 cria). Regra para próximos passos: **onde o repo faz squash-merge, o gate de "já está lá?" se escreve sobre ARTEFATO, nunca sobre SHA** (classe `squash-merge-quebra-prs-empilhados`).

**Consequência:** os passos 11–13 **não estão mais bloqueados pelo passo 10** — falta só a autorização do dono ("instrumenta" / "executa"). **Pendura aberta:** o PR **#357** (`claude/domain-motor-architecture-7ec49d`) segue OPEN com o mesmo conteúdo já em `main` — virou duplicata; fechá-lo ou não é decisão do dono.

**Confirmação (a 1ª linha é a que decide):**
```bash
# predicado de CONTEUDO: sobrevive a squash-merge, ao contrario de --is-ancestor
git cat-file -e origin/main:docs/adr/ADR-DOMAIN-MOTOR-rejected.md && echo "passo 10 EM origin/main" || echo "AINDA NAO — 11/12/13 bloqueados"
ls docs/adr/ADR-DOMAIN-MOTOR-rejected.md
node .claude/skills/skill-audit/skill-audit.mjs run --all  # → 0 findings
```

---

## Passo 11 — GAP-MAP 7, Instrumentação (Haiku)

**Autorização:** "instrumenta" (dono).

**O quê:**
1. Criar `server/src/features/dynamicTables/services/__tests__/UniqueFieldConcurrency.integration.test.ts` (mesmo diretório do molde):
   - Molde: `server/src/features/dynamicTables/services/__tests__/NoOverlapConcurrency.integration.test.ts` (Promise.all + `expect(count).toBe(1)`). No mesmo diretório há também `NoOverlapUpdateConcurrency.integration.test.ts` — não confundir: o molde é o de *create*.
   - Preset com `compositeUnique: ['email', 'tenant']`.
   - 8 writes concorrentes do mesmo (email, tenant) → esperado: 1 persistido, 7 falhos.
   - `it.failing` com comentário citando GAP-MAP lacuna 7.

2. Referenciar no GAP-MAP "Nível 4 — Runtime sistêmico".

**Gate:** `cd server && npm run test:integration -- UniqueFieldConcurrency` → vermelho esperado (o `it.failing` aparece como *failing*). Integração **só** por este script — ver a razão abaixo da tabela de despacho.

---

## Passo 12 — GAP-MAP 8, Instrumentação + Fork Decision

**Autorização:** "instrumenta" (dono).

**Haiku:**
1. Criar `server/src/features/dynamicTables/__tests__/DynamicTableService.immutableAfter.test.ts`:
   - Preset com `immutableAfter: {scope: 'all', statusField: 'status'}`.
   - Linha em status `Paid` → `deleteTableData(id)` deve lançar.
   - `it.failing` citando GAP-MAP lacuna 8.

**Sonnet — esforço `medium`:**
1. Ler `DynamicTableService.ts` `deleteTableData` + Guards 2/3 do `updateTableData`.
2. Apresentar fork:
   - **(a)** Guard no delete (+20 linhas, cobre raiz).
   - **(b)** `deleteConstraints: RESTRICT` no preset (não cobre raiz).
3. Aguardar resposta do dono.

**Por que `medium`, não `low`/`high`:** as 2 opções já vêm esboçadas no GAP-MAP original (não é design aberto — `low` bastaria só para confirmar que ainda batem com o código); mas a tarefa exige ler os 2 métodos de verdade antes de perguntar, não só citar de memória (`low` arriscaria alucinar a linha). Não é `high`/`xhigh`: escopo é 2 métodos de 1 arquivo já localizado, sem exploração do resto do codebase, e a decisão não é irreversível (o dono ratifica antes de qualquer código).

**Gate:** `cd server && npm run test:unit -- immutableAfter` → vermelho esperado (o arquivo não é `*.integration.test.ts`, então cai no projeto `unit`).

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
cd server && npm run test:unit -- atomicUntil.boundary  # → verde (0 ofensores)
cd server && npx tsc --noEmit  # → limpo
cd server && npm run test:integration  # → sem regressão
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

## Modelo × Esforço × Autorização × Bloqueador

| Passo | Modelo | Esforço | Autorização | Bloqueador |
|---|---|---|---|---|
| 9 | Haiku | — | D1 ✅ ratificado 22/09 (ramo (a)); falta "executa" | sim (aguarda "executa" do dono) |
| 10 | Haiku | — | — | **não** — conteúdo em `origin/main` desde o #358 (squash); PR #357 ficou duplicado (§ Passo 10) |
| 11 | Haiku | — | "instrumenta" | sim (aguarda auth dono) |
| 12 | Haiku + Sonnet | — / **medium** | "instrumenta" + fork | sim (aguarda auth + decisão fork) |
| 13 | Haiku | — | "executa" | sim (só aguarda auth — o passo 10 já está em `origin/main`) |

**Padrão:** Haiku executa mecânico (grep/fold/retrofit de comentário — 0 dial de esforço). Sonnet só entra quando há leitura de código + decisão de design, e mesmo aí no piso que a tarefa aguenta: aqui `medium`, porque o espaço de busca é 2 métodos de 1 arquivo já apontado e as opções já vêm esboçadas — nem `low` (risco de citar linha de memória sem ler), nem `high+` (isso é para decisão sem precedente ou sem teto de escopo, que não é o caso). "instrumenta" = teste vermelho sem lógica; "executa" = código com lógica.

**Regra geral para próximas tarefas deste tipo (T4 — decisão que se repete, cite-a):** esforço do Sonnet acompanha o tamanho do espaço de busca e o custo de errar, não o "peso" aparente da tarefa — fork já esboçado + arquivo já localizado = `medium` teto; escalar para `high`/`xhigh` só quando a leitura precisar cruzar múltiplos arquivos sem localização prévia, ou a decisão for difícil de reverter depois de tomada.
