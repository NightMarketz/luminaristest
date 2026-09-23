# RETORNO — C8 PR-5 (Entrada por NF-e modo 4 + nota mista + rascunho + re-drive)

tarefa: implementar BE-INCR-FIXED-ASSETS PR-5 (Bloco E, execution-plan Passos 26-29 + A7; BRIEF itens
  20-22 + §5) — modo 4 NF-e (CFOP 1551/2551 → imobilizado), nota mista, rascunho de FixedAsset, re-drive
  no reconcile. Autorização citável: "Executa C8" (dono, 18/09, corpo do PR #354); F-FA12 → (a) ratificado.
  **Sessão em 2 rodadas:** a 1ª entregou os Passos 26/27 e parou no fork "taxa do rascunho" (registrado);
  o coordenador trouxe a decisão do dono (23/09) para os 2 forks abertos — esta rodada completa o Passo 28
  e os adversariais do Passo 29 sob essa decisão.
agente: sessão de execução direta (sem sub-agente `sessao-feature` dedicado — trabalhei pelo formulário:
  li BRIEF+ADR+execution-plan antes de codar, 1 comportamento por vez, gate por gate), worktree própria
  `agent-ab644b678c007f6c8`, branch `claude/c8-pr5-nfe-modo4`.
veredicto: PASSOU

## Decisão do dono (23/09) e como foi implementada

1. **Taxa do rascunho:** derivada do NCM do item pelo Anexo III. `FixedAssetService.resolveRateForNcm`
   busca, entre as `DepreciationRate` VIVAS do escopo (`findManyByUnit(scope, includeHidden=false)`), a
   de prefixo NCM MAIS ESPECÍFICO (mais dígitos) que bate com o NCM do item (ambos normalizados sem
   pontuação); casamento → snapshot `rateId` + `annualRateBp` (nunca referência viva); sem NCM no item,
   ou nenhuma correspondência → `ValidationError` nomeada (nunca `annualRateBp=0`). Testado: NCM `8452.10`
   casa com a linha `8452` (capítulo, 4 dígitos); com as duas linhas presentes (`8452` e `8452.10`), a
   subposição de 6 dígitos vence a de 4; NCM ausente → 400; NCM sem nenhuma linha → 400.
2. **Coluna `Payable.fixedAssetItems` REMOVIDA** (e sua migração `20260923163236_...` apagada, nunca
   chegou a `main`). O breakdown do modo 4 agora viaja no `SourceDocument.rawJson` da recognition —
   campo JÁ EXISTENTE (`PostEntryInput.sourceDocument.rawJson`, usado por outros módulos como
   `FiscalDocumentLifecycleService`), reuso puro, nenhuma coluna nova no `Payable`. `FixedAsset` ganhou
   `sourceItemRef` (migração PRÓPRIA aditiva `20260923200000_add_fixed_asset_source_item_ref`) +
   `@@unique([payableId, sourceItemRef])`. O re-drive (`PayableService.redriveMissingDrafts`) relê esse
   `rawJson` via `PostingService.findEntryBySource` → `ISourceProvenanceRepository.findSourcesByEntry`
   (o `sourceDocumentId` da entry) — nunca uma 2ª cópia do breakdown na linha do Payable.

## O que foi implementado nesta rodada (Passo 28 + adversariais do Passo 29)

1. **`FixedAssetService.createDraftFromPayable(scope, payable, items, sourceDocumentId?)`** — read-first
   por `(payableId, sourceItemRef=cProd)` via `IFixedAssetRepository.findByPayableAndSourceItemRef` (novo
   método); item já rascunhado é PULADO (idempotente); os demais nascem `PENDING_ACTIVATION` com
   `quantity`/`costCents` do item, `acquiredAt = payable.issueDate`, taxa derivada do NCM (decisão 1),
   `code` determinístico (`NFE-<documentNumber>-<cProd>`).
2. **`IFixedAssetDraftCreator` / `IFixedAssetDraftRedriver`** (novo arquivo
   `services/IFixedAssetDraftCreator.ts`) — 2 interfaces pequenas, **setter-injected** (não
   construtor): `PayableService.setFixedAssetDraftCreator(fixedAssetService)` e
   `DepreciationService.setFixedAssetDraftRedriver(payableService)`. Necessário porque
   `PayableService → FixedAssetService → DepreciationService → [[redriver]] → PayableService` fecharia
   um ciclo de CONSTRUTOR — quebrado com 2 setters chamados no factory DEPOIS que os 3 já existem
   (nenhuma reordenação do factory foi necessária).
3. **`PayableService.createPayable`** — após a recognition (que agora carrega o `rawJson`), chama
   `fixedAssetDraftCreator.createDraftFromPayable` best-effort (log + segue, mesma disciplina do
   `receiveStock`); resolve o `sourceDocumentId` real da entry recém-postada
   (`findRecognitionSourceDocumentId`) para gravar no rascunho.
4. **`PayableService.redriveMissingDrafts`** (implementa `IFixedAssetDraftRedriver`) — para cada payable
   ativo `inventoryMultiItem=true`: acha a recognition, relê o `SourceDocument.rawJson` vinculado, e
   chama `createDraftFromPayable` de novo com o MESMO breakdown (idempotente por `sourceItemRef`).
5. **`DepreciationService.reconcile`** — `draftsCreated` agora vem de
   `this.fixedAssetDraftRedriver?.redriveMissingDrafts(scope) ?? 0` (era hardcoded `0` desde o PR-3).
6. **Adversariais do Passo 29** (testados em `PayableService.test.ts`):
   - "re-upload da mesma chave → 409 e 0 rascunhos NOVOS": 2ª `createPayable` com a mesma
     supplierName+documentNumber recebe P2002/`ValidationError` ANTES de qualquer efeito de imobilizado
     — `fixedAssetDraftCreator.createDraftFromPayable` permanece chamado 1× (só da 1ª importação).
   - "crash entre payable e rascunho → reconcile cria 1×": `createDraftFromPayable` falha na chamada
     síncrona (crash simulado); `createPayable` ainda resolve; `redriveMissingDrafts` relê o MESMO
     `rawJson` que a recognition realmente persistiu (não um valor inventado pelo teste) e completa o
     rascunho — provado que o 2º `createDraftFromPayable` recebe EXATAMENTE o mesmo breakdown.

## Residual NAMED (documentado, não escondido)

`buildRecognitionInputFromRow` (re-drive da RECOGNITION em si, para a janela de crash ENTRE o tx1 do
`Payable` e o `postEntry` — antes de o `SourceDocument` existir) não tem de onde reconstruir o split por
classe (o breakdown só existe no `rawJson`, que só nasce COM a recognition). Nessa janela estreita, um
payable modo 4 re-driven por essa via específica postaria o débito inteiro numa conta só, em vez de
dividir por classe — mesmo tratamento já aceito no código para o breakdown multi-item de ESTOQUE (ver
comentário em `reconcilePayables`, "the residual is named, not hidden"). Comentário extenso no código no
próprio `buildRecognitionInputFromRow`.

## Arquivos (delta desta rodada sobre o commit anterior)

- `server/prisma/schema.prisma` (EDIT — remove `Payable.fixedAssetItems`; adiciona `FixedAsset.sourceItemRef` + `@@unique([payableId, sourceItemRef])`)
- `server/prisma/migrations/20260923163236_add_payable_fixed_asset_items/` (REMOVIDO — nunca chegou a main)
- `server/prisma/migrations/20260923200000_add_fixed_asset_source_item_ref/migration.sql` (NEW)
- `server/src/features/accounting/repositories/IFixedAssetRepository.ts` (EDIT — `findByPayableAndSourceItemRef`, `payableId`/`sourceDocumentId`/`sourceItemRef` em `CreateFixedAssetData`)
- `server/src/features/accounting/repositories/FixedAssetRepository.ts` (EDIT — implementação do método novo)
- `server/src/features/accounting/repositories/IPayableRepository.ts` (EDIT — remove `fixedAssetItems` de `CreatePayableData`)
- `server/src/features/accounting/services/IFixedAssetDraftCreator.ts` (NEW — 2 interfaces + `ResolvedFixedAssetItem`)
- `server/src/features/accounting/services/FixedAssetService.ts` (EDIT — `createDraftFromPayable`, `resolveRateForNcm`, `draftCode`)
- `server/src/features/accounting/services/DepreciationService.ts` (EDIT — setter `setFixedAssetDraftRedriver`, `reconcile` usa o gancho real)
- `server/src/features/accounting/services/PayableService.ts` (EDIT — remove persistência JSON; `rawJson` no `sourceDocument`; setter `setFixedAssetDraftCreator`; `redriveMissingDrafts`; chamada best-effort ao draft creator)
- `server/src/lib/factory.ts` (EDIT — `sourceProvenance` injetado no `PayableService`; 2 linhas de setter wiring)
- `server/src/features/accounting/services/__tests__/FixedAssetService.test.ts` (EDIT — 10 casos novos: NCM matching, read-first, adversariais)
- `server/src/features/accounting/services/__tests__/DepreciationService.test.ts` (EDIT — 2 casos: gancho ausente/wired)
- `server/src/features/accounting/services/__tests__/PayableService.test.ts` (EDIT — remove teste de persistência JSON; +7 casos: rawJson, draftCreator best-effort, redriveMissingDrafts, os 2 adversariais do Passo 29)

## PROVA

```yaml
PROVA:
  - command: "cd server && npx tsc --noEmit"
    exit_code: 0
    log: .claude/retornos/_logs/c8-fork-tsc-1.log
    sha256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
  - command: "cd server && npx jest src/features/accounting/services/__tests__/FixedAssetService.test.ts --runInBand"
    exit_code: 0
    log: .claude/retornos/_logs/c8-fork-fixedassetservice-1.log
    sha256: cf3f7d63ec368a18ae3cfc60f9167f56ce83cb858dfd603f9260aa32b2f874a0
    result: "33/33 passed (10 novos: NCM matching mais específico, sem NCM, sem correspondência, classe inexistente, read-first idempotente, nota mista parcial, sourceDocumentId, code determinístico)"
  - command: "cd server && npx jest src/features/accounting/services/__tests__/DepreciationService.test.ts --runInBand"
    exit_code: 0
    log: .claude/retornos/_logs/c8-fork-depreciationservice-1.log
    sha256: 79aaf1216abc7d34463608c84b4d65893688c0957e0558ed69c0bb95c820c6cc
    result: "24/24 passed (2 novos: draftsCreated=0 sem wiring, draftsCreated reflete o redriver)"
  - command: "cd server && npx jest src/features/accounting/services/__tests__/PayableService.test.ts --runInBand"
    exit_code: 0
    log: .claude/retornos/_logs/c8-fork-payableservice-1.log
    sha256: c650a85cf682af9e4debe81043ebf13b275754f84eca50ac29fbc4f55a44ea1e
    result: "91/91 passed (rawJson em vez de coluna, draftCreator best-effort, redriveMissingDrafts × 4 casos, os 2 adversariais do Passo 29)"
  - command: "cd server && npx jest src/features/accounting/services/__tests__/NfeImportService.test.ts src/features/accounting/dtos/__tests__/PayableDto.test.ts src/features/accounting/dtos/__tests__/NfeDto.test.ts --runInBand"
    exit_code: 0
    log: .claude/retornos/_logs/c8-fork-nfeimport-dto-1.log
    sha256: 6f9c0c6e56778dccd5953fbba693b601f59048641c64214998373151a8ab3d0f
    result: "61/61 passed — sem regressão do Passo 26/27 desta rodada"
  - command: "cd server && npx jest --selectProjects unit dtoShapeSnapshot"
    exit_code: 0
    log: .claude/retornos/_logs/c8-fork-dtosnapshot-1.log
    sha256: a2799115bc64987ab1d015ef2b555147be50de703ae7e2ea1108bdc45833766e
    result: "224 suites / 3008 tests passed — snapshot inalterado nesta rodada (nenhum DTO mudou de forma)"
  - command: "cd server && npm run docs:generate"
    exit_code: 0
    log: .claude/retornos/_logs/c8-fork-docsgen-1.log
    sha256: ea2565be68c6d3fcd044b289855dc831b075b69764d074f4e2b90b052f1d790a
    result: "210 paths — BASELINE inalterado (confirma Passo 29: nenhuma rota nova nesta PR)"
  - command: "cd server && npm run smoke:migration"
    exit_code: 0
    log: .claude/retornos/_logs/c8-fork-smokemigration-1.log
    sha256: 9ec61f04e99c7c1f5b68c2a74be493f168d9b91d3923b9a37b40893037c6e710
    result: "1 migração aplicada na CÓPIA do dev.db real sem perda; original intocado (S1); S6 vacuoso (journal_entries=0 no dev.db real, declarado)"
  - command: "cd server && npx jest --selectProjects integration --runInBand --forceExit src/controllers/__tests__/nfeController.purchase.regime.integration.test.ts src/controllers/__tests__/fixedAssetController.integration.test.ts src/controllers/__tests__/depreciationRateController.integration.test.ts src/controllers/__tests__/payableController.settlements.integration.test.ts"
    exit_code: 0
    log: .claude/retornos/_logs/c8-fork-integration-1.log
    sha256: dbe1945695f8cbd2884281b9f919cdf27eebe82cdd25c575068979beba287832
    result: "4 suites / 37 tests passed contra SQLite real, aplicando a migração nova — só as suítes AFETADAS por este diff (EBUSY: rodei isolado como pedido; o run completo (`npm run test:integration`) não foi tentado nesta rodada por já ter EBUSY documentado na rodada anterior sob concorrência de outros agentes — a CI Linux decide, por instrução do coordenador)."
VEREDITO: PASS
```

## Gates de envio OPS-001

1. **Objetivo:** completar o modo 4 de entrada de imobilizado por NF-e (rascunho + re-drive) sob as
   2 decisões do dono, sem reabrir os forks que ele já fechou.
2. **Grau por claim:** tudo acima é **verificado** (comandos reexecutados, exit 0, incluindo 4 suítes de
   integração reais contra SQLite com a migração nova aplicada). `npm run test:integration` completo
   (todas as ~224 suítes de integração) **não foi tentado** nesta rodada — declarado, não escondido.
3. **Caso adversarial tentado:** os 2 do Passo 29 (re-upload → 409/0 rascunhos; crash → reconcile 1×) +
   os de matching de NCM (mais específico vence, ausência, sem correspondência) + read-first em nota
   mista parcial (1 de 2 itens já rascunhado).
4. **Checagem que teria falhado se eu estivesse errado:** sim — ex. o teste de "prefixo mais específico"
   falha se `resolveRateForNcm` não comparar `prefixDigits.length`; o teste de crash→redrive falha se
   `redriveMissingDrafts` recomputasse os itens em vez de reler o `rawJson` real (o teste compara
   `secondCallItems` contra o JSON efetivamente persistido, não um fixture do teste).
5. **Duas primeiras linhas entregam verdade + risco:** `veredicto: PASS`; risco residual nomeado acima
   (janela de crash PRÉ-recognition não reconstrói o split de imobilizado — estreita, documentada, mesmo
   padrão já aceito para o breakdown de estoque).

## Aberto

- `npm run test:integration` completo (todas as suítes) não foi executado nesta rodada — só as 4
  afetadas por este diff, por instrução explícita do coordenador ("rode só as suítes afetadas... a CI
  Linux decide"). Recomendo a CI confirmar o resto.
- Residual named (crash pré-recognition não reconstrói split de imobilizado) — ver seção acima; não é
  fork, é limite técnico já com precedente aceito no código.
- Nenhum outro fork aberto nesta PR.
