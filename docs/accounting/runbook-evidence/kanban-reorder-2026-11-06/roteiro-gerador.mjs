// Gera os roteiros do RUNBOOK-KANBAN-REORDER (passos 6b, 9, 10) para scripts/runbook-tela.mjs.
import fs from 'node:fs';
const API = 'http://127.0.0.1:4150/api';
const OUT = 'kanban-reorder-2026-11-06';
const H = `
const API=${JSON.stringify(API)};
const api=async(m,p,b)=>{const tok=document.cookie.split('; ').find(c=>c.startsWith('auth_token='))?.split('=')[1];
 const r=await fetch(API+p,{method:m,headers:{'Content-Type':'application/json',...(tok?{Authorization:'Bearer '+decodeURIComponent(tok)}:{})},body:b?JSON.stringify(b):undefined,credentials:'include'});
 return {status:r.status,json:await r.json().catch(()=>null)};};
const cards=()=>[...document.querySelectorAll('[aria-roledescription="sortable"]')];
const nm=e=>e.innerText.trim().split('\\n')[0];
const card=n=>cards().find(e=>nm(e)===n);
const board=()=>{const o={};for(const h of document.querySelectorAll('main h2')){const col=h.parentElement.parentElement;o[h.innerText.trim()]=[...col.querySelectorAll('[aria-roledescription="sortable"]')].map(nm);}return o;};
const ctr=e=>{const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};};
const fmt=b=>Object.entries(b).map(([k,v])=>k+': '+(v.join(', ')||'(vazia)')).join(' | ');
`;
const ev = (js, extra = {}) => ({ op: 'eval', js: `(async()=>{${H}${js}})()`, ...extra });
const goKanban = [{ op: 'goto', url: '/dashboard?category=kanban', wait: 3000 }, { op: 'waitText', text: 'TO DO', ms: 20000 }];
const f5 = [{ op: 'reload', wait: 3000 }, { op: 'waitText', text: 'TO DO', ms: 20000 }];
const boardLog = (tag) => ev(`return '${tag}: '+fmt(board());`);
const expectCol = (col, list, tag) => ev(`const b=board();const got=JSON.stringify(b[${JSON.stringify(col)}]);const exp=${JSON.stringify(JSON.stringify(list))};
 if(got!==exp) throw new Error('${tag}: '+${JSON.stringify(col)}+' = '+got+' (esperado '+exp+')'); return '${tag} confere: '+${JSON.stringify(col)}+' = '+got;`);
// ponto no vão entre dois cards da mesma coluna, a 'off' px abaixo do card de cima; loga as distâncias aos centros
const gap = (top, bottom, off) => `(()=>{${H}const a=card(${JSON.stringify(top)}).getBoundingClientRect(),b=card(${JSON.stringify(bottom)}).getBoundingClientRect();
 const p={x:a.x+a.width/2,y:a.bottom+${off}};window.__gap={ponto:p,vao:[a.bottom,b.top],dist_centro_cima:Math.round(Math.hypot(p.x-(a.x+a.width/2),p.y-(a.y+a.height/2))),dist_centro_baixo:Math.round(Math.hypot(p.x-(b.x+b.width/2),p.y-(b.y+b.height/2))),dist_borda_cima:Math.round(p.y-a.bottom),dist_borda_baixo:Math.round(b.top-p.y)};return p;})()`;
const from = (n) => `(()=>{${H}const e=card(${JSON.stringify(n)});if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+Math.min(r.height/2,30)};})()`;
const emptyArea = (col) => `(()=>{const h=[...document.querySelectorAll('main h2')].find(h=>h.innerText.trim()===${JSON.stringify(col)});const r=h.parentElement.parentElement.getBoundingClientRect();return {x:r.x+r.width/2,y:r.bottom-40};})()`;
const gapLog = ev(`return JSON.stringify(window.__gap ?? null);`);

const base = { out: OUT, base: 'http://127.0.0.1:3150', api: API, user: 'admin@luminaris.test', pass: '$SEED_ADMIN', profile: 'kro-1106', quietGet: true };

