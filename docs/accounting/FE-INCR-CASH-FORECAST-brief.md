# BRIEF — FE-INCR-CASH-FORECAST (caixa projetado read-only sobre vencimentos AP/AR)

> Produzido por **sessão de planejamento**. Não contém código de aplicação, não ratifica fork.
> Todo fork abaixo está **PENDENTE** — decisão do dono, fora desta sessão (ORCH-006).

## Cabeçalho

- **Item a planejar:** F4 do `GRAFO-DEPENDENCIAS-2026-09-07.md` — BRIEF `FE-INCR-CASH-FORECAST`:
  fluxo de caixa **projetado**, read-only, sobre os vencimentos de AP/AR em aberto, **sem
  migração**. Apesar do prefixo `FE-`, esta sessão verificou que **não existe backend** para o
  dado (ver achado abaixo) — o BRIEF cobre BE e FE em blocos separados, na mesma fatia, por ser
  P/M (`PLANO-SDD-SEQUENCIAL-2026-09-07.md` rodada 5) e por a cédula de origem descrever um único
  comportamento de produto, não dois incrementos.
- **Autorização (ORCH-006):**
  - `docs/accounting/CEDULA-DECISAO-2026-09-03-modulos.md` fork **F-M3** (linha 35): *"Máximo:
    mapeado (H2 + NF-e) **+ baixa parcial AP/AR + fluxo de caixa projetado (read-only)** +
    remessa CNAB/boleto/Pix"* — ratificado pelo dono, contra a recomendação (que era só o
    mapeado).
  - Mesmo doc, §E linha 176 (tabela de fila): *"**F4** | **BRIEF FE-INCR-CASH-FORECAST**: caixa
    projetado read-only sobre vencimentos AP/AR (sem migração) | `sessao-planejamento` | F-M3 |
    —"*.
  - Mesmo doc, §C.2 item 15: *"**Fluxo de caixa projetado (read-only sobre vencimentos AP/AR)**
    | ⛔ 0 ocorrências de forecast/projeção — BRIEF (F-M3)"*.
  - `docs/accounting/PLANO-SDD-SEQUENCIAL-2026-09-07.md` rodada 5 (linha 69): nó **F4**, tamanho
    P/M, ciclo `S → R → I → V → M → F`, gatilho *"planeja o CASH-FORECAST"* → *"implementa"*,
    sem pré-requisito aberto.
  - `docs/accounting/GRAFO-DEPENDENCIAS-2026-09-07.md` marca F4 como `ready`, depende de `—`,
    fonte `F-M3` (linha 171); listado entre os nós "pronto hoje, sem aresta aberta" (linha 189).
  - Sinal humano direto nesta rodada: *"Pode disparar o plano em multi agent sonnet até
    finalizar"* (2026-09-07), cobrindo a execução sequencial do plano acima — inclui F4.
  - A autorização cobre exatamente produzir este BRIEF (sessão de planejamento); não amplio para
    implementação nem ratifico nenhum fork.
