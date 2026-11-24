"""Patch 08: item 8, adições, exclusões e compensação do Lucro Real (dossiê pesquisas-legais/salao-lucro-real-adicoes-exclusoes,
tabela de 26 itens). Decisão do dono: "planejar completo".

Bloco "Ajustes do lucro real" na ficha. Adições com campo próprio (R$ por mês): multas punitivas e não tributárias (A.153/A.154),
brindes (Lei 9.249 art. 13 VII), doações (A.072), alimentação dos sócios (A.066), gastos pessoais do sócio (A.069/A.050),
gratificação a administradores (A.163, só IRPJ), outras adições; exclusões livres; saldo de prejuízo fiscal e de base negativa da CSLL,
compensados até 30% do lucro ajustado (Lei 9.065 arts. 15 e 16), até 1/12 do saldo por mês. A provisão de rescisão (p06) entra como
adição A.178. Os gastos lançados como adição também são despesa do resultado em todos os regimes; as exclusões só mexem no imposto.
A compensação é feita uma vez, sobre o total com a revenda; os ajustes ficam na parte dos serviços.
Uso: python p08_lalur.py <html>   (depois do p09)
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from _pt import aplica

def fld(id_, lab, small, step="50"):
    return (f'        <div class="fld"><label for="{id_}">{lab}</label><div class="in"><span>R$</span><input id="{id_}" type="number" min="0" step="{step}" inputmode="decimal"></div><small>{small}</small></div>\n')

CAMPOS = (
    '      <fieldset class="fset"><legend>Ajustes do lucro real</legend>\n'
    '      <div class="fgrp">\n'
    '        <p class="law">Gastos do mês que o Lucro Real não deduz (adições do LALUR). Eles entram nas despesas do resultado em todos os regimes e, no Real, voltam ao lucro tributável. Não os repita nas outras despesas. A provisão de rescisão já entra sozinha como adição (A.178).</p>\n'
    + fld("f_aMul", "Multas punitivas e não tributárias", "Multa de ofício por infração fiscal (a de mora é dedutível), multa trabalhista, da Vigilância Sanitária, do Procon (IN RFB 1.700 arts. 132 e 133).")
    + fld("f_aBri", "Brindes", "Mimo e amostra dados a cliente (Lei 9.249 art. 13 VII).")
    + fld("f_aDoa", "Doações", "As que não estão no art. 13 § 2º da Lei 9.249 (até 2% do lucro operacional a OSC ou Oscip) nem na Lei Rouanet.")
    + fld("f_aAli", "Alimentação dos sócios", "A dos empregados é dedutível se for dada a todos (Lei 9.249 art. 13 IV e § 1º).")
    + fld("f_aNn", "Gastos pessoais do sócio pagos pelo salão", "Despesa que não é necessária à atividade, carro ou imóvel do sócio (IN RFB 1.700 arts. 68 e 83).")
    + fld("f_aGra", "Gratificação a administradores", "Bônus do sócio-gerente além do pró-labore. Adição só no IRPJ: a CSLL a aceita (RIR art. 315).")
    + fld("f_aOut", "Outras adições", "Outro gasto do mês que a IN RFB 1.700 manda adicionar; a lista dos Anexos não é fechada (art. 63 p.ú.).")
    + fld("f_eOut", "Exclusões", "Valor do mês que sai do lucro tributável, como a depreciação fiscal maior que a contábil (E.043). Não muda o resultado do salão, só o imposto.")
    + fld("f_pfis", "Prejuízo fiscal a compensar", "Saldo da Parte B do LALUR. Compensa até 30% do lucro ajustado (Lei 9.065 art. 15); com meses iguais, a conta usa até 1/12 do saldo por mês.", "1000")
    + fld("f_bneg", "Base negativa da CSLL a compensar", "Saldo da CSLL, com a mesma trava de 30% (Lei 9.065 art. 16).", "1000")
    + '      </div>\n'
    '      </fieldset>\n')

K = ["aMul", "aBri", "aDoa", "aAli", "aNn", "aGra", "aOut", "eOut", "pfis", "bneg"]

R = []
# ficha: o bloco novo, depois de "Fora do Simples"
R.append(('      </fieldset>\n    </div>\n    <div class="pager"><button class="btn" id="reset"',
          '      </fieldset>\n' + CAMPOS + '    </div>\n    <div class="pager"><button class="btn" id="reset"'))
# cenario(): os gastos indedutíveis são despesa em todos os regimes
R.append(('  out.dep=numP(x.dep);\n',
          '  out.dep=numP(x.dep);\n'
          '  // lalur v1: gastos do mês que o lucro real não aceita (multas, brindes, doações, alimentação dos sócios...): despesa em todos os regimes\n'
          '  out.ajDesp=["aMul","aBri","aDoa","aAli","aNn","aGra","aOut"].reduce((a,k)=>a+numP(x[k]),0);\n'))
R.append(('-out.cartao-repSem-out.dep;', '-out.cartao-repSem-out.dep-out.ajDesp;'))
R.append(('-c.cartao-rs-(c.dep||0);\n', '-c.cartao-rs-(c.dep||0)-(c.ajDesp||0);\n'))
R.append(('+(s.repSem||0)+(s.dep||0);\n', '+(s.repSem||0)+(s.dep||0)+(s.ajDesp||0);\n'))
# regimes(): LALUR
R.append(('  const L=bF-pre.tot-c.folha-c.enc.tot-desp-(c.insumo||0)-(c.difal||0)-(c.cartao||0)-depM+provNd; out.lucroReal=L; out.provNd=provNd;',
          '  // lalur v1: Lc = lucro contábil antes do IRPJ e da CSLL. Lucro real = Lc + adições (gastos indedutíveis da ficha e a provisão de rescisão, A.178)\n'
          '  // − exclusões − compensação de prejuízo fiscal até 30% do lucro ajustado (Lei 9.065 arts. 15 e 16; IN RFB 1.700 art. 64), até 1/12 do saldo por mês.\n'
          '  // A gratificação a administradores é adição só no IRPJ (RIR art. 315; A.163). A CSLL não sai da base do IRPJ (A.058): a conta nunca a deduz.\n'
          '  // A compensação é uma só, sobre o total com a revenda; os ajustes ficam na parte dos serviços (L, LC) e a revenda soma o resto.\n'
          '  const ajD=numP(c.ajDesp), Lc=bF-pre.tot-c.folha-c.enc.tot-desp-(c.insumo||0)-(c.difal||0)-(c.cartao||0)-depM-ajD;\n'
          '  const adI=ajD+provNd, adC=adI-numP(x.aGra), exc=numP(x.eOut), preR=fecha([...icmsIt(),...revPC(true)]), Lrev=rev-cmv-preR.tot;\n'
          '  const TI=Lc+Lrev+adI-exc, TC=Lc+Lrev+adC-exc, compI=Math.min(numP(x.pfis)/12,.3*Math.max(0,TI)), compC=Math.min(numP(x.bneg)/12,.3*Math.max(0,TC));\n'
          '  const L=Lc+adI-exc-compI, LC=Lc+adC-exc-compC, aj=adI!==0||exc>0||compI>0||compC>0;\n'
          '  out.lalur={Lc,Lrev,provNd,exc,compI,compC,TI,TC,adI,adC,it:[["Multas punitivas e não tributárias (A.153 e A.154)",numP(x.aMul),1],["Brindes (Lei 9.249 art. 13 VII)",numP(x.aBri),1],["Doações (A.072)",numP(x.aDoa),1],["Alimentação dos sócios (A.066)",numP(x.aAli),1],["Gastos pessoais do sócio (A.069)",numP(x.aNn),1],["Gratificação a administradores (A.163, só no IRPJ)",numP(x.aGra),0],["Outras adições",numP(x.aOut),1]]};\n'
          '  out.lucroReal=L; out.lucroContabil=Lc; out.provNd=provNd;'))
R.append(('{k:"IRPJ",bl:"lucro",base:L,al:LEI.irpj},{k:"IRPJ adicional",bl:"lucro − R$ 20 mil",base:L-LEI.adicLim,al:LEI.adic},{k:"CSLL",bl:"lucro",base:L,al:LEI.csll}]);',
          '{k:"IRPJ",bl:aj?"lucro real":"lucro",base:L,al:LEI.irpj},{k:"IRPJ adicional",bl:aj?"lucro real − R$ 20 mil":"lucro − R$ 20 mil",base:L-LEI.adicLim,al:LEI.adic},{k:"CSLL",bl:aj?"base da CSLL":"lucro",base:LC,al:LEI.csll}]);'))
R.append(('  const preR=fecha([...icmsIt(),...revPC(true)]), L2=L+rev-cmv-preR.tot, dP=Math.max(0,L2)-Math.max(0,L), dA=Math.max(0,L2-LEI.adicLim)-Math.max(0,L-LEI.adicLim);',
          '  const L2=L+Lrev, LC2=LC+Lrev, dP=Math.max(0,L2)-Math.max(0,L), dA=Math.max(0,L2-LEI.adicLim)-Math.max(0,L-LEI.adicLim), dC=Math.max(0,LC2)-Math.max(0,LC);'))
R.append(('{k:"CSLL da revenda",bl:"lucro que a revenda soma",base:dP,al:LEI.csll}', '{k:"CSLL da revenda",bl:"lucro que a revenda soma",base:dC,al:LEI.csll}'))
# DEF, readForm, fillForm
R.append(('fd27a:0,pres27:32};', 'fd27a:0,pres27:32,' + ",".join(k + ":0" for k in K) + '};'))
R.append(('pres27:Math.min(100,n("f_pres27"))||32};', 'pres27:Math.min(100,n("f_pres27"))||32,' + ",".join(f'{k}:n("f_{k}")' for k in K) + '};'))
R.append(('["f_rep27","rep27"],["f_fd27a","fd27a"]].forEach', '["f_rep27","rep27"],["f_fd27a","fd27a"],' + ",".join(f'["f_{k}","{k}"]' for k in K) + '].forEach'))
# aba 4 e DREs
R.append(('     ${s.dep>0?`<div class="line"><span>Depreciação dos equipamentos</span><span>${R(s.dep)}</span></div>`:""}\n',
          '     ${s.dep>0?`<div class="line"><span>Depreciação dos equipamentos</span><span>${R(s.dep)}</span></div>`:""}\n'
          '     ${s.ajDesp>0?`<div class="line"><span>Multas, brindes, doações e outros</span><span>${R(s.ajDesp)}</span></div>`:""}\n'))
R.append(('+(c.cartao||0)+(c.dep||0), lair', '+(c.cartao||0)+(c.dep||0)+(c.ajDesp||0), lair'))
R.append(('+(c.cartao||0)+(c.dep||0), res=c.resultado;', '+(c.cartao||0)+(c.dep||0)+(c.ajDesp||0), res=c.resultado;'))
R.append(('    ${c.dep>0?row("Depreciação dos equipamentos",c.dep,{cls:"sub"}):""}\n',
          '    ${c.dep>0?row("Depreciação dos equipamentos",c.dep,{cls:"sub"}):""}\n'
          '    ${c.ajDesp>0?row("Multas, brindes, doações e outros gastos que o Real não deduz",c.ajDesp,{cls:"sub"}):""}\n', 2))
# aba 5 (Lucro) no Real: o quadro do LALUR
R.append(('function lucroReg(x,c){',
          '/* lalur v1: o quadro do lucro real, mês a mês igual */\n'
          'function lalurTab(c){const l=c.regs&&c.regs.lalur;if(!l||c.reg!=="RE")return"";\n'
          '  const r=(t,i,s,cls="")=>`<tr class="${cls}"><td>${t}</td><td class="r">${i==null?"—":R(i)}</td><td class="r">${s==null?"—":R(s)}</td></tr>`;\n'
          '  let t=r("Lucro contábil antes do IRPJ e da CSLL",l.Lc+l.Lrev,l.Lc+l.Lrev);\n'
          '  l.it.filter(i=>i[1]>0).forEach(i=>{t+=r("(+) "+i[0],i[1],i[2]?i[1]:null,"sub")});\n'
          '  if(l.provNd>0)t+=r("(+) Provisão de rescisão e encargos dela (A.178)",l.provNd,l.provNd,"sub");\n'
          '  if(l.exc>0)t+=r("(−) Exclusões",-l.exc,-l.exc,"sub");\n'
          '  t+=r("Lucro ajustado",l.TI,l.TC,"tot")+r("(−) Compensação de prejuízo fiscal e base negativa (até 30%)",-l.compI,-l.compC,"sub")+r("Lucro real e base da CSLL",l.TI-l.compI,l.TC-l.compC,"tot");\n'
          '  return`<h3>Do lucro contábil ao lucro real, por mês</h3><div class="tbl-wrap"><table class="eq-tot"><thead><tr><th></th><th class="r">IRPJ</th><th class="r">CSLL</th></tr></thead><tbody>${t}</tbody></table></div>\n'
          '   <p class="law">Adições e exclusões do bloco "Ajustes do lucro real" da ficha (IN RFB 1.700 arts. 62, 63 e Anexos I e II). Os gastos adicionados já saíram do resultado do salão; aqui voltam ao lucro tributável. A compensação usa até 1/12 do saldo da ficha por mês, sem passar de 30% do lucro ajustado (Lei 9.065 arts. 15 e 16). A CSLL não é dedutível do IRPJ (A.058).</p>`}\n'
          'function lucroReg(x,c){'))
R.append(('  h+=`<p class="law">Lucros distribuídos ficam fora do imposto do sócio',
          '  if(!pr)h+=lalurTab(c);\n'
          '  h+=`<p class="law">Lucros distribuídos ficam fora do imposto do sócio'))
# textos
R.append(('<li>Real: lucro = receita − tributos − equipe − insumos e o DIFAL deles − outras despesas − depreciação, sem adições nem exclusões. IRPJ e CSLL sobre o mesmo lucro.',
          '<li>Real: lucro contábil = receita − tributos − equipe − insumos e o DIFAL deles − outras despesas − depreciação − os gastos do bloco "Ajustes do lucro real". O lucro real soma esses gastos e a provisão de rescisão (adições), tira as exclusões e compensa o prejuízo fiscal até 30% do lucro ajustado (Lei 9.065 arts. 15 e 16), no quadro da aba Lucro. A gratificação a administradores é adição só no IRPJ; a CSLL não sai da base do IRPJ.'))
R.append(('${rev?" − custo da revenda":""}, sem adições nem exclusões.</p>', '${rev?" − custo da revenda":""}, com as adições e exclusões da ficha (quadro do LALUR na aba Lucro).</p>'))
R.append(('; e a contribuição assistencial patronal.', '; a contribuição assistencial patronal; e os gastos do bloco "Ajustes do lucro real" da ficha (multas, brindes, doações), que também são despesa no Simples.'))
R.append(('a provisão de rescisão, da rotatividade da ficha (aviso prévio, 13º e férias do aviso, FGTS e multa de 40%);',
          'a provisão de rescisão, da rotatividade da ficha (aviso prévio, 13º e férias do aviso, FGTS e multa de 40%); as adições e exclusões do Real, do bloco "Ajustes do lucro real";'))
R.append(('  </footer>',
          '        <div>Lucro Real: dossiê <span class="num">pesquisas-legais/salao-lucro-real-adicoes-exclusoes</span> (21/11/2026): IN RFB 1.700 arts. 62 a 64, 68 a 71, 78, 83, 131 a 143 e Anexos I e II, RIR arts. 260, 261, 311, 315, 339, 342, 343 e 352, Lei 9.249 art. 13, Lei 9.065 arts. 15 e 16.</div>\n'
          '  </footer>'))
R.append(('    ["Insumo estético aplicado no cliente e o crédito de CBS (2027)",',
          '    ["Lucro Real: retirada variável do sócio",c.reg==="RE","A retirada do sócio que não é pró-labore mensal e fixo é adição no lucro real (IN RFB 1.700 art. 78; Anexo I, A.181)? E o bônus ao sócio-gerente é gratificação a administrador, adição só no IRPJ (RIR art. 315; A.163)?","O A.181 remete à Lei 4.506 art. 47 § 5º e ao DL 5.844 art. 43, que a pesquisa não leu: a leitura de que a retirada variável é adição é inferida. Se o salão paga ao sócio um valor que muda todo mês, lance a parte variável em \\"Outras adições\\" ou na gratificação, conforme a resposta."],\n'
          '    ["Insumo estético aplicado no cliente e o crédito de CBS (2027)",'))

if __name__ == "__main__":
    aplica(sys.argv[1], R, "p08")
