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
- Gatilho da rodada: `docs/accounting/PLANO-SDD-SEQUENCIAL-2026-09-07.md:67` (§2, tabela "Sequência
  de rodadas de código", linha **Rodada 3**): *"C7 `BE-INCR-RECONCILE-PENDING` — tabela de
  pendências do reconcile + re-varredura + tela | M (migração) | S → R → I → V → M → F | nenhum
  (F-W2F-3/5 → b) | "planeja o RECONCILE-PENDING" → "implementa" | contábil 14/19"*. Documento já
  em `main` (confirmado: `origin/main` no checkout desta sessão já o contém, sem depender de PR em
  aberto). **Verificado** — citação por arquivo:linha, não por frase de disparo fora de doc.
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

## FORK 1 — FECHADO PELA CÉDULA (não é fork; corrigido pós-review independente)

**Correção sobre a versão anterior deste BRIEF:** a versão anterior tratava isto como fork aberto
(A "complementa" x B "substitui"). Releitura literal (não paráfrase) das duas cédulas mostra que a
questão já está decidida como (B) — registro abaixo, não fork.

**Texto literal 1** — `CEDULA-DECISAO-2026-09-03-modulos.md` linha F-W2F-3/F-W2F-5 (§B): "RATIFICADO
→ (b) marca avança; item vai para tabela de pendências re-varrida. [...] recomendação era a mecânica
do F-W2F-4" — coluna "contra a recomendação?" = SIM: o dono rejeitou a mecânica do F-W2F-4 (segurar
a marca) como a forma do conserto.

**Texto literal 2** — `CEDULA-DECISAO-2026-08-31.md`, EMENDA 2026-09-03: "B² (F-W2F-5) e F-W2F-3 →
RATIFICADO (b): a marca avança e o item falho/bloqueado por período vai para tabela de pendências
re-varrida (migração + comando/tela) [...] Contra a recomendação (mecânica do F-W2F-4)." — "a marca
avança" é incondicional (não "avança exceto quando failed>0"), e o texto nomeia as duas classes
juntas ("item falho/bloqueado por período") como destino da mesma tabela. Não há leitura literal que
preserve o freeze de `summary.failed > 0` — "contra a recomendação (mecânica do F-W2F-4)" só faz
sentido se a mecânica antiga for abandonada, não mantida ao lado da nova.