- **Fatos verificados nesta sessão (não assumidos):**
  1. **Não existe endpoint de projeção.** `grep -rn "forecast\|projec" server/src` não encontra
     nenhum service/rota de fluxo de caixa **futuro**. O único candidato de reuso,
     `CashFlowReportService.ts` (rota `GET /reports/cash-flow`, já registrada e documentada), é a
     **DFC método indireto, `periodSemantics: 'year_to_date'`** — um demonstrativo **histórico**
     (1º de janeiro do ano de `asOf` até `asOf`, lendo o razão já lançado). Não projeta nada para
     frente; não lê `dueDate` de AP/AR. Confirmado lendo o arquivo inteiro (324 linhas). A nota
     "fora de escopo" do próprio `ADR-INCR-AP-AR-AGING.md` §5 — *"projeção de fluxo futuro (é o
     DFC, já existe)"* — está **desatualizada/imprecisa**: o DFC existente não cobre projeção; é
     exatamente o gap que a cédula de 03/09 (item 15) reabriu.
  2. **O padrão de reuso certo é `AgingReportService.ts`, não `CashFlowReportService.ts`.**
     Aging já faz exatamente a metade "ler vencimentos AP/AR em aberto" que o forecast precisa:
     `payableRepo.findOutstanding(scope)` / `receivableRepo.findOutstanding(scope)` (mesmos
     repositórios, mesma forma `{ dueDate, amountCents, counterpartyId, ... }`), cálculo de
     dia-calendário **component-based UTC** (`toUtcDayNumber`/`dayNumberFromDateOnly`, imune à
     classe `date-only-rendering-utc-shift-class-bug`), `scopeToday(scope)` para o "hoje" default,
     `centsFromDb` para converter o cents persistido. `loadOutstanding` é **privado** em
     `AgingReportService` — mesmo shape/mesma derivação (Etapa 1 do critério de reuso: mesmo
     objeto), então a sessão de feature deve **extrair um helper compartilhado** (ex.: função em
     `models/` ou módulo novo `outstandingLines.ts`) em vez de duplicar a lógica em
     `CashForecastReportService` — registrado no checklist como item direto, não fork.
  3. **`PAYABLE_OUTSTANDING_STATUSES`/`RECEIVABLE_OUTSTANDING_STATUSES` já incluem o trânsito.**
     Lendo `PayableRepository.findOutstanding` (linhas 93-102): o `where` filtra
     `status: { in: [...PAYABLE_OUTSTANDING_STATUSES] }` = `['OPEN', 'PAYING']` (mirror em AR:
     `['OPEN', 'RECEIVING']`). Reusar `findOutstanding` sem alteração **já** inclui os títulos em
     trânsito (CAS 2-tx) — não é um filtro extra a escrever, é herdado do repositório, igual ao
     que a Aging faz (F-AG3→a, já ratificado 2026-07-15).
  4. **Pagamento é full-only.** `Payable.model.ts`/`Receivable.model.ts` não têm campo de saldo
     parcial (`paidCents`/`balanceCents`); o outstanding de cada linha é sempre `amountCents`
     inteiro. `ADR-INCR-PARTIAL-SETTLEMENT` (nó **F3** do mesmo grafo, ainda não implementado) é
     quem mudaria isso — **o forecast não pode assumir saldo parcial hoje** e deve registrar essa
     dependência futura (ver "Achados fora de escopo").
  5. **Dinheiro é `INTEGER CENTS`, `BigInt`-safe desde BE-INCR-MONEY-BIGINT.**
     `models/money.ts`: `MAX_CENTS = 2_147_483_647` é teto de **política**, não de persistência
     (`centsFromDb` já lê `BigInt` da coluna). O forecast deve serializar toda money como
     `string` cents, igual a todos os outros reports (convenção INCR-4), nunca `number` JS cru.
  6. **`dueDate` é date-only**, gravado como `new Date('YYYY-MM-DD')` (meia-noite UTC) — o mesmo
     comentário de `AgingReportService.ts:42` vale aqui: nunca derivar dia via fuso local.
  7. **Rota/registro em 2 toques real:** `server/src/routes/accounting.ts` registra
     `router.get('/reports/aging', getAging)` (linha 92); a doc OpenAPI **não** vive em
     `docs.paths.ts` (esse arquivo não tem nenhuma entrada `reports/aging`, `reports/cash-flow`
     nem `accounting/reports` — confirmado por grep) — vive **inline no controller**
     (`accountingController.ts:395-406`, bloco `/** @openapi ... */` acima de `getAging`). O
     "registro em 2 toques" para rotas de `accounting.ts` é, portanto: (i) `routes/accounting.ts`
     + (ii) o bloco `@openapi` dentro do próprio controller — **não** `docs.paths.ts`. Isto
     corrige uma suposição do enunciado da tarefa.
  8. **Guard de path-count do OpenAPI é um floor test com `BASELINE` manual.**
     `server/src/__tests__/openapi-paths.test.ts` tem `const BASELINE = 146` — cada rota nova
     documentada exige subir esse número (comentário histórico linha-a-linha já lista todo
     incremento anterior, incl. `+1 (INCR-AGING)`). Uma rota nova de forecast é `+1`.
  9. **Paridade i18n medida agora: pt=847, en=847** (script `count()` recursivo sobre
     `public/locales/{pt,en}/accounting.json`, rodado nesta sessão) — cresceu desde os 803 da
     época do `BRIEF-FE-AGING.md`; é o baseline real a manter N=N.
  10. **Colisão de namespace i18n:** já existe a chave `"cashFlow"` (linha 893 de
      `accounting.json`) — é o DFC histórico. Um namespace novo para o forecast **não pode**
      reusar `cashFlow.*` sem ambiguidade; precisa de um nome distinto (`cashForecast.*` —
      proposto no fork F-CF6/checklist, não é fork de dono, é nomenclatura mecânica).
  11. **Policy:** `IAccountingPolicy` tem `canReadPayable`/`canReadReceivable` (métodos
      independentes, já usados por Aging por `kind`) mas **nenhum** método que cubra os dois ao
      mesmo tempo — o forecast é o primeiro report que mistura as duas subrazões numa única
      resposta sem um `kind` selecionável (fork F-CF5 abaixo).
  12. **Nenhum report service da família aging usa `metrics.startTimer`/`REPORT_WARN_THRESHOLDS_MS`.**
      Só os reports que varrem o razão inteiro (`CashFlowReportService`, `AccountingReportService`,
      `DailyJournalReportService`) têm timer; `AgingReportService` (que só lê os subrazões AP/AR,
      como o forecast) não tem. Seguir o padrão do irmão mais próximo (Aging), não do `CashFlow`.
- **Divergência memória/docs × código:** **uma, já corrigida acima (item 1).** A nota de "fora de
  escopo" do `ADR-INCR-AP-AR-AGING.md` ("projeção de fluxo futuro (é o DFC, já existe)") sugere
  que o DFC cobriria projeção; a leitura do código mostra que o DFC é histórico
  (`periodSemantics: 'year_to_date'`), não projeta nada — bate com a medição da cédula de 03/09
  ("0 ocorrências de forecast/projeção"). Não há ação corretiva nesta sessão (fora de escopo:
  regra 5 do formulário — não amplio o item); registro apenas para a sessão de feature não se
  confundir e tentar "estender" o `CashFlowReportService` em vez de criar o novo.

