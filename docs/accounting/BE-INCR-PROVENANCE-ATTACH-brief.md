# BE-INCR-PROVENANCE-ATTACH (NFE-X) — BRIEF

> **Sessão:** `sessao-planejamento` · **Data:** 2026-08-28 · **Saída:** este documento, nada mais.
> Nenhum código escrito, nenhuma branch criada.
>
> **⚖️ FORKS RATIFICADOS PELO DONO EM 2026-08-28** (entrevista, nesta sessão):
> **F-PA1→(b)** `canManage` · **F-PA2→(a)** 5 unitários + 1 de integração ·
> **F-PA3→(b)** com borda HTTP, **POST + GET**.

**As duas linhas que importam:** o incremento **deixou de ser "um método + seu teste"**. Com
**F-PA3→(b) POST+GET** ratificado, ele ganha DTO, controller, 2 rotas, `docs.paths` e +2 paths no
openapi — o núcleo continua sendo 106 linhas de serviço, mas a borda ~triplica o diff. **Nada disso
depende de oráculo externo**, então ele anda enquanto o item 11 segue travado no XML real.

**O risco não é tamanho: é que os 5 testes herdados NÃO provam a idempotência** que o método anuncia —
o fake do repositório não acumula estado, então a asserção do "segundo anexo" é encenada, não exercida.
**F-PA2→(a) fecha isso** com um teste de integração de duas chamadas reais.

---

## 1. Autorização citada

| Campo | Conteúdo |
|---|---|
| Item | **NFE-X — BE-INCR-PROVENANCE-ATTACH**, Bloco A da fila §5.1 do [ACCOUNTING-MASTER-MAP.md](ACCOUNTING-MASTER-MAP.md) (linha do item **NFE-X**) |
| Autorização | **F-D2→(a) ratificado pelo dono em 2026-08-28**, entrevista fork-a-fork registrada no [BE-INCR-NFE-destino-brief.md §8](BE-INCR-NFE-destino-brief.md). Mergeado em `main` no PR #226 (`2c04f599`) |
| Ordem | **Parte da decisão:** vem **ANTES** de apagar a `claude/nfe-fase-b` ([destino-brief §3.2](BE-INCR-NFE-destino-brief.md), passo 1) |
| Cobertura | Cobre **exatamente** este item: extrair `PostingService.attachSourceDocument` para `main`. **Não** cobre a NF-e (item 11, travado em dado externo) nem o `@@unique` do F-D4 (dívida declarada) |

**Sem divergência.** A autorização não cobre mais nem menos que o item.

## 2. Insumos lidos

- Implementação de referência via tag: `git show nfe-fase-b-preserved:server/src/features/accounting/services/PostingService.ts`.
- Testes: `…:server/src/features/accounting/services/__tests__/PostingService.test.ts` (bloco 1363–1455).
- `origin/main` (re-fetchado nesta passada, HEAD `2c04f599`): `PostingService.ts`,
  `ISourceProvenanceRepository.ts`, `auditCanonical.ts`, `IAccountingPolicy.ts`,
  `repositories/__tests__/SourceProvenance.integration.test.ts`, `lib/factory.ts`.
- [BE-INCR-NFE-destino-brief.md](BE-INCR-NFE-destino-brief.md) e [BE-INCR-NFE-fase-b-spec.md](BE-INCR-NFE-fase-b-spec.md).

## 3. Nós vizinhos — o que já existe em `main` (medido, não suposto)

| Nó | Estado em `main` | Consequência |
|---|---|---|
| `PostingService` construtor | **já recebe `sourceProvenanceRepo`** (7º parâmetro) | **nenhuma mudança de construtor** |
| Seam de proveniência | **já existe dentro de `postEntry`** (`PostingService.ts:380-406`): `createSourceDocument` + `linkEntry` + auditoria na mesma tx | o incremento **não inventa seam** — acrescenta a variante já-postado |
| `ISourceProvenanceRepository` | `createSourceDocument`, `linkEntry`, `findSourcesByEntry` — **as 3 já aceitam `tx?`** | **nenhuma mudança de repositório** |
| `auditCanonical.ts:24` | `'entry.source_recorded': ['journalEntryId','sourceDocumentId','externalRef','sourceType']` | **allowlist já correta** — bate chave a chave com o payload emitido |
| `lib/factory.ts` | `PostingService` já construído e registrado | **nenhuma mudança de factory** (as mudanças da branch ali são todas de NF-e) |
| `SourceProvenance.integration.test.ts` | **existe**, SQLite real, exercita `SourceDocument`/`JournalEntrySource` | infra de integração **já paga** — ver F-PA2 |

