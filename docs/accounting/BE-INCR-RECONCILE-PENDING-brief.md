# BRIEF — `BE-INCR-RECONCILE-PENDING` (contábil, nó C7)

> **O que este documento é:** o BRIEF de planejamento (checklist + contratos esboçados + forks
> pendentes) exigido pela `sessao-feature` antes de qualquer código. Produzido em
> `sessao-planejamento` — **zero código de aplicação**, **nenhum fork ratificado**.
>
> **O que não é:** autorização de implementação. Cada fork abaixo continua PENDENTE até o dono
> responder; a `sessao-feature` não pode escolher por conta própria (ORCH-006).

## Autorização citável (ORCH-006)

- `docs/accounting/CEDULA-DECISAO-2026-09-03-modulos.md`, linha **F-W2F-3 / F-W2F-5** (§B, tabela
  de decisões): *"Forma do conserto do skip-and-advance do job de reconcile (item falho / bloqueado
  por período pulado e nunca re-varrido) → ✅ RATIFICADO → (b) marca avança; item vai para tabela
  de pendências re-varrida. Exige migração (tabela nova) + comando/tela de pendências → BRIEF
  `BE-INCR-RECONCILE-PENDING` (contábil, C7)."* — mesma linha aparece em §E.1 (linha C7) e em §C.1
  item 17. **Verificado**: li o arquivo, a citação existe literalmente.
- Mesmo documento, §C.1 item 17 e §E.1 C7 confirmam: nó **ready**, sem aresta bloqueadora (`GRAFO-
  DEPENDENCIAS-2026-09-07.md` linhas 67 e 162: `C7 ready — —`). **Verificado**.
- Gatilho da rodada: `docs/accounting/PLANO-SDD-SEQUENCIAL-2026-09-07.md` §2, Rodada 3 — *"planeja
  o RECONCILE-PENDING"* → *"implementa"*, disparado pelo dono em 2026-09-07 ("Pode disparar o plano
  em multi agent sonnet até finalizar"). **Verificado**.