## Insumos existentes (lidos nesta sessão, não de memória)

| Insumo | Caminho | O que confirma |
|---|---|---|
| Golden ref de agregação read-time sobre AP/AR | `server/src/features/accounting/services/AgingReportService.ts` | `loadOutstanding` (privado), buckets fixos, cálculo UTC-safe de dias, `scopeToday`, `centsFromDb`, policy por `kind` |
| ADR irmão (padrão de forks + "fora de escopo") | `docs/adr/ADR-INCR-AP-AR-AGING.md` | Estrutura de forks F-AG1..F-AG4; nota de "fora de escopo" desatualizada sobre projeção (corrigida acima) |
| BRIEF FE irmão (template desta sessão) | `docs/accounting/BRIEF-FE-AGING.md` | Estrutura completa do BRIEF, os 5 forks FE ratificados (F-AGING-1..5) e a decisão de posição de aba |
| Contrato Payable | `server/src/features/accounting/models/Payable.model.ts` | `PAYABLE_STATUSES`, `PAYABLE_OUTSTANDING_STATUSES = ['OPEN','PAYING']`, full-only (sem saldo parcial) |
| Contrato Receivable | `server/src/features/accounting/models/Receivable.model.ts` | Mirror de Payable — `RECEIVABLE_OUTSTANDING_STATUSES = ['OPEN','RECEIVING']` |
| Repositórios | `IPayableRepository.ts` / `IReceivableRepository.ts` + implementações | `findOutstanding(scope, tx?)` — já filtra por outstanding, ordena por `dueDate asc` |
| DFC histórico (NÃO reusar como base — ver achado 1) | `server/src/features/accounting/services/CashFlowReportService.ts` | `isCashAccount`/`CASH_ACCOUNT_CODE_PREFIXES` — candidato de reuso **só** para o fork F-CF2(a) (saldo inicial derivado do razão), não para a lógica de projeção |
| `AccountingReportService.balancesAsOf` | `server/src/features/accounting/services/AccountingReportService.ts` | Já reusado por `AgingReportService` (tie-out) — mesma fonte de saldo de conta a reusar no F-CF2(a) |
| Money | `server/src/features/accounting/models/money.ts` | `MAX_CENTS`, `centsFromDb` — convenção INTEGER CENTS / string na serialização |
| Datas | `server/src/features/accounting/models/dates.ts` | `isValidDateOnly`, `scopeToday` — únicas fontes de "hoje"/validação de data-only |
| DTO padrão de report read-only | `server/src/features/accounting/dtos/aging.dto.ts` | `.strict()`, `z.enum`, `isValidDateOnly` no `refine`, comentário de por que nunca regex nu |
| Rota + registro | `server/src/routes/accounting.ts:89-93` | `/reports/cash-flow`, `/reports/aging`, `/reports/tie-out` — mesmo padrão a clonar |
| Controller + doc OpenAPI inline | `server/src/controllers/accountingController.ts:394-423` (`getAging`) | Padrão exato de handler: `getUserContextFromRequest` → 401, `safeParse` → 400, `resolveAccountingScope`, `getFactory().getXService()`, `handleApiError` |
| Guard de path-count | `server/src/__tests__/openapi-paths.test.ts` | `BASELINE = 146`, floor test, precisa subir +1 |
| Factory (injeção) | `server/src/lib/factory.ts:353,663,910` | Padrão de wiring: campo no map de services, construtor, getter público |
| Policy | `server/src/features/accounting/policies/IAccountingPolicy.ts` | `canReadPayable`/`canReadReceivable` já existem; nenhum método combinado (fork F-CF5) |
| Golden ref FE (painel de relatório + drill agrupado) | `my-app/features/accounting/components/AgingPanel.tsx` | Estrutura controls→loading→error→empty→report, `formatCents`/`formatDate`, grupos com drill sempre expandido |
| Cliente de API FE | `my-app/lib/services/accounting.service.ts` (`getCashFlow`, `getAging`) | Convenção `ApiEnvelope<T>`, `buildQuery()`, tipos locais nunca importados do backend |
| Onde a aba entra | `my-app/features/accounting/AccountingView.tsx` (`TABS`, linha 29-50) | Tab bar bespoke; `aging` já ocupa a posição entre "Contas a Receber" e "Contrapartes" — o forecast precisa de posição própria (fork F-CF7) |
| i18n | `my-app/public/locales/{pt,en}/accounting.json` | Paridade **847 = 847** (medido nesta sessão); chave `"cashFlow"` já ocupada pelo DFC — namespace novo `cashForecast.*` |
| Teste-padrão | `my-app/features/accounting/components/__tests__/AgingPanel.test.tsx` | Shim `globalThis.React`, mock do service, grupo `null`, `tieOut` ausente |

