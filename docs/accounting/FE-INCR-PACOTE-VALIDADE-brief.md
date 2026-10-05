# FE-INCR-PACOTE-VALIDADE — validade em destaque e aceite registrado (PLANO, não executar)

## 0. Cabeçalho

- **Item:** nó [`FE-INCR-PACOTE-VALIDADE`](../plano/nos/FE-INCR-PACOTE-VALIDADE.md), aberto por este pedido. É o "nó FE
  vizinho" do [`BE-INCR-PACOTE-VALIDADE`](BE-INCR-PACOTE-VALIDADE-brief.md) §8, promovido a **bloqueador do deploy**
  pelo F-JUR-4 de [`D-2026-10-04-PACOTE-VALIDADE-TRIAGEM-JURIDICO`](../plano/decisoes/D-2026-10-04-PACOTE-VALIDADE-TRIAGEM-JURIDICO.md).
- **Autorização:** dono, chat, 05/10/2026 (data do pedido; o relógio da máquina marcava 04/10 22:48): *"Planeja o nó FE
  do PACOTE-VALIDADE (...) — sessao-planejamento. (...) Onde o aceite mora (coluna na venda ou no saldo) é fork — vai a
  mim por questionário. (...) Crie a nota do nó no vault. Sem 'executa'."* **Autoriza este BRIEF e a nota do nó, não o
  código.** A `sessao-feature` exige os forks do §5 ratificados e um "executa" citável (ORCH-006).
- **Requisito nomeado (origem):** pergunta 4 do jurídico, classe DADO na triagem: *"A lei exige informação prévia,
  ostensiva e com destaque sobre o prazo"*; *"cabe ao salão provar que informou; daí a importância do aceite
  registrado."* Gabarito da triagem: destaque (CDC 54 § 4º), fonte ≥ corpo 12 (CDC 54 § 3º), aceite registrado
  (prova, CDC 6º VIII). Evidência na íntegra:
  [`RESPOSTA-JURIDICO-2026-10-04-PACOTE-VALIDADE.md`](RESPOSTA-JURIDICO-2026-10-04-PACOTE-VALIDADE.md).
- **Escopo pedido pelo dono:** validade em destaque **no cadastro do pacote, na venda e no comprovante**; fonte ≥
  corpo 12; **registro de aceite (quem, quando, texto mostrado)**. Ponto de partida nomeado: o
  `packageBalancesService` descarta `expiresAt` e o `SaleActionModals` mostra só o saldo.
- **BE dentro deste nó:** o aceite precisa morar em algum lugar do servidor em qualquer caminho do F-FE-PV-2, e o
  texto mostrado precisa de uma fonte única (F-FE-PV-4). Por isso o checklist tem um PR-1 de BE pequeno. É a
  exceção à regra da casa "BE e FE em incrementos distintos", e é declarada aqui, não escondida: o requisito é um só,
  e o BE sem a tela não cumpre nada.
- **Forks F-FE-PV-1..7 ✅ RATIFICADOS 05/10** pelo dono, por questionário (§5.1). **Dois contra a recomendação:
  F-FE-PV-1 (c)**: a venda de pacote no FE vira nó próprio, [`FE-INCR-VENDA-PACOTE`](FE-INCR-VENDA-PACOTE-brief.md),
  e este nó depende dele; **F-FE-PV-5 (b)**: o comprovante é PDF ("pdf imprimível"), pelo pipeline que já existe. Não
  é "executa".
- **Base:** `origin/main` `84d6d6ab` + branch do #483 `origin/feat/be-incr-pacote-validade` `fa9a27f5` (lido antes do
  merge). ⟨05/10⟩ **O #483 foi mergeado em 04/10 (`2d1ddbe5`)**, com o D1 aplicado (não há job de backfill em
  `main`). Código lido em 04/10.

## 1. Fatos (grau: **V** = lido no código nesta sessão · **I** = inferido da leitura, não executado)