> **Nota CBM-001:** todas as linhas acima foram confirmadas **lendo os arquivos** de `origin/main`, não
> inferidas do grafo.

---

## 4. Checklist numerado

> Cada item é testável isoladamente. **Vocabulário: `sale.*`** — a árvore da tag é pré-RN.
> Implementação de referência: `git show nfe-fase-b-preserved:<caminho>`.

### 4.1 Serviço (o núcleo, portado da tag)

1. **Portar a interface `AttachSourceDocumentInput`** para `PostingService.ts` (6 campos opcionais).
   *Testável por:* `tsc --noEmit` limpo.
2. **Portar o método `attachSourceDocument(scope, entryId, doc)`.**
   *Testável por:* cria `SourceDocument` + `JournalEntrySource` + auditoria **numa única tx**.
3. **Gate `policy.canManage(scope)`** antes de qualquer leitura — **F-PA1→(b)**. ⚠️ **A implementação da
   tag usa `canPost`; trocar é parte do porte, não um detalhe.** *Testável por:* sem a permissão →
   `ForbiddenError`, nada escrito.
4. **Entrada-alvo inexistente no escopo → `NotFoundError`**, nada escrito (sem proveniência órfã).
   *Testável por:* `findById` devolvendo `null`.
5. **`sourceType` espelha a entrada-alvo** quando `doc.sourceType` é omitido (convenção D5).
   *Testável por:* asserção sobre o `sourceType` passado ao `createSourceDocument`.
6. **NUNCA posta:** nenhum `JournalEntry`/`Posting` criado; gates de saldo e de período **não se aplicam**
   porque nenhum `Posting` nasce. *Testável por:* `journalEntryRepo.create` e `postingRepo.create` não
   chamados.
7. **Gate de idempotência re-checado DENTRO da tx**, com `tx` propagado ao repositório
   (`authoritative-gate-inside-tx`). *Testável por:* `findSourcesByEntry` chamado com o handle da tx.
8. **Idempotência pela `externalRef` humana** (chave de acesso da NF-e, **nunca** um `sourceId` — T7):
   um segundo anexo do mesmo documento à mesma entrada devolve o `SourceDocument` existente e **não**
   cria um segundo. *Testável por:* **item 14** — o unitário herdado NÃO prova isto.
9. **Manter o limite honesto declarado por escrito** no comentário do método: sem
   `@@unique(journalEntryId, externalRef)`, dois anexos **concorrentes** da mesma chave ainda criam dois
   `SourceDocument`. **F-D4 foi ratificado em (b) dívida declarada** — o comentário é o que sustenta essa
   escolha; sem ele, (b) vira omissão. *Testável por:* leitura (revisão), não por asserção.

### 4.2 Borda HTTP — **F-PA3→(b), POST + GET**

10. **DTO Zod `.strict()`** em `dtos/SourceDocumentDto.ts`: corpo do POST + shape de resposta (§5).
    *Testável por:* teste de DTO irmão dos existentes (`DocumentAttachmentDto.test.ts` é o modelo).
11. **Controller** `sourceDocumentController.ts` com 2 handlers, no padrão do
    `documentAttachmentController` (`getFactory` → `getUserContextFromRequest` → `resolveAccountingScope`
    → `handleApiError`). *Testável por:* teste de controller.
12. **2 rotas** em `routes/accounting.ts`, **registro em 2 toques** (`routes` + `docs.paths.ts`):
    - `POST /accounting/journal-entries/:entryId/source-documents` → anexa
    - `GET  /accounting/journal-entries/:entryId/source-documents` → drill-down via `findSourcesByEntry`
      (**já existe no repositório**, não precisa de método novo)
    *Testável por:* as 2 rotas aparecem no spec servido.
13. **Leitura gateada por `policy.canRead`** — precedente do `DocumentAttachmentService`, que usa
    `canRead` para listar e `canManage` para escrever. *Testável por:* sem `canRead` → `ForbiddenError`.

### 4.3 Provas e gates

