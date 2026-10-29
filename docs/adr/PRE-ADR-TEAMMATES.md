# PRE-ADR-TEAMMATES — Teammates nativos: agentes persistentes, rotinas, canais agente↔agente e multi-provedor

- **Data:** 2026-10-29
- **Status:** **Proposed** — F-TM-1..4 **RATIFICADOS** (dono, questionário, 29/10); F-TM-5..12 **RATIFICAÇÃO PENDENTE**. Sem código, sem "executa".
- **Autorização:** dono, chat, 2026-10-29: "Autorizo planejar", em resposta a "Autoriza abrir o nó e escrever PRE-ADR + BRIEF (sessao-planejamento, só docs)?". Cobre o nó, este PRE-ADR e o BRIEF; **não** cobre código nem merge.
- **Nó:** [`docs/plano/nos/TEAMMATES.md`](../plano/nos/TEAMMATES.md) · cédula dos forks: [`D-2026-10-29-TEAMMATES-FORKS`](../plano/decisoes/D-2026-10-29-TEAMMATES-FORKS.md).
- **Respeita:** destino §7 (`docs/plano/destino/07-camada-de-ia-agentica.md`), `ADR-DOMAIN-MOTOR-rejected.md`, `ADR-PERSISTENCE-BOUNDARY-user-designed-vs-law-designed.md`, `ADR-M2-deploy-topology.md` (BYOK), `ADR-OBSERVABILIDADE.md` (OBS-R11), BRIEF do I11 (`docs/accounting/BE-INCR-CHAT-AGENT-brief.md`), nó FIX-CHAT-AGENTE.
- **BRIEF:** [`docs/accounting/BE-INCR-TEAMMATES-brief.md`](../accounting/BE-INCR-TEAMMATES-brief.md).

## TLDR

As funções do OpenBot (openbot.run) — teammate persistente com papel e memória, rotinas, canais em que um agente
chama outro, vários provedores com reserva — viram uma camada **de plataforma** em Prisma, em cima do chat agente que
já existe. A trava que o OpenBot não tem fica no código, não no prompt: **toda ação é classificada antes de rodar**
(livre, proposta ou proibida), e dinheiro, fiscal, razão e envio para fora são sempre proposta confirmada por humano.
Risco principal: canais completos trazem uma fila assíncrona, e ela só não reabre o motor rejeitado em 21/09 se ficar
em tabela (sem Redis) e nunca carregar mutação de domínio — F-TM-5.

## 1. Objetivo (sob a letra)

Dar ao dono da empresa **agentes que trabalham sozinhos entre uma conversa e outra** (rotina, delegação entre
agentes) sem abrir mão do invariante do §7: *"nenhum agente escreve no razão, emite nota ou move dinheiro sem um
evento confirmado por humano"*. O ganho sobre o "bot genérico" dos concorrentes é exatamente essa trava, mais o
custo de IA pago pela chave do próprio cliente.

## 2. Evidência

### 2.1 Código (lido em 29/10, `origin/main` de43cb51) — verificado

| Fato | Onde |
|---|---|
| O agente ERP já tem memória: sem `history` do cliente, lê as últimas 50 mensagens da instância (`MAX_PERSISTED_HISTORY`) | `server/src/features/chat/services/ChatService.ts:69,100-109` |
| Laço de ferramentas real, até 5 voltas; para e devolve `ACTION_PROPOSAL` quando uma ferramenta retorna `PROPOSED` | `ChatService.ts:202-266` |
| 5 ferramentas fixas: `list_my_tables`, `get_table_schema`, `query_table_data`, `request_record_creation`, `request_record_update` | `chat/services/LuminarisAgentService.ts:42-120` |
| `ActionProposal` só descreve escrita em linha de DynamicTable (`action` CREATE/UPDATE/DELETE + `tableId`); `status` é string livre (`PENDING`, `EXECUTED`, `EXPIRED` no comentário) | `server/prisma/schema.prisma:412-426` |
| Não achei `EXPIRED` nem `expiresAt` escrito em `features/chat` fora de teste (grep) — o nó FIX-CHAT-AGENTE lista "propostas sem TTL" | grep 29/10; `docs/plano/nos/FIX-CHAT-AGENTE.md` |
| Provedor único: `OpenAIService` (gpt-4o no agente, gpt-4o-mini no chat) | `server/src/lib/openai/OpenAIService.ts:7-23,258-270` |
| Uso por chamada já é medido (`LlmUsage` → `TurnUsage`, gravado na `ChatMessage`) | `server/src/lib/openai/llmUsage.ts`; `schema.prisma:208-212` |
| Cifra em repouso pronta: `secretBox` AES-256-GCM, keyring no env, AAD amarra o blob à linha dona — hoje com nome de chave do pagamento (`PAYMENT_CREDENTIAL_KEYS`) | `server/src/lib/secretBox.ts:1-25` |
| Agendador da casa: `setInterval` + `alert` injetado + `job_failed`; o teste de OBS-R11 descobre `jobs/*Scheduler.ts` por glob | `server/src/jobs/PtaxRateScheduler.ts:25-98`; `ADR-OBSERVABILIDADE.md` F-OBS-14 |

