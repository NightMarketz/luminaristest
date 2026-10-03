# BRIEF — FE-INCR-FIXED-ASSETS (tela do C8: imobilizado + fatia NF-e `classId`)

> **Estado [FOLD 2026-10-02, mesma data]: os 7 forks RATIFICADOS na opção (a)** — dono, chat, por questionário
> (AskUserQuestion), [[D-2026-10-02-FE-INCR-FIXED-ASSETS-FORKS]]. Produzido por `sessao-planejamento` em
> 2026-10-02; os forks nasceram PENDENTES. Não contém código de aplicação. Implementar exige "executa" próprio (ORCH-006).

## Cabeçalho

- **Item a planejar:** nó [`FE-INCR-FIXED-ASSETS`](../plano/nos/FE-INCR-FIXED-ASSETS.md) — tela do C8 (imobilizado)
  sobre o BE já em `main`, mais a fatia NF-e `classId` (`PLANO-PENDENCIAS-FE-DTO-2026-09-28.md` §B2) como seção
  própria (F-B2-1 → a, decisão 13 de [D-2026-09-28](../plano/decisoes/D-2026-09-28-FE-CONTRATO-GERADO-E-FORKS-FE.md)).
- **Autorização (ORCH-006):** dono, chat, 2026-10-02: *"Autorizo planejar o BRIEF FE-INCR-FIXED-ASSETS (dono, 02/10)
  — só o BRIEF, sem 'executa'."* Cobre **planejar** este nó (incluída a fatia §B2). Não cobre implementar nem
  ratificar fork. Cobertura conferida: igual ao item (sem divergência "mais/menos").
- **Contrato (fato consumado, `origin/main` `4dd8fcb4`, lido nesta sessão):**
  - Rotas — `server/src/routes/accounting.ts:341-361` (todas sob `/api/accounting`):

    | Método | Caminho | DTO (entrada) | Resposta (`{ success, data }`) |
    |---|---|---|---|
    | GET | `/depreciation-rates?unitId&includeHidden` | `ListDepreciationRatesQuerySchema` | `DepreciationRate[]` — **1º GET semeia o Anexo III do escopo** (`DepreciationRateSeedService`, lazy) |
    | POST | `/depreciation-rates` | `UpsertDepreciationRateSchema` (nasce `CUSTOM`) | `DepreciationRate` (201) |
    | POST | `/depreciation-rates/:id/hide` | `HideDepreciationRateSchema` | `DepreciationRate` — oculta, nunca apaga; vale para `ANEXO_*` |
    | GET | `/fixed-asset-classes?unitId` | `FixedAssetClassScopeQuerySchema` | `FixedAssetClass[]` |
    | POST | `/fixed-asset-classes` | `CreateFixedAssetClassSchema` | `FixedAssetClass` (201) |
    | PATCH | `/fixed-asset-classes/:id` | `UpdateFixedAssetClassSchema` (`classId` = `:id`) | `FixedAssetClass` |
    | DELETE | `/fixed-asset-classes/:id` | `DeleteFixedAssetClassSchema` (**corpo JSON**) | soft-delete; 400 se há ativo vivo |
    | POST | `/fixed-assets/depreciation/run` | `RunDepreciationSchema` (`yearMonth` AAAA-MM) | `RunDepreciationResult { yearMonth, posted, skipped, failed[] }` |
    | POST | `/fixed-assets/reconcile` | `ReconcileFixedAssetsSchema` | `ReconcileFixedAssetsResult { checked, repaired, draftsCreated }` |
    | GET | `/fixed-assets?unitId&status&classId` | `ListFixedAssetsQuerySchema` | `FixedAsset[]` — **array inteiro, sem paginação no BE** |
    | GET | `/fixed-assets/:id?unitId` | `FixedAssetScopeQuerySchema` | `FixedAsset` |
    | POST | `/fixed-assets` | `CreateFixedAssetSchema` | `FixedAsset` (201, `PENDING_ACTIVATION`) |
    | PUT | `/fixed-assets/:id` | `UpdateFixedAssetSchema` (`assetId` = `:id`) | só `PENDING_ACTIVATION` |
    | DELETE | `/fixed-assets/:id` | `DeleteFixedAssetSchema` (**corpo JSON**) | só `PENDING_ACTIVATION` ou `ACTIVE` sem quota |
    | POST | `/fixed-assets/:id/activate` | `ActivateFixedAssetSchema` (CAS `version`) | 409 `ConflictError` em `version` divergente |
    | POST | `/fixed-assets/:id/dispose` | `DisposeFixedAssetSchema` (CAS `version`) | só `ACTIVE`; `counterpartAccountId` ⇔ `proceedsCents > 0` |
    | GET/PUT | `/settings` | `UpdateAccountingScopeSettingsInput` (parcial, campos `nullable`) | contas do escopo |

  - DTOs: `server/src/features/accounting/dtos/{FixedAssetDto,FixedAssetClassDto,DepreciationRateDto,DepreciationDto}.ts`.
  - Modelos: `prisma/schema.prisma` `FixedAssetClass`, `DepreciationRate`, `FixedAsset` (status `PENDING_ACTIVATION |
    ACTIVE | FULLY_DEPRECIATED | DISPOSED`, `version` para CAS; `*Cents` `BigInt` → `number` no fio por
    `lib/jsonBigintReplacer.ts`; datas date-only gravadas como `DateTime` UTC meia-noite).
  - Pré-condições de conta do BE: `runMonth` exige `settings.depreciationExpenseAccountId`
    (`DepreciationService.ts:103`); `dispose` exige `disposalGainAccountId`/`disposalLossAccountId`
    (`FixedAssetService.ts:277,281`). Conta de classe/contrapartida só precisa ser folha (`acceptsEntries`) —
    o BE **não** checa natureza (`FixedAssetClassService.ts:113`, `FixedAssetService.ts:408`).
