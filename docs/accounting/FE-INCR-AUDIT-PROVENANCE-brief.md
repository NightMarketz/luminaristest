# BRIEF — FE-INCR-AUDIT-PROVENANCE (UI de auditoria: verificar cadeia de hash + proveniência por lançamento)

> Produzido por **sessão de planejamento**, 2026-09-07, sobre `origin/main` `d162cd4d` (PR #270
> mergeado). Não contém código de aplicação, não ratifica fork. Todo fork abaixo está
> **RATIFICAÇÃO PENDENTE** — decisão do dono, fora desta sessão (ORCH-006). Sem os forks ratificados
> a `sessao-feature` não abre.

## Cabeçalho

- **Item a planejar:** frontend de dois endpoints já em `main`, ambos read-only (com um terceiro
  endpoint de escrita fora do escopo — ver "Achados fora de escopo"): `GET
  /api/accounting/audit/verify-chain` (verifica a integridade da hash-chain do
  `AuditEvent` do escopo) e `GET /api/accounting/journal-entries/:entryId/source-documents`
  (lista os `SourceDocument` vinculados a um lançamento). Hoje `my-app` **não cita** `verify-chain`
  nem `source-documents`/`SourceDocument` em nenhum arquivo (grep nesta sessão) — 0 consumidor FE,
  confirmando `ACCOUNTING-MASTER-MAP.md:498`.
