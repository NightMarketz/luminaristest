# ADR-RC — Reuso vs. divergência sancionada entre os subrazões AP × AR

- **Status:** Ratificado 2026-08-13 (dono, via sessão)
- **Trilho:** RC — item do plano de contabilidade, pré-requisito de A2 Imobilizado / A3 Folha
  (`docs/accounting/ACCOUNTING-MASTER-MAP.md` §5.1)
- **Classe:** DECISÃO ARQUITETURAL (reuse-vs-bespoke, `_REUSE-CRITERION.md`)
- **Escopo:** `PayableRepository`/`ReceivableRepository` (Contas a Pagar × Contas a Receber) —
  método `findManyByUnit()` e o resto do par (criação, liquidação, cancelamento)

## Contexto

O par AP×AR (`INCR-AP` PR #102/#106, `INCR-AR` PR #111) é **misto por fatia**. Rodado o
`_REUSE-CRITERION.md` (Etapa 1: mesmo objeto de domínio; Etapa 2: vivo dos dois lados) sobre o
dossiê RC:

- A fatia de **listagem/filtro** (`findManyByUnit()`) é espelho literal: o commit `ea91f406`
  (`BE-INCR-SUBLEDGER-FILTERS`, 2026-08-12) já declara no corpo do commit *"AP e AR sao espelho
  literal (F6); so os enums de status divergem"*. Comparado símbolo-a-símbolo após rename
  (`payables`↔`receivables`, `PAYABLE_OUTSTANDING_STATUSES`↔`RECEIVABLE_OUTSTANDING_STATUSES`), o
  bloco de montagem do `where` era idêntico.
- A fatia de **criação/liquidação** diverge em **posse real**, não em forma: CAS 2-tx assimétrico
  (`claimForPayment`/`markPaidIfPaying` × `claimForReceipt`/`markReceivedIfReceiving` — mesmo
  padrão, dados de negócio opostos), compra de estoque exclusiva de AP, `CrmReceivableBridge`
  exclusiva de AR, e pernas Débito/Crédito estruturalmente invertidas (AP é Liability, AR é
  Asset).

Precedente do repo para extração pontual de fatia comum sem tocar o resto:
`server/src/features/accounting/dtos/queryPrimitives.ts` (`queryBoolean()`, extraído do padrão
re-inlinado em `CounterpartyDto`/`DimensionDto` — ver `zod-coerce-boolean-inverte-query-string`).

## Decisão

**Extração ESCOPADA** do where-builder de filtro (esta PR, `refactor/rc-subledger-filter-where`)
**+ sanção por escrito** da divergência do resto. Não se estende a extração além da fatia provada
idêntica.

`server/src/features/accounting/repositories/subledgerFilters.ts` exporta
`buildSubledgerFilterWhere()`, função **pura** (nunca instancia relógio — `today` entra por
parâmetro, resolvido pelo chamador via `scopeToday(scope)`, mesma fonte do aging, ADR do fuso
F-TZ1→(c)). `PayableRepository.findManyByUnit()` e `ReceivableRepository.findManyByUnit()` passam
a consumi-la; o diff de cada `list()` ENCOLHEU (38/33 linhas líquidas removidas), não cresceu.

## Os 5 pontos sancionados (divergência do restante do par)

1. **Direção contábil invertida é estrutural — não parametrizar.** AP credita `2.1.2 Fornecedores
   a Pagar` (Liability); AR debita `1.1.5 Clientes a Receber` (Asset). Qualquer função comum que
   tentasse cobrir a perna de posting precisaria de um parâmetro de natureza contábil por
   chamada — isso não é reuso, é um `if` disfarçado de parâmetro. Cada lado mantém seu próprio
   `postEntry` direto.
2. **Compra de estoque é exclusiva de AP por regra de negócio — não replicar/abstrair.** A venda
   mista produto+serviço é PROIBIDA (`post-d1-efg-discovery`); não existe fato gerador simétrico
   do lado AR (um recebimento nunca gera entrada de estoque). `isInventoryPurchase()` e a ponte
   compra→estoque (INCR-INVENTORY F-INV3(b)) ficam só em `PayableService`/`Payable.model.ts`.
3. **`CrmReceivableBridge` é exclusiva de AR, com conta de controle DEDICADA `1.1.5`
   (≠ `1.1.2` do salão) para tie-out — não criar bridge simétrica sem demanda comprovada.** O
   AP não tem seam de CRM equivalente; a conta dedicada existe para não colidir com o subrazão de
   vendas do salão no fechamento (`accounting-crm-ar-seam`).
4. **Naming de status é cosmético, mantido por legibilidade.** `PAYING`/`RECEIVING`,
   `PAID`/`RECEIVED` são o mesmo papel semântico (gate de corrida transiente + estado terminal)
   com nomes de domínio distintos — renomear para um enum genérico compartilhado (`PROCESSING`,
   `SETTLED`) trocaria clareza de negócio por DRY cosmético, sem reduzir bug de acoplamento
   nenhum. Não mexido.
5. **CLÁUSULA VIVA — toda extensão futura à fatia de listagem/filtro entra via
   `buildSubledgerFilterWhere` compartilhado, nunca re-inlinada.** Um terceiro subrazão
   (Imobilizado — `A2`, ou Folha — `A3`, ambos diferidos no master map §5.1 item 12/13) que
   precise de listagem paginada com os mesmos 4 filtros (contraparte, faixa de vencimento, busca
   textual, vencido) **consome esta função**, generalizando `W` sobre o novo `Prisma.*WhereInput`
   e passando seu próprio `openStatuses`. Não copiar o bloco à mão pela terceira vez.

## Gatilhos de reversão (adversariais)

- **(a) Branch por lado dentro da função compartilhada.** Se `buildSubledgerFilterWhere` algum dia
  precisar de um `if (lado === 'AR')` por dentro — REVERTER a extração. Regra §2.1 do contrato de
  arquitetura: divergência SOBE para os repositórios que chamam a função, nunca DESCE para dentro
  do compartilhado disfarçada de parâmetro condicional. Este ADR autoriza a extração só enquanto a
  função permanecer livre de `if` de lado.
- **(b) Cópia manual do bloco de liquidação/CAS num terceiro subrazão.** Se Imobilizado ou Folha
  copiarem à mão o padrão CAS 2-tx + gate-dentro-da-tx (em vez de reusar o TIPO do padrão) e um bug
  de uma das classes já documentadas no projeto aparecer numa das cópias —
  `tx-nao-propagado-ao-repo` (tx não chega ao repo) ou `authoritative-gate-inside-tx` (gate de
  invariante mutável fora da transação) — isso é o sinal para AMPLIAR a extração: criar
  `postSubledgerSettlement()` capturando só o padrão CAS+gate (não a perna contábil, que continua
  sancionada pelo ponto 1). Até esse bug aparecer, a fatia de liquidação segue sanção pura, sem
  código compartilhado.

## Consequências

- `PayableRepository.findManyByUnit()` e `ReceivableRepository.findManyByUnit()` ficam mais
  curtos e a fatia de filtro passa a ter UM único ponto de manutenção; qualquer novo filtro (ex.:
  filtro por dimensão) se adiciona uma vez em `subledgerFilters.ts` e vale para os dois lados
  automaticamente.
- O restante do par (services, CAS, bridges) permanece intencionalmente NÃO unificado; qualquer
  revisão futura que proponha "unificar AP e AR" fora da fatia de listagem deve citar este ADR e
  os 5 pontos sancionados antes de reabrir a discussão.
- Testes: `repositories/__tests__/subledgerFilters.test.ts` (unit, função pura) +
  `repositories/__tests__/SubledgerFilters.integration.test.ts` (20 testes, ORÁCULO de regressão
  pré-existente, roda sem alteração contra o código pós-refactor).

## Referências

- Dossiê RC — evidência verificada: `PayableRepository.ts`/`ReceivableRepository.ts` pré-refactor,
  commit `ea91f406` (BE-INCR-SUBLEDGER-FILTERS).
- Precedente de extração pontual: `server/src/features/accounting/dtos/queryPrimitives.ts`.
- `_ARCHITECTURE-CONTRACT.md` §2.1 (divergência sobe, não desce ao compartilhado).
- `_REUSE-CRITERION.md` (critério de 2 estágios).
- Aprendizados relacionados: `tx-nao-propagado-ao-repo`, `authoritative-gate-inside-tx`,
  `reuse-criterion-blind-to-reinlined-technique`.
