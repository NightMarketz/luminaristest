# ADR-CONTADOR-DELIVERY — Envio de ECD/ECF ao contador

- **Data:** 2026-09-07
- **Status:** **Proposed — forks RATIFICAÇÃO PENDENTE, condicionado à resposta do contador (item 0 do
  `PEDIDO-CONTADOR-2026-09-03.md`).** Nenhum código escrito. **Pré-condição de ratificação (não decisão
  do agente): se o contador responder "não assino" ao item 0** — *"você assina ECD e ECF geradas por
  um sistema que você não opera?"* — **F-Z0 reabre e este ADR sai do plano junto com o resto do trilho
  contábil que ela autorizou** (rodada 9 do `PLANO-SDD-SEQUENCIAL-2026-09-07.md`, decisão do dono, não
  do agente). Este documento pode ser escrito e revisado enquanto a resposta não chega — não pode ser
  ratificado fork-a-fork nem implementado antes dela.
- **Autores:** par `luminaris-orchestrator` + `luminaris-accounting-architect`.
- **Depende de:** nenhuma aresta de código aberta (nó **C6**, `ready` no
  `GRAFO-DEPENDENCIAS-2026-09-07.md`). Depende de **decisão externa**: item 0 do pedido ao contador
  (D1). Assume como já mergeado: INCR-6 (`AccountingDataExchangeJob` + `DataExchangeExportService`),
  ADR-INCR-SPED-ECD (`EXPORT_SPED_ECD`), ADR-INCR-SPED-ECF-FASE3 (`EXPORT_SPED_ECF`/`EXPORT_SPED_ECF_REAL`),
  ADR-INCR-APPROVAL (maker-checker — padrão de comando/CAS a espelhar, não a reusar diretamente),
  audit hash-chain (INCR-2) e o allowlist de PII fechado por evento (`accounting-audit-allowlist-guards`).
- **Nó do master map:** `ACCOUNTING-MASTER-MAP.md` §5 / cédula `CEDULA-DECISAO-2026-09-03-modulos.md`
  linha C6 do §E: *"**ADR-CONTADOR-DELIVERY**: envio de ECD/ECF por e-mail — canal, LGPD (dado contábil
  saindo do processo), confirmação explícita por envio"*. Fecha o item 16 da lista C.1 (contábil
  13/19 → 14/19 quando mergeado, conforme o plano).

## Autorização citável (ORCH-006)

1. **F-M4** (`CEDULA-DECISAO-2026-09-03-modulos.md`): *"Os 3 itens: tela de `verify-chain`, tela de
   `source-documents`, **envio de ECD/ECF por e-mail ao contador**"* — **SIM**, ratificado pelo dono
   ("a recomendação deixava o e-mail diferido").
2. **F-Z0**, consequência (3): *"o contador vira **assinante** — o pacote de saída é 'pronto para
   assinar', e o e-mail ao contador (C6) deixa de ser conveniência"*. Palavras do dono que abriram
   F-Z0: *"substituir completamente todo o processo manual de contabilidade e exportar para contador
   apenas assinar o trabalho pronto, e enviar até a ponta para API de emissão de nota fiscal."*
3. **Item 10 do §E, "FECHADO por fato"**: *"o compartilhamento com o contador é gancho legal do C6"*
   (PNCT 2026 — Ato Conjunto RFB/CGIBS nº 5/2026; contador indicado recebe as inconsistências).
4. **Plano SDD 2026-09-07, rodada 9**: gatilho *"escreve o ADR do envio ao contador"*, disparado pelo
   dono em 2026-09-07 dentro de *"Pode disparar o plano em multi agent sonnet até finalizar"*. O
   próprio plano registra a saída: *"se o contador responder 'não assino' ao item 0 do pedido (F-Z0
   reabre), a rodada 9 sai do plano"* — daí o Status acima carregar essa pré-condição no cabeçalho, não
   só em prosa.

## TLDR (2 linhas)

O envio ao contador é um **pacote (ECD/ECF + hash + manifesto) transportado por um canal configurável**,
registrado numa tabela de log de entrega própria (idempotente, reenviável) — nunca um e-mail disparado
direto do service de geração. Nenhuma decisão de biblioteca de e-mail, retenção do pacote enviado ou
múltiplos contadores por escopo está tomada: são forks abertos, cada um com opção recomendada e custo
de errar, para o dono ratificar quando a resposta do contador (item 0) chegar.

