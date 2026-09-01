# BRIEF — FE-INCR-AGING (tela de aging AP/AR)

> Produzido por **sessão de planejamento**. Não contém código de aplicação, não ratifica fork.
> Todo fork abaixo está **PENDENTE** — decisão do dono, fora desta sessão (ORCH-006).

## Cabeçalho

- **Item a planejar:** frontend do relatório de aging (posição por contraparte × faixa de
  vencimento, AP e AR) — hoje inexistente em `my-app`.
- **Autorização (ORCH-006):** mensagem do dono em chat, 2026-08-31 — *"Organize em sdd multi
  agents sonnets que vc vai orquestrar"* — dada em resposta direta ao apontamento de que
  `FE-INCR-AGING` "começa por BRIEF, não por código". A autorização cobre exatamente produzir
  este BRIEF (não código); não amplio para implementação.
- **Fatos verificados nesta sessão (não assumidos):**
  - A string `"aging"` (case-insensitive) **não aparece em nenhum arquivo de `my-app/`** —
    confirmado por grep recursivo; os hits de varreduras anteriores citados no apontamento do
    dono eram a substring de `"staging"` (nenhuma ocorrência real de aging encontrada em
    `my-app`, verificado nesta sessão).
  - Não existe função de cliente de API para aging em `my-app/lib/services/*` — confirmado lendo
    `my-app/lib/services/accounting.service.ts` inteiro (827 linhas, sem `aging`).
  - O backend existe, é first-class Prisma, read-only, e está em `main` desde a PR #127 + tie-out
    PR #143 — confirmado lendo o código (não só a memória/master-map), ver §"Backend real" abaixo.
- **Divergência memória/docs × código:** **nenhuma**. `ACCOUNTING-MASTER-MAP.md` §5.1 linha 503
  ("~~aging por contraparte~~ ✅ MERGEADO... PR #127 + tie-out #143") bate exatamente com o que o
  código mostra. O que os documentos **não têm** é qualquer entrada de fila para o FE de aging —
  não é um erro de registro, é uma lacuna nunca aberta (nem Bloco A nem Bloco B do master map
  cita "FE-INCR-AGING"). Este BRIEF é o primeiro artefato da frente.

## Insumos existentes (lidos nesta sessão, não de memória)

| Insumo | Caminho | O que confirma |
|---|---|---|
| DTO de entrada | `server/src/features/accounting/dtos/aging.dto.ts` | `unitId` (obrigatório), `kind: 'payable'\|'receivable'` (obrigatório), `asOf` (opcional, date-only, `.strict()`) |
| Service | `server/src/features/accounting/services/AgingReportService.ts` | Shape completo do envelope de resposta (`AgingReport`), buckets fixos, tie-out |
| Controller/rota | `server/src/controllers/accountingController.ts:394-422` (`getAging`) + `server/src/routes/accounting.ts:92` | `GET /reports/aging`, monta em `/api/accounting` (`server/src/routes/index.ts:65`) ⇒ **`GET /api/accounting/reports/aging`**; exige JWT (`getUserContextFromRequest` → 401); 400 em Zod inválido |
| OpenAPI | `server/src/controllers/accountingController.ts:394-405` | Doc `@openapi` já existe — **nenhuma mudança de contrato/OpenAPI necessária nesta fatia** (FE puro) |
| Golden ref de painel de relatório simples | `my-app/features/accounting/components/BalanceSheetPanel.tsx` | Padrão controls→loading→error→empty→report; badges de status; `formatCents`/`formatDate` |
| Golden ref de relatório agrupado com drill | `my-app/features/accounting/components/DimensionReports.tsx` | Padrão mais próximo do shape do aging: grupos com sub-linhas de detalhe, toggle de "kind" dentro do mesmo painel (`balance`/`result` ≈ `payable`/`receivable`) |
| Cliente de API (padrão a estender) | `my-app/lib/services/accounting.service.ts` | Convenção `ApiEnvelope<T>`, `buildQuery()`, money sempre STRING cents para relatórios (BP/DRE/DFC), `notify()` só em mutação (read-only não notifica) |
| Onde a aba entra | `my-app/features/accounting/AccountingView.tsx` | Tab bar bespoke (array `TABS` + render condicional por `activeTab`), **não** `GenericTabbedView` — é o padrão já estabelecido de todos os irmãos (BP/DRE/DFC/Comparativo/Diário/Dimensões) |
| Página hospedeira | `my-app/pages/accounting/index.tsx` | Guarda de auth via `useAuth()` + redirect (equivalente ao `withAuth`, contrato §3) + `serverSideTranslations(locale, ['common','accounting'])` |
| Formatação | `my-app/features/accounting/lib/formatCents.ts`, `formatDate.ts`, `resolveError.ts` | `formatCents` espera `number` (sempre `parseInt(str,10)` antes); `formatDate` já é UTC-safe (usa `formatDateNumericBR` canônico — não sofre o bug de classe `date-only-rendering-utc-shift`) |
| i18n | `my-app/public/locales/{pt,en}/accounting.json` | Paridade **803 = 803** chaves hoje (medido nesta sessão via script) — gate a manter |
| Teste-padrão | `my-app/features/accounting/components/__tests__/BalanceSheetPanel.test.tsx` | Shim `globalThis.React`, mock do service, `parseInt` de string-cents nunca vira `NaN` |