**Decisão registrada (não fork): (B) Substitui.** O freeze de `withReconcileWatermark` ratificado em
2026-09-01 (F-W2F-4, PR #249, opção 1) fica SUPERADO por decisão datada de 2026-09-03. A marca passa
a avançar sempre (`runStartAt − OVERLAP_MS`, incondicional); todo item que hoje cai em `failed` OU em
`blocked` (qualquer `reasonCode`) sai do `ReconcileSummary` agregado e vira uma linha na tabela de
pendências, capturado pelo mecanismo do Fork 2, e re-varrido pelo comando/rota do Fork 3 — nunca mais
pela retenção do watermark principal.

**Mudança de código exigida** (documentada aqui para a `sessao-feature`, NÃO implementada nesta
sessão de planejamento):
- `server/src/jobs/accountingSyncReconcile.job.ts:193-194` — a expressão `summary.failed > 0 ?
  watermarkAt : new Date(runStartAt.getTime() - OVERLAP_MS)` vira incondicional:
  `const nextWatermarkAt = new Date(runStartAt.getTime() - OVERLAP_MS);`.
- O docstring do módulo que descreve o F-W2F-4 (linhas 38-46) e o JSDoc de `withReconcileWatermark`
  (linhas 159-185) precisam de nota de suplantação ("SUPERSEDED by F-W2F-3/5, 2026-09-03 — ver
  BE-INCR-RECONCILE-PENDING-brief.md"), não remoção silenciosa do histórico.
- `server/src/jobs/__tests__/accountingSyncReconcile.test.ts:789-831` — **1 teste** (não 3; os dois
  vizinhos, linhas 754 e 766, fixam comportamento genérico do watermark com `failed: 0` fixo e não
  são afetados) — o teste `F-W2F-4: mantém um item fault-isolated que falhou DENTRO da janela do
  próximo scan [...]` assere hoje `persistedWatermark!.getTime() <= failedItemUpdatedAt.getTime()`.
  Essa asserção deixa de valer sob a nova semântica (a marca avança independente de `failed`) — o
  teste precisa ser reescrito para assertar a captura na tabela de pendências em vez do freeze, no
  MESMO PR da correção (par vermelho→verde, memória `protocolo-conserto-de-gate`).

### FORK 1-R (residual estreito) — `MAX_CENTS_EXCEEDED` entra na tabela de pendências?

**Texto exato que deixa isto aberto** — `CEDULA-DECISAO-2026-08-31.md` §B²: "Itens classificados
como `blocked` via `ACCOUNTING_PERIOD_NOT_OPEN` — que ao contrário de `MAX_CENTS_EXCEEDED` não é
veneno permanente [...] têm o MESMO mecanismo de queda." O candidato F-W2F-5 nomeia
`ACCOUNTING_PERIOD_NOT_OPEN` e contrasta explicitamente com `MAX_CENTS_EXCEEDED` para dizer que só o
primeiro "espera reabrir" — a ratificação de 09-03 herda essa redação ("bloqueado por período"),
nunca escreve "bloqueado por poison" nem generaliza para todo `blocked`. Não está escrito se
`MAX_CENTS_EXCEEDED` (que nunca se resolve sozinho, por definição) deve ganhar linha na mesma tabela
(valor: visibilidade humana de um item preso) ou ficar de fora (valor: a tabela só lista o que uma
re-varredura pode de fato resolver).

**Recomendação:** incluir — o custo de listar um item que nunca se auto-resolve é baixo (aparece com
`reasonCode: 'MAX_CENTS_EXCEEDED'`, permanentemente pendente até correção manual do dado de origem,
exatamente o "resíduo documentado, nunca perdido" que a ratificação persegue); excluir teria o efeito
pior de voltar a perder o item de vista — o mesmo defeito que motivou a rodada inteira. Custo de
estar errado: se o dono quis dizer literalmente só `ACCOUNTING_PERIOD_NOT_OPEN`, a tabela nasce com
uma classe de item "pendente" que na prática nunca sai do estado — ruído de UI, não perda de dado (a
listagem filtra por `reasonCode`, item 7 do checklist). **Status: RATIFICAÇÃO PENDENTE** — único
fork remanescente sobre O MECANISMO; Forks 2-4 abaixo são sobre a IMPLEMENTAÇÃO do mecanismo já
fechado, não sobre se ele se aplica.

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

## FORK 5 — falha ao ESCREVER a pendência × invariante do loop da passada

**Por que é fork (achado do 2º review independente):** a versão anterior do item 4 do checklist
mandava a escrita da pendência **propagar** (throw) quando falhasse, para não perder a proteção que
o freeze do F-W2F-4 dava antes (ver FORK 1, fechado). Mas cada uma das 8 passadas roda um `for` com
`try/catch` **por item**, e o comentário explícito no código é `// Isolated failure must NOT stop the
batch.` (`server/src/jobs/accountingSyncReconcile.job.ts`, dentro do `catch` de
`reconcileCrmReceivables`, laço `for (const opp of opportunities)` linhas 216-271, comentário na
linha ~257; o mesmo padrão se repete nas outras 7 passadas). Um `throw` dentro desse `catch` não
"derruba a rodada com segurança" — ele quebra o `for` daquela passada específica e descarta **todo
item ainda não processado na MESMA passada** (ex.: 500 oportunidades, a 3ª falha ao escrever
pendência, as 497 restantes nunca são tentadas neste tick). Isso é uma mudança de invariante do
motor (isolamento por item vira isolamento por rodada) que o BRIEF não pode decidir sozinho — é
escolha do dono entre dois modos de falha diferentes, não um detalhe de implementação.

| Caminho | Descrição | Custo de errar |
|---|---|---|
| **(a) `throw` derruba a rodada inteira** — a escrita da pendência falhando propaga para fora do `catch` do item, saindo do `for` da passada e do `runPasses`; `withReconcileWatermark` não persiste o novo watermark (GUARD existente, linha 766 do teste) | Mais seguro contra perda silenciosa (nenhum item da rodada é dado por resolvido sem prova), mas contraria o comentário explícito "Isolated failure must NOT stop the batch" e MUDA o raio de efeito de uma falha de infraestrutura (1 escrita em `reconcile_pending_items` fora do ar) — de "1 item não reconciliado" para "toda a passada, e potencialmente as 7 seguintes do mesmo tick, não avançam" |
| **(b) Contador `pendingWriteFailed`, loop continua** — a falha ao escrever a pendência incrementa `summary.pendingWriteFailed` (novo campo) e o loop segue para o próximo item (mesmo padrão de `failed`/`blocked` hoje); `withReconcileWatermark` NÃO avança a marca se `pendingWriteFailed > 0` — reaproveita a mecânica de freeze (agora superada para `failed`/`blocked` pelo FORK 1) só para este caso específico | Preserva o isolamento por item (não perde os 497 restantes); mas reintroduz exatamente o tipo de freeze condicional que o FORK 1 acabou de fechar como superado — precisa de justificativa própria de por que ESTE caso (falha de infra na escrita, não falha de negócio no item) merece voltar a segurar a marca |
| **(c) Loga e continua, marca avança normalmente** | Mais simples, sem novo campo nem freeze condicional | **Rejeitar** — é exatamente a perda silenciosa que motivou a rodada inteira (F-W2F-3/F-W2F-5): o item falhou/bloqueou no ledger, a ÚNICA prova disso (a linha da pendência) não foi escrita, e a marca principal já não protege mais nada (FORK 1) — o item desaparece sem deixar rastro em lugar nenhum |

**Recomendação:** **(b)**. Justificativa: preserva o comentário/invariante já existente no código
("Isolated failure must NOT stop the batch") em vez de contrariá-lo — mudar esse invariante (opção a)
é uma decisão de maior raio de efeito sobre as 8 passadas, não algo que uma falha de escrita numa
tabela nova deveria forçar; o custo extra de (b) é um campo de summary e uma condição a mais no
`withReconcileWatermark` (`pendingWriteFailed > 0`, ao lado — não em vez — do que já existe para
`failed`/`blocked` antes do FORK 1). Custo de estar errado: se o dono preferir (a) por segurança
máxima, a `sessao-feature` precisa aceitar que uma falha de infraestrutura na tabela de pendências
pode paralisar TODA a reconciliação daquele tick, não só o item afetado — trade-off explícito que
merece a palavra do dono, não a inferência do BRIEF. **Status: RATIFICAÇÃO PENDENTE.**

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
4. **Persistência da pendência NUNCA pode falhar em silêncio (forma exata = FORK 5, RATIFICAÇÃO
   PENDENTE)** — sob a decisão do Fork 1 (fechado), o watermark principal já não segura por `failed`
   nem por nenhuma outra condição: a marca avança sempre, incondicionalmente
   (`runStartAt − OVERLAP_MS`). Se a escrita em `reconcile_pending_items` falhar no mesmo tick em que
   o item falhou/bloqueou no ledger, o item fica sem NENHUMA proteção (a marca principal já passou
   por cima dele) — mas a FORMA exata da reação (derrubar a rodada inteira × contador dedicado ×
   ignorar) muda o raio de efeito sobre o isolamento por item que as 8 passadas já garantem hoje
   ("Isolated failure must NOT stop the batch", comentário em cada `catch`) — ver **FORK 5** para as
   3 opções, recomendação e custo de errar. Testável (independente da opção escolhida): mock do
   writer de pendência lança erro dentro do `catch` de uma das 8 passadas → o teste-guarda assere o
   comportamento ratificado no FORK 5 (throw que derruba a rodada, OU `pendingWriteFailed++` com loop
   contínuo e watermark retido) — nunca a opção (c) rejeitada (loga e segue com marca avançando).
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
9. **Policy** — `IAccountingPolicy` (`server/src/features/accounting/policies/IAccountingPolicy.ts`)
   não tem método genérico `canManageData`; o padrão real é um par de métodos por recurso —
   `canManagePayable`/`canReadPayable` (Contas a Pagar), `canManageReceivable`/`canReadReceivable`
   (Contas a Receber). Este BRIEF adiciona o mesmo par para o recurso novo:
   `canManageReconcilePending` (dispara a re-varredura) e `canReadReconcilePending` (lista), ambos
   recebendo `AccountingScope` e aplicando o mesmo gate (`ownerUserId` + `unitId`) de todos os outros
   pares. Testável: pendência de tenant B não aparece na listagem/comando do tenant A.
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

1. **`reconcileSaleCogs` sem `classifyBlockedSyncError`** — das 8 passadas merged em `runPasses`
   (`crm`, `sale`, `cancellations`, `returns`, `settlements`, `cogs`, `packageOrigin`,
   `packageConsumption`), **7 têm suporte a `blocked`** (linhas 249, 369, 476, 556, 642, 670, 885,
   947 do job — `settlements` grava `blocked` em dois pontos distintos da mesma função) e
   `reconcileSaleCogs` é a única das 8 sem `classifyBlockedSyncError` (todo erro cai em `failed`,
   linha ~784). Se o CMV também puder bater `ACCOUNTING_PERIOD_NOT_OPEN` (plausível — o
   `PostingService.postEntry` subjacente é o mesmo gate de período das outras 7), ela está
   classificando um "transitório-esperado" como "falha isolada". Sob a decisão do Fork 1 (fechado),
   isso já não é protegido por nenhum freeze de watermark (que deixou de existir) — o item cai na
   tabela de pendências com `reasonCode: 'FAILED'` em vez de `'ACCOUNTING_PERIOD_NOT_OPEN'`, o que
   não perde o item mas mistura a classificação na tela/relatório futuro. Não é um bug NOVO nem
   piora com este BRIEF, mas é uma inconsistência de classificação que vale ADR/BRIEF próprio se
   confirmada.
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
2. **Grau em cada claim:** ver tabela de insumos (cada linha cita arquivo:linha = verificado). O
   mecanismo do Fork 1 é **verificado** por citação literal das duas cédulas (não mais fork — ver
   correção acima); os 5 forks pendentes (1-R, 2, 3, 4, 5) são explicitamente **assumido/inferido**
   onde nenhuma cédula resolve por letra — nenhum deles reabre o que já está fechado.
3. **Caso adversarial tentado:** verifiquei se os dois ADRs de "reconciliação" citados no prompt de
   disparo (`ADR-INCR7-bank-reconciliation.md`, `ADR-INCR7-UNMATCH-read-shape.md`) eram o MESMO
   mecanismo do F-W2F job — a hipótese natural, já que ambos usam a palavra "reconcile". Resultado:
   **não são** — o próprio ADR-INCR7 declara a distinção na sua seção 1, e confirmei por grep que
   `watermark`/`JobWatermarkRepository` não aparecem em nenhum arquivo do módulo de conciliação
   bancária. Se eu tivesse ignorado essa checagem e citado o ADR-INCR7 como insumo funcional deste
   BRIEF, o checklist teria misturado dois domínios sem relação de dados. Segundo caso adversarial
   (pós-review): reli as duas cédulas (09-03 e a EMENDA de 08-31) palavra por palavra em vez de
   confiar na paráfrase da primeira versão deste BRIEF — resultado: Fork 1 estava ERRADO (tratava
   como aberto o que a cédula já fecha como (B)); a correção está registrada acima com as duas
   citações literais.
4. **Checagem falseável:** a checagem acima (grep por `watermark` fora de `accountingSyncReconcile.job.ts`
   e `JobWatermarkRepository.ts`) TERIA revelado uma referência cruzada, se existisse — ela não
   revelou nenhuma, o que é a evidência negativa que sustenta "são features distintas". Segunda
   checagem falseável: `grep -n "summary.blocked = " accountingSyncReconcile.job.ts` retorna 8
   ocorrências de linha (249, 369, 476, 556, 642, 670, 885, 947), mas 642 e 670 pertencem à MESMA
   função `reconcileSaleSettlements` — logo **7 das 8 passadas** merged em `runPasses` escrevem
   `blocked`; só `reconcileSaleCogs` não. Terceira checagem falseável: contei
   as ocorrências de `it(` dentro de `describe('withReconcileWatermark', ...)`
   (`accountingSyncReconcile.test.ts:723-833`) e localizei exatamente **1** teste (linha 789) que
   assere o comportamento específico do freeze por `failed`; os outros 2 testes de watermark
   (linhas 754, 766) usam `failed: 0` fixo e testam avanço genérico / guard de exceção, não o
   freeze — por isso é 1 teste a corrigir, não 3.
5. **Duas primeiras linhas entregam verdade + risco:** ver abertura do relatório final — a verdade é
   "Fork 1 fechado pela cédula, FORK 5 aberto pelo 2º review (não é detalhe de implementação)"; o
   risco principal é precisamente por isso um FORK, não um item resolvido do checklist — a forma
   exata da proteção contra falha de escrita da pendência muda o raio de efeito de uma falha de
   infraestrutura sobre as 8 passadas, e só o dono decide esse trade-off (FORK 5).

**Risco silencioso nº1 (OPS-004):** com o freeze do F-W2F-4 superado (Fork 1 fechado), a única rede
de proteção contra perder um item falho/bloqueado passa a ser a escrita bem-sucedida em
`reconcile_pending_items` — e a FORMA dessa proteção é o que o FORK 5 decide. Se a `sessao-feature`
implementar a opção (c) do Fork 5 (rejeitada, mas sempre possível por atalho) ou copiar por
proximidade textual o padrão dos dois checks vizinhos no MESMO arquivo
(`reconcilePackageBalanceVsLiability`, `reconcilePhysicalInventory` — ambos warn-only, "loga e
segue" por desenho, linhas 1002-1127) sem perceber que aqui a semântica é diferente (aqueles nunca
perdem dado de origem; este perde o único rastro do item), um erro transitório de banco no exato
tick em que um item falha vira **perda silenciosa total**: nem `tsc`, nem teste, nem CI acusam — o
item simplesmente não existe em lugar nenhum na próxima consulta, porque a marca já avançou. É
exatamente por isso que o checklist (item 4) NÃO resolve a forma sozinho — aponta para o FORK 5 e
deixa a escolha (a) ou (b) explícita para o dono, com (c) nomeada e rejeitada por escrito para que
nem a `sessao-feature` nem um leitor futuro a escolham por omissão.
