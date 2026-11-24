# BE-INCR-CENTAVOS-EXATOS — um conversor reais→centavos, arredondamento decimal exato em razão e subrazão (BRIEF; ainda sem nó no vault)

> **Sessão:** `sessao-planejamento` — produz decisão, não código. Fork **não** se auto-ratifica; todos os forks abaixo estão
> **RATIFICAÇÃO PENDENTE**.
> **Origem:** lacuna `L-20261124-062159-5b0a` (classe `fork`, nó X14), com as irmãs `L-20261124-062159-9d1e`
> (`splitRevenueCredit`) e `L-20261124-062201-33b2` (`NfeIbsCbsDto` escala). Surgiram na onda 2.3 da auditoria
> fiscal/contábil de 24/11/2026 (PR #1360, **ainda não mergeado**).
> **Autorização (ORCH-006 — leia antes de usar):** **não há citação do dono que autorize planejar este item.** A sessão foi
> aberta pela sessão-mãe (orquestração) a pedido do usuário, para produzir este BRIEF e levar os forks à pergunta do dia.
> `D-2026-11-11-LACUNA-VAI-AO-MAESTRO` §2 manda a lacuna de classe `fork` **ao dono** (`com-dono`), não a uma sessão; a frase do
> dono de 11/11 (*"o orquestrador já vai lançar outras sessões que vão resolver essas lacunas"*) cobre as demais classes, e
> citá-la aqui como autorização do BRIEF seria esticá-la. Por isso: (i) o BRIEF é só documento, sem código; (ii) **não foi
> criada nota em `docs/plano/nos/`** (isso diria, no vault, que há autorização) — o write-set está em §7 para quando o dono
> autorizar o nó; (iii) todos os forks estão **RATIFICAÇÃO PENDENTE**. Cada PR de código pede o `executa` do dono.
> **Base:** `origin/main` `7b9225e23` (re-fetch 2026-11-24). Todo `arquivo:linha` abaixo é desse commit; o #1360 move
> parte deles (§1, grupo A5).
> **Escopo:** backend.

## 0. Correção da premissa (lida e rodada nesta sessão)

A lacuna e o teste do #1360 dizem "86,655 → 8665; o decimal exato daria 8666". São **dois fatos diferentes**:

| Entrada | `Math.round(x*100)` hoje | meio-para-cima sobre o **texto** de `String(x)` | por quê |
|---|---|---|---|
| literal `1.005` | 100 | **101** | `1.005*100 = 100.49999999999999` |
| literal `0.285` | 28 | **29** | `0.285*100 = 28.499999999999996` |
| literal `86.655` | **8666** | 8666 | `86.655*100 = 8665.5` (o float cai no meio, `Math.round` sobe) |
| `0.333*10 + 2.5*33.33` (o "86,655" do teste do #1360) | 8665 | **8665** | o valor **calculado** é `86.65499999999999`; o texto já traz o erro |

Conclusões, todas com medida (`node -e`, reprodutível em §6):
1. Um conversor "por texto/BigInt" corrige **só valor que já chega como decimal curto** (`1.005`). Em amostra de 10 000 valores
   `x,xx5`, 5,7 % diferem do `Math.round`; em amostra qty×preço (6 quantidades × R$ 0,01..99,99), 2,65 %.
2. Valor **calculado em float** (`qty × preço`, soma de linhas, desconto) chega ao conversor já com o ruído e o texto não o
   desfaz. O "86,655 → 8666" só existe se a conta for feita em aritmética decimal **antes** de virar float. A raiz é a
   origem: `SalesPlugin.ts:155,341,346` soma `qty*price` em float e grava `totalAmount` (money no DynamicTable é float JSON —
   limite conhecido), e `bridges/saleItems.ts:214,268` repete `quantity × unitPrice`. Por isso a opção estrutural tem **duas
   camadas** (§2).
3. A 9d1e (`splitRevenueCredit`) é outra mecânica: float na **proporção**, não na conversão. Em 800 000 vendas simuladas de 2
   casas (com e sem desconto de cabeçalho) diferiu em 5 (0,001 %), mas o caso existe em valor ordinário (`10` centavos entre
   `0,01` e `0,19`: float dá 0/10, meio-para-cima dá 1/9).

## 1. Todos os pontos de conversão (`rg` + cbm `search_graph`/`trace_path`, **confirmados lendo o arquivo**)

cbm: `centsFromReais` tem 3 chamadores, todos em `accountingBinding/interpreter/interpret.ts`; `reaisToCents` aparece com 1
(`SaleFiscalGuardService`) — o `rg` achou mais um (`discountGuard.ts`, que importa com alias `toCents`), o que confirma
[CBM-001]: o grafo localiza, não prova. `splitRevenueCredit` tem 3: `SaleFinalizedMapper.map`, `ratearReceita`,
`interpret.buildRevenueSplitLines`. **Correção do pedido ("os 4 mappers de venda"):** em produção o razão **não** passa pelos 4 mappers. `lib/factory.ts:455-465`
(`buildSaleAccountingMappers`, usado em `:1389`) e `AccountingBindingFeederService.ts:95` montam o `AccountingSyncService` só
com `InterpretedEventMapper` (→ `interpret()` → `centsFromReais` e `splitRevenueCredit`); nenhum código fora de teste faz
`new SaleFinalizedMapper(...)` etc. (`rg` sem corte; `factory.ts:262` diz que as classes "continuam" só como referência). Os 4
mappers são a **referência do `goldenPhase0/1.test.ts`**, que compara mapper-à-mão × intérprete byte a byte. Logo o conversor vivo
do razão é o **A2**, e os mappers (A3) têm de virar **no mesmo PR** só para os goldens continuarem verdes — o que, de brinde, é
uma trava: virar um lado sem o outro reprova `goldenPhase0/1`.

**Grupo A — o mesmo fato (valor da venda em reais) vira centavos em mais de um lugar; têm de arredondar igual.** (A6 vem com grau: a necessidade de bater com o razão é **assumida**, não lida em teste.)

| # | Ponto | Arquivo:linha | Fala com |
|---|---|---|---|
| A1 | `reaisToCents` (canônico, com `MAX_CENTS`) | `lib/saleLine.ts:31` | `SaleFiscalGuardService.ts:42`; `discountGuard.ts:30,43,66,74` (alias `toCents`); #1360: `ratearReceita`, `ReceitaFiscalRecebimentoService` |
| A2 | `centsFromReais` — **o conversor vivo do razão** (via `InterpretedEventMapper`) | `accountingBinding/interpreter/money.ts:37` (usado em `interpret.ts:107`; `interpret.buildRevenueSplitLines` chama o A4) | `InterpretedEventMapper.ts:51`, `BindingValidationService` (dry-run) |
| A3 | os 4 mappers de venda — **referência dos goldens, sem instância em produção** | `SaleFinalizedMapper.ts:38`, `SalePackageSoldMapper.ts:34`, `SaleReturnedMapper.ts:38`, `SaleSettledMapper.ts:58` | `goldenPhase0/1.test.ts` (byte a byte contra o A2) |
| A4 | `splitRevenueCredit` (proporção em float) | `sync/mappers/revenueSplit.ts:45` | `SaleFinalizedMapper`, `ratearReceita`, `interpret` (9d1e) |
| A5 | subrazão fiscal (na `main`) | `ReceitaFiscalService.ts:51` (total), `:75` (proporção), `:127` (cota de parceria); `ReceitaFiscalRecebimentoService.ts:40` | `tieOut` (`:219`) compara Σ `ReceitaFiscalLinha` × (C−D) de 3.1+3.3+3.2. O #1360 troca `:51` e `:40` por `reaisToCents` (lido na branch) e `:75` por `divHalfUp`; **depois dele A5 herda o conversor do A1 sem mais mudança** |
| A6 | pontes, serviços e jobs que reconvertem o mesmo `totalAmount` (exceto `CrmReceivableBridge:247`, que converte `fact.amount` da oportunidade — outro fato, mesma função de converter) | `SalePackageSoldBridge.ts:104`, `PackageAcceptanceService.ts:165` (PDF do recibo), `RegisterPaymentService.ts:163`, `accountingSyncReconcile.job.ts:1309,1436`, `CrmReceivableBridge.ts:247`, `bridges/saleItems.ts:289` (desconto incondicional) | saldo de pacote × razão (assumido: não li o teste que os cruza); `SaleReversalBridge.ts:155-160` remonta o evento de devolução com o `totalAmount` **atual** da venda |

**Grupo B — onde o float nasce (origem).** `SalesPlugin.ts:155,341,346`; `bridges/saleItems.ts:98,214,268`
(`lineValueReais`); `discountGuard.ts:44` (`Math.round(qty × catalogCents)`); `InventoryService.ts:255` (custo médio ×
quantidade fracionária; o #1360 já o tratou).

**Grupo C — texto decimal de documento fiscal (outra classe: vem como string do XML/DTO, não do DynamicTable).**
`NfeIbsCbsDto.ts:213-221` (33b2: `escala`, `vezesPct`, `aliqEfet10k`), `:415`; `NfePayloadDto.ts:220`;
`FiscalDocumentEmissionService.ts:503`; `models/nfeIbsCbsMontagem.ts:104,108,141` (o #1360 já passou a montagem para BigInt).

**Grupo D — não é conversão de dinheiro do razão (fora):** `analytics/utils/CurrencyUtils.ts:7` (KPI), `commissions.ts:58`
(taxa), percentuais de analytics.

## 2. Opções (regra do dono 21/11: estrutural primeiro, versão incremental, remendo só como alternativa)

**E — estrutural.** Causa raiz no dono do dinheiro: (i) **um** núcleo puro de conversão em `lib/decimalMoney.ts` (sem import; o motor já importa `lib/saleLine`, então
`SalesPlugin` o alcança sem tocar o núcleo contábil — B1; ver F-CE-9 para a alternativa `accounting/models/money.ts`) e todos
os pontos A chamando-o, com o erro de contrato de cada borda preservado e o teto `MAX_CENTS` ficando nas bordas; (ii) aritmética de centavos inteiros também na **origem**
(`SalesPlugin`/`saleItems`: linha = `qty × preço` em decimal, arredondada uma vez; total = Σ das linhas), de modo que o float
que chega à borda já seja um valor de 2 casas. Só (i) corrige `1,005`; só (ii) corrige o `86,655` calculado.

**I — incremental de E (recomendada).** A ordem mantém o `tieOut` verde por construção: antes da virada **nenhum PR muda
valor**; a virada é **uma** linha num núcleo único, então não existe passo em que razão e subrazão arredondem diferente.
- **PR-0** oráculo e caracterização (sem mudar comportamento): §3 itens 1–4.
- **PR-1** núcleo em `lib/decimalMoney.ts` com os dois corpos (legado e exato) e uma constante que escolhe o legado; A1 e **A2** (o
  caminho vivo) passam por ele.
- **PR-2** A3 (os 4 mappers, referência dos goldens) e A6 (pontes, serviços, job) passam pelo núcleo. Ainda sem mudança de valor.
- **PR-3 (a virada)** o núcleo passa ao corpo exato; `splitRevenueCredit` vai para centavos inteiros + `divHalfUp` (9d1e); os
  pins do `receitaFiscalFloat.caracterizacao.test.ts` (#1360) passam de 100 para 101 de propósito; integração de tie-out com
  venda de sub-centavo e teste de ciclo de vida (§3 itens 9–11).
- **PR-4 (condicional ao F-CE-2 b)** origem em centavos inteiros (grupo B) com a ordem de arredondamento do F-CE-3.
- **PR-5 (condicional ao F-CE-7)** grupo C sobre o mesmo núcleo de texto (33b2 e os parsers de documento).
O #1360 precisa estar mergeado antes do PR-1 (A5 depende dele); se não, o PR-1 absorve os dois pontos do subrazão.

**R — remendo (alternativa): manter float e só documentar.** Nenhum valor muda; o PR-0 pina o comportamento e a lacuna fecha
como "decisão do dono". Deixa aberto: `R$ 1,005` entra no razão como 100 enquanto qualquer leitor humano ou o documento
fiscal espera 101; o valor calculado (`86,65499…`) continua dependendo da ordem das contas; 9d1e e 33b2 seguem defeitos.
Só como **etapa** de E (PR-0/PR-1 entregam R sem a virada), nunca como destino.

## 3. Checklist de comportamentos (cada um testável isoladamente)

**PR-0 — oráculo e caracterização**
1. Oráculo independente no teste (texto decimal → `BigInt`, sem importar o núcleo): para `{1.005, 0.285, 86.655, 0.1+0.2,
   1.00499999999999, 8.665, 2.675, 1e-7, 123456.785}` devolve `{101, 29, 8666, 30, 100, 867, 268, 0, 12345679}`
   (conferido nesta sessão com `String(x)` + terceiro dígito). Atenção: `1.0049999999999999` **é o mesmo double** de `1.005`
   (o texto mais curto é `1.005`), então não serve de contraexemplo.
   Comando: `npx jest server/src/lib/__tests__/reaisToCentsExato.oraculo.test.ts --selectProjects unit`.
2. Caracterização do legado: a mesma tabela contra `reaisToCents` e `centsFromReais` fixa `{100, 28, 8666, 30, 100, 866, 268, 0,
   12345679}`; o teste lista **o conjunto exato de divergências** legado × oráculo (hoje: `1.005`, `0.285` e `8.665`) para o
   PR-3 alterá-lo de forma consciente.
3. Os 4 mappers, via `SaleFinalizedMapper.test.ts` etc., ganham o caso `1,005` → 100 pinado (hoje) com comentário que aponta o fork.
4. `goldenPhase0/1` seguem verdes sem edição (prova de que PR-1/PR-2 não mudam valor).

**PR-1 / PR-2 — núcleo e roteamento (sem mudar valor)**
5. `reaisToCentsHalfUp(n: number): bigint` puro em `lib/decimalMoney.ts`, sem import; `n` não finito fica com o chamador.
6. A1, A2, A3 e A6 chamam o núcleo; cada borda mantém o **seu** erro (A1 `ausente⇒0`; A2/A3 `>0` e texto próprio; A6 idem).
7. `npm run check:arch` sem violação nova (X1: `lib/` não importa lógica de feature — o núcleo não importa nada); `importBoundary.test.ts` do accountingBinding verde sem edição; `tsc` limpo.
8. Os testes de A1–A3 do PR-0 seguem verdes (comprova que roteamento não muda valor).

**PR-3 — virada**
9. O núcleo aplica meio-para-cima sobre o texto mais curto do double (§4); os pins do PR-0 passam para `{101, 29, 8666, …}` na
   mesma edição, e `goldenPhase0/1` seguem byte-idênticos (mapper-à-mão × intérprete viram juntos).
10. **Paridade razão × subrazão** em integração (`receitaFiscalFloat.integration.test.ts`, um arquivo, `--runInBand`): venda
    finalizada de `1,005` e de `0,285` gravam 101/29 no razão (3.1) **e** no `ReceitaFiscalLinha`; `tieOut().ok === true`.
11. **Ciclo de vida:** `sale.finalized` → `sale.settled` → `sale.returned` da mesma venda sub-centavo fecham `1.1.2` (A Receber)
    em zero e 3.1 − 3.2 em zero (a lição do `SaleReversalBridge:160`: a devolução reconverte o `totalAmount`).
12. `splitRevenueCredit(10, {serviceReais: 0.01, productReais: 0.19})` ⇒ 3.1 = 1, 3.3 = 9; Σ == total para um varrido de pares.
    **Base zero:** dois pesos abaixo de meio centavo (`0.004` + `0.004`) dão base inteira 0 e `divHalfUp` dividiria por zero — o
    corpo novo cai no fallback atual (crédito único em 3.1), como o `ratearReceita` do #1360 (`base > 0n ? … : 0`).
13. Propriedade: para todo `x` de 2 casas (valor já "limpo"), núcleo exato == `Math.round(x*100)` (a virada **não** muda venda ordinária).

**PR-4 — origem (condicional)**
14. `totalAmount` e `lineReais` calculados em centavos; `0.333 × 10 + 2.5 × 33.33` passa a dar 8666 (por linha) — valor e ordem
    conforme o F-CE-3. Teste no `SalesPlugin` e em `saleItems`.

**PR-5 — grupo C (condicional)**
15. `escala`/`aliqEfet10k` de `NfeIbsCbsDto` usam o parser exato de texto; caso com `pRedAliq` fracionário de 4 casas em que o
    float erra (o `comoProvar` da 33b2). `NfePayloadDto.ts:220` e `FiscalDocumentEmissionService.ts:503` idem.

## 4. Contratos (esboço materializável)

```ts
// lib/decimalMoney.ts — núcleo puro (sem import)
/** Meio-para-cima sobre a MAGNITUDE do texto mais curto do double (ECMAScript Number::toString). n finito. */
export function reaisToCentsHalfUp(n: number): bigint;
//   s = String(Math.abs(n)); expoente 'e' (só < 1e-6 ou >= 1e21) expande por escala BigInt;
//   cents = int*100 + 2 primeiras casas; terceiro dígito >= '5' => +1; sinal reaplicado.

// preservados (contrato de erro de cada borda NÃO muda):
export function reaisToCents(v: unknown): number;                       // lib/saleLine.ts — ausente⇒0; lixo/MAX_CENTS⇒ValidationError
export function centsFromReais(value: unknown, context: string): number; // interpreter/money.ts — >0, MAX_CENTS
export function splitRevenueCredit(totalCents: number, r?: { serviceReais: number; productReais: number }): RevenueCreditLine[];
//   por dentro: pesos = reaisToCentsHalfUp(serviceReais|productReais); serviceCents = divHalfUp(total*pesoS, pesoS+pesoP);
//   base inteira 0 => crédito único em 3.1 (hoje: `base <= 0`)
```

`divHalfUp(n, d)` já existe (`models/retencaoParams.ts:151`, `n,d ≥ 0`). Para `n` negativo o núcleo trabalha na magnitude.
**Interpretação assumida (marcada):** "decimal exato" = o decimal que o usuário vê (`String(x)`), não o valor binário do double
(que é o que o float de hoje já faz). O F-CE-1 depende disso.

## 5. Forks — RATIFICAÇÃO PENDENTE (decisão do dono, fora desta sessão)

| Fork | Pergunta fechada | Caminhos | Recomendação |
|---|---|---|---|
| **F-CE-1** regra | Razão e subrazão passam a arredondar o sub-centavo como? | (a) manter o atual (`Math.round` do float) e só pinar; (b) meio-para-cima decimal sobre o texto do valor; (c) recusar valor com mais de 2 casas (400) | **(b)**: é o precedente F-TA-2 → (a) (half-up, `ADR-INCR-PIS-COFINS` D8) e o que o dono lê na tela. (a) é o remendo R; (c) quebra venda com quantidade fracionária |
| **F-CE-2** onde nasce | A correção para na borda ou vai à origem do float? | (a) só conversor (PR-0..3); (b) conversor **e** origem (PR-4) | **(b)**: sem a origem o "86,655" calculado nunca vira 8666 (§0). Entrega em etapas (PR-4 depois da virada) |
| **F-CE-3** ordem na origem | Na venda, arredonda por linha e soma, ou soma e arredonda o total? | (a) por linha, total = Σ; (b) soma e arredonda o total | **(a)** assumido: o documento fiscal tem 2 casas por item e o total é a soma. **Sem artefato** — ver §6 "Pendente de validação externa"; condicional ao F-CE-2 (b) |
| **F-CE-4** histórico | O que fazer com lançamentos já gravados com a regra antiga? | (a) nada (ficam como estão); (b) ajuste/migração de 1 centavo nos sub-centavo; (c) conversão versionada por venda (carimbo da regra) | **(a), com a virada antes do go-live**: a única base real é seed/teste (go-live só em 2027, `D-2026-10-30-TRIAGEM-CONTADOR`). Depois do go-live (a) deixa de valer: venda finalizada na regra velha e liquidada/devolvida na nova ficaria com 1 centavo aberto em `1.1.2` (a devolução reconverte o valor atual) — aí só (c). O `reconcileReceitaFiscal` também regravaria linha faltante de venda antiga com a regra nova (tie-out diverge) — **inferido** do docstring do serviço, não li a passada do job |
| **F-CE-5** mecanismo da virada | Como entra? | (a) corte único no código (PR-3); (b) flag de ambiente; (c) por data de ocorrência do evento | **(a)**: flag em produção cria o descasamento do F-CE-4; (c) só pós-go-live |
| **F-CE-6** negativos | Meio exato em valor negativo? | (a) afasta de zero (simétrico); (b) como `Math.round` (para +∞: −100,5 → −100) | **(a)**; hoje só a guarda de desconto aceita negativo, razão rejeita `≤ 0` |
| **F-CE-7** escopo | A mudança leva também as irmãs? | (a) só a 5b0a; (b) 5b0a + 9d1e (mesma função compartilhada pelos dois lados); (c) (b) + 33b2 e os parsers de documento (grupo C) | **(c)** em PRs separados: 9d1e vai na virada (PR-3); grupo C no PR-5, que não toca razão |
| **F-CE-9** casa do núcleo | Onde mora a conversão pura? | (a) `lib/decimalMoney.ts` (sem import, alcançável pelo motor); (b) `accounting/models/money.ts` (já tem `MAX_CENTS`; `lib/saleLine.ts` já importa dali, e a regra X1 de `ADR-ARCH-BOUNDARIES` permite `models`) | **(a)**: não aprofunda `lib → features`, o `SalesPlugin` (PR-4) importa sem passar pelo contábil (B1) e dispensa a allowlist do `importBoundary`. (b) é válida e menor. O `ADR-MODULE-BOUNDARIES` de hoje não decide isso |
| **F-CE-8** trava | Impedir que `Math.round(x * 100)` volte? | (a) regra de ESLint `no-restricted-syntax` no `server/src/features/{accounting,sales,accountingBinding}` (precedente: `no-console`, dono 23/10); (b) nenhuma | **(a)**, mas é exceção à moratória da bancada: **só com OK do dono** |

## 6. Medidas reproduzíveis, pendências e achados

**Reprodução (rodada nesta sessão):** `node -e "console.log(Math.round(86.655*100), 86.655*100, Math.round(0.285*100), Math.round(1.005*100))"`
⇒ `8666 8665.5 28 100`. `const x=0.333*10+2.5*33.33` ⇒ `86.65499999999999`, `Math.round(x*100)` ⇒ `8665`.
`Math.round(-100.5)` ⇒ `-100`.

**Pendente de validação externa (não entra no checklist como decidido):**
- Regra legal de arredondamento do sub-centavo: `PERGUNTAS-DE-LEI-2026-10-10.md` P-4 (`:65`) registra "half-up sem fonte" e
  `:527` "não há regra escrita". O half-up de F-CE-1 (b) apoia-se **só** no precedente F-TA-2 → (a), não em norma. Se o dono
  quiser fonte, a pergunta ao acervo `ctresb/leis` é: *"há regra de arredondamento para valor monetário com mais de 2 casas
  na NF-e (MOC) / NFS-e nacional (NT 2025.002) / Res. CGSN 140?"*.
- F-CE-3: como o documento fiscal forma `vProd` por item e `vNF` (por item e soma × soma e arredonda): conferir no manual da
  NF-e e no manual da API NFS-e v1.2 do corpus `fontes-oficiais` antes de ratificar.

**Insumo ausente (pausado, sem varrer):** como a devolução (3.2) aparece no subrazão (o `tieOut` subtrai 3.2 no razão; o lado do
subrazão não foi lido); o desenho completo do `reconcileReceitaFiscal*` (lido só o ponto de conversão); `P1-DOSSIER-interprete.md`
(as regras de erro de cada borda do intérprete).

**Achados fora de escopo:** registrado na caixa — `L-20261124-184345-26dd` (debito, `--pai L-20261124-062159-5b0a`): o comentário do teste do #1360 chama de "86,655" um valor calculado (§0). Os parsers do grupo C (`NfePayloadDto.ts:220`, `FiscalDocumentEmissionService.ts:503`) ficam no escopo condicional do F-CE-7 (c), não na caixa.

## 7. Write-set (a gravar no frontmatter do nó quando o dono autorizar a nota; hoje não há nota)

- PR-0: `server/src/lib/__tests__/reaisToCentsExato.oraculo.test.ts`, `server/src/features/accounting/sync/mappers/__tests__/Sale*Mapper.test.ts`.
- PR-1: `server/src/lib/decimalMoney.ts` (novo), `server/src/lib/saleLine.ts`, `server/src/features/accountingBinding/interpreter/money.ts`.
- PR-2: `server/src/features/accounting/sync/mappers/Sale{Finalized,PackageSold,Returned,Settled}Mapper.ts`, `server/src/features/accounting/sync/bridges/{SalePackageSoldBridge,CrmReceivableBridge,saleItems}.ts`, `server/src/features/sales/services/RegisterPaymentService.ts`, `server/src/features/packages/services/PackageAcceptanceService.ts`, `server/src/jobs/accountingSyncReconcile.job.ts`.
- PR-3: `server/src/features/accounting/sync/mappers/revenueSplit.ts`, `server/src/features/accounting/services/__tests__/receitaFiscalFloat.*`, `server/src/features/accounting/services/ReceitaFiscal*Service.ts`.
- PR-4: `server/src/features/dynamicTables/rules/plugins/SalesPlugin.ts`, `server/src/features/dynamicTables/rules/plugins/sales/discountGuard.ts`, `server/src/features/accounting/sync/bridges/saleItems.ts`.
- PR-5: `server/src/features/accounting/dtos/{NfeIbsCbsDto,NfePayloadDto}.ts`, `server/src/features/accounting/services/FiscalDocumentEmissionService.ts`.
- Choke points da PAR-001: nenhum (sem `factory.ts`, `docs.paths.ts`, `schema.prisma`).
- Gates que o diff **não** aciona: snapshot de shape de DTO (o PR-5 mexe em `refine`, não em shape — conferir no PR), paridade i18n, allowlist do `auditCanonical`, path-count do openapi. Conflito de lote: `paralelo.mjs` apontou `FiscalDocumentEmissionService.ts` também no #1146 (PR-5).

## 8. Que teste prova o quê (`docs/operating-manual/TESTES.md`)

| Passo | Prova | Comando (sempre com escopo) |
|---|---|---|
| PR-0 | regra pura: oráculo × legado, conjunto exato de divergências | `npx jest server/src/lib/__tests__/reaisToCentsExato.oraculo.test.ts --selectProjects unit` |
| PR-1/PR-2 | roteamento não muda valor: pins do PR-0, goldens, fronteira de import | `npx jest server/src/features/accountingBinding server/src/features/accounting/sync/mappers --selectProjects unit`; `npm run check:arch`; `cd server && npx tsc --noEmit` |
| PR-3 | a ligação: razão × subrazão × ciclo de vida, no repositório real | `npx jest server/src/features/accounting/services/__tests__/receitaFiscalFloat.integration.test.ts --selectProjects integration --runInBand` (um arquivo por vez; vaga de trabalho pesado) |
| PR-4 | regra pura na origem + ligação do plugin | unit do `SalesPlugin`/`saleItems`; integração de venda → razão, um arquivo |
| Tela | não aplicável (backend) | — |
Nada disso substitui o oráculo humano do PGDAS-D/contador; este BRIEF não toca gate humano.