const seed = {
  ...base, tag: 'seed', steps: [
    { op: 'login' },
    ev(`const l=await api('GET','/dynamic-tables');const ts=Array.isArray(l.json)?l.json:(l.json?.data??l.json?.tables??[]);
 const t=ts.find(x=>x.name==='Tasks');if(!t)throw new Error('Tasks ausente');
 const ex=await api('GET','/dynamic-tables/'+t.id+'/data');const rows=Array.isArray(ex.json)?ex.json:(ex.json?.data??ex.json?.records??[]);
 if(rows.length)throw new Error('Tasks não está vazia ('+rows.length+'); não semeio por cima');
 const today=new Date().toISOString().slice(0,10);const out=['Tasks '+t.id+' — linhas existentes: 0'];
 const cs=[['A fazer 1','To Do',1000],['A fazer 2','To Do',2000],['A fazer 3','To Do',3000],['A fazer 4','To Do',4000],['Em andamento 1','In Progress',1000],['Em andamento 2','In Progress',2000],['Feito 1','Done',1000]];
 for(const [name,status,order] of cs){const r=await api('POST','/dynamic-tables/'+t.id+'/data',{data:{name,status,order,priority:'Medium',date:today}});out.push(r.status+' POST '+name+' '+status+' order='+order);if(r.status>=300)throw new Error(out.join('\\n')+' '+JSON.stringify(r.json).slice(0,200));}
 return out.join('\\n');`),
  ],
};

const p6b = {
  ...base, tag: 'p6b', netFile: 'p6b-net', steps: [
    ...goKanban, boardLog('antes'), { op: 'shot', name: 'p6b-antes' },
    // (a) vão entre "A fazer 3" e "A fazer 4", 3 px abaixo de "A fazer 3" (mais perto dele): "A fazer 1" vai para a posição dele
    { op: 'drag', from: from('A fazer 1'), to: gap('A fazer 3', 'A fazer 4', 3), wait: 2500 }, gapLog,
    boardLog('a) depois do arrasto'), { op: 'shot', name: 'p6b-a-depois' },
    expectCol('TO DO', ['A fazer 2', 'A fazer 3', 'A fazer 1', 'A fazer 4'], 'a) depois do arrasto'),
    ...f5, boardLog('a) depois do F5'), { op: 'shot', name: 'p6b-a-depois-f5' },
    expectCol('TO DO', ['A fazer 2', 'A fazer 3', 'A fazer 1', 'A fazer 4'], 'a) depois do F5'),
    // (b) o mais próximo é o próprio card: "A fazer 2" solto no vão logo abaixo dele (3 px) → ordem igual, sem update
    { op: 'drag', from: from('A fazer 2'), to: gap('A fazer 2', 'A fazer 3', 3), wait: 2500 }, gapLog,
    boardLog('b) depois do arrasto'), { op: 'shot', name: 'p6b-b-depois' },
    expectCol('TO DO', ['A fazer 2', 'A fazer 3', 'A fazer 1', 'A fazer 4'], 'b) depois do arrasto'),
    // contraprova (passo 6): área vazia de OUTRA coluna → fim dela
    { op: 'drag', from: from('A fazer 4'), to: emptyArea('DONE'), wait: 2500 },
    boardLog('c) depois do arrasto'), { op: 'shot', name: 'p6b-c-depois' },
    expectCol('DONE', ['Feito 1', 'A fazer 4'], 'c) depois do arrasto'),
    ...f5, boardLog('c) depois do F5'),
    expectCol('DONE', ['Feito 1', 'A fazer 4'], 'c) depois do F5'),
  ],
};

// passo 9: idioma ativo = <html lang>; compara o texto do diálogo com os valores do outro idioma (kanban_card.*)
const dlgCheck = (tag) => ev(`const lang=document.documentElement.lang;const other=lang==='en'?'pt':'en';
 const [mine,oth]=await Promise.all([lang,other].map(l=>fetch('/locales/'+l+'/database.json').then(r=>r.json())));
 const d=document.querySelector('[role="dialog"]');if(!d)throw new Error('${tag}: diálogo ausente');
 const txt=d.innerText;const low=txt.toLowerCase();
 const vaz=[...d.querySelectorAll('div')].find(x=>x.className.includes('italic'));
 const forasteiros=Object.entries(oth.kanban_card).filter(([k,v])=>v!==mine.kanban_card[k]&&low.includes(v.toLowerCase())).map(([k,v])=>k+'='+v);
 const res={lang,overlay:d.outerHTML.slice(0,d.outerHTML.indexOf('>')+1),campo_vazio:vaz?vaz.innerText:null,texto:txt.replace(/\\n+/g,' / '),forasteiros};
 if(forasteiros.length||!vaz||vaz.innerText!==mine.kanban_card.description_placeholder) throw new Error('${tag}: '+JSON.stringify(res));
 return '${tag}: '+JSON.stringify(res);`);