- **Autorização (ORCH-006):**
  [CEDULA-DECISAO-2026-09-03-modulos.md](CEDULA-DECISAO-2026-09-03-modulos.md) **F-M4** ("Os 3
  itens: tela de `verify-chain`, tela de `source-documents`, envio de ECD/ECF por e-mail ao
  contador" — ratificado, contra a recomendação que deixava diferido) → item **C4** (§E, linha 161):
  "`sessao-planejamento` → BRIEF **FE-INCR-AUDIT-PROVENANCE**: botão 'verificar cadeia'
  (`verify-chain`) + lista de documentos de origem no `JournalEntriesPanel`"; confirmado também em
  `ACCOUNTING-MASTER-MAP.md:498` ("autorizado BRIEF 2026-09-03 (F-M2/F-M4)") e no
  [PLANO-SDD-SEQUENCIAL-2026-09-07.md](PLANO-SDD-SEQUENCIAL-2026-09-07.md) rodada 4
  (nós **C4/C5** do [GRAFO-DEPENDENCIAS-2026-09-07.md](GRAFO-DEPENDENCIAS-2026-09-07.md), estado
  `ready`, nenhuma aresta de entrada aberta). Gatilho do dono, 2026-09-07: *"Pode disparar o plano em
  multi agent sonnet até finalizar"* (autoriza a rodada 4 do plano, que nomeia esta sessão). A
  autorização cobre **produzir este BRIEF** e nada além; a implementação é a próxima sessão
  (`sessao-feature`), condicionada aos forks ratificados.
- **Sem divergência de letra vs. objetivo (T1):** ao contrário do BRIEF irmão `FE-INCR-NFE`, a
  autorização aqui já nomeia o componente exato (`JournalEntriesPanel`) para os dois fluxos — não há
  ambiguidade de local a resolver por leitura de objetivo.
- **Fatos verificados nesta sessão (código, não memória):**
  - `GET /api/accounting/audit/verify-chain` — rota registrada
    (`server/src/routes/accounting.ts:94`), controller `getVerifyAuditChain`
    (`accountingController.ts:460-482`), query só `unitId`
    (`VerifyAuditChainQuerySchema`, `AuditDto.ts:9`, sem `.strict()` — 1 campo, precedente
    `CounterpartyScopeQuerySchema`). Serviço `AuditService.verifyAuditChain`
    (`AuditService.ts:116-…`) gated por `policy.canRead(scope)` → `ForbiddenError` (403) se não.
    Escaneia **toda** a cadeia do escopo (sem paginação/posição) — é operação O(n) sobre
    `AuditEvent`, não algo para rodar automaticamente a cada render.
  - Resposta 200: `{ success: true, data: { ok, checkedEvents, firstSeq, lastSeq, headHash,
    failure? } }`. `firstSeq`/`lastSeq`/`failure.seq` são **`bigint` no domínio, serializados como
    `string`** pelo controller antes do `res.json` (`accountingController.ts:466-480`, F-A2) — o
    cliente **nunca** recebe `bigint`; trata os três como `string | null`. `failure.reason` é enum
    fechado: `MISSING_GENESIS | SEQ_GAP | PREV_HASH_MISMATCH | HASH_MISMATCH | HEAD_MISMATCH`
    (`docs.paths.ts:1918`, `VerifyFailureReason` em `AuditService.ts`). Cadeia vazia (nenhum
    `AuditEvent` no escopo) devolve `{ ok: true, checkedEvents: 0, firstSeq: null, lastSeq: null,
    headHash: null }` (sem `failure`) — não é erro.
  - `GET /api/accounting/journal-entries/:entryId/source-documents` — rota registrada
    (`accounting.ts:116`), controller `listSourceDocuments` (`sourceDocumentController.ts:82-105`),
    query só `unitId` (`ListSourceDocumentsQuerySchema`, `SourceDocumentDto.ts:76-80`, `.strict()`).
    Serviço `PostingService.listSourceDocuments` (`PostingService.ts:811-820`) gated por
    `policy.canRead(scope)` → 403 se não; `NotFoundError`/lista vazia não são distinguidos — um
    `entryId` de outra unidade ou inexistente devolve **lista vazia**, não 404 (confirmado lendo o
    repositório: `findSourcesByEntry` é `SELECT … WHERE unitId=scope`, nunca lança).
  - Resposta 200: `{ success: true, data: JournalEntrySourceWithDocument[] }`, onde cada item é
    `JournalEntrySource & { sourceDocument: SourceDocument }`
    (`ISourceProvenanceRepository.ts:26-28`). Campos do vínculo: `id, userId, unitId,
    journalEntryId, sourceDocumentId, createdAt`. Campos do documento
    (`sourceDocument`): `id, userId, unitId, sourceType, externalRef, documentDate, description,
    attachmentId, rawJson, createdById, createdAt, updatedAt, deletedAt` — **todos string/Date,
    nenhum `bigint`/cents**. `documentDate` é `DateTime?` construído no servidor via `new
    Date('YYYY-MM-DD')` a partir de um input date-only (`PostingService.ts:776`) — serializa como
    ISO com `T00:00:00.000Z`; ler só os 10 primeiros caracteres (mesma técnica do `formatDate`
    canônico) evita o UTC-shift. `createdAt`/`updatedAt` são timestamps reais (hora importa), sem
    precedente de exibição hora-a-hora em nenhum painel de `my-app/features/accounting` (grep:
    zero uso de `attachment`/timestamp-com-hora nesses componentes) — ver **F-FEAP-5**.
  - **Lançamentos sem origem são o caso comum, não o de borda** (ADR-INCR8 D5,
    `ADR-INCR8-source-document-provenance.md` §D5): `postEntry` só cria `SourceDocument` quando o
    `sourceDocument` descritor é passado; `sourceType ∈ {Manual (padrão), Reversal}` **nunca** o
    passam — todo lançamento manual e todo estorno devolve lista **vazia**, sempre. Confirmado por
    grep (`sourceType.match` do controller do estorno não passa descritor).
  - **`attachmentId` é populado de verdade em fluxos reais**, não é campo morto: `PayableService.ts:912`
    e `ReceivableService.ts:586` passam `dto.attachmentId` ao registrar baixa com comprovante —
    quando esse lançamento tem `SourceDocument`, o drill-down mostra um id de anexo baixável via
    `GET /api/accounting/attachments/:id?unitId=…` (`accounting.ts:108`,
    `documentAttachmentController.ts:92-118`, stream binário com `Content-Disposition`). Golden ref
    de download já existe **duas vezes**: `accountingService.downloadReceipt`
    (`accounting.service.ts:926-932`, via helper privado `reconStreamDownload`) e
    `crm.service.ts:243` (`fetch` + blob, mesma técnica). Ver **F-FEAP-6**.
  - `JournalEntriesPanel.tsx` (428 linhas) já importa `formatDate`, `scopeToday`, `formatCents`,
    `useAccountingT`, `resolveError`, `Modal` (linhas 1-12) e já tem o padrão de botão-por-linha
    (Recibo `:158-172`, Estornar `:173-183`) e de modal de confirmação (`:340-427`, `themeColor`,
    `maxWidth`, `footer`). `JournalEntryRow` já tem `entry.sourceType` disponível
    (`StatusBadge`, `:35-41`, compara com `'Reversal'`) e um toggle `expanded` que renderiza
    `PostingsDrawer` (`:196-…`, `:112`).
  - `accounting.service.ts` (>930 linhas) é `apiClient`-based (JSON puro,
    `import { apiClient } from '../api/api-client'`, linha 2) — **nenhum** dos dois novos endpoints
    precisa de multipart/`FormData`; `apiClient` serve os dois sem helper novo. Padrão de método
    read-only sem `notify` (ex.: `getTrialBalance`, `:596-600`) é o golden ref a seguir — verify-chain
    e list-source-documents são leitura, não mutação.
  - i18n: `accounting.json` **1022 = 1022** chaves pt/en (medido nesta sessão,
    `node -e` sobre os dois arquivos) — cresceu de 847 desde o BRIEF `FE-INCR-NFE` (2026-09-07,
    mesmo dia, PR distinto já mergeado). Namespace `journalEntries` já existe com sub-objetos por
    ação (`status`, `reverseAction`, `receiptAction`, `col`, `confirmModal`); **nenhuma** chave
    `journalEntries.verifyChain.*` ou `journalEntries.sourceDocuments.*`/`audit.*` existe ainda —
    gate a manter, meta: 1022 → N = N.
  - Testes: vitest, shim `globalThis.React` (`JournalEntriesPanel.test.tsx:1-8`, o componente não
    importa `React`). O `vi.mock('../../../../lib/services/accounting.service', …)` já existente
    (`:14-19`) mocka só `{ listEntries, reverseEntry, downloadReceipt }` — **precisa** ganhar
    `verifyAuditChain` e `listSourceDocuments` no mesmo mock, senão os testes novos quebram o módulo
    inteiro (mock substitui o objeto inteiro, não faz merge).
  - **Grafo (codebase-memory) confirmado por leitura (CBM-001):** `search_graph("JournalEntriesPanel")`
    lista o componente e seus 4 sub-componentes/interfaces no arquivo único
    `JournalEntriesPanel.tsx:19-387`; `trace_path` inbound devolve **zero chamadores** — esperado
    (`cbm-indegree-underreports-frontend`: composição JSX não é aresta `CALLS`); confirmado por
    leitura direta que `AccountingView.tsx:223-224` monta o painel na aba `lancamentos`. Nenhuma
    conclusão de "morto" foi tirada só do grafo.
- **Divergência memória/docs × código:** nenhuma. `accounting-audit-provenance` (não há memória
  própria ainda — este é o 1º BRIEF que toca ADR-INCR8/INCR2 do lado FE) e a cédula batem com
  `main`; o fato de **não existir consumidor** era esperado, não um erro de registro.

## Insumos existentes (lidos nesta sessão)

| Insumo | Caminho | O que fixa |
|---|---|---|
| Rota + controller (verify-chain) | `server/src/routes/accounting.ts:94`, `server/src/controllers/accountingController.ts:460-482` | query 1 campo, serialização `bigint→string`, 400/401/500 |
| DTO (verify-chain) | `server/src/features/accounting/dtos/AuditDto.ts` | `VerifyAuditChainQuerySchema` |
| Serviço + tipo de retorno (verify-chain) | `server/src/features/accounting/services/AuditService.ts:24-31,116-…` | `VerifyResult`, gate `canRead`, enum `VerifyFailureReason` |
| openapi (verify-chain) | `server/src/routes/docs.paths.ts:1886-1919` | shape completo da resposta 200, incl. `failure` |
| Rota + controller (source-documents) | `server/src/routes/accounting.ts:115-116`, `server/src/controllers/sourceDocumentController.ts:1-105` | POST (fora de escopo) + GET, `canManage`/`canRead`, 401/403/404 (POST) |
| DTO (source-documents) | `server/src/features/accounting/dtos/SourceDocumentDto.ts` | `ListSourceDocumentsQuerySchema` `.strict()`, shape `AttachSourceDocument`/`SourceDocument` no `@openapi` |
| Serviço + repositório (source-documents) | `server/src/features/accounting/services/PostingService.ts:733-820`, `server/src/features/accounting/repositories/ISourceProvenanceRepository.ts` | `JournalEntrySourceWithDocument`, `canRead` no GET, cross-unit ⇒ lista vazia |
| ADR de origem | `docs/adr/ADR-INCR8-source-document-provenance.md` (D5: manual/reversal sem origem; D7: no-cascade) | por que a maioria dos lançamentos não tem origem |
| ADR da hash-chain | `docs/adr/ADR-INCR2-audit-trail.md` (threat model: tamper-evident, não tamper-proof) | linguagem correta para o texto da tela — "detecta adulteração", não "impede" |
| Download de anexo | `server/src/routes/accounting.ts:108`, `documentAttachmentController.ts:92-118` | endpoint existente que `attachmentId` pode alimentar (F-FEAP-6) |
| Golden ref de painel | `my-app/features/accounting/components/JournalEntriesPanel.tsx` (428 linhas) | `Modal`, botão-por-linha, `expanded`/`PostingsDrawer`, `useAccountingT`, `resolveError` |
| Golden ref de download | `my-app/lib/services/accounting.service.ts:926-932` (`downloadReceipt`/`reconStreamDownload`), `my-app/lib/services/crm.service.ts:243` | técnica de `fetch`+blob para anexo binário, se F-FEAP-6→b |
| Golden ref de relatório read-only | `my-app/features/accounting/components/CompliancePanel.tsx` (fetch on-demand de um "coverage report", não automático) | padrão de botão "verificar/gerar" + estado carregado sob demanda |
| Reuso canônico | `Modal`, `resolveError`, `formatDate`, `useAccountingT`, `accounting.service.ts` | obrigatórios (`my-app/CLAUDE.md` §1) |

## Backend real (contrato extraído do código)

```
GET /api/accounting/audit/verify-chain?unitId=<string>   Bearer JWT
  200 → { success: true, data: {
    ok: boolean; checkedEvents: number;
    firstSeq: string | null; lastSeq: string | null;   // bigint serializado
    headHash: string | null;
    failure?: { seq: string; reason: 'MISSING_GENESIS' | 'SEQ_GAP' | 'PREV_HASH_MISMATCH'
                                    | 'HASH_MISMATCH' | 'HEAD_MISMATCH' };
  }}
  400 Zod (unitId ausente) · 401 · 403 (!canRead) · 500

GET /api/accounting/journal-entries/{entryId}/source-documents?unitId=<string>   Bearer JWT
  200 → { success: true, data: Array<{
    id: string; journalEntryId: string; sourceDocumentId: string; createdAt: string;  // link
    sourceDocument: {
      id: string; sourceType: string; externalRef: string | null;
      documentDate: string | null; description: string | null; attachmentId: string | null;
      createdAt: string; updatedAt: string; deletedAt: string | null;
    };
  }>>   // [] quando o lançamento não tem origem (comum — D5) OU pertence a outra unidade
  400 Zod (unitId ausente) · 401 · 403 (!canRead)
```

## Contratos a materializar no FE (esboço)

```ts
// my-app/lib/services/accounting.service.ts  (EXTENSÃO — F-FEAP-4)

export interface VerifyAuditChainResult {
  ok: boolean;
  checkedEvents: number;
  firstSeq: string | null;
  lastSeq: string | null;
  headHash: string | null;
  failure?: { seq: string; reason: VerifyFailureReason };
}
export type VerifyFailureReason =
  | 'MISSING_GENESIS' | 'SEQ_GAP' | 'PREV_HASH_MISMATCH' | 'HASH_MISMATCH' | 'HEAD_MISMATCH';

export interface SourceDocumentEntry {
  id: string;
  sourceType: string;
  externalRef: string | null;
  documentDate: string | null;
  description: string | null;
  attachmentId: string | null;
  createdAt: string;
}
export interface JournalEntrySourceLink {
  id: string;
  journalEntryId: string;
  sourceDocumentId: string;
  createdAt: string;
  sourceDocument: SourceDocumentEntry;
}

// dentro de `accountingService = { ... }`, ao lado de getTrialBalance/getAccountLedger — read-only, sem notify()
async verifyAuditChain(unitId: string): Promise<VerifyAuditChainResult> { … }
async listSourceDocuments(unitId: string, entryId: string): Promise<JournalEntrySourceLink[]> { … }
```

Regra dura: **zero regra de negócio na tela.** A tela não recalcula hash, não decide o que é
"íntegro" além de ler `ok`, não infere origem quando a lista vem vazia além de "sem documento de
origem registrado". Tudo isso é do servidor.

## Checklist numerado de comportamentos (cada um testável)

**A. Cliente de API (extensão de `accounting.service.ts`)**

1. `verifyAuditChain(unitId)`: `GET /accounting/audit/verify-chain` com `buildQuery({ unitId })`
   (mesmo helper das demais leituras); sem `notify` (leitura). Teste: URL montada, `data` devolvido
   tal qual (sem transformação de tipo — `firstSeq`/`lastSeq`/`failure.seq` continuam `string`).
2. `listSourceDocuments(unitId, entryId)`: `GET
   /accounting/journal-entries/{entryId}/source-documents` com `buildQuery({ unitId })`. Teste: URL
   com `entryId` codificado (`encodeURIComponent`, precedente `downloadReceipt`), `data` devolvido
   como array tal qual.
3. Erros (403 sem `canRead`, 400 sem `unitId`) propagam pelo mesmo envelope que `resolveError` já lê
   — nenhum tratamento novo no cliente. **Direto.**

**B. Botão "Verificar cadeia" — cabeçalho do `JournalEntriesPanel`**

4. Botão no topo do painel (acima da tabela de lançamentos), rótulo
   `journalEntries.verifyChain.button` ("Verificar cadeia de auditoria"); ao clicar, chama
   `verifyAuditChain(unitId)` sob demanda — **nunca** automático ao montar o painel (a verificação é
   O(n) sobre toda a trilha do escopo). **Fork F-FEAP-1** (onde/quando).
5. Enquanto carrega, o botão desabilita e mostra spinner (mesmo padrão do botão de recibo,
   `receiptBusyId`). **Direto.**
6. Resultado abre em `Modal` (não inline): `ok=true` ⇒ selo verde "Cadeia íntegra", `checkedEvents`,
   `firstSeq`–`lastSeq` (faixa), `headHash` (monoespaçado, texto copiável — precedente
   `sourceDocumentId` copiável do BRIEF `FE-INCR-NFE`, comportamento 20). `checkedEvents=0` (escopo
   sem eventos) mostra "Nenhum evento de auditoria neste escopo ainda" em vez do selo — não é erro.
   **Direto.**
7. `ok=false` ⇒ selo vermelho "Cadeia comprometida", `failure.seq` e `failure.reason` traduzido por
   uma tabela fixa de 5 chaves (`journalEntries.verifyChain.reason.<REASON>`) — nunca a string crua
   do enum. Texto do modal usa a linguagem do ADR-INCR2 ("evidência de adulteração detectada"), nunca
   "corrigir" ou "consertar" (a tela é só diagnóstico — não existe ação de reparo). **Direto — gate de
   honestidade de escopo.**
8. Erro de rede/403/400 no clique: banner de erro via `resolveError`, modal não abre (ou abre já com
   o erro — mesma decisão do padrão de erro do painel, `error` state existente). **Direto.**

**C. Lista de "Documentos de origem" — por linha do `JournalEntriesPanel`**

9. Botão **"Proveniência"** na coluna de ações de cada linha, ao lado de Recibo/Estornar (mesmo
   estilo `rounded-xl border-neutral-700`); sempre visível, mesmo quando o lançamento provavelmente
   não tem origem (manual/reversal, D5). **Fork F-FEAP-7** (sempre visível vs. escondido por
   `sourceType`).
10. Clique chama `listSourceDocuments(unitId, entry.id)` sob demanda (não pré-carregado com a lista
    de lançamentos — evita N+1 ao abrir a aba) e abre `Modal` com o resultado. **Fork F-FEAP-2**
    (botão dedicado vs. reaproveitar o toggle `expanded`).
11. Lista vazia ⇒ "Nenhum documento de origem registrado para este lançamento." (não é erro; é o
    caso comum — D5). **Direto.**
12. Cada item mostra: `sourceType` (texto cru — é a taxonomia viva do domínio, ex.
    `salon.sale.finalized`, não traduzida item a item), `externalRef` (quando presente, rótulo
    "Referência:"), `documentDate` formatado com `formatDate` (reslice dos 10 primeiros caracteres —
    fecha `date-only-rendering-utc-shift` na origem, mesma técnica do BRIEF `FE-INCR-NFE`
    comportamento 4), `description` (quando presente), `sourceDocument.createdAt` formatado só como
    data (`formatDate`, sem hora — **Fork F-FEAP-5**), e `attachmentId` quando presente. **Direto**
    (exceto F-FEAP-5).
13. Quando `attachmentId` presente: **Fork F-FEAP-6** — texto informativo (id truncado) vs. link de
    download reusando a técnica de `downloadReceipt`/`crm.service.ts:243`.
14. Erro (403/400) no clique: banner via `resolveError`; modal fecha ou nem abre — mesmo padrão de B.8.
    **Direto.**

**D. i18n, gates e testes**

15. Chaves novas em `accounting.json` sob `journalEntries.verifyChain.*` (button, loading, ok, empty,
    compromised, reason.MISSING_GENESIS, reason.SEQ_GAP, reason.PREV_HASH_MISMATCH,
    reason.HASH_MISMATCH, reason.HEAD_MISMATCH, checkedEvents, range, headHash) e
    `journalEntries.sourceDocuments.*` (button, loading, empty, sourceType, externalRef,
    documentDate, description, recordedAt, attachment, download) — namespace já existente
    (`journalEntries`), só ganha dois sub-objetos novos, nos dois idiomas, na mesma mudança; paridade
    medida (1022 → N = N). **Direto — gate. Ver "Plano de paralelização" para o choke point
    compartilhado com `FE-INCR-COMPLIANCE-2`.**
16. `neutral-*` só, cards `rounded-2xl`, zero `any`; `tsc --noEmit` limpo em `my-app`. Zero mudança em
    `server/` ⇒ sem regeneração de `openapi.json`/`__dto-shapes__.json`. **Direto — gate.**
17. Tela de `/accounting` fica atrás de `withAuth` ⇒ verificação contra **build de produção**.
    **Direto — gate.**
18. `vi.mock('.../accounting.service')` existente em `JournalEntriesPanel.test.tsx` ganha
    `verifyAuditChain` e `listSourceDocuments` no mesmo objeto mockado (o mock substitui o módulo
    inteiro — omitir quebra os testes já existentes do arquivo, não só os novos). **Direto — gate de
    regressão.**
19. Testes vitest (mínimo, cada comportamento acima com o seu):
    - `accounting.service`: `verifyAuditChain`/`listSourceDocuments` montam a URL certa com
      `unitId`/`entryId` codificados; devolvem `data` sem transformar tipo.
    - `JournalEntriesPanel`: botão "Verificar cadeia" existe; clique chama o serviço; `ok=true`
      renderiza o selo verde com `checkedEvents`; `ok=false` renderiza o selo vermelho com a razão
      traduzida (uma por cada uma das 5 chaves, pelo menos um caso); erro 403 mostra banner.
    - `JournalEntriesPanel`: botão "Proveniência" por linha; clique chama o serviço com o `entry.id`
      certo; lista vazia mostra a mensagem de "nenhum documento"; item com `externalRef` +
      `documentDate` renderiza sem `NaN`/`Invalid Date`; item com `attachmentId` mostra o tratamento
      decidido em F-FEAP-6.
    - Regressão: os testes já existentes do arquivo (`listEntries`, `reverseEntry`, `downloadReceipt`)
      continuam verdes com o mock estendido (comportamento 18).

## Forks — RATIFICAÇÃO PENDENTE (decisão do dono)

| Fork | Caminhos | Recomendação + justificativa | Custo de errar |
|---|---|---|---|
| **F-FEAP-1 — gatilho do "verificar cadeia"** | (a) botão no cabeçalho do `JournalEntriesPanel`, fetch sob demanda ao clicar, resultado em `Modal` · (b) fetch automático ao montar o painel (toda troca para a aba Lançamentos) · (c) aba nova "Auditoria" no `AccountingView` | **(a).** `verifyAuditChain` varre **toda** a cadeia do escopo (sem paginação) — rodar isso a cada visita à aba mais usada do módulo é custo desnecessário sobre o mesmo `AuditEvent` que não muda entre cliques. (c) infla o escopo: a cédula já nomeia `JournalEntriesPanel` como o lugar, e uma aba nova tocaria `AccountingView.tsx` (Tab type + array), aumentando o write-set sem necessidade | (b) gera carga O(n) repetida sem motivo; (c) diverge da letra da autorização sem ganho |
| **F-FEAP-2 — onde a lista de proveniência aparece** | (a) botão dedicado "Proveniência" por linha, abre `Modal` independente do toggle de expandir · (b) reaproveitar o `expanded` existente, somando a seção de proveniência dentro do `PostingsDrawer` · (c) fetch eager de todas as linhas ao carregar a página | **(a).** Segue o padrão já estabelecido na mesma linha (Recibo, Estornar = botões, não estados de expand); (b) acopla duas preocupações independentes (detalhe de postings vs. proveniência) num único booleano, complicando o estado do `PostingsDrawer` sem necessidade; (c) desperdiça requisições para a maioria dos lançamentos que não têm origem (D5) | (b) é o clone de responsabilidade que o critério de reuso rejeitaria na Etapa 1 (shapes diferentes: postings ≠ origem); (c) é claramente pior em custo |
| **F-FEAP-3 — 403 (`canRead`) nas duas telas** | (a) sempre mostrar os dois controles; deixar o 403 surgir via `resolveError` (banner), igual ao tratamento hoje de qualquer erro do painel · (b) esconder os controles antes do clique com uma checagem de capability | **(a).** Não existe hoje nenhuma checagem de capability client-side neste painel (nem para Estornar); introduzir uma só para este item quebraria a consistência da tela sem um mecanismo de roles já fiado no FE | (a) mostra um botão que pode 403 (UX menor); (b) exigiria inventar infraestrutura de roles no cliente, fora do escopo de C4 |
| **F-FEAP-4 — onde vivem os 2 novos client calls** | (a) dentro de `accounting.service.ts`, ao lado de `getTrialBalance`/`getAccountLedger` · (b) novo arquivo `audit.service.ts` | **(a).** Etapa 1 do critério de reuso: mesmo shape (`apiClient.get` + envelope `ApiEnvelope`), mesma fonte (`/accounting/*`), sem necessidade de `FormData` (ao contrário do `nfe.service.ts` do BRIEF irmão, que precisou de multipart) — é o mesmo objeto de domínio (API surface de `accounting`), não uma técnica nova | baixo; (b) fragmentaria um client já coeso sem motivo de shape |
| **F-FEAP-5 — formatação de `createdAt`/`documentDate`** | (a) reusar `formatDate` (date-only, trunca hora) para os dois campos · (b) criar `formatDateTime` novo (`Intl.DateTimeFormat` com `timeZone` explícito) para mostrar hora:minuto | **(a).** Zero golden ref de exibição hora-a-hora em `my-app/features/accounting` hoje (grep confirmado); inventar um formatter novo sem um segundo consumidor é escopo especulativo — se o dono quiser precisão de hora no drill-down de auditoria, vira fork novo com artefato próprio | (a) perde granularidade de hora (aceitável para um drill-down de "quando" aproximado); (b) adiciona código sem padrão a seguir e sem teste de fuso horário provado em outro lugar do domínio |
| **F-FEAP-6 — `attachmentId` presente: texto ou download?** | (a) mostrar só o id (truncado, informativo) — mínimo dentro da letra de C4 ("lista de documentos de origem") · (b) reusar a técnica de `downloadReceipt`/`crm.service.ts:243` (`fetch`+blob) para baixar o anexo bruto via `GET /accounting/attachments/:id` | **(a).** C4 autoriza "lista", não "download"; embora a técnica de (b) seja barata e comprovada (2 precedentes), adicionar uma ação de escrita-de-efeito-colateral-zero mas nova ao escopo de um BRIEF cuja autorização é textualmente restrita a leitura é o tipo de expansão que ORCH-006 pede para registrar como fork, não assumir. Se ratificado (b), é ~15 linhas seguindo o precedente | (a) deixa um anexo real (baixas de AP/AR com comprovante, `PayableService.ts:912`) inerte na tela; (b) é barato mas extrapola a letra da autorização sem novo artefato |
| **F-FEAP-7 — quando mostrar o botão "Proveniência" por linha** | (a) sempre, para toda linha — o modal mostra "vazio" quando não há origem (espelha Recibo/Estornar, que também sempre aparecem) · (b) esconder quando `entry.sourceType ∈ {'Manual', 'Reversal'}` (D5 garante lista vazia nesses casos) | **(a).** Acoplar a visibilidade do botão a uma regra de domínio (D5) que só o backend deveria garantir é frágil — se um dia `postEntry` manual passar a aceitar descritor de origem (mudança **de fora deste BRIEF**), a UI escondida ficaria stale até outro diff a destravar; o custo de (a) é só um clique a mais mostrando "vazio" | (b) engessa a UI numa invariante do backend que pode mudar sem que ninguém lembre de revisar esta tela |

## Pendente de validação externa

- Nenhuma. Os dois endpoints são puramente estruturais (hash-chain e proveniência já mergeados,
  ADR-INCR2/ADR-INCR8 Accepted); não há regra contábil/fiscal nova nesta tela — é leitura de
  diagnóstico e drill-down, os dois já provados no backend.

## Insumos ausentes

- Nenhum que bloqueie o BRIEF.

## Achados fora de escopo (registrados, não planejados — ORCH-006)

1. **`POST /api/accounting/journal-entries/:entryId/source-documents`** (anexar proveniência
   manualmente, `sourceDocumentController.ts:19-70`, gated por `canManage`) segue **sem consumidor
   FE** mesmo depois deste BRIEF — C4 autoriza só a leitura ("lista de documentos de origem"); anexar
   pela UI é frente própria, se o dono quiser.
2. **F-FEAP-6 → (b)** (download do anexo bruto do `SourceDocument`) é uma extensão barata e com
   precedente duplo (`downloadReceipt`, `crm.service.ts:243`) — registrado como fork em vez de
   "achado" porque o custo de implementar é baixo o bastante para caber neste mesmo BRIEF se
   ratificado; ver a entrada da tabela acima.
3. **Precisão de hora nos timestamps de auditoria** (F-FEAP-5→b, `formatDateTime` canônico) — não
   existe hoje em nenhum painel do domínio; se o dono quiser granularidade de hora no drill-down (útil
   para reconstituir uma sequência de eventos no mesmo dia), é o primeiro consumidor e merece um
   BRIEF/fork próprio com o formatter extraído para reuso, não uma função one-off aqui.
4. **Nenhum vínculo com `FE-INCR-NFE`:** o `sourceDocumentId` que a venda devolve
   (`NfeSaleReconciliationReport.sourceDocumentId`, ver BRIEF irmão comportamento 20) hoje é só texto
   copiável no modal de reconciliação da venda; este BRIEF não cria um link cruzado entre as duas
   telas (ex.: "ver este documento na aba Lançamentos") — os dois já se apoiam no mesmo endpoint de
   leitura (`listSourceDocuments`), mas por `entryId`, não por `sourceDocumentId` isolado; navegação
   direta por `sourceDocumentId` exigiria um endpoint novo, fora de C4.

## Plano de paralelização (PAR-001..006) — lote com `FE-INCR-COMPLIANCE-2`

Esta rodada (4) do plano SDD roda em lote paralelo com o BRIEF irmão `FE-INCR-COMPLIANCE-2` (nó X3:
botão "ECF Real" + import de catálogo referencial). Prova de disjunção (PAR-002) pelos write-sets
previstos:

| Write-set previsto — **este BRIEF (C4/C5)** | Write-set previsto — **`FE-INCR-COMPLIANCE-2` (X3)** (inferido da autorização + código lido) |
|---|---|
| `my-app/features/accounting/components/JournalEntriesPanel.tsx` (edita existente) | `my-app/features/accounting/components/CompliancePanel.tsx` (edita existente, 336 linhas) |
| `my-app/lib/services/accounting.service.ts` (edita existente — 2 métodos novos) | `my-app/lib/services/referential.service.ts` (edita existente ou novo método, consumidor já existe: `CompliancePanel.tsx:6-10`) |
| `my-app/features/accounting/components/__tests__/JournalEntriesPanel.test.tsx` | `my-app/features/accounting/components/__tests__/CompliancePanel.test.tsx` (se existir) |
| `my-app/public/locales/{pt,en}/accounting.json` — sub-chaves em `journalEntries.*` | `my-app/public/locales/{pt,en}/accounting.json` — sub-chaves em `compliance.*` (namespace já existente, `CompliancePanel.tsx` usa `t('compliance....')`) |

**Nenhum arquivo de componente/serviço é compartilhado** — `JournalEntriesPanel.tsx` e
`CompliancePanel.tsx` são arquivos distintos (confirmado por leitura direta dos dois); nenhum dos dois
BRIEFs precisa tocar `AccountingView.tsx` (as abas `lancamentos` e `compliance` já existem e já
montam os respectivos painéis, `AccountingView.tsx:223-224,337-339` — nenhuma aba nova, nenhuma
mudança no `Tab` type). O único choke point real é **`accounting.json`** (PAR-001: "i18n por
domínio — disjunto entre domínios, compartilhado **dentro** do mesmo domínio"; os dois BRIEFs são do
mesmo domínio `accounting`).

**Como fatiar o choke point i18n (proposta, não fork — é aplicação mecânica de PAR-003/PAR-004, não
decisão de domínio):**

1. **Fase A (paralela):** cada slice **não edita `accounting.json` diretamente** no seu worktree.
   Em vez disso, cada `sessao-feature` produz um **fragmento JSON isolado** por idioma (ex.:
   `journalEntries.verifyChain`/`journalEntries.sourceDocuments` para este BRIEF;
   `compliance.<chave-nova>` para o irmão) — documentado no PR/branch da feature, não commitado como
   patch do arquivo compartilhado.
2. **Namespaces reservados sem sobreposição:** este BRIEF só escreve sob `journalEntries.*`
   (namespace já dono do domínio de ações de lançamento); o irmão só sob `compliance.*` — zero
   interseção de chave, então o merge é semanticamente trivial mesmo que sintaticamente aconteça no
   mesmo arquivo.
3. **Fase B (serial, integrador único):** o merge de `accounting.json` (pt e en) com os dois
   fragmentos aplicados em sequência, `tsc` limpo + paridade (1022 → N = N) medida **uma vez**, depois
   dos dois merges — espelha exatamente o texto do PAR-003 ("Fase B — registro… regen do
   openapi… uma de cada vez").
4. Se as duas `sessao-feature` rodarem em worktrees separados sem coordenação (em vez de uma esperar
   a outra), a Fase B vira responsabilidade do **integrador** (`sessao-integracao`) resolver o
   conflito textual do JSON por **regra pré-decidida**: união dos dois blocos de chaves, nunca escolha
   de um lado — exatamente o que a sessão de integração já está autorizada a fazer (conflito por
   regra, "nunca melhora nada").

## Risco principal e vieses (T8)

- **Risco principal:** F-FEAP-7→(a) (botão sempre visível) mostra "vazio" para a maioria dos
  lançamentos (D5) — se isso for lido como "a proveniência não funciona" em vez de "este lançamento
  não tem origem registrada", o texto do modal precisa deixar isso inequívoco na primeira frase
  (comportamento 11). Mitigação já no checklist; risco residual é de copy, não de dado.
- **Viés desta sessão:** as recomendações favorecem manter os dois fluxos **dentro** do
  `JournalEntriesPanel` existente e do `accounting.service.ts` existente (menos arquivos novos,
  ponytail + reuso), o que empurra contra criar uma aba de "Auditoria" dedicada — uma leitura que
  pesasse "visibilidade" (uma tela própria de auditoria é mais fácil de achar) escolheria F-FEAP-1→(c)
  e aceitaria o write-set maior.
- **Viés de escopo:** F-FEAP-6 foi registrado como fork, não como "achado fora de escopo", porque o
  custo de implementar é baixo — isto é uma leitura de *custo*, não de *autorização*; alguém lendo
  C4 mais estritamente classificaria F-FEAP-6 inteiro como fora de escopo (só achado), o que também
  seria defensável.
