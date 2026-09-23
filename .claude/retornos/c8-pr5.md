# RETORNO — C8 PR-5 (Entrada por NF-e modo 4 + nota mista + rascunho + re-drive)

tarefa: implementar BE-INCR-FIXED-ASSETS PR-5 (Bloco E, execution-plan Passos 26-29 + A7; BRIEF itens
  20-22 + §5) — modo 4 NF-e (CFOP 1551/2551 → imobilizado), nota mista, rascunho de FixedAsset, re-drive
  no reconcile. Autorização citável: "Executa C8" (dono, 18/09, corpo do PR #354); F-FA12 → (a) ratificado.
  **4ª rodada:** re-review do #366 achou os 3 achados anteriores corrigidos, mas uma REGRESSÃO NOVA
  introduzida pela correção do achado 3 (fallback por índice colide com `nItem` explícito parcial).
  Esta rodada corrige só isso — sem PR novo.
agente: sessão de execução direta, worktree própria `agent-ab644b678c007f6c8`, branch
  `claude/c8-pr5-nfe-modo4`.
veredicto: PASSOU

## A regressão e a correção

**Achado do re-review:** o fallback `sourceItemRef = String(item.nItem ?? índice)` (índice 0-based) da
rodada anterior colide quando o array MISTURA itens com `nItem` explícito e itens sem ele —
`[{nItem:1}, {sem nItem}]`: item 0 tem `nItem=1` → `sourceItemRef "1"`; item 1 (índice 1, SEM `nItem`)
cai no fallback → `String(1)` = `"1"` também. Os dois colidem. `[{nItem:2},{nItem:2}]` (dois `nItem`
explícitos IGUAIS) também não era pego — nada validava unicidade entre os `nItem` informados. As duas
colisões dão o MESMO sintoma: o 2º item é lido pelo read-first como "já tem rascunho" e é pulado — 1
rascunho só, custo do 2º item incorporado ao débito do razão mas SEM `FixedAsset` correspondente, e
SEM ERRO NENHUM (o read-first não distingue "já existe de propósito" de "colidiu por acidente").

**Correção — 2 partes:**
1. **`PayableDto` (`CreatePayableSchema.superRefine`):** nova regra sobre `fixedAssetItems` — `nItem`
   tem de estar presente em **TODOS** os itens do array **ou em NENHUM** (nunca uma mistura); quando
   presente em todos, tem de ser **único** entre eles. Ambas violações → 400 ANTES de chegar ao service.
2. **`PayableService.resolveFixedAssetLines`:** o fallback (usado só quando NENHUM item tem `nItem`,
   já garantido pelo DTO) passou de `índice` (0-based) para `índice + 1` (**1-based**, alinhado ao
   `nItem` real do XML, que também é 1-based) — nunca mais gera um valor que colidiria com um `nItem`
   explícito de outro cenário.

`NfeImportService.allocate` já carregava `nItem` em **TODOS** os itens de `fixedAssetItems` (nunca
parcial) — nenhuma mudança necessária lá; a regressão só era alcançável por uma criação **manual**
(fora de NF-e) que misturasse `nItem` explícito com item sem `nItem` no mesmo corpo.

## Arquivos (delta desta rodada sobre `9f8fa7e0`)

- `server/src/features/accounting/dtos/PayableDto.ts` (EDIT — `superRefine`: `nItem` all-or-nothing + único)
- `server/src/features/accounting/services/PayableService.ts` (EDIT — fallback `índice + 1`, 1-based)
- `server/src/features/accounting/dtos/__tests__/PayableDto.test.ts` (EDIT — 4 casos: nItem parcial → 400, nItem repetido → 400, nItem ausente em todos → aceita, nItem presente e único → aceita)
- `server/src/features/accounting/services/__tests__/PayableService.test.ts` (EDIT — `sourceItemRef` esperado `'1'` em vez de `'0'` nos 2 testes que usavam o fallback; +1 caso: 2 itens sem `nItem` → `sourceItemRef` `['1','2']`, custos preservados)

## PROVA

```yaml
PROVA:
  - command: "cd server && npx tsc --noEmit"
    exit_code: 0
    log: .claude/retornos/_logs/c8-r366b-tsc-1.log
    sha256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
  - command: "cd server && npx jest src/features/accounting/services/__tests__/PayableService.test.ts src/features/accounting/dtos/__tests__/PayableDto.test.ts src/features/accounting/services/__tests__/NfeImportService.test.ts src/features/accounting/dtos/__tests__/NfeDto.test.ts src/features/accounting/services/__tests__/FixedAssetService.test.ts src/features/accounting/models/__tests__/FixedAsset.model.test.ts --runInBand"
    exit_code: 0
    log: .claude/retornos/_logs/c8-r366b-touched-1.log
    sha256: f4f56215bd23d25ed7ca0bada4522a2c865039259ad03c45bfc7e1777c41e182
    result: "208/208 passed — os 2 cenários de colisão (nItem parcial; nItem repetido) → 400 no DTO; o caso sem nItem com 2 itens → sourceItemRef ['1','2'], 2 rascunhos, custos preservados"
  - command: "cd server && npx jest --selectProjects unit dtoShapeSnapshot"
    exit_code: 0
    log: .claude/retornos/_logs/c8-r366b-dtosnapshot-1.log
    sha256: 82305d1669a2a9d3c5ee1ebd752093a06b3b1633a93908eeeec960f72a65ef4e
    result: "224 suites / 3022 tests passed — snapshot inalterado (superRefine é invisível ao JSON Schema, limite já documentado do próprio gate)"
  - command: "cd server && npm run docs:generate"
    exit_code: 0
    log: .claude/retornos/_logs/c8-r366b-docsgen-1.log
    sha256: ea2565be68c6d3fcd044b289855dc831b075b69764d074f4e2b90b052f1d790a
    result: "210 paths — openapi.json inalterado (nenhum JSDoc/rota mudou nesta rodada)"
  - command: "cd server && npx jest --selectProjects integration --runInBand --forceExit src/controllers/__tests__/nfeController.purchase.regime.integration.test.ts src/controllers/__tests__/fixedAssetController.integration.test.ts src/controllers/__tests__/depreciationRateController.integration.test.ts src/controllers/__tests__/payableController.settlements.integration.test.ts"
    exit_code: 0
    log: .claude/retornos/_logs/c8-r366b-integration-1.log
    sha256: 5ee4e9b6826c4bdadff52a4c1c2bbf054f0f87d9f916caac23d13e1da466dee4
    result: "4 suites / 37 tests passed contra SQLite real — só as suítes AFETADAS"
VEREDITO: PASS
```

## Gates de envio OPS-001

1. **Objetivo:** fechar a regressão específica do re-review sem reabrir nem tocar em mais nada.
2. **Grau por claim:** verificado (reexecução, exit 0). Snapshot/openapi conferidos como INALTERADOS
   (não é omissão — a mudança é só lógica de `superRefine`, invisível ao JSON Schema e sem novo campo).
3. **Caso adversarial tentado:** os 2 exatos citados (`[{nItem:1},{sem nItem}]`; `[{nItem:2},{nItem:2}]`)
   → 400 no DTO; o caso "sem nItem, 2 itens" → 2 rascunhos (não 1), custos corretos.
4. **Checagem que teria falhado se eu estivesse errado:** sim — o teste
   `sourceItemRef ['1','2']` falha se o fallback ainda fosse 0-based (daria `['0','1']`, que não é
   necessariamente errado isoladamente, mas o teste do DTO com `nItem` explícito em 1 e ausente no
   outro FALHARIA a aceitar se a regra all-or-nothing não estivesse lá).
5. **Duas primeiras linhas entregam verdade + risco:** `veredicto: PASS`; risco residual é o mesmo já
   nomeado nas rodadas anteriores (crash pré-recognition), nenhum risco novo.

## Aberto

- `npm run test:integration` completo não executado nesta rodada (mesma instrução: só as suítes afetadas).
- Nenhum fork novo.