- Contexto do fork: `docs/accounting/CEDULA-DECISAO-2026-08-31.md` §B² (introduz o candidato
  F-W2F-5) e §A (renomeia o item "item falho pulado" de F-W2F-3 para **F-W2F-4**, já mergeado —
  PR #249, opção 1: `min(runStartAt − OVERLAP_MS, updatedAt da falha não resolvida mais antiga)`).
  **Verificado** por leitura de `accountingSyncReconcile.job.ts:38-53,159-197`.

## Insumos lidos (código, não memória — CBM-001)

| Insumo | Onde | O que confirma |
|---|---|---|
| Job + watermark | `server/src/jobs/accountingSyncReconcile.job.ts` (1508 linhas) | `withReconcileWatermark` (linhas 186-197): quando `summary.failed > 0`, a marca **não avança** (fica em `watermarkAt`). Isso cobre **failed**, não **blocked**. `blocked` nunca segura a marca hoje — confirmado nas 8 passadas (`reconcileCrmReceivables`, `reconcileSaleSales`, `...Cancellations`, `...Returns`, `...Settlements`, `...PackageOrigin`, `...PackageConsumption`; só `reconcileSaleCogs` não tem `blocked`) |
| Classificação blocked | `server/src/features/accounting/sync/AccountingSyncPort.ts:86-98` | `SYNC_SKIP_ERROR_CODES = ['ACCOUNTING_PERIOD_NOT_OPEN', 'MAX_CENTS_EXCEEDED']` — **duas semânticas diferentes**: a 1ª é transitória (reabre com o período), a 2ª é **veneno permanente** (nunca resolve sozinha) |
| Watermark repo | `server/src/jobs/JobWatermarkRepository.ts` | Linha única por job, sem Controller/Service/Policy — **exceção declarada** no próprio arquivo por ser infra de job, nunca exposta por HTTP. Mesma classe de exceção vale para a tabela de pendências SE ela só for lida/escrita pelo job — mas o pedido do dono inclui "comando/**tela**", que expõe HTTP e portanto SAI dessa exceção (ver Fork 3) |
| Migração do watermark | `server/prisma/migrations/20260830130000_add_job_watermark/migration.sql` | Padrão de migração aditiva pura: 1 `CREATE TABLE`, zero `ALTER`, zero backfill, sem prólogo `IF EXISTS` (só necessário quando a migração faz `ALTER`/rebuild — aqui não faz) |
| Modelo watermark | `server/prisma/schema.prisma:309-315` | `model JobWatermark { job String @id; watermarkAt DateTime; updatedAt DateTime @updatedAt }` |
| Testes do F-W2F-4 | `server/src/jobs/__tests__/accountingSyncReconcile.test.ts` | Existe suíte cobrindo `withReconcileWatermark`; a nova feature deve **estender**, não duplicar |
| Smoke de migração | `scripts/smoke-migration-gate.mjs` (via `npm run smoke:migration` em `server/package.json:21`) | S1-S8: banco original intocado, migração aplica limpo, integridade, FK, nenhuma linha perdida, colunas antigas byte-a-byte, nenhum índice some, partida dobrada. **W2 relevante:** se a tabela de pendências nascer vazia no `dev.db` real, o gate passa **vaziamente** — não é prova de re-varredura real (memória `smoke-gate-s6-x-migracao-de-dado`) |
| Allowlist de auditoria | `server/src/features/accounting/audit/auditCanonical.ts:12` (`PAYLOAD_ALLOWLIST`) | Chave por `eventType`; `eventType` desconhecido **lança exceção** na canonicalização (linha 125) — todo `eventType` novo entra na mesma mudança, sem exceção |
| Onde audit é usado hoje | `AuditService.append` (`server/src/features/accounting/services/AuditService.ts:52-56`) | Só é chamado **dentro de uma tx que também muta o razão** (ACC-019/020 — sem cascade, in-tx). O job de reconcile (`accountingSyncReconcile.job.ts`) **não chama `AuditService`** — roda como ator de sistema, sem HTTP. Confirmado por grep: zero ocorrência de `AuditService`/`auditCanonical` nesse arquivo |
| Padrão de comando HTTP símile | `server/src/routes/payables.ts:21`, `server/src/controllers/payableController.ts:132-142` | `POST /api/payables/reconcile` — sem corpo, chama `getFactory().getPayableService().reconcilePayables(scope)`; roteado **antes** de `/:id` para não ser capturado como id |
| Guard de path-count do openapi | `server/src/__tests__/openapi-paths.test.ts:47` | `const BASELINE = 146` — toda rota nova exige **subir a baseline de propósito**, com o comentário de origem (padrão das linhas 19-45) |
| Snapshot de shape dos DTOs | `server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts` | **Auto-descoberta**: importa todo módulo de `dtos/`, coleta todo export Zod, serializa com `z.toJSONSchema()`. DTO novo **reprova até entrar no snapshot** — não precisa de registro manual, mas o `UPDATE_DTO_SNAPSHOT=1` precisa rodar no mesmo PR |

### Insumo do prompt que **não se aplica** — achado registrado, não descartado em silêncio

O prompt de disparo pediu leitura de `ADR-INCR7-bank-reconciliation.md` e
`ADR-INCR7-UNMATCH-read-shape.md`. Li ambos. **O próprio ADR-INCR7 declara, na sua seção de
contexto:** *"Existe um outro 'reconcile' não relacionado: o `AccountingSync` (job CRM
Won→lançamento, `features/accounting/sync/`) — não confundir; aquilo é backfill de integração,
isto é casar extrato bancário com o razão."* Confirmei por grep que `JobWatermarkRepository` e
`watermark` só aparecem em `accountingSyncReconcile.job.ts` e nos repositórios de DynamicTable —
**zero** ocorrência em `Reconciliation.model.ts`/`ReconciliationService.ts`/`IReconciliationRepository.ts`
(bank reconciliation). **Verificado**: os dois "reconcile" do repo são features distintas; o ADR-INCR7
e o modelo `Reconciliation` (conciliação bancária OFX/CNAB) **não são insumo** deste BRIEF — só o
job `accountingSyncReconcile` e seu watermark são. Registro isto em vez de silenciosamente ignorar,
porque o próprio nome da colisão ("reconcile") é a armadilha que o ADR-INCR7 já documentou.

---

## Contexto do resíduo (F-W2F-3/5) — o que exatamente falta

