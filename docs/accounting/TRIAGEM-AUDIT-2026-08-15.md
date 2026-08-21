# TRIAGEM dos 8 achados da AUDITORIA 2026-08-15

> **DESFECHO 2026-08-20 — P1 e P2 APLICADOS.** O dono ratificou a P1 + fork (b) do A2 e mandou aplicar
> o plano (multi-agente). Estado final, com review independente **PASS-COM-RESSALVAS** (nenhuma
> bloqueante) e gates completos verdes (unit server inteira + integração `--runInBand` + `tsc`×2 +
> vitest my-app 163/163):
>
> | Item | Desfecho |
> |---|---|
> | **A1** | ✅ CORRIGIDO — job nasce `PROCESSING`, vira `EXPORTED` só após `saveFile`, `FAILED` no catch; 3 sítios, 3 guardas vermelho→verde. Resíduo conhecido (review): falha do próprio `updateJob(FAILED)` mascara o erro original — a linha nunca mente sucesso. |
> | **A2 (b)** | ✅ CORRIGIDO pela **variante de fronteira** — a instrução literal do fork (mudar a `description`) alteraria o HISTÓRICO I250 da ECD (SpedGenerationService lê `e.description`); o aplicado atende ao objetivo sem esse efeito: campo **interno** `auditDescription` (fora do Zod de propósito — o parse do controller descarta a chave; `dtoShapeSnapshot` prova contrato HTTP intacto), usado só no payload de `entry.posted`. Os 8 builders AP/AR passam descrição sem nome; row e ECD mantêm o nome. Review confirmou: zero vazamento residual (estorno usa `entry.reversed`, sem description; CRM→AR herda via `createReceivable`; mappers de salão são id-only). **Se o dono preferir a versão literal, é reversão barata — dizer.** |
> | **A3** | ✅ CORRIGIDO — `blocked` no resumo do scheduler e do CLI; resumo sobe a `warn` (persiste no NDJSON) quando `blocked>0 || failed>0`; exit code segue failed-only (blocked = skip determinístico), decisão comentada no código. Correção de claim: o stdout do CLI **já** tinha blocked via spread; a omissão real era o log estruturado. |
> | **A4** | ✅ CORRIGIDO — os 5 catches dos re-drives AP/AR classificam via `syncSkipErrorCode` (mesma allowlist dos bridges): determinístico → `blocked`, inesperado → `failed`; retorno estendido (aditivo — callers HTTP repassam `data`, nada quebra). |
> | **A5** | ✅ RUNBOOK-M2 emendado — bloco com os 3 fatos re-medidos (zero `down`; 9/29 migrações com rebuild destrutivo, corrigindo o "9/30" do relatório; nenhum artefato roda `migrate deploy`). |
> | **A6** | ✅ resíduo CORRIGIDO — eco `= formatCents(amountCents)` nos dois modais, zero chave i18n nova; some para entrada inválida (`parseBrl`→0). |
> | **A7 / A8** | ⏸ P3 mantido — sem trabalho próprio (A7 fecha com X2/H1; A8 é decisão de produto demand-gated). |
>
> Achado novo do lote, **refutado no review**: suspeita de que `CrmReceivableBridge` vazasse o `label`
> do CRM na trilha — falso, o bridge entra por `createReceivable` e herda a sanitização.

**Triado em:** 2026-08-20, por agente, a pedido do dono ("tria os 8 achados da auditoria de 08-15").
**Base:** [AUDIT-2026-08-15.md](AUDIT-2026-08-15.md) §2 (achados A1–A8, auditados em `0f3b757f`).
**Verificado contra:** `origin/main` `3a761812` — **42 commits depois** do commit auditado. Cada verdito
abaixo foi re-medido no código de hoje, não herdado do relatório.

> **Grau desta triagem:** a coluna "ainda real?" é **verificado** (comando + `arquivo:linha` colados por
> item). A coluna "destino" é **proposta** — a fila §5.1 do `ACCOUNTING-MASTER-MAP.md` é ratificada pelo
> humano (ORCH-006); **nada foi escrito nela por esta triagem**.
>
> **O que esta triagem NÃO é:** não é rodada de auditoria nova, não monta gate nem revisor novo — a
> moratória do `CLAUDE.md` (4 de 4 oráculos do Bloco A abertos >14 dias) veda aparato novo, e triar uma
> lista existente é exatamente o que o `GAP-MAP` §Uso reserva ao dono: "decisão do dono sobre a lista,
> sem aparato novo".

