"""Patch 10b: item 7, motor do ano mês a mês (BRIEF-ITEM7-MESES §3.1, 3.2 e 3.6; forks F7-1 a F7-3 em DECISOES).

escalaMes(x, sv, rv): a ficha do mês com sv de serviços e rv de revenda. Escala serviços por pessoa e insumo pela mesma razão
(o insumo acompanha os atendimentos); comissão acompanha sozinha; salário fixo, despesas, depreciação, TFE e benefícios ficam iguais.
anoMeses(x, modo, reg, D): sem x.meses (modo "iguais") devolve null e quem chama usa a conta de antes, 12 × o mês (invariante).
Com x.meses: cenarioReg de cada mês com a receita do ano até o mês anterior (rbaAnt) e o RBT12 da janela de janelaRbt() montados
da série de receitas (ano corrente + ano anterior digitado ou no mesmo perfil); D = campos da aba DAS (digitados valem só na competência).
Meses antes da abertura do CNPJ (aba DAS) ficam fora do ano.
Também: regimes() aceita x.lc224Rec (receita anualizada do período, para o limite de R$ 5 mi da LC 224) e expõe PR.presC (base da CSLL).
Uso: python p10b_motor_meses.py <html>   (depois do p10a)
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from _pt import aplica

R = []
R.append(("const F=lc224Fator(12*(bF+rev)), issV=",
          "const F=lc224Fator(x.lc224Rec>0?x.lc224Rec:12*(bF+rev)), issV="))
R.append(("  out.PR.presBase=lp+lpR; // base do IRPJ do mês",
          "  out.PR.presC=lp+lcR; // meses v1: base da CSLL do mês, para o trimestre\n  out.PR.presBase=lp+lpR; // base do IRPJ do mês"))
MOTOR = r'''// meses v1 (item 7): o ano mês a mês. x.meses = {modo:"SZ"|"MM", sv:[12] serviços do mês, rv:[12] revenda do mês,
// ant:[12]|null receita bruta do ano anterior (null em uma posição = mesmo perfil do ano corrente), real:"TRI"|"EST"|"ESTB"}.
// Sem x.meses, ou no modo "iguais", anoMeses() devolve null: a página usa 12 × o mês, a conta de antes.
function escalaMes(x,sv,rv){const o={...x};
  if(numP(x.serv)>0){const k=sv/x.serv;o.serv=sv;
    if(x.servPor&&typeof x.servPor==="object"){o.servPor={};for(const id in x.servPor)o.servPor[id]=numP(x.servPor[id])*k}
    o.insumo=numP(x.insumo)*k;if(x.insPor&&typeof x.insPor==="object"){o.insPor={};for(const id in x.insPor)o.insPor[id]=numP(x.insPor[id])*k}}
  else{o.serv=sv;o.servPor=undefined}
  o.rev=rv;return o}
const MESES_ON=x=>!!(x&&x.meses&&(x.meses.modo==="SZ"||x.meses.modo==="MM")&&Array.isArray(x.meses.sv)&&x.meses.sv.length===12);
// D: o que a aba DAS dá (dasX): ini (abertura) vale para todos os meses; rbt12, rbaAnt e mesAnt digitados, só para a competência D.mes.
function anoMeses(x,modo,reg,D){
  if(!MESES_ON(x))return null;
  const M=x.meses, ano=+x.ano, ini=D&&D.ini&&D.ini.a>0?D.ini:null;
  const xs=M.sv.map((s,i)=>({...escalaMes(x,numP(s),numP(M.rv[i])),mes:i+1}));
  // receita bruta do Simples de cada mês (serviços sem a cota do parceiro com CNPJ + revenda)
  const c0=xs.map(xm=>cenario(xm,modo)), rec=c0.map(c=>c.recMes), lei=c0.map((c,i)=>c.servLei+numP(xs[i].rev));
  const ativo=(a,m)=>!(ini&&a*12+m<ini.a*12+ini.m);
  const antIn=Array.isArray(M.ant)?M.ant:[], temAnt=antIn.some(v=>v!=null);
  let ant=rec.map((v,i)=>antIn[i]!=null?numP(antIn[i]):v);
  // F7-3: sem a grade do ano anterior, o mesmo perfil; com a "Receita do ano passado" da aba DAS, o perfil escalado para somar ela
  if(!temAnt&&D&&D.recAnoAnt!=null&&D.recAnoAnt>=0){const t=ant.reduce((a,v)=>a+v,0);ant=ant.map(v=>t>0?v*D.recAnoAnt/t:D.recAnoAnt/12)}
  const recA=rec.map((v,i)=>ativo(ano,i+1)?v:0), antA=ant.map((v,i)=>ativo(ano-1,i+1)?v:0);
  const serie=(a,m)=>a===ano?recA[m-1]:a>ano?0:ativo(a,m)?antA[m-1]:0;
  const meses=[];
  for(let m=1;m<=12;m++){
    if(!ativo(ano,m)){meses.push(null);continue}
    const J=janelaRbt(m,ano);let rbt=0;for(let t=0;t<12;t++){const q=mesAdd(J.de.m,J.de.a,t);rbt+=serie(q.a,q.m)}
    const pv=mesAdd(m,ano,-1), typ=!!(D&&D.mes===m);
    const xm={...xs[m-1],ini,recAnoAnt:antA.reduce((a,v)=>a+v,0),rbaAnt:typ&&D.rbaAnt!=null?D.rbaAnt:recA.slice(0,m-1).reduce((a,v)=>a+v,0),
      mesAnt:typ&&D.mesAnt!=null?D.mesAnt:serie(pv.a,pv.m)};
    // início de atividade: o RBT12 sai da regra (inicioAtiv) com as receitas acima; fora dela, a janela da série
    const ia=inicioAtiv(xm,rec[m-1]), regra=!!(ia&&!ia.erro&&ia.regra), dig=typ&&D.rbt12>0;
    if(dig)xm.rbt12=D.rbt12;else if(!regra)xm.rbt12=rbt>0?rbt:null;
    // LC 224: o limite de R$ 5 mi é do ano, proporcional ao período; a conta anualiza o trimestre do mês (serviços sem cota de parceiro + revenda)
    const q0=Math.floor((m-1)/3)*3;xm.lc224Rec=4*(lei[q0]+lei[q0+1]+lei[q0+2]);
    const c=cenarioReg(xm,modo,reg);c.mesN=m;c.rbtPerfil=!dig&&!regra;meses.push(c)}
  const AM={meses,real:M.real==="EST"||M.real==="ESTB"?M.real:"TRI",modo:M.modo,rec,ant:antA,temAnt};
  lucroPeriodo(AM,x);
  const on=meses.filter(Boolean), s=f=>on.reduce((a,c)=>a+(f(c)||0),0);
  AM.ano={rec:s(c=>c.recMes),trib:s(c=>c.tribTot),folha:s(c=>c.folha),resultado:s(c=>c.resultado),lucroTrib:s(c=>c.tribG?c.tribG.lucro:c.irpjMes),
    limIsento:on.some(c=>c.limIsento==null)?null:s(c=>c.limIsento/12),n:on.length,serv:s(c=>c.reg==="S"||c.reg==="SR"?c.servSalao:c.regs.bF),rev:s(c=>numP(c.regs.rev))};
  return AM}
function lucroPeriodo(AM,x){} // meses v1: IRPJ e CSLL por período (trimestre ou ano) no Presumido e no Real entram no p10c
'''
R.append(("/* decisoes v1 */\n// Compara cenários", MOTOR + "/* decisoes v1 */\n// Compara cenários"))

if __name__ == "__main__":
    aplica(sys.argv[1], R, "p10b")
