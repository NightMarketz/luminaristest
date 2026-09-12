# BRIEF — FE-INCR-LALUR (cadastro de ajustes da Parte A + contas da Parte B do e-Lalur/e-Lacs, aba Compliance)

> **Estado [FOLD 2026-09-12, mesma sessão]: os 4 forks RATIFICADOS** — dono, em sessão, 2026-09-12, por questionário (AskUserQuestion), na opção recomendada: F-FE-1→(a) endpoint `GET /api/lalur/catalog`, F-FE-2→(a) `<table>`+Modal, F-FE-3→(a) combobox, F-FE-4→(a) cadastro agora / M410+fechamento+diagnóstico em 2º PR após o 3C. **Implementação segue exigindo autorização própria** (ORCH-006).
>
> Produzido por **sessão de planejamento** (2026-09-12). Não contém código de aplicação. Os forks nasceram PENDENTES e foram ratificados no questionário da mesma sessão.

## Cabeçalho

- **Item a planejar:** tela de cadastro para o que o `BE-INCR-SPED-ECF-FASE3B` (PR #313, `main` `197cc9fc`)
  expõe em `/api/lalur` — ajustes da Parte A (`LalurEntry`: `M300/M350` + linhas `E` de `N500/N630/N670`) e
  contas da Parte B (`LalurParteBAccount`: `M010`) — na **aba Compliance** de `AccountingView`, ao lado de
  `CompliancePanel` (referencial) e `SpedGenerationPanel` (que já contém `SpedEcfRealPanel`, o botão de gerar
  a ECF Real). O master map §5.1 item 10 (EMENDA 2026-09-12) e o BRIEF 3B listam `FE-INCR-LALUR` como
  "incremento separado"; a memória `frontend-deferred-strategy` classifica tela faltante como dívida planejada.
- **Autorização (ORCH-006):** dono, em sessão, 2026-09-12: *"PASSO 3 — BRIEF FE-INCR-LALUR (sessao-planejamento,
  separado). Tela de cadastro de ajustes + contas da Parte B na aba Compliance, reusando GenericTable/Modal
  canônicos; contrato = LalurDto.ts; forks de UX (seleção do código pelo catálogo ecf-l12-linhas.json com
  busca; indRelacao condicional; date-only sem UTC-shift)"*. Cobre **planejar**; não cobre implementar nem
  ratificar fork.
- **Contrato (fato consumado):** `server/src/features/accounting/dtos/LalurDto.ts` — `CreateLalurEntrySchema`
  (`unitId, year, quarter, livro, codigo, valorCents, histLancamento?, indRelacao?, parteBId?, accountId?`,
  `.strict()`, `superRefine` = REGRA_RELACAO_INEXISTENTE + D-M3), `UpdateLalurEntrySchema` (patch; `year/
  quarter/livro/codigo` imutáveis — "arquive e recrie"), `ArchiveLalurSchema`, `ListLalurEntriesQuerySchema`
  (`includeArchived` via `queryBoolean`), `CreateLalurParteBAccountSchema` (`codCtaB, descricao, dtCriacao
  (date-only), codPbRfb, dtLimite?, codTributo I|C, saldoIniCents, indSaldoIni D|C, cnpjSitEsp?`),
  `UpdateLalurParteBAccountSchema` (`codCtaB/codTributo` imutáveis). Rotas: `GET/POST /api/lalur/entries`,
  `PATCH /entries/:id`, `POST /entries/:id/archive`, idem `/parte-b`. Policy `canReadLalur`/`canManageLalur`.
