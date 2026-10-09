# RETORNO — F5 PR-3: achados A1/A2 do review independente do #615

tarefa: corrigir A1 (faixa sem movimento trava a watermark) e A2 (sobreposição repete a cada ciclo) do review do
  #615. Autorização: dono, chat, 2026-10-10: "R1 a, R2 a". O #615 já estava mergeado (`2f942f73`), então o
  coordenador mandou a correção para o PR novo #623 (branch `claude/f5-pr3-review-fixes`, a partir de `045ab144`).
  Sem merge.
agente: sessão de execução, worktree `agent-a2c27e22755bbc575`; formulários sessao-instrumentacao e sessao-correcao.
modelo: opus-5.5/low
perfil-previsto: opus-medio (nota F5)
rodadas-de-review: —
custo: sem transcrições em C:\Users\smurf\.claude\projects\C--Users-smurf-Downloads-Luminaris--claude-worktrees-agent-a2c27e22755bbc575
veredicto: PASS

### Guardas (vermelho → verde)

- A1, `releaseReport.integration.test.ts`. Vermelho no commit `1a0f38fb`: `fetchAll()` 2× deu `failed` = `[1, 1]`
  quando o esperado era `[0, 0]`. Verde depois do fix `da2db909`.
- A2: no vermelho do commit `09d6c757`, `view.body.data.releaseReportBlockedReason` veio `undefined` ("received
  value must not be null nor undefined"). Verde depois do fix `738ff3c4`, mais o teste de destravar.
- O #620 (`d88ff9cb`) só acrescentou asserções de `feeCents`/`feeEntryId` na view do F7. Não tocou em A1/A2.

### Arquivos

- `server/src/features/accounting/services/ReleaseReportService.ts`: faixa vazia, bloqueio, contador `blocked`.
- `server/src/features/accounting/services/PaymentAccountService.ts`: `unblockReleaseReport` e o campo na view.
- `server/src/controllers/paymentAccountController.ts`, `server/src/routes/paymentAccounts.ts`,
  `server/src/routes/docs.paths.ts`, `server/public/openapi.json`.
- `server/src/features/accounting/dtos/PaymentAccountDto.ts`: `UnblockReleaseReportSchema` `.strict()`, mais o snapshot
  e `my-app/types/contracts/accounting/PaymentAccountDto.gen.ts`.
- `server/src/features/accounting/audit/auditCanonical.ts`: 3 eventos novos. A chave do bloqueio é `code`, não
  `reason`, porque `reason` exige máscara de texto livre e o valor é um código.
- `server/prisma/schema.prisma` e a migração `20261012120000_add_payment_account_release_report_block`.
- `docs/plano/decisoes/D-2026-10-10-F5-PR3-REVIEW-FIXES.md`, `docs/plano/nos/F5.md` (link e fold do #623).

### Desvios declarados

- O "prólogo idempotente" pedido não existe em SQLite para `ADD COLUMN`. A migração é um statement só, que é
  atômico. A justificativa está no cabeçalho do SQL.
- Quando o arquivo do job é byte a byte igual ao do upload manual, o sha256 devolve o extrato existente e a
  watermark anda. Isso não é tratado como sobreposição; está registrado na nota D.

PROVA:
  - command: "cd server && npm run test:integration -- releaseReport -t A1"
    exit_code: 1
    log: .claude/retornos/_logs/f5-pr3-review-fixes-a1-red.log
    sha256: 257896c05e057a43178418d3f23337ba07ad2f1b8527438303dc4b92c9964518
  - command: "cd server && npm run test:integration -- releaseReport -t A2"
    exit_code: 1
    log: .claude/retornos/_logs/f5-pr3-review-fixes-a2-red.log
    sha256: b78ff93224fb8121aa5a75de3ae980d957ae5154d4e874504fcae5eba7fb17de
  - command: "cd server && npm run test:integration -- releaseReport -t A1"
    exit_code: 0
    log: .claude/retornos/_logs/f5-pr3-review-fixes-a1-green.log
    sha256: 426165ec63134a7f9139b4e05cbeb19999f68c8a5c4772c7085ffaf92bf742bf
  - command: "cd server && npm run test:integration -- releaseReport"
    exit_code: 0
    log: .claude/retornos/_logs/f5-pr3-review-fixes-a2-green.log
    sha256: d9d6ab6ddd7afea04ca2225f67365ab425fe0b8533cffb182d4b6feea3906265
  - command: "cd server && npx tsc --noEmit"
    exit_code: 0
    log: .claude/retornos/_logs/f5-pr3-review-fixes-tsc.log
    sha256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
  - command: "cd server && npx tsc --noEmit -p tsconfig.test.json"
    exit_code: 0
    log: .claude/retornos/_logs/f5-pr3-review-fixes-tsc-test.log
    sha256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
  - command: "cd server && npx eslint src/features/accounting/services/ReleaseReportService.ts src/features/accounting/services/PaymentAccountService.ts src/features/accounting/models/ReleaseReport.model.ts src/features/accounting/audit/auditCanonical.ts src/features/accounting/dtos/PaymentAccountDto.ts src/controllers/paymentAccountController.ts src/routes/paymentAccounts.ts src/routes/docs.paths.ts src/controllers/__tests__/releaseReport.integration.test.ts"
    exit_code: 0
    log: .claude/retornos/_logs/f5-pr3-review-fixes-eslint.log
    sha256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
  - command: "cd server && npm run docs:generate"
    exit_code: 0
    log: .claude/retornos/_logs/f5-pr3-review-fixes-docs.log
    sha256: 14e56da8baa5594a87897597c2ad41e4d4053aea439f76e1f7611feb58e5d307
  - command: "cd server && npm run test:unit"
    exit_code: 0
    log: .claude/retornos/_logs/f5-pr3-review-fixes-unit.log
    sha256: 20900b4528f1b3db9413129b5767e520da8c13dd26882ac8517ae2fa037ad43a
  - command: "cd server && npm run test:integration"
    exit_code: 134
    log: .claude/retornos/_logs/f5-pr3-review-fixes-integration-1.log
    sha256: ca9cd29791e4d6d602f3a52cb88d4bc287418b68962a3d4fb93a94bba1c8dae0
  - command: "cd server && NODE_OPTIONS=--max-old-space-size=8192 npm run test:integration"
    exit_code: 0
    log: .claude/retornos/_logs/f5-pr3-review-fixes-integration-2.log
    sha256: a1512851264ab73673bfb8a8072c8415c2590639882e5aec1b221294ec0c0bb2
  - command: "cd server && npm run smoke:migration -- --db C:/Users/smurf/Downloads/Luminaris/server/prisma/prisma/dev.db"
    exit_code: 0
    log: .claude/retornos/_logs/f5-pr3-review-fixes-smoke.log
    sha256: ed470bf7980d5476e603015699be9c26e7e8258be145ae737fa4bf627a804d90
  - command: "cd my-app && npx tsc --noEmit"
    exit_code: 0
    log: .claude/retornos/_logs/f5-pr3-review-fixes-myapp-tsc.log
    sha256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
  - command: "node scripts/plano-vault.mjs check"
    exit_code: 0
    log: .claude/retornos/_logs/f5-pr3-review-fixes-vault.log
    sha256: ad3d1a1c850274270a54a3da6317a84d68e394709fae6f17f1f9e2e0fb708ef7
VEREDITO: PASS

Os dois logs `-red` têm exit 1 de propósito (guarda vermelho antes do fix). O `integration-1` deu exit 134 por
OOM do heap e foi rodado de novo com 8 GB (`integration-2`).

### Gates de envio OPS-001

1. Objetivo: o job não trava mais em faixa vazia e não repete a sobreposição a cada ciclo (verificado, guardas verdes).
2. Grau: comportamento verificado por teste de integração. A ausência de efeito na tela é inferida, porque não há tela.
3. Casos adversariais tentados: um arquivo idêntico ao manual (o sha256 desvia, e o teste foi ajustado) e o destravar
   com a sobreposição ainda presente (bloqueia de novo, sem laço).
4. Checagem que teria falhado: os guardas, vermelhos antes dos fixes.
5. Risco principal: o FE ainda não mostra o alerta, então o operador só o vê pela API ou pelo audit.

### Aberto

- FE: mostrar `releaseReportBlockedReason` e o botão de destravar. Fica para o BRIEF de FE do F5/F7, que o dono abre.
- Merge do #623 só com OK do dono.