| # | Fato | Evidência | Grau |
|---|---|---|---|
| F1 | O cliente FE do saldo **descarta `expiresAt`**: o `map` copia só `id`, `customerId`, `packageId`, `unitId`, `balanceCents` | `my-app/lib/services/packageBalances.service.ts:14-20,37-43` | V |
| F2 | O servidor já devolve a linha inteira do saldo, com `expiresAt` (a lista é `findMany` sem `select`) | #483: `PackageBalanceRepository.ts` `listBalances`; `packageBalanceController.ts:23-29` | V |
| F3 | `expiresAt` é date-only em meia-noite UTC. A recompra **sobrescreve** o `expiresAt` do saldo (`upsert` com `update: { …, expiresAt }`; F-PV-2 a) | #483: `validity.ts` `expiresAtToDb`/`expiresOnFromDb`; `PackageBalanceRepository.ts` `upsertCredit` | V |
| F4 | O último dia válido sai de `lastValidDay(saleDate, validityDays)`, que já empurra feriado nacional (D2 aplicado no branch, com os dois turnos de eleição) | #483: `server/src/features/packages/models/validity.ts` | V |
| F5 | O consumo de saldo vencido é recusado com `PACKAGE_BALANCE_EXPIRED` (400) | #483: `server/src/lib/errors.ts:211-212` | V |
| F6 | O `SalePaymentModal` lista os saldos (> 0) como `Pacote <id8> — saldo R$`; não mostra validade e não sabe de vencido | `SaleActionModals.tsx:56-58,165-171` | V |
| F7 | **O FE não vende pacote.** O wizard de venda só tem as variantes `products` e `services`; `itemType` é `'Product' \| 'Service'`; o `FinanceService` não manda `packageId` | `types/sales.types.ts:46,66,96`; `SaleItemsManager.tsx:64-70`; `FinanceService.ts:31-43` | V |
| F8 | O servidor aceita item `Package` (`packageId` na tabela de itens mista) e exige **um só** `packageId` por venda all-Package | `SalesItemsMixed.ts:16,19`; `rules/plugins/sales/saleItems.ts:104-126,139-164` | V |
| F9 | A criação de venda no FE é não atômica: cria a venda e depois os itens em paralelo, em chamadas separadas | `FinanceService.ts:23,31-49` | V |
| F10 | O catálogo de pacotes é uma DynamicTable (`Packages`, `validityDays` inteiro, `minValue: 0`, rótulo `Validity (days)`). Nenhum código do `my-app` cita o catálogo: ele aparece só pela tela genérica de tabelas | `PackageCatalogModule.ts:15-35`; `grep "validityDays\|catalog.packages" my-app` vazio | V |
| F11 | O campo de schema de DynamicTable tem `description?: string` | `server/src/features/dynamicTables/models/DynamicTable.model.ts:22-28` | V |
| F12 | Não existe comprovante de venda no FE (nenhuma tela ou impressão da venda) | `grep -i "comprovante\|recibo\|receipt"` em `features/dashboard/.../sales`: só o ícone `HiReceiptRefund` da devolução | V |
| F12b | ⟨corr 05/10⟩ **Existe pipeline de PDF no servidor**: serializador HTML puro em `lib/` → `htmlToPdf` (puppeteer, um browser compartilhado) → resposta `attachment`; o FE baixa por um helper de GET binário. Hoje serve o comprovante de lançamento contábil. A opção (b) do F-FE-PV-5 foi descrita ao dono como "dependência nova": **errado**, o `puppeteer` já é dependência | `server/src/lib/pdf.ts:10-44`; `lib/receiptHtml.ts:1-60`; `controllers/accountingController.ts:146-165`; `my-app/lib/services/accounting.service.ts:641,1056-1064`; `server/package.json` (`puppeteer`) | V |
| F13 | O saldo é creditado pela ponte `sale.package.sold`, na finalização da venda, não na criação. Antes de finalizar, não há `expiresAt` | BE BRIEF §1 P4; `SalePackageSoldBridge.ts` | V (via BRIEF) / I (momento exato na tela) |
| F14 | CSS: `1pt = 1/72 in` e `1px = 1/96 in`, então **12pt = 16px**. `text-sm` (14px) fica abaixo de corpo 12; `text-base` (16px) é o piso na tela | CSS Values and Units, unidades absolutas | V (a conta) / I (que "corpo 12" na tela se lê assim, §6 PE-FE-2) |

## 2. O que já está decidido e este BRIEF não rediscute

- Vence → 100% vai para a 3.4 (F-JUR-3); a mitigação é a informação com destaque. **Por isso o texto mostrado diz que
  o saldo não usado não é devolvido** (§4.3).
- Sem aviso ativo antes de vencer (F-PV-11 a, confirmado pela pergunta 5). A lista "vencendo" fica fora (§8).
- Sem piso de prazo (F-JUR-1). O cadastro mostra só a orientação "≥ 12 meses é a mais defensável".
- Sem retroatividade (F-JUR-2): saldo antigo fica `expiresAt null` e a tela mostra "sem validade".
- O deploy do PACOTE-VALIDADE espera este nó + M2 (F-JUR-4).

