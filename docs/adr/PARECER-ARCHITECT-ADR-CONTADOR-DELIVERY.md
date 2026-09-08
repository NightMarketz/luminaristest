> **INSUMO DE PLANEJAMENTO (parecer de domínio)** — não é BRIEF nem ADR; não ratifica fork nenhum
> (ACC-002/ACC-003) nem promove o status "Proposed" do ADR sob parecer. Enriquece a decisão do dono.
> Gerado por `luminaris-accounting-architect` em 2026-09-07, rodada 9 do plano SDD sequencial.

# Parecer do luminaris-accounting-architect sobre o ADR-CONTADOR-DELIVERY

Persona: `luminaris-accounting-architect`. Todo claim de código foi verificado por leitura real
(`Read`/`Grep`) nesta sessão; grau declarado em cada afirmação (verificado / inferido / assumido).
Nenhuma implementação existe ainda para este ADR — **zero arquivo de `AccountingDeliveryService`/
`AccountingContact`/`AccountingDeliveryLog` no repo** (verificado: `grep -rn "AccountingDeliveryService\|AccountingDeliveryLog" server/src` não casa nada). Logo, todo achado abaixo é sobre o **texto** do ADR, não sobre um diff a rejeitar.

---

## 0. Sumário executivo (as duas primeiras linhas que carregam a verdade e o risco)

**O ADR está bem ancorado no Contrato §2.1 (Prisma first-class, D1-D6 corretos) e não reabre nenhuma
torre rejeitada — mas garante "confirmação de envio" (D6) sem garantir "dado final" (nenhum gate de
período), e isso é exatamente a lacuna que a promessa de F-Z0 ("pronto para assinar") não pode ter.**
O risco principal, verificado por evidência de código, é que o pacote pode ser montado e enviado com
o período contábil ainda **`OPEN`** ou **`SOFT_CLOSED`** — nada no ADR barra isso — e o arquivo ECD já
gerado (D3 do `ADR-INCR-SPED-ECD`, verificado) nomeia um signatário J930 que **nunca é cruzado** contra
o `AccountingContact` para quem o pacote é de fato endereçado.

---

## 1. Invariantes de domínio — o que o ADR garante e o que não garante

### [ACC-CD-1 — NOVO, GAP] Pacote "pronto para assinar" sem gate de período fechado

- **Modo de falha concreto:** operador dispara `confirmDelivery` (ou o comando equivalente) para um
  período `OPEN`/`SOFT_CLOSED`; o contador recebe "pronto para assinar"; entre o envio e a assinatura,
  mais um lançamento posta naquele mesmo período (nada no sistema impede isso — período aberto é
  exatamente para isso); o número que o contador assina já não bate com o razão atual. Não existe hoje
  retificação (ver §2) para corrigir depois.
- **Evidência:**
  - `ADR-INCR-SPED-ECD.md` D7 (verificado, texto do próprio ADR mergeado): *"a geração é leitura...
    **NÃO** wire gate de status de período... travar geração por período aberto/fechado está **fora
    do MVP**"* — decisão deliberada para permitir "ECD-rascunho legítima" **antes** do fechamento.
    Isso é correto para geração-de-rascunho, mas o ADR-CONTADOR-DELIVERY **herda** esse read-only sem
    reabrir a pergunta "e para ENVIO FINAL, o gate deveria existir?".
  - `server/src/features/accounting/services/PeriodService.ts:53,85,117,149` (verificado): os quatro
    status reais são `OPEN`/`SOFT_CLOSED`/`HARD_CLOSED`/`FUTURE`; `HARD_CLOSED` é terminal (não
    reabre, `:149-159`) — é o único status que expressa "este período não muda mais".
  - `ADR-CONTADOR-DELIVERY.md` §1-§3 (D1-D6, F-CD1..F-CD6): busquei ativamente qualquer menção a
    `PeriodStatus`/`HARD_CLOSED`/período — **zero ocorrência como checagem de status** (`grep -in
    "period\|closed" docs/adr/ADR-CONTADOR-DELIVERY.md` retorna só uma linha, e é o nome de campo
    `period` do manifesto — nunca uma comparação contra `OPEN`/`SOFT_CLOSED`/`HARD_CLOSED`).
  - Lookup já existe para implementar isto sem código novo de leitura:
    `IAccountingPeriodRepository.findByYearMonth` (verificado,
    `server/src/features/accounting/repositories/IAccountingPeriodRepository.ts:8`).
