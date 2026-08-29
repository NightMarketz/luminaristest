# BE-INCR-NFE — spec de RECONSTRUÇÃO da `claude/nfe-fase-b`

> **O que este documento é.** O conhecimento que hoje só existe dentro da branch `claude/nfe-fase-b`,
> gravado em `docs/` para que a implementação possa ser **refeita a partir de `main`** sem a branch.
> Produzido em 2026-08-28 por leitura direta de `git show`/`git diff` contra a branch (nenhum git de
> escrita, nenhum rebase, nenhum merge). **A branch NÃO foi apagada** — a decisão de execução foi
> "spec agora, branch depois": apagar é a única parte irreversível e ela espera o carimbo do ADR-P2.
>
> **O que este documento NÃO é.** Não é o desenho (`docs/adr/ADR-INCR-NFE-fiscal-ingestion.md`,
> ratificado fork-a-fork), não é o BRIEF ([BE-INCR-NFE-impl-plan.md](BE-INCR-NFE-impl-plan.md)), não é
> o leiaute ([BE-INCR-NFE-layout-transcription.md](BE-INCR-NFE-layout-transcription.md)) e não é o mapa
> de merge ([BE-INCR-NFE-integration-plan.md](BE-INCR-NFE-integration-plan.md), escrito para a
> `fase-a`, hoje SUPERSEDED). Esses quatro continuam válidos e **não são repetidos aqui**. O que segue
> é só o **delta de implementação** — as decisões que foram tomadas *escrevendo o código* e que morrem
> com a branch.
>
> **Grau de evidência.** Tudo abaixo é **VERIFICADO** (lido no conteúdo da branch nesta passada), com
> uma exceção marcada explicitamente na §7 (a contagem de literais `salon.*`, onde a medição **diverge**
> do que o master map registra).

---

## 1. Estado medido da branch