## 3. Checklist (cada item testável sozinho; a forma final segue os forks do §5)

A redação abaixo assume as **recomendações** do §5. Item marcado ⟨F-FE-PV-n⟩ muda de forma se o fork sair diferente.

### PR-1 — BE: texto único e aceite (o #483 já está em `main`, `2d1ddbe5`)

1. ⟨F-FE-PV-2⟩ **Modelo `PackageValidityAcceptance`** (Prisma, migração aditiva, append-only): uma linha por venda,
   `@@unique([userId, unitId, saleId])`, sem FK com cascade (memória `audit-log-no-fk-cascade`), sem soft-delete e sem
   rota de update/delete: é prova, não cadastro (mesma exceção do log de movimentos). Teste: 2º aceite da mesma venda →
   409 `PACKAGE_ACCEPTANCE_EXISTS`.
2. ⟨F-FE-PV-4/7⟩ **Texto versionado, puro**: `features/packages/models/validityNotice.ts` com
   `PACKAGE_VALIDITY_NOTICE_VERSION = 'v1'` e `renderValidityNotice(input) → string`. Datas formatadas a partir de
   `YYYY-MM-DD` por componente (nunca `Date` local; memória `date-only-rendering-utc-shift-class-bug`). Testes: saída
   determinística; venda 25/11/2026, N = 30 → último dia 26/12/2026 (25/12 é feriado; sábado conta como útil, F4); N
   `null`/`0` → `null`.
3. **`GET /api/package-acceptances/notice?unitId&packageId&saleDate`** → `{ validityDays, saleDate, expiresOn,
   textVersion, text, textSha256 }`. `validityDays` vem **do catálogo no servidor** (leitura pelo repositório de
   DynamicTable, como o `saleItems.ts` das pontes faz; nunca pelo `DynamicTableService`, §2.1). Pacote sem validade →
   campos `null`. `saleDate` impossível → 400 (memória `date-only-regex-nao-valida-calendario`). Pacote de outra
   unidade → 404.
4. **`POST /api/package-acceptances`** `{ unitId, saleId, textVersion, textSha256 }` → 201 com a linha. O servidor
   **não confia no FE** para nada além da versão e do hash: lê a venda no escopo, exige venda all-Package com um
   `packageId` (reusa o classificador `saleItems.ts`), tira `customerId` e `saleDate` da venda e `validityDays` do
   catálogo, re-renderiza o texto e compara o hash. Diferente → 409 `PACKAGE_NOTICE_CHANGED` (o texto mudou entre
   mostrar e aceitar). Pacote sem validade → 400 `PACKAGE_WITHOUT_VALIDITY`. Venda que não é de pacote → 400.
   Grava `acceptedByUserId = req.user.id` e `acceptedAt` do relógio do servidor. Um teste por recusa.
5. **`GET /api/package-acceptances?unitId&saleId`** → a linha ou `null` (alimenta o detalhe e o comprovante).
6. **Camadas e gates** (Contrato §2/§3): Route → Controller → Service → Repository → Prisma + Policy (escopo do
   tenant), Factory, DTO Zod `.strict()` (input novo, nasce estrito); registro em 2 toques (`routes/index.ts` +
   `docs.paths.ts`) e o guard de path-count do openapi (+3 caminhos); `dtoShapeSnapshot` atualizado e os tipos
   gerados do FE (`types/contracts/packages/*.gen.ts`, nó [[FE-CONTRACT-TYPES]]); teste de auth deny-by-default para
   a rota nova. **Sem evento de auditoria novo:** a própria linha é a prova; se o dono quiser o evento, ele entra na
   allowlist do `auditCanonical.ts` na mesma mudança.

### PR-2 — FE: saldo, venda e aceite

7. **Saldo com validade (F1):** `packageBalancesService` passa a devolver `expiresOn: string | null` =
   `expiresAt?.slice(0, 10)`. Teste: `'2026-12-31T00:00:00.000Z'` → `'2026-12-31'`; `null` → `null`. Exibição
   sempre por formatador date-only (memória `date-only-rendering-utc-shift-class-bug`).
8. **Pagamento com pacote (F6):** cada opção mostra `vence em DD/MM/AAAA` ou `sem validade`; saldo com
   `expiresOn < hoje` aparece **desabilitado** com `vencido em DD/MM/AAAA` (UX; a autoridade é o 400 do servidor);
   o saldo escolhido mostra a validade em destaque (≥ 16px, semibold). O erro `PACKAGE_BALANCE_EXPIRED` vira
   mensagem traduzida. Testes vitest para os três estados (válido, vencido, sem validade).