- **Recomendação:** `confirmDelivery` (ou o `buildDeliveryPackage`, o mais cedo possível) deve
  ler o(s) período(s) cobertos pelo `EXPORT_SPED_ECD`/`EXPORT_SPED_ECF` de origem via
  `findByYearMonth` e **recusar** (ou exigir uma flag explícita `draft: true` que rotula o pacote como
  rascunho, nunca "pronto para assinar") quando o status não for `HARD_CLOSED`. Isto não é reabertura
  de D7 do outro ADR — D7 continua correto para **geração**; o gate novo é sobre **entrega para
  assinatura**, um comando diferente, com uma exigência de negócio diferente (F-Z0).
- **Custo de errar que o ADR subestima:** o próprio ADR já nomeia "retificação" no fork F-CD7
  **[correção pós-review 2026-09-07: a fonte é item 19 de `CEDULA-DECISAO-2026-09-03-modulos.md`
  §C.1, não o master map]** (⚫ 0 ocorrências — verificado abaixo). Sem o gate, o produto
  cria a necessidade de retificação (dado assinado que muda) antes de ter construído a feature que a
  resolve — um "buraco conhecido criando o próprio próximo buraco".

### [ACC-CD-2 — NOVO, GAP] Nenhuma reconciliação entre o signatário J930 e o `AccountingContact` destinatário

- **Modo de falha concreto:** o ECD/ECF já foi gerado com um signatário J930 (`codAssin='900'`,
  contador) digitado como **input transiente do DTO de geração** (nome/CPF daquele momento); depois,
  operacionalmente separado, o operador escolhe **qual `AccountingContact`** recebe o pacote. Nada no
  ADR impede que o pacote saia endereçado ao contador B enquanto o arquivo em si nomeia o contador A
  como signatário — um pacote "pronto para assinar" para a pessoa errada, ou uma inconsistência que só
  aparece quando o contador B abre o arquivo e vê outro nome no J930.
- **Evidência:**
  - `ADR-INCR-SPED-ECD.md` D3 (verificado): *"os campos de identificação... e os signatários do J930...
    entram como input do DTO de geração, por geração"* — explicitamente **nunca persistidos**, nunca
    ligados a um cadastro.
  - `server/src/features/accounting/dtos/SpedEcdDto.ts:64-112` (verificado): `SignerSchema` valida
    `codAssin`/`indRespLegal` só por **shape** (regex/enum), e o refine (`:107-112`) exige **pelo
    menos um** signatário com `codAssin==='900'` — mas não compara nome/CPF contra nenhum registro.
  - `ADR-CONTADOR-DELIVERY.md` D4 (verificado): `AccountingContact` nasce com `{scope, name, email,
    crc, deletedAt}` — um cadastro persistido, **paralelo e desconectado** do DTO transiente de geração.
  - Busquei ativamente qualquer menção cruzada nos dois ADRs (`grep -in "j930\|codAssin\|signer"
    docs/adr/ADR-CONTADOR-DELIVERY.md`) — **zero ocorrência**: o ADR sob parecer não cita J930 nem
    uma única vez.
- **Recomendação:** no mínimo, o comando de confirmação de envio deveria **exibir** ao operador o(s)
  nome(s)/CPF dos signatários `codAssin='900'` que constam no `.txt` já gerado, ao lado do
  `AccountingContact.name`/`crc` escolhido, como checagem humana explícita (paridade com o padrão de
  "evidência colada, nunca frase" do `RUNBOOK-FORMAT.md`) — bloqueio automático é desejável mas pode
  ficar em fork da `sessao-planejamento`; o **mínimo inegociável é a exibição lado a lado**, porque hoje
  nenhuma camada de código junta esses dois dados nunca.