| Medida | Valor | Como medir de novo |
|---|---|---|
| HEAD | `5b6243a6` (relatório) sobre `8c4a24b9` (feature) | `git log --oneline origin/main..claude/nfe-fase-b` |
| Base | merge-base com `origin/main` = `c1b4db84` (merge do PR #216) | `git merge-base origin/main claude/nfe-fase-b` |
| Tamanho | **34 arquivos, +3.143 −42** | `git diff --stat $(git merge-base origin/main claude/nfe-fase-b) claude/nfe-fase-b` |
| Distância | reexecute — sobe toda semana | `git rev-list --count origin/claude/nfe-fase-b..origin/main` |
| Smoke-gate | PASS não-vácuo sobre cópia semeada do `dev.db` real | `SMOKE-MIGRATION-GATE-INCR-NFE.md` **vive na branch** (§8) |

**A trava de merge não é um bug e não muda com esta spec:** `nfe-fixture-provenance.test.ts` falha de
propósito enquanto qualquer `.xml` de `server/src/lib/__tests__/fixtures/nfe/` contiver o marcador
literal `SYNTHETIC-FIXTURE-NOT-REAL`. Como `Server – typecheck & test` é check obrigatório, o CI segura
o merge. **Só o XML real anonimizado destrava.**

---

## 2. Superfície a recriar

| Arquivo | ± | Papel |
|---|---|---|
| `server/src/lib/nfe.ts` | +320 | Parser PURO NF-e 4.00 modelo 55 → `ParsedNfe`. Sem Prisma, sem tx, sem regra de razão. Espelha `lib/cnab.ts`/`lib/ofx.ts`. |
| `server/src/features/accounting/services/NfeImportService.ts` | +275 | Compra: parse → custo D3 → rateio → **UM** `createPayable` multi-item. Nunca `postEntry`. |
| `server/src/features/accounting/services/NfeSaleReconciliationService.ts` | +153 | Venda: cruza com o lançamento já postado, anexa proveniência, **posta zero**. |
| `server/src/features/accounting/dtos/NfeDto.ts` | +90 | `ImportNfePurchaseSchema` / `ImportNfeSaleSchema`, ambos `.strict()`. |
| `server/src/controllers/nfeController.ts` | +133 | Borda HTTP multipart + `nfeUpload` (multer). |
| `server/src/routes/nfe.ts` + `routes/index.ts` | +20 / +2 | Registro em **2 toques**; auth deny-by-default, sem 3º toque de allowlist. |
| `server/src/routes/docs.paths.ts` | +49 | OpenAPI dos 2 paths (nunca jsdoc na prosa de `routes/`). |
| `server/src/features/accounting/services/PostingService.ts` | ~~+107~~ | ~~`attachSourceDocument` — seam NOVO, não existe em `main`~~ — **já existe em `main`** (extraído via PR #228 / NFE-X, 2026-08-28); sai do delta a reconstruir (§4, §8). |
| `server/src/features/accounting/services/PayableService.ts` | +146 | Drive dos N INBOUND multi-item + `receiveInventoryItems` público. |
| `server/src/features/accounting/dtos/PayableDto.ts` | +71 | Porta XOR vira **porta de 3 modos** + tie-out Σ itens == `amountCents`. |
| `server/src/features/accounting/models/Payable.model.ts` | +32 | `isInventoryPurchase` vs **`hasSingleInventorySku`** (novo). |
| `server/src/features/accounting/models/Inventory.model.ts` | +32 | `aggregateInventoryItems` (fold por `productRef`). |
| `schema.prisma` + migração | +9 / +2 | `Payable.inventoryMultiItem Boolean?` — **nullable de propósito** (§5). |
| `IPayableRepository.ts` | +4 | `inventoryMultiItem: boolean \| null` em `CreatePayableData`. |
| `auditCanonical.ts` | +3 | Comentário: **não existe evento `nfe.*`** (§4). |
| `server/package.json` | +1 | `fast-xml-parser` `^5.11.0` — **dependência nova**. |
| testes (6 arquivos) | +985 | parser, import, reconciliação, payable, posting, proveniência do fixture. |
| fixtures + README | +220 | 2 XML `*.SYNTHETIC.xml` + o marcador que trava o merge. |

---

## 3. Parser (`lib/nfe.ts`) — invariantes que não estão no leiaute

1. **Dinheiro `13v2` → centavos por ARITMÉTICA DE STRING** (split em `.`, normaliza a 2 casas,
   **concatena**). Nunca `Number(x) * 100`. Uma 3ª casa significativa **rejeita loud**.
2. **`qCom`/`vUnCom` têm decimais VARIÁVEIS** (0-4 / 0-10) e ficam **string crua** — truncar a 2 casas
   corromperia a quantidade.
3. **Data por RESLICE literal** `slice(0,10)`. Nunca `new Date(...)`: com offset `-03:00` o dia volta
   (classe `date-only-rendering-utc-shift`).
4. **Gates duros**, todos rejeitando com `ValidationError` antes de qualquer escrita: `cStat ∈ {100,150}`;
   ausência de `protNFe` = sem autorização; `mod !== '55'`; `tpAmb === '2'` (homologação — só liberada
   pela flag `allowHomologacao`, exclusiva de fixture); `@Id` = `NFe` + 44 díg. (47 chars) e **igual** a
   `protNFe/infProt/chNFe`; nota sem `<det>`.
5. **`<!DOCTYPE` rejeitado ANTES do parse** (XXE / billion-laughs), sem entidade externa habilitada.
6. **Quirk do `fast-xml-parser`:** 1 `<det>` vira objeto, N vira array → `isArray: (n) => n === 'det'`.
   `parseTagValue: false` mantém tudo string (é o que preserva 1 e 2). `removeNSPrefix: true`.

## 4. Venda — o único caminho que toca lançamento já postado

- **Âncora = `saleId` EXPLÍCITO do operador** (F-NFE8→a): o XML **não carrega** o id da venda, e casar
  por valor+data anexaria a nota à venda errada num dia com vendas repetidas. Nota órfã → `NotFoundError`.
- **Posta ZERO lançamentos.** Receita e CMV já foram postados pela ponte de venda; repostar duplicaria
  ambos (risco ALTO nomeado). O serviço só compara `vNF` × Σ débito do lançamento e devolve
  `divergences[]` — **sinaliza, não bloqueia**, e anexa a proveniência mesmo com divergência.
- **A proveniência é escrita pelo DONO DO SEAM**, `PostingService.attachSourceDocument` (O-1) — o
  serviço de NF-e **não injeta** `ISourceProvenanceRepository`. **Emenda 2026-08-28:** esse método
  **já existe em `main`** (extraído e mergeado via PR #228 / NFE-X — commits 22af653c/8c30f7c8, merge
  9335c4cb): é **insumo existente**, uma chamada a código já mergeado — não parte da reconstrução.
  - Cria `SourceDocument` + `JournalEntrySource` + `AuditEvent 'entry.source_recorded'` **numa tx só**.
  - Idempotente pelo `externalRef` **humano** (a chave de acesso, nunca um `sourceId` — T7), re-checado
    **DENTRO** do `runTransaction` com o `tx` propagado ao repo (`authoritative-gate-inside-tx`).
  - **Limite honesto, escrito no próprio código:** não existe `@@unique(journalEntryId, externalRef)`,
    então dois anexos **concorrentes** da mesma chave ainda podem criar dois `SourceDocument`. Fechar
    exigiria migração. Sequencialmente — o fluxo real do operador — sai exatamente um.
- **Sem evento `nfe.*` próprio (decisão A / T8):** auditoria é in-tx e o serviço de integração não tem tx
  própria; um evento em 2ª tx poderia falhar depois do commit e deixar trilho e evento fora de sincronia.
  A nota já está no trilho como `payable.created` / `entry.source_recorded`.
- **O log não carrega a chave de acesso** (dígitos 7-20 = CNPJ do emitente); permanece resolvível por
  `sourceDocumentId → SourceDocument.externalRef`.

## 5. Compra — custo, rateio e a nota multi-item

- **Custo D3 (F-NFE6):** `vProd − vDesc + vFrete + vSeg + vOutro + vIPI + vST`.
  **`vICMS` próprio NÃO é subtraído** — MVP de tenant não-contribuinte. É o **risco ALTO nomeado**: o
  tie-out valida a *distribuição* (Σ itens == total), **não o regime**. `vSeg` entra porque compõe o
  `vNF` (decisão E) — sem ele o passivo nasceria menor que a nota.
- **Rateio (Gate 1):** peso = `vProd` do item; `floor` em todos menos o último; **resíduo no último** ⇒
  `Σ shares === custoTotalCents`. O produto `total × vProd_item` é calculado em **`BigInt`** — em
  `Number` ele passa de 2^53 e perde precisão em silêncio.
- **`indTot === '0'`** (MOC I17b): a linha não compõe o `vNF` ⇒ **não** entra no peso nem no estoque, e
  volta ao operador em `ignoredItems` — linha ignorada é **reportada**, nunca sumida
  (classe `param-aceito-e-ignorado-e-bug`).
- **`qCom` fracionário REJEITA loud** (estoque do MVP é unidade inteira); nunca trunca.
- **Idempotência (Gate 2):** `documentNumber = chaveAcesso`. Re-import bate no `@@unique` da `Payable` e
  `createPayable` rejeita — a nota não pode cunhar um segundo passivo. A rejeição **não é engolida**.
- **Contraparte (D6):** o emitente **nunca** é auto-criado. Um `counterpartyId` confirmado é re-escopado
  e tem de ser `SUPPLIER` vivo da unidade; ausente, fica só o snapshot `supplierName`.
- **Item→produto (D6):** todo item **custeado** exige mapeamento `cProd → productRef` do operador; item
  sem mapeamento rejeita a importação inteira.
- **F-NFE7→a — 1 nota = 1 `Payable`:** o discriminador é a coluna **`inventoryMultiItem Boolean?`**.
  - **Nullable de propósito:** Prisma emite `ALTER TABLE ADD COLUMN` puro para coluna nullable, mas
    `NOT NULL DEFAULT` força **rebuild da tabela** no SQLite — e rebuild malfeito derruba FK/índice em
    silêncio (lição `expenseAccountId RESTRICT→SET NULL`). `null` = linha legada = não multi-item.
  - `isInventoryPurchase` passa a ser `hasSingleInventorySku(row) || inventoryMultiItem === true`;
    **`hasSingleInventorySku` é o predicado novo** que separa as duas formas de estoque, para que uma
    linha multi-item nunca seja alimentada ao `receiveStock` com `inventoryProductRef` nulo.
  - `PayableDto` deixa de ser XOR e vira **porta de 3 modos** (despesa | SKU único | multi-item), com
    **tie-out no DTO**: `Σ inventoryItems.valueCents === amountCents`.
- **`aggregateInventoryItems` — invariante de dinheiro, não estética.** A nota inteira compartilha **um**
  `sourceId` (= `payableId`) e `receiveStock` é read-first idempotente em
  `(inventoryItemId, kind, sourceType, sourceId)`. Uma NF-e pode repetir o mesmo `cProd` em `<det>`
  diferentes: sem o fold por `productRef`, a segunda linha **parece replay** e o subrazão recebe menos do
  que o razão debitou, **em silêncio**. Mesma técnica de `InventoryService.aggregateLines`, mesmo motivo.
- **Isolamento por item:** falha de um SKU é logada e os outros entram; `receiveInventoryItems` é
  **público e re-executável** (idempotente por SKU no `payableId`).
- **`reconcilePayables` conta a nota multi-item como `blocked`** (decisão do dono 2026-08-22,
  [integration-plan §2.4](BE-INCR-NFE-integration-plan.md)): o detalhe por SKU **não está persistido na
  linha**, então o reconcile re-dirige o **reconhecimento** mas não consegue reconstruir os N
  `receiveStock`. É limite determinístico de DADO, não erro — `failed` seria alarme falso permanente e
  um skip mudo seria a classe do parágrafo acima. Fechar de vez exigiria **persistir o breakdown**
  (migração, fora do escopo).

## 6. Borda HTTP e wiring

- Ambos os endpoints são **multipart** (`file` = XML). `nfeUpload` = multer compartilhado com
  **magic bytes DESLIGADOS** (decisão O-3): XML não tem assinatura binária e o `validateMagicBytes`
  exigiria assinatura ZIP/PDF para `application/octet-stream` — rejeitaria nota legítima. Mesma exceção
  já aberta para OFX/CNAB. Guardas reais = allowlist de MIME
  (`text/xml`, `application/xml`, `text/plain`, `application/octet-stream`), teto de tamanho
  (`MAX_IMPORT_SIZE_BYTES`, default 10 MB) e o próprio `parseNfe`.
- **`itemMappings` viaja como STRING JSON** (campo multipart é plano) e é decodificado **antes** do Zod,
  com 400 explícito em JSON malformado.
- `POST /api/nfe/purchase` → **201** `{ payable, ignoredItems }`; `POST /api/nfe/sale` → **200**
  (relatório). `handleApiError` mapeia `ValidationError`/`ForbiddenError`/`NotFoundError` — rejeição de
  domínio nunca vira 500.
- **`factory.ts`:** o `PayableService` foi **extraído do literal** para que `NfeImportService` dirija a
  **mesma instância** — todo centavo pela via provada `createPayable`. Ambos os serviços de NF-e são de
  **integração** (Contrato §2.1): fora do motor de plugin, sem tabela própria, sem `postEntry`.
- Ao refazer: o `NfeDto` novo **exige atualizar o snapshot de shape** (`__dto-shapes__.json`, PR #182) e
  o **path-count do `openapi-paths.test.ts`** (+2).

## 7. O rebase RN (`salon.*` → `sale.*`) — medição, não estimativa

A `fase-b` nasceu **antes** do rename do PR #222. Pós-RN, `salon.sale.finalized` **não existe** nem no
vocabulário nem nas linhas migradas — a reconciliação de venda buscaria um lançamento que nunca acha.

**Medido nesta passada** (`git diff $(git merge-base origin/main claude/nfe-fase-b) claude/nfe-fase-b`):

| Onde | Ocorrências em linhas **adicionadas** | O quê |
|---|---|---|
| `NfeSaleReconciliationService.ts` | **2** | `SALE_SOURCE_TYPE = 'salon.sale.finalized'` + a menção no cabeçalho |
| `NfeSaleReconciliationService.test.ts` | **3** | fixture do `findBySource` e asserções |
| `PostingService.test.ts` | **2** | `sourceType` do lançamento-alvo e do espelho |
| **Total adicionado pela branch** | **7** | todos `salon.sale.finalized` |

Na **árvore** da branch, contando também o que ela herdou da base pré-RN nos arquivos que toca, são
**14** (soma `salon.sale.cogs` em `Inventory.model.ts`, `salon.sale.settled` em `docs.paths.ts` e 5
ocorrências de contexto em `PostingService.test.ts`) — **essas somem sozinhas no rebase**, porque `main`
já as renomeou.

> **Divergência declarada:** o [master map](ACCOUNTING-MASTER-MAP.md) (fold 2026-08-26) registra
> **"11 ocorrências"**. Nenhuma das três contagens reproduzíveis dá 11 (7 adicionadas · 10 se somar as 3
> palavras "salon" soltas em prosa · 14 na árvore dos arquivos tocados). **Use os números desta tabela** —
> eles vêm com o comando que os produz. Quem refizer o rebase confere na hora com
> `git diff <base> claude/nfe-fase-b | grep -c "^+.*salon\."`.

**Regra do rebase:** o único sourceType que a implementação consome é o da receita da venda —
`'salon.sale.finalized'` → **`'sale.finalized'`**. Vale para o `const` e para os 5 pontos de teste.

## 8. O que esta spec deliberadamente NÃO carrega

O código em si, as **1.018 linhas de teste** (medidas em 2026-08-28 com
`git diff --numstat c1b4db84..5b6243a6 -- '*test.ts'` → `add=1018 del=1`; a estimativa de *~985* desta
spec era por baixo) e os 2 fixtures sintéticos.

**Como recuperá-los — use a TAG, não o SHA solto:**

```bash
git show nfe-fase-b-preserved:<caminho>
```

> **Emenda 2026-08-28.** O texto anterior remetia a `git show 8c4a24b9:<caminho>` *"enquanto não houver
> gc"* — verdadeiro **e com prazo**, que a spec não dizia. Medido naquela data: **nenhuma tag protegia o
> commit** (`git tag --contains 8c4a24b9` vinha vazio) e o `gc` está nos **defaults**, que podam objeto
> inalcançável em **~2 semanas**. Apagada a branch, `8c4a24b9` ficaria inalcançável e as 1.018 linhas de
> teste seriam perdidas por volta de **2026-09-11**. Com o dono ratificando **F-D1→(a) apagar e refazer**
> ([destino-brief](BE-INCR-NFE-destino-brief.md)), isso deixou de ser hipótese.
>
> **Fechado:** tag anotada **`nfe-fase-b-preserved` → `5b6243a6`**, criada **e empurrada para `origin`**
> (`git ls-remote --tags origin` confere). O commit está alcançável por referência própria — a poda do
> `gc` não o atinge mais, e apagar a branch **deixou de ser irreversível**. Prefira a tag ao SHA: ela
> sobrevive à branch, ao clone e ao `gc`.

**Artefatos não-código que viviam só na branch — todos já resgatados** (a varredura fechou em
2026-08-28; antes dela o README de fixtures ainda estava órfão):

| Artefato | Onde vive agora |
|---|---|
| Relatório do smoke-gate | [SMOKE-MIGRATION-GATE-INCR-NFE.md](SMOKE-MIGRATION-GATE-INCR-NFE.md) (`afdab682`) |
| Runbook de anonimização do XML real | [BE-INCR-NFE-fixtures-README.md](BE-INCR-NFE-fixtures-README.md) — **é o procedimento do único gate que destrava o item** |

**Sequência de reconstrução, se for refeita do zero a partir de `main`:** dependência
(`fast-xml-parser`) → parser + testes → migração `ADD COLUMN` nullable → `Payable.model`/`PayableDto`/
`IPayableRepository` → `PayableService` (fold + isolamento + `blocked`) → ~~`PostingService.attachSourceDocument`~~
→ os 2 serviços de NF-e → DTO → controller/rotas/`docs.paths` → `factory` → fixtures + a trava de
proveniência. **O gate final continua sendo o XML real anonimizado** — sem ele, todo teste verde prova o
entendimento do leiaute, não o leiaute.

> **Emenda 2026-08-28 — dois ajustes na sequência acima:**
>
> 1. **`PostingService.attachSourceDocument` SAI desta lista.** Por **F-D2→(a)** ele vira incremento
>    próprio (item **NFE-X** do Bloco A do [master map](ACCOUNTING-MASTER-MAP.md)) e entra em `main`
>    **antes** de a branch ser apagada — logo, quando a reconstrução rodar, ele **já existe**. Refazê-lo
>    aqui duplicaria o seam.
> 2. **A migração deve nascer com timestamp POSTERIOR a `20260825120000`.** A da branch
>    (`20260825120000_nfe_multi_item_discriminator`) tem timestamp **idêntico** ao do rename já mergeado
>    (`20260825120000_rename_salon_to_sale_vocabulary`) e ordena **antes** dele lexicograficamente.
>    Copiar a pasta da tag sem renomear reintroduz uma migração "no passado" em qualquer ambiente que já
>    rodou o rename.
>
> **E reconstrua já em vocabulário `sale.*`** — a árvore da tag é **pré-RN** (§7). O rebase que aplicaria
> essa regra **não vai acontecer**: F-D1 foi ratificado em **(a) apagar e refazer**, não em (b).