9. ~~Vender pacote no wizard~~ **Sai deste nó (F-FE-PV-1 c):** vira o nó [[FE-INCR-VENDA-PACOTE]], do qual este
   depende. Os itens 10 e 11 abaixo se apoiam na variante `packages` que ele entrega.
10. ⟨F-FE-PV-3/4⟩ **Bloco de validade na venda:** escolhido o pacote (e a data da venda), o wizard busca o
    `notice` (item 3) e mostra o `text` **literal**, numa caixa com borda, `text-base` ou maior e `font-semibold`.
    Pacote com validade exige o checkbox *"Li este texto ao cliente e ele concordou"* para habilitar "Criar venda".
    Trocar pacote ou data refaz a busca e desmarca. Pacote sem validade: mostra "Sem validade" e não pede aceite.
    Testes: botão desabilitado sem o checkbox; troca de data desmarca; classes de tamanho/peso na caixa.
11. **Gravar o aceite:** depois de criar venda e itens, `POST /package-acceptances` com `textVersion` + `textSha256`
    do `notice` mostrado. Falha (inclusive 409 `PACKAGE_NOTICE_CHANGED`) → aviso na tela; a venda fica criada e com a
    pendência do item 12 (F9: a criação já não é atômica hoje). Teste: ordem das chamadas e caminho de falha.
12. ⟨F-FE-PV-6⟩ **Detalhe da venda (`SaleDetailPanel`):** venda de pacote mostra o bloco de validade (o `expiresOn`
    do saldo se já creditado, F13; senão o do `notice`) e o aceite (**quem, quando, versão do texto**) ou o selo
    **"aceite não registrado"** com o botão que abre o mesmo bloco do item 10. Testes para os dois estados.

### PR-3 — cadastro (o comprovante do item 13 vai no PR-1 e no PR-2)

13. **Comprovante em PDF (F-FE-PV-5 b, F12b), pelo pipeline existente, sem dependência nova:**
    - BE: serializador puro `server/src/lib/packageSaleReceiptHtml.ts` (mesmo padrão do `receiptHtml.ts`: dado plano
      entra, HTML autocontido sai, `escapeHtml`, data por getters UTC, dinheiro por divisão inteira) + `GET
      /api/package-acceptances/:saleId/receipt?unitId` → `application/pdf` `attachment` via `htmlToPdf`. Conteúdo:
      unidade, cliente, pacote, valor, data da venda, **a cláusula** (o `textShown` do aceite; sem aceite, o `text` do
      `notice` com a marca "ACEITE NÃO REGISTRADO") em caixa com borda, negrito e **`font-size: 12pt`** (no PDF o `pt`
      é medida real); o aceite (quem, quando, versão); linha de assinatura do cliente (F-FE-PV-3 b). Testes: unidade
      do serializador (escape, data, valor, cláusula presente, marca sem aceite, `12pt` no CSS da cláusula) + rota
      (200 com `application/pdf`, 404 fora do escopo, venda que não é de pacote → 400).
    - FE: botão "Baixar comprovante (PDF)" no `SaleDetailPanel`, pelo helper de GET binário do
      `accounting.service.ts:641` (reuso; se ele for privado ao serviço contábil, a extração para `lib/` é parte do
      item). Teste vitest: o botão chama a URL certa.
    - O BE entra no PR-1 e o botão no PR-2; o PR-3 fica só com o cadastro.
14. **Cadastro do pacote (F10/F11):** o campo `validityDays` aparece na lista e no formulário da tela genérica, com
    rótulo pt "Validade (dias)" e a orientação do F-JUR-1 como `description`: *"Prazo em dias corridos a partir da
    compra. Validade de 12 meses ou mais é a mais defensável; 0 ou vazio = sem validade."* **Pausa:** dois insumos
    ausentes (§7 I1, I2) decidem se isto é só preset ou precisa de código no FE.
15. **i18n:** paridade pt/en de toda chave nova (gate do `skill-audit wiring`). **O texto legal não é chave i18n:**
    vem do servidor em pt-BR (item 2) e é o mesmo em qualquer idioma da interface, porque é ele que fica gravado.
16. **Verificação contra build de produção** (telas atrás de `withAuth`, `my-app/CLAUDE.md`): sonda de estilo
    computado na caixa da venda e do detalhe (`font-size` ≥ 16px; `font-weight` ≥ 600). Skill `verificacao-visual`.
    O tamanho no PDF é conferido no teste do serializador (item 13), não no browser.