- **Fatos verificados nesta sessão:**
  1. **Não existe endpoint do catálogo.** `ecf-l12-linhas.json` (263 KB) vive em `server/src/features/
     accounting/fixtures/` e só é lido pelo `LalurService.resolveLinha`/`findParteBPadrao`. O FE não importa
     nada de `server/` (grep vazio) e copiar o JSON viola o critério de reuso (mesmo objeto, dois donos ⇒
     drift). ⇒ Fork **F-FE-1** (fonte do catálogo) — a tela **depende de 1 toque no BE**.
  2. **`GenericTable` é o canônico do DynamicTable**, não de tabela Prisma first-class: exige `ITableSchema`,
     `tableId` (localStorage), `relationLookups` e edição inline via `useGenericData`
     (`features/dashboard/category-views/shared/components/GenericTable.tsx:53-78`). **Todos** os painéis
     CRUD da contabilidade (`CounterpartiesPanel.tsx:163`, `DimensionsPanel.tsx:369`, AP/AR) usam `<table>`
     + `Modal` (`components/ui/Modal`) — divergência de **shape** já sancionada pelo critério de reuso
     (memória `accounting-rc-ap-ar-sanction`). ⇒ Fork **F-FE-2**.
  3. **Date-only:** `features/accounting/lib/formatDate.ts` já tem `scopeToday()` (fuso do escopo, `en-CA`)
     e `formatDate(iso)` (local midnight); `CreatePayableModal.tsx:55` usa `<input type="date">` com
     `scopeToday` — **é o precedente**; nenhum `toISOString()` novo (memória `fe-dateonly-utc-shift-sweep`,
     GAP-MAP nº 5).
  4. `useAccountingT()` = namespace `accounting` (`public/locales/{pt,en}/accounting.json`, paridade pt/en é
     gate do `skill-audit wiring`). `SpedGenerationPanel` exporta os estilos de input reusados pelo
     `SpedEcfRealPanel` (Fork F-COMP2-1 → b) — mesmo caminho para os formulários daqui.
  5. `accounting.service.ts:724` `getAccounts(unitId)` já devolve o plano (para o select de `accountId`,
     por **id**, não código — footgun registrado em `accounting-fe-incr-ap`).
- **Nós vizinhos:** `BE-INCR-SPED-ECF-FASE3C-parte-b` (BRIEF irmão): se o Fork N-1 (a) for ratificado, esta
  tela ganha **M410 (movimentos)**, **"fechar trimestre"** e o **diagnóstico de saldos** — listados aqui como
  `[cond:3C]`, não planejados em detalhe até o 3C ter fork ratificado · `SpedEcfRealPanel` (gera; o erro 400
  da geração — linha encerrada, conta soft-deletada, REGRA_DT_AP_ZERO — deve ser legível na tela) ·
  H1 2ª passada (2P-2/2P-3 podem ser cumpridos **pela tela** em vez de curl, se ela existir antes).

## Definição de pronto

Aba Compliance com a seção **"e-Lalur / e-Lacs"** entre `CompliancePanel` e `SpedGenerationPanel`: lista +
criar + editar + arquivar de contas da Parte B e de ajustes da Parte A, filtros por exercício/trimestre/livro,
erros do BE exibidos por `resolveError`, i18n pt/en, testes vitest (shim `globalThis.React`), `tsc` limpo,
**verificado contra build de produção** (tela atrás de `withAuth`), sign-off de browser = humano.

## 1. Checklist de comportamentos

### Estrutura

1. **[direto]** `features/accounting/components/LalurPanel.tsx` montado em `AccountingView.tsx` no bloco
   `activeTab === 'compliance'` (entre os dois painéis existentes, `space-y-8`); `section` `rounded-2xl
   border-neutral-800 bg-neutral-900/50 p-5`, título `t('lalur.title', 'e-Lalur / e-Lacs')`, subtítulo
   citando "Parte A (M300/M350) · Parte B (M010)". Sem `zinc-*`. Testável: render com `unitId` mostra as
   duas sub-seções e o empty-state.
2. **[direto]** `lib/services/lalur.service.ts` (`frontend-api-service-generator`): `listEntries`, `createEntry`,
   `updateEntry`, `archiveEntry`, `listParteB`, `createParteB`, `updateParteB`, `archiveParteB`
   (+ `getCatalog` — Fork F-FE-1), tipos espelhando `LalurDto.ts` **à mão** (não há geração de tipos a partir
   do OpenAPI — precedente `sped.service.ts`). Query `includeArchived` sempre como `'true'`/omitido, nunca
   `'false'` (contrato "nunca `overdue=false`" do `SubledgerFilterBar`).