`withReconcileWatermark` (linhas 186-197 do job) já resolve o caso **failed** (F-W2F-4, PR #249):
enquanto `summary.failed > 0`, a marca fica presa no valor antigo, então o item aparece de novo em
toda janela futura até parar de falhar. **Isso não cobre `blocked`:** a marca avança **mesmo com
`summary.blocked > 0`** — um item bloqueado por `ACCOUNTING_PERIOD_NOT_OPEN` (transitório: o
período reabre) ou por `MAX_CENTS_EXCEEDED` (permanente: nunca resolve sozinho) sai da janela de
scan assim que `runStartAt − OVERLAP_MS` ultrapassa seu `updatedAt`, e nunca mais é re-varrido —
mesmo mecanismo de queda documentado no §B² da cédula de 31/08. Além disso, **nenhuma das 8
passadas persiste identidade do item bloqueado/falho** fora do log estruturado
(`logger.warn`/`logger.error`) — não há hoje nenhuma tabela consultável por humano ou por comando
para saber QUAL item está pendente, só o agregado (`ReconcileSummary.blocked`/`.failed`, um
contador, não uma lista).

---

## FORK 1 — o novo mecanismo (tabela de pendências) SUBSTITUI ou COMPLEMENTA o freeze do F-W2F-4?

**Por que é fork, não decisão óbvia:** a linha ratificada descreve o problema como "item falho **/**
bloqueado por período pulado e nunca re-varrido" — texto que cobre as DUAS classes (failed e
blocked). Mas F-W2F-4 (failed) já foi ratificado e mergeado com um mecanismo DIFERENTE (segurar a
marca) em 2026-09-01, dois dias antes desta ratificação. A cédula de 09-03 diz "recomendação era a
mecânica do F-W2F-4" e o dono foi **contra** a recomendação, mas não está escrito se isso significa
"não seguir a mecânica do F-W2F-4 para o caso NOVO (blocked)" ou "abandonar a mecânica do F-W2F-4
também para failed, unificando tudo na tabela de pendências".

| Caminho | Descrição | Risco se for o errado |
|---|---|---|
| **(A) Complementa** | `withReconcileWatermark` continua segurando a marca quando `failed > 0` (F-W2F-4 intocado). A tabela de pendências é **só para `blocked`** (que hoje não tem NENHUM mecanismo de retenção) — cada item bloqueado vira uma linha; um comando de re-varredura roda os itens pendentes independente do watermark principal | Baixo: soma-se ao que já existe, não quebra nada ratificado. Mas não cobre o "item falho" citado na linha ratificada — a rastreabilidade de itens `failed` continua só em log, sem tela |
| **(B) Substitui** | Remove o `summary.failed > 0` do `withReconcileWatermark` — a marca **sempre** avança (`runStartAt − OVERLAP_MS`), e TANTO `failed` quanto `blocked` vão para a tabela de pendências, re-varridos por comando dedicado, desacoplados do watermark principal | Alto: reabre o merge de F-W2F-4 (PR #249) e seus testes; muda o contrato de `withReconcileWatermark` que 3 testes já fixam; se a extração de identidade por item (ver Fork 2) ficar incompleta, um item failed que hoje é PROTEGIDO pelo freeze passa a depender só da tabela nova — regressão se a tabela falhar em capturar algum dos 8 sourceTypes |

**Recomendação:** **(A)**. Justificativa: (1) não reabre uma decisão já ratificada e testada
separadamente (F-W2F-4, 2026-09-01); (2) a lacuna real e sem NENHUMA proteção hoje é `blocked`
(F-W2F-5, o candidato que motivou esta rodada); (3) "failed" já tem um comportamento auditável
(nunca perde o item, mas também nunca avança enquanto ele existir — trade-off aceito na ratificação
do F-W2F-4). Custo de estar errado na recomendação: se o dono queria (B), a tabela de pendências
nasce sem cobrir `failed`, e um segundo ciclo (instrumentação→correção) precisa reabrir
`withReconcileWatermark` depois. **Status: RATIFICAÇÃO PENDENTE.**

---

## FORK 2 — como cada passada expõe a identidade do item pendente

**Por que é fork:** hoje nenhuma das 8 funções `reconcile*` devolve o item que falhou/bloqueou —
só incrementa um contador (`ReconcileSummary.failed++`/`.blocked++`) e loga. Para popular uma
tabela de pendências linha-a-linha, cada passada precisa emitir `{ sourceType, sourceId,
ownerUserId, unitId, reason, reasonCode, blockedAt }` por item, não só o agregado.

| Caminho | Descrição | Custo de errar |
|---|---|---|
| **(a) Refatorar as 8 assinaturas** | Cada `reconcile*Deps`/`reconcile*Summary` passa a devolver `pendencies: PendingItem[]` além do resumo agregado; o call site em `runAccountingSyncReconcile` agrega e persiste | Maior diff (8 funções + 8 suítes de teste existentes tocadas), mas a lista fica **completa e tipada** por sourceType — nenhum item invisível |
| **(b) Callback de coleta injetado** | Uma função `onPending(item: PendingItem) => void` é passada a cada `reconcile*Deps` e chamada no `catch` de cada passada (mesmo ponto onde hoje só há `logger.warn/error`), sem mudar o shape de retorno de `ReconcileSummary` | Diff mais cirúrgico (adiciona 1 parâmetro opcional por deps, não muda o shape de retorno testado hoje), mas acopla side-effect (persistência) ao core puro que hoje é só função pura testável por retorno — os testes unitários das 8 passadas passam a precisar de um spy no callback em vez de só inspecionar o retorno |
| **(c) Reconstrução fora do core** | Não mexe nas 8 funções; a persistência de pendência roda como uma 9ª passada que RE-LÊ as mesmas fontes (DynamicTable rows, CRM opportunities) filtrando por quem NÃO tem entry ainda, reclassificando o erro do zero | Duplica a lógica de classificação de erro (a mesma que já existe dentro de cada passada) — dois lugares que decidem "isto está bloqueado" podem divergir; forte candidato a bug de classe "comentário afirma o que não assere" |

**Recomendação:** **(b)**. Justificativa: menor superfície de mudança sobre um arquivo de 1508
linhas já denso (a Regra 6 de T1-T8 — "patches no que falha, nunca rewrite" — pesa contra (a));
evita duplicar a classificação de erro (contra (c), que reintroduziria a mesma armadilha de
"dois lugares decidindo a mesma coisa" que o `classifyBlockedSyncError` compartilhado já existe
para evitar). Custo de estar errado: se o dono preferir (a) por tipagem mais forte, o refactor das
8 assinaturas ainda precisa acontecer depois — dívida adiada, não eliminada. **Status: RATIFICAÇÃO
PENDENTE.**

---

## FORK 3 — camada de exposição: só comando (CLI/job), ou Route→Controller→Service→Repository→Prisma completo?

**Por que é fork:** a linha ratificada pede "migração (tabela nova) + **comando/tela** de
pendências" — "comando" sozinho poderia ser só um CLI (como `accountingSyncReconcileCli.ts` já
existe para o job principal, sem HTTP), mas "tela" implica necessariamente uma rota HTTP com
Controller/Service/Repository/Policy — a exceção que o `JobWatermarkRepository` documenta para si
mesmo ("nunca exposta por HTTP") **não se aplica** aqui.

