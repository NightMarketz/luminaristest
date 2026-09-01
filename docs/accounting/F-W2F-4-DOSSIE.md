# Dossiê de decisão — fork F-W2F-3. Decisão pertence ao dono (ORCH-006). Este documento não ratifica nada.

## Resultado em uma frase

**Premissa CONFIRMADA** (verificado): um item que falha isolado em qualquer dos 8 passes de
`accountingSyncReconcile.job.ts` é contado em `summary.failed`, logado, e o loop continua — a
trailing watermark (BRIEF-W2-F/F6) avança de qualquer forma no fim da rodada, e como nada no
código de sync/bridge toca `dynamic_table_data.updatedAt` da linha de origem, o item some do
próximo scan assim que `watermarkAt` ultrapassar seu `updatedAt` original (~`OVERLAP_MS` = 15min
depois, ou ~3 ticks no intervalo padrão de 5min) — sem nenhum caminho de re-varredura automática.

## Nota preliminar — discrepância de rótulo (verificado, não muda o resultado acima)

O rótulo "F-W2F-3" tem **dois referentes diferentes** nos documentos, e o enunciado desta tarefa
usa o segundo:

1. **F-W2F-3 original** (`docs/accounting/BRIEFS-WAVE2-BACKEND.md:432-442`, e repetido no
   comentário da migração `server/prisma/migrations/20260830130000_add_job_watermark/migration.sql`
   linhas 8-11, e no docstring do job `accountingSyncReconcile.job.ts:50-55`): é sobre uma escrita
   **externa ao processo** (import direto, script admin, réplica futura) setar `updatedAt` para
   antes do watermark — garantido hoje só pela ausência de `$executeRaw` sobre
   `dynamic_table_data`, não por constraint. **Isto é uma preocupação DIFERENTE** da descrita no
   enunciado desta tarefa.
2. **O que o enunciado desta tarefa chama de F-W2F-3** — item que falha e nunca mais é varrido —
   é o que o próprio job já documenta, SEM rótulo de fork, como **"KNOWN RESIDUAL"**
   (`accountingSyncReconcile.job.ts:38-48`). `docs/accounting/PRE-DADOS-REAIS-2026-08-30.md:173-177`
   é quem primeiro **relabela** esse KNOWN RESIDUAL como "resíduo F-W2F-3", conflando os dois.

Registro isto porque o dono pode querer corrigir a numeração antes de decidir — mas a pergunta de
fundo (o mecanismo do KNOWN RESIDUAL é real?) é a mesma independente do rótulo, e a resposta é sim
(ver abaixo).

---

## (a) O que acontece exatamente quando um item falha

Verificado — os 8 passes têm a mesma forma. Exemplo canônico, `reconcileCrmReceivables`:

- `accountingSyncReconcile.job.ts:229-257` — `catch (error)`: primeiro tenta classificar como
  BLOCKED via `classifyBlockedSyncError` (linha 232); se não for um código skip-listado, cai no
  ramo de falha real: `summary.failed++` (linha 246), `logger.error('Reconcile failed for
  opportunity — continuing', { event: 'reconcile_item_failed', ... })` (linhas 247-255), e
  `continue` (linha 256) — o loop segue para o próximo item, o item corrente não é reprocessado
  na mesma rodada.
- Mesma forma em `reconcileSaleSales` (linhas 350-377), `reconcileSaleCancellations` (457-475),
  `reconcileSaleReturns` (537-555), `reconcileSaleSettlements` (651-669), `reconcileSaleCogs`
  (768-775 — este pass NÃO chama `classifyBlockedSyncError`, todo erro vira `failed`),
  `reconcileSalePackageOrigin` (866-884), `reconcileSalePackageConsumption` (953-961).
- **Não há fila/estado de retry.** O item não é marcado no banco (nenhum write ao
  `dynamic_table_data` de origem, nenhuma tabela de dead-letter). O único artefato durável é o log
  estruturado (`event: 'reconcile_item_failed'`, `sourceId`, `failedSoFar`) — greppável, mas não
  acionável por código.
- A exceção capturada é `unknown` (TypeScript `catch (error)`) — qualquer `Error`, não só as da
  aplicação. Ver (d) abaixo para a distinção entre este catch genérico e o `classifyBlockedSyncError`
  específico por código.

## (b) A watermark avança mesmo com falha no lote? Em qual linha?

Verificado — **sim, avança incondicionalmente**, desde que a rodada inteira não lance:

- `accountingSyncReconcile.job.ts:173-182` (`withReconcileWatermark`): lê o watermark (177), captura
  `runStartAt` (178), roda `runPasses(watermarkAt)` (179) e — **sem checar o conteúdo do
  `ReconcileSummary` retornado** — persiste `runStartAt - OVERLAP_MS` via `deps.setWatermark` na
  linha **180**. `summary.failed` não é lido em nenhum ponto desta função.
