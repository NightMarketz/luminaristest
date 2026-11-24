// Aplica Tailwind (CDN, com prefixo tw-) e Recharts (ilha React) ao simulador do salão.
// Uso: node patch-recharts-tailwind.mjs <entrada.html> <saida.html>
// É um patch sobre o HTML publicado, não uma cópia do simulador: outras sessões editam o arquivo
// ao mesmo tempo, e reaplicar o patch sobre a versão mais nova evita conflito de merge.
// Cada âncora é conferida: se o simulador mudou e uma âncora sumiu, o script para com erro.
import { readFileSync, writeFileSync } from "node:fs";

const [, , entrada, saida] = process.argv;
if (!entrada || !saida) {
  console.error("uso: node patch-recharts-tailwind.mjs <entrada.html> <saida.html>");
  process.exit(2);
}
let html = readFileSync(entrada, "utf8");
const MARCA = "/* rc-ilha v1 */";
if (html.includes(MARCA)) {
  console.error("já tem o patch (rc-ilha v1); nada a fazer");
  process.exit(1);
}

function trocar(rotulo, de, para) {
  const n = html.split(de).length - 1;
  if (n !== 1) {
    console.error(`âncora "${rotulo}": esperava 1 ocorrência, achei ${n}. O simulador mudou; revise o patch.`);
    process.exit(1);
  }
  html = html.replace(de, () => para);
}

// 1. <head>: Tailwind e Recharts por CDN, com versão fixa. React 18 porque o 19 não tem UMD.
const LIBS = `<script src="https://cdn.tailwindcss.com/3.4.17"></script>
<script>
/* tw- no prefixo e sem preflight: o CSS à mão do simulador continua mandando; Tailwind só age onde a classe tw-* aparece */
if(window.tailwind)tailwind.config={prefix:"tw-",corePlugins:{preflight:false},theme:{extend:{
  colors:{ink:"var(--ink)",muted:"var(--muted)",paper:"var(--paper)",sunk:"var(--sunk)",line:"var(--line)",berry:"var(--berry)",teal:"var(--teal)",bad:"var(--bad)"},
  fontFamily:{display:["var(--f-display)"],body:["var(--f-body)"],mono:["var(--f-mono)"]}}}};
</script>
<script defer src="https://cdn.jsdelivr.net/npm/react@18.3.1/umd/react.production.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/react-dom@18.3.1/umd/react-dom.production.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/react-is@18.3.1/umd/react-is.production.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/recharts@3.10.1/umd/Recharts.js"></script>
`;
const reFonts = /<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com\/css2\?family=Bricolage[^>]*>\n/;
if (!reFonts.test(html)) {
  console.error('âncora "fontes do Google": não achei o <link> das fontes');
  process.exit(1);
}
html = html.replace(reFonts, (m) => m + LIBS);

// 2. O gráfico SVG feito à mão vira o plano B (sem rede, ou antes das bibliotecas carregarem).
trocar("grafico()", "function grafico(V,rot){", "function graficoSvg(V,rot){");