### 2.2 Decisões já tomadas que este PRE-ADR consome — verificado nos documentos

- **M2 (22/08):** 1 instância por cliente, **BYOK — a chave de IA é do próprio cliente** (`docs/plano/gates/M2.md`; `ADR-M2-deploy-topology.md`).
- **§7 do destino:** 8 agentes; Gerador e Assistente ERP DECIDIDOS; Vendas, Cobrança, Conciliação, Fiscal, Atendimento e Contador-assistente PROPOSTOS.
- **R-motor-dominio (21/09):** sem MutationEngine/DAG/PluginRegistry/fila para orquestrar módulos; reabrir só por gatilho (a)–(d) com ADR novo.
- **ADR-PERSISTENCE-BOUNDARY (14/10):** tabela de **plataforma** é Prisma por natureza e fica fora dos dois critérios (§1 do ADR).

### 2.3 OpenBot — lido em 29/10 (openbot.run, README e LICENSE em github.com/nightly-labs/openbot)

App desktop (Electron) que coordena CLIs de agente; licença PolyForm Noncommercial 1.0.0; agentes com
"danger-full-access" e "approvalPolicy: never". Daqui só se aproveita a **lista de funções**; nenhum código, texto ou
desenho de tela é copiado (licença).

## 3. Colisões verificadas

1. **R-motor-dominio × canais completos (F-TM-4).** O motor rejeitado coordenava **mutações de domínio**. Canal de
   teammates coordena **conversa**: cada turno de agente só lê, rascunha ou grava uma proposta; a mutação continua sendo
   uma proposta confirmada e executada pelo serviço dono, como hoje (`executeProposal`). Nenhum dos gatilhos (a), (c),
   (d) se aplica. O gatilho **(b)** ("fila adotada para outro fim e já em produção") é o ponto sensível — ver F-TM-5.
2. **ADR-M2 (BYOK) × chave da plataforma com teto (F-TM-3).** O dono escolheu "chave do cliente **ou a nossa com teto**".
   O M2 só prevê a do cliente → emenda ao ADR-M2 (F-TM-6).
3. **SQLite com um escritor** (a migração para Postgres foi rejeitada: `docs/plano/rejeitadas/R-postgresql.md`): rotinas e canais concorrentes disputariam o lock com as
   vendas. Resposta direta, não fork: **um turno de agente por vez por instância**, e o turno não segura transação
   durante a chamada ao modelo (lê → chama o LLM fora de tx → grava em tx curta).
4. **Ferramentas do OpenBot que não entram** (decisão direta, vem do §7 e do §13): shell, sistema de arquivos,
   navegador embutido e acesso direto ao Prisma. Num SaaS multi-tenant são superfície de ataque sem dono.

## 4. Decisões diretas (sem fork)

- **D-1 Onde mora:** módulo novo `server/src/features/teammates/` (Route → Controller → Service → Repository → Prisma +
  Policy + Factory), tabelas de plataforma em Prisma. O `chat` segue dono da `ActionProposal` e do laço de ferramentas;
  `teammates` consome os dois pelo serviço, nunca pelo repositório alheio.