17. **Sign-off de browser = gate humano.** O agente prepara o runbook em branco (`RUNBOOK-FORMAT.md`): vender um
    pacote com validade, aceitar, baixar e imprimir o PDF do comprovante, pagar com o saldo, tentar pagar com saldo vencido. Não
    preenche, não assina.

## 4. Contratos (esboço materializável)

### 4.1 Prisma

```prisma
/// FE-INCR-PACOTE-VALIDADE (F-JUR-4) — prova de que a validade foi informada. Append-only: sem update/delete.
/// Sem FK com cascade (memória audit-log-no-fk-cascade).
model PackageValidityAcceptance {
  id               String   @id @default(cuid())
  userId           String   // tenant (eixo 1)
  unitId           String   // eixo 2
  saleId           String   // linha da DynamicTable de vendas
  customerId       String   // da venda, lido no servidor
  packageId        String   // do item Package, lido no servidor
  saleDate         DateTime // date-only, meia-noite UTC (P15 do BE BRIEF)
  validityDays     Int      // do catálogo, lido no servidor
  expiresOn        DateTime // date-only; lastValidDay(saleDate, validityDays)
  textVersion      String   // 'v1'
  textShown        String   // texto exato renderizado e mostrado
  textSha256       String
  acceptedByUserId String   // "quem": o usuário autenticado que registrou
  acceptedAt       DateTime @default(now()) // "quando": relógio do servidor
  @@unique([userId, unitId, saleId])
  @@index([userId, unitId, customerId])
}
```

### 4.2 DTOs (Zod) e respostas

```ts
// features/packages/dtos/PackageAcceptanceDto.ts
export const ValidityNoticeQuerySchema = z.object({
  unitId: z.string().min(1),
  packageId: z.string().min(1),
  saleDate: z.string().refine(isValidDateOnly, 'saleDate deve ser uma data real YYYY-MM-DD'),
}).strict();

export const CreatePackageAcceptanceSchema = z.object({
  unitId: z.string().min(1),
  saleId: z.string().min(1),
  textVersion: z.literal(PACKAGE_VALIDITY_NOTICE_VERSION),
  textSha256: z.string().regex(/^[0-9a-f]{64}$/),
}).strict();

export const GetPackageAcceptanceQuerySchema = z.object({
  unitId: z.string().min(1),
  saleId: z.string().min(1),
}).strict();

export interface ValidityNoticeResponse {
  validityDays: number | null;
  saleDate: string;            // 'YYYY-MM-DD'
  expiresOn: string | null;    // 'YYYY-MM-DD'
  textVersion: string;
  text: string | null;
  textSha256: string | null;
}

export interface PackageAcceptanceResponse {
  id: string; saleId: string; customerId: string; packageId: string;
  saleDate: string; validityDays: number; expiresOn: string;          // date-only
  textVersion: string; textShown: string; textSha256: string;
  acceptedByUserId: string; acceptedAt: string;                       // ISO
}
```

### 4.3 Texto v1 (proposta; ⟨F-FE-PV-7⟩)

```ts
// features/packages/models/validityNotice.ts — puro
export const PACKAGE_VALIDITY_NOTICE_VERSION = 'v1';
export function renderValidityNotice(i: { validityDays: number; saleDate: string; expiresOn: string }): string;
// v1, com saleDate/expiresOn em DD/MM/AAAA:
// "VALIDADE DO PACOTE: este pacote vale por {validityDays} dias corridos a contar da data da compra ({saleDate}).
//  Último dia para usar: {expiresOn}. Se o prazo terminar em feriado nacional, ele vai até o dia útil seguinte,
//  e a data acima já considera isso. O saldo não usado até essa data não será devolvido nem trocado por dinheiro."
```

### 4.4 Erros (código próprio)

```ts
PackageAcceptanceExistsError   // 409 'PACKAGE_ACCEPTANCE_EXISTS'
PackageNoticeChangedError      // 409 'PACKAGE_NOTICE_CHANGED'
PackageWithoutValidityError    // 400 'PACKAGE_WITHOUT_VALIDITY'
```

### 4.5 Comprovante (PDF)