---

## 1. Evidência de código (CBM-001)

| Claim | Grau | Evidência |
|---|---|---|
| ECD/ECF hoje são geradas via `POST /api/accounting/sped/{ecd,ecf,ecf/real}/generate`, que cria um job em `AccountingDataExchangeJob` (kind `EXPORT_SPED_ECD`/`EXPORT_SPED_ECF`/`EXPORT_SPED_ECF_REAL`) e persiste o `.txt` em disco via `attachmentStorage`; o **download** é uma rota já existente e separada (`GET /data-exchange/jobs/:jobId/download`) | verificado | `server/src/controllers/spedController.ts:1-79`; `server/src/routes/accounting.ts:123`; `server/src/features/accounting/models/DataExchange.model.ts:14-32` (`EXPORT_KINDS`) |
| O download hoje é **pull humano autenticado**, não push: `getArtifactForDownload` re-checa `policy.canRead(scope)` e resolve o job **pelo `scope`** (`repo.findJobById(scope, id)`) — job de outro `userId`/`unitId` não é encontrado (`NotFoundError`, não `ForbiddenError` — cross-tenant correto) | verificado | `server/src/features/accounting/services/DataExchangeExportService.ts:212-233` |
| `kind`/`direction`/`status` de `AccountingDataExchangeJob` são `String` puros (união vive só no DTO/model) ⇒ um novo `kind` (ex. `EXPORT_SPED_ECD_DELIVERED` ou um evento de auditoria próprio) **não exige migração** neste model | verificado | `server/prisma/schema.prisma:588-624` (campos do job, sem enum de banco) |
| **Nenhuma biblioteca de e-mail no repo** — `grep -rli "nodemailer\|sendgrid\|resend\|smtp\|mailgun" server/src` e `server/package.json` retornam vazio; a única ocorrência de "mail" em código de produção é `email` como *campo* (login, CRM, DTOs), não infraestrutura de envio | verificado | grep executado nesta sessão sobre `server/package.json` + `server/src/**/*.ts` |
| Existe **precedente de HTTP outbound opcional e configurável por env**: `ALERT_WEBHOOK_URL` (fire-and-forget, timeout 3s, nunca `await`ado no call site, falha vira `logger.warn`, nunca propaga) já dispara para os três `FAILED` de export SPED/data-exchange | verificado | `server/src/lib/alertWebhook.ts:1-60`; `server/.env.example` (`ALERT_WEBHOOK_URL=`) |
| `.env.example` só guarda **URLs/flags opcionais** para integrações externas (`ALERT_WEBHOOK_URL`, `OPENAI_API_KEY`), nunca credencial de terceiro embutida em model/tabela | verificado | `server/.env.example:1-13` |
| Não existe model `Accountant`/`DeliveryLog`/entidade de destinatário — `grep -n "model Accountant\|model DeliveryLog" server/prisma/schema.prisma` não casa nada | verificado | grep sobre `server/prisma/schema.prisma` |
| `SourceDocument`/`JournalEntrySource` (INCR-8, proveniência) são o mecanismo canônico para "documento de origem ligado a um lançamento" — mas modelam origem de **entrada** no ledger (`sourceType: crm.opportunity.won \| sale.* \| IMPORT_*`), não saída/entrega de um export; `DocumentAttachment` é anexo a `JournalEntry`, não ao job de export | verificado | `server/prisma/schema.prisma:761-800` (`SourceDocument`), `:566-586` (`DocumentAttachment`, FK obrigatória a `JournalEntry`) |
| O allowlist de auditoria (`auditCanonical.ts`) é fechado por `eventType`: só chaves listadas sobrevivem à sanitização; PII (nome/e-mail de terceiro) já foi tratada como classe proibida em eventos existentes (`supplierName`/`customerName` nunca entram no payload) | verificado | `server/src/features/accounting/audit/auditCanonical.ts:8-46,116-125` |
| Padrão de comando + CAS (`createDraft`/`submit`/`approve`/`reject`, nunca `PATCH status`) já existe para um fluxo de confirmação humana sobre um artefato contábil sensível (maker-checker) | verificado | `docs/adr/ADR-INCR-APPROVAL-maker-checker.md` §3 (ciclo de vida por comando), mergeado PR #108 |
| Memória do projeto: **campo PII novo na allowlist de auditoria exige teste-guarda no MESMO PR** — nenhuma allowlist genérica foi aceita antes | verificado (memória) | `accounting-audit-allowlist-guards` (PR #255/#258, denylist genérica rejeitada 2×) |

**Tradução do doc/decisão aspiracional → realidade do projeto:** não há torre `Workspace →
LegalEntity → Establishment`; o destinatário (contador) é modelado **por `AccountingScope`**
(`ownerUserId`+`unitId`), igual a toda outra entidade contábil — nunca uma tabela de "empresa cliente".

---

## 2. O que este ADR decide vs. o que fica em fork

### Decidido (não-fork — decorre direto da evidência acima)

- **D1 — O pacote nunca é montado dentro do `DynamicTableService`/motor de plugins nem dentro do
  `SpedGenerationService`/`SpedEcfGenerationService`.** Um serviço de integração dedicado
  (`AccountingDeliveryService`, Prisma first-class) orquestra: chama os geradores SPED existentes (ou
  lê um job `EXPORTED` já produzido), monta o pacote, registra o envio. Isto é a fronteira do Contrato
  §2.1: entrega ao contador é *aplicação*, não o motor de geração.
- **D2 — O pacote é sempre {ECD.txt, ECF.txt, manifesto, hash}, nunca e-mail direto do arquivo bruto
  sem manifesto.** O manifesto (JSON simples: `scope`, `period`, `sha256` de cada arquivo, `generatedAt`,
  `jobIds` de origem) é o que torna o pacote auditável e o que o contador pode conferir contra o que
  recebeu.
- **D3 — O registro de envio é uma tabela própria, não um novo `kind` sobrecarregando
  `AccountingDataExchangeJob`.** O job de export já tem semântica fechada (geração de arquivo); "enviei
  isto ao contador X, em Y, com este status" é um evento de **entrega**, com seu próprio ciclo
  (`QUEUED → SENT → FAILED`, reenvio), não mais um `kind` de `direction=EXPORT`. Nome de trabalho:
  `AccountingDeliveryLog`. **Descartado:** reusar `AccountingDataExchangeJob.kind='DELIVER_TO_ACCOUNTANT'`
  — colidiria com o campo `status` que já significa "estado da geração", forçando um segundo eixo de
  estado na mesma coluna.
- **D4 — Identidade do destinatário é Prisma first-class com soft-delete, não DynamicTable.** Um
  contador tem CRC (invariante regulatório de identidade profissional) e é referenciado por um log de
  entrega auditável — mesma classe de `Account`/`JournalEntry`, não um formulário configurável pelo
  usuário. Nome de trabalho: `AccountingContact` (ou `Accountant`) com `{ scope, name, email, crc,
  deletedAt }`.
- **D5 — O e-mail do contador é PII e entra na allowlist de auditoria com o MESMO cuidado que
  `supplierName`/`customerName`** — nunca em payload de evento livre; qualquer evento de auditoria
  sobre entrega audita `deliveryId`/`status`/`sha256`/contagem, nunca o endereço em si. Isso é a
  aplicação direta da memória `accounting-audit-allowlist-guards`: **o campo PII novo (e-mail do
  contador) exige teste-guarda no MESMO PR** que o introduz na allowlist — não depois.
- **D6 — Confirmação explícita por envio é obrigatória** (F-M4 pede isso nominalmente: "confirmação
  explícita por envio"). O comando de disparo não é implícito num job de geração — é um comando
  próprio (`confirmDelivery`/`sendToAccountant`), no padrão de comando do maker-checker (ACC-016: nunca
  `PATCH status` genérico). **O que fica em fork é SE esse comando exige um segundo ator (maker-checker
  real) ou só uma confirmação de UI de um único operador** — ver F-CD2.

### Fora de escopo deste ADR (nomeado, não esquecido)

- Assinatura digital do pacote com certificado — é hash de integridade (SHA-256), não assinatura
  ICP-Brasil; a assinatura da ECD/ECF em si continua sendo ato do contador no PVA/e-CAC (fora do
  sistema).
- Vigilância de intimações do PNCT (D7 do grafo) — nomeada como obrigação humana futura, não código
  deste incremento.
- Envio automático agendado (cron) — o MVP é sempre disparado por comando humano.

---

## 3. Forks (decisão do dono — ratificar fork-a-fork, só depois do item 0 responder)

**F-CD1 — Canal de envio:**
- **(a) Recomendado — "gerar e devolver ao dono enviar" (zero-dependência).** O comando produz o
  pacote + manifesto num artefato baixável (reusa a rota de download já existente do job, ou um novo
  endpoint de pacote) e o dono/operador o anexa manualmente num e-mail do próprio cliente de e-mail.
  Custo de errar baixo: nenhuma credencial de terceiro no sistema, nenhuma dependência nova, mas o
  "envio" nunca é 100% dentro do produto — não fecha sozinho a promessa de F-Z0 ("enviar até a ponta").
- **(b) SMTP configurável por env** (`SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASS`/`SMTP_FROM`,
  mesmo padrão de `ALERT_WEBHOOK_URL` — só env, nunca no banco). Exige escolher e adicionar uma lib
  (`nodemailer` é o candidato óbvio pela adoção, mas **é uma dependência nova — decisão de biblioteca é
  ela própria um fork**, não uma escolha automática deste ADR). Custo de errar: credencial de SMTP mal
  configurada vira e-mail não entregue silenciosamente se o log de falha não for forte (ver D6/F-CD3).
- **(c) Provedor de API transacional (SendGrid/Resend/SES)** — mais confiável para deliverability, mas
  introduz uma dependência de serviço externo (custo, mais uma credencial, mais uma allowlist de saída)
  para um volume de envio que é baixíssimo (1 contador, poucos envios por ano/trimestre). Provavelmente
  over-engineering para o volume real, mas fica nomeado.
- **Recomendação do par:** (a) primeiro (desbloqueia F-Z0 sem nova dependência nem credencial), com (b)
  como upgrade natural se o dono quiser envio 100% dentro do produto.

**F-CD2 — Confirmação por envio, quem confirma:**
- **(a) Recomendado — confirmação de um único operador** (o dono/quem opera o sistema clica "confirmar
  envio", igual a um `submit` sem `approve` de outro ator). Reflete a realidade de uma operação
  pequena (mesma pessoa gera, revisa e envia). Custo de errar: nenhuma segregação de funções sobre um
  dado que sai do processo — se dois operadores existirem no futuro, isso é gap silencioso.
- **(b) Maker-checker real** (quem gera não pode ser quem confirma o envio), espelhando
  `ADR-INCR-APPROVAL` (SoD dinâmica, hard só quando `ownerUserId≠actorUserId`). Mais forte, mas builda
  em cima de uma torre que hoje só existe para `JournalEntry`, não para entrega — exigiria estender o
  padrão, não reusar código.
- **Recomendação do par:** (a), pela mesma razão que o maker-checker adotou SoD dinâmica (owner===actor
  hoje) — (b) fica pronto para ativar quando `enforcesSegregationOfDuties` virar `true` para o resto do
  sistema, não antes, isoladamente, aqui.

**F-CD3 — O que vai no pacote:**
- **(a) Recomendado — ECD.txt + ECF.txt (os artefatos já gerados) + manifesto JSON com hash/período/
  scope.** Não inclui razão/balancete em separado (o contador já teria pedido isso via H1/validação
  profissional, item fora deste pedido).
- (b) Incluir também um PDF-resumo (balancete/DRE) para leitura humana rápida antes de abrir o PVA —
  valor de conveniência, custo de gerar mais um artefato e mantê-lo sincronizado com o `.txt`.
- **Recomendação do par:** (a) — o manifesto já é a superfície de conferência; (b) é feature separada
  se o contador pedir.

**F-CD4 — Retenção/persistência do pacote enviado:**
- **(a) Recomendado — persistir só o manifesto + hash + metadados de entrega no `AccountingDeliveryLog`,
  não o `.txt` duplicado** (o `.txt` original já vive no `storageKey` do job de geração; o log de
  entrega referencia o `jobId`, não copia o arquivo). Evita duplicar armazenamento e evita um segundo
  lugar onde o conteúdo contábil pode divergir do original.
  **Trade-off aceito nomeado:** se o job de geração original for apagado/sobrescrito, o log de entrega
  vira um ponteiro morto — precisa de uma política de retenção do job de export tão longa quanto a do
  log de entrega (mínimo: nunca hard-delete um job referenciado por um `AccountingDeliveryLog`).
- (b) Persistir uma cópia imutável do pacote no momento do envio (novo `storageKey` próprio do log de
  entrega). Mais seguro contra o job original mudar/sumir, mas duplica armazenamento e duplica a
  superfície de "onde está a verdade do que foi enviado".
- **Recomendação do par:** (a) com o guarda-corpo de retenção nomeado — reuso sem duplicação, mas o
  guarda-corpo tem de ser um teste (job referenciado por delivery log não pode ser hard-deleted), não
  só prosa.

**F-CD5 — Múltiplos contadores por `AccountingScope`:**
- **(a) Recomendado — 1:N desde o início** (`AccountingContact` tem FK para `scope`, não o inverso;
  nada impede duas linhas). Custo de modelar 1:N no MVP é baixo (é só não impor `@@unique` de scope) e
  evita uma migração de "virar 1:N depois" quando o cliente tiver contador + auxiliar.
- (b) 1:1 rígido (`@@unique` em scope) — mais simples de validar, mas modela uma realidade que o texto
  do próprio pedido ao contador já não assume (só "o contador" no singular, mas nada garante que seja
  sempre uma pessoa).
- **Recomendação do par:** (a) — custo de fazer 1:N agora é menor que o custo de migrar depois.

**F-CD6 — Assinatura/hash do pacote no corpo do e-mail (ou canal (a)):**
- **(a) Recomendado — SHA-256 de cada arquivo no manifesto, e o texto do pedido/e-mail cita o hash
  explicitamente** ("confira que o hash do ECD.txt recebido é X") — dá ao contador um jeito barato de
  confirmar que o arquivo não foi alterado em trânsito, sem exigir infraestrutura de assinatura digital.
- (b) Sem hash no corpo — mais simples, mas perde a checagem de integridade barata.
- **Recomendação do par:** (a) — é o mesmo padrão já usado em `AccountingDataExchangeJob.sha256`, zero
  custo extra (o hash já é calculado na geração).

---

## 4. LGPD

- **Base legal:** execução de obrigação legal/contratual — a entrega ao contador responsável técnico
  é necessária para a escrituração ratificada em F-Z0 (Luminaris é a escrituração; o contador assina).
  Não é marketing nem finalidade secundária — precisa estar declarado no aviso de privacidade do
  produto (fora de código; nomeado como dependência de texto legal, não deste ADR).
- **Minimização:** o pacote contém **o mínimo necessário à assinatura** (ECD/ECF do período + manifesto
  — F-CD3-a), nunca "o razão inteiro" fora do que já compõe a própria ECD/ECF, nunca dados de outros
  tenants/scopes (a busca do job de origem é sempre por `scope`, igual ao download hoje).
- **Retenção:** o log de entrega guarda metadados (quando, para quem, hash, status) por prazo alinhado
  ao prazo de guarda fiscal (5 anos, mesmo horizonte de ECD/ECF); **o conteúdo do e-mail em si nunca é
  logado** — só o fato do envio e o hash do que foi enviado.
- **Log sem conteúdo:** o `AccountingDeliveryLog` grava `contactId` (FK, não e-mail em texto livre no
  log de auditoria), `jobIds`, `sha256`, `status`, `sentAt`/`failedAt`, `attemptCount` — nunca o corpo
  do e-mail nem o `.txt` duplicado (D3/F-CD4-a). O e-mail do contador em si vive só em
  `AccountingContact.email` (uma linha, soft-delete), nunca replicado no log.
- **PII do contador (e-mail, CRC) é dado do próprio processo de negócio** (ele é parte necessária da
  escrituração), diferente de PII de terceiro incidental (`supplierName`/`customerName`) — mas a regra
  de auditoria vale igual: **o e-mail nunca entra no payload allowlisted de um evento de auditoria
  livre**; ele mora no model, referenciado por id.

---

## 5. Segurança

- **Credenciais de canal nunca no banco em claro.** Qualquer segredo de SMTP/provedor de API vive só em
  `process.env` (padrão já fixado por `JWT_SECRET`/`OPENAI_API_KEY`/`ALERT_WEBHOOK_URL` no
  `.env.example`) — nunca em `AccountingContact` nem em `AccountingDeliveryLog`.
- **Allowlist de domínio de destino** — o e-mail do contador é cadastro humano (D4), não um campo de
  formulário de terceiro não confiável; ainda assim, o comando de envio valida o formato do e-mail via
  Zod `.strict()` e, se o canal (b)/(c) for adotado, o remetente (`SMTP_FROM`) é fixo por env, nunca
  derivado de input do request — fecha a classe "endereço de destino/origem controlável por payload".
- **Rate limit** — o comando de confirmação de envio é humano e de baixíssimo volume (poucos por
  trimestre); um rate limit simples por scope (ex.: N envios/hora) é suficiente para não amplificar um
  bug de retry em loop, mas não é o mecanismo de segurança primário — o mecanismo primário é confirmação
  explícita (D6) + idempotência do log (abaixo).
- **Falha/retentativa:** o log de entrega é a fonte de verdade do estado; reenvio é um comando novo
  sobre um `AccountingDeliveryLog` existente (`FAILED → QUEUED` de novo), nunca uma segunda linha
  duplicada para o mesmo par (jobId, contactId, tentativa) — idempotência por `@@unique` real
  (`deliveryId` ou `(jobId, contactId, attemptGroup)`), não por scan em JS (AC-2.2-2 não se aplica aqui
  porque isto é Prisma first-class, não preset — mas o princípio de não confiar em check-de-app sem
  `@@unique` vale igual).

---

## 6. Gancho PNCT (nomeado, fora de escopo de implementação)

O item 10 do §E ("FECHADO por fato") registra que o PNCT 2026 (Ato Conjunto RFB/CGIBS nº 5/2026) torna
o contador indicado o receptor formal de inconsistências até 31/12/2026. Este ADR **não implementa**
vigilância de intimações — nomeia que o `AccountingContact` (D4) é o mesmo cadastro que, no futuro,
pode ser referenciado por uma feature de PNCT (D7 do grafo), evitando um segundo cadastro de contador
quando essa frente abrir.

---

## O que este ADR NÃO é

- **Não é a implementação.** Nenhum model, service, controller, rota, migração ou teste foi escrito.
- **Não é ratificação de fork.** As seis decisões da §3 continuam PENDENTES — o agente não escolhe
  entre elas.
- **Não é BRIEF.** O BRIEF (checklist + contratos Zod esboçados) só nasce depois da ratificação
  fork-a-fork, na `sessao-planejamento` seguinte.
- **Não decide biblioteca de e-mail.** Se F-CD1→(b)/(c) for escolhido, a lib (`nodemailer` ou
  provedor) é ela própria uma decisão a ratificar — nunca adicionada como dependência silenciosa.
- **Não reabre F-Z0.** Este ADR assume F-Z0 ratificado; se a resposta do contador (item 0) vier "não"
  ou "só lançamento a lançamento", este ADR fica sem base e sai do plano — não é o agente decretando
  isso, é a pré-condição de status no cabeçalho.

## Pendente de validação externa

- **Contador (item 0 do pedido):** se ele assina ECD/ECF que não operou, e o formato/canal que aceita
  para receber o pacote (e-mail simples? portal próprio dele? importação direta no sistema dele?) — a
  resposta pode invalidar F-CD1 inteiro, não só ajustá-lo.
- **Advogado/LGPD:** base legal declarada na §4 é razoável por leitura de código e do Ato PNCT, mas
  **não foi revisada por advogado** — nomeado como pendência, não fechado por este ADR.

## Próximo passo

1. **Parecer do arquiteto contábil** sobre este ADR (se algo aqui colide com invariante de domínio não
   coberto).
2. **Resposta do contador** ao item 0 do `PEDIDO-CONTADOR-2026-09-03.md` — condição de existência deste
   trilho.
3. **Ratificação fork-a-fork** (F-CD1..F-CD6) pelo dono, só depois do passo 2.
4. **BRIEF** (`sessao-planejamento`) com os contratos Zod (`AccountingContact`, `AccountingDeliveryLog`,
   comandos `registerContact`/`buildDeliveryPackage`/`confirmDelivery`/`retryDelivery`) — só então
   `sessao-feature` implementa.