| Caminho | Descrição | Custo de errar |
|---|---|---|
| **(a) CLI-only nesta fatia; tela em incremento FE separado** | Este BRIEF entrega só a tabela + a passada de captura + um `accountingSyncReconcilePendingCli.ts` (mesmo padrão do CLI existente) que lista/re-varre por linha de comando; a tela vira um `FE-INCR-RECONCILE-PENDING` nó vizinho, autorização própria depois | Respeita "escopo BACKEND por padrão" da skill; mas a cédula pede "comando/tela" junta — se o dono queria as duas no mesmo ciclo, este BRIEF entrega só metade |
| **(b) Rota HTTP completa nesta fatia** (Route→Controller→Service→Repository→Prisma + Policy + DTO `.strict()` + Factory), FE consumindo via `sessao-feature` de FE separada (símile do padrão F1a/F1b do plano SDD: BE e FE em incrementos distintos) | Cobre o "comando" via rota que também serve de base para a tela futura, sem exigir 2ª migração; seguindo o padrão do próprio plano (BE-INCR-NFE ficou de BE, FE-INCR-NFE ficou de FE) | Maior escopo desta fatia (Policy nova, DTO novo, allowlist de audit se a re-varredura manual for auditável — ver Fork 4); ainda assim SEM tela — quem chama a rota nesta fatia é teste de integração, não usuário |

**Recomendação:** **(b)**, mantendo a tela FORA (FE-INCR-RECONCILE-PENDING, nó vizinho, autorização
própria) — é o padrão já em uso no plano SDD para separar BE/FE (F1a/F1b, C4/C5), e a skill de
planejamento fixa "Escopo do BRIEF = backend por padrão". A rota HTTP evita nascer uma 2ª migração
quando a tela chegar (a Policy e o DTO já existiriam). Custo de estar errado: se o dono queria (a),
este BRIEF superdimensiona uma fatia que devia ser só CLI — mas o diff sobra reusável quando a tela
vier, então o custo é "cedo demais", não "retrabalho". **Status: RATIFICAÇÃO PENDENTE.**

---

## FORK 4 — a re-varredura manual (via rota/comando) gera evento de auditoria?