```ts
// server/src/lib/packageSaleReceiptHtml.ts — puro (padrão lib/receiptHtml.ts)
export interface PackageSaleReceiptData {
  unitName: string; customerName: string; packageName: string;
  amountCents: number; saleDate: string;            // 'YYYY-MM-DD'
  clause: string;                                   // textShown do aceite, ou text do notice
  acceptance: { acceptedByLabel: string; acceptedAt: Date; textVersion: string } | null; // null → "ACEITE NÃO REGISTRADO"
}
export function packageSaleReceiptHtml(d: PackageSaleReceiptData): string;   // cláusula com font-size: 12pt
// GET /api/package-acceptances/:saleId/receipt?unitId → application/pdf (attachment), via lib/pdf.ts htmlToPdf
```

### 4.6 FE

```ts
// lib/services/packageBalances.service.ts
export interface CustomerPackageBalance { id; customerId; packageId; unitId; balanceCents: number; expiresOn: string | null }
// lib/services/packageAcceptances.service.ts
getNotice(unitId, packageId, saleDate): Promise<ValidityNoticeResponse>;
create(input: CreatePackageAcceptanceInput): Promise<PackageAcceptanceResponse>;   // tipo gerado
getBySale(unitId, saleId): Promise<PackageAcceptanceResponse | null>;
// features/dashboard/category-views/finance/types/sales.types.ts
itemType?: 'Product' | 'Service' | 'Package';   variant: 'products' | 'services' | 'packages';
```

## 5. Forks — ✅ RATIFICADOS 2026-10-05 (escolhas e efeitos em §5.1; a tabela abaixo é a proposta original)

| Fork | Pergunta | Caminhos | Recomendação | Status |
|---|---|---|---|---|
| **F-FE-PV-1** | O FE não vende pacote (F7). "Validade em destaque na venda" exige uma tela de venda de pacote | (a) acrescentar a variante "Pacotes" ao wizard neste nó (item 9); (b) não vender pela tela: a validade aparece só no detalhe, no comprovante e no pagamento, e a venda de pacote segue pela tabela genérica; (c) abrir nó separado para a venda de pacote antes deste | **(a)**. Sem tela de venda não há onde a informação seja **prévia** (o requisito é na compra). (b) não cumpre o F-JUR-4; (c) só adia o mesmo trabalho e prende o deploy em dois nós | PENDENTE |
| **F-FE-PV-2** | Onde o aceite mora | (a) **campo na venda** (linha da DynamicTable de vendas): 1:1 com a compra, mas a prova fica numa linha editável e apagável pela tela genérica, e entidade com valor legal na DynamicTable fere o Contrato §2.1; (b) **colunas no saldo** (`CustomerPackageBalance`): Prisma, mas o saldo é um por cliente × pacote e a recompra junta tudo (F3): o aceite da 2ª compra **sobrescreve** o da 1ª e a prova da 1ª some; (c) **tabela própria append-only** `PackageValidityAcceptance`, uma linha por venda (§4.1) | **(c)**. É a única que guarda uma prova por compra e não deixa editar. Custo: migração aditiva + cadeia completa de camadas (PR-1). (a) e (b) são o que o pedido nomeou; os dois perdem prova num caso comum (edição da venda; recompra) | PENDENTE |
| **F-FE-PV-3** | "Quem" aceita, e como | (a) o operador marca *"Li este texto ao cliente e ele concordou"*; o registro guarda o usuário logado, o cliente da venda e a hora do servidor; (b) (a) **+ linha de assinatura do cliente no comprovante impresso**, guardado em papel pelo salão; (c) aceite do próprio cliente por canal digital (link/código) | **(b)**. O checkbox sozinho é declaração do próprio salão; a assinatura do cliente no papel é a prova que o jurídico descreve ("cabe ao salão provar"). Custo marginal: o comprovante já existe no item 13. (c) não tem canal de saída (BE BRIEF §1 P13) | PENDENTE |
| **F-FE-PV-4** | De onde vêm o texto e a data mostrados na venda | (a) **endpoint de prévia no BE** (item 3) que usa o `lastValidDay` e o template versionado; o FE mostra o texto literal e devolve o hash no aceite; (b) mostrar só "N dias corridos", sem data; a data exata aparece depois do crédito; (c) portar `lastValidDay` e o texto para o FE | **(a)**. Uma fonte para a data (com feriado) e para o texto; o hash prova que o texto gravado é o mostrado. (b) informa menos que o cliente vai ver depois; (c) duplica a tabela de feriados e o texto, e os dois derivam | PENDENTE |
| **F-FE-PV-5** | Qual é o comprovante | (a) página imprimível da venda (`@media print`, `window.print`), sem dependência nova; (b) PDF gerado no servidor (dependência nova); (c) só o painel de detalhe, sem impressão | **(a)**. Cumpre "comprovante" com fonte em `pt` real na impressão e sustenta a assinatura do F-FE-PV-3 b. (b) só vale se o salão precisar enviar o arquivo, e não há canal (P13). (c) não dá ao cliente nada que ele leve | PENDENTE |
| **F-FE-PV-6** | Venda de pacote com validade e sem aceite | (a) o FE trava "Criar venda" sem o checkbox, e a venda sem aceite (falha de rede, venda feita por outro caminho) mostra o selo "aceite não registrado" com botão para registrar (item 12); (b) o servidor recusa a venda sem aceite: exige mexer no plugin de itens de venda para ler a tabela Prisma (fere o §2.1) **ou** um endpoint orquestrador novo de "venda de pacote"; (c) só a trava do FE, sem selo | **(a)**. A falta de aceite é risco de prova, não de dado contábil; deixar visível e corrigível basta, sem cruzar o motor. (b) é o mais forte e o mais caro: se o dono quiser, o caminho limpo é o orquestrador, não o plugin | PENDENTE |
| **F-FE-PV-7** | Texto v1 da cláusula | (a) o texto proposto no §4.3; (b) o dono redige; (c) texto editável por unidade | **(a)**, com o dono podendo trocar palavras na ratificação. Diz prazo, data de início, último dia, a regra do feriado e que **o saldo não usado não é devolvido** (é a mitigação do F-JUR-3). (c) faz cada salão poder apagar a informação que protege o próprio salão | PENDENTE |

