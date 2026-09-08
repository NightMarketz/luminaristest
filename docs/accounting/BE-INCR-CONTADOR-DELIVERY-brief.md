# BRIEF — BE-INCR-CONTADOR-DELIVERY (envio de ECD/ECF ao contador)

> **PRÉ-CONDIÇÃO EXTERNA — a `sessao-feature` NÃO abre antes da resposta do contador.** Isto é regra, não
> fork: `docs/adr/ADR-CONTADOR-DELIVERY.md` (Status: Accepted por delegação 2026-09-07, condicionado) só
> autoriza código depois do item 0 do `docs/accounting/PEDIDO-CONTADOR-2026-09-03.md` responder — *"você
> assina ECD e ECF geradas por um sistema que você não opera?"*. Se a resposta for "não" ou "só
> lançamento a lançamento", F-Z0 reabre e este BRIEF sai do plano junto com o resto do trilho contábil
> que ela autorizou (decisão do dono, não do agente). Este documento pode ser escrito e existir enquanto
> a resposta não chega; **nenhuma linha de código de aplicação nasce dele antes dela.**
>
> **Forks: já resolvidos por delegação.** `CEDULA-DECISAO-2026-09-07-forks-sdd.md` (rodada 9): *"F-CD1..F-CD8
> → recomendação de cada um"* — o caminho ratificado é a **Recomendação** escrita em cada fork do ADR
> (§3, emendada com F-CD7/F-CD8). O checklist abaixo já assume esses caminhos; não há mais forks do ADR
> pendentes de ratificação. Dois forks **NOVOS**, abertos por este BRIEF (achados de leitura de código
> que o ADR não cobria), seguem `RATIFICAÇÃO PENDENTE` — ver §3.

---

## Contexto fixo (não rediscutir)

- **Item a planejar:** envio de ECD/ECF ao contador — pacote (ECD+ECF+manifesto+hash) transportado por
  canal configurável, registrado num log de entrega próprio, com confirmação explícita e gate de período
  fechado. `docs/accounting/ACCOUNTING-MASTER-MAP.md` §5 / cédula `CEDULA-DECISAO-2026-09-03-modulos.md`
  §E linha C6 (fecha o item 16 da lista C.1, contábil 13/19 → 14/19). `PLANO-SDD-SEQUENCIAL-2026-09-07.md`
  rodada 9.