- Isto funciona porque cada `catch` dentro de cada pass (ver (a)) **engole** a exceção do item e
  faz `continue` — o erro nunca escapa para fora de `reconcileCrmReceivables`/`reconcileSaleSales`/
  etc., então `runPasses` (definida em `runAccountingSyncReconcile`, linhas 1044-1317) sempre
  resolve normalmente mesmo com `failed > 0` na soma final (linha 1314,
  `[crm, sale, ...].reduce(mergeSummaries)`).
- `JobWatermarkRepository.set` (`server/src/jobs/JobWatermarkRepository.ts:19-25`) é um `upsert`
  incondicional — não recebe nem inspeciona o summary, só a data.
- Confirmado também pelo teste existente `accountingSyncReconcile.test.ts:754-764` ("advances the
  watermark ... ONLY after runPasses resolves") — mas note: **nenhum teste no arquivo passa um
  `runPasses` que resolve com `failed > 0`** para provar explicitamente "avança mesmo com falha”;
  o teste da linha 754 usa `summary = { ..., failed: 0 }`. A conclusão acima é **inferida da
  leitura do código** (linha 180 não olha o summary) e é uma inferência direta, não uma suposição —
  mas hoje **não há um teste-guarda que falharia se alguém acoplasse `setWatermark` a
  `summary.failed === 0`** por engano numa refatoração futura. Isso é, em si, uma lacuna de
  cobertura relevante para a sessão de instrumentação.

## (c) Existe QUALQUER mecanismo de re-varredura (retry, backfill, reset manual)?

Verificado — busca extensiva, nenhum mecanismo de aplicação encontrado:

- Nenhuma outra chamada a `JobWatermarkRepository`/`RECONCILE_WATERMARK_JOB` além do próprio job e
  seus testes (grep confirmado em `server/src`).
- `accountingSyncReconcileCli.ts` (o único outro entry point, `npm run accounting:reconcile`) só
  invoca `runAccountingSyncReconcile()` e reporta o summary — sem flag `--reset`, `--full-scan`,
  nem qualquer parâmetro que ignore o watermark (linhas 20-67 lidas por inteiro).
- Não existe rota HTTP, script administrativo, nem migração de dado que escreva/apague a linha
  `job_watermarks` fora do próprio `JobWatermarkRepository.set` (grep em `server/prisma/schema.prisma`
  confirma o `model JobWatermark` na linha 309, sem outro consumidor).
- O código de sync/bridge nunca escreve de volta em `dynamic_table_data` da linha de origem
  (`grep -rn "dynamicTableData.update|updateRow" server/src/features/accounting/sync/` = 0
  ocorrências) — nem no sucesso, nem na falha. Ou seja: mesmo um item que teve sucesso não teria
  seu `updatedAt` "renovado" pelo job; só uma edição independente da linha de origem (ex.: o
  usuário reabre a venda) recolocaria o item na janela.
- **Mitigação teórica, não uma feature:** um humano com acesso direto ao SQLite poderia fazer
  `UPDATE job_watermarks SET watermarkAt = 0` para forçar EPOCH (full scan) no próximo tick — mas
  isso é a mesma classe de escrita externa que o F-W2F-3 *original* (item 1 da nota acima) já
  assume como inexistente hoje; não é um mecanismo exposto pela aplicação.
- Conclusão: **nenhum mecanismo de re-varredura existe hoje.** O KNOWN RESIDUAL do docstring
  (linhas 38-48) já registra isto textualmente ("this does not violate the invariant... but it
  does change a previously-infinite retry into a time-boxed one... worth a human decision").

## (d) Classe de erro skipável — respeita "skip+log só com erro de code próprio"?

Verificado — **duas classes de catch distintas, com disciplinas diferentes**:

- **BLOCKED** (`classifyBlockedSyncError` → `syncSkipErrorCode`,
  `server/src/features/accounting/sync/AccountingSyncPort.ts:81-103`): gated estritamente por
  `error instanceof AppError && SYNC_SKIP_ERROR_CODES.includes(error.errorCode)`, com
  `SYNC_SKIP_ERROR_CODES = ['ACCOUNTING_PERIOD_NOT_OPEN', 'MAX_CENTS_EXCEEDED']` (linha 91). O
  docstring (linhas 82-90) cita a regra do projeto pelo nome: *"Project rule
  (`erro-especifico-para-skip-em-job`): skip ONLY on a specific code, never on a base error class"*
  — **esta trilha respeita a regra da memória**, e corrige um bug histórico citado no mesmo
  docstring (linha 95-96: cheque antigo lia `.code` inexistente, nunca disparava).
- **FAILED** (o `catch (error)` genérico de cada pass, ver (a)): **captura qualquer `Error`**, sem
  checar tipo ou código — `TypeError`, erro de rede, bug de mapeamento, tudo cai em
  `summary.failed++` e `continue`. Isto **não é o anti-padrão da regra da memória** no sentido
  estrito (a regra fala de *skip* de retry — aqui o item é reportado como falha real, "loud
  failure left for reconciliation" conforme o próprio docstring do `AccountingSyncPort.ts:90`), mas
  é exatamente o ponto onde o KNOWN RESIDUAL morde: a intenção declarada ("deixado para a
  reconciliação") só se cumpre enquanto o item está dentro da janela do watermark. Fora dela, um
  erro genuíno de aplicação (não um código-poison) é abandonado silenciosamente do mesmo jeito que
  um MAX_CENTS_EXCEEDED seria — mas SEM o registro deliberado que o BLOCKED tem (`blocked` no
  summary, alerta explícito). Isso agrava o achado: o resíduo não afeta só os itens
  "legitimamente sem solução automática", afeta qualquer falha transiente (timeout, lock do
  SQLite) que por azar não seja re-tentada antes da janela fechar.

---

## Opções de correção (2 a 4, não ratificadas — decisão do dono)

**Opção 1 — watermark = min(início da janela, falha não resolvida mais antiga por pass).**
Cada pass reporta a menor `updatedAt` entre os itens que caíram em `failed` (não `blocked`);
`withReconcileWatermark` usa `min(runStartAt - OVERLAP_MS, essa menor updatedAt)` como novo
watermark. *Trade-off:* complexidade média (cada pass já itera as linhas, só precisa reter o mínimo);
risco de watermark **presa para sempre** se um item nunca for corrigido (ex.: venda sem `unitId`)
— o full-scan nunca mais encolhe até alguém tratar o item; observabilidade boa (o watermark parado
é, em si, um sinal visível). *O teste-guarda assertaria:* após uma rodada com 1 item falho e N
itens saudáveis mais recentes, o watermark persistido é `<=` ao `updatedAt` do item falho, não
`runStartAt - OVERLAP_MS`.

**Opção 2 — fila de retry com contador, independente do watermark.**
Ao cair em `failed`, o item (chave: `sourceType`+`sourceId`) é upsertado numa tabela nova
(`reconcile_retry_queue`) com `attempts++`; o job, além do scan por watermark, sempre relê essa
fila primeiro. Um teto de tentativas move para dead-letter (Opção 3). *Trade-off:* complexidade
alta (nova tabela, novo write path, nova política de retry/backoff); risco de watermark presa =
**nenhum** (watermark e retry são desacoplados); observabilidade excelente (fila é uma lista
consultável de "o que está pendente e há quanto tempo"). *O teste-guarda assertaria:* um item que
falha na rodada N aparece em `listRetryQueue()` e é reprocessado na rodada N+1 mesmo com
`updatedAt` fora da janela do watermark.

**Opção 3 — dead-letter explícita com alerta, sem retry automático.**
Item que falha grava uma linha em `reconcile_dead_letter` (sourceType, sourceId, reason,
firstFailedAt) na primeira vez que sai da janela sem sucesso; um pass adicional varre essa tabela
e dispara `sendAlertWebhook` (já existe, usado no CLI) para intervenção humana — sem tentar
reprocessar sozinho. *Trade-off:* complexidade baixa-média (uma tabela + um pass simples, reusa o
webhook existente); risco de watermark presa = nenhum, mas troca por **dependência de ação
humana** para todo item; observabilidade é o ponto forte (visibilidade explícita, sem mascarar
como log perdido). *O teste-guarda assertaria:* um item cujo `updatedAt` está prestes a sair da
janela (`watermarkAt` calculado ultrapassaria seu `updatedAt`) e que está em `failed` gera uma
linha em `reconcile_dead_letter` antes do watermark avançar sobre ele.

**Opção 4 — rescan periódico completo (full scan) intercalado, sem mudar a estrutura do job.**
A cada K execuções (ou 1x/dia via cron separado), o job roda com `updatedAtFrom =
RECONCILE_WATERMARK_EPOCH` em vez do watermark persistido, sem alterar o watermark trailing entre
essas execuções. *Trade-off:* complexidade mínima (um parâmetro + um agendamento extra, zero
schema novo); risco de watermark presa = nenhum (o full-scan periódico sempre recaptura o item,
mesmo sem contador); observabilidade fraca — o atraso até a recuperação é de até K execuções (ex.:
1 dia), e nada distingue "item pendente há 1 dia" de "item pendente há 1 minuto" nos logs. *O
teste-guarda assertaria:* uma execução marcada como full-scan ignora o watermark persistido e
processa um item cujo `updatedAt` é anterior a `watermarkAt`.
