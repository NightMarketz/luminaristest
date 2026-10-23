---
id: "D-2026-10-23-IRRF-DISTRIBUICAO-LACUNAS"
tipo: "decisao"
dominio: "fiscal"
titulo: "IRRF-DISTRIBUICAO PR-2..PR-4: 4 lacunas de spec decididas (saldo de lucro, limite do JCP, crédito/TJLP, JCP pago)"
estado: "decided"
autorizacao: "dono, questionário na sessão de feature, 2026-10-23 (as 4 recomendadas); executa: dono, chat, 2026-10-23, \"Executa todas\""
atualizado: "2026-10-23"
---
# D-2026-10-23-IRRF-DISTRIBUICAO-LACUNAS — lacunas de spec do PR-2 ao PR-4

**Estado:** `decided`. **Autorização:** dono, questionário de 2026-10-23 na sessão de feature. Nó: [[IRRF-DISTRIBUICAO]].
BRIEF: [`BE-INCR-IRRF-DISTRIBUICAO-brief.md`](../../accounting/BE-INCR-IRRF-DISTRIBUICAO-brief.md). Forks anteriores:
[[D-2026-10-17-IRRF-DISTRIBUICAO-FORKS]].

## Cédulas

| # | Item do BRIEF | Lacuna | Escolha do dono (literal) | Recomendação | Diverge? |
|---|---|---|---|---|---|
| L-IRD-1 | 18 | Quais contas formam o "saldo de lucros acumulados + reservas de lucros" do aviso | "Plano padrão (Recomendado)" | idem | não |
| L-IRD-2 | 25 | Data do saldo no limite de 50% de lucros acumulados + reservas (IN 1.700 art. 75 § 2º II não fixa) | "Início do período (Recomendado)" | idem | não |
| L-IRD-3 | 22–24 | `dataCredito` fora do período e até quando a TJLP é exigida | "Dentro, TJLP até crédito (Recomendado)" | idem | não |
| L-IRD-4 | 30 | Como detectar "JCP pago (passivo já baixado)" no cancelamento | "Débito após o crédito (Recomendado)" | idem | não |

## Efeitos

- **L-IRD-1:** prefixos 2.3.1 (lucros acumulados) e 2.3.3 (reservas de lucros) do plano padrão + resultado (receita −
  despesa) do ano até a data, na PJ inteira (todas as unidades). Os lançamentos das distribuições e os estornos deles ficam
  fora do saldo, porque o bruto do ano já os conta. Funciona sem configurar o mapa do JCP.
- **L-IRD-2:** saldo no fim do dia anterior ao início do período de apuração (T0n ou o ano), sem o resultado corrente.
- **L-IRD-3:** `dataCredito` dentro do período (fora → 400). A TJLP é exigida do início do período até a `dataCredito`,
  os dias que o cálculo usa (L14, SC Cosit 45/2018). Substitui a leitura literal do item 22 ("todos os dias do período").
- **L-IRD-4:** qualquer débito na conta de JCP a pagar com data ≥ `dataCredito`, vindo de lançamento que não seja o próprio
  JCP nem o estorno dele, bloqueia o cancelamento com 409.
