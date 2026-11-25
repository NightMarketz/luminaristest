"""Patch 14: ICMS da revenda no Simples impedido (lacuna L-20261121-121105-38c0; BRIEF-GRUPO-LACUNAS-2026-11-24 item 20a).

Com a receita acima do sublimite de R$ 3,6 mi (ap.impedido), o taxas1() zera o ICMS do DAS da revenda, mas o cenario()
não cobrava o ICMS do regime normal: o resultado e os tributos do mês saíam menores no valor desse ICMS.
Este patch cobra o ICMS com a conta que o regimes() já faz no Presumido e no Real: alíquota interna de SP (25% no
cosmético, 18% no resto; Lei SP 6.374 art. 34) sobre a revenda menos as compras (não cumulativo, art. 36), supondo a
compra em SP de fornecedor do regime normal (regime-fora v1; dossiê pesquisas-legais/regime-fora-simples-salao).
- icmsAlRev(x): a alíquota da revenda, uma função só para o regimes() e o cenario();
- out.icmsFora no cenario(), no resultado e nos tributos do mês (S e SR de 2027);
- item "ICMS fora do DAS (revenda)" no S.rev e no SR.rev; no SR, a CBS/IBS regular desconta o ICMS da conta do cbsReg;
- KPI "DAS do mês", DRE (dedução e linha própria), calendário (dia 20, GARE, mesmo texto do calReg) e callout da aba DAS,
  sem o "fora desta conta".
Base: v50 (1795493421-5d04). Uso: python p14_icms_impedido.py <html>
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from _pt import aplica

R = [
    # alíquota do ICMS da revenda: uma função para as duas contas
    ("const pctF=(v,d)=>Math.min(100,v==null||v===\"\"?d:numP(v))/100;\n",
     "const pctF=(v,d)=>Math.min(100,v==null||v===\"\"?d:numP(v))/100;\n"
     "// ICMS da revenda: 25% na parte em cosmético fora do xampu e do desodorante (rcos × (1 − rxam)), 18% no resto (Lei SP 6.374 art. 34)\n"
     "function icmsAlRev(x){const s25=pctF(x.rcos,100)*(1-pctF(x.rxam,0));return INS_LEI.cos*s25+INS_LEI.ger*(1-s25)}\n"),
    ("  const icmsAl=INS_LEI.cos*s25+INS_LEI.ger*(1-s25);\n",
     "  const icmsAl=icmsAlRev(x);\n"),
    # cenario(): o ICMS do regime normal quando impedido
    ("    out.ibsFora=ap.impedido&&+ano>=2027?r2c((servSalao-out.issFora+x.rev)*0.001):0;\n",
     "    out.ibsFora=ap.impedido&&+ano>=2027?r2c((servSalao-out.issFora+x.rev)*0.001):0;\n"
     "    // impedido: o ICMS da revenda também sai do DAS (taxas1) e vai ao regime normal de SP, com a conta do regimes():\n"
     "    // alíquota interna sobre a revenda menos as compras (Lei SP 6.374 arts. 34 e 36), supondo compra em SP de fornecedor do regime normal\n"
     "    out.icmsFora=ap.impedido&&numP(x.rev)>0?r2c(Math.max(0,numP(x.rev)*(1-x.cmv/100))*icmsAlRev(x)):0;\n"),
    ("  out.resultado=recMes-(out.das||0)-(out.issFora||0)-(out.ibsFora||0)-out.folha",
     "  out.resultado=recMes-(out.das||0)-(out.issFora||0)-(out.ibsFora||0)-(out.icmsFora||0)-out.folha"),
    # regimes(): o item na revenda do Simples e do SR
    ("    out.S.rev=fecha(rev>0?[{k:\"DAS da revenda\",bl:\"DAS do Anexo I\",base:c.dasRev,al:1},...(c.ibsFora>0?",
     "    const icmsIm=c.icmsFora>0?[{k:\"ICMS fora do DAS (revenda)\",bl:\"revenda − compras\",base:c.icmsFora/icmsAl,al:icmsAl}]:[];\n"
     "    out.S.rev=fecha(rev>0?[{k:\"DAS da revenda\",bl:\"DAS do Anexo I\",base:c.dasRev,al:1},...icmsIm,...(c.ibsFora>0?"),
    ("{k:\"DAS da revenda\",bl:\"DAS do Anexo I sem CBS e IBS\",base:c.dasRev-cbR,al:1},",
     "{k:\"DAS da revenda\",bl:\"DAS do Anexo I sem CBS e IBS\",base:c.dasRev-cbR,al:1},...icmsIm,"),
    # cenarioReg(): tributos do mês e CBS/IBS regular do SR
    ("  if(k===\"S\"){c.tribTot=c.foraSimples?null:c.das+(c.issFora||0)+(c.ibsFora||0);return c}",
     "  if(k===\"S\"){c.tribTot=c.foraSimples?null:c.das+(c.issFora||0)+(c.ibsFora||0)+(c.icmsFora||0);return c}"),
    ("  if(sr){c.ibsFora=0;c.cbsReg=tot-das-(c.issFora||0)}",
     "  if(sr){c.ibsFora=0;c.cbsReg=tot-das-(c.issFora||0)-(c.icmsFora||0)}"),
    # KPI do mês
    ("[\"DAS do mês\",c.foraSimples?\"fora do Simples\":R(c.das+(c.issFora||0)+(c.ibsFora||0)),",
     "[\"DAS do mês\",c.foraSimples?\"fora do Simples\":R(c.das+(c.issFora||0)+(c.ibsFora||0)+(c.icmsFora||0)),"),
    # aba DAS: o callout cobra o ICMS e perde o "fora desta conta"
    ("h+=`<div class=\"callout warn\"><b>${y27?\"ISS e IBS fora\":\"ISS fora\"} do DAS: ${R(c.issFora+(c.ibsFora||0))} em guia própria.</b>",
     "h+=`<div class=\"callout warn\"><b>${(rev?(y27?\"ISS, ICMS e IBS\":\"ISS e ICMS\"):(y27?\"ISS e IBS\":\"ISS\"))+\" fora\"} do DAS: ${R(c.issFora+(c.ibsFora||0)+(c.icmsFora||0))} em guia própria.</b>"),
    ("${rev?\" O ICMS da revenda também sai do DAS e é apurado pelo regime normal do Estado, fora desta conta.\":\"\"}",
     "${rev?` O ICMS da revenda também sai do DAS e vai ao regime normal do Estado: ${R(c.icmsFora)}, a alíquota interna sobre a revenda menos as compras (Lei SP 6.374 arts. 34 e 36), supondo compra em SP de fornecedor do regime normal, em GARE.`:\"\"}"),
    # calendário: dia 20, GARE (mesmo texto do calReg)
    ("[[\"Dia 20\",\"DAS do mês anterior\",c.foraSimples?\"—\":R(c.reg===\"SR\"?c.dasReg:c.das+(c.issFora||0)+(c.ibsFora||0))]]",
     "[[\"Dia 20\",\"DAS do mês anterior\",c.foraSimples?\"—\":R(c.reg===\"SR\"?c.dasReg:c.das+(c.issFora||0)+(c.ibsFora||0))]]"
     ".concat(c.icmsFora>0?[[\"Dia 20\",\"ICMS da revenda (regime normal de SP)\",R(c.icmsFora)+\" em GARE, do mês anterior (RICMS/SP art. 112; Anexo IV, CPR 1200); sem expediente, o dia útil seguinte, como na agenda da Sefaz-SP\"]]:[])"),
    # DRE: dedução e linha própria
    ("ded=c.reg===\"SR\"?c.tribTot:c.das+(c.issFora||0)+(c.ibsFora||0), rl=rb-ded",
     "ded=c.reg===\"SR\"?c.tribTot:c.das+(c.issFora||0)+(c.ibsFora||0)+(c.icmsFora||0), rl=rb-ded"),
    ("    ${c.ibsFora?row(\"(−) IBS fora do DAS (acima do sublimite)\",c.ibsFora,{neg:true}):\"\"}\n",
     "    ${c.ibsFora?row(\"(−) IBS fora do DAS (acima do sublimite)\",c.ibsFora,{neg:true}):\"\"}\n"
     "    ${c.icmsFora?row(\"(−) ICMS da revenda fora do DAS (acima do sublimite)\",c.icmsFora,{neg:true}):\"\"}\n"),
]

if __name__ == "__main__":
    aplica(sys.argv[1], R, "p14_icms_impedido")
