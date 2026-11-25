# BE-INCR-DFE-DENIED-SUBSTITUIVEL — BRIEF (nota denegada substituível; consulta que não repete para sempre)

> `sessao-planejamento`, 2026-11-25, base `631dd60fe` (main). Sem código de aplicação. **Nada aqui ratifica fork.**
> Nó: [`X10a`](../plano/nos/X10a.md) (adaptador SEFAZ da NF-e/NFC-e), emenda do #1358 (DENIED, integrado em #1378).
> Lacunas da caixa: `L-20261124-122232-4eaa`, `L-20261124-061534-db50`, `L-20261124-061534-4fb9`.
> Relacionada, **fora do escopo de código**: `L-20261124-211013-9b9d` (gate humano, PR #1391).

## 0. Autorização (citada, e o que ela cobre)

> [`D-2026-11-25-FORKS-DRENAGEM-DA-CAIXA`](../plano/decisoes/D-2026-11-25-FORKS-DRENAGEM-DA-CAIXA.md) (dono, chat,
> 2026-11-25, `AskUserQuestion`), linha "Nota DF-e DENEGADA (`4eaa`, `db50`, `9b9d`, `4fb9`)": **"Estrutural em etapas"**.
> "PR-0: `DENIED` terminal 'substituível' (libera o `saleKey` por rename, como no `CANCELLED`) e
> `SefazNfeEmissor.consultar` mapeia 101/151 e as rejeições da própria consulta (252, 226, 236, 526, 562, 561, 613)
> para estado terminal ou alerta, sem repetir para sempre. PR-1: reemissão com número novo pela rota existente. A
> premissa 'o número da denegada fica consumido' **continua gate humano** (`9b9d`, oráculo externo); o texto ao
> operador segue neutro."
> Mais: `D-2026-11-11-LACUNA-VAI-AO-MAESTRO` §2 e a emenda de 21/11 (2) — "BRIEF de grupo sem fork pode executar sem a
> ratificação". A cédula diz de si mesma: não é `executa` de PR nenhum; cada tema vira BRIEF.

**Cobre exatamente** o item (PR-0 + PR-1, as 3 lacunas). **Não cobre:** decidir o consumo do número (9b9d), inutilização
da denegada, tela (`my-app/`, nó vizinho `FE-INCR-DFE`), nem os temas irmãos da mesma cédula (cancelamento `CANCELLING`,
polling DF-e, re-drive) — cada um tem BRIEF próprio.
**Divergência a reportar (não bloqueia):** a cédula não diz *qual* estado terminal vale para 101/151 nem *qual* alerta
vale para as rejeições da consulta ("estado terminal **ou** alerta"); isso é F-DEN-1 e F-DEN-2 abaixo, e por isso este
BRIEF **tem fork pendente** — a `sessao-feature` não roda o PR-0 inteiro antes de o dono responder esses dois (o
bloco "DENIED substituível", itens 1–5, não depende deles e pode ir antes).

## 1. Insumos lidos (fatos consumados — arquivo:linha em `631dd60fe`)

| Fato | Onde |
|---|---|
| `DENIED` existe e é terminal; transições `SENT|PROCESSING|CONTINGENCY → DENIED` | `FiscalDocumentLifecycleService.ts:68-71`; `applyResult` ramo REJECTED\|DENIED `:1538-1565` |
| `saleKey` = `saleId` enquanto vivo; rename só no `CANCELLED` (`cancelled:<id>:<saleId>`) | `schema.prisma:2364,2422`; `FiscalDocumentLifecycleService.ts:994,1595` |
| Gate "uma nota viva por venda/kind" = `findLiveBySale` (`status != CANCELLED`) | `FiscalDocumentRepository.ts:46-51`; usos: `EmissionService.ts:871` (NFS-e), `:1125` (NF-e/NFC-e → faltante "documento vivo já existe…"); `SimplesRegistroCaixaService.ts:76` (filtra autorizadas depois) |
| `REENVIAVEIS = REJECTED, PENDING_SIGNATURE` (DENIED fora, de propósito) | `FiscalDocumentLifecycleService.ts:93,644` |
| `consultar` do SEFAZ: 100/150 → AUTHORIZED; 110/301/302 → DENIED; o resto vira `PROCESSING` com o cStat | `SefazNfeEmissor.ts:82,151,188-199` |
| O polling repete `SENT\|PROCESSING` com backoff e desiste no teto (`pollGaveUpAt`); erro "permanente" hoje é só `ZodError` | `FiscalDocumentRepository.ts:123-139`; `LifecycleService.ts:252-254,370-405` |
| 217 tem tratamento próprio (N consultas espaçadas → `REJECTED dfe_nao_recebida`) | `LifecycleService.ts:96-150,311-318` |
| Alerta de prazo da NFC-e de contingência lê `status IN (CONTINGENCY,SENT,PROCESSING,REJECTED,PENDING_SIGNATURE)` — **sem `DENIED`** | `FiscalDocumentRepository.ts:182-198`; consumo `NfceContingenciaService.ts:205-209,296-322` |
| `STATUS_QUE_OCUPAM_NUMERO` inclui `DENIED`; texto ao operador neutro; gate humano aberto | `inutilizacao.ts:23-26`; lacuna `9b9d` (PR #1391) |
| Pendências da view: `hasReplacement` só olha `CANCELLED` com irmão `≠ CANCELLED/REJECTED` | `EmissionService.ts:667-668` |

**Fontes de domínio (regra 3):**

- `[WS-CSTAT]`/ER08/ER09/§5.4.5, `TRANSCRICAO-MOC70-webservices-NFe-2026-10-29.md` l.355-357, 364-367, 645, 658: o retorno
  da consulta traz `protNFe` com cStat 100/150/110 (ER08) **ou** `retCancNFe` com cStat **101 "cancelado" / 151 "cancelado
  fora de prazo"** (ER09). **Grau V** (literal do MOC 7.0 VG).
- Regras J01 → 252, J02 → 226, J02a → 236, J02k → 526 "Consulta a uma Chave de Acesso muito antiga", J04 → 562, J05 → 561,
  J06 → 613 (l.366-367) e o limite de 180 dias da consulta (§5.4.3, l.360-362). **Grau V só para os códigos**; o
  **texto/semântica** de 252, 226, 236, 562, 561, 613 está no MOC Anexo I §4.4.1, **não transcrito** → ver §6.
- Denegada tem protocolo e "Gravar"; rejeitada "Não gravar" (§5.1.6, Tab. 5-4, l.~268-272). **Que o número da denegada
  fica consumido NÃO está nas fontes lidas** (o acervo `ctresb/leis` tem 0 resultados para "denegada") → premissa
  **ASSUMIDA**, gate humano `9b9d`. **Nada neste BRIEF depende de ela ser verdadeira ou falsa** (ver D-DEN-A abaixo).

## 2. Checklist numerado

> Cada item é testável sozinho. Teste escrito antes e vermelho pelo motivo certo (regra de `sessao-instrumentacao` vale
> dentro do PR). `jest <caminho> --selectProjects unit`; integração um arquivo por vez, `--runInBand`.

### PR-0 — `DENIED` substituível + consulta que termina

**Bloco A — `DENIED` terminal substituível (direto, sem fork):**

1. **Rename-on-denied.** Ao gravar `DENIED` em `applyResult` (mesma `repo.transition` da tx já existente, `:1544-1551`),
   gravar também `saleKey = denied:<id>:<saleId>`. O gate é o `whenStatusIn: guardaDoResultado(doc)` já existente (nada
   de segundo gate). Teste: doc `SENT` → resultado `DENIED` ⇒ `saleKey` renomeado, `numero`/`chaveOuCodigo`/`errorsJson`
   preservados; o mesmo vale vindo de `PROCESSING` e de `CONTINGENCY`.
2. **Unicidade liberada de verdade.** Teste de integração SQLite real: com a denegada renomeada, `createDocument` de uma
   nota nova com o mesmo `(userId, unitId, saleId→saleKey, kind, cTribNac)` **não** dá P2002. Antes do item 1, dá
   (vermelho pelo motivo certo).
3. **Número e protocolo não somem.** Teste: a denegada renomeada continua em `listNumbered` (`FiscalDocumentRepository.ts:304-321`)
   e em `STATUS_QUE_OCUPAM_NUMERO` — o rename não mexe na lacuna de inutilização (a premissa fica no `9b9d`).
4. **Prefixo único e documentado.** O formato `denied:<id>:<saleId>` entra no comentário de `IFiscalDocumentRepository.ts:131`
   e do schema (`:2364`), ao lado do `cancelled:`. Teste de guarda: nenhum código lê o prefixo `cancelled:` para decidir
   algo (varredura `grep` já feita: só escrita) — o teste afirma que `findBySaleKey` e `findLiveBySale` não dependem do
   prefixo.
5. **Linhas DENIED pré-existentes** (criadas entre #1358 e este PR, `saleKey = saleId`): ver F-DEN-4. Até ele ser decidido,
   o item 5 é **só o teste que prova o comportamento escolhido**.

**Bloco B — NFC-e de contingência denegada continua no alerta (direto no "continua", fork só no "até quando"):**

6. **`DENIED` entra em `listContingenciaNaoAutorizada`** (`FiscalDocumentRepository.ts:186`): adicionar `'DENIED'` à lista
   de status. Teste de repositório: NFC-e `tpEmis:9` em `DENIED` aparece; NF-e 55 `DENIED` não (filtro `kind: 'NFCE'`
   e `tpEmis:9` já existem).
7. **O alerta dispara para a `DENIED`.** `NfceContingenciaService.conferirPrazo` não filtra por status (`:296-322`): teste
   de `tick` com NFC-e `DENIED` de contingência vencida ⇒ `alertas` contém `{evento:'VENCIDA', documentId}` e o
   `logger.error` leva `status:'DENIED'`. O comentário "sem autorização" do alerta passa a dizer que a denegada **não**
   foi autorizada (o texto não afirma nada sobre o número).
8. **Saída do alerta** conforme F-DEN-3 (sem decisão, o alerta só sai pela janela `ALERTA_JANELA_MS`, como os demais).

**Bloco C — `consultar` não devolve `PROCESSING` para terminal (depende de F-DEN-1 e F-DEN-2):**

9. **cStat 101/151 na consulta.** `consultar` lê `retCancNFe` (ER09) e devolve o resultado do F-DEN-1. Teste:
   `retConsSitNFe` com `cStat 101` e com `151` (sem `protNFe`) ⇒ resultado terminal, **nunca** `PROCESSING`; com
   `protNFe` 100 **e** evento de cancelamento no mesmo retorno, vale o que a SEFAZ marcou em `cStat` do `retConsSitNFe`
   (o teste fixa a precedência: `cStat` do envelope = 101/151 vence; autorizada sem cancelamento segue AUTHORIZED).
10. **cStat 252/226/236/526/562/561/613 na consulta** ⇒ o desfecho do F-DEN-2 (alerta, **nunca** `REJECTED`, nunca
    `PROCESSING` eterno). Teste por código, mais um teste negativo: **217 continua** pelo caminho `naoRecebida`
    (`:311-318`) e 108/109/656 continuam `PROCESSING` (serviço indisponível não é terminal).
11. **Sem repetir para sempre.** Teste de `pollPendingOnce` com a consulta devolvendo 252 por N rodadas: o documento
    para de ser consultado pelo job na 1ª rodada (ou no teto, conforme F-DEN-2), `summary.gaveUp` conta e a consulta
    manual (`consultarUm`) segue valendo.
12. **Emissão síncrona não herda.** `emitir` (`:151`) não ganha mapeamento novo — só `consultar`. Teste prova que `emitir`
    com 101/252 continua `REJECTED`/o comportamento atual (o 101 não vem do `NFeAutorizacao`).

### PR-1 — reemissão com número novo pela rota existente (depende do PR-0 em `main`)

13. **O gate de nota viva ignora `DENIED`.** `findLiveBySale` passa a excluir `status IN (CANCELLED, DENIED)`
    (`FiscalDocumentRepository.ts:48`) — **a mudança está no repositório, não no serviço**, para os dois usos
    (`EmissionService.ts:871` e `:1125`) e o `SimplesRegistroCaixaService.ts:76` herdarem. Teste de integração: venda
    com NF-e `DENIED` ⇒ `POST /api/nfe/dfe/documents` (kind NFE) emite a nota nova, sem "documento vivo já existe".
14. **Número novo, de verdade.** A nota nova pega `nextNumber` da série/ambiente (nunca reaproveita o da denegada).
    Teste: `numero(nova) > numero(denegada)` e a denegada mantém o dela.
15. **Reenvio da denegada continua proibido.** `reenviar` com `DENIED` segue `reenvio_bloqueado` (testes já existem:
    `FiscalDocumentLifecycleService.denied.integration.test.ts:118`, `FiscalDocumentLifecycleService.test.ts:341`). Os
    **títulos desses testes e o comentário de `Lifecycle…:1539-1541`** dizem "o número foi consumido" — a premissa é gate
    humano (`9b9d`); reescrevê-los neutros (só texto, sem mudar assertion) entra neste PR por D-DEN-B.
16. **Pendência na view.** `attachPendencias` (`EmissionService.ts:652-700`) ganha `denegada_sem_substituta`: doc `DENIED`
    sem irmão do mesmo `kind`/`cTribNac` em `AUTHORIZED_STATUSES` ou `SENT/PROCESSING/CONTINGENCY` ⇒ pendência. Não é
    automática (item 30 do BRIEF original: "nada automático"). O rótulo i18n vai pt/en no mesmo PR (paridade).
17. **Reemissão da NFC-e de contingência denegada** respeita o prazo e o `tpEmis` da nova nota (a nova nota **não** herda
    `tpEmis:9` por ser substituta): teste de que a nova sai pelo caminho normal da unidade (contingência só se a unidade
    estiver em contingência).
18. **Sem rota nova.** Guarda: `docs.paths.ts`/`openapi.json` sem path novo (path-count igual) — o PR-1 usa só
    `POST /documents`. Se F-DEN-5 escolher rota explícita, este item vira o contrato dela.

## 3. Contratos esboçados

```ts
// DfeEmissorPort.ts — EmissaoResult hoje (status: 'AUTHORIZED'|'REJECTED'|'PROCESSING'|'DENIED').
// F-DEN-1 recomenda acrescentar UM status (o do fato do fisco), nunca overload de REJECTED:
export type EmissaoResult = {
  status: 'AUTHORIZED' | 'REJECTED' | 'PROCESSING' | 'DENIED' | 'CANCELLED_AT_FISCO'; // nome a ratificar (F-DEN-1)
  partnerRef: string;
  errors: { code: string; message: string }[]; // 101/151: o cStat em errors[0].code, igual ao DENIED
  // inalterados: numero, nNFSe, chaveOuCodigo, xml, dhProc, valores
};

// Erro de código próprio da consulta inválida (F-DEN-2 a): o job trata como PERMANENTE (isPermanentPollError).
class DfeConsultaInvalidaError extends AppError {
  constructor(readonly cStat: string, readonly xMotivo: string) { super(`dfe_consulta_invalida:${cStat}`, 422); }
}
// SefazNfeEmissor.consultar — tabela única (um sítio):
const CONSULTA_CANCELADA = new Set(['101', '151']);                        // [WS-CSTAT] ER09
const CONSULTA_INVALIDA  = new Set(['252','226','236','526','562','561','613']); // [WS-CSTAT] J01-J06 (códigos; texto no Anexo I)
```

```ts
// applyResult — o ramo DENIED ganha UMA linha (mesma transição, mesmo whenStatusIn):
await this.repo.transition(scope, doc.id, {
  status: result.status,                       // 'DENIED'
  errorsJson: JSON.stringify(result.errors),
  attemptResult,
  ...(denegada ? { saleKey: `denied:${doc.id}:${doc.saleId}` } : {}),   // item 1
  whenStatusIn: guardaDoResultado(doc),
}, tx);

// FiscalDocumentRepository.findLiveBySale — item 13:
where: { ..., status: { notIn: ['CANCELLED', 'DENIED'] }, ... }

// FiscalDocumentRepository.listContingenciaNaoAutorizada — item 6:
status: { in: ['CONTINGENCY', 'SENT', 'PROCESSING', 'REJECTED', 'PENDING_SIGNATURE', 'DENIED'] }
```

- **Sem coluna nova e sem migração de schema** no PR-0/PR-1 (o rename grava a coluna que já existe). Se F-DEN-4 escolher
  backfill por migração, entra uma migração de dado — S6 do smoke-gate reprova por desenho
  (`smoke-gate-s6-x-migracao-de-dado`); por isso a recomendação não é migrar.
- **DTO:** nenhum campo novo; só o valor `status` se F-DEN-1 acrescentar um (o enum de `FiscalDocumentDto.ts:34` e `:187`
  + `__dto-shapes__.json` à mão — o UPDATE do snapshot reordena todos os domínios no Windows — + tipos gerados do FE +
  rótulo/cor e i18n pt/en em `dfeLabels.ts`/`accounting.json`).
- **Auditoria:** reaproveita `dfe.denied` e `dfe.cancelled` (já na allowlist de `auditCanonical.ts`); **nenhum eventType
  novo** → sem mudança de allowlist. A consulta inválida é `logger.error` + `pollGaveUpAt`, não evento de auditoria.

## 4. Forks pendentes de ratificação — todos **RATIFICAÇÃO PENDENTE**

**F-DEN-1 — Estado da nota que a consulta acha já cancelada (cStat 101/151).** *A cédula diz "estado terminal ou
alerta"; não escolhe.* Evidência: ER09; `VALID_RESULT_TRANSITIONS` proíbe pendente→`CANCELLED` de propósito
(`LifecycleService.ts:61-66`: "isso só acontece via `cancelar()`"); a nota **nunca foi** `AUTHORIZED` no Luminaris (sem
`sourceDocumentId`, sem `authorizedAt`).
- (a) **Novo resultado terminal "cancelada no fisco"** → `applyResult` grava `CANCELLED`, `cancelEvento` marcador,
  `cancelledAt = dhProc` quando houver, **rename do `saleKey` pelo mesmo `markCancelled`**, auditoria `dfe.cancelled`;
  sem `retireSourceDocument` (não há proveniência). Libera a venda para nota nova. Muda a tabela de transições
  (o teste "mutation target" é atualizado de propósito).
- (b) Só alerta: fica `PROCESSING`/`SENT` + desiste do polling + pendência. Não toca a máquina de estados, mas a venda
  fica presa com `saleKey` ocupado e a nota "viva" no `findLiveBySale` — repete o `db50` para o cancelamento.
- (c) Dois passos `→ AUTHORIZED → CANCELLED` (reconstruir a autorização). Exige XML/protocolo que a consulta de uma
  cancelada não devolve; descartada.
- **Recomendação: (a)** — é o fato do fisco (padrão que a casa já usa em `e101101/e305101/e105104`, `:468`), simétrico ao
  `DENIED`, e não deixa a venda presa. Deixa aberto: o que fazer se a nota foi **autorizada e cancelada** fora do
  Luminaris já com receita contabilizada (o razão é da venda, não da nota; `markCancelled` "nunca toca venda nem razão").
  **RATIFICAÇÃO PENDENTE.**

**F-DEN-2 — Destino da consulta inválida (252, 226, 236, 526, 562, 561, 613).** *A cédula diz "alerta"; não diz onde
ele mora.* Esses códigos são erro da **consulta** (chave/ambiente/idade), "não é veredito sobre a nota" (lacuna `4fb9`);
`REJECTED` liberaria o reenvio de uma nota que pode estar autorizada.
- (a) `consultar` lança `DfeConsultaInvalidaError(cStat)`; `isPermanentPollError` passa a reconhecê-la ⇒ o job grava
  `pollGaveUpAt` **na 1ª ocorrência**, alerta (`summary.gaveUp`, `logger.error`) e para; documento segue
  `SENT/PROCESSING`; consulta manual e re-arme (BRIEF de polling) seguem valendo. Reusa o mecanismo da Onda 4/4.1; sem
  coluna nova.
- (b) Contar N ocorrências espaçadas antes de desistir (molde do 217). Mais complexo; esses códigos são determinísticos
  (chave/ambiente errados não "passam"), exceto 526 (idade) que também não melhora com o tempo.
- (c) Devolver `PROCESSING` com código e deixar o backoff comum (estado atual; é o defeito).
- **Recomendação: (a).** Deixa aberto: nada resolve a nota presa em `PROCESSING` — quem fecha é o operador (consulta
  manual/XML/verificar ambiente) ou o re-arme; o BRIEF de polling (`pollDeferredSince`/`pollGaveUpAt`/botão) é quem
  dá a saída. **Dependência de ordem:** este item e o PR-0 daquele BRIEF mexem em `LifecycleService.ts:370-420`;
  a sessão que chegar depois rebaseia, não duplica (ver Write-set). **RATIFICAÇÃO PENDENTE.**

**F-DEN-3 — Até quando a NFC-e de contingência denegada fica no alerta de prazo.** *A cédula diz "não pode sair do
alerta"; não diz quando sai.*
- (a) Sai quando existe irmão da mesma venda/kind em `AUTHORIZED_STATUSES` (a substituta foi autorizada); senão fica
  pela janela `ALERTA_JANELA_MS`.
- (b) Só pela janela (como as demais).
- (c) Fica até o operador marcar resolvida (estado novo) — descartada, estado sem comando.
- **Recomendação: (a):** o alerta serve para "ação humana"; autorizada a substituta, a ação foi feita. Custo: uma
  consulta a mais por doc no `tick` (`listBySale`). Deixa aberto: nota `DENIED` cuja substituta foi **rejeitada** segue
  alertando (certo). **RATIFICAÇÃO PENDENTE.**

**F-DEN-4 — Linhas `DENIED` que já existem com `saleKey = saleId`** (criadas entre o merge do #1358 e este PR; sem
cliente real até 2027, mas há dev/homologação).
- (a) **Auto-cura na emissão (PR-1):** em `emit`, se `findLiveBySale` não vê a denegada mas o insert bateria no
  `@@unique`, renomear a(s) `DENIED` com `saleKey = saleId` na mesma tx antes de criar (idempotente; só `DENIED`).
- (b) Migração de dado (`UPDATE … WHERE status='DENIED' AND saleKey=saleId`) — **S6 reprova** por desenho.
- (c) Nenhuma: documentar que `DENIED` pré-existente em dev se resolve a mão; a tabela de produção nasce em 2027.
- **Recomendação: (a)** se existir linha real em algum ambiente compartilhado; senão **(c)** com a evidência de
  `SELECT count(*) FROM fiscal_documents WHERE status='DENIED' AND saleKey NOT LIKE 'denied:%'` colada no PR
  (medição, não palpite — o BRIEF não mediu). **RATIFICAÇÃO PENDENTE.**

**F-DEN-5 — Reemissão: operador pede por que rota?** A cédula diz "pela rota existente". Interpretação adotada (itens
13-18): `POST /documents` com a venda (a mesma emissão), sem rota nova. Alternativa: `POST /documents/:id/reemitir`
(amarra a nova à denegada via vínculo, como `substitutesDocumentId` da NFS-e). **Recomendação: a rota existente** (é o
que a cédula diz; o vínculo denegada→substituta é derivável por `saleId`+`kind`). Marcado como fork **só** porque
"rota existente" tem 2 leituras (emit × reenviar) e a escolhida precisa ser a do dono. **RATIFICAÇÃO PENDENTE.**

### Decisões diretas (não são fork)

- **D-DEN-A.** A premissa "número da denegada fica consumido" **não é tocada**: o rename não altera
  `STATUS_QUE_OCUPAM_NUMERO` nem a lacuna de inutilização; se o dono decidir no `9b9d` que o número **volta**, a mudança é
  uma linha em `inutilizacao.ts:26` e **não desfaz** este BRIEF (reemitir com número novo vale nos dois casos — com
  número novo a premissa é irrelevante para o fluxo).
- **D-DEN-B.** Texto ao operador neutro (cédula): nenhuma mensagem nova diz "número consumido".
- **D-DEN-C.** `emitir` síncrono não muda (item 12).

## 5. Gates que o diff aciona (no checklist, não na improvisação)

- `tsc` limpo (server + my-app se o enum de status crescer); snapshot de shape do DTO **só** se F-DEN-1 acrescentar status
  (editar à mão); paridade i18n pt/en para `denegada_sem_substituta` e para o rótulo do novo status; guard de path-count
  do openapi (sem rota nova ⇒ igual); allowlist do `auditCanonical.ts` (sem eventType novo ⇒ igual).
- `check:arch`: mudanças em repositório e serviço existentes, sem dependência nova entre camadas.
- Classe de risco: **vermelha** (fiscal) — `node scripts/classe-risco.mjs pr <n>`; `revisor-independente` antes do lote
  do dono; não mergear.
- Cadeia de camadas: `consultar` (porta) → `applyResult` (serviço) → repositório; nada de Prisma no serviço; sem rota nova.

## 6. Pendente de validação externa (nunca entra no checklist como decidido)

1. **Consumo do número pela denegada** — `9b9d` (oráculo externo: contador/SEFAZ/MOC Anexo I). O BRIEF é neutro a ele.
2. **Semântica e texto de 252, 226, 236, 561, 562, 613** — MOC Anexo I §4.4.1 não transcrito; o BRIEF usa o **código** e a
   regra J0x (grau V) mas **não** afirma o motivo em texto ao operador (o `xMotivo` da SEFAZ vai cru em `errors[].message`).
3. **O que a SEFAZ de cada UF faz com 526 (chave > 180 dias)**: o MOC admite que a UF "poderá manter o modelo anterior"
   (nota 6, l.361-362). O tratamento (a) do F-DEN-2 vale; o texto de ajuda ao operador não.
4. **Cancelamento fora do Luminaris com receita já contabilizada** (F-DEN-1): ao contador.

## 7. Insumos ausentes

- MOC 7.0 Anexo I (tabela de cStat com texto) — não transcrito.
- Medição de linhas `DENIED` existentes (F-DEN-4) — exige o banco do ambiente; não varrido (regra 2).

## 8. Achados fora de escopo

- `L-20261125-110055-5f46` (classe `spec`, pai `4fb9`): o Anexo I §4.4.1 do MOC (texto de 252/226/236/561/562/613) não está
  transcrito — o BRIEF fica só com o código (§6 item 2). Nenhum outro achado.

## 9. Write-set (para a nota do nó e o paralelismo — PAR-002/005)

**PR-0** (edita): `server/src/features/accounting/services/FiscalDocumentLifecycleService.ts`,
`server/src/features/accounting/repositories/FiscalDocumentRepository.ts`,
`server/src/features/accounting/repositories/IFiscalDocumentRepository.ts` (comentário),
`server/src/features/accounting/dfe/sefaz/SefazNfeEmissor.ts`, `server/src/features/accounting/dfe/DfeEmissorPort.ts`
(só se F-DEN-1 acrescentar status), `server/prisma/schema.prisma` (**só comentário**, linha 2364 — sem migração),
`server/src/features/accounting/dtos/FiscalDocumentDto.ts` + `__dto-shapes__.json` + `my-app/types/contracts/accounting/FiscalDocumentDto.gen.ts`
+ `my-app/features/accounting/components/dfe/dfeLabels.ts` + `my-app/public/locales/{pt,en}/accounting.json`
(**só** se F-DEN-1 acrescentar status), testes `**/__tests__/*` das mesmas pastas.
**PR-1** (edita): `FiscalDocumentRepository.ts` (`findLiveBySale`), `FiscalDocumentEmissionService.ts` (`attachPendencias`,
auto-cura do F-DEN-4 a), `my-app/public/locales/{pt,en}/accounting.json`, testes.
**Choke points da PAR-001:** `schema.prisma` (comentário apenas — avisar o lote), nenhum de `factory.ts`/`docs.paths.ts`.
**Sobreposição com outros BRIEFs da mesma cédula:** `FiscalDocumentLifecycleService.ts:370-420` e `FiscalDocumentRepository.ts`
(polling Onda 4) — o BRIEF "polling DF-e" (`polling-df-e-colunas-pr`) toca as mesmas regiões; **PRs de sessões diferentes
não rodam em paralelo nesse arquivo** (um por vez, mesmo conjunto de arquivos).
> Gravar `write_set`/`registros` no frontmatter de `docs/plano/nos/X10a.md` é do fold (a nota é de um nó com autorização
> própria e `estado` é do fold; esta sessão não edita a nota).

## 10. Dependências e ordem

PR-0 → PR-1 (o PR-1 só faz sentido com o rename em `main`). PR-0 Bloco A+B pode ir sem esperar F-DEN-1/F-DEN-2; o Bloco C
espera as duas respostas. Nada aqui depende do `9b9d`.