const ILHA = String.raw`${MARCA}
// Gráfico da aba Regime em Recharts. grafico() devolve um marcador que já traz o SVG antigo dentro;
// rcMount() troca o marcador por uma raiz React que sobrevive entre renders (render() refaz o innerHTML a cada tecla).
let rcData=[]; const RCS=[];
function grafico(V,rot){
  const i=rcData.length; rcData.push({V,rot});
  return '<div class="tw-w-full tw-max-w-[520px]" data-rc="'+i+'" role="img" aria-label="'+esc("Imposto do mês em cada regime conforme "+rot)+'">'+graficoSvg(V,rot)+'</div>';
}
function GraficoRC({V,rot}){
  const h=React.createElement, {ResponsiveContainer,ComposedChart,Line,XAxis,YAxis,CartesianGrid,Tooltip,ReferenceLine,ReferenceDot}=Recharts;
  const ys=V.pts.flatMap(p=>[p.S,p.P,p.R]).filter(v=>v!=null);
  const ys0=niceStep(Math.max(...ys,1),4), ymax=Math.ceil(Math.max(...ys,1)/ys0)*ys0, xs=niceStep(V.xmax,4);
  const marcas=(max,passo)=>{const a=[];for(let v=0;v<=max+1e-6;v+=passo)a.push(v);return a};
  const tick={fill:"var(--muted)",fontFamily:"var(--f-mono)",fontSize:12};
  const SER=[["S","S"],["P","PR"],["R","RE"]];
  const dica=({active,payload,label})=>!active||!payload||!payload.length?null:
    h("div",{className:"tw-rounded-lg tw-border tw-border-solid tw-border-line tw-bg-paper tw-px-3 tw-py-2 tw-text-[13px] tw-shadow-md"},
      h("div",{className:"tw-mb-1 tw-font-semibold tw-text-ink"},rot+": "+R(label)),
      payload.map(p=>{const rk=SER.find(s=>s[0]===p.dataKey)[1];
        return h("div",{key:p.dataKey,className:"tw-flex tw-items-center tw-justify-between tw-gap-4 tw-text-ink"},
          h("span",{className:"tw-flex tw-items-center tw-gap-1.5"},h("i",{className:"tw-inline-block tw-h-2.5 tw-w-2.5 tw-rounded-sm",style:{background:COR[rk]}}),CURTO[rk]),
          h("span",{className:"tw-font-mono"},R(p.value)))}));
  const ponto=(i)=>(p)=>h("g",null,
    h("circle",{cx:p.cx,cy:p.cy,r:10,style:{fill:"var(--paper)",stroke:"var(--ink)",strokeWidth:1.5}}),
    h("text",{x:p.cx,y:p.cy+4,textAnchor:"middle",style:{fill:"var(--ink)",font:"600 12px var(--f-mono)"}},String(i+1)));
  const rotulo=(texto,pos)=>({value:texto,position:pos,fill:"var(--muted)",fontSize:12,fontFamily:"var(--f-mono)"});
  return h("div",null,
    h("div",{className:"tw-mb-1 tw-font-mono tw-text-xs tw-text-muted"},"imposto do mês, R$"),
    h(ResponsiveContainer,{width:"100%",height:280},
      h(ComposedChart,{data:V.pts,margin:{top:8,right:30,left:0,bottom:0}},
        h(CartesianGrid,{stroke:"var(--line)",vertical:false}),
        h(XAxis,{type:"number",dataKey:"v",domain:[0,V.xmax],ticks:marcas(V.xmax,xs),tickFormatter:Rc,tick,stroke:"var(--line)",allowDataOverflow:true,height:24,minTickGap:14}),
        h(YAxis,{type:"number",domain:[0,ymax],ticks:marcas(ymax,ys0),tickFormatter:Rc,tick,stroke:"var(--line)",width:58}),
        h(Tooltip,{content:dica,cursor:{stroke:"var(--muted)",strokeDasharray:"3 3"}}),
        V.limite&&V.limite<V.xmax?h(ReferenceLine,{x:V.limite,stroke:"var(--bad)",strokeDasharray:"2 3",label:{...rotulo("limite do Simples","insideTopRight"),dy:12}}):null,
        h(ReferenceLine,{x:V.atual,stroke:"var(--ink)",strokeDasharray:"5 4",label:{...rotulo("hoje",V.atual>V.xmax*.85?"insideTopRight":"insideTopLeft"),dy:30}}),
        SER.map(([k,rk])=>h(Line,{key:k,type:"linear",dataKey:k,name:CURTO[rk],stroke:COR[rk],strokeWidth:2.5,dot:false,activeDot:{r:4},connectNulls:false,isAnimationActive:false})),
        V.cruz.map((c,i)=>h(ReferenceDot,{key:"c"+i,x:c.v,y:c.custo,r:10,shape:ponto(i),ifOverflow:"extendDomain"})))),
    h("div",{className:"tw-mt-1 tw-text-center tw-font-mono tw-text-xs tw-text-muted"},rot+", R$"));
}
function rcMount(){
  if(!(window.React&&window.ReactDOM&&window.Recharts))return; // plano B: fica o SVG antigo
  document.querySelectorAll("#o1b [data-rc]").forEach(ph=>{
    const i=+ph.dataset.rc, d=rcData[i]; if(!d)return;
    let s=RCS[i];
    if(!s){const el=document.createElement("div");s=RCS[i]={el,root:ReactDOM.createRoot(el)}}
    s.el.className=ph.className; s.el.setAttribute("role","img"); s.el.setAttribute("aria-label",ph.getAttribute("aria-label"));
    ph.replaceWith(s.el);
    s.root.render(React.createElement(GraficoRC,d));
  });
}
window.addEventListener("load",rcMount); // as bibliotecas vêm com defer: o primeiro render sai com o SVG e troca aqui
`;
trocar("textoVirada()", "function textoVirada(V){", ILHA + "function textoVirada(V){");

// 3. Cada render da aba Regime zera a lista de gráficos e, depois do innerHTML, monta os de Recharts.
trocar("renderRegime()", "function renderRegime(x,c){", "function renderRegime(x,c){\n  rcData=[];");
trocar("#o1b innerHTML", '$("#o1b").innerHTML=hb;', '$("#o1b").innerHTML=hb;rcMount();');

writeFileSync(saida, html);
console.log(`ok: ${saida} (${html.length} bytes)`);