## Backend real (contrato extraído do código, não presumido)

```
GET /api/accounting/reports/aging
  query:
    unitId: string (obrigatório)
    kind:   'payable' | 'receivable' (obrigatório)
    asOf:   string YYYY-MM-DD (opcional; default = hoje no fuso do AccountingScope)
  auth: Bearer JWT obrigatório (401 sem usuário); policy canReadPayable/canReadReceivable (403)
  erros: 400 (Zod), 403 (Forbidden por policy)
  200 → { success: true, data: AgingReport }
```

`AgingReport` (campos e comentários citados de `AgingReportService.ts:157-171`):

```ts
type AgingBucketId = 'a_vencer' | 'd1_30' | 'd31_60' | 'd61_90' | 'd90_plus'; // ordem fixa = ordem de exibição

interface AgingDocumentLine {
  id: string;
  documentNumber: string | null;
  dueDate: string;       // YYYY-MM-DD
  daysOverdue: number;   // as_of − dueDate; ≤0 = a vencer
  bucket: AgingBucketId;
  amountCents: string;   // INTEGER cents como string
}

interface AgingCounterpartyGroup {
  counterpartyId: string | null;     // null = grupo "(Sem contraparte)"
  counterpartyName: string;
  buckets: Record<AgingBucketId, string>;
  totalCents: string;
  documents: AgingDocumentLine[];
}

type TieOutSkippedReason = 'as_of_not_today' | 'control_account_missing' | 'control_account_not_balance_sheet_nature';

interface AgingTieOut {
  controlAccountCode: string;         // '2.1.2' (AP) ou '1.1.5' (AR)
  subledgerTotalCents: string;
  controlAccountBalanceCents: string; // já normalizado pela natureza
  differenceCents: string;
  tiesOut: boolean;                   // differenceCents === 0
}

interface AgingReport {
  unitId: string;
  kind: 'payable' | 'receivable';
  asOf: string;                       // YYYY-MM-DD
  buckets: Record<AgingBucketId, string>;   // totais gerais por faixa
  totalCents: string;
  groups: AgingCounterpartyGroup[];   // ordenados por counterpartyName (pt-BR)
  tieOut: AgingTieOut | null;         // null quando não emitível
  tieOutSkippedReason: TieOutSkippedReason | null; // motivo, mutuamente exclusivo com tieOut
}
```

Nota de leitura: `tieOut` só é emitido quando `asOf === hoje` (no fuso do escopo) **e** a conta de
controle existe **e** tem natureza BP. Qualquer outro caso retorna `tieOut: null` +
`tieOutSkippedReason` — o FE precisa tratar os dois ramos, nunca assumir `tieOut` presente.

