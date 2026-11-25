"""Patch 01 (lacunas L-20261121-135755-b3ef e L-20261120-224539-b456): remove código morto do simulador.

Uso: python p01_codigo_morto.py <arquivo.html>   (aplica no lugar; falha se algum trecho não casar)
Base: versão 43 do artifact 4T2JYWqnJXm9e6p2aUfDLu.
"""
import sys

REPL = [
    # cenario(): ramo semIss/baseSemIss (x.alug é sempre false desde a v12)
    ("    out.semIss=parc&&x.alug;\n"
     "    // sem ISS só a cota do salão sobre os serviços dos parceiros (aluguel de bem móvel); serviço da equipe do salão segue com ISS\n"
     "    out.baseSemIss=out.semIss?Math.max(0,servParc-repasse):0;\n"
     "    const g=guiaDAS(ano,ap,rbt,e3,e1,servSalao,out.baseSemIss,x.rev,pctF(x.rcos,100)); out.guia=g;",
     "    const g=guiaDAS(ano,ap,rbt,e3,e1,servSalao,x.rev,pctF(x.rcos,100)); out.guia=g;"),
    ("    out.issFora=ap.impedido?r2c((servSalao-out.baseSemIss)*0.05):0;",
     "    out.issFora=ap.impedido?r2c(servSalao*0.05):0;"),
    # cenario(): Presumido antigo, superado por regimes()
    ("  // Presumido 2026, só serviços\n"
     "  const b=servLei, lp=.32*b;\n"
     "  out.pres={PIS:.0065*b,Cofins:.03*b,IRPJ:.15*lp+.10*Math.max(0,lp-20000),CSLL:.09*lp,ISS:.05*b,INSS:.20*out.salarios};\n"
     "  out.presTot=Object.values(out.pres).reduce((a,c)=>a+c,0);\n"
     "  out.simplesServ=e3?out.dasServ+out.issFora:null;\n",
     ""),
    # regimes(): base do ISS no DAS
    ("    // base do ISS no DAS: sem a cota tratada como aluguel (baseSemIss); se a conta não a der, sem nada quando semIss\n"
     "    const das=c.dasServ, keys=P3[String(ano)].k, issBase=c.servSalao-(c.baseSemIss!=null?c.baseSemIss:(c.semIss?c.servSalao:0));",
     "    const das=c.dasServ, keys=P3[String(ano)].k, issBase=c.servSalao;"),
    # guiaDAS(): parâmetro baseSemIss
    ("function guiaDAS(ano,ap,rbt,e3,e1,serv,baseSemIss,rev,mono){",
     "function guiaDAS(ano,ap,rbt,e3,e1,serv,rev,mono){"),
    ("  P3[ano].k.forEach(k=>{const b=serv-(k===\"ISS\"?baseSemIss:0);servR[k]=r2c(p3.reduce((a,[f,t])=>a+f*b*(t[k]||0),0))});",
     "  P3[ano].k.forEach(k=>{servR[k]=r2c(p3.reduce((a,[f,t])=>a+f*serv*(t[k]||0),0))});"),
    # sugestoes(): sr.tem e alug, calculados e nunca lidos
    (",dif:totReg(R27,\"SR\")-totReg(R27,\"S\"),tem:!!(reg&&reg.sr)}:null;",
     ",dif:totReg(R27,\"SR\")-totReg(R27,\"S\")}:null;"),
    ("  return{ano,vinc,regime,sr,contab,prol,alug:!x.alug};",
     "  return{ano,vinc,regime,sr,contab,prol};"),
    # DEF e readForm: chave alug fixa em false
    ("const DEF={fonte:\"CAT\",serv:40000,rev:0,cmv:50,alug:false,desp:8000,",
     "const DEF={fonte:\"CAT\",serv:40000,rev:0,cmv:50,desp:8000,"),
    ("const x={fonte,serv:n(\"f_serv\"),rev:n(\"f_rev\"),cmv:Math.min(100,n(\"f_cmv\")),\n    alug:false,desp:n(\"f_desp\"),",
     "const x={fonte,serv:n(\"f_serv\"),rev:n(\"f_rev\"),cmv:Math.min(100,n(\"f_cmv\")),\n    desp:n(\"f_desp\"),"),
]
CALLOUT_START = "      if(c.semIss)h+=`<div class=\"callout warn\"><b>Você marcou a cota como aluguel sem ISS.</b>"


def main(path):
    s = open(path, encoding="utf8").read()
    for old, new in REPL:
        n = s.count(old)
        if n != 1:
            sys.exit(f"trecho casou {n} vezes: {old[:80]!r}")
        s = s.replace(old, new)
    i = s.find(CALLOUT_START)
    if i < 0 or s.count(CALLOUT_START) != 1:
        sys.exit("callout semIss não achado")
    j = s.index("\n", i)
    s = s[:i] + s[j + 1:]
    for k in ("semIss", "baseSemIss", "presTot", "simplesServ", "alug:"):
        if k in s:
            sys.exit(f"ainda resta {k}")
    open(path, "w", encoding="utf8", newline="").write(s)
    print("p01 aplicado")


if __name__ == "__main__":
    main(sys.argv[1])
