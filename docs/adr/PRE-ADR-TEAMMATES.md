# PRE-ADR-TEAMMATES — Teammates nativos: agentes persistentes, rotinas, canais agente↔agente e multi-provedor

- **Data:** 2026-10-29
- **Status:** **Accepted** (29/10) — F-TM-1..13 **RATIFICADOS** por questionário em dois turnos do mesmo dia (cédula abaixo). Sem código, sem "executa".
- **Autorização:** dono, chat, 2026-10-29: "Autorizo planejar", em resposta a "Autoriza abrir o nó e escrever PRE-ADR + BRIEF (sessao-planejamento, só docs)?". Cobre o nó, este PRE-ADR e o BRIEF; **não** cobre código nem merge.
- **Nó:** [`docs/plano/nos/TEAMMATES.md`](../plano/nos/TEAMMATES.md) · cédula dos forks: [`D-2026-10-29-TEAMMATES-FORKS`](../plano/decisoes/D-2026-10-29-TEAMMATES-FORKS.md).
- **Respeita:** destino §7 (`docs/plano/destino/07-camada-de-ia-agentica.md`), `ADR-DOMAIN-MOTOR-rejected.md`, `ADR-PERSISTENCE-BOUNDARY-user-designed-vs-law-designed.md`, `ADR-M2-deploy-topology.md` (BYOK), `ADR-OBSERVABILIDADE.md` (OBS-R11), BRIEF do I11 (`docs/accounting/BE-INCR-CHAT-AGENT-brief.md`), nó FIX-CHAT-AGENTE.
- **BRIEF:** [`docs/accounting/BE-INCR-TEAMMATES-brief.md`](../accounting/BE-INCR-TEAMMATES-brief.md).

## TLDR

As funções do OpenBot (openbot.run) — teammate persistente com papel e memória, rotinas, canais em que um agente
chama outro, vários provedores com reserva — viram uma camada **de plataforma** em Prisma, em cima do chat agente que
já existe. A trava que o OpenBot não tem fica no código, não no prompt: **toda ação é classificada antes de rodar**
(livre, proposta ou proibida), e dinheiro, fiscal, razão e envio para fora são sempre proposta confirmada por humano.
Risco principal: o dono escolheu **BullMQ + Redis** para os turnos (F-TM-5 b). Quando essa fila estiver em produção,
existe a evidência do gatilho (b) do R-motor-dominio — o que **permite pedir** a reabertura com ADR novo, não a faz. A
cerca que sobra é mecânica: a fila só carrega `{ turnId }` e o worker não importa serviço de domínio (item do BRIEF).

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
   (d) se aplica. O gatilho **(b)** ("fila adotada para outro fim e já em produção") **passa a ter evidência** quando a
   fila BullMQ (F-TM-5 b) subir no M2. Isso não reabre o ADR de 21/09 sozinho: reabrir continua exigindo ADR novo que
   cite o gatilho. Registro para quem vier depois: a fila foi adotada para turnos de agente, e o próprio dono aceitou
   esse efeito ao escolher contra a recomendação (pergunta F-TM-5 citava o gatilho).
2. **ADR-M2 (BYOK) × chave da plataforma (F-TM-3).** Resolvido pelo F-TM-6 (b): v1 só BYOK, o M2 não muda nesse ponto.
   **Muda em outro:** o Redis do F-TM-5 vira serviço novo em cada instância do M2 (1 VPS por cliente) — emenda ao runbook
   do M2, que é gate humano (o agente prepara, o dono assina).
3. **SQLite com um escritor** (a migração para Postgres foi rejeitada: `docs/plano/rejeitadas/R-postgresql.md`): rotinas e canais concorrentes disputariam o lock com as
   vendas. Resposta direta, não fork: **um turno de agente por vez por instância**, e o turno não segura transação
   durante a chamada ao modelo (lê → chama o LLM fora de tx → grava em tx curta).
4. **Ferramentas do OpenBot que não entram** (decisão direta, vem do §7 e do §13): shell, sistema de arquivos,
   navegador embutido, servidor MCP stdio e acesso direto ao Prisma. Num SaaS multi-tenant são superfície de ataque sem dono.

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
- **D-4 Um turno por vez por instância** (colisão 3; worker da fila com concorrência 1) e sem transação aberta durante a
  chamada ao LLM.
- **D-5 Custo medido em todo turno** com o `LlmUsage` que já existe; o turno grava provedor, modelo e tokens.

## 5. Forks — todos RATIFICADOS (dono, questionário, 29/10 — cédula `D-2026-10-29-TEAMMATES-FORKS`)

| Fork | Recomendada | Resposta do dono | Efeito no BRIEF |
|---|---|---|---|
| F-TM-1 Primeiro corte | base + 1 piloto | **base + 1 piloto** | PR-0..PR-8 |
| F-TM-2 Autonomia | alçada por ação | **alçada por ação** | D-2; itens 11, 15 |
| F-TM-3 Provedor | multi + BYOK/chave nossa com teto | **multi + BYOK/chave nossa com teto** (refinado pelo F-TM-6) | PR-1 |
| F-TM-4 Agente↔agente | adiar | **canais completos no v1** | PR-6 |
| F-TM-5 Mecanismo assíncrono | fila em tabela, sem Redis | **BullMQ + Redis** | PR-4 reescrito; Redis no M2; cerca mecânica da fila |
| F-TM-6 Chave da plataforma | emendar o M2 | **só BYOK no v1** | item 8 sem chave da plataforma; teto mensal vira orçamento do próprio cliente |
| F-TM-7 Piloto | Conciliação | **Conciliação** | PR-8 |
| F-TM-8 Forma da proposta | estender `ActionProposal` | **estender `ActionProposal`** | itens 1, 30–32 |
| F-TM-9 Adaptadores | SDK oficial por provedor | **SDK oficial por provedor** | item 6 |
| F-TM-10 Ao bater limite | pausa e avisa | **pausa e avisa** | item 22 |
| F-TM-11 Gatilhos de rotina | agenda + manual | **agenda + manual + webhook** | PR-9 (webhook) |
| F-TM-12 Conectores externos | fora do v1 | **cliente MCP no v1**, toda ferramenta externa como `PROPOSTA` | PR-10 (MCP) |
| F-TM-13 Autenticação MCP | token estático | **token estático no v1**; OAuth em nó próprio | PR-10 |

