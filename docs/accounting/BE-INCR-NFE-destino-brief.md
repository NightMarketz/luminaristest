# BE-INCR-NFE — BRIEF de DESTINO da `claude/nfe-fase-b`

> **Sessão:** `sessao-planejamento` · **Data:** 2026-08-28 · **Saída:** este documento + os 3 passos
> não-destrutivos de preservação (§3.1), autorizados na entrevista.
> Nenhum código de aplicação tocado, **nenhum git de escrita contra `claude/nfe-fase-b`**.
> A branch segue viva, local e em `origin`, no HEAD `5b6243a6`.
>
> **⚖️ FORKS RATIFICADOS PELO DONO EM 2026-08-28** (entrevista fork-a-fork, nesta sessão):
> **F-D1→(a)** apagar e refazer · **F-D2→(a)** extrair o seam, **antes** de apagar ·
> **F-D3** sem objeto sob (a) · **F-D4→(b)** dívida declarada · **F-D5→(a)** dívida declarada (confirma).

**As duas linhas que importam:** o dono ratificou **(a) apagar e refazer** — **contra** a recomendação
desta sessão, que era (b) por assimetria de custo. Isso **inverte a urgência**: sob (a) a preservação
deixa de ser precaução e vira a única coisa que segura 1.018 linhas de teste, porque o ponteiro da spec
(`git show 8c4a24b9`) **expirava em ~2 semanas** sem tag. **Os três passos de preservação foram
executados e confirmados nesta sessão** (§3.1) — a tag `nfe-fase-b-preserved` está em `origin`.
**Apagar a branch NÃO foi feito aqui** e não é desta sessão: é a metade destrutiva, e o próprio dono a
sequenciou **depois** da extração do `attachSourceDocument` (F-D2).

---

## 1. Autorização citada

