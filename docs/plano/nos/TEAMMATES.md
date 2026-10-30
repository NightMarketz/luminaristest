---
id: "TEAMMATES"
tipo: "plataforma"
dominio: "plataforma"
titulo: "Teammates nativos — agentes persistentes com papel e alçada, rotinas, canais agente↔agente e multi-provedor com BYOK (funções do OpenBot, sem o OpenBot)"
estado: "planned"
estado_detalhe: "29/10: PRE-ADR Accepted + BRIEF (43 itens, PR-0..PR-10) — F-TM-1..13 ratificados por questionário; sem código, sem 'executa'. Depende do FIX-CHAT-AGENTE fechado; PR-8 e PR-10 esperam a pesquisa LGPD; produção espera o runbook M2 com Redis"
depende_de: ["[[FIX-CHAT-AGENTE]]"]
ancora_sdd: "§7"
autorizacao: "dono, chat, 2026-10-29: \"Autorizo planejar\" — nó + PRE-ADR + BRIEF, sessao-planejamento, só docs, sem código, sem 'executa' · forks F-TM-1..13 por questionário no mesmo dia ([[D-2026-10-29-TEAMMATES-FORKS]])"
atualizado: "2026-10-29"
write_set: ["server/src/features/teammates/**", "server/src/lib/llm/**", "server/src/features/chat/**", "server/src/jobs/TeammateTurnWorker.ts", "server/src/jobs/ProposalExpiryScheduler.ts", "server/src/jobs/__tests__/schedulerFailureAlert.test.ts", "server/prisma/schema.prisma", "server/prisma/migrations/**", "server/src/routes/teammates.ts", "server/src/routes/docs/teammates.paths.ts", "server/src/routes/hooks.ts", "server/package.json", "server/package-lock.json", ".github/workflows/ci.yml"]
registros: ["server/src/lib/factory.ts", "server/src/routes/index.ts", "server/src/features/accounting/audit/auditCanonical.ts"]
prs: ["#969"]
---
# TEAMMATES — Teammates nativos (funções do OpenBot, sem o OpenBot)

**Estado:** `planned` — 29/10: PRE-ADR Accepted + BRIEF (43 itens, PR-0..PR-10) — F-TM-1..13 ratificados por questionário; sem código, sem 'executa'. Depende do FIX-CHAT-AGENTE fechado; PR-8 e PR-10 esperam a pesquisa LGPD; produção espera o runbook M2 com Redis  
**Autorização:** dono, chat, 2026-10-29: "Autorizo planejar" — nó + PRE-ADR + BRIEF, só docs, sem código, sem 'executa'. Registro do nó antes do PRE-ADR ratificado a pedido do dono (mesmo caminho do [[BUILDER-VERTICAIS]], 15/10)  
**Depende de:** [[FIX-CHAT-AGENTE]]  
**Desbloqueia:** os agentes PROPOSTOS do destino §7 (Vendas, Cobrança, Fiscal, Atendimento, Contador-assistente) — um nó por agente, depois do piloto  
**Âncora no SDD consolidado:** §7

## Docs

- [`PRE-ADR-TEAMMATES.md`](../../adr/PRE-ADR-TEAMMATES.md) — 29/10, **Accepted**: F-TM-1..13 ratificados; quatro contra a recomendação (canais completos, BullMQ + Redis, webhook de rotina, cliente MCP), com as consequências na §5.1
- [`BE-INCR-TEAMMATES-brief.md`](../../accounting/BE-INCR-TEAMMATES-brief.md) — 43 itens em PR-0..PR-10; canais, webhook e MCP por último, cortáveis sem desfazer a base
- Cédula: [[D-2026-10-29-TEAMMATES-FORKS]]
- **Emenda de 30/10** (dono, chat: "Sim, emendas"; origem [[D-2026-10-30-RAG-DOCUMENTOS-FORKS]]): itens 8 (ressalva
  do teste de `OPENAI_API_KEY` para `lib/embedding/**`) e 23 (o orçamento soma `DocumentAiUsage`) do BRIEF

## O que é

Agentes que trabalham entre uma conversa e outra: cada teammate tem papel, playbook, ferramentas permitidas e alçada;
roda por rotina ou quando é mencionado num canal, onde pode chamar outro teammate. A trava fica no código: toda
ferramenta tem classe (livre, proposta, proibida), e dinheiro, fiscal, razão e envio externo são sempre proposta
confirmada pelo dono (invariante do §7). O custo de IA é medido por turno e pago pela chave do próprio cliente (só BYOK no v1). Rotinas rodam por agenda,
manualmente ou por webhook assinado; teammates podem usar ferramentas de servidores MCP remotos, sempre como proposta.

## Por que não o OpenBot

Lido em 29/10: app desktop sem API, licença PolyForm Noncommercial 1.0.0, agentes com acesso total e sem aprovação.
Só a lista de funções foi aproveitada.
