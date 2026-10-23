---
id: "D-2026-10-23-IBS-CBS-PR5-LACUNAS"
tipo: "decisao"
dominio: "fiscal"
titulo: "PR-5 do IBS-CBS-2027: vencimento da CBS publicado (Dec. 12.955 art. 45), inativa obrigatória, saldo ≤ 0 vira 0 com aviso, job de recálculo só avisa"
estado: "decided"
autorizacao: "dono, chat, 2026-10-23: \"Executa todas\" (lista cujo item 1 era o PR-5 do IBS-CBS-2027) + questionário de lacunas na mesma sessão: vencimento \"CBS publicada (Recomendado)\"; inativa \"OBRIGATORIA (Recomendado)\"; saldo ≤ 0 \"0 + aviso (Recomendado)\"; recálculo \"Só aviso (Recomendado)\""
atualizado: "2026-10-23"
---
# D-2026-10-23-IBS-CBS-PR5-LACUNAS

Lacunas que a sessao-feature achou ao abrir o PR-5 ([[IBS-CBS-2027]], BRIEF itens 21–24), antes de qualquer código.
Verificação legal de 23/10: `pesquisas-legais/verif-2026-10-23-ibs-cbs-vencimento` (Decreto 12.955 no Planalto compilado).
O texto da emenda está em `docs/accounting/BE-INCR-IBS-CBS-2027-brief.md`, seção "EMENDA PR-5 (23/10)".

| Lacuna | Resposta do dono (literal) | Efeito |
|---|---|---|
| Item 22: o BRIEF manda deixar `IBS_CBS/VENCIMENTO` em DRAFT até a P-IBS-5, mas o Dec. 12.955 art. 45 (lido em 23/10) já fixa o vencimento da CBS: último dia útil do mês seguinte, pelo calendário do domicílio da matriz | "CBS publicada (Recomendado)" | Linha `IBS_CBS/CBS/VENCIMENTO` PUBLISHED (`valorTexto = ULTIMO_DIA_UTIL_MES_SEGUINTE`). O dia não útil é sábado, domingo ou feriado `FERIADO_NACIONAL`/`FERIADO_LOCAL` do `codMun` da unidade, usado no lugar da matriz. `IBS_CBS/IBS/VENCIMENTO` fica DRAFT sem valor ⇒ `vencimento: null` + aviso |
| Item 21: toda linha `OBRIGACAO_REGIME` exige o status da PJ inativa | "OBRIGATORIA (Recomendado)" | PRESUMIDO/REAL inativos = OBRIGATORIA (Dec. 12.955 art. 44 § 6º, sem exceção para PJ sem movimento); SIMPLES/MEI = NAO_SE_APLICA |
| Item 22: saldo − split ≤ 0 (saldo credor, ou split maior que o saldo; art. 27 § 1º devolve o excesso) | "0 + aviso (Recomendado)" | `saldoARecolherCents = 0` com aviso `SALDO_CREDOR` ou `SPLIT_EXCEDENTE` |
| Item 24: o X7/X8 reconfirmam sozinhos; no IBS/CBS a tabela só entra na conferência e na antecipação | "Só aviso (Recomendado)" | Linha `IBS_CBS` (menos VENCIMENTO) publicada/revogada ⇒ `avisoParametroLegal` nas apurações CONFIRMED vivas do tributo cujo mês ela alcança. Nada é reconfirmado |

Riscos registrados no dossiê (§4): município da unidade × domicílio da matriz (PJ com unidades em municípios diferentes) e
o sábado tratado como dia não útil. A pergunta vai ao contador junto da P-IBS-5.

Não há merge.
