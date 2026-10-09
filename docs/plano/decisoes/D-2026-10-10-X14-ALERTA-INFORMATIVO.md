---
id: "D-2026-10-10-X14-ALERTA-INFORMATIVO"
tipo: "decisao"
dominio: "fiscal"
titulo: "X14: formato do alerta informativo do NFSE_DIVERGE_RECEITA (severity + motivoInformativo), caixa só com divergência, corte do documento municipal pela competência; base do DAS por recebimento fora"
estado: "decided"
autorizacao: "dono, chat, 2026-10-10: resposta à lacuna de spec do PR #603 — executa no mesmo PR, sem merge"
atualizado: "2026-10-10"
---
# D-2026-10-10-X14-ALERTA-INFORMATIVO — alerta informativo do X14

**Estado:** `decided`. **Autorização:** dono, chat, 2026-10-10. Responde à lacuna de spec do PR #603 (o formato do
"informativo com motivo" de F-PR4-10 (a) e F-PR4-12 (b), de D-2026-10-10-QUESTIONARIO-DONO). Nó: [[X14]].

## Cédulas

| # | Ponto | Decisão do dono |
|---|---|---|
| 1 | Formato do alerta | (c): o código fica estável, e o alerta ganha `severity: "INFO" \| "WARNING"` e `motivoInformativo: "DOCUMENTO_MUNICIPAL_TRANSIÇÃO" \| "REGIME_CAIXA"` (opcional; só vem com `severity = INFO`). DTO Zod, snapshot de shape e tipo do FE gerado |
| 2 | Optante pelo caixa | o `NFSE_DIVERGE_RECEITA` sai **só com divergência**, como `INFO` / `REGIME_CAIXA`. Sem divergência, nenhum alerta |
| 3 | Documento municipal | o corte vale pela **competência** da prestação: até 2026-10, `INFO` / `DOCUMENTO_MUNICIPAL_TRANSIÇÃO`; de 2026-11 em diante, `WARNING` (divergência regulamentar) |
| 4 | Base do DAS por recebimento | **fora** do PR #603: vai num BRIEF dedicado, ainda não pedido. Hoje, marcar CAIXA **não muda o cálculo** |

**Base legal do corte (item 3):** segundo a pesquisa trazida pelo dono no chat em 10/10, a Res. CGSN 191/2026 altera os
arts. 59 e 79 da Res. CGSN 140 e torna obrigatória a NFS-e no padrão nacional para ME/EPP a partir de 01/11/2026.
**Fonte do dono, não conferida:** o texto da Res. 191 não foi lido em normas.receita.fazenda.gov.br.

## Leituras do agente na execução (não decididas pelo dono; revisar no PR)

- O item 1 torna `severity` obrigatória em todo alerta. Os outros códigos ficam `WARNING`, o único valor não informativo.
- Caixa e competência até 2026-10 ao mesmo tempo: vale o motivo `REGIME_CAIXA`, porque o item 2 o fixa para o optante pelo caixa.
- MEI: sempre `WARNING`. O F-PR4-10 trata do alerta do ME/EPP, e o campo de caixa só é lido na montagem do ME/EPP.
