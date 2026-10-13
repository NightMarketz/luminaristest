# FE-INCR-PAYMENT-PROVIDER — EMENDA 1 (F-FE-COB-1..8 ratificados; lista global de cobranças com BE próprio)

> `sessao-planejamento`, 2026-10-13, base `origin/main` `9f6477d8`. **Emenda** ao BRIEF
> [`FE-INCR-PAYMENT-PROVIDER-brief.md`](FE-INCR-PAYMENT-PROVIDER-brief.md) (nó [`F5`](../plano/nos/F5.md)). Sem
> código. **Cada PR exige "executa" próprio** (ORCH-006). A emenda de 11/10
> ([`EMENDAS-BRIEF-2026-10-11.md`](EMENDAS-BRIEF-2026-10-11.md) §4, multa de 2% e dias não úteis; F-E4-1) segue à parte.
>
> **Autorização, literal:** dono, chat, 2026-10-13: *"Grava as decisões e abre as 4 emendas"*, sobre as cédulas
> F-FE-COB-1..8 ([[D-2026-10-13-QUESTIONARIO-BRIEFS-PRONTOS]]). Cobre só este documento.
>
> **Em duas linhas:** os 8 forks estão ratificados; sete na recomendação. O COB-2 (b) põe a lista global de cobranças
> **neste ciclo**, com um PR-0 de backend (rota de leitura paginada) antes do PR-1 de tela. **Risco principal:** a
> rota nova lista dados de cobrança de toda a unidade; a policy e o "sem pagador" (F9) têm de ser os da lista por título.

## 1. Forks ratificados (13/10)

| Fork | Decisão | Efeito no checklist |
|---|---|---|
| COB-1 | (a) aba `cobranca` | item 3 sem mudança |
| COB-2 | **(b)** BE global + lista na aba Cobrança | **PR-0 novo** (§2) + itens 16b e 16c |
| COB-3 | (a) carrega ao abrir o título | item 16 sem mudança |
| COB-4 | (a) último estado do provedor | sem mudança |
| COB-5 | (a) URL montada no FE com aviso | item 9 sem mudança; IA-7 cai |
| COB-6 | (a) presets | item 12 sem mudança |
| COB-7 | (a) selo "Vencida — aguardando o provedor" | item 17 sem mudança |
| COB-8 | card (contas; `GenericTable` só se > 1) · tabela HTML (cobranças do título) · `GenericTable` (lista global) | itens 4, 16, 16b |

O §1 (IA-1) e o §7 item 1 do BRIEF deixam de listar a lista global como fora de escopo. IA-3 e IA-2 continuam fora.

## 2. Checklist novo

### PR-0 — BE: lista de cobranças da unidade (antes do PR-1)

0a. **DTO** `ListCollectionChargesQuerySchema` (Zod `.strict()`): `unitId` (obrigatório), `status` (opcional, um dos
    `COLLECTION_CHARGE_STATUSES`; inválido ⇒ 400), `kind` (opcional, `BOLETO|PIX`), `page` ≥ 1, `limit` 1–100
    (padrão 20). Boolean nenhum (memória `zod-coerce-boolean`). Parâmetro desconhecido ⇒ 400 (`param-aceito-e-ignorado`).
0b. **Repositório** `CollectionChargeRepository.findPageByUnit(scope, {status?, kind?, page, limit})` →
    `{items, total}`, filtrando `deletedAt: null`, ordem `createdAt desc, id desc`. O índice existente
    `[userId, unitId, receivableId, status]` não cobre a ordem: o PR decide, **medindo**, se cria
    `@@index([userId, unitId, createdAt])` (migração aditiva) — registrar o resultado no PR.
0c. **Serviço** `CollectionChargeService.listByUnit(scope, query)`: mesma policy da lista por título
    (`canReadReceivable`, 403 igual) e **sem pagador** (`toView(c, false)`, F9). Resposta
    `{items: CollectionChargeView[], total, page, limit}`.
0d. **Rota** `GET /api/collection-charges?unitId&status&kind&page&limit` no `collectionChargesRouter`, **antes** de
    `GET /:id`. Registro em 2 toques (`routes/` + `docs.paths.ts`); o guard de path-count do openapi sobe 1.
0e. **Testes:** integração com cobranças em 2 unidades e 2 usuários (isolamento por escopo); filtro por status;
    paginação (total certo, sem repetição entre páginas); `payer` ausente mesmo para gestor; 400 para status
    inválido e parâmetro desconhecido; 403 sem `canReadReceivable`. Snapshot de shape do DTO novo. Sem `eventType`
    de auditoria (leitura).

### PR-1 — acréscimos

16b. **Lista global** na aba Cobrança (abaixo do card da conta), com `GenericTable` canônico: tipo, título (link que
     abre o drawer do item 16 no AR), valor, vencimento, status (selo do item 17, inclusive o "Vencida" derivado do
     COB-7), `updatedAt`. Filtros: status e tipo. Paginação pelo `StandardPagination` do `GenericTable`.
     Clique na linha abre o detalhe (`GET /collection-charges/:id`).
16c. **Serviço FE** `collectionCharges.service.ts` ganha `listByUnit(query)`; tipo da resposta escrito à mão como os
     demais (§3.2 do BRIEF). *Teste vitest:* URL, query sem campo vazio, desembrulho.

O item 16b entra no PR-1 só se o PR-0 já estiver em `main`; senão vai para o PR-2 (a ordem do §8 do BRIEF continua).

## 3. Contrato

```ts
// server: features/accounting/dtos/CollectionChargeDto.ts
export const ListCollectionChargesQuerySchema = z.object({
  unitId: z.string().min(1),
  status: z.enum(COLLECTION_CHARGE_STATUSES).optional(),
  kind: z.enum(['BOLETO', 'PIX']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
}).strict();
// resposta
interface CollectionChargePage { items: CollectionChargeView[]; total: number; page: number; limit: number }
```

## 4. Forks

Nenhum novo. O índice (0b) é decisão por medida, registrada no PR, não fork de produto.

## 5. Ordem

PR-0 (BE) → PR-1 → PR-2 → PR-3, como no §8 do BRIEF. Perfil: PR-0 opus-baixo (leitura paginada no molde da lista por título).
