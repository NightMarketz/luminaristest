"""Patch 09: item 9, três premissas de 2027 fora do Simples (dossiê pesquisas-legais/salao-2027-premissas-fora-simples).

(a) "% da CBS/IBS repassada ao preço" (vazio = 0, preço igual ao de 2026): no Presumido e no Real de 2027 a receita de serviços
    vira servLei × (1 + repasse × (CBS + IBS)). Simples e Simples com CBS/IBS à parte ficam com o preço de 2026 (letra da decisão: "fora do Simples").
(b) Fornecedores das despesas com crédito: regime regular (CBS/IBS destacados, LC 214 art. 47) ou Simples (crédito = o percentual de CBS/IBS
    informado na nota, LC 214 art. 47 § 9º II; Res. CGSN 140 art. 58 §§ 4º e 5º, red. Res. CGSN 190). Vale em SR, PR e RE de 2027.
(c) Presunção do IRPJ e da CSLL do Presumido em 2027: padrão 32% (Lei 9.249 arts. 15 § 1º III "a" e 20 I); vazio = 32%.
Uso: python p09_premissas_2027.py <html>   (depois do p06)
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from _pt import aplica

R = []
# ficha: três campos no bloco "Fora do Simples"
R.append(('11,3% é o cálculo do TCU, ainda sem resolução do Senado. A CBS de 2027 é essa alíquota menos 0,1 ponto (LC 214 art. 347).</small></div>\n',
          '11,3% é o cálculo do TCU, ainda sem resolução do Senado. A CBS de 2027 é essa alíquota menos 0,1 ponto (LC 214 art. 347).</small></div>\n'
          '        <div class="fld"><label for="f_rep27">CBS e IBS de 2027 repassados ao preço</label><div class="in"><input id="f_rep27" type="number" min="0" max="100" step="10" style="padding-left:10px"><span>% do tributo</span></div><small>No Presumido e no Real de 2027, quanto da CBS e do IBS o salão põe no preço do serviço: 100% sobe o preço pela alíquota inteira. Vazio: o preço fica o de 2026. No Simples, com ou sem a opção pelo regime regular, a conta mantém o preço de 2026.</small></div>\n'
          '        <div class="fld"><label for="f_fd27">Fornecedores das despesas com crédito em 2027</label><select class="das-sel" id="f_fd27"><option value="REG">Regime regular (destacam CBS e IBS)</option><option value="SN">Optantes pelo Simples</option></select><small>O fornecedor do regime regular destaca a CBS e o IBS na nota (LC 214 art. 47). O do Simples dá crédito só do que paga no DAS (art. 47 § 9º II). Aluguel pago a pessoa física que não passou de R$ 240 mil de aluguel nem de 3 imóveis no ano anterior não dá crédito (art. 251 § 1º I): não o marque como "dá crédito". Acima disso, o locador cobra CBS e IBS com redução de 70% (art. 261 p.ú.).</small></div>\n'
          '        <div class="fld"><label for="f_fd27a">CBS e IBS na nota do fornecedor do Simples</label><div class="in"><input id="f_fd27a" type="number" min="0" max="30" step="0.1" style="padding-left:10px"><span>% do valor</span></div><small>A nota do optante informa o percentual de CBS e IBS da faixa dele (Res. CGSN 140 art. 58 §§ 4º e 5º, red. Res. CGSN 190). Ex.: serviço na 1ª faixa do Anexo III, 6% × 15,60% = 0,94%. Só vale com fornecedores do Simples.</small></div>\n'
          '        <div class="fld"><label for="f_pres27">Presunção do IRPJ e da CSLL em 2027</label><div class="in"><input id="f_pres27" type="number" min="1" max="100" step="1" style="padding-left:10px"><span>% da receita</span></div><small>Presumido de 2027 sobre a receita de serviços. A lei mantém 32% (Lei 9.249 arts. 15 § 1º III "a" e 20 I; a LC 214 não mexe nisso); acima de R$ 5 milhões no ano, +10% sobre o excedente (LC 224 art. 4º § 5º), que a conta já faz. Vazio: 32%.</small></div>\n'))
# CALC: regimes()
R.append(('  const repS=numP(c.repSem), bCI=b+repS, blCI=',
          '  // premissas-2027 v1: (a) repasse da CBS/IBS ao preço no Presumido e no Real (bF); (b) crédito das despesas de fornecedor do Simples = % da nota\n'
          '  // (LC 214 art. 47 § 9º II; Res. CGSN 140 art. 58 §§ 4º e 5º); (c) presunção de 2027 (Lei 9.249 arts. 15 § 1º III "a" e 20 I; vazio = 32%)\n'
          '  const a27c=cbsAl+LEI.ibs27, rep27=ano>=2027?Math.min(100,numP(x.rep27))/100:0, bF=b*(1+rep27*a27c);\n'
          '  const fdSN=x.fd27==="SN", credB27=fdSN?(a27c>0?cred*Math.min(30,numP(x.fd27a))/100/a27c:0):cred, pr27=numP(x.pres27), presF=ano>=2027&&pr27>0?Math.min(100,pr27)/100:LEI.pres;\n'
          '  const repS=numP(c.repSem), blCI='))
R.append(('  const consumo=(nc,issV)=>ano===2026', '  const consumo=(nc,issV,bb=b)=>ano===2026'))
R.append(('base:bCI-issV-cred-insB27-depB27,al:', 'base:bb+repS-issV-credB27-insB27-depB27,al:', 2))
R.append(('  const F=lc224Fator(12*(b+rev)), issV=LEI.iss*b, lp=LEI.pres*F*b,',
          '  const F=lc224Fator(12*(bF+rev)), issV=LEI.iss*bF, lp=presF*F*bF,'))
R.append(('  const pB=F>1?"32% da receita, +10% acima de R$ 5 mi":"32% da receita";\n  out.lc224=F;\n',
          '  const pTx=(presF*100).toLocaleString("pt-BR",{maximumFractionDigits:2})+"% da receita", pB=F>1?pTx+", +10% acima de R$ 5 mi":pTx;\n'
          '  out.lc224=F; out.bF=bF; out.rep27=rep27; out.presF=presF; out.fdSN=fdSN;\n'))
R.append(('  out.PR=fecha([...consumo(false,issV),{k:"ISS",bl:"receita",base:b,al:LEI.iss},',
          '  out.PR=fecha([...consumo(false,issV,bF),{k:"ISS",bl:"receita",base:bF,al:LEI.iss},'))
R.append(('  const pre=fecha([...consumo(true,issV),{k:"ISS",bl:"receita",base:b,al:LEI.iss},...folhaIt()]);',
          '  const pre=fecha([...consumo(true,issV,bF),{k:"ISS",bl:"receita",base:bF,al:LEI.iss},...folhaIt()]);'))
R.append(('  const L=b-pre.tot-c.folha-', '  const L=bF-pre.tot-c.folha-'))
# cenarioReg(): a receita do Presumido e do Real com o repasse
R.append(('rec=sr?c.recMes:c.servLei+numP(x.rev),', 'rec=sr?c.recMes:Rg.bF+numP(x.rev),'))
# DEF, readForm, fillForm, trava do campo
R.append(('repis:"N",rot:0};', 'repis:"N",rot:0,rep27:0,fd27:"REG",fd27a:0,pres27:32};'))
R.append(('rot:Math.min(100,n("f_rot"))};',
          'rot:Math.min(100,n("f_rot")),rep27:Math.min(100,n("f_rep27")),fd27:$("#f_fd27").value==="SN"?"SN":"REG",fd27a:Math.min(30,n("f_fd27a")),pres27:Math.min(100,n("f_pres27"))||32};'))
R.append(('["f_cap","cap"],["f_rot","rot"]].forEach', '["f_cap","cap"],["f_rot","rot"],["f_rep27","rep27"],["f_fd27a","fd27a"]].forEach'))
R.append(('  $("#f_repis").value=x.repis==="S"?"S":"N";\n',
          '  $("#f_repis").value=x.repis==="S"?"S":"N";\n'
          '  $("#f_fd27").value=x.fd27==="SN"?"SN":"REG";$("#f_pres27").value=x.pres27==null?DEF.pres27:x.pres27;\n'))
R.append(('  updateCatTotals(x); updateDpTotals(); updateBnTotals();\n',
          '  updateCatTotals(x); updateDpTotals(); updateBnTotals();\n'
          '  $("#f_fd27a").disabled=x.fd27!=="SN";\n'))
# textos
R.append(('    <li>2027: o preço ao cliente fica igual ao de 2026. CBS e IBS saem da receita sem o ISS, com crédito das despesas marcadas na ficha, supondo fornecedores no regime regular. A presunção de 32% do Presumido foi mantida.</li>',
          '    <li>2027: ${R27.rep27>0?"no Presumido e no Real o preço dos serviços sobe "+P(R27.rep27*(R27.cbsAl+.001),2)+" ("+P(R27.rep27,0)+" da CBS e do IBS repassados ao cliente: "+R(R27.bF)+" de serviços por mês); no Simples, com ou sem a opção pelo regime regular, o preço fica o de 2026":"o preço ao cliente fica igual ao de 2026 (campo do repasse vazio)"}. CBS e IBS saem da receita sem o ISS, com crédito das despesas marcadas na ficha, ${R27.fdSN?"de fornecedores do Simples: o crédito é o percentual da nota deles, "+P(numP(x.fd27a)/100,2)+" (LC 214 art. 47 § 9º II)":"supondo fornecedores no regime regular (LC 214 art. 47)"}. Aluguel pago a pessoa física não contribuinte não dá crédito (art. 251 § 1º I). Presunção do IRPJ e da CSLL no Presumido: ${P(R27.presF,0)} (Lei 9.249 arts. 15 § 1º III "a" e 20 I).</li>'))
R.append(('  </footer>',
          '        <div>Premissas de 2027 fora do Simples: dossiê <span class="num">pesquisas-legais/salao-2027-premissas-fora-simples</span> (21/11/2026): Lei 9.249 arts. 15 e 20, LC 224 arts. 4º e 14, LC 214 arts. 28, 47, 57, 251, 261 e 516, LC 123 art. 17 XV, Res. CGSN 140 art. 58 (red. Res. CGSN 190).</div>\n'
          '  </footer>'))

if __name__ == "__main__":
    aplica(sys.argv[1], R, "p09")