3. **[direto]** Filtros da Parte A: exercício (select, default = ano de `scopeToday()` — **nunca**
   `new Date().getFullYear()` em UTC), trimestre (todos/T01..T04), livro (todos/lalur/lacs/n500/n630/n670),
   "mostrar arquivados". Parte B: tributo (todos/I/C), "mostrar arquivados". Refetch por `useCallback` +
   `useEffect` (padrão `CounterpartiesPanel`).

### Parte B — contas (M010)

4. **[direto]** Tabela: `codCtaB`, `descricao`, `codTributo`, `codPbRfb` + descrição do padrão (do catálogo,
   F-FE-1), `dtCriacao` (`formatDate`), `dtLimite`, saldo inicial (`formatCents` + `D/C`), ações
   editar/arquivar (`FiArchive`, confirmação em `Modal`). Arquivada: linha esmaecida + badge "arquivada";
   o `codCtaB` chega reescrito como `deleted:<id>:<v>` (rename-on-key D-M2) — quem faz o strip é achado
   fora de escopo (§6 item 1), não decisão desta tela.
5. **[direto]** Modal criar/editar (`CreateLalurParteBModal`): `codCtaB` (texto, imutável na edição),
   `descricao`, `codTributo` (radio I/C, imutável na edição), `codPbRfb` (**busca no catálogo PARTEB_PADRAO
   filtrado pelo tributo** — Fork F-FE-3 decide o widget), `dtCriacao` (`<input type="date">`, default
   `scopeToday()`; hint "data FINAL do período em que a conta nasceu"), `dtLimite` opcional, `saldoIniCents`
   (`parseBrl` — footgun 100× registrado, teste do valor `1.234,56` ⇒ `123456`), `indSaldoIni` (D/C com
   legenda p.237: D = prejuízo/valor que reduz o lucro real), `cnpjSitEsp` (14 dígitos, máscara). Regra visível:
   se `dtCriacao` cai no exercício selecionado, saldo inicial fica **0 e desabilitado** (`REGRA_DT_AP_ZERO`) —
   o BE já rejeita na geração (I-3); a tela evita o 400 tardio. Testável: submit chama o service com o body
   exato do `CreateLalurParteBAccountSchema`; `codCtaB` com `|` bloqueado no FE (item 17 do 3C) com mensagem.

### Parte A — ajustes (M300/M350 + linhas E do N)

6. **[direto]** Tabela: trimestre, livro, `codigo` + descrição do catálogo, tipo (A/E/P/L — do catálogo, só
   lalur/lacs), `indRelacao` (legenda 1..4), Parte B (`codCtaB`) / conta (`code — name`), valor
   (`formatCents`), histórico truncado, ações. Ordenação = a do BE (trimestre, livro, código).
7. **[cond:F-FE-3]** Modal criar (`LalurEntryModal`): exercício/trimestre (pré-preenchidos do filtro), livro
   (select 5), **código pelo catálogo com busca** (Fork F-FE-3): lista só linhas `E` **vigentes no exercício**
   para a aba do livro (`LIVRO_ABA`), mostrando código + descrição + TIPO; código digitado fora do catálogo ⇒
   erro inline (o BE devolve 400 com código e motivo — item 9 do 3B — a tela também mostra).