### [ACC-CD-3 — NOVO, GAP] Hash do manifesto pode divergir do hash já auditado sem detecção

- **Modo de falha concreto:** o job `EXPORT_SPED_ECD` grava `sha256` no momento da geração e audita
  `sped.ecd_generated` com esse hash (`auditCanonical.ts:100`, verificado). Se o `AccountingDeliveryService`
  recalcular o SHA-256 do arquivo em disco no momento de montar o manifesto (em vez de **reusar**
  `job.sha256`), qualquer divergência entre o que foi auditado e o que está fisicamente em disco —
  gravação não-atômica, corrupção, ou (hipótese de ataque) substituição do arquivo — vira **silenciosa**:
  o manifesto "confere" com o arquivo errado, e o contador recebe um hash que nunca foi comparado contra
  o registro imutável de auditoria.
- **Evidência:** `ADR-CONTADOR-DELIVERY.md` F-CD6-a (verificado): *"é o mesmo padrão já usado em
  `AccountingDataExchangeJob.sha256`, zero custo extra (o hash já é calculado na geração)"* — a frase
  **sugere** reuso, mas não afirma como invariante testável que o manifesto deve **igualar-se** a
  `job.sha256` (vs. recalcular do arquivo). D2 (montagem do pacote) também não nomeia isso.
- **Recomendação:** gate de teste explícito — `buildDeliveryPackage` deve **ler `job.sha256` da tabela**
  (nunca recomputar do arquivo em disco) para o manifesto; se recomputar por algum motivo (ex.: garantir
  que o arquivo não mudou desde a geração), a comparação `computed === job.sha256` deve ser uma
  asserção que falha ruidosamente (não um log silencioso), porque é exatamente o tipo de defeito de
  omissão que a memória do projeto (`comentario-de-teste-afirma-o-que-nao-assere`) já viu passar batido.

### [ACC-CD-4 — GAP MENOR] Cross-tenant do `contactId` não é nomeado com o mesmo rigor do `jobId`

- **Modo de falha concreto:** `getArtifactForDownload`/`findJobById` já resolvem o job **pelo scope**
  (`DataExchangeExportService.ts:212-233`, verificado — cross-tenant vira `NotFoundError`, não
  `ForbiddenError`, padrão correto). O ADR nomeia esse padrão para o `jobId`, mas D4/D6 não afirmam
  explicitamente que a resolução de `AccountingContact` por `contactId` segue o **mesmo** padrão
  (`findContactById(scope, contactId)`, nunca `findContactById(contactId)` global).
- **Recomendação:** gate de teste espelhando o já existente: contato de outro `scope` referenciado num
  `confirmDelivery` → `NotFoundError`, nunca vazamento silencioso de nome/e-mail de outro tenant.

### [ACC-CD-5 — CONCORDO, sem gap] PII do contador na allowlist de auditoria (D5)

- O ADR já cita corretamente a memória `accounting-audit-allowlist-guards` e a trata como obrigação
  de **mesmo PR** (verificado por leitura do próprio texto, D5, e confirmado contra o padrão real em
  `auditCanonical.ts:49-53,79-83` — `supplierName`/`customerName`/`counterparty.name` já seguem
  exatamente essa disciplina). **Único refinamento a levar ao BRIEF:** o ADR não nomeia os `eventType`
  exatos (`delivery.sent`/`delivery.failed`/`delivery.confirmed`?) — a `sessao-planejamento` precisa
  fixá-los e escrever o teste-guarda **junto** da entrada na allowlist, não depois.

### [ACC-CD-6 — CONCORDO, reforça D3] "Nunca hard-delete um job referenciado" precisa ser FK, não prosa