## Nós vizinhos no grafo

- **F3 `ADR-INCR-PARTIAL-SETTLEMENT`** (rodada 8, `blocked`→`ready` mas ainda não implementado):
  se a baixa parcial for implementada primeiro, o outstanding por linha deixa de ser sempre
  `amountCents` inteiro — o forecast lido hoje (full-only) precisaria ser revisado. Nenhuma
  aresta de dependência no grafo (F4 não depende de F3), mas é o nó que **invalida uma premissa**
  deste BRIEF se mesclado antes da implementação do forecast. Registrado como dependência futura,
  não bloqueio.
- **C7 `BE-INCR-RECONCILE-PENDING`** e **F5 `ADR-INCR-BANK-OUTBOUND`**: sem relação de dado com o
  forecast (um é reconciliação bancária, outro é remessa de saída); nenhuma aresta compartilhada.
- **INCR-AGING** (mergeado, `AgingReportService.ts`): não é dependência formal no grafo, mas é o
  par estrutural mais próximo — mesmo par de repositórios, mesmo par de policies, ver achados 2-3.

## Definição de pronto

Ver seções "Checklist numerado", "Contratos esboçados", "Forks — RATIFICAÇÃO PENDENTE" abaixo.
Nenhum fork se auto-ratifica.

## Checklist numerado de comportamentos (cada um testável)

### Backend (novo — não existe hoje)

1. **`CashForecastReportService.ts`** novo, first-class Prisma, read-only, zero migração —
   injeta `IPayableRepository`, `IReceivableRepository`, `IAccountingPolicy` e (só se F-CF2→a)
   `IAccountRepository` + `AccountingReportService` (para o saldo de caixa). **Direto** (a
   existência do service não é fork — a forma interna dele é, ver forks abaixo).
2. **Helper compartilhado de outstanding lines** extraído de `AgingReportService.loadOutstanding`
   (mesma forma, mesma derivação — Etapa 1 do critério de reuso: mesmo objeto) para um módulo
   comum, consumido pelos DOIS services. **Direto — decisão técnica da sessão de feature, citada
   aqui para não ser esquecida** (regra "reuse antes de recriar" do CLAUDE.md raiz).
3. Cálculo de dia-calendário e "hoje" **reusa** `toUtcDayNumber`/`dayNumberFromDateOnly` (ou o
   helper extraído do item 2) e `scopeToday(scope)` — nunca reimplementar (fecha a classe
   `date-only-rendering-utc-shift-class-bug`). **Direto — é gate.**
4. **DTO `cashForecast.dto.ts`**, `.strict()`, `unitId` obrigatório, demais campos conforme forks
   F-CF1/F-CF3 (horizonte/agrupamento) — clona a estrutura de `aging.dto.ts` (refine com
   `isValidDateOnly`, nunca regex nu). **Direto na forma; conteúdo depende dos forks.**
