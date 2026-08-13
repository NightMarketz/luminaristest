# BRIEF — BE-INCR-SUBLEDGER-FILTERS (filtros de leitura nos subledgers AP/AR)

> Produzido pela `sessao-planejamento`. **Autorização:** `ACCOUNTING-MASTER-MAP.md` §5.1, parágrafo
> "Leitura anterior (2026-07-15 pós-debate + ratificação)", track **T2** — *"código de Núcleo 2 já
> ratificado e ortogonal ao gate fiscal = INCR-COUNTERPARTY (A1) + INCR-DIM-COMPLETENESS (B1) + **N2
> busca/filtros**"*. Data da ratificação: **2026-07-15**.

**Objetivo sob a letra.** Não é "adicionar parâmetros de query" — é **parar de paginar para achar uma
linha**. Hoje a lista de AP/AR aceita **um único filtro, `status`**; a FK de contraparte existe desde o
PR #119 e não é filtrável, e o aging sabe responder por contraparte enquanto a lista não sabe.

**Escopo:** backend. FE é incremento separado (`FE-INCR-SUBLEDGER-FILTERS`), pela convenção da casa e
porque o FE é nó vizinho (regra 3 da sessão de feature).

**Risco principal.** Filtro declarado no DTO que não chega ao `where` é a classe "param aceito-e-ignorado":
o usuário vê uma lista filtrada que não filtrou. O comportamento 6 existe só para falsificar isso.

---

## 1. Estado verificado (insumos)

| Fato | Onde |
|---|---|
| `where` da lista = escopo + `deletedAt: null` + `status`, e nada mais | `ReceivableRepository.ts:49` · `PayableRepository.ts:49` |
| Query DTO expõe só `unitId`, `status`, `page`, `limit` | `PayableDto.ts` (`ListPayablesQuerySchema`) · `ReceivableDto.ts` |
| Paginação e ordenação **já existem** — `orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }]` | ambos os repos |
| Serviço converte `page`→`skip` e repassa | `PayableService.ts:77` · `ReceivableService.ts:76` |
| `counterpartyId` é FK nullable nos dois models | `schema.prisma:859` (AP) · `:929` (AR) |
| Canônico de data-only: `isValidDateOnly` (round-trip, não regex) | `models/dates.ts` |
| Canônico de booleano de query: `queryBoolean()` | `dtos/queryPrimitives.ts` |
| Precedente de busca textual: `where.OR = [{ code: { contains } }, { name: { contains } }]`, com o limite de caixa do SQLite declarado no JSDoc | `ReferentialAccountRepository.ts:63` |
| Semântica de vencimento já fixada no aging: `dueDate ≥ as_of` é **"a vencer"** (inclui vencer hoje); **o atraso começa em 1** | `AgingReportService.ts:18,57` |

## 2. Checklist de comportamentos

Cada um testável isoladamente. **AP e AR são espelhos literais** (F6) — todo comportamento vale nos dois.

| # | Comportamento | Estado |
|---|---|---|
| 1 | `counterpartyId` filtra a lista pela FK de contraparte | ✅ implementável |
| 2 | `dueFrom` / `dueTo` filtram por faixa de vencimento **inclusiva nos dois extremos** | ✅ implementável |
| 3 | `overdue=true` devolve só os vencidos | ✅ desbloqueado por F9(a)+F10(a) |
| 4 | `q` casa substring em `description` **OU** `documentNumber` | ✅ implementável |
| 5 | Filtros distintos combinam por **AND** | ✅ implementável |
| 6 | Escopo (`accountingScopeWhere`) e `deletedAt: null` permanecem na base do `where` sob **qualquer** combinação de filtros | ✅ implementável |
| 7 | `total` reflete os filtros aplicados, não o total sem filtro | ✅ implementável |
| 8 | Valor inválido (data irreal, tipo errado) é rejeitado na fronteira, não silenciado | ✅ implementável |
| 9 | Snapshot de shape dos DTOs atualizado no mesmo PR | ✅ gate acionado pelo diff |

## 3. Contratos

**Entrada** — extensão de `ListPayablesQuerySchema` / `ListReceivablesQuerySchema`:

```ts
{
  unitId: z.string().min(1),
  status: z.enum([...]).optional(),            // inalterado
  counterpartyId: z.string().min(1).optional(),
  dueFrom: z.string().refine(isValidDateOnly).optional(),
  dueTo:   z.string().refine(isValidDateOnly).optional(),
  q: z.string().min(1).optional(),
  page:  z.coerce.number().int().min(1).default(1),    // inalterado
  limit: z.coerce.number().int().min(1).max(200).default(50),  // inalterado
}
```

**Saída** — **shape inalterado**: `{ payables | receivables: [...], total }`. A única garantia nova é a
do comportamento 7: `total` conta o conjunto filtrado.