14. **Teste de integração (F-PA2→(a)):** acrescentar caso em
    `repositories/__tests__/SourceProvenance.integration.test.ts` que chame `attachSourceDocument`
    **DUAS vezes** contra SQLite real com a mesma `externalRef` e asserte **UM** `SourceDocument`.
    *Este é o único teste do incremento que falha se a idempotência quebrar.*
    **Escopo:** cobre o caso **sequencial**. O **concorrente** segue aberto por F-D4→(b) e **não** deve
    virar teste aqui — seria fabricar cobertura para dívida que o dono decidiu manter.
15. **Portar os 5 unitários** do bloco `attachSourceDocument` (tag, `PostingService.test.ts:1363-1455`),
    trocando os **2 literais `salon.sale.finalized` → `sale.finalized`** e `canPost` → `canManage`.
16. **Gates do diff:** atualizar `__dto-shapes__.json` (snapshot compartilhado) · regenerar
    `public/openapi.json` (`npm run docs:generate`) · subir o `BASELINE` do `openapi-paths.test.ts`
    de **141 → 143**. ⚠️ **O guard é `toBeGreaterThanOrEqual`, então ele passa sem a atualização** —
    subir o piso é disciplina, não obrigação do vermelho; sem isso o piso deixa de medir.
17. **`tsc --noEmit` limpo** em `server/`; suíte de contabilidade verde.

**Gates que este diff NÃO aciona** (verificado, não presumido): allowlist do `auditCanonical` (o
`eventType` já está lá, e o payload bate chave a chave) · migração (nenhuma coluna) · paridade i18n
(sem string de UI — o FE é incremento separado) · `factory.ts` (o `PostingService` já é construído e
registrado; o controller o alcança via `getFactory`).

---

## 5. Contratos

```ts
// server/src/features/accounting/services/PostingService.ts
export interface AttachSourceDocumentInput {
  externalRef?: string | null;   // referência HUMANA do documento (chave de acesso da NF-e).
                                 // NUNCA um sourceId de idempotência (T7).
  documentDate?: string | null;  // date-only 'YYYY-MM-DD'
  description?: string | null;
  attachmentId?: string | null;
  rawJson?: string | null;
  sourceType?: string | null;    // default: sourceType da entrada-alvo (convenção D5)
}

attachSourceDocument(
  scope: AccountingScope,
  entryId: string,
  doc: AttachSourceDocumentInput,
): Promise<SourceDocument>;
```

**Efeitos, em UMA tx:** `createSourceDocument(…, tx)` → `linkEntry(…, tx)` → `auditService.append(tx, …)`
com `eventType: 'entry.source_recorded'`.
**Erros:** `ForbiddenError` (permissão), `NotFoundError` (entrada fora do escopo).
**Valor no razão escrito: nenhum.**

### 5.2 DTO da borda HTTP (F-PA3→(b))

```ts
// server/src/features/accounting/dtos/SourceDocumentDto.ts
export const AttachSourceDocumentSchema = z.object({
  externalRef:  z.string().trim().min(1).max(255).optional(),
  documentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),  // date-only
  description:  z.string().trim().max(500).optional(),
  attachmentId: z.string().optional(),
  rawJson:      z.string().optional(),
  sourceType:   z.string().trim().max(100).optional(),
}).strict();

export const SourceDocumentResponseSchema = z.object({
  id: z.string(), sourceType: z.string(),
  externalRef: z.string().nullable(), documentDate: z.string().nullable(),
  description: z.string().nullable(), attachmentId: z.string().nullable(),
  createdAt: z.string(),
});
```

> ⚠️ **`documentDate` — a regex NÃO valida calendário.** `2026-02-30` passa no regex e o `new Date()`
> rola para 02-mar em silêncio (memória: `date-only-regex-nao-valida-calendario`). **Use o
> `isValidDateOnly` já existente** no `.refine()`, como os DTOs irmãos fazem — não repita a regex crua.
>
> ⚠️ **Nenhum campo booleano aqui** — de propósito. Se algum for acrescentado, **não** use
> `z.coerce.boolean()` em query string: `?flag=false` vira `true` (memória:
> `zod-coerce-boolean-inverte-query-string`, ABERTO em dois DTOs).

**Rotas** (registro em 2 toques — `routes/accounting.ts` + `docs.paths.ts`):

| Verbo | Path | Policy | Serviço |
|---|---|---|---|
| `POST` | `/accounting/journal-entries/:entryId/source-documents` | `canManage` | `attachSourceDocument` |
| `GET` | `/accounting/journal-entries/:entryId/source-documents` | `canRead` | `findSourcesByEntry` (já existe) |

