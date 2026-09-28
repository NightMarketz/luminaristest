# BRIEF — BE-INCR-DFE-ANEXO-PENDENTE (anexo e proveniência da NFS-e autorizada não se perdem se falharem depois da autorização)

> Produzido em `sessao-planejamento` (2026-09-28). **Este documento NÃO escreve código**: checklist, contratos
> esboçados e forks. **Forks F-PA-1..7: RATIFICADOS 2026-09-28** (dono, questionário em sessão): F-PA-1 → (a) ·
> F-PA-2 → (a) · F-PA-3 → (a) · F-PA-4 → (a) · F-PA-5 → **(c)** · F-PA-6 → (a) · F-PA-7 → **(b)**. As duas escolhas
> fora da recomendação estão em negrito. **F-PA-8 (nascido do F-PA-7 b) → (b) automático em todo tick, RATIFICADO
> 2026-09-28**, também fora da recomendação. Todos os forks estão ratificados. A execução ainda depende de uma
> autorização de execução (`executa`), que este BRIEF não traz.

**Resumo:** desde o #420 ("autorizar antes, anexar depois"), uma falha no anexo ou na proveniência **depois** da tx
de autorização deixa o documento AUTHORIZED sem `xmlAttachmentId`/`sourceDocumentId`. No retorno manual o XML só
existe no corpo da requisição, então não sobra nada para reexecutar. **O que fecha:** uma pendência gravada **na
mesma tx da autorização**, com os bytes, drenada por uma varredura idempotente no scheduler que já existe.
**Risco principal:** o `DocumentAttachmentService.upload` não é idempotente. Sem registro de progresso por passo,
uma retentativa duplica o anexo (F-PA-3).

---

## 0. Contexto fixo (não rediscutir)

- **Item:** resíduo [ABERTO] do GAP-MAP "NFS-e — resíduo do `applyResult`: anexo que falha depois da autorização
  perde o XML do retorno manual", registrado pelo PR #420 (commit `3eb8169e`).
- **Autorização:** dono, questionário em chat, 2026-09-28: **"BRIEF da pendência de anexo"**, com a descrição
  "sessao-planejamento: outbox local (pendência com XML na tx da autorização) + varredura no scheduler existente".
  Cobre o BRIEF. Não cobre a execução.
