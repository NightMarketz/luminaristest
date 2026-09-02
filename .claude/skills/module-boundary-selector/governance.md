---
type: skill-governance
governance-skill-id: SKL-BOUNDARY-SELECTOR
skill-path: ./SKILL.md
contract: ../_ARCHITECTURE-CONTRACT.md
status: draft
governs-rules:
  - SEL-001
  - SEL-002
  - SEL-003
  - SEL-004
  - SEL-005
gates:
  SEL-001:
    gate: luminaris-reviewer/fronteira-2.1
    kind: design-time
    note: camada decidida pelas 4 perguntas + tripwires; dúvida → Prisma (coerente com ORCH-002 e AC-2.1-B2/B3)
  SEL-002:
    gate: luminaris-reviewer/fronteira-2.1
    kind: design-time
    note: canônico selecionável exige critério (a) multi-vertical, (b) comportamento cross-entidade ou (c) tela canônica; senão é custom inerte
  SEL-003:
    gate: luminaris-reviewer/fronteira-2.1
    kind: design-time
    note: registro DEVE listar contratos implícitos de nome (tabela/campo → consumidores por grep) — falha silenciosa do motor é risco declarável, não omitível
  SEL-004:
    gate: luminaris-reviewer/fronteira-2.1
    kind: design-time
    note: consequência financeira exige alfândega nomeada (evento/bridge/arquétipo/idempotência no @@unique Prisma — gêmeo de AC-2.1-B5); arquétipo novo = incremento de motor autorizado
  SEL-005:
    gate: luminaris-reviewer/fronteira-2.1
    kind: design-time
    note: saída é Registro de Fronteira com graus de evidência; skill não implementa nem substitui autorização citável (ORCH-006)
---

# Governança — `module-boundary-selector`

| Camada | Fonte canônica |
|---|---|
| Fronteira Prisma × DynamicTable (anti-padrões) | `_ARCHITECTURE-CONTRACT.md` §2.1 (AC-2.1-B1..B5) — prevalece sobre esta skill |
| Procedimento de decisão (4 perguntas, canônico×custom, alfândega) | `./SKILL.md` (SEL-001..005) |
| Enforcement regra→gate | frontmatter deste arquivo |
| Roteamento pós-decisão | `luminaris-orchestrator` (ORCH-002 STEP 0 é o resumo; esta skill é o formulário completo) |

## Estado

`draft` — ainda não avaliada em corrida comportamental. Promoção a `validated` exige eval
rodada (evals/evals.json cobre SEL-001..005 com casos de ativação e não-ativação) e
ratificação do dono. SG-005: draft não pode estar no path de descoberta da branch principal —
a promoção acontece antes do merge, nunca depois.

## Nota de origem

Destilada da auditoria de fluxo salão→fiscal de 2026-09-01 (conversa fluxo-salao-beleza):
critério das 4 perguntas, papéis 1/2 do motor, regra da alfândega e lente setorial
("quanto do operacional o auditor enxerga") — cada elemento verificado contra o código
(bridges, InventoryService, PayableService XOR, binding press, limites do preset).
