# ADR-INCR-FIXED-ASSETS — Emenda: junção geral de linhas num ativo-conjunto (E7b da emenda 3.2, nó C8)

- **Data:** 2026-10-02 · `sessao-planejamento` · base `origin/main` `669b41d3`. **Sem código.**
- **Status:** **Proposed** — forks F-JL-1..6 **decididos por delegação do dono** (§6). Passa a Accepted no PR de
  código, como o ADR-mãe. Ratificar/decidir fork **não** é "executa" (ORCH-006).
- **Emenda de:** [`ADR-INCR-FIXED-ASSETS.md`](ADR-INCR-FIXED-ASSETS.md) (Accepted 18/09) — toca o item 22 do BRIEF-mãe
  (1 rascunho por item da NF-e). **Não** reabre D1–D11.

## 0. Contexto fixo (formulário da sessão)

- **Item a planejar:** E7b de [`BE-INCR-FIXED-ASSETS-EMENDA-3-2-brief.md`](../accounting/BE-INCR-FIXED-ASSETS-EMENDA-3-2-brief.md)
  §2 Parte 1 — "[cond: ADR — bloqueado até existir] junção geral de linhas"; nó [[C8]].
- **Autorização (citável):** (1) F-EM-4 → (e), dono, 02/10, AskUserQuestion: *"Junção geral de linhas"*
  ([`D-2026-10-02-C8-EMENDA-3-2-E-I1B-FORKS`](../plano/decisoes/D-2026-10-02-C8-EMENDA-3-2-E-I1B-FORKS.md)); (2) dono,
  chat, 02/10, sobre a pendência "E7b precisa de um ADR de emenda … exige uma sessão de planejamento autorizada":
  *"Toma a decisão logica aqui entao e feche as pendencia"*. **Cobertura:** exata — o ADR da junção; nada de código.
- **Insumos (lidos nesta sessão):**
  - `server/prisma/schema.prisma:1687-1733` — `FixedAsset`: `@@unique([payableId, sourceItemRef])`, `deletedAt`,
    `status` por comando (ACC-016), `version` (CAS).
  - `FixedAssetService.ts:337-396` — `createDraftFromPayable`: read-first por `(payableId, sourceItemRef)` **antes**
    de criar; 1 rascunho por item; evento `fixed_asset.created` na mesma tx.
  - `FixedAssetRepository.ts:28-36` — `findByPayableAndSourceItemRef` **não filtra `deletedAt`** (V): rascunho
    soft-deletado continua contando como "já existe".
  - `PayableService.ts:1032-1060` — `redriveMissingDrafts` relê `SourceDocument.rawJson.fixedAssetItems` e chama
    `createDraftFromPayable` para cada payable.
  - `FixedAssetService.ts:175-186` — `deleteAsset`: soft-delete só em `PENDING_ACTIVATION`/`ACTIVE` sem quota.
  - `FixedAssetDto.ts:53-95` — `CreateFixedAssetSchema` (`rateId` XOR `annualRateBp`; `bookAnnualRateBp` exige
    justificativa).
  - `routes/accounting.ts:352-361` — rotas de `/fixed-assets` (segmentos estáticos antes de `/:id`).
  - `auditCanonical.ts:215-217` — allowlist dos 3 eventos de `fixed_asset.*`.
  - Pesquisa de mercado de 02/10 (cédula, F-EM-4): Oracle *merge mass additions* e NetSuite *parent proposal* juntam
    linhas de qualquer origem **antes** de virar ativo; nenhum ERP restringe à mesma nota.
- **Nós vizinhos:** consome o modo 4 da NF-e (rascunhos) e o E7 (`setDeclared` força CAPITALIZE na entrada);
  é consumido pelo Bloco F (o conjunto é um ativo comum para `listForParteB`) e por [[FE-INCR-FIXED-ASSETS]].

## 1. Base normativa

