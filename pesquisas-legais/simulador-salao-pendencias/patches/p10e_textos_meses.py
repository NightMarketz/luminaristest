"""Patch 10e: item 7, textos (BRIEF-ITEM7-MESES §4 "Textos" e §6).

Frases que diziam só "meses iguais" passam a valer nos dois modos: as fixas ganham a ressalva do bloco "Meses do ano";
as de render() mudam só com os meses ligados (c.am). Rodapé com o dossiê salao-trimestre-adicional-irpj e uma resposta nova na aba 7.
Uso: python p10e_textos_meses.py <html>   (depois do p10d)
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from _pt import aplica

R = []
R.append(("Compensa até 30% do lucro ajustado (Lei 9.065 art. 15); com meses iguais, a conta usa até 1/12 do saldo por mês.</small>",
          "Compensa até 30% do lucro ajustado (Lei 9.065 art. 15); com meses iguais, a conta usa até 1/12 do saldo por mês. Com os meses do ano variando (bloco \"Meses do ano\"), consome o saldo em ordem, até 30% de cada trimestre, ou do ano no Real por estimativa.</small>"))
R.append(("<div>A conta supõe receita igual nos 12 meses e não inclui",
          "<div>A conta supõe receita igual nos 12 meses, salvo quando o bloco \"Meses do ano\" da ficha traz sazonalidade ou a receita de cada mês, e não inclui"))
R.append(("A gratificação a administradores é adição só no IRPJ; a CSLL não sai da base do IRPJ. Com meses iguais, o trimestre e a estimativa mensal dão o mesmo.</li>",
          "A gratificação a administradores é adição só no IRPJ; a CSLL não sai da base do IRPJ. Com meses iguais, o trimestre e a estimativa mensal dão o mesmo imposto no ano. Com os meses do ano variando, o IRPJ e a CSLL saem por trimestre ou pelo lucro real do ano com estimativas (seletor do bloco \"Fora do Simples\"), com adicional acima de R$ 20 mil × os meses do período (Lei 9.249 art. 3º § 1º; Lei 9.430 arts. 1º e 2º); no Presumido, sempre por trimestre (art. 25).</li>"))
R.append(("A média sai dos campos de receita desta aba; vazios, supõem meses iguais ao da ficha.\"",
          "A média sai dos campos de receita desta aba; vazios, \"+(c.am?\"seguem o perfil do bloco \\\"Meses do ano\\\" da ficha\":\"supõem meses iguais ao da ficha\")+\".\"", 2))
R.append(("a comparação de regimes segue com 12 × o mês. \"",
          "a comparação de regimes segue com \"+(c.am?\"o ano pelo perfil dos meses, sem o valor digitado\":\"12 × o mês\")+\". \""))
R.append(("        <div>Lucro Real: dossiê <span class=\"num\">pesquisas-legais/salao-lucro-real-adicoes-exclusoes</span>",
          "        <div>Meses do ano: dossiê <span class=\"num\">pesquisas-legais/salao-trimestre-adicional-irpj</span> (21/11/2026): Lei 9.249 art. 3º § 1º, Lei 9.430 arts. 1º, 2º, 3º, 5º, 6º, 25 e 28, Lei 8.981 art. 35; RBT12 de cada mês pela janela da LC 123 art. 18 § 1º (em 2027, LC 214 art. 517); compensação por período pela Lei 9.065 arts. 15 e 16.</div>\n"
          "        <div>Lucro Real: dossiê <span class=\"num\">pesquisas-legais/salao-lucro-real-adicoes-exclusoes</span>"))
R.append(("    [\"FPAS do salão\",",
          "    [\"Adicional do IRPJ com meses diferentes\",\"Incide sobre o que passar de R$ 20 mil vezes os meses do período: R$ 60 mil no trimestre e R$ 240 mil no lucro real do ano, por estimativa. Com a receita concentrada em um trimestre, o adicional sobe; com meses iguais, dá o mesmo que R$ 20 mil por mês.\",\"Lei 9.249 art. 3º § 1º; Lei 9.430 arts. 1º, 2º e 25\"],\n"
          "    [\"FPAS do salão\","))

if __name__ == "__main__":
    aplica(sys.argv[1], R, "p10e")
