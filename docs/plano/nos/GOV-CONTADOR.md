---
id: "GOV-CONTADOR"
tipo: "subno"
dominio: "plataforma"
titulo: "Governança do contador responsável (CRC, política versionada, reabertura de período)"
estado: "planned"
estado_detalhe: "Fase 5 do plano pós-contador — PROPOSTO. **PRE-ADR ESCRITO 27/09** (`PRE-ADR-ACCOUNTANT-GOVERNANCE.md`, Proposed, 6 forks PENDENTES) com o inventário 5.1 medido: o razão já é imutável e tem proveniência, as 3 lacunas são de POLICY — não existe papel de contador (`Role {USER,ADMIN}`), qualquer autenticado reabre período (`canClosePeriod = !!actorUserId`) e assina a revisão. Vira nó de régua SE o dono ratificar; até lá segue subno. NÃO bloqueia o H1 (1ª passada com declarante fictício, G-2) · 28/09: BRIEF BE-INCR-CRC-CFC-VALIDACAO (conferir no CFC se o contador está ativo; API oficial aberta por CPF) — 4 forks pendentes, recomendação: depois do M2 · 29/09: forks ratificados — F-GOV-2 a · 3 a · 4 a · 5 a · 6 b · F-V1 c · V2 a · V3 b · V4 a; escopo inclui openPeriod (2º caminho de reabertura) e configurações/imobilizado na mesma policy. F-GOV-1 (CRC-SP) é do dono · 02/10: F-GOV-7..11 ratificados por questionário — 7 a+ (9 handlers), 8 a reforçada (aceite + declaração de contrato), 9 a (CRC tem de bater), 10 a; F-GOV-11 (a) contra a recomendação: a atribuição ativa governa tudo, sem responsibleFrom. Nenhum fork do BRIEF pendente; F-GOV-1 segue do dono; sem 'executa'"
depende_de: ["[[C11]]", "[[Z0-a]]"]
ancora_sdd: "§III.1 (fora da régua — PROPOSTO)"
autorizacao: "dono, 2026-09-29: \"Ratificar recomendações\" — PLANEJAR o BRIEF BE-INCR-ACCOUNTANT-GOVERNANCE (sem 'executa')"
perfil_previsto: "opus-medio"
perfil_evidencia: "regra 1 não casa (F-GOV-7..11 ratificados 02/10; F-GOV-1 é consulta externa do dono, não fork do BRIEF); regra 2: migração aditiva (accountant_assignments) + gate de reabertura de período dentro da tx, CAS do status. O BRIEF CRC-CFC-VALIDACAO fica para depois do M2 (F-V1 c)"
atualizado: "2026-10-02"
---
# GOV-CONTADOR — Governança do contador responsável (CRC, política versionada, reabertura de período)

**Estado:** `planned` — Fase 5 do plano pós-contador — PROPOSTO. **PRE-ADR ESCRITO 27/09** (`PRE-ADR-ACCOUNTANT-GOVERNANCE.md`, Proposed, 6 forks PENDENTES) com o inventário 5.1 medido: o razão já é imutável e tem proveniência, as 3 lacunas são de POLICY — não existe papel de contador (`Role {USER,ADMIN}`), qualquer autenticado reabre período (`canClosePeriod = !!actorUserId`) e assina a revisão. Vira nó de régua SE o dono ratificar; até lá segue subno. NÃO bloqueia o H1 (1ª passada com declarante fictício, G-2) · 28/09: BRIEF BE-INCR-CRC-CFC-VALIDACAO (conferir no CFC se o contador está ativo; API oficial aberta por CPF) — 4 forks pendentes, recomendação: depois do M2 · 29/09: forks ratificados — F-GOV-2 a · 3 a · 4 a · 5 a · 6 b · F-V1 c · V2 a · V3 b · V4 a; escopo inclui openPeriod (2º caminho de reabertura) e configurações/imobilizado na mesma policy. F-GOV-1 (CRC-SP) é do dono · 02/10: F-GOV-7..11 ratificados por questionário — 7 a+ (9 handlers), 8 a reforçada (aceite + declaração de contrato), 9 a (CRC tem de bater), 10 a; F-GOV-11 (a) contra a recomendação: a atribuição ativa governa tudo, sem responsibleFrom. Nenhum fork do BRIEF pendente; F-GOV-1 segue do dono; sem 'executa'  
**Autorização:** dono, 2026-09-29: "Ratificar recomendações" — PLANEJAR o BRIEF BE-INCR-ACCOUNTANT-GOVERNANCE (sem 'executa')  
**Depende de:** [[C11]], [[Z0-a]]  
**Desbloqueia:** —  
**Âncora no SDD consolidado:** §III.1 (fora da régua — PROPOSTO)