## Checklist numerado de comportamentos (cada um testável)

1. **Painel novo `AgingPanel`** renderiza controles: seletor `kind` (Pagar/Receber), input de data
   `asOf` (`type="date"`, default hoje), botão "Gerar" — clona a estrutura de controles de
   `DimensionReports.tsx` (toggle `kind`) + `BalanceSheetPanel.tsx` (input de data). **Direto.**
2. Estado vazio (nenhum relatório gerado ainda) mostra prompt, igual ao padrão dos irmãos.
   **Direto.**
3. Ao clicar "Gerar", chama `accountingService.getAging({ unitId, kind, asOf })`; estados
   `loading`/`error` seguem exatamente o padrão de `BalanceSheetPanel`/`DimensionReports`.
   **Direto.**
4. Renderiza a **linha de totais gerais** por faixa, na ordem fixa de `AGING_BUCKETS`
   (`a_vencer, d1_30, d31_60, d61_90, d90_plus`) + `totalCents` — nunca reordenar as faixas no FE.
   **Direto.**
5. Renderiza um **bloco por grupo de contraparte** (`counterpartyName`, incluindo o grupo
   `"(Sem contraparte)"` quando `counterpartyId === null`) com os totais por faixa do grupo +
   `totalCents` do grupo — clona `BalanceBucketRows` de `DimensionReports.tsx`. **Direto.**
6. Dentro de cada grupo, lista o **drill por documento** (`documentNumber`, `dueDate` formatado
   com `formatDate`, `daysOverdue`, `bucket`, `amountCents` formatado com `formatCents`).
   **Fork F-AGING-3** (sempre expandido vs. accordion).
7. Bloco de **tie-out**: quando `tieOut !== null`, mostra confronto
   `subledgerTotalCents` × `controlAccountBalanceCents` × `differenceCents` + badge
   `tiesOut` (OK/discrepância) — clona o padrão de `ReportStatusBadge`/`DiagnosticsBanner` de
   `BalanceSheetPanel.tsx`. **Direto.**
8. Quando `tieOut === null`, mostra o **motivo** (`tieOutSkippedReason`) traduzido — os 3 valores
   do enum viram 3 chaves i18n fixas (`aging.tieOut.skipped.<reason>`), nunca a string crua do
   backend na tela. **Direto.**
9. Toda money field da resposta é **string cents** — sempre `parseInt(x, 10)` antes de
   `formatCents`; teste explícito de que o container nunca contém `"NaN"` (mesmo padrão do
   `BalanceSheetPanel.test.tsx:59-60`). **Direto — é gate, não fork.**
10. `dueDate`/`asOf` sempre via `formatDate` (nunca `new Date(iso).toLocaleDateString()` cru) —
    fecha a classe `date-only-rendering-utc-shift-class-bug`. **Direto — é gate.**
11. Erros de policy (403 `ForbiddenError`) e de validação (400 Zod) aparecem no banner de erro
    padrão via `resolveError`, igual aos irmãos. **Direto.**
12. Toggle `kind` (Pagar/Receber) dentro do **mesmo** painel, sem duplicar componente — clona a
    UI de toggle `balance`/`result` de `DimensionReports.tsx`. **Fork F-AGING-2** (toggle único
    vs. duas abas separadas).
13. Nova entrada em `AccountingView.tsx` (`TABS` + import + render condicional por `activeTab`,
    só quando `unitId` selecionado — mesmo guard que todos os irmãos). **Fork F-AGING-1**
    (nome/posição da aba).
14. Sem filtro por contraparte nem paginação client-side nesta fatia — o backend não aceita
    `counterpartyId` (confirmado lendo `aging.dto.ts`, só tem `unitId`/`kind`/`asOf`) e o envelope
    inteiro chega em uma resposta. **Fork F-AGING-4** (registra a alternativa, recomenda NÃO
    fazer agora).
