# ADR-DOMAIN-MOTOR — Motor de domínio (MutationEngine + OrchestrationEngine): REJEITADO

- **Data:** 2026-09-21
- **Status:** **Rejected 2026-09-21 (dono, via sessão)** — reabrir só por gatilho do §3, com ADR novo. Primeiro ADR com este status no repo.
- **Autores:** sessão interativa dono + orquestrador (leitura direta do código, 2026-09-21; forks de encaixe fechados por questionário em 2026-09-22).
- **Classe:** DECISÃO ARQUITETURAL (rejeição — teto de atomicidade)
- **Depende de:** `ADR-RC-SUBLEDGER-AP-AR-reuse-sanction.md` (gatilho (b) — extração só por bug de classe); `ADR-INCR-FIXED-ASSETS.md` §1 (`postEntry` abre tx raiz própria); memória `postentry-tx-raiz-subrazao-2-commits`.
- **Nó do master map:** §4 (decisões rejeitadas), linha "Motor de Domínio".
- **Vencedor:** Contrato `_ARCHITECTURE-CONTRACT.md` §2.3 (`[AC-2.3-1..3]`) + cabeçalho `atomicUntil` cobrado por `SVC-008` (gerador) e `REV-008` (revisor).

## TLDR (2 linhas)

Um motor genérico (ciclo de vida por fases + workflow em DAG + registry de plugins + AuditLog central + fila) foi proposto para coordenar operações que atravessam módulos. Rejeitado: o padrão da casa (2 commits + reconcile, gate dentro de cada tx) já cobre o que o motor prometia, o código central da proposta não sustentava a garantia ACID, e o custo de longo prazo (dois regimes de execução, Redis, PII no log) supera o ganho. Vale uma convenção declarada no arquivo e provada por teste; a primitiva `commitThenReconcile` só nasce de incidente.

## 1. Evidência de código (CBM-001 — grau por linha)

