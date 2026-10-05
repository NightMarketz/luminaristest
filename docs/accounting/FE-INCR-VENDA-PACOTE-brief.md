# FE-INCR-VENDA-PACOTE — vender pacote pré-pago pelo wizard de venda (PLANO, não executar)

## 0. Cabeçalho

- **Item:** nó [`FE-INCR-VENDA-PACOTE`](../plano/nos/FE-INCR-VENDA-PACOTE.md), aberto pelo F-FE-PV-1 (c) de
  [`D-2026-10-05-FE-PACOTE-VALIDADE-FORKS`](../plano/decisoes/D-2026-10-05-FE-PACOTE-VALIDADE-FORKS.md): o FE não vende
  pacote, e o dono escolheu um nó próprio, **antes** do [`FE-INCR-PACOTE-VALIDADE`](FE-INCR-PACOTE-VALIDADE-brief.md).
- **Autorização:** dono, chat, 05/10/2026, questionário. Pergunta: *"Abro agora a nota do nó da venda de pacote no FE
  (FE-INCR-VENDA-PACOTE, só a nota, sem BRIEF), com este nó dependendo dele?"* Resposta: *"Nota + BRIEF agora"* (a
  opção dizia: *"Planeja também a variante Pacotes do wizard nesta sessão (sem 'executa')"*). **Autoriza a nota e
  este BRIEF, não o código.**
- **Forks F-FE-VP-1..3 ✅ RATIFICADOS 05/10** (§5.1), mais o sub-fork 1b que a resposta abriu. **Contra a
  recomendação: F-FE-VP-1** (preço editável, com regra de desconto e marca de venda acima do catálogo), **F-FE-VP-2**
  (permitir a troca de pacote pago com saldo de outro), **F-FE-VP-3** (quantidade N). Não é "executa".
- **Escopo:** FE, mais **um campo novo no preset de vendas** (a marca do F-FE-VP-1b). Vender pacote **já funciona no servidor** (item `Package` na tabela de itens mista, ponte
  `sale.package.sold`, crédito do saldo). O que falta é a tela. A validade em destaque e o aceite **não** são deste nó
  (são os itens 10–13 do vizinho, que se apoia na variante daqui).
- **Base:** `origin/main` `84d6d6ab`. Código lido em 04/10. Não depende do #483.

## 1. Fatos (grau: **V** = lido no código nesta sessão · **I** = inferido)

