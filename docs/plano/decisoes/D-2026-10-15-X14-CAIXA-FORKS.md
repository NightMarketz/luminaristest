---
id: "D-2026-10-15-X14-CAIXA-FORKS"
tipo: "decisao"
dominio: "fiscal"
titulo: "X14-CAIXA: caixa completo para 2026 apesar do fim do regime (Res. CGSN 190), transição pendente de contador, forks F-CX-1..7 ratificados"
estado: "decided"
autorizacao: "dono, chat, 2026-10-15, questionário em três rodadas na sessão de planejamento do BRIEF (sem 'executa')"
atualizado: "2026-10-15"
---
# D-2026-10-15-X14-CAIXA-FORKS — escopo e forks do BRIEF do X14-CAIXA

**Estado:** `decided`. **Autorização:** dono, chat, 2026-10-15. **Nenhuma cédula dá `executa`.** Nó: [[X14-CAIXA]].
BRIEF: [`BE-INCR-SIMPLES-CAIXA-brief.md`](../../accounting/BE-INCR-SIMPLES-CAIXA-brief.md).

## Contexto apresentado ao dono

A Res. CGSN 190/2026 (DOU 10/08/2026, efeitos em 01/01/2027) revoga os arts. 16 § 1º, 19, 20, 77 e 78 da Res. 140,
e a base do DAS passa a ser só a receita auferida. O caixa acaba em 31/12/2026. Hoje o sistema calcula o DAS de quem
está no CAIXA por competência, sem alerta bloqueante. Dossiê: `pesquisas-legais/simples-regime-caixa/relatorio.md`.

## Cédulas

| # | Ponto | Escolha do dono (literal) | Recomendação | Diverge? |
|---|---|---|---|---|
| E1 | Escopo do BRIEF | "Caixa completo para 2026" | Guarda e encerrar | **sim** |
| E2 | Transição dez/2026 (A1) | "Registrar como pendente (Recomendado)" | idem | não |
| F-CX-1 | Fonte do recebimento | "(a) Tabela própria (Recomendado)" | (a) | não |
| F-CX-2 | Dia do recebimento no cartão | "(c) D+N por meio" | (a) dia da venda + INFO | **sim** |
| F-CX-2.1 | Onde fica o D+N | "No perfil; sem prazo = 400 (Recomendado)" | idem | não |
| F-CX-3 | Exclusão do Simples | "(a) Campo no perfil (Recomendado)" | (a) | não |
| F-CX-4 | Valor devolvido | "(a) Valor da devolução (Recomendado)" | (a) | não |
| F-CX-5 | Incobráveis | "(a) Tabela própria (Recomendado)" | (a) | não |
| F-CX-6 | Conferência NFS-e no caixa | "(a) Com a auferida (Recomendado)" | (a) | não |
| F-CX-7 | Art. 20 IV (impedimento) | "(a) Calcular o ICMS/ISS" | (b) alerta com o valor | **sim** |

## Efeitos

- **F-CX-6** substitui, para o regime de caixa, o ramo INFO/`REGIME_CAIXA` de [[D-2026-10-10-X14-ALERTA-INFORMATIVO]].
  O código `REGIME_CAIXA` continua no enum, sem emissor.
- **E2 / A2** viram perguntas ao contador (BRIEF §5). O item do art. 20 II b para Y = 2026 fica parado até a
  resposta.
