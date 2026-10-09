# RETORNO — X7 Fase C PR-2 (ISS por competência × município)

tarefa: executar o PR-2 da Fase C do X7 (BRIEF C itens 13–21) — PR sem merge
agente: sessao-feature, worktree própria agent-a9dcb0e122a1feb7e, branch claude/x7-fase-c-pr2-iss
modelo: opus-5.5/low
perfil-previsto: —
rodadas-de-review: —
custo: sem transcrições em C:\Users\smurf\.claude\projects\C--Users-smurf-Downloads-Luminaris--claude-worktrees-agent-a9dcb0e122a1feb7e
veredicto: PASS

PR: https://github.com/NightMarketz/luminaristest/pull/610

### Arquivos
- server/src/features/accounting/models/issCompetencia.ts (NEW) + models/__tests__/issCompetencia.test.ts (NEW)
- server/src/controllers/__tests__/issByCompetenceExport.integration.test.ts (NEW)
- server/src/features/accounting/repositories/{IFiscalDocumentRepository,FiscalDocumentRepository}.ts (EDIT — findForIssReport)
- server/src/features/accounting/{models/DataExchange.model.ts, models/AccountingDelivery.model.ts, dtos/DataExchangeDto.ts, dtos/AccountingDeliveryDto.ts, services/DataExchangeExportService.ts} (EDIT)
- server/src/lib/factory.ts, server/src/routes/docs.paths.ts, server/public/openapi.json, __dto-shapes__.json, my-app/types/contracts/accounting/*.gen.ts (EDIT)
- docs/plano/nos/X7.md + _INDEX.md (fold #610)

### Checks executados
PROVA:
  - command: "cd server && npx tsc --noEmit"
    exit_code: 0
    log: .claude/retornos/_logs/x7-fase-c-pr2-1.log
    sha256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
  - command: "cd server && npx tsc --noEmit -p tsconfig.test.json"
    exit_code: 0
    log: .claude/retornos/_logs/x7-fase-c-pr2-2.log
    sha256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
  - command: "cd server && npm run test:unit"
    exit_code: 0
    log: .claude/retornos/_logs/x7-fase-c-pr2-3.log
    sha256: ded1a57f590b591079fb02773142ae7ef316b1e60fd11d0c7faeea9cb2219799
  - command: "cd server && npm run test:integration"
    exit_code: 134
    log: .claude/retornos/_logs/x7-fase-c-pr2-4.log
    sha256: bf0490945c8147c5960cf4ec730741196a90cb9a377acfa3e2d7f81176892dbf
  - command: "cd my-app && npx tsc --noEmit"
    exit_code: 0
    log: .claude/retornos/_logs/x7-fase-c-pr2-5.log
    sha256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
  - command: "cd server && NODE_OPTIONS=--max-old-space-size=8192 npx jest --selectProjects integration --shard=1/4 --runInBand --forceExit"
    exit_code: 0
    log: .claude/retornos/_logs/x7-fase-c-pr2-6.log
    sha256: b046840e5a050102124aab42cd6096b532256d145224b63b525892543f1d007d
  - command: "cd server && NODE_OPTIONS=--max-old-space-size=8192 npx jest --selectProjects integration --shard=2/4 --runInBand --forceExit"
    exit_code: 0
    log: .claude/retornos/_logs/x7-fase-c-pr2-7.log
    sha256: 4f8ce974841a14ea9efabd9d1ccc5cb89fafe1cdca1175d0659849ffada5c048
  - command: "cd server && NODE_OPTIONS=--max-old-space-size=8192 npx jest --selectProjects integration --shard=3/4 --runInBand --forceExit"
    exit_code: 0
    log: .claude/retornos/_logs/x7-fase-c-pr2-8.log
    sha256: b95c86ef7ce23fa7556fcd75e90cf6780fab7e799c3016059bbf23af0f574575
  - command: "cd server && NODE_OPTIONS=--max-old-space-size=8192 npx jest --selectProjects integration --shard=4/4 --runInBand --forceExit"
    exit_code: 0
    log: .claude/retornos/_logs/x7-fase-c-pr2-9.log
    sha256: f5dda278c36b2a94d285c79951d4eb459e827872529ce76b31f8bf7e5d7428c9
VEREDITO: PASS

A integração numa passada só deu OOM (exit 134) depois de 122 suítes, sem nenhuma falha de teste até ali. Os 4 shards do CI, com heap de 8 GB, ficaram verdes: 1095 testes.

### Gates de envio OPS-001
- Caso adversarial tentado: na integração, um documento com 2 tentativas (SP na 1ª e RJ na corrente) caiu em RJ. NFE, homologação, SENT, PROCESSING, REJECTED, CANCELLED, soft-deleted, fora da janela, outra unidade e outro dono ficaram todos fora. A nota retida ficou numa linha separada. Passou.
- Checagem que teria falhado se eu estivesse errado: no teste do item 19, uma nota com `aliqIssBp` e base mas sem `vIss` precisa somar 0. Se alguém multiplicasse alíquota × base, o teste falharia.
- Risco principal remanescente: a Paulistana fica fora do relatório, e o município de incidência pode não ser o local da prestação (P-C2).

### Lacunas de spec
- A coluna `divergentes` não está na §2.2; entrou pelo F-TC-4 (a). A forma da linha-meta do ISS não está fixada no BRIEF (descrita no PR).

### Aberto
- Rótulo FE dos kinds. Oráculos P-C1..P-C6.