| # | Fato | Evidência | Grau |
|---|---|---|---|
| V1 | O wizard tem duas variantes, `products` e `services`; `setVariant` limpa os itens ao trocar (o servidor exige venda homogênea) | `hooks/sales/useSalesWizard.ts:33,131-134` | V |
| V2 | A variante é detectada pelo schema da tabela de itens: `mixed` se tem `productId` **e** `serviceId`. `packageId` não entra na detecção | `SalesCreateModal.tsx:40-46` | V |
| V3 | Só o preset `SalesItemsMixed` tem `packageId` (opcional) e `itemType`; as tabelas só-produto e só-serviço não vendem pacote | `presets/modules/finance/SalesItemsMixed.ts:2,16,19`; `grep -c packageId` em `SalesItemsProductsOnly.ts` e `SalesItemsServicesOnly.ts` → 0 e 0 | V |
| V4 | O servidor valida: item com exatamente um entre `productId`/`serviceId`/`packageId`; `type: 'Package'` exige `packageId`; venda all-Package com **um só** `packageId` distinto (mesmo `packageId` em várias linhas é aceito) | `rules/plugins/sales/saleItems.ts:104-126,139-164` | V |
| V5 | `addItem` deriva `itemType` da variante (`'Service'` ou `'Product'`); `canSubmit` exige `productId` ou `serviceId` e preço > 0 | `useSalesWizard.ts:140-151,192-203` | V |
| V6 | Tipos: `itemType`/`type` são `'Product' \| 'Service'`; o `FinanceService` monta o item sem `packageId`. Quantidade só conta para `Product` | `types/sales.types.ts:46-47,66`; `FinanceService.ts:31-43`; `useSalesWizard.ts:175,218` | V |
| V7 | **Venda de pacote sem `customerId` lança o passivo e não credita o saldo** (`logger.warn` e segue): o 2.1.1 fica com valor que nenhum saldo explica | `SalePackageSoldBridge.ts:92-106` | V |
| V8 | O crédito do saldo é o `totalAmount` da venda (depois do desconto), não o preço do catálogo | `SalePackageSoldBridge.ts:68,99` | V |
| V9 | A ponte só age em venda `Finalized`; o wizard cria `Draft` ou `Finalized` | `SalePackageSoldBridge.ts:45-46`; `useSalesWizard.ts:232` | V |
| V10 | Produto pega o preço do `stockIndex`; serviço não preenche preço (o operador digita). O `RelationSelector` devolve só o id | `SaleItemsManager.tsx:147-163` | V |
| V11 | O catálogo `Packages` tem `name`, `price` (rótulo `Package Price`), `validityDays`, `active` | `PackageCatalogModule.ts:24-44` | V |
| V12 | A forma de pagamento do cabeçalho vem das `options` do campo `paymentMethod` do schema de vendas; o pagamento depois tem `Package Balance` | `SalesCreateModal.tsx:133-137`; `lib/services/sales.service.ts:29` | V |
| V13 | **O servidor aceita pagar uma venda de pacote com saldo de pacote**: o `RegisterPaymentService` não olha o tipo da venda; só exige `packageId` e saldo suficiente. Efeito: o saldo A é debitado e o B (o pacote vendido) é creditado na finalização, com prazo novo | `RegisterPaymentService.ts:65-117` | V (o código) / I (o prazo novo: F-PV-2 a, recompra renova) |

## 2. Fronteira com o vizinho