**Auth:** deny-by-default no middleware; as rotas de `accounting.ts` **não** carregam middleware de role
— a policy fica no serviço, como em todo o módulo (verificado).

---

## 6. Forks — **3/3 RATIFICADOS pelo dono em 2026-08-28**

| Fork | Decisão | Contra a recomendação inicial? |
|---|---|---|
| **F-PA1** permissão | ✅ **(b) `canManage`** | a recomendação **mudou** durante a entrevista, com evidência |
| **F-PA2** profundidade do teste | ✅ **(a) 5 unitários + 1 integração** | não |
| **F-PA3** borda HTTP | ✅ **(b) com borda, POST + GET** | **SIM** — a sessão recomendou (a) sem borda |

### F-PA1 — Qual permissão gateia o anexo? · ✅ **RATIFICADO → (b) `canManage`**

A branch usa **`canPost`**. Anexar proveniência a um lançamento **já postado** não cria valor contábil,
então `canPost` é discutível: é a permissão de *escrever no razão*, e aqui nada é escrito no razão.

- **(a) `canPost`** — como na branch.
- **(b) `canManage`** — trata proveniência como metadado administrativo. ✅ **RATIFICADO**
- **(c) `canReconcile`** — o consumidor futuro é a reconciliação NF-e×venda.

> **Recomendação inicial: (a).** O dono pediu mais informação em vez de decidir — e a informação
> **derrubou a recomendação**. Duas medidas feitas então:
>
> 1. **As três policies são IDÊNTICAS hoje** — `canManage`, `canPost` e `canReconcile` todas retornam
>    `!!scope.actorUserId` (`AccountingPolicy.ts:10-29`). São placeholders: a escolha **não tem
>    consequência de runtime agora**; ela registra a **intenção** para quando o RBAC granular
>    (item 14 da fila, ⚫ diferido) as tornar reais.
> 2. **Existe precedente direto, e ele contradiz (a).** O `DocumentAttachmentService` — que anexa
>    evidência ao **mesmo alvo** (`journal_entry`) — usa **`canManage`** para anexar e excluir, e
>    `canRead` para ler. Em `main`, `canPost` gateia **só quem escreve valor**: `postEntry`,
>    `ExerciseClosingService` (encerramento) e as duas outras operações de posting.
>
> **Regra que o precedente expõe:** *escreve valor no razão → `canPost`; anexa evidência a um lançamento
> → `canManage`*. `attachSourceDocument` não escreve valor. **(b) faz as duas formas de anexar evidência
> gatearem igual**, em vez de divergirem sem razão.
>
> **✅ DECISÃO DO DONO: (b).** Consequência para quem executa: **trocar `canPost` por `canManage` faz
> parte do porte** — a implementação da tag traz `canPost`, e copiá-la sem atenção viola a ratificação.
> A leitura (GET) usa `canRead`, pelo mesmo precedente.

### F-PA2 — Profundidade do teste: os 5 unitários bastam? · ✅ **RATIFICADO → (a)**

**Medido, e é o achado central deste BRIEF.** O bloco de teste da branch tem 5 casos, mas o fake padrão é
`findSourcesByEntry: jest.fn(async () => [])` — **sem estado**. O caso de idempotência **não faz duas
chamadas**: ele *sobrescreve* o fake com um vínculo pré-existente e chama **uma** vez. Isso exercita o
ramo do curto-circuito, mas **não** prova a sequência real "anexa → anexa de novo". Contra o fake padrão,
duas chamadas criariam **dois** `SourceDocument` e **nenhum dos 5 testes falharia**.

> **Correção de registro:** o [destino-brief §5.2](BE-INCR-NFE-destino-brief.md) afirmou que o invariante
> era provado por um "par ordenado" que "vale na segunda chamada". **Está impreciso** — o que existe é um
> fake pré-semeado. A afirmação superestimava a cobertura, e quem executar precisa saber disso.
>
> Isto é a classe já registrada na memória do projeto: `comentario-de-teste-afirma-o-que-nao-assere` e
> `repositorios-de-contabilidade-nao-sao-exercitados` (serviço testa repo FALSO, `mutation_score 0/7`).

- **(a) Portar os 5 unitários + acrescentar UM teste de integração** que chame `attachSourceDocument`
  **duas vezes** contra SQLite real e asserte **um** `SourceDocument`.
- **(b) Só os 5 unitários**, como na branch.
- **(c) Unitários + um fake com estado** (o `findSourcesByEntry` passa a devolver o que foi criado).