8. **[direto]** **`indRelacao` condicional** (D-M3 + REGRA_RELACAO_INEXISTENTE): campo só aparece para
   `livro ∈ {lalur, lacs}`; `1` ⇒ select de conta da Parte B (filtrado pelo **tributo do livro**: lalur→I,
   lacs→C — o BE rejeita cruzado) e conta contábil escondida; `2` ⇒ select de conta contábil (`getAccounts`,
   valor = **id**), Parte B escondida; `3` ⇒ ambos; `4` ⇒ nenhum e `histLancamento` **obrigatório** (asterisco
   + validação antes do submit). Livro N ⇒ nenhum dos quatro campos é renderizado (não só desabilitado — o
   `.strict()` do BE rejeita chave presente). Tipo `P` (compensação) ⇒ `indRelacao` travado em `1`
   (REGRA_IND_RELACAO p.247 — o catálogo diz o tipo). Testável: matriz 4×2 (indRelacao × livro) de campos
   visíveis; body enviado não contém chave indevida.
9. **[direto]** Editar: só `valorCents`, `histLancamento`, `indRelacao`, `parteBId`, `accountId` (o
   `UpdateLalurEntrySchema`); `year/quarter/livro/codigo` exibidos read-only com o texto "arquive e recrie".
   `null` explícito para limpar Parte B/conta (o DTO aceita `nullable`).
10. **[direto]** Arquivar: confirmação; conta da Parte B com ajustes vivos ⇒ o BE devolve 400 "arquive os
    ajustes relacionados antes" — a tela mostra e oferece o filtro `parteBId` (link para a sub-seção A).
11. **[direto]** Erros do BE: `resolveError` (400 com `code` + mensagem citando o Manual/página — mostrar
    íntegra); 403 (`canManageLalur`) esconde botões de escrita como o `CompliancePanel` faz com o import
    (Fork F-COMP2-3 → a). Testável: 403 ⇒ sem botão "Novo".

### Ligações com a geração e com o 3C

12. **[direto]** Contadores na cabeça da seção: "N ajustes · M contas da Parte B no exercício" e link
    "Gerar ECF Real ↓" (scroll para `SpedEcfRealPanel`). O erro 400 da geração (linha encerrada no ano,
    conta soft-deletada, DT_AP_ZERO) já é exibido pelo `SpedEcfRealPanel` — não duplicar.
13. **[cond:3C Fork N-1 (a)]** Sub-seção **Movimentos da Parte B (M410)** + botão **"Fechar trimestre"**
    (com confirmação e estado fechado/aberto por T01..T04) + tabela de **diagnóstico de saldos** (materializado
    × recomputado, divergências em vermelho). Planejar em detalhe só depois do 3C ratificado — listado para
    que a tela nasça com o slot (não para implementar agora).
