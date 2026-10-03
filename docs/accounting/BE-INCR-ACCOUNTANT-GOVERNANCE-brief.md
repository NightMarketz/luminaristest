# BE-INCR-ACCOUNTANT-GOVERNANCE — contador responsável: atribuição por escopo, reabertura e assinatura (PLANO, não executar)

## 0. Cabeçalho

- **Item:** nó [[GOV-CONTADOR]] (`docs/plano/nos/GOV-CONTADOR.md`), passo **5.2** da Fase 5 do
  [`PLANO-POS-CONTADOR-2026-09-23`](PLANO-POS-CONTADOR-2026-09-23.md) (linhas 119–130).
- **Autorização:** dono, entrevista de 29/09/2026, decisão **15** de
  `docs/plano/decisoes/D-2026-09-29-ENTREVISTA-ONDAS-E-1O-CLIENTE.md`, nas palavras *"Ratificar recomendações"*:
  *"F-GOV-2 a · 3 a · 4 a · 5 a · 6 b · F-V1 c · V2 a · V3 b · V4 a. Entram no escopo as 2 lacunas novas
  (`openPeriod` como 2º caminho de reabertura; configurações/imobilizado na mesma policy). **Planejar autorizado.**
  F-GOV-1 (consulta ao CRC-SP) fica com o dono."* Evidência no dossiê
  `docs/accounting/DOSSIE-DECISOES-2026-09-29.md` §8 (D-12). Os dois arquivos estão no PR #440, ainda aberto
  quando este BRIEF foi escrito. Por isso foram lidos de `origin/claude/docs-decisoes-2026-09-29` (`b5398c87`).
  **Autoriza o BRIEF, não o código.** Código exige "executa" (ORCH-006).
- **A autorização cobre exatamente este item?** Sim, com dois recortes que ela mesma fez. O passo 5.2 lista cinco
  peças. **Três entram:** papel com CRC, reabertura só pelo contador e login do contador. **Uma fica fora:** a
  política versionada, que vai para incremento próprio (F-GOV-6 b). **Uma já está atendida por construção:** o
  bloqueio do operador do fornecedor (§2, linha I-9). A consulta ao CFC também fica fora (F-V1 c). Nada aqui
  cobre mais do que foi autorizado.
- **Base:** `origin/main` `9dd690b3`. Todo `arquivo:linha` abaixo foi lido nesse commit.
- **Intenção (T1).** O objetivo não é ter um "papel de contador". É fazer a escrituração ter **a quem imputar**
  (PRE-ADR §1) sem travar o salão que lança todo dia (F-GOV-3 a) e sem quebrar quem já usa (F-GOV-4 a).
- **Risco principal.** A assinatura dentro do app prova **login + aceite**, não identidade. Nada no sistema
  prova que quem entrou como contador é a pessoa do CRC. A assinatura legal continua sendo o e-CPF no PVA. Em
  segundo lugar: o dono pode encerrar a atribuição e reabrir sozinho (F-GOV-10). A trava deixa rastro, mas não é
  absoluta. O F-GOV-11 (b) reduz esse risco aos períodos que nenhum contador cobriu.
- **Revisão de 29/09 (pedido do dono: ancorar na lei antes de ratificar):** os forks F-GOV-7 a F-GOV-11 trazem a
  base legal em §5, e as fontes, com sha256, estão em §5.1. A pesquisa mudou duas coisas. O F-GOV-7 passou a
  (a+), com leitura do objeto assinado. Uma escolha que este BRIEF marcava como "direta" virou o F-GOV-11.
- **Ratificação 02/10 (dono, questionário):** F-GOV-7 (a+), F-GOV-8 (a) reforçada, F-GOV-9 (a), F-GOV-10 (a) — na
  recomendação — e **F-GOV-11 (a), contra a recomendação (b)**. Com o 11 (a), o segundo risco acima volta inteiro:
  o dono que encerra a atribuição reabre sozinho também os períodos que o contador cobriu. Efeitos: §5.3.
  Registro: [`D-2026-10-02-GOV-CONTADOR-FORKS`](../plano/decisoes/D-2026-10-02-GOV-CONTADOR-FORKS.md). Não é "executa".

## 1. Forks já decididos (29/09) — o que cada um fixa no desenho

| Fork | Decisão | O que fixa aqui |
|---|---|---|
| F-GOV-2 | (a) `AccountantAssignment` por escopo, com vigência | Model Prisma first-class por `userId+unitId`. `enum Role` **não muda** |
| F-GOV-3 | (a) o contador tranca reabertura + assinatura da revisão | `canReopenPeriod` e `canSignOffReview` mudam. `canClosePeriod` e a família dele **não mudam** |
| F-GOV-4 | (a) empresa sem contador não trava | Sem atribuição `ACTIVE`, o comportamento é idêntico ao de hoje |
| F-GOV-5 | (a) CRC só formato | Reusa o `parseCrcNumber` canônico. Nenhuma chamada externa |
| F-GOV-6 | (b) política versionada em incremento próprio, depois | Fora deste BRIEF (§6) |
| F-V1 | (c) consulta ao CFC só depois do M2 | Fora deste BRIEF. O desenho não pode impedir que ela entre depois (§6) |
| F-V2 · F-V3 · F-V4 | (a) conferir no cadastro do contato · (b) inativo gera aviso, não 400 · (a) base legal no RoPA | Valem para o `BE-INCR-CRC-CFC-VALIDACAO` quando o F-V1 virar (a). Aqui só registram a compatibilidade: o status do CFC mora no **contato**, e a atribuição aponta para o contato |
| F-GOV-1 | consulta ao CRC-SP (software × serviço contábil) | **Do dono, fora do código.** Só registro (§5) |

## 2. Inventário conferido (corrige o PRE-ADR)

Grau: **V** = lido no código em `9dd690b3` · **I** = inferido do código lido (só um teste prova).