> **Recomendação: (a).** É barato **porque a infra já está paga**: `SourceProvenance.integration.test.ts`
> já existe em `main`, já sobe SQLite real e já exercita `SourceDocument`/`JournalEntrySource` — inclusive
> um caso de "re-vincular o mesmo par não duplica". Acrescentar um caso ali é o menor teste que **falha se
> a idempotência quebrar**, que é a definição de teste que vale. **(c) é mais barato e pior:** um fake com
> estado prova que o fake acumula, não que o banco impede — e o limite honesto do método é justamente
> sobre o que o SQLite faz sob concorrência. **(b) entrega um seam cujo invariante anunciado ninguém
> checou.** **Nota de escopo:** o teste de (a) cobre o caso **sequencial**; o **concorrente** segue aberto
> por F-D4→(b) e **não** deve ser transformado em teste aqui — seria fabricar cobertura para uma dívida
> que o dono decidiu manter.
>
> **✅ DECISÃO DO DONO: (a).** É o item 14 do checklist, e é **o único teste do incremento que falha se a
> idempotência quebrar** — os outros 16 itens podem estar verdes com o invariante quebrado.

### F-PA3 — Borda HTTP: entra agora ou não? · ✅ **RATIFICADO → (b)** *(contra a recomendação)*

Verificado na branch: **não existe** controller nem rota para `attachSourceDocument` — o único chamador é
o `NfeSaleReconciliationService`, que **não vem** neste incremento. Logo, ao entrar em `main` o método
nasce com **zero call sites**.

- **(a) Sem borda HTTP** — método de serviço, esperando o consumidor (a NF-e).
- **(b) Com borda HTTP** (`POST /accounting/entries/:id/source-documents` + DTO + rota + docs.paths).

> **Recomendação: (a).** (b) multiplicaria o incremento por ~4 (DTO Zod `.strict()`, controller, rota em
> 2 toques, snapshot de shape, path-count do openapi) para expor uma operação que **nenhuma tela pede** —
> e a casa separa `BE-INCR-*` de `FE-INCR-*`, então a borda sem consumidor é dívida, não entrega.
> **Contra-argumento que o dono deve pesar:** sob (a), o incremento entra **sem nenhum consumidor** — foi
> exatamente a objeção que a sessão anterior levantou contra extrair, e que você derrubou com a razão de
> que a implementação revisada se preserva melhor em `main` que na memória.
>
> **✅ DECISÃO DO DONO: (b) — com borda, POST + GET.** A recomendação (a) **não foi acatada**, e a decisão
> resolve a tensão que (a) só contornava: sob (a) o método entraria em `main` **sem nenhum consumidor** e
> **sem forma de ser exercitado por fora** — exatamente a objeção original contra extrair. **(b) elimina o
> "zero call sites"**: a rota é o consumidor, e o GET torna o POST verificável pela própria API.
>
> **Consequências assumidas, que a sessão havia citado como custo de (b):** DTO Zod `.strict()`,
> controller, 2 rotas em 2 toques, `docs.paths`, snapshot `__dto-shapes__.json`, +2 paths no openapi.
> **O diff ~triplica** — e é por isso que o §4 foi reorganizado em 3 blocos (serviço · borda · provas).
> **Leitura ratificada junto:** o GET usa o `findSourcesByEntry` que **já existe** no repositório — não
> nasce método novo de repositório.

---

## 7. Pendente de validação externa

**Nada.** Este incremento não depende de PVA, contador, XML de NF-e nem arquivo RFB. Ele não toca regra
contábil, fiscal ou legal — move um seam de metadado de proveniência que já existe em `main` na variante
irmã. **É o raro item da fila da NF-e sem oráculo externo aberto** — e é por isso que ele pode andar
enquanto o item 11 segue travado.

## 8. Insumos ausentes

**Nenhum.** Todos os contratos vizinhos foram lidos em `origin/main` nesta passada e a implementação de
referência está recuperável pela tag `nfe-fase-b-preserved`, verificada nesta sessão.

## 9. Achados fora de escopo (registrados, NÃO planejados — ORCH-006)

1. **A exposição do F-D4 não é só da NF-e.** A variante `postEntry` de `main` grava proveniência **hoje**
   sem `@@unique(journalEntryId, externalRef)` — mesma corrida concorrente, já em produção-de-código.
   **F-D4→(b) manteve como dívida declarada**; registro aqui só para que o item NFE-X **não** seja lido
   como se a fechasse.
