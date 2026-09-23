# RETORNO — C8 PR-5 (Entrada por NF-e modo 4 + nota mista + rascunho + re-drive)

tarefa: implementar BE-INCR-FIXED-ASSETS PR-5 (Bloco E, execution-plan Passos 26-29 + A7; BRIEF itens
  20-22 + §5) — modo 4 NF-e (CFOP 1551/2551 → imobilizado), nota mista, rascunho de FixedAsset, re-drive
  no reconcile. Autorização citável: "Executa C8" (dono, 18/09, corpo do PR #354); F-FA12 → (a) ratificado.
  **3ª rodada:** review independente do PR #366 (o PR já existe — sem PR novo) achou FAIL em 3 pontos;
  esta rodada corrige os 3 na MESMA branch.
agente: sessão de execução direta (sem sub-agente `sessao-feature` dedicado — trabalhei pelo formulário:
  li o achado do review linha a linha antes de codar, 1 correção por vez, gate por gate), worktree
  própria `agent-ab644b678c007f6c8`, branch `claude/c8-pr5-nfe-modo4`.
veredicto: PASSOU

## Os 3 achados do review #366 e a correção

**1. A regra "NCM sem match → 400" era engolida** — `createDraftFromPayable` rodava DEPOIS do
`postEntry`, e o catch virava `logger.warn` best-effort: a nota subia com `201`, o débito no
imobilizado ia pro razão, e o `FixedAsset` nunca nascia (reconcile falharia pra sempre pelo mesmo
motivo, sem sinal nenhum pro operador). **Correção:** a taxa (`resolveRateForNcm`) agora é resolvida
dentro de `PayableService.resolveFixedAssetLines` — que já rodava ANTES do `tx1` do `Payable` (não
precisou mover nada, só ACRESCENTAR a validação no lugar certo que já existia). `ResolvedFixedAssetItem`
ganhou `rateId`/`annualRateBp` PRÉ-RESOLVIDOS; `createDraftFromPayable` não re-deriva a taxa NUNCA MAIS
(removi a cópia duplicada da lógica que vivia em `FixedAssetService`). Um NCM sem match agora rejeita
ANTES de `payableRepo.create`, ANTES de `postEntry` — 0 `Payable`, 0 `JournalEntry`.

**2. Prefixo ambíguo (2+ taxas distintas sob o mesmo prefixo NCM)** — o desempate antigo pegava a
PRIMEIRA batida na ordem de iteração do array (= ordem do seed), uma escolha silenciosa. `NCM '8417'`
tem 2 linhas REAIS no fixture do Anexo III com taxas distintas (fornos industriais 10% × fornos p/
vidro, Nota 1, 33,3%); `'3926.90'` também (correias 20% × artigos de laboratório 10%). **Correção:**
`resolveRateForNcm` (extraída para função PURA em `models/FixedAsset.model.ts`, testável sem qualquer
dublê de repositório) agora coleta TODOS os candidatos de maior prefixo e, se houver `annualRateBp`
DISTINTOS entre eles, rejeita com 400 nomeando os ids/taxas em conflito — nunca escolhe pela ordem.

**3. `cProd` repetido em 2 itens 1551 perdia custo** — o `sourceItemRef` do rascunho era o `cProd`; uma
nota com 2 linhas de imobilizado do MESMO `cProd` (2 máquinas do mesmo item de catálogo do fornecedor)
faria a 2ª linha ler o rascunho da 1ª via `findByPayableAndSourceItemRef` como "já existe" e pular,
perdendo o custo da 2ª. **Correção:** `sourceItemRef` agora é o `nItem` da NF-e (posição da linha,
sempre único dentro de uma nota) — `NfeImportService.allocate` carrega `nItem` em cada
`fixedAssetItem`; `PayableService.resolveFixedAssetLines` grava `sourceItemRef = String(item.nItem ??
índice-no-array)` (fallback só para criação manual sem NF-e). `cProd` continua no shape só para
mensagens/descrição — nunca mais é chave de nada.

## Arquivos (delta desta rodada sobre `16b274c3`)

- `server/src/features/accounting/models/FixedAsset.model.ts` (EDIT — `resolveRateForNcm` extraída como função PURA + ambiguidade)
- `server/src/features/accounting/models/__tests__/FixedAsset.model.test.ts` (EDIT — 8 casos novos, incluindo os dados REAIS 8417/3926.90 do fixture)
- `server/src/features/accounting/services/IFixedAssetDraftCreator.ts` (EDIT — `ResolvedFixedAssetItem` ganha `sourceItemRef`/`rateId`/`annualRateBp`)
- `server/src/features/accounting/services/PayableService.ts` (EDIT — `resolveFixedAssetLines` valida NCM/ambiguidade ANTES do tx1; deriva `sourceItemRef` do `nItem`; novo dep `depreciationRateRepo`)
- `server/src/features/accounting/services/FixedAssetService.ts` (EDIT — `createDraftFromPayable` usa `item.rateId`/`item.annualRateBp`/`item.sourceItemRef` diretos, sem re-derivar; removida a cópia de `resolveRateForNcm` que vivia aqui)
- `server/src/features/accounting/services/NfeImportService.ts` (EDIT — `allocate` carrega `nItem` em cada `fixedAssetItem`)
- `server/src/features/accounting/dtos/PayableDto.ts` (EDIT — `fixedAssetItem.nItem` opcional)
- `server/src/lib/factory.ts` (EDIT — `depreciationRate` repo injetado no `PayableService`)
- `server/src/features/accounting/services/__tests__/FixedAssetService.test.ts` (EDIT — testes reescritos para o item pré-resolvido + adversarial de `cProd` repetido)
- `server/src/features/accounting/services/__tests__/PayableService.test.ts` (EDIT — +2 adversariais do review: NCM 9999.99 e NCM 8417 ambíguo, ambos ANTES de qualquer efeito)
- `server/src/features/accounting/services/__tests__/NfeImportService.test.ts` (EDIT — adversarial de `cProd` repetido com `nItem` distinto)
- `server/src/features/accounting/dtos/__tests__/__dto-shapes__.json` (EDIT — snapshot regenerado, `nItem`)

## PROVA

```yaml
PROVA:
  - command: "cd server && npx tsc --noEmit"
    exit_code: 0
    log: .claude/retornos/_logs/c8-r366-tsc-1.log
    sha256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
  - command: "cd server && npx jest src/features/accounting/models/__tests__/FixedAsset.model.test.ts --runInBand"
    exit_code: 0
    log: .claude/retornos/_logs/c8-r366-model-1.log
    sha256: 5b9686c09fcdfbcde38281af7d33303dcb4ab6040c0d8a60adb5797c40ea184e
    result: "13/13 passed — resolveRateForNcm como função pura: especificidade de prefixo, sem NCM, sem match, ambiguidade 8417 e 3926.90 (dados reais do fixture, nas 2 ordens), duplicata não-ambígua, taxa CUSTOM ignorada"
  - command: "cd server && npx jest src/features/accounting/services/__tests__/FixedAssetService.test.ts --runInBand"
    exit_code: 0
    log: .claude/retornos/_logs/c8-r366-fixedassetservice-1.log
    sha256: 70d901234ede7110c0e2038212b7770463f7c22a0e972799215d13c286d9c41f
    result: "31/31 passed — createDraftFromPayable usa rateId/annualRateBp pré-resolvidos (findManyByUnit NUNCA chamado); 2 itens de mesmo cProd/sourceItemRef distinto → 2 rascunhos, custos [50000n,35000n] preservados"
  - command: "cd server && npx jest src/features/accounting/services/__tests__/PayableService.test.ts --runInBand"
    exit_code: 0
    log: .claude/retornos/_logs/c8-r366-payableservice-1.log
    sha256: b93ecc3f253be95584ebc9fd37e91d700aa9fccb3fa4363476caca1c226c3e64
    result: "93/93 passed — achado 1 (NCM 9999.99 → 400, 0 payables/entries/drafts) e achado 2 (NCM 8417 ambíguo → 400, 0 payables/entries) provados aqui"
  - command: "cd server && npx jest src/features/accounting/services/__tests__/NfeImportService.test.ts src/features/accounting/dtos/__tests__/PayableDto.test.ts src/features/accounting/dtos/__tests__/NfeDto.test.ts --runInBand"
    exit_code: 0
    log: .claude/retornos/_logs/c8-r366-nfeimport-dto-1.log
    sha256: 405006ce4cc43f367a2228bd8fc63784da2522f504ca4ea306eb68e39101c8e0
    result: "62/62 passed — achado 3 (2 itens 1551 mesmo cProd, nItem 1/2, custos [50000,35000] Σ=85000) provado em NfeImportService.test.ts"
  - command: "cd server && npx jest src/features/accounting/services/__tests__/DepreciationService.test.ts --runInBand"
    exit_code: 0
    log: .claude/retornos/_logs/c8-r366-depreciationservice-1.log
    sha256: 6ef9fe8c6fd9945e3c5206158d308ed7f5a49e236519d9c544c4503150836dfa
    result: "24/24 passed — sem regressão do gancho draftsCreated"
  - command: "cd server && npx jest --selectProjects unit dtoShapeSnapshot"
    exit_code: 0
    log: .claude/retornos/_logs/c8-r366-dtosnapshot-1.log
    sha256: 7ce1b4bcb14398f16b30643f077daff9095f7de9537ef81db5dfd1d5d248fe93
    result: "224 suites / 3017 tests passed — snapshot atualizado de propósito (fixedAssetItem.nItem)"
  - command: "cd server && npm run docs:generate"
    exit_code: 0
    log: .claude/retornos/_logs/c8-r366-docsgen-1.log
    sha256: ea2565be68c6d3fcd044b289855dc831b075b69764d074f4e2b90b052f1d790a
    result: "210 paths — BASELINE inalterado (só shape de body, nenhuma rota nova)"
  - command: "cd server && npm run smoke:migration"
    exit_code: 0
    log: .claude/retornos/_logs/c8-r366-smokemigration-1.log
    sha256: 6ffd345a5cc198b9321aedf09d5ea19587fe1c66218698e256126f1e3c4cd4da
    result: "migração aplicada na CÓPIA do dev.db real sem perda; original intocado (S1) — nenhuma migração nova nesta rodada de review, só código"
  - command: "cd server && npx jest --selectProjects integration --runInBand --forceExit src/controllers/__tests__/nfeController.purchase.regime.integration.test.ts src/controllers/__tests__/fixedAssetController.integration.test.ts src/controllers/__tests__/depreciationRateController.integration.test.ts src/controllers/__tests__/payableController.settlements.integration.test.ts"
    exit_code: 0
    log: .claude/retornos/_logs/c8-r366-integration-1.log
    sha256: 46d3fb94b3b6542a4eed3ebd0701420f94362e7aa6c0056c9a06121a40c40edf
    result: "4 suites / 37 tests passed contra SQLite real — só as suítes AFETADAS, por instrução do coordenador ('rode só as suítes afetadas... a CI Linux decide')"
VEREDITO: PASS
```

## Gates de envio OPS-001

1. **Objetivo:** fechar os 3 achados do review #366 sem reabrir escopo — nenhuma correção além das 3.
2. **Grau por claim:** verificado (comandos reexecutados, exit 0). `npm run test:integration` completo
   não foi tentado nesta rodada (mesma instrução do coordenador da rodada anterior).
3. **Caso adversarial tentado:** os 3 exatos do review — NCM 9999.99 (0 efeitos), NCM 8417 ambíguo
   (0 efeitos, nas 2 ordens de array para provar que não depende do seed), 2 itens mesmo cProd/nItem
   distinto (2 rascunhos, custos corretos, testado em 3 camadas: função pura, FixedAssetService,
   NfeImportService).
4. **Checagem que teria falhado se eu estivesse errado:** sim — o teste "findManyByUnit NUNCA chamado"
   em `FixedAssetService.test.ts` falha se eu tivesse deixado a re-derivação de taxa lá; o teste de
   ambiguidade nas 2 ordens falha se o desempate ainda dependesse de posição no array.
5. **Duas primeiras linhas entregam verdade + risco:** `veredicto: PASS`; risco residual é o mesmo já
   nomeado (crash pré-recognition não reconstrói split de imobilizado) — nenhum risco novo introduzido.

## Residual (herdado, sem mudança)

Mesmo residual named da rodada anterior: a janela de crash ENTRE o tx1 do `Payable` e o `postEntry`
(antes de o `SourceDocument` existir) não tem de onde reconstruir o split por classe — comentário em
`buildRecognitionInputFromRow`. Não afetado por esta correção (a correção do achado 1 é sobre a
VALIDAÇÃO da taxa, que já roda antes do tx1; este residual é sobre RE-DRIVE de uma recognition
ausente, cenário distinto).

## Aberto

- `npm run test:integration` completo não executado nesta rodada (mesma instrução: só as suítes afetadas).
- Nenhum fork novo.
