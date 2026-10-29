---
id: "D-2026-10-29-TEAMMATES-FORKS"
tipo: "decisao"
dominio: "plataforma"
titulo: "Teammates nativos (funções do OpenBot): OpenBot descartado como componente e 4 forks de desenho respondidos por questionário (base + piloto, alçada por ação, multi-provedor com BYOK, canais completos)"
estado: "decided"
autorizacao: "dono, chat, 2026-10-29: \"Nao poxa, queria colocar um projeto nativo do luminaris com as funções que o openbot tem\" + respostas por AskUserQuestion no mesmo turno · \"Autorizo planejar\" (nó + PRE-ADR + BRIEF, só docs)"
atualizado: "2026-10-29"
---
# D-2026-10-29-TEAMMATES-FORKS

**Estado:** `decided` (F-TM-1..4). Esta cédula **não** autoriza código: o nó [[TEAMMATES]] espera a ratificação de
F-TM-5..12 e um `executa`.

**Origem:** o dono comparou a estratégia de concorrentes ("um grok bot que se adapta a qualquer tarefa") com a do
Luminaris e perguntou sobre adicionar o openbot.run. Leitura do OpenBot em 29/10 (site, README e LICENSE): app desktop,
licença PolyForm Noncommercial 1.0.0, agentes com "danger-full-access" e "approvalPolicy: never" → **descartado como
componente**. O dono então pediu um projeto nativo com as mesmas funções.

## Forks respondidos (AskUserQuestion, recomendada como 1ª opção)

| # | Pergunta | Resposta literal | Efeito |
|---|---|---|---|
| F-TM-1 | Primeiro corte | "Base + 1 piloto (Recomendado)" | Plataforma mínima de teammates provada com um agente real do destino §7 |
| F-TM-2 | Autonomia fora do dinheiro | "Alçada por ação (Recomendado)" | Ler, resumir, rascunhar e tarefa interna sem aprovação; envio externo, dinheiro e fiscal = proposta; alçada configurável por teammate |
| F-TM-3 | Provedor de IA | "Multi + chave do cliente (Recomendado)" | Adaptador Claude/OpenAI/Gemini; chave do cliente (BYOK) ou a da plataforma com teto; provedor reserva |
| F-TM-4 | Agente↔agente no v1 | "Canais completos" (a recomendada era adiar) | Canais com vários agentes no v1; o PRE-ADR cerca o escopo para não reabrir o [[R-motor-dominio]] |

## Pendente

F-TM-5..12 em [`PRE-ADR-TEAMMATES.md`](../../adr/PRE-ADR-TEAMMATES.md) §5, todos com recomendação.