2. **A imprecisão do destino-brief §5.2** (ver F-PA2) sugere que a frase "provado só no teste" merece
   conferência sempre que for usada como argumento de preservação. Não varri outros documentos atrás
   disso — seria varredura fora do item.

---

## 10. Autoavaliação [OPS-001]

1. **Objetivo sob a letra:** a letra pedia planejar a extração; o objetivo é que o seam entre em `main`
   **preservando o que a revisão dele já garantiu**. Por isso o BRIEF gasta mais linha no que os testes
   **não** provam (F-PA2) do que na mecânica de mover 106 linhas — mover é trivial, a garantia é que não.
2. **Graus.** *Verificado* (lido nesta passada): construtor já recebe `sourceProvenanceRepo`; seam já
   existe em `postEntry:380-406`; as 3 assinaturas do repo aceitam `tx?`; allowlist bate chave a chave;
   `factory.ts` não precisa mudar; infra de integração existe; 106 linhas de serviço, 93 de teste, 2
   literais `salon.*` no bloco de teste e 0 no método; **fake sem estado**. *Inferido:* que (b) do F-PA3
   multiplicaria o diff por ~4 — estimativa por analogia com incrementos irmãos, não medida.
   *Assumido:* nada material.
3. **Caso adversarial:** tentei derrubar a recomendação (a) do F-PA2 procurando prova de que os 5
   unitários já cobrem a idempotência. **Falhou contra mim** — li o `buildService` e o fake devolve `[]`
   sempre, o que **inverteu** minha leitura anterior (registrada no destino-brief §5.2) e virou o achado
   central. Também testei se a extração arrastaria factory/allowlist: **não arrasta**, o que tornou o
   incremento menor do que eu supunha.
4. **Checagem que teria falhado se eu estivesse errado:**
   `git show nfe-fase-b-preserved:…/PostingService.test.ts | sed -n '131,136p'` — se o fake acumulasse
   estado, F-PA2 não existiria e a recomendação seria (b).
5. **Viés próprio nomeado:** tendo acabado de preservar esta implementação, há incentivo a tratá-la como
   pronta e recomendar "porte e siga". A recomendação (a) do F-PA2 vai contra esse incentivo — pede
   trabalho **além** do que a branch tinha.
   **O viés apareceu onde eu não o havia nomeado:** recomendei (a) no F-PA1 e no F-PA3 em boa parte
   *porque era o que a branch já fazia* — "não divergir da implementação revisada" foi argumento explícito
   nos dois. Nos dois o dono não acatou, e nos dois havia evidência contra que eu **só fui buscar quando
   provocado**: o precedente do `DocumentAttachmentService` (F-PA1) existia o tempo todo e eu não o
   procurei antes de recomendar. **Lição: "a branch faz assim" não é evidência — é inércia.**

**Regras de escopo respeitadas:** nenhum código escrito · nenhuma branch criada · nenhuma spec de outro
item editada · nada dimensionado além do item autorizado · **nenhum fork auto-ratificado** — as 3
decisões vieram do dono, e as duas em que a recomendação caiu estão registradas como tal.

---

## 11. Próximos passos

| # | Passo | Sessão | Estado |
|---|---|---|---|
| 1 | **Executar este BRIEF** (17 itens do §4) | `sessao-feature` | **pronto para abrir** — 3/3 forks ratificados, zero insumo ausente, zero gate externo |
| 2 | Review independente | agente separado, worktree própria | PASS da sequência que implementou é rejeitado |
| 3 | Apagar `claude/nfe-fase-b` | destrutiva, própria | **depois** do passo 2; tag `nfe-fase-b-preserved` já em `origin` |
| 4 | Reconstruir a NF-e | `sessao-feature` | travado no **XML real anonimizado** |

**Este BRIEF satisfaz a definição de pronto da `sessao-feature`:** checklist numerado e individualmente
testável (§4), contratos em forma de schema (§5), forks **ratificados** (§6), zero pendência de validação
externa (§7), zero insumo ausente (§8).

> **Ao abrir a sessão de feature, leve estas 3 armadilhas** — todas já registradas na memória do projeto
> e todas ao alcance deste diff: **(i)** `canPost` → `canManage` no porte (§4.1 item 3); **(ii)**
> `isValidDateOnly` no `documentDate`, nunca só a regex (§5.2); **(iii)** o unitário herdado **não** prova
> a idempotência — o item 14 é que prova.