15. Navegação cruzada contraparte→subledger filtrado (reusaria o `SubledgerFilterBar` já
    mergeado, PR #191) — **fora do escopo padrão dos irmãos hoje** (nenhum painel de relatório
    tem link cruzado). **Fork F-AGING-5** (registra, recomenda incluir por ser reuse de baixo
    custo).
16. `accountingService.getAging()` + os 7 tipos novos (`AgingReport`, `AgingBucketId`,
    `AgingCounterpartyGroup`, `AgingDocumentLine`, `AgingTieOut`, `AgingKind`,
    `TieOutSkippedReason`) adicionados a `accounting.service.ts`, **tipos locais** (nunca importar
    do backend), espelhando o shape confirmado acima. **Direto.**
17. i18n: toda string nova sob o namespace `aging.*` em
    `public/locales/{pt,en}/accounting.json`, paridade de chaves mantida (hoje 803=803; deve
    seguir N=N após a mudança — gate do projeto, não fork). **Direto — é gate.**
18. Teste vitest `AgingPanel.test.tsx`: estado vazio; geração com sucesso (grupos + tie-out OK);
    `tieOut: null` com motivo renderizado; grupo `"(Sem contraparte)"` presente; erro de policy
    (403) — clona a estrutura de `BalanceSheetPanel.test.tsx` (shim de `globalThis.React` se o
    componente não fizer `import React`). **Direto.**
19. `cd my-app && npx tsc --noEmit` limpo após a mudança. **Direto — é gate.**
20. Verificação da aba nova contra **build de produção** (`next build && next start`), não
    `next dev` — a página hospedeira (`pages/accounting/index.tsx`) já está atrás de guarda de
    auth (`useAuth()` + redirect). **Direto — é gate.**

## Contratos esboçados

### Cliente de API (`my-app/lib/services/accounting.service.ts` — nova seção "Aging (INCR-AGING)")

```ts
export type AgingKind = 'payable' | 'receivable';
export type AgingBucketId = 'a_vencer' | 'd1_30' | 'd31_60' | 'd61_90' | 'd90_plus';

export interface AgingDocumentLine {
  id: string;
  documentNumber: string | null;
  dueDate: string;
  daysOverdue: number;
  bucket: AgingBucketId;
  amountCents: string;
}

export interface AgingCounterpartyGroup {
  counterpartyId: string | null;
  counterpartyName: string;
  buckets: Record<AgingBucketId, string>;
  totalCents: string;
  documents: AgingDocumentLine[];
}

export type TieOutSkippedReason =
  | 'as_of_not_today'
  | 'control_account_missing'
  | 'control_account_not_balance_sheet_nature';

export interface AgingTieOut {
  controlAccountCode: string;
  subledgerTotalCents: string;
  controlAccountBalanceCents: string;
  differenceCents: string;
  tiesOut: boolean;
}

export interface AgingReport {
  unitId: string;
  kind: AgingKind;
  asOf: string;
  buckets: Record<AgingBucketId, string>;
  totalCents: string;
  groups: AgingCounterpartyGroup[];
  tieOut: AgingTieOut | null;
  tieOutSkippedReason: TieOutSkippedReason | null;
}

export interface AgingQuery {
  unitId: string;
  kind: AgingKind;
  /** YYYY-MM-DD; omitido = hoje no fuso do escopo (backend decide). */
  asOf?: string;
}

// dentro do objeto `accountingService`:
async getAging(query: AgingQuery): Promise<AgingReport> {
  const qs = buildQuery({ unitId: query.unitId, kind: query.kind, asOf: query.asOf });
  const res = await apiClient.get<ApiEnvelope<AgingReport>>(`/accounting/reports/aging${qs}`);
  return res.data;
},
```

### Props do painel

```ts
interface AgingPanelProps {
  unitId: string;
  // SE F-AGING-5 → (c): adicionar
  // onNavigateToPayable?: (counterpartyId: string) => void;
  // onNavigateToReceivable?: (counterpartyId: string) => void;
}
```

### i18n — chaves novas propostas (namespace `accounting`, prefixo `aging.*`)

