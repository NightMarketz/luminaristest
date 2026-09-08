# BRIEF — FE-INCR-NFE (UI de ingestão de NF-e: compra pré-preenche AP, venda anexa proveniência)

> Produzido por **sessão de planejamento**, 2026-09-07, sobre `origin/main` `09ae49a2`. Não contém
> código de aplicação. **[EMENDA 2026-09-07 — os 7 forks foram RATIFICADOS pelo dono no mesmo dia**
> (ver §Forks); três contra a recomendação, e o F-FENFE-1 → (b) cria o pré-requisito
> **`BE-INCR-NFE-PREVIEW`** (rodada 2a do plano). O checklist abaixo é o **original**; os comportamentos
> que caem ou mudam estão listados na tabela de ratificação, e o BRIEF recebe re-emenda curta quando o
> contrato do preview estiver em `main`.**]**

## Cabeçalho

- **Item a planejar:** frontend dos dois endpoints de NF-e já em `main` (#267 `9fbe200f`):
  `POST /api/nfe/purchase` (compra → 1 `Payable` + entradas de estoque) e `POST /api/nfe/sale`
  (venda → cruza com a venda já lançada e anexa `SourceDocument`). Hoje `my-app` **não cita `nfe`**
  em nenhum arquivo (grep nesta sessão; a cédula de 03/09 já registrava o mesmo).
- **Autorização (ORCH-006):** [CEDULA-DECISAO-2026-09-03-integracao.md](CEDULA-DECISAO-2026-09-03-integracao.md)
  **F-I4** ("Backend + UI no mesmo ciclo → abre `FE-INCR-NFE`", contra a recomendação de dívida
  planejada) → item **E3** ("`sessao-planejamento`: BRIEF `FE-INCR-NFE` — upload multipart de
  compra/venda no painel contábil; reuso do upload OFX/CNAB existente é a 1ª pergunta do critério de
  reuso"); registrada também no ADR-INCR-NFE §10. Pedido do dono em sessão, 2026-09-07: *"Escreve o
  BRIEF do FE-INCR-NFE"*. A autorização cobre **produzir este BRIEF** e nada além; a implementação é E6.
- **Divergência de letra vs. objetivo (T1):** E3 diz "no painel contábil". A NF-e de **venda** exige
  `saleId` explícito (F-NFE8 → a) e o único lugar do app onde o operador vê uma venda e seu id é o
  `SaleDetailPanel` do dashboard de finanças, **fora** do painel contábil. Registrado como **F-FENFE-2**
  — não decido pela letra nem pelo objetivo.
- **Fatos verificados nesta sessão (código, não memória):**
  - `server/src/routes/nfe.ts` monta **só dois** POSTs multipart. **Não existe endpoint de
    pré-visualização/parse** (`GET`/`preview`) — o operador precisa **ver os itens** da nota para montar
    `itemMappings`, e o servidor só os revela dentro de uma mensagem de erro 400 por item. Este é o furo
    de desenho que o BRIEF resolve (**F-FENFE-1**).
  - `ImportNfePurchaseSchema` (`NfeDto.ts`): `unitId` obrigatório, `itemMappings` array **≥1** de
    `{cProd, productRef}` `.strict()`, `counterpartyId?`, `dueDate?` (date-only real). Multipart é plano:
    o controller faz `JSON.parse(itemMappings)` **antes** do Zod e devolve 400 próprio se o JSON for
    inválido (`nfeController.ts:decodeItemMappings`).
  - `ImportNfeSaleSchema`: `unitId` + `saleId` obrigatórios, `.strict()`.
  - Respostas: compra **201** `{ payable: Payable, ignoredItems: NfeIgnoredItem[] }`
    (`NfeImportService.ts:51-62`); venda **200** `NfeSaleReconciliationReport`
    (`NfeSaleReconciliationService.ts:41-63`) — dinheiro em **`number`** cents, não string.
  - Multer: campo `file`, MIME allowlist `text/xml | application/xml | text/plain |
    application/octet-stream`, teto 10 MB (`MAX_IMPORT_SIZE_BYTES`), magic-bytes **desligado** (O-3).
  - `productRef` = **id da linha** da DynamicTable `products` — confirmado em
    `CreatePayableModal.tsx:44-57` (`loadProductOptions`, `limit=500`, envia `r.id` como
    `inventoryProductRef`). A função é **privada do módulo**.
  - `Counterparty` no FE **não tem CNPJ/documento** (`counterparties.service.ts:27-39`: `id, type, name,
    ref`) — casar emitente por CNPJ é impossível hoje; só por nome.
  - `AccountsPayablePanel` já carrega os `counterparties` SUPPLIER e os passa ao `CreatePayableModal`
    como prop (`CreatePayableModal.tsx:22-23`); tem botão "Nova Conta" no header (`:396-402`) e
    `onLedgerChange` para refetch do balancete (`:199-203`).
  - Upload multipart existente: `accountingService.importBankStatement` (`accounting.service.ts:788-808`)
    usa `fetch` + `FormData` porque `apiClient` é JSON-only; helpers `reconBaseUrl`/`reconAuthHeaders`/
    `reconParseError` são **privados** do módulo (`:530-545`). `crm.service.ts:197-199` tem **outra**
    cópia da mesma técnica. Padrão de tela: `ReconciliationPanel.tsx:362-400` (input hidden + botão,
    `e.target.value=''`, `setError`/`setNotice`, `resolveError`).
  - `SaleDetailPanel.tsx` conhece `sale.id`, `sale.unitId` (`:87`) e os status (`:76-81`, lowercase):
    `status ∈ {finalized, cancelled, returned, …}` e **`paymentStatus === 'paid'` é campo separado**;
    LAC-A (#259) já pôs ali os botões Pagar/Cancelar/Devolver via `sales.service.ts`.
  - A âncora que o servidor procura é `SourceDocument(sourceType='sale.finalized', sourceId=saleId)`
    (`NfeSaleReconciliationService.ts:28,90`), criada pela ponte em `sale.status === 'Finalized'`
    (`AccountingSyncPort.ts:118-121`) — **independe de pagamento**.
  - i18n: `accounting.json` **847 = 847** chaves pt/en (medido nesta sessão) — gate a manter;
    `finance_view.json` é o namespace do `SaleDetailPanel`.
  - Testes: vitest, shim `globalThis.React`; precedente de upload em
    `ImportExportPanel.test.tsx:77` (`fireEvent.change(input, { target: { files: [new File(...)] } })`).
  - Fixtures de XML: `server/src/lib/__tests__/fixtures/nfe/{purchase-multi-item,sale}.SYNTHETIC.xml`
    (sintéticos, dívida F-I2/E9).
- **Divergência memória/docs × código:** nenhuma. `accounting-incr-nfe` (memória) e cédula §C batem
  com `main`; o que nenhum doc tinha era o fato de **não existir preview** — não é erro de registro, o
  BE nunca prometeu um.

## Insumos existentes (lidos nesta sessão)

| Insumo | Caminho | O que fixa |
|---|---|---|
| Rotas + controller | `server/src/routes/nfe.ts`, `server/src/controllers/nfeController.ts` | 2 POSTs, campo `file`, `itemMappings` como string JSON, 401/400/403/404 |
| DTOs | `server/src/features/accounting/dtos/NfeDto.ts` | shapes `.strict()` acima; `dateOnly` real |
| Respostas | `NfeImportService.ts:51-62`, `NfeSaleReconciliationService.ts:41-63` | contratos de saída (abaixo) |
| Erros que a tela mostra | `NfeImportService.ts:84-268`, `NfeSaleReconciliationService.ts:81-110`, `lib/nfe.ts:124-296`, `PayableService.ts:220-223` | todas `ValidationError` 400 com texto pt-BR pronto; duplicata = "Já existe uma conta a pagar em aberto para este fornecedor e documento."; venda órfã = 404 |
| Campos do XML | `BE-INCR-NFE-layout-transcription.md` (MOC 7.0), `lib/nfe.ts:30-86` (`ParsedNfe`) | os 10 campos que a tela lê do XML (F-FENFE-1) |
| ADR | `docs/adr/ADR-INCR-NFE-fiscal-ingestion.md` D6 ("o MVP **pré-preenche** e **exige o operador confirmar** o `productRef`"), §9 F-NFE7/F-NFE8, §10 F-I4 | pré-preenchimento é requisito do ADR, não invenção deste BRIEF |
| Golden ref de upload | `ReconciliationPanel.tsx:362-400,505-522` + `accounting.service.ts:788-808` | 1ª pergunta do critério de reuso (E3): **técnica** reusável (input hidden + FormData), **shape** não (campos diferentes) |
| Golden ref de modal de escrita | `CreatePayableModal.tsx` | `Modal` canônico, `mode` expense/inventory, `loadProductOptions`, prop `counterparties` |
| Golden ref de botão-ação na venda | `SaleDetailPanel.tsx:95-140` + `sales.service.ts` (LAC-A) | onde o `saleId` existe; padrão de `notify` + `CTX` |
| Reuso canônico | `Modal`, `resolveError`, `formatCents`, `formatDate`, `notify`, `useAccountingT` | obrigatórios (my-app/CLAUDE.md §1) |

## Backend real (contrato extraído do código)

```
POST /api/nfe/purchase   multipart/form-data   Bearer JWT
  file:           XML (obrigatório; ≤10 MB; MIME em {text/xml, application/xml, text/plain, application/octet-stream})
  unitId:         string
  itemMappings:   string = JSON.stringify(Array<{ cProd: string; productRef: string }>)   (≥1; TODO item custeado precisa de um)
  counterpartyId?: string   (Counterparty SUPPLIER da unidade; senão o service usa/cria pelo nome do emitente)
  dueDate?:       'YYYY-MM-DD' (real; ausente ⇒ dhEmi)
  201 → { success: true, data: { payable: Payable, ignoredItems: NfeIgnoredItem[] } }
  400 Zod/ValidationError (texto pt-BR) · 401 · 403 canCreatePayable

POST /api/nfe/sale       multipart/form-data   Bearer JWT
  file:   XML (idem)
  unitId: string
  saleId: string   (âncora explícita — id da linha da venda)
  200 → { success: true, data: NfeSaleReconciliationReport }
  400 · 401 · 403 · 404 (venda sem lançamento)
```

```ts
// server/src/features/accounting/services/NfeImportService.ts:51-62
interface NfeIgnoredItem { nItem: number; cProd: string; xProd: string; reason: 'indTot-0' }
interface NfePurchaseImportResult { payable: Payable; ignoredItems: NfeIgnoredItem[] }
// Payable = o mesmo tipo já em my-app/lib/services/accountsPayable.service.ts:42-66
//   (documentNumber = chave de acesso de 44 dígitos; expenseAccountId null; inventoryProductRef/Qty
//    preenchidos só quando a nota tem 1 SKU — multi-SKU fica null e o breakdown NÃO é persistido, F-D5→a)

// server/src/features/accounting/services/NfeSaleReconciliationService.ts:41-63
interface NfeSaleReconciliationReport {
  matched: true; saleId: string; journalEntryId: string; chaveAcesso: string; sourceDocumentId: string;
  nfeTotalCents: number; saleTotalCents: number; nfeItemCount: number;
  totalMatches: boolean; differenceCents: number; divergences: string[];   // strings pt-BR prontas
}
```

## Contratos a materializar no FE (esboço)

```ts
// my-app/lib/services/nfe.service.ts  (novo — F-FENFE-7)
interface ImportPurchaseNfeParams { unitId: string; itemMappings: NfeItemMapping[]; counterpartyId?: string; dueDate?: string }
interface NfeItemMapping { cProd: string; productRef: string }
importPurchaseNfe(params, file: File): Promise<NfePurchaseImportResult>   // FormData; itemMappings = JSON.stringify
reconcileSaleNfe(params: { unitId: string; saleId: string }, file: File): Promise<NfeSaleReconciliationReport>

// my-app/features/accounting/lib/parseNfeSummary.ts  (novo — F-FENFE-1 → a; só LEITURA para a tela)
interface NfeSummaryItem { nItem: number; cProd: string; xProd: string; cEAN: string; qCom: string; uCom: string; vProd: string; indTot: '0' | '1' }
interface NfeSummary {
  chaveAcesso: string;        // infNFe/@Id sem 'NFe' (44)
  numero: string; serie: string; dhEmiDate: string;   // 'YYYY-MM-DD' por reslice, NUNCA new Date()
  emitNome: string; emitDoc: string;                  // xNome; CNPJ ou CPF
  vNF: string;                                        // total/ICMSTot/vNF cru (exibição; NÃO é o custo D3)
  itens: NfeSummaryItem[];
}
parseNfeSummary(xmlText: string): NfeSummary   // lança Error('nfe.invalidXml') em XML mal-formado / sem <infNFe>
```

Regra dura do parser de tela: **zero regra de negócio** — não calcula custo, não decide `cStat`, não valida
chave. Tudo isso permanece no servidor; um parse divergente no cliente só produz um 400 legível.

## Checklist numerado de comportamentos (cada um testável)

**A. Cliente de API**

1. `nfe.service.ts` novo com `importPurchaseNfe` e `reconcileSaleNfe`: `FormData` com `file` + campos;
   `itemMappings` vai como **string JSON**; **sem** `Content-Type` manual; `Authorization` do cookie
   `auth_token`; erro não-2xx vira o mesmo objeto `{...body, status}` que `resolveError` lê. Teste: o
   `FormData` capturado tem exatamente os campos do DTO (nem um a mais — DTO é `.strict()`).
   **Fork F-FENFE-7** (onde vivem os helpers multipart).
2. `notify()` só em sucesso de mutação (padrão `sales.service.ts`/`accountsPayable.service.ts`); erro
   é responsabilidade da tela. **Direto.**

**B. Leitura do XML na tela (pré-visualização)**

3. `parseNfeSummary` lê o XML com `DOMParser` nativo (`'application/xml'`), localiza elementos por
   **localName** (`getElementsByTagNameNS('*', 'det')`) para aceitar `xmlns` default **e** prefixo
   `nfe:`; devolve `NfeSummary`. Erro de parse (`<parsererror>`) ou `<infNFe>` ausente ⇒ erro único
   traduzido. **Fork F-FENFE-1** (cliente vs. endpoint de preview).
4. Datas saem por **reslice** da string `dhEmi` (`slice(0,10)`), nunca por `new Date()` — fecha a
   classe `date-only-rendering-utc-shift` já na origem; exibição via `formatDate` canônico. **Direto — gate.**
5. Valores do XML são exibidos como texto cru formatado (`vProd`, `vNF` em string decimal → `parseBrl`
   **não** se aplica; usar `Number(x)*100` arredondado só para `formatCents`, com teste de que a tela
   nunca contém `NaN`). O total exibido é rotulado "valor da nota (vNF)" e **nunca** "custo" — o custo D3
   é do servidor e pode diferir. **Direto — gate de honestidade de dinheiro.**

**C. Fluxo de COMPRA — modal `ImportNfePurchaseModal`**

6. Botão **"Importar NF-e"** no header do `AccountsPayablePanel`, ao lado de "Nova Conta"; abre o
   modal (`Modal` canônico), recebe `unitId`, `counterparties` (SUPPLIER, já carregados pelo painel) e
   `onImported` → refetch da lista + `onLedgerChange`. **Fork F-FENFE-2** (localização).
7. Passo 1 — seleção do arquivo: input hidden `accept=".xml,text/xml,application/xml"` + botão (clone
   da técnica de `ReconciliationPanel:509-522`); `e.target.value=''` para reselecionar; lê com
   `file.text()` e chama `parseNfeSummary`. Erro de parse ⇒ banner, modal segue aberto. **Direto.**
   Nota de teste: o lockfile fixa `jsdom 29.1.1` (o worktree não tem `node_modules`; não executei);
   se `File.text()` faltar no jsdom, o fallback é `new Response(file).text()` — decisão do implementador,
   não fork.
8. Passo 2 — cabeçalho da nota: emitente (nome + documento), número/série, emissão (`formatDate`),
   chave de acesso (44 dígitos, monoespaçada), vNF. **Direto.**
9. Passo 2 — tabela de itens: uma linha por `det` com `nItem`, `cProd`, `xProd`, `qCom uCom`, `vProd`
   e um **`<select>` de produto** (opções = catálogo `products`, valor = id da linha = `productRef`).
   Linhas `indTot='0'` aparecem **sem select**, marcadas "não compõe o total — será ignorada" (espelho
   de `ignoredItems`). **Fork F-FENFE-3** (origem do catálogo).
10. **Pré-preenchimento (ADR D6):** quando `xProd` normalizado (trim, lowercase, sem acento) casa
    **exatamente** com o `name` de **um único** produto, o select nasce com esse valor e a linha ganha
    a marca "sugerido"; qualquer outra situação nasce vazia. Nunca casa por substring. **Fork F-FENFE-4.**
11. Duas linhas com o **mesmo `cProd`** enviam **um** mapeamento (o DTO é por `cProd`, e o service
    dobra SKUs repetidos) — a tela mostra as duas, mas o select é compartilhado. **Direto.**
12. Fornecedor: `<select>` opcional de `counterparties` SUPPLIER; pré-seleciona se o `name` normalizado
    casar exatamente com `emitNome` (não há CNPJ no `Counterparty`); vazio ⇒ o service resolve/cria
    pelo nome do emitente (D6). Link "gerenciar fornecedores" → `onNavigateToCounterparties` já
    existente no painel. **Fork F-FENFE-5.**
13. Vencimento: `<input type="date">` opcional; vazio ⇒ omitido (servidor usa `dhEmi`). Valor
    inválido nunca é enviado (o input nativo garante o formato; o DTO garante o calendário). **Direto.**
14. Botão **"Importar"** habilitado **somente** quando todo item com `indTot='1'` tem `productRef`
    não vazio; enquanto envia, desabilita e mostra "Enviando…". **Direto.**
15. Sucesso (201): `notify` + fecha o modal + `onImported`. Se `ignoredItems.length > 0`, o painel
    mostra um aviso persistente listando `nItem — cProd — xProd` com o motivo traduzido
    (`reason` vira chave i18n fixa `nfe.ignored.indTot-0`, nunca a string crua). **Direto.**
16. Erros: 400/403/404 passam por `resolveError` (texto pt-BR do servidor); 400 Zod (objeto) cai no
    fallback "Dados inválidos — revise os campos". A duplicata (P2002 → "Já existe uma conta a pagar
    em aberto para este fornecedor e documento.") aparece **como está**, sem tradução adicional. **Direto.**
17. O modal **não** exibe nem calcula custo por item, rateio ou D3 — só o que o XML diz. Depois do
    201, a linha nova na lista de AP é a fonte do valor lançado (`amountCents`). **Direto — fronteira.**

**D. Fluxo de VENDA — botão no `SaleDetailPanel`**

18. Botão **"Anexar NF-e"** na barra de ações do `SaleDetailPanel`, visível **só** quando
    `status === 'finalized'` (é o único estado em que a âncora `sale.finalized` existe por desenho;
    `paymentStatus` é irrelevante — a nota se anexa à receita, não ao recebimento). **Fork F-FENFE-6**
    (quais status). **Fork F-FENFE-2** (localização — é o ponto onde a letra de E3 diverge).
19. Clique abre input hidden `.xml`; após seleção chama `reconcileSaleNfe({ unitId: sale.unitId,
    saleId: sale.id }, file)` **sem** pré-visualização (o servidor não precisa de nada do operador
    além da âncora; a leitura do XML aqui seria só decorativa). **Direto.**
20. Resultado (200) em um `Modal` de relatório: `nfeTotalCents` × `saleTotalCents` × `differenceCents`
    via `formatCents` (já são `number`), badge `totalMatches` (OK / Divergência), lista `divergences[]`
    (strings pt-BR do servidor), `chaveAcesso`, `nfeItemCount`, e o `sourceDocumentId` como texto
    copiável. **Direto.**
21. 404 (venda órfã) ⇒ mensagem do servidor via `resolveError`; 400 de parse idem. **Direto.**
22. Após sucesso, `notify` no contexto `Vendas` e **nenhum** refetch de venda (o endpoint posta nada;
    a venda não muda). **Direto.**

**E. i18n, gates e testes**

23. Chaves novas em `accounting.json` (namespace `nfe.*`) e `finance_view.json` (`sales.nfe.*`) nos
    dois idiomas, na **mesma mudança**; paridade medida (847 → N = N). **Direto — gate.**
24. `neutral-*` só, cards `rounded-2xl`, zero `any`; `tsc --noEmit` limpo em `my-app`. Zero mudança em
    `server/` ⇒ sem regeneração de `openapi.json`/`__dto-shapes__.json`. **Direto — gate.**
25. Tela de `/accounting` fica atrás de `withAuth` ⇒ verificação contra **build de produção**. **Direto — gate.**
26. Testes vitest (cada comportamento acima tem o seu; mínimo):
    - `parseNfeSummary`: XML inline com `xmlns` default **e** variante com prefixo `nfe:`; `dhEmi` com
      fuso `-03:00` reslice para o dia certo; `indTot` preservado; XML inválido lança.
    - `nfe.service`: `FormData` com campos exatos; `itemMappings` é string JSON; sem `Content-Type`.
    - `ImportNfePurchaseModal`: após `new File([xml], 'nfe.xml', { type: 'text/xml' })` a tabela lista
      os itens; "Importar" desabilitado até mapear todos os `indTot='1'`; linha `indTot='0'` sem select;
      sugestão só em match exato único; payload chamado com `{ unitId, itemMappings, ... }`; 201 com
      `ignoredItems` mostra o aviso; erro 400 mostra a mensagem; container nunca contém `NaN`.
    - `SaleDetailPanel`: botão presente **só** em `status='finalized'` (com `paymentStatus` `paid` ou
      não); ausente em `draft`/`cancelled`/`returned`; chama `reconcileSaleNfe` com
      `sale.id`/`sale.unitId`; relatório renderiza `divergences`.
    - `AccountsPayablePanel`: o botão "Importar NF-e" existe e abre o modal (regressão de header).

## Forks — ✅ RATIFICADOS 2026-09-07 (dono, `AskUserQuestion`, fork a fork) — EMENDA

| Fork | Decisão do dono | Contra a recomendação? | Efeito no checklist |
|---|---|---|---|
| **F-FENFE-1** | **(b) endpoint novo `POST /api/nfe/preview`** (dry-run do `lib/nfe.ts`, devolve o resumo da nota) | **SIM** | Este item deixa de ser FE-only: nasce **`BE-INCR-NFE-PREVIEW`** (BRIEF próprio, rodada 2a do plano) **antes** deste. Comportamentos 3–5 (parser de tela) **caem**; no lugar, a tela chama o preview e renderiza o que o servidor devolve. Uma fonte de verdade do leiaute; custo = DTO + rota + `docs.paths.ts` + snapshot + path-count |
| **F-FENFE-2** | **(a) aba nova "NF-e" no `AccountingView`** com os dois fluxos | **SIM** | Comportamento 6 vira "aba `nfe` (20ª) com duas seções: Compra / Venda"; comportamento 18 (botão no `SaleDetailPanel`) **cai**. **Consequência que o dono precisa saber (D2, anotada):** a âncora `saleId` da venda **não pode ser texto livre** — recria o risco que o F-NFE8 matou. A aba usa um **seletor de vendas finalizadas** (unidade + período, listando id/data/valor/cliente) alimentado pela mesma fonte que o dashboard (`useSalesData`/DynamicTable `sales`, `status='Finalized'`); detalhe do seletor é decisão do implementador dentro desta regra. Um só namespace i18n (`accounting.json`) |
| **F-FENFE-3** | **(a) extrair `loadProductOptions`** para `features/accounting/lib/` e reusar | não | comportamento 9 como escrito |
| **F-FENFE-4** | **(c) match exato + lembrar `(emitDoc, cProd) → productRef` em `localStorage`** | **SIM** | Comportamento 10 ganha: após um import com sucesso, grava o mapa por `(CNPJ do emitente, cProd)`; na próxima nota do mesmo emitente a linha nasce preenchida e marcada **"lembrado"** (distinto de "sugerido"); `try/catch` em toda leitura/escrita; nunca auto-submete; botão "esquecer" por linha. Risco aceito: mapeamento errado uma vez propaga até o operador corrigir — a marca visível é a mitigação |
| **F-FENFE-5** | **(a') select opcional, pré-seleção por CNPJ (`taxId`) e senão por nome exato**, link para Contrapartes | não (opção refinada na 2ª pergunta) | Comportamento 12 muda: o tipo `Counterparty` do FE passa a expor `taxId` (o backend já o tem, `schema.prisma:1120`); pré-seleção compara `stripCnpjMask(emit.CNPJ)` com `taxId`; sem match, nome normalizado exato. Achado 2 deixa de valer para `taxId` |
| **F-FENFE-6** | **(a) só `status = 'finalized'`** | não | vale para o seletor de vendas da aba (F-FENFE-2), não mais para um botão no detalhe |
| **F-FENFE-7** | **(a) `nfe.service.ts` + `lib/services/multipart.ts`** | não | comportamento 1 como escrito |

**O que muda no plano:** rodada 2 → **2a** `BE-INCR-NFE-PREVIEW` (S → R → I → V → M) e **2b** `FE-INCR-NFE`
(este BRIEF, re-emendado após o 2a fixar o contrato do preview). Este BRIEF **não** abre `sessao-feature`
antes do 2a mergear.

Tabela original (caminhos + recomendação), mantida como registro:

| Fork | Caminhos | Recomendação + justificativa | Custo de errar |
|---|---|---|---|
| **F-FENFE-1 — como a tela conhece os itens da nota** | (a) parse de leitura no cliente com `DOMParser` nativo (10 campos, zero dep, zero regra de negócio) · (b) endpoint novo `POST /api/nfe/preview` (dry-run do `lib/nfe.ts`, uma fonte de verdade) — **vira BE-INCR, fora deste item** · (c) sem preview: submeter e ler o 400 por item | **(a).** É a escada do ponytail no degrau 3 (plataforma nativa), mantém o incremento FE-only como a casa separa, e o servidor continua o único que decide (um parse divergente só rende um 400 legível). (b) é o desenho "certo" a longo prazo, mas exige DTO, openapi, snapshot e sessão de BE — registrado em "Achados". (c) é o anti-padrão que o D6 quis evitar | médio: dois entendimentos do leiaute (server + 10 campos no cliente); o XML real (E9) prova os dois de uma vez |
| **F-FENFE-2 — onde vive cada fluxo** | (a) aba nova "NF-e" no `AccountingView` com os dois fluxos (letra de E3; o operador digita o `saleId` à mão) · (b) compra = botão no `AccountsPayablePanel`; venda = botão no `SaleDetailPanel` · (c) seção nova no `ImportExportPanel` | **(b).** A compra nasce como `Payable` e o resultado aparece na lista onde o botão está; a venda só tem âncora segura onde o `saleId` já está na tela — pedir o id à mão recria o risco que o F-NFE8 matou. **Diverge da letra de E3** ("no painel contábil") para a metade da venda — decisão explícita do dono | (a) baixo em código, alto em erro humano de âncora; (b) toca dois namespaces i18n |
| **F-FENFE-3 — origem do catálogo de produtos** | (a) extrair `loadProductOptions` de `CreatePayableModal.tsx:44-57` para `features/accounting/lib/loadProductOptions.ts` e reusar nos dois modais · (b) duplicar a função | **(a).** Mesmo objeto de domínio (catálogo `products` → `productRef` = id da linha) vivo dos dois lados — passa nos 2 estágios do critério de reuso; a cópia seria clone de símbolo | baixo; (b) é o clone que o revisor pega |
| **F-FENFE-4 — pré-preenchimento do produto** | (a) nenhum: operador escolhe tudo · (b) match **exato** de nome normalizado, único, marcado "sugerido", confirmação = submeter vendo a tabela · (c) (b) + lembrar `(emitDoc, cProd) → productRef` em `localStorage` | **(b).** É o que o ADR D6 pede ("pré-preenche e exige confirmar"); (a) contraria o ADR; (c) é conveniência que esconde erro de mapeamento entre notas — fica em "Achados" | (b) errado = item custeado no produto errado, mas o operador vê a linha antes de enviar |
| **F-FENFE-5 — fornecedor** | (a) select opcional + pré-seleção por nome exato + link para Contrapartes · (b) select obrigatório · (c) sem select (sempre pelo nome do emitente) | **(a).** Espelha o `CreatePayableModal` e o DTO (opcional); (b) trava a importação de emitente novo; (c) impede ligar à contraparte existente com nome diferente do XML | baixo |
| **F-FENFE-6 — quando o botão "Anexar NF-e" aparece** | (a) só `status='finalized'` (qualquer `paymentStatus`) · (b) `finalized` + `cancelled`/`returned` (a âncora `sale.finalized` sobrevive ao estorno) · (c) sempre, deixando o 404 falar | **(a).** É o único estado sem ambiguidade: a nota documenta a receita reconhecida na finalização; em `cancelled`/`returned` há estorno lançado e anexar proveniência à receita estornada é decisão contábil que nenhum ADR cobre — se um dia for preciso, é fork novo com artefato | baixo |
| **F-FENFE-7 — helpers multipart** | (a) pôr as 2 funções dentro de `accounting.service.ts` (reusa os helpers privados; arquivo já >800 linhas) · (b) `nfe.service.ts` novo + extrair `reconBaseUrl`/`reconAuthHeaders`/`reconParseError` para `lib/services/multipart.ts` consumido por ambos | **(b).** Uma terceira cópia da técnica (já há `accounting` e `crm`) é a classe "técnica re-inlinada" que o critério de reuso não enxerga; a extração é ~30 linhas e o `crm.service.ts` fica **intocado** (Achados) | baixo |

## Pendente de validação externa

- **Leiaute real do XML (E9 / F-I2):** o parser de tela (comportamento 3) e o do servidor são provados
  contra XML **sintético** transcrito do MOC 7.0. Namespace com prefixo, `infNFe` de outra `versao` e
  `det` fora de ordem só se provam com a NF-e real anonimizada — mesma dívida, agora em dois lugares.
- Nenhuma regra contábil/fiscal entra nesta tela: custo D3, rateio, `cStat`, idempotência e proveniência
  são do servidor (ADR D3–D7). O que a tela mostra do XML é **exibição**, não apuração.

## Insumos ausentes

- Nenhum que bloqueie o BRIEF. Se **F-FENFE-1 → (b)**, o item deixa de ser FE-only e precisa de BRIEF
  `BE-INCR-NFE-PREVIEW` antes deste (DTO, rota, `docs.paths.ts`, snapshot).

## Achados fora de escopo (registrados, não planejados — ORCH-006)

1. **Endpoint de preview** (`POST /api/nfe/preview`) reusando `lib/nfe.ts` — elimina o segundo parser
   quando o leiaute crescer (IBS/CBS em 2027).
2. **`Counterparty` sem documento (CNPJ/CPF):** impede casar emitente com segurança; o campo é modelagem
   de BE (INCR-COUNTERPARTY) e destrava também o T10 (CNPJ alfanumérico) do lado da contraparte.
3. **Memória de mapeamento `(emitente, cProd) → productRef`** entre notas (F-FENFE-4 c).
4. **`crm.service.ts:197`** carrega a mesma técnica multipart — candidato ao helper de F-FENFE-7 (b),
   fora deste item.
5. **Tela de `source-documents` por lançamento** (cédula C4, `FE-INCR-AUDIT-PROVENANCE`) é onde o
   `sourceDocumentId` devolvido pela venda ganharia um link — BRIEF próprio, já autorizado por F-M4.

## Risco principal e vieses (T8)

- **Risco principal:** F-FENFE-1 (a) cria um segundo entendimento do XML. Mitigação embutida: o cliente
  lê 10 campos de exibição e o servidor é a única autoridade; um desencontro vira 400, nunca lançamento
  errado. O XML real (E9) é o oráculo dos dois.
- **Viés desta sessão:** as recomendações favorecem **menos código e FE-only** (ponytail + separação
  BE/FE da casa), o que empurra o preview para o cliente. Quem pesar "uma fonte de verdade" acima de
  "diff mínimo" escolhe (b) e aceita mais um ciclo de BE antes deste.
- **Viés de localização:** F-FENFE-2 (b) é minha leitura do objetivo sob a letra de E3; a letra
  literal é (a).

---

## Checklist VIGENTE — re-emenda 2026-09-08 (pós rodada 2a; substitui o checklist original onde conflita)

> Base: `origin/main` `83c70088` — `POST /api/nfe/preview` mergeado (#283, `NfePreviewSchema` em
> `server/src/features/accounting/dtos/NfeDto.ts`), `lib/cnpj.ts` (#280). Forks F-FENFE-1..7 ratificados
> 2026-09-07. Onde este checklist e o original divergem, **vale este**. Decisões D2 (implementador decide e
> anota) marcadas `[D2]`.

**Contrato consumido (rodada 2a):** `POST /api/nfe/preview` multipart `file` + `unitId` → 200
`{ success, data: NfePreview }`; `NfePreview` = `chaveAcesso, ide{numero,serie,dhEmiDate,tpNF,natOp,mod},
emit{cnpj?,cpf?,nome?,ie?}, dest{…}, itens[{nItem,cProd,cEAN,xProd,ncm,cfop,uCom,qCom,vUnComStr,vProdCents,
vDescCents,indTot:'0'|'1'}], totais{…9 campos cents}, protocolo{cStat,nProt,dhRecbtoDate}, alreadyImported,
existingPayableId`. Erros 400 com mensagem pt-BR pronta; 403 policy; 401.

**A. Serviços de API**

V1. `my-app/lib/services/multipart.ts` (novo): `multipartBaseUrl()`, `multipartAuthHeaders()`,
    `multipartParseError(res)` — extraídos **por movimento** de `accounting.service.ts:528-547`;
    `accounting.service.ts` passa a importá-los (nomes locais preservados; zero mudança de comportamento).
    `crm.service.ts` intocado. Teste: `importBankStatement` continua enviando os mesmos campos (teste
    existente do Reconciliation cobre; se não houver, um teste de `FormData` mínimo).
V2. `my-app/lib/services/nfe.service.ts` (novo): `previewNfe({unitId}, file)`, `importPurchaseNfe({unitId,
    itemMappings, counterpartyId?, dueDate?}, file)` (`itemMappings` = `JSON.stringify`), `reconcileSaleNfe({unitId,
    saleId}, file)`; tipos `NfePreview`, `NfePurchaseImportResult`, `NfeSaleReconciliationReport` espelhando o
    servidor; sem `Content-Type` manual; erro = `{...body, status}` (padrão `resolveError`); `notify` só em
    sucesso de mutação (import/reconcile), nunca no preview. Teste: `FormData` capturado tem exatamente os
    campos do DTO; `itemMappings` é string JSON; preview não chama `notify`.
V3. `counterparties.service.ts`: `Counterparty` ganha `taxId?: string | null` (o backend já devolve; opcional no tipo para não tocar fixtures de testes vizinhos).

**B. Aba "NF-e" (F-FENFE-2 → a)**

V4. `AccountingView.tsx`: 20ª aba `{ id: 'nfe', labelKey: 'view.tabs.nfe', label: 'NF-e' }`, render
    `<NfePanel unitId={unitId} onLedgerChange={reload} />` só com `unitId`. `[D2]` posição: logo após
    `conciliacao` (é o vizinho de upload).
V5. `NfePanel.tsx` (novo, `features/accounting/components/`): duas seções empilhadas, "Compra" e "Venda",
    cada uma com seu input hidden `.xml` + botão (técnica de `ReconciliationPanel:509-522`), `setError`/
    `setNotice`, `resolveError`. Carrega `counterparties` SUPPLIER (`counterpartiesService.listCounterparties`)
    e o catálogo de produtos (V6) ao montar. `[D2]` um único componente com dois sub-blocos internos (`NfePurchaseSection`,
    `NfeSaleSection`) no mesmo arquivo, para o teste montar cada um.

**C. Compra**

V6. `features/accounting/lib/loadProductOptions.ts` (novo): função extraída **por movimento** de
    `CreatePayableModal.tsx:44-57`; o modal passa a importá-la (F-FENFE-3 → a). Teste do modal existente
    (`CreatePayableModal.inventory.test.tsx`) continua verde.
V7. Passo 1 — arquivo selecionado ⇒ `previewNfe`; loading; erro 400/403 ⇒ banner com a mensagem do servidor;
    sucesso ⇒ cabeçalho (emitente nome + documento, número/série, emissão via `formatDate`, chave
    monoespaçada, `vNFCents` via `formatCents` rotulado "valor da nota (vNF)") + tabela de itens.
    **`alreadyImported === true` ⇒ banner de aviso "esta nota já foi importada (título `existingPayableId`)" e
    botão Importar desabilitado** (F-PREV-3 b consumido).
V8. Tabela de itens: linha por item (`nItem, cProd, xProd, qCom uCom, vProdCents`); `indTot='0'` sem select,
    marcada "não compõe o total"; demais com `<select>` de produto (valor = `productRef`). `cProd` repetido
    compartilha o select (o DTO é por `cProd`).
V9. Pré-preenchimento (F-FENFE-4 → c): ordem **lembrado > sugerido > vazio**. `features/accounting/lib/
    nfeMappingMemory.ts` (novo): chave `luminaris.nfe.mapping.v1`, mapa `{ [emitDoc]: { [cProd]: productRef } }`,
    `remember(emitDoc, mappings)` após 201, `recall(emitDoc)`, `forget(emitDoc, cProd)`; toda leitura/escrita em
    `try/catch`, JSON inválido ⇒ mapa vazio. Linha lembrada mostra marca "lembrado" + botão "esquecer";
    sugerido = match **exato** de `xProd` normalizado (trim/lowercase/sem acento) com **um único** `name` do
    catálogo, marca "sugerido". Nunca auto-submete. `[D2]` `emitDoc` = `emit.cnpj ?? emit.cpf ?? ''`.
V10. Fornecedor (F-FENFE-5 → a'): select opcional de SUPPLIER; pré-seleção por `stripCnpjMask(emit.cnpj) ===
    counterparty.taxId` (a máscara-strip é **só** para comparar — `taxId` já vem normalizado do backend; no FE,
    replicar `stripCnpjMask` como helper local de 1 linha, `[D2]` sem importar do server), senão nome
    normalizado exato; link "gerenciar fornecedores" (`onNavigateToCounterparties` opcional — `[D2]` texto
    simples que troca para a aba `contrapartes` via prop `onNavigateTab?`).
V11. Vencimento `<input type="date">` opcional; vazio ⇒ omitido.
V12. Botão Importar habilitado só com todo item `indTot='1'` mapeado **e** `!alreadyImported`; "Enviando…"
    durante o request. 201 ⇒ `notify`, `remember(...)`, `onLedgerChange`, aviso persistente de
    `ignoredItems` (`nItem — cProd — xProd`, motivo via chave i18n `nfe.ignored.indTot-0`), e a seção volta ao
    passo 1 mantendo o aviso. 400/403 ⇒ `resolveError` (duplicata aparece como está).
V13. A tela **não** exibe custo/rateio/D3; só `vNFCents`. Dinheiro sempre `number` cents ⇒ `formatCents`
    direto; teste de "nunca NaN".

**D. Venda**

V14. Seletor de vendas finalizadas (F-FENFE-2 a + F-FENFE-6 a): `[D2]` fonte = DynamicTable `sales`
    (`DynamicTableService.getTables()` → `internalName === 'sales'` → `getTableData(id, 'limit=500')`),
    filtrada **no cliente** por `data.unitId === unitId` e `String(data.status).toLowerCase() === 'finalized'`
    (mesma técnica de `loadProductOptions`/`useAccountingData`). Opção = `id · date · totalAmount ·
    simpleCustomerName|customerId`. Lista vazia ⇒ mensagem "nenhuma venda finalizada nesta unidade".
    **Nunca campo de texto livre para `saleId`.**
V15. Fluxo: escolher venda → selecionar `.xml` → `reconcileSaleNfe({unitId, saleId}, file)` direto (sem
    preview: o servidor só precisa da âncora). 200 ⇒ relatório inline (não modal, `[D2]`): `nfeTotalCents` ×
    `saleTotalCents` × `differenceCents` via `formatCents`, badge `totalMatches`, lista `divergences[]`,
    `chaveAcesso`, `nfeItemCount`, `sourceDocumentId` copiável; `notify` contexto Vendas. 404/400 ⇒ banner.

**E. i18n, gates, testes**

V16. Chaves `view.tabs.nfe` + `nfe.*` em `accounting.json` pt/en, paridade medida (847 → N = N).
V17. `neutral-*`, `rounded-2xl`, zero `any`; `cd my-app && npx tsc --noEmit` limpo; `npm run build` de
    produção (tela atrás de `withAuth`); zero mudança em `server/`.
V18. Testes vitest (shim `globalThis.React`): `nfe.service.test.ts`; `nfeMappingMemory.test.ts` (round-trip,
    JSON inválido, `localStorage` que lança); `NfePanel.test.tsx` — compra: preview renderiza itens; Importar
    desabilitado até mapear; `indTot='0'` sem select; sugerido só em match exato único; lembrado precede
    sugerido; `alreadyImported` desabilita; payload chamado com `{unitId, itemMappings, ...}`; 201 com
    `ignoredItems` mostra aviso; 400 mostra mensagem; sem `NaN`; venda: seletor lista só `finalized` da
    unidade; chama `reconcileSaleNfe` com `saleId`/`unitId`; relatório renderiza `divergences`;
    `loadProductOptions` extraído: teste do `CreatePayableModal` inalterado; `AccountingView`: aba `nfe` existe.
