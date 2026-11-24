"""Patch 16: DIFAL do insumo de outro estado no Presumido e no Real (lacuna L-20261121-150046-368c; BRIEF-GRUPO-LACUNAS-2026-11-24
item 20c).

Até a v51, o insumoCalc aplicava a todos os regimes a regra do optante do Simples (RICMS/SP art. 115 XV-A "a" e § 8º):
(interna − 12% ou 4%) × valor, por fora, em GARE até o último dia do 2º mês. No Presumido e no Real o salão está no regime
periódico de apuração (RPA), e a regra é a do art. 117 I e II (dossiê pesquisas-legais/icms-sp-difal-uso-consumo-rpa, PR #1343):
- crédito do ICMS pago na origem (12% de qualquer estado, 4% no importado: Res. Senado 22/1989 e 13/2012; remetente do Simples,
  calculado a essas alíquotas, art. 117 §§ 5º e 6º);
- débito da alíquota interna sobre a base "por dentro" (art. 37 VI e § 11; art. 49; LC 87 art. 13 § 6º II):
  leitura (a) do dossiê, base = (valor − ICMS da origem) ÷ (1 − interna); leitura (b), base = valor ÷ (1 − interna);
- dentro da apuração do mês, com o saldo no dia 20 (CPR 1200, Anexo IV; art. 596 § 2º); é custo (LC 87 art. 33 I).
O que muda:
- insumoCalc devolve difal (optante, igual à v51), difalRPA (art. 117, leitura DIFAL_RPA_LEITURA), difalRPAalt (a outra leitura) e
  as bases por parte; difalDe(q,k) escolhe pelo regime;
- cenarioReg() usa o difalRPA em PR e RE; regimes() tira o difalRPA do lucro do Real (era o do optante);
- calendário, aba Insumos (fórmula, texto e card "Comprar em SP ou fora"), sugestão, "O que esta conta supõe" da aba Regime,
  aba 7 (pergunta da base, lacuna L-20261124-045144-3796) e rodapé passam a depender do regime.
S e SR continuam na regra do optante (BRIEF 20c). Base: v51 (1795494878-cb86). Uso: python p16_difal_rpa.py <html>
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from _pt import aplica

R = [
    # insumoCalc: o DIFAL do RPA ao lado do do optante
    ("// DIFAL do optante com inscrição estadual: (interna − 12% ou 4%) × valor, por fora (RICMS/SP art. 115 XV-A \"a\" e § 8º; RC 25481/2022).\n",
     "// DIFAL do optante com inscrição estadual: (interna − 12% ou 4%) × valor, por fora (RICMS/SP art. 115 XV-A \"a\" e § 8º; RC 25481/2022).\n"
     "// difal-rpa v1: no Presumido e no Real (RPA), crédito do ICMS da origem e débito da interna sobre a base por dentro, na apuração do mês\n"
     "// (RICMS/SP art. 117 I e II; art. 37 VI e § 11; art. 49; LC 87 art. 13 § 6º II). Leitura (a): base = (valor − ICMS da origem) ÷ (1 − interna);\n"
     "// (b): base = valor ÷ (1 − interna). Dossiê icms-sp-difal-uso-consumo-rpa, Ambiguidade 1; pergunta ao contador na aba 7.\n"
     "const DIFAL_RPA_LEITURA=\"a\";\n"
     "function difalRpaParte(vb,al,inter,l){const io=vb*inter, base=((l===\"b\"?vb:vb-io))/(1-al);return{vb,io,base,deb:base*al,d:Math.max(0,base*al-io)}}\n"
     "const difalRpaPct=(al,inter)=>difalRpaParte(1,al,inter,DIFAL_RPA_LEITURA).d;\n"
     "const difalDe=(q,k)=>k===\"PR\"||k===\"RE\"?q.difalRPA:q.difal;\n"),
    ("  const difal=contrib?dCos+dGer:0;\n",
     "  const difal=contrib?dCos+dGer:0;\n"
     "  const lA=DIFAL_RPA_LEITURA, lB=lA===\"a\"?\"b\":\"a\", rC=difalRpaParte(vf*cos,INS_LEI.cos,inter,lA), rG=difalRpaParte(vf*(1-cos),INS_LEI.ger,inter,lA);\n"
     "  const difalRPA=contrib?rC.d+rG.d:0, difalRPAalt=contrib?difalRpaParte(vf*cos,INS_LEI.cos,inter,lB).d+difalRpaParte(vf*(1-cos),INS_LEI.ger,inter,lB).d:0;\n"),
    ("  return{v,fora,cos,inter,contrib,vf,dCos,dGer,difal,a27,efF,",
     "  return{v,fora,cos,inter,contrib,vf,dCos,dGer,difal,rC,rG,difalRPA,difalRPAalt,a27,efF,"),
    # cenarioReg(): PR e RE com o DIFAL do RPA, antes do resultado
    ("  if(sr){c.ibsFora=0;c.cbsReg=tot-das-(c.issFora||0)-(c.icmsFora||0)}else{c.repSem=0;c.limIsento=null}",
     "  if(sr){c.ibsFora=0;c.cbsReg=tot-das-(c.issFora||0)-(c.icmsFora||0)}else{c.repSem=0;c.limIsento=null;c.difal=insumoCalc(x,x.ins||{}).difalRPA||0}"),
    # regimes(): o lucro do Real desconta o DIFAL do RPA
    ("desp-(c.insumo||0)-(c.difal||0)-(c.cartao||0)-depM-ajD;",
     "desp-(c.insumo||0)-(qI.difalRPA||0)-(c.cartao||0)-depM-ajD;"),
    ("  // lucro-fecha v2: o DIFAL do insumo (não recuperável, LC 87 art. 33 I) também sai do lucro real e da base da CSLL (RIR arts. 302 I e 352)\n",
     "  // lucro-fecha v2: o DIFAL do insumo (não recuperável, LC 87 art. 33 I) também sai do lucro real e da base da CSLL (RIR arts. 302 I e 352); difal-rpa v1: o do RPA (art. 117)\n"),
    # calendário
    ("  {const q=insumoCalc(x,INS);if(q.difal>0)cal.push([\"Último dia do 2º mês\",\"DIFAL do insumo de outro estado\",R(q.difal)+\" em guia de recolhimentos especiais (RICMS/SP art. 115 XV-A)\"])}",
     "  if(c.difal>0)cal.push(c.reg===\"PR\"||c.reg===\"RE\"?[\"Dia 20\",\"DIFAL do insumo de outro estado\",R(c.difal)+\" dentro da apuração do ICMS do mês anterior (RICMS/SP art. 117 I e II), no saldo pago em GARE, CPR 1200 (Anexo IV); sem expediente bancário, o dia útil seguinte (art. 596 § 2º)\"]\n"
     "    :[\"Último dia do 2º mês\",\"DIFAL do insumo de outro estado\",R(c.difal)+\" em guia de recolhimentos especiais (RICMS/SP art. 115 XV-A)\"]);"),
    # aba Insumos
    ("  const q=insumoCalc(x,INS), el=$(\"#oI\"), at=x.fonte===\"CAT\"?CAT.sv.reduce((a,s)=>a+nz(s.m),0):0;\n",
     "  const q=insumoCalc(x,INS), el=$(\"#oI\"), at=x.fonte===\"CAT\"?CAT.sv.reduce((a,s)=>a+nz(s.m),0):0, rpa=c.reg===\"PR\"||c.reg===\"RE\", dif=difalDe(q,c.reg);\n"),
    ("reduz o resultado do salão em ${R(q.v+q.difal)} por mês${q.difal>0?\", com o DIFAL\":\"\"}.",
     "reduz o resultado do salão em ${R(q.v+dif)} por mês${dif>0?\", com o DIFAL\":\"\"}."),
    ("    h+=`<div class=\"formula\"><div class=\"row\"><span>Insumo de outro estado</span>",
     "    const pr=(n,p,al)=>`<div class=\"row\"><span>${n} (interna ${P(al,0)})</span><span class=\"eq\">(${DIFAL_RPA_LEITURA===\"a\"?R(p.vb)+\" − \"+R(p.io):R(p.vb)}) ÷(1 − ${P(al,0)}) = base ${R(p.base)}; × ${P(al,0)} − ${R(p.io)} =</span><b>${R(p.d)}</b></div>`;\n"
     "    if(rpa)h+=`<div class=\"formula\"><div class=\"row\"><span>Insumo de outro estado</span><span class=\"eq\">${R(q.v)} × ${P(q.fora,0)} =</span><b>${R(q.vf)}</b></div>\n"
     "      ${pr(\"Cosmético\",q.rC,.25)}${pr(\"Outros\",q.rG,.18)}\n"
     "      <div class=\"row\"><span>DIFAL do mês</span><b>${R(q.difalRPA)}</b><span class=\"law\">dentro da apuração do ICMS do mês, com o saldo no dia 20 do mês seguinte (CPR 1200); é custo a mais do insumo e sai do resultado do salão no demonstrativo</span></div></div>\n"
     "      <p class=\"law\">No ${NOME[c.reg]} o salão está no regime periódico de apuração do ICMS. O DIFAL do material de uso e consumo que vem de outro estado entra na apuração do mês: crédito do ICMS pago na origem e débito da alíquota interna sobre a base \"por dentro\" (RICMS/SP art. 117 I e II; art. 37 VI e § 11; art. 49; LC 87 art. 13 § 6º II), sem guia própria. A conta ${DIFAL_RPA_LEITURA===\"a\"?\"tira o ICMS da origem do valor e põe o de SP dentro: (valor − ICMS da origem) ÷ (1 − interna)\":\"põe o ICMS de SP dentro do valor cheio: valor ÷ (1 − interna)\"}. A fórmula é inferida: a Sefaz-SP confirma a recomposição pela alíquota interna (RC 34252/2026, itens 10 e 14), mas não valida números (RC 33094/2026, item 19). Pela outra leitura daria ${R(q.difalRPAalt)}: pergunta na aba 7. A interestadual é a da nota: 12% de qualquer estado, 4% no importado (Res. Senado 22/1989 e 13/2012); com remetente do Simples, o crédito é calculado a essas alíquotas (art. 117 §§ 5º e 6º). Interna: 25% no perfume e cosmético das posições 33.03 a 33.07, salvo as exceções do art. 55 IV (xampu, desodorante e outras); 18% no resto (arts. 52 I e 55 IV). É custo: o ICMS do uso e consumo só dá crédito a partir de 2033 (LC 87 art. 33 I). No Simples, pela regra do optante (art. 115 XV-A), seria ${R(q.difal)}.</p>`;\n"
     "    else h+=`<div class=\"formula\"><div class=\"row\"><span>Insumo de outro estado</span>"),
    ("e higiene bucal (33.06) (Lei SP 6.374 art. 34 § 5º item 3).</p>`;",
     "e higiene bucal (33.06) (Lei SP 6.374 art. 34 § 5º item 3). No Presumido e no Real a regra é outra (art. 117: base por dentro, na apuração do mês): ${R(q.difalRPA)}.</p>`;"),
    ("${q.contrib?\"Com inscrição estadual, a compra de outro estado paga 13% de DIFAL no cosmético e 6% no resto (25% ou 18% menos 12%). Compare o preço final, porque o fornecedor paulista embute os 25% de ICMS.\":",
     "${q.contrib?(rpa?`No ${NOME[c.reg]}, a compra de outro estado com 12% na origem paga ${P(difalRpaPct(.25,.12),1)} de DIFAL no cosmético e ${P(difalRpaPct(.18,.12),1)} no resto, sobre o valor da nota, porque a base leva o ICMS de SP dentro (RICMS/SP art. 117). Compare o preço final, porque o fornecedor paulista embute os 25% de ICMS.`:\"Com inscrição estadual, a compra de outro estado paga 13% de DIFAL no cosmético e 6% no resto (25% ou 18% menos 12%). Compare o preço final, porque o fornecedor paulista embute os 25% de ICMS.\"):"),
    # sugestão da aba Insumos
    ("  if(q.difal>0)return sgCard({k:\"Sugestão\",tone:\"info\",t:`Compare o preço final: o insumo de outro estado paga ${R(q.difal)} por mês de DIFAL.`,why:\"Fornecedor de outro estado só compensa se o preço dele for menor que o paulista em mais que esse valor. No Simples o insumo não dá crédito, então só o preço pesa.\",law:\"RICMS/SP art. 115 XV-A; LC 123 art. 23.\"});",
     "  const rpa=c.reg===\"PR\"||c.reg===\"RE\", dif=difalDe(q,c.reg);\n"
     "  if(dif>0)return sgCard({k:\"Sugestão\",tone:\"info\",t:`Compare o preço final: o insumo de outro estado paga ${R(dif)} por mês de DIFAL.`,why:rpa?\"Fornecedor de outro estado só compensa se o preço dele for menor que o paulista em mais que esse valor. O DIFAL é custo: o ICMS do material de uso e consumo não dá crédito até 2033.\":\"Fornecedor de outro estado só compensa se o preço dele for menor que o paulista em mais que esse valor. No Simples o insumo não dá crédito, então só o preço pesa.\",law:rpa?\"RICMS/SP art. 117 I e II; LC 87 art. 33 I.\":\"RICMS/SP art. 115 XV-A; LC 123 art. 23.\"});"),
    # aba Regime: o que esta conta supõe
    ("    <li>Insumo do serviço: no Real de 2026 dá crédito de 9,25% de PIS/Cofins",
     "    ${(()=>{const q=insumoCalc(x,x.ins||{});return q.difal>0?`<li>DIFAL do insumo de outro estado (aba Insumos): é custo do insumo e não entra nos tributos desta comparação, mas sai do resultado. No Simples, com ou sem CBS e IBS no regime regular, vale a regra do optante: ${R(q.difal)} por mês, por fora, em guia própria até o último dia do 2º mês (RICMS/SP art. 115 XV-A). No Presumido e no Real vale a do regime periódico: ${R(q.difalRPA)}, com a base por dentro, na apuração do mês e no saldo do dia 20 (art. 117 I e II; CPR 1200).</li>`:\"\"})()}\n"
     "    <li>Insumo do serviço: no Real de 2026 dá crédito de 9,25% de PIS/Cofins"),
    # aba 7: a base do DIFAL do RPA
    ("    [\"Insumo estético aplicado no cliente e o crédito de CBS (2027)\",",
     "    [\"DIFAL no Presumido e no Real: a base por dentro\",(c.reg===\"PR\"||c.reg===\"RE\")&&c.difal>0,\"Salão em SP no Lucro Presumido, contribuinte do ICMS, compra cosmético de MG por R$ 1.000 com 12% destacado, para uso no serviço. Pelo art. 117 II e o art. 37 § 11 do RICMS, o débito é 25% × (1.000 − 120) ÷ 0,75 = R$ 293,33, com DIFAL líquido de R$ 173,33?\",`O RICMS manda formar a base com a alíquota interna e pôr o imposto dentro dela (arts. 37 § 11 e 49), e a Sefaz-SP fala em recomposição, sem dar a conta (RC 34252/2026; RC 33094/2026 item 19). A conta usa ${DIFAL_RPA_LEITURA===\"a\"?\"(valor − ICMS da origem) ÷ (1 − interna), a leitura que decorre da LC 87 art. 13 § 6º\":\"valor ÷ (1 − interna), a leitura mais cara para o salão\"}; pela outra, o DIFAL do exemplo seria ${DIFAL_RPA_LEITURA===\"a\"?\"R$ 213,33\":\"R$ 173,33\"}. No Simples e no SR vale outra regra (art. 115 XV-A).`],\n"
     "    [\"Insumo estético aplicado no cliente e o crédito de CBS (2027)\","),
    # rodapé
    ("        <div>Fora do Simples: dossiê <span class=\"num\">pesquisas-legais/regime-fora-simples-salao</span>",
     "        <div>DIFAL no Presumido e no Real: dossiê <span class=\"num\">pesquisas-legais/icms-sp-difal-uso-consumo-rpa</span> (24/11/2026): RICMS/SP arts. 2º VI e § 5º, 37 VI e § 11, 49, 52 I, 55 IV, 117 e Anexo IV; LC 87 arts. 12 XV, 13 § 6º e 33 I; Res. Senado 22/1989 e 13/2012; RC 34252/2026 e 33094/2026.</div>\n"
     "        <div>Fora do Simples: dossiê <span class=\"num\">pesquisas-legais/regime-fora-simples-salao</span>"),
]

if __name__ == "__main__":
    aplica(sys.argv[1], R, "p16_difal_rpa")