| # | Fato | Evidência | Grau |
|---|---|---|---|
| I-1 | **Errata do PRE-ADR §2:** `PeriodService.ts:34` é o gate do `seedYear`. A reabertura tem **dois** caminhos: `reopenPeriod` (`:137-171`, gate `:142`) e `openPeriod` (`:45-70`, gate `:46`), que aceita `SOFT_CLOSED` como origem (`:53`) e leva a `OPEN`. Os dois usam `canClosePeriod` | `server/src/features/accounting/services/PeriodService.ts` | V |
| I-2 | `canClosePeriod = !!scope.actorUserId` | `policies/AccountingPolicy.ts:23-25` | V |
| I-3 | A família de `canClosePeriod` é **maior** que a citada na decisão 15. Ela lista configurações (`:125-127`) e imobilizado (`:152-154`). Há um **3º dependente**: `canManageFiscalProfile` (`:138-140`), que por sua vez alimenta `canManageServiceFiscalProfile` (`:143-145`). Quem consome: `AccountingScopeSettingsService.ts:59`; `FiscalProfileService.ts:145`; `CompanyFiscalProfileService.ts:315`; `CompanySignerService.ts:108`; `ServiceFiscalProfileService.ts:53,76`; `FixedAssetService.ts` (6 pontos); `FixedAssetClassService.ts` (3); `DepreciationService.ts` (3); `DepreciationRateService.ts` (2) | grep `canManage…` em `server/src` | V |
| I-4 | `canSignOffReview → canManage` (`:169-171`, `:10-12`). O `reject` usa o **mesmo** método (`AccountingReviewService.ts:403`). No `signOff`, o gate da policy fica **fora** da tx (`:354`). A tx (`:363`) relê só os achados | `AccountingReviewService.ts:352-422` | V |
| I-5 | O `signOff` grava `reviewerName`/`reviewerCrc` **digitados** no DTO (`AccountingReviewDto.ts:135-152`). O CRC passa pela máscara, mas nada o liga a um responsável | idem | V |
| I-6 | `setStatus` **não é CAS**: faz `tx.accountingPeriod.update` sem condição de status (`AccountingPeriodRepository.ts:67-74`). O status é checado **fora** da tx (`PeriodService.ts:149-158`). Numa corrida, um `hardClose` pode confirmar entre a checagem e a escrita, e o `reopen` então leva a `OPEN` um período `HARD_CLOSED` ("terminal", `:19`). Os 4 chamadores já passam `fromStatus` (`:60,92,124,161`) | leitura | mecanismo V; corrida I |
| I-7 | `resolveAccountingScope` é síncrono e sempre devolve `owner === actor` (`scope/AccountingScope.ts:31-44`). Tem **214** chamadas fora de teste. Hoje o contador não tem como agir nos livros do cliente | grep | V |
| I-8 | `enum Role { USER ADMIN }` | `prisma/schema.prisma:145-149` | V |
| I-9 | **O bloqueio do operador do fornecedor já vale por construção.** Nenhum ponto do módulo contábil usa `Role.ADMIN`. As ocorrências estão só em `dashboardController`, `dynamicTablesController`, `attachments` e `dashboardLayout`. Como o escopo é sempre `owner === actor` (I-7), ninguém de fora do tenant chega aos livros pela API | grep `Role.ADMIN` | V |
| I-10 | **Errata do PRE-ADR §3.1 e F-GOV-5:** o formato "`NNNNNN/UF`" está velho. O canônico é `parseCrcNumber` (`models/AccountingContact.model.ts:82`, `CRC_NUMBER_RE` `:59`), com máscara `UF-NNNNNN/O-D` e sufixo ` T-UF`/` S-UF` (#305/#426) | leitura | V |
| I-11 | O contato do contador é **editável** (`AccountingContactService.ts:115`, `PATCH /contacts/:id`). Por isso o CRC de uma atribuição precisa de snapshot para guardar histórico | leitura | V |
| I-12 | Unique com NULL no SQLite já tem precedente: `AccountingReview @@unique([ecdJobId, ecfJobId])` (`schema.prisma:1869,1892`). Não há índice parcial em nenhuma migração, e o Prisma 6.16 não o expressa | leitura + grep | V |
| I-13 | O `ForbiddenError` não aceita código (`lib/errors.ts:34`). O padrão para 403/409 nomeado é uma classe própria (`AccountingPeriodNotOpenError`, `:137`) | leitura | V |
| I-14 | Os chamadores internos de `openPeriod` só abrem `FUTURE` (`lib/factory.ts:318`, `jobs/seedAccountingFixtureCli.ts:296`). Não são afetados pelo gate de reabertura | leitura | V |

## 3. Checklist numerado (cada item testável sozinho)

> Padrão de camada é requisito: Route → Controller → Service → Repository → Prisma, mais Policy, Factory, DTO Zod
> `.strict()` e soft-delete (Contrato §2/§3). Todo gate de invariante mutável roda em **dois níveis**: preflight
> fora da tx (erro rápido) e re-checagem autoritativa **dentro** do `runTransaction`, com `tx` propagado ao repo
> (memórias `authoritative-gate-inside-tx`, `tx-nao-propagado-ao-repo`).

1. **Status e constantes.** `ASSIGNMENT_STATUSES = ['PENDING','ACTIVE','ENDED'] as const` em
   `models/ledgerStatus.ts` (padrão `REVIEW_STATUSES` `:25`). Os eventTypes vão em
   `models/AccountantAssignment.model.ts`. **Direto:** três estados bastam. Quem encerrou e por quê ficam em
   `endedById` e `endReason`, sem estados `DECLINED`/`CANCELLED` separados.
2. **Migração aditiva `accountant_assignments`** (§4.3). A unicidade "no máximo 1 `ACTIVE` e 1 `PENDING` por
   escopo" usa colunas-slot anuláveis em `@@unique` (precedente I-12), não índice parcial. O slot volta a `NULL`
   em toda saída de estado (memória `unique-de-idempotencia-x-soft-delete`). A migração abre com o prólogo
   `IF NOT EXISTS` (memória `migracao-sqlite-nao-e-transacional`). `resetDb()` (`test/helpers/db.ts`) apaga a
   tabela nova **antes** de `accountingContact` (`:123`, por causa da FK Restrict).
3. **Repositório** `IAccountantAssignmentRepository` + `AccountantAssignmentRepository` (§4.2). Toda leitura
   filtra `deletedAt: null`. Toda escrita recebe `tx`. `transition` é **CAS**: `updateMany` com
   `where status = from`, e contagem 0 vira `ConflictError('ASSIGNMENT_STATUS_CHANGED')`.
4. **Policy pura** (§4.2). Cinco métodos novos ou alterados, nenhum lê o banco:
   - `canManageAccountantAssignment(scope)`: `!!actor && owner === actor`, nunca em escopo delegado.
   - `canRespondToAssignment(actorUserId, a)`: `actor === a.accountantUserId`.
   - `canEndAssignment(actorUserId, a)`: `actor === a.userId || actor === a.accountantUserId`. O alcance para o
     dono depende do F-GOV-10.
   - `canReopenPeriod(scope, active)`: com `active`, exige `actor === active.accountantUserId` e
     `owner === active.ownerUserId`. Sem `active`, exige **`owner === actor`** e cai em `canClosePeriod(scope)`,
     como hoje (F-GOV-4 a).
   - `canSignOffReview(scope, active)`: mesma regra, com fallback em `canManage(scope)`, como hoje.
   - **Por que o fallback exige `owner === actor`:** o resolver (item 5) roda fora da tx. Se a atribuição for
     encerrada entre o resolver e a tx, a releitura dentro da tx devolve `null`. Com um fallback só em
     `canClosePeriod` (`!!actor`), o **ex-contador**, ainda com escopo delegado, passaria. O fallback do
     F-GOV-4 (a) vale só para quem age no próprio livro.
   **O corpo de `canClosePeriod` e da família I-3 não muda** (F-GOV-3 a). O item 17a fixa isso em teste.
   **Se o F-GOV-11 for (b):** `canReopenPeriod` passa a receber também o período e a cobertura.
   - Período coberto pela atribuição ativa: só o contador ativo reabre.
   - Período coberto só por atribuição encerrada: ninguém reabre; a correção vai por extemporâneo.
   - Período sem cobertura: segue a regra acima.
   A cobertura vai de `responsibleFrom` até o mês de `activeUntil`. Numa sobreposição, a atribuição ativa vence.
5. **Resolver de escopo delegado.** Novo método `AccountantAssignmentService.resolveGovernanceScope(user, unitId)`,
   assíncrono. Se existe atribuição `ACTIVE` com `accountantUserId = user.userId` e aquele `unitId`, devolve
   `{ ownerUserId: a.userId, actorUserId: user.userId, … }`. Senão devolve exatamente
   `resolveAccountingScope(user, unitId)`. **`resolveAccountingScope` não muda** (I-7: 214 chamadas). Só os
   handlers do alcance do F-GOV-7 usam o resolver novo. Na recomendação (a) são 7:
   `listPeriods` (`accountingController.ts:530`), `openPeriod` (`:588`), `reopenPeriod` (`:676`), `listReviews`
   (`accountingReviewController.ts:40`), `getReview` (`:55`), `signOffReview` (`:134`) e `rejectReview` (`:149`).
   Com a recomendação revisada (a+), entram mais 2 leituras do objeto assinado: `getDataExchangeJob` e
   `downloadDataExchangeArtifact` (`routes/accounting.ts:208,210`), somando 9.
6. **Convite (dono)** `POST /api/accounting/accountant-assignments`. Passos:
   1. Aplica `canManageAccountantAssignment`.
   2. Exige o contato no escopo (`requireContact`); senão 404.
   3. Busca o usuário do contador por `accountantEmail`. Se não existir, 400 `ACCOUNTANT_USER_NOT_FOUND`
      (depende do F-GOV-8).
   4. Recusa se o contador for o próprio dono: 400 `SELF_ASSIGNMENT`.
   5. Grava o snapshot `crcNumber`/`crcUf` do contato, que já vem normalizado pelo DTO do contato.
   6. **Dentro da tx:** se já existe `PENDING` no escopo, 409 `ASSIGNMENT_PENDING_EXISTS`. O slot unique é a
      rede, não a mensagem.
   7. Emite a auditoria `accountant_assignment.invited`.
7. **Aceite (contador)** `POST /api/accounting/accountant-assignments/:id/accept`. Passos:
   1. Busca por `id`. Se o ator não for o `accountantUserId`, responde 404, para não vazar que a atribuição
      existe.
   2. **Na mesma tx, nesta ordem:**
      1. Se há `ACTIVE` no escopo, faz CAS `ACTIVE → ENDED` com `activeUntil = now`,
         `endReason = 'SUPERSEDED'`, `endedById = ator`.
      2. Faz CAS `PENDING → ACTIVE` com `activeFrom = now`.
      A troca de contador acontece sem janela destravada.
   3. Emite as auditorias `accepted` (e `ended` do substituído). O serviço monta o `AccountingScope` a partir da
      linha: `ownerUserId = a.userId`, `unitId = a.unitId`, `actorUserId = contador`. O `AuditService.append`
      grava `scopeUserId = scope.ownerUserId` (`AuditService.ts:115,134`), então o evento cai na cadeia do dono.
8. **Encerramento** `POST /api/accounting/accountant-assignments/:id/end`. Passos:
   1. Recebe `reason` obrigatório.
   2. Aplica `canEndAssignment`. Se o ator não for nenhuma das duas partes, 404.
   3. Faz CAS `PENDING|ACTIVE → ENDED`. `activeUntil = now` só se a origem era `ACTIVE`.
   4. Emite `accountant_assignment.ended` com `endedBy: 'OWNER' | 'ACCOUNTANT'`, com o escopo montado a partir
      da linha, como no item 7.
9. **Listagens.** O dono usa `GET /api/accounting/accountant-assignments?unitId=` (histórico do escopo, do mais
   novo ao mais velho). O contador usa `GET /api/accounting/accountant-assignments/mine`, que devolve
   `PENDING`+`ACTIVE` com `ownerEmail`, para ele saber em que `unitId` agir. A rota `/mine` é registrada antes de
   qualquer `/:id`.
10. **Reabertura: os dois caminhos passam pelo mesmo gate** (lacuna 1 da decisão 15). O `PeriodService` recebe
    o repo de atribuição.
    - `reopenPeriod` e `openPeriod` **quando `fromStatus === 'SOFT_CLOSED'`**: preflight
      `canReopenPeriod(scope, active)`, depois releitura de `active` **com `tx`** dentro do `runTransaction`,
      antes do `setStatus`. Se falhar, `AccountantRequiredError` (403 `ACCOUNTANT_REQUIRED`).
    - `openPeriod` a partir de `FUTURE` continua em `canClosePeriod` (I-14). **Efeito declarado do resolver
      delegado:** o contador também consegue abrir um período `FUTURE` no livro do cliente, porque
      `canClosePeriod` é `!!actor`. Abrir `FUTURE` é rotina, então não há dano.
    - A auditoria de `period.reopened` e `period.opened` ganha `assignmentId`, quando há atribuição.
    - **Direto:** o gate vai dentro do `openPeriod`, sem proibir `SOFT_CLOSED` ali. Proibir mudaria o contrato
      da rota `/open` para quem a chama hoje. O mesmo gate nos dois caminhos fecha a lacuna sem mudar a API.
11. **`setStatus` passa a ser CAS** (I-6). Faz `updateMany` com `where status = fromStatus`; contagem 0 vira
    `ConflictError('PERIOD_STATUS_CHANGED')`; depois relê a linha. É o segundo invariante mutável do mesmo gate
    (o status do período). **Efeito colateral declarado:** vale para as 4 transições, porque todas já passam
    `fromStatus`. É menos código do que restringir o CAS só à reabertura.
12. **Assinatura e rejeição da revisão** (`AccountingReviewService`). O serviço recebe o repo de atribuição.
    - `signOff` e `reject`: preflight `canSignOffReview(scope, active)`, depois re-checagem **dentro** da tx que
      já existe (`:363`, ao lado da releitura de achados) e da tx do `reject`.
    - Se houver `active`, aplica a regra do F-GOV-9.
    - A auditoria de `review.signed_off` e `review.rejected` ganha `assignmentId`.
13. **Erro nomeado** `AccountantRequiredError extends AppError` (403, `ACCOUNTANT_REQUIRED`) em `lib/errors.ts`,
    no padrão do `:137`. A mensagem diz que existe contador responsável ativo e que só ele reabre ou assina.
14. **Controller, rotas e docs.** Criar `controllers/accountantAssignmentController.ts` com 5 handlers.
    Registrar em `routes/accounting.ts` e em `routes/docs.paths.ts` (4 paths novos). Subir o `BASELINE` do
    `openapi-paths.test.ts:97` em +4 e regenerar o `public/openapi.json` commitado (memória
    `openapi-wiring-static-artifact`). Os 7 handlers do item 5 passam a `await` o resolver novo.
15. **Factory.** Adicionar `getAccountantAssignmentService()`. Injetar o repo novo no `PeriodService` e no
    `AccountingReviewService`. `buildActivationPeriodPort` (`factory.ts:318`) só muda na assinatura do
    construtor.
16. **Auditoria.** Entra na allowlist do `auditCanonical.ts` **na mesma mudança**:
    - `accountant_assignment.invited`: `['assignmentId','accountingContactId','crcNumber','crcUf']`, espelhando
      `contact.registered` (`:173`), que já expõe o CRC.
    - `accountant_assignment.accepted`: `['assignmentId','supersededAssignmentId']`.
    - `accountant_assignment.ended`: `['assignmentId','fromStatus','endedBy','reason']`. `reason` entra também em
      `MASKABLE_FREE_TEXT_KEYS` (`auditFreeTextMask.ts:48`).
    - `'assignmentId'` entra em `period.opened`, `period.reopened`, `review.signed_off` e `review.rejected`.
    - **Nunca** vão para o payload: e-mail, nome ou CPF (D5).
    - Precisa de prova (I): chave nova na allowlist não muda o hash de evento antigo, porque o evento antigo não
      tem a chave. O item 17i verifica.
17. **Testes** (unit com dublês; integração com `npm run test:integration`, `--runInBand`):
    a. **Matriz da policy:** 3 atores (dono sem atribuição; dono com atribuição ativa; contador delegado) × 7
       ações (reabrir, assinar, rejeitar, fechar, configurações, perfil fiscal, imobilizado). As 4 últimas ficam
       **iguais a hoje** para o dono com atribuição ativa. Isso trava a família I-3.
    b. **Reabertura, cada caminho com a própria mordida:** `reopenPeriod` **e** `openPeriod(SOFT_CLOSED)`, cada
       um com 3 casos: dono sem atribuição dá 200 (F-GOV-4 a); dono com atribuição dá 403
       `ACCOUNTANT_REQUIRED`; contador delegado dá 200. Apagar o gate de **qualquer um** dos caminhos tem de
       derrubar um teste (memória `authoritative-gate-inside-tx`: o gate do update do #184 sobreviveu à suíte).
       `openPeriod(FUTURE)` não é afetado.
    c. **Gate dentro da tx, nas duas direções:**
       - Um dublê do repo devolve `null` no preflight e `ACTIVE` na releitura com `tx`. O dono recebe 403.
       - Um dublê devolve `ACTIVE` no preflight e `null` na releitura (a atribuição foi encerrada no meio). O
         contador, com escopo delegado, recebe 403. Este caso mata o fallback sem `owner === actor` (item 4).
       Testes determinísticos, não de concorrência (memória `windows-serializa-sqlite-ci-linux-nao`).
    d. **CAS do período:** o status muda entre a leitura e a escrita e o resultado é 409
       `PERIOD_STATUS_CHANGED`. Um `HARD_CLOSED` nunca volta a `OPEN`.
    e. **Revisão:** a mesma matriz do (b) para `signOff` e `reject`, mais o re-check dentro da tx e o caso do
       F-GOV-9.
    f. **Atribuição:**
       - Convite: contato de outro escopo dá 404; e-mail inexistente dá 400; autoatribuição dá 400; `PENDING`
         duplicado dá 409.
       - Aceite: ator que não é o contador dá 404; substituição encerra a anterior na mesma tx.
       - Encerramento: dono e contador conseguem; terceiro dá 404; `reason` vazio dá 400.
       - Integração: o slot unique segura 2 `ACTIVE` mesmo sem o check do serviço.
    g. **Resolver:** sem atribuição, o resultado é igual a `resolveAccountingScope`; `PENDING` e `ENDED` não
       delegam; `ACTIVE` delega só no `unitId` dela.
    h. **Integração ponta a ponta (supertest):** dono convida, contador aceita, dono tenta reabrir e recebe 403,
       contador reabre e recebe 200. A cadeia de auditoria tem `actor = contador` e `scopeUserId = dono`. Um
       usuário `ADMIN` sem atribuição recebe o próprio silo (I-9: prova o "bloqueio do operador do
       fornecedor").
    i. **Contratos:** teste de allowlist do `auditCanonical`, teste de contrato do `auditFreeTextMask` e
       verificação de uma cadeia gravada **antes** da mudança da allowlist.
18. **Gates do diff:**
    - `cd server && npx tsc --noEmit`, limpo. Em `services/__tests__/`, 15 arquivos citam `IAccountingPolicy`.
      Dois são literais tipados (`: IAccountingPolicy = {`) e quebram o tsc sem os métodos novos. Os que usam
      `as unknown as` não quebram o tsc, mas os que exercitam reabertura ou assinatura precisam dos métodos
      para o teste ter sentido.
    - `dtoShapeSnapshot`: `UPDATE_DTO_SNAPSHOT=1` e commitar o diff.
    - `openapi-paths` e `route-spec-wiring`, verdes.
    - Suíte unit + integração, verdes.

## 4. Contratos (esboço materializável)

### 4.1 DTOs (`dtos/AccountantAssignmentDto.ts`)

```ts
export const InviteAccountantSchema = z
  .object({
    unitId: z.string().min(1),
    accountingContactId: z.string().min(1),
    accountantEmail: z.string().trim().toLowerCase().email().max(254),
  })
  .strict();

export const ListAccountantAssignmentsQuerySchema = z.object({ unitId: z.string().min(1) }).strict();

// ✅ 02/10: F-GOV-8 (a) reforçada + F-GOV-11 (a) — sem responsibleFrom.
export const AcceptAccountantAssignmentSchema = z
  .object({
    declaresWrittenContract: z.literal(true),              // F-GOV-8: Res. CFC 1.590 arts. 1º/5º
  })
  .strict();

export const EndAccountantAssignmentSchema = z
  .object({ reason: z.string().trim().min(1).max(500) })
  .strict();

// Resposta (datas ISO; instantes, não date-only — ver 4.3)
export interface AccountantAssignmentView {
  id: string;
  unitId: string;
  status: 'PENDING' | 'ACTIVE' | 'ENDED';
  accountingContactId: string;
  accountantUserId: string;
  crcNumber: string; // snapshot normalizado (parseCrcNumber)
  crcUf: string;
  activeFrom: string | null;
  activeUntil: string | null;
  endReason: string | null;
  createdAt: string;
}
export interface MyAccountantAssignmentView extends AccountantAssignmentView {
  ownerEmail: string;
}
```

O `SignOffReviewSchema` **não muda de forma** (`AccountingReviewDto.ts:135-152`). O F-GOV-9 muda só a regra do
serviço.

### 4.2 Policy, repositório e resolver

```ts
// policies/IAccountingPolicy.ts (+)
export interface ActiveAccountant {
  id: string;
  ownerUserId: string;       // = AccountantAssignment.userId
  unitId: string;
  accountantUserId: string;
  crcNumber: string;         // snapshot normalizado
}
canManageAccountantAssignment(scope: AccountingScope): boolean;
canRespondToAssignment(actorUserId: string, a: { accountantUserId: string }): boolean;
canEndAssignment(actorUserId: string, a: { userId: string; accountantUserId: string }): boolean;
// active ? (actor === active.accountantUserId && owner === active.ownerUserId)
//        : (owner === actor && canClosePeriod(scope))            — item 4
canReopenPeriod(scope: AccountingScope, active: ActiveAccountant | null): boolean;
// idem, fallback owner === actor && canManage(scope)
canSignOffReview(scope: AccountingScope, active: ActiveAccountant | null): boolean; // assinatura muda

// repositories/IAccountantAssignmentRepository.ts
export interface IAccountantAssignmentRepository {
  findActive(scope: AccountingScope, tx?: Prisma.TransactionClient): Promise<ActiveAccountant | null>;
  findPending(scope: AccountingScope, tx?: Prisma.TransactionClient): Promise<AccountantAssignment | null>;
  findActiveForAccountant(accountantUserId: string, unitId: string): Promise<ActiveAccountant | null>;
  findById(id: string, tx?: Prisma.TransactionClient): Promise<AccountantAssignment | null>;
  listByScope(scope: AccountingScope): Promise<AccountantAssignment[]>;
  listLiveForAccountant(accountantUserId: string): Promise<Array<AccountantAssignment & { ownerEmail: string }>>;
  create(data: NewAssignment, tx: Prisma.TransactionClient): Promise<AccountantAssignment>;
  /** CAS: where { id, status: from } — 0 linhas → ConflictError('ASSIGNMENT_STATUS_CHANGED'). */
  transition(id: string, from: AssignmentStatus, to: AssignmentStatus,
             patch: TransitionPatch, tx: Prisma.TransactionClient): Promise<AccountantAssignment>;
  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}

// services/AccountantAssignmentService.ts
resolveGovernanceScope(user: { userId: string }, unitId: string): Promise<AccountingScope>;
invite(scope, dto: InviteAccountantInput): Promise<AccountantAssignment>;
accept(actorUserId: string, id: string): Promise<AccountantAssignment>;
end(actorUserId: string, id: string, dto: EndAccountantAssignmentInput): Promise<AccountantAssignment>;
listByScope(scope): Promise<AccountantAssignment[]>;
listMine(actorUserId: string): Promise<MyAccountantAssignmentView[]>;
```

### 4.3 Prisma (migração aditiva)

```prisma
model AccountantAssignment {
  id                  String            @id @default(cuid())
  userId              String            // dono do escopo (ownerUserId)
  user                User              @relation("AssignmentOwner", fields: [userId], references: [id], onDelete: Restrict)
  unitId              String
  accountantUserId    String            // login do contador
  accountant          User              @relation("AssignmentAccountant", fields: [accountantUserId], references: [id], onDelete: Restrict)
  accountingContactId String            // fonte do CRC e do J930 (signatário 900)
  accountingContact   AccountingContact @relation(fields: [accountingContactId], references: [id], onDelete: Restrict)
  crcNumber           String            // snapshot na criação (I-11) — imutável na linha
  crcUf               String            // snapshot
  status              String            // PENDING | ACTIVE | ENDED (ASSIGNMENT_STATUSES)
  activeSlot          String?           // 'ACTIVE' enquanto ACTIVE, senão NULL — unique abaixo
  pendingSlot         String?           // 'PENDING' enquanto PENDING, senão NULL
  activeFrom          DateTime?         // instante do aceite
  activeUntil         DateTime?         // instante do encerramento
  createdById         String
  endedById           String?
  endReason           String?
  createdAt           DateTime          @default(now())
  updatedAt           DateTime          @updatedAt
  deletedAt           DateTime?         // contrato §2; nenhuma rota apaga — histórico encerra, não some

  @@unique([userId, unitId, activeSlot])   // NULL distinto no SQLite (precedente I-12)
  @@unique([userId, unitId, pendingSlot])
  @@index([accountantUserId, status])
  @@map("accountant_assignments")
}
// User: + assignmentsOwned AccountantAssignment[] @relation("AssignmentOwner")
//       + assignmentsAsAccountant AccountantAssignment[] @relation("AssignmentAccountant")
// AccountingContact: + accountantAssignments AccountantAssignment[]
```

**Direto:**
- **FK Restrict nos dois `User`.** A atribuição é trilha de responsabilidade; apagar usuário não pode levá-la
  junto (memória `audit-log-no-fk-cascade`).
- **Vigência em instantes, não em datas.** Evita as duas classes de bug de date-only registradas
  (`date-only-regex-nao-valida-calendario`, `date-only-rendering-utc-shift-class-bug`).
- ~~Qual atribuição governa: a ativa no momento da ação.~~ **Retirado do "direto" em 29/09, depois da pesquisa
  legal (§5.1).** O Manual da ECD e a Res. CFC 1.590 amarram a responsabilidade ao **período**, não ao momento
  da ação. A escolha virou o fork **F-GOV-11**. Se a recomendação (b) for aceita, o model ganha
  `responsibleFromYear`/`responsibleFromMonth`, declarados no aceite.
- **FK para o contato mais snapshot do CRC**, em vez de CRC digitado de novo (PRE-ADR §3.1). O contato já é a
  fonte canônica do J930 (`contactToJ930Signer`). Digitar de novo cria duas verdades. O snapshot existe porque o
  contato é editável (I-11) e a vigência pede histórico.

### 4.4 Rotas

| Método | Path | Quem | Resolver |
|---|---|---|---|
| POST | `/api/accounting/accountant-assignments` | dono | padrão |
| GET | `/api/accounting/accountant-assignments?unitId=` | dono | padrão |
| GET | `/api/accounting/accountant-assignments/mine` | contador | nenhum (por `actorUserId`) |
| POST | `/api/accounting/accountant-assignments/:id/accept` | contador | nenhum (pela linha) |
| POST | `/api/accounting/accountant-assignments/:id/end` | dono ou contador | nenhum (pela linha) |
| GET/POST | os 7 handlers do item 5 (9 com o F-GOV-7 a+) | dono ou contador | **delegado** |

## 5. Forks — ✅ RATIFICADOS 2026-10-02 (escolhas e efeitos em §5.3)

As decisões de 29/09 não cobrem estes cinco. A leitura do código mostrou que o desenho não fecha sem eles.
**Em 29/09 o dono pediu que eles fossem ancorados na lei antes de qualquer ratificação.** A coluna "O que a lei
diz" cita a fonte (§5.1). "A lei decide" quer dizer que um caminho fica sem base legal. "A lei deixa aberto" quer
dizer que mais de um caminho é compatível com a lei, e a escolha é de produto.

| Ref | Pergunta | (a) | (b) | (c) | O que a lei diz | Recomendação |
|---|---|---|---|---|---|---|
| **F-GOV-7** | O que o contador alcança nos livros do cliente | **Mínimo de governança:** ler períodos e revisões; reabrir; assinar e rejeitar (7 handlers, item 5) | **O C11 inteiro:** (a) mais abrir revisão, lançar e resolver achado e fazer lançamento de ajuste no livro do cliente | **O módulo inteiro:** `resolveAccountingScope` passa a ser assíncrono e a consultar a atribuição (214 chamadas) | **Deixa aberto.** A escrituração é "atribuição e responsabilidade exclusivas" do contador (ITG 2000 item 12; CC art. 1.182). O cliente pode executar parte do serviço se o contrato disser (NBC PG 01 item 10), e o lançamento de preposto vale como do preponente (CC art. 1.177). **Mas** o contador não pode assinar o que não passou pela orientação, supervisão ou revisão dele (NBC PG 01 5c) e deve se munir de documentos antes de opinar (4j). Em (a), o **objeto assinado** (o par ECD/ECF da revisão) fica fora do alcance do contador dentro do app | **Muda para (a+):** (a) mais leitura dos jobs do par em revisão, com `getDataExchangeJob` e `downloadDataExchangeArtifact` (`routes/accounting.ts:208,210`) em escopo delegado, somando 9 handlers. Assim ele assina o que consegue ler. Continua sem escrever no razão e sem ligar a SoD (`EntryApprovalService.ts:230`). O "login do contador que cresce o C11" (b) segue como próximo incremento |
| **F-GOV-8** | Como o dono aponta o contador, e se o contador precisa aceitar | **E-mail de usuário existente + aceite do contador** (`PENDING → ACTIVE`, item 7) | E-mail de usuário existente, ativo na criação | Convite por token enviado por e-mail (fluxo novo) | **Decide contra (b).** A relação nasce de "aceitação formal da proposta" e de contrato escrito, que "comprova a extensão e os limites da responsabilidade técnica" (Res. CFC 1.590 arts. 1º e 5º; NBC PG 01 item 9). Um meio eletrônico fora da ICP-Brasil só vale entre as partes "desde que admitido pelas partes como válido" (MP 2.200-2 art. 10 § 2º). Base LGPD para os dados do contador: execução de contrato a pedido do titular (art. 7º V), limitada ao necessário (art. 6º III) | **(a) reforçada:** no aceite, o contador também declara que existe contrato escrito de prestação de serviços (`declaresWrittenContract: z.literal(true)`). A declaração é o gancho para a Res. 1.590 e para o § 2º da MP. Sem aceite, o sistema imputa responsabilidade técnica sem a aceitação que a norma exige |
| **F-GOV-9** | Com atribuição ativa, de onde vêm o nome e o CRC do sign-off | **O `reviewerCrc` digitado tem de bater com o CRC da atribuição** (os dois normalizados); se divergir, 400 `REVIEWER_CRC_MISMATCH`. O nome continua digitado | O servidor preenche nome e CRC a partir da atribuição e o DTO passa a recusar os campos (**quebra o contrato** do FE-INCR-REVIEW, #436) | Só o gate de ator muda; os campos continuam livres | **Decide contra (c).** O contador deve "informar o número de registro, o nome e a categoria profissional após a assinatura em trabalho de contabilidade" (NBC PG 01 4r). A profissão só se exerce com registro no CRC (DL 9.295 art. 12). Em (c), o contador assina com o CRC de outra pessoa. **(a) e (b) cumprem a norma** | **(a) mantida.** Fecha o CRC arbitrário (I-5) sem quebrar a tela do #436. (b) é a forma mais fiel à norma (o CRC é do signatário por construção) e fica como evolução quando a FE for refeita |
| **F-GOV-10** | O dono pode encerrar a atribuição sozinho? | **Sim.** Motivo obrigatório; o encerramento fica na trilha (`accountant_assignment.ended`) | Só com a concordância do contador | Encerrar vale só depois de N dias (aviso prévio) | **Decide contra (b).** Qualquer das partes pode resolver o contrato sem prazo, "a seu arbítrio, mediante prévio aviso" (CC art. 599). O contador renuncia "respeitando os prazos estabelecidos em contrato" (NBC PG 01 4k). O distrato é obrigatório e fixa a cessação das responsabilidades (Res. CFC 1.590 art. 6º); o prazo do aviso é cláusula de contrato (art. 2º "l"). **Entre (a) e (c), a lei deixa aberto:** o prazo é contratual, e o sistema não enxerga o contrato | **(a) mantida.** (c) prende no sistema um prazo que só o contrato conhece. **O risco declarado antes (o dono encerra e depois reabre) fica pequeno com o F-GOV-11 (b):** encerrar deixa de destravar os períodos que o contador cobriu |
| **F-GOV-11** *(novo; era "direto" em §4.3)* | Quem reabre um período que esteve sob a responsabilidade de um contador | **A atribuição ativa agora governa tudo:** o contador ativo reabre qualquer período `SOFT_CLOSED`. Sem ativo, o dono reabre tudo (F-GOV-4 a) | **Cada período fica com o contador que respondia por ele:** no aceite, o contador declara o início da responsabilidade (`responsibleFrom` ano/mês). O ativo reabre só a partir daí. Um período coberto por um contador **anterior** não reabre mais e é corrigido por lançamento extemporâneo (ITG 2000 item 36). Um período que nenhum contador cobriu segue o F-GOV-4 (a) | — | **Aponta para (b).** Na mudança de contador no meio do período, "o período da escrituração pode ser fracionado para que cada contabilista assine o período pelo qual é responsável técnico" (Manual ECD Leiaute 9, maio/2026, p. 12). Por padrão, as demonstrações e as obrigações acessórias do período ficam com o contador que sai, "salvo disposição expressa em contrário no distrato" (Res. CFC 1.590 art. 9º § único e art. 10). Na substituição de ECD, quem não assina a nova pode se manifestar sobre as mudanças (IN RFB 2.003 art. 8º § 3º). O contador também deve se abster de opinar no trabalho de outro contador sem ter sido contratado para isso (NBC PG 01 4h) | **(b).** Segue o padrão da norma e deixa o contrato de cada caso fixar a fronteira, pelo `responsibleFrom` declarado. Nunca trava correção: o extemporâneo em período `OPEN` continua disponível, e é o caminho que o C11 já escolheu (F-C11-4 a). **Custo:** `canReopenPeriod` passa a receber o período e a cobertura (§4.2 muda). Aceite ganha 2 campos. O teste 17b ganha o caso "período do contador anterior dá 403 mesmo sem atribuição ativa" |

### 5.1 Base legal consultada em 29/09

Todas as fontes foram baixadas nesta sessão, e o texto foi lido no arquivo, não em resumo de busca. Coluna
`sha256`: os 12 primeiros hex do arquivo baixado, para reconferir se o órgão reeditar (padrão do `MANIFEST.md`
do corpus). Grau: todas **V**, lidas.

| Fonte | Dispositivos usados | URL | sha256 (12) |
|---|---|---|---|
| Código Civil, Lei 10.406/2002 (compilada) | arts. 599; 1.169; 1.177; 1.178; 1.179 § 2º; 1.182; 1.183 | planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm | `00a0b585843c` |
| Decreto-Lei 9.295/1946 | arts. 12, 25, 26 | planalto.gov.br/ccivil_03/decreto-lei/del9295.htm | `cc3c15e7e0b5` |
| MP 2.200-2/2001 | art. 10 §§ 1º e 2º | planalto.gov.br/ccivil_03/mpv/antigas_2001/2200-2.htm | `81399b8ed0d2` |
| Lei 14.063/2020 | arts. 1º, 2º, 4º (o capítulo da classificação trata de interação com ente público; para o atestado interno vale a MP 2.200-2 art. 10 § 2º) | planalto.gov.br/ccivil_03/_ato2019-2022/2020/lei/l14063.htm | `5ec86bd567bd` |
| LGPD, Lei 13.709/2018 (compilada) | arts. 6º (III, VII) e 7º (V) | planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm | `fdc6f222d95c` |
| LC 123/2006 | arts. 26 § 2º, 27, 68 | planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm | `f3daaf2efcd0` |
| Res. CFC 1.590/2020 (contrato e distrato) | arts. 1º a 10 | www1.cfc.org.br/sisweb/SRE/docs/RES_1590.pdf | `ecaa931e8404` |
| NBC PG 01 (Código de Ética, 2019) | itens 4 (h, j, k, l, r), 5 (c, r), 6 (b, c), 9, 10 | www1.cfc.org.br/sisweb/SRE/docs/NBCPG01.pdf | `cb3ca0a1aca8` |
| ITG 2000 (R1) — Escrituração Contábil | itens 10, 12, 13, 31–36 | www1.cfc.org.br/sisweb/SRE/docs/ITG2000(R1).pdf | `6b4355f83fb7` |
| Manual da ECD, Leiaute 9 (ADE Cofis 01/2026, **atualização maio/2026**) | p. 12 (mudança de contador), p. 18 e 20 (assinatura: e-CPF do contador obrigatório) | sped.rfb.gov.br/arquivo/download/7990 | `bc63f0a893ce` |
| IN RFB 2.003/2021 | art. 8º §§ 2º e 3º; parágrafo único do art. 2º (assinatura ICP-Brasil) | corpus `docs/accounting/fontes-oficiais/IN-RFB-2003-2021-ECD.txt:17,97-99` | (versionado) |

### 5.2 O que a pesquisa diz sobre forks já ratificados (registro; nada reabre sozinho)

- **F-GOV-3 (a)** é compatível com a lei **sob uma condição**: o operador do salão lança, e isso vale porque o
  assento de preposto vale como do preponente (CC art. 1.177). A parte do serviço feita pelo cliente precisa estar
  **explícita na proposta e no contrato** (NBC PG 01 item 10). Para vender "com contador incluso", o contrato-modelo
  tem de trazer essa cláusula (§7).
- **F-GOV-4 (a)** tem uma **tensão**, não um conflito. A lei não manda o software travar. Mas, sem atribuição, o
  sign-off do C11 continua aceitando qualquer nome e CRC digitados. Isso registra um atestado profissional sem
  profissional identificado. O Código de Ética obriga o contador, não quem usa o sistema, e pressupõe que a
  assinatura acompanhada de CRC é ato do próprio contador (NBC PG 01 4r). Além disso, só o pequeno empresário é dispensado
  da escrituração (CC art. 1.179 § 2º; LC 123 art. 68: empresário individual até o teto do MEI). Uma ME/EPP do
  Simples continua obrigada à escrituração (a LC 123 art. 27 só a simplifica), e o CC art. 1.182 põe essa
  escrituração sob responsabilidade de contabilista. **Se o dono quiser reabrir**, o caminho é um fork próprio:
  "sign-off exige atribuição ativa, a reabertura continua pelo F-GOV-4 (a)". Não está aberto aqui.
- **F-GOV-5 (a)** não conflita: a lei exige o registro para exercer (DL 9.295 art. 12), não que o software o
  confira. A conferência é o F-V1, depois do M2.

### 5.3 RATIFICAÇÃO — 2026-10-02 (dono, questionário; pedido: *"rodada de ratificação por questionário dos forks pendentes"*)

| Fork | Escolha do dono | Contra a recomendação? | Efeito no BRIEF |
|---|---|---|---|
| F-GOV-7 | (a+) mínimo de governança + leitura do objeto assinado (9 handlers) | não | item 5: os 9 handlers, incluindo `getDataExchangeJob` e `downloadDataExchangeArtifact` em escopo delegado; sem escrita no razão |
| F-GOV-8 | (a) reforçada: e-mail de usuário existente + aceite + `declaresWrittenContract: true` | não | itens 6–7; §4.1 `AcceptAccountantAssignmentSchema` só com a declaração |
| F-GOV-9 | (a) o `reviewerCrc` digitado tem de bater com o da atribuição | não | item 12: 400 `REVIEWER_CRC_MISMATCH`; o DTO do #436 não muda |
| F-GOV-10 | (a) o dono encerra sozinho, com motivo obrigatório | não | item 8 como escrito |
| **F-GOV-11** | **(a) a atribuição ativa governa tudo** | **SIM** | ver abaixo |

**Efeitos do F-GOV-11 (a):**

- **Item 4:** o bloco "Se o F-GOV-11 for (b)" **sai**. `canReopenPeriod(scope, active)` mantém a assinatura de §4.2,
  sem período nem cobertura.
- **Item 7 e §4.3:** o aceite não ganha `responsibleFromYear`/`responsibleFromMonth`, e o model não ganha colunas de
  cobertura.
- **Item 17b:** sai o caso "período do contador anterior dá 403 sem atribuição ativa". Os 3 casos por caminho ficam
  como escritos.
- **Risco que volta:** o contador ativo reabre qualquer `SOFT_CLOSED`, incluindo período assinado por um contador
  anterior. Sem atribuição ativa, o dono reabre tudo. Isso inclui encerrar a atribuição (F-GOV-10 a) e reabrir em
  seguida. A trilha registra (`accountant_assignment.ended` + `period.reopened` com o ator), mas não impede.
- **Tensão com a norma:** a regra "cada contador assina o seu período" (Manual ECD L9 p. 12; Res. CFC 1.590 art. 9º
  § único e art. 10) fica **fora do sistema**. Ela passa a valer pelo contrato e pelo distrato, e pelo e-CPF na ECD.
  Não é conflito de lei: a norma obriga o contador, não o software.
- **Para reabrir:** o caminho é o (b) desta tabela de forks, com `responsibleFrom` no aceite. Até lá, o F-GOV-1
  (CRC-SP) e a revalidação do contador (§7) podem trazer o motivo.

## 6. Fora deste BRIEF (decidido) e compatibilidade exigida

- **Política versionada** (`AccountingPolicyVersion`, F-GOV-6 b): vai em incremento próprio. As configurações da
  família I-3 continuam com o operador até lá. É esse incremento que entrega a "aprovação do contador" citada no
  F-PC-1 (b) e no F-PC-2 (b) do plano pós-contador (linhas 79–80).
- **Consulta ao CFC** (F-V1 c): só depois do M2. **Compatibilidade exigida:** o status do CFC mora no
  `AccountingContact` (BRIEF CRC-CFC, item 2) e a atribuição aponta para o contato (§4.3). Nada neste desenho
  bloqueia o F-V2 (a), o F-V3 (b) ou o F-V4 (a).
- **FE:** telas de convite, aceite e encerramento, e o tratamento de `ACCOUNTANT_REQUIRED` e
  `REVIEWER_CRC_MISMATCH` nas telas de período e revisão. É nó vizinho (`FE-INCR-*`), com BRIEF e autorização
  próprios. Até a FE existir, a tela de revisão do #436 mostra 403/400 genérico ao dono com atribuição ativa.

## 7. Pendente de validação externa

- **F-GOV-1**: consulta ao CRC-SP sobre a linha software × serviço contábil. É do dono, fora do código. Cruza com
  [[Z0-a]] ("assina sob condições"). A resposta pode reabrir o F-GOV-10.
- **O contador não revalidou este desenho.** Ele respondeu ao item 0 em 23/09, antes do PRE-ADR. Falta saber se
  assinatura interna + trilha satisfazem o que ele pediu. O `luminaris-contador-liaison` pode montar a pergunta;
  o dono envia.
- **Valor da assinatura interna:** é atestado interno, não assinatura legal. A legal é o e-CPF do contador na
  ECD (Manual ECD L9, p. 18) e a assinatura digital dos livros (ITG 2000 item 10a). Entre as partes, o atestado
  interno vale se admitido por elas (MP 2.200-2 art. 10 § 2º), e por isso o aceite do F-GOV-8 importa. Tratar
  como fato consumado exige a leitura do contador.
- **Revisão do C11 é "revisão de escritas"?** O DL 9.295 art. 25 alínea "c" lista a "revisão permanente ou
  periódica de escritas", e o art. 26 torna a alínea "c" privativa de contador diplomado, ressalvados direitos
  adquiridos. Se a revisão do C11 se enquadra, o sign-off seria do contador, não do técnico em contabilidade, e a
  atribuição precisaria registrar a categoria. **Inferência (I), não decisão:** a pergunta vai ao contador ou ao
  CRC-SP junto com o F-GOV-1.
- **Contrato-modelo "com contador incluso":** precisa da cláusula do que o cliente executa (NBC PG 01 item 10;
  Res. CFC 1.590 art. 2º "c"), da carta de responsabilidade da administração anual (Res. 1.590 arts. 2º "j" e 3º)
  e do prazo de aviso prévio (art. 2º "l"). É documento do dono com o contador, não código.

## 8. Insumos ausentes

- O texto integral da resposta do contador ao item 0 (23/09) não foi relido. Este BRIEF se apoia no resumo do
  PRE-ADR §5. Pedir a leitura não foi necessário para desenhar, mas é necessário para o item 2 de §7.

## 9. Achados fora de escopo (não planejados)

- **`POST /periods/:id/open` lê `unitId` de `req.body` sem DTO Zod** (`accountingController.ts:592`), contra o
  Contrato §2. O item 5 troca só o resolver ali.
- **`reopen` aceita `reason` opcional** (`PostingDto.ts:312-318`). Para governança, motivo obrigatório na
  reabertura faria sentido, mas isso não foi ratificado.
- **`ReopenPeriodSchema` exige `periodId` no corpo, mas o controller usa `req.params.id`** (`:685`). O campo do
  corpo é aceito e ignorado (memória `param-aceito-e-ignorado-e-bug`).
- **Errata do PRE-ADR** (I-1, I-10): este BRIEF registra a correção. Aplicar no PRE-ADR é um fold separado, porque
  a regra 1 desta sessão proíbe editar doc de outro item.
- **O Manual da ECD foi reeditado depois do corpus.** O `MANIFEST.md` registra a "Atualização: janeiro de 2026"
  (2.971.696 bytes, sha `7ddf47755f61`). A mesma URL serviu em 29/09 a "Atualização: maio de 2026" (2.990.432
  bytes, sha `bc63f0a893ce`). Números de página citados em outros BRIEFs a partir da versão de janeiro precisam ser
  reconferidos. O procedimento está no `LEIA-ME.md` do corpus (`--forcar`).
  **Dono, 29/09: o corpus fica em janeiro/2026 por enquanto, porque a versão nova está fora do ar.** As citações
  "maio/2026, p. 12/18/20" deste BRIEF vêm de uma cópia baixada às 12h42 de 29/09, que está fora do git. Falta
  conferir se o trecho da p. 12 (mudança de contador) existe igual na versão de janeiro.
- **Carta de responsabilidade da administração:** o contratante deve entregá-la ao contador todo ano, para o
  encerramento do exercício (Res. CFC 1.590 art. 3º). O sistema não a registra. Poderia ser pré-condição do
  sign-off anual do C11, mas isso não está ratificado.
- **Equipe do contador:** o contador pode transferir parcialmente a execução mantendo a responsabilidade técnica
  (NBC PG 01 6c). O preposto não se faz substituir sem autorização escrita (CC art. 1.169). Hoje a atribuição é um
  login só; a equipe dele é frente nova.