- **D-2 Classificação da ação no código:** cada ferramenta declara uma classe — `LIVRE` (ler, resumir, rascunhar, nota
  ou tarefa interna), `PROPOSTA` (escrita em DynamicTable, envio externo, qualquer coisa de dinheiro, fiscal ou razão) ou
  `PROIBIDA`. O runner consulta a classe **antes** de executar; o prompt não decide. A alçada do teammate pode
  **apertar** (LIVRE → PROPOSTA), nunca afrouxar dinheiro, fiscal, razão ou envio externo (F-TM-2).
- **D-3 Playbook = dado:** instruções em texto + lista de ferramentas permitidas, gravadas no teammate. Sem código
  enviado pelo usuário.
- **D-4 Um turno por vez por instância** (colisão 3) e sem transação aberta durante a chamada ao LLM.
- **D-5 Custo medido em todo turno** com o `LlmUsage` que já existe; o turno grava provedor, modelo e tokens.

## 5. Forks

### Ratificados (dono, questionário, 29/10 — cédula `D-2026-10-29-TEAMMATES-FORKS`)

| Fork | Resposta |
|---|---|
| F-TM-1 Primeiro corte | Plataforma mínima + 1 agente piloto do §7 |
| F-TM-2 Autonomia | Alçada por ação: ler/resumir/rascunhar/tarefa interna livres; envio externo, dinheiro e fiscal = proposta; dono configura por teammate |
| F-TM-3 Provedor | Multi-provedor (Claude, OpenAI, Gemini) + chave do cliente (BYOK) ou a nossa com teto + provedor reserva |
| F-TM-4 Agente↔agente | Canais completos no v1 (contra a recomendação de adiar) |

### RATIFICAÇÃO PENDENTE

**F-TM-5 — Mecanismo assíncrono dos turnos (rotina e canal)**
- (a) **Fila em tabela** (`AgentTurn` com `PENDING → RUNNING → DONE/FAILED`), consumida por um agendador da casa que
  reivindica com `updateMany` condicional; sem Redis. Este ADR declara que a fila **não conta** como gatilho (b) do
  R-motor-dominio: ela não carrega mutação de domínio e não traz infraestrutura nova (a premissa do gatilho).
- (b) BullMQ + Redis.
- (c) Sem fila: rotina roda dentro do agendador e canal processa a menção na própria requisição.
- **Recomendada: (a).** (b) traz o Redis que o ADR de 21/09 recusou e entrega exatamente a evidência do gatilho (b);
  (c) prende a requisição HTTP por vários turnos encadeados e não sobrevive a restart.

**F-TM-6 — Chave da plataforma × ADR-M2**
- (a) Emenda ao ADR-M2: a instância pode usar a chave da plataforma com **teto mensal em tokens** definido pelo dono; a
  chave do cliente tem precedência quando existe.
- (b) v1 só BYOK; a chave da plataforma vira nó próprio.
- **Recomendada: (a)**, porque é o que o dono escolheu em F-TM-3; o fork existe só para a emenda ficar escrita no M2.

**F-TM-7 — Agente piloto**
- (a) **Conciliação:** casa linha de extrato × título × adquirente e **propõe** item pendente; nunca posta (§7).
- (b) Cobrança: prioriza inadimplência, gera Pix/boleto, negocia dentro de alçada.
- **Recomendada: (a).** Tudo dentro do sistema; (b) precisa de envio externo (e-mail/WhatsApp), e não achei
  transporte de mensagem no código (insumo ausente, §8) — o piloto travaria no transporte, não no agente.

**F-TM-8 — Forma da proposta**
- (a) **Estender `ActionProposal`:** `kind` discriminado (`TABLE_ROW` = o atual, mais os kinds novos), `payload`
  validado por Zod por kind, `teammateId?`, `channelMessageId?`, `expiresAt`. Uma caixa de aprovação só.
- (b) Tabela nova `TeammateProposal`, separada da do chat.
- **Recomendada: (a).** Duas caixas de aprovação dividem a atenção do dono, que é o gargalo do desenho inteiro.

**F-TM-9 — Adaptadores de provedor**
- (a) **Porta `LlmProvider`** + um adaptador por SDK oficial (`openai` existente, `@anthropic-ai/sdk`, `@google/genai`),
  todos traduzindo para um formato único de mensagem, ferramenta e uso.
