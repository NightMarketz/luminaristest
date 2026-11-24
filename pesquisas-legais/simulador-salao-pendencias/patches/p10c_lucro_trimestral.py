"""Patch 10c: item 7, IRPJ e CSLL por período no Presumido e no Real quando os meses variam (BRIEF §3.3 a 3.5; fork F7-4).

Dossiê pesquisas-legais/salao-trimestre-adicional-irpj: adicional de 10% sobre o que passar de R$ 20 mil × meses do período
(Lei 9.249 art. 3º § 1º): R$ 60 mil no trimestre, R$ 240 mil no ajuste anual. Trimestres encerrados em 31/3, 30/6, 30/9 e 31/12
(Lei 9.430 art. 1º); Presumido sobre a receita do período (art. 25 I); CSLL pelas mesmas regras (art. 28; Lei 9.249 art. 20 I).
Real: trimestral (padrão) ou estimativa mensal (art. 2º), com ou sem balancete de suspensão (Lei 8.981 art. 35); na estimativa o
imposto do ano é o do lucro real anual (art. 2º § 3º), e as estimativas são antecipação (art. 2º § 4º IV): saldo em março (art. 6º § 1º I).
Compensação de prejuízo fiscal e base negativa: até 30% do lucro ajustado do período, consumindo o saldo em ordem (Lei 9.065 arts. 15 e 16).
Cada mês recebe a parte do imposto do período na proporção da base positiva dele (provisão mensal por competência).
Uso: python p10c_lucro_trimestral.py <html>   (depois do p10b)
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from _pt import aplica

LP = r'''// meses v1: IRPJ e CSLL por período no Presumido e no Real (dossiê salao-trimestre-adicional-irpj).
// Adicional sobre o que passar de R$ 20 mil × meses do período (Lei 9.249 art. 3º § 1º); trimestre encerrado em 31/3, 30/6, 30/9 e 31/12
// (Lei 9.430 art. 1º); Presumido sobre a receita do período (art. 25 I); CSLL pelas mesmas regras (art. 28). Real por estimativa: o imposto
// do ano é o do lucro real de 31/12 (art. 2º § 3º), as estimativas são antecipação (§ 4º IV) e o saldo vence em março (art. 6º § 1º I);
// com balancete, paga-se só o que o lucro real acumulado pede (Lei 8.981 art. 35). Compensação até 30% do período, saldo em ordem (Lei 9.065 arts. 15 e 16).
function impPer(b,nm,ir){return ir?LEI.irpj*Math.max(0,b)+LEI.adic*Math.max(0,b-LEI.adicLim*nm):LEI.csll*Math.max(0,b)}
function lucroPeriodo(AM,x){
  const ms=AM.meses, est=AM.real!=="TRI";
  const bs=ms.map(c=>!c||(c.reg!=="PR"&&c.reg!=="RE")?null:c.reg==="PR"?{reg:"PR",bI:c.regs.PR.presBase,bC:c.regs.PR.presC}:{reg:"RE",bI:c.regs.lalur.TI,bC:c.regs.lalur.TC});
  // períodos: o trimestre; no Real por estimativa, o ano
  const grp=[];bs.forEach((b,i)=>{if(!b)return;const key=b.reg==="RE"&&est?"ANO":b.reg+Math.floor(i/3);let g=grp.find(o=>o.key===key);if(!g)grp.push(g={key,reg:b.reg,ix:[],ano:key==="ANO"});g.ix.push(i)});
  let sI=numP(x.pfis), sC=numP(x.bneg);
  // meses do período: os meses ativos dele (abertura do CNPJ ou saída do Simples no meio do trimestre ou do ano encurtam o período)
  AM.per=grp.map(g=>{const n=g.ix.length, SI=g.ix.reduce((a,i)=>a+bs[i].bI,0), SC=g.ix.reduce((a,i)=>a+bs[i].bC,0);
    let cI=0,cC=0;if(g.reg==="RE"){cI=Math.min(sI,.3*Math.max(0,SI));cC=Math.min(sC,.3*Math.max(0,SC));sI-=cI;sC-=cC}
    const LI=SI-cI, LCs=SC-cC, I=impPer(LI,n,true), C=impPer(LCs,n,false), q=Math.floor(g.ix[0]/3)+1;
    const lbl=g.ano?"ajuste anual":q+"º trimestre", wI=g.ix.map(i=>Math.max(0,bs[i].bI)), wC=g.ix.map(i=>Math.max(0,bs[i].bC));
    const tI=wI.reduce((a,v)=>a+v,0), tC=wC.reduce((a,v)=>a+v,0);
    g.ix.forEach((i,j)=>{const c=ms[i], Ish=tI>0?I*wI[j]/tI:I/g.ix.length, Csh=tC>0?C*wC[j]/tC:C/g.ix.length, its=c.tribIt||[];
      const pc=its.filter(t=>/^(PIS|Cofins)/.test(t.k)).reduce((a,t)=>a+t.v,0), d=Ish+Csh-c.tribG.lucro;
      c.tribTot+=d;c.resultado-=d;c.tribG={...c.tribG,lucro:Ish+Csh};
      c.tribIt=its.filter(t=>t.g!=="lucro").concat([{k:"IRPJ e adicional ("+lbl+")",bl:"parte do mês",base:Ish,al:1,v:Ish,g:"lucro"},{k:"CSLL ("+lbl+")",bl:"parte do mês",base:Csh,al:1,v:Csh,g:"lucro"}]);
      c.lucroPer={lbl,reg:g.reg,n,SI,SC,cI,cC,LI,LC:LCs,I,C,Ish,Csh};c.lucroAno=c.resultado*12;c.porSocio=c.resultado/x.soc;
      if(c.reg==="PR")c.limIsento=12*(c.regs.PR.presBase-pc-Ish-Csh)});
    return{lbl,reg:g.reg,ix:g.ix,n,SI,SC,cI,cC,LI,LC:LCs,I,C}});
  // estimativa mensal (Lei 9.430 art. 2º): base = a mesma presunção do Presumido sobre a receita do mês; com balancete (ESTB), o mês paga
  // só até o imposto do lucro real acumulado (Lei 8.981 art. 35). Pagamento no mês seguinte (art. 6º); saldo do ajuste em março.
  if(est&&AM.per.some(p=>p.reg==="RE"&&p.lbl==="ajuste anual")){const P=AM.per.find(p=>p.reg==="RE"&&p.lbl==="ajuste anual"), pg={I:[],C:[]};let pI=0,pC=0,aI=0,aC=0,k=0;
    ms.forEach((c,i)=>{if(!c||c.reg!=="RE"){pg.I.push(0);pg.C.push(0);return}k++;
      const eI=impPer(c.regs.PR.presBase,1,true), eC=impPer(c.regs.PR.presC,1,false);let vI=eI,vC=eC;
      if(AM.real==="ESTB"){aI+=bs[i].bI;aC+=bs[i].bC;const cI=Math.min(numP(x.pfis),.3*Math.max(0,aI)), cC=Math.min(numP(x.bneg),.3*Math.max(0,aC));
        vI=Math.max(0,Math.min(eI,impPer(aI-cI,k,true)-pI));vC=Math.max(0,Math.min(eC,impPer(aC-cC,k,false)-pC))}
      pI+=vI;pC+=vC;pg.I.push(vI);pg.C.push(vC)});
    AM.est={I:pg.I,C:pg.C,pagoI:pI,pagoC:pC,ajI:P.I-pI,ajC:P.C-pC}}
}
'''
R = [("function lucroPeriodo(AM,x){} // meses v1: IRPJ e CSLL por período (trimestre ou ano) no Presumido e no Real entram no p10c\n", LP)]

if __name__ == "__main__":
    aplica(sys.argv[1], R, "p10c")
