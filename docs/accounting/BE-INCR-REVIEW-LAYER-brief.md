# BRIEF — BE-INCR-REVIEW-LAYER (nó C11 · revisão profissional editável)

> **Estado: BRIEF pronto, 6 forks `RATIFICAÇÃO PENDENTE` (§3).** Nenhuma linha de código nasce deste
> documento antes da ratificação. Escrito em `sessao-planejamento` (2026-09-14, passo 3 de
> `PROXIMOS-PASSOS-2026-09-14.md`).

---

## Contexto fixo (não rediscutir)

- **Item a planejar:** nó **C11** do `GRAFO-DEPENDENCIAS-2026-09-11.md` (§1 linha C11; §4 fila item 6):
  *"Revisão profissional **editável**: o profissional edita o **DADO** ou lança **acerto** e o sistema
  **regera** — nunca o arquivo (F-EDIT-1 → a+c). Trilha de quem editou o quê."* Master map §7.1 linha
  Contábil: *"+3: revisão profissional editável (resposta 2 + F-EDIT-1 → a+c)"*.
- **Autorização:** `CEDULA-DECISAO-2026-09-10-entrevista.md` resposta **2** (*"O profissional assina e
  verifica as etapas automatizadas, podendo editar após a geração"* → *"Nó NOVO … camada de revisão
  profissional com edição pós-geração + trilha de quem editou o quê"*) e fork **F-EDIT-1 ✅ RATIFICADO
  (a)+(c)** na mesma cédula (§3): *"edita o dado ou lança o acerto, e o sistema regera; o arquivo gerado
  nunca é editado à mão."* Sessão de planejamento autorizada por `PROXIMOS-PASSOS-2026-09-14.md` passo 3
  (cédula `CEDULA-DECISAO-2026-09-14-forks-ratificacoes.md`, "BRIEFs C11/C12/C6b"). **Cobre exatamente
  o BRIEF; não cobre implementação** (exige "executa" do dono após ratificar §3).
- **Insumos existentes (lidos nesta sessão):**
  - `docs/accounting/CEDULA-DECISAO-2026-09-10-entrevista.md` — respostas 1 (determinística), 2, 3
    (identidade com máscara → C12) e F-EDIT-1.
  - `docs/accounting/BE-INCR-CONTADOR-DELIVERY-brief.md` + `server/prisma/schema.prisma`
    (`model AccountingDeliveryLog`): entrega = par de jobs ECD/ECF com hash copiado do job (F-CD6-a),
    exige período **HARD_CLOSED** (F-CD7-a), `@@unique([ecdJobId, ecfJobId, contactId])`.
  - `server/src/features/accounting/services/PeriodService.ts:137-175` — `reopenPeriod` só de
    `SOFT_CLOSED`; **`HARD_CLOSED` é terminal** (lança `ValidationError`).
  - `server/src/features/accounting/services/PostingService.ts:286` (`postEntry`, gate de período
    aberto) e `:518` (`reverseEntry` — **copy-only**, idempotente, exige período da data de estorno
    aberto). Lançamento postado é imutável: não existe `updateEntry`.
  - `server/src/features/accounting/services/SpedGenerationService.ts:66` — geração ECD **sem gate de
    período** (D7); `year` é parâmetro transiente; identificação 0000/J930 vem do DTO por geração
    (`ADR-INCR-SPED-ECD-file-generation.md` §"Decisão", l.52).
  - `docs/adr/ADR-INCR-SPED-ECD-file-generation.md` l.163 — **fora do MVP:** retificação/substituição
    (`IND_FIN_ESC=1`, `COD_HASH_SUB`). Nenhum gerador emite retificadora hoje (grep
    `IND_FIN_ESC|RETIFICADORA|NUM_REC` em `features/accounting` = 0 ocorrências).
  - `server/src/features/accounting/audit/auditCanonical.ts` — allowlist de eventos (`entry.posted`,
    `entry.reversed`, `period.*`, `sped.ecd_generated`, `sped.ecf_generated`, `delivery.*`).
  - `docs/accounting/fontes-oficiais/IN-RFB-2003-2021-ECD.txt` art. 8º (substituição só quando o erro
    **não** cabe em lançamento extemporâneo; Termo de Verificação assinado pelo profissional; prazo até
    a ECD do ano subsequente) e `IN-RFB-2004-2021-ECF.txt` art. 7º (retificadora substitui
    integralmente; §3º retificar anos posteriores se muda Parte B).
- **Nós vizinhos no grafo:** consome geração SPED ✅ (ECD #62, ECF #78, ECF Real #263), `PostingService`
  ✅ (acerto), C6 ✅ #305 (o pacote entregue é o objeto revisado), C12 ⏳ (irmão desta rodada — **não** é dependência: a máscara de CRC já existe em
  `AccountingContact.model.ts`, #305). Consumido por: entrega C6 (se F-C11-3 → a), FE-INCR-REVIEW
  (fora deste BRIEF, regra "BE por padrão").

---

## 1. O que o nó é — e o que NÃO é

**É:** uma camada Prisma first-class (invariante legal — Contrato §2.1) que registra **a revisão de um
pacote gerado** por um profissional identificado, os **achados** dele, a **resolução** de cada achado por
um dos dois caminhos ratificados — (a) edição de **dado-fonte** pelos serviços existentes, (c)
**lançamento de acerto** (extemporâneo) via `PostingService` — a **regeração** obrigatória depois, e o
**sign-off** com trilha de quem fez o quê. O arquivo `.txt` gerado é **imutável** (F-EDIT-1 b vetado):
toda mudança nasce no dado e passa pelo gerador.

**Não é:** (1) edição de lançamento postado (imutável por desenho — o caminho é estorno + novo, dentro de
(c)); (2) ECD substituta / ECF retificadora (`IND_FIN_ESC=1`, `RETIFICADORA=S`) — fora do MVP do ADR-ECD e
sem gerador; entra em §6 como frente própria; (3) assinatura digital/e-CAC — sign-off aqui é
atestado interno com identidade (nome + CRC), não certificado; (4) UI — `FE-INCR-REVIEW` é incremento
irmão.

## 2. Checklist de comportamentos (numerado, cada um testável)

**Bloco A — entidade e ciclo de vida**

1. **`AccountingReview` é Prisma first-class**: `{ id, userId, unitId, ecdJobId?, ecfJobId?, year,
   status: OPEN | SIGNED_OFF | REJECTED, reviewerUserId, reviewerName, reviewerCrc?, openedAt, closedAt?,
   closeReason? }`. Pelo menos um dos jobs é obrigatório; ambos, quando presentes, do mesmo `year` e
   escopo (`findJobById(scope,id)` → `NotFoundError` cross-tenant, padrão C6). Teste: abrir com job de
   outro tenant → 404; sem job → 400.
2. **Uma revisão OPEN por par de jobs**: `@@unique([ecdJobId, ecfJobId])` com jobs opcionais →
   ver F-C11-5 (SQLite trata NULL como distinto no unique). Teste: 2ª abertura para o mesmo par → 409
   `REVIEW_ALREADY_OPEN` com o `reviewId` existente.
3. **Achado (`AccountingReviewFinding`)**: `{ id, reviewId, register (ex.: 'J150' | 'I200' | 'M300' |
   '0000' | 'J930'), locator (string livre ≤ 200: código de conta, nº do lançamento, linha), description
   (≤ 1000), severity: BLOCKER | NOTE, resolution?: DATA_EDIT | ADJUSTMENT_ENTRY | NO_ACTION,
   resolutionRef?: { targetType, targetId }, resolvedById?, resolvedAt?, createdById, createdAt }`.
   Teste: criar achado em revisão `SIGNED_OFF` → 409 `REVIEW_NOT_OPEN`.
4. **Resolver achado por (a) DATA_EDIT** = registrar o **ponteiro** para o dado editado pelos serviços
   existentes (`Account`, `ReferentialMapping`, `Counterparty`, DTO de geração), não um endpoint novo de
   edição — F-C11-2. `resolutionRef.targetType` ∈ enum fechado; `targetId` tem de existir no escopo
   (lookup por repositório do alvo; alvo inexistente → 400). Teste: `targetType='account'` com id de
   outro tenant → 400.
5. **Resolver achado por (c) ADJUSTMENT_ENTRY** = o serviço chama `PostingService.postEntry` com
   `sourceType: 'review_adjustment'`, `sourceId: findingId`, `postingDate` **em período OPEN** (F-C11-4) e
   histórico que referencia o achado (`"Acerto — revisão <reviewId>, achado <n>: <description>"`) —
   **mesma transação** grava o achado como resolvido com `resolutionRef = { 'journal_entry', entryId }`.
   Gate autoritativo (período) re-checado **dentro** da tx (`authoritative-gate-inside-tx`). Idempotência:
   segundo POST para o mesmo achado devolve o mesmo `entryId` (`findBySource('review_adjustment',
   findingId)`) — teste assere a **segunda** chamada.
6. **Estorno dentro de (c)**: se o achado aponta um lançamento (`register='I200'`, `locator=entryId`),
   o corpo pode pedir `reverseOriginal: true` → `PostingService.reverseEntry` + novo lançamento, ambos
   ligados ao achado (dois `resolutionRef`? → **não**: `resolutionRef` aponta o **novo** lançamento; o
   estorno já carrega `entry.reversed` com `originalId`/`reversalId` — trilha existente basta).
7. **NO_ACTION** exige `resolutionNote` (≤ 500) — achado descartado sem justificativa é 400.
8. **Regeração obrigatória antes do sign-off (staleness)**: sign-off só se, para cada job da revisão,
   `job.createdAt > max(finding.resolvedAt)` **e** nenhum `BLOCKER` sem resolução. Caso contrário 409
   `REVIEW_STALE` listando os achados posteriores ao job. A regeração é o fluxo existente
   (`POST /sped/ecd`, `/sped/ecf`) — a revisão **troca** `ecdJobId`/`ecfJobId` pelo job novo via
   `PATCH /reviews/:id/jobs` (F-C11-6 diz se o par antigo fica na trilha).
9. **Sign-off**: `POST /reviews/:id/sign-off` com `{ reviewerName, reviewerCrc, statement }` →
   `SIGNED_OFF`, `closedAt`. `reviewerCrc` valida pelo **canônico já existente** `CRC_NUMBER_RE` +
   `normalizeCrcNumber` (`server/src/features/accounting/models/AccountingContact.model.ts:57-71`, #305) —
   reuso, nunca regex nova. Teste: CRC fora da máscara → 400 nomeado.
10. **Rejeição**: `POST /reviews/:id/reject` `{ reason }` → `REJECTED` (o pacote não deve ser entregue).
11. **Imutabilidade**: revisão e achados **não têm DELETE** (trilha legal — mesma classe de
    `audit_events`/`accounting_delivery_logs`); FK ao `User` **sem cascade** (`onDelete: Restrict`,
    memória `audit-log-no-fk-cascade`). Teste-guarda: apagar o usuário com revisão → falha de FK.

**Bloco B — trilha (auditoria)**

12. Eventos novos na allowlist de `auditCanonical.ts`, **na mesma mudança**: `review.opened`
    `['reviewId','ecdJobId','ecfJobId','year']`, `review.finding_added` `['reviewId','findingId',
    'register','severity']`, `review.finding_resolved` `['reviewId','findingId','resolution',
    'targetType','targetId']`, `review.jobs_replaced` `['reviewId','fromEcdJobId','toEcdJobId',
    'fromEcfJobId','toEcfJobId']`, `review.signed_off` `['reviewId','reviewerName','reviewerCrc']`,
    `review.rejected` `['reviewId','reason']`. `description` do achado **fora** do payload (texto livre
    = PII potencial, classe `accounting-audit-allowlist-guards`; teste-guarda no mesmo PR).
13. "Quem editou o quê" para (a) é a **junção** achado→`resolutionRef`→evento de auditoria já existente
    do alvo (`account.updated`, `mapping.*`…): `GET /reviews/:id` devolve, por achado resolvido, os
    eventos de auditoria do `targetId` posteriores a `finding.createdAt` (leitura por `targetId` — hoje
    `AuditService` **não expõe** essa leitura; ver §5 insumo ausente 1).

**Bloco C — integração com a entrega (C6)**

14. **Gate na entrega** (F-C11-3): `AccountingDeliveryService.buildPackage` exige revisão
    `SIGNED_OFF` para o **mesmo par de jobs**; sem ela → 409 `REVIEW_REQUIRED`; `REJECTED` → 409
    `REVIEW_REJECTED`. Vizinho tocado **só** se F-C11-3 → (a).

**Bloco D — camadas e gates mecânicos**

15. Cadeia completa: `routes/accountingReviews.ts` (registro em `index.ts` + `docs.paths.ts`) →
    `accountingReviewController` → `AccountingReviewService` → `AccountingReviewRepository`
    (`IAccountingReviewRepository`) → Prisma; `AccountingReviewPolicy` (`canReviewAccounting`,
    `canSignOffReview` — F-C11-1); factory; `REVIEW_STATUSES` em `models/ledgerStatus.ts`. DTOs Zod `.strict()`; snapshot de shape regenerado; guard de
    path-count do openapi (+8 paths); `npm run smoke:migration` (2 tabelas novas); review independente.

## 3. Forks — RATIFICAÇÃO PENDENTE

| # | Pergunta | Caminhos | Recomendação (não-vinculante) |
|---|---|---|---|
| **F-C11-1** | Quem é "o profissional"? | (a) qualquer `User` do escopo com `canManageData` (dono revisa; identidade = `reviewerName`+`reviewerCrc` no sign-off) · (b) `Role.ACCOUNTANT` novo (login próprio, só revisa) · (c) o `AccountingContact` (externo, sem login) via link assinado | **(a)** — resposta 1 diz que a contabilidade é determinística e o dono opera; o CRC é dado do sign-off, não de sessão. (b) abre frente de auth (ADR próprio, §6); (c) põe escrita anônima em trilha legal |
| **F-C11-2** | O que (a) DATA_EDIT cobre? | (a) **ponteiro** para o dado editado pelos serviços existentes (chart, mapping, counterparty, DTO de geração) · (b) endpoints-proxy de edição dentro da revisão | **(a)** — reuse antes de recriar; os alvos já auditam. (b) duplica 4 serviços |
| **F-C11-3** | A entrega (C6) exige sign-off? | (a) sim: `REVIEW_REQUIRED`/`REVIEW_REJECTED` em `buildPackage` · (b) não: revisão é opcional, C6 intacto | **(a)** — resposta 2 diz "assina e verifica"; sem gate a revisão é decorativa. Toca C6 (vizinho) em 1 checagem |
| **F-C11-4** | Data do acerto (c) | (a) `postingDate` em **qualquer período OPEN** (extemporâneo — IN 2003 art. 8º *remete* à ITG 2000 itens 31–36, que está fora do corpus, §5.2) · (b) reabrir `SOFT_CLOSED` original e lançar na data de competência (impossível em `HARD_CLOSED`) | **(a)** — é o que a IN prevê e não bate no terminal `HARD_CLOSED`. (b) só cabe se o par ainda não fechou duro; pode ser opção do corpo (`reopenIfSoftClosed`) — deixar para C11 v2 |
| **F-C11-5** | Chave de unicidade da revisão OPEN | (a) `@@unique([ecdJobId, ecfJobId])` + checagem in-tx (NULL distinto no SQLite) · (b) `@@unique([userId, unitId, year, status])` parcial via checagem in-tx | **(a)** com gate in-tx — `@@unique` não fecha TOCTOU sozinho (`authoritative-gate-inside-tx`) |
| **F-C11-6** | Troca de jobs após regerar | (a) `PATCH /jobs` substitui e o par antigo fica só no evento `review.jobs_replaced` · (b) tabela filha `AccountingReviewJobHistory` | **(a)** — o evento já é a trilha; (b) é C6b-shape sem demanda |

## 4. Contratos esboçados

```ts
// AccountingReviewDto.ts — todos .strict()
export const OpenReviewSchema = z.object({
  unitId: z.string().min(1),
  year: z.number().int().min(2000).max(2100),
  ecdJobId: z.string().min(1).optional(),
  ecfJobId: z.string().min(1).optional(),
}).strict().refine(v => v.ecdJobId || v.ecfJobId, { message: 'ecdJobId ou ecfJobId é obrigatório' });

export const REVIEW_REGISTERS = ['0000','I050','I051','I200','I250','J150','J930','M300','M350','M410','N630'] as const;
export const AddFindingSchema = z.object({
  register: z.enum(REVIEW_REGISTERS),
  locator: z.string().min(1).max(200),
  description: z.string().min(1).max(1000),
  severity: z.enum(['BLOCKER','NOTE']),
}).strict();

export const RESOLUTION_TARGETS = ['account','referential_mapping','counterparty','generation_input','journal_entry'] as const;
export const ResolveFindingSchema = z.discriminatedUnion('resolution', [
  z.object({ resolution: z.literal('DATA_EDIT'), targetType: z.enum(RESOLUTION_TARGETS), targetId: z.string().min(1) }).strict(),
  z.object({ resolution: z.literal('NO_ACTION'), resolutionNote: z.string().min(1).max(500) }).strict(),
]);

export const AdjustmentEntrySchema = z.object({          // (c) — corpo espelha PostEntryInput já existente
  postingDate: dateOnly, description: z.string().min(1).max(500),
  lines: z.array(z.object({ accountId: z.string().min(1), debitCents: cents.optional(), creditCents: cents.optional() })).min(2),
  reverseOriginal: z.boolean().optional(),                // só quando register='I200'
}).strict();

export const SignOffSchema = z.object({ reviewerName: z.string().min(3).max(120), reviewerCrc: z.string().transform(normalizeCrcNumber).pipe(z.string().regex(CRC_NUMBER_RE)) /* #305 */, statement: z.string().min(1).max(500) }).strict();
export const RejectSchema  = z.object({ reason: z.string().min(1).max(500) }).strict();
export const ReplaceJobsSchema = z.object({ ecdJobId: z.string().min(1).optional(), ecfJobId: z.string().min(1).optional() }).strict();
```

```prisma
model AccountingReview {
  id             String   @id @default(cuid())
  userId         String
  user           User     @relation(fields: [userId], references: [id], onDelete: Restrict)
  unitId         String
  year           Int
  ecdJobId       String?
  ecdJob         AccountingDataExchangeJob? @relation("ReviewEcdJob", fields: [ecdJobId], references: [id], onDelete: Restrict)
  ecfJobId       String?
  ecfJob         AccountingDataExchangeJob? @relation("ReviewEcfJob", fields: [ecfJobId], references: [id], onDelete: Restrict)
  status         String   // OPEN | SIGNED_OFF | REJECTED (REVIEW_STATUSES em models/ledgerStatus.ts — arquivo tocado, item 15)
  reviewerUserId String
  reviewerName   String?
  reviewerCrc    String?
  statement      String?
  closeReason    String?
  openedAt       DateTime @default(now())
  closedAt       DateTime?
  findings       AccountingReviewFinding[]
  @@unique([ecdJobId, ecfJobId])
  @@index([userId, unitId, year])
  @@map("accounting_reviews")
}
model AccountingReviewFinding { /* campos do item 3; onDelete: Restrict; @@index([reviewId]) */ }
```

Rotas (8 paths / 9 operações): `POST /api/accounting/reviews` · `GET /api/accounting/reviews`
(`?unitId&year&status`) · `GET /api/accounting/reviews/{id}` · `POST /api/accounting/reviews/{id}/findings`
· `POST /api/accounting/reviews/{id}/findings/{findingId}/resolve` · `POST …/findings/{findingId}/adjustment`
· `PATCH /api/accounting/reviews/{id}/jobs` · `POST …/{id}/sign-off` · `POST …/{id}/reject`.

## 5. Pendente de validação externa / insumos ausentes

1. **`AuditService` não lê por `targetId`** (só `append`/`verifyAuditChain`, verificado em C6 e nesta
   sessão) — o comportamento 13 precisa de `findByTarget(scope, targetType, targetId, since)` no
   repositório de auditoria. É extensão do vizinho: se o dono não autorizar, o 13 vira "ponteiro sem
   junção" (o cliente lê a trilha por conta própria).
2. **ITG 2000 (R1) itens 31–36 — lançamento extemporâneo.** A IN 2003 art. 8º cita; o texto da ITG
   **não está no corpus** (`fontes-oficiais/` tem IN 1.700, 2.003, 2.004). A forma do histórico e a data
   do acerto (comportamento 5) ficam **pendentes de validação externa** até o texto entrar no corpus.
3. **Item do contador (linha nova ao pedido):** *"o senhor revisa e assina dentro do sistema (login) ou
   recebe o pacote e devolve achados por fora?"* — decide F-C11-1 melhor do que a recomendação.

## 6. Achados fora de escopo (não planejar — exigem autorização própria)

1. **ECD substituta / ECF retificadora** (`IND_FIN_ESC=1` + `COD_HASH_SUB`; `RETIFICADORA=S` +
   `NUM_REC`): a IN 2003 art. 8º/§4º e a IN 2004 art. 7º/§3º impõem regras próprias (Termo de
   Verificação, prazo, cascata para anos posteriores da Parte B). ADR-ECD deixou fora do MVP; é
   incremento próprio (`BE-INCR-SPED-RETIFICACAO`) que C11 **consome** mas não contém.
2. **`Role.ACCOUNTANT` / login do contador** — se F-C11-1 → (b), exige ADR de auth (deny-by-default do
   middleware, tela atrás de `withAuth`).
3. **Reabrir `SOFT_CLOSED` a partir da revisão** (F-C11-4 b) — C11 v2.
4. **FE-INCR-REVIEW** — aba na Compliance; nasce depois do BE, incremento irmão.

## 7. Gates de envio do PR de implementação (quando autorizado)

`cd server && npx tsc --noEmit && npm run test:integration` · snapshot de shape regenerado · allowlist de
auditoria (12) com teste-guarda de PII · `npm run docs:generate` diff vazio + guard de path-count (+8) ·
`npm run smoke:migration` (2 tabelas) · review independente PASS · relatório OPS-001 com o caso
adversarial nomeado (sugestão: sign-off com achado `BLOCKER` aberto → 409; segunda chamada do acerto → mesmo `entryId`).