- (b) Só o SDK `openai`, apontando para os endpoints "compatíveis com OpenAI" de cada provedor.
- **Recomendada: (a).** (b) evita 2 dependências, mas a camada de compatibilidade de cada provedor cobre só parte das
  ferramentas e do uso de tokens — o custo medido (D-5) ficaria errado em silêncio. **Não verificado** neste PRE-ADR
  quanto cada compatibilidade cobre hoje (insumo ausente, §8).

**F-TM-10 — O que acontece ao bater um limite (saltos no canal, turnos/dia, teto de tokens)**
- (a) **Pausa** o teammate (ou a thread) e avisa o dono na caixa de aprovação; nada roda até ele liberar.
- (b) Troca para um modelo mais barato e segue.
- **Recomendada: (a).** (b) esconde o laço em vez de pará-lo; num canal com vários agentes o laço é o modo de falha
  esperado.

**F-TM-11 — Gatilhos de rotina no v1**
- (a) **Agendada + manual** ("roda agora"); webhook de entrada vira nó próprio.
- (b) Agendada + manual + webhook de entrada com segredo por rotina.
- **Recomendada: (a).** Webhook é rota pública nova, com autenticação própria e superfície de abuso; o piloto não
  precisa dele.

**F-TM-12 — Conectores externos (MCP, plugins) no v1**
- (a) **Fora do v1**; nó próprio depois do transporte de mensagens.
- (b) Cliente MCP no v1, com toda ferramenta externa classificada como `PROPOSTA`.
- **Recomendada: (a).** Sem transporte e sem a pesquisa de LGPD do §7 deste PRE-ADR, o conector só serviria para ler
  dado de fora, e isso não é o que o piloto pede.

## 6. Comportamentos candidatos do BRIEF (esqueleto)

Plataforma: teammate (CRUD + alçada) · credencial de provedor cifrada · porta `LlmProvider` com reserva · runner de
turno com classificação da ação · fila `AgentTurn` + agendador com alerta · rotinas · canais e menções com limite de
saltos · caixa única de propostas com expiração. Piloto: ferramentas de leitura da conciliação + kind de proposta
`SETTLEMENT_MATCH` executado pelo serviço dono. Detalhe e ordem no BRIEF.

## 7. Pendente de validação externa

- **LGPD — dado de cliente do tenant enviado ao provedor de IA.** Pergunta: o tenant (controlador) usando Claude/
  OpenAI/Gemini como operador/suboperador, com servidores fora do Brasil, exige o quê (art. 33 transferência
  internacional; art. 39 operador; cláusulas da ANPD)? Muda se a chave é do cliente (contrato dele com o provedor) ou
  da plataforma (contrato nosso). Vai pelo método oficial (`legal.py`, acervo `ctresb/leis`) antes do PR que liga a
  chave da plataforma; **não** bloqueia os PRs de estrutura.

## 8. Insumos ausentes (não varridos — regra 2)

- Interface do `BankSettlementService` para "propor item pendente" sem postar (piloto F-TM-7 a).
- Transporte de e-mail/WhatsApp: não achei no código; o nó FIX-AUTH-CONTA exclui "itens que dependem de transporte de
  e-mail" — inferido, não varrido.
- Estado dos PRs do FIX-CHAT-AGENTE (#835, #836, #838) — a nota diz "aguarda decisões e merge"; não medido com `gh`.
- Cobertura atual das camadas de compatibilidade OpenAI de Anthropic e Google (F-TM-9).

## 9. Achados fora de escopo

- Tela (FE-INCR-TEAMMATES): nó vizinho.
- Agentes 2..6 do §7 (Vendas, Cobrança, Fiscal, Atendimento, Contador-assistente): um nó por agente, depois do piloto.
- Generalizar o nome do keyring do `secretBox` (hoje `PAYMENT_CREDENTIAL_KEYS`) — o BRIEF usa um keyring próprio para
  não acoplar à rotação da chave de pagamento.

## Riscos (inclui vieses do autor)

- **Laço de agentes** é o modo de falha típico de canal: limite de saltos e F-TM-10 existem por isso.
- **Viés de escopo:** "canais completos" foi escolha do dono contra a recomendação; o autor pode estar subestimando o
  custo deles no BRIEF — o PR de canais vem por último para poder ser cortado sem desfazer o resto.
- **Dependência do chat:** se o FIX-CHAT-AGENTE não fechar antes, o runner herda os defeitos do laço atual.