14. **[direto]** i18n: chaves `lalur.*` em `pt` e `en` no mesmo PR (paridade = gate); testes vitest com
    `globalThis.React` no arquivo de teste (memória `vitest-render-needs-react-global`); nenhum `waitFor
    (toHaveBeenCalled)` sobre handler async sem loader em macrotask (memória do flake, PR #300).
15. **[direto]** Verificação: `cd my-app && npx tsc --noEmit`, `npm run build` (withAuth), exercitar no browser
    contra cópia do `dev.db` real com o server do commit exato (memória `stale-dev-server-serves-old-code`).
    Sign-off de browser = humano (RUNBOOK-H1 §2ª passada 2P-2/2P-3 podem ser cumpridos pela tela).

## 2. Contratos esboçados

### 2.1 Service FE (`lib/services/lalur.service.ts`)

```ts
type Livro = 'lalur'|'lacs'|'n500'|'n630'|'n670'; type Quarter = 'T01'|'T02'|'T03'|'T04';
interface LalurEntry { id; year; quarter: Quarter; livro: Livro; codigo; valorCents: number; histLancamento?: string|null;
  indRelacao?: '1'|'2'|'3'|'4'|null; parteBId?: string|null; accountId?: string|null; deletedAt?: string|null }
interface LalurParteBAccount { id; codCtaB; descricao; dtCriacao: string /* YYYY-MM-DD */; codPbRfb; dtLimite?: string|null;
  codTributo: 'I'|'C'; saldoIniCents: number; indSaldoIni: 'D'|'C'; cnpjSitEsp?: string|null; deletedAt?: string|null }
listEntries(unitId, { year?, quarter?, livro?, includeArchived? }) → LalurEntry[]
createEntry(body: CreateLalurEntryInput) / updateEntry(id, body) / archiveEntry(id, { unitId })
listParteB(unitId, { codTributo?, includeArchived? }) / createParteB / updateParteB / archiveParteB
getCatalog(livro | 'PARTEB_PADRAO', { year, q? }) → CatalogRow[]      // Fork F-FE-1 (a)
```
Os `body` espelham `LalurDto.ts` campo a campo; `saldoIniCents`/`valorCents` são **inteiros em centavos**
(BigInt no BE serializado como number ≤ MAX_CENTS).

### 2.2 Endpoint do catálogo (Fork F-FE-1 (a) — 1 toque no BE, `GET /api/lalur/catalog`)

```ts
query: { livro?: Livro; aba?: 'PARTEB_PADRAO'; year: int; q?: string (≥2 chars); tributo?: 'I'|'C' }
→ { rows: Array<{ codigo, descricao, tipo: 'E', tipoLanc?: 'A'|'E'|'P'|'L', vigencia?: {de, ate} }> }   // linhas E vigentes no ano
   | { rows: Array<{ codigo, descricao, tributo: 'I'|'C'|'A' }> }                                     // PARTEB_PADRAO
```
Policy `canReadLalur`; sem tenancy (catálogo global); path-count 166→167 (ou 170→171 se depois do 3C);
`docs.paths.ts`; snapshot de shape do DTO de query.

## 3. Forks — **RATIFICADOS 2026-09-12 (4/4 na opção (a))**

### Fork F-FE-1 — Fonte do catálogo L12 para a tela

| Perna | O que faz | O que deixa aberto |
|---|---|---|
| **(a) Endpoint `GET /api/lalur/catalog` (read-only, filtro por livro/ano/tributo/busca) — RECOMENDADA** | Um dono do dado (o fixture do BE, já validado por `lalurCatalog.test.ts`); a busca roda no BE ou no FE sobre a resposta filtrada por livro (≤ 374 linhas); Leiaute 13 entra num lugar só | +1 rota (toque BE dentro de um `FE-INCR-*` — a casa separa BE/FE; aqui é a exceção do mesmo tipo do CASH-FORECAST) |
| (b) Copiar `ecf-l12-linhas.json` para `my-app` | Zero toque no BE | 263 KB no bundle; duas cópias do mesmo objeto ⇒ drift na próxima versão das Tabelas Dinâmicas (critério de reuso, Etapa 1) |
| (c) `<input>` livre com validação só no BE | Zero código de catálogo | Usuário digita código de 3 dígitos de cor; erro só no submit; contraria o pedido ("seleção pelo catálogo com busca") |

**Recomendação: (a).** **RATIFICADO → (a), 2026-09-12 (questionário).**

### Fork F-FE-2 — Tabela: `GenericTable` (canônico DynamicTable) ou `<table>` + `Modal` (precedente contábil)

| Perna | O que faz | O que deixa aberto |
|---|---|---|
| **(a) `<table>` + `components/ui/Modal`, espelhando `CounterpartiesPanel`/`DimensionsPanel` — RECOMENDADA** | Mesmo shape dos 6 painéis CRUD da contabilidade; divergência de shape já sancionada (AP×AR RC); sem `ITableSchema` sintético | Não herda resize/visibilidade de coluna do `GenericTable` (nenhum painel contábil tem) |
| (b) `GenericTable` com `ITableSchema` sintético e `useGenericData` adaptado | Reuso literal do canônico do §0 | `GenericTable` edita inline via DynamicTable (`onEditSuccess`, `tableId` localStorage, `relationLookups`) — seria adaptador sobre adaptador; anti-padrão que o `skill-audit` mede como clone `SIMILAR_TO` |

**Recomendação: (a)** — o pedido diz "GenericTable/Modal canônicos"; o `Modal` é reusado literalmente, a
tabela segue o **canônico da contabilidade** (que não é o `GenericTable`), pelo critério de reuso Etapa 1
(objeto de domínio diferente: linha Prisma first-class ≠ registro DynamicTable). **RATIFICADO → (a), 2026-09-12 (questionário).**

### Fork F-FE-3 — Widget de seleção do código (M300A/M350A/N…/PARTEB_PADRAO)

| Perna | O que faz | O que deixa aberto |
|---|---|---|
| **(a) Combobox com busca por código OU descrição (≥2 chars), lista virtualizada não necessária (≤ 374 itens), mostra `codigo · descrição · TIPO`, teclado ↑↓⏎, `aria-*` — RECOMENDADA** | Cobre "com busca"; reusa o padrão de select-com-busca existente se houver (`loadProductOptions.ts` é o precedente de options carregadas — verificar na feature) | Componente novo (`CatalogCombobox`) — 1 arquivo; dependência: F-FE-1 (a) |
| (b) `<select>` nativo com 374 `<option>` | Zero componente | Sem busca por descrição; inutilizável no M300A (374 linhas com descrições longas) |
| (c) `<input list>` + `<datalist>` | Nativo, com filtro | Sem descrição visível após seleção, sem TIPO, comportamento inconsistente entre browsers |

**Recomendação: (a).** **RATIFICADO → (a), 2026-09-12 (questionário).**

### Fork F-FE-4 — Onde a Parte B mostra o saldo por período (dependente do 3C)

| Perna | O que faz |
|---|---|
| **(a) Esperar o 3C: a tela nasce com contas + ajustes; movimentos/fechamento/diagnóstico entram como 2º PR desta mesma frente quando o Fork N-1 for ratificado — RECOMENDADA** | Não bloqueia o cadastro (2P-2/2P-3 do H1 2ª passada precisam **só** de ajuste + conta) |
| (b) Empacotar M410 + fechamento + diagnóstico já neste BRIEF | Planeja sobre contrato que ainda não existe (item 13 aberto) — violaria regra 3 |

**Recomendação: (a).** **RATIFICADO → (a), 2026-09-12 (questionário).**

## 4. Pendências de validação externa

- Nenhuma de leiaute (a tela não interpreta o Manual; o BE já valida). Sign-off de browser e H1 2ª passada
  (PVA) são gates humanos — `RUNBOOK-H1-PVA.md` §2ª passada.

## 5. Insumos ausentes

- **Endpoint do catálogo** (Fork F-FE-1) — o único bloqueio real da tela: sem ele, não há "seleção pelo
  catálogo". Decidir antes da `sessao-feature`.

## 6. Achados fora de escopo

1. **Rename-on-key vaza para a UI:** um registro arquivado tem `codigo`/`codCtaB` reescrito como
   `deleted:<id>:<v>` (D-M2). A tela com "mostrar arquivados" veria o prefixo. Opções (não decididas aqui):
   BE devolve `codigoOriginal` derivado (strip do prefixo) no `toResponse`, ou a tela faz o strip. É
   comportamento do `Counterparty` também (precedente SEC-A1-4) — classe, não só daqui.
2. **`year=2026` falha na geração** até o Leiaute 13 (Fork 7→a) — a tela deve mostrar a mensagem do BE, não
   esconder o exercício.
3. **`FE-INCR-NFE`** (F-I4) segue aberto e independente — NF-e tem aba própria; sem colisão de ponto de
   inserção com este.

## 7. Divergência de autorização

- O pedido diz "reusando GenericTable/Modal canônicos". Verificado: `GenericTable` é o canônico **do
  DynamicTable** e nenhum painel contábil o usa; registrado como Fork F-FE-2 com recomendação de seguir o
  canônico **da contabilidade** — o dono decide, não esta sessão.
- O pedido diz "seleção do código pelo catálogo … com busca" e o catálogo **não é servido** ao FE hoje —
  Fork F-FE-1 com um toque no BE dentro de um `FE-INCR`; se o dono preferir, vira `BE-INCR-LALUR-CATALOG`
  próprio (P, 1 rota).