| Assunto | Dono |
|---|---|
| Vender um pacote pela tela (variante, seletor, preço, cliente obrigatório, payload) | **este nó** |
| Mostrar a validade em destaque, o texto, o checkbox de aceite, gravar o aceite, comprovante PDF | [[FE-INCR-PACOTE-VALIDADE]] (itens 10–13) |
| Prazo, crédito, vencimento, NFS-e do vencido | [[PACOTE-VALIDADE]] (#483) |

**Ordem de produção (risco):** ⟨05/10⟩ o #483 entrou em `main` em 04/10 (`2d1ddbe5`). Se `main` for a produção com
este nó e sem o FE-INCR-PACOTE-VALIDADE, a tela vende pacote com validade sem informar ao cliente. O que segura isso
hoje é o deploy (M2) esperar o nó de validade (F-JUR-4), não o código.

## 3. Checklist (cada item testável sozinho; a forma final segue os forks do §5)

1. **Variante `packages`:** `SaleItemsVariant`/estado do wizard ganham `'packages'`. A opção "Pacotes" aparece no
   seletor de tipo **só** quando o schema da tabela de itens tem `packageId` (V2/V3); trocar para ela limpa os itens
   (V1). Testes: schema com `packageId` → 3 opções; sem → 2; troca limpa os itens.
2. **Índice do catálogo:** hook `usePackageCatalog(targetTable)` carrega a tabela-alvo do campo `packageId` uma vez
   (id → `{ name, price, validityDays, active }`), pelo cliente de DynamicTable que o `stockIndex` já usa. Teste: o
   mapa sai do retorno da tabela.
3. **Item de pacote:** na variante `packages`, `addItem` cria `itemType: 'Package'`, com **quantidade editável ≥ 1**
   (F-FE-VP-3 b; a quantidade passa a contar no subtotal para `Package` também, V6), e o seletor usa o
   `RelationSelector` com o `targetTable` de `packageId`. Pacote com `active: false` não é escolhível (pausa: §7 I1).
3a. **Preço (F-FE-VP-1, resposta do dono):** escolhido o pacote, o preço unitário vem do catálogo e **pode ser
   editado para cima**. **Abaixo do catálogo não:** a tela recusa o valor e manda usar o campo de desconto da venda
   (*"Para cobrar menos que o catálogo, use o campo Desconto."*). Testes: preço menor que o catálogo bloqueia o
   envio; igual ou maior passa.
3b. **Marca "venda acima do catálogo" (F-FE-VP-1b = flag na venda):** campo booleano novo `aboveCatalogPrice` no
   preset de vendas (`SalesModule.ts`), opcional, default `false`. O wizard grava `true` quando algum item de pacote
   sai com preço unitário maior que o do catálogo no momento da venda. O `SalesTable` e o `SaleDetailPanel` mostram a
   etiqueta *"Acima do catálogo"*. Testes: payload com `true`/`false` nos dois casos; etiqueta aparece só com `true`.
   O valor do catálogo **não** é guardado (escolha do dono: flag, não snapshot). Pausa: §7 I3.
4. **Um pacote por venda (V4):** a tela não deixa adicionar um segundo pacote diferente. Teste: o 2º `packageId`
   diferente é recusado na tela antes do servidor.
5. **Cliente identificado obrigatório (V7):** na variante `packages`, o "cliente simples" fica desligado e
   `canSubmit` exige `customerId`, com a frase *"Pacote precisa de cliente cadastrado: o saldo fica no nome dele."*
   Testes: sem cliente → não submete; ligar a variante desliga o cliente simples.
6. **Payload:** `NewSaleItem.itemType`, `SaleItemData.type`/`itemType` ganham `'Package'` e `packageId`; o
   `FinanceService` manda `{ type: 'Package', packageId, quantity, unitPrice }`. A quantidade de `Package` deixa de
   ser forçada a 1 nos três lugares que hoje só contam `Product` (`FinanceService.ts:37`, `useSalesWizard.ts:175,218`),
   e o subtotal soma o pacote. Teste do
   payload (uso de função com retorno declarado: memória `map-sem-anotacao-escapa-excess-property`).
7. **Forma de pagamento (F-FE-VP-2 = permitir a troca):** `Package Balance` **continua** disponível numa venda de
   pacote (o servidor já aceita, V13). Uma restrição de bom senso, sem fork: no `SalePaymentModal` de uma venda de
   pacote, **o próprio pacote vendido não aparece** como saldo para pagar a si mesmo (se a venda já foi finalizada, o
   saldo dele já existe e pagaria a própria compra). Teste: a lista de saldos da venda do pacote B não mostra o B.
8. **Detalhe da venda:** o `SaleDetailPanel` mostra o tipo `Package` (chave `finance_view:sales.items.type_package`)
   e o nome do pacote. Teste.
9. **i18n:** paridade pt/en das chaves novas (gate do `skill-audit wiring`).
10. **Verificação contra build de produção** (`withAuth`, `my-app/CLAUDE.md`) e **runbook em branco** para o
    sign-off de browser (gate humano): vender pacote `Finalized` para cliente cadastrado → o saldo aparece no
    pagamento de uma venda de serviço do mesmo cliente. O agente prepara; não preenche nem assina.

## 4. Contratos (esboço)

```ts
// features/dashboard/category-views/finance/types/sales.types.ts
export type SaleItemsVariant = 'products' | 'services' | 'mixed';          // schema (inalterado)
export type WizardVariant = 'products' | 'services' | 'packages';          // escolha do usuário
type SaleItemKind = 'Product' | 'Service' | 'Package';
interface NewSaleItem { id: string; itemType?: SaleItemKind; productId?: string; serviceId?: string;
                        packageId?: string; quantity?: number; unitPrice?: number; /* … */ }
interface SaleItemData { type?: SaleItemKind; itemType?: SaleItemKind; packageId?: string; /* … */ }

// hooks/sales/usePackageCatalog.ts
export interface PackageCatalogEntry { name: string; price: number; validityDays: number | null; active: boolean }
export function usePackageCatalog(targetTable: string): Record<string, PackageCatalogEntry>;

// SalesCreateModal: detecção
const canSellPackages = schemaFieldNames.has('packageId');   // V2/V3

// SaleData (venda): F-FE-VP-1b
interface SaleData { /* … */ aboveCatalogPrice?: boolean }
```

```ts
// server/src/features/dynamicTables/presets/modules/finance/SalesModule.ts — campo novo (F-FE-VP-1b)
{ name: 'aboveCatalogPrice', label: 'Above catalog price', type: 'boolean', required: false, defaultValue: false, searchable: false }
```

Nenhum endpoint, DTO Zod ou modelo Prisma muda. O preset muda (um campo).

## 5. Forks — ✅ RATIFICADOS 2026-10-05 (escolhas e efeitos em §5.1; a tabela abaixo é a proposta original)

| Fork | Pergunta | Caminhos | Recomendação | Status |
|---|---|---|---|---|
| **F-FE-VP-1** | Preço do pacote na venda | (a) vem do catálogo e **fica travado** (desconto pelo campo de desconto da venda); (b) vem do catálogo e é editável, como produto; (c) o operador digita, como serviço | **(a)**. O crédito do saldo é o total da venda (V8): um erro de digitação no preço vira saldo errado do cliente e passivo errado. O desconto continua possível e fica visível como desconto | PENDENTE |
| **F-FE-VP-2** | `Package Balance` como forma de pagamento de uma venda de pacote (comprar pacote com saldo de outro pacote) | (a) esconder no cabeçalho e no pagamento quando a venda é de pacote; (b) deixar | **(a)**. Pagar o pacote B com o saldo do A troca um passivo por outro; o tratamento contábil disso não foi lido nem validado (regra 3), e nada no pedido pede esse caminho | PENDENTE |
| **F-FE-VP-3** | Quantidade | (a) fixa em 1; (b) permitir N do mesmo pacote (o servidor aceita; o saldo recebe o total) | **(a)**. Um pacote por venda casa com um aceite por venda (F-FE-PV-2 c) e com o texto da validade; N iguais é a mesma coisa que vender um pacote maior | PENDENTE |

### 5.1 RATIFICAÇÃO — 2026-10-05 (dono, questionário)

Registro: [`D-2026-10-05-FE-PACOTE-VALIDADE-FORKS`](../plano/decisoes/D-2026-10-05-FE-PACOTE-VALIDADE-FORKS.md).

| Fork | Resposta do dono (literal) | Contra? | Efeito |
|---|---|---|---|
| F-FE-VP-1 | *"Catalogo, editável pq é possivel vender mais caro que o catalogado, mas desconto obrigatoriamente marcado como desconto, quem vende acima do catalogado tbm tem tag de venda acima"* | **sim** | Itens 3a e 3b |
| F-FE-VP-1b | *"Flag na venda"* (pergunta aberta pela resposta acima: snapshot no item × calcular na exibição × flag) | contra a recomendação (snapshot) | Item 3b: booleano no preset de vendas, sem guardar o preço do catálogo |
| F-FE-VP-2 | 1ª rodada: *"Não faz sentido, preciso de mais informações"*. Reformulada com o efeito concreto (V13: o saldo velho vira saldo novo com prazo novo e o valor nunca vence): *"Permitir a troca"* | **sim** | Item 7: a opção fica; o pacote vendido não paga a si mesmo; PE-VP-1 ao contador; risco no §9 |
| F-FE-VP-3 | *"Permitir N"* | **sim** | Item 3: quantidade editável ≥ 1 |

**Nenhum fork pendente.**

## 6. Pendente de validação externa

| # | Pergunta | A quem | Pesa em |
|---|---|---|---|
| **PE-VP-1** | **Troca de pacote** (F-FE-VP-2 = permitir): o cliente paga o pacote B com o saldo do pacote A. Os lançamentos são os de hoje (consumo de A: D 2.1.1 / C 1.1.2; venda de B: D 1.1.2 / C 2.1.1). Isso é **uso** do saldo A (não há receita por não uso) ou é renovação de prazo que deveria ser tratada de outro jeito? E na NFS-e: o pacote B em `VENDA` emite nota sobre um valor que já era pré-pago? | contador | Item 7; o reconhecimento da receita por não uso do PACOTE-VALIDADE |

## 7. Insumos ausentes (pausa nesses trechos; sem varredura)

- **I1.** O `RelationSelector` aceita filtro (para esconder `active: false`) ou tudo tem de ser filtrado pelo índice do
  item 2? Decide a forma do item 3, não o comportamento.
- **I3.** Campo novo no preset (`aboveCatalogPrice`, item 3b) chega às tabelas de vendas **já criadas**, ou o schema é
  copiado na criação? Mesmo insumo I2 do BRIEF vizinho. Decide se o item 3b é só preset ou precisa de atualização de
  schema das tabelas existentes.
- **I2.** Quais tenants têm a tabela de itens no preset `Mixed`? Se o seed do 1º cliente usa só-serviço, a opção
  "Pacotes" não aparece para ele (V3) e a migração de schema da tabela é outro assunto. Não medido no `dev.db`.

## 8. Achados fora de escopo (registrados, não planejados)

- **V7 é furo de dado, não só de tela:** venda de pacote `Finalized` sem cliente pela tabela genérica ou pela API
  lança o 2.1.1 sem saldo. O item 5 fecha o caminho da tela; o servidor continua aceitando. Candidato a
  instrumentação (GAP-MAP), se o dono quiser.
- **A regra "abaixo do catálogo só por desconto" e a marca `aboveCatalogPrice` valem só na tela.** Pela tabela
  genérica ou pela API, o preço pode sair abaixo do catálogo sem desconto e a marca pode mentir. Se o dono quiser,
  vira gate no servidor (plugin de itens de venda, que já lê o catálogo para outras regras; não cruza o §2.1).
- **Criação de venda não atômica** (`FinanceService.ts:23,31-49`): já registrada no BRIEF vizinho §8.

## 9. Riscos (incluindo vieses próprios)

- **Maior risco:** o I2. Se o 1º cliente não tem a tabela mista, este nó entrega uma opção que não aparece para ele.
- **Risco de produto aceito pelo dono (F-FE-VP-2):** com a troca permitida, um saldo perto de vencer pode virar um
  pacote novo com prazo novo, e a receita por não uso do PACOTE-VALIDADE deixa de acontecer para quem troca. Foi
  explicado com exemplo antes da resposta. O PE-VP-1 pergunta ao contador como isso se lança.
- **Viés declarado:** as recomendações originais estreitavam a tela (preço travado, sem saldo como pagamento,
  quantidade 1); o dono escolheu o contrário nas três. Puxei para "um aceite por venda"; com N, o aceite continua
  um por venda (um `packageId`), e o texto diz "este pacote" mesmo para N unidades. Se isso incomodar, é emenda do
  texto v1 (F-FE-PV-7).
- **Checagem que teria falhado se a premissa estivesse errada:** "o FE não vende pacote" foi testado por grep de
  `packageId` em `features`, `lib`, `pages`, `components`: 5 arquivos, todos do pagamento com saldo.

## Fontes

- Decisão: [`D-2026-10-05-FE-PACOTE-VALIDADE-FORKS`](../plano/decisoes/D-2026-10-05-FE-PACOTE-VALIDADE-FORKS.md).
- BRIEFs vizinhos: [`FE-INCR-PACOTE-VALIDADE-brief.md`](FE-INCR-PACOTE-VALIDADE-brief.md),
  [`BE-INCR-PACOTE-VALIDADE-brief.md`](BE-INCR-PACOTE-VALIDADE-brief.md) §1 (P2, P4).
- Código: `origin/main` `84d6d6ab`.
