"""Patch 06: item 6, provisão de rescisão pela rotatividade (dossiê pesquisas-legais/salao-provisao-rescisao, § 1;
dedutibilidade em pesquisas-legais/salao-lucro-real-adicoes-exclusoes).

Decisão do dono (DECISOES-2026-11-21, item 6): campo de rotatividade (% da equipe CLT que sai sem justa causa por ano);
vazio = fora da conta. Por empregado: custo de uma saída =
  AV (rem × min(90, 30 + 3 × anos) ÷ 30; Lei 12.506; CLT 487) + 13º e férias + 1/3 dos avos do aviso projetado (CLT 487 § 1º; TST Súm. 371)
  + FGTS de 8% sobre aviso e 13º (não incide nas férias indenizadas) + 40% dos depósitos do contrato e desse FGTS (Lei 8.036 art. 18 § 1º)
  + trintídio rem ÷ 12 (Lei 7.238 art. 9º; CCT cl. 34ª) + R$ 150 de homologação sem REPIS com 1 ano ou mais (CCT cl. 36ª § 6º).
Provisão do mês = rotatividade × custo ÷ 12, na folha da pessoa. Fora do Simples, INSS, RAT e terceiros incidem no 13º do aviso
(o aviso indenizado não: STJ Tema 478). No Lucro Real a provisão NÃO é dedutível ao ser feita (IN RFB 1.700 art. 70; adição A.178):
o lucro tributável a devolve. Divergência registrada: DECISOES diz "e em L do Real"; o dossiê manda adicionar (segue-se o dossiê).
Uso: python p06_provisao_rescisao.py <html>   (depois do p05)
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from _pt import aplica

R = []
# ficha: campo de rotatividade
R.append(('<option value="S">Sim, com o certificado</option></select><small>',
          '<option value="S">Sim, com o certificado</option></select><small>'))  # âncora conferida (p05 aplicado)
R.append(('Os benefícios com REPIS (R$ 48,90) ficam no campo da telemedicina, nos encargos.</small></div>\n',
          'Os benefícios com REPIS (R$ 48,90) ficam no campo da telemedicina, nos encargos.</small></div>\n'
          '        <div class="fld"><label for="f_rot">Rotatividade da equipe CLT</label><div class="in"><input id="f_rot" type="number" min="0" max="100" step="5" style="padding-left:10px"><span>% sai por ano</span></div><small>Parte da equipe CLT que sai sem justa causa em um ano: 1 saída em 4 empregados é 25%. Vazio: a conta não provisiona rescisão. Preenchido, cada mês reserva essa parte do custo de uma saída: aviso prévio, 13º e férias do aviso, FGTS e multa de 40%.</small></div>\n'))
# CALC: função do custo de uma saída e provisão por pessoa
R.append(('function custoCLT(s){',
          '// rescisao v1: custo de uma saída sem justa causa (dossiê salao-provisao-rescisao). k = custoCLT da pessoa; anos = anos completos de casa.\n'
          '// Aviso: 30 dias + 3 por ano completo, até 90 (Lei 12.506 art. 1º); 13º e férias + 1/3 dos avos do aviso projetado (CLT art. 487 § 1º; TST Súmula 371);\n'
          '// FGTS sobre aviso e 13º, não sobre férias indenizadas; multa de 40% sobre os depósitos do contrato (8% da remuneração com 13º e férias, por mês de casa;\n'
          '// sem o ano completo, meio ano) e o FGTS da rescisão (Lei 8.036 art. 18 § 1º; TST OJ-SDI1-42 II); trintídio de 1/12 (Lei 7.238 art. 9º; CCT cl. 34ª);\n'
          '// homologação de R$ 150 sem REPIS e com 1 ano ou mais (CCT cl. 36ª § 6º). LC 110 extinta (Lei 13.932 art. 12).\n'
          'function rescisao(k,anos,repis){const rem=k.s, avD=Math.min(90,30+3*anos), av=rem*avD/30, r13=rem*(avD/30)/12, rfer=r13*4/3, fgtsR=.08*(av+r13);\n'
          '  const dep=(k.fgts+k.fgts2)*12*Math.max(anos,.5), multa=.4*(dep+fgtsR), trint=rem/12, hom=!repis&&anos>=1?150:0;\n'
          '  return{avD,av,r13,rfer,fgtsR,dep,multa,trint,hom,tot:av+r13+rfer+fgtsR+multa+trint+hom}}\n'
          'function custoCLT(s){'))
R.append(('    return{n:nomeP(p),id:p.id,f:p.f,sf,anos,atsP,ats,pc,cm,dsr,...custoCLT(sf+ats+cm+dsr)}});\n',
          '    // rescisao v1: provisão do mês = rotatividade × custo de uma saída ÷ 12, na folha da pessoa\n'
          '    const k=custoCLT(sf+ats+cm+dsr), rs=rescisao(k,anos,out.repis), provR=rot*rs.tot/12;\n'
          '    return{n:nomeP(p),id:p.id,f:p.f,sf,anos,atsP,ats,pc,cm,dsr,...k,resc:rs,provR,provR13:rot*rs.r13/12,tot:k.tot+provR}});\n'
          '  out.provResc=out.equipe.reduce((a,p)=>a+p.provR,0);\n'))
R.append(('  out.repis=x.repis==="S";\n', '  out.repis=x.repis==="S"; const rot=Math.min(100,numP(x.rot))/100; out.rot=rot;\n'))
# regimes(): encargos sobre o 13º do aviso; provisão fora do lucro real
R.append(('  const prov=c.equipe.reduce((a,p)=>a+p.d13+p.fer+p.terco,0), salB=sal+prov,',
          '  // rescisao v1: o 13º do aviso projetado também é base de INSS, RAT e terceiros (Lei 8.212 art. 28 § 7º); o aviso indenizado não (STJ Tema 478)\n'
          '  const prov=c.equipe.reduce((a,p)=>a+p.d13+p.fer+p.terco+(p.provR13||0),0), salB=sal+prov,'))
R.append(('  const plB=numP(x.pl);\n',
          '  const plB=numP(x.pl);\n'
          '  // rescisao v1: no Real a provisão de rescisão, com os encargos dela, não é dedutível ao ser feita (IN RFB 1.700 art. 70; adição A.178)\n'
          '  const provR13=c.equipe.reduce((a,p)=>a+(p.provR13||0),0), provNd=numP(c.provResc)+provR13*(LEI.inss+(x.rat||0)/100*(x.fap==null?1:x.fap)+(x.terc||0)/100);\n'))
R.append(('-(c.cartao||0)-depM; out.lucroReal=L;', '-(c.cartao||0)-depM+provNd; out.lucroReal=L; out.provNd=provNd;'))
# DEF, readForm, fillForm
R.append(('cap:0,repis:"N"};', 'cap:0,repis:"N",rot:0};'))
R.append(('repis:$("#f_repis").value==="S"?"S":"N"};', 'repis:$("#f_repis").value==="S"?"S":"N",rot:Math.min(100,n("f_rot"))};'))
R.append(('["f_odo","odo"],["f_cap","cap"]].forEach', '["f_odo","odo"],["f_cap","cap"],["f_rot","rot"]].forEach'))
# cartão da pessoa
R.append(('         ${ln("Folha da pessoa",R(q.tot),{cls:"tot"})}\n',
          '         ${q.provR>0?ln("Custo de uma saída sem justa causa",R(q.resc.tot),{f:"aviso de "+q.resc.avD+" dias, 13º e férias dele, FGTS, multa de 40%"+(q.resc.hom?", homologação":""),cls:"sub"})+ln("Provisão de rescisão",R(q.provR),{f:nf(q.resc.tot)+" × "+P(c.rot,0)+" ÷ 12"}):""}\n'
          '         ${ln("Folha da pessoa",R(q.tot),{cls:"tot"})}\n'))
# total do salão (aba 3)
R.append(('     <tr class="sub"><td>FGTS, 13º e férias</td><td class="r">${R(c.folha-c.salarios)}</td></tr>\n',
          '     <tr class="sub"><td>FGTS, 13º e férias</td><td class="r">${R(c.folha-c.salarios-(c.provResc||0))}</td></tr>\n'
          '     ${c.provResc>0?`<tr class="sub"><td>Provisão de rescisão (${P(c.rot,0)} da equipe sai por ano)</td><td class="r">${R(c.provResc)}</td></tr>`:""}\n'))
# DREs
R.append(('    ${row("Férias + 1/3 (provisão mensal)",fer,{cls:"sub"})}\n',
          '    ${row("Férias + 1/3 (provisão mensal)",fer,{cls:"sub"})}\n'
          '    ${c.provResc>0?row("Provisão de rescisão (aviso prévio, multa do FGTS)",c.provResc,{cls:"sub"}):""}\n', 2))
# textos
R.append(('não inclui a provisão de rescisão nem o PIS/Cofins', 'não inclui o PIS/Cofins'))
R.append(('sobre o salário fixo;', 'sobre o salário fixo; a provisão de rescisão, da rotatividade da ficha (aviso prévio, 13º e férias do aviso, FGTS e multa de 40%);'))
R.append(('; a conta não provisiona rescisão (aviso prévio e multa de 40% do FGTS).', '; a provisão de rescisão, da rotatividade da ficha.'))
R.append(('    <li>2027: o preço ao cliente',
          '    ${R26.provNd>0?`<li>Provisão de rescisão: rotatividade × custo de uma saída sem justa causa ÷ 12, na folha de cada CLT, em todos os regimes. No Real ela não é dedutível ao ser feita (IN RFB 1.700 art. 70; RIR art. 339): volta ao lucro como adição (A.178), ${R(R26.provNd)} por mês com os encargos dela. A exclusão quando a rescisão é paga (E.125) não está na conta: ela mostra o ano em que a provisão começa; com saídas no mesmo ritmo todo ano, a exclusão das rescisões pagas compensa a adição.</li>`:""}\n'
          '    <li>2027: o preço ao cliente'))
R.append(('     <p class="law">Adicional por tempo de serviço:',
          '     <p class="law">Provisão de rescisão (campo de rotatividade da ficha): por pessoa, o custo de uma saída sem justa causa é o aviso prévio de 30 dias mais 3 por ano completo, até 90 (Lei 12.506 art. 1º), o 13º e as férias + 1/3 dos meses que o aviso projeta (CLT art. 487 § 1º; TST Súmula 371), o FGTS sobre o aviso e o 13º, a multa de 40% sobre os depósitos do contrato (Lei 8.036 art. 18 § 1º), a indenização do trintídio em 1/12 (Lei 7.238 art. 9º; CCT cl. 34ª) e, sem REPIS e com 1 ano ou mais, R$ 150 de homologação (cl. 36ª § 6º). A provisão do mês é a rotatividade × esse custo ÷ 12. Fora do Simples, INSS, RAT e terceiros incidem no 13º do aviso, não no aviso indenizado (STJ Tema 478). As estabilidades da convenção não entram.</p>\n'
          '     <p class="law">Adicional por tempo de serviço:'))
R.append(('  </footer>',
          '        <div>Provisão de rescisão: dossiê <span class="num">pesquisas-legais/salao-provisao-rescisao</span> (21/11/2026): CLT arts. 477, 487 e 489, Lei 12.506, Lei 8.036 art. 18, Lei 13.932 art. 12, Lei 7.238 art. 9º, TST Súmula 371 e OJ-SDI1-42, STJ Tema 478, IN RFB 2.110 art. 34, CCT SP006651/2026 cl. 34ª, 36ª e 38ª; no Real, IN RFB 1.700 art. 70 e RIR art. 339 (dossiê <span class="num">pesquisas-legais/salao-lucro-real-adicoes-exclusoes</span>).</div>\n'
          '  </footer>'))
R.append(('    ["Insumo estético aplicado no cliente e o crédito de CBS (2027)",',
          '    ["Provisão de rescisão: aviso do 1º ano, base da multa e teto da convenção",numP(x.rot)>0,"Com 1 ano completo de casa, o aviso prévio é de 33 ou de 30 dias (Lei 12.506; Nota Técnica MTE 184/2012)? A multa de 40% inclui o FGTS do aviso prévio indenizado (OJ-SDI1-42 II)? A cl. 38ª da CCT, com 60 dias para o empregado com mais de 45 anos e mais de 2 anos de casa, soma ou limita os dias da Lei 12.506?","A conta usa a leitura mais cara para o salão: 33 dias com 1 ano completo, multa sobre os depósitos e o FGTS da rescisão, e os dias da Lei 12.506 sem o piso da cl. 38ª, que depende da idade (o cadastro não tem a idade). A Nota Técnica 184/2012 foi lida só em fonte secundária."],\n'
          '    ["Insumo estético aplicado no cliente e o crédito de CBS (2027)",'))

if __name__ == "__main__":
    aplica(sys.argv[1], R, "p06")