Espelha 1:1 a nomenclatura já usada em `dimensions.reports.*`/`balanceSheet.*` — não é decisão,
é convenção herdada:

```
aging.title, aging.controls.kind, aging.controls.kind.payable, aging.controls.kind.receivable,
aging.controls.asOf, aging.controls.generate, aging.controls.generating,
aging.empty, aging.error.load,
aging.buckets.aVencer, aging.buckets.d1_30, aging.buckets.d31_60, aging.buckets.d61_90, aging.buckets.d90Plus,
aging.group.none, aging.group.total, aging.total,
aging.document.number, aging.document.dueDate, aging.document.daysOverdue,
aging.tieOut.title, aging.tieOut.subledgerTotal, aging.tieOut.controlBalance, aging.tieOut.difference,
aging.tieOut.tiesOut, aging.tieOut.mismatch,
aging.tieOut.skipped.as_of_not_today, aging.tieOut.skipped.control_account_missing,
aging.tieOut.skipped.control_account_not_balance_sheet_nature
```

## Arquivos a criar/tocar por camada

**Backend:** nenhum. O contrato já existe, é ratificado e está em `main` (PR #127 + tie-out
#143). Esta fatia é 100% frontend.

**Frontend:**
- CRIAR `my-app/features/accounting/components/AgingPanel.tsx` — clona a estrutura de
  `DimensionReports.tsx` (grupos + toggle de kind) e `BalanceSheetPanel.tsx` (controles de data +
  badges de status).
- CRIAR `my-app/features/accounting/components/__tests__/AgingPanel.test.tsx` — clona
  `BalanceSheetPanel.test.tsx`.
- EDITAR `my-app/lib/services/accounting.service.ts` — adicionar os 7 tipos + `getAging()` (ver
  contrato acima).
- EDITAR `my-app/features/accounting/AccountingView.tsx` — nova entrada em `TABS`, import do
  painel, bloco de render condicional (posição/id dependem de F-AGING-1).
- EDITAR `my-app/public/locales/pt/accounting.json` e `my-app/public/locales/en/accounting.json`
  — chaves novas sob `aging.*`, paridade de contagem mantida.
- **Sem** mudança em `server/`, `docs.paths.ts`, OpenAPI, schema Prisma ou migração.

## Forks — RATIFICADOS em 2026-08-31

> **Ratificação (ORCH-006):** mensagem do dono em chat, 2026-08-31 — *"Ratifico os 5 F-AGING
> conforme recomendado, dispara a onda 2"*. Os cinco forks abaixo estão decididos **na opção
> recomendada**: F-AGING-1 → (b) · F-AGING-2 → (a) · F-AGING-3 → (a) · F-AGING-4 → (a) ·
> F-AGING-5 → (b). As marcações "RATIFICAÇÃO PENDENTE" abaixo são o registro histórico do estado
> em que o BRIEF foi produzido; esta nota as supera.

- **F-AGING-1 — Posição/nome da aba na navegação.**
  (a) aba isolada logo após "Contrapartes";
  (b) aba própria "Aging" entre "Contas a Receber" e "Contrapartes" (documento → posição agregada
  → cadastro);
  (c) sub-aba dentro de cada painel de subledger existente (2 pontos de entrada, sem aba nova).
  **Recomendação: (b)** — aging cobre AMBOS AP e AR com um único toggle (ver F-AGING-2), então é
  seu próprio relatório de posição, análogo a DFC/Comparativo/Diário; a ordem lógica preserva o
  fluxo documento→posição→contraparte. **RATIFICAÇÃO PENDENTE.**

- **F-AGING-2 — Toggle Pagar/Receber no mesmo painel vs. duas abas.**
  (a) toggle único dentro de `AgingPanel` (clona `DimensionReports.tsx` `kind: 'balance'|'result'`);
  (b) duas abas/painéis separados ("Aging AP", "Aging AR").
  **Recomendação: (a)** — evita duplicar ~90% do componente (regra de reuse §0 do contrato); o
  próprio backend já modela os dois kinds sob o mesmo endpoint com um parâmetro.
  **RATIFICAÇÃO PENDENTE.**

- **F-AGING-3 — Drill-down por documento: sempre expandido vs. accordion por grupo.**
  (a) sempre expandido sob cada grupo (clona `BalanceBucketRows`, que sempre mostra
  `bucket.accounts`);
  (b) accordion colapsável por grupo (menos altura de tela com muitas contrapartes, mais estado).
  **Recomendação: (a)** para a primeira fatia (YAGNI — menos estado, menos código), com nota de
  que se o volume de contrapartes/documentos crescer, (b) vira a opção correta.
  **RATIFICAÇÃO PENDENTE.**

- **F-AGING-4 — Filtro por contraparte / busca client-side.**
  (a) sem filtro nesta fatia (backend não aceita `counterpartyId` — confirmado em `aging.dto.ts`;
  todo o envelope chega em uma resposta não paginada);
  (b) campo de busca client-side sobre `report.groups` já carregado (sem round-trip nem mudança
  de backend);
  (c) estender `AgingReportQuerySchema` no backend com `counterpartyId` (fora do escopo desta
  sessão — é mudança de backend, nó vizinho).
  **Recomendação: (a)** — nenhuma evidência de volume que justifique filtro agora; adicionar sem
  necessidade comprovada viola reuse-antes-de-recriar/YAGNI. **RATIFICAÇÃO PENDENTE.**

- **F-AGING-5 — Navegação cruzada contraparte → subledger filtrado.**
  (a) nenhuma navegação cruzada nesta fatia (consistente com todos os painéis de relatório
  atuais — BP/DRE/DFC/Comparativo/Diário não têm links cruzados);
  (b) clicar num grupo de contraparte chama `onNavigateToPayable`/`onNavigateToReceivable`,
  reusando o `SubledgerFilterBar` + filtro `counterpartyId` já mergeados na PR #191 (custo baixo,
  o filtro já existe);
  (c) navegar para a aba "Contrapartes" (`onNavigateToCounterparties`, callback que já existe em
  `AccountsPayablePanel`/`AccountsReceivablePanel`).
  **Recomendação: (b)** — é o loop natural "vejo quem me deve → vejo os documentos dele" e reusa
  infraestrutura já mergeada, mas diverge do precedente de "relatório sem link cruzado", por isso
  fica como fork em vez de direto. **RATIFICAÇÃO PENDENTE.**

