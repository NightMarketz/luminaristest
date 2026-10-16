---
id: "D-2026-10-16-W4-EXECUTA-E-FORKS-D2"
tipo: "decisao"
dominio: "plataforma"
titulo: "W4: executa autorizado; F-W4-4 (a) version + 409, F-W4-5 (b) expurgo em 7 dias — ambos contra a recomendação"
estado: "decided"
autorizacao: "dono, chat, 2026-10-16: \"Pode começar agora e disparar as sessões com brief autorizado\" + questionário do mesmo dia (F-W4-4, F-W4-5)"
atualizado: "2026-10-16"
---
# D-2026-10-16-W4-EXECUTA-E-FORKS-D2 — execução do W4 e os dois forks internos

**Estado:** `decided`
**Autorização:** dono, chat, 2026-10-16: *"Pode começar agora e disparar as sessões com brief autorizado"* — vale como
"executa" do [[W4]]. Merge **não** autorizado: cada PR termina com "— não mergear sem OK".
**BRIEF:** [`BE-INCR-INTERVIEW-SESSION-brief.md`](../../accounting/BE-INCR-INTERVIEW-SESSION-brief.md) (itens 9, 12 e 14).
**Antes:** [[D-2026-10-15-W4-SESSAO-ENTREVISTA]] (F-W4-1..3).

## Decisões (questionário, 2026-10-16)

| # | Fork | Decisão | Recomendação do BRIEF |
|---|---|---|---|
| 1 | F-W4-4 · turnos concorrentes da mesma sessão | **(a)** coluna `version` + update condicional; turno concorrente → 409 `INTERVIEW_SESSION_CONFLICT`. Muda o contrato público: OpenAPI documenta o 409 e o FE trata (mensagem i18n, sem perder a conversa) | (b) último a gravar vence |
| 2 | F-W4-5 · expurgo | **(b)** sessão expirada some em 7 dias (minimização LGPD — o `state` guarda texto livre do negócio); constante nomeada no `PurgeDeletedRecords`, coberta por teste | (a) 90 dias, mesmo job |