const placeholderCheck = (tag) => ev(`const lang=document.documentElement.lang;const mine=await fetch('/locales/'+lang+'/database.json').then(r=>r.json());
 const d=document.querySelector('[role="dialog"]');const vaz=[...d.querySelectorAll('div')].find(x=>x.className.includes('italic'));vaz.click();
 await new Promise(r=>setTimeout(r,500));const ta=d.querySelector('textarea');const ph=ta&&ta.getAttribute('placeholder');
 const btns=[...d.querySelectorAll('button')].map(b=>b.innerText.trim()).filter(Boolean);
 if(ph!==mine.kanban_card.description_placeholder) throw new Error('${tag}: placeholder='+ph);
 return '${tag}: lang='+lang+' placeholder='+JSON.stringify(ph)+' botões='+JSON.stringify(btns);`);
const openCard = ev(`const e=card('Feito 1');if(!e)throw new Error('Feito 1 ausente');e.click();await new Promise(r=>setTimeout(r,1500));return 'dialog aberto: '+!!document.querySelector('[role="dialog"]');`);
const closeOutside = [{ op: 'key', key: 'Escape', wait: 1500 }, ev(`return 'após Esc, [role=dialog] presente: '+!!document.querySelector('[role="dialog"]');`),
  ev(`const d=document.querySelector('[role="dialog"]');if(d){d.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));d.click();}await new Promise(r=>setTimeout(r,1500));const p=!!document.querySelector('[role="dialog"]');if(p)throw new Error('diálogo não fechou nem com Esc nem com clique fora');return 'após clique fora, [role=dialog] presente: '+p;`)];
const switchLang = (label) => ev(`document.querySelector('button[aria-label="Change language"]').click();await new Promise(r=>setTimeout(r,500));
 const b=[...document.querySelectorAll('button')].find(b=>b.innerText.includes(${JSON.stringify(label)}));if(!b)throw new Error('opção ${label} ausente');b.click();await new Promise(r=>setTimeout(r,3000));return 'lang agora: '+document.documentElement.lang+' url: '+location.pathname+location.search;`, { wait: 1500 });

const p9 = {
  ...base, tag: 'p9', steps: [
    ...goKanban,
    ev(`return 'idioma ativo de partida: '+document.documentElement.lang+' url: '+location.pathname+location.search;`),
    openCard, { op: 'shot', name: 'p9-detalhe-1' }, dlgCheck('idioma 1 (detalhe)'), placeholderCheck('idioma 1 (edição)'), { op: 'shot', name: 'p9-edicao-1' },
    ...closeOutside,
    ev(`return document.documentElement.lang`),
    switchLang('Português (BR)'), { op: 'waitText', text: 'TO DO', ms: 20000 },
    ev(`if(document.documentElement.lang!=='pt'){const b=[...document.querySelectorAll('button')];document.querySelector('button[aria-label="Change language"]').click();await new Promise(r=>setTimeout(r,500));[...document.querySelectorAll('button')].find(b=>b.innerText.includes('English (US)')).click();await new Promise(r=>setTimeout(r,3000));}return 'idioma 2: '+document.documentElement.lang;`),
    { op: 'waitText', text: 'TO DO', ms: 20000 },
    openCard, { op: 'shot', name: 'p9-detalhe-2' }, dlgCheck('idioma 2 (detalhe)'), placeholderCheck('idioma 2 (edição)'), { op: 'shot', name: 'p9-edicao-2' },
    ...closeOutside,
  ],
};

