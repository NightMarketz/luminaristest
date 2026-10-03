# RETORNO — GOV-CONTADOR (BE-INCR-ACCOUNTANT-GOVERNANCE, só o BE)

tarefa: executar o BE do BRIEF `docs/accounting/BE-INCR-ACCOUNTANT-GOVERNANCE-brief.md` (§3 + §4, com o §5.3 prevalecendo: F-GOV-11 a, sem responsibleFrom)
autorizacao: dono, chat, 2026-10-03 — "Executa o BE-INCR-ACCOUNTANT-GOVERNANCE (dono, 03/10/2026) — só o BE deste BRIEF" (registrada no campo `autorizacao` de docs/plano/nos/GOV-CONTADOR.md)
agente: sessão principal (sessao-feature), worktree be-incr-accountant-governance-0ebda2; review por Agent isolado (general-purpose, model opus, worktree própria)
base: origin/main d6530790 → rebase em b5d6f2eb (#476, só docs)
branch/PR: claude/be-incr-accountant-governance-0ebda2 · https://github.com/NightMarketz/luminaristest/pull/482 (aberto, NÃO mergeado — merge só com OK do dono)
modelo: opus-5.5 (esforço baixo)
perfil-previsto: opus-medio
rodadas-de-review: 1 — PASS WITH NOTES; 3 notas: (1) lacuna de spec → registrada abaixo, não corrigida; (2) 17g sem prova no banco → corrigido em 6b3fd48a com mutação que morde; (3) enumeração de e-mail pelo 400 → por spec (F-GOV-8 a), registrado
custo: US$ 14.71 · claude-opus-5-5 US$ 14.71 · 447 min de relógio (scripts/session-cost.mjs; inclui o subagente revisor)
veredicto: PR pronto para o dono; review independente PASS WITH NOTES

### Checklist §3 (status por item)
1. ASSIGNMENT_STATUSES + eventTypes — ✅ `models/ledgerStatus.ts`, `models/AccountantAssignment.model.ts`
2. Migração aditiva com slots anuláveis em @@unique, IF NOT EXISTS, resetDb antes do contato — ✅ `20261003120000_add_accountant_assignments`, `test/helpers/db.ts`
3. Repositório com transition CAS (ASSIGNMENT_STATUS_CHANGED) — ✅
4. Policy pura (5 métodos; fallback com owner === actor; família de canClosePeriod intocada) — ✅
5. resolveGovernanceScope nos 9 handlers (F-GOV-7 a+) — ✅; resolveAccountingScope inalterado
6. Convite (404 contato, 400 ACCOUNTANT_USER_NOT_FOUND, 400 SELF_ASSIGNMENT, 409 ASSIGNMENT_PENDING_EXISTS dentro da tx, auditoria invited) — ✅
7. Aceite (404 a não-contador; supersede + ativação na mesma tx; auditorias na cadeia do dono) — ✅
8. Encerramento (reason obrigatório, 404 a terceiro, activeUntil só de ACTIVE, endedBy OWNER/ACCOUNTANT) — ✅
9. Listagens (histórico do escopo; /mine com ownerEmail, registrada antes de /:id) — ✅
10. Reabertura pelos 2 caminhos com preflight + releitura com tx; FUTURE em canClosePeriod; assignmentId nos eventos — ✅
11. setStatus CAS (PERIOD_STATUS_CHANGED) — ✅
12. signOff/reject com gate em dois níveis + F-GOV-9 REVIEWER_CRC_MISMATCH + assignmentId — ✅
13. AccountantRequiredError (403 ACCOUNTANT_REQUIRED) — ✅
14. Controller, rotas, docs.paths (+4 paths), BASELINE 227 → 231, openapi.json regenerado — ✅
15. Factory (service novo; repo injetado em PeriodService e AccountingReviewService) — ✅
16. Allowlist da auditoria (3 eventos, assignmentId em 4) + reason em MASKABLE_FREE_TEXT_KEYS — ✅
17. Testes a–i — ✅ (17a matriz da policy; 17b unit + HTTP nos 2 caminhos; 17c nas duas direções para período e revisão; 17d CAS em banco real; 17e revisão; 17f unit + HTTP + slot unique; 17g unit + banco real; 17h ponta a ponta + ADMIN; 17i allowlist + máscara + 4 hashes calculados em d6530790 antes da mudança)
18. Gates do diff — ✅ (abaixo)

### Checks executados
- `cd server && npx tsc --noEmit` → exit 0
- `cd server && npx jest --selectProjects unit` → 258 suítes, 3588 passaram (3 skipped, 1 todo), exit 0
- `cd server && npm run test:integration` → 94 suítes, 806/806, exit 0 (antes do commit 6b3fd48a; depois dele, o arquivo novo roda 16/16)
- `cd my-app && npx tsc --noEmit` e `npm run test:types` → exit 0 (gen.ts novo do snapshot)
- `UPDATE_DTO_SNAPSHOT=1 … dtoShapeSnapshot` → snapshot e AccountantAssignmentDto.gen.ts commitados
- `npm run docs:generate` → 231 paths
- `npm run smoke:migration -- --db <dev.db real>` → OK, original intocado
- `node scripts/plano-vault.mjs check` → vault íntegro

### Gates de envio OPS-001
- **Caso adversarial tentado:** retirei, um de cada vez, o gate de dentro da tx em openPeriod, reopenPeriod, signOff e reject. Cada mutação derrubou 2 testes. Retirar só o preflight do openPeriod não derrubou nenhum, porque a tx segura (é o comportamento esperado). Retirar `status: 'ACTIVE'` do resolver derrubou o 17g.
- **Checagem que teria falhado se eu estivesse errado:** os 4 hashes de eventos antigos foram fixados com o código de main, antes da mudança da allowlist. Se a mudança tivesse alterado algum, o teste quebraria.
- **Risco principal:** a assinatura no app prova login + aceite, não identidade. Com F-GOV-11 (a), o dono encerra a atribuição e reabre sozinho.
- **Meus vieses:** escrevi os testes depois do código (não TDD). Por isso fiz as mutações acima. A cobertura de HTTP da revisão (sign-off pelo app) fica no nível unit, com a policy real; nenhuma revisão real com jobs passa pelo HTTP neste PR.

### Lacunas de spec (registradas; nada escolhido)
> Documentadas no GAP-MAP (`docs/operating-manual/GAP-MAP.md`), Nível 3, linhas 76–79 (os 4 achados) e fila item 16 (resolver), em 03/10, com o comando que prova cada status.
1. **Resolver ambíguo por `(accountantUserId, unitId)`** (achado 1 do review). O item 5 diz "ACTIVE com accountantUserId = user e aquele unitId", sem dono. `unitId` não é validado como pertencente a um usuário (I-7), e os seeds reusam literais como `seed-unit`.
   - Se o mesmo contador estiver ACTIVE para dois donos no mesmo `unitId`, o `findFirst` escolhe uma das linhas sem critério.
   - Se o contador tiver livro próprio no mesmo `unitId`, os 9 handlers o redirecionam ao livro do cliente.
   - Caminhos possíveis, **para o dono decidir**: (a) o cliente passa `ownerUserId` (ou `assignmentId`) nos 9 handlers; (b) o invite recusa contador que já tem ACTIVE ou PENDING naquele `unitId` com outro dono; (c) aceitar e documentar, já que `unitId` é cuid de DynamicTable em produção.
   - Não bloqueia o resto do PR. Fica aberto até a decisão.

### Achados fora de escopo
- O 400 `ACCOUNTANT_USER_NOT_FOUND` deixa qualquer autenticado testar se um e-mail está cadastrado. É o comportamento da spec (F-GOV-8 a) e só é registrado aqui.
- O DTO do convite põe o e-mail em minúsculas, mas o cadastro de usuário não normaliza (`UserDto.ts:61`). Um usuário cadastrado como `Fulano@x.com` não é encontrado (400). O comportamento segue a spec; o cadastro é nó vizinho.
- O contador delegado lê **qualquer** job de data-exchange do dono (`getDataExchangeJob` e `download`), não só o par em revisão. O item 5 lista os handlers, e o texto do F-GOV-7 diz "jobs do par em revisão". Segui o checklist; restringir ao par seria um fork novo.
- Já registrados no BRIEF §9, não tratados aqui: `/open` lê `unitId` sem DTO; `ReopenPeriodSchema.periodId` é aceito e ignorado; `reason` da reabertura é opcional.
- O revisor gravou 3 logs (`npmci.log`, `unit.log`, `integ.log`) em `.claude/worktrees/`, fora da worktree dele. Apaguei esses três pelo nome que ele informou. Se outra sessão usava os mesmos nomes, o conteúdo dela já tinha sido sobrescrito por ele.

### Fold pós-merge (não aplicado; vault só recebeu a autorização)
`id: GOV-CONTADOR` · `estado: done` (ou `inflight` até o merge) · `estado_detalhe: "+ 03/10: BE mergeado (PR #482) — atribuição com aceite, 2 caminhos de reabertura e sign-off/reject governados, setStatus CAS; lacuna aberta: resolver por (contador, unitId) sem dono"` · `prs: [482]`

## PROVA

```yaml
PROVA:
  - command: "cd server && npx tsc --noEmit"
    exit_code: 0
    log: .claude/retornos/_logs/gov-contador-tsc.log
    sha256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
  - command: "cd server && npx jest --selectProjects unit -w 4"
    exit_code: 0
    log: .claude/retornos/_logs/gov-contador-unit.log
    sha256: d35bf59589b788320ea94142e15fd49870567e529c99cdf92fefd3dcaf072520
  - command: "cd server && npm run test:integration"
    exit_code: 0
    log: .claude/retornos/_logs/gov-contador-integration.log
    sha256: ad04d73992682e99db7f5a1d59a0fe4b4423e2d6db6a333ef64c673c6298a426
VEREDITO: (prova-runner)
```