| Fonte | O que fixa | Grau |
|---|---|---|
| IN RFB 1.700/2017 art. 120 § 1º; RIR/2018 art. 313 § 2º | se a atividade exige o **conjunto**, o limite de R$1.200 vale para o conjunto → ativa | V (BRIEF 3.2 §0.1, L1/L2) |
| CPC 27 item 9 | pode ser apropriado agregar itens individualmente insignificantes e aplicar os critérios **ao valor do conjunto** | V (PDF oficial CVM, pesquisa 02/10) |
| PN CST 20/1980 | o critério é a função do conjunto na atividade, não a nota de origem | **secundária** (resumo; SIJUT não alcançado) |

Consequência: a junção é **declaração do usuário** (o sistema não conhece a atividade) e não pode depender de as
peças virem da mesma nota.

## 2. Decisão — modelo (ramo decidido em F-JL-1)

O conjunto é um `FixedAsset` **novo**, em `PENDING_ACTIVATION`, criado por um comando de junção sobre N rascunhos
de origem. As origens **não** são apagadas de verdade: ficam como **lápide** (`deletedAt` + `mergedIntoId` → o
conjunto). Isso mantém a chave `(payableId, sourceItemRef)` intacta, e o read-first do re-drive (que não filtra
`deletedAt`, V) continua bloqueando a recriação do rascunho juntado, **sem mudar `redriveMissingDrafts`**.

## 3. Checklist de comportamentos (numeração `J`)

1. **J1. Coluna** `fixed_assets.mergedIntoId TEXT NULL REFERENCES fixed_assets(id) ON DELETE RESTRICT`, no fim
   (auto-relação Prisma `FixedAssetMerge`; a restrição de auto-relação é do motor DynamicTable, não do Prisma).
   Migração própria (F-JL-6), `smoke:migration` com abort simulado; `resetDb()` já cobre a tabela.
2. **J2. Comando** `POST /api/accounting/fixed-assets/merge` (segmento estático **antes** de `/:id`, como
   `/depreciation/run`), cadeia Route → Controller → `FixedAssetService.mergeDrafts` → Repository; policy
   `canManageFixedAssets` (deny-by-default); registro em `index.ts`/`routes/accounting.ts` + `docs.paths.ts`.
3. **J3. Elegibilidade, re-checada DENTRO da tx (T6):** ≥ 2 ids distintos; todos do **mesmo escopo**
   `(userId, unitId)`; todos `PENDING_ACTIVATION`, `deletedAt IS NULL`, `mergedIntoId IS NULL`; CAS por `version`
   de cada origem (corrida com activate/delete → 409). Qualquer origem fora disso → 400 nomeando o id. Origens
   podem vir de **notas, payables ou criação manual diferentes** (F-JL-3).
4. **J4. O conjunto:** `costCents = Σ costCents` (BigInt; Σ > `MAX_CENTS` → `MaxCentsExceededError`, política
   T4); `quantity = 1` (F-JL-5); `acquiredAt = max(acquiredAt)` das origens, ou o informado se ≥ esse máximo
   (F-JL-4; menor → 400); `classId`, `code`, `description` e a taxa (`rateId` XOR `annualRateBp`, + `bookAnnualRateBp`
   com justificativa) vêm do comando, com as **mesmas** validações do `CreateFixedAssetSchema`;
   `payableId`/`sourceItemRef`/`sourceDocumentId` = `null` (a procedência mora nas origens).
5. **J5. Lápides, na mesma tx:** cada origem recebe `mergedIntoId = conjunto.id` e `deletedAt = now()` (com
   incremento de `version`). Some das listagens (que já filtram `deletedAt`), continua legível por id via J8.
6. **J6. Re-drive não ressuscita:** teste de integração — payable com 3 itens → 3 rascunhos → junção de 2 →
   `POST /fixed-assets/reconcile` cria **0** rascunhos e a contagem de ativos vivos é 2 (conjunto + 1 avulso).
   Prova a propriedade V de `FixedAssetRepository.ts:34`; se alguém acrescentar `deletedAt: null` ali, o teste falha.
