# BRIEF — execução do ADR-MODULE-BOUNDARIES (fronteira entre features, peça fora de camada, job como entrypoint, posse de model)

- **Data:** 2026-11-24 · **Sessão:** `sessao-planejamento` · **Nó:** [`MODULE-BOUNDARIES`](../plano/nos/MODULE-BOUNDARIES.md)
- **Medido em:** `main` = `d3f3a201c` (24/11/2026). Os números do ADR (264, 45, 823, 16, 40) são de 20/10 (`310a92b4`).
- **Estado:** BRIEF escrito, **11 forks novos com RATIFICAÇÃO PENDENTE** (§7). **Não é "executa"**: nenhuma regra ligada, nenhum arquivo movido, nenhum código escrito.

## TLDR (2 linhas)

A dívida cresceu desde 20/10: `M1` 264 → **393** arestas entre features, `M1a` 45 → **49**, `M2` 823 → **879**, `J1` 16 → **18**, `U8` 3 → **11**, `U9` 40 → **45**. A regra de posse confere com o ADR (138 de 146 models com escrita; 1 exceção em feature).
Risco principal: a medida abriu 11 decisões que o §10 do ADR não cobre (§7). Três delas mudam o desenho do que foi ratificado: o `DynamicTableReader` precisa de leitura dentro de transação (F-MBE-7), a pasta `public/` deixa as regras L2/L5/L6 cegas (F-MBE-3) e o PR único de renome toca 209 módulos em pastas com 5 PRs abertos (F-MBE-2).

## 0. Contexto fixo