## Docs

- [`docs/adr/PRE-ADR-ACCOUNTANT-GOVERNANCE.md`](../../adr/PRE-ADR-ACCOUNTANT-GOVERNANCE.md) — **Proposed 27/09**: inventário 5.1 com `arquivo:linha` + proposta + 6 forks PENDENTES (F-GOV-1..6)
- [`docs/accounting/PLANO-POS-CONTADOR-2026-09-23.md`](../../accounting/PLANO-POS-CONTADOR-2026-09-23.md) — Fase 5 (passos 5.1–5.2)
- [`BE-INCR-CRC-CFC-VALIDACAO-brief.md`](../../accounting/BE-INCR-CRC-CFC-VALIDACAO-brief.md) — conferir no CFC se o contador está ativo (28/09; F-V1..F-V4 pendentes; recomendação: depois do [[M2]]). Relacionado: [[CRC-CFC]] (máscara do número), [[D-2026-09-28-CRC-CFC-SEED-UNIDADE-E-ORDEM]]
- [`BE-INCR-ACCOUNTANT-GOVERNANCE-brief.md`](../../accounting/BE-INCR-ACCOUNTANT-GOVERNANCE-brief.md) — **BRIEF 29/09** (passo 5.2, sob os forks ratificados em 29/09): `AccountantAssignment` com aceite e vigência, os 2 caminhos de reabertura (`openPeriod` + `reopenPeriod`) e sign-off/reject com gate dentro da tx, CAS no `setStatus`, errata do PRE-ADR (`:34` = `seedYear`; máscara CRC). 5 forks novos (F-GOV-7..11) — **✅ ratificados 02/10** ([[D-2026-10-02-GOV-CONTADOR-FORKS]]; 11 → a, contra a recomendação), ancorados em lei a pedido do dono (§5.1: CC, DL 9.295, Res. CFC 1.590, NBC PG 01, ITG 2000, Manual ECD). Código exige "executa"

## Cadeia (do plano)

1. **5.1** inventário do que já existe: imutabilidade/estorno (ACC-*), trava de período (quem reabre hoje?), `SourceDocument` por lançamento, papéis/RBAC — saída = tabela existe × falta com `arquivo:linha`
2. **5.2** BRIEF `BE-INCR-ACCOUNTANT-GOVERNANCE`: papel "contador responsável" com CRC; parâmetros de política versionados com aprovação; reabertura de período só pelo contador; bloqueio de alteração pelo operador do fornecedor; login do contador (cresce o [[C11]])

## Fork pendente

- **F-GOV-1** — consulta formal ao CRC-SP sobre a linha software × serviço contábil. **Decisão do dono, fora do código.**
  Recomendação do plano: fazer antes de vender "com contador incluso". Cruza com [[Z0-a]].

## Fold 02/10 — ratificação

- [[D-2026-10-02-GOV-CONTADOR-FORKS]]: F-GOV-7 (a+), 8 (a) reforçada, 9 (a), 10 (a) na recomendação; **F-GOV-11 (a)**
  contra a recomendação (b). A atribuição ativa governa a reabertura de qualquer período; sem `responsibleFrom`. Risco
  declarado no BRIEF §5.3: o dono que encerra a atribuição reabre sozinho os períodos que o contador cobriu. Não é
  "executa".