**Por que é fork:** hoje o job de reconcile roda como ator de sistema, sem `AuditService` (ator sem
HTTP, sem usuário identificável para `actorUserId`). Uma rota HTTP nova (Fork 3-b) tem um usuário
autenticado por trás — isso muda a resposta.

| Caminho | Descrição | Custo de errar |
|---|---|---|
| **(a) Audita** — `eventType: 'reconcile_pending.rescanned'` (ou similar), `targetType: 'ReconcilePendingItem'`, dentro da mesma tx que resolve a pendência | Consistente com o padrão ACC-019/020 (append in-tx); mas exige um `payload` allowlist novo em `auditCanonical.ts:12` — se o payload incluir dado de PII (ex.: identificador de cliente do item pendente), a allowlist vira gate de PII (memória `accounting-audit-allowlist-guards` — campo PII novo exige teste-guarda no MESMO PR) | Se a recomendação for "audita" e o payload vazar PII sem o teste-guarda, repete a classe de bug já fechada 2× no repo |
| **(b) Não audita** — a re-varredura manual é tratada como o próprio job (ator de sistema), só logada estruturadamente (`logger.info`), sem `AuditService` | Mais simples, sem allowlist nova; mas perde rastro formal de "quem disparou a re-varredura" se um humano autenticado a acionar pela tela futura | — |

**Recomendação:** **(a)** SE e somente se Fork 3 = (b) rota HTTP (um ator humano autenticado
justifica trilha); **(b)** se Fork 3 = (a) CLI-only (ator de sistema, mesma classe do job
principal, que também não audita). Custo de estar errado: item de PII sem guarda (ver acima) é o
pior caso possível — por isso este fork trava explicitamente no teste-guarda de payload, não só na
decisão de auditar. **Status: RATIFICAÇÃO PENDENTE.**

---

## Checklist numerado de comportamentos (após os forks acima resolvidos — cada um testável isoladamente)

> Numeração usa `(A)`/`(B)` etc. quando o comportamento **muda de forma** dependendo do fork; o
> texto assume a RECOMENDAÇÃO de cada fork como leitura de referência, não como decisão.

1. **Migração aditiva** — nova tabela `reconcile_pending_items` (nome provisório) via
   `prisma migrate dev`, `CREATE TABLE` puro (sem `ALTER`, sem prólogo `IF EXISTS` — mesmo padrão de
   `20260830130000_add_job_watermark`). Campos mínimos: `id` (cuid), `ownerUserId`, `unitId`,
   `sourceType`, `sourceId`, `reasonCode` (`'FAILED' | 'ACCOUNTING_PERIOD_NOT_OPEN' |
   'MAX_CENTS_EXCEEDED'`), `reasonDetail` (string, mensagem do erro), `firstSeenAt`, `lastSeenAt`,
   `resolvedAt` (nullable — soft-delete-like: `null` = ainda pendente), `attempts` (int). Testável:
   `smoke:migration` roda limpo sobre cópia do `dev.db` real (S1-S8); **W2 esperado** (tabela nasce
   vazia no `dev.db` de hoje) — documentar como aceito, não falso-positivo.
2. **Chave de idempotência** — `@@unique([ownerUserId, unitId, sourceType, sourceId])` na tabela
   nova. Testável: inserir a mesma pendência 2× (2 rodadas do job capturando o mesmo item ainda
   falho) não duplica linha — vira `upsert` (atualiza `lastSeenAt`/`attempts`, preserva
   `firstSeenAt`). **Risco nomeado (memória `unique-de-idempotencia-x-soft-delete`):** se o item for
   resolvido (`resolvedAt` setado) e voltar a falhar depois, o upsert precisa DECIDIR se reabre a
   MESMA linha (`resolvedAt = null` de novo) ou cria uma nova — teste-guarda explícito para os dois
   casos.
3. **Captura de pendência por passada** (Fork 2-b: callback `onPending`) — cada uma das 8
   `reconcile*` chama `onPending({ sourceType, sourceId, ownerUserId, unitId, reasonCode,
   reasonDetail })` no ponto onde hoje só loga (`summary.failed++`/`summary.blocked =
   (summary.blocked ?? 0) + 1`). Testável por passada: teste unitário injeta um `onPending` spy e
   assere a chamada com o item exato que falhou/bloqueou — cobre as 8 sourceTypes (`crm.opportunity.won`,
   `sale.finalized`, `sale.cancelled` [via `findEntry`/`reverse`], `sale.returned`, `sale.settled`,
   `sale.package.sold`, pacote-consumo, e `sale.cogs` que hoje NÃO tem `blocked` — decidir se cogs
   entra só como `FAILED`).