5. **Gate de snapshot de shape do DTO** (patch pós-review, PR #278) —
   `server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts` faz
   `fs.readdirSync` no diretório de DTOs e reprova qualquer schema Zod exportado (incl.
   `CashForecastQuerySchema` do item 4) ausente de `__dto-shapes__.json`. **Não é opcional nem
   improvisação do implementador** — a própria `sessao-planejamento/SKILL.md` cita este gate como
   pertencente ao checklist. Ao criar o DTO, rodar
   `UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit dtoShapeSnapshot` e comitar o JSON
   atualizado no MESMO PR — o diff do snapshot é o registro legível da mudança de contrato.
   **Direto — é gate.**
6. **Policy** — clona `canReadPayable`/`canReadReceivable`; a composição exata depende do fork
   F-CF5. **Fork F-CF5.**
7. **Horizonte de projeção** — depende do fork **F-CF1**.
8. **Saldo inicial da projeção** (para exibir saldo corrente projetado, não só o líquido do
   período) — depende do fork **F-CF2**.
9. **Granularidade das linhas** (dia/semana/mês) — depende do fork **F-CF3**.
10. **Inclusão de títulos em trânsito** (`PAYING`/`RECEIVING`) — **herdado automaticamente** de
    `findOutstanding()` sem código extra (achado 3). **Fork F-CF4** registra a alternativa
    (excluir exigiria filtro adicional) mas a opção reusada é, por construção, a recomendada.
11. **Serialização money**: toda cifra é `string` de INTEGER CENTS (nunca `number` JS cru),
    idêntico à convenção INCR-4/aging. **Direto — é gate.**
12. **Rota** `GET /reports/cash-forecast` registrada em `server/src/routes/accounting.ts` (mesmo
    bloco dos outros `/reports/*`). **Direto.**
13. **Controller** `getCashForecast` em `accountingController.ts`, clonando exatamente o padrão
    de `getAging` (401 sem user, 400 Zod, `resolveAccountingScope`, `getFactory()`,
    `handleApiError`) + bloco `/** @openapi */` **inline no controller** (achado 7 — nunca
    `docs.paths.ts` para rotas de `accounting.ts`). **Direto.**
14. **Factory**: novo campo no map de services + construtor + getter público
    (`getCashForecastReportService()`), mesmo padrão de `agingReport` em `server/src/lib/factory.ts`.
    **Direto.**
15. **Guard de path-count**: subir `BASELINE` de `146` para `147` em
    `server/src/__tests__/openapi-paths.test.ts`, com comentário histórico no mesmo estilo dos
    anteriores. **Direto — é gate.**
16. **Teste do service** `CashForecastReportService.test.ts`: vazio (sem AP/AR em aberto);
    títulos AP e AR misturados no mesmo dia; título em trânsito (`PAYING`/`RECEIVING`) contado;
    `asOf` custom; policy negada (`ForbiddenError`); `asOf` inválido (`ValidationError`); nenhuma
    conversão produz `NaN`/perde centavo (invariante de soma exata, inteiro). **Direto.**
17. **`cd server && npx tsc --noEmit` limpo.** **Direto — é gate.**

### Frontend

18. **Painel novo `CashForecastPanel.tsx`** — controles (data-base `asOf`, e o(s) parâmetro(s) do
    fork F-CF1), botão "Gerar" — clona `AgingPanel.tsx`/`BalanceSheetPanel.tsx`. **Direto.**
19. Estado vazio, loading, erro (`resolveError`) — mesmo padrão dos irmãos. **Direto.**
20. Renderiza as linhas da projeção (forma depende de F-CF3) com saldo projetado acumulado por
    linha, quando F-CF2 escolhe saldo inicial — **Fork F-CF3** define a forma exata.
21. **Drill-down por documento** dentro de cada linha/bucket — **Fork F-CF9** (espelha F-AGING-3
    da Aging).
22. Toda money via `parseInt(x, 10)` antes de `formatCents`; teste explícito contra `"NaN"`
    (mesmo padrão `BalanceSheetPanel.test.tsx`). **Direto — é gate.**
23. `dueDate`/`asOf` sempre via `formatDate` (nunca `new Date(iso).toLocaleDateString()` cru).
    **Direto — é gate.**
24. Erros de policy (403) e validação (400) no banner de erro padrão. **Direto.**
25. Nova entrada em `AccountingView.tsx` (`TABS` + import + render condicional por `activeTab`).
    **Fork F-CF7** (posição/nome da aba).
26. `accountingService.getCashForecast()` + tipos novos locais (nunca importados do backend) em
    `accounting.service.ts`, espelhando o shape do DTO/service. **Direto.**
27. i18n: todas as strings novas sob namespace **`cashForecast.*`** (nunca `cashFlow.*` — já
    ocupado pelo DFC, achado 10) em `public/locales/{pt,en}/accounting.json`; paridade mantida
    N=N a partir do baseline medido **847=847**. **Direto — é gate.**
28. Teste vitest `CashForecastPanel.test.tsx`: estado vazio; geração com sucesso; erro de policy;
    (se F-CF9→a) drill por documento presente. **Direto.**
29. `cd my-app && npx tsc --noEmit` limpo. **Direto — é gate.**
30. Verificação da aba nova contra **build de produção** (`next build && next start`), não
    `next dev` — página hospedeira já está atrás de `useAuth()`+redirect. **Direto — é gate.**
31. **Exportação (PDF/CSV) NÃO entra nesta fatia** — nenhum painel de relatório da contabilidade
    tem exportação hoje (mesmo achado do `BRIEF-FE-AGING.md`). Registrado em "Achados fora de
    escopo", não fork.

## Contratos esboçados

### DTO de entrada (`server/src/features/accounting/dtos/cashForecast.dto.ts`)

```ts
// Esqueleto — os campos marcados (fork) mudam de forma conforme a ratificação.
export const CashForecastQuerySchema = z
  .object({
    unitId: z.string().min(1),
    asOf: z.string().refine(isValidDateOnly, '...').optional(), // default hoje (scopeToday)
    // (fork F-CF1) horizonDays?: z.coerce.number().int().positive().max(365).optional(),
    // (fork F-CF3) groupBy?: z.enum(['day', 'week', 'month']).optional(),
  })
  .strict();
```

### Envelope de resposta (esqueleto — depende de F-CF2/F-CF3/F-CF9)

```ts
interface CashForecastLine {
  /** date-only YYYY-MM-DD — início do bucket (dia/semana/mês, conforme F-CF3). */
  periodStart: string;
  periodEnd: string;
  /** Σ amountCents das Receivable outstanding com dueDate no período (sempre positivo). */
  inflowCents: string;
  /** Σ amountCents das Payable outstanding com dueDate no período (sempre positivo). */
  outflowCents: string;
  /** inflowCents − outflowCents (líquido do período; pode ser negativo). */
  netCents: string;
  /** Só presente se F-CF2 → (a)/(b) — saldo projetado acumulado ATÉ o fim deste período. */
  projectedBalanceCents?: string;
  // (fork F-CF9) documents?: { id, kind: 'payable'|'receivable', documentNumber, dueDate, amountCents }[];
}

interface CashForecastReport {
  unitId: string;
  asOf: string; // YYYY-MM-DD — data-base da projeção
  /** Só presente se F-CF2 escolher saldo derivado/informado. */
  openingBalanceCents?: string;
  lines: CashForecastLine[];
  totalInflowCents: string;
  totalOutflowCents: string;
  totalNetCents: string;
}
```

### Props do painel FE (esqueleto)

```ts
interface CashForecastPanelProps {
  unitId: string;
}
```

## Forks — RATIFICAÇÃO PENDENTE

> **Nota de numeração (patch pós-review, PR #278):** os 7 forks reais de dono são
> **F-CF1, F-CF2, F-CF3, F-CF4, F-CF5, F-CF7, F-CF9** — a sequência não é contígua de propósito.
> `F-CF6` (linha 89, nomenclatura de rota/namespace i18n `cashForecast.*` vs. alternativa mais
> longa) e `F-CF8` (exportação PDF/CSV, movida para "Achados fora de escopo" por mirror direto
> do precedente já registrado em `BRIEF-FE-AGING.md`) foram **rebaixados de fork para decisão
> técnica/achado fora de escopo** durante a redação — ambos são de custo/reversibilidade baixos o
> bastante para não ocupar o tempo do dono (nomenclatura de rota é quase mecânica; exportação já
> tem precedente de "não incluir" em todos os irmãos). Os números foram **preservados como
> reservados**, não reciclados, para que nenhuma citação cruzada no documento (ex. linha 89)
> precisasse ser renumerada — nenhuma decisão foi ratificada em silêncio nesse rebaixamento.

- **F-CF1 — Horizonte de projeção.**
  (a) **Fixo, sem parâmetro** (ex.: 90 dias a partir de `asOf`) — YAGNI, mesma filosofia de
  `AGING_BUCKETS` fixos (F-AG2→a, "configurável é over-engineering sem demanda").
  (b) Parâmetro `horizonDays` opcional (default 90, teto ex. 365) — mesma forma de `asOf`
  opcional já usada em todos os reports; mais flexível, mais superfície de validação.
  (c) `fromDate`/`toDate` livres (como `PeriodComparisonSchema`) — mais poder, mais forma de
  usar errado (janela invertida, muito longa).
  **Recomendação: (a).** Consistente com o precedente da casa (aging rejeitou configurabilidade
  por YAGNI); pode evoluir para (b) sem quebrar contrato (campo novo opcional). **Custo de
  errar:** se o negócio realmente precisar de horizonte variável logo, (a) exige um redeploy
  pequeno (trocar a constante) — barato; escolher (b)/(c) sem demanda real é a
  over-engineering que o critério de reuso do repo rejeita explicitamente.

- **F-CF2 — Saldo inicial da projeção.**
  (a) **Derivado do razão** — soma o saldo atual das contas de caixa (`isCashAccount`/
  `CASH_ACCOUNT_CODE_PREFIXES`, reusando `AccountingReportService.balancesAsOf`, mesma fonte
  já usada pelo tie-out da Aging) na `asOf`. Nenhuma entrada manual; "Luminaris é a escrituração"
  (F-Z0) diz que o número deve vir do próprio razão.
  (b) Informado — o usuário digita um saldo de partida no FE, sem tocar o razão; mais simples de
  implementar (sem acoplar a `AccountingReportService`), mas duplica um número que já existe no
  sistema e pode divergir silenciosamente do saldo real.
  (c) Sem saldo inicial — o relatório mostra só o líquido projetado por período
  (inflow/outflow/net), sem "quanto vou ter em caixa no dia X". Mais simples, mas responde uma
  pergunta mais fraca.
  **Recomendação: (a).** É reuso de infraestrutura já existente e mergeada (mesma chamada que a
  Aging já faz), fecha com a fronteira de escrituração first-class do produto. **Custo de
  errar:** (b)/(c) entregam um relatório que não responde "vou ficar sem caixa?" — a pergunta que
  motivou o item no F-M3 — sem trabalho adicional relevante para evitar.

- **F-CF3 — Granularidade/agrupamento das linhas.**
  (a) **Diário** (uma linha por dia-calendário, do `asOf` até `asOf+horizonte`) com saldo
  acumulado por linha (se F-CF2 ativo) — é a única granularidade que responde "em que dia
  específico o saldo fica negativo".
  (b) Semanal.
  (c) Mensal.
  (d) Buckets fixos tipo aging (7/30/60/90/>90 dias) — mede "quanto vence em cada faixa", não
  "quando o caixa fica negativo" (pergunta diferente).
  **Recomendação: (a).** Cobre a pergunta central do produto (runway diário); agregação em
  semana/mês pode ser feita no FE a partir do dado diário sem round-trip novo, mas o inverso —
  dado mensal agregado no backend — não permite decompor em dias depois. **Custo de errar:**
  com horizonte fixo de 90 dias (F-CF1→a), o payload é no máximo ~90 linhas — não é um problema
  de volume que justifique (b)/(c)/(d) como default.

- **F-CF4 — Incluir títulos em trânsito (`PAYING`/`RECEIVING`).**
  (a) **Incluir** — herdado automaticamente de `findOutstanding()` sem código extra (o mesmo
  precedente já ratificado para Aging, F-AG3→a, 2026-07-15).
  (b) Excluir — exigiria filtrar `status === 'OPEN'` explicitamente no service, indo contra o
  repositório compartilhado.
  **Recomendação: (a).** É a opção de custo zero (nenhum código extra) e mantém os dois reports
  (aging/forecast) semanticamente consistentes sobre "o que conta como em aberto". **Custo de
  errar:** (b) sub-conta o caixa projetado durante a janela CAS de 2-tx (curta, mas real).

- **F-CF5 — Composição da policy (o report cruza AP e AR sem `kind` selecionável).**
  (a) **Exigir `canReadPayable(scope) && canReadReceivable(scope)`** — 403 se faltar qualquer
  uma; falha fechada, evita servir um relatório "incompleto" sem aviso.
  (b) Permitir leitura parcial — mostra só o lado permitido, com um campo indicando a omissão.
  (c) Nova policy dedicada `canReadCashForecast` (muda `IAccountingPolicy`, todas as
  implementações).
  **Recomendação: (a).** Hoje as duas permissões nascem juntas na prática (nenhum RBAC granular
  por subrazão — item ⚫ fora de escopo); (b) adiciona um estado "relatório parcial" sem demanda
  comprovada; (c) muda uma interface para um caso que (a) já cobre com zero código novo. **Custo
  de errar:** se algum dia existir um perfil com só uma das duas permissões, (a) bloqueia o
  forecast inteiro para esse perfil até uma revisão de RBAC — aceitável, é o comportamento
  fail-closed do resto do repo.

- **F-CF7 — Posição/nome da aba na navegação FE.**
  (a) Aba própria "Fluxo de Caixa Projetado" logo após "Aging" — ordem lógica documento (AP/AR) →
  posição atual (aging) → posição futura (forecast).
  (b) Sub-view dentro do painel **DFC** existente (toggle histórico/projetado no mesmo
  componente) — reusaria a aba, mas misturaria dois relatórios com semânticas de tempo opostas
  (`year_to_date` histórico vs. projeção futura) no mesmo componente, arriscando a classe "número
  que mente" que a emenda de tie-out da Aging tomou cuidado explícito para evitar.
  (c) Dentro do painel de Aging (reusar o toggle `kind`) — mistura um relatório de posição atual
  com um de projeção futura; shapes de resposta diferentes (grupos por contraparte vs. linhas por
  período), forçaria um componente com dois modos de renderização.
  **Recomendação: (a).** Mesmo precedente de F-AGING-1(b) (relatório de posição merece aba
  própria); evita a ambiguidade histórico/futuro do mesmo painel. **Custo de errar:** (b)/(c)
  economizam uma aba mas criam superfície para um usuário confundir "saldo até hoje" com "saldo
  projetado" dentro do mesmo componente visual — o tipo de erro caro em um produto que se declara
  fonte da escrituração.

- **F-CF9 — Drill-down por documento dentro de cada linha/período.**
  (a) Sempre expandido, listando os títulos (AP/AR) que compõem o inflow/outflow daquela
  linha — espelha `AgingPanel` (F-AGING-3→a).
  (b) Sem drill, só os totais agregados por linha — mais simples, sem instrumentação extra.
  (c) Accordion colapsável por linha.
  **Recomendação: (a)** se F-CF3→(a) (diário) for ratificado — poucos documentos por dia,
  drill barato, e dá ao usuário a mesma capacidade de auditoria que a Aging já oferece.
  **Custo de errar:** com uma granularidade mais grossa (F-CF3→c/d) o drill por linha poderia
  crescer bastante; ratificar F-CF3 antes de F-CF9 evita essa combinação ruim.

## Arquivos a criar/tocar por camada

**Backend (novo — não existe hoje):**
- CRIAR `server/src/features/accounting/services/CashForecastReportService.ts`.
- CRIAR `server/src/features/accounting/dtos/cashForecast.dto.ts`.
- EDITAR `server/src/features/accounting/dtos/__tests__/__dto-shapes__.json` — regenerado via
  `UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit dtoShapeSnapshot` (gate do checklist item
  5); **nunca editado à mão**, o diff é o registro da forma do `CashForecastQuerySchema`.
- CRIAR `server/src/features/accounting/services/__tests__/CashForecastReportService.test.ts`.
- EDITAR `server/src/controllers/accountingController.ts` — `getCashForecast` + bloco
  `@openapi` inline (achado 7).
- EDITAR `server/src/routes/accounting.ts` — `router.get('/reports/cash-forecast', ...)`.
- EDITAR `server/src/lib/factory.ts` — campo + construtor + getter.
- EDITAR `server/src/__tests__/openapi-paths.test.ts` — `BASELINE` 146 → 147.
- Possível EDITAR `server/src/features/accounting/services/AgingReportService.ts` (ou novo
  módulo) para extrair o helper de outstanding lines compartilhado (item 2 do checklist).
- **Sem** migração, sem mudança de schema Prisma, sem mudança em `IAccountingPolicy` (se F-CF5
  → a).

**Frontend:**
- CRIAR `my-app/features/accounting/components/CashForecastPanel.tsx`.
- CRIAR `my-app/features/accounting/components/__tests__/CashForecastPanel.test.tsx`.
- EDITAR `my-app/lib/services/accounting.service.ts` — tipos novos + `getCashForecast()`.
- EDITAR `my-app/features/accounting/AccountingView.tsx` — `TABS` + import + render condicional
  (posição depende de F-CF7).
- EDITAR `my-app/public/locales/pt/accounting.json` e `.../en/accounting.json` — namespace
  `cashForecast.*`, paridade mantida a partir de 847=847.
- **Sem** mudança em `docs.paths.ts` (achado 7).

## Pendências de validação externa

Nenhuma. O forecast não introduz regra contábil, fiscal ou legal nova — é agregação aritmética
sobre dados já validados (AP/AR outstanding, saldo de caixa do razão). Nenhum artefato de origem
contábil/fiscal é necessário além do que a Aging/CashFlow já estabeleceram.

## Insumos ausentes

Nenhum. Todos os insumos necessários (repositórios, models, DTO padrão, service irmão, rota,
controller, factory, guard de path-count, golden refs de FE, service de API, i18n) foram
localizados e lidos em disco nesta sessão.

## Achados fora de escopo (não planejados aqui — exigem nova autorização, ORCH-006)

- **`ADR-INCR-PARTIAL-SETTLEMENT` (F3) muda a premissa full-only.** Se a baixa parcial for
  implementada antes deste forecast (ou depois, sem revisão), o outstanding por linha deixa de
  ser sempre `amountCents` inteiro — o service precisaria ler saldo parcial, não o valor cheio do
  título. Registrado como dependência futura explícita (achado 4); não é um fork desta sessão
  porque F3 ainda não tem ADR nem BRIEF — é nó vizinho, fora do perímetro autorizado aqui.
- **Exportação (PDF/CSV) do forecast.** Mesma lacuna estrutural já registrada no
  `BRIEF-FE-AGING.md` — nenhum painel de relatório da contabilidade tem exportação hoje; se
  desejada, é frente própria que afeta a família inteira de relatórios (BP/DRE/DFC/Aging/
  Forecast/Comparativo/Diário), não só este item.
- **Alertas/notificação de saldo projetado negativo.** Fora do escopo "read-only sobre
  vencimentos" que a cédula F-M3 autorizou — seria um novo comportamento ativo (envio de
  notificação), não um relatório.
- **`counterpartyId`/filtro no DTO do forecast.** O DTO esboçado não aceita filtro por
  contraparte (mirror da decisão F-AGING-4→a da Aging) — mudança de backend fora do perímetro se
  vier a ser necessária depois de uso real.

---

## Gates de envio [OPS-001] — autoavaliação desta sessão

1. **Objetivo, não letra:** a frase que responde ao objetivo é a do achado 1-2 — "não existe
   backend de projeção; o padrão certo a clonar é Aging, não o DFC" — porque o objetivo real do
   pedido era decidir "existe endpoint reutilizável ou precisa de BE novo?", não só produzir um
   documento.
2. **Grau visível:** achados 1-12 marcados "verificado" (lidos em disco nesta sessão); as
   recomendações de fork são "assumido" (julgamento, não fato) — nunca apresentadas como
   verificadas.
3. **Caso adversarial tentado:** tentei confirmar que `CashFlowReportService.ts` PODERIA já ser
   o forecast (leitura completa das 324 linhas, procurando por qualquer projeção "para frente")
   — resultado: é 100% histórico (`fromDate = 1º jan do ano de asOf`, nunca lê `dueDate`,
   `method: 'indirect'`), então a leitura confirma que BE novo é necessário, não uma suposição
   de partida.
4. **Checagem falseável:** o grep `forecast\|projec` em `server/src` (zero resultado) e a leitura
   integral do `CashFlowReportService.ts` são checagens que teriam mudado a conclusão se
   encontrassem algo — não encontraram.
5. **Duas primeiras linhas entregam verdade + risco:** ver achado 1 no topo da seção "Fatos
   verificados" — a verdade (BE novo é necessário) e o risco principal (a nota desatualizada do
   ADR da Aging pode levar a sessão de feature a tentar reusar o `CashFlowReportService` errado)
   estão nas duas primeiras linhas dessa lista.

**Risco silencioso nº 1 (OPS-004):** se a sessão de feature ratificar F-CF1→(a) fixo mas
implementar sem o comentário explícito "YAGNI, ver F-CF1 do BRIEF" no código, um pedido futuro de
horizonte maior pode virar um "hotfix" ad-hoc em vez de trocar a constante deliberadamente — o
tipo de dívida silenciosa que ninguém avisa (nem compilador, nem teste, só o próximo leitor do
código). Mitigação: o comentário-fonte deve citar o fork por nome, como todo outro fork
ratificado no repo faz (padrão `F-AG3→a` já em uso).
