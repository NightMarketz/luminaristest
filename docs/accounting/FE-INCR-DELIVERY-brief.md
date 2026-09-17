# BRIEF — FE-INCR-DELIVERY (tela do pacote ao contador — nós C6/C6b, crescimento)

> **Estado: BRIEF pronto, forks F-FE-DL-1..4 em RATIFICAÇÃO PENDENTE.** Produzido por `sessao-planejamento`
> em 2026-09-17 contra `origin/main` **`85378005`** (#343), item 4 de `PLANO-SESSAO-2026-09-17-pontas-nao-codigo.md`
> (Fork F-PS-1 → a). Não contém código de aplicação. **Implementação exige "executa" próprio do dono** (ORCH-006).
> **Registra como contrato — não como surpresa — a quebra avisada em `BE-INCR-CONTADOR-PACKAGE-EXTENDED-execution-plan.md`
> §5.1:** `manifest.files[].kind` é `ExportKind` (`'EXPORT_SPED_ECD' | 'EXPORT_SPED_ECF' | …`), **nunca** `'ECD'|'ECF'`.

## Cabeçalho

- **Item a planejar:** tela para o que `BE-INCR-CONTADOR-DELIVERY` (C6, #305) + `BE-INCR-CONTADOR-PACKAGE-EXTENDED`
  (C6b, #337/#338/#340) expõem em `/api/accounting/delivery/*` e `/api/accounting/contacts`: cadastro do contador
  destinatário, perfil de pacote sugerido por contato, **build** (preflight: valida par ECD/ECF + extras, devolve o
  manifesto **sem** enviar), **confirm** (registra que o **operador** despachou — F-CD1-a: o servidor não tem canal nem
  credencial), histórico/detalhe de uma entrega, **retry** de `FAILED`. Nomeado no master map §5.1 linha C6b ("Residual
  = `FE-INCR-DELIVERY`") e no `PROXIMOS-PASSOS-2026-09-17` ("fora da régua").
- **Autorização (ORCH-006):** dono, 2026-09-17: *"Pode planejar em 1 única sessão para fechar as pontas que não são
  implementação de código"* + *"Vai na recomendação dos 5 e abre a sessão"* (F-PS-1 → a, F-PS-5 → a). Cobre
  **planejar**; não cobre implementar nem ratificar fork.
- **Contrato (fato consumado — transcrito):** `server/src/features/accounting/dtos/AccountingDeliveryDto.ts`:

  ```ts
  BuildDeliveryPackageSchema = { unitId, ecdJobId, ecfJobId, extraJobIds: string[] (≤20, default []) }.strict()   // POST /delivery/build → 200 DeliveryManifestPreview
  ConfirmDeliverySchema      = { unitId, ecdJobId, ecfJobId, contactId, confirmed: z.literal(true), extraJobIds }.strict()  // POST /delivery/confirm → 201 ConfirmDeliveryResult (rate-limit 60/15min por usuário)
  PackageProfileSchema       = { kinds: DELIVERABLE_EXPORT_KINDS[] (≤20) }.strict()                                // PUT /delivery/profile?unitId=&contactId=
  PackageProfileQuerySchema  = { unitId, contactId }                                                               // GET /delivery/profile → { kinds: string[] }
  RetryDeliverySchema        = { unitId, deliveryId (== :id, senão 400) }.strict()                                 // POST /delivery/:id/retry (só FAILED → QUEUED)
  AccountingDeliveryScopeQuerySchema = { unitId }                                                                  // GET /delivery/:id → AccountingDeliveryLog
  ```
  `AccountingContactDto.ts`: `RegisterContactSchema = { unitId, name (≤ NAME_MAX), email, cpf (11 dígitos c/ DV), phone?
  (10-11), crcNumber (UF-NNNNNN/O-D), crcUf (UF_CODES), crcCertificate? (UF/AAAA/NÚMERO), crcCertificateValidUntil?
  (date-only) }.strict().superRefine(crcUf === UF do crcNumber)`; `UpdateContactSchema` (patch; `contactId == :id`
  senão 400; `null` limpa `phone/crcCertificate/…ValidUntil`); `GET /contacts?unitId=` → `AccountingContact[]`;
  `DELETE /contacts/:id` = arquivar (soft). Rotas `routes/accounting.ts:220-236` (`/delivery/profile` **antes** de
  `/delivery/:id`); `docs.paths.ts:4364-4490`.
  Constantes (`models/AccountingDelivery.model.ts`): `DELIVERY_STATUSES = QUEUED | SENT | FAILED`;
  `DELIVERABLE_EXPORT_KINDS = EXPORT_TRIAL_BALANCE | EXPORT_GENERAL_LEDGER | EXPORT_BALANCE_SHEET | EXPORT_INCOME_STATEMENT |
  EXPORT_BANK_RECONCILIATION | EXPORT_ENTRY_SAMPLE` (SPED **nunca** é extra).
  Policy (`AccountingDeliveryService.ts:127,162,275,294`): build/confirm/retry = `canManageAccountingContact`;
  `getDelivery` = `canReadAccountingContact`.
  **Respostas** (`AccountingDelivery.model.ts:53-78`, `AccountingDeliveryService.ts:49-66`, Prisma `:1394-1489`):

  ```ts
  DeliveryManifestFile   = { kind: ExportKind, jobId, sha256 }            // ⚠ kind = 'EXPORT_SPED_ECD' | 'EXPORT_SPED_ECF' | extra ∈ DELIVERABLE_EXPORT_KINDS
  DeliveryManifest       = { scope: { unitId, ledgerCode }, period: { start: 'YYYY-MM-DD', end }, contactId,
                             core: { ecd: DeliveryManifestFile, ecf: DeliveryManifestFile },
                             files: DeliveryManifestFile[] /* [core.ecd, core.ecf, ...extras] na ordem position */, generatedAt }
  DeliveryManifestPreview = Omit<DeliveryManifest, 'contactId'>           // resposta do build
  ConfirmDeliveryResult  = { deliveryId, status: 'SENT', statusMeaning: string /* "o operador confirmou que despachou" */,
                             contact: { name, crcNumber, crcUf }, signer: J930Signer, manifest: DeliveryManifest }
  AccountingDeliveryLog  = { id, unitId, contactId, ecdJobId, ecfJobId, periodStart, periodEnd, manifestSha256Ecd,
                             manifestSha256Ecf, status, attemptCount, requestedById, sentAt, failedAt, failureReason,
                             createdAt, updatedAt }   // SEM items[]: `AccountingDeliveryRepository.findById` (:24-30) é findFirst sem include
  AccountingContact      = { id, unitId, name, email, cpf, phone, crcNumber, crcUf, crcCertificate, crcCertificateValidUntil,
                             deletedAt, createdAt, updatedAt, packageProfile?: Json }
  ```
  **Erros nomeados** (`AccountingDeliveryService.ts:332-495`): job não é ECD/ECF · não `EXPORTED` · sem período · períodos
  divergentes · meses **não `HARD_CLOSED`** ("Feche o período inteiro antes de entregar") · extra duplicado / não
  `EXPORTED` / sem `sha256` / kind fora de `DELIVERABLE_EXPORT_KINDS` / período fora do núcleo · **409
  `PACKAGE_ALREADY_DELIVERED`** (mesmo núcleo já entregue ao contato com **outro** conjunto de extras) · **409
  `REVIEW_REQUIRED` / `REVIEW_REJECTED`** (C11: par sem revisão assinada, `AccountingReviewService.ts:436-450`) ·
  400 "Só uma entrega FAILED pode ser reprocessada".
- **Fatos verificados nesta sessão:**
  1. **Zero consumidor FE** de `delivery/*` e de `contacts` (`grep -rn "accounting/contacts\|delivery" my-app --include=*.ts*`
     = 0 fora de node_modules). Não existe cadastro de contador na tela — Fork **F-FE-DL-1**.
  2. **Não existe lista de jobs** no BE (mesmo achado do `FE-INCR-REVIEW` fato 2, Fork F-FE-RV-1) — o build precisa de
     `ecdJobId`, `ecfJobId` e `extraJobIds` que a tela não tem como listar. Este BRIEF **depende da mesma ratificação**
     (F-FE-RV-1 → a) e não abre fork duplicado; se F-FE-RV-1 for (b)/(c), este BRIEF ganha um fork próprio.
  3. **Extras só existem se o export foi gerado com período** (C6b PR-1/PR-2: `DataExchangeDto.ts:63-64` `periodStart/End`
     opcionais; obrigatórios para `EXPORT_BANK_RECONCILIATION`/`EXPORT_ENTRY_SAMPLE`, `:33`). **Verificado no FE:**
     `ImportExportPanel.tsx:148-155` envia só `{ kind, format, unitId, asOf?, accountCode? }` — **nunca `periodStart/End`**
     — e `dataExchange.service.ts:18-23` `ExportKind` **não tem** os 2 kinds novos. Consequência de contrato: pelo painel de
     hoje, **só o balancete** (com `asOf` → período `[Jan-1, asOf]`, F-C6b-6 a) vira extra válido; razão/BP/DRE saem sem
     período (400 nomeado no build) e conciliação/amostra **não podem ser gerados** pela tela. ⇒ achado §6.2 (crescimento
     do `ImportExportPanel`: campo de período + 2 kinds), pré-requisito prático dos extras — a tela de entrega diz isso
     no item 6, não esconde.
  4. **`confirmed: z.literal(true)`** (D6): a confirmação é explícita — a tela tem um **checkbox** "Confirmo que despachei
     o pacote ao contador pelo meu canal" e só envia com ele marcado; nunca `confirmed: false`.
  5. **Rate-limit** do `confirm` (`routes/accounting.ts:202-212`, 60/15 min por usuário) — 429 é `resolveError` normal.
  6. Canônicos de shape iguais aos BRIEFs irmãos: `<table>` + `Modal` + `formatDate` (period date-only) + `resolveErrorWithCode`
     (os 409 têm `code`).
- **Nós vizinhos:** consome C6/C6b (BE ✅), C11 via `REVIEW_REQUIRED` (→ `FE-INCR-REVIEW`, BRIEF irmão), jobs de
  `SpedGenerationPanel` e exports do `ImportExportPanel`. C12 (`ready`) alimenta o `signer` J930 pelo contato — a tela
  mostra `signer` como devolvido, sem regra própria. C8 (F-FA7 → b) fará o `build` recusar quando a ECD substituta exigir
  ECF retificadora — mensagem nova, mesma classe de 400 nomeado.

## Definição de pronto

Seção **"Entrega ao contador"** na aba Compliance (ou aba — F-FE-DL-2), depois da revisão: cadastro de contatos
(F-FE-DL-1), perfil de pacote por contato, **montar pacote** (escolher ECD/ECF/extras → `build` → manifesto na tela com
`kind`/`jobId`/`sha256`/período), **confirmar despacho** (contato + checkbox explícito → `confirm` → recibo com contato,
signatário J930 e manifesto), histórico de entregas com detalhe e `retry`; 409 `REVIEW_REQUIRED` linka para a revisão;
i18n pt/en; vitest com shim `globalThis.React`; `tsc` limpo; **build de produção** (withAuth); sign-off de browser = humano.

## 1. Checklist de comportamentos

### Serviço e estrutura

1. **[direto]** `lib/services/accountingDelivery.service.ts`: `listContacts(unitId)`, `registerContact(body)`,
   `updateContact(id, body)`, `archiveContact(id, unitId)`, `getProfile(unitId, contactId)`, `setProfile(unitId, contactId,
   kinds)`, `build(body)`, `confirm(body)`, `getDelivery(id, unitId)`, `retry(id, unitId)`; tipos transcritos do cabeçalho.
   `retry` envia `{ unitId, deliveryId: id }` (o BE exige igualdade). Testável: URLs/bodies exatos; `confirm` nunca é
   chamado com `confirmed !== true`.
2. **[F-FE-DL-2]** `features/accounting/components/DeliveryPanel.tsx` no bloco `activeTab === 'compliance'`, **depois** de
   `ReviewPanel` (fluxo gerar → revisar → entregar). `section rounded-2xl …`; título `t('delivery.title', 'Entrega ao
   contador')`; subtítulo fixo com o **significado do SENT**: "o sistema não envia nada — registra que você despachou"
   (F-CD1-a). Sem `zinc-*`.

### Contatos (F-FE-DL-1)

3. **[F-FE-DL-1]** Sub-seção **Contadores**: `<table>` (nome, e-mail, CRC `crcNumber`/`crcUf`, certidão + validade
   `formatDate`, ações editar/arquivar) + `Modal` criar/editar com os campos do `RegisterContactSchema` (CPF 11 dígitos
   com máscara visual, CRC placeholder `SP-123456/O-1`, UF select reusando **`UF_CODES` de `SpedGenerationPanel.tsx:23`**
   — espelho já existente do BE; não criar 3ª cópia).
   Arquivar = `DELETE` soft com confirmação; contato arquivado some da lista e do select do item 8 (o BE devolve 400
   "arquivado" no confirm). Erros 400 do `superRefine` (UF do CRC ≠ `crcUf`) íntegros. Testável: submit chama
   `registerContact` com body exato; `null` explícito para limpar certidão na edição.
4. **[direto]** **Perfil de pacote** por contato (`GET/PUT /delivery/profile`): no modal do contato (ou coluna), checkboxes
   sobre `DELIVERABLE_EXPORT_KINDS` (rótulos i18n: Balancete · Razão geral · BP · DRE · Conciliação bancária · Amostra de
   lançamentos); salvar = `PUT { kinds }`. É **sugestão, não gate** (F-C6b-2 a): a tela pré-marca os extras no build e
   deixa o operador mudar. Testável: `GET` com `kinds: []` ⇒ nada pré-marcado; `PUT` envia só `kinds`.

### Montar pacote

5. **[dep. F-FE-RV-1]** Sub-seção **Montar pacote**: exercício (default `scopeToday()`), **ECD** e **ECF** (selects de
   jobs `EXPORTED` `kind ∈ {EXPORT_SPED_ECD, EXPORT_SPED_ECF*}` do exercício — fonte = endpoint de lista de jobs,
   F-FE-RV-1 a), **extras** (multi-seleção de jobs `EXPORTED` com `kind ∈ DELIVERABLE_EXPORT_KINDS` e período dentro do
   núcleo, pré-marcados pelo perfil do contato escolhido — item 4; máx. 20). Botão **"Validar pacote"** → `POST /build`.
6. **[direto]** Resultado do build = **manifesto na tela**: período (`formatDate(start)–formatDate(end)`), `ledgerCode`,
   tabela `files[]` na ordem `position` com **`kind` traduzido por mapa fechado sobre `ExportKind`** (⚠ contrato: `kind`
   é `'EXPORT_SPED_ECD'`, não `'ECD'` — teste-guarda: o mapa cobre os 3 kinds SPED de `models/DataExchange.model.ts:23-28`
   (`EXPORT_SPED_ECD`, `EXPORT_SPED_ECF`, `EXPORT_SPED_ECF_REAL`) + os 6 de `DELIVERABLE_EXPORT_KINDS`, e **assere que
   `core.ecd.kind`/`core.ecf.kind` estão no mapa**), `jobId` curto, `sha256` (12 chars + copiar), `generatedAt`. Erros 400 nomeados íntegros; o de **período não
   HARD_CLOSED** ganha link "Períodos" (aba `periodos`); o de **extra sem período** ganha texto "gere o relatório com
   período na aba Importação/Exportação". 409 `REVIEW_REQUIRED`/`REVIEW_REJECTED` (`code` via `resolveErrorWithCode`)
   ⇒ link "Revisão profissional ↑" (`ReviewPanel`). Testável: fixture de manifesto com 2 core + 2 extras renderiza 4
   linhas na ordem; 409 com `code='REVIEW_REQUIRED'` mostra o link.

### Confirmar despacho

7. **[direto]** Após build OK: **contato** (select dos ativos — item 3), **checkbox** "Confirmo que despachei este pacote
   ao contador pelo meu canal (e-mail/portal); o sistema não envia" (D6, `confirmed: true` só com o checkbox), botão
   **"Registrar despacho"** → `POST /confirm` com **o mesmo** `{ ecdJobId, ecfJobId, extraJobIds }` do build (divergir
   de entrega existente = 409 `PACKAGE_ALREADY_DELIVERED` — mostrado íntegro, com o `deliveryId` da mensagem). Sucesso ⇒
   **recibo** (`Modal`): `deliveryId`, `status` + `statusMeaning` **como devolvido** (não traduzir a semântica), contato
   (`name · crcNumber/crcUf`), **signatário J930** (`signer` — campos como vêm; é o "via barata" da cédula 10/09 §6 F2),
   manifesto. Botão "copiar manifesto (JSON)". Testável: sem checkbox o botão fica desabilitado e o service não é chamado;
   body inclui `confirmed: true` literal; 429 exibido.
8. **[F-FE-DL-3]** Download dos arquivos do pacote a partir do recibo/manifesto: link por `files[]` para
   `dataExchangeService.downloadArtifact(jobId, unitId, fileName)` (rota existente `GET /data-exchange/jobs/:jobId/download`) —
   o operador baixa os `.txt`/CSV e despacha pelo canal dele. Fork F-FE-DL-3 (baixar um a um × zip no FE).

### Histórico e retry

9. **[dep. F-FE-DL-4]** Sub-seção **Entregas**: lista de `AccountingDeliveryLog` do escopo — **não existe `GET /delivery`
   (lista)**, só `GET /delivery/:id` (`routes/accounting.ts:236`). Fork **F-FE-DL-4**. Cada linha: período, contato, status
   (`QUEUED` âmbar · `SENT` verde · `FAILED` vermelho), `attemptCount`, `sentAt`/`failedAt` + `failureReason`, ação
   "detalhe" (`GET /:id`) e **retry** (só `FAILED`; body `{ unitId, deliveryId }`; sucesso ⇒ `QUEUED`, `attemptCount+1`).
   Testável: `FAILED` mostra retry; `SENT` não; 400 do retry íntegro.
10. **[direto]** Detalhe (`GET /:id`): campos do log + `manifestSha256Ecd/Ecf`. **Sem itens/extras** (o repo não inclui
    `items[]` — fato verificado); mostrar os extras de uma entrega antiga exige crescimento do BE (achado §6.6). Cross-tenant
    = 404 (nunca 403) — a tela trata como "não encontrada".

### Permissões, i18n, verificação

11. **[direto]** 403 (`canManageAccountingContact`) em build/confirm/retry ⇒ mensagem íntegra; leitura de contatos/entregas
    sob `canReadAccountingContact`. Sem esconder botão por role (policy é do escopo).
12. **[direto]** i18n `delivery.*` + `contacts.*` pt/en no mesmo PR; mapa `ExportKind` → rótulo com teste de cobertura
    (todo literal de `DELIVERABLE_EXPORT_KINDS` + os 2/3 kinds SPED).
13. **[direto]** Testes vitest com `globalThis.React`; `vi.mock` relativo; `tsc`; `npm run build`; ensaio no browser contra
    cópia do `dev.db` real: `accounting_delivery_logs` = 0 e `accounting_contacts` = 0 (S6 vacuoso declarado no C6b) ⇒ o
    ensaio cadastra 1 contato, gera ECD+ECF, abre e assina a revisão (`FE-INCR-REVIEW` — ou por curl se a tela dela não
    existir ainda), fecha os 12 meses `HARD_CLOSED`, monta e confirma. Sign-off de browser = humano.

## 2. Contratos esboçados

### 2.1 Service FE (`lib/services/accountingDelivery.service.ts`)

```ts
export type DeliveryStatus = 'QUEUED'|'SENT'|'FAILED';
export type DeliverableExportKind = 'EXPORT_TRIAL_BALANCE'|'EXPORT_GENERAL_LEDGER'|'EXPORT_BALANCE_SHEET'|'EXPORT_INCOME_STATEMENT'|'EXPORT_BANK_RECONCILIATION'|'EXPORT_ENTRY_SAMPLE';
export interface DeliveryManifestFile { kind: string /* ExportKind — NUNCA 'ECD'|'ECF' */; jobId: string; sha256: string }
export interface DeliveryManifestPreview { scope: { unitId; ledgerCode }; period: { start; end }; core: { ecd: DeliveryManifestFile; ecf: DeliveryManifestFile }; files: DeliveryManifestFile[]; generatedAt: string }
export interface ConfirmDeliveryResult { deliveryId; status: DeliveryStatus; statusMeaning: string; contact: { name; crcNumber; crcUf }; signer: Record<string, string>; manifest: DeliveryManifestPreview & { contactId: string } }
listContacts(unitId) → AccountingContact[]                         // GET /accounting/contacts?unitId=
registerContact(body) / updateContact(id, { unitId, contactId: id, ...patch }) / archiveContact(id, unitId)
getProfile(unitId, contactId) → { kinds: DeliverableExportKind[] }  // GET /accounting/delivery/profile
setProfile(unitId, contactId, kinds) → { kinds }                   // PUT (query unitId/contactId, body { kinds })
build({ unitId, ecdJobId, ecfJobId, extraJobIds }) → DeliveryManifestPreview
confirm({ unitId, ecdJobId, ecfJobId, contactId, confirmed: true, extraJobIds }) → ConfirmDeliveryResult   // 201
getDelivery(id, unitId) → AccountingDeliveryLog
retry(id, unitId) → AccountingDeliveryLog                            // body { unitId, deliveryId: id }
```

### 2.2 Toques no BE que os forks podem pedir (cada um = 1 rota, `docs.paths.ts`, BASELINE +1, snapshot de DTO)

```ts
GET /api/accounting/data-exchange/jobs   // F-FE-RV-1 (a) — compartilhado com FE-INCR-REVIEW e C8 item 30
GET /api/accounting/delivery?unitId=&status=&year=&page=&limit=   // F-FE-DL-4 (a) → { items: AccountingDeliveryLog[], total, page, limit }; policy canReadAccountingContact
```

## 3. Forks — RATIFICAÇÃO PENDENTE

### Fork F-FE-DL-1 — Cadastro do contador: dentro desta tela ou incremento próprio

| Perna | O que faz | O que deixa aberto |
|---|---|---|
| **(a) Sub-seção "Contadores" dentro de `FE-INCR-DELIVERY` (CRUD + perfil) — RECOMENDADA** | O contato só existe para receber o pacote e assinar o J930 (C12); sem ele o `confirm` não tem `contactId`; 4 rotas pequenas; um PR só | A seção cresce (contatos + pacote + histórico); mitigação: 3 sub-seções colapsáveis |
| (b) `FE-INCR-CONTACTS` separado, antes deste | PRs menores | Duas autorizações e dois reviews para uma tela que só faz sentido junta; o dono já vetou fatiar por "menor PR" quando o objeto é um só (C11 em 1 PR) |

**Recomendação: (a).**

### Fork F-FE-DL-2 — Onde a tela vive

| Perna | O que faz |
|---|---|
| **(a) Seção da aba Compliance depois de `ReviewPanel` (gerar → revisar → entregar) — RECOMENDADA** | Mesmo precedente dos BRIEFs irmãos; a Compliance passa a contar a história inteira do SPED |
| (b) Aba própria `contador` | Espaço; 22ª aba |

**Recomendação: (a).** Se a Compliance ficar longa demais (5 seções), o dono decide uma aba "SPED" que absorva
geração + revisão + entrega — fork futuro, não deste BRIEF.

### Fork F-FE-DL-3 — Como o operador obtém os arquivos para despachar

| Perna | O que faz | O que deixa aberto |
|---|---|---|
| **(a) Links de download por arquivo do manifesto (rota `/download` existente) + "copiar manifesto JSON" — RECOMENDADA** | Zero código novo de empacotamento; o `sha256` na tela permite conferir o que foi baixado | N cliques para N arquivos (núcleo 2 + extras ≤ 20) |
| (b) Zip montado no FE (JSZip — dependência nova) com os arquivos + `manifest.json` | 1 clique | Dependência nova para o que N links resolvem; o zip não é o que a RFB/contador exige (o `.txt` é) |
| (c) Endpoint `GET /delivery/:id/archive` no BE | Zip canônico com sha | Transporte/empacotamento fora de escopo do C6/C6b (F-CD1-a, BRIEF C6b §6) |

**Recomendação: (a).**

### Fork F-FE-DL-4 — Histórico de entregas sem `GET /delivery` (lista)

| Perna | O que faz | O que deixa aberto |
|---|---|---|
| **(a) Endpoint novo `GET /api/accounting/delivery` (lista paginada por status/exercício) — RECOMENDADA** | Sem ele o histórico não existe: `deliveryId` só aparece no recibo; +1 rota (mesma exceção dos irmãos) | BASELINE do path-count +1; policy `canReadAccountingContact` |
| (b) Sem histórico: a tela guarda o último recibo em memória e oferece "consultar por id" (`GET /:id`) | Zero toque no BE | `retry` de `FAILED` fica inacessível sem o id; contraria "histórico `GET /:id`" listado no plano da sessão |

**Recomendação: (a).**

## 4. Pendências de validação externa

- **Conjunto de demonstrativos do pacote** (C6b §6.1; pedido ao contador #331 item ampliado) — a tela lê
  `DELIVERABLE_EXPORT_KINDS` **do código** (mapa fechado com teste de cobertura), não do pedido; se o contador pedir kind
  novo, é aditivo no BE e o mapa da tela quebra o teste de cobertura de propósito.
- Canal de envio (e-mail/portal do contador) — fora do sistema por decisão (F-CD1-a); a tela só registra.

## 5. Insumos ausentes

- **Lista de jobs** (F-FE-RV-1, BRIEF irmão) e **lista de entregas** (F-FE-DL-4) — sem os dois, a tela não monta pacote
  nem mostra histórico. Decidir antes da `sessao-feature`.
- **Período nos exports pelo FE** (fato 3): sem o crescimento do `ImportExportPanel` (achado §6.2), os únicos extras
  montáveis pela tela são balancetes com `asOf`. Não bloqueia o núcleo (ECD+ECF) — bloqueia o "pacote ampliado" na prática.

## 6. Achados fora de escopo

1. **`GET /delivery` (lista)** não existe no BE — F-FE-DL-4 (a) o cria dentro deste FE; se o dono preferir BE próprio,
   é `BE-INCR-DELIVERY-LIST` (P, 1 rota).
2. **`ImportExportPanel` sem período e sem os 2 kinds novos** (verificado: `ImportExportPanel.tsx:148-155`,
   `dataExchange.service.ts:18-23`): razão/BP/DRE saem sem `periodStart/End` (não entram no pacote) e
   `EXPORT_BANK_RECONCILIATION`/`EXPORT_ENTRY_SAMPLE` nem aparecem no select. Crescimento do painel existente
   (`FE-INCR-DATA-EXCHANGE-PERIOD`: 2 `<input type="date">` + 2 opções + `seed`/`perAccount` da amostra) — **pré-requisito
   prático** dos extras; não deste BRIEF.
3. **Relatório de imobilizado como extra** (`EXPORT_FIXED_ASSETS`, BRIEF C8 §7) — aditivo em `DELIVERABLE_EXPORT_KINDS`
   quando C8 landar; o mapa da tela ganha 1 rótulo.
4. **Perfil por escopo** (não por contato) e **transporte** (e-mail/SFTP) — BRIEF C6b §6, inalterados.
5. **Contato → pré-preencher sign-off da revisão** (nome + CRC) — cruzamento com `FE-INCR-REVIEW` item 11; 1 select
   opcional lá quando esta tela existir.
6. **`GET /delivery/:id` sem `items[]`** — o detalhe de uma entrega antiga não lista os extras; 1 `include` no repo
   (crescimento do C6b), ou o `GET /delivery` de F-FE-DL-4 já nasce com `items`.
