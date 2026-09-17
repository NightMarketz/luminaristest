# BRIEF — FE-INCR-BANK-SETTLEMENT (tela da baixa por retorno bancário — nó F7, crescimento)

> **Estado: BRIEF pronto, forks F-FE-BS-1..4 em RATIFICAÇÃO PENDENTE.** Produzido por `sessao-planejamento`
> em 2026-09-17 contra `origin/main` **`85378005`** (#343), item 2 de `PLANO-SESSAO-2026-09-17-pontas-nao-codigo.md`
> (Fork F-PS-1 → a ratificado 17/09: BRIEF é planejamento, não código). Não contém código de aplicação.
> **Implementação exige "executa" próprio do dono** (ORCH-006) e forks ratificados.

## Cabeçalho

- **Item a planejar:** tela para o que `BE-INCR-BANK-SETTLEMENT` (nó F7, PR #326 `22b97252`) expõe em
  `/api/bank-settlements` — varrer um extrato, ver os itens de baixa propostos, **confirmar** (único comando
  com efeito financeiro, resposta 20 da cédula 10/09), rejeitar, reprocessar `FAILED`/`CONFIRMING` preso.
  Nomeado em `PROXIMOS-PASSOS-2026-09-17.md` passo 7 e no grafo 09-14 §4.2 ("crescimento do F7").
- **Autorização (ORCH-006):** dono, em sessão, 2026-09-17: *"Pode planejar em 1 única sessão para fechar as
  pontas que não são implementação de código"* + ratificação dos 5 forks do plano (*"Vai na recomendação dos
  5 e abre a sessão"*, F-PS-1 → a). Cobre **planejar**; não cobre implementar nem ratificar fork.
- **Contrato (fato consumado — transcrito, não parafraseado):** `server/src/features/accounting/dtos/BankSettlementDto.ts`
  (todos `.strict()`, chave extra = 400):

  ```ts
  ScanBankSettlementsSchema    = { unitId, statementId }                                   // POST /api/bank-settlements/scan
  ConfirmBankSettlementSchema  = { unitId, method: z.enum(PAYMENT_METHODS) }               // POST /api/bank-settlements/:id/confirm
  RejectBankSettlementSchema   = { unitId, reason: string(1..500) }                        // POST /api/bank-settlements/:id/reject
  RetryBankSettlementSchema    = { unitId, method: z.enum(PAYMENT_METHODS) }               // POST /api/bank-settlements/:id/retry
  ListBankSettlementsQuerySchema = { unitId, statementId?, status?: BANK_SETTLEMENT_STATUSES, page=1, limit=20 (≤100) }  // GET /api/bank-settlements
  ```
  Constantes (`models/BankSettlement.model.ts`): `BANK_SETTLEMENT_STATUSES = PENDING | CONFIRMING | CONFIRMED |
  REJECTED | FAILED | STALE`; `BANK_SETTLEMENT_STEPS = SETTLE | CHARGE | MATCH` (`failedStep`);
  `BANK_SETTLEMENT_TITLE_TYPES = PAYABLE | RECEIVABLE`; `BANK_SETTLEMENT_CHARGE_CAP_BP = 2000`;
  `BANK_SETTLEMENT_CONFIRMING_STALE_MS = 10 min`. `PAYMENT_METHODS` = chaves de `PAYMENT_METHOD_ACCOUNTS`
  (`Payable.model.ts:110`) — o FE já as tipa em `accountsPayable.service.ts:22-25` (`'Cash'|'Pix'|'TED'|'Boleto'`).
  Rotas: `routes/bankSettlements.ts` (mount `/api/bank-settlements`; `docs.paths.ts:4079-4189`).
  Policy: `canReadBankSettlement = canRead ∧ canReconcile`; `canManageBankSettlement(titleType) = canReconcile ∧
  (canManagePayable | canManageReceivable)` (`AccountingPolicy.ts:116-123`).
  **Resposta de `GET /`** (`BankSettlementService.ts:46-64`, `list` devolve `{ items, total, page, limit }`):

  ```ts
  BankSettlementItemView = { id, origin: 'STATEMENT_LINE'|'CNAB_RETURN', status, titleType, titleId,
    proposedCents: number, chargeCents: number,
    line: { id, date: 'YYYY-MM-DD', amountCents, description, externalRef: string|null },
    title: { openCents, dueDate: 'YYYY-MM-DD', counterpartyName, status } | null,   // saldo RECALCULADO na leitura
    settlementId: string|null, chargeEntryId: string|null, reason: string|null, failedStep: string|null,
    confirmedAt: ISO|null }
  ScanSummary = { created, skippedExisting, ambiguous, none, stale }                  // resposta do /scan
  ```
- **Fatos verificados nesta sessão (grep/Read):**
  1. **Não existe serviço FE nem componente** para `/api/bank-settlements` (`grep -rn "bank-settlements" my-app` = 0).
     `accounting.service.ts` (1039 l.) cobre `reconciliation/*` (statements, lines, matches, pending) — o serviço
     novo entra ao lado (`bankSettlement.service.ts`), não dentro (arquivo já grande; um dono por recurso, precedente
     `lalur.service.ts`/`dataExchange.service.ts`).
  2. **`ReconciliationPanel.tsx:855-935`** já é um host de **sub-abas** (`SubTab = 'extratos' | 'pendentes'`, seletor
     de conta bancária `glAccountId` compartilhado, `SUBTABS[]` com `labelKey`). A sub-aba "Extratos" lista
     `BankStatement[]` com `id` — é de lá que sai o `statementId` do `/scan`. ⇒ Fork **F-FE-BS-1** (sub-aba × aba).
  3. **Canônicos de shape** (mesma sanção de `FE-INCR-LALUR` F-FE-2 e `accounting-rc-ap-ar-sanction`): `<table>` +
     `components/ui/Modal` + `StandardPagination` (`currentPage,totalPages,totalItems,itemsPerPage,onPageChange` —
     `features/dashboard/shared/components/StandardPagination.tsx:7-12`; a query do BE já é `page/limit`).
     `formatCents`, `formatDate` (date-only sem UTC-shift — `line.date`/`title.dueDate` chegam `YYYY-MM-DD`),
     `resolveErrorWithCode` (`lib/resolveError.ts:23` — devolve `code` quando o BE manda), `useAccountingT`.
  4. **Modal de ação com motivo** já existe como precedente: `EntryApprovalsPanel.tsx:179-375` (`action.type =
     'reject'`, `reason` em `useState`, tema vermelho/verde) e `AccountsPayablePanel.tsx:245,538-541` (select de
     `method` com `PaymentMethod`, default `'Pix'`). Reusar a forma, não o componente (objeto de domínio diferente).
  5. **Erros nomeados do `confirm`** (`BankSettlementService.ts:400-466`) chegam como `ValidationError` com prefixo
     `snake_case:` na mensagem — `line_not_unmatched`, `statement_inactive`, `settlement_orphan_suspected`,
     `title_not_open`, `period_not_open`, `method_account_mismatch`, `charge_account_not_configured`,
     `settlement_entry_missing`, `bank_leg_missing`. O **encargo** (`chargeCents > 0`) sem conta configurada devolve
     `charge_account_not_configured: … (PUT /api/accounting/settings — códigos são pendência do contador)` — a tela
     **mostra**, não inventa conta (BRIEF F7 §5 item 1; pedido ao contador #331 item 6).
  6. `retry` só de `FAILED` ou `CONFIRMING` mais velho que 10 min (`:280`); `reject`/`confirm` só de `PENDING` (`:246,267`,
     CAS — 2ª chamada = 400 "Item não está PENDING"). `STALE` é terminal (título cancelado após o scan; o scan
     seguinte pode fazer nascer item novo `PENDING` — teste `:289-337`).
- **Nós vizinhos:** consome F7 (BE, ✅) e a sub-aba "Extratos" (FE-INCR-7, lista de `BankStatement`). É vizinho de
  **"Fila pendente"** (`reconcile_pending_items`, nó C7): tabela **irmã**, não a mesma — R9 proíbe misturar; a tela
  **não** reaproveita `ReconciliationMatchModal` nem `PendingReport`. `AccountingScopeSettings`
  (`GET/PUT /api/accounting/settings`) é onde vive `bankChargeExpenseAccountId/bankChargeIncomeAccountId` — não há
  tela para ele hoje (achado §6).

## Definição de pronto

Sub-aba (ou aba — F-FE-BS-1) **"Baixas por retorno"** que, para o extrato escolhido: dispara `/scan` e mostra o
`ScanSummary`; lista os itens paginados com filtro por `status`; por item **confirma** (com `method`), **rejeita**
(com `reason`) e **reprocessa** (`retry`) segundo o estado; exibe encargo e a diferença linha × saldo; erros do BE
legíveis (inclusive o 400 nomeado do encargo, com link "Configurações"); i18n pt/en; vitest com shim `globalThis.React`;
`tsc` limpo; **verificado contra build de produção** (tela atrás de `withAuth`); sign-off de browser = humano.

## 1. Checklist de comportamentos

### Estrutura e serviço

1. **[direto]** `lib/services/bankSettlement.service.ts` (`frontend-api-service-generator`): `list(unitId, { statementId?,
   status?, page, limit })`, `scan(unitId, statementId)`, `confirm(id, { unitId, method })`, `reject(id, { unitId,
   reason })`, `retry(id, { unitId, method })`; tipos `BankSettlementItemView`, `ScanSummary`, `BankSettlementStatus`
   espelhando o BE **à mão** (precedente `sped.service.ts`). `PaymentMethod` **importado** de
   `accountsPayable.service.ts` (mesmo alfabeto, um enum só — comentário do DTO). Testável: cada método monta URL
   e body exatos (`?unitId=&statementId=&status=&page=&limit=`; body sem chave extra — o BE é `.strict()`).
2. **[F-FE-BS-1]** `features/accounting/components/BankSettlementPanel.tsx` montado como **3ª sub-aba** de
   `ReconciliationPanel` (`SubTab = 'extratos' | 'pendentes' | 'baixas'`, `labelKey 'reconciliation.subtabs.settlements'`),
   recebendo `unitId`, `glAccountId` (conta do seletor compartilhado) e `onLedgerChange` (o `confirm` posta
   lançamentos → refetch do balancete, padrão D5/W1 já usado pelo match). `section rounded-2xl border-neutral-800
   bg-neutral-900/50 p-5`; sem `zinc-*`. Testável: render com `sub='baixas'` mostra o seletor de extrato e o empty-state.
3. **[direto]** Seletor de extrato: `<select>` alimentado por `accountingService.listBankStatements(unitId, page, limit)`
   (o mesmo fetch da sub-aba "Extratos", `accounting.service.ts:909`; **não filtra por conta** — a tela filtra
   `glAccountId` do seletor compartilhado no cliente), mostrando `statementRef ?? id · periodStart–periodEnd`
   (`formatDate`, date-only); default = extrato mais recente (a lista já vem newest-first). Sem extrato ⇒ CTA "Importe um extrato na sub-aba Extratos". Testável: troca de extrato refaz
   o `list` com `statementId` novo e volta à página 1.

### Varredura

4. **[direto]** Botão **"Varrer extrato"** → `POST /scan { unitId, statementId }` → banner com o `ScanSummary`
   (`created · skippedExisting · ambiguous · none · stale`, cada número com legenda i18n: "ambíguo = mais de um título
   cabe na janela; concilie à mão na Fila pendente"). Loader em macrotask (memória `handler-async-closure-stale-x-waitfor`:
   `Promise.all` no handler, teste espera o banner, não o `toHaveBeenCalled`). Após o scan, refetch da lista.
   Testável: summary renderizado com os 5 números; erro 404 "Extrato não encontrado" via `resolveError`.
5. **[direto]** Scan é idempotente no BE (`skippedExisting`) — a tela **não** desabilita o botão após o 1º uso; mostra
   o último summary com timestamp local.

### Lista

6. **[direto]** Tabela paginada (`StandardPagination`, `limit=20`) com colunas: data da linha (`formatDate`), descrição +
   `externalRef`, valor da linha (`formatCents`, sinal → badge "pagamento"/"recebimento" derivado de `titleType`),
   título (`title.counterpartyName` · vence `formatDate(dueDate)` · saldo aberto `formatCents(openCents)` — ou "título
   indisponível" se `title === null`), **proposto** (`proposedCents`), **encargo** (`chargeCents`, badge âmbar se > 0,
   tooltip "|linha| − saldo, cap 20 % — `BANK_SETTLEMENT_CHARGE_CAP_BP`"), `status` (badge por cor: PENDING neutro ·
   CONFIRMING âmbar · CONFIRMED verde · REJECTED cinza · FAILED vermelho · STALE cinza tachado), ações (item 8–10).
   Filtro `status` (select, default = **todos**; opção "só PENDING" é o 2º clique mais comum — F-FE-BS-3 decide o
   default). Testável: fixture com 6 itens (um por status) renderiza 6 badges distintos e as ações certas por linha.
7. **[direto]** Linha `FAILED` mostra `failedStep` (SETTLE/CHARGE/MATCH) + `reason` **íntegro** (é a mensagem nomeada
   do BE); linha `REJECTED` mostra `reason` do humano; linha `CONFIRMED` mostra `confirmedAt` (`toLocaleString` — é
   timestamp, não date-only) e links "lançamento" (`settlementId`) / "encargo" (`chargeEntryId`) que abrem a aba
   Lançamentos filtrada (mesmo mecanismo do `AgingPanel → painel-alvo`, `AccountingView.tsx:81-84`).

### Comandos (um item por vez — F-FE-BS-2)

8. **[F-FE-BS-2]** **Confirmar** (só `PENDING`): `Modal` com resumo (linha, título, proposto, encargo) + `select
   method` (`PAYMENT_METHODS`, default `'Pix'`, precedente AP `:245`) + aviso fixo "o método tem de resolver para a
   conta deste extrato" (`method_account_mismatch` é 400) → `POST /:id/confirm`. Sucesso ⇒ refetch + `onLedgerChange()`.
   Erro ⇒ mensagem do BE íntegra; se `resolveErrorWithCode(...).message` começa por `charge_account_not_configured`,
   renderiza também o link **"Configurar conta de encargo"** (scroll/aba de Configurações quando existir — hoje só
   texto com o path `PUT /api/accounting/settings`; achado §6.1). Testável: body `{ unitId, method }` exato; 400 com
   prefixo `charge_account_not_configured` mostra o link; 400 "Item não está PENDING" (CAS perdido) ⇒ refetch.
9. **[direto]** **Rejeitar** (só `PENDING`): `Modal` vermelho com `reason` obrigatório (1..500, contador de caracteres),
   precedente `EntryApprovalsPanel` reject. Testável: submit vazio bloqueado no FE; body `{ unitId, reason }`.
10. **[direto]** **Reprocessar** (`FAILED`, ou `CONFIRMING` **com mais de 10 min** — a tela calcula pelo `updatedAt`?
    **não há `updatedAt` na view** ⇒ a tela oferece `retry` para todo `CONFIRMING` e deixa o BE responder 400 "retry só
    de FAILED ou de CONFIRMING preso há mais de 10 min" — mostrado íntegro; ver achado §6.3): mesmo modal do confirm
    (pede `method` de novo — o DTO exige, "a etapa (i) pode não ter rodado"). Testável: `FAILED` mostra o botão; `PENDING`
    não; 400 do BE exibido.
11. **[direto]** `STALE`: sem ações; tooltip "título cancelado ou já baixado depois da varredura — varra de novo para
    reavaliar a linha". `CONFIRMED`/`REJECTED`: sem ações.

### Permissões, erros, i18n, verificação

12. **[direto]** 403 no `list` (`canReadBankSettlement`) ⇒ a sub-aba mostra o aviso e nada mais; 403 no comando
    (`canManageBankSettlement` por `titleType`) ⇒ mensagem íntegra ("…deste tipo") — **não** esconder botões por
    `user.role` (a policy é por tipo de título, invisível ao FE; precedente `CompliancePanel:378` esconde por ADMIN
    porque lá o gate é role). Testável: 403 no confirm mantém a linha e mostra o erro.
13. **[direto]** i18n: chaves `bankSettlement.*` em `public/locales/{pt,en}/accounting.json` no mesmo PR (paridade =
    gate do `skill-audit wiring`); status/steps traduzidos por mapa fechado (teste: todo valor de
    `BANK_SETTLEMENT_STATUSES` tem chave).
14. **[direto]** Testes vitest (`components/__tests__/BankSettlementPanel.test.tsx`) com `globalThis.React` no arquivo
    de teste; `vi.mock` do service com caminho **relativo ao teste** (memória `vi-mock-path-resolve-do-arquivo-de-teste`).
15. **[direto]** Verificação: `cd my-app && npx tsc --noEmit`, `npm run build` (withAuth), exercitar no browser contra
    cópia do `dev.db` real com o server do commit exato (`stale-dev-server-serves-old-code`) — o `dev.db` real tem
    `bank_settlement_items` vazia (F7 nunca rodou fora de teste) ⇒ o ensaio precisa de um extrato importado + AP aberto
    (fixture OFX do repo). Sign-off de browser = humano (`RUNBOOK-H2-BROWSER-SIGNOFF.md` ganha 1 linha — achado §6.4).

## 2. Contratos esboçados

### 2.1 Service FE (`lib/services/bankSettlement.service.ts`)

```ts
import type { PaymentMethod } from './accountsPayable.service';            // um enum só (DTO do BE reusa PAYMENT_METHODS)
export type BankSettlementStatus = 'PENDING'|'CONFIRMING'|'CONFIRMED'|'REJECTED'|'FAILED'|'STALE';
export type BankSettlementStep = 'SETTLE'|'CHARGE'|'MATCH';
export interface BankSettlementItemView { /* transcrito do cabeçalho — sem campo a mais */ }
export interface ScanSummary { created: number; skippedExisting: number; ambiguous: number; none: number; stale: number }
list(unitId, q: { statementId?: string; status?: BankSettlementStatus; page?: number; limit?: number })
  → { items: BankSettlementItemView[]; total: number; page: number; limit: number }
scan(unitId, statementId)                 → ScanSummary                       // POST /bank-settlements/scan
confirm(id, { unitId, method: PaymentMethod }) → BankSettlementItemView      // POST /bank-settlements/:id/confirm
reject(id, { unitId, reason: string })         → BankSettlementItemView      // POST /bank-settlements/:id/reject
retry(id, { unitId, method: PaymentMethod })   → BankSettlementItemView      // POST /bank-settlements/:id/retry
```
Base do `apiClient` já inclui `/api` (os demais services usam `'/accounting/…'`) ⇒ paths `'/bank-settlements…'`.
Valores em **centavos inteiros**; a tela só formata.

### 2.2 Estado da tela (esboço)

```ts
{ statementId: string; status: BankSettlementStatus | ''; page: number;
  items: BankSettlementItemView[]; total: number; summary: (ScanSummary & { at: Date }) | null;
  action: { type: 'confirm'|'reject'|'retry'; item: BankSettlementItemView } | null;
  method: PaymentMethod; reason: string; error: string | null; rowError: { id: string; message: string; code?: string } | null }
```

## 3. Forks — RATIFICAÇÃO PENDENTE

### Fork F-FE-BS-1 — Onde a tela vive

| Perna | O que faz | O que deixa aberto |
|---|---|---|
| **(a) 3ª sub-aba de `ReconciliationPanel` ("Baixas por retorno"), herdando o seletor de conta bancária — RECOMENDADA** | Extrato e baixa são o mesmo fluxo de trabalho (importar → varrer → confirmar); o `statementId` já está a um clique; zero aba nova em `TABS[]` (21 abas hoje) | A sub-aba "Fila pendente" (C7) fica visualmente ao lado da tabela irmã — R9 é regra de **código**, não de layout; o texto da sub-aba explica a diferença |
| (b) Aba própria `baixas` em `AccountingView.TABS` | Isola o F7 do C7 na navegação | 22ª aba; duplica o seletor de conta/extrato; o dono já vetou crescimento de abas para tela de nó existente (precedente: e-Lalur entrou como seção da Compliance) |

**Recomendação: (a).**

### Fork F-FE-BS-2 — Confirmar um a um × em lote

| Perna | O que faz | O que deixa aberto |
|---|---|---|
| **(a) Um item por vez, modal com `method` e resumo — RECOMENDADA** | Espelha o contrato (o BE só tem `POST /:id/confirm`); resposta 20 da cédula 10/09 é "humano confirma"; erro nomeado por item fica legível | Extrato com 50 baixas exatas = 50 cliques |
| (b) Seleção múltipla + "confirmar N" com um `method` para todos, loop sequencial no FE | Produtividade | N chamadas em série sem atomicidade; um 400 no meio deixa parcial (a tela teria de reportar item a item); `method` único pode não valer para todos (`method_account_mismatch`); é a classe de lote que o BE não sancionou |

**Recomendação: (a)** — lote vira crescimento do BE (`POST /confirm-batch`) quando houver volume medido, não antes.

### Fork F-FE-BS-3 — Default do filtro de status

| Perna | O que faz |
|---|---|
| **(a) Default `PENDING` (o que exige ação), com contador "N confirmados/rejeitados ocultos" e filtro para ver o resto — RECOMENDADA** | A tela existe para confirmar; o histórico é consulta |
| (b) Default "todos" | Mostra o resultado do scan inteiro, inclusive STALE/CONFIRMED |

**Recomendação: (a).**

### Fork F-FE-BS-4 — Encargo sem conta configurada: o que a tela faz **antes** do 400

| Perna | O que faz | O que deixa aberto |
|---|---|---|
| **(a) Deixa confirmar e mostra o 400 nomeado com link para Configurações — RECOMENDADA** | Sem efeito irreversível: o BE pré-checa a conta **antes** de postar (memória `efeito-irreversivel-antes-do-gate-autoritativo`; `BankSettlementService.ts:452-466` valida antes do `postEntry`); a tela não duplica a regra | Um clique "perdido" por item com encargo até o contador responder |
| (b) `GET /api/accounting/settings` no mount e desabilitar "Confirmar" nos itens com `chargeCents > 0` quando a conta do tipo estiver `null`, com o aviso | Evita o 400 | Regra duplicada no FE (fica stale se o BE mudar); mais uma chamada por mount; `canReadAccountingSettings` pode ser 403 para quem pode confirmar |

**Recomendação: (a)** — o dado do contador (#331 item 6) é a pendência real; a tela não a esconde.

## 4. Pendências de validação externa

- **Contas de encargo** (juros/multa pagos e recebidos) — BRIEF F7 §5 itens 1–2, pedido ao contador #331 item 6. Enquanto
  abertas: `confirm` com `chargeCents > 0` → 400 nomeado; a tela mostra e aponta o path de configuração. Nenhuma
  regra de domínio entra na tela.

## 5. Insumos ausentes

- Nenhum para planejar (contrato inteiro em `main`). Para **implementar**: a view não expõe `updatedAt` (item 10) —
  decidir na `sessao-feature` se o `retry` de `CONFIRMING` fica sempre visível (400 do BE explica) ou se o BE ganha
  `updatedAt` na view (1 campo, sem migração — crescimento do F7, precisa citação).

## 6. Achados fora de escopo (não planejar aqui)

1. **Tela de `AccountingScopeSettings`** (`GET/PUT /api/accounting/settings`: contas de encargo, e — com C8 — despesa
   de depreciação/ganho/perda). Não existe; o link do item 8 hoje só cita o path. Candidato a `FE-INCR-SETTINGS`
   (seção na aba Compliance ou Plano de Contas).
2. **N linhas ↔ 1 título** e **retorno CNAB de cobrança** — BRIEF F7 §6 itens 1 e 3; a tela nasce 1:1.
3. `BankSettlementItemView` sem `updatedAt`/`createdAt` — impede a tela de saber se `CONFIRMING` está "preso"; crescimento
   de 1 campo no BE.
4. `RUNBOOK-H2-BROWSER-SIGNOFF.md` não tem passo para baixas por retorno — ganha 1 linha (em branco) quando a tela existir.
5. `docs/accounting/README.md` e o grafo citam "parser CNAB 240 retorno ✅" corrigido em 14/09 — a tela deve dizer
   "extrato" (OFX/CNAB-E), nunca "retorno de cobrança".

## 7. Divergência de autorização

- O passo 7 do `PROXIMOS-PASSOS-2026-09-17` cita "reuse canônico: GenericTable/Modal/StandardPagination". Verificado
  (mesmo achado do FE-LALUR F-FE-2): `GenericTable` é o canônico do **DynamicTable**; nenhum painel contábil o usa. Este
  BRIEF segue o canônico **da contabilidade** (`<table>`+`Modal`+`StandardPagination`) sob a sanção já ratificada em
  12/09 — se o dono quiser reabrir, é fork novo, não decisão desta sessão.
