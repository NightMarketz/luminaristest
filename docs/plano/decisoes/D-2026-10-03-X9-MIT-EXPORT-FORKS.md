---
id: "D-2026-10-03-X9-MIT-EXPORT-FORKS"
tipo: "decisao"
dominio: "fiscal"
titulo: "Ratificação por questionário: forks F-MIT-1..3 do BRIEF BE-INCR-MIT-EXPORT (X9)"
estado: "decided"
autorizacao: "dono, chat, 2026-10-03: \"Ratifica os F-MIT-1..3 por questionário agora\" — só decisão, sem 'executa'"
atualizado: "2026-10-03"
---
# D-2026-10-03-X9-MIT-EXPORT-FORKS — cédulas da ratificação do BRIEF do X9

**Estado:** `decided` (3/3, todos na recomendação).
**Autorização:** dono, chat, 03/10/2026: *"Ratifica os F-MIT-1..3 por questionário agora"*. As respostas vieram pelo
AskUserQuestion, num lote só: o agente apresentou com contexto e recomendação, e o dono decidiu.
**Não é "executa"** (ORCH-006). O código do [[X9]] continua dependendo do PR-2 da Fase A do [[X7]].

Documento dos forks: [`BE-INCR-MIT-EXPORT-brief.md`](../../accounting/BE-INCR-MIT-EXPORT-brief.md) §3.

### F-MIT-1 — Fatiamento e ordem
- **Opções:** (a) 4 PRs seriais, todos depois do PR-2 da Fase A do X7 (**recomendada**) · (b) igual, com a matriz
  adiantada · (c) 1 PR depois de X7-A, X7-B e X8.
- **Resposta literal:** *"(a) 4 PRs na ordem (Recomendado)"* → ✅ (a). PR-1 itens 1–9 e 13–14; PR-2 itens 10–12 e
  15–17; PR-3 item 18 (depois do PR-2 do X8); PR-4 item 19 (depois do PR-2 da Fase B do X7).

### F-MIT-2 — Real anual sem estimativa do mês confirmada
- **Opções:** (a) 422 (**recomendada**) · (b) `BalancoLucroReal: false` com aviso.
- **Resposta literal:** *"(a) 422 (Recomendado)"* → ✅ (a).

### F-MIT-3 — DCTFWeb da PJ inativa na matriz
- **Opções:** (a) `CONDICIONAL`, IN 2.237 art. 4º + art. 6º § 2º II (**recomendada**) · (b) `OBRIGATORIA` ·
  (c) `NAO_SE_APLICA`.
- **Resposta literal:** *"(a) CONDICIONAL (Recomendado)"* → ✅ (a).

**BRIEF BE-INCR-MIT-EXPORT: 3/3 forks ratificados, todos na recomendação.**