- **Autorização (ADR + forks):** `docs/adr/ADR-CONTADOR-DELIVERY.md` (PR #274, `239945d1`), Status
  **Accepted por delegação 2026-09-07** — `CEDULA-DECISAO-2026-09-07-forks-sdd.md`, sinal literal do dono:
  *"Ratifico as recomendações de todos os forks, segue"*. Caminho ratificado por fork: **F-CD1 (a)**
  pacote gerado, dono envia (zero-dependência); **F-CD2 (a)** confirmação de operador único; **F-CD3 (a)**
  ECD.txt+ECF.txt+manifesto, sem PDF-resumo; **F-CD4 (a)** manifesto+hash sem cópia do `.txt`, com FK real
  `onDelete: Restrict` para o job de origem (não string solta); **F-CD5 (a)** 1:N contadores por scope
  desde o início; **F-CD6 (a)** SHA-256 no manifesto lendo `job.sha256` (nunca recomputando do disco);
  **F-CD7 (a)** exige período `HARD_CLOSED` para o pacote sair "pronto para assinar"; **F-CD8 (a)** o
  `AccountingContact` escolhido é a fonte do signatário no próximo DTO de geração (pré-preenchimento),
  com (b) como gate defensivo nomeado mas não fechado — ver Fork Novo B, §3.
- **Autorização (desta sessão de planejamento):** gatilho do dono no `PLANO-SDD-SEQUENCIAL-2026-09-07.md`
  rodada 9, coluna "Gatilho": *"ratifico os forks do CONTADOR-DELIVERY"* — cobre exatamente ADR→ratificação→
  BRIEF (etapas R→S do plano). Não cobre implementação (etapa I) — essa aguarda o item 0 do pedido ao
  contador, condição já travada no cabeçalho do ADR.
- **Insumos existentes (lidos nesta sessão):**
  - `docs/adr/ADR-CONTADOR-DELIVERY.md` — D1-D8 (decidido) + F-CD1..F-CD8 (fork, com recomendação).
  - `docs/adr/PARECER-ARCHITECT-ADR-CONTADOR-DELIVERY.md` — ACC-CD-1..6, gates de domínio §4.
  - `docs/accounting/PEDIDO-CONTADOR-2026-09-03.md` — item 0 é a pré-condição de existência do trilho.
  - `server/src/features/accounting/services/DataExchangeExportService.ts:212-233`
    (`getArtifactForDownload`) — padrão de resolução por `scope` (`findJobById(scope,id)` →
    `NotFoundError` cross-tenant, nunca `ForbiddenError`) a espelhar em `AccountingContact`/job de origem.
  - `server/src/features/accounting/repositories/IDataExchangeRepository.ts` — **`findJobById` é a
    ÚNICA leitura de job por id; não existe `findJobsByKindAndYear` nem qualquer busca por período.**
  - `server/prisma/schema.prisma:593-618` (`model AccountingDataExchangeJob`) — **achado novo, não
    citado pelo ADR nem pelo parecer: o job NÃO persiste `year`/período.** Campos reais: `id, userId,
    unitId, direction, kind, status, originalName, mimeType, sizeBytes, sha256, storageKey, totalRows,
    validRows, invalidRows, committedRows, requestedById, committedById, createdAt, updatedAt,
    committedAt`. Nenhum campo de ano/período. Ver §5 (insumo ausente) e Fork Novo A (§3).
  - `server/src/features/accounting/services/SpedGenerationService.ts:98-177` — confirma o achado
    acima: `year` é só parâmetro transiente do DTO de geração (usado no nome do arquivo e no payload de
    auditoria `sped.ecd_generated`), nunca uma coluna do job — **não há como recuperar o `year` de um
    `jobId` depois do fato**, exceto reler o evento de auditoria (mas `AuditService` não expõe leitura
    por `targetId` — só `append`/`verifyAuditChain`, verificado em
    `server/src/features/accounting/services/AuditService.ts`) ou fazer parsing frágil do
    `originalName` (`ecd_${cnpj}_${year}.txt`) — não é contrato, é nome de exibição.
  - `server/src/features/accounting/dtos/SpedEcdDto.ts:64-112` (`SignerSchema`) — campos do J930 são
    input transiente do DTO de geração, nunca persistidos (confirma ADR-INCR-SPED-ECD D3).
  - `server/src/lib/sped.ts`/`ecf.ts`/`ecfReal.ts` — só **serializers** (escrevem `.txt`); **achado
    novo: não existe nenhum parser SPED de leitura no repo**
    (`grep -rln "parseJ930\|parseSped\|parseEcd" server/src` não casa nada além de serializers) —
    relevante para o Fork Novo B (§3).
  - `server/src/features/accounting/services/PeriodService.ts:14-19,117-159` — os quatro status reais
    (`OPEN`/`SOFT_CLOSED`/`HARD_CLOSED`/`FUTURE`); `HARD_CLOSED` terminal.
    `IAccountingPeriodRepository.findByYearMonth(scope,year,month,tx?)` — leitura mensal já pronta.
  - `server/src/features/accounting/audit/auditCanonical.ts:8-46,116-125` — allowlist fechada por
    `eventType`; `canonicalizeAuditPayload` **lança exceção** para `eventType` desconhecido (leitura
    própria desta sessão) — confirma que cada evento novo precisa entrar na allowlist antes do primeiro
    uso, não é opcional.
  - `server/src/features/accounting/scope/AccountingScope.ts` — `{ownerUserId, actorUserId, unitId,
    ledgerCode, baseCurrencyCode, timeZone}`; sem torre de Organization/LegalEntity.
  - `server/prisma/schema.prisma:1111-1132` (`model Counterparty`) — precedente de model Prisma
    first-class pequeno com soft-delete, `@@unique([userId,unitId,...])`, `@@index([deletedAt])` —
    molde estrutural para `AccountingContact` (o parecer já descartou reuso do `Counterparty` em si,
    §3 do parecer: shape/posse divergem — CRC não é modelado, posse é log de entrega, não AP/AR).
  - `docs/adr/ADR-INCR-APPROVAL-maker-checker.md` §3 — padrão comando+CAS (`createDraft/submit/approve/
    reject`, nunca `PATCH status`) a espelhar em `confirmDelivery`/`retryDelivery` (D6 do ADR).
  - `server/src/lib/alertWebhook.ts` — precedente de integração HTTP outbound opcional por env
    (fire-and-forget, nunca `await`, falha vira `logger.warn`) — referência se F-CD1 evoluir para (b)/(c)
    no futuro; **fora deste incremento** (F-CD1 ratificado em (a): zero-dependência).
  - `server/src/routes/accounting.ts:107-171` — um único router montado em `/api/accounting`; registrar
    rota nova aqui **não** exige tocar `routes/index.ts` (já montado) — só o bloco de rotas + `docs.paths.ts`.
  - `server/src/lib/factory.ts:919,923` (`getDataExchangeExportService`, `getSpedEcfGenerationService`)
    — padrão de getter a espelhar para `getAccountingContactService()`/`getAccountingDeliveryService()`.
- **Nós vizinhos:**
  - **Consome:** `IDataExchangeRepository.findJobById` (jobs ECD/ECF já `EXPORTED`), `storage.resolveReadPath`
    (ler o `.txt` do disco para o pacote), `IAccountingPeriodRepository.findByYearMonth` (gate F-CD7),
    `AuditService.append` (eventos `delivery.*`), `IAccountingPolicy` (dois pares novos de método).
  - **É consumido por:** nenhuma tela ainda — este BRIEF é **backend-only** (padrão da casa:
    `BE-INCR-*`/`FE-INCR-*` separados). Gate de paridade i18n **não se aplica**.
  - **Não consome nem é consumido por:** `SpedEcdGenerationService`/`SpedEcfGenerationService`/
    `SpedEcfRealGenerationService` **não são editados** para o MVP deste BRIEF (F-CD8-a pré-preenche o
    **próximo** DTO de geração a partir do `AccountingContact`, mas isso é responsabilidade do
    **caller** — controller/UI que monta o DTO de geração — não uma mudança nos serviços de geração
    em si; ver item 15 do checklist).

## Definição de pronto

Checklist numerado + contratos Zod/Prisma esboçados + forks (2 novos) listados com recomendação e
status `RATIFICAÇÃO PENDENTE`. Os 8 forks do ADR já vêm resolvidos (por delegação) — não são
re-listados como pendentes aqui, só referenciados por decisão.

---

## 1. Checklist de comportamentos

Tags: **[direto]** — implementável sem decisão nova; **[cond:Fork Novo N]** — pausa até o fork novo
(§3) ser ratificado; **[pendente-externa]** — depende do item 0 do contador (gate de todo o incremento,
não listado item a item).

1. **[direto]** `AccountingContact` — model Prisma first-class novo, `{scope (userId+unitId), name,
   email, crc, deletedAt}` (D4). Soft-delete universal (Contrato §2) — nunca `prisma.delete()`.
   `@@unique` **não** trava 1:N por scope (F-CD5-a: várias linhas vivas por `(userId,unitId)` são
   válidas). Testável: duas linhas ativas para o mesmo `(userId,unitId)` não colidem em nenhuma
   constraint.
2. **[direto]** `IAccountingContactRepository` — único lugar com `prisma.accountingContact.*`.
   `findById(scope, id)` resolve **pelo scope** (mesmo padrão de `findJobById`, D8) — contato de outro
   `(userId,unitId)` é `null` → service lança `NotFoundError`, nunca `ForbiddenError`. Testável: teste
   cross-tenant espelhando o já existente para `jobId`.
3. **[direto]** `AccountingContactService` — `registerContact`/`updateContact`/`archiveContact`
   (soft-delete)/`listContacts`. Policy-first: `IAccountingPolicy` ganha `canManageAccountingContact`/
   `canReadAccountingContact` (mesmo par `canManageX`/`canReadX` de todo outro submódulo — Counterparty,
   Payable, Dimension). Testável: chamada sem permissão lança `ForbiddenError` antes de qualquer acesso
   a dados.
4. **[direto]** `AccountingDeliveryLog` — model Prisma first-class novo. Campos: `id, userId, unitId,
   contactId (FK→AccountingContact), ecdJobId (FK→AccountingDataExchangeJob, onDelete: Restrict),
   ecfJobId (FK→AccountingDataExchangeJob, onDelete: Restrict), year (Int — ver item 6/Fork Novo A),
   manifestSha256Ecd, manifestSha256Ecf, status (QUEUED|SENT|FAILED), attemptCount, requestedById,
   sentAt, failedAt, failureReason, createdAt, updatedAt`. **Nunca** copia o `.txt` (F-CD4-a) — só
   referencia os dois jobs de origem. Testável: `prisma migrate diff` mostra só tabelas novas, zero
   alteração em `accounting_data_exchange_jobs`.
5. **[direto]** `AccountingDeliveryLog.ecdJobId`/`ecfJobId` são **FK reais com `onDelete: Restrict`**
   (ACC-CD-6/F-CD4-a) — **precedente novo no schema**: nenhuma FK `Restrict` existe hoje
   (`grep -n "onDelete: Restrict" server/prisma/schema.prisma` não casa nada; todas as FKs atuais são
   `Cascade`). Testável: tentar apagar um `AccountingDataExchangeJob` referenciado por um
   `AccountingDeliveryLog` falha por violação de FK — hoje não há nenhum caminho de hard-delete do job
   (`grep -rn "accountingDataExchangeJob.delete" server/src` vazio), então o teste é preventivo (gate 5
   do parecer), não correção de bug vivo.
6. **[cond:Fork Novo A]** `buildDeliveryPackage`/`confirmDelivery` recebem `year` **explícito no DTO de
   entrada** (não derivado do job — achado do Contexto fixo: o job não persiste ano). Testável: DTO
   `.strict()` rejeita ausência de `year`; o service usa esse `year`, nunca tenta inferir de
   `originalName`.
7. **[direto, cond:Fork Novo A quanto à fonte]** Gate de período (F-CD7-a): `buildDeliveryPackage` (o
   mais cedo possível, antes de `confirmDelivery`) lê **os 12 meses do `year` informado** via
   `IAccountingPeriodRepository.findByYearMonth(scope, year, 1..12)` e recusa (ou marca `draft: true`
   se o dono preferir esse fallback — não é este BRIEF que escolhe, é o ADR que já decidiu (a) exigir)
   **se qualquer um dos 12 não for `HARD_CLOSED`**. Justificativa do "todos os 12, não só dezembro":
   ECD/ECF cobrem o ano-calendário inteiro; um lançamento em qualquer mês do ano ainda `OPEN`/
   `SOFT_CLOSED` altera o resultado anual que o contador assinaria. Testável: 11 meses `HARD_CLOSED` +
   1 `OPEN` → bloqueado; 12/12 `HARD_CLOSED` → permitido (par vermelho→verde).
8. **[direto]** Manifesto: `{scope, year, contactId, files: [{kind:'ECD'|'ECF', sha256, jobId}],
   generatedAt}`. `sha256` de cada arquivo é **lido de `job.sha256`** (`AccountingDataExchangeJob.sha256`
   já gravado na geração) — **nunca recomputado do disco** (F-CD6-a/ACC-CD-3). Se algum caminho recomputar
   por outro motivo, a comparação `computed === job.sha256` é uma asserção que falha ruidosamente (throw),
   nunca um log silencioso. Testável: teste de divergência — hash recomputado ≠ `job.sha256` → erro, não
   log.
9. **[direto]** `confirmDelivery` — comando único (D6/F-CD2-a: confirmação de operador único, sem
   segundo ator), no padrão comando+CAS do maker-checker (ACC-016: nunca `PATCH status`). Cria (ou
   reusa, se já `QUEUED` da mesma chamada de `buildDeliveryPackage`) o `AccountingDeliveryLog` com
   `status='SENT'`. **Semântica nomeada explicitamente (achado do parecer, F-CD1 fork-a-fork):**
   sob F-CD1-a (zero-dependência), `SENT` significa **"o operador confirmou que despachou o pacote"**,
   não "o servidor confirmou entrega real" — o comentário no código e o texto de retorno da API devem
   dizer isso, para não confundir um leitor futuro do status.
10. **[direto]** Idempotência: `@@unique([ecdJobId, ecfJobId, contactId])` em `AccountingDeliveryLog` —
    duas chamadas concorrentes de `confirmDelivery` para o mesmo par de jobs + mesmo contato produzem
    **um** `SENT`, a segunda vê a constraint e retorna o registro existente (ou erro claro), nunca uma
    segunda linha. Teste concorrente obrigatório (gate 6 do parecer).
11. **[direto]** `retryDelivery(scope, deliveryId)` — só transiciona `FAILED → QUEUED` (incrementa
    `attemptCount`) **sobre a linha existente** — nunca cria uma segunda linha para o mesmo par de jobs.
    Reenvio de uma entrega já `SENT` (ex.: contato perdeu o e-mail) **não é coberto** por este comando —
    registrado em "Achados fora de escopo" (§6), não implementado sem decisão do dono.
12. **[direto]** Cross-tenant: `contactId`/`ecdJobId`/`ecfJobId` de outro `scope` referenciados em
    qualquer comando → `NotFoundError` (D8/ACC-CD-4), nunca `ForbiddenError` nem vazamento silencioso de
    nome/e-mail. Testável espelhando o já existente para `jobId`.
13. **[direto]** D7 (invariante, não fork): a resposta de `confirmDelivery` (e de um eventual
    `prepareDelivery`/passo de pré-visualização) **sempre expõe lado a lado** `contact: {name, crc}`
    (do `AccountingContact` escolhido) e — quando disponível pela via barata do item 15 (F-CD8-a) —
    os campos do signatário `codAssin='900'` que **o próprio operador acabou de digitar** no DTO de
    geração pré-preenchido a partir do mesmo contato. **Não depende do parser do Fork Novo B** quando o
    fluxo é "escolher contato → gerar → entregar" (item 15); só ficaria sem essa exibição barata no
    cenário "geração já feita antes, fora do fluxo de entrega" — nomeado, não resolvido, no Fork Novo B.
14. **[direto]** Allowlist de auditoria (`auditCanonical.ts`) ganha, no MESMO PR (regra da casa,
    `accounting-audit-allowlist-guards`, D5): `'contact.registered': ['contactId', 'crc']`,
    `'contact.archived': ['contactId']`, `'delivery.package_built': ['deliveryId', 'ecdJobId',
    'ecfJobId', 'year', 'sha256Ecd', 'sha256Ecf']`, `'delivery.sent': ['deliveryId', 'contactId',
    'attemptCount']`, `'delivery.failed': ['deliveryId', 'contactId', 'attemptCount', 'reason']`.
    **Nunca** `name`/`email` do contato no payload (D5) — só `contactId`. Teste-guarda no MESMO PR:
    nenhum payload de `delivery.*`/`contact.*` carrega e-mail/nome (mesma disciplina de
    `supplierName`/`customerName`).
15. **[direto]** F-CD8-a (pré-preenchimento): **não edita** `SpedEcdGenerationService`/
    `SpedEcfGenerationService`/`SpedEcfRealGenerationService` nem seus DTOs — o pré-preenchimento é
    responsabilidade do **caller** que monta o `SignerSchema` (controller/rota de geração, ou uma UI
    futura) lendo `AccountingContactService.findById` antes de chamar `POST /sped/{ecd,ecf,ecf/real}/
    generate`. Isto respeita a fronteira do Contrato §2.1 (D1 do ADR): a integração entre o cadastro de
    contato e a geração SPED acontece na camada de aplicação, nunca dentro do serializer/model puro.
    Testável: nenhum diff em `lib/sped.ts`/`ecf.ts`/`ecfReal.ts`/`SpedEcdGenerationService.ts`/
    `SpedEcfGenerationService.ts`/`SpedEcfRealGenerationService.ts` neste incremento.
16. **[direto]** Rotas (registro em 2 toques — Contrato §2): `POST /accounting/contacts`,
    `PATCH /accounting/contacts/:id`, `DELETE /accounting/contacts/:id` (soft), `GET
    /accounting/contacts`, `POST /accounting/delivery/build`, `POST /accounting/delivery/confirm`,
    `POST /accounting/delivery/:id/retry`, `GET /accounting/delivery/:id` — todas dentro do router já
    montado em `routes/accounting.ts` (nenhum novo `app.use`); bloco `@openapi` em `docs.paths.ts` +
    `npm run docs:generate` + guard de path-count (`openapi-paths.test.ts`) atualizados no mesmo PR.
    Nenhuma rota pública nova (todas exigem JWT por default, deny-by-default).
17. **[direto]** Factory: `getAccountingContactService()`/`getAccountingDeliveryService()` em
    `lib/factory.ts`, mesmo padrão de `getDataExchangeExportService`/`getSpedEcfGenerationService`
    (injeção via construtor, repo+policy antes do service).
18. **[direto]** Migração SQLite: prólogo `IF EXISTS` obrigatório (memória
    `migracao-sqlite-nao-e-transacional` — `ABORT` deixa a metade de cima aplicada). Smoke sobre **cópia**
    do `dev.db` real (memória `smoke-gate-s6-x-migracao-de-dado`) — tabelas novas, sem backfill de dado
    existente (não há `AccountingContact`/`AccountingDeliveryLog` pré-existente para migrar).
19. **[direto]** LGPD (§4 do ADR, não decisão desta sessão): base legal declarada, minimização (pacote =
    ECD/ECF do período + manifesto, nunca mais), retenção alinhada a 5 anos (mesmo horizonte fiscal),
    log sem conteúdo (nunca corpo de e-mail nem `.txt` duplicado no `AccountingDeliveryLog` — D3/F-CD4-a
    já garante isso por desenho, já que não há coluna de conteúdo). Pendência de revisão por advogado
    nomeada em §4, não fechada aqui.
20. **[direto]** Segurança: nenhuma credencial de canal é introduzida (F-CD1-a é zero-dependência,
    zero credencial). Rate limit simples por scope no comando `confirmDelivery` (§5 do ADR) — mesmo
    padrão de outros comandos de baixo volume; não é o mecanismo primário (confirmação explícita + CAS
    de idempotência são).
21. **[direto]** Testes: `beforeEach(jest.clearAllMocks())`, `referenceDate` fixo, `buildService(overrides?)`
    factory de teste, cross-tenant testa `NotFoundError` — todos os itens do Contrato §5 aplicáveis a
    service novo.
22. **[direto]** i18n: **não se aplica** — backend-only, sem tela nova (mesmo argumento do BRIEF irmão
    da ECF Fase 3).

---

## 2. Contratos esboçados

### Schema Prisma (esboço)

```prisma
// server/prisma/schema.prisma — ESBOÇO, não implementar sem a resposta do item 0 do contador
model AccountingContact {
  id          String    @id @default(cuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  unitId      String
  name        String
  email       String    // PII — nunca em payload de auditoria livre (D5); só aqui, referenciado por id
  crc         String    // formato exato NÃO confirmado — ver §5 insumo ausente
  createdById String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime?
  deliveries  AccountingDeliveryLog[]

  @@index([userId, unitId])
  @@index([deletedAt])
  @@map("accounting_contacts")
}

model AccountingDeliveryLog {
  id                String    @id @default(cuid())
  userId            String
  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  unitId            String
  contactId         String
  contact           AccountingContact         @relation(fields: [contactId], references: [id], onDelete: Restrict)
  ecdJobId          String
  ecdJob            AccountingDataExchangeJob @relation("DeliveryEcdJob", fields: [ecdJobId], references: [id], onDelete: Restrict)
  ecfJobId          String
  ecfJob            AccountingDataExchangeJob @relation("DeliveryEcfJob", fields: [ecfJobId], references: [id], onDelete: Restrict)
  year              Int       // explícito — o job de origem NÃO persiste ano (Fork Novo A)
  manifestSha256Ecd String
  manifestSha256Ecf String
  status            String    // QUEUED | SENT | FAILED
  attemptCount      Int       @default(0)
  requestedById     String
  sentAt            DateTime?
  failedAt          DateTime?
  failureReason     String?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  @@unique([ecdJobId, ecfJobId, contactId])
  @@index([userId, unitId, year])
  @@map("accounting_delivery_logs")
}
```

> `AccountingDataExchangeJob` ganha duas relações reversas nomeadas (`DeliveryEcdJob`/`DeliveryEcfJob`)
> — única mudança nesse model; nenhuma coluna nova, nenhum backfill.

### Zod DTOs (esboço)

```ts
// server/src/features/accounting/dtos/AccountingContactDto.ts — ESBOÇO
export const RegisterContactSchema = z.object({
  unitId: z.string().min(1),
  name: z.string().min(1).max(150),
  email: z.string().email(),
  crc: z.string().min(1).max(20), // shape exato pendente — ver §5
}).strict();

export const UpdateContactSchema = z.object({
  unitId: z.string().min(1),
  contactId: z.string().min(1),
  name: z.string().min(1).max(150).optional(),
  email: z.string().email().optional(),
  crc: z.string().min(1).max(20).optional(),
}).strict();
```

```ts
// server/src/features/accounting/dtos/AccountingDeliveryDto.ts — ESBOÇO
export const BuildDeliveryPackageSchema = z.object({
  unitId: z.string().min(1),
  ecdJobId: z.string().min(1),
  ecfJobId: z.string().min(1),
  year: z.number().int().gte(2000).lte(2100), // Fork Novo A(a) — operador informa, job não persiste
}).strict();

export const ConfirmDeliverySchema = z.object({
  unitId: z.string().min(1),
  ecdJobId: z.string().min(1),
  ecfJobId: z.string().min(1),
  year: z.number().int().gte(2000).lte(2100),
  contactId: z.string().min(1),
  confirmed: z.literal(true), // D6 — nunca implícito
}).strict();

export const RetryDeliverySchema = z.object({
  unitId: z.string().min(1),
  deliveryId: z.string().min(1),
}).strict();
```

### Saída

`confirmDelivery` retorna `{ deliveryId, status, contact: { name, crc }, manifest: { year, files:
[{kind, sha256}] } }` — nenhum e-mail/nome de terceiro fora do que o próprio operador já escolheu na
mesma chamada (D5). Download do `.txt` original continua pela rota já existente do job (INCR-6) —
**nenhuma rota de download de pacote nova nesta fase** (F-CD3-a: pacote = referência aos dois jobs +
manifesto, não um zip novo — decisão que o BRIEF assume por YAGNI, mas fica nomeada: se o dono quiser um
único artefato baixável, é fork adicional fora deste texto).

---

## 3. Forks novos (não cobertos pelo ADR) — RATIFICAÇÃO PENDENTE

**Fork Novo A — Como o comando de entrega sabe qual `year`/período o job cobre:**
- **(a) Recomendado — `year` explícito no DTO de entrada** (`buildDeliveryPackage`/`confirmDelivery`),
  informado pelo operador (o mesmo ano usado para gerar o job). Custo: o operador digita o ano de novo
  (já digitou na geração) — barato e sem migração.
- (b) Migração: `AccountingDataExchangeJob` ganha `year Int?`, populado por
  `SpedGenerationService`/`SpedEcfGenerationService`/`SpedEcfRealGenerationService` na criação do job —
  elimina a redigitação, mas migra uma tabela fora do domínio deste ADR e edita 3 serviços já mergeados
  (INCR-6/ADR-SPED-ECD/ECF) para um dado que hoje só existe como parâmetro transiente.
- (c) Parse de `originalName` (`ecd_${cnpj}_${year}.txt`) para extrair o ano — descartado: nome de
  arquivo é dado de exibição, não contrato; muda e quebra silenciosamente.
- **Recomendação do par:** (a) — zero migração, consistente com o espírito zero-dependência de F-CD1-a;
  (b) fica como upgrade natural se a redigitação incomodar na operação real.

**Fork Novo B — Como (ou se) o gate defensivo F-CD8-b lê o signatário já gravado no `.txt`:**

D7/F-CD8-a (ratificados) cobrem o caso "escolher contato → gerar → entregar" sem precisar ler o arquivo
de volta (o operador digitou o mesmo dado duas vezes na mesma sessão). O caso que falta —
**geração feita antes, fora do fluxo de entrega** (o próprio ADR nomeia esse cenário em F-CD8) — exige
comparar o J930 já gravado no `.txt` contra o `AccountingContact` escolhido depois. Hoje **não existe
nenhum parser SPED de leitura** (`lib/sped.ts`/`ecf.ts`/`ecfReal.ts` só serializam) — implementar F-CD8-b
literalmente exige um componente novo.

- **(a) Escrever um parser mínimo do J930** (extrai só a linha J930 do `.txt` já gerado — poucos campos,
  mesma disciplina de determinismo do serializer). Fecha o caso que falta, mas é componente novo não
  citado por nenhum ADR — superfície de teste extra.
- (b) Persistir os campos do signatário resolvido (nome/CPF/CRC) como coluna denormalizada no momento da
  geração — mais barato de ler depois, mas exige migração + editar os 3 serviços de geração já
  mergeados (colide com o item 15 do checklist, que deliberadamente não os toca).
- **(c) Recomendado — não implementar F-CD8-b neste incremento.** D7 (exibição) + F-CD8-a
  (pré-preenchimento) cobrem a promessa "pronto para assinar" para o fluxo dominante (contato escolhido
  antes da geração). O cenário "geração isolada, contato escolhido depois" fica **nomeado como risco
  residual, não como bug** — se aparecer na operação real, o parser (a) é o upgrade natural.
- **Recomendação do par:** (c) — YAGNI + evita depender de um parser que nenhum ADR pediu; o custo de
  errar é conhecido e pequeno (o cenário residual é raro: a ordem natural do fluxo é escolher o contato
  primeiro, já que é ele quem vai assinar).

Nenhum dos dois forks novos muda D1-D8 nem os 8 forks já ratificados do ADR — são detalhe de
implementação que o texto do ADR não previa por não ter descido ao nível de schema/serviço concreto
(exatamente o papel desta sessão de planejamento).

---

## 4. Pendências de validação externa

- **Contador (item 0 do pedido, `PEDIDO-CONTADOR-2026-09-03.md`):** condição de existência de todo o
  trilho — se vier "não" ou "só lançamento a lançamento", este BRIEF sai do plano.
- **Formato exato do CRC** (`crc: string` no contrato Zod acima é placeholder de shape — dígitos? CRC/UF
  com máscara?) — não há artefato citável no repo nem no pedido ao contador sobre o formato de
  validação do registro profissional. Fica como `z.string().min(1).max(20)` até uma fonte aparecer;
  **não é fork** (não há dois caminhos razoáveis a escolher, é dado ausente).
- **Advogado/LGPD:** base legal do §4 do ADR é razoável por leitura de código, mas não revisada por
  advogado — pendência nomeada, não fechável nesta sessão.

## 5. Insumos ausentes

- **`AccountingDataExchangeJob` não persiste `year`** (achado desta sessão, não citado pelo ADR nem pelo
  parecer) — resolvido como Fork Novo A, mas o achado em si é um insumo que faltou nos dois documentos
  anteriores.
- **Nenhum parser SPED de leitura existe** (achado desta sessão) — relevante ao Fork Novo B; sem ele,
  F-CD8-b (bloqueio automático) não é implementável no MVP sem o componente novo do Fork Novo A(a)... a
  do Fork Novo B(a).
- **Formato do CRC** — ver §4.
- **Manual/checklist do contador sobre "o que ele precisa ver antes de assinar"** (pergunta explícita do
  item 0 do pedido) — pode mudar o conteúdo do pacote (F-CD3) se a resposta pedir mais que ECD+ECF+
  manifesto; este BRIEF assume F-CD3-a como ratificado, mas a resposta do contador pode reabrir essa
  conversa mesmo que F-Z0 não reabra inteiro.

## 6. Achados fora de escopo

- **Reenvio de uma entrega já `SENT`** (contato perdeu o e-mail, por exemplo) não é coberto por
  `retryDelivery` como especificado (só `FAILED→QUEUED`). Não planejado aqui — se vira necessidade real,
  é fork novo de uma sessão futura, não decisão implícita desta.
- **Um único artefato baixável (zip) para o pacote** — F-CD3-a modela o pacote como referência aos dois
  jobs + manifesto, não um arquivo novo. Se o dono quiser "um clique baixa tudo", é frente adjacente,
  não implementada aqui (registrado, não planejado — regra 5 do formulário).

## 7. Divergência de autorização

Nenhuma. A autorização da cédula 2026-09-07 ("ratifico as recomendações de todos os forks") cobre
exatamente os 8 forks do ADR-CONTADOR-DELIVERY listados na rodada 9 do plano — este BRIEF não ratifica
nada por conta própria; os dois forks novos (§3) nascem `RATIFICAÇÃO PENDENTE`, como manda a regra 4 do
formulário de planejamento, e a pré-condição do item 0 do contador é citada, não contornada.

---

## Gates de envio [OPS-001]

1. **Objetivo:** a frase que responde ao pedido é a pré-condição do cabeçalho — o ADR fica Accepted por
   delegação (forks resolvidos) e o BRIEF está escrito, mas a `sessao-feature` não abre até o contador
   responder o item 0.
2. **Grau:** todo claim de código deste BRIEF é **verificado** por leitura nesta sessão (arquivos e
   linhas citados no Contexto fixo); os dois achados novos (job sem `year`, ausência de parser SPED) são
   **verificados** por grep/leitura direta, não inferidos; o formato do CRC é **assumido ausente**
   (não há fonte, nomeado em §5, não chutado).
3. **Caso adversarial tentado:** procurei ativamente uma leitura de período/ano a partir do job
   (`grep -n "year" server/prisma/schema.prisma` na definição do model — zero; busquei método de
   consulta por kind/ano no repositório de data exchange — só `findJobById` existe) antes de assumir que
   o Fork Novo A era necessário; procurei qualquer parser SPED existente
   (`grep -rln "parseJ930|parseSped|parseEcd" server/src`) antes de assumir que o Fork Novo B precisava
   de componente novo — ambas as buscas voltaram vazias, confirmando os achados, não um erro de busca
   (o positivo equivalente, `grep -rln "spedLine|centsToSpedDecimal"`, achou os serializers normalmente).
4. **Checagem que teria falhado se eu estivesse errado:** se o job persistisse `year`, o `grep` no bloco
   do model (`schema.prisma:593-618`) teria mostrado o campo — não mostrou; se existisse um parser SPED,
   ele apareceria no mesmo diretório dos serializers (`server/src/lib/*.ts`) — não apareceu.
5. Estas duas primeiras linhas do BRIEF (banner de pré-condição) entregam a verdade (ADR ratificado por
   delegação, BRIEF pronto) e o risco principal (nenhum código nasce daqui antes da resposta do
   contador — e, mesmo depois, dois forks novos de implementação ainda não têm ratificação).

**Risco silencioso nº 1 (OPS-004):** se a `sessao-feature` que eventualmente executar este BRIEF não
notar a pré-condição no cabeçalho (ou a tratar como "só mais um fork ratificado"), o código pode nascer
antes da resposta do contador — ninguém a avisaria automaticamente, porque nenhum gate estrutural do
repo trava commits contra este item específico. A única guarda é o próprio texto deste documento e a
disciplina de quem invocar `sessao-feature` sobre ele.
