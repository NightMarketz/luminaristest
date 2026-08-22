# Parecer do Arquiteto Contábil-Chefe — ADR-P1 (A Prensa)

> **INSUMO DE PLANEJAMENTO (dossiê/parecer técnico)** — não é BRIEF nem ADR; forks pendentes de
> ratificação humana (ORCH-006). Gerado por agente em 2026-08-21.

**Objeto:** `docs/adr/ADR-P1-binding-press.md` (PRE-ADR, Draft).
**Método:** leitura direta dos 5 mappers + `IAccountingEventMapper.ts` + `revenueSplit.ts` +
`AccountingSyncPort.ts` + `CrmReceivableBridge.ts` + `SalonSaleReversalBridge.ts` +
`PostingService.ts` (trechos citados) + `PostingDto.ts` + `dimensionTagging.ts` +
`docs/accounting/ACCOUNTING-MASTER-MAP.md` §1/§4 + `docs/ROADMAP-PLATAFORMA.md` Parte B +
`.claude/skills/_ARCHITECTURE-CONTRACT.md` §2.1. Todo claim de código abaixo carrega citação
`arquivo:linha` verificada por leitura real nesta sessão — nenhuma é de memória.

---

## 0. Achado que muda a moldura do parecer

O PRE-ADR (§2, linha 51-53) descreve **duas classes de arquétipo** no corpus: (1) evento →
lançamento balanceado, (2) evento → comando de subrazão. A leitura do código mostra uma
**terceira classe, não listada, que é exatamente o mecanismo T5 que o parecer foi pedido para
verificar**:

- `SalonSaleReversalBridge.ts:11-19` — um `Cancelled` aciona `PostingService.reverseEntry`
  **diretamente**, não um mapper. `reverseEntry` (`PostingService.ts:408` em diante) busca o
  lançamento **original** por `lancamentoId`, espelha as legs já armazenadas com débito/crédito
  trocados e marca o original `Reversed` — **não constrói um `PostEntryInput` a partir de campos
  operacionais**. Não há "slot" a preencher: a única entrada é "qual lançamento reverter".
