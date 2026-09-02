# BRIEF — FE-INCR-SALE-ACTIONS (LAC-A + carona LAC-C)

> Produzido em sessão de planejamento, 2026-09-02. **FORKS RATIFICADOS 2026-09-02** — dono, nesta
> sessão: "ratifico todas as recomendações dos forks". Cada fork abaixo vale na recomendação.

## Contexto fixo

- **Item:** LAC-A — ações da venda pela tela chamando as rotas dedicadas, + LAC-C (saldo de pacote)
  de carona. `ACCOUNTING-MASTER-MAP.md` §5.1, linha **LAC-A** (emenda 2026-09-01);
  `PROXIMOS-PASSOS-2026-09-01.md` §1 item A1. **Pré-condição do H2.**
- **Autorização:** dono, 2026-09-01 ("Adicione nos momentos corretos de acordo com as dependências
  essas lacunas no nosso plano total") + 2026-09-02 ("planeja todos os LAC"), sessão fluxo-salao-beleza.
- **Insumos existentes (fatos consumados que o plano respeita):**
  - Rotas vivas e testadas: `POST /api/sales/pay|cancel|return` (`server/src/routes/sales.ts`).
  - DTOs `.strict()`: `RegisterPaymentDto.ts` (`tableId`, `saleId`, `paymentMethod` ∈ 5 valores,
    `paidAt?`, `paymentReference?`, `packageId?` — obrigatório sse `Package Balance`, proibido nos
    demais; campo extra ⇒ 400); `SalesCancellationDto.ts` (`tableId`, `saleId`, `reason?` ≤500).
  - `RegisterPaymentService`: exige `status === 'Finalized'`; idempotente se já `Paid`;
    hard-gate `assertSufficient` de pacote ANTES de escrever; whitelist `isSystem` de até 6 colunas.
  - `SalesCancellationService.cancel/return_`: exige `Finalized`; pós-commit `maybeReverseSale`.
  - FE atual: handlers com patch literal em `SaleDetailPanel.tsx:95/110/125` e
    `SalesTable.tsx:219/237/255` (duplicados); cadeia `onUpdateSale → useSalesData.updateSale →
    FinanceService.updateSale → PUT genérico`; `salesTable.id` (o `tableId` dos DTOs) vive em
    `useSalesData`, o painel nunca o vê; **zero** chamadas às rotas dedicadas em todo `my-app`;
    o painel não conhece o estado `Returned` nem pergunta `paymentMethod`.
  - LAC-C: `GET /api/package-balances` (query `unitId` obrigatório, `customerId?`;
    resposta `{balances: CustomerPackageBalance[]}` com `balanceCents` BigInt), zero consumidores FE.
  - Resposta das 3 rotas: linha DynamicTable crua (`IDynamicTableData`), não DTO de venda.
- **Nós vizinhos no grafo:** `useSalesData` (consumido por `SalesView`→`SaleDetailPanel`/`SalesTable`);
  `FinanceService` (permanece para create/edit de Draft); bridges contábeis (consumidoras do estado
  da venda — intocadas); canônicos de reuso: `Modal`, padrão `*.service.ts` de `my-app/lib/services/`.

## Definição de pronto deste incremento

FE-only (a casa separa BE/FE; zero mudança em `server/`). Instrumentação (teste-guarda vermelho)
é sessão própria ANTES da correção — este BRIEF especifica ambos.

## Checklist numerado de comportamentos

1. **Client service novo** `my-app/lib/services/sales.service.ts`: `paySale`, `cancelSale`,
   `returnSale` — POST às 3 rotas com body exatamente no shape dos DTOs (nenhum campo extra;
   `.strict()` no servidor é o falsificador). Testável: unit do service com fetch mockado.
2. **Client service novo** `packageBalances.service.ts`: `listBalances(unitId, customerId?)`.
   Testável: unit com resposta fixture.
3. **`useSalesData` ganha `paySale/cancelSale/returnSale`** usando `salesTable.id` interno;
   sucesso ⇒ refetch (não confiar na linha crua retornada — ver Insumo ausente 2); erro ⇒ toast com
   a mensagem do backend. Handlers saem de `SaleDetailPanel`/`SalesTable` (fim da duplicação — os
   componentes recebem callbacks). Testável: hook test com service mockado.
4. **Mini-modal de pagamento** (reuso do `Modal` canônico): método obrigatório (5 opções do DTO),
   referência opcional; `Package Balance` habilita seleção de pacote (item 6). Confirmar ⇒
   `paySale`. Testável: render + submit chama `POST /api/sales/pay`, nunca o PUT genérico
   (**este é o teste-guarda da instrumentação — vermelho hoje**).
5. **Botão Devolver** novo (render: venda `Finalized`), com `reason` conforme F-A4; painel e tabela
   reconhecem `Returned` (badge). Testável: render por estado + chamada à rota.
6. **LAC-C no modal:** lista pacotes com saldo do cliente da venda (`listBalances`); exibe saldo;
   opção `Package Balance` conforme F-A3; confirmar desabilitado se saldo exibido < total (o
   hard-gate do servidor permanece a autoridade). Testável: fixture de saldos.
7. **Gates de render corrigidos:** Pagar só em `Finalized && !Paid`; Cancelar/Devolver conforme
   F-A1; nenhum botão que garantidamente falha no backend fica clicável. Testável por estado.
8. **i18n pt/en** de todas as strings novas (paridade é gate).
9. **Verificação contra build de produção** (tela atrás de `withAuth` — gate do `my-app/CLAUDE.md`).
10. **Instrumentação (sessão própria, antes da correção):** primeiro `__tests__` de
    `category-views/finance` — vitest + jsdom + shim `globalThis.React` (memória
    `vitest-render-needs-react-global`); assere o comportamento 4 e falha hoje pelo motivo certo
    (clique dispara PUT genérico).

## Contratos esboçados

```ts
// my-app/lib/services/sales.service.ts
type PaymentMethod = 'Credit Card' | 'Debit Card' | 'Cash' | 'Pix' | 'Package Balance';
interface PaySalePayload { tableId: string; saleId: string; paymentMethod: PaymentMethod;
  paidAt?: string; paymentReference?: string; packageId?: string; }
interface CancelOrReturnPayload { tableId: string; saleId: string; reason?: string; }
// respostas: { success: true, data: IDynamicTableData } — tratar como opaca; estado via refetch

// packageBalances.service.ts
interface CustomerPackageBalanceView { id: string; customerId: string; packageId: string;
  balanceCents: string /* ver Insumo ausente 1 */; }
listBalances(unitId: string, customerId?: string): Promise<CustomerPackageBalanceView[]>
```

## Forks — RATIFICADOS 2026-09-02 (todas as recomendações acolhidas)

- **F-A1 — Cancelar venda `Draft`.** Backend dedicado exige `Finalized`; hoje a tela cancela Draft
  pelo PUT genérico (funciona por acaso, sem efeito contábil — correto por vácuo).
  Caminhos: (a) manter Draft→Cancelled via PUT genérico e usar a rota dedicada só para `Finalized`;
  (b) estender o BE para aceitar Draft (fora deste incremento FE); (c) Draft não é cancelável pela UI.
  **Recomendação: (a)** — menor diff, semântica correta, zero BE. **RATIFICADO 2026-09-02 (recomendação).**
- **F-A2 — Forma do fluxo de pagamento.** (a) modal próprio (reuso do canônico); (b) inline no painel.
  **Recomendação: (a).** **RATIFICADO 2026-09-02 (recomendação).**
- **F-A3 — `Package Balance` sem pacote com saldo.** (a) opção oculta; (b) visível desabilitada com
  tooltip. **Recomendação: (b)** — descobribilidade do recurso. **RATIFICADO 2026-09-02 (recomendação).**
- **F-A4 — `reason` no Devolver/Cancelar.** DTO aceita opcional. (a) campo opcional no confirm;
  (b) obrigatório na UI. **Recomendação: (a)** — espelha o contrato. **RATIFICADO 2026-09-02 (recomendação).**
- **F-A5 — Exibir saldo de pacote fora do modal** (detalhe do cliente etc.).
  **Recomendação: NÃO neste incremento** — mínimo ratificado é o modal; o resto é achado fora de
  escopo. **RATIFICADO 2026-09-02 (recomendação).**

## Pendente de validação externa

— (vazia; nenhum comportamento novo de regra contábil — settlement/estorno já ratificados nos ADRs
dos Increments D e correlatos).

## Insumos ausentes

1. **Serialização de `balanceCents` (BigInt) no JSON** de `GET /api/package-balances` — confirmar
   por execução/teste antes de fixar o tipo do client (string × number). Pausa localizada no item 2.
2. **Suficiência da linha crua retornada pelas rotas** para atualização otimista — recomendação
   provisória é refetch (item 3); confirmar custo na prática.

## Achados fora de escopo (não planejados — exigem nova autorização)

- Tela/aba de pacotes do cliente (F-A5 além do modal).
- Aceitar Draft no cancel do BE (F-A1 caminho b).
- Qualquer mudança nos gates de render de `SalesCreateModal` (fluxo de criação intocado).