- **Item a planejar:** execução do [`ADR-MODULE-BOUNDARIES.md`](../adr/ADR-MODULE-BOUNDARIES.md), Accepted em 24/11/2026. O §10 (emenda de 24/11) prevalece sobre os §2–§4.
- **Autorização:** dono, 2026-11-24, questionário (`AskUserQuestion`) desta sessão. Pergunta: *"Você autoriza esta sessão de planejamento a escrever o BRIEF de execução dele (só documento, sem código)?"* Resposta literal: **"Sim, planejar o BRIEF"**. Escopo: BRIEF, nota do nó com `write_set`, medida nova e um PR só de documentação. Não liga regra, não move pasta, não é "executa". A decisão `D-2026-11-24-MODULE-BOUNDARIES-FORKS` (PR #1366) dizia que a ratificação dos forks "não autoriza BRIEF nem código"; a autorização do BRIEF é a resposta acima.
- **Insumos lidos:** o ADR inteiro (na branch do #1366, ainda aberto em 24/11); `docs/plano/decisoes/D-2026-11-24-MODULE-BOUNDARIES-FORKS.md` (mesma branch); `docs/adr/ADR-ARCH-BOUNDARIES.md` (§1–§5); `server/.dependency-cruiser.cjs`; `my-app/.dependency-cruiser.cjs`; os dois `.dependency-cruiser-known-violations.json`; `server/eslint.config.mjs`; `scripts/classe-risco.mjs`; `docs/adr/ADR-PAIS-NA-BORDA.md` (só as linhas sobre `paises/`); o diff do #1356 em `server/.dependency-cruiser.cjs`; `server/src/features/dynamicTables/rules/RuleTypes.ts`; `server/prisma/schema.prisma` (nomes dos models); `.claude/skills/_ARCHITECTURE-CONTRACT.md` §0 e §2 inteiros e, do §2.1, só a linha `AC-2.1-B1` (a única que cita `RuleContext`); `docs/plano/README.md`.
- **Nós vizinhos:**
  - [`PAIS-NA-BORDA`](../plano/nos/PAIS-NA-BORDA.md): mesmos choke points (`server/.dependency-cruiser.cjs`, `docs/adr/ADR-ARCH-BOUNDARIES.md`), a pasta `features/<d>/paises/<cc>/` e o destino do `ChartOfAccountsFixture.ts` (F-MBE-5 e F-MBE-6).
  - PR #1356 (regra `C1`, aberto): a lista `LEDGER_CORE_ALLOWED` cita `audit/`, `scope/` e `fixtures/ChartOfAccountsFixture.ts`, três caminhos que o renome muda.
  - [`BUILDER-VERTICAIS`](../plano/nos/BUILDER-VERTICAIS.md): PR-5/PR-6 tocam `dynamicTables/presets` (§3).
  - `ADR-DOMAIN-MOTOR-rejected.md` e `ADR-PERSISTENCE-BOUNDARY`: sem colisão (ADR §6); nada aqui injeta serviço Prisma no motor.

## 1. Medida nova (24/11, `d3f3a201c`)

Grau: **verificado** (saída de comando rodado nesta sessão), salvo onde a linha diz outra coisa.

### 1.1 Como foi medido

Config temporária **fora do repo**: `require` da config do pacote mais as regras do ADR como o §10 as escreve (alvo `public/`, sem liberar `models|dtos`). Os arquivos estão na pasta de notas da sessão (`module-boundaries-medida/`: `server.mb.cjs`, `myapp.mb.cjs`, `sum.cjs`, `m2.cjs`, `posse.cjs`, `janela.cjs`); o texto das regras está no §5.1 deste BRIEF.

```
node scripts/worktree-deps.mjs
cd server && npx depcruise src --config <tmp>/server.mb.cjs --output-type json > server.out.json
cd my-app && npx depcruise pages features components lib types --config <tmp>/myapp.mb.cjs --output-type json > myapp.out.json
node <tmp>/sum.cjs server.out.json M1      # pares e destinos
node <tmp>/m2.cjs server.out.json          # M2, J1, L3–L6
node <tmp>/posse.cjs <raiz-do-repo>        # posse de model (regex)
```

Prova de que o `$1` (feature de origem) funciona: 0 violações `M1`/`M1a`/`U9` com origem e destino na mesma feature. Server: 2.163 módulos, 9.983 arestas. My-app: 973 módulos, 2.877 arestas.

### 1.2 Server

| Regra | 20/10 (ADR) | **24/11** | Detalhe de 24/11 |
|---|---|---|---|
| `M1a` repositório de outra feature | 45 | **49** | 18 módulos de destino. `sectorKits→accountingBinding` 16 · `accounting→legalParameters` 3 · `crm→dynamicTables` 3 · `packages→accounting` 3 · `sales→dynamicTables` 3 · `documents→users` 2 · `dp→accounting` 2 · `onboarding→chat` 2 · 15 pares com 1. Por alvo: `accountingBinding` 16 · `dynamicTables` **9** · `accounting` 6 · `users` 4 · `legalParameters` 3 · `chat` 3 · `chatInstances` 2 · 6 alvos com 1 |
| `M1` entre features, alvo `public/` | 264 | **393** | 100 módulos de destino, 22 features de origem. `accounting→legalParameters` 76 · `sectorKits→accountingBinding` 47 · `interview→dynamicTables` 40 · `dp→accounting` 29 · `packages→accounting` 23 · `dp→legalParameters` 15 · `analytics→dynamicTables` 11 · `crm→dynamicTables` 10 · `legalParameters→accounting` 10 · `onboarding→accounting` 10. Por subpasta: `models` 139 · `services` 86 · `repositories` 49 · `presets` 33 · `scope` 27 · `dtos` 21 · `fixtures` 15 · `sync` 7 · `core` 6 · outros 10 |
| (referência) `M1` com `models|dtos` livres, a opção recusada do F-MB-2 | 180 | 233 | só para comparar; não é a regra ratificada |
| `M2` peça fora de pasta de camada, como o §10 escreve¹ | — | **879 arestas → 196 módulos** | 209 módulos fora de camada; 13 sem importador de produção. Maiores: `dynamicTables/presets` 50 m/173 a · `analytics/kpis` 24/30 · `sectorKits/kits` 16/40 · `accounting/dfe` **15**/54 · `analytics/dynamic` 15/17 · `accounting/sync` 11/56 · `interview/FieldCustomizationService` 9/17 · `accountingBinding/archetypes` 8/8 · `analytics/core` 8/60 · `accounting/scope` 3/**280** |
| (referência) `M2` na definição do ADR de 20/10² | 823 → 208 | 944 → 221 | 233 módulos fora de camada (eram 220) |
| `D1` do ADR (`domain/` pura) | 0 por construção | **0** hoje; **3 de 154** impuros se a mudança fosse feita sem preparo | não existe pasta `domain/`, então a regra ligada dá 0. A medida que importa é a pureza dos 154 módulos que o §5.3 manda para `domain/` (`node <tmp>/pureza.cjs`): 151 puros; os 3 impuros são `accountingBinding/fixtures/{saleBinding,bindingPosL8,clinicBinding}.ts` → `services/BindingCompileService` (o `computeCompiledFromHash` que o F-MB-5 manda virar função pura antes). O nome `D1` já está em uso (F-MBE-4) |
| `J1` job é entrypoint, com as 3 CLIs isentas | 16 | **18** | entraram `checkLegalParamsFormatoCli.ts` e `ragReindexCli.ts` (cada uma → `lib/prisma`). Sem exceção: 22 |
| Singleton Prisma fora de `repositories/` | 15 | **15** | `app.ts`, `server.ts`, `lib/factory.ts` e 12 jobs. Nenhum service |

¹ `LAYER_DIR` com `domain|ports|adapters|public`, `dynamicTables/rules/` isenta (F-MB-3 c), sem a exceção do `index.ts` (F-MB-1 b).
² `LAYER_DIR` só com as 6 pastas de hoje e `index.ts` isento. A diferença para ¹ são `dynamicTables/rules` (20 módulos, 53 arestas) e as pastas `ports/` que já existem (`accounting/ports`, `dp/ports`, `fx/ports`).

**Baseline atual das regras já ligadas** (`server/.dependency-cruiser-known-violations.json`, 27 entradas): `L4` 4 · `L5` 4 · `L6` 4 · `X3` 15. Medido hoje: `L3` **0** (os 2 do ADR já foram pagos), `L4` 4, `L5` 4 (o `StructuredDataPolicy` já foi pago), `L6` 4, `X3` **12** (o arquivo tem 3 entradas de `X3` já pagas; o próximo `check:arch:baseline` encolhe 15 → 12). O P1 do ADR caiu de 15 arestas para **8**:

| Regra | Aresta medida em 24/11 |
|---|---|
| `L4` ×2 | `accounting/repositories/{I,}AccountantAssignmentRepository` → `accounting/policies/IAccountingPolicy` |
| `L4` ×2 | `chat/repositories/{I,}KnowledgeGraphRepository` → `chat/services/KnowledgeGraphService` |
| `L6` ×2 | `accounting/models/{issLimite,lc116ListaNacional}` → `legalParameters/services/legalParameterCache` |
| `L6` ×2 | `accounting/models/outstandingLines` → `IPayableRepository`, `IReceivableRepository` |
| `L5` ×4 | `{I,}AccountingBindingPolicy`, `{I,}SectorKitPolicy` → `IAccountingBindingRepository` (só o tipo `BindingScope`; paga no P0) |

**P0 ainda vale:** o reexport continua em `accountingBinding/repositories/IAccountingBindingRepository.ts:6`. Imports de uma linha que só trazem `BindingScope`/`bindingScopeWhere`/`resolveBindingScope` por esse arquivo: `sectorKits/repositories` 6 · `sectorKits/services` 5 · `sectorKits/policies` 2 · `accountingBinding/policies` 2 · `accountingBinding/repositories` 1 · `jobs` 3 (regex de import de uma linha; import em várias linhas não entra na conta).

### 1.3 My-app

| Regra | 20/10 (ADR) | **24/11** | Detalhe de 24/11 |
|---|---|---|---|
| `U8` `components/` → `lib/services/` | 3 | **11** | `chat.service` 5 (`components/widgets/chat/hooks/useChat{Instance,Messages}.ts`, `components/widgets/shared/hooks/useChat{Instance,Instances,Messages}.ts`) · `dashboardLayout.service` 2 (`dashboard-grid.tsx`, `dashboard-grid.types.ts`) · `document.service` 1 (`chat/components/DocumentSelector.tsx`) · `user.service` 1 (`Navbar.tsx`) · `crmReports.service` 1 · `dynamic-table.service` 1. Causa das 8 novas: o #784 trocou `fetch` cru por `lib/services` nos widgets (verificado em `chat/hooks/useChatInstance.ts` por `git log`; inferido nas outras 7) |
| `U9` entre features, alvo `public/` | 40 | **45** | `crm→dashboard` 20 · `accounting→dashboard` 17 · `dashboard→accounting` 3 · `dev→dashboard` 2 · `crm→accounting` 1 · `dashboard→crm` 1 · `interview→dashboard` 1. Mais importados: `dynamic-tables.client.ts` 13 · `StandardPagination` 9 · `formatters.ts` 3 |
| `U3` (já ligada) | 18 | 18 | `ErpViewWidget` 8 · `CrmReportWidget` 5 · `AnalyticsWidget` 3 · `GoldKpiWidgetView` 2 |

Baseline atual do my-app (23 entradas): `U2` 1 · `U3` 18 · `U7` 4. Sem mudança.

### 1.4 Posse de model do Prisma (F-MB-11), por regex

`node <tmp>/posse.cjs <raiz>`: lista de delegates tirada do `schema.prisma`; casa `.<delegate>.<escrita>(` com qualquer receptor (`prisma`, `tx`, `db`, `client`, `this.client`…), em `server/src` fora de testes. Escritas: `create`, `createMany`, `createManyAndReturn`, `update`, `updateMany`, `updateManyAndReturn`, `upsert`, `delete`, `deleteMany` (as duas `…AndReturn` existem no Prisma 6.16 e não estão na lista do §10.4).

| Medida | ADR §10.4 | **24/11** |
|---|---|---|
| Models no schema | 146 | **146** |
| Models com escrita em produção | 138 | **138** |
| Chamadas de escrita | — | 382 (367 em `repositories/`, 15 fora) |
| Model escrito por `repositories/` de mais de uma feature | 0 | **0** |
| Acesso dinâmico ao delegate (`prisma[x]`) | — | 0 |
| `$executeRaw*` que grava | 1 | 1 (`jobs/rekeyLegacyUnitCli.ts:412`); os outros 25 `$queryRaw*` são `SELECT`/`PRAGMA` |

**Baseline nominal** (as 15 chamadas fora de `repositories/`, mais a de SQL cru):

| Arquivo:linha | Model.operação | Tratamento proposto |
|---|---|---|
| `features/dynamicTables/services/DynamicTableService.ts:501` | `User.updateMany` | exceção nominal (já comentada no código; T0 do onboarding na tx do install) |
| `features/onboarding/services/SystemProvisioningService.ts:226` | `CompanyFiscalProfile.upsert` | **falso positivo da regex**: o receptor é o serviço `this.companyFiscalProfile`, não o Prisma (lido). Decide a forma da regra (F-MBE-10) |
| `jobs/JobWatermarkRepository.ts:20` | `JobWatermark.upsert` | some quando o arquivo for para `jobs/repositories/` (dono do model = `jobs`) |
| `jobs/PurgeDeletedRecords.ts:136,144,151,156,175` | `DynamicTableData`, `InterviewSession`, `CrmReportDefinition`, `SavedTableView`, `CrmAttachment` `.deleteMany` | baseline; paga quando o job passar por `lib/factory` (J1) |
| `jobs/migratePlano4NiveisCli.ts:103,115,127,188` | `Account.update` ×2, `Account.create`, `KitInstallation.update` | exceção nominal (CLI de migração única, F-MB-6) |
| `jobs/seedAccountingFixtureCli.ts:240,414` | `User.create`, `FiscalProfile.upsert` | exceção nominal (F-MB-6) |
| `jobs/rekeyLegacyUnitCli.ts:412` | `$executeRawUnsafe` (`UPDATE … SET unitId`) | exceção nominal (F-MB-6) |
| `server.ts:95` | `Document.updateMany` | baseline; paga com método no `DocumentRepository` chamado pelo bootstrap |

**Mapa derivado** (dona = a única feature cujo `repositories/` grava o model): `accounting` 92 · `dp` 15 · `dynamicTables` 4 · `sectorKits` 4 · `packages` 3 · `teammates` 3 · `chat` 2 · `documents` 2 · `legalParameters` 2 · 10 features com 1 (`accountingBinding`, `attachments`, `chatInstances`, `chatMessages`, `crm`, `dashboardLayout`, `fx`, `interview`, `savedViews`, `users`) · `jobs` 1 (`JobWatermark`). Total: 138.
**8 models sem escrita direta detectada** (dona declarada à mão, pela relação no schema): `InterestOnEquityAllocation`, `BankSettlementChargePart`, `LalurParteBBalance` → `accounting`; `TeammateRoutine`, `McpServer`, `AgentChannel`, `AgentChannelMember`, `AgentChannelMessage` → `teammates`. Não li se são gravados por escrita aninhada ou se nunca são gravados (insumo ausente; lacuna na caixa).

**Limites da medida (declarados):** regex, não AST. Não vê escrita aninhada (`data: { filhos: { create: … } }`), que grava model filho sem citar o delegate dele; não distingue serviço com nome de delegate (o falso positivo acima).

### 1.5 `DynamicTableReader` e `RuleDataAccess` (conferência do §10)

- **Consumidores do `IDynamicTableRepository` fora do motor: 9 arestas `M1a`** (o ADR tinha 7): `CrmPipelineService`, `CrmAnalyticsService`, `CrmReportService`, `RegisterPaymentService`, `SalesCancellationService`, `PackageAcceptanceService`, `KnowledgeGraphService` e, novos desde 20/10, `sales/services/SaleFiscalGuardService` e `attachments/services/AttachmentService`. O `lib/factory.ts` também importa a interface (composition root; não é `M1a`).
- **Guarda copiada** (`grep -c 'dynamicTableId !=='`): `CrmPipelineService` **8** (linhas 62, 69, 167, 271, 310, 360, 372, 435; o ADR conta 5) · `RegisterPaymentService` 1 (`:55`) · `SalesCancellationService` 1 (`:63`) · `PackageAcceptanceService` 1 (`:190`) mais 2 usos de `existsByIdInTable` como guarda (`:239`) · `SaleFiscalGuardService` 1 (`:252`) · `AttachmentService` 1. Total: **13 comparações explícitas em 6 serviços** (o ADR diz 10 em 4).
- **O ADR §10.1 diz que nenhuma das chamadas passa `tx`. Não confere:** `CrmPipelineService.ts:206` lê com `this.repository.withTransaction(tx).findDataById(leadRow.id)` dentro do `runInTransaction` do `convertLead` (o gate autoritativo "Lead already converted", INV F-27.1). É o F-MBE-7.
- **Métodos do repositório que os 9 consumidores chamam** (`node <tmp>/pureza.cjs`, por campo tipado `IDynamicTableRepository`; o `SaleFiscalGuardService` por `grep`, porque tipa o campo com `Pick<…>`): `findTableByInternalName` 18 · `findDataById` 17 · `findRowsByFieldValue` 3 · `existsByIdInTable` 2 · `findTableById` 1 · `findTablesByUserId` 1. **Só leitura**: nenhuma escrita e nenhum `runInTransaction` pelo repositório; um único `withTransaction` (o do item acima). `SaleFiscalGuardService.ts:304` lê `findDataById(itemId)` sem comparação de tabela na mesma linha: não li de onde vem o `itemId` (insumo ausente).
- **`RuleDataAccess` confere:** os plugins de `dynamicTables/rules/` usam 8 métodos (`findRowsByFieldValue` 17 · `findDataById` 15 · `updateData` 11 · `createData` 8 · `findTablesByUserId` 2 · `findTableByInternalName` 2 · `findDataByTableId` 2 · `deleteData` 1). A interface tem 32 métodos hoje (o ADR diz 31). O `RuleContext.repository` é montado nas 8 chamadas de `runRules` do `DynamicTableService.ts` (linhas 603, 620, 809, 823, 934, 943, 1000, 1010).

## 2. Fatiamento em PRs (ordem do ADR §10.3)

A ordem abaixo supõe as recomendações dos forks F-MBE-1 (direto na `main`) e F-MBE-2 (renome por feature). Se o dono decidir diferente, as linhas PR-3.x e a coluna "base" mudam; o resto não.

Classe de risco: saída de `node scripts/classe-risco.mjs arquivos <lista prevista>` rodado em 24/11 para PR-0, PR-1b, PR-2, PR-2b, PR-3.x (`dynamicTables` e `sectorKits`), PR-4, PR-5, PR-6 e PR-9 (a/c); as outras linhas são **inferidas** dos mesmos globs. A lista de arquivos é a prevista, então a sessão de feature confirma com `node scripts/classe-risco.mjs pr <n>`.

| PR | O quê | Efeito esperado (a medir no PR) | Classe esperada |
|---|---|---|---|
| **PR-0** (P0) | Como no ADR §4: repontar os 19 imports que só trazem `BindingScope`/`bindingScopeWhere`/`resolveBindingScope` (13 de `sectorKits`, 3 de `accountingBinding`, 3 de `jobs`) para `accountingBinding/scope/BindingScope.ts`; tirar o reexport da linha 6 do `IAccountingBindingRepository.ts`. Não cria `public/` (a forma dela depende do F-MBE-3); as 13 arestas de `sectorKits` continuam na `M1` | `L5` 4 → 0 · `M1a` 49 → 36 · `J1` 18 → 16 · `M1` 393 (igual) | vermelho, revisor obrigatório (`features/accountingBinding/**`) |
| **PR-1a** (P1, accounting) | `ActiveAccountant` → `accounting/models/`; `outstandingLines` recebe as linhas (ou o tipo da linha em `models/`); `issLimite`/`lc116ListaNacional` recebem as linhas do parâmetro por argumento | `L4` 4 → 2 · `L6` 4 → 0 | vermelho, revisor obrigatório (`features/accounting/**`) |
| **PR-1b** (P1, chat) | `KnowledgeGraphData` → `chat/models/` | `L4` 2 → 0 | verde |
| **PR-2** (ligação única) | `M1a`, `M1`, `J1`, `D2` (nasce 0), `U8`, `U9` com baseline, nas duas configs; emenda datada no `ADR-ARCH-BOUNDARIES.md` §1/§2 e no `ADR-MODULE-BOUNDARIES.md` com baseline antes/depois; um plantio por regra (§4). Sem mover arquivo de feature | gate passa a barrar violação nova; `X3` 15 → 12 no arquivo (entradas já pagas) | vermelho, **revisor não** (só `.md` casa glob: `docs/adr/**`; a config do depcruise não está na lista — lacuna na caixa) |
| **PR-2b** | `JobWatermarkRepository.ts` → `src/jobs/repositories/` | `J1` −1 | verde |
| **PR-3.x** (renome + `M2`) | Um PR por feature, na ordem do §3.3: move as pastas da tabela §5.3 e acrescenta a feature à `M2` no mesmo PR. O da `accounting` atualiza `I6` e (se o #1356 já estiver na `main`) `LEDGER_CORE_ALLOWED` da `C1` | `M2` 879 → 0 ao fim da série; `D2` cobre o que entrou em `domain/` | `dynamicTables`, `analytics`, `interview`, `crm`, `fx`: verde, salvo se tocar `.claude/**` (skills) → vermelho com revisor só se o arquivo de skill não for `.md` (`skill-audit/check-registries.mjs`). `sectorKits` (toca `kits/_shared/**`), `accountingBinding`, `accounting`: vermelho, revisor obrigatório |
| **PR-4** (P3, motor) | `DynamicTableReader` em `dynamicTables/public/`; os 9 consumidores trocam o `IDynamicTableRepository` por ele; um teste de guarda de posse por chamador | `M1a` −9 · 13 comparações de guarda → 0 | vermelho, revisor obrigatório (`sales/services/SaleFiscalGuardService.ts` casa `features/**/*iscal*`) |
| **PR-5** (F-MB-3 c) | `RuleDataAccess` em `rules/RuleTypes.ts`; `RuleContext.repository` → `RuleContext.data`; funções puras dos plugins → `dynamicTables/domain/` | contrato do plugin encolhe de 32 para 8 métodos; testes dos plugins sem mudança de asserção | verde |
| **PR-6** (F-MB-11) | mapa `model → dona` + regra de lint + linha de exceção no `CLAUDE.md` raiz + emenda no ADR | baseline nominal do §1.4 | vermelho, revisor **não** se só `CLAUDE.md`/`docs/adr` casarem (`server/eslint.config.mjs` não está na lista) |
| **PR-7.x** (J1) | jobs passam por `lib/factory`, um PR por job ou grupo pequeno | `J1` 16 → 0 | job com `*ccounting*`/`*egalParams*`/`migratePlano*` no nome: vermelho, revisor obrigatório; os outros: verde |
| **PR-8.x** (P3, resto) | `M1a` restante: `IUserRepository` 4, `legalParameters` 3, `chat` 3, `accounting` 6, demais; cada um cria a porta em `public/` da dona | `M1a` → 0 | por feature tocada (accounting/legalParameters: vermelho, revisor obrigatório) |
| **PR-9.x** (P5, frontend) | (a) widgets de domínio para `features/*/widgets/` e o registro `dashboard-grid` para `features/dashboard/`; (b) `Navbar` para uma feature; (c) kit do dashboard: UI genérica → `components/`, contrato de dado → `lib/`, com Contrato §0 e skills no mesmo PR | `U3` 18 → 0 · `U8` 11 → 0 · `U9` 45 → ≤ 5 | (c) vermelho (`.claude/**` e, por repontar imports, `my-app/features/accounting/**`), revisor obrigatório; (a)/(b) verdes se não tocarem `features/accounting` |

**`M1` não tem PR de pagamento próprio:** as 393 arestas caem conforme cada PR que cruza feature cria o arquivo em `public/` da feature alvo (consequência 2 da decisão). O ritmo de crescimento sem a trava foi de 264 → 393 em 35 dias.

**`integration/<slug>`:** a regra do `CLAUDE.md` raiz (tema com 2+ PRs e arquivos em comum) manda usar `integration/module-boundaries`. A recomendação deste BRIEF é a exceção, e por isso é fork (F-MBE-1).

## 3. Janela do renome

### 3.1 PRs abertos que tocam as pastas que o renome move (24/11, `gh pr list --state open` + `gh pr diff <n> --name-only`, 28 PRs)

| PR | Base | Pastas movidas que toca | Outros choke points |
|---|---|---|---|
| #1356 regra `C1` | `main` | `accounting/fixtures/` (2) | `server/.dependency-cruiser.cjs`, `ADR-ARCH-BOUNDARIES.md`, `lib/factory.ts`, `jobs/` (1); cria `accounting/paises/br/` (4 arquivos soltos) e `accounting/ports/LedgerPorts.ts` |
| #1358 NF-e denegada | `main` | `accounting/dfe/` (3), `accounting/audit/` (1) | — |
| #1353 teste Onda 2.2 | `main` | `accounting/sync/` (1) | — |
| #1345 `outboundFetch` | `main` | `accounting/collection/` (1), `fx/clients/` (1) | — |
| #1146 X10a assinador local | `integration/x10a` | `accounting/dfe/` (10), `accounting/fixtures/` (1) | `jobs/` (2), `lib/factory.ts` |

**`dynamicTables/presets`, `analytics/kpis`, `sectorKits/kits`: nenhum PR aberto toca** (0 de 28). O PR-5/PR-6 do BUILDER-VERTICAIS (#1114, #1115) estão **fechados sem merge**; o trabalho segue só nas branches `claude/modulos-base-pr5` (7 commits à frente, 184 atrás da `main`) e `claude/modulos-base-pr6` (10 à frente, 184 atrás), as duas de 06/11, que tocam `server/src/features/` (21 e 27 arquivos).

Outros PRs em arquivos que este BRIEF toca fora do renome: `jobs/` em #1354, #1351, #1349, #1133; `lib/factory.ts` em #1361, #1357, #1354, #1133; `CLAUDE.md` raiz em #1365 e #1223.

### 3.2 Notas de nó com `write_set` nas pastas movidas

`PAIS-NA-BORDA` declara `accounting/fixtures/ChartOfAccountsFixture.ts`, `accounting/fixtures/ecf-l12-linhas.json`, `features/*/paises/**`, `features/*/ports/**`, `server/.dependency-cruiser.cjs` e `ADR-ARCH-BOUNDARIES.md`; a fatia F1 tem prazo 18/12/2026. `node scripts/paralelo.mjs plano MODULE-BOUNDARIES PAIS-NA-BORDA BUILDER-VERTICAIS` (rodado em 24/11 com a nota deste nó já escrita): os dois nós **não rodam juntos** (conflito apontado em `server/src/jobs/migratePlano4NiveisCli.ts` e `server/src/jobs/__tests__/checkLegalParamsFormatoCli.test.ts`), `MODULE-BOUNDARIES` na onda 1 e `PAIS-NA-BORDA` na onda 2; os choke points saem na fase B serial. O script não apontou a sobreposição em `accounting/fixtures/` nem em `server/.dependency-cruiser.cjs` (o `PAIS-NA-BORDA` declara os dois no `write_set`, este nó declara o segundo em `registros`): a ordem real entre os dois nós nessas pastas é a do §3.3 e do F-MBE-6. A sessão de feature roda o comando de novo antes de cada PR-3.x.

### 3.3 Ordem proposta e regra de rebase

1. **`dynamicTables`** primeiro (`presets` 50, `utils`, `validation`; `rules/` não se move): hoje não há PR aberto na pasta. Antes de abrir, o dono decide o destino das branches `modulos-base-pr5/pr6`: ou entram antes (rebase de 184 commits), ou rebaseiam depois por cima do renome (F-MBE-11).
2. **`analytics`** (`kpis`, `dynamic`, `core`, `utils`, `engine`, `index.ts`) e **`sectorKits`** (`kits`, `registry.ts`): sem PR aberto.
3. **`accountingBinding`** (`archetypes`, `interpreter`, `scope`, `runtime`, `fixtures`), **`interview`**, **`crm/constants.ts`**, **`fx/clients`** (depois do #1345).
4. **`accounting`** por último (`dfe`, `sync`, `scope`, `collection`, `audit`, `fixtures`): é onde estão os 5 PRs abertos e a branch `integration/x10a`. Entra depois de #1356, #1358, #1353 e #1345 mergeados ou fechados; a `integration/x10a` (#1146, #1354) rebaseia por cima.
5. **Regra de rebase:** quem está aberto numa pasta no dia do PR-3.x dela rebaseia por cima do renome. `git` segue o arquivo movido quando o conteúdo é igual; conflito só aparece em arquivo que o PR criou na pasta antiga, que o autor move para o destino da tabela §5.3. A `M2` ligada para a feature barra o arquivo novo na pasta antiga, então o erro aparece no `check:arch` do PR rebaseado.
6. **Janela:** cada PR-3.x abre e mergeia no mesmo dia. Um PR de renome que fica aberto acumula conflito a cada merge na pasta.

## 4. Prova de que cada regra morde (ADR §8 item 3, ajustado para `public/`)

Molde do `ADR-ARCH-BOUNDARIES.md` §3: arquivo plantado ⇒ `npm run check:arch` com exit ≠ 0 citando a regra; sem o plantio ⇒ exit 0. Plantio removido, `git status` limpo. A saída literal vai na emenda do ADR.

| Regra | Plantio (falha) | Contraprova (passa) |
|---|---|---|
| `M1a` | `features/crm/services/__sondaM1a.ts` importando `features/accounting/repositories/IPayableRepository` | o mesmo arquivo importando `features/accounting/repositories/…` a partir de `features/accounting/services/` |
| `M1` | `features/crm/services/__sondaM1.ts` importando `features/fx/services/<qualquer>` | `features/fx/public/__sonda.ts` plantado e importado por `features/crm/services/__sondaM1.ts` ⇒ exit 0 |
| `M2` (por feature) | `features/dynamicTables/__sondaM2.ts` (fora de pasta de camada) importado por um service | o mesmo arquivo em `features/dynamicTables/domain/` |
| `D2` | `features/analytics/domain/__sondaD2.ts` importando um `services/` | importando um `models/` |
| `J1` | `jobs/__sondaJ1.ts` importando `lib/prisma` | importando `lib/factory` |
| `U8` | `components/__sondaU8.tsx` importando `lib/services/user.service` | importando `lib/utils/…` |
| `U9` | `features/crm/__sondaU9.ts` importando `features/dashboard/shared/utils/formatters` | `features/dashboard/public/__sonda.ts` plantado e importado ⇒ exit 0 |
| Posse (lint) | `features/crm/repositories/__sondaPosse.ts` com `tx.account.update(…)` ⇒ `npm run lint` exit ≠ 0 | o mesmo em `features/accounting/repositories/` |
| `M3` (se F-MBE-3 a) | `features/fx/public/__sondaM3.ts` reexportando de `../repositories/` | reexportando de `../models/` |

O gate lê ambiente (o `node_modules` resolve por junção do depósito): a prova roda no worktree **e** vale o resultado do CI (Linux), por causa do `U5`/junção já documentado no `my-app/.dependency-cruiser.cjs`.

## 5. Contratos (esboço)

### 5.1 Regras como entram nas configs

```js
// server/.dependency-cruiser.cjs — TEST e PRISMA como já estão no arquivo
const LAYER_DIR = '/(services|repositories|policies|models|dtos|controllers|domain|ports|adapters|public)/';
const M2_FEATURES = '(dynamicTables)'; // cresce a cada PR-3.x; termina em [^/]+ (F-MBE-2 c)

{ name: 'M1a-no-foreign-repository', severity: 'error',
  from: { path: '^src/features/([^/]+)/', pathNot: TEST },
  to: { path: '^src/features/[^/]+/repositories/', pathNot: '^src/features/$1/' } },
{ name: 'M1-cross-feature-via-public', severity: 'error',
  from: { path: '^src/features/([^/]+)/', pathNot: TEST },
  to: { path: '^src/features/[^/]+/', pathNot: ['^src/features/$1/', '^src/features/[^/]+/public/'] } },
{ name: 'M2-feature-code-in-layer-folder', severity: 'error',
  from: { path: '^src/', pathNot: TEST },
  to: { path: `^src/features/${M2_FEATURES}/.+\\.ts$`,
        pathNot: [LAYER_DIR, '^src/features/dynamicTables/rules/', TEST] } },
{ name: 'D2-domain-is-pure', severity: 'error', // "função pura, não engine" (F-MB-4)
  from: { path: '/domain/', pathNot: TEST },
  to: { path: `(/repositories/|/services/|/controllers/|^src/routes/|${PRISMA}|node_modules/express/)` } },
{ name: 'J1-job-is-entrypoint', severity: 'error',
  from: { path: '^src/jobs/', pathNot: [TEST, '^src/jobs/repositories/',
          '^src/jobs/(migratePlano4NiveisCli|rekeyLegacyUnitCli|seedAccountingFixtureCli)\\.ts$'] },
  to: { path: `(/repositories/|${PRISMA})` } },

// my-app/.dependency-cruiser.cjs
{ name: 'U8-components-no-domain-service', severity: 'error',
  from: { path: '^components/', pathNot: TEST }, to: { path: '^lib/services/' } },
{ name: 'U9-cross-feature-via-public', severity: 'error',
  from: { path: '^features/([^/]+)/', pathNot: TEST },
  to: { path: '^features/[^/]+/', pathNot: ['^features/$1/', '^features/[^/]+/public/'] } },
```

Com F-MBE-2 (a) (PR único), `M2_FEATURES` nasce como `[^/]+` e a linha some.

### 5.2 `DynamicTableReader` e `RuleDataAccess`

```ts
// features/dynamicTables/public/DynamicTableReader.ts — interface; a implementação fica em services/
export interface TableRef { id: string; userId: string; internalName: string }
export interface DynamicRow { id: string; dynamicTableId: string; data: Record<string, unknown> }

export interface DynamicTableReader {
  tableOf(userId: string, internalName: string): Promise<TableRef | null>;     // findTableByInternalName
  tableById(userId: string, tableId: string): Promise<TableRef | null>;        // findTableById + posse do usuário
  tablesOf(userId: string): Promise<TableRef[]>;                                // findTablesByUserId
  rowIn(table: TableRef, rowId: string): Promise<DynamicRow | null>;            // findDataById + guarda: null se a linha é de outra tabela
  existsIn(table: TableRef, rowId: string): Promise<boolean>;                   // existsByIdInTable
  rowsByField(table: TableRef, field: string, value: unknown): Promise<DynamicRow[]>; // findRowsByFieldValue
  inTx(tx: Prisma.TransactionClient): DynamicTableReader;                       // F-MBE-7 (a)
}
```

```ts
// features/dynamicTables/rules/RuleTypes.ts
// antes
export interface RuleContext { /* … */ repository: IDynamicTableRepository; }
// depois
export type RuleDataAccess = Pick<IDynamicTableRepository,
  'findDataById' | 'findRowsByFieldValue' | 'findDataByTableId' | 'findTableByInternalName' |
  'findTablesByUserId' | 'createData' | 'updateData' | 'deleteData'>;
export interface RuleContext { /* … */ data: RuleDataAccess; }
```

`Pick` mantém as assinaturas iguais às do repositório: o `txRepo` que o `DynamicTableService` já passa satisfaz o tipo sem adaptador.

### 5.3 Tabela de caminhos do renome (antigo → novo), com a medida de 24/11

| Feature (PR-3.x) | Hoje (módulos/arestas) | Destino | Observação |
|---|---|---|---|
| `dynamicTables` | `presets/` (50/173) | `domain/presets/` | choke point; 33 das arestas vêm de outras features (passam a pedir `public/`) |
| | `utils/` (3/4) | `domain/` | `RelationUtils.ts` e `TableUtils.ts` não têm importador de produção |
| | `validation/` (2/3) | `services/` | `GovernanceEngine` recebe `IDynamicTableRepository` |
| | `rules/` (20/53) | **fica** (pasta do motor, isenta por nome, fora da `D2`) | funções puras dos plugins → `domain/` no PR-5 |
| `analytics` | `kpis/` (24/30), `dynamic/` (15/17), `core/` (8/60), `utils/` (3/26) | `domain/…` | `core/models/` já casa |
| | `engine/` (2/2) | `services/` | `AnalyticsResolver` importa service |
| | `index.ts` | apagar ou `public/` | **não tem importador de produção em 24/11** (medido); confirmar como os processadores se registram antes de mexer |
| `sectorKits` | `kits/` (16/40), `registry.ts` (1/11) | `domain/` | `kits/_shared/**` é vermelho na régua |
| `accountingBinding` | `archetypes/` (8/8), `interpreter/` (3/5) | `domain/` | |
| | `scope/` (1/7) | `models/` | os 19 imports repontados no PR-0 mudam de caminho de novo aqui (ou vão para `public/`, conforme o F-MBE-3) |
| | `runtime/` (1/3) | `services/` | |
| | `fixtures/` (4/19) | `domain/` (F-MB-5 a) | antes: `computeCompiledFromHash` vira função pura |
| `interview` | `{Interview,Customization,FieldCustomization}Service/` (19/35) | `services/<x>/` | dois `index.ts` sem importador de produção |
| `crm`, `fx` | `crm/constants.ts` (1/8), `fx/clients/` (1/1) | `crm/domain/`, `fx/adapters/` | |
| `accounting` | `scope/` (3/**280**) | tipo e where-builder → `models/`; `AccountingScopeResolver` → `services/` | muda o caminho citado na `I6` e, com o #1356, na `C1` |
| | `sync/` (11/56) | serviço → `services/`; `AccountingSyncPort` → `ports/`; mappers → `domain/` | 5 mappers sem importador de produção |
| | `dfe/` (15/54), `collection/` (2/5) | `*Port` → `ports/`; clientes/provedores → `adapters/` | `dfe` dobrou desde 20/10 (7 → 15); 3 arquivos sem importador de produção |
| | `audit/` (2/3) | `domain/` | citado na `C1` do #1356 |
| | `fixtures/` (1 `.ts`/29 + 2 `.json`) | **F-MBE-6** | conflito de destino com o PAIS-NA-BORDA |

Cada PR-3.x repõe no mesmo diff os caminhos em texto que o `tsc` não vê (medida de 24/11 por `grep`): `.claude/skills/**` 18 arquivos, 124 ocorrências; `docs/claude-skills/GENERATION_CONTRACTS.md` 4; `scripts/` 5 arquivos (`activate-salon-binding.mjs`, `anexo-iii-to-fixture.mjs`, `anexo-xi-to-fixture.mjs`, `classe-risco.mjs`, `ecf-tabelas-dinamicas-to-catalog.mjs`); `server/.dependency-cruiser.cjs` 1 (`I6`); `governance/` 1; `docs/architecture/lint-layer-gate.md` 1. E 100 arquivos de `server/src` fora de `features/` (testes de integração, controllers, `lib/factory.ts`, jobs) importam as pastas movidas. ADRs e BRIEFs já ratificados (`docs/adr` 118 ocorrências, `docs/operating-manual` 45) são texto histórico e **não se reescrevem**.

### 5.4 Mapa de posse (forma)

```js
// server/prisma-model-owners.cjs — 146 chaves, uma por model do schema; valor = feature dona ou 'jobs'
module.exports = { Account: 'accounting', /* … */ JobWatermark: 'jobs', User: 'users' };
```

Um teste unitário confere que as chaves do mapa são exatamente os models do `schema.prisma` (model novo sem dona reprova).

### 5.5 Skills geradoras e `GENERATION_CONTRACTS.md`

Arquivos de skill com caminho que muda (ocorrências em 24/11): `analytics-kpi-generator/SKILL.md` 20 (+ `evals/evals.json` 5) · `interview-setup-generator/SKILL.md` 17 (+ evals 8) · `dynamic-table-preset-generator/SKILL.md` 15 (+ `governance.md` 1) · `dashboard-kpi-end-to-end-generator/SKILL.md` 11 (+ evals 3) · `skill-audit/check-registries.mjs` 8 · `luminaris-implementer/SKILL.md` 7 · `backend-test-suite-generator/SKILL.md` 4 (+ evals 2) · `luminaris-reviewer/SKILL.md` 2 · `_ARCHITECTURE-CONTRACT.md` 1.

**Contrato (`_ARCHITECTURE-CONTRACT.md`), lido em 24/11:** o §0 cita por caminho canônicos que mudam — `server/.../presets/fields/*` (PR-3.x `dynamicTables`), `addMoney`/`DataSanitizer`/`DateUtils` de `features/analytics/utils` (PR-3.x `analytics`) e, no frontend, `GenericTable`, `StandardPagination`, `formatters.ts`, `DashboardKpiCard`, `ChartRenderer` (PR-9 c). O §2 muda em três linhas: a lista de camadas ganha `public/`, `domain/`, `ports/`, `adapters/` (PR-2); a linha "Domínios DynamicTable: service orquestra `DynamicTableService`…" passa a dizer que a leitura é pelo `DynamicTableReader` (PR-4); "Repository: único lugar com `prisma.*`" ganha "da feature dona do model" (PR-6). O §2.1 não muda: a linha `AC-2.1-B1` segue valendo com o `RuleDataAccess`.

Além do caminho, três regras novas entram no texto das skills e do `GENERATION_CONTRACTS.md`, no PR-2:
1. Import de outra feature só por `features/<x>/public/`; o gerador cria o arquivo em `public/` da feature alvo quando ele não existe.
2. Peça de feature mora em pasta de camada; lógica pura em `domain/`, interface externa em `ports/`, implementação externa em `adapters/`.
3. Escrita no Prisma só em `repositories/` da feature dona do model (entra no PR-6).

Gate de cada PR que toca `.claude/skills/**`: `node .claude/skills/skill-audit/skill-audit.mjs run` com 0 findings.

## 6. Checklist numerado (cada item testável sozinho)

**PR-0**
1. Nenhum arquivo importa `IAccountingBindingRepository` só para obter `BindingScope`/`bindingScopeWhere`/`resolveBindingScope`; todos apontam `accountingBinding/scope/BindingScope.ts`. Teste: `npm run check:arch:baseline` encolhe as 4 `L5`; o diff é só de caminho de import.
2. O reexport saiu do `IAccountingBindingRepository.ts`; `npx tsc --noEmit` limpo.

**PR-1a / PR-1b**
3. Cada pagamento tira a aresta exata do `.dependency-cruiser-known-violations.json` (o arquivo só encolhe): `L4` 4 → 0, `L6` 4 → 0.
4. `issLimite`/`lc116ListaNacional` recebem as linhas por argumento e devolvem o mesmo valor: os testes existentes dos dois models passam sem mudança de asserção (só muda por onde o parâmetro legal chega, não o valor).

**PR-2**
5. As 6 regras do §5.1 (menos a `M2`) estão nas configs com `severity: 'error'`; `npm run check:arch` sai 0 nos dois pacotes com o baseline regenerado.
6. Baseline gravado = a medida do PR (referência: §1.2/§1.3 depois do PR-0 e do PR-1). O diff do baseline só **acrescenta** entradas das regras novas e só **remove** entradas pagas.
7. Um plantio por regra dá exit ≠ 0 e a contraprova dá exit 0 (§4); saída literal na emenda do ADR.
8. Emenda datada no `ADR-ARCH-BOUNDARIES.md` (tabelas §1 e §2) e no `ADR-MODULE-BOUNDARIES.md`, com baseline antes/depois por regra.
9. `GENERATION_CONTRACTS.md`, as skills geradoras e o §2 do `_ARCHITECTURE-CONTRACT.md` dizem as regras 1 e 2 do §5.5; `skill-audit` 0 findings.

**PR-3.x (um por feature)**
10. Todo arquivo da feature na tabela §5.3 está no destino; nenhum arquivo `.ts` de produção da feature fica fora de `LAYER_DIR` (salvo `dynamicTables/rules/`). Teste: a `M2` com a feature em `M2_FEATURES` sai 0 **sem** entrada de baseline para ela.
11. Nenhum módulo entrou em `domain/` com import impuro: `D2` em 0.
12. `npx tsc --noEmit` limpo nos dois pacotes; jest da feature (`npx jest <caminho> --selectProjects unit`); o snapshot de DTO não muda (`__dto-shapes__.json` sem diff).
13. Caminhos em texto do §5.3 e as linhas do Contrato §0 que citam a pasta (§5.5) repostos no mesmo PR; `skill-audit` 0 findings; `node scripts/classe-risco.mjs` continua cobrindo os caminhos novos (o glob `sectorKits/kits/_shared/**` muda junto com a pasta).
14. PR da `accounting`: a `I6` e a `LEDGER_CORE_ALLOWED` da `C1` apontam os caminhos novos, e o plantio de cada uma continua mordendo.

**PR-4**
15. `DynamicTableReader` exposto em `dynamicTables/public/`; nenhuma aresta `M1a` com destino em `dynamicTables/repositories/` (as 9 saem do baseline; `lib/factory.ts` continua importando a interface, como composition root). A linha "Domínios DynamicTable" do Contrato §2 cita o reader.
16. A guarda de posse mora só no reader: `grep -c 'dynamicTableId !=='` dá 0 nos 6 serviços do §1.5. Um teste por chamador prova que id de linha de outro usuário devolve o mesmo erro de antes (404/validação, sem vazar dado).
17. O re-check do `convertLead` continua **dentro** da transação (os testes que hoje cobrem "Lead already converted" — `crm/services/__tests__/CrmPipelineService.test.ts` e `controllers/__tests__/crmPipeline.integration.test.ts` — sem mudança de asserção).

**PR-5**
18. `RuleContext.data: RuleDataAccess` no lugar de `repository`; nenhum plugin alcança `createTable`, `deleteTable`, `deleteTablesByUserId`, `deleteAllDataByUserId`, `withTransaction` (erro de tipo se tentar; teste de tipo com `@ts-expect-error`).
19. Os testes dos plugins (`rules/__tests__/**`, `rules/plugins/__tests__/**`) passam sem mudança de asserção; só o nome do campo muda nos fixtures.
20. Funções puras dos plugins em `dynamicTables/domain/`, cobertas pela `D2`.

**PR-6**
21. O mapa tem as 146 chaves do schema e o teste de paridade reprova model sem dona.
22. A regra de lint reprova escrita de model fora de `repositories/` da dona; `npm run lint` sai 0 com o baseline nominal do §1.4 e mais nada. Se achar mais que o §1.4, o achado vai à caixa antes de qualquer supressão (ADR §10.4).
23. A linha de exceção entra no `CLAUDE.md` raiz (bloco ⛔), citando 24/11/2026 e o F-MB-11.

**PR-7.x / PR-8.x**
24. Cada job pago sai do baseline da `J1` e da lista do §1.4; `J1` chega a 0.
25. Cada alvo `M1a` pago ganha a porta em `public/` da dona; `M1a` chega a 0.

**PR-9.x (frontend; BRIEF `FE-INCR` próprio se o dono quiser separar — a casa separa BE de FE)**
26. `U3` 18 → 0 e `U8` 11 → 0, baseline do my-app só encolhe.
27. Canônicos do Contrato §0 movidos (não copiados): §0, `GENERATION_CONTRACTS.md` e golden refs no mesmo PR; `skill-audit` 0 findings; `npx tsc --noEmit` e `npm run test:types` no my-app; tela conferida contra build de produção.

## 7. Forks novos — RATIFICAÇÃO PENDENTE

Nenhum foi decidido. "F-MBE" = forks de **e**xecução do ADR-MODULE-BOUNDARIES (para não colidir com F-MB-1..12 nem com os F-MB de `D-2026-10-31-MODULOS-BASE-SUBMODULOS`).

| Fork | Caminhos | Recomendação |
|---|---|---|
| **F-MBE-1** onde os PRs entram | (a) direto na `main`, em série, como exceção declarada à regra de `integration/<slug>`; (b) `integration/module-boundaries` com tudo e um PR final; (c) P0/P1/ligação na `main`, o resto na integração | **(a)**. A trava só vale onde o CI da `main` roda: numa branch de integração a `M1` não barra nada, e a dívida cresceu 129 arestas em 35 dias sem trava. O renome numa branch longa conflita com todo merge nas pastas. Deixa aberto: é exceção à regra de 10/11, e os PRs compartilham 4 arquivos (as duas configs e os dois baselines), então entram um por vez |
| **F-MBE-2** tamanho do PR que liga a `M2` | (a) um PR único move as 209 peças e liga a `M2` (a letra do F-MB-12); (b) ligar a `M2` já com baseline e mover depois (recusado pelo F-MB-12: trava preset novo); (c) `M2` por feature: cada PR move as pastas de uma feature e acrescenta a feature à regra | **(c)**: é a versão incremental da estrutural. Cada feature troca de pasta de uma vez (o motivo do F-MB-12 continua atendido dentro dela), o diff cabe em revisão e a janela do §3.3 é por pasta. (a) toca, medido, 209 módulos, cerca de 880 imports, 100 arquivos fora de `features/` e 18 arquivos de skill num PR vermelho, com 5 PRs abertos nas pastas da `accounting` |
| **F-MBE-3** `public/` cega as regras de camada | Um arquivo de `B/public/` que reexporta `B/repositories/IRepo` (ou um service) faz a aresta de `A` terminar em `/public/`: `M1a`, `L2`, `L5`, `L6` e a `B7` (que também casa por `/services/`) não veem. O §10.1 diz "sem reexportar repositório, sem efeito colateral", sem regra. (a) regra nova `M3`: `public/` não importa `repositories/`, e `L5`/`L6` passam a tratar `public/` de outra feature como camada executável, salvo arquivo `*.types.ts`; `export *` e import por efeito colateral em `public/` barrados no lint; (b) só convenção escrita no Contrato | **(a)**. Sem ela a `M1a` se paga trocando o caminho do import, não a dependência. É regra a mais que o ADR não tem: emenda datada. Antes/depois abaixo. Decidido (a), o PR-0 pode já nascer com `accountingBinding/public/bindingScope.types.ts` e poupar 13 arestas do baseline da `M1` |
| **F-MBE-4** nome da regra de pureza | `D1` já é `D1-dp-core-not-optional` desde 03/11. (a) a nova chama `D2-domain-is-pure`; (b) renomear a do DP | **(a)**: não mexe em regra ligada nem na emenda de 03/11 |
| **F-MBE-5** `M2` × `paises/<cc>/` | O #1356 cria 4 arquivos soltos em `accounting/paises/br/`. (a) sem exceção: dentro de `paises/<cc>/` valem as pastas de camada (`paises/br/adapters/…`), como diz o R3 do ADR-PAIS-NA-BORDA; os 4 arquivos mudam no PR-3.x da `accounting`; (b) `paises/` entra no `LAYER_DIR` e qualquer arquivo ali passa | **(a)**: (b) cria uma pasta onde a `M2` não vale, justo a que vai receber o legado BR inteiro |
| **F-MBE-6** destino de `accounting/fixtures/` | F-MB-5 (a) manda para `accounting/domain/`. O comentário da `C1` (#1356) e a lacuna `L-20261124-043445-565b` dizem que o plano de contas padrão é dado do Brasil e vai para `paises/br/`. (a) um movimento só, para `accounting/paises/br/domain/`, feito pelo PR-3.x da `accounting`; (b) dois movimentos: `domain/` agora, `paises/br/` na fatia do PAIS-NA-BORDA; (c) fica fora do renome, entra no baseline da `M2` e quem move é o PAIS-NA-BORDA | **(a)**: atende `M2` e `P1` de uma vez. Custo: o centro (`PostingService`) importa `ChartOfAccountsFixture`, o que a `P1` proíbe; pede a porta que o F-PBF1-7 do BRIEF da F1 já discute. Se a porta não estiver pronta no dia, vale (c) como etapa declarada |
| **F-MBE-7** `DynamicTableReader` × transação | O §10.1 fechou o insumo como "nenhuma chamada passa `tx`"; `CrmPipelineService.ts:206` lê dentro da tx (gate autoritativo). (a) o reader tem `inTx(tx)` e o re-check segue dentro da transação; (b) o re-check vira método do `DynamicTableService`; (c) essa aresta fica no baseline da `M1a` | **(a)**: mantém o gate dentro da tx (regra 5 do `server/CLAUDE.md`) e o reader como única porta. Antes/depois abaixo |
| **F-MBE-8** widget de chat no frontend | A `U8` foi de 3 para 11: `components/widgets/chat/**` e `components/widgets/shared/hooks/useChat*` chamam `chat.service`/`document.service`. O ADR só deu destino a 4 widgets. (a) vão para `features/chat/widgets/` (feature nova no my-app); (b) exceção nomeada na `U8` para `components/widgets/chat/` | **(a)**: é a regra do ADR ("widget de domínio mora em `features/<x>/widgets/`"). Os dois `useChatInstance.ts` duplicados viram um no mesmo PR ou ficam como lacuna (está na caixa) |
| **F-MBE-9** para qual feature vai o `Navbar` | F-MB-10 (b) diz "uma feature" sem nomear. Só `pages/_app.tsx` importa o `Navbar` (medido). (a) `features/shell/` (casca do app: navbar, e o que mais ler o usuário da sessão); (b) `features/dashboard/` | **(a)**: `dashboard` já é o kit que o F-MB-7 quer desmontar |
| **F-MBE-10** como a regra de posse reconhece o Prisma | O ESLint do server não usa informação de tipo. (a) regra local sintática: `.<delegate>.<escrita>(` com delegate tirado do mapa, exceção por `-- SANCTIONED:` + bloco debt-ledger (o mecanismo que já existe); (b) regra com tipo (`parserOptions.projectService`): só casa receptor do tipo `PrismaClient`/`TransactionClient`; (c) `no-restricted-syntax` gerado por feature | **(b)**, com o tempo do job de lint medido no PR. É a exata: não tem o falso positivo do `SystemProvisioningService.ts:226` e pega alias (`const c = tx`). (a) fica como alternativa se o lint com tipo estourar o tempo do CI: deixa 1 supressão por falso positivo e não vê alias. Nenhuma das três vê escrita aninhada (limite declarado) |
| **F-MBE-11** branches `modulos-base-pr5/pr6` × renome de `presets/` | PRs fechados sem merge, branches 184 commits atrás, nó `inflight`. (a) o renome de `dynamicTables` entra primeiro e as branches rebaseiam por cima; (b) PR-5/PR-6 reabrem e entram antes do renome | **(a)**: hoje não há PR aberto em `presets/`; esperar reabre a janela. Deixa aberto: o rebase delas fica maior |

**Antes/depois — F-MBE-3 (a):**

```ts
// features/accounting/public/payables.ts
// hoje nada impede (a M1a não vê):
export type { IPayableRepository } from '../repositories/IPayableRepository';
// com a M3: exit 1. O que a feature expõe é a porta de leitura, com tipo de models/:
export type { PayableLine } from '../models/Payable.model';
export type { PayableReader } from '../ports/PayableReader';
```

**Antes/depois — F-MBE-7 (a):**

```ts
// CrmPipelineService.convertLead — hoje
const current = await this.repository.withTransaction(tx).findDataById(leadRow.id);
// depois
const current = await this.tables.inTx(tx).rowIn(leadsTable, leadRow.id);
```

## 8. Pendente de validação externa

Nenhuma. Nada aqui depende de regra contábil, fiscal ou legal: em `issLimite`/`lc116ListaNacional` só muda por onde o parâmetro legal chega (item 4 do checklist).

## 9. Insumos ausentes (não varri)

- De onde vem o `itemId` lido sem guarda de tabela em `SaleFiscalGuardService.ts:304` (ler antes de fechar a interface do reader no PR-4).
- Como os processadores de analytics se registram, já que `analytics/index.ts` não tem importador de produção.
- Tempo do job de lint com informação de tipo (F-MBE-10 b).
- Quem importa o resto de `components/widgets/dashboard-grid/` e se os 8 módulos além do registro tocam domínio (herdado do ADR §9).
- Se os 8 models sem escrita direta são gravados por escrita aninhada.
- Quais das 3 CLIs isentas já rodaram e têm runbook assinado (herdado do ADR §9; só importa se o dono quiser apagá-las).

## 10. Achados fora de escopo (na caixa do maestro)

Ids na nota do nó e no corpo do PR.

- `L-20261124-135606-0dc7` — a nota `BUILDER-VERTICAIS` cita #1114/#1115 como PRs do PR-5/PR-6, e os dois estão fechados sem merge; as branches estão 184 commits atrás da `main`.
- `L-20261124-135607-990d` — `scripts/classe-risco.mjs` não lista `server/.dependency-cruiser.cjs`, `my-app/.dependency-cruiser.cjs`, os baselines nem `server/eslint.config.mjs`: um PR que liga ou afrouxa regra de fronteira sai verde, ou vermelho sem revisor se só o `.md` do ADR casar.
- `L-20261124-135608-6827` — `components/widgets/chat/hooks/useChat{Instance,Messages}.ts` e `components/widgets/shared/hooks/useChat{Instance,Messages}.ts` são pares de mesmo nome que chamam o mesmo serviço (duplicação provável; não comparei o conteúdo).
- `L-20261124-135609-e7de` — 8 models do schema sem escrita direta em produção (lista no §1.4): gravados por escrita aninhada ou schema morto.
- `L-20261124-135610-07f5` — 13 módulos fora de camada sem importador de produção (lista na saída do `m2.cjs`): entre eles 5 mappers de `accounting/sync/mappers/`, `dfe/sefaz/SefazSoapClient.ts`, `dfe/psc/FakePscServer.ts` e `collection/NullCollectionProvider.ts`. Assunto do knip.

## 11. Write-set

Por PR (globs; arquivo novo = caminho literal):

- **PR-0:** `server/src/features/accountingBinding/{policies,repositories}/**`, `server/src/features/sectorKits/{repositories,services,policies}/**`, `server/src/jobs/{installSectorKitCli,upgradeSectorKitsCli,migratePlano4NiveisCli}.ts`
- **PR-1a/1b:** `server/src/features/accounting/{models,repositories,policies,services}/**`, `server/src/features/chat/{models,repositories,services}/**`
- **PR-2/2b:** as duas configs, os dois baselines, os dois ADRs, `docs/claude-skills/GENERATION_CONTRACTS.md`, `.claude/skills/**`, `server/src/jobs/repositories/JobWatermarkRepository.ts`
- **PR-3.x:** `server/src/features/{dynamicTables,analytics,sectorKits,accountingBinding,interview,crm,fx,accounting}/**`, `server/src/{controllers,jobs,__tests__,lib}/**` (só path de import), `.claude/skills/**`, `scripts/{activate-salon-binding,anexo-iii-to-fixture,anexo-xi-to-fixture,classe-risco,ecf-tabelas-dinamicas-to-catalog}.mjs`, `governance/**`, `docs/architecture/lint-layer-gate.md`
- **PR-4:** `server/src/features/dynamicTables/{public,services}/**`, `server/src/features/{crm,sales,packages,chat,attachments}/services/**`
- **PR-5:** `server/src/features/dynamicTables/{rules,domain,services}/**`
- **PR-6:** `server/prisma-model-owners.cjs`, `server/eslint.config.mjs`, `server/eslint-rules/**`, `docs/architecture/lint-layer-gate.md`, `CLAUDE.md`
- **PR-7.x/8.x:** `server/src/jobs/**`, `server/src/features/*/public/**`
- **PR-9.x:** `my-app/components/{widgets,layout}/**`, `my-app/features/{dashboard,crm,chat,shell,accounting}/**`, `my-app/lib/**`, `my-app/pages/_app.tsx`, `.claude/skills/_ARCHITECTURE-CONTRACT.md`

**Choke points (`registros`):** `server/.dependency-cruiser.cjs`, `server/.dependency-cruiser-known-violations.json`, `my-app/.dependency-cruiser.cjs`, `my-app/.dependency-cruiser-known-violations.json`, `docs/adr/ADR-ARCH-BOUNDARIES.md`, `server/src/lib/factory.ts`, `server/eslint.config.mjs`, `CLAUDE.md`.

## 12. Primeiro comando da sessão de feature

Depois do "executa" do dono e dos forks F-MBE-1..4 decididos (os que o PR-0 e o PR-2 usam):

```
node scripts/worktree-deps.mjs && cd server && npm run check:arch
```

Tem de sair 0 com "27 known violations ignored" (ou o número do dia) antes de qualquer edição: é a linha de base contra a qual o PR-0 prova `L5` 4 → 0.

## Gates de envio [OPS-001]

1. **Objetivo:** §1 (medida nova), §2 (fatias com classe), §3 (janela), §4 (prova), §7 (forks).
2. **Grau:** contagens do §1 = verificadas (saída de comando); classe de risco do §2 = saída do classificador sobre a lista **prevista** de arquivos (inferida onde a linha diz); efeito esperado de cada PR = inferido da medida (o PR mede); destino de pasta do §5.3 = herdado do ADR §2, não relido arquivo a arquivo (assumido).
3. **Caso adversarial tentado:** "a regex de posse confirma o ADR porque foi escrita igual". Rodei com qualquer receptor e com as escritas `…AndReturn`: apareceu uma escrita que o ADR não lista (`SystemProvisioningService.ts:226`); li o arquivo e é um serviço com nome de delegate. O número do ADR se mantém, e o falso positivo virou o F-MBE-10.
4. **Checagem que teria falhado:** a contagem de mesma-feature em `M1`/`M1a`/`U9` (0); se o `$1` não funcionasse, as 393 incluiriam imports internos.
5. **Duas primeiras linhas:** TLDR (números novos e o risco dos forks).