---

## Placar

| # | Achado (resumo) | Ainda real em `main`? | Classe | Destino proposto |
|---|---|---|---|---|
| A1 | Geração fiscal grava `EXPORTED` antes de o arquivo existir; `FAILED` nunca é escrito | ✅ **SIM — e a classe é maior: 3 sítios, não 2** | correção de código | **P1** — pré-condição honesta do gate H1 (PVA) |
| A2 | Nome do fornecedor entra na trilha hash-encadeada via `description` | ✅ SIM | **fork de política** (PII × legibilidade da trilha) | **P1-decisão** — cadeia append-only: decidir ANTES de entrar dado real |
| A3 | `blocked` some do resumo e do exit code do reconcile | ✅ SIM (com atenuante medido) | correção de código | **P2** — lote de higiene |
| A4 | `catch` da classe base engole erro no re-drive do subrazão | ✅ SIM | correção de código (classe conhecida) | **P2** — lote de higiene |
| A5 | Zero rollback + artefato de implantação não sobe schema | ✅ SIM | **decisão de operação** | **P1-runbook** — emenda ao `RUNBOOK-M2`, não incremento de código |
| A6 | `parseBrl` lê `"1,234.56"` como R$ 1,23 + modal não mostra o valor interpretado | ⚠️ **METADE FECHADA** — parser corrigido; eco no modal não | correção de código (resíduo) | **P2** — 1 linha por modal |
| A7 | `coverage().ready` mede presença, não correção | ✅ SIM, **por desenho declarado** | subordinado a gate externo | **P3** — fecha junto com X2/H1, sem trabalho próprio |
| A8 | Procedência irrecuperável quando quem escreve é o agente | ✅ SIM | **decisão de produto** | **P3** — diferido, demand-gated |

**Resultado:** 7 de 8 continuam reais; 1 (A6) teve a metade cara fechada por conta própria entre a
auditoria e hoje. **Nenhum é nível 4** — o sistema nunca foi implantado, e isso é o que define a fila
abaixo: só sobe à P1 o que **mente para um humano num gate** ou o que **não pode ser consertado depois**.

---

## P1 — antes do 1º deploy / do gate humano que ele contamina

### A1 · O estado `EXPORTED` é gravado antes de o arquivo existir

**Verificado hoje.** `createJob({ status: 'EXPORTED' })` acontece **antes** de `storage.saveFile`, em
**três** sítios — a auditoria nomeou dois:

- [SpedGenerationService.ts:120](../../server/src/features/accounting/services/SpedGenerationService.ts:120) (ECD) → `saveFile` em `:129`
- [SpedEcfGenerationService.ts:167](../../server/src/features/accounting/services/SpedEcfGenerationService.ts:167) (ECF)
- [DataExchangeExportService.ts:135](../../server/src/features/accounting/services/DataExchangeExportService.ts:135) (**CSV/XLSX — não estava no relatório**)

`grep "status: 'EXPORTED'"` em `server/src` (sem teste) = exatamente esses 3. E `'FAILED'` não é escrito
por nenhum dos três: os únicos hits vivos são do `DataExchangeImportService:227` (import, outro caminho).

**Atenuante que a triagem mediu e o relatório não:** o dano é menor que "artefato corrompido". O download
guarda — `if (!job || !job.storageKey) throw new NotFoundError` em
[DataExchangeExportService.ts:190](../../server/src/features/accounting/services/DataExchangeExportService.ts:190).
Falha no meio **não** entrega arquivo truncado; entrega **404 numa linha que diz `EXPORTED`**.

**Por que ainda assim é P1:** o executor do **H1 (PVA)** gera ECD/Apuração/ECF e lê essa lista para saber o
que baixar. Estado que mente é exatamente o que estraga um gate humano de rodada única — e o `RUNBOOK-H1`
manda colar evidência, não impressão.

**Ação proposta (barata):** nascer `PROCESSING` → `EXPORTED` só depois do `saveFile`; `catch` → `FAILED`.
O valor `'FAILED'` **já existe** no modelo
([DataExchange.model.ts:40](../../server/src/features/accounting/models/DataExchange.model.ts:40)) — zero
migração. Falsificador de ≤10 min: mockar `saveFile` para lançar e assertar que a linha não fica `EXPORTED`.

