# BRIEF — FE-INCR-REVIEW (aba da revisão profissional editável — nó C11, crescimento)

> **Estado: BRIEF pronto, forks F-FE-RV-1..4 em RATIFICAÇÃO PENDENTE.** Produzido por `sessao-planejamento`
> em 2026-09-17 contra `origin/main` **`85378005`** (#343), item 3 de `PLANO-SESSAO-2026-09-17-pontas-nao-codigo.md`
> (Fork F-PS-1 → a). Não contém código de aplicação. **Implementação exige "executa" próprio do dono** (ORCH-006).

## Cabeçalho

- **Item a planejar:** tela para o que `BE-INCR-REVIEW-LAYER` (nó C11, PR #334 `a2c974cb`) expõe em
  `/api/accounting/reviews` — abrir uma revisão sobre jobs `EXPORTED` de ECD/ECF, registrar achados por registro SPED,
  resolvê-los (ponteiro para dado editado · lançamento de acerto · sem ação), trocar os jobs após regeração, **assinar**
  (nome + CRC) ou **rejeitar**. Nomeado no master map §5.1 linha C11 ("Residual = `FE-INCR-REVIEW`") e em
  `PROXIMOS-PASSOS-2026-09-17.md` ("fora da régua").
- **Autorização (ORCH-006):** dono, 2026-09-17: *"Pode planejar em 1 única sessão para fechar as pontas que não são
  implementação de código"* + *"Vai na recomendação dos 5 e abre a sessão"* (F-PS-1 → a, F-PS-5 → a: crescimento do
  C11, régua inalterada). Cobre **planejar**; não cobre implementar nem ratificar fork.
- **Contrato (fato consumado — transcrito):** `server/src/features/accounting/dtos/AccountingReviewDto.ts`:

  ```ts
  OpenReviewSchema        = { unitId, year: int(2000..2100), ecdJobId?, ecfJobId? }.strict().refine(ecd || ecf)   // POST /reviews → 201
  AddFindingSchema        = { unitId, register: REVIEW_REGISTERS, locator: string(1..200), description: string(1..1000),
                              severity: 'BLOCKER'|'NOTE' }.strict()                                                // POST /reviews/:id/findings → 201
  ResolveFindingSchema    = discriminatedUnion('resolution',
                              { unitId, resolution: 'DATA_EDIT', targetType: RESOLUTION_TARGETS, targetId } |
                              { unitId, resolution: 'NO_ACTION', resolutionNote: string(1..500) })                 // POST /reviews/:id/findings/:findingId/resolve
  AdjustmentEntrySchema   = { unitId, postingDate: dateOnly (isValidDateOnly), description: string(1..500),
                              lines: PostEntryLineSchema[] (min 2), reverseOriginal?: boolean }.strict()          // POST /reviews/:id/findings/:findingId/adjustment → 201
  ReplaceReviewJobsSchema = { unitId, ecdJobId?, ecfJobId? }.strict().refine(ecd || ecf)                            // PATCH /reviews/:id/jobs
  SignOffReviewSchema     = { unitId, reviewerName: string(3..120), reviewerCrc: normalizeCrcNumber + CRC_NUMBER_RE,
                              statement: string(1..500) }.strict()                                                 // POST /reviews/:id/sign-off
  RejectReviewSchema      = { unitId, reason: string(1..500) }.strict()                                             // POST /reviews/:id/reject
  ListReviewsQuerySchema  = { unitId, year?: int, status?: 'OPEN'|'SIGNED_OFF'|'REJECTED' }                        // GET /reviews
  ReviewScopeQuerySchema  = { unitId }                                                                              // GET /reviews/:id
  ```
  Constantes (`models/AccountingReview.model.ts`): `REVIEW_REGISTERS = ['0000','I050','I051','I200','I250','J150','J930',
  'M300','M350','M410','N630']`; `FINDING_SEVERITIES = BLOCKER | NOTE`; `FINDING_RESOLUTIONS = DATA_EDIT | ADJUSTMENT_ENTRY
  | NO_ACTION`; `RESOLUTION_TARGETS = account | referential_mapping | counterparty | generation_input | journal_entry`;
  `REVIEW_STATUSES` (`models/ledgerStatus.ts:25`) `= OPEN | SIGNED_OFF | REJECTED`. Rotas: `routes/accounting.ts:240-248`
  (segmento estático `/reviews`, antes de `/:unitId/periods`); `docs.paths.ts:4490-4648`.
  Policy: `canReviewAccounting = canManage`; `canSignOffReview = canManage` (`AccountingPolicy.ts:143-149`, F-C11-1 → a:
  "o profissional é qualquer User do escopo que já gerencia dado; identidade do atestado é DADO do sign-off").
  Leitura (`list`/`get`) sob `canRead`.
  **Respostas** (`AccountingReviewService.ts:56-64,143-160`; Prisma `schema.prisma:1497-1547`):

  ```ts
  AccountingReview = { id, unitId, year, ecdJobId: string|null, ecfJobId: string|null, status, reviewerUserId,
    reviewerName: string|null, reviewerCrc: string|null, statement: string|null, closeReason: string|null,
    openedAt, updatedAt, closedAt: ISO|null }                                     // GET /reviews → AccountingReview[] (sem paginação)
  ReviewDetail = { review: AccountingReview & { findings: AccountingReviewFinding[] },
    findings: Array<{ finding: AccountingReviewFinding, targetAuditEvents: AuditEvent[] }> }   // GET /reviews/:id
  AccountingReviewFinding = { id, reviewId, register, locator, description, severity, resolution: string|null,
    resolutionTargetType: string|null, resolutionTargetId: string|null, resolutionNote: string|null,
    resolvedById: string|null, resolvedAt: ISO|null, createdById, createdAt }
  ```
  **Conflitos nomeados** (`ConflictError` com `code`): `REVIEW_ALREADY_OPEN` (2ª abertura do mesmo par — devolve o id
  existente na mensagem), `FINDING_ALREADY_RESOLVED`, `REVIEW_NOT_OPEN`, `REVIEW_STALE` (sign-off com BLOCKER aberto ou
  achado resolvido **depois** da geração do job → "regere e troque os jobs (PATCH /jobs)"), `REVIEW_REQUIRED`/`REVIEW_REJECTED`
  (vindos do `AccountingDeliveryService` quando o pacote tenta sair sem revisão assinada — `:436-450`).
- **Fatos verificados nesta sessão:**
  1. **Nenhum consumidor FE** de `/reviews` (`grep -rn "reviews" my-app --include=*.ts*` = 0 fora de node_modules).
  2. **Não existe `GET /api/accounting/data-exchange/jobs` (lista).** Só `GET /data-exchange/jobs/:jobId`, `/rows`,
     `/download`, `POST /commit` (`routes/accounting.ts:151-156`). O FE obtém um `DataExchangeJob` **apenas como
     retorno** de `spedService.generateAndDownloadEcd/Ecf/EcfReal` (`sped.service.ts:102-137`) e não o persiste.
     ⇒ **a tela não tem como listar jobs `EXPORTED` para abrir uma revisão** — Fork **F-FE-RV-1** (mesma classe do
     F-FE-1 do FE-LALUR: tela depende de 1 toque no BE). O BRIEF C8 item 30 já **pressupõe** esse endpoint
     ("`GET /data-exchange/jobs` expõe `supersedesJobId`") — o mesmo toque serve aos dois.
  3. **Aba Compliance** (`CompliancePanel` referencial → `LalurPanel` → `SpedGenerationPanel`, `AccountingView.tsx`
     bloco `activeTab === 'compliance'`, `space-y-8`) é onde os jobs SPED **nascem**; a revisão é o passo seguinte do
     mesmo fluxo (gerar → revisar → assinar → entregar). ⇒ Fork **F-FE-RV-2** (seção na Compliance × aba nova).
  4. **Máscara de CRC**: `normalizeCrcNumber`/`CRC_NUMBER_RE` vivem em `models/AccountingContact.model.ts` (BE). O FE não
     tem cadastro de contato (achado §6.1) nem helper de CRC — a tela valida no submit pelo 400 do BE (mensagem
     "reviewerCrc deve seguir a máscara CFC UF-NNNNNN/O-D (ex.: SP-123456/O-1)") e mostra o exemplo como placeholder.
  5. **Lançamento de acerto** (`AdjustmentEntrySchema.lines = PostEntryLineSchema[]`): o FE já tem o editor de linhas
     em `JournalEntryModal.tsx` (`JournalEntryDraftValue`, contas por **id**, `parseBrl` 100× — memória
     `accounting-fe-incr-ap`) usado pelo `EntryApprovalsPanel` — **reuso literal** para o item 9 (mesmo objeto de domínio:
     linhas de `postEntry`). Precedente de `postingDate` date-only: `CreatePayableModal.tsx:55` (`<input type="date">` +
     `scopeToday`), nunca `toISOString()`.
  6. `DATA_EDIT` **não edita nada** (F-C11-2 → a): grava o **ponteiro** `{targetType, targetId}` para o dado que o
     serviço dono editou; `GET /reviews/:id` devolve, por achado, os `targetAuditEvents` do alvo posteriores ao achado
     (item 13 do C11). A tela **não** oferece edição inline do alvo — oferece o link para a aba/painel dono (Plano de
     Contas, Compliance/referencial, Contrapartes, Lançamentos).
- **Nós vizinhos:** consome C11 (BE ✅) e os jobs de `SpedGenerationPanel`/`SpedEcfRealPanel`. É consumido por
  **`FE-INCR-DELIVERY`** (BRIEF irmão desta sessão): o `build`/`confirm` do pacote falha com `REVIEW_REQUIRED` sem
  revisão assinada — a tela de entrega linka para cá. C12 (`BE-INCR-SPED-IDENTITY-MASKS`, `ready`) muda o DTO de
  **geração** (`SpedEcdDto` J930), não o de revisão — sem colisão.

## Definição de pronto

Seção **"Revisão profissional"** na aba Compliance (ou aba — F-FE-RV-2) com: lista de revisões por exercício/status;
"Abrir revisão" escolhendo jobs `EXPORTED` (F-FE-RV-1); detalhe da revisão com achados (registro, localizador,
severidade, estado), **adicionar achado**, **resolver** (DATA_EDIT com ponteiro · NO_ACTION com nota), **lançar acerto**
(editor de linhas reusado, `reverseOriginal` só em I200), **trocar jobs** após regeração, **assinar** (nome + CRC +
declaração) e **rejeitar**; conflitos `REVIEW_*` legíveis com a ação sugerida; i18n pt/en; vitest com shim
`globalThis.React`; `tsc` limpo; **build de produção** (withAuth); sign-off de browser = humano.

## 1. Checklist de comportamentos

### Estrutura e serviço

1. **[direto]** `lib/services/accountingReview.service.ts`: `list(unitId, { year?, status? })`, `get(id, unitId)`,
   `open(body)`, `addFinding(id, body)`, `resolveFinding(id, findingId, body)`, `postAdjustment(id, findingId, body)`,
   `replaceJobs(id, body)`, `signOff(id, body)`, `reject(id, body)`; tipos transcritos do cabeçalho **à mão**. Bodies
   sem chave extra (`.strict()`); o `resolveFinding` monta **um dos dois** shapes da union — nunca `targetType` e
   `resolutionNote` juntos (teste: `NO_ACTION` não envia `targetType`).
2. **[F-FE-RV-2]** `features/accounting/components/ReviewPanel.tsx` montado em `AccountingView.tsx` no bloco
   `activeTab === 'compliance'`, **depois** de `SpedGenerationPanel` (fluxo: gerar → revisar); `section rounded-2xl
   border-neutral-800 bg-neutral-900/50 p-5`, título `t('review.title', 'Revisão profissional')`, subtítulo "achado →
   ponteiro/acerto → regeração → sign-off (o arquivo nunca é editado)". Sem `zinc-*`.
3. **[direto]** Filtros: exercício (select, default = ano de `scopeToday()`), status (todos/OPEN/SIGNED_OFF/REJECTED).
   Lista `<table>`: exercício, jobs (ECD `ecdJobId` curto · ECF `ecfJobId` curto — "—" quando null), status (badge),
   aberta em (`openedAt` — timestamp, `toLocaleString`), assinada por (`reviewerName · reviewerCrc`) ou motivo da
   rejeição (`closeReason`), ação "abrir". Sem paginação (o BE não pagina; volume = ~1–2 por exercício).

### Abrir revisão

4. **[F-FE-RV-1]** Botão **"Abrir revisão"** → `Modal`: exercício + escolha de **ecdJobId / ecfJobId** entre jobs
   `EXPORTED` do escopo (pelo menos um). Fonte da lista = Fork F-FE-RV-1. Erros: 400 "não é uma ECD/ECF", "não está
   EXPORTED — o arquivo ainda não existe", "não tem período gravado — regere", "ano ≠ periodStart"
   (`AccountingReviewService.ts:498-510`) — íntegros; **409 `REVIEW_ALREADY_OPEN`** ⇒ a tela extrai o id da mensagem?
   **não** — mostra a mensagem e recarrega a lista (o item aberto aparece; achado §6.3 pede o id no payload do 409).
   Testável: body `{ unitId, year, ecdJobId }` sem `ecfJobId` quando só um escolhido; 409 recarrega.

### Detalhe e achados

5. **[direto]** Detalhe (`ReviewDetailPanel`, mesma seção, abaixo da lista — ou `Modal` largo): cabeçalho com jobs
   (id, `kind`, `sha256` curto quando disponível via F-FE-RV-1) e status; tabela de achados: `register` (badge com o
   nome do registro — mapa i18n fechado sobre `REVIEW_REGISTERS`), `locator`, `description` (truncada, expande),
   `severity` (BLOCKER vermelho · NOTE neutro), estado (aberto · `resolution` + alvo/nota · `resolvedAt`), ações por
   linha (item 7–9). Contadores no topo: "N BLOCKER abertos · M resolvidos depois da geração" — o segundo é **derivado
   na tela** de `resolvedAt > job.createdAt`? **Só se F-FE-RV-1 trouxer `createdAt` do job**; senão o contador fica só
   no BE (409 `REVIEW_STALE` no sign-off). Testável: fixture com 3 achados (BLOCKER aberto, NOTE resolvido DATA_EDIT,
   NOTE resolvido NO_ACTION) renderiza os 3 estados.
6. **[direto]** **Adicionar achado** (só revisão `OPEN`, `canReviewAccounting`): `Modal` com `register` (select fechado),
   `locator` (≤200, placeholder por registro: "código da conta" para I050, "nº do lançamento" para I200, "linha" para
   M300), `description` (≤1000, aviso "texto livre — nunca entra na trilha de auditoria"), `severity`. Testável: body
   exato; 409 `REVIEW_NOT_OPEN` exibido.
7. **[direto]** **Resolver — DATA_EDIT**: `Modal` com `targetType` (select fechado `RESOLUTION_TARGETS`) + `targetId`
   (texto; para `account` e `counterparty` a tela oferece busca no painel dono — `getAccounts` já existe; contraparte via
   `accountingService` se houver lista; senão texto) + link "abrir o dado no painel dono" (aba Plano de Contas /
   Contrapartes / Compliance / Lançamentos). Erro 400 "Alvo … não existe neste escopo" íntegro. Depois da resolução, a
   linha mostra os `targetAuditEvents` (tipo + data) como trilha — **leitura**, sem edição.
8. **[direto]** **Resolver — NO_ACTION**: `Modal` com `resolutionNote` obrigatória (1..500; "achado descartado sem
   justificativa é 400"). Testável: vazio bloqueado no FE.
9. **[direto]** **Lançar acerto** (`ADJUSTMENT_ENTRY`): `Modal` reusando **`JournalEntryModal`** (editor de linhas,
   contas por id, débitos = créditos validado no FE como já faz) + `postingDate` (`<input type="date">`, default
   `scopeToday()`; hint "período OPEN — extemporâneo permitido, F-C11-4 a") + `description` + checkbox
   `reverseOriginal` **visível só quando `finding.register === 'I200'`** (o BE devolve 400 fora disso — a tela nem
   renderiza a chave). Sucesso ⇒ 201, achado vira `ADJUSTMENT_ENTRY` com `targetType='journal_entry'`; link para o
   lançamento na aba Lançamentos. Testável: body sem `reverseOriginal` para I050; com `true` para I200; linhas
   espelham `PostEntryLineSchema`.

### Regeração, sign-off, rejeição

10. **[direto]** **Trocar jobs** (`PATCH /jobs`): `Modal` com os mesmos seletores do item 4, texto "o par antigo fica
    registrado no evento `review.jobs_replaced`"; só `OPEN`. Testável: body só com o job trocado.
11. **[direto]** **Assinar** (`canSignOffReview`): `Modal` com `reviewerName` (3..120), `reviewerCrc` (placeholder
    `SP-123456/O-1`, hint "máscara CFC UF-NNNNNN/O-D"), `statement` (≤500, textarea). Antes de enviar, a tela mostra o
    resumo "N BLOCKER abertos" e **desabilita** se N > 0 (regra visível; o BE re-checa **dentro da tx** — memória
    `authoritative-gate-inside-tx`). 409 `REVIEW_STALE` ⇒ mensagem íntegra + botão "Trocar jobs" (item 10). Sucesso ⇒
    status `SIGNED_OFF`, `closedAt`, sem mais ações. Testável: 409 abre o caminho do PATCH.
12. **[direto]** **Rejeitar**: `Modal` vermelho com `reason` (1..500) — precedente `EntryApprovalsPanel`. Status
    `REJECTED` é terminal; a tela avisa "o pacote deste par não pode ser entregue (`REVIEW_REJECTED`)".

### Permissões, i18n, verificação

13. **[direto]** 403 em `list` ⇒ aviso e nada; 403 em comando ⇒ mensagem íntegra. `canReviewAccounting` e
    `canSignOffReview` são ambos `canManage` hoje — a tela **não** distingue quem assina de quem revisa por role
    (F-C11-1 → a; se SoD dinâmica entrar, o BE decide).
14. **[direto]** i18n `review.*` pt/en no mesmo PR; mapa de `REVIEW_REGISTERS` → nome legível (0000 abertura · I050
    plano de contas · I051 referencial · I200 lançamento · I250 partida · J150 DRE · J930 signatários · M300/M350 Parte A
    · M410 Parte B · N630 IRPJ) com teste de cobertura total do array.
15. **[direto]** Testes vitest com `globalThis.React`; `vi.mock` relativo ao teste; `tsc`; `npm run build`; ensaio no
    browser contra cópia do `dev.db` real (que tem **0 revisões** e — depende de F-FE-RV-1 — jobs `EXPORTED` só se o
    SPED já foi gerado nela; o ensaio começa gerando ECD+ECF pelo `SpedGenerationPanel`). Sign-off de browser = humano.

## 2. Contratos esboçados

### 2.1 Service FE (`lib/services/accountingReview.service.ts`)

```ts
export type ReviewStatus = 'OPEN'|'SIGNED_OFF'|'REJECTED';
export type ReviewRegister = '0000'|'I050'|'I051'|'I200'|'I250'|'J150'|'J930'|'M300'|'M350'|'M410'|'N630';
export type FindingSeverity = 'BLOCKER'|'NOTE';
export type ResolutionTarget = 'account'|'referential_mapping'|'counterparty'|'generation_input'|'journal_entry';
export interface AccountingReview { /* cabeçalho */ }  export interface AccountingReviewFinding { /* cabeçalho */ }
export interface ReviewDetail { review: AccountingReview & { findings: AccountingReviewFinding[] };
  findings: Array<{ finding: AccountingReviewFinding; targetAuditEvents: Array<{ id; eventType; createdAt; targetType; targetId }> }> }
list(unitId, { year?, status? }) → AccountingReview[]                       // GET /accounting/reviews
get(id, unitId) → ReviewDetail                                             // GET /accounting/reviews/:id
open({ unitId, year, ecdJobId?, ecfJobId? }) → AccountingReview            // POST → 201
addFinding(id, { unitId, register, locator, description, severity }) → AccountingReviewFinding   // 201
resolveFinding(id, findingId, { unitId, resolution: 'DATA_EDIT', targetType, targetId } | { unitId, resolution: 'NO_ACTION', resolutionNote })
postAdjustment(id, findingId, { unitId, postingDate, description, lines: PostEntryLine[], reverseOriginal? }) → { finding: AccountingReviewFinding; entryId: string }  // 201 (`AccountingReviewService.ts:252`)
replaceJobs(id, { unitId, ecdJobId?, ecfJobId? }) → AccountingReview       // PATCH
signOff(id, { unitId, reviewerName, reviewerCrc, statement }) → AccountingReview
reject(id, { unitId, reason }) → AccountingReview
```

### 2.2 Endpoint de lista de jobs (Fork F-FE-RV-1 (a) — 1 toque no BE, compartilhado com FE-INCR-DELIVERY e C8 item 30)

```ts
GET /api/accounting/data-exchange/jobs?unitId=&direction=EXPORT&kind=&status=EXPORTED&year=&page=&limit=
→ { items: DataExchangeJob[] (+ periodStart, periodEnd, supersedesJobId? quando C8 landar), total, page, limit }
```
Policy `canRead`; DTO Zod `.strict()` de query com `queryBoolean` onde couber; `docs.paths.ts`; BASELINE do
`openapi-paths.test.ts` sobe 189 → 190 de propósito; snapshot de shape do DTO.

## 3. Forks — RATIFICAÇÃO PENDENTE

### Fork F-FE-RV-1 — De onde a tela tira os jobs `EXPORTED` para abrir/trocar a revisão

| Perna | O que faz | O que deixa aberto |
|---|---|---|
| **(a) Endpoint novo `GET /api/accounting/data-exchange/jobs` (lista paginada por `direction/kind/status/year`) — RECOMENDADA** | Um dono do dado; serve **três** consumidores já nomeados (esta tela, `FE-INCR-DELIVERY`, C8 item 30 "expõe `supersedesJobId`"); a lista mantém o job anterior baixável (resposta 7 da cédula 10/09) | +1 rota num `FE-INCR-*` (exceção já praticada em FE-LALUR F-FE-1 e CASH-FORECAST); BASELINE do path-count sobe |
| (b) Guardar em `localStorage` os jobs devolvidos por `generateAndDownload*` nesta máquina | Zero toque no BE | Perde ao trocar de browser/máquina; não lista jobs gerados por outro usuário do escopo; contraria "o operador escolhe os jobs; o sistema sabe o que eles cobrem" |
| (c) `<input>` livre para colar o `jobId` | Zero código de lista | O id é um cuid invisível ao usuário; o 400 do BE vira o único feedback |

**Recomendação: (a).** Se o dono preferir, vira `BE-INCR-DATA-EXCHANGE-JOBS-LIST` próprio (P, 1 rota) executado antes
das duas telas.

### Fork F-FE-RV-2 — Onde a tela vive

| Perna | O que faz | O que deixa aberto |
|---|---|---|
| **(a) Seção da aba Compliance, depois de `SpedGenerationPanel` — RECOMENDADA** | É o passo seguinte da geração; precedente e-Lalur (#315) entrou como seção da Compliance; zero aba nova | A aba Compliance fica com 4 seções (referencial, e-Lalur, SPED, revisão) — rolagem longa; mitigação: âncoras/links "Gerar ↓ / Revisar ↓" já usados pelo `LalurPanel` item 12 |
| (b) Aba própria `revisao` | Espaço para o detalhe largo (tabela de achados + trilha) | 22ª aba; o dono já preferiu seção para tela de nó existente |

**Recomendação: (a)**, com o detalhe da revisão em `Modal` largo (não inline) para não estourar a seção.

### Fork F-FE-RV-3 — Como a tela mostra o "resolvido depois da geração" (o que faz o sign-off dar `REVIEW_STALE`)

| Perna | O que faz |
|---|---|
| **(a) Só o BE decide: a tela mostra o 409 íntegro e o botão "Trocar jobs"; nenhum cálculo local — RECOMENDADA** | Regra num lugar só (`staleFindings`, `AccountingReviewService.ts:369-376`); sem dependência do `createdAt` do job |
| (b) A tela replica `resolvedAt > job.createdAt` (exige F-FE-RV-1 (a) com `createdAt`) e avisa antes do clique | Aviso preventivo; regra duplicada que pode divergir |

**Recomendação: (a).**

### Fork F-FE-RV-4 — Editor do lançamento de acerto

| Perna | O que faz |
|---|---|
| **(a) Reusar `JournalEntryModal` (editor de linhas do `EntryApprovalsPanel`) embrulhado com `postingDate`/`description`/`reverseOriginal` — RECOMENDADA** | Mesmo objeto de domínio (linhas de `postEntry`); `parseBrl`/contas por id já resolvidos lá; zero clone `SIMILAR_TO` |
| (b) Formulário próprio de 2+ linhas | Mais simples de embutir; clone do editor (o `skill-audit` mede) |

**Recomendação: (a).** Se `JournalEntryModal` não aceitar ser hospedado (props acopladas ao fluxo de aprovação), a
`sessao-feature` extrai o editor de linhas para componente — **refactor de reuso**, não clone; registrar no PR.

## 4. Pendências de validação externa

- Nenhuma de domínio: os registros SPED revisáveis (`REVIEW_REGISTERS`) e a máscara CFC já foram fechados no C11
  (cédula 16/09). O **conteúdo** de uma revisão (o que é BLOCKER) é do contador — a tela só registra.

## 5. Insumos ausentes

- **Lista de jobs** (Fork F-FE-RV-1) — bloqueio real da tela: sem ela, "abrir revisão" não tem de onde escolher.
- Nenhum outro: os shapes de resposta foram lidos das assinaturas do serviço (`AccountingReviewService.ts:102-402`).

## 6. Achados fora de escopo

1. **Cadastro de contato (contador)** — `GET/POST/PATCH/DELETE /api/accounting/contacts` existe no BE (#305) sem tela;
   o sign-off da revisão pede nome + CRC **digitados** (é dado do atestado, não FK de contato — F-C11-1 a), mas a
   tela poderia pré-preencher do contato. Vira parte de `FE-INCR-DELIVERY` (que **precisa** do contato) — ver o
   BRIEF irmão, Fork F-FE-DL-1.
2. **`GET /reviews` sem paginação** — coerente com o volume; se a lista crescer, crescimento do C11.
3. **409 `REVIEW_ALREADY_OPEN` só diz o id na mensagem** — payload sem `existingId` obriga a tela a recarregar a lista
   em vez de navegar; 1 campo no `ConflictError` (crescimento do C11).
4. **Trilha do alvo (`targetAuditEvents`) chega sem paginação nem limite** — para `journal_entry` com muitos eventos
   o detalhe cresce; observar no ensaio.
5. **Configurações de escopo** (`/api/accounting/settings`) e **perfil fiscal** seguem sem tela — mesmo achado do BRIEF
   FE-BANK-SETTLEMENT §6.1.
