---
id: "TEAMMATES"
tipo: "plataforma"
dominio: "plataforma"
titulo: "Teammates nativos — agentes persistentes com papel e alçada, rotinas, canais agente↔agente e multi-provedor com BYOK (funções do OpenBot, sem o OpenBot)"
estado: "planned"
estado_detalhe: "29/10: PRE-ADR (Proposed) + BRIEF escritos — F-TM-1..4 ratificados, F-TM-5..12 PENDENTES; sem código, sem 'executa'. Depende do FIX-CHAT-AGENTE fechado"
depende_de: ["[[FIX-CHAT-AGENTE]]"]
ancora_sdd: "§7"
autorizacao: "dono, chat, 2026-10-29: \"Autorizo planejar\" — nó + PRE-ADR + BRIEF, sessao-planejamento, só docs, sem código, sem 'executa' · forks F-TM-1..4 por questionário no mesmo dia ([[D-2026-10-29-TEAMMATES-FORKS]])"
atualizado: "2026-10-29"
write_set: ["server/src/features/teammates/**", "server/src/lib/llm/**", "server/src/features/chat/**", "server/src/jobs/TeammateTurnScheduler.ts", "server/src/jobs/TeammateRoutineScheduler.ts", "server/src/jobs/ProposalExpiryScheduler.ts", "server/prisma/schema.prisma", "server/prisma/migrations/**", "server/src/routes/teammates.ts", "server/src/routes/docs/teammates.paths.ts"]
registros: ["server/src/lib/factory.ts", "server/src/routes/index.ts", "server/src/features/accounting/audit/auditCanonical.ts"]
---
# TEAMMATES — Teammates nativos (funções do OpenBot, sem o OpenBot)

**Estado:** `planned` — 29/10: PRE-ADR (Proposed) + BRIEF escritos; F-TM-1..4 ratificados, F-TM-5..12 PENDENTES; sem código, sem 'executa'  
**Autorização:** dono, chat, 2026-10-29: "Autorizo planejar" — nó + PRE-ADR + BRIEF, só docs, sem código, sem 'executa'. Registro do nó antes do PRE-ADR ratificado a pedido do dono (mesmo caminho do [[BUILDER-VERTICAIS]], 15/10)  
**Depende de:** [[FIX-CHAT-AGENTE]]  
**Desbloqueia:** os agentes PROPOSTOS do destino §7 (Vendas, Cobrança, Fiscal, Atendimento, Contador-assistente) — um nó por agente, depois do piloto  
**Âncora no SDD consolidado:** §7

## Docs

- [`PRE-ADR-TEAMMATES.md`](../../adr/PRE-ADR-TEAMMATES.md) — 29/10, Proposed: fila em tabela sem Redis (F-TM-5), emenda ao M2 para chave da plataforma (F-TM-6), piloto Conciliação (F-TM-7), `ActionProposal` estendida (F-TM-8), SDK oficial por provedor (F-TM-9), pausa ao bater limite (F-TM-10), rotina agendada + manual (F-TM-11), conectores fora do v1 (F-TM-12) — todos PENDENTES
- [`BE-INCR-TEAMMATES-brief.md`](../../accounting/BE-INCR-TEAMMATES-brief.md) — 35 itens em PR-0..PR-8, escritos na recomendada de cada fork pendente
- Cédula: [[D-2026-10-29-TEAMMATES-FORKS]]

## O que é

Agentes que trabalham entre uma conversa e outra: cada teammate tem papel, playbook, ferramentas permitidas e alçada;
roda por rotina ou quando é mencionado num canal, onde pode chamar outro teammate. A trava fica no código: toda
ferramenta tem classe (livre, proposta, proibida), e dinheiro, fiscal, razão e envio externo são sempre proposta
confirmada pelo dono (invariante do §7). O custo de IA é medido por turno e pago pela chave do próprio cliente.

## Por que não o OpenBot

Lido em 29/10: app desktop sem API, licença PolyForm Noncommercial 1.0.0, agentes com acesso total e sem aprovação.
Só a lista de funções foi aproveitada.