const p10 = {
  ...base, tag: 'p10', steps: [
    { op: 'goto', url: '/dashboard', wait: 2000 },
    ev(`const n=Object.keys(localStorage).length;localStorage.clear();return 'localStorage: '+n+' chaves antes do clear -> '+localStorage.length+' depois';`),
    { op: 'goto', url: '/dashboard?category=business', wait: 4000 },
    ev(`return 'lang='+document.documentElement.lang+' url='+location.pathname+location.search+' chaves de coluna no localStorage: '+JSON.stringify(Object.keys(localStorage));`),
    { op: 'click', sel: 'button,[role=tab],a', text: 'Units', wait: 3000 },
    { op: 'shot', name: 'p10-units' },
    ev(`const heads=[...document.querySelectorAll('thead th, [role="columnheader"]')].map(e=>e.innerText.trim()).filter(Boolean);
 const ok=heads.some(h=>/^manager$/i.test(h)||/gerente|respons/i.test(h));if(!ok)throw new Error('coluna de relação Manager ausente: '+JSON.stringify(heads));return 'cabeçalhos visíveis: '+JSON.stringify(heads);`),
  ],
};

for (const [n, r] of Object.entries({ seed, p6b, p9, p10 })) fs.writeFileSync(new URL(`./rb-${n}.json`, import.meta.url), JSON.stringify(r, null, 1));
console.log('ok');

// diagnóstico do 6b: onde o card é pego muda o "mais próximo"? print no meio do arrasto + rects visíveis
const reset = ev(`const l=await api('GET','/dynamic-tables');const ts=Array.isArray(l.json)?l.json:(l.json?.data??[]);const t=ts.find(x=>x.name==='Tasks');
 const ex=await api('GET','/dynamic-tables/'+t.id+'/data');const rows=Array.isArray(ex.json)?ex.json:(ex.json?.data??ex.json?.records??[]);
 const want={'A fazer 1':1000,'A fazer 2':2000,'A fazer 3':3000,'A fazer 4':4000};const out=[];
 for(const r of rows){const n=(r.data??r).name;if(want[n]!==undefined){const p=await api('PUT','/dynamic-tables/'+t.id+'/data/'+r.id,{data:{order:want[n],status:'To Do'}});out.push(p.status+' '+n+'='+want[n]);}}return 'reset: '+out.join(', ');`);
const grab = (n, frac) => `(()=>{${H}const e=card(${JSON.stringify(n)});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+${frac === 'top' ? 'Math.min(r.height/2,30)' : 'r.height/2'}};})()`;
const probe = `(()=>{${H}const ov=document.querySelector('.pointer-events-none.rotate-2');const o=ov&&ov.getBoundingClientRect();
 const vis=cards().filter(e=>getComputedStyle(e).opacity!=='0').map(e=>{const r=e.getBoundingClientRect();return nm(e)+'['+Math.round(r.top)+'-'+Math.round(r.bottom)+']';});
 return {ponteiro:window.__gap&&window.__gap.ponto,centro_overlay:o&&{x:Math.round(o.x+o.width/2),y:Math.round(o.y+o.height/2)},cards_visiveis:vis};})()`;
const diag = {
  ...base, tag: 'p6b-diag', steps: [
    ...goKanban, reset, ...f5, boardLog('d1 antes'),
    { op: 'drag', from: grab('A fazer 1', 'top'), to: gap('A fazer 3', 'A fazer 4', 3), probe, shot: 'p6b-d1-durante', wait: 2500 }, gapLog,
    boardLog('d1 (pego a 30 px do topo) depois'),
    reset, ...f5, boardLog('d2 antes'),
    { op: 'drag', from: grab('A fazer 1', 'center'), to: gap('A fazer 3', 'A fazer 4', 3), probe, shot: 'p6b-d2-durante', wait: 2500 }, gapLog,
    boardLog('d2 (pego no centro) depois'),
    ...f5, boardLog('d2 depois do F5'),
  ],
};
fs.writeFileSync(new URL('./rb-diag.json', import.meta.url), JSON.stringify(diag, null, 1));