7. **J7. Auditoria:** eventType novo `fixed_asset.merged` com payload `{ assetId, sourceAssetIds, totalCostCents }`
   (sem PII) **e** `fixed_asset.unmerged` `{ assetId, sourceAssetIds }` (J9), na mesma tx; os dois entram na
   `PAYLOAD_ALLOWLIST` de `auditCanonical.ts` na mesma mudança, com o teste da allowlist nas duas direções.
8. **J8. Leitura:** `GET /fixed-assets/:id` do conjunto devolve `mergedSources: [{ id, code, payableId,
   sourceItemRef, costCents }]` (só leitura; lido com `deletedAt` incluso, filtrado por `mergedIntoId` e escopo).
   O GET de uma lápide por id → 404, como qualquer ativo apagado (não muda o repo).
9. **J9. Desfazer (F-JL-2):** `DELETE /fixed-assets/:id` de um conjunto **ainda `PENDING_ACTIVATION`** restaura as
   origens na mesma tx (`mergedIntoId = null`, `deletedAt = null`) e apaga o conjunto (soft-delete) + evento
   `fixed_asset.unmerged`. Conjunto `ACTIVE` sem quota → 400 ("ativo-conjunto ativado não se desfaz; baixe-o"),
   diferente do ativo comum — a junção vira irreversível na ativação.
10. **J10. Ativação e depreciação:** o conjunto ativa pelo `activate` existente e deprecia como qualquer ativo
    (D2/D3 do ADR-mãe); o Bloco F (E15) o enxerga como 1 ativo. Nenhum código de depreciação muda.
11. **J11. Limite de R$1.200:** a junção **não** checa o limite (as origens já são `CAPITALIZE`; item `EXPENSE`
    nunca vira rascunho — E5/E6 do BRIEF 3.2). Não existe caminho de "juntar e expensar".
12. **J12. Gates da mudança:** snapshot de shape do DTO novo (`MergeFixedAssetsSchema`) e do response do GET;
    openapi +1 path (`/fixed-assets/merge`) — o guard de path-count sobe em 1; paridade i18n pt/en das mensagens
    novas; `tsc --noEmit` limpo; `npm run test:integration` para J6/J9.

## 4. Contratos (esboço materializável)

```ts
// FixedAssetDto.ts
export const MergeFixedAssetsSchema = z
  .object({
    sourceAssetIds: z.array(z.string().min(1)).min(2).max(200)
      .refine((ids) => new Set(ids).size === ids.length, 'ids repetidos'),
    sourceVersions: z.record(z.string(), z.number().int().positive()), // CAS por origem (J3)
    classId: z.string().min(1),
    code: z.string().min(1).max(64),
    description: z.string().min(1).max(500),
    acquiredAt: dateOnly('acquiredAt').optional(),       // F-JL-4: default = max das origens
    rateId: z.string().min(1).optional(),
    annualRateBp: z.number().int().min(1).max(10000).optional(),
    bookAnnualRateBp: z.number().int().min(1).max(10000).optional(),
    bookRateJustification: z.string().min(1).optional(),
  })
  .strict()
  .superRefine(/* mesmas regras XOR/justificativa do CreateFixedAssetSchema — extrair o refine compartilhado */);
```

```prisma
model FixedAsset {
  // …
  mergedIntoId  String?
  mergedInto    FixedAsset?  @relation("FixedAssetMerge", fields: [mergedIntoId], references: [id], onDelete: Restrict)
  mergedSources FixedAsset[] @relation("FixedAssetMerge")
  @@index([mergedIntoId])
}
```

```sql
-- YYYYMMDDhhmmss_c8_juncao_conjunto (F-JL-6: migração própria, PR P4)
ALTER TABLE fixed_assets ADD COLUMN mergedIntoId TEXT REFERENCES fixed_assets(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS fixed_assets_mergedIntoId_idx ON fixed_assets(mergedIntoId);
```