**Contrato interno (repo)** — `findManyByUnit` ganha os campos opcionais no `params`; a base do `where`
(`accountingScopeWhere` + `deletedAt: null`) é **imutável** e nenhum filtro pode substituí-la.

## 4. Forks

### Ratificados em bloco pelo dono — 2026-08-12

| Fork | Decisão | Caminho ratificado |
|---|---|---|
| **F0** | Quais filtros entram | Contraparte + faixa de vencimento + vencido + texto. **Faixa de valor fica FORA** |
| **F1** | Semântica de "vencido" | `dueDate < hoje` **E** status ∈ {`OPEN`, `PAYING`/`RECEIVING`}; "hoje" = data-only UTC |
| **F2** | Busca textual | `description` + `documentNumber`; aceita o limite de caixa do SQLite, como o precedente |
| **F3** | Contraparte | Só `counterpartyId`; **não** casa o `supplierName`/`customerName` legado |
| **F4** | Faixa de vencimento | Inclusiva nos dois extremos |
| **F5** | Múltiplos valores do mesmo filtro | Um valor por filtro |
| **F6** | Simetria AP↔AR | Espelho literal; só os enums de status divergem |
| **F7** | Ordenação | Não vira parâmetro — preserva a atual |
| **F8** | FE | Fora; incremento separado |

### Ratificados pelo dono — 2026-08-13 (2ª rodada, forks achados durante a execução)

| Fork | Decisão | Caminho ratificado |
|---|---|---|
| **F9** | Fonte do "hoje" | **(a)** Promover `utcToday()` para `models/dates.ts`; o aging passa a importá-la. Uma fonte só para lista e aging |
| **F10** | Colisão de chave entre filtros | **(a)** Compor os filtros em `AND: [...]`, um bloco por filtro. `?overdue=true&status=PAID` vira conjunto vazio por composição honesta, não por sobrescrita silenciosa |

**F9 — de onde vem o "hoje" do comportamento 3.** O F1 fixou a semântica, mas não a **fonte**. O aging já
tem a sua: `utcToday()` em `AgingReportService.ts:52`, cujo próprio comentário a declara **"FONTE ÚNICA"**
e alerta que duas noções divergentes de "hoje" quebrariam o tie-out. Ela é **privada** — não exportada.

| Perna | Caminho | Custo | Consequência |
|---|---|---|---|
| **(a) — recomendada** | Promover `utcToday()` para `models/dates.ts` (a casa canônica declarada no docstring do próprio arquivo, "same one canonical home rationale as money.ts") e o aging passa a importá-la | 1 função movida + 1 import trocado no aging; zero mudança de comportamento | Uma fonte de "hoje" para lista e aging — as duas telas nunca divergem |
| (b) | Re-inlinar o helper no repo novo | Menor diff | Cria a segunda noção de "hoje" contra a qual o próprio aging alerta. É a classe "técnica re-inlinada", que revisor não pega |
| (c) | Tirar `overdue` do escopo | Zero | Perde o filtro mais pedido operacionalmente; contradiz o F0 já ratificado |

**Por que isto pausa a implementação do comportamento 3:** a perna (a) modifica `AgingReportService`, que
é **nó vizinho** — a regra 3 da sessão de feature manda registrar como lacuna de spec e pausar, não
"resolver" mudando o outro módulo. Os comportamentos 1, 2, 4–9 são independentes e seguem.

## 5. Pendente de validação externa

**Nenhum.** A feature é leitura pura: não implementa regra contábil, fiscal ou legal, e não altera
lançamento, saldo ou período. A regra de domínio (regra 4 da sessão de feature) nasce inerte aqui.

## 6. Insumos ausentes

- **Não existe requisito de produto** dizendo por quais campos o operador precisa filtrar; os forks F0–F5
  são a substituição declarada disso. Se surgir uso real que peça faixa de valor, é **nova autorização**.

## 7. Achados fora de escopo — registrados, não executados

1. **AP × AR são clones vivos.** Esta feature adiciona a *mesma* extensão nos dois repos, o que é mais
   evidência para o gate de reuso que o council exigiu **antes do 3º clone de subrazão** (o aging já
   precisou do normalizador `OutstandingLine`). Não é tarefa aqui.
2. **`ListPayablesQuerySchema` não tem `.strict()`** (diferente do `CreatePayableSchema`). Adicionar
   estaria fora do F0 — "aproveitei e já fiz".
3. **`dateOnly` está re-inlinado** em pelo menos 3 DTOs (`dailyJournal`, `DataExchange`, `aging`) em vez
   de morar em `models/dates.ts` ao lado do `isValidDateOnly`. Mesma classe do F9.