const p6bF = {
  ...base, tag: 'p6b', netFile: 'p6b-net', steps: [
    ...goKanban, reset, ...f5, boardLog('antes'), { op: 'shot', name: 'p6b-antes' },
    { op: 'drag', from: grab('A fazer 1', 'center'), to: gap('A fazer 3', 'A fazer 4', 3), probe, shot: 'p6b-a-durante', wait: 2500 }, gapLog,
    boardLog('a) depois do arrasto'), { op: 'shot', name: 'p6b-a-depois' },
    expectCol('TO DO', ['A fazer 2', 'A fazer 3', 'A fazer 1', 'A fazer 4'], 'a) depois do arrasto'),
    ...f5, boardLog('a) depois do F5'), { op: 'shot', name: 'p6b-a-depois-f5' },
    expectCol('TO DO', ['A fazer 2', 'A fazer 3', 'A fazer 1', 'A fazer 4'], 'a) depois do F5'),
    { op: 'drag', from: grab('A fazer 2', 'center'), to: gap('A fazer 2', 'A fazer 3', 3), probe, shot: 'p6b-b-durante', wait: 2500 }, gapLog,
    boardLog('b) depois do arrasto'), { op: 'shot', name: 'p6b-b-depois' },
    expectCol('TO DO', ['A fazer 2', 'A fazer 3', 'A fazer 1', 'A fazer 4'], 'b) depois do arrasto'),
    { op: 'drag', from: grab('A fazer 4', 'center'), to: emptyArea('DONE'), wait: 2500 },
    boardLog('c) depois do arrasto'), { op: 'shot', name: 'p6b-c-depois' },
    expectCol('DONE', ['Feito 1', 'A fazer 4'], 'c) depois do arrasto'),
    ...f5, boardLog('c) depois do F5'), { op: 'shot', name: 'p6b-c-depois-f5' },
    expectCol('DONE', ['Feito 1', 'A fazer 4'], 'c) depois do F5'),
  ],
};
fs.writeFileSync(new URL('./rb-p6bF.json', import.meta.url), JSON.stringify(p6bF, null, 1));

const realClick = (n) => ({ op: 'drag', from: grab(n, 'center'), to: grab(n, 'center'), steps: 1, wait: 1500 });
const dlgOpen = ev(`return 'dialog aberto: '+!!document.querySelector('[role="dialog"]');`);
p9.steps = p9.steps.flatMap((s) => (s === openCard ? [realClick('A fazer 2'), dlgOpen] : [s]));
fs.writeFileSync(new URL('./rb-p9.json', import.meta.url), JSON.stringify(p9, null, 1));

const outside = [{ op: 'drag', from: { x: 20, y: 880 }, to: { x: 20, y: 880 }, steps: 1, wait: 1500 },
  ev(`const p=!!document.querySelector('[role="dialog"]');if(p)throw new Error('diálogo não fechou nem com Esc nem com clique fora (20,880)');return 'após clique fora (20,880), [role=dialog] presente: '+p;`)];
p9.steps = p9.steps.flatMap((s) => (s === closeOutside[1] ? outside : [s]));
fs.writeFileSync(new URL('./rb-p9.json', import.meta.url), JSON.stringify(p9, null, 1));

// p9 v2: comparação por palavra inteira; rótulos visíveis listados; placeholder lido no modo edição; Esc registrado
const chk = (tag) => ev(`const lang=document.documentElement.lang;const other=lang==='en'?'pt':'en';
 const [mine,oth]=await Promise.all([lang,other].map(l=>fetch('/locales/'+l+'/database.json').then(r=>r.json())));
 const d=document.querySelector('[role="dialog"]');if(!d)throw new Error('${tag}: diálogo ausente');
 const txt=d.innerText;const low=txt.toLowerCase();const L=c=>!!c&&c.toLowerCase()!==c.toUpperCase();
 const has=v=>{const w=v.toLowerCase();let i=low.indexOf(w);while(i>=0){if(!L(low[i-1])&&!L(low[i+w.length]))return true;i=low.indexOf(w,i+1);}return false;};
 const forasteiros=Object.entries(oth.kanban_card).filter(([k,v])=>v!==mine.kanban_card[k]&&has(v)).map(([k,v])=>'kanban_card.'+k+'='+v);
 const vaz=[...d.querySelectorAll('div')].find(x=>x.className.includes('italic'));
 const vazTxt=vaz?vaz.innerText:null;
 if(vaz){vaz.click();await new Promise(r=>setTimeout(r,600));}
 const ta=d.querySelector('textarea');const ph=ta&&ta.getAttribute('placeholder');
 const rotulos=[...d.querySelectorAll('span.uppercase')].map(s=>s.innerText.trim()).filter(Boolean);
 const res={lang,overlay:d.outerHTML.slice(0,d.outerHTML.indexOf('>')+1),campo_vazio:vaz?vazTxt:'(já em edição)',placeholder:ph,rotulos,texto:txt.split(String.fromCharCode(10)).filter(Boolean).join(' / '),forasteiros};
 const campos=['assigneeId','date','leadId','reminderAt'];const rotEsperados=campos.map(n=>mine.fields[n]);const rotFaltando=rotEsperados.filter(r=>!rotulos.some(x=>x.toLowerCase()===String(r).toLowerCase()));res.rotulos_esperados=rotEsperados;res.rotulos_faltando=rotFaltando;
 const erros=[];if(forasteiros.length)erros.push('texto do outro idioma');if(rotFaltando.length)erros.push('rótulos de campo');if(ph!==mine.kanban_card.description_placeholder)erros.push('placeholder');if(vaz&&vazTxt!==mine.kanban_card.description_placeholder)erros.push('campo vazio');
 window.__p9=res;return '${tag}: '+(erros.length?'DIVERGE ('+erros.join(', ')+') ':'')+JSON.stringify(res);`);