4. **Persistência da pendência é best-effort, nunca derruba a rodada** — uma falha ao escrever
   `reconcile_pending_items` (ex.: DB fora do ar por 1 tick) é capturada e logada, **nunca** propaga
   para `runPasses` (mesmo contrato do `reconcilePhysicalInventory`, que roda fora do merge de
   summary e nunca segura o watermark — linha 1486-1492 do job). Testável: mock do writer da
   pendência lança erro → `withReconcileWatermark` ainda avança a marca normalmente (Fork 1-A: só
   `failed` segura, não a escrita de pendência).
5. **Resolução automática** — quando uma passada, numa rodada seguinte, encontra o MESMO
   `(sourceType, sourceId)` sem erro (idempotent hit ou synced), marca a pendência existente como
   `resolvedAt = now()` em vez de deixá-la pendente para sempre. Testável: item pendente por
   `ACCOUNTING_PERIOD_NOT_OPEN`, período reabre, próxima rodada resolve normalmente → linha
   correspondente ganha `resolvedAt`.
6. **Comando/rota de re-varredura dedicada** (Fork 3): re-executa SÓ os itens com `resolvedAt IS
   NULL` (não o scan completo), reusando o mesmo `book`/`sync`/`reverse` de cada passada original —
   não uma implementação paralela (evita o risco nomeado no Fork 2-c). Testável: 1 pendência
   `MAX_CENTS_EXCEEDED` que segue excedendo → comando roda, item continua pendente,
   `attempts` incrementa, nenhuma exceção sobe.
7. **Poison nunca vira retry infinito silencioso** — `MAX_CENTS_EXCEEDED` é permanente (nunca
   resolve sozinho); o comando de re-varredura ainda tenta (idempotente, sem custo de tentar de
   novo), mas a listagem/tela (nó vizinho) precisa **distinguir visualmente** poison de transitório
   — campo `reasonCode` já carrega essa distinção; comportamento de UI é do BRIEF de FE, não deste.
8. **Contrato Zod `.strict()`** para o DTO da rota de re-varredura/listagem (Fork 3-b): schema de
   entrada (paginação, filtro por `reasonCode`) e de saída (nunca formato livre). Testável: campo
   extra no corpo é REJEITADO (400), não silenciosamente ignorado (classe
   `param-aceito-e-ignorado-e-bug`).
9. **Policy** — reusa o padrão de `IAccountingPolicy`/`canManageData` já usado por
   `PayableService`/`ReceivableService` (mesmo scope: `ownerUserId` + `unitId`); nenhuma pendência
   de OUTRO tenant é visível/re-varrida por engano. Testável: pendência de tenant B não aparece na
   listagem/comando do tenant A.
10. **Factory** — `getReconcilePendingService()` registrado em `server/src/lib/factory.ts`, mesmo
    padrão de `getPayableService`/`getReconciliationService` (linhas 911/922).
11. **Allowlist de auditoria** (Fork 4, condicional) — SE Fork 3 = rota HTTP e Fork 4 = audita: novo
    `eventType` em `PAYLOAD_ALLOWLIST` (`auditCanonical.ts:12`), com teste-guarda no MESMO PR
    cobrindo os campos exatamente permitidos (nenhum campo de PII do item de origem — ex.: nome de
    cliente — vaza para o payload canonicalizado sem o teste explícito, por disciplina já registrada
    em `accounting-audit-allowlist-guards`).
12. **Guard do openapi** — SE Fork 3 = rota HTTP: subir `BASELINE` em
    `server/src/__tests__/openapi-paths.test.ts:47` (hoje `146`) com o comentário de origem
    (padrão das linhas 19-45), + bloco `@openapi` em `docs.paths.ts` (2 toques: `index.ts`/mount do
    router + `docs.paths.ts`).
13. **Snapshot de shape do DTO** — o DTO novo entra automaticamente no `dtoShapeSnapshot.test.ts`
    (auto-descoberta); rodar `UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit
    dtoShapeSnapshot` no mesmo PR e commitar o `__dto-shapes__.json` resultante.
14. **`tsc` limpo** em `server/` — gate padrão, não condicional a nenhum fork.
15. **Smoke de migração sobre cópia do `dev.db` real** — `npm run smoke:migration` (server/) roda
    S1-S8 sobre a migração nova ANTES do merge; W2 (gate vazio) é esperado e deve ser citado no
    relatório de review como aceito, não descartado.

