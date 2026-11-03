---
id: "D-2026-10-29-TEAMMATES-FORKS"
tipo: "decisao"
dominio: "plataforma"
titulo: "Teammates nativos (funções do OpenBot): OpenBot descartado como componente e 13 forks de desenho respondidos por questionário (base + piloto Conciliação, alçada por ação, só BYOK, canais completos, BullMQ + Redis, webhook e cliente MCP no v1)"
estado: "decided"
autorizacao: "dono, chat, 2026-10-29: \"Nao poxa, queria colocar um projeto nativo do luminaris com as funções que o openbot tem\" + respostas por AskUserQuestion no mesmo turno · \"Autorizo planejar\" (nó + PRE-ADR + BRIEF, só docs) · \"Sim, questionário\" (F-TM-5..13 por AskUserQuestion)"
atualizado: "2026-10-29"
---
# D-2026-10-29-TEAMMATES-FORKS

**Estado:** `decided` (F-TM-1..13). Esta cédula **não** autoriza código: o nó [[TEAMMATES]] espera um `executa`.

**Origem:** o dono comparou a estratégia de concorrentes ("um grok bot que se adapta a qualquer tarefa") com a do
Luminaris e perguntou sobre adicionar o openbot.run. Leitura do OpenBot em 29/10 (site, README e LICENSE): app desktop,
licença PolyForm Noncommercial 1.0.0, agentes com "danger-full-access" e "approvalPolicy: never" → **descartado como
componente**. O dono então pediu um projeto nativo com as mesmas funções.

## Forks respondidos (AskUserQuestion, recomendada como 1ª opção)

| # | Pergunta | Resposta literal | Efeito |
|---|---|---|---|
| F-TM-1 | Primeiro corte | "Base + 1 piloto (Recomendado)" | Plataforma mínima de teammates provada com um agente real do destino §7 |
| F-TM-2 | Autonomia fora do dinheiro | "Alçada por ação (Recomendado)" | Ler, resumir, rascunhar e tarefa interna sem aprovação; envio externo, dinheiro e fiscal = proposta; alçada configurável por teammate |
| F-TM-3 | Provedor de IA | "Multi + chave do cliente (Recomendado)" | Adaptador Claude/OpenAI/Gemini; chave do cliente (BYOK) ou a da plataforma com teto, refinado pelo F-TM-6 (só BYOK no v1); provedor reserva |
| F-TM-4 | Agente↔agente no v1 | "Canais completos" (a recomendada era adiar) | Canais com vários agentes no v1; o PRE-ADR cerca o escopo para não reabrir o [[R-motor-dominio]] |
| F-TM-5 | Mecanismo assíncrono dos turnos | "BullMQ + Redis" (a recomendada era fila em tabela, sem Redis) | Redis em cada instância do M2 e no CI; quando estiver em produção, existe evidência do gatilho (b) do [[R-motor-dominio]] — reabrir continua exigindo ADR novo. Cerca mecânica: job só com `{ turnId }` + teste de fronteira |
| F-TM-6 | Chave da plataforma × ADR-M2 | "Só BYOK no v1" (a recomendada era emendar o M2) | Nenhuma chave de IA da plataforma no caminho do teammate; orçamento mensal de tokens é do próprio tenant; o M2 não muda neste ponto |
| F-TM-7 | Agente piloto | "Conciliação (Recomendado)" | PR-8 do BRIEF; nunca posta, só propõe |
| F-TM-8 | Forma da proposta | "Estender ActionProposal (Recomendado)" | `kind` + `payload` por kind; uma caixa de aprovação |
| F-TM-9 | Adaptadores | "SDK oficial de cada (Recomendado)" | `@anthropic-ai/sdk` e `@google/genai` além do `openai` |
| F-TM-10 | Ao bater limite | "Pausa e avisa (Recomendado)" | `PAUSED` + proposta `LIMITE_ATINGIDO` |
| F-TM-11 | Gatilhos de rotina | "Agenda + manual + webhook" (a recomendada era sem webhook) | Rota pública assinada por HMAC; corpo = dado não confiável |
| F-TM-12 | Conectores externos | "Cliente MCP no v1" (a recomendada era fora do v1) | Só servidor remoto https; stdio proibido; toda ferramenta MCP é proposta, inclusive leitura |
| F-TM-13 | Autenticação MCP | "Token estático no v1 (Recomendado)" | Token cifrado com `secretBox`; OAuth vira nó próprio |

## Efeitos fora do nó

- **Runbook M2:** ganha o serviço Redis por instância (gate humano; o agente prepara, o dono assina).
- **LGPD:** pesquisa pelo método oficial antes do PR-8 (piloto com dado real) e do PR-10 (MCP).