### A2 · Nome do fornecedor na trilha imutável — fork, não bug

**Verificado hoje.** O allowlist bane o nome em `payable.created` e diz textualmente *"NEVER the supplier
name (PII-safe, D6)"*
([auditCanonical.ts:42](../../server/src/features/accounting/audit/auditCanonical.ts:42)), mas admite
`description` em `entry.posted`
([auditCanonical.ts:13](../../server/src/features/accounting/audit/auditCanonical.ts:13)) — e a descrição é
montada com o nome: `Contas a pagar — ${payable.supplierName}`
([PayableService.ts:741](../../server/src/features/accounting/services/PayableService.ts:741)), espelhado
em `ReceivableService`.

**Por que é P1 mesmo com o app nunca implantado:** a cadeia é hash-encadeada e append-only — sem
`deletedAt`, sem cascade. **Não existe conserto retroativo.** Toda decisão aqui é "antes de entrar dado real
de terceiro" ou "nunca". Decidir agora custa uma linha; decidir depois custa uma cadeia reescrita (isto é,
quebrada).

**Fork para o dono (não decido por conta própria):**
- **(a)** tirar `description` do allowlist de `entry.posted` — trilha mais pobre, PII-limpa por construção;
- **(b)** manter o campo e sanitizar na origem (descrição do subrazão cita `supplierRef`, não o nome);
- **(c)** aceitar por escrito: nome de fornecedor PJ não é PII sensível neste produto, e a trilha vale mais.

Recomendo **(b)** — preserva a legibilidade da trilha e o `counterpartyId` já é first-class desde o B1. Mas
é política, e cai junto com o item 14 (LGPD) da fila.

### A5 · Sem volta e sem schema no artefato — emenda de runbook, não incremento

**Verificado hoje.** `find -iname "*down*"` em `server/prisma/migrations` = **0**. `grep "migrate deploy"` no
repo = **0 hits em artefato executável** (só prosa em 4 docs de closeout). `docker-compose.yml` sem
`command`/`entrypoint`.

**Destino: NÃO virar código agora.** Escrever pipeline de implantação para um alvo que não existe é o que o
`RUNBOOK-M2` já registra como bloqueado ("alvo de deploy decidido e provisionado — decisão do dono; hoje
inexistente"). O conserto honesto é **emendar as pré-condições do M2** com os três fatos acima, para o
executor não descobrir no host que o container sobe sem schema.

O `RUNBOOK-M2` **já exige** backup antes de migrar. O que falta declarar lá: (1) não há `down`, o rollback
**é** o backup; (2) 9 das 30 migrações fazem rebuild destrutivo; (3) a migração nº 29 documenta no próprio
SQL que o `RAISE(ABORT)` não reverte o backfill já commitado.

---

## P2 — lote de higiene (barato, sem gate humano à frente)

Cabe num PR pequeno de backend (A3+A4) e um de frontend (A6). Nenhum bloqueia gate; todos são "a falha não
avisa" — a costura que a própria auditoria nomeou (§3, "o silêncio é estrutural").

### A3 · `blocked` sumido do resumo e do exit code

Verificado: o contador existe e é somado (5 sítios em
[accountingSyncReconcile.job.ts:76,138,258,365,445](../../server/src/jobs/accountingSyncReconcile.job.ts:76)),
mas o log de conclusão imprime `total/synced/idempotentHits/failed` e **omite `blocked`**
([AccountingSyncScheduler.ts:100-111](../../server/src/jobs/AccountingSyncScheduler.ts:100)); o CLI sai
`summary.failed === 0 ? 0 : 1`
([accountingSyncReconcileCli.ts:32](../../server/src/jobs/accountingSyncReconcileCli.ts:32)).

**Atenuante que a triagem mediu:** cada incremento de `blocked` emite `logger.warn`, e `warn` **persiste** no
sink NDJSON ([logger.ts:105](../../server/src/lib/logger.ts:105)). A verdade **está** no disco. Quem mente é
o **resumo** (`info`, não persiste) e o **exit code**. Isso rebaixa "mês inteiro invisível" para "mês inteiro
com exit 0 e as linhas num arquivo que ninguém foi mandado ler" — vale corrigir (1 campo no log + decisão do
exit code), mas não é cegueira.

### A4 · `catch` da classe base no re-drive