| Campo | Conteúdo |
|---|---|
| Item | **NF-e (ingestão fiscal)** — item **11** da fila §5.1 do [ACCOUNTING-MASTER-MAP.md](ACCOUNTING-MASTER-MAP.md) |
| Autorização | [ADR-INCR-NFE](../adr/ADR-INCR-NFE-fiscal-ingestion.md) **RATIFICADO fork-a-fork pelo dono em 2026-07-20** (PR #131); re-priorizado pelo dono na mesma data como "próximo incremento sequenciado logo APÓS o estoque" |
| Autorização do **resíduo** aqui tratado | Commit `db1a227f` (2026-08-28), corpo: *"Item 11 da fila, **metade não-destrutiva** […] A branch **NÃO** foi apagada — apagar é a parte irreversível e **espera o carimbo do ADR-P2**."* |
| Cobertura | A autorização cobre **exatamente** este item. A metade não-destrutiva já foi executada (spec + smoke-gate transportados). **A metade destrutiva — apagar a branch — é o que este BRIEF formula e NÃO decide.** |

**Divergência declarada (não bloqueante):** a autorização abre o item 11; ela **não** carimba a escolha
entre (a) e (b). Por isso este documento sai com forks PENDENTES — é a forma correta de pausar em
planejamento (regra 4 do formulário).

## 2. Insumos lidos

- [BE-INCR-NFE-fase-b-spec.md](BE-INCR-NFE-fase-b-spec.md) (205 linhas, `db1a227f`) — spec de reconstrução.
- [SMOKE-MIGRATION-GATE-INCR-NFE.md](SMOKE-MIGRATION-GATE-INCR-NFE.md) (`afdab682`) — transporte **fiel**
  verificado por `diff` contra a versão da branch: **conteúdo íntegro**, só um parágrafo de proveniência
  acrescido.
- [BE-INCR-NFE-impl-plan.md](BE-INCR-NFE-impl-plan.md), [BE-INCR-NFE-integration-plan.md](BE-INCR-NFE-integration-plan.md),
  [BE-INCR-NFE-layout-transcription.md](BE-INCR-NFE-layout-transcription.md).
- Árvore da branch via `git show claude/nfe-fase-b:<caminho>` (leitura, nunca checkout).
- `origin/main` re-fetchado nesta passada antes de qualquer medida.

> **Nota de link — ✅ resolvida.** Os dois primeiros insumos nasceram noutra branch
> (`claude/validacao-fiscal-sequencial-048dfa`, commits `db1a227f` e `afdab682`) e foram lidos aqui por
> `git show`. **Em 2026-08-28 os quatro documentos da NF-e foram juntados nesta branch** por
> fast-forward — as duas partiam do mesmo `b1da7e62` (= `origin/main`), então não houve merge nem
> rebase, e o histórico ficou linear: `db1a227f` → `afdab682` → o commit desta sessão.
> **Todos os links relativos deste BRIEF foram conferidos em disco e resolvem.** O conjunto vive junto:
> [spec](BE-INCR-NFE-fase-b-spec.md) · [smoke-gate](SMOKE-MIGRATION-GATE-INCR-NFE.md) ·
> [runbook de fixtures](BE-INCR-NFE-fixtures-README.md) · este BRIEF.

---

## 3. Checklist numerado — o que cada saída exige

> Estes são **passos executáveis e verificáveis individualmente**, não prosa. Quem os executar será a
> `sessao-integracao` (saída (b)) ou a `sessao-feature` sobre a spec (saída (a)) — **nunca esta**.

### 3.1 Passos de PRESERVAÇÃO — ✅ **EXECUTADOS E CONFIRMADOS em 2026-08-28**

Autorizados na entrevista. Não-destrutivos; sob F-D1→(a) são o que impede a perda.

1. ✅ **Artefato não-código órfão resgatado.** `server/src/lib/__tests__/fixtures/nfe/README.md` →
   [BE-INCR-NFE-fixtures-README.md](BE-INCR-NFE-fixtures-README.md). Transporte **íntegro**, verificado
   por `diff` contra o original (só o cabeçalho de proveniência acrescido e o link relativo da linha 8
   reapontado — o arquivo mudou de diretório). Alvo do link conferido em disco.
2. ✅ **Commit ancorado em referência durável.** Tag anotada **`nfe-fase-b-preserved`** → `5b6243a6`.
   *Verificado:* `git tag --contains 8c4a24b9` **deixou de sair vazio**. A mensagem da tag carrega o que
   ela preserva e o aviso de que a árvore é PRÉ-RN.
3. ✅ **Tag empurrada para `origin`.** *Verificado:* `git ls-remote --tags origin` lista
   `refs/tags/nfe-fase-b-preserved` desreferenciando para `5b6243a6`.

> **Consequência:** apagar `claude/nfe-fase-b` **deixou de ser irreversível**. A implementação inteira
> segue recuperável por `git show nfe-fase-b-preserved:<caminho>` independentemente da branch e do `gc`.
> **A branch NÃO foi apagada nesta sessão.**

### 3.2 Saída RATIFICADA (a) — apagar e REFAZER da spec · sequência de execução

> **Ordem imposta pelo dono na entrevista:** a extração do seam vem **ANTES** do apagamento, para que
> ele entre em `main` com a implementação de referência ainda viva e revisada, e não reconstruído de
> memória. Cada passo é de **outra sessão** — nenhum é desta.

1. **[incremento próprio, F-D2→(a)] Extrair `PostingService.attachSourceDocument` para `main`.**
   `sessao-feature` sobre §4 deste BRIEF. Já existe em `main`: `ISourceProvenanceRepository` (com `tx?`
   nas 3 assinaturas) e `'entry.source_recorded'` na allowlist do `auditCanonical.ts:24` — **a extração
   não acrescenta eventType nenhum**. Portar já em vocabulário `sale.*`.
   *Verificável por:* `git grep attachSourceDocument origin/main` deixar de sair vazio + teste do par
   ordenado (a asserção vale na **segunda** chamada — §5.2).
2. **Apagar `claude/nfe-fase-b`** local e em `origin`. **Não é mais irreversível** — a tag
   `nfe-fase-b-preserved` está em `origin` (3.1.2/3.1.3). Sessão própria; não é planejamento.
3. **[quando o XML real chegar] Reconstruir** pela sequência da [spec §8](BE-INCR-NFE-fase-b-spec.md):
   dependência → parser → migração → modelos → `PayableService` → serviços → DTO → wiring → fixtures +
   trava de proveniência. **Já em vocabulário `sale.*`**, e **sem** o passo `attachSourceDocument`, que
   terá entrado em `main` no passo 1.
   **A migração nasce com timestamp posterior a `20260825120000`** — ver F-D3, que perdeu objeto mas
   deixou este requisito.
4. Atualizar o snapshot `__dto-shapes__.json` e o path-count do `openapi-paths.test.ts` (+2).
5. Manter o `blocked` do multi-item como está — **F-D5→(a) confirmado**, é requisito, não omissão.

**Custo aceito pelo dono:** **1.018 linhas de teste** (`git diff --numstat`, `*test.ts`: add=1018 del=1)
e 2 fixtures sintéticos a reescrever. **Recuperáveis** por `git show nfe-fase-b-preserved:<caminho>` —
a reconstrução pode consultá-los como referência em vez de reinventá-los.
**Total da branch:** 34 arquivos / +3.143 −42.

### 3.3 Saída (b) — rebasear e mergear · **NÃO ESCOLHIDA** (registro da alternativa medida)

Preservado como registro do que foi pesado, não como plano. Medidas: **27 commits** de distância
(`git rev-list --count origin/claude/nfe-fase-b..origin/main`; a branch está 2 commits à frente),
**6 arquivos em colisão**, **0 conflito textual** (`git merge-tree` exit 0). Exigiria a regra do rebase
RN (`'salon.sale.finalized'` → `'sale.finalized'`: 1 `const` em `NfeSaleReconciliationService.ts:27` +
5 pontos de teste) e o rename da pasta de migração (F-D3). **O merge seguiria travado pelo XML real.**

---

## 4. Contratos em jogo (esboço, não prosa)

Nenhum contrato **novo** nasce deste BRIEF — ele decide o destino de contratos já esboçados na spec.
Os que a decisão move:

```prisma
// Migração da branch — ADD COLUMN nullable de propósito (rebuild de tabela no SQLite derruba FK/índice)
model Payable {
  inventoryMultiItem Boolean?   // 3 modos: null = pré-NF-e · false = SKU único · true = multi-item
}
```

```ts
// Seam da branch, ausente de `main` — ver §5 e F-D2: a premissa precisa de correção
export interface AttachSourceDocumentInput {
  externalRef?: string | null;   // chave de acesso da NF-e — referência HUMANA, nunca sourceId (T7)
  documentDate?: string | null;  // date-only YYYY-MM-DD
  description?: string | null;
  attachmentId?: string | null;
  rawJson?: string | null;
  sourceType?: string | null;    // default: sourceType do lançamento-alvo (convenção D5)
}
attachSourceDocument(scope, entryId, doc): Promise<SourceDocument>
```

```prisma
// Resíduo (i) — NÃO existe hoje; fecharia a corrida de anexos concorrentes. Exige migração.
model SourceDocument { @@unique([journalEntryId, externalRef]) }
```

---

## 5. Suficiência da spec — respondido com evidência

**A spec é suficiente para reconstruir o comportamento; ela NÃO é suficiente para sobreviver ao
apagamento da branch.** Os dois achados abaixo são o que ela não carrega e seria caro redescobrir.

### 5.1 O ponteiro de resgate da §8 tem prazo de validade — e a spec não diz isso

A spec §8 remete a `git show 8c4a24b9:<caminho>` *"enquanto não houver gc"*. Medido nesta passada:

| Checagem | Resultado **antes** (2026-08-28, manhã) | Resultado **agora** |
|---|---|---|
| `git tag --contains 8c4a24b9` | **vazio — nenhuma tag protegia o commit** | ✅ `nfe-fase-b-preserved` |
| tag em `origin` | inexistente | ✅ `refs/tags/nfe-fase-b-preserved` → `5b6243a6` |
| `gc.pruneExpire` / `gc.reflogExpireUnreachable` | **vazio — defaults** (poda de inalcançável em **2 semanas**) | inalterado, **mas irrelevante**: o commit está alcançável por tag |

Apagada a branch (local **e** em `origin`), `8c4a24b9` ficaria **inalcançável** e entraria na fila de
poda do `gc` automático — **as 1.018 linhas de teste e os 2 fixtures deixariam de ser recuperáveis por
volta de 2026-09-11**. A frase "o commit sobrevive à branch" era verdadeira **e** tinha prazo: a spec
registrava a primeira metade e omitia a segunda.

> **Este achado deixou de ser hipotético quando o dono ratificou F-D1→(a).** Sob (a) ele era a diferença
> entre apagar e perder. **Fechado nesta sessão** pelos passos 3.1.2/3.1.3.
>
> **Julgamento pedido:** a declaração da §8 ("não carrego código nem testes") é **aceitável como escopo**
> — uma spec de reconstrução não deve duplicar 1.018 linhas de teste. O que **não** era aceitável é a
> declaração vir sem a condição de durabilidade do ponteiro que ela oferece em troca.
> **Pendência barata que sobra:** a §8 da spec ainda cita `8c4a24b9` e a ressalva do `gc`; deveria citar
> a tag. Uma linha — não emendei a spec porque ela é insumo de outro item (regra 1 do formulário).

### 5.2 Invariante provado SÓ no teste, ausente da spec

O limite honesto da idempotência de `attachSourceDocument` está documentado **no comentário do código**
(e a spec o carrega). Mas o **par ordenado** que o prova — que a asserção vale na **segunda** chamada,
não na primeira — vive apenas em `PostingService.test.ts`. É exatamente a classe já registrada na memória
do projeto (`comentario-de-teste-afirma-o-que-nao-assere`): quem refizer do zero a partir da spec escreve
o teste da **primeira** chamada, que passa vacuamente. **Redescoberta cara, e silenciosa.**

### 5.3 O que o git NÃO acusa no rebase — risco medido da saída (b)

`git merge-tree --write-tree origin/main origin/claude/nfe-fase-b` retorna **exit 0, zero conflito**.
Isso é boa notícia para o esforço e **má** notícia para a segurança: os literais RN pré-rename **não
colidem textualmente** — eles entram limpos e errados.

Confirmado por leitura: a guarda `renameVocabularyGuard.test.ts` de `main` é **escopada a 3 lugares
nomeados** (fixture do binding, 5 mappers, 5 event-builders do `AccountingSyncPort`) — ela **não varre a
árvore** atrás de `salon.*`. Um arquivo **novo** como `NfeSaleReconciliationService.ts` carregando
`'salon.sale.finalized'` **não é pego por nenhum gate**. Efeito: a reconciliação de venda busca um
`sourceType` que `main` já renomeou nos dados **e** no vocabulário → **nunca casa, e não reclama**.

7 dos 34 arquivos da branch carregam literais `salon.*`; 5 deles estão no conjunto de colisão.

---

## 6. Varredura final do que só existe na branch — ✅ **agora está limpa**

`git diff --name-only c1b4db84..origin/claude/nfe-fase-b`, filtrando código:

| Artefato | Situação |
|---|---|
| `docs/accounting/SMOKE-MIGRATION-GATE-INCR-NFE.md` | ✅ resgatado em `afdab682` (transporte fiel verificado por `diff`) |
| `docs/accounting/BE-INCR-NFE-fase-b-spec.md` | ✅ gravado em `db1a227f` |
| `server/prisma/migrations/…_nfe_multi_item_discriminator/migration.sql` | código (1 `ADD COLUMN`) — íntegro na spec §5 |
| `server/src/lib/__tests__/fixtures/nfe/README.md` | ✅ **resgatado NESTA sessão** → [BE-INCR-NFE-fixtures-README.md](BE-INCR-NFE-fixtures-README.md) |

**Por que o README importava.** Ele é o **runbook do gate humano**: carrega o **protocolo de
anonimização** do XML real — quais campos trocar (`CNPJ`/`CPF`/`xNome`/endereço/`IE`, zerar
`<Signature>`), quais **preservar** (`vProd`, `vDesc`, `vFrete`, `vIPI`, `vST`, `vNF`, `qCom`, `cStat`,
o formato da chave de 44 dígitos com `@Id = NFe + chNFe`) e como destravar o CI. Pelo CLAUDE.md,
artefato de **gate humano / dado externo** não tem sessão de agente — o formato dele é
`RUNBOOK-FORMAT.md`. **Perdê-lo custaria exatamente o gate que bloqueia o item há mais tempo** — e sob
F-D1→(a) ele seria perdido junto com a branch.

> **Nota de premissa:** o pedido desta sessão dava a varredura por concluída ("já foram resgatados a
> spec e o relatório do smoke-gate"). Ela **não estava** — este arquivo faltava. Está fechado agora.
> Todo o resto do delta da branch é código, coberto pela spec e pela tag `nfe-fase-b-preserved`.

---

## 7. Pendente de validação externa (não destravável por esta sessão nem por nenhuma sessão de agente)

1. **XML real de NF-e 4.00 anonimizado** — 1 de compra (CFOP de entrada 1102/2102…) e 1 de venda.
   `nfe-fixture-provenance.test.ts` falha **de propósito** enquanto qualquer fixture carregar o marcador
   `SYNTHETIC-FIXTURE-NOT-REAL` (4 ocorrências confirmadas na branch nesta passada). O check
   `Server – typecheck & test` é obrigatório na branch protection de `main` ⇒ **merge travado**.
   **Este BRIEF não destrava e não finge destravar.** Enquanto for sintético, todo teste verde prova o
   entendimento do leiaute, não o leiaute (lição I052).
2. **Custo D3 — `vICMS` NÃO subtraído** do custo de aquisição (risco ALTO nomeado na spec §5). É regra
   **fiscal**: pela regra 3 do formulário, não entra em checklist sem artefato de origem. **Exige
   contador**, não agente.

---

## 8. Forks — **5/5 RATIFICADOS pelo dono em 2026-08-28** (entrevista fork-a-fork)

| Fork | Decisão | Contra a recomendação? |
|---|---|---|
| **F-D1** Destino da implementação | ✅ **(a) apagar e refazer** | **SIM** — a sessão recomendou (b) |
| **F-D2** Extrair `attachSourceDocument` | ✅ **(a) extrair, ANTES de apagar** | **SIM** — a sessão recomendou (b) |
| **F-D3** Colisão de timestamp de migração | ⚪ **sem objeto sob (a)** | — (vira requisito, não fork) |
| **F-D4** `@@unique(journalEntryId, externalRef)` | ✅ **(b) dívida declarada** | **SIM** — a sessão recomendou (a) |
| **F-D5** Breakdown por SKU / `blocked` | ✅ **(a) dívida declarada** | não — confirma |

> **Leitura do conjunto (3 de 4 contra a recomendação):** as três divergências são **coerentes entre si**
> e apontam para uma preferência que a sessão não tinha peso para inferir sozinha — **não carregar
> estado não-mergeado**. (a) no F-D1 tira a branch do ar; (a) no F-D2 resgata para `main` o único pedaço
> com valor próprio antes disso; (b) no F-D4 recusa abrir item de fila novo por corrida que não existe
> em produto nunca implantado. A recomendação (b) do F-D1 otimizava **custo de reescrita**; a decisão
> otimizou **superfície pendente**. Registrado porque é a razão pela qual a recomendação errou o alvo,
> e não porque a medida estivesse errada.

### F-D1 — Destino da implementação · ✅ **RATIFICADO → (a)** *(contra a recomendação)*

- **(a) Apagar e refazer da spec.** Custo: reescrever 1.018 linhas de teste + 2 fixtures. Ganho: `main`
  sem branch pendurada; a reconstrução nasce pós-RN, sem dívida de vocabulário.
- **(b) Rebasear e mergear.** Custo: 27 commits de distância, 6 arquivos em colisão, **0 conflito
  textual**, 6 literais RN a trocar à mão, 1 pasta de migração a renomear (F-D3). Ganho: preserva 1.018
  linhas de teste e o smoke-gate PASS já rodado.

> **Recomendação: (b).** Justificativa por medida, não por impressão: o merge é textualmente limpo e a
> distância é de 27 commits — o custo real de (b) é **6 substituições de literal + 1 rename de pasta**,
> contra **1.018 linhas de teste** que (a) manda reescrever. A assimetria é de duas ordens de grandeza.
> **Contra-argumento honesto, que é do dono pesar:** (b) preserva testes escritos contra fixtures
> **sintéticos** — eles provam a mecânica do parser, não o leiaute. Se o XML real desmentir a
> transcrição, parte das 1.018 linhas é reescrita de qualquer jeito, e (a) fica retroativamente barata.
> **Nenhuma das duas se destrava antes do XML real** — o fork decide o que se preserva na espera, não
> quando o item entrega.
> **Nota de ordem:** (a) e (b) só divergem **depois** de 3.1.1–3.1.3. Fazer os três passos comuns
> **agora** é gratuito e mantém as duas portas abertas.
>
> **✅ DECISÃO DO DONO: (a).** A recomendação (b) **não foi acatada**. O que a decisão muda na prática:
> os passos 3.1.1–3.1.3 deixam de ser "preservar opcionalidade" e viram **pré-condição do apagamento** —
> por isso foram executados imediatamente nesta sessão. O contra-argumento que a própria recomendação
> registrava (os testes preservados foram escritos contra fixtures **sintéticos**, e o XML real pode
> desmentir a transcrição) é o que sustenta (a). **Apagar não foi feito aqui** e vem **depois** do F-D2.

### F-D2 — Extrair `PostingService.attachSourceDocument` para `main` por si? · ✅ **RATIFICADO → (a)** *(contra a recomendação)*

> **A premissa do pedido precisa de uma correção medida.** `git grep attachSourceDocument origin/main`
> sai vazio — o **método** de fato não existe. Mas o **seam de proveniência não está faltando em `main`**:
> `main:PostingService.ts:380-406`, **dentro de `postEntry`**, já escreve `createSourceDocument` +
> `linkEntry` + auditoria `entry.source_recorded` na mesma tx; `ISourceProvenanceRepository` existe (com
> `tx?` nas 3 assinaturas) e `'entry.source_recorded'` **já está na allowlist** do `auditCanonical.ts:24`.
> A própria diff da branch **não acrescenta eventType nenhum** — só um comentário. O que falta em `main`
> é **apenas a variante "anexar a lançamento JÁ POSTADO sem repostar"**.

- **(a) Extrair como incremento próprio** (item de fila novo).
- **(b) Não extrair — viaja junto com a NF-e.**

> **Recomendação: (b).** Em `main` hoje **não existe consumidor**: o único chamador é a reconciliação de
> venda D2b, que é NF-e. Extrair criaria um método público com zero call sites — abstração especulativa.
>
> **✅ DECISÃO DO DONO: (a) — extrair, e ANTES de apagar a branch.** A recomendação (b) **não foi
> acatada**, e a razão desfaz a objeção: sob F-D1→(a) o método **vai ser reescrito de qualquer jeito**
> na reconstrução. Extrair agora não cria abstração especulativa — **transporta implementação já
> revisada** enquanto a referência está viva, em vez de reconstruí-la de memória a partir da spec meses
> depois. O "zero call sites" é temporário por construção: o consumidor chega com a NF-e.
> **Ordem ratificada:** passo 1 do §3.2, antes do apagamento.
> **Ao executar, note (§5.2):** o invariante da idempotência é provado por um par ordenado que vive
> **só no teste** — a asserção vale na **segunda** chamada. Recuperável em
> `git show nfe-fase-b-preserved:server/src/features/accounting/services/__tests__/PostingService.test.ts`.
> Portar já em vocabulário `sale.*`.

### F-D3 — Colisão de timestamp entre as duas migrações · ⚪ **SEM OBJETO sob (a)** *(achado NOVO, não está na spec)*

Medido: `20260825120000_nfe_multi_item_discriminator` (branch) e
`20260825120000_rename_salon_to_sale_vocabulary` (já em `main`) têm **timestamp idêntico**. A ordem
lexicográfica põe **`nfe` ANTES** de `rename`. Em qualquer ambiente que já rodou o rename, o rebase
insere uma migração **"no passado"** — condição de *migrations applied out of order*, que `migrate dev`
trata de forma diferente de `migrate deploy`. Some-se a lição já registrada: **migração SQLite não é
transacional**.

- **(a) Renomear a pasta da NF-e** para timestamp posterior (ex.: `20260828…`) durante o rebase.
- **(b) Deixar como está** e absorver a ordem fora de sequência.

> **⚪ SEM OBJETO.** A colisão só existia no **rebase**, que F-D1→(a) descarta. Sob (a) a migração é
> **reescrita do zero** e nasce com timestamp posterior ao rename.
> **O achado não some — vira requisito**, registrado no passo 3 do §3.2: *a migração da reconstrução
> deve ter timestamp posterior a `20260825120000`*. Sem esse registro, quem reconstruir copiando a
> migração da tag (`20260825120000_nfe_multi_item_discriminator`) **reintroduz exatamente a colisão**,
> porque `nfe` ordena antes de `rename`. Guardado aqui por isso.

### F-D4 — Resíduo (i): `@@unique(journalEntryId, externalRef)` ausente · ✅ **RATIFICADO → (b)** *(contra a recomendação)*

Sem o índice, **dois anexos CONCORRENTES da mesma chave criam dois `SourceDocument`**. O gate roda
**dentro** de `runTransaction` com `tx` propagado (correto para o caso sequencial), mas o SQLite não
serializa a leitura contra o insert não-commitado do outro tx. **O código já declara este limite por
escrito** no comentário do método.

- **(a) Fork de fila** — incremento próprio (migração + guarda). *Independente da NF-e:* fecharia também
  a variante `postEntry` de `main`, que hoje tem a mesma exposição.
- **(b) Dívida declarada** — segue anotada no código, sem item de fila.

> **Recomendação: (a), com prioridade BAIXA.** É o único pedaço do §3 do pedido com valor genuinamente
> independente da NF-e. Prioridade baixa porque o produto **nunca foi implantado** — não há concorrência
> real hoje; e a memória do projeto registra que anexo concorrente da mesma chave interage com
> soft-delete (`unique-de-idempotencia-x-soft-delete`), então quem executar **precisa decidir quem libera
> a chave**.
>
> **✅ DECISÃO DO DONO: (b) — dívida declarada.** A recomendação (a) **não foi acatada**: nenhum item de
> fila novo. Coerente com o resto do conjunto — o produto nunca foi implantado, não há concorrência real,
> e o gate sequencial (dentro do `runTransaction`, com `tx` propagado) já cobre o fluxo do operador.
> **Consequência a manter visível:** a exposição **não é só da NF-e** — a variante `postEntry` de `main`
> tem a mesma corrida **hoje**, e segue aberta por decisão. **O limite precisa continuar declarado por
> escrito no código** quando o `attachSourceDocument` for extraído (F-D2, passo 1 do §3.2): o comentário
> honesto do método é o que sustenta esta escolha — sem ele, (b) vira omissão em vez de dívida.

### F-D5 — Resíduo (ii): breakdown por SKU não persistido → `blocked` · ✅ **RATIFICADO → (a)** *(confirma)*

Leitura do `PayableService.reconcilePayables` da branch: o `blocked` **não é um bug** — é um limite de
**dado** implementado com honestidade (contador próprio, `logger.warn` com
`code: 'MULTI_ITEM_NOT_SINGLE_SKU'`, e um comentário que rejeita explicitamente tanto `failed` — "falso
alarme permanente" — quanto o skip silencioso, nomeando a classe `param-aceito-e-ignorado`).
**E já está ratificado pelo dono em 2026-08-22** (§5.1 item 11 do master map).

- **(a) Dívida declarada** — permanece como está; re-drive manual via `receiveInventoryItems`.
- **(b) Item de fila** — persistir o breakdown por SKU (nova tabela ou coluna JSON) para o re-drive automático.

> **Recomendação: (a).** Já ratificado, já implementado sem silêncio, e (b) pede modelagem nova (N linhas
> por `Payable`) cujo gatilho é operação real emitindo NF — que não existe. Reabrir agora seria
> dimensionar além do item autorizado.
>
> **✅ DECISÃO DO DONO: (a) — confirmado.** Reafirma a ratificação de 2026-08-22. **Sob F-D1→(a) isto
> deixa de ser "manter" e vira requisito de reconstrução** (passo 5 do §3.2): quem refizer precisa
> reproduzir o `blocked` **com o mesmo desenho** — contador próprio, `logger.warn` com
> `code: 'MULTI_ITEM_NOT_SINGLE_SKU'`, e a recusa explícita tanto de `failed` (falso alarme permanente)
> quanto do skip silencioso. Reconstruir sem isso reintroduz a classe `param-aceito-e-ignorado`.

---

## 9. Insumos ausentes

1. **O XML real** (§7.1) — ausência **estrutural**, não de planejamento; é o gate. **Permanece aberto.**
2. ~~**Carimbo do ADR-P2**~~ — ✅ **RESOLVIDO nesta sessão, antes da entrevista.** O carimbo que
   `db1a227f` nomeia como condição da metade destrutiva **não existe**:
   [ADR-P2-second-vertical.md](../adr/ADR-P2-second-vertical.md) está **`Status: Draft — 8/8 FORKS
   RATIFICADOS (2026-08-25); promoção a Accepted PENDENTE`**, e **não menciona** a branch nem o
   apagamento (`grep -i -E "nfe-fase-b|apagar"` sobre os dois arquivos P2 → vazio).
   **Consequência registrada:** a pré-condição que o commit invocou ainda não ocorreu. O dono ratificou
   F-D1→(a) **com esse fato posto na mesa** — a decisão é dele e está tomada; o que fica é que a **ordem
   de execução** do §3.2 (extrair → apagar) e a promoção do ADR-P2 são coisas separadas, e nenhuma
   sessão de agente deve tratar o apagamento como liberado por este BRIEF.

## 10. Achados fora de escopo (registrados, NÃO planejados — ORCH-006)

1. **A guarda de vocabulário RN não varre a árvore** (§5.3). Vale para qualquer branch pré-RN em voo, não
   só a NF-e. Uma guarda tree-wide de `salon.*` seria incremento próprio — **e note a regra permanente do
   CLAUDE.md**: com 4 de 4 gates de oráculo externo abertos, **não se monta aparato de auditoria novo**.
   Registrado como achado, não proposto.
2. **Divergência de contagem:** o master map dizia "23 commits"; o valor de hoje é **27**. O `db1a227f`
   já corrigiu a contagem de literais (11 → 7). ✅ **Emendado nesta sessão** — fold autorizado na
   entrevista (§12).
3. `claude/nfe-fase-a`, `claude/nfe-a2-import`, `claude/nfe-a3-sale`, `review-nfe` seguem existindo
   localmente. `fase-a` é SUPERSEDED por decisão registrada; as outras três não foram examinadas.

---

## 11. Autoavaliação da sessão [OPS-001]

1. **Objetivo sob a letra:** a letra pedia planejar "antes de a branch ser apagada"; o objetivo é **não
   perder o que só existe nela**. Por isso §6 e o passo 3.1.2 vieram na frente — e §6 achou um artefato
   ainda órfão que a premissa dava por resgatado.
2. **Graus:** *verificado* (executado nesta passada) — 27 commits, 6 arquivos em colisão, merge-tree exit
   0, 1.018 linhas de teste, tag vazia, timestamps idênticos, `attachSourceDocument` ausente de `main`
   **e** seam presente em `postEntry`, allowlist já contendo `entry.source_recorded`, 4 marcadores
   `SYNTHETIC`, escopo da guarda RN. *Inferido* — a janela de ~2 semanas do gc (defaults do git lidos,
   política de poda não executada). *Assumido* — nada material.
3. **Caso adversarial:** tentei derrubar a recomendação **(b)** procurando conflito que a justificasse
   como cara. `merge-tree` voltou **limpo** — o que **enfraqueceu** o argumento de custo de (b) e me
   obrigou a trocar a tese: o risco de (b) não é esforço, é **silêncio** (§5.3). Também tentei derrubar a
   premissa do item 3 do pedido; ela **caiu** — o seam existe em `main` dentro de `postEntry`, e a
   recomendação do F-D2 inverteu por causa disso.
4. **Checagem que teria falhado se eu estivesse errado:** `git grep "entry.source_recorded" origin/main`
   — se tivesse voltado vazio, o F-D2 recomendaria extrair. Voltou com a allowlist **e** o call site.
5. **Viés próprio nomeado:** planejamento tende a **preferir preservar trabalho existente** (custo
   afundado). A recomendação (b) era vulnerável a esse viés — por isso veio com o contra-argumento do
   fixture sintético escrito por extenso, e por isso os passos 3.1.1–3.1.3 foram propostos **antes** da
   decisão. **O viés se confirmou:** o dono ratificou (a), e 3 das 4 recomendações caíram na mesma
   direção — a sessão otimizou custo de reescrita onde a decisão otimizou superfície pendente (§8).
   **Lição registrada:** medir bem o custo de um caminho não é o mesmo que pesar o critério certo.

**Regras de escopo respeitadas:** nenhum código de aplicação escrito · nenhuma branch criada ou apagada ·
**nenhum git de escrita contra `claude/nfe-fase-b`** (HEAD `5b6243a6` conferido após a sessão) ·
nenhuma spec de outro item editada · nenhum fork auto-ratificado — **as 5 decisões vieram do dono**,
fork-a-fork, e estão registradas com quem decidiu, quando, e contra qual recomendação.

**Escritas que esta sessão fez, todas autorizadas na entrevista:** este BRIEF ·
[BE-INCR-NFE-fixtures-README.md](BE-INCR-NFE-fixtures-README.md) (transporte) · tag
`nfe-fase-b-preserved` (local + `origin`) · fold do [master map](ACCOUNTING-MASTER-MAP.md).

---

## 12. Próximos passos — nenhum é desta sessão

| # | Passo | Sessão | Gate |
|---|---|---|---|
| 1 | Extrair `attachSourceDocument` para `main` (F-D2) | `sessao-feature` | review independente |
| 2 | Apagar `claude/nfe-fase-b` (local + `origin`) | destrutiva, própria | **depois** do passo 1; tag já em `origin` |
| 3 | Reconstruir a NF-e pela [spec §8](BE-INCR-NFE-fase-b-spec.md) | `sessao-feature` | **XML real anonimizado** (§7.1) |

**O gate do passo 3 não se move por decisão nenhuma deste BRIEF.** Continua sendo o XML real — runbook
de anonimização em [BE-INCR-NFE-fixtures-README.md](BE-INCR-NFE-fixtures-README.md), e a
`nfe-fixture-provenance.test.ts` segurando o CI de propósito enquanto houver marcador `SYNTHETIC`.
