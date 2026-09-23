# RETORNO — C8 PR-5 (Entrada por NF-e modo 4 + nota mista + rascunho + re-drive)

tarefa: implementar BE-INCR-FIXED-ASSETS PR-5 (Bloco E, execution-plan Passos 26-29 + A7; BRIEF itens
  20-22 + §5) — modo 4 NF-e (CFOP 1551/2551 → imobilizado), nota mista, rascunho de FixedAsset, re-drive
  no reconcile. Autorização citável: "Executa C8" (dono, 18/09, corpo do PR #354); F-FA12 → (a) ratificado.
agente: sessão de execução direta (sem sub-agente `sessao-feature` dedicado — trabalhei pelo formulário:
  li BRIEF+ADR+execution-plan antes de codar, 1 comportamento por vez, gate por gate), worktree própria
  `agent-ab644b678c007f6c8`, branch `claude/c8-pr5-nfe-modo4`.
veredicto: INCONSISTENTE

## Por quê BLOCKED, não PASS

Implementei e testei por completo os **Passos 26 e 27** (allocate CFOP 1551/2551 → fixedAssetItems;
PayableDto modo 4; PayableService debita `class.costAccountId`, nota mista = 2 débitos). **Não implementei
o Passo 28** (rascunho `FixedAssetService.createDraftFromPayable`) nem a parte do Passo 13/reconcile que
o re-drive de rascunhos exige — encontrei um **fork de spec não coberto**, achado durante a leitura do
schema, não decidido nem pelo BRIEF nem pelo ADR nem pelo execution-plan:

**FORK (não resolvido, registro para o dono):** `FixedAsset.annualRateBp` é `Int` **NOT NULL** no schema
(`prisma/schema.prisma:1616`) e `IFixedAssetRepository.CreateFixedAssetData.annualRateBp` é obrigatório.
`CreateFixedAssetSchema` (PR-2) exige `rateId` **XOR** `annualRateBp` (`min(1)`) em TODA criação manual —
não existe, em nenhum lugar do código hoje, um mecanismo de derivar uma taxa a partir do NCM/CFOP de um
item de NF-e (`ncmPrefix` no `FixedAsset` é só metadado informativo, nunca lido para escolher uma
`DepreciationRate`; confirmei com grep — nenhum uso). O BRIEF item 22 e o execution-plan Passo 28 listam
o que o rascunho carrega (`quantity`, `payableId`, `sourceDocumentId`, `acquiredAt`) e **silenciam** sobre
`annualRateBp`/`rateId` — um campo NOT NULL que toda taxa de depreciação depende (`DepreciationService`
usa `annualRateBp` para computar a quota mensal; um placeholder tipo `0` faria o ativo nunca depreciar,
em silêncio — exatamente a classe de bug `param-aceito-e-ignorado-e-bug` que o próprio ADR nomeia para o
CFOP lido-e-ignorado, agora do lado da taxa). Escolher um default sozinho seria inventar uma decisão de
negócio (ex.: "rascunho nasce com taxa 0 e o operador corrige na ativação" vs. "exige rateId manual antes
de ativar" vs. "busca por NCM, e sem taxa cadastrada bloqueia o rascunho") sem citação que a autorize —
exatamente o que a sessão pede para NÃO fazer ("Ambiguidade é lacuna de spec — registre e pause, nunca
escolha"). Não avancei o Passo 28 nem a coluna/migração `sourceItemRef` + `@@unique([payableId,
sourceItemRef])` que ele motiva (F-FA14 → b): sem o rascunho, a coluna não tem consumidor nesta PR.

Como consequência, os 3 casos adversariais do Passo 28/29 que dependem do rascunho **não foram
implementados nem testados**: "re-upload da mesma chave → 409 e 0 rascunhos", "crash entre payable e
rascunho → reconcile cria 1×", e a atualização do gancho `draftsCreated` em
`DepreciationService.reconcile` (hoje ainda `0`, comentário do PR-3 inalterado).

## O que FOI implementado e provado (Passos 26/27 + A7)

1. **`NfeImportService.allocate`** ganha a 3ª saída `fixedAssetItems[]`: item com CFOP `1551`/`2551`
   nunca entra no rateio de estoque; exige `classId` (não `productRef`) no mapeamento do operador; item
   fora dessas CFOPs exige `productRef` (não `classId`). Custo pela mesma fórmula D3 (`custo.itens`).
2. **`NfeDto.itemMapping`** — XOR `productRef` (estoque) / `classId` (imobilizado), `.strict()`.
3. **`PayableDto` modo 4** — `fixedAssetItems[]` combinável só com o modo 3 (`inventoryMultiItem`); nota
   100% CFOP 1551 tem `inventoryItems` ausente/vazio; tie-out `Σitens + ΣfixedAssetItems + Σrecuperáveis
   === amountCents`.
4. **`PayableService.createPayable`** — resolve `class.costAccountId` por item (`resolveFixedAssetLines`,
   novo dep opcional `IFixedAssetClassRepository`), gera N linhas de débito agrupadas por conta (nota
   mista = 2 débitos: 1.1.6 + 1.2.x), persiste o breakdown em `Payable.fixedAssetItems` (JSON, mesmo
   padrão de `recoverableTaxLines`) para o re-drive de RECOGNITION (não do rascunho, que não existe
   ainda) reconstruir o mesmo entry. **Nenhum `StockMovement`** para item de imobilizado.
5. **Migração aditiva** `20260923163236_add_payable_fixed_asset_items` — só `ALTER TABLE payables ADD
   COLUMN fixedAssetItems TEXT` (nullable, sem FK — sem rebuild). `sourceItemRef`/`FixedAsset` **NÃO**
   incluído (motivo: fork acima).

## Arquivos

- `server/prisma/schema.prisma` (EDIT — comentário + coluna `Payable.fixedAssetItems`)
- `server/prisma/migrations/20260923163236_add_payable_fixed_asset_items/migration.sql` (NEW)
- `server/src/features/accounting/dtos/NfeDto.ts` (EDIT — itemMapping XOR productRef/classId)
- `server/src/features/accounting/dtos/PayableDto.ts` (EDIT — fixedAssetItem, modo 4)
- `server/src/features/accounting/dtos/__tests__/NfeDto.test.ts` (EDIT — 4 casos XOR)
- `server/src/features/accounting/dtos/__tests__/PayableDto.test.ts` (EDIT — 6 casos modo 4)
- `server/src/features/accounting/dtos/__tests__/__dto-shapes__.json` (EDIT — snapshot regenerado)
- `server/src/features/accounting/repositories/IPayableRepository.ts` (EDIT — `fixedAssetItems?` no CreatePayableData)
- `server/src/features/accounting/services/NfeImportService.ts` (EDIT — allocate 3ª saída)
- `server/src/features/accounting/services/__tests__/NfeImportService.test.ts` (EDIT — 5 casos modo 4/CFOP)
- `server/src/features/accounting/services/PayableService.ts` (EDIT — resolveFixedAssetLines, recognitionLines c/ N linhas, dep opcional fixedAssetClassRepo)
- `server/src/features/accounting/services/__tests__/PayableService.test.ts` (EDIT — 6 casos modo 4)
- `server/src/lib/factory.ts` (EDIT — wiring do fixedAssetClassRepo no PayableService)
- `server/public/openapi.json` (EDIT — regenerado, 210 paths, BASELINE inalterado)

## PROVA

```yaml
PROVA:
  - command: "cd server && npx tsc --noEmit"
    exit_code: 0
    log: .claude/retornos/_logs/c8-pr5-tsc-2.log
    sha256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
  - command: "cd server && npx jest src/features/accounting/services/__tests__/NfeImportService.test.ts --runInBand"
    exit_code: 0
    log: .claude/retornos/_logs/c8-pr5-nfeimport-1.log
    sha256: 7601905f4dc1b1e995f4f8cbdeb03931b3bdfc51cfa072a46efbf4cc657c9b21
    result: "24/24 passed (5 novos casos PR-5: nota mista, sem classId, productRef em 1551, classId fora de 1551, nota 100% imobilizado)"
  - command: "cd server && npx jest src/features/accounting/dtos/__tests__/PayableDto.test.ts src/features/accounting/dtos/__tests__/NfeDto.test.ts --runInBand"
    exit_code: 0
    log: .claude/retornos/_logs/c8-pr5-dto-1.log
    sha256: f988ee87edc1de649512935439c6559b10cd483bd63628986e5054ca071b286b
    result: "37/37 passed"
  - command: "cd server && npx jest src/features/accounting/services/__tests__/PayableService.test.ts --runInBand"
    exit_code: 0
    log: .claude/retornos/_logs/c8-pr5-payableservice-1.log
    sha256: 3f2dec2fed14a360fb138896ddaf44c095df55241055c252f2ba9483bba2afac
    result: "82/82 passed (6 novos casos modo 4: pura, mista, agrupamento por conta, classId inexistente, wiring ausente, persistência JSON)"
  - command: "cd server && npx jest --selectProjects unit dtoShapeSnapshot"
    exit_code: 0
    log: .claude/retornos/_logs/c8-pr5-dtosnapshot-2.log
    sha256: be329a4b772f7ae988c4ef14c02ff0260f8dca3d8b6e8cd5dc29df2c5a949036
    result: "224 suites / 2987 tests passed — confirma que o snapshot committed (atualizado à mão nesta sessão com UPDATE_DTO_SNAPSHOT=1, log c8-pr5-dtosnapshot-1.log) bate com a forma atual dos DTOs. UPDATE_DTO_SNAPSHOT=1 saiu do comando reexecutável: env-var-prefix (`VAR=1 cmd`) é sintaxe POSIX — o prova-runner usa spawnSync com shell cmd.exe no Windows, que não entende o prefixo e falha (exit 1) sempre, não por regressão."
  - command: "cd server && npm run docs:generate"
    exit_code: 0
    log: .claude/retornos/_logs/c8-pr5-docsgen-1.log
    sha256: ea2565be68c6d3fcd044b289855dc831b075b69764d074f4e2b90b052f1d790a
    result: "210 paths (BASELINE inalterado — Passo 29 confirma)"
VEREDITO: BLOCKED
```

**Fora do PROVA (não são comandos que o runner deve reexecutar — documentam uma tentativa que FALHOU
por ambiente, não por código; o `prova-runner` só aceita entradas que reexecutam para `exit 0`):**
- `cd server && npm run test:integration` → exit 1, log `.claude/retornos/_logs/c8-pr5-integration-1.log`
  (sha256 `51edf624575d4b1bb036612f42fbaedf60bf5fdf6ff53e5bf41616a213ac5c9a`) — 209 ocorrências de `EBUSY`
  (classe `jest-concorrente-windows-ebusy-test-db`); `tasklist` mostrou 20-28 `node.exe` concorrentes
  (outros agentes/worktrees no mesmo host); `rm -f prisma/test-integration.db` falhou com "Device or
  resource busy" mesmo fora do jest. Não é regressão do diff.
- `cd server && npx jest --selectProjects integration --runInBand --forceExit src/controllers/__tests__/nfeController.purchase.regime.integration.test.ts src/controllers/__tests__/fixedAssetController.integration.test.ts src/controllers/__tests__/depreciationRateController.integration.test.ts src/controllers/__tests__/payableController.settlements.integration.test.ts`
  → exit 1, log `.claude/retornos/_logs/c8-pr5-integration-isolated-1.log` (sha256
  `141a2854af8c1b9842aac2a096066539c13e3675c508529a0d7a738903a8f950`) — mesmo `EBUSY` isolado (37/37
  falhas, todas no `unlink` do arquivo, nenhuma asserção de negócio chegou a rodar).

## Gates de envio OPS-001

1. **Objetivo:** implementar o modo 4 de entrada de imobilizado por NF-e mantendo o invariante contábil
   (nunca estoque para 1551/2551, nunca silêncio no CFOP/classe errada) — Passos 26/27 entregam isso;
   Passo 28 (rascunho) fica aberto pelo fork de `annualRateBp`.
2. **Grau por claim:** "Passos 26/27 corretos" = **verificado** (testes unit + tsc, casos adversariais do
   próprio Passo 29 que NÃO dependem do rascunho todos cobertos). "Integration suite verde" = **não
   verificável nesta sessão** (ambiente, não código).
3. **Caso adversarial tentado:** os 5 do Passo 26 (CFOP 1551 + productRef → 400; sem classId → 400;
   classId fora de 1551 → 400; nota mista; nota 100% imobilizado) e o tie-out negativo do modo 4 no DTO —
   todos vermelho→verde antes de eu escrever o fix, verde depois.
4. **Checagem que teria falhado se eu estivesse errado:** sim — por exemplo o teste "classId inexistente
   no escopo → 400" falha se `resolveFixedAssetLines` não checar `findById`; o teste de agrupamento por
   conta falha se `groupFixedAssetDebits` não somar por `accountCode`.
5. **Duas primeiras linhas entregam verdade + risco:** ver `veredicto: BLOCKED` acima — o risco principal
   é que o Passo 28 (rascunho + re-drive) não está feito, e a causa é uma lacuna de spec real (não uma
   escolha minha), citada com o caminho exato do schema.

## Aberto

- **FORK annualRateBp do rascunho (Passo 28)** — precisa decisão do dono/contador antes de eu continuar:
  (a) rascunho nasce sem taxa e a ATIVAÇÃO passa a exigir uma (mudaria `activateAsset`, hoje não pede);
  (b) `NfeImportService`/`PayableDto` modo 4 ganham `rateId`/`annualRateBp` OBRIGATÓRIOS por item (o
  operador informa a taxa no momento da importação, não depois); (c) busca automática por NCM no
  catálogo `DepreciationRate` (precisa de método novo no repo + regra de "sem taxa cadastrada para este
  NCM → 400 nomeado", nunca default). Nenhuma dessas é escolha minha.
- Passo 28 (`FixedAssetService.createDraftFromPayable`), coluna `sourceItemRef` + `@@unique`, e o gancho
  `draftsCreated` de `DepreciationService.reconcile` — bloqueados pelo fork acima.
- Passo 29's 2 casos adversariais dependentes do rascunho (re-upload 409/0 rascunhos; crash→reconcile 1×)
  — não implementados.
- `npm run test:integration` não pôde ser confirmado verde nesta sessão (ambiente Windows com múltiplos
  agentes concorrentes travando `test-integration.db`); os arquivos tocados por este PR não têm teste de
  integração próprio (a fronteira HTTP de NF-e/Payable é coberta por unit + os controllers listados, que
  não mudaram de contrato de rota nesta PR — só de shape de body, coberto pelos testes DTO/service acima).