const escCheck = [{ op: 'key', key: 'Escape', wait: 1500 }, ev(`return 'após Esc, [role=dialog] presente: '+!!document.querySelector('[role="dialog"]');`)];
const toggleLang = ev(`const to=document.documentElement.lang==='pt'?'English (US)':'Português (BR)';document.querySelector('button[aria-label="Change language"]').click();await new Promise(r=>setTimeout(r,500));
 const b=[...document.querySelectorAll('button')].find(b=>b.innerText.includes(to));if(!b)throw new Error('opção '+to+' ausente');b.click();await new Promise(r=>setTimeout(r,3000));return 'troca de idioma pelo seletor do topo -> '+to+'; lang agora: '+document.documentElement.lang+' url: '+location.pathname+location.search;`, { wait: 1500 });
const p9b = {
  ...base, tag: 'p9', steps: [
    ...goKanban,
    ev(`return 'idioma ativo de partida: '+document.documentElement.lang+' url: '+location.pathname+location.search;`),
    realClick('A fazer 2'), dlgOpen, { op: 'shot', name: 'p9-idioma1-detalhe' }, chk('idioma 1'), { op: 'shot', name: 'p9-idioma1-edicao' },
    ...escCheck, ...outside,
    toggleLang, { op: 'waitText', text: 'TO DO', ms: 20000 },
    realClick('A fazer 2'), dlgOpen, { op: 'shot', name: 'p9-idioma2-detalhe' }, chk('idioma 2'), { op: 'shot', name: 'p9-idioma2-edicao' },
    ...escCheck, ...outside,
    toggleLang,
  ],
};
fs.writeFileSync(new URL('./rb-p9b.json', import.meta.url), JSON.stringify(p9b, null, 1));

const p9en = { ...base, tag: 'p9en', steps: [
  { op: 'goto', url: '/en/dashboard?category=kanban', wait: 3000 }, { op: 'waitText', text: 'TO DO', ms: 20000 },
  ev(`return 'lang: '+document.documentElement.lang+' url: '+location.pathname+location.search;`),
  realClick('A fazer 3'), dlgOpen, { op: 'shot', name: 'p9-en-limpo-detalhe' }, chk('EN, abertura limpa'),
  ...outside,
] };
fs.writeFileSync(new URL('./rb-p9en.json', import.meta.url), JSON.stringify(p9en, null, 1));

const p9en2 = { ...base, tag: 'p9en', steps: [
  ...goKanban, toggleLang, { op: 'reload', wait: 3000 }, { op: 'waitText', text: 'TO DO', ms: 20000 },
  ev(`return 'após F5 — lang: '+document.documentElement.lang+' url: '+location.pathname+location.search;`),
  realClick('A fazer 3'), dlgOpen, { op: 'shot', name: 'p9-en-limpo-detalhe' }, chk('EN, abertura limpa'), { op: 'shot', name: 'p9-en-limpo-edicao' },
  ...outside,
] };
fs.writeFileSync(new URL('./rb-p9en.json', import.meta.url), JSON.stringify(p9en2, null, 1));
