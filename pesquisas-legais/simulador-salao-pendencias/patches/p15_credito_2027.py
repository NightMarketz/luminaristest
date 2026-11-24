"""Patch 15: uma convenção só para o crédito de CBS/IBS de 2027 (lacuna L-20261121-160217-967b; BRIEF-GRUPO-LACUNAS-2026-11-24 item 20b).

O consumo() de 2027 tirava da base o valor inteiro das despesas com crédito (crédito = cred × alíquota), como se o valor
digitado viesse sem tributo. O insumo (insumoCalc: v × a27/(1+a27)) e a depreciação (p04: depM/(1+a27)) tratam o valor
como pago, com CBS e IBS dentro. Este patch põe as despesas na mesma convenção: base a menos = cred/(1+a27), crédito =
cred × a27/(1+a27) (LC 214 art. 47). O fornecedor do Simples segue com o crédito igual ao percentual da nota (art. 47 § 9º II).
Com cred = 6.000 e a27 = 11,3%: crédito de R$ 609,16 por mês em PR27, RE27 e SR27, não R$ 678,00.
Base: v50 + p14. Uso: python p15_credito_2027.py <html>
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from _pt import aplica

R = [
    ("credB27=fdSN?(a27c>0?cred*Math.min(30,numP(x.fd27a))/100/a27c:0):cred,",
     "credB27=fdSN?(a27c>0?cred*Math.min(30,numP(x.fd27a))/100/a27c:0):cred/(1+a27c),"),
    ("  // (LC 214 art. 47 § 9º II; Res. CGSN 140 art. 58 §§ 4º e 5º); (c) presunção de 2027",
     "  // (LC 214 art. 47 § 9º II; Res. CGSN 140 art. 58 §§ 4º e 5º); do fornecedor do regime regular, o valor digitado é o pago, com CBS e IBS dentro:\n"
     "  // crédito = cred × a27/(1+a27), a convenção do insumo (insumoCalc) e da depreciação (credito-2027 v1); (c) presunção de 2027"),
    ("O insumo do serviço tem campo próprio e já entra no crédito: não some aqui.</small>",
     "O insumo do serviço tem campo próprio e já entra no crédito: não some aqui. Em 2027, digite o valor pago, com CBS e IBS dentro: o crédito é valor × alíquota ÷ (1 + alíquota), como no insumo.</small>"),
    ("Insumo, pró-labore, taxa do cartão e equipe têm campo próprio: não repita aqui.</span>",
     "Insumo, pró-labore, taxa do cartão e equipe têm campo próprio: não repita aqui. O valor é o pago, com CBS e IBS dentro: em 2027 o crédito é valor × alíquota ÷ (1 + alíquota).</span>"),
]

if __name__ == "__main__":
    aplica(sys.argv[1], R, "p15_credito_2027")
