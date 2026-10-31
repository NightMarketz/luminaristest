# Passagem de sessão — módulos base + submódulos, PR-0 a PR-4 (31/10/2026)

> Leia isto primeiro na sessão do PR-5. Estado vivo continua no vault ([`docs/plano/_INDEX.md`](../plano/_INDEX.md));
> este documento condensa **o que foi decidido, o que foi feito, o que ficou aberto e o que morde**.
> Graus: **[V]** verificado (comando `gh`/`git` ou leitura do arquivo nesta sessão) · **[I]** inferido (leitura sem
> execução, ou relato de PR que não reproduzi) · **[A]** assumido. Medido em 31/10/2026 contra `origin/main` `d81ae797`.

## 1. Em duas linhas

O registro de módulos do CRM foi generalizado para 7 categorias com base fixa + submódulos em **5 PRs de código
empilhados, todos abertos, verdes no CI e de classe verde** (#1000 → #1001 → #1002 → #1006 → #1007) **[V]**, mais o
#999 (BRIEF + decisão), também aberto **[V]**. Risco principal: o **#999 é classe vermelha** (cédula de decisão do dono),
então não sai pela maestro sozinha. Ele vai ao lote diário. E a pilha só chega à `main` por squash em cadeia, com rebase
de cada filho depois de cada merge **[V]**.

## 2. Decisões do dono

Registro dos forks: [`D-2026-10-31-MODULOS-BASE-SUBMODULOS`](../plano/decisoes/D-2026-10-31-MODULOS-BASE-SUBMODULOS.md)
(F-MB-1..6, F-MS-1..8). Até o merge, o arquivo só existe no #999 **[V]**.

| Tema | Decisão | Onde está a citação | Grau |
|---|---|---|---|
| Autorização de código | "executa" para o BRIEF inteiro (D-2026-10-28-FLUXO-AUTONOMO) + "Dispara os proximos pr em sessões paralelas" | corpo do #1002 | [V] citação no PR · [I] chat |
| PR-3 e PR-4 em paralelo | "Sim, dispara os dois" | corpos do #1006 e do #1007 | [V] citação no PR |
| Dono dos KNOWN_GAPS de acoplamento | `BUILDER-VERTICAIS`, opção "BUILDER-VERTICAIS (Recommended)" | corpo do #1002; comentário em `analyticsFieldMappingCoupling.test.ts` | [V] |
| FIN-0/GES-0 travam `expenses`/`reports` (FIXED_MODULE) | O #1006 registra **"pode seguir" (chat, 31/10)**. O relato da sessão de origem cita o questionário "Aceitar a trava (Recommended)". Não achei esse texto em nenhum PR | corpo do #1006 | [V] "pode seguir" · [A] texto do questionário |
| EST-0/AGE-0 travam `productUnits`/`stockMovements`/`appointments` na entrevista | "Aceitar até o PR-6 (Recommended)". O PR-6 (item 32) decide se a entrevista ganha a remoção da categoria inteira | corpo do #1007 | [V] |
| Controle Total vendendo só serviço (`finalPayload` sem `meta`) | "Corrigir aqui", consertado no #1002 (`bbcf2e25`) | corpo do #1002 | [V] |
| Tela do Controle Total lê `moduleViews` | "Tela lê moduleViews", feito no #1002 | corpo do #1002 | [V] |

**Atenção:** o cabeçalho do BRIEF e o campo `autorizacao` da decisão, como estão no #999, ainda dizem **"sem código,
sem 'executa'"** **[V]**. O "executa" só existe no chat e nos corpos dos PRs. A sessão do PR-5 deve citar a frase do
#1002 como autorização. O fold do vault (§4) é o lugar de registrar isso na nota do nó.

## 3. O que foi feito

| PR | Itens do BRIEF | Branch (head) | Base | Classe | CI |
|---|---|---|---|---|---|
| [#999](https://github.com/NightMarketz/luminaristest/pull/999) | BRIEF + decisão + nota do nó | `claude/modulos-verticais-estrutura-4b122a` (`273c16d5`) | `main` | **vermelho** (`docs/plano/decisoes/D-2026-10-31-…` = cédula do dono) | verde (só Markdown) |
| [#1000](https://github.com/NightMarketz/luminaristest/pull/1000) | PR-0, item 0: fotografia | `claude/be-incr-modulos-base-submodulos-c5829b` (`18872e18`) | `main` | verde | 17/17 verde |
| [#1001](https://github.com/NightMarketz/luminaristest/pull/1001) | PR-1, itens 1–6 e 8 | `claude/be-incr-modulos-base-submodulos-pr1` (`da0932da`) | #1000 | verde | 17/17 verde |
| [#1002](https://github.com/NightMarketz/luminaristest/pull/1002) | PR-2, itens 7 e 9–15 (+ FE do Controle Total) | `claude/modulos-base-pr2-f01401` (`bbcf2e25`) | #1001 | verde | 17/17 verde |
| [#1006](https://github.com/NightMarketz/luminaristest/pull/1006) | PR-4, itens 21–25 | `claude/modulos-base-pr4-b8201b` (`eab20d3c`, merge da base) | #1002 | verde | 17/17 verde |
| [#1007](https://github.com/NightMarketz/luminaristest/pull/1007) | PR-3, itens 16–20 | `claude/modulos-base-pr3-b67717` (`c8ea6fa5`) | #1006 | verde | 17/17 verde |

Tudo **[V]** (`gh pr view`, `gh pr checks`, `node scripts/classe-risco.mjs pr <n>` rodados em 31/10). Cadeia conferida
com `git merge-base --is-ancestor`: cada branch contém a do pai **[V]**. A do #1000 está **1 commit atrás** da `main`
(`d81ae797`, só docs); o GitHub marca todos como MERGEABLE **[V]**.

**Resultado na ponta (#1007)** **[I, relato dos PRs + leitura do BRIEF]:** 17 módulos no default do salão/clínica
(BRIEF §1), `tables` das suítes **vazio**, grupos `PESSOAS`/`VENDAS`/`ESTOQUE`/`AGENDA`/`FINANCEIRO`/`GESTAO`,
`moduleOverrides` (clínica: `customers` = ficha), `moduleViews.category`, variante de `saleItems` escolhida pelos
catálogos (item 12). Diff da pilha contra a `main`: 49 arquivos, a maior parte é a fixture da fotografia (~0,9 MB) **[V]**.

**Fotografia do PR-0** (`suitePayloadBaseline.integration.test.ts`): cada PR mudou a fixture só com justificativa no
cabeçalho do teste e conferiu por script que, tirando a mudança declarada, ela é idêntica à do PR anterior **[I, relato
dos PRs]**. Mudanças acumuladas: chaves novas em `modules.installed`; ordem de `by` na trava de `units`; `saleItems` dos
8 cenários custom = o do `rapido` (#1002); `locks.expenses`/`locks.reports` → `FIXED_MODULE` (#1006);
`productUnits`/`stockMovements`/`appointments` → `FIXED_MODULE` (#1007).

**Sessões que fizeram o trabalho:** a de origem (#999, #1000, #1001), `modulos-pr2` (#1002), `modulos-pr4` (#1006),
`modulos-pr3` (#1007) **[V, nota de sessões vinculadas]**.

### Desvios do BRIEF (pontos de revisão)

1. **Item 7 (grupos por categoria) saiu do PR-1.** Os membros só existem a partir do PR-2, então `PESSOAS`/`VENDAS`
   entraram no #1002 e `ESTOQUE`/`AGENDA`/`FINANCEIRO`/`GESTAO` no #1007/#1006. A lacuna está registrada no #1001 **[V]**.
2. **PR-0:** o teste se chama `suitePayloadBaseline.integration.test.ts` (o BRIEF diz `suitePayloadBaseline.test.ts`),
   e a captura é o próprio teste com `UPDATE_BASELINE=1`, sem `captureSuiteBaseline.ts` **[V, corpo do #1000]**.
3. **`removability.ts` (#1002), fora da lista do BRIEF:** precedência invertida para **ACCOUNTING → FIXED_MODULE**, e
   `assertRemovalsAllowed` passou a checar tabela de módulo não-fixo e de módulo com trava contábil, chamado **antes**
   de `applyModuleRemovals` **[V, diff lido]**. Justificativa no #1002: sem isso `packages` ficaria removível antes do
   PR-5. O PR-5 (item 28) mexe em `lockOf` de novo, então releia esse diff antes.
4. **`DynamicTableService.ts` (#1002):** `installPresetAsSystem` descarta relação opcional para tabela ausente na
   variante de `saleItems` (regra E5) **[V, diff --stat: 18 linhas]**. O CLAUDE.md manda parar antes de mudar esse
   arquivo **para integrar dois módulos**. Aqui a mudança é de variante/relação, não de integração, mas é ponto de
   revisão explícito **[I]**.
5. **#1002 também mudou:** `CrmModulePreset` compõe só a categoria `crm`; `AnalyticsService.getDynamicPresetGroups` lê
   `composeSuiteDefaultTables(suite)`; FE `TotalControlSetup.tsx` + locales + 4 `.gen.ts` **[V, `git diff --name-only`]**.
6. **#1006:** `CrmModulePreset` compõe `crm` **sem** CRM-CAMP. No Controle Total, tirar o funil mantendo `campaigns`
   passou a dar 400 `DEPENDENT_MODULE_KEPT` **[I, relato do #1006]**.
7. **Lacunas de spec abertas pelo #1006** (sem decisão): (a) `dependsOn` de FIN-REC/FIN-BASE/GES-META/PES-FORN é `[]`
   (leitura literal do §1), então o submódulo sozinho instala sem a base; (b) item 25: nenhum código lê
   `goals.metricKey` para KPI **[I, relato do #1006]**.
8. **Item 18 (#1007):** verde sem aplicar F-MS-4 (a); a E8 foi confirmada executando **[I, relato do #1007]**.

## 4. O que ficou aberto (em ordem)

1. **Merge da pilha:** #999 (vermelho → lote diário, o dono confirma por número) → #1000 → #1001 → #1002 → #1006 →
   #1007 (todos verdes → maestro). Depois de cada squash, rebaseie o filho na `main` e mude a base dele para `main`
   (memória `squash-merge-quebra-prs-empilhados`). O #1006 tem um commit de merge (`eab20d3c`); no squash isso não pesa
   **[V]**. O #999 não precisa vir antes dos PRs de código por conflito (arquivos disjuntos), só pela ordem do plano **[I]**.
2. **Fold do vault, depois do merge do #999:** nota `BUILDER-VERTICAIS.md` (estado, `autorizacao` com o "executa" de
   31/10, PRs #1000–#1007). Não foi feito: o dono pediu para não alterar a nota nesta etapa **[V, pedido da sessão]**.
3. **PR-5 (itens 26–29):** `bridges` no preset, `BRIDGE_REQUIRES`, 400 `BRIDGE_REQUIRES_MODULE`, trava no módulo
   (`lockedBy` em PES-0/VEN-0; **VEN-PAC destrava**), teste de Pacotes depois do 1º lançamento. Classe **vermelha**
   esperada (BRIEF §8) → revisor-independente → lote diário **[V, BRIEF]**.
4. **PR-6 (itens 30–34):** entrevista com IA (`aiDescription` dos 14, `ModuleSuggester` por categoria,
   `StateManager`) **[V, BRIEF]**. Decide também a trava de base fixa na entrevista (decisão "Aceitar até o PR-6").
5. **KNOWN_GAPS de analytics** (dono `BUILDER-VERTICAIS`, `analyticsFieldMappingCoupling.test.ts` no #1007) **[I,
   contado na leitura, sem rodar]:** 3 grupos.
   - `SEM_DESPESAS`: 11 universos × 25 refs.
   - `SEM_ESTOQUE`: 10 × 4.
   - `SEM_SERVICOS`: 7 × 3.

   São cerca de 336 entradas, 32 refs distintas. **Não fecham com FIN-0/EST-0 no registro:** VENDAS não depende de
   FINANCEIRO nem de ESTOQUE. Fechar exige `dependsOn` novo ou analytics tolerante à ausência, num nó próprio. Os 6 de
   `products.deleteConstraints` fecharam no #1007 (viraram `ABSENT_DELETE_CONSTRAINT_TARGETS`).
6. **FE-INCR-MODULOS-BASE-SUBMODULOS:** `my-app/features/crm/lib/crmModules.ts` espelha chaves à mão e não ganhou
   `CRM-CAMP` (o diff da pilha não toca o arquivo) **[V]**. Correção do relato de origem: a remoção pelo Controle Total
   **não** ficou perdida. O #1002 fez `TotalControlSetup` listar `moduleViews` (base fixa travada, submódulo removível),
   com teste `totalControlModules.test.tsx` **[V, arquivo no diff]**. O que falta ali: as tabelas de módulo aparecem sem
   a lista de campos **[I, relato do #1002]**.

**Achados fora de escopo (não corrigidos)** **[I, relato dos PRs]:**
- `saleItems.requiresAppointment` sem AGE-0 → 400 "Tabela de agendamentos … não encontrada".
- Sessão da entrevista sem `modules` (anterior ao W1) não recalcula a trava de PESSOAS/VENDAS.
- O `openapi.json` tem 11 diferenças anteriores de contabilidade contra o `docs:generate`.
- Dois estoques: DT `productUnits` × Prisma `InventoryItem` (BRIEF §7).

## 5. O que morde neste ambiente (Windows + worktree)

- **Snapshot de DTO:** `UPDATE` reordena ~80 arquivos no Windows. Insira só as chaves novas (por script) nos
  `__dto-shapes__.json`, `.gen.ts` e `.snap` (memória `dto-snapshot-update-reordena-no-windows`) **[I, #1006/#1007]**.
- **Rebase:** o merge driver `regen` fica com o lado da base em `openapi.json`/`__dto-shapes__.json`/`.gen.ts`.
  Reinsira as chaves de enum à mão depois do rebase. O GitHub ignora o driver (memória `github-ignora-merge-driver`)
  **[I, #1007]**.
- **Fotografia:** nunca regenere às cegas. Regenere, normalize por script (tirar chaves novas, ordenar `by`, zerar só as
  travas justificadas) e confira a igualdade com a anterior. O item 28 muda **só** `locks.packages` **[V, BRIEF item 28]**.
- **Integração local:** timeouts e "disk I/O"/"VirtualAlloc" em suítes de contabilidade na rodada de 4 shards, que
  passam isoladas. Use `npm run test:integration` e isole o arquivo **[I, #1002/#1006/#1007]**.
- Worktree novo do PR-5: rode `npm ci` em `server/` e `my-app/` (memória `worktree-deps-stale-prisma-client`) **[A]**.

## 6. Próximo comando exato

Pré-requisito: a pilha mergeada na `main`, **ou** o PR-5 empilhado sobre `claude/modulos-base-pr3-b67717` (#1007).
Prompt da próxima sessão:

```
executa — BE-INCR-MODULOS-BASE-SUBMODULOS, PR-5 (itens 26–29 do BRIEF).
Autorização: dono, chat, 2026-10-31, "executa" para o BRIEF inteiro (citada no corpo do #1002).
Leia primeiro docs/accounting/HANDOFF-2026-10-31-modulos-base.md e o BRIEF (no #999 se ainda não mergeado:
git checkout origin/claude/modulos-verticais-estrutura-4b122a -- docs/accounting/BE-INCR-MODULOS-BASE-SUBMODULOS-brief.md && git reset -q).
Base: main se #1000..#1007 já mergeados; senão empilhe sobre claude/modulos-base-pr3-b67717 (#1007).
Pela skill sessao-feature. Antes do item 28, releia a precedência ACCOUNTING → FIXED_MODULE que o #1002 pôs em removability.ts.
Fotografia: muda só locks.packages, conferido por script.
Ao abrir: node scripts/classe-risco.mjs pr <n> (esperado vermelho) → revisor-independente → lote diário. Não mergeie.
```

## 7. Arquivos

- BRIEF: `docs/accounting/BE-INCR-MODULOS-BASE-SUBMODULOS-brief.md` (#999)
- Decisão: `docs/plano/decisoes/D-2026-10-31-MODULOS-BASE-SUBMODULOS.md` (#999) · nó: `docs/plano/nos/BUILDER-VERTICAIS.md`
- Registro: `server/src/features/dynamicTables/presets/modules/registry.ts`
- Travas: `server/src/features/dynamicTables/presets/removability.ts`
- Suítes: `server/src/features/dynamicTables/presets/systems/BeautySalonPreset.ts`, `AestheticClinicPreset.ts`
- Instalador: `server/src/features/dynamicTables/services/DynamicTableService.ts` (`installPresetAsSystem`)
- Fotografia: `server/src/features/dynamicTables/presets/__tests__/suitePayloadBaseline.integration.test.ts` +
  `fixtures/suite-payload-baseline.json`
- Acoplamento: `presets/__tests__/analyticsFieldMappingCoupling.test.ts`, `presetSchemaCoupling.test.ts`,
  `presetCouplingUniverse.ts`, `presetModules.test.ts`
- FE: `my-app/features/interview/setup/TotalControlSetup.tsx`, `my-app/features/crm/lib/crmModules.ts`
- Notas das sessões filhas (fora do repo): pasta de notas compartilhadas da sessão de origem,
  `PR-2/3/4-modulos-base-achados.md`