### 5.1 RATIFICAÇÃO — 2026-10-05 (dono, questionário; pedido: *"Onde o aceite mora (...) é fork — vai a mim por questionário"*)

Registro: [`D-2026-10-05-FE-PACOTE-VALIDADE-FORKS`](../plano/decisoes/D-2026-10-05-FE-PACOTE-VALIDADE-FORKS.md).

| Fork | Resposta do dono (literal) | Contra? | Efeito |
|---|---|---|---|
| F-FE-PV-1 | *"Nó separado antes"* | **sim** | Item 9 sai; nasce [[FE-INCR-VENDA-PACOTE]] (nota + BRIEF nesta sessão, pela resposta *"Nota + BRIEF agora"*); este nó depende dele |
| F-FE-PV-2 | *"Tabela própria (Recommended)"* | não | §4.1 como escrito; itens 1, 4, 5 |
| F-FE-PV-3 | *"Checkbox + assinatura (Recommended)"* | não | Itens 10 e 13 como escritos |
| F-FE-PV-4 | *"Prévia no BE + hash (Recommended)"* | não | Itens 2, 3, 4, 10 como escritos |
| F-FE-PV-5 | *"pdf imprimível"* (texto livre) | **sim** | Item 13 reescrito: PDF no servidor pelo pipeline existente (F12b). **Leitura do agente:** "PDF que se imprime", não "página que o navegador imprime". A opção (b) foi descrita como "dependência nova", o que era falso (F12b); o dono escolheu o PDF mesmo com o custo inflado, então a correção não muda o sentido da escolha. Se a intenção foi outra, é emenda |
| F-FE-PV-6 | *"Trava no FE + selo (Recommended)"* | não | Itens 10 e 12 como escritos; sem gate no servidor |
| F-FE-PV-7 | *"Texto proposto (Recommended)"* | não | §4.3 vira o texto v1 |

**Nenhum fork pendente.** PE-FE-1..3 seguem dado externo (jurídico, sobre a forma) e não travam nada sem decisão do
dono.

## 6. Pendente de validação externa (follow-up; nada disto entra no checklist como decidido)

| # | Pergunta | A quem | Pesa em |
|---|---|---|---|
| **PE-FE-1** | A redação do texto v1 (§4.3) cumpre "informação prévia, ostensiva e com destaque"? A frase "não será devolvido" está bem posta diante do STJ (perda integral) e do F-JUR-3? | jurídico | F-FE-PV-7 |
| **PE-FE-2** | "Corpo 12" (CDC 54 § 3º) é medida de impresso. Na tela, este BRIEF lê 12pt = 16px (F14). É assim que se aplica? | jurídico | itens 8, 10, 13, 16 |
| **PE-FE-3** | Checkbox do operador + assinatura do cliente no comprovante (F-FE-PV-3 b) bastam como "aceite registrado"? | jurídico | F-FE-PV-3 |