```ts
// IFixedAssetRepository — métodos novos (tx obrigatório)
markMerged(scope: AccountingScope, ids: string[], mergedIntoId: string, versions: Record<string, number>, tx: Prisma.TransactionClient): Promise<void>; // CAS; count ≠ ids.length → conflito
restoreMerged(scope: AccountingScope, mergedIntoId: string, tx: Prisma.TransactionClient): Promise<string[]>;
listMergedSources(scope: AccountingScope, mergedIntoId: string): Promise<FixedAsset[]>; // inclui deletedAt
```

## 5. Alternativas consideradas (ver F-JL-1)

- **Tabela filha `FixedAssetSourceItem` + remover `@@unique([payableId, sourceItemRef])`** — modela 1 ativo ↔ N
  itens "de verdade", mas troca a chave do read-first e exige reescrever `createDraftFromPayable` e o re-drive
  (S14 do BRIEF 3.2) — mais superfície no caminho que hoje é idempotente e testado.
- **Lista JSON no conjunto** — sem integridade referencial; o re-drive não a enxerga (recriaria o rascunho).

## 6. Forks — **[DECISÃO 2026-10-02 — por DELEGAÇÃO do dono]**

> Chat 02/10: *"Toma a decisão logica aqui entao e feche as pendencia"*. Decididos pelo agente, todos na
> recomendação. **Viés (T8):** pendem para o menor diff no caminho idempotente existente (lápide em vez de
> remodelar a chave); o dono prefere completude (memória `dono-quer-completude-nao-mvp`) — o que fica de fora
> está em §9. Reverter qualquer um = pedir em chat; nada aqui é "executa".

| Fork | Pergunta | Caminhos | Decisão |
|---|---|---|---|
| **F-JL-1** | Representação de 1 conjunto ↔ N origens | (a) `mergedIntoId` + lápide soft-delete nas origens · (b) tabela filha + trocar a chave · (c) JSON | **(a)** — mantém a chave e o re-drive (J6); (b) mexe no caminho idempotente; (c) sem integridade |
| **F-JL-2** | Desfazer a junção | (a) `DELETE` do conjunto `PENDING` restaura as origens · (b) endpoint `unmerge` · (c) sem desfazer | **(a)** — Oracle permite desfazer; reusa a rota existente (0 path novo além do J2) |
| **F-JL-3** | O que pode ser juntado | (a) só `PENDING_ACTIVATION`, mesmo escopo, qualquer origem · (b) também `ACTIVE` (acréscimo a bem existente) | **(a)** — (b) é o (d3) "bem principal + componentes" que não foi escolhido no F-EM-4 → §9 |
| **F-JL-4** | `acquiredAt` do conjunto | (a) `max` das origens, override só ≥ max · (b) `min` · (c) livre | **(a)** — o conjunto só existe completo; (b) anteciparia depreciação de peça não comprada |
| **F-JL-5** | `quantity` do conjunto | (a) Σ quantidades · (b) 1 | **(b)** — o conjunto é **uma** unidade funcional (art. 120 § 1º); as quantidades ficam nas origens (J8) |
| **F-JL-6** | Onde entra a migração | (a) na migração única do P1 da emenda 3.2 · (b) PR próprio **P4**, depois do P1 | **(b)** — P1 não espera este ADR; o P4 depende do E7 (P1) |

## 7. Pendente de validação externa

- PN CST 20/1980 lido só em fonte secundária (não muda o desenho: a junção é declaração do usuário).
- Oráculo final do comportamento contábil = revisão do contador sobre o 1º conjunto real (não bloqueia).

## 8. Insumos ausentes

- Nenhum.

## 9. Achados fora de escopo

- **(d3) bem principal + componentes/acréscimos** a um ativo já `ACTIVE` (SAP subnúmero, Senior F670EBA, Protheus
  ATFA012) — frente própria; exige nova autorização.
- **FE** da junção (seleção de rascunhos, tela do conjunto) — nó [[FE-INCR-FIXED-ASSETS]].
- `deleteAsset` não emite evento de auditoria hoje (`FixedAssetService.ts:175-186`) — fora deste item; o J9 emite
  `fixed_asset.unmerged` só no caminho do conjunto.