Verificado: [PayableService.ts:506,525](../../server/src/features/accounting/services/PayableService.ts:506)
capturam qualquer erro e só logam `warn`; a assinatura devolve apenas contadores de sucesso
([:470](../../server/src/features/accounting/services/PayableService.ts:470)) — `{0,0,0}` é indistinguível de
"nada a fazer". É a classe já registrada em memória (`erro-especifico-para-skip-em-job`), e o módulo tem a
disciplina certa no outro reconcile (`SYNC_SKIP_ERROR_CODES`). **Conserto = espelhar essa lista de códigos**,
não inventar mecanismo novo.

### A6 (resíduo) · O modal ainda não mostra o valor interpretado

**A metade cara está FECHADA:** `parseBrl` foi corrigido em `a00017e6` (PR #201) — desambigua pelo separador
final — e o teste carrega **exatamente o falsificador que a auditoria propôs**: `['1,234.56', 123456]`
([parseBrl.test.ts:19](../../my-app/features/accounting/components/__tests__/parseBrl.test.ts:19)).

**Resíduo aberto:** `CreatePayableModal` calcula `amountCents` na linha 60 e **nunca o renderiza** — não
importa `formatCents` (contraste: `JournalEntryModal` mostra a soma). Idem `CreateReceivableModal:61`. Uma
linha por modal, com o canônico que já existe.

---

## P3 — sem trabalho próprio hoje

### A7 · O gate de cobertura mede presença

Real, **e por desenho declarado**: sem catálogo importado para a versão, o serviço cai no comportamento
free-string do INCR-9 — o comentário no código o diz ("no catalog for this version → INCR-9 free-string
behavior",
[ReferentialMappingService.ts:265](../../server/src/features/accounting/services/ReferentialMappingService.ts:265)).
Quando **X2** (arquivo oficial RFB) fechar, `countByVersion > 0` passa a valer e código inválido é rejeitado.
O resíduo remanescente — "presença não é correção" — é justamente o que **H1 (PVA)** existe para medir.
**Nenhum incremento próprio; registrar como residual dos gates X2/H1.**

### A8 · Procedência quando quem escreve é o agente

Real e verificado: o agente chama o service direto
([LuminarisAgentService.ts:200](../../server/src/features/chat/services/LuminarisAgentService.ts:200)),
enquanto as pontes contábeis vivem no controller
([dynamicTablesController.ts:119-121](../../server/src/controllers/dynamicTablesController.ts:119)) — onde o
Contrato §2.1 **manda** que fiquem. Ou seja: não é ponte no lugar errado, é **caminho de escrita que não
passa pela costura**; o efeito contábil chega na passada seguinte do job.

É **decisão de produto**, não defeito de camada: depende de o agente ser ou não caminho de escrita contábil
para valer. Sem operação real (o mesmo gargalo dos 5 gates), **diferido**. Os dois resíduos concretos ficam
registrados para quando abrir: o modal confirma na altitude errada (pares chave/valor crus, sem
conta/débito/crédito) e a proposta é deletada após executar, sem `EXECUTED` gravado.

---

## Deltas desta triagem contra o relatório (o que mudou ao re-medir)

1. **A6a fechou sozinho** entre 08-15 e 08-20 (PR #201) — com o falsificador exato que o relatório sugeriu.
2. **A1 é 3 sítios, não 2** — `DataExchangeExportService` repete o padrão e ficou fora do relatório.
3. **A1 tem teto de dano** — o download guarda `!storageKey` → 404, não arquivo corrompido.
4. **A3 tem atenuante** — os `blocked` individuais são `warn` e **persistem** no NDJSON; mente o resumo e o
   exit code.
5. **A5 e A8 saem da fila de código** — um é pré-condição de runbook (M2), o outro é decisão de produto sem
   demanda. Tratá-los como incremento agora seria construir para alvo inexistente.

## O que precisa de você

1. **Ratificar (ou recusar) o P1** — A1 (código) e a emenda do `RUNBOOK-M2` (A5). Só depois entram no Bloco A
   de §5.1.
2. **Decidir o fork do A2** — (a) tirar `description`, (b) sanitizar na origem, (c) aceitar por escrito. É a
   única decisão desta lista que **não pode ser adiada sem custo**: a cadeia é append-only.
3. **Dizer se o P2 vira um PR** ou fica só registrado. Nenhum dos três bloqueia gate.
