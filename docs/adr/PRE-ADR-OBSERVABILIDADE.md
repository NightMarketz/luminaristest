# PRE-ADR — Observabilidade do server (OBS)

> **Status: Accepted (forks ratificados), 23/10/2026.** Produzido pela **sessão de planejamento**, sem código
> de aplicação. **Os 10 forks F-OBS-0..9 foram RATIFICADOS em 23/10 pelo dono, todos pela recomendada**
> (chat: *"Pode ratificar tudo"*, em resposta à tabela das recomendações). Cédula:
> [`D-2026-10-23-OBSERVABILIDADE-FORKS`](../plano/decisoes/D-2026-10-23-OBSERVABILIDADE-FORKS.md). Nó:
> [`OBS`](../plano/nos/OBS.md). **Ratificar não é `executa`:** a Fase A espera o `executa` por PR, e a Fase B
> espera a Onda 0.
>
> **Autorização:** dono em chat, 23/10/2026: *"Planeja e mapeia se há uma forma de cobrir tudo, temos que
> ter um brief para não se perder depois"*. A frase responde à medição de cobertura de log feita na mesma
> conversa. Ela cobre **planejar e mapear**. Não cobre executar.
>
> **Divergência de forma (registrada, não reinterpretada):** o dono pediu "brief". Observabilidade só existe
> em `docs/plano/destino/` ([§14](../plano/destino/14-requisitos-nao-funcionais-do-estado-completo.md), linha "Observabilidade";
> [§19](../plano/destino/19-riscos-e-premissas.md), "App nunca implantado → Onda 0") e não tem nó em `docs/plano/nos/`. Pelo
> protocolo do vault (`docs/plano/README.md`: *"Proposta nova (item PROPOSTO do destino) só vira nota em
> `nos/` depois de PRE-ADR ratificado"*), o artefato certo é este PRE-ADR. Ele contém o que o BRIEF teria
> (mapa, checklist, contratos e forks). Depois da ratificação, o checklist do §5 vira BRIEF ou nó sem
> retrabalho.
>
> **Base:** `origin/main` = `c9e42dc1`, conferido com `git fetch` antes da leitura. Os `arquivo:linha` abaixo
> foram lidos nesta sessão, não citados de memória.
>
> **Escopo:** backend (`server/`). O FE fica em "Achados fora de escopo" (§10), seguindo a convenção
> `BE-INCR-*` ≠ `FE-INCR-*`.

## 1. A pergunta e a resposta curta

**Existe forma de cobrir tudo?** Sim, mas não arquivo por arquivo. A cobertura vem de **pontos de
estrangulamento**: toda ação do sistema passa por um de seis portões. Instrumentar os seis cobre o servidor
inteiro sem tocar nos ~700 arquivos de feature.

| Portão | Por onde passa | Arquivo(s) |
|---|---|---|
| P1 Requisição HTTP | toda leitura e escrita feita pela tela ou pela API | `middleware/httpTiming.ts` |
| P2 Erro de API | todo erro que vira resposta | `lib/apiUtils.ts` `handleApiError` + `app.ts:121` |
| P3 Processo | promessa rejeitada sem tratamento e exceção não capturada | `server.ts:171-179` |
| P4 Jobs agendados | os 6 schedulers em processo | `jobs/*Scheduler.ts` |
| P5 Integração externa | chamadas de saída (Mercado Pago, BCB PTAX, OpenAI, webhook de alerta) | clientes em `features/**` e `lib/**` |
| P6 Linha de log | toda chamada ao logger | `lib/logger.ts` `formatLog` |

**O que "tudo" não quer dizer:** colocar `logger.info` em cada service. **Evento de negócio** (quem lançou,
estornou ou emitiu o quê) já tem casa própria, a trilha de auditoria contábil gravada em tabela. Ela fica fora
deste PRE-ADR. Log operacional responde a outra pergunta: *o sistema está funcionando, e onde ele falhou?*
P1 já registra toda mutação como requisição, com rota, status e duração, e isso basta para a operação.

## 2. Fatos medidos (23/10/2026)

| # | Fato | Evidência |
|---|---|---|
| M1 | O logger é próprio, sem dependência. Escreve JSON no console e persiste **só `warn`/`error`** em `server/logs/errors-AAAA-MM-DD.ndjson`, com retenção de 14 dias e escrita síncrona. Fica desligado sob Jest. | `lib/logger.ts:11`, `:31-36`, `:99-119` (`formatLog`) |
| M2 | `logReplacer` serializa `Error` com nome, mensagem, stack e **todos os campos próprios enumeráveis**, sem filtro. | `lib/logger.ts` `logReplacer` |
| M3 | Há 460 chamadas `logger.*` fora de teste: debug 28, info 141, warn 144, error 138. Só ~10% dos arquivos de produção registram algo. Exemplos: contabilidade 33/350, dynamicTables 6/96, sectorKits 1/51; packages, legalParameters, fx, attachments e savedViews têm 0. | grep por diretório |
| M4 | **P2:** `handleApiError` faz `logger.error('[API Error Handler]', { error })` em **todo** erro, antes de classificar. Um 400 de validação, um 404 e um 500 saem no mesmo nível, e a linha **não leva rota, método, usuário nem tenant**. É usado em 76 arquivos. Nenhum controller tem catch fora dele. | `lib/apiUtils.ts:19-20`; varredura `*Controller.ts` |
| M5 | **P1:** `httpTimingMiddleware` mede toda resposta e registra método, `req.originalUrl` (**com query string**), status e duração. É `info` (só console) abaixo do limite e `warn` (persistido) acima. | `middleware/httpTiming.ts:19-31`, `lib/monitoring.ts` |
| M6 | Não existe ID de requisição nem `AsyncLocalStorage` no código. O `x-request-id` que aparece é só o da assinatura do Mercado Pago. | grep `AsyncLocalStorage`, `x-request-id` |
| M7 | **P3:** `unhandledRejection` registra e **não encerra o processo**. `uncaughtException` registra e desliga com exit 1. | `server.ts:171-179` |
| M8 | **P4:** os 6 schedulers recebem `log` por injeção (`deps.log ?? logger`) e registram `event:'failed'` no `runOnce`. **Só o `AccountingSyncScheduler` dispara alerta.** DFe, CollectionCharge, MpReleaseReport, LegalParamsRecalc e PTAX falham só no log. | `jobs/DfePollScheduler.ts:53,70-72`; `grep sendAlertWebhook jobs/` |
| M9 | O alerta remoto já existe: `sendAlertWebhook`, fire-and-forget, sem efeito se `ALERT_WEBHOOK_URL` não estiver definido, com 4 fontes (reconcile, SPED ECD, ECF e export de dados). | `lib/alertWebhook.ts` (BRIEF-W2-C, PR #239) |
| M10 | **P5:** os clientes de saída `MercadoPagoCollectionProvider`, `BcbPtaxClient` e `MpReleaseReportScheduler` não chamam o logger diretamente. O erro sobe ao chamador. Não achei cliente HTTP de SEFAZ/ADN no grep `fetch(`/`axios`/`https.request` (inferido: a emissão ainda não faz chamada direta). | grep de clientes |
| M11 | Há 50 `console.error/warn` fora de teste. A maioria está em CLIs (`jobs/*Cli.ts`) e `scripts/`, onde é legítimo. **Fora disso:** `middleware/auth.ts:150,169,178` (401/403 com rota), `lib/jwt.ts:65`, `lib/prisma.ts:28`, `features/dynamicTables/utils/RelationUtils.ts:12,21,33,42`, `config/env.ts:43`. Nenhum deles chega ao arquivo persistido. | grep |
| M12 | `app.set('trust proxy', 1)` já está definido, com um proxy na frente. Ele tem teste. | `app.ts:28`; `fixAuthContaLote4.integration.test.ts:75` |
| M13 | O ESLint do server tem escopo mínimo: só as regras de camada, sem `no-console`. A CI roda `npm run lint`. | `server/eslint.config.mjs:4-10`; `ci.yml:62` |
| M14 | O logger, o monitoring e o alertWebhook têm teste. | `lib/__tests__/logger.spec.ts`, `monitoring.spec.ts`, `alertWebhook.test.ts` |
| M15 | O auth propaga o usuário no header `x-user-id`, depois de validar o token. | `middleware/auth.ts:142` |
| M16 | `/health` já consulta o banco (`SELECT 1`) e o Qdrant (se estiver configurado) e devolve **503** quando algo falha. Sonda de vida não é lacuna. | `app.ts:73-106` |

## 3. Requisito legal: guarda de registros de acesso (Marco Civil)

Dossiê completo: [`pesquisas-legais/marco-civil-guarda-registros/relatorio.md`](../../pesquisas-legais/marco-civil-guarda-registros/relatorio.md).

- **Dever:** o provedor de aplicações de internet que é pessoa jurídica, com atividade organizada e fins
  econômicos, guarda os **registros de acesso a aplicações por 6 meses**, sob sigilo, em ambiente controlado e
  de segurança (Lei 12.965/2014, art. 15). O Luminaris passa a ser esse provedor quando operar.
  - [acervo](https://github.com/ctresb/leis/blob/304b3a90473b9f312cbbff04119cbc81dd492e3c/federal/leis-ordinarias/2014/lei-12965-2014-04-23.md)
  - [fonte oficial](https://normas.leg.br/?urn=urn:lex:br:federal:lei:2014-04-23;12965)
- **Conteúdo do registro:** data e hora de uso a partir de um endereço IP (art. 5º, VIII). Desde o Dec.
  12.975/2026 entra também a **porta lógica de origem**, sempre que for necessária para identificar o terminal,
  sem depender de requisição (Dec. 8.771/2016, art. 15-A, caput e § 1º).
  - [Planalto, compilado](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2016/decreto/d8771.htm)
  - [Dec. 12.975](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2026/decreto/d12975.htm)
  - O Dec. 12.975 entra em vigor 60 dias após 20/05/2026 (art. 2º), então **já vigora**.
- **Padrão de guarda** (Dec. 8.771, art. 13, I–IV):
  - controle estrito de quem acessa;
  - autenticação de acesso aos registros;
  - **inventário dos acessos aos próprios registros** (momento, duração, quem, arquivo);
  - encriptação ou medida equivalente.
- **Formato:** interoperável e estruturado (art. 15 do decreto).
- **Minimização:** reter o mínimo e excluir quando a finalidade for atingida ou o prazo legal acabar
  (art. 13, § 2º).
- **Alerta de vigência resolvido:** a cópia do Dec. 8.771 no acervo é a `original`, **sem** as alterações de
  2026. A conclusão acima vem do texto compilado do Planalto.

**Hoje:** nenhum registro guarda IP ou porta por acesso. O único arquivo persistido (M1) é de erro e fica 14
dias. Isso não é infração enquanto não há operação. Vira requisito de implantação (§5, itens 11-13).

## 4. Mapa de cobertura (o que cada portão tem e o que falta)

| Portão | Erro registrado | Contexto (rota/usuário/req-id) | Classificação 4xx×5xx | Persistido | Alerta remoto | Guarda legal |
|---|---|---|---|---|---|---|
| P1 HTTP | n/a | rota sim (com query); usuário e req-id não | n/a | só se lento | não | **não** (sem IP/porta) |
| P2 Erro API | sim | **não** | **não** | sim (tudo como `error`) | não | n/a |
| P3 Processo | sim | não | n/a | sim | **não** | n/a |
| P4 Jobs | sim (6/6) | nome do job | n/a | sim | **1/6** | n/a |
| P5 Saída | indireto (sobe ao chamador) | não | n/a | indireto | não | n/a |
| P6 Linha | n/a | **não injeta nada** | n/a | warn/error | n/a | **sem redação de PII** |
| fora do logger | 9 `console.*` em auth/jwt/prisma/RelationUtils/env (M11) | — | — | **não** | — | — |

## 5. Checklist numerado (se os forks forem na recomendada)

Fase pelo F-OBS-0: **Fase A** não depende de host nem de produção. **Fase B** só existe com implantação
(Onda 0).

**Fase A: contexto, classificação e higiene**

1. **[direto]** `lib/requestContext.ts`: `AsyncLocalStorage<RequestContext>` com `run(ctx, fn)` e `get()`.
   É o único ponto de leitura do contexto. Teste: `get()` fora de `run` devolve `undefined`. Dentro de `run`,
   o valor sobrevive a `await`.
2. **[direto]** Um middleware novo, montado **antes** do `httpTimingMiddleware`, cria o contexto da requisição:
   - `requestId`: aceita o `x-request-id` de entrada só se casar com `^[A-Za-z0-9-]{8,64}$`; senão gera `randomUUID()`;
   - `method` e `route` (o path, sem query, item 5);
   - devolve o header `X-Request-Id` na resposta.

   O `userId` entra depois do auth (item 3). Teste: a resposta traz `X-Request-Id`, e um id de entrada
   inválido é trocado.
3. **[direto]** O `authMiddleware` grava `userId` no contexto corrente depois de validar o token, no mesmo
   ponto em que hoje seta `x-user-id` (`auth.ts:142`). Não grava e-mail nem nome.
4. **[direto]** `formatLog` passa a mesclar `requestContext.get()` em toda linha (`requestId`, `userId`,
   `method`, `route`). **O contexto explícito do chamador vence** em caso de chave igual. Isso cobre as 460
   chamadas existentes sem editar nenhuma. Teste: uma linha emitida dentro de `run` leva `requestId`, e fora
   de `run` sai igual à de hoje (byte-a-byte nos testes atuais de `logger.spec.ts`).
5. **[F-OBS-3]** O `httpTimingMiddleware` registra `path` **sem query string** (`req.path` ou corte no `?`).
   Teste: `GET /x?cpf=123` registra `/x`.
6. **[F-OBS-2]** `handleApiError` registra **depois** de classificar:
   - `statusCode >= 500` → `error`, com o erro completo;
   - 401/403 → `warn`, só `code` e `statusCode`;
   - outro 4xx → `info`, só `code` e `statusCode`, sem stack nem `details`.

   Teste: um ZodError não gera linha `error`, e um erro desconhecido gera `error` com `requestId`.
7. **[F-OBS-3]** `logReplacer` ganha uma lista de chaves redigidas (`password`, `senha`, `token`,
   `authorization`, `cookie`, `secret`, `certificado`, `pfx`, `cpf`, `cnpj`, `email`). Elas saem como
   `"[redacted]"` em qualquer profundidade. Teste com objeto aninhado e com `Error` que tem campo próprio.
8. **[direto]** Os 9 `console.*` fora de CLI e script (M11) passam a `logger.*` com nível equivalente.
   - `auth.ts`: o 401/403 vira `warn` com `route` e sem a mensagem crua do erro do JWT.
   - `config/env.ts:43` **fica** como está, porque roda antes do logger existir.
9. **[F-OBS-8]** `server/eslint.config.mjs` ganha `no-console: error` em `src/**`, com exceção para
   `jobs/*Cli.ts`, `scripts/**`, `config/env.ts` e `lib/logger.ts` (o próprio sink). A CI já roda o lint
   (M13). Prova na condição que falha: um `console.log` num service faz `npm run lint` sair ≠ 0.
10. **[F-OBS-7]** Os 5 schedulers sem alerta (M8) disparam `sendAlertWebhook({ source: '<job>', event:
    'job_failed', … })` no ramo `event:'failed'`. O `uncaughtException` também dispara
    (`source: 'process'`) antes do shutdown. A união `AlertPayload.source` cresce na mesma mudança. Teste por
    scheduler com `log`/alerta injetados.

**Fase B: implantação (Onda 0)**

11. **[F-OBS-5]** Sink de **registro de acesso** (Marco Civil, §3), separado do log de erro:
    - uma linha por requisição autenticada com `timestamp` (UTC), `ip`, `port` (F-OBS-6), `userId`, `method`
      e `route`;
    - sem corpo e sem query;
    - retenção de 6 meses mais margem (F-OBS-5).
12. **[pendente de validação externa / F-OBS-5]** Padrão de guarda do art. 13: arquivo em volume
    encriptado, acesso restrito a um papel nomeado e **inventário de quem leu os registros**. A forma
    concreta depende do host.
13. **[direto]** Expurgo automático do registro de acesso no fim do prazo (art. 13, § 2º), no mesmo molde do
    `pruneOldErrorLogs` (M1).
14. **[F-OBS-4]** Envio do log de erro a um agregador remoto. O caminho previsto no comentário do próprio
    `logger.ts` é "a real log shipper (Sentry/pino transport)". A escolha fica junto com o host.
15. **[direto]** `ALERT_WEBHOOK_URL` passa a constar no runbook de implantação como variável obrigatória em
    produção. Continua opcional em dev.

**Gates que o diff aciona:** `tsc` do server; `logger.spec.ts`/`monitoring.spec.ts`/`alertWebhook.test.ts`;
`npm run lint`; `check:arch` (o item 1 cria arquivo novo em `lib/`, conferir a fronteira). Nenhum DTO Zod é
tocado, então o snapshot de shape não deve mudar. **Se mudar, PARE.**

## 6. Contratos (esboço materializável)

```ts
// lib/requestContext.ts
export interface RequestContext {
  requestId: string;          // UUID v4 ou x-request-id validado
  method: string;
  route: string;              // path sem query
  userId?: string;            // só depois do auth
}

// Linha de log (o que formatLog grava) — campos novos marcados com +
interface LogEntry {
  timestamp: string;          // ISO UTC
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  requestId?: string;         // +
  userId?: string;            // +
  method?: string;            // +
  route?: string;             // +
  [key: string]: unknown;     // contexto do chamador (vence o de cima), já redigido
}

// lib/alertWebhook.ts — AlertPayload cresce
source:
  | 'accounting_sync_reconcile' | 'sped_ecd' | 'sped_ecf' | 'data_exchange_export'   // atuais
  | 'dfe_poll' | 'collection_charge_poll' | 'mp_release_report'                       // +
  | 'legal_params_recalc' | 'ptax_rate' | 'process';                                  // +
event: 'reconcile_summary' | 'generation_failed' | 'job_failed' | 'uncaught_exception'; // +2

// Fase B — registro de acesso (uma linha NDJSON por requisição autenticada)
interface AccessLogRecord {
  timestamp: string;          // ISO UTC
  ip: string;                 // req.ip (trust proxy = 1)
  port: number | null;        // F-OBS-6
  userId: string;
  method: string;
  route: string;              // sem query, sem corpo
  requestId: string;
}
```

## 7. Forks — RATIFICADOS em 23/10/2026, todos pela recomendada

**F-OBS-0: quando.**
- (a) Tudo na Onda 0.
- (b) Fase A agora e Fase B na Onda 0.
- (c) Tudo agora.

**Recomendo (b).** A Fase A não depende de host, é barata (cerca de 10 arquivos) e já paga em dev e nos
runbooks H1/H2: um erro passa a vir com rota, usuário e id. A Fase B depende de topologia, volume e
agregador, e decidi-la sem produção é palpite (o mesmo raciocínio da linha 16 de [§19](../plano/destino/19-riscos-e-premissas.md)).
(c) é pior porque obrigaria a escolher o agregador às cegas. **Status: RATIFICADO 23/10 pela recomendada.**

**F-OBS-1: biblioteca de log.**
- (a) Manter o logger próprio e injetar contexto em `formatLog`.
- (b) Trocar por pino (ou similar).

**Recomendo (a).** As 460 chamadas usam a assinatura `logger.x(msg, ctx)`, que já é estruturada, e o
próprio logger registra que a troca só se justifica por volume (comentário em `appendToErrorLog`). Volume
só existe com produção. **Status: RATIFICADO 23/10 pela recomendada.**

**F-OBS-2: nível do 4xx.**
- (a) Todo 4xx em `info` (não persiste).
- (b) Todo 4xx em `warn` (persiste).
- (c) 401/403 em `warn`, demais 4xx em `info`.

**Recomendo (c).** Negação de acesso é sinal de segurança e vale guardar. Erro de validação do usuário é
ruído e hoje enche o arquivo como `error` (M4). **Status: RATIFICADO 23/10 pela recomendada.**

**F-OBS-3: proteção de dado pessoal no log.**
- (a) Lista de chaves negadas no `logReplacer`, mais path sem query.
- (b) Lista de chaves permitidas (só campos declarados saem).
- (c) Nada.

**Recomendo (a).** (b) exigiria revisar as 460 chamadas. (a) cobre o vazamento provável: um `Error` com
campo próprio (M2) e uma busca por CPF na URL (M5). Fica o limite conhecido: valor sensível sob chave
inocente (ex.: `{ q: '123.456.789-00' }`) passa. A trilha de auditoria tem allowlist própria e não muda.
**Status: RATIFICADO 23/10 pela recomendada.**

**F-OBS-4: agregador remoto do log de erro.**
- (a) Sentry (ou serviço de erro equivalente).
- (b) O dreno de log do próprio host.
- (c) Shipper de arquivo (ex.: transport do pino) para um backend de log.

**Recomendo decidir junto com o host da Onda 0.** O critério é: o erro chega com stack e `requestId`, há
alerta por taxa e o dado fica em região aceitável para a LGPD. Não comparei preço nem plano de nenhum
fornecedor. **Status: RATIFICADO 23/10 pela recomendada: a escolha fica para quando o host da Onda 0 for definido.**

**F-OBS-5: onde guardar o registro de acesso (6 meses).**
- (a) Tabela Prisma `AccessLog` no SQLite.
- (b) NDJSON diário separado, em volume encriptado, com expurgo.
- (c) Dreno do host com retenção configurada.

**Recomendo (b) provisório.** (a) põe uma escrita por requisição no mesmo SQLite do razão (memória "ficar
no SQLite"; Windows serializa escrita). (c) amarra o prazo legal a configuração de fornecedor. (b) reaproveita
o molde do `errors-*.ndjson` e atende o "formato interoperável e estruturado". O inventário de leitura
(art. 13, III) sai do controle de acesso do volume. Reavaliar quando houver host. **Status: RATIFICADO 23/10 pela recomendada.**

**F-OBS-6: porta lógica de origem.**
- (a) Registrar `req.socket.remotePort` direto.
- (b) Registrar a porta repassada pelo proxy (header do balanceador) e, sem ela, `null`.
- (c) Não registrar porta.

**Recomendo (b).** Com `trust proxy = 1` (M12), a porta do socket é a do proxy e não identifica ninguém. O
art. 15-A pede a porta "sempre que necessário", o que depende de haver NAT/CGNAT do lado do usuário e do
balanceador escolhido. Sem topologia, (b) é o único desenho que não registra porta falsa. **Status: RATIFICADO 23/10 pela recomendada. A forma final da porta se confirma com a topologia (insumo
ausente).**

**F-OBS-7: o que gera alerta remoto.**
- (a) Falha de qualquer scheduler, mais `uncaughtException`.
- (b) (a), mais taxa de 5xx acima de limiar.
- (c) Manter só os 4 atuais.

**Recomendo (a).** Job em processo que falha em silêncio é o caso que o arquivo de erro foi criado para
pegar (comentário de `errorLogDir`). Taxa de 5xx precisa de janela e de tráfego real, o que é Fase B.
**Status: RATIFICADO 23/10 pela recomendada.**

**F-OBS-8: impedir `console.*` novo.**
- (a) `no-console` no ESLint do server, com as exceções do item 9.
- (b) Só convenção.

**Recomendo (a)**, com a ressalva da regra ⛔ do `CLAUDE.md`, que proíbe "aparato de auditoria novo". O
`no-console` é regra de lint lida como o `tsc`, no mesmo job que já roda (M13), e não cria bancada, rodada
nem revisor. Ainda assim é gate novo, e o precedente de exceção ratificada é só o `check:arch` (13/10). Por
isso pede ratificação explícita. Se o dono negar, o item 9 sai e o 8 fica. **Status: RATIFICADO 23/10 pela recomendada.**

**F-OBS-9: métricas (contadores, percentis).**
- (a) Nada além do log (logs como métrica).
- (b) Endpoint de métricas (ex.: formato Prometheus).

**Recomendo (a)** até existir produção. O `Metrics` atual (`lib/monitoring.ts`) só registra log, e não há
quem consuma um endpoint. **Status: RATIFICADO 23/10 pela recomendada.**

## 8. Pendente de validação externa

- **Arts. 16-A a 16-J do Dec. 8.771 (redação de 2026)**, deveres de provedor de aplicações (representante no
  País, canal de denúncia, conteúdo de terceiro). Não são observabilidade, mas a pesquisa os encontrou. A
  pergunta exata ao advogado está no §4 do dossiê.
- **Padrões do CGI.br** para a guarda (art. 13, § 1º): não pesquisados.
- **LGPD, arts. 37 e 46** (registro das operações e segurança) aplicados a log: não pesquisados aqui.
- **Retenção do log de erro (14 dias) frente à minimização** do art. 13, § 2º: parece compatível (prazo curto
  e finalidade de operação), mas a conclusão é inferida.

## 9. Insumos ausentes

- **Topologia de implantação** (host, balanceador, CDN, NAT): decide F-OBS-4, F-OBS-5 e F-OBS-6.
- **Volume de requisições**: decide F-OBS-1 (troca de biblioteca) e o tamanho do registro de acesso.

## 10. Achados fora de escopo

- **FE (`my-app/`)**: 62 `console.error` fora de teste e nenhum envio de erro do navegador ao servidor. Isso
  seria um `FE-INCR-OBS` próprio, consumindo o `X-Request-Id` do item 2 para o usuário reportar falha.
- **CLIs (`jobs/*Cli.ts`)** usam `console.*` legitimamente (saída de terminal). Não entram.
- **Trilha de auditoria contábil**: evento de negócio, com allowlist de PII própria. Não muda aqui.