- O PRE-ADR rotula `SalonSaleReturnedMapper` como **"Estorno de origem (T5: lançamento novo,
  nunca edição)"** (linha 40 do PRE-ADR). Isso está **incorreto**: `SalonSaleReturnedMapper.ts:6-16`
  implementa **devolução** — uma entrada de contra-receita nova (D 3.2 / C 1.1.2) que **coexiste**
  com a receita original, não a reverte. O próprio comentário do arquivo distingue os dois
  (`SalonSaleReturnedMapper.ts:11-16`: "This is NOT a reversal... A cancellation, by contrast,
  reverses the finalized entry outright").

**Consequência:** o verdadeiro arquétipo T5 (`reversão-por-espelho`) está **fora do catálogo de 5
mappers e fora da prova de saída do §7** (o golden test byte-idêntico só cobre os 5 mappers
listados) — porque ele nem passa pelo intérprete hoje, é uma chamada direta a `reverseEntry`. Isso
não invalida o PRE-ADR, mas muda o que "cobertura do corpus" significa: **o P1 não toca T5**
(bom — é o núcleo imutável, §8), mas o ADR final precisa dizer isso explicitamente e corrigir a
legenda do §2, ou um leitor futuro vai achar que o intérprete já cobre estorno-por-espelho quando
não cobre.

---

## (a) Invariantes contábeis que o ADR final deve ADICIONAR

### A1 — T5 real é fora de escopo do intérprete; o ADR deve travar isso por escrito
Ver §0. O intérprete/binding do P1 nunca deve ser estendido para "re-modelar" cancelamento como um
novo `PostEntryInput` — faria o binding decidir COMO espelhar legs de um lançamento existente
(lógica, não dado), e duplicaria a idempotência dupla que `reverseEntry` já resolve
(`original.reversedById` + `@@unique` em `sourceType='reversal'`, `PostingService.ts` linhas
420-436 aprox. — verificado no trecho lido). **Emenda:** §8 (Não-objetivos) deve incluir
explicitamente "não toca `SalonSaleReversalBridge`/`reverseEntry`" ao lado de "não toca
`PostingService`".

### A2 — Duas formas de fronteira de dinheiro, não uma (F-P1-4 assume uma só)
`SalonSaleFinalizedMapper.ts:31-47`, `SalonSaleSettledMapper.ts:51-67`,
`SalonSaleReturnedMapper.ts:31-47` e `SalonPackageSoldMapper.ts:27-43` fazem **conversão
float→cents** (`Math.round(amount*100)` com guards `Number.isFinite`/`Number.isSafeInteger`).
`SalonSaleCogsMapper.ts:36-51` recebe **cents já computados** (`event.costCents`, populado por
`InventoryService.recordSaleCogs`, per `AccountingSyncPort.ts:60-65`) e **não faz conversão
nenhuma** — só valida `Number.isSafeInteger` + teto `MAX_CENTS` (`money.ts:14`). São duas *jobs*
distintas na fronteira: **converter** vs **apenas validar um inteiro que já chegou pronto**. O
teto (`MAX_CENTS`) em si já é centralizado e não muda com o P1 —
`PostingService.postEntry` (`PostingService.ts:177-194`, comentário "CENTS CHOKE-POINT GUARD…
the single point ALL write paths cross") é a autoridade final para TODO caller, mapper ou bridge,
independente da forma de guard que cada mapper individual faz a montante. Isso é uma boa notícia
(o P1 herda essa autoridade de graça, sem tocá-la) — mas o ADR final precisa travar que **o
binding schema (F-P1-2) carrega, por slot, qual das duas jobs se aplica** (`floatReais` vs
`centsAlready`), senão um vertical novo com um subledger que já entrega cents prontos (o
equivalente do CMV) seria double-convertido pelo intérprete se ele assumir "todo campo monetário é
float reais" por padrão.

### A3 — Dimensões (INCR-DIM) não têm slot no corpus e podem travar o intérprete em runtime
`PostingDto.ts:64` — toda linha de `PostEntryInput` aceita `dimensions?: string[]` opcional.
`PostingDto.ts:217` (comentário do schema de conta) — `requiresDimension`: quando `true`, **toda
leg a essa conta deve carregar ≥1 tag de dimensão**, gate reforçado por `resolveLineDimensions`
(`dimensionTagging.ts:28-52`, chamado por `postEntry` ANTES do balanceamento, conforme o
comentário do próprio arquivo). **Nenhum dos 5 mappers lidos preenche `dimensions` em nenhuma
linha.** Se o binding de um vertical novo resolver papel→conta para uma conta com
`requiresDimension:true` (plausível — dimensão é a etiqueta ortogonal de centro de
custo/projeto, e um vertical novo pode exigi-la por desenho), o intérprete fixo **falha em
runtime** porque não existe onde carregar a tag no binding hoje. **Emenda necessária:** ou (i) o
schema do binding ganha um slot de dimensão por linha, ou (ii) o validador determinístico
(F-P1-6) rejeita, na compilação, qualquer binding cujo papel resolva para conta
`requiresDimension:true` até o schema crescer. Nenhuma das duas está no PRE-ADR hoje.

### A4 — T6 (gate in-tx) não muda de lugar, mas "simulação na geração" não é dispensa permanente
O gate de período (`assertPeriodOpen`, preflight + autoritativo in-tx, `PostingService.ts:171`)
e o gate de conta (`ensureChartOfAccounts`/resolução leaf, mesma função) continuam sendo
reavaliados a **cada evento em runtime**, current e futuro — isso é bom e o P1 não precisa mexer
para preservar. Mas F-P1-6(b) propõe "compila 1 lançamento sintético e roda contra `postEntry` em
dry-run" **na geração** (tempo T0) como prova de qualidade do binding. O ADR final deve dizer
explicitamente: essa simulação nunca substitui T6 (a autoridade em runtime continua sendo o gate
dentro da tx, sempre) — e nomear **todos** os gatilhos de recompilação por drift pós-geração
(conta arquivada — já citado em F-P1-5(a) — MAS também: conta perde `acceptsEntries`, conta passa
a exigir `requiresDimension`, período do binding nunca mais reabre). F-P1-5(a) cita só o primeiro
caso; o ADR final precisa generalizar a lista.

### A5 — T7 (idempotência) exige que o binding NUNCA derive sourceType/sourceId
Todo mapper devolve `sourceType: event.sourceType, sourceId: event.sourceId` inalterados (ex.:
`SalonSaleFinalizedMapper.ts:57-58`) — são os dois eixos do `@@unique([userId,unitId,sourceType,
sourceId])` de `JournalEntry` que fecha T7. Isso funciona porque o mapper é **passthrough** nesses
dois campos. O ADR final deve travar como invariante do binding: **o intérprete repassa
sourceType/sourceId do evento literalmente, nunca os deriva/concatena a partir de campos
operacionais do binding** — um binding compilado por IA que "montasse um id lógico" a partir de
múltiplos campos quebraria a idempotência live×reconcile sem nenhum erro visível até a primeira
corrida dupla.

### A6 — T8 (auditoria) — o intérprete não decide o que audita
Os 5 mappers não decidem allowlist de audit (isso é `AuditService`, fora do escopo lido). Mas a
classe "comando de subrazão" (F-P1-1(b)) TEM lógica própria de classificação
(`CrmReceivableBridge.isAlreadyBooked`, `CrmReceivableBridge.ts:210-222`) que decide o que é
"já contabilizado" vs "retentável" — uma decisão de negócio real, em código, hoje. Se F-P1-1(b)
entrar em escopo, o ADR final deve travar que o binding **não pode introduzir um novo branch de
classificação de auditoria/idempotência** — herda o allowlist e a lógica de classificação do
serviço de subrazão de destino (`ReceivableService`/`PayableService`), nunca reinventa uma nova a
partir do dado do binding.

---

## (b) Colisões com §1 (travadas) e §4 (rejeitadas), fork a fork

| Fork | Colide com decisão travada/rejeitada? | Análise |
|---|---|---|
| **F-P1-1** (escopo do corpus: (a) só postEntry-direto · (b) + subrazão) | **(b) tem risco real de colidir com §4** (Motor de Regras rejeitado) | `CrmReceivableBridge` não é "evento → PostEntryInput" — é 3 guards de idempotência em CÓDIGO (`legacy` / `isAlreadyBooked` classificando linhas vivas × tombstone-com-ator × tombstone-sem-ator / `convergeTwins` para corrida). Achatar essa classificação em "binding = dado" reabriria exatamente o padrão que §4 rejeitou ("quem valida?" vira "o dado decide", sem versionamento de decisão). **(a) não colide** — replica o padrão já provado dos 5 mappers 1:1. |
| **F-P1-2** (forma do binding: (a) JSON no preset · (b) tabela Prisma · (c) disco) | **Nenhuma colide com T3 diretamente**, mas (b) precisa de dono explícito | T3 diz contabilidade é Prisma first-class — mas o BINDING não é uma entidade contábil, é config de geração. Se (b) for escolhida, o ADR final deve nomear o módulo dono do schema Prisma (`features/interview`/preset, **nunca** `features/accounting` — senão viola o invariante 6 do próprio PRE-ADR, "nunca em `features/accounting`"). O PRE-ADR não erra a recomendação (a), só não fecha essa amarração para (b)/(c) como alternativa. |
| **F-P1-3** (cutover do salão: (a) swap em prod · (b) mantém mappers manuais até P2) | **Nenhuma colide diretamente** — T10 (bridge pós-commit explícita) é preservado em ambas, o ponto de entrada (`AccountingSyncPort.sync`) não muda | (a) tem risco de **produto**, não de arquitetura: troca o código que gera lançamentos reais de um vertical já em produção por um caminho não provado por um segundo vertical (viola o espírito do §9 — Parte A + PVA verde é pré-condição de ENTRADA da fase, e um swap prematuro é a mesma aposta que a pré-condição tenta evitar). |
| **F-P1-4** (fronteira de dinheiro: (a) no intérprete · (b) no binding) | **(b) colidiria com T4** (dinheiro = invariante, não decisão de setor) | Ver A2 acima — a "fronteira" tem duas jobs, mas ambas devem ficar em código (a), nunca em dado — T4 é claro. (b) permitiria que um vertical mal-configurado alterasse a REGRA de conversão (não só o valor), o que é exatamente o tipo de decisão que T4 fixa como invariante, não como parâmetro. |
| **F-P1-5** (papel→conta: (a) accountCode literal na compilação · (b) papel resolvido em runtime) | **(b) tem tensão real com o invariante 5** (zero branch de negócio no intérprete) | Os 5 mappers hoje já fazem exatamente (a) — hardcodam `accountCode` literal (`SalonSaleFinalizedMapper.ts:22`, `SalonSaleSettledMapper.ts:27,30`, etc.) e o `postEntry` resolve o código para uma conta viva a CADA chamada (`ensureChartOfAccounts`/lookup por code, dentro do gate T6) — então T6 fica intacto independente da opção. A tensão é outra: resolver papel→conta **por tenant** em runtime (b) é, por definição, uma decisão condicional ("se este tenant, esta conta") — o PRE-ADR chama isso de "lookup, não branch", mas a fronteira entre os dois é a distinção que sustenta o invariante 5 inteiro. O PRE-ADR já recomenda (a) por este motivo exato, mas não escreve a razão — o ADR final deveria. |
| **F-P1-6** (validador: (a) estrutural · (b) + simulação dry-run) | **(b), como escrito, colide com §8** (não-objetivo: não toca `PostingService`) | Ver (c) abaixo — achado extenso, não é colisão de invariante travado, é contradição interna do próprio PRE-ADR. |

Nenhum fork colide com T1/T2/T9/T11/T12 (SQLite, `AccountingScope`, BRL-only, single-process,
governança) — o P1 não toca essas superfícies em nenhuma opção lida.

---

## (c) Riscos por opção — F-P1-1..6 (o que cada opção quebra, sem recomendar além do PRE-ADR)

**F-P1-1**
- (a) só postEntry-direto: quebra nada adicional; mas deixa `CrmReceivableBridge` (subledger
  command) definitivamente fora do intérprete v1 — se um vertical novo (P2) tiver um fluxo
  "venda a prazo" tipo CRM, ele continua exigindo um bridge escrito à mão, não uma
  geração-por-preset, e a prova de saída do P2 ("nenhum diff no motor/ledger/intérprete") fica
  sob risco se esse vertical precisar de AR.
- (b) + subrazão: ver §0 e (b) acima — risco de reabrir §4 se a classificação de idempotência do
  `CrmReceivableBridge` for tratada como "dado" em vez de "código do arquétipo". O PRE-ADR já
  recomenda (a) citando esse mesmo risco ("a classe 2 tem semântica própria").

**F-P1-2**
- (a) JSON no preset: quebra nada identificado; amarra o binding ao ciclo de vida do `SystemPreset`
  (bom para versionamento junto, ruim se o preset precisar mudar de forma por outro motivo e
  arrastar o binding).
- (b) tabela Prisma própria: exige query/audit sobre bindings de graça, mas precisa do dono do
  schema explícito (ver b acima) — sem isso, risco de acabar em `features/accounting` por
  conveniência de quem implementa, violando o invariante 6.
- (c) artefato em disco: nenhuma vantagem identificada sobre (a)/(b) nos documentos lidos — não
  aparenta suportar re-versionamento por tenant tão bem quanto (a).

**F-P1-3**
- (a) swap em produção: quebra a garantia implícita de §9 (Parte A + PVA verde antes de
  implementação) se o swap acontecer antes do vertical 2 provar a prensa — o golden test
  byte-idêntico reduz mas não elimina esse risco (prova só a saída sintética, não o comportamento
  sob dado real de produção).
- (b) mantém mappers manuais até P2: sem risco adicional identificado — é reversível por
  desenho, como o PRE-ADR já nota.

**F-P1-4**
- (a) no intérprete (código): preserva T4; exige que o intérprete acomode as DUAS jobs distintas
  descritas em A2 (conversão vs pass-through) — se só uma for migrada, a outra fica órfã (nem no
  mapper antigo, nem no intérprete novo).
- (b) no binding (dado): risco direto com T4 (ver tabela (b) acima) — a regra de conversão
  viraria configurável por vertical, o que T4 não permite.

**F-P1-5**
- (a) literal na compilação: determinismo máximo, mas herda a obrigação de recompilar sempre que
  a conta bound mudar de estado relevante — A4 lista os gatilhos que o PRE-ADR ainda não
  enumerou por completo (só cita arquivamento).
- (b) papel resolvido em runtime: risco de erosão do invariante 5 (ver tabela acima) — cada
  resolução papel→conta por tenant é, na prática, um `if` que o intérprete "fixo" passaria a
  conter, mesmo que disfarçado de lookup.

**F-P1-6**
- (a) estrutural apenas: mais barato, mas não exercita o caminho real — não pega, por exemplo,
  um binding que resolve para conta com `requiresDimension:true` sem slot de dimensão (A3), porque
  isso só falharia em runtime real, não numa checagem estrutural de existência/folha/natureza.
- (b) + simulação dry-run: **`postEntry` não tem modo dry-run hoje** (busca por `dryRun`/`dry-run`
  no diretório `server/src/features/accounting` não encontrou nenhuma ocorrência de produção — só
  um teste de DTO não relacionado) e **não pode ser chamado dentro de uma tx externa que depois
  reverte**, porque ele abre a própria tx raiz (`AccountingSyncPort.ts:12` — "postEntry opens its
  own root tx; SQLite can't nest"). Simular "de verdade" contra `postEntry` exige uma de três
  coisas, nenhuma gratuita: (i) adicionar um parâmetro `dryRun` a `postEntry` — toca o núcleo
  imutável, contradiz §8 ("Não toca `PostingService`…"); (ii) commitar-e-reverter um lançamento
  real sob um tenant de teste — polui `entryNumber` gapless, a cadeia de hash do audit e a chave
  de idempotência real; (iii) reimplementar a validação de `postEntry` (balanceamento, gate de
  conta, ceiling) num validador paralelo — risco de drift entre o validador e a autoridade real
  (o validador aprova um binding que `postEntry` rejeitaria, ou vice-versa). **Esta é uma
  contradição interna do PRE-ADR, não só um risco de opção**: F-P1-6(b) recomenda algo que §8
  proíbe, a menos que o ADR final escolha e nomeie explicitamente qual das três formas usa.

---

## (d) Lacunas do PRE-ADR — o que falta decidir e nem foi listado

1. **T5 real (reversão-por-espelho) está fora do catálogo e da prova de saída** — ver §0/A1. Não
   é um fork novo (o PRE-ADR está certo em não tocar `reverseEntry`), mas falta a frase explícita
   no §8 e a correção da legenda do §2.
2. **Slot de dimensão (INCR-DIM) não existe no schema do binding proposto** — ver A3. Sem isso, o
   golden test do §7 passa (nenhum dos 5 mappers usa dimensão hoje) mas o P2 (segundo vertical)
   pode falhar em runtime se precisar de dimensão obrigatória — e a prova de saída do P2
   ("nenhum diff no motor/ledger/intérprete") ficaria sob pressão de precisar mexer no intérprete
   depois de tudo.
3. **A forma exata da simulação de F-P1-6(b) não está especificada e, como escrita, contradiz
   §8** — ver (c) acima. Isto precisa de decisão explícita antes de ratificar F-P1-6, não só
   "(b) recomendado".
4. **Duas jobs de fronteira de dinheiro (conversão vs pass-through) não estão nomeadas** — ver A2.
   O binding schema (F-P1-2) precisa de um discriminador por slot monetário, e isso não está no
   PRE-ADR.
5. **Nenhuma menção a `SourceDocument`/proveniência (INCR-8) no binding.** Os mappers lidos não
   populam `sourceDocument` (`PostingDto.ts:31-38`) — mas um vertical com NF-e de origem (P4) vai
   precisar. Não é bloqueador do P1 (nenhum dos 5 mappers usa hoje), mas o schema do binding
   deveria pelo menos reservar o slot para não fechar a porta, no mesmo espírito do invariante 7.
6. **Papel→conta (F-P1-5) não diz o que acontece se o preset gerar um evento para um papel sem
   conta mapeada no chart do tenant** — falha na compilação (bom, F-P1-5(a) implica isso) ou
   silenciosamente cai num default? O PRE-ADR não escreve o comportamento de erro.
7. **Quem escreve os arquétipos-em-código do catálogo v1 (§3 item 1)?** O PRE-ADR fala em
   "extraído do corpus" mas não diz se é literal cópia dos 5 mappers reformatados para o padrão
   arquétipo+slot, ou reescrita. Isso afeta diretamente se o golden test do §7 é trivial (mesma
   lógica, outra casca) ou um risco de reintroduzir bug na reescrita.

---

## (e) Veredito

**Apto para ratificação, com emendas.** A arquitetura central (arquétipos em código + binding
como dado versionado + intérprete fixo sem branch de negócio) está corretamente oposta ao motor de
regras rejeitado em §4, e a reconciliação do §5 do PRE-ADR é sólida para as duas classes que ele
lista. Não encontrei nenhuma colisão fatal com T1-T12 nas seis opções recomendadas pelo próprio
PRE-ADR (a-em-todo-fork, exceto onde a tabela (b) aponta risco em (b)/(b)/(b) das opções não
recomendadas).

**Emendas que o ADR final (pós-ratificação) deve incorporar antes de virar BRIEF:**
1. Corrigir a legenda do §2 (`SalonSaleReturnedMapper` = devolução, não estorno T5) e declarar
   `SalonSaleReversalBridge`/`reverseEntry` fora de escopo no §8 (A1).
2. Nomear as duas jobs de fronteira de dinheiro (conversão vs pass-through) e decidir o
   discriminador no schema do binding (A2).
3. Decidir o slot de dimensão (ou o bloqueio explícito no validador) antes do P2 precisar dele
   (A3).
4. Generalizar a lista de gatilhos de recompilação além de "conta arquivada" (A4).
5. Travar por escrito que sourceType/sourceId são passthrough puro, nunca derivados (A5).
6. Especificar exatamente qual mecanismo de dry-run F-P1-6(b) usa — ou rebaixar para F-P1-6(a) até
   essa decisão existir, porque como está escrito colide com §8 (item (c)/(d)-3).

Nenhuma emenda exige reabrir um fork como decidido — todas são adições ao texto final, não
mudanças de recomendação. A ratificação fork-a-fork (ORCH-006) segue pendente do dono em todos os
seis forks, como o PRE-ADR já assinala.

---

## Próximo passo

Ratificação fork-a-fork pelo dono (F-P1-1..6), incorporando as 6 emendas acima ao texto que vira
ADR Accepted — antes de qualquer BRIEF via sessão de planejamento.