---

## Contratos esboçados (Zod — forma, não decisão final; ajusta conforme os forks)

```ts
// server/src/features/accounting/dtos/ReconcilePendingDto.ts (nome provisório)

import { z } from 'zod';

/** Razão de pendência — poison (nunca resolve sozinho) vs transitório (resolve com o tempo/ação). */
export const ReconcilePendingReasonCode = z.enum([
  'FAILED',                      // erro isolado não classificado (ex.: sale sem unitId)
  'ACCOUNTING_PERIOD_NOT_OPEN',  // transitório — resolve quando o período reabre
  'MAX_CENTS_EXCEEDED',          // poison — nunca resolve sem corrigir o dado de origem
]);

/** Query da listagem de pendências (rota GET, Fork 3-b). */
export const ListReconcilePendingQueryDto = z
  .object({
    unitId: z.string().min(1),
    reasonCode: ReconcilePendingReasonCode.optional(),
    includeResolved: z.coerce.boolean().default(false), // ⚠ ver nota abaixo — NÃO usar z.coerce.boolean() cru
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(200).default(50),
  })
  .strict();

/** Corpo do comando de re-varredura (rota POST, Fork 3-b) — sem parâmetro livre. */
export const RescanReconcilePendingDto = z
  .object({
    unitId: z.string().min(1),
    // Vazio = re-varre todas as pendências não resolvidas do escopo; ids explícitos = subconjunto.
    ids: z.array(z.string().min(1)).max(500).optional(),
  })
  .strict();

/** Forma de saída de UM item pendente (não formato livre). */
export const ReconcilePendingItemViewDto = z
  .object({
    id: z.string(),
    sourceType: z.string(),
    sourceId: z.string(),
    reasonCode: ReconcilePendingReasonCode,
    reasonDetail: z.string(),
    firstSeenAt: z.string(), // ISO
    lastSeenAt: z.string(),
    resolvedAt: z.string().nullable(),
    attempts: z.number().int().nonnegative(),
  })
  .strict();
```

> **Nota de disciplina (memória `zod-coerce-boolean-inverte-query-string`):** o esboço acima usa
> `z.coerce.boolean()` só como PLACEHOLDER de forma — a classe de bug (`?includeResolved=false`
> virando `true`) já tem correção padrão no repo (`queryBoolean()`, usado por
> Counterparty/Dimension). A `sessao-feature` DEVE trocar por `queryBoolean()`, nunca implementar
> `z.coerce.boolean()` cru.

```prisma
// server/prisma/schema.prisma — esboço do model novo (nome/campos sujeitos a ratificação)

model ReconcilePendingItem {
  id           String    @id @default(cuid())
  ownerUserId  String
  unitId       String
  sourceType   String
  sourceId     String
  reasonCode   String    // ReconcilePendingReasonCode acima
  reasonDetail String
  firstSeenAt  DateTime  @default(now())
  lastSeenAt   DateTime  @updatedAt
  resolvedAt   DateTime?
  attempts     Int       @default(1)

  @@unique([ownerUserId, unitId, sourceType, sourceId])
  @@map("reconcile_pending_items")
}
```

---

## Pendente de validação externa

Nenhuma. Este item é puramente técnico (mecânica de job/backend) — não depende de regra contábil,
fiscal ou legal externa (contador, RFB). Nenhum comportamento do checklist precisa de artefato de
origem regulatório.

## Insumos ausentes

1. **Nome definitivo da tabela/model** (`ReconcilePendingItem` é provisório) — decisão de
   nomenclatura, não bloqueia o BRIEF, mas deve ser fixada antes da migração (Fork livre, baixo
   custo de errar — renomear antes do merge é `ALTER` fácil; depois do merge, migração adicional).
2. **Se `reconcileSaleCogs` deve ganhar classificação `blocked`** — hoje é a ÚNICA das 8 passadas
   sem `summary.blocked` (só `failed`, linha ~784 do job). Não constava na cédula original nem no
   dossiê F-W2F-4/5 — acrescentar `blocked` a ela é uma frente adjacente (`classifyBlockedSyncError`
   nunca é chamado dentro de `reconcileSaleCogs`) que EXCEDE o item autorizado. Registrado abaixo em
   "Achados fora de escopo", não no checklist.
3. **Retenção/expurgo de pendências resolvidas** — a cédula não fala de TTL ou purge; sem
   instrução, o BRIEF assume que pendências resolvidas ficam para histórico (soft `resolvedAt`,
   nunca hard-delete) até segunda ordem. Se o dono quiser expurgo automático, é decisão nova.

