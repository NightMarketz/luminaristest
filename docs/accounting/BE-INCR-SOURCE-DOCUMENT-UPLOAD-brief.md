# BE-INCR-SOURCE-DOCUMENT-UPLOAD — criar `SourceDocument` a partir de um arquivo (BRIEF)

> **Sessão:** `sessao-planejamento` — produz decisão, não código.
> **Autorização:** dono, chat, 2026-10-15, questionário nesta sessão: *"Autorizo só o BRIEF"* (frente "rota que cria
> `SourceDocument` a partir de arquivo — PDF do DAS + documento do histórico pré-adoção"). **Forks F-SD-1..11
> RATIFICADOS** (dono, chat, 2026-10-15: *"Ratifico F-SD-1..11 todos na recomendação do BRIEF. Só o BRIEF — sem
> executa."*). Nota de nó: [`BE-INCR-SOURCE-DOCUMENT-UPLOAD`](../plano/nos/BE-INCR-SOURCE-DOCUMENT-UPLOAD.md). **Sem "executa".**
> **Por quê:** lacuna do PR-B do [`FE-INCR-SIMPLES-brief.md`](FE-INCR-SIMPLES-brief.md) item 9 —
> [[D-2026-10-15-FE-SIMPLES-PR-B-LACUNAS]] (branch `feat/fe-incr-simples-pr-b`, PR #718): *"A rota de BE que cria o
> `SourceDocument` a partir do arquivo vira frente própria … Vale também para o documento do histórico pré-adoção
> (PR-C, item 11)"*. Origem do requisito: P4-5 (a) do [`FE-INCR-TAX-ASSESSMENT-brief.md`](FE-INCR-TAX-ASSESSMENT-brief.md)
> §3.1 (ratificado 08/10: *"Upload no formulário (Recomendado)"*, condicionado a *"se o upload canônico de
> `SourceDocument` servir sem mudança; senão (b)"* — não serve: §0).
> **Base:** `origin/main` `93e96fb4`. **Escopo:** backend; a emenda de FE (campo de arquivo no DAS e no histórico) é
> nó vizinho e vem depois.

## 0. Fatos consumados (lidos nesta sessão)

| Fato | Fonte |
|---|---|
| `SourceDocument`: `userId`/`unitId` escopados sem FK, `sourceType` (taxonomia viva, string), `externalRef?`, `documentDate?`, `description?`, **`attachmentId?` (string solta → `DocumentAttachment`)**, `rawJson?`, `createdById?`, **soft-delete `deletedAt`**; sem `@@unique` de idempotência (D2) | `server/prisma/schema.prisma:910-933` |
| `DocumentAttachment`: **`targetType` + `targetId` obrigatórios** (`JOURNAL_ENTRY \| FISCAL_DOCUMENT \| FISCAL_DOCUMENT_ATTEMPT`), sem FK (F-DFE-19 b); `sha256` calculado no servidor; soft-delete mantém o binário | `schema.prisma:679-699`; `models/DocumentAttachment.model.ts:7` |
| Upload: `POST /api/accounting/attachments` (multipart, campo `file`, 50 MB, allowlist MIME + magic bytes) → `DocumentAttachmentService.upload`: `canManage`, **alvo tem de existir no escopo** (`assertTargetInScope`), grava o disco ANTES da tx, metadado + `attachment.uploaded` na mesma tx, compensação apaga o arquivo se a tx falha (TX-001) | `controllers/documentAttachmentController.ts:24-66`; `services/DocumentAttachmentService.ts:67-170` |
| O DTO de upload aceita só `targetType: 'JOURNAL_ENTRY'` | `dtos/DocumentAttachmentDto.ts` (`UploadDocumentAttachmentSchema`) |
| Download: `GET /api/accounting/attachments/:id?unitId` — por id no escopo, **qualquer `targetType`** | `documentAttachmentController.ts`; `DocumentAttachmentService.getForDownload` |
| Criar `SourceDocument` hoje: só (i) `postEntry` com descritor `sourceDocument` (cria junto com o lançamento) e (ii) `POST /journal-entries/:entryId/source-documents` → `PostingService.attachSourceDocument` (exige lançamento existente; corpo JSON com `attachmentId` opcional; `entry.source_recorded`) | `PostingService.ts:407-437,741-807`; `controllers/sourceDocumentController.ts` |
| Retirada: `PostingService.retireSourceDocument` (soft-delete + `entry.source_retired`), sem rota HTTP | `PostingService.ts:817-835` |
| Histórico: `PUT /simples/historico/:competencia` valida `sourceDocumentId` no escopo (404) | `SimplesEntradasService.ts:37-40` |
| `sourceDocumentExists` = `count({ id, userId, unitId })` — **não filtra `deletedAt`** (SD retirado é aceito) | `repositories/SimplesEntradasRepository.ts:37-39` |
| DAS: `PUT /simples/apuracoes/:competencia/das` grava `sourceDocumentId` **sem validar** (string solta) | `SimplesApuracaoService.ts:230`; `dtos/SimplesDto.ts:165` |
| DAS idempotente (mesmo número + valor) vai direto ao reconcile da provisão e **ignora o `sourceDocumentId`** do corpo — não há como anexar o PDF a um DAS já registrado | `SimplesApuracaoService.ts:199-202` |
| `GET /simples/apuracoes/:competencia` → `dasOficial` = `{ id, numeroDocumento, valorCents, vencimento, provisaoPendente }` — **não expõe o documento** | `SimplesApuracaoService.ts:833` |
| `SimplesHistoricoView` expõe `sourceDocumentId` (sem o `attachmentId` p/ baixar) | `dtos/SimplesDto.ts:125-133` |
| Provisão do DAS: `postEntry` sem descritor `sourceDocument` (o lançamento não aponta o PDF) | `SimplesApuracaoService.ts:772-805` |
| Policies: `canManage` = `canManageLalur` = `canManageTaxAssessment` = `!!actorUserId` hoje (mesmo corpo; nomes distintos) | `policies/AccountingPolicy.ts:11,80,89` |
| Allowlist de auditoria: `attachment.uploaded` já admite alvo polimórfico; `entry.source_recorded` exige `journalEntryId` | `audit/auditCanonical.ts:30,42` |
| openapi: `BASELINE = 288` | `src/__tests__/openapi-paths.test.ts:108` |

## 1. Checklist (um PR, se F-SD-1 = a)

1. **`POST /api/accounting/source-documents`** (multipart, campo `file`) — reusa `makeUploadMiddleware` +
   `validateMagicBytes` do upload de anexo (allowlist e teto conforme F-SD-6); sem arquivo = 400; MIME falsificado = 415.
2. DTO `CreateSourceDocumentUploadSchema` `.strict()` (§2) — `sourceType` da lista fechada de F-SD-3; `documentDate`
   por `isValidDateOnly`; `externalRef` ≤ 255; `description` ≤ 500. Campo desconhecido = 400.
3. Serviço novo `SourceDocumentUploadService.createFromFile(scope, input)` (ou método do `DocumentAttachmentService`,
   ver F-SD-2) — policy de F-SD-5; gera o id do `SourceDocument` **antes** de gravar o disco (o caminho em disco é por
   `targetId`); grava o binário; numa tx: `DocumentAttachment` (`targetType` de F-SD-2, `targetId` = id do SD) +
   `SourceDocument` (`attachmentId` = id do anexo, `createdById` = ator) + auditoria (F-SD-7). Falha na tx ⇒ apaga o
   arquivo (TX-001, mesmo padrão do `upload`).
4. Resposta `201 SourceDocumentUploadView` (§2): o SD + metadado do anexo (`attachmentId`, `fileName`, `mimeType`,
   `fileSize`, `sha256`) — sem `storageKey`, `userId`, `unitId` (mesma regra do `DocumentAttachmentResponse`).
5. `DOCUMENT_ATTACHMENT_TARGET_TYPES` ganha o `targetType` de F-SD-2 e `assertTargetInScope` ganha o `case`
   (o `switch` com `never` obriga); `GET /attachments/:id` baixa o PDF sem mudança.
6. **Consumidores** — histórico: `sourceDocumentExists` passa a exigir `deletedAt: null` (SD retirado = 404).
   DAS: conforme F-SD-4 (validação no escopo) e F-SD-8 (anexar a DAS já registrado).
7. **Leitura** — conforme F-SD-9: `dasOficial` e `SimplesHistoricoView` passam a trazer o documento (para o FE
   baixar pelo `GET /attachments/:id`).
8. Rota em 2 toques (`routes/accounting.ts` + controller), deny-by-default; `@openapi` no controller/DTO;
   `public/openapi.json` regenerado (`npm run docs:generate`); `BASELINE` 288 → 289 (+1 path) medido, não estimado.
9. **DTO snapshot**: schema novo entra no `dtoShapeSnapshot` (inserir só o novo — no Windows o UPDATE reordena,
   memória `dto-snapshot-update-reordena-no-windows`); `.gen.ts` do FE se o gerador incluir.
10. **Allowlist de auditoria**: todo `eventType` novo de F-SD-7/F-SD-8 entra em `auditCanonical.ts` na mesma mudança
    (só ids, hash e códigos — nada de nome de arquivo, que é texto livre do usuário).
11. Testes de integração: upload PDF válido → 201 com `sha256` correto e SD com `attachmentId`; o id devolvido é
    aceito pelo `PUT /historico` (e pelo `PUT …/das` se F-SD-4 = a); SD de outra unidade/escopo = 404 nos dois PUTs;
    SD retirado = 404; MIME fora da allowlist = 400/415; sem `file` = 400; `sourceType` fora da lista = 400; falha
    forçada na tx não deixa arquivo no disco nem SD (compensação); evento de auditoria com o payload exato da
    allowlist; download do anexo pelo `GET /attachments/:id` devolve os mesmos bytes.
12. `tsc` limpo (`npx tsc --noEmit` + `tsc -p tsconfig.test.json`); `npm run check:arch` sem violação nova.

## 2. Contratos (esboço, F-SD-1 = a)

```ts
// multipart/form-data: file + campos abaixo (strings, como chegam do multer)
export const CreateSourceDocumentUploadSchema = z.object({
  unitId: idLike,
  sourceType: z.enum(SOURCE_DOCUMENT_UPLOAD_TYPES),              // F-SD-3: ['tax.simples.das', 'tax.simples.historico']
  externalRef: z.string().trim().min(1).max(255).optional(),     // ex.: número do DAS
  documentDate: z.string().refine(isValidDateOnly, '…').optional(),
  description: z.string().trim().max(500).optional(),
}).strict();

export type SourceDocumentUploadView = {
  id: string; sourceType: string; externalRef: string | null; documentDate: string | null;
  description: string | null; createdAt: string;
  attachment: { id: string; fileName: string; mimeType: string; fileSize: number; sha256: string };
};

// F-SD-9 (a) — leitura nos consumidores
type DocumentoRef = { sourceDocumentId: string; attachmentId: string | null; fileName: string | null } | null;
// dasOficial: { …atual, documento: DocumentoRef }   ·   SimplesHistoricoView: { …atual, documento: DocumentoRef }

// F-SD-7 (a) — evento novo (allowlist)
'source_document.uploaded': ['sourceDocumentId', 'attachmentId', 'sourceType', 'mimeType', 'sizeBytes', 'sha256']
// F-SD-8 (a) — evento novo (allowlist)
'tax.simples_das.documento_anexado': ['apuracaoId', 'competencia', 'sourceDocumentId', 'anteriorSourceDocumentId']
```

## 3. Forks — RATIFICADOS (dono, chat, 2026-10-15 — todos na recomendação)

Decisão = a coluna "Recomendação" de cada linha (F-SD-6 → (b); F-SD-11 → (b); os demais → (a)).

| Fork | Caminhos | Recomendação |
|---|---|---|
| **F-SD-1** Forma do contrato | (a) rota **standalone** `POST /api/accounting/source-documents` (multipart) → devolve o id; o FE envia o arquivo primeiro e passa `sourceDocumentId` nos PUTs que já existem · (b) **multipart nas próprias rotas** `PUT …/das` e `PUT /historico/:competencia` (o arquivo vai junto com o formulário) · (c) generalizar o `POST /attachments` para aceitar alvo vazio e criar o SD no `POST /journal-entries/:id/source-documents` | **(a)** — os dois PUTs já recebem `sourceDocumentId` (contrato pronto); o `PUT …/das` tem gate dentro da tx + 2 commits (atomicUntil postEntry) e não deve ganhar gravação de disco antes da tx; uma rota serve aos dois consumidores e a futuros. (b) duplica o upload em duas rotas e mistura JSON/multipart; (c) abre "anexo sem alvo", que o F-DFE-19 b fechou. Custo de (a): SD órfão quando o usuário envia e desiste (F-SD-10) |
| **F-SD-2** Alvo do `DocumentAttachment` | (a) `targetType` novo `SOURCE_DOCUMENT` com `targetId` = id do SD (SD e anexo nascem na mesma tx; `assertTargetInScope` ganha o case) · (b) reusar `JOURNAL_ENTRY`/outro com alvo fictício · (c) anexo sem alvo (coluna opcional — migração) | **(a)** — sem migração (coluna é string); mantém a regra "todo anexo tem alvo no escopo"; o download existente funciona |
| **F-SD-3** `sourceType` do SD avulso | (a) **lista fechada** no DTO, hoje `tax.simples.das` e `tax.simples.historico`; consumidor novo amplia a lista · (b) string livre (≤ 100) como no `AttachSourceDocument` · (c) derivado pelo consumidor depois (SD nasce `pending`) | **(a)** — `sourceType` é taxonomia de proveniência lida por relatório/drill-down; string livre do cliente polui. Os dois PUTs podem conferir que o SD recebido tem o `sourceType` deles (barato, evita trocar PDF de DAS por extrato) — incluído se (a) |
| **F-SD-4** DAS valida o `sourceDocumentId` | (a) `PUT …/das` passa a validar no escopo (404, mesmo `sourceDocumentExists` do histórico, com `deletedAt: null`), **antes** da tx · (b) deixa como string solta (hoje) | **(a)** — sem isso o id da rota nova vai para o banco sem conferência de escopo; é o consumidor desta frente |
| **F-SD-5** Policy da rota nova | (a) `canManage` (precedente do upload de anexo e do `attachSourceDocument`) · (b) por `sourceType`: `tax.simples.*` exige `canManageTaxAssessment` | **(a)** — hoje os corpos são iguais (§0); quem grava o vínculo é o PUT, que já exige `canManageTaxAssessment`. (b) só faz diferença quando as policies divergirem — registrar como achado |
| **F-SD-6** Arquivos aceitos | (a) **reusar** `DEFAULT_ATTACHMENT_MIME_TYPES` + teto de 50 MB do anexo contábil · (b) restringir a PDF/PNG/JPEG para os `sourceType` do Simples | (b) — o DAS é PDF e o extrato/declaração do histórico costuma ser PDF ou imagem; aceitar DOCX/CSV/`octet-stream` não tem caso de uso aqui e `octet-stream` enfraquece o magic-bytes. Teto 50 MB reusado |
| **F-SD-7** Auditoria do upload | (a) evento **novo** `source_document.uploaded` (só ids/hash/MIME/tamanho) — um evento por operação · (b) reusar `attachment.uploaded` (alvo `SOURCE_DOCUMENT`) e não auditar a criação do SD · (c) os dois eventos | **(a)** — a operação é "criar proveniência", não "anexar a algo existente"; `attachment.uploaded` sozinho não registra o SD. Entra na allowlist na mesma mudança |
| **F-SD-8** Anexar PDF a DAS já registrado | (a) o ramo idempotente (mesmo número + valor) **aceita** `sourceDocumentId` e grava se mudou, com evento `tax.simples_das.documento_anexado` · (b) só na hora do registro; DAS sem PDF fica sem PDF (ou re-registro com outro número) · (c) rota própria `PATCH …/das/documento` | **(a)** — é o caminho que o FE já usa para "completar a provisão pendente"; sem rota nova. Os DAS registrados pelo PR-B (sem PDF) só ganham o PDF assim |
| **F-SD-9** Leitura do documento nos consumidores | (a) `dasOficial.documento` e `SimplesHistoricoView.documento` = `{ sourceDocumentId, attachmentId, fileName }` resolvidos no serviço (o FE baixa pelo `GET /attachments/:id`) · (b) só `sourceDocumentId` + rota nova `GET /source-documents/:id` · (c) nada (o FE não mostra o PDF depois de gravado) | **(a)** — sem rota a mais; o `attachmentId` é o que o download exige. Muda a view (snapshot de shape) |
| **F-SD-10** SD órfão (upload sem PUT) | (a) aceitar: o SD fica sem vínculo, auditado; sem limpeza · (b) job de limpeza por idade (soft-delete) · (c) rota `DELETE /source-documents/:id` para o FE desfazer | **(a)** — volume baixo (1 PDF/mês/unidade); (b)/(c) viram achado. O PDF da competência substituída também fica (trilha) |
| **F-SD-11** Vincular o PDF ao lançamento da provisão | (a) a provisão do DAS liga o SD ao lançamento (`JournalEntrySource`) — drill-down do razão mostra o PDF · (b) não nesta frente: o SD fica só na `SimplesApuracao` | **(b)** — mexe no seam de proveniência do `postEntry` (descritor cria SD novo; ligar SD existente exige `linkEntry` fora do `postEntry`, e a provisão é best-effort fora da tx do registro); vira achado. Ver §4 |

## 4. Pendente de validação externa

- **F-SD-11** depende de regra contábil: se o DAS é o "documento hábil" que precisa estar ligado ao lançamento da
  provisão (documentação de suporte da escrituração — norma a localizar em fonte oficial do CFC) ou se basta estar ligado à apuração.
  Sem artefato lido nesta sessão — não entra no checklist; a recomendação (b) é de escopo, não de mérito contábil.

## 5. Insumos ausentes

- Nenhum gerador de id cuid no servidor (`package.json` tem só `uuid`); o executor escolhe entre `randomUUID`/`uuid`
  (o `idLike` aceita hífen) ou criar o SD antes de gravar o disco e mover o arquivo — decisão de implementação, não de
  contrato, desde que o arquivo nunca fique sem compensação.

## 6. Achados fora de escopo

1. **Rota HTTP de retirada de SD** (`retireSourceDocument` existe sem borda) — F-SD-10 (c).
2. **Policies divergentes no futuro** (`canManage` × `canManageTaxAssessment`) — F-SD-5 (b) se um dia divergirem.
3. **Outros consumidores** de upload de documento de origem (extratos, contratos de parceria, DEFIS) — ampliam a lista
   de F-SD-3 quando tiverem autorização própria.
4. **Emenda de FE** (campo de arquivo no `SimplesDasRegistro` e no `SimplesHistoricoModal`, link de download) —
   nó vizinho do [[FE-INCR-SIMPLES]], depois desta frente.
5. **Proveniência no razão** (F-SD-11 a).