O texto das opções está na cédula. Quatro respostas foram contra a recomendação (F-TM-4, 5, 11, 12); as consequências
estão na §5.1 para que ninguém as "conserte" depois achando que foram descuido.

### 5.1 Consequências das escolhas contra a recomendação

- **F-TM-5 (Redis):** (i) serviço Redis em cada instância do M2 e no CI; (ii) a aplicação **sobe sem Redis** — só os
  teammates ficam desligados, com erro claro (falha fechada, como o keyring do `secretBox`); (iii) evidência futura do
  gatilho (b) do R-motor-dominio (§3, colisão 1); (iv) cerca mecânica: o job da fila só tem `{ turnId }` e um teste de
  fronteira reprova `features/teammates/**` importando `PostingService`, `postEntry` ou serviço de domínio fora da lista
  de ferramentas.
- **F-TM-4 (canais):** o laço de agentes é o modo de falha esperado; F-TM-10 (pausa) e o teto de saltos existem por isso.
- **F-TM-11 (webhook):** rota pública nova. Conteúdo do webhook é **dado não confiável** que entra no prompt
  (injeção de prompt): vai delimitado como dado, e nenhuma ferramenta muda de classe por causa dele. Segredo por rotina
  guardado só como hash, comparação em tempo constante, limite de tamanho e de taxa.
- **F-TM-12 (MCP):** só servidor **remoto** (HTTP); **stdio é `PROIBIDA`** (executaria processo no nosso servidor). Toda
  ferramenta MCP é `PROPOSTA`, inclusive leitura — o resultado de uma ferramenta externa também é dado não confiável.
  O envio de dado do tenant a um servidor MCP de terceiro soma à pendência de LGPD (§7).

## 6. Comportamentos do BRIEF (esqueleto)

Plataforma: teammate (CRUD + alçada) · credencial de provedor cifrada (BYOK) · porta `LlmProvider` com reserva ·
runner de turno com classificação da ação · fila BullMQ + registro `AgentTurn` + worker com alerta · rotinas (agenda,
manual, webhook) · canais e menções com teto de saltos · caixa única de propostas com expiração · cliente MCP remoto.
Piloto: ferramentas de leitura da conciliação + kind `SETTLEMENT_MATCH` executado pelo serviço dono. Detalhe e ordem no
BRIEF.

## 7. Pendente de validação externa

- **LGPD — dado do tenant enviado ao provedor de IA e a servidores MCP de terceiros.** Pergunta: com a chave do próprio
  cliente (BYOK) e servidores fora do Brasil, quem é controlador e operador, e o que exige o art. 33 (transferência
  internacional) e o art. 39 (operador)? O mesmo para o servidor MCP que o tenant conecta. Pesquisa pelo método oficial
  (`legal.py`, acervo `ctresb/leis`) **antes do PR-8 (piloto com dado real) e do PR-10 (MCP)**; não bloqueia os PRs de
  estrutura.

## 8. Insumos ausentes (não varridos — regra 2)

- Interface do `BankSettlementService` para "propor item pendente" sem postar (piloto).
- Transporte de e-mail/WhatsApp: não achei no código; o nó FIX-AUTH-CONTA exclui "itens que dependem de transporte de
  e-mail" — inferido, não varrido.
- Estado dos PRs do FIX-CHAT-AGENTE (#835, #836, #838) — a nota diz "aguarda decisões e merge"; não medido com `gh`.
- `ci.yml` e o `docker-compose` do M2: onde entra o serviço Redis (não lidos).
- Rate limit existente da casa para reaproveitar no webhook (não localizado).

## 9. Achados fora de escopo

- Tela (FE-INCR-TEAMMATES): nó vizinho.
- Agentes 2..6 do §7 (Vendas, Cobrança, Fiscal, Atendimento, Contador-assistente): um nó por agente, depois do piloto.
- OAuth para MCP (F-TM-13): nó próprio.
- Chave de IA da plataforma com teto (F-TM-6 a): nó próprio, junto com a pesquisa de LGPD.
- Generalizar o nome do keyring do `secretBox` (hoje `PAYMENT_CREDENTIAL_KEYS`) — o BRIEF usa keyring próprio para não
  acoplar à rotação da chave de pagamento.

## Riscos (inclui vieses do autor)

- **Escopo do v1 cresceu** com quatro escolhas contra a recomendação (canais, Redis, webhook, MCP). O BRIEF ordena os
  PRs para que canais, webhook e MCP sejam os últimos e possam ser cortados sem desfazer a base.
- **Injeção de prompt** entra por três portas novas (canal entre agentes, webhook, resultado de MCP). A defesa não é o
  prompt: é a classe da ferramenta checada no código e toda ação relevante passar por proposta.
- **Viés do autor:** recomendou contra Redis e contra MCP; o BRIEF pode estar pessimista no custo deles — a sessão de
  feature mede e corrige o esboço, não o escopo.
- **Dependência do chat:** se o FIX-CHAT-AGENTE não fechar antes, o runner herda os defeitos do laço atual.