## Achados fora de escopo (registrados, não planejados)

1. **`reconcileSaleCogs` sem `classifyBlockedSyncError`** — das 8 passadas, é a única sem
   suporte a `blocked` (todo erro cai em `failed`). Se o CMV também puder bater
   `ACCOUNTING_PERIOD_NOT_OPEN` (plausível — o `PostingService.postEntry` subjacente é o mesmo gate
   de período das outras 7 passadas), ela está classificando um "transitório-esperado" como
   "falha isolada" — o F-W2F-4 já a protege via freeze de watermark, então não é um bug NOVO, mas é
   uma inconsistência de classificação que vale ADR/BRIEF próprio se confirmada.
2. **Tela de pendências (FE)** — nó vizinho explícito no plano SDD (parte do "comando/tela" da
   ratificação, mas fora do escopo BACKEND deste BRIEF por convenção da casa). Autorização própria
   quando o BE mergear.
3. **F-W2F-3 original** (escrita externa setando `updatedAt` mais antigo que a marca) — resíduo
   ACEITO por disciplina em 2026-08-30 (docstring linhas 48-53 do job), não tocado por este BRIEF;
   nenhuma mudança aqui piora ou resolve aquele risco.

---

## Gates de envio — OPS-001 (auto-teste antes de fechar)

1. **Objetivo, não letra:** a linha ratificada pede migração + comando/tela de pendências para o
   resíduo de reconcile; este BRIEF entrega o checklist implementável desse comando+tabela (a tela
   fica registrada como nó vizinho, com justificativa citada na skill). Frase que aponta a resposta:
   seção "Checklist numerado", itens 1-6.
2. **Grau em cada claim:** ver tabela de insumos (cada linha cita arquivo:linha = verificado);
   os 4 forks são explicitamente **assumido/inferido** onde a cédula não resolve por letra (ex.: se
   (A) ou (B) do Fork 1 é a leitura certa da frase "item falho / bloqueado" — inferido a partir do
   histórico de ratificação, não verificado por declaração explícita do dono sobre a interação com
   F-W2F-4).
3. **Caso adversarial tentado:** verifiquei se os dois ADRs de "reconciliação" citados no prompt de
   disparo (`ADR-INCR7-bank-reconciliation.md`, `ADR-INCR7-UNMATCH-read-shape.md`) eram o MESMO
   mecanismo do F-W2F job — a hipótese natural, já que ambos usam a palavra "reconcile". Resultado:
   **não são** — o próprio ADR-INCR7 declara a distinção na sua seção 1, e confirmei por grep que
   `watermark`/`JobWatermarkRepository` não aparecem em nenhum arquivo do módulo de conciliação
   bancária. Se eu tivesse ignorado essa checagem e citado o ADR-INCR7 como insumo funcional deste
   BRIEF, o checklist teria misturado dois domínios sem relação de dados.
4. **Checagem falseável:** a checagem acima (grep por `watermark` fora de `accountingSyncReconcile.job.ts`
   e `JobWatermarkRepository.ts`) TERIA revelado uma referência cruzada, se existisse — ela não
   revelou nenhuma, o que é a evidência negativa que sustenta "são features distintas". Segunda
   checagem falseável: `grep -n "summary.blocked" accountingSyncReconcile.job.ts` mostra que só 6
   das 8 passadas escrevem em `blocked` — se todas as 8 escrevessem, o achado #1 de "fora de escopo"
   (CMV sem blocked) estaria errado.
5. **Duas primeiras linhas entregam verdade + risco:** ver abertura do relatório final — a verdade é
   "BRIEF pronto com autorização citada e nó C7 sem aresta bloqueadora"; o risco principal é o
   **Fork 1** (se a leitura for (B) em vez de (A), a implementação reabre um merge já fechado,
   PR #249).

**Risco silencioso nº1 (OPS-004):** se a `sessao-feature` escolher a leitura errada do Fork 1 SEM
esperar ratificação — por exemplo, assumir (A) por ser a recomendação e implementar direto — o
"ninguém avisa" é literal: nem `tsc`, nem teste, nem CI acusam a divergência, porque (A) e (B) são
ambos código que compila e passa os testes que HOJE existem; só o dono sabe se a intenção era mais
ampla que "cobrir blocked". Por isso os 4 forks ficam PENDENTES e não pré-resolvidos por
conveniência de implementação.
