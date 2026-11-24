"""Patch 11: correções de texto da revisão de conteúdo de 21/11/2026 (REVISAO-CONTEUDO-2026-11-21.md, R01 a R26).

Só texto e ramos de texto: nenhum número do CALC muda. Não toca nas frases de "meses iguais" (item 7, patches p10*).
Base: v46 (1795277394-6b76). Independe da ordem com os p10*, salvo se eles reescreverem um dos trechos abaixo
(o _pt.aplica falha com a contagem, e aí o trecho é reconferido).
Fontes: parecer-salao-sp-4-pessoas D14 (IN RFB 2.237 arts. 3º I e 6º § 2º II), D15 (Lei 9.250 art. 6º-A), D37 (Res. CGSN 140
art. 38-B), D39/D47/D55 (TFE); insumos-salao-sp D17 (Lei SP 6.374 art. 34) e D20 (RICMS art. 115 § 8º);
revisao-conteudo-simulador-salao D01 (Lei 12.592 arts. 1º-A e 1º-C); salao-lucro-real-adicoes-exclusoes (A.069, A.050).
Uso: python p11_revisao_conteudo.py <html>
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from _pt import aplica

R = []
# R01: 10% sobre o total
R.append(("com a retenção de 10% sobre o que passar de R$ 50 mil por mês a um sócio (Lei 9.250 art. 6º-A), em qualquer regime.",
          "com a retenção de 10% sobre o total pago no mês ao sócio que receber mais de R$ 50 mil no mês (Lei 9.250 art. 6º-A, red. Lei 15.270), em qualquer regime."))
R.append(("pode sair como lucro, sem retenção${",
          "pode sair como lucro, sem retenção até R$ 50 mil por mês a cada sócio${"))
# R02: 12% ou 4%
R.append(("<small>Para o Simples, SP usa 12% em qualquer origem (RICMS art. 115 § 8º).</small>",
          "<small>Para o Simples, SP usa 12% em qualquer origem, ou 4% no importado da Res. Senado 13/2012 (RICMS art. 115 § 8º).</small>"))
# R03: aviso dos requisitos separado por efeito
R.append(("   :`<div class=\"callout bad\"><b>${all.length-n} de ${all.length} itens faltando.</b> Sem contrato formalizado, ou com o parceiro em outra função, a lei considera o cabeleireiro empregado (art. 1º-C). Aí o cenário volta a ser o da CLT, com os encargos atrasados.</div>`}",
          "   :(()=>{const f=id=>{const e=all.find(k=>k.id===id);return!(e&&e.checked)}, vin=[\"c1\",\"c2\",\"c4\"].some(f), t=[];\n"
          "     // revisao-conteudo v1: o art. 1º-C só trata do contrato não formalizado e da função diferente; CNPJ, nota e retenção têm outro efeito\n"
          "     if(vin)t.push(\"Sem contrato formalizado e homologado, ou com o parceiro em outra função, a lei considera o profissional empregado (Lei 12.592 art. 1º-C). Aí o cenário volta a ser o da CLT, com os encargos atrasados.\");\n"
          "     if(f(\"c3\"))t.push(\"Sem CNPJ não nasce vínculo por isso, mas a cota do parceiro volta à receita do salão e paga DAS (Res. CGSN 140 art. 2º § 5º VI).\");\n"
          "     if(f(\"c5\")||f(\"c6\"))t.push(\"Nota com as duas cotas e retenção dos tributos são obrigações do salão (Lei 12.592 art. 1º-A § 3º; Res. CGSN 140 art. 59 §§ 2º e 3º); a falta não está entre os casos de vínculo do art. 1º-C.\");\n"
          "     return`<div class=\"callout ${vin?\"bad\":\"warn\"}\"><b>${all.length-n} de ${all.length} itens faltando.</b> ${t.join(\" \")}</div>`})()}"))
# R03: a ambiguidade "e" × "ou" vira pergunta; R10: subtítulo da aba 7
R.append(("\n    [\"Insumo estético aplicado no cliente e o crédito de CBS (2027)\",",
          "\n    [\"Parceria: quando nasce o vínculo\",c.parc||c.equipe.some(p=>PARC_OK.includes(p.f)),\"O art. 1º-C da Lei 12.592 liga os dois casos de vínculo com 'e' (I - sem contrato de parceria formalizado; e II - parceiro em função diferente da do contrato). O vínculo exige os dois juntos, ou basta um?\",\"A conta e a aba 4 usam a leitura segura: basta um. Pela letra, os incisos seriam cumulativos, o que reduz o risco do salão. Enquanto durar a parceria formalizada, não há relação de emprego (art. 1º-A § 11).\"],"
          "\n    [\"Insumo estético aplicado no cliente e o crédito de CBS (2027)\","))
R.append(("as respostas da pesquisa e os dois pontos com mais de uma leitura.",
          "as respostas da pesquisa e os pontos que ainda têm mais de uma leitura."))
# R19: gerente
R.append(("Assistente e recepcionista ficam de fora: são empregados.", "Assistente, recepcionista e gerente ficam de fora: são empregados."))
R.append(("Assistente e recepcionista ficam na CLT nos dois.", "Assistente, recepcionista e gerente ficam na CLT nos dois."))
R.append(("Assistente e recepcionista ficam na CLT (Lei 12.592 art. 1º-A).", "Assistente, recepcionista e gerente ficam na CLT (Lei 12.592 art. 1º-A)."))
# R04: DEFIS de 2026 é leitura
R.append(("\"substitui a DEFIS: art. 72 revogado e art. 38-B da Res. CGSN 140 (Res. CGSN 190)\"]",
          "\"substitui a DEFIS: art. 72 revogado e art. 38-B da Res. CGSN 140 (Res. CGSN 190)\"+(x.ano===\"2027\"?\"\":\". Para os dados de 2026 é leitura da pesquisa (o art. 38-B vale desde 01/01/2027): confirme com o contador se ainda vão na DEFIS\")]"))
# R05: NFS-e fora do Simples
R.append(("const cal=[[\"A cada serviço\",\"NFS-e pelo Emissor Nacional\",parc?\"com as duas cotas e o CNPJ do parceiro\":\"Res. CGSN 140 art. 59\"],",
          "const cal=[c.reg===\"PR\"||c.reg===\"RE\"?[\"A cada serviço\",\"NFS-e no emissor que a Prefeitura de SP exigir\",\"o Emissor Nacional é obrigatório só para o optante do Simples (Res. CGSN 140 art. 59 § 1º); confirme com o contador o emissor do regime normal\"]:[\"A cada serviço\",\"NFS-e pelo Emissor Nacional\",parc?\"com as duas cotas e o CNPJ do parceiro\":\"Res. CGSN 140 art. 59\"],"))
# R06: DCTFWeb sem CLT
R.append(("\"Sem empregado CLT: não há DCTFWeb de folha.\"",
          "\"Sem empregado CLT: a DCTFWeb segue mensal se houver pró-labore ou retenção de parceiro; sem nenhum fato gerador, vai a declaração sem movimento do 1º mês e depois fica dispensada (IN RFB 2.237 arts. 3º I e 6º § 2º II).\""))
# R07 e R08: textos que supõem o Simples
R.append(("Sem dependentes na conta. A parte patronal de 20% está no DAS.",
          "Sem dependentes na conta. ${c.reg===\"PR\"||c.reg===\"RE\"?\"A parte patronal de 20% vai na guia da folha, fora do DAS.\":\"A parte patronal de 20% está no DAS.\"}"))
R.append(("o IRRF de cada um; a parte patronal está no DAS (IN RFB 2.110 arts. 37 II e 41 I).",
          "o IRRF de cada um (IN RFB 2.110 arts. 37 II e 41 I). A parte patronal está no DAS no Simples; no Presumido e no Real são 20% em guia própria."))
R.append(("o INSS patronal de 20% já está dentro do DAS.",
          "no Simples, o INSS patronal de 20% já está dentro do DAS; no Presumido e no Real ele vem à parte."))
R.append(("O lucro que o Simples distribui aos sócios é isento de imposto de renda. Sem contabilidade, a lei põe um teto nessa isenção.",
          "O lucro distribuído aos sócios é isento de imposto de renda. Sem contabilidade, no Simples e no Presumido a lei põe um teto nessa isenção; no Real vale o lucro da escrituração."))
# R09: 32% fixo
R.append(("32% do que os clientes pagam", "32% do que os clientes pagam (em 2027, o percentual do campo da ficha)"))
R.append(("sobre a presunção de 32% (Lei 9.249", "sobre a presunção de 32%, ou a do campo de 2027 da ficha (Lei 9.249"))
R.append(("A conta usa 32%.", "A conta usa 32% (em 2027, o campo da ficha)."))
# R11 e R12: crédito da depreciação e das despesas em 2027
R.append(("no Lucro Real ela também sai do lucro tributável e dá crédito.",
          "no Lucro Real ela também sai do lucro tributável. Dá crédito de PIS/Cofins no Real de 2026 e, em 2027, de CBS e IBS no Presumido, no Real e no Simples com CBS e IBS por fora."))
R.append(("No Presumido de 2026 e no Simples ela não muda o imposto.",
          "No Presumido de 2026 e no Simples que paga tudo no DAS ela não muda o imposto."))
R.append(("com crédito de aluguel pago a empresa, energia e insumo do serviço (Lei 10.637 arts. 2º e 3º II, IV e IX; Lei 10.833 arts. 2º e 3º II, III e IV)",
          "com crédito de aluguel pago a empresa, energia, insumo do serviço e depreciação dos equipamentos (Lei 10.637 arts. 2º e 3º II, IV, VI e IX; Lei 10.833 arts. 2º e 3º II, III, IV e VI)"))
R.append(("Só pesa fora do Simples. Insumo,", "Só pesa fora do Simples e, em 2027, no Simples com CBS e IBS por fora. Insumo,"))
# R13: descrição da provisão de rescisão
R.append(("aviso prévio, 13º e férias do aviso, FGTS e multa de 40%.</small>",
          "aviso prévio, 13º e férias do aviso, FGTS, multa de 40%, trintídio de 1/12 e, sem REPIS, homologação.</small>"))
R.append(("(aviso prévio, 13º e férias do aviso, FGTS e multa de 40%)",
          "(aviso prévio, 13º e férias do aviso, FGTS, multa de 40%, trintídio e homologação)"))
R.append(("13º e férias dele, FGTS, multa de 40%\"+(q.resc.hom", "13º e férias dele, FGTS, multa de 40%, trintídio\"+(q.resc.hom"))
R.append(("\"Provisão de rescisão (aviso prévio, multa do FGTS)\"", "\"Provisão de rescisão (aviso, 13º e férias dele, FGTS, multa, trintídio)\"", 2))
# R14: quadro do LALUR só no Real
R.append(("(Lei 9.065 arts. 15 e 16), no quadro da aba Lucro.", "(Lei 9.065 arts. 15 e 16), no quadro da aba Lucro com a página no Lucro Real."))
R.append(("com as adições e exclusões da ficha (quadro do LALUR na aba Lucro).</p>",
          "com as adições e exclusões da ficha${c.reg===\"RE\"?\" (quadro do LALUR na aba Lucro)\":\"\"}.</p>"))
# R15 e R16: marca de grau e referências internas
R.append(("que não põe a condição do CNPJ (I).", "que não põe a condição do CNPJ (leitura da pesquisa)."))
R.append((" O Luminaris hoje lança o insumo como despesa na entrada da nota e não tem conta de custo dos serviços prestados: lacunas L-…-35d3 e L-…-f79c.", ""))
R.append(("Fontes e ambiguidades: dossiê pesquisas-legais/insumos-salao-sp (relatorio.md, D01 a D31).", "Fontes e ambiguidades: rodapé da página (dossiê dos insumos)."))
# R17: "Seguro + Social" e odontológico
R.append(("Telemedicina + Seguro Social da convenção", "Telemedicina e Seguro + Social da convenção"))
R.append(("\"Telemedicina, Seguro Social e odontológico\":\"Telemedicina + Seguro Social\"", "\"Telemedicina, Seguro + Social e odontológico\":\"Telemedicina e Seguro + Social\""))
R.append(("Cesta, telemedicina e Seguro Social da convenção", "Cesta, telemedicina, Seguro + Social e odontológico da convenção"))
R.append(("telemedicina e Seguro Social por empregado", "telemedicina e Seguro + Social por empregado"))
# R18: ICMS 25% × 18%
R.append(("exceto xampu 33.05.10; 18% para o resto", "exceto xampu 33.05.10 e desodorante 33.07.20; 18% para o resto"))
R.append(("Xampu (33.05.10), desodorante (33.07.20) e antissolar pagam 18% de ICMS",
          "Xampu (33.05.10), desodorante (33.07.20), antissolar e higiene bucal (33.06) pagam 18% de ICMS"))
# R20 e R26: citações completas
R.append(("(IN RFB 1.700 arts. 68 e 83)", "(IN RFB 1.700 arts. 68, 69 e 83; Lei 9.249 art. 13 II e III)"))
R.append(("\"Gastos pessoais do sócio (A.069)\"", "\"Gastos pessoais do sócio (A.069 e A.050)\""))
R.append((", em até 4 parcelas (Lei SP 13.477 art. 22 § 3º)", ", em até 4 parcelas: a SF aceita até 5, mas nenhuma pode ser menor que R$ 50 (página da SF; Lei SP 13.477 art. 22 § 3º)"))
R.append(("(Lei SP 13.647; tabela da SF)", "(Lei SP 13.477; limite da Lei SP 13.647; tabela da SF)"))
# R21: clareza
R.append(("nP===1?\"parceira\":\"parceiras\"", "nP===1?\"parceiro\":\"parceiros\""))
R.append(("Leis 7.418, 11.196, 11.482, 10.666 e 3.207", "Leis 7.418, 11.196, 11.482 e 3.207"))
R.append(("reduz o IRPJ e a CSLL em até ${R(q.irRE)} (15% + 9%, mais 10% de adicional acima de R$ 20 mil de lucro no mês; RIR art. 302 I)",
          "reduz o IRPJ e a CSLL em ${R(q.irRE)} (15% + 9%), ou até 34% com o adicional de 10% acima de R$ 20 mil de lucro no mês (RIR art. 302 I)"))
R.append(("A provisão de rescisão já entra sozinha como adição (A.178).</p>",
          "A provisão de rescisão já entra sozinha como adição (A.178). Os códigos A.nnn e E.nnn são as linhas das tabelas de adições (Anexo I) e exclusões (Anexo II) da IN RFB 1.700; a Parte B do LALUR guarda os saldos que passam de um período a outro, como o prejuízo a compensar.</p>"))

if __name__ == "__main__":
    aplica(sys.argv[1], R, "p11_revisao_conteudo")