- **Fatos verificados no FE (nesta sessão):**
  1. **Zero código de imobilizado no FE** (grep `fixedAsset|depreciation|disposalGain` fora de `types/contracts`: vazio).
     **Nenhuma tela edita `AccountingScopeSettings`** (grep `bankChargeExpenseAccountId`: vazio) ⇒ hoje
     depreciação e baixa são inalcançáveis pela tela ⇒ Fork **F-FAFE-3**.
  2. Tipos gerados **já existem** (FE-CONTRACT-TYPES PR-1 #428): `my-app/types/contracts/accounting/`
     `FixedAssetDto.gen.ts`, `FixedAssetClassDto.gen.ts`, `DepreciationRateDto.gen.ts`, `DepreciationDto.gen.ts`,
     `AccountingScopeSettingsDto.gen.ts`, `NfeDto.gen.ts` (com `classId?` e `destination?`). Só **entradas** —
     respostas ficam fora do gerador (decisão 9 de D-2026-09-28) e são declaradas à mão no service.
  3. **`GenericTable` não serve a linha Prisma:** exige `ITableSchema`/`tableId`/`useGenericData`
     (`features/dashboard/category-views/shared/components/GenericTable.tsx:53-78`). Precedente ratificado
     **F-FE-2 → a** (`FE-INCR-LALUR-brief.md` §3; `LalurPanel.tsx:39-40`): `<table>` + `Modal`. Reusa-se
     `Modal` (`components/ui/Modal`), `StandardPagination` (`features/dashboard/shared/components/`, uso em
     `AccountsPayablePanel.tsx:463`) e `CatalogCombobox` (`features/accounting/components/`, usado por
     `LalurEntryModal`/`QualifAssinanteSelect`).
  4. `AccountingView.tsx:34-64` — 21 abas, render condicional por `activeTab`; i18n via `useAccountingT()`
     (`public/locales/{pt,en}/accounting.json`). Helpers: `formatCents`, `parseBrl`, `formatDate` (fatia
     `iso.slice(0,10)` — seguro para date-only), `scopeToday`, `resolveError`, `inputClass` (de `SpedGenerationPanel`).
  5. `accounting.service.ts:717` `getAccounts(unitId)` — select de conta por **id** (footgun de `accounting-fe-incr-ap`).
  6. **NF-e:** `nfe.service.ts:68-71` `NfeItemMapping = { cProd; productRef }` (mão, não migrado ao gerado);
     `NfePanel.tsx:141,211,237,327` — `allMapped`, montagem do payload e `<select>` de produto por `cProd`;
     `nfeMappingMemory.ts` lembra `(emitente, cProd) → productRef` em localStorage (F-FENFE-4 → c).
- **Fato novo que muda a premissa da §B2 (verificado):** o **BE-INCR-ITEM-DESTINATION PR-1 (#461, em `main`)**
  aplicou a EMENDA 29/09 itens 21-26: *"o CFOP deixa de rotear — o `classId` do operador É a declaração de
  imobilizado"* (`NfeDto.ts:28-30`; `itemDestination.ts:15-18` — `FIXED_ASSET_CFOPS` só gera **warning**,
  `:61`). Motivo: o XML do fornecedor traz o CFOP da **saída dele** (5xxx/6xxx); 1551/2551 nunca aparece em
  XML real (MOC 7.0 Anexo I, I08-10; achado A-1 do `BE-INCR-ITEM-DESTINATION-brief.md`). ⇒ **F-B2-2 → a**
  ("BE expõe `isFixedAsset` pelo CFOP") **ficou sem objeto**: um `isFixedAsset` derivado do CFOP seria
  `false` em toda nota real. Não reabro a decisão por conta própria — vira Fork **F-FAFE-1**.
- **Nós vizinhos:** consome [[C8]] (done) e [[ITEM-DESTINATION]] PR-1 (#461). Vizinho FE ainda sem nó:
  par FE do ITEM-DESTINATION (A-6 daquele BRIEF: seletor de destinação no `NfePanel` + defaults por produto) —
  **compartilha o mesmo controle por item** ⇒ Fork **F-FAFE-2**. Emenda 3.2 do C8 (P1→P4, forks F-EM
  ratificados 02/10, **sem "executa"**) vai acrescentar campos (benfeitoria/prazo do contrato, R$1.200 por
  unidade "escolhido na entrada") — esta tela **não os antecipa** (ver §6). FE-CONTRACT-TYPES PR-3 (pendente)
  migra o resto dos services — ordem com esta fatia em §1, item 30.

## Definição de pronto

Aba **"Imobilizado"** em `AccountingView` com 4 seções — Bens (lista + criar/editar/remover + ativar/baixar),
Classes, Taxas (catálogo Anexo III + CUSTOM) e Contas do imobilizado — mais depreciação mensal e reconciliação;
`NfePanel` aceitando item mapeado para **classe de bem**; erros do BE por `resolveError`; i18n pt/en; vitest
(shim `globalThis.React`); `tsc` + `npm run test:types` limpos; **verificado contra build de produção**
(tela atrás de `withAuth`); sign-off de browser = humano (H2-like, runbook em branco).

## 1. Checklist de comportamentos

Classificação: **[D]** direto · **[F-x]** depende do fork x · **[P]** precedente ratificado citado.

### Estrutura e service

1. **[F-FAFE-4]** Aba `imobilizado` em `TABS` (`AccountingView.tsx:34-64`), rótulo `view.tabs.imobilizado`,
   render `{activeTab === 'imobilizado' && unitId && <FixedAssetsPanel unitId={unitId} onNavigateToPeriods=… />}`.
2. **[D]** `my-app/lib/services/fixedAssets.service.ts` (novo; um domínio = um service, padrão dos irmãos):
   métodos de §2.1. Entradas tipadas pelos `.gen.ts`; respostas declaradas à mão (decisão 9). Montagem de
   payload por função com retorno declarado ou `satisfies` — **nunca `.map` sem anotação nem spread de
   rascunho** (decisão 7; memória `map-sem-anotacao-escapa-excess-property`).
3. **[D]** `DELETE` com corpo JSON (`{ unitId, assetId|classId }`) — o BE lê `req.body`
   (`fixedAssetController.ts:81-89`); sem corpo = 400.
4. **[D]** Toda chamada leva `unitId`; `assetId`/`classId` do corpo = `:id` do path (o BE dá 400 se divergir).
5. **[D]** `accounting.service.ts` ganha `getSettings(unitId)` / `updateSettings(input)` sobre `GET/PUT
   /api/accounting/settings` (dono das rotas `/api/accounting/*`), input = `UpdateAccountingScopeSettingsInput`.

### Bens (`FixedAsset`)

6. **[P F-FE-2]** Lista em `<table>` (não `GenericTable`): código, descrição, classe (nome resolvido do
   cache de classes), custo, depreciação acumulada, valor líquido (`cost − accumulated` — a acumulada já inclui a abertura; `cost − opening − accumulated` descontaria 2×, corrigido em 03/10 pelo review do PR-1 —, só
   exibição), status (badge), aquisição/ativação (`formatDate`).
7. **[D]** Filtros server-side `status` e `classId` (o BE já filtra); **paginação client-side** com
   `StandardPagination` sobre o array (o BE devolve tudo, `FixedAssetService.ts:65-68`).
8. **[D]** "Novo bem" → `Modal` com `CreateFixedAssetInput`: classe (select), código, descrição, NCM
   (opcional), quantidade (default 1), custo e residual (`parseBrl` → centavos inteiros), aquisição
   (`<input type="date">`, default `scopeToday()`), taxa: rádio **"do catálogo" (`rateId`, via
   `CatalogCombobox`: `codigo=id`, `descricao="<ncm> — <description>"`, `tag="<x,y>% a.a."`) | "explícita"
   (`annualRateBp`, digitada em % e convertida ×100)** — XOR do DTO; taxa contábil divergente
   (`bookAnnualRateBp` + justificativa obrigatória) em bloco recolhido.
9. **[D]** Validação local espelhando só o que é **forma** do DTO (XOR de taxa; residual < custo; justificativa
   quando `bookAnnualRateBp`). Regra de negócio fica no BE; a mensagem dele aparece por `resolveError`.
10. **[D]** Editar (`PUT`) visível **só em `PENDING_ACTIVATION`** (`FixedAssetService.ts:136`). Envia só os
    campos alterados + `unitId`/`assetId`.
11. **[D]** Remover visível em `PENDING_ACTIVATION` ou `ACTIVE` com `accumulatedDepreciationCents === 0`
    (`FixedAssetService.ts:179-184`); `Modal` de confirmação; o BE é a autoridade.
12. **[D]** **Ativar** (`PENDING_ACTIVATION`): `Modal` com `activatedAt` (date, default `scopeToday()`) e
    `openingAccumulatedCents` opcional, com ajuda "obrigatório se a ativação for anterior ao 1º período
    aberto" (o FE não conhece o período mais antigo; o 400 do BE explica). Envia `version` lido.
13. **[D]** **Baixar** (`ACTIVE`): `disposedAt`, `proceedsCents` (0 = imprestável) e, quando `> 0`,
    `counterpartAccountId` (select de contas `acceptsEntries`; sem filtro de natureza — o BE não filtra).
    Envia `version`.
14. **[D]** **409 de CAS** (ativar/baixar): mensagem "o bem mudou — recarregado" + recarga da lista; nunca
    reenvio automático.
15. **[D]** Bem criado pela NF-e (`payableId`/`sourceDocumentId` preenchidos, `PENDING_ACTIVATION`) aparece
    na lista com marca "da NF-e"; o fluxo é o mesmo (editar/ativar).

### Depreciação e reconciliação

16. **[F-FAFE-5]** "Rodar depreciação": `<input type="month">` (default = mês anterior a `scopeToday()`) →
    `POST /fixed-assets/depreciation/run`; resultado `posted/skipped` + tabela de `failed[]`
    (`PERIOD_NOT_OPEN` → link `onNavigateToPeriods`).
17. **[D]** Sem `depreciationExpenseAccountId` → o 400 do BE aparece com link para a seção "Contas" (item 22).
18. **[D]** "Reconciliar" → `POST /fixed-assets/reconcile`; mostra `checked/repaired/draftsCreated`
    (`draftsCreated` = rascunhos recriados de payables com `fixedAssetItems`).
19. **[D]** Após run/reconcile/ativar/baixar: recarrega a lista e chama `onLedgerChange` (o razão mudou),
    como `EntryApprovalsPanel`.

### Classes (`FixedAssetClass`)

20. **[P F-FE-2]** Lista + `Modal` criar/editar (`PATCH`) + remover: código, nome, depreciável (checkbox),
    conta do bem, conta de depreciação acumulada (obrigatória e visível só se depreciável — `superRefine` do
    DTO). Selects de conta: `getAccounts` filtrado por `acceptsEntries`, valor = **id**.
21. **[D]** Remover classe com bem vivo → 400 do BE exibido (`FixedAssetClassService.ts:105`).

### Contas do imobilizado

22. **[F-FAFE-3]** Seção "Contas": 3 selects — `depreciationExpenseAccountId`, `disposalGainAccountId`,
    `disposalLossAccountId` — sobre `GET/PUT /settings` **parcial** (só esses 3 campos no corpo; os de
    tarifa bancária não são tocados). `depreciationParteBAccountId` **fora** (sem leitor desde o PR-3; volta
    com o Bloco F da emenda 3.2).

### Taxas (`DepreciationRate`)

23. **[D]** Lista: NCM, descrição, vida útil, taxa (%), origem (badge `ANEXO_III_*`/`CUSTOM`), link
    `sourceUrl` ("fonte"), justificativa; toggle "mostrar ocultas" (`includeHidden`).
24. **[D]** "Nova taxa" (`CUSTOM`): NCM (opcional), descrição, vida útil (anos), taxa (% → bp), justificativa
    (obrigatória). Sem edição (o BE não tem rota).
25. **[D]** "Ocultar" em qualquer linha, com confirmação; nunca "apagar" (texto: "deixa de aparecer na
    escolha; bens que já usam a taxa continuam com o snapshot").
26. **[D]** Primeira abertura da seção dispara o seed lazy no BE — estado de carregamento normal, sem botão
    "semear".

### Fatia NF-e `classId` (ex-§B2 do `PLANO-PENDENCIAS-FE-DTO`; F-B2-1 → a)

27. **[F-FAFE-1, F-FAFE-2]** Por item costeado (`indTot === '1'`) do `NfePanel`: controle **"Tipo"**
    (`Produto` | `Imobilizado`); `Produto` → `<select>` de produto de hoje; `Imobilizado` → `<select>` de
    classe (`listClasses(unitId)`). O FE **não lê CFOP** para decidir nada.
28. **[D]** `NfeItemMapping` vira união discriminada (§2.2); `itemMappings` = `{cProd, productRef}` **XOR**
    `{cProd, classId}` (o BE recusa os dois ou nenhum, `NfeDto.ts:41-45`). `destination` **não** é enviado
    (com `classId`, o BE já resolve `IMOBILIZADO/OVERRIDE`, `NfeDto.ts:28-30`). `allMapped` exige o
    mapeamento do tipo escolhido. No gerado, `itemMappings` é tupla não-vazia (`[T, ...T[]]`, decisão 4a de
    D-2026-09-28) — monta-se com `nonEmpty()`, como os services já migrados.
29. **[D]** Sem classe cadastrada → estado vazio no select com link "cadastrar classe" que troca para a aba
    Imobilizado (callback como `onNavigateToPeriods`). Erro de taxa por NCM ambíguo/ausente
    (`resolveRateForNcm`, `FixedAsset.model.ts`) aparece por `resolveError` com link para a seção Taxas.
30. **[F-FAFE-6]** `nfeMappingMemory` segue só `productRef`; item marcado `Imobilizado` não é lembrado.
31. **[D]** Tipo de `NfeItemMapping` derivado do gerado (`ImportNfePurchaseInput['itemMappings'][number]`
    estreitado), migração **só** desse tipo; o resto do `nfe.service.ts` fica para o FE-CONTRACT-TYPES PR-3.
    Se o PR-3 mergear antes, rebaseia sobre ele (não duplica).

### Testes e gates

32. **[D]** vitest (shim `globalThis.React`; esperar o DOM, não a chamada — memória
    `handler-async-closure-stale-x-waitfor-tohavebeencalled`; dreno no `afterEach`):
    - criar bem com taxa do catálogo → payload com `rateId` e sem `annualRateBp`; com taxa explícita → o inverso;
    - editar/remover ocultos fora do status permitido;
    - ativar/baixar enviam `version`; 409 recarrega;
    - baixar com `proceeds > 0` sem contrapartida bloqueia o envio;
    - classe não depreciável esconde a conta acumulada e não a envia;
    - "Contas" envia só os 3 campos;
    - **NF-e com 1 item `Imobilizado` + 1 item `Produto` → payload com um `classId` e um `productRef`**
      (item 6 da §B2), sem `destination`;
    - `formatDate` de `acquiredAt` não volta um dia (memória `date-only-rendering-utc-shift-class-bug`).
33. **[D]** Gates: `cd my-app && npx tsc --noEmit` + `npm run test:types` (memória
    `tsc-noemit-my-app-exclui-testes`), vitest, paridade i18n pt/en (`skill-audit wiring`), build de produção,
    `neutral-*`/`rounded-2xl`.
34. **[D]** Runbook de sign-off de browser **em branco** (formato `RUNBOOK-FORMAT.md`): criar classe → bem →
    ativar → rodar mês → baixar; NF-e com item imobilizado → rascunho na lista. Agente não preenche.

**PRs sugeridos (serial):** PR-1 = itens 1-26 + 32-34 (aba); PR-2 = itens 27-31 (NF-e; depende da seção Classes
do PR-1 para o link do item 29).

## 2. Contratos esboçados

### 2.1 Service FE (`lib/services/fixedAssets.service.ts`)

```ts
import type {
  CreateFixedAssetInput, UpdateFixedAssetInput, ActivateFixedAssetInput, DisposeFixedAssetInput,
} from '@/types/contracts/accounting/FixedAssetDto.gen';
import type { CreateFixedAssetClassInput, UpdateFixedAssetClassInput } from '@/types/contracts/accounting/FixedAssetClassDto.gen';
import type { UpsertDepreciationRateInput } from '@/types/contracts/accounting/DepreciationRateDto.gen';
import type { RunDepreciationInput } from '@/types/contracts/accounting/DepreciationDto.gen';

// Respostas — à mão (decisão 9). BigInt → number (jsonBigintReplacer); DateTime → ISO string.
export type FixedAssetStatus = 'PENDING_ACTIVATION' | 'ACTIVE' | 'FULLY_DEPRECIATED' | 'DISPOSED';
export interface FixedAsset {
  id: string; unitId: string; classId: string; code: string; description: string;
  ncmPrefix: string | null; quantity: number;
  costCents: number; residualValueCents: number;
  rateId: string | null; annualRateBp: number;
  bookAnnualRateBp: number | null; bookRateJustification: string | null;
  openingAccumulatedCents: number; accumulatedDepreciationCents: number;
  status: FixedAssetStatus;
  acquiredAt: string; activatedAt: string | null; disposedAt: string | null;
  disposalEntryId: string | null; sourceDocumentId: string | null; payableId: string | null;
  sourceItemRef: string | null; version: number;
}
export interface FixedAssetClass {
  id: string; code: string; name: string; depreciable: boolean;
  costAccountId: string; accumulatedDepreciationAccountId: string | null;
}
export interface DepreciationRate {
  id: string; ncm: string | null; description: string; lifeYears: number; annualRateBp: number;
  source: 'ANEXO_III_IN_1700_2017' | 'ANEXO_III_NOTA_1' | 'ANEXO_III_NOTA_2' | 'CUSTOM';
  sourceUrl: string | null; justification: string | null; hiddenAt: string | null;
}
export interface RunDepreciationResult {
  yearMonth: string; posted: number; skipped: number;
  failed: Array<{ assetId: string; code: 'PERIOD_NOT_OPEN'; message: string }>;
}
export interface ReconcileFixedAssetsResult { checked: number; repaired: number; draftsCreated: number }

export const fixedAssetsService = {
  listAssets(q: { unitId: string; status?: FixedAssetStatus; classId?: string }): Promise<FixedAsset[]>,
  createAsset(input: CreateFixedAssetInput): Promise<FixedAsset>,
  updateAsset(id: string, input: UpdateFixedAssetInput): Promise<FixedAsset>,
  deleteAsset(id: string, unitId: string): Promise<FixedAsset>,            // body { unitId, assetId: id }
  activateAsset(id: string, input: ActivateFixedAssetInput): Promise<FixedAsset>,
  disposeAsset(id: string, input: DisposeFixedAssetInput): Promise<FixedAsset>,
  runDepreciation(input: RunDepreciationInput): Promise<RunDepreciationResult>,
  reconcile(unitId: string): Promise<ReconcileFixedAssetsResult>,
  listClasses(unitId: string): Promise<FixedAssetClass[]>,
  createClass(input: CreateFixedAssetClassInput): Promise<FixedAssetClass>,
  updateClass(id: string, input: UpdateFixedAssetClassInput): Promise<FixedAssetClass>,
  deleteClass(id: string, unitId: string): Promise<FixedAssetClass>,      // body { unitId, classId: id }
  listRates(unitId: string, includeHidden?: boolean): Promise<DepreciationRate[]>,
  createRate(input: UpsertDepreciationRateInput): Promise<DepreciationRate>,
  hideRate(id: string, unitId: string): Promise<DepreciationRate>,
};
```

Conversões puras (testáveis sem DOM): `percentToBp('33,3') === 3330`, `bpToPercent(3330) === '33,3'`.

### 2.2 NF-e (`lib/services/nfe.service.ts`)

```ts
import type { ImportNfePurchaseInput } from '@/types/contracts/accounting/NfeDto.gen';
type GenMapping = ImportNfePurchaseInput['itemMappings'][number];
// Estreita o gerado (que tem os dois opcionais) para o XOR que o BE impõe; sem `destination` nesta fatia.
export type NfeItemMapping =
  | (Pick<GenMapping, 'cProd'> & { productRef: string; classId?: never })
  | (Pick<GenMapping, 'cProd'> & { classId: string; productRef?: never });
```

### 2.3 Settings (`lib/services/accounting.service.ts`)

```ts
import type { UpdateAccountingScopeSettingsInput } from '@/types/contracts/accounting/AccountingScopeSettingsDto.gen';
type FixedAssetAccountsPatch = Pick<UpdateAccountingScopeSettingsInput,
  'unitId' | 'depreciationExpenseAccountId' | 'disposalGainAccountId' | 'disposalLossAccountId'>;
getSettings(unitId: string): Promise<AccountingScopeSettings>;     // resposta à mão
updateSettings(input: FixedAssetAccountsPatch): Promise<AccountingScopeSettings>;
```

## 3. Forks — **RATIFICADOS 2026-10-02 (7/7 na opção (a))**

| Fork | Pergunta | (a) | (b) | (c) | Recomendação |
|---|---|---|---|---|---|
| **F-FAFE-1** ✅ (a) | F-B2-2 → a ("BE expõe `isFixedAsset` pelo CFOP") ficou sem objeto desde #461. Como o FE sabe que o item é imobilizado? | O **operador declara** por item (controle "Tipo"); FE não lê CFOP; nenhum campo novo no BE | BE expõe uma **sugestão** (`suggestedDestination`) no preview, sem rotear | FE espelha `{1551, 2551}` como dica | **(a).** É exatamente a regra do BE desde a EMENDA item 22 ("o `classId` do operador é a declaração"). (b) sugeriria a partir de um CFOP que não aparece em XML real (A-1) — sempre vazio; uma sugestão útil viria do default por produto (ITEM-DESTINATION PR-2), não daqui. (c) é o mesmo objeto com dois donos, já rejeitado em F-B2-2 |
| **F-FAFE-2** ✅ (a) | Alcance do controle por item no `NfePanel` | **2 opções** (`Produto`, `Imobilizado`), sem `destination`; o controle nasce como `<select>` "Tipo", para o par FE do ITEM-DESTINATION acrescentar `Insumo do serviço` sem reescrita | Absorver aqui o par FE do ITEM-DESTINATION (3 opções + `destination` + defaults por produto) | — | **(a).** A autorização cobre a fatia `classId`; INSUMO_SERVICO é frente adjacente sem nó (regra 5). O formato `<select>` evita retrabalho. Custo: até o par FE existir, `Produto` segue indo como REVENDA/FALLBACK, como hoje |
| **F-FAFE-3** ✅ (a) | Onde o operador configura as contas que a depreciação e a baixa exigem | Seção "Contas" **dentro da aba Imobilizado**, PUT parcial só dos 3 campos | Tela geral de configurações contábeis (inclui tarifa bancária) | Nada na tela; o 400 do BE orienta | **(a).** Sem ela, run e baixa são inalcançáveis pela tela (fato 1). (b) é frente nova (tarifa bancária é de outro nó). (c) deixa a feature morta. O PUT parcial não toca os outros campos (DTO com tudo opcional) |
| **F-FAFE-4** ✅ (a) | Lugar da tela | Aba nova "Imobilizado" (22ª) com seções Bens / Classes / Taxas / Contas | Seção dentro de "Contas a Pagar" | — | **(a).** Imobilizado não é título a pagar; o vínculo com AP é só a origem NF-e (item 15). Precedente de aba própria: "Dimensões", "Conciliação" |
| **F-FAFE-5** ✅ (a) | Depreciação: um mês por clique ou intervalo | **Um mês** por chamada (o contrato do BE) | Intervalo "de–até" com laço sequencial no FE | — | **(a).** O BE processa um mês por chamada (`DepreciationDto.ts:5-8`); um laço no FE vira orquestração parcial sem atomicidade (falha no meio deixa meses postados e outros não, sem relatório único). Atrasado em muitos meses = vários cliques, e cada resultado aparece |
| **F-FAFE-6** ✅ (a) | `nfeMappingMemory` lembra item marcado como imobilizado? | Não — memória segue só `productRef` (chave `v1` intacta) | Sim — valor discriminado, chave `v2` + migração | — | **(a).** Compra de imobilizado do mesmo `cProd` raramente se repete, e lembrar uma **classe** contábil por navegador seria um default fiscal silencioso. Zero migração de localStorage |
| **F-FAFE-7** ✅ (a) | Pedido literal "reuse `GenericTable`" × precedente F-FE-2 → a | `<table>` + `Modal` + `StandardPagination` (precedente; `GenericTable` é do DynamicTable) | Adaptar `GenericTable` para linha Prisma | — | **(a).** O `GenericTable` exige `ITableSchema`/`useGenericData` (fato 3); adaptá-lo mudaria um canônico de fan-in alto por uma tela. Registro como fork porque **diverge da letra do pedido**; o objetivo (reusar o canônico, não criar ilha) é atendido pelo canônico **da contabilidade** |

## 4. Pendente de validação externa

- Conferência da depreciação gerada pela tela contra o contador / PVA (H1/H2) — gate humano; agente não fecha.
- Rótulos de status e textos de ajuda ("imprestável", "retroativo") em linguagem de contador: validação humana no
  sign-off de browser.

## 5. Insumos ausentes

- Nenhum que bloqueie. Não reli o `NfePanel` inteiro (só as linhas citadas); a sessão de feature lê o arquivo
  completo antes de editar.

## 6. Achados fora de escopo (registrados, não planejados)

1. **Emenda 3.2 do C8** (P1→P4, sem "executa"): benfeitoria (prazo do contrato na classe/bem), R$1.200 por
   unidade "escolhido na entrada" (toca o controle por item da NF-e) e Bloco F (`depreciationParteBAccountId`).
   Cada PR de BE que mergear pede delta nesta tela — nó FE próprio ou emenda deste BRIEF.
2. **Par FE do ITEM-DESTINATION** (A-6 daquele BRIEF): seletor `Insumo do serviço` + tela de defaults por
   produto — **sem nó no vault**.
3. **Retificação versionada (C8 PR-4, ECD substituta + dispensa da ECF retificadora):** grep `retificad` no FE
   vazio — sem tela. Sem nó FE.
4. O BE não valida **natureza** das contas da classe (custo 1.2.x / acumulada 1.2.9.x) nem da contrapartida —
   só `acceptsEntries`. A tela não inventa o filtro.
5. `NfePanel` não exibe `custo.warnings` do preview (o warning do CFOP 1551 mapeado como produto fica
   invisível) — pertence ao par FE do ITEM-DESTINATION.
