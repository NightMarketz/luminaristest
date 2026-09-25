---
id: "GOV-CONTADOR"
tipo: "subno"
dominio: "plataforma"
titulo: "Governança do contador responsável (CRC, política versionada, reabertura de período)"
estado: "planned"
estado_detalhe: "Fase 5 do plano pós-contador — PROPOSTO, o maior e o mais de produto. Pelo README do vault, só vira nó de régua depois de PRE-ADR ratificado; fica como subno fora da régua até lá. NÃO bloqueia o H1 (1ª passada com declarante fictício, G-2)"
depende_de: ["[[C11]]", "[[Z0-a]]"]
ancora_sdd: "§III.1 (fora da régua — PROPOSTO)"
atualizado: "2026-09-25"
---
# GOV-CONTADOR — Governança do contador responsável (CRC, política versionada, reabertura de período)

**Estado:** `planned` — Fase 5 do plano pós-contador — PROPOSTO, o maior e o mais de produto. Pelo README do vault, só vira nó de régua depois de PRE-ADR ratificado; fica como subno fora da régua até lá. NÃO bloqueia o H1 (1ª passada com declarante fictício, G-2)  
**Autorização:** **falta** — não roteia sem autorização citável do dono (ORCH-006). O plano pede "planeja a governança"  
**Depende de:** [[C11]], [[Z0-a]]  
**Desbloqueia:** —  
**Âncora no SDD consolidado:** §III.1 (fora da régua — PROPOSTO)

## Docs

- [`docs/accounting/PLANO-POS-CONTADOR-2026-09-23.md`](../../accounting/PLANO-POS-CONTADOR-2026-09-23.md) — Fase 5 (passos 5.1–5.2)

## Cadeia (do plano)

1. **5.1** inventário do que já existe: imutabilidade/estorno (ACC-*), trava de período (quem reabre hoje?), `SourceDocument` por lançamento, papéis/RBAC — saída = tabela existe × falta com `arquivo:linha`
2. **5.2** BRIEF `BE-INCR-ACCOUNTANT-GOVERNANCE`: papel "contador responsável" com CRC; parâmetros de política versionados com aprovação; reabertura de período só pelo contador; bloqueio de alteração pelo operador do fornecedor; login do contador (cresce o [[C11]])

## Fork pendente

- **F-GOV-1** — consulta formal ao CRC-SP sobre a linha software × serviço contábil. **Decisão do dono, fora do código.**
  Recomendação do plano: fazer antes de vender "com contador incluso". Cruza com [[Z0-a]].