O PE-6 foi fechado pelo dono com o dossiê (F-JUR-0). Estas três são perguntas novas, sobre a forma; não travam nada
sem decisão do dono.

## 7. Insumos ausentes (pausa nesses trechos; regra 2, sem varredura)

- **I1.** O formulário genérico de DynamicTable mostra o `description` do campo? (F11 prova que o campo existe no
  schema, não que a tela o desenha.) Decide se o item 14 é só preset.
- **I2.** Mudar o rótulo/`description` no preset chega às tabelas `Packages` **já criadas**, ou o schema é copiado na
  criação? Se é copiado, o item 14 precisa de migração de schema das tabelas existentes ou de código no FE.
- **I3.** O tenant tem mais de um usuário (funcionários com login próprio), ou a equipe usa um login só? Se é um só,
  "quem" no registro é a conta do salão, e a assinatura do F-FE-PV-3 b passa a ser a única identificação de pessoa.
- **I4.** A data da venda pode ser editada depois de criada? Se pode, o `expiresOn` do aceite e o do saldo (que o
  crédito calcula da data no momento da finalização) podem divergir. Se for o caso, o item 12 mostra os dois.

## 8. Achados fora de escopo (registrados, não planejados)

- **Lista "vencendo"** (BE BRIEF §8; o filtro `expiresOnOrBefore` já existe no #483). Não foi pedida e o aviso não é
  obrigatório (F-JUR-5).
- **Criação de venda não atômica** (F9): venda e itens em chamadas separadas, já hoje. Este nó convive com isso
  (item 11).
- **Venda de pacote pela tabela genérica ou pela API** fura a trava do FE. O selo do item 12 a torna visível; fechar
  o caminho é o F-FE-PV-6 b.
- **`ListPackageBalancesQuerySchema` sem `.strict()`**: já registrado no BE BRIEF §8.

## 9. Riscos desta entrega (incluindo vieses próprios)

- **Maior risco de escopo:** o F-FE-PV-1. O pedido falou em "mostrar a validade na venda", e a venda de pacote não
  existe no FE. Com (a), o nó cresce uma variante inteira de wizard; sem ela, o F-JUR-4 não fecha.
- **Maior risco de prova:** a mesma pessoa (o operador) informa e registra. Sem a assinatura (F-FE-PV-3 b), o
  registro prova que o sistema mostrou o texto, não que o cliente leu.
- **Dependência dura:** o nó [[FE-INCR-VENDA-PACOTE]] (F-FE-PV-1 c) e, por baixo dele e deste, o #483 (`expiresAt` preenchido, `PACKAGE_BALANCE_EXPIRED`,
  `lastValidDay` com feriado). ⟨05/10⟩ O #483 entrou em `main` (`2d1ddbe5`); resta o nó da venda.
- **Viés declarado:** este BRIEF puxa o texto e a data para o servidor (F-FE-PV-4 a) por gosto de fonte única; o
  custo é um endpoint a mais. Também tende a recomendar a tabela própria (F-FE-PV-2 c) contra os dois caminhos que o
  dono nomeou; o motivo (perda de prova na recompra e na edição) está escrito para ele julgar.
- **Checagem que teria falhado se a premissa estivesse errada:** "o FE não vende pacote" se apoia em
  `sales.types.ts:46,66` (`'Product' | 'Service'`) e no `FinanceService` sem `packageId`. Se houvesse outro caminho
  de venda de pacote no `my-app`, o grep por `packageId` em `features`, `lib`, `pages` e `components` teria achado
  um uso fora do pagamento. **Rodado:** 5 arquivos, todos do pagamento com saldo (`SaleActionModals`,
  `useSalesData.ts:135-142`, `packageBalances.service`, `sales.service.ts:32` e o teste dele).

## Fontes

- Decisões: [`D-2026-10-04-PACOTE-VALIDADE-TRIAGEM-JURIDICO`](../plano/decisoes/D-2026-10-04-PACOTE-VALIDADE-TRIAGEM-JURIDICO.md)
  (F-JUR-4, pergunta 4); [`D-2026-10-02-PACOTE-VALIDADE-FORKS`](../plano/decisoes/D-2026-10-02-PACOTE-VALIDADE-FORKS.md).
- BRIEF vizinho: [`BE-INCR-PACOTE-VALIDADE-brief.md`](BE-INCR-PACOTE-VALIDADE-brief.md) §1, §5.3, §8.
- Código: `origin/main` `84d6d6ab`; `origin/feat/be-incr-pacote-validade` `fa9a27f5` (#483).