## Pendências de validação externa

Nenhuma. Esta fatia não introduz regra contábil, fiscal ou legal nova — é leitura fiel de um
contrato já ratificado e mergeado (INCR-AGING, PR #127 + tie-out #143). Todo comportamento do
checklist decorre do shape já existente em `AgingReportService.ts`, não de uma regra de domínio
inventada nesta sessão.

## Insumos ausentes

Nenhum. Os insumos necessários (DTO, service, controller, rota, 2 golden refs de FE, service de
API, i18n, teste-padrão) foram todos localizados e lidos em disco nesta sessão — não houve
necessidade de varrer o repositório além do item autorizado.

## Achados fora de escopo (não planejados aqui — exigem nova autorização, ORCH-006)

- **Exportação/impressão do relatório de aging (PDF/CSV).** Nenhum painel de relatório da
  contabilidade (BP, DRE, DFC, Comparativo, Diário) tem exportação hoje — confirmado por grep em
  `my-app/features/accounting/components/` (só `SpedGenerationPanel`/`ImportExportPanel`, que são
  escopos diferentes: geração SPED e importação de dados, não exportação de relatório). Se
  exportação for desejada, é uma frente própria que afeta a família inteira de relatórios, não só
  aging — precisa de autorização e BRIEF dedicados.
- **`counterpartyId`/paginação no `AgingReportQuerySchema` do backend** (mencionado no fork
  F-AGING-4, opção (c)) — é mudança de backend, nó vizinho fora do perímetro desta sessão
  (frontend). Só vale a pena abrir se a opção (a)/(b) do fork se mostrar insuficiente em uso real.