| Falha alegada pela proposta | O que o repositório diz | Grau |
|---|---|---|
| TOCTOU no gate de política ("checado fora da transação") | O gate autoritativo roda **dentro** de `runTransaction` em 7 pontos do `PostingService` (`:323`, `:586`, `:754`, `:816`, `:890`, `:957`, doc `:727`); classe `authoritative-gate-inside-tx` com teste-guarda; `server/CLAUDE.md` gate 5 | verificado |
| Efeito antes do gate (PR #334) | Bug real, pego pelo revisor independente e corrigido no mesmo PR; virou a classe `efeito-irreversivel-antes-do-gate-autoritativo`, cobrada em todo review (`AccountingReviewService.ts:282-285`, `BankSettlementService.ts:70-71`) | verificado |
| Choke points serializam PRs ("C8 não roda em paralelo com C11/C12") | Os 4 arquivos compartilhados existem (`routes/index.ts`, `factory.ts`, `auditCanonical.ts`, `docs.paths.ts`). Mas `CADEIA-A.md` §3 já autoriza C12 em paralelo ao C8 PR-1..3 (write-sets disjuntos), e os 5 PRs do C8 vieram do fatiamento PAR-003 para o review caber. A proposta mantém rotas e factory intactos — o ganho ali é pequeno | verificado (parcialmente verdadeira) |
| Sem fronteira de atomicidade ("2 tx + reconcile copiado à mão") | Verdadeiro: 18 serviços repetem o padrão em prosa livre (`grep -lE "reconcile" services/*.ts`); 8 chamam `.postEntry(` e escrevem subrazão sem forma declarada. A fronteira em si é decisão ratificada, não descuido: `postEntry` abre tx raiz própria e não aceita `tx` (`PostingService.ts:286/:323`; ADR-INCR-FIXED-ASSETS §1; precedentes AP `PayableService.ts:50-54`, estoque `InventoryService.ts:67-71`, C11 `AccountingReviewService.ts:76-80`, C8 `DepreciationService.ts:44-50`) | verificado — dívida real, resposta proporcional é declaração + função |
| Auditoria manual por evento ("evento esquecido por PR") | A allowlist do `auditCanonical.ts` existe para que dado pessoal **nunca** chegue ao log (`:9` "everything else (tokens, PII, request body) is dropped"; guardas #255/#258). O `AuditLog` proposto grava `inputData Json` de toda fase — elimina a barreira de PII, não o evento esquecido | verificado — inverte uma guarda |

Defeitos do pseudo-código da proposta (lidos na spec, não no repo):
- `tx ??= await prisma.$transaction(t => Promise.resolve(t))` devolve o handle **depois** que o callback resolve, com a transação já fechada; todo step "sync" seguinte roda sem transação. A tabela `atomicUntil` da proposta prometia ACID nesse trecho.
- `MutationEngine.mutate` faz `return await prisma.$transaction(...)` na primeira fase `transaction`; as fases `async` (`afterCreate`) nunca executam.

Infra e nomes: `server/package.json` não tem `bull`/`bullmq`/`ioredis` (fila = Redis novo); `ARService`/`NfeService`/`NotificationService`/`SaleValidationService` não existem; `RulePlugin` já é o plugin do motor de DynamicTable (`dynamicTables/rules/RuleTypes.ts:17`), onde o CLAUDE.md proíbe serviço Prisma — um segundo `RulePlugin` em `lib/plugins` é colisão certa.

## 2. Vencedor

1. **Convenção `atomicUntil`** (`[AC-2.3-2]`): primeiro JSDoc de todo service que chama `.postEntry(` fora do `PostingService` (com ou sem subrazão — sem, escreve `commit 2 — nenhum`), com 5 linhas fixas (`atomicUntil:`, `commit 1 — razão`, `commit 2 — subrazão`, `reconcile —`, `fora da tx —`), cada uma citando o teste que a prova. Vocabulário do `[SEL-004]` (evento, bridge, idempotência, reconcile). Cobrada pelo gerador (`SVC-008`, `backend-service-generator`) e pelo revisor (`REV-008`, `luminaris-reviewer`); `sessao-feature` lista o gate na tabela "Gates que o diff aciona"; `server/CLAUDE.md` gate 6.
2. **2 commits + reconcile é o padrão** (`[AC-2.3-1]`): commit 1 = `postEntry` idempotente por `sourceType/sourceId`; commit 2 = CAS no subrazão em `runTransaction` próprio; convergência = read-first + `reconcile*()`. Proibido "mesma tx", compensação `try/catch`, gate fora da tx.
3. **Sem motor** (`[AC-2.3-3]`): a primitiva `commitThenReconcile(preflight, ledger, subledger, reconcile)` **só nasce do próximo incidente** da classe reconcile, extraída do serviço que quebrou e migrando só ele — extensão direta do gatilho (b) do ADR-RC (que já previa `postSubledgerSettlement()` na 3ª cópia CAS + bug de classe). Se (b) disparar primeiro, **essa função é a primitiva**; não criar duas.
4. **Retrofit** dos 8 chamadores atuais (`AccountingReviewService`, `BankSettlementService`, `DataExchangeImportService`, `DepreciationService`, `ExerciseClosingService`, `FixedAssetService`, `PayableService`, `ReceivableService`) + boundary test `atomicUntil.boundary.test.ts` = **PR-B**, só com "executa" do dono (GAP-MAP Nível 3 + fila 9; `PROXIMOS-PASSOS-2026-09-17.md` passo 13). Serviços que não chamam `postEntry` (`InventoryService`, `PhysicalStockSync` — a perna do razão é do mapper/bridge) ficam fora do gate mecânico; o cabeçalho neles é recomendado, não cobrado.

Por que a longo prazo, não só agora: o que varia entre verticais (salão × clínica, BRIEF P2: 11 comportamentos, 8 forks) é **mapeamento** de contas e binding, nunca **ordem de passos** — um workflow declarável por tenant é configurabilidade num eixo que precisa ficar fixo e testado. Migração "por incidente" para um engine deixa metade do sistema em cada regime indefinidamente. Agentes copiam o vizinho mais próximo: um helper legível vence um engine configurável que falha em silêncio. SQLite tem um único escritor: uma tx abrangendo 4 serviços segura o lock por mais tempo por venda — o padrão de 2 commits também existe por isso. O único assíncrono real (SEFAZ) já tem porta, estados e reprocesso (X10b, #348/#349/#350).

## 3. Gatilhos de reabertura (adversariais)

Reabrir esta decisão exige ADR novo citando **um** destes, com a evidência indicada:

- **(a) Ordem de passos diferente por vertical.** Um BRIEF de vertical cujo fork é sobre **sequência** (não sobre mapeamento de contas). Evidência: o fork, ratificado pelo dono, e o caso real como fixture.
- **(b) Segundo canal assíncrono por razão própria.** Fila adotada para outro fim (ex.: integração bancária por webhook) e já em produção. Evidência: o ADR dessa fila + o runbook M2 assinado com ela de pé.
- **(c) Mesmo bug de reconcile em 3 serviços depois de a primitiva existir.** Três entradas do GAP-MAP da mesma classe **após** `commitThenReconcile` nascer (ou `postSubledgerSettlement()` pelo ADR-RC (b)). Evidência: as 3 linhas do GAP-MAP + os 3 testes-guarda. Resposta proporcional primeiro: migrar os 18 para a primitiva em lote; só então discutir engine.
- **(d) Equipe humana > 3.** Mais de três pessoas escrevendo serviço contábil ao mesmo tempo, quando reforço estrutural passa a valer mais que review independente. Evidência: `git shortlog` do trimestre.

## 4. O que este ADR NÃO decide

- A régua (45/57) e o fold de #352–#356 (passo 9 do plano vigente).
- C8 PR-4/PR-5, GAP-MAP 7/8 (`unique` sem gate in-tx; `deleteTableData` × `immutableAfter`) — filas próprias.
- A primitiva: não tem BRIEF, não tem fila; nasce de incidente ou não nasce.
- Nada sobre o lado DynamicTable: a orquestração de transição de estado (`advanceStage`, `RegisterPaymentService`, `SalesCancellationService`) segue o molde `backend-workflow-transition-generator`; a ponte com o razão continua no controller (`crmController.ts:92-107`, Contrato §2.1).

## Referências

- `_ARCHITECTURE-CONTRACT.md` §2.3 (`[AC-2.3-1..3]`, template do cabeçalho) · `docs/operating-manual/GAP-MAP.md` Nível 3 + fila 9 · `docs/accounting/ACCOUNTING-MASTER-MAP.md` §4 · `docs/accounting/PROXIMOS-PASSOS-2026-09-17.md` fold 21/09, passos 10 e 13.
- Apresentação didática da decisão (artefato privado do dono, claude.ai, 2026-09-22) — não é fonte; a fonte é este ADR.