- D3/F-CD4-a (verificado) nomeiam a regra em prosa: *"nunca hard-delete um job referenciado por um
  `AccountingDeliveryLog`"*. Confirmei por grep (`grep -rn "accountingDataExchangeJob.delete"
  server/src`) que **hoje não existe** nenhum caminho de hard-delete do job — a regra é vácua por
  enquanto, o que é bom, mas não é garantia. **Recomendação para o BRIEF:** `AccountingDeliveryLog.jobId`
  deveria ser uma **FK real com `onDelete: Restrict`** (não um scope-string solto como
  `Payable.supplierRef`/`Counterparty.ref`) — aqui a integridade referencial É o invariante (o ponteiro
  não pode morrer), diferente dos casos onde o plain-string é aceitável porque o alvo é dado de
  DynamicTable fora do domínio Prisma. Isso é o oposto do padrão "plain string, sem FK" que o resto do
  módulo usa para apontar para fora do ledger — aqui o alvo é dentro do próprio domínio contábil, então
  a FK é o desenho certo, não uma exceção.

---

## 2. Reconciliação com decisões já commitadas

| Decisão commitada | O que o ADR faz | Colide/extrapola? |
|---|---|---|
| **F-M4** — "envio de ECD/ECF por e-mail ao contador" ratificado | O ADR generaliza corretamente para "canal configurável" (F-CD1), não fixa e-mail como único caminho | **Não colide** — é fiel ao texto ("por e-mail"), e a generalização (a)/(b)/(c) é um refinamento razoável, não uma reabertura |
| **F-Z0** — "contador vira assinante, pacote pronto para assinar" | D2 (manifesto+hash) e D6 (confirmação explícita) cobrem parte da promessa; **§1 ACC-CD-1/ACC-CD-2** mostram que "pronto para assinar" ainda não tem gate de finalidade de dado nem de identidade do signatário | **Extrapola** — o ADR trata "confirmação explícita de envio" (um clique de operador) como se fosse suficiente para a garantia de F-Z0 ("pronto para assinar"), mas são dois invariantes distintos: *quem confirmou o envio* ≠ *o dado está fechado e o signatário bate*. F-Z0 também registra a si mesma como **"RATIFICADA SOB PREMISSA NÃO TESTADA"** (`CEDULA-DECISAO-2026-09-03-modulos.md:41`, verificado) — o próprio ADR já reflete essa cautela no cabeçalho (condicionado ao item 0), o que é correto; o parecer só adiciona que, **mesmo se** o contador responder "sim, assino", os dois gates de ACC-CD-1/2 continuam necessários para a premissa se sustentar na prática |
| **Item 10, PNCT (FECHADO por fato)** — contador indicado recebe inconsistências | D4/§6 do ADR nomeiam corretamente `AccountingContact` como o mesmo cadastro reusável pela futura feature de PNCT (D7 do grafo) | **Não colide** — é o design correto de antecipar sem implementar (nenhum código de vigilância de intimação é criado aqui) |
| **LGPD (declarado no §4 do ADR)** | Base legal, minimização, retenção 5 anos, log sem conteúdo — todos verificados como consistentes com o padrão já usado (`supplierName`/`customerName` nunca em payload livre) | **Não colide**, mas §4 é autodeclarado como não revisado por advogado (o próprio ADR já nomeia isso em "Pendente de validação externa") — parecer concorda que isto não pode ser fechado pelo agente |

---

## 3. Forks — parecer fork-a-fork (nenhum ratificado; ACC-002/ACC-003)

| Fork | Concordo/discordo | Motivo contábil/legal | Custo de errar subestimado pelo ADR |
|---|---|---|---|
| **F-CD1** canal — (a) gerar+devolver ao dono enviar | **Concordo com (a)** | Zero credencial nova, zero dependência — correto para volume trimestral/anual | O ADR não distingue, no texto de D6, que sob (a) o status `SENT` do `AccountingDeliveryLog` vira **autodeclaração do operador** ("eu enviei"), não confirmação de entrega real. Recomendo que o BRIEF nomeie essa semântica explicitamente (`SENT` = "operador confirmou que despachou", não "servidor confirmou que chegou") para não confundir um leitor futuro do status |
| **F-CD2** confirmação — (a) operador único | **Concordo** | Espelha corretamente a SoD-off de `enforcesSegregationOfDuties` (owner===actor hoje, ACC-017 emenda F3) — mesma lógica, mesmo precedente já provado em produção | Nenhum subestimado — o ADR já cita o precedente certo |
| **F-CD3** conteúdo do pacote — (a) ECD+ECF+manifesto, sem PDF-resumo | **Concordo** | YAGNI correto; PDF é conveniência, não requisito de assinatura | Nenhum |
| **F-CD4** retenção — (a) manifesto+hash, sem cópia do `.txt` | **Concordo com a recomendação, mas condicionado** | Evita duplicar armazenamento e duplicar "onde está a verdade" — correto em princípio | O "guard-corpo" nomeado (nunca hard-delete job referenciado) precisa ser **FK real** (ver ACC-CD-6), não just um teste de comportamento — o ADR trata isso como implementação de teste, mas é uma decisão de **schema** que a `sessao-planejamento` tem de registrar explicitamente, senão a implementação por padrão usa string solta (o padrão dominante no resto do módulo) |
| **F-CD5** múltiplos contadores — (a) 1:N desde o início | **Concordo** | Baixo custo agora, evita migração depois; nenhuma decisão de negócio hoje exige 1:1 | Nenhum |
| **F-CD6** hash no corpo — (a) SHA-256 no manifesto/e-mail | **Concordo com a recomendação, mas ver ACC-CD-3** | Barato, reusa o hash já calculado — correto em espírito | O texto não afirma que o manifesto deve **ler** (não recalcular) `job.sha256` — ver ACC-CD-3 |

**Nota sobre "reuse vs bespoke" do `AccountingContact` (D4):** verifiquei o modelo `Counterparty`
existente (`schema.prisma:1111-1132`) como candidato a reuso antes de aceitar um model novo — ele tem
`type: SUPPLIER|CUSTOMER` (união fechada, sem CRC/email), é referenciado por `Payable`/`Receivable`
(posse ligada a AP/AR), e sua chave de dedupe é `nameNormalized`. O contador diverge em **shape**
(CRC é invariante regulatório de identidade profissional que `Counterparty` não modela) e em **posse**
(referenciado por um log de entrega, não por AP/AR) — os dois estágios do critério de reuso apontam
para **bespoke sancionado**. `D4` está correto; não é uma "ilha" evitável.

---

## 4. Gates de domínio que a futura implementação deve acender

1. **Período fechado antes de "pronto para assinar"** (ACC-CD-1): teste que gera pacote/confirma
   envio contra período `OPEN`/`SOFT_CLOSED` → bloqueado (ou marcado `draft`, nunca "pronto para
   assinar"); contra `HARD_CLOSED` → permitido.
2. **Signatário J930 exibido ao lado do destinatário** (ACC-CD-2): teste (ou pelo menos contrato de
   DTO de resposta) que o comando de confirmação retorna/expõe nome+CPF dos `codAssin='900'` do
   arquivo junto com `AccountingContact.name`/`crc` escolhido.
3. **Hash do manifesto == hash já auditado** (ACC-CD-3): teste que `buildDeliveryPackage` usa
   `job.sha256` (não recomputa silenciosamente); se recomputar, teste de divergência que falha.
4. **Cross-tenant do contato** (ACC-CD-4): teste espelhando o já existente para `jobId` — contato de
   outro scope → `NotFoundError`.
5. **FK real de `jobId`** (ACC-CD-6): teste de integridade — tentar apagar um `AccountingDataExchangeJob`
   referenciado por um `AccountingDeliveryLog` deve falhar (violação de FK), não silenciosamente
   suceder deixando um ponteiro morto.
6. **Idempotência de reenvio** (D3/F-CD4, já nomeado pelo ADR): teste concorrente — dois `confirmDelivery`
   simultâneos para o mesmo `(jobId, contactId, attemptGroup)` produzem **um** `SENT`, não dois, por
   `@@unique` real (mesma classe de `unique-de-idempotencia-x-soft-delete` — decidir aqui quem libera a
   chave em caso de `FAILED→QUEUED`).
7. **Allowlist de auditoria com teste-guarda no mesmo PR** (ACC-CD-5, já corretamente nomeado pelo ADR):
   teste que nenhum `eventType` de `delivery.*` carrega e-mail/nome do contador no payload.

---

## O que este parecer NÃO decide

- Não ratifica F-CD1..F-CD6 — são decisões do dono, só depois do item 0 do pedido ao contador responder
  (o próprio ADR já condiciona isso corretamente).
- Não decide se o gate de período (ACC-CD-1) exige `HARD_CLOSED` ou se `SOFT_CLOSED` basta — é uma
  recomendação de arquitetura, não uma ratificação; fica para a `sessao-planejamento` propor e o dono
  ratificar.
- Não decide biblioteca de e-mail nem canal (a)/(b)/(c) — o ADR já nomeia isso corretamente como fork
  aberto.
- Não valida a base legal de LGPD (§4) — pendência nomeada para advogado, não fechável por este parecer.
- Não resolve o item 0 do pedido ao contador — pré-condição de existência deste trilho inteiro,
  external ao agente.
- Não implementa nada — nenhum arquivo de código/model/teste foi criado ou editado nesta sessão.

## Gates de envio [OPS-001]

1. **Objetivo:** a frase que responde ao pedido é o Sumário Executivo (§0) — o ADR garante confirmação
   de envio mas não garante dado final nem identidade do signatário.
2. **Grau:** todo claim de código acima é **verificado** (Read/Grep executados nesta sessão); os únicos
   graus **inferido/assumido** aparecem explicitamente marcados (ex.: a leitura de F-CD1 sobre semântica
   de `SENT`, que é uma inferência sobre a intenção do texto, não um fato de código).
3. **Caso adversarial tentado:** procurei ativamente (a) qualquer gate de período já implícito que o
   ADR pudesse estar reusando por outro caminho — `grep -in "period\|closed" docs/adr/ADR-CONTADOR-DELIVERY.md`
   só acha a palavra `period` como **nome de campo do manifesto** (linha 82, "`scope`, `period`,
   `sha256`..."), nunca como checagem de status — confirma que não é um gate "escondido" que eu deixei
   de ver, é ausência real; (b) qualquer menção cruzada
   J930×AccountingContact nos dois ADRs — zero ocorrência nos dois arquivos; (c) qualquer path de
   hard-delete de `AccountingDataExchangeJob` que tornaria ACC-CD-6 urgente hoje — não existe nenhum,
   então o achado é preventivo (para o schema que ainda vai nascer), não uma correção de bug vivo.
4. **Checagem que teria falhado se eu estivesse errado:** se `ADR-INCR-SPED-ECD` D7 tivesse, de fato,
   um gate de período (contrariando minha leitura), o grep por `period` em `PostingService`/
   `SpedGenerationService` teria mostrado uma chamada a `PeriodService`/`IAccountingPeriodRepository`
   dentro do fluxo de geração SPED — não mostrou (verificado, D7 confirma isso em prosa também). Se o
   J930 já fosse validado contra algum cadastro, `grep -rn "codAssin\|J930" server/src/features/accounting`
   teria mostrado um segundo consumidor além de `SpedEcdDto.ts`/`lib/sped.ts` — não mostrou.
5. Estas duas primeiras linhas do §0 entregam a verdade (o ADR é solidamente ancorado) e o risco
   principal (pronto-para-assinar sem período fechado nem checagem de signatário).