- **Fato consumado (PR #420, ainda aberto quando este BRIEF foi escrito):**
  - `applyResult` roda a tx de autorização primeiro: `insideTx` + `transition(whenStatusIn)` + audit
    `dfe.authorized` com `sourceDocumentId: ""`.
  - Só depois, em produção, faz `upload` XML/PDF, `attachSourceDocument` e uma 2ª `transition` guardada por
    `whenStatusIn: [autorizado]`.
  - Se o status mudou no meio, a 2ª transição cai no `retireSourceDocument(…, 'dfe_status_changed')`.
- **Padrão escolhido pelo dono:** transactional outbox local, sem fila externa. O relay é por polling no scheduler
  in-process (microservices.io/patterns/data/transactional-outbox.html, lido em 28/09).
- **Plataforma:** SQLite (memória `stay-on-sqlite-no-postgres`), e migração SQLite não é transacional (memória
  `migracao-sqlite-nao-e-transacional`).

## 1. Fatos medidos (com grau)

| # | Fato | Grau |
|---|---|---|
| 1 | `DocumentAttachmentService.upload` grava o binário no disco (`storage.saveFile`) ANTES da própria tx; se a tx falha, apaga o arquivo (TX-001). **Não deduplica** por `sha256` nem por alvo | verificado lendo `DocumentAttachmentService.ts:109-175` |
| 2 | `PostingService.attachSourceDocument` é idempotente por `externalRef`, re-checado dentro da tx própria | verificado lendo `PostingService.ts:739-760` + docstring |
| 3 | `DfePollScheduler` roda `runDfePollPending` a cada 2 min com lock process-local; `pollPendingOnce` só olha `SENT|PROCESSING` | verificado lendo `DfePollScheduler.ts`, `FiscalDocumentLifecycleService.ts:111-150` |
| 4 | O schema não tem nenhuma coluna `Bytes` hoje | verificado (`grep Bytes prisma/schema.prisma` → 0) |
| 5 | No retorno manual o XML chega como `Buffer` da requisição e não é persistido antes da autorização | verificado lendo `retornoManual` |
| 6 | Em homologação o `applyResult` não anexa nada (ADR §9.2 item 5) | verificado |
| 7 | A falha do anexo depois da autorização é rara (disco cheio, erro de DB) | inferido; sem medição |

## 2. Comportamento esperado

Documento autorizado em produção **sempre** termina com XML (e PDF, se veio) anexado e com a proveniência criada,
mesmo que o passo pós-autorização falhe, **desde que** continue autorizado. Se foi cancelado no meio, vale o F-PA-5.
Recusa da autorização não deixa pendência nenhuma.

## 3. Checklist numerado

1. **Modelo `FiscalDocumentPendingAttachment`**: uma linha por documento autorizado em produção (schema em §4).
   Migração criativa, sem backfill (F-PA-7). Cabe no prólogo `IF NOT EXISTS` da memória de migração SQLite.
2. **Repositório** (`IFiscalDocumentRepository` + `FiscalDocumentRepository`, `tx?` em todos):
   - `createPendingAttachment(scope, data, tx)`;
   - `listDuePendingAttachments(now, limit)` (cross-tenant, mesmo desenho do `listPending`);
   - `markPendingStep(id, patch, tx?)`;
   - `markPendingDone(id)`, que zera os bytes (F-PA-6).
   Nada de `prisma.*` fora do repo.
3. **Na tx de autorização** do `applyResult`, se `ambiente === 'producao'`: grava a pendência com o XML, o PDF
   (F-PA-1 decide onde ficam os bytes), `chaveOuCodigo`, `nNFSe/numero` e `valores` (para o `rawJson` da
   proveniência). Com isso a recusa da tx não deixa nada, e a guarda do #420 continua verde.
4. **Caminho rápido**: logo depois da tx, o `applyResult` chama `drainOne(pending)` inline, o que mantém o
   comportamento atual quando tudo dá certo (F-PA-4). Se falhar, loga `warn` e **não** propaga: a autorização
   está commitada e a pendência fica para a varredura.
5. **`drainOne` idempotente por passo** (F-PA-3):
   - upload do XML só se `xmlAttachmentId` da pendência for null, e grava o id na pendência antes do próximo
     passo; o mesmo para o PDF;
   - `attachSourceDocument`, que já é idempotente;
   - 2ª `transition` com `whenStatusIn` (código atual do #420);
   - `markPendingDone`.
6. **Status mudou no meio** (cancelamento), F-PA-5 → (c): anexa XML (e PDF), cria a proveniência e a aposenta em
   seguida (`retireSourceDocument(…, 'dfe_status_changed')`, o ramo do #420). A pendência vai para DONE. O XML da
   nota que existiu fica guardado.
7. **Varredura**: `drainPendingAttachmentsOnce(limit)` no `FiscalDocumentLifecycleService`, chamado pelo MESMO
   tick do `DfePollScheduler` depois do `pollPendingOnce` (F-PA-2). `PollSummary` ganha `attachments: { total, done, failed }`.
8. **Backoff e teto** (F-PA-6): `attempts++`, `nextAttemptAt` com backoff, `lastError` truncado. Passou do teto
   → `status = FAILED` + `logger.error` (o alerta no sink NDJSON já existente).
9. **Sem eventType novo**: `attachment.uploaded`, o audit do `attachSourceDocument` e o `entry.source_retired`
   (F-PA-5 c) já registram os efeitos.
10. **Testes** (unit com repositório dublê + 1 integração SQLite real):
    - recusa na tx → 0 pendências (a guarda do #420 continua);
    - falha no upload inline → pendência PENDING com os bytes, documento AUTHORIZED;
    - a varredura drena → ids gravados, bytes zerados, DONE;
    - retentativa depois de falha **entre** upload e `markPendingStep` não duplica anexo (é o teste que morde o
      F-PA-3);
    - cancelado no meio → XML anexado, proveniência criada e aposentada, DONE (F-PA-5 c);
    - teto → FAILED + `logger.error`;
    - homologação → sem pendência.
11. **Backfill por reconsulta** (F-PA-7 → b): documentos `AUTHORIZED|AUTHORIZED_DIVERGENT` em produção, com
    `xmlAttachmentId` e `sourceDocumentId` nulos e sem pendência, de parceiro com `capabilities.consultar`:
    - `port.consultar(partnerRef)`;
    - se o retorno trouxer `xml`, cria a pendência (PENDING) e deixa a varredura drenar.

    Modo manual e retorno sem XML: não há de onde tirar o arquivo, então é skip + `logger.warn` com o `documentId`
    (lista para ação humana). Onde roda: F-PA-8 → (b), a varredura do F-PA-2 procura os candidatos em todo tick.
    **Custo declarado:** um documento manual, ou de parceiro que não devolve XML, é reconsultado a cada 2 min
    para sempre, e o `warn` se repete. Hoje o conjunto é vazio. Se isso pesar, a mitigação é frente nova. Teste:
    - reconsulta com XML → pendência criada;
    - manual → skip nomeado;
    - rodar 2× → uma pendência só (`documentId @unique`).
12. **Gates**: `tsc` limpo; suíte unit; integração isolada `--runInBand`. Sem rota nova (sem DTO nem openapi). A
    migração entra no `resetDb()`, com a lista de tabelas contábeis do F-Q3 (memória `resetdb-nao-limpa-contabilidade`).

## 4. Contratos esboçados

```prisma
model FiscalDocumentPendingAttachment {
  id               String   @id @default(cuid())
  userId           String
  unitId           String
  documentId       String   @unique            // um por documento (idempotência da criação)
  status           String                       // PENDING | DONE | FAILED | DISCARDED
  xmlBytes         Bytes?                       // F-PA-1 (a); null após DONE (F-PA-6)
  pdfBytes         Bytes?
  xmlAttachmentId  String?                      // progresso por passo (F-PA-3)
  pdfAttachmentId  String?
  sourceDocumentId String?
  resultJson       String                       // { chaveOuCodigo, nNFSe, numero, valores } — sem PII (§1.12)
  attempts         Int      @default(0)
  nextAttemptAt    DateTime @default(now())
  lastError        String?                      // truncado a 500
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  @@index([status, nextAttemptAt])
  @@map("fiscal_document_pending_attachments")
}
```

```ts
// FiscalDocumentLifecycleService
drainPendingAttachmentsOnce(limit?: number): Promise<{ total: number; done: number; failed: number; discarded: number }>;
// PollSummary (DfePollScheduler) += attachments
```

## 5. Impacto nos vizinhos

- **#420**: pré-requisito (este BRIEF parte do código dele). Mergear antes.
- **Retorno manual e poll/webhook**: o mesmo `applyResult`, então os dois ganham a pendência.
- **Cancelamento (`markCancelled`)**: lê `doc.sourceDocumentId`. Com pendência ainda aberta o valor é null,
  e isso é o F-PA-5.
- **FE**: fora de escopo. Uma contagem de pendências FAILED na ficha seria um FE-INCR separado.

## 6. Sessão de execução recomendada

`sessao-feature`, um PR: modelo + repo + serviço + backfill + testes. Pré-condições: #420 mergeado e autorização de
execução do dono.

## 7. Forks — F-PA-1..8 RATIFICADOS 2026-09-28

### F-PA-1 — onde ficam os bytes da pendência
- (a) Coluna `Bytes` na própria pendência, dentro da tx: atômico, sem arquivo órfão. Os bytes são zerados no DONE.
  É a primeira coluna `Bytes` do schema.
- (b) Arquivo no disco (`storage.saveFile`, caminho determinístico por documento) gravado ANTES da tx, com a
  pendência guardando só o `storageKey`. Reusa o storage, mas deixa arquivo órfão quando a tx recusa (o mesmo
  padrão que o `upload` já tem), e a varredura precisaria de coleta de lixo.

**Recomendação: (a).** ✅ **RATIFICADO (a).** XML de NFS-e tem dezenas de KB e a DANFSe centenas de KB (inferido, sem medição). O SQLite
aguenta, e a atomicidade é justamente o que o GAP pede.

### F-PA-2 — quem drena
- (a) O mesmo tick do `DfePollScheduler`, depois do `pollPendingOnce`.
- (b) Um scheduler próprio (clone mínimo, como o `DfePollScheduler` já é do `AccountingSyncScheduler`).

**Recomendação: (a).** ✅ **RATIFICADO (a).** É a mesma frente (DF-e), com o mesmo lock e o mesmo intervalo. Um clone só se justifica
se o intervalo precisar ser diferente.

### F-PA-3 — idempotência da retentativa
- (a) Progresso por passo na pendência (`xmlAttachmentId` / `pdfAttachmentId` / `sourceDocumentId` gravados a
  cada passo).
- (b) Deduplicar no `upload` por (alvo, `sha256`). Muda um serviço compartilhado com os anexos de lançamento.

**Recomendação: (a).** ✅ **RATIFICADO (a).** O diff fica no dono do problema. A janela que sobra (upload commitou e a gravação do id
falhou) gera no máximo um anexo duplicado, nunca uma perda, e é esse o caso que o teste do item 10 morde.

### F-PA-4 — manter a tentativa inline
- (a) Sim: o caminho feliz continua síncrono (a ficha já mostra os anexos na resposta) e a varredura é só a rede.
- (b) Não: tudo vai pela varredura (até 2 min de atraso para o anexo aparecer).

**Recomendação: (a).** ✅ **RATIFICADO (a).**

### F-PA-5 — documento cancelado antes da pendência drenar
- (a) Anexa o XML como evidência (a nota existiu), **não** cria proveniência, marca DISCARDED.
- (b) Descarta tudo (DISCARDED, bytes zerados).
- (c) Anexa XML e proveniência e a aposenta em seguida (o que o #420 faz hoje quando o cancelamento cai entre as
  duas escritas).

**Recomendação: (a).** Guardar o XML da nota que existiu parece o correto, mas **a obrigação legal de guarda é
inferida** (ver §8). A proveniência de nota cancelada não entra no razão.

✅ **RATIFICADO (c)**, fora da recomendação: o mesmo comportamento do #420 para o cancelamento entre as duas
escritas. Um caminho só para os dois casos, e a trilha fica explícita (criada → aposentada, com
`entry.source_retired`).

### F-PA-6 — teto, backoff e retenção
- (a) Teto de 10 tentativas, backoff exponencial de 2 min até 1 h, FAILED + `logger.error`; bytes zerados só no
  DONE/DISCARDED (FAILED guarda os bytes para reprocesso manual).
- (b) Sem teto (retenta para sempre a cada tick).

**Recomendação: (a).** ✅ **RATIFICADO (a).**

### F-PA-7 — documentos autorizados antes deste incremento sem anexo
- (a) Sem backfill (não há nota real emitida: D5/M2 abertos). A migração é só criativa.
- (b) Backfill que reconsulta o parceiro. Não funciona no manual (sem XML).

**Recomendação: (a).** ✅ **RATIFICADO (b)**, fora da recomendação → item 11 do checklist. Hoje o backfill não
acha nada (não há nota real emitida), mas fica pronto para quando houver. Os limites (manual e retorno sem XML
viram skip nomeado) estão no item 11. Onde roda: F-PA-8.

### F-PA-8 — onde roda o backfill (nasce do F-PA-7 b)
- (a) CLI de disparo único, no padrão do `accountingSyncReconcileCli.ts`: roda quando o dono mandar e imprime o
  resumo (criadas / skip manual / sem XML).
- (b) Automático: a varredura do F-PA-2 procura os candidatos a cada tick.
- (c) Automático, mas só uma vez no boot do scheduler.

**Recomendação: (a).** A reconsulta chama a API do parceiro (custo/quota, inferido), e o conjunto de candidatos só
existe por causa do passado (documentos de antes deste incremento). Rodar em todo tick consulta o parceiro de novo
para cada documento manual ou sem XML que nunca vai resolver.

✅ **RATIFICADO (b)**, fora da recomendação: automático em todo tick, sem ação manual. O custo de reconsulta
repetida está declarado no item 11.

## 8. Pendente de validação externa

- **Guarda do XML de NFS-e cancelada:** existe obrigação de manter o arquivo, e por quanto tempo (o prazo
  decadencial de 5 anos do CTN é a hipótese)? Com o F-PA-5 = (c) o XML é guardado de qualquer jeito, então a
  pergunta deixou de decidir fork. Só vale para uma política de retenção futura (fora deste item).

## 9. Insumos ausentes

- Tamanho real de XML e DANFSe de NFS-e nacional (sem amostra real, D5). Serviria para calibrar o F-PA-1 (a).

## 10. Achados fora de escopo (não planejados; frente nova exige autorização)

- `DocumentAttachmentService.upload` não deduplica por (alvo, `sha256`): vale também para anexos de lançamento.
- O lock do `DfePollScheduler` é process-local (já declarado no arquivo): com múltiplas réplicas, duas varreduras
  drenariam a mesma pendência. O F-PA-3 (a) limita o dano a um anexo duplicado.

### Autoverificação de envio (OPS-001)

1. Objetivo: o XML do retorno manual não se perde depois da autorização. §2 + item 3 respondem.
2. Graus marcados em §1; o que é inferido está dito (fato 7, tamanhos, obrigação legal).
3. Caso adversarial tentado: "a varredura retenta e duplica o anexo". Achado: o `upload` não é idempotente →
   virou o F-PA-3 e o teste do item 10.
4. Checagem que teria falhado: o teste "retentativa não duplica anexo" (item 10) falha sem o F-PA-3 (a).
5. As duas primeiras linhas do resumo dão o objetivo e o risco principal.
