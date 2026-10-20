# BE-INCR-DT-NO-CONSUMER-CALLS — tirar do motor DynamicTable as chamadas a consumidores

> **AUTORIZAÇÃO VAZIA.** Nenhuma decisão citável do dono cobre este item. A nota `docs/plano/nos/BE-INCR-DT-NO-CONSUMER-CALLS.md` tem `autorizacao: ""` e **não roteia**. A citação de 19/10 (`D-2026-10-19-DT-ARQUITETURA-CORRECOES`, branch `claude/dynamictable-architecture-fixes-9e5ba8`) autoriza "correções necessárias no DynamicTable" dentro **daquele** trabalho (PR #769); não nomeia esta inversão, que não está nos 10 achados da decisão nem em "Fora do escopo". Divergência de escopo → registrada, não preenchida. Este BRIEF é análise e opções; não autoriza código.

| Campo | Valor |
|---|---|
| Nó | `BE-INCR-DT-NO-CONSUMER-CALLS` (`docs/plano/nos/BE-INCR-DT-NO-CONSUMER-CALLS.md`) |
| Domínio | motor DynamicTable (backend) |
| Base de leitura | worktree em `4274f006` (main + ledger #767). **Números de linha abaixo são desta base**; o #769 (`claude/dynamictable-architecture-fixes-9e5ba8`, commit `2c26a274`, PR OPEN, não mergeado) muda as linhas — ver tabela §1.1 (linhas do #769). |
| Autorização | **vazia** (ver topo) |
| Estado | planejado; **forks pendentes de ratificação** (§4) |
| Gate atual | `cd server && npm run check:arch` → exit 0, "no dependency violations found", 32 known violations ignored (medido 19/10 nesta base) |

---

## 0. Pergunta e regra

O motor `features/dynamicTables/**` importa dois consumidores e os chama:

- `server/src/features/dynamicTables/services/DynamicTableService.ts:13` — `KnowledgeGraphService` (chat), injetado no construtor `:93` como opcional.
- `server/src/features/dynamicTables/services/DynamicTableService.ts:14` — `kpiCacheService` (analytics), importado como singleton.

Contrato §2.1 (`.claude/skills/_ARCHITECTURE-CONTRACT.md` "O que o B1/B4 NÃO proíbe"): *"Quem consome chama o motor. O motor nunca chama o consumidor."* O gate B1 não pega isto (chat/analytics não são módulos Prisma first-class). Este nó trata a violação **da regra escrita**, não do gate.

Restrição: sem engine/fila genérica (`docs/adr/ADR-DOMAIN-MOTOR-rejected.md`).

---

## 1. Evidência (arquivo:linha)

### 1.1 Sites das duas chamadas — base `4274f006`

**`syncGraph` (chat/KnowledgeGraphService)**

| Site | Chamada | Quando |
|---|---|---|
| `DynamicTableService.ts:151` | `this.knowledgeGraphService.syncGraph` | `_createTable` (criar) |
| `DynamicTableService.ts:160` | `this.knowledgeGraphService.syncGraph` | `_updateTable` (renomear/atualizar) |
| `DynamicTableService.ts:189` | `this.knowledgeGraphService.syncGraph` | `_deleteTable` (apagar) |

**`kpiCacheService.invalidate` (analytics/KpiCacheService)**

| Site | Método | Observação |
|---|---|---|
| `DynamicTableService.ts:635` | `createTableData` | invalida **antes** do commit quando `options.tx` (ver G4) |
| `DynamicTableService.ts:901` | `updateTableData` | idem |
| `DynamicTableService.ts:1029` | `deleteTableData` | pós-tx própria |
| `DynamicTableService.ts:1097` | `deleteTableDataBatch` | pós-tx própria |

Chamadas `syncGraph`/`invalidate` existem **só** dentro de `DynamicTableService.ts` (grep em `server/src` inteiro). Nenhum consumidor chama `syncGraph` por fora.

**Mesmas chamadas no #769 (`origin/claude/dynamictable-architecture-fixes-9e5ba8`, `2c26a274`)** — o nó tem de rebasear sobre ele:

| #769 | Linha |
|---|---|
| imports | `:11-12` |
| construtor (param opcional) | `:102` |
| helper privado `syncGraph(userId, what)` (com `if (!this.knowledgeGraphService) return;` e `logger.error`) | `:118-122` |
| chamadas do helper | `:174` (create), `:181` (update), `:206` (delete) |
| `kpiCacheService.invalidate` | `:635`, `:839`, `:955`, `:1024` |

### 1.2 Caminhos de escrita do motor SEM a chamada (cobertura atual)

Verificado por leitura. Nenhum destes tem teste que afirme a invalidação/sync (grep: só `KpiCacheService.test.ts` exercita o cache; nenhum teste de DT afirma `syncGraph`/`invalidate`).

| ID | Caminho | Evidência | Efeito inferido (não reproduzido) |
|---|---|---|---|
| G1 | `updateTableSchemaAsSystem` | `DynamicTableService.ts:273` (sem `syncGraph` nem `invalidate`); chamado por `PresetSyncService.ts:222` (delta aditivo de schema) | grafo mantém campos antigos após mudança de schema |
| G2 | `deleteAllTablesForUser` | `DynamicTableService.ts:1101` (sem nada); chamado por `SystemProvisioningService.ts:176` (`compensateProvisioning`) | KPI em cache do usuário sobrevive à purga na compensação; grafo é apagado logo depois por `knowledgeGraphs.deleteByUserId` (`SystemProvisioningService.ts:177`) — ok |
| G3 | criação de tabela por preset | `PresetSyncService.ts:299` `this.repository.createTable(...)` — **bypassa o service** | tabela nova instalada por preset não entra no grafo até a próxima escrita de tabela |
| G4 | invalidação antes do commit externo | `DynamicTableService.ts:635`/`:901` rodam depois de `writeCreate(options.tx)`/`writeUpdate(options.tx)`, dentro da tx do chamador. Chamadores com `{ tx }`: `CrmPipelineService.ts` `:98, :201, :220, :236, :270, :278, :305, :308, :310, :462`; `jobs/rekeyLegacyUnitCli.ts:388` (CLI, outro processo) | um KPI concorrente pode recalcular com o estado **pré-commit** e cachear por até 5 min (TTL `KpiCacheService.ts:set` = 300 000 ms) |
| G5 | erro de `syncGraph` engolido | `DynamicTableService.ts:151,160,189` (`.catch(console.error)`) | grafo velho sem sinal |
| G6 | dependência opcional | construtor `DynamicTableService.ts:93` `knowledgeGraphService?` → `if (this.knowledgeGraphService)`; hoje só `factory.ts:1023` constrói (sempre injeta) | um teste/composição sem o param dispensa o sync em silêncio |
| G7 | purge por job | `server/src/jobs/PurgeDeletedRecords.ts:34` `prisma.dynamicTableData.deleteMany` (bypass total) | **não verificado** se KPI lê linhas soft-deleted (grep em `features/analytics` não confirmou o filtro); se não lê, sem efeito |

### 1.3 Quem já é controller / integração desses caminhos

**Controllers (entrada HTTP → motor):**

| Controller | Linha | Chamada | Motor/efeito |
|---|---|---|---|
| `controllers/dynamicTablesController.ts` | `:122, :152, :178, :203` | createTableData / updateTableData / deleteTableData / deleteTableDataBatch | cobre as 2 chamadas via motor |
| `controllers/dynamicTablesController.ts` | `:229` syncInstalledTableFromPreset, `:255` installTableFromPreset | → `PresetSyncService` (`:222`, `:299` G1/G3) | |
| `controllers/analyticsDefinitionsController.ts` | `:50, :70, :87` | createTableData / updateTableData / deleteTableData | escreve em tabela de definição de KPI |
| `controllers/dashboardController.ts` | `:296, :334` provision; `:466` resetUserSystem | → `SystemProvisioningService` | |

Observação: **nenhum controller de tabela (create/update/delete de tabela) chama `createTable`/`updateTable`/`deleteTable`** — as três são "unreachable for regular users" (`DynamicTableService.ts:530-580`). Só os caminhos `*AsSystem` e de preset tocam tabela, e são chamados por integração/onboarding.

**Integração/serviços (consumidores que chamam o motor — caminho permitido pelo contrato):**

| Serviço | Linhas | Escrita | `isSystem` |
|---|---|---|---|
| `features/chat/services/LuminarisAgentService.ts` | `:226, :230` | create/update data (agente de chat) | não |
| `features/crm/services/CrmPipelineService.ts` | `:87, :98, :197, :216, :223, :236, :261, :271, :298, :308, :310, :367, :371, :458, :462` | data, **dentro de tx própria** (G4) | `:236`, `:371` |
| `features/sales/services/SalesCancellationService.ts` | `:83` (`:87` isSystem) | update data (cancelamento) | sim |
| `features/sales/services/RegisterPaymentService.ts` | `:121` (`:125` isSystem) | update data (pagamento) | sim |
| `features/accounting/services/PhysicalStockSync.ts` | `:100, :147, :183` (`:117, :161, :187` isSystem) | create data (espelho físico) | sim — porta `features/accounting/ports/OriginPorts.ts:40` |
| `features/dynamicTables/services/DynamicTableVersionService.ts` | `:111` | restore → updateTableData (`restoredFromVersion`) | não |
| `features/onboarding/services/SystemProvisioningService.ts` | `:128` installPresetAsSystem, `:176` deleteAllTablesForUser, `:193` createTableData | provisioning e compensação | — |
| `features/dynamicTables/services/PresetSyncService.ts` | `:222` updateTableSchemaAsSystem (G1), `:299` repo.createTable (G3) | preset | — |
| `features/dynamicTables/services/ModuleInstallService.ts` | `:70, :85` | → PresetSyncService | — |
| `jobs/rekeyLegacyUnitCli.ts` | `:388` | createTableData com `{ tx }` (CLI) | — |

**Escritores `isSystem` fora de controller:** CrmPipelineService (`:236`, `:371`), SalesCancellationService (`:87`), RegisterPaymentService (`:125`), PhysicalStockSync (`:117, :161, :187`). Todos são **serviços de integração** — o padrão já é o que o contrato manda; o problema é só que o motor, por dentro, chama os consumidores de cache/grafo.

**Precedente de efeito pós-commit dentro de serviço de integração:** `SalesCancellationService` roda o efeito contábil "post-commit ... via SaleReversalBridge" (comentário em `lib/factory.ts:1054-1055`).

**Precedente de injeção do cache em integração:** `SystemProvisioningService.ts:53` recebe `kpiCache: Pick<KpiCacheService,'invalidate'>` por deps (factory `:1904`) e invalida no reset (`:167`).

### 1.4 Testes

Nenhum teste de DynamicTable afirma `syncGraph` ou `invalidate`. Testes que citam KG/KPI: `controllers/__tests__/dashboardSystemReset.integration.test.ts`, `features/chat/__tests__/deleteByUserId.integration.test.ts`, `features/analytics/services/__tests__/KpiCacheService.test.ts`, `features/accounting/models/__tests__/accountingResetClassification.test.ts`, `features/documents/__tests__/rag-tenant-isolation.test.ts` — inventário de impacto por opção fica para a sessão de feature.

### 1.5 Gate estático — prova de que a regra morde

Sonda em config **temporária** (fora do repo, em `$TMPDIR`), acrescentando ao `server/.dependency-cruiser.cjs` a regra `PROBE-B7-dt-no-consumer-services` (`from ^src/features/dynamicTables/` pathNot TEST → `to ^src/features/(chat|analytics)/services/`). Resultado: **exatamente 2 violações**, as duas do §1.1 (`DynamicTableService.ts → chat/services/KnowledgeGraphService.ts` e `→ analytics/services/KpiCacheService.ts`). Nenhuma outra regra mudou. O repo não foi alterado.

---

## 2. Opções (trade-off)

### (a) Hook pós-commit genérico no motor
Motor define uma porta, p.ex. `features/dynamicTables/ports/DynamicTableWriteListener.ts`:

```ts
export interface DynamicTableWriteListener {
  onAfterWrite(e: { userId: string; tableId: string; op: 'create' | 'update' | 'delete'; committed: boolean }): void;
  onAfterSchemaChange(e: { userId: string; tableId: string; op: 'create' | 'update' | 'delete' }): Promise<void>;
}
// DynamicTableService(repo, policy, listeners: DynamicTableWriteListener[] = [])
// lib/factory.ts assina: listeners = [kpiListener, knowledgeGraphListener]
```

- **Pró:** o motor não conhece quem assina; o diff no service é pequeno; cobre G1/G2/G3 num lugar só (`onAfterSchemaChange`) se o motor passar a emitir nos caminhos `*AsSystem`/preset.
- **Contra 1 (contrato):** o motor continua **chamando** consumidores, ainda que por porta. A regra escrita diz "o motor nunca chama o consumidor". Exige emenda explícita do §2.1 (fork F6).
- **Contra 2 (tx, G4):** o seam (`runInTransaction`/`withTransaction`) não tem "after-commit". Se o hook dispara dentro da tx do chamador, G4 continua. Duas saídas: (i) hook só para escrita sem `tx` e chamadores com `tx` disparam depois do próprio commit (volta a ser (b) para ~11 sites); (ii) criar after-commit no seam — **mecanismo novo de coordenação dentro do motor**, que aproxima o motor de uma fila/engine (ADR-DOMAIN-MOTOR-rejected). Risco alto.
- **Contra 3:** a porta é uma API de eventos com lista de assinantes — quem lê o motor passa a ter de olhar `factory.ts` para saber o efeito.

### (b) Chamadas movidas para controller / serviços de integração
Remove as linhas do motor (`:13-14`, `:93`, `:151/:160/:189`, `:635/:901/:1029/:1097`). Um helper de **integração** (não do motor) é chamado por cada caminho de escrita, **depois** do commit do próprio escopo.

- **Pró:** cumpre a regra escrita ("quem consome chama o motor") sem emenda de contrato; o motor fica sem nome de consumidor e sem estado de assinatura; a tx do CRM resolve-se no CRM (o helper roda depois de `dynamicTableService.runInTransaction(...)` retornar — `CrmPipelineService.ts:85, :196, :260, :297, :457` —, o que resolve G4 sem mecanismo novo).
- **Contra 1 (sites esquecidos):** são ~11 caminhos de integração + 2 controllers + o próprio G1/G2/G3 que já estão **sem** a chamada hoje. Já há esquecimento real: G1, G3. Esta opção **não** fecha isso sozinha — a cobertura precisa ser um teste comportamental (§3, T2), porque gate de dependência não vê "chamou ou não chamou".
- **Contra 2:** a cada novo caminho de escrita, o autor precisa lembrar do helper. Mitigação: o helper é uma função única e o teste T2 enumera os caminhos.
- **Contra 3:** o consumidor de integração passa a conhecer analytics/chat (ex.: CRM importando `KpiCacheService`). Permitido pelas camadas (L3 só proíbe HTTP/Prisma), mas é acoplamento novo entre integrações.

### (c) Manter como está e emendar o contrato
Acrescenta em §2.1 uma exceção nomeada: "invalidação de cache e sincronização de grafo de consumidor podem ser chamadas pelo motor".

- **Pró:** nenhum código; zero risco de regressão de cache.
- **Contra:** o motor continua conhecendo dois consumidores; a exceção tende a crescer (qualquer próximo consumidor entra na lista); G1–G5 continuam. Não atende o pedido do nó, só o documenta.

### (d) Variante — geração pull (não pedida; registrada para decisão)
O motor expõe `dataGeneration(userId): number` (contador em memória, como o cache já é). A chave do KPI cache inclui a geração; o `KpiCacheService` não é mais chamado pelo motor. O grafo consulta a geração guardada e reconstrói sob demanda. Motor **nunca chama ninguém** (satisfaz §2.1 literal).

- **Pró:** remove os sites das duas chamadas do motor **e** dos consumidores; G1/G2/G3 deixam de existir como classe de bug para o KPI.
- **Contra:** muda a semântica de cache de analytics (`AnalyticsService.ts` `:63`, `:92`, `:175`) e de leitura do grafo (ChatService `:156` passaria a poder reconstruir na leitura). Multi-instância: contador em memória não é compartilhado — vale o que o cache já assume hoje (single process), mas precisa confirmar. Maior que (b).

### Recomendação (não ratificada)
**(b)**, com T2 comportamental obrigatório. Motivo: é a única que cumpre a regra escrita sem emenda e sem mecanismo novo de coordenação; o custo (lembrar do helper) é coberto por teste que enumera os caminhos, e o caso mais perigoso (G4, tx do CRM) se resolve no serviço que tem a tx. **(d)** é o plano B se o dono preferir zero sites, aceitando mudança de semântica de cache. **(a)** só vale com after-commit no seam, o que eu não recomendo.

---

## 3. Checklist numerado (vale para a opção que o dono ratificar; itens 1–3 e 5 dependem de F1)

1. [ ] **Motor — imports e parâmetro:** remover `KnowledgeGraphService` (`:13`), `kpiCacheService` (`:14`) e o param `knowledgeGraphService?` (`:93`). Sem nome de consumidor no motor (grep de `chat|analytics|KnowledgeGraph|kpiCache` em `features/dynamicTables/**` = 0, exceto testes).
2. [ ] **Motor — sync de tabela:** remover as 3 chamadas de sync (`:151`, `:160`, `:189`). Em (a)/(d), substituir por emissão do evento/geração.
3. [ ] **Motor — invalidação de dado:** remover as 4 chamadas (`:635`, `:901`, `:1029`, `:1097`).
4. [ ] **Helper de integração:** uma função única de efeito pós-escrita (`syncGraph` + `kpi.invalidate` do `userId`), fora do motor. Localização: fork F8.
5. [ ] **Chamada pós-commit em cada caminho (b):** `createTableData`/`updateTableData` dos controllers e dos serviços da §1.3 chamam o helper **após** o commit do escopo que os originou. Para chamadores com `{ tx }` (CRM `:98,:201,:220,:236,:270,:278,:305,:308,:310,:462`), o helper roda **depois** do `$transaction` do chamador (resolve G4).
6. [ ] **Fechar G1 e G3:** `updateTableSchemaAsSystem` e a criação de `PresetSyncService.ts:299` passam a acionar o efeito (decisão F3 antes).
7. [ ] **G5 e G6:** erro de sync tratado conforme F4; parâmetro do helper **obrigatório** (sem `?`), para não haver composição silenciosa (fork F4).
8. [ ] **Guard estático T1:** regra `B7-dynamictable-no-consumer-services` em `server/.dependency-cruiser.cjs` (ver §5). Entra conforme F5.
9. [ ] **Teste comportamental T2:** enumera os caminhos da §1.1/§1.2/§1.3 e afirma o efeito (grafo e KPI) após cada um. Vermelho antes do fix para G1, G2 (KPI na compensação), G3 e G4 (ver §5).
10. [ ] **Testes existentes:** os que constroem `DynamicTableService` sem o 3º argumento ou mockam o KG passam a refletir o novo contrato (inventário na sessão de feature).
11. [ ] **Gates:** `cd server && npx tsc --noEmit`; `npm run check:arch` (exit 0, baseline **não cresce** — ver F5); testes de DT e de analytics; `npm run test:integration` isolado se tocar em `tx`.
12. [ ] **Contrato §2.1:** texto ajustado só se F6 = (a) ou (c). Em (b), nada muda no contrato; o caso "motor nunca chama o consumidor" passa a ser verdade literal.
13. [ ] **Vault:** `node scripts/plano-vault.mjs fold BE-INCR-DT-NO-CONSUMER-CALLS --pr <n>` no próprio PR; `node scripts/plano-vault.mjs check` exit 0.
14. [ ] **Rebase:** a execução parte de `claude/dynamictable-architecture-fixes-9e5ba8` (ou de `main` depois do #769) — as linhas da §1.1 são desta base e mudam.

---

## 4. Forks pendentes de ratificação (NÃO ratificados)

| # | Decisão | Caminhos | Recomendação (com justificativa) | Status |
|---|---|---|---|---|
| **F1** | Mecanismo de desacoplamento | (a) hook / (b) integração / (c) contrato / (d) geração | **(b)** — cumpre a regra sem emenda; custo coberto por T2 | RATIFICAÇÃO PENDENTE |
| **F2** | Tratamento de tx externa (G4) | (i) invalidar após o commit do chamador (CRM faz); (ii) aceitar até 5 min de stale; (iii) after-commit no seam | **(i)** — (iii) é mecanismo novo dentro do motor; (ii) deixa KPI errado por 5 min sem sinal | PENDENTE |
| **F3** | Cobertura G1 (schema) e G3 (preset-create) entra neste nó? | (sim) fechar no nó; (não) abrir nó separado | **sim** — são as mesmas duas chamadas que o nó remove; deixar fora deixa o motor com buraco novo | PENDENTE |
| **F4** | Erro do sync (G5) e obrigatoriedade do helper (G6) | erro: engolir+log / propagar / marcar grafo stale. Helper: opcional / obrigatório | **propagar ao chamador de integração com log**, helper **obrigatório** (sem `?`) — silêncio é o modo de falha que hoje passa | PENDENTE |
| **F5** | Como o guard B7 entra no `check:arch` | (α) baseline cresce +2 (exige aprovação, a regra "baseline só encolhe" proíbe por padrão); (β) teste vermelho antes (sessão de instrumentação), baseline fica igual | **(β)** — mantém a regra "baseline só encolhe"; a regra vermelha é a instrumentação | PENDENTE |
| **F6** | Emenda ao Contrato §2.1 | (a) e (c) exigem; (b) e (d) não | conforme F1 | PENDENTE (dependente de F1) |
| **F7** | G7 (purge do job) entra? | sim (verificar filtro de KPI) / não (fora) | **não** nesta leva; registrar em "achados fora de escopo" até verificar o filtro | PENDENTE |
| **F8** | Onde mora o helper de efeito pós-escrita (item 4) | (x) `features/dynamicTables/...` — **proibido** (é o motor); (y) `features/integration/...` nova pasta; (z) dentro de `features/analytics/services/` ou `features/chat/services/` | **(y)** — nova pasta de integração não pertence a nenhum consumidor; (z) faz um consumidor conhecer o outro | PENDENTE |

---

## 5. Teste-guarda proposto

### T1 — gate estático (B7)
Regra em `server/.dependency-cruiser.cjs`, junto de B1:

```js
{
  name: 'B7-dynamictable-no-consumer-services',
  severity: 'error',
  comment: 'Motor DynamicTable não chama consumidor (Contrato §2.1, "o motor nunca chama o consumidor").',
  from: { path: '^src/features/dynamicTables/', pathNot: TEST },
  to: { path: '^src/features/(chat|analytics)/services/' },
},
```

Prova de que morde: sonda de 19/10 (§1.5) → exatamente 2 violações na base atual. **Ordem (F5 = β):** a regra entra vermelha numa sessão de instrumentação; a sessão de correção a deixa verde removendo as duas linhas. Não cresce baseline.

Limite conhecido (CBM-001 / guarda de recall): o gate vê **import**, não **chamada**. Um consumidor passado por parâmetro (ex.: `(this as any).kg`) passa. Por isso T2 existe.

### T2 — comportamental (cobertura de efeito)
Um teste por caminho de escrita, afirmando efeito observável (`syncGraph` chamado com o `userId` certo; `kpiCacheService.get` devolve `null` após a escrita). Caminhos a enumerar: `createTableData`, `updateTableData`, `deleteTableData`, `deleteTableDataBatch`, `createTableAsSystem`, `updateTableAsSystem`, `updateTableSchemaAsSystem`, `deleteTableAsSystem`, `installPresetAsSystem`, `deleteAllTablesForUser`, `PresetSyncService.installTableFromPreset` (G3), e os chamadores com `{ tx }` (G4: afirmar que a invalidação ocorre **depois** do commit externo — em teste com a tx do CRM, o KPI concorrente não pode cachear o estado pré-commit).

Vermelhos esperados **antes** do fix: G1, G2 (KPI), G3, G4. Verdes: os caminhos já cobertos hoje. Isso prova a classe de bug e não só o sintoma (ver memória `idempotency-class-fix-discipline`: enumerar todo write-path).

---

## 6. Pendências de validação externa

Nenhuma. Não há regra contábil, fiscal ou legal neste item.

## 7. Insumos ausentes

- **Autorização do dono** para o nó (campo `autorizacao`). Sem ela o nó não roteia. Pedido ao dono: escolher F1–F8 e autorizar **um** escopo.
- **Estado do PR #769** — OPEN, não mergeado (`gh pr view 769`, 19/10). A base da execução depende do merge ou de rebase sobre a branch.
- **Verificação de filtro soft-delete no KPI** (F7) — não feita; fora do escopo deste planejamento.
- **Inventário dos testes** de §1.4 — feito só por nome; o efeito em cada um fica para a sessão de feature.

## 8. Achados fora de escopo

- `server/src/jobs/PurgeDeletedRecords.ts:34` faz `deleteMany` direto no Prisma em `dynamicTableData`, sem passar pelo motor (G7). Frente própria se o filtro do KPI ler soft-deleted.
- Erros de `syncGraph` engolidos em todo o código do chat (G5) — o problema é o padrão, não só este motor.

---

*Gerado por `sessao-planejamento` em 2026-10-19. Nenhum fork ratificado; nenhum código de aplicação escrito.*
