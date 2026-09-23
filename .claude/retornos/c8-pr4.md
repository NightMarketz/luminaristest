# Retorno — C8 PR-4: Retificação versionada ECD/ECF (J801/J932/dispensa/gate/lista de jobs)

**Autorização:** "Executa C8" (dono, 18/09, corpo do PR #354) + decisões do dono de 23/09
registradas na transcrição (`docs/accounting/BE-INCR-SPED-ECD-layout-transcription-J801-J932.md
§5`).

**Branch:** `claude/c8-pr4-retificacao`, criada de `origin/claude/c8-pr4-transcricao-j801-j932`
(sha base `6a2138dc0ddb1e7c76b8ea71f3b496f14db85974`).

## O que foi implementado (itens 26-31 do execution-plan, Bloco G)

1. **Migração aditiva própria** (`prisma/migrations/20260923193300_add_ecd_rectification_columns`):
   5 colunas em `accounting_data_exchange_jobs` (`supersedesJobId` UNIQUE,
   `ecfRectificationRequired`, `ecfRectificationWaivedAt`, `ecfRectificationWaiverReason`,
   `verificationTermStorageKey`) — sem FK (mesma convenção de `requestedById`).
2. **DTOs** (`SpedEcdDto.ts`): `declarant.indFinEsc='1'` (substituta) exige `codHashSub` (40 hex),
   `supersedesJobId` e `verificationTerm` (J801+J932); `'0'` proíbe os três. `J932` só aceita
   signatário `codAssin='910'` (920/Auditor Independente fora do escopo, decisão do dono).
   `SpedEcfDto.ts`/`SpedEcfRealDto.ts`: `retificadora: 'N'|'S'` (`'F'` → 400 por não existir no
   enum), `numRec` (40 chars, obrigatório ⇔ `'S'`), `supersedesJobId` (obrigatório ⇔ `'S'`).
   Regra de prazo (art. 8º §4) — **grau INFERIDO**, sem página do manual transcrita para esta
   regra especificamente (documentado no JSDoc e na transcrição §5).
3. **Emitters** (`lib/sped.ts`): `buildJ801`, `buildJ932` (+ `J932_QUALIF_910` derivado, nunca
   aceito do DTO). `buildEcdFile` emite os dois SÓ quando `verificationTerm` presente.
4. **Gate in-tx compartilhado** (`spedRectificationGate.ts`): resolve o job substituído
   (cross-tenant/wrong id → 404, nunca 403), valida kind/status/período, e traduz o P2002 da
   `@unique(supersedesJobId)` em `ConflictError` (409) — usado pelas 3 gerações (ECD, ECF
   Presumido, ECF Real).
5. **Serviços**: `SpedGenerationService` grava `ecfRectificationRequired=true` no job substituto,
   salva o `.rtf` (`verificationTermStorageKey`) e emite `sped.ecd_substituted`.
   `SpedEcfGenerationService`/`SpedEcfRealGenerationService` emitem `sped.ecf_rectified` e ZERAM a
   flag da ECD do mesmo ano (varredura via `listJobs`, dentro da mesma tx).
6. **Dispensa** (`DataExchangeExportService.waiveEcfRectification`, idempotente) +
   **gate no pacote** (`AccountingDeliveryService`: `assertEcfRectificationSatisfied`, preflight E
   dentro da tx do `confirmDelivery`, com o job re-lido).
7. **Lista de jobs** (F-FA15 → a): `GET /api/accounting/data-exchange/jobs` — não existia em
   `main`, criada aqui com o shape do fork (`unitId, direction?, kind?, status?, year?, page,
   limit` → `{ items, total, page, limit }`, cada item com `supersedesJobId`/
   `supersededByJobId` derivado por consulta inversa).
8. **Auditoria**: 3 eventos novos (`sped.ecd_substituted`, `sped.ecf_rectified`,
   `sped.ecf_rectification_waived`) na allowlist + teste-guarda no mesmo PR.
9. **Rotas/docs**: `POST /sped/ecd/generate` ganha multer opcional (campo `rtf`, no-op em corpo
   JSON puro); `POST /data-exchange/jobs/:jobId/waive-ecf-rectification`;
   `GET /data-exchange/jobs`. `docs.paths.ts` + `public/openapi.json` atualizados.
   BASELINE `openapi-paths.test.ts`: **210 → 212** (as 2 rotas novas).
10. **Runbook em branco**: `docs/runbooks/RUNBOOK-ECD-SUBSTITUTA.md` (formato
    `RUNBOOK-FORMAT.md`) — só passos/pré-condições, nenhuma evidência preenchida, nenhum
    desfecho marcado, nenhuma assinatura.
11. **Decisões do dono (23/09)** registradas em `docs/accounting/BE-INCR-SPED-ECD-layout-
    transcription-J801-J932.md §5` + JSDoc nos pontos de código correspondentes.

## Fora de escopo desta sessão (não implementado)

- **PayableService/NfeImportService** — explicitamente vetado no prompt (choke point do PR-5 em
  revisão, #366). Não tocados.
- **F-FA15 shape no `FE-INCR-REVIEW-brief.md`** — não editei esse BRIEF (fora do server); o shape
  implementado aqui é o que o fork já fixou por escrito no execution-plan §1.

## Ambiguidades A1-A14 do manual — cobertura

Cobertas por decisão do dono (23/09): **A2, A13/A10, A4/A5, A3** (ver tabela na transcrição §5).
As demais (**A1, A6, A7, A8, A9, A11, A12, A14**) **não mudam comportamento implementado**:
- A1 (nível hierárquico 2×3): não modelamos hierarquia de registro no código, sem efeito.
- A6 (tamanho "30 megabytes" / escape de `|`): resolvido por PRECEDENTE já existente em
  `spedLine` (rejeita loud qualquer campo com `|`, inclusive dentro do RTF) — mesma disciplina já
  aplicada a todo o resto do serializer; não é uma decisão nova.
- A7: já resolvida na própria transcrição (`-raw` confirma Obrig.=Sim).
- A8, A9, A14: erratas de diagramação/nome de regra no manual, sem efeito de código.
- A11, A12: regras sobre o código 920 (Auditor Independente), que está fora do escopo por
  decisão do dono — não implementadas, não bloqueiam nada.

Nenhuma ambiguidade não-coberta muda comportamento — não houve necessidade de pausar/perguntar
além do que já estava decidido.

## PROVA

```yaml
PROVA:
  - command: "cd server && npx tsc --noEmit"
    exit_code: 0
    log: .claude/retornos/_logs/c8-pr4-tsc-server-1.log
    sha256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
  - command: "cd server && npm run docs:generate"
    exit_code: 0
    log: .claude/retornos/_logs/c8-pr4-docs-generate-1.log
    sha256: df0c0897749b1814c8feaaac56eee196abf3bf42a11bc27ddf24a4500919c59d
  - command: "cd server && npx jest src/__tests__/openapi-paths.test.ts --runInBand"
    exit_code: 0
    log: .claude/retornos/_logs/c8-pr4-openapi-paths-1.log
    sha256: 76deba201db02f9e3a13d7c3acacf990185f4a3d506fa46ee68c40702529ddc9
  - command: "cd server && npm run smoke:migration"
    exit_code: 0
    log: .claude/retornos/_logs/c8-pr4-smoke-migration-1.log
    sha256: 98738adf19d6a78bff8f6df2ec768b9bc57397adbadcfd9be6b588e6159ae795
  - command: "cd server && npm run test:unit"
    exit_code: 0
    log: .claude/retornos/_logs/c8-pr4-unit-full-1.log
    sha256: 9947ebecadef9417229875c57ec11afa7430bd6bc4e372419243eab6a1ceb326
  - command: "cd server && npm run test:integration (INCONCLUSIVO — ver nota)"
    exit_code: N/A
    log: .claude/retornos/_logs/c8-pr4-integration-ebusy-1.log
    sha256: 22c06442c6c83790c1fbb37380ee425c4568069cf6497e4c1c42e02e32ac8693
  - command: "cd my-app && npx tsc --noEmit (N/A — pré-existente, ver nota)"
    exit_code: 1
    log: .claude/retornos/_logs/c8-pr4-tsc-myapp-1.log
    sha256: 03009fb1012b8c0f61947c5c4e0105f22a578a0aa16fee5588f1c1222ec9040c
VEREDITO: PASS (gates de server: tsc, docs:generate, openapi-paths, smoke:migration, unit
  completo, 224/224 suítes / 2998 testes verdes). test:integration INCONCLUSIVO (ver nota — não
  atribuível ao diff). my-app tsc N/A (worktree sem `npm ci`; nenhum arquivo de my-app tocado
  — este PR é 100% server).
```

### Nota sobre `test:integration` — INCONCLUSIVO, não FAIL

A suíte completa e as reruns focadas (`spedController.ecfReal.integration.test.ts`,
`AccountingDelivery.integration.test.ts`) bateram em `EBUSY: resource busy or locked, unlink
'...\server\prisma\test-integration.db'` em massa (209+ ocorrências) — a classe documentada
`jest-concorrente-windows-ebusy-test-db`/`windows-serializa-sqlite-ci-linux-nao`. `tasklist`
confirmou dezenas de `node.exe` ativos na máquina no momento (múltiplos worktrees/agentes
concorrentes, incluindo minhas próprias 2 invocações sobrepostas por engano). Não tentei mais
reruns para não piorar a contenção (memória `rerun-durante-instabilidade-mata-a-run-boa`). As
suítes unitárias que exercitam a MESMA lógica de serviço (mocks, sem SQLite real) — 
`SpedGenerationService.test.ts`, `SpedEcfGenerationService.test.ts`,
`SpedEcfRealGenerationService.test.ts`, `AccountingDeliveryService.test.ts`,
`DataExchangeExportService.test.ts`, `auditCanonical.test.ts` — estão TODAS verdes (parte do
`test:unit` acima). A integração real (`test:integration --runInBand`) precisa rodar numa máquina
sem contenção antes do merge — registrado aqui como pendência, não escondido.

## Adversariais provados (unit, mocks de repositório)

- 2º substituto do mesmo job → 409 (`SpedGenerationService.test.ts`, via P2002 traduzido).
- Substituído com status/sha256/storageKey inalterados (`updateJob` só chamado com o id do job
  NOVO).
- Job de outro tenant → 404, nunca 403 (`findJobById` devolve null → `NotFoundError`).
- `codHashSub` com 39 chars → 400 (`SpedEcdDto.test.ts`).
- Pacote sem ECF 'S' e sem dispensa → 400 (`AccountingDeliveryService.test.ts`, preflight E
  dentro da tx do confirm).
- ECF 'F' → 400 (`SpedEcfDto.test.ts` — enum `['N','S']` já reprova).
- Substituta contém `|J801|`+`|J932|`, original não (`sped.test.ts` + `SpedGenerationService.test.ts`).
- `waiveEcfRectification` idempotente — 2ª chamada não reemite o audit event.

## Forks não cobertos / ambiguidade a reportar

Nenhum fork novo — as 4 ambiguidades relevantes (A2, A13/A10, A4/A5, A3) já vieram decididas pelo
dono no prompt. As 10 restantes (A1, A6-A9, A11, A12, A14) não mudam comportamento, conforme
análise acima; nenhuma bloqueou implementação.

## Arquivos tocados (server, docs — nenhum my-app)

Ver `git status --short` na branch — 31 arquivos modificados/criados, nenhum em
`PayableService.ts`/`NfeImportService.ts`/`my-app/`.
