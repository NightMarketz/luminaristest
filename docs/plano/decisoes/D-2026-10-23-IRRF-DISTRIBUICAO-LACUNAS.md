---
id: "D-2026-10-23-IRRF-DISTRIBUICAO-LACUNAS"
tipo: "decisao"
dominio: "fiscal"
titulo: "IRRF-DISTRIBUICAO PR-2..PR-4: 6 lacunas de spec decididas (saldo de lucro, limite do JCP, crédito/TJLP, JCP pago, 409 da confirmação, Parte A)"
estado: "decided"
autorizacao: "dono, questionário na sessão de feature, 2026-10-23 (as 6 recomendadas, em duas rodadas); executa: dono, chat, 2026-10-23, \"Executa todas\""
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
| L-IRD-5 | 27 | O 409 da confirmação compara o recálculo com o quê | "Hash da prévia (Recomendado)" | idem | não |
| L-IRD-6 | 29 | IND_RELACAO e conta das linhas da Parte A (o M312 exige relação contábil) | "Conta debitada (Recomendado)" | idem | não |

## Efeitos

- **L-IRD-1:** prefixos 2.3.1 (lucros acumulados) e 2.3.3 (reservas de lucros) do plano padrão + resultado (receita −
  despesa) do ano até a data, na PJ inteira (todas as unidades). Os lançamentos das distribuições e os estornos deles ficam
  fora do saldo, porque o bruto do ano já os conta. Funciona sem configurar o mapa do JCP.
- **L-IRD-2:** saldo no fim do dia anterior ao início do período de apuração (T0n ou o ano), sem o resultado corrente.
- **L-IRD-3:** `dataCredito` dentro do período (fora → 400). A TJLP é exigida do início do período até a `dataCredito`,
  os dias que o cálculo usa (L14, SC Cosit 45/2018). Substitui a leitura literal do item 22 ("todos os dias do período").
- **L-IRD-4:** qualquer débito na conta de JCP a pagar com data ≥ `dataCredito`, vindo de lançamento que não seja o próprio
  JCP nem o estorno dele, bloqueia o cancelamento com 409.
- **L-IRD-5:** a prévia devolve `previaSha256` (hash do cálculo inteiro + proveniência dos parâmetros); a confirmação o
  reenvia e o serviço recalcula dentro da tx: hash diferente → 409 `PREVIA_DESATUALIZADA`.
- **L-IRD-6:** IND_RELACAO 2 com a conta debitada no lançamento do JCP (despesa de JCP em `DESPESA`; a conta de PL escolhida
  em `PL`), vínculo M312 ao lançamento e histórico fixo do sistema.
