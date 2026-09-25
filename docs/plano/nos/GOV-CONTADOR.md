---
id: "GOV-CONTADOR"
tipo: "subno"
dominio: "plataforma"
titulo: "Governança do contador responsável (CRC, política versionada, reabertura de período)"
estado: "planned"
estado_detalhe: "Fase 5 do plano pós-contador — PROPOSTO. **PRE-ADR ESCRITO 27/09** (`PRE-ADR-ACCOUNTANT-GOVERNANCE.md`, Proposed, 6 forks PENDENTES) com o inventário 5.1 medido: o razão já é imutável e tem proveniência, as 3 lacunas são de POLICY — não existe papel de contador (`Role {USER,ADMIN}`), qualquer autenticado reabre período (`canClosePeriod = !!actorUserId`) e assina a revisão. Vira nó de régua SE o dono ratificar; até lá segue subno. NÃO bloqueia o H1 (1ª passada com declarante fictício, G-2)"
depende_de: ["[[C11]]", "[[Z0-a]]"]
ancora_sdd: "§III.1 (fora da régua — PROPOSTO)"
atualizado: "2026-09-27"
---
# GOV-CONTADOR — Governança do contador responsável (CRC, política versionada, reabertura de período)

**Estado:** `planned` — Fase 5 do plano pós-contador — PROPOSTO. **PRE-ADR ESCRITO 27/09** (`PRE-ADR-ACCOUNTANT-GOVERNANCE.md`, Proposed, 6 forks PENDENTES) com o inventário 5.1 medido: o razão já é imutável e tem proveniência, as 3 lacunas são de POLICY — não existe papel de contador (`Role {USER,ADMIN}`), qualquer autenticado reabre período (`canClosePeriod = !!actorUserId`) e assina a revisão. Vira nó de régua SE o dono ratificar; até lá segue subno. NÃO bloqueia o H1 (1ª passada com declarante fictício, G-2)  
**Autorização:** **falta** para código. O PRE-ADR foi escrito sob a autorização do dono de 27/09 ("1. segue o caminho"), que cobre **o caminho do README** (PRE-ADR → ratificação → nó), não implementação  
**Depende de:** [[C11]], [[Z0-a]]  
**Desbloqueia:** —  
**Âncora no SDD consolidado:** §III.1 (fora da régua — PROPOSTO)

## Docs

- [`docs/adr/PRE-ADR-ACCOUNTANT-GOVERNANCE.md`](../../adr/PRE-ADR-ACCOUNTANT-GOVERNANCE.md) — **Proposed 27/09**: inventário 5.1 com `arquivo:linha` + proposta + 6 forks PENDENTES (F-GOV-1..6)
- [`docs/accounting/PLANO-POS-CONTADOR-2026-09-23.md`](../../accounting/PLANO-POS-CONTADOR-2026-09-23.md) — Fase 5 (passos 5.1–5.2)

## Cadeia (do plano)

1. **5.1** inventário do que já existe: imutabilidade/estorno (ACC-*), trava de período (quem reabre hoje?), `SourceDocument` por lançamento, papéis/RBAC — saída = tabela existe × falta com `arquivo:linha`
2. **5.2** BRIEF `BE-INCR-ACCOUNTANT-GOVERNANCE`: papel "contador responsável" com CRC; parâmetros de política versionados com aprovação; reabertura de período só pelo contador; bloqueio de alteração pelo operador do fornecedor; login do contador (cresce o [[C11]])

## Fork pendente

- **F-GOV-1** — consulta formal ao CRC-SP sobre a linha software × serviço contábil. **Decisão do dono, fora do código.**
  Recomendação do plano: fazer antes de vender "com contador incluso". Cruza com [[Z0-a]].
