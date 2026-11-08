// Runner de runbook de tela (RUNBOOK-FORMAT §Fronteira, exceção de 25/10): roda os passos de um roteiro JSON num
// Chromium sem janela e grava print + texto literal + Network em docs/accounting/runbook-evidence/<out>/. Até 04/11
// cada sessão reescrevia este runner no próprio scratchpad (10 cópias de 26/10 a 04/11); esta é a versão comum.
//
// Uso:  node scripts/runbook-tela.mjs <roteiro.json>
//
// Roteiro: { out, base?, api?, profile?, user?, pass?, tag?, netFile?, quietGet?, continueOnError?, resMax?, reqMax?,
//            steps: [{ op, ... }] }
//   out      pasta de evidência (relativa a docs/accounting/runbook-evidence/) — obrigatória
//   base     front, padrão $RB_BASE ou http://127.0.0.1:3100 (127.0.0.1, não localhost: o cookie de localhost é do dono)
//   api      back, padrão $RB_API ou http://127.0.0.1:4100 (só encurta as linhas de Network e limpa cookie no logout)
//   pass     "$SEED" ou ausente = SEED_ACCOUNTING_PASSWORD do server/.env; "$SEED_ADMIN" = SEED_ADMIN_PASSWORD; nunca vai para o log
//   profile  sessão persistente (userDataDir) por nome, fora do repo: $RB_SCRATCH ou <tmp>/luminaris-runbook
// Ops: login logout goto reload selectUnit select tab click clickSel clickInRow type fillLabel setVal drag key eval
//      waitText assertAbsent controls tabsList shot text sleep (ver o switch abaixo).
//   drag   { from, to, steps?, probe?, shot? } — mouse real (dnd-kit só ouve pointer events); from/to = {x,y} ou JS que
//          devolve {x,y}; probe (JS) e shot rodam com o botão ainda apertado; from = to com steps 1 é um clique real.
//
// Navegador (~/.claude/tools/navegador/GUIA.md): $RB_CHROME, senão o headless shell mais novo do cache do Playwright
// (%LOCALAPPDATA%\ms-playwright\chromium_headless_shell-*, ~280 MB), senão o Chrome do Puppeteer (~515 MB). Pega vaga
// de trabalho pesado (scripts/heavy-slot.cjs) antes de abrir. Sai com 1 se um passo falhou: o FALHOU do runbook é
// o primeiro passo com [ERRO], e nenhum passo seguinte roda (salvo continueOnError).
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { acquire } = require('./heavy-slot.cjs');

if (!process.argv[2]) {
  console.error('uso: node scripts/runbook-tela.mjs <roteiro.json>');
  process.exit(2);
}
const cfg = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (!cfg.out) throw new Error('roteiro sem "out" (pasta em docs/accounting/runbook-evidence/)');
const BASE = cfg.base || process.env.RB_BASE || 'http://127.0.0.1:3100';
const API = cfg.api || process.env.RB_API || 'http://127.0.0.1:4100';
const out = path.join(REPO, 'docs/accounting/runbook-evidence', cfg.out);
const SCR = process.env.RB_SCRATCH || path.join(os.tmpdir(), 'luminaris-runbook');
fs.mkdirSync(out, { recursive: true });
const log = (...a) => console.log(...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** server/.env desta árvore; na worktree sem .env, o do checkout principal. */
function envFile() {
  const aqui = path.join(REPO, 'server/.env');
  if (fs.existsSync(aqui)) return aqui;
  const common = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], { cwd: REPO, encoding: 'utf8' }).trim();
  return path.join(path.dirname(common), 'server/.env');
}
const env = Object.fromEntries(
  fs.readFileSync(envFile(), 'utf8').split(/\r?\n/).filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.split('=')[0], l.slice(l.indexOf('=') + 1).replace(/^"|"$/g, '')]),
);
const PASS = (p) => (p === '$SEED_ADMIN' ? env.SEED_ADMIN_PASSWORD : p === '$SEED' || !p ? env.SEED_ACCOUNTING_PASSWORD : p);

/** Headless shell mais novo do cache do Playwright, ou undefined (o Puppeteer usa o Chrome dele). */
function chromePath() {
  if (process.env.RB_CHROME) return process.env.RB_CHROME;
  const cache = process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'ms-playwright');
  if (!cache || !fs.existsSync(cache)) return undefined;
  const dirs = fs.readdirSync(cache).filter((d) => /^chromium_headless_shell-\d+$/.test(d))
    .sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1]));
  for (const d of dirs) {
    const exe = path.join(cache, d, 'chrome-headless-shell-win64', 'chrome-headless-shell.exe');
    if (fs.existsSync(exe)) return exe;
  }
  return undefined;
}

let puppeteer;
try {
  puppeteer = createRequire(path.join(REPO, 'server/package.json'))('puppeteer');
} catch {
  console.error('puppeteer ausente em server/node_modules — rode `node scripts/worktree-deps.mjs` antes.');
  process.exit(2);
}

const release = await acquire({ label: `runbook ${cfg.out}` });
const executablePath = chromePath();
log(`[navegador] ${executablePath || 'Chrome do Puppeteer'}`);
const browser = await puppeteer.launch({
  headless: true,
  executablePath,
  userDataDir: path.join(SCR, 'profile-' + (cfg.profile || 'owner')),
  args: ['--window-size=1280,900'],
  protocolTimeout: 60000,
});
const page = (await browser.pages())[0] || (await browser.newPage());
await page.setViewport({ width: 1280, height: 900 });
// Downloads (o .txt do SPED, por exemplo) caem fora do repo.
const DL = path.join(SCR, 'downloads');
fs.mkdirSync(DL, { recursive: true });
{
  const cdp = await page.createCDPSession();
  await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: DL });
}
page.on('console', (m) => { if (['error', 'warn'].includes(m.type())) log(`[console.${m.type()}]`, m.text().slice(0, 300)); });
page.on('dialog', async (d) => { log('[dialog]', d.type(), d.message()); await d.accept(); });
const SENHA = /("(?:password|currentPassword|newPassword|confirmPassword)"\s*:\s*")[^"]*"/g;
const TOKEN = /("(?:token|accessToken|refreshToken)"\s*:\s*")[^"]*"?/g; // o corpo chega truncado: a aspa final pode faltar
const net = [];
page.on('response', async (res) => {
  const req = res.request();
  const u = req.url();
  if (!u.includes('/api/') || req.method() === 'OPTIONS') return;
  let body = '';
  try { body = (await res.text()).slice(0, cfg.resMax ?? 500); } catch { body = '(sem corpo)'; }
  const line = `${req.method()} ${u.replace(API, '')} -> ${res.status()}`
    + (req.postData() ? `  req: ${req.postData().replace(SENHA, '$1<redigida>"').slice(0, cfg.reqMax ?? 900)}` : '')
    + `\n   res: ${body.replace(TOKEN, '$1<redigido>"').replace(/\s+/g, ' ')}`;
  net.push(line);
  if (cfg.quietGet && req.method() === 'GET' && res.status() < 400) return;
  log('[net] ' + line);
});

async function byText(sel, text, { exact = false, nth = 0 } = {}) {
  const tag = 'rb' + Math.random().toString(36).slice(2, 8);
  const ok = await page.evaluate((sel, text, exact, nth, tag) => {
    const hits = [...document.querySelectorAll(sel)].filter((e) => e.offsetWidth || e.offsetHeight).filter((e) => {
      const t = (e.innerText || e.textContent || e.value || e.getAttribute('aria-label') || '').trim();
      return exact ? t === text : t.includes(text);
    });
    // prefere o mais interno (o último que casa dentro de outro que casa)
    const inner = exact ? hits : hits.filter((h) => !hits.some((o) => o !== h && h.contains(o)));
    const el = inner[nth];
    if (!el) return false;
    el.setAttribute('data-rb', tag);
    return true;
  }, sel, text, exact, nth, tag);
  return ok ? page.$(`[data-rb="${tag}"]`) : null;
}
async function waitText(text, ms = 10000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const body = await page.evaluate(() => document.body.innerText);
    if (body.includes(text)) return true;
    await sleep(200);
  }
  throw new Error(`texto não apareceu em ${ms}ms: "${text}"`);
}
async function shot(name, fullPage = false) {
  const file = path.join(out, name + '.png');
  await page.screenshot({ path: file, fullPage });
  log(`[print] ${path.relative(REPO, file).replace(/\\/g, '/')}`);
}
async function dumpText(name, sel, max = 4000) {
  const txt = await page.evaluate((s) => {
    const el = s ? document.querySelector(s) : document.body;
    return el ? el.innerText : `(seletor ausente: ${s})`;
  }, sel || null);
  if (name) fs.writeFileSync(path.join(out, name + '.txt'), txt, 'utf8');
  log(`[texto ${sel || 'body'}]\n${txt.slice(0, max)}\n[/texto]`);
}

let failed = null;
for (const s of cfg.steps) {
  const redigido = { ...s, op: undefined, ...(s.pass ? { pass: '<redigida>' } : {}), ...(/password/i.test(s.sel || '') ? { text: '<redigida>' } : {}) };
  log(`\n== ${s.op} ${JSON.stringify(redigido)}`);
  try {
    switch (s.op) {
      case 'login': {
        await page.goto(BASE + '/users/login', { waitUntil: 'networkidle2' });
        await page.waitForSelector('#identifier');
        await page.type('#identifier', s.user || cfg.user);
        await page.type('input[type="password"]', PASS(s.pass || cfg.pass));
        await page.click('button[type="submit"]');
        await sleep(s.wait ?? 3000);
        log('url após login:', page.url());
        break;
      }
      case 'logout': {
        const c = await page.cookies(BASE, API);
        if (c.length) await page.deleteCookie(...c);
        await page.goto(BASE + '/users/login', { waitUntil: 'networkidle2' });
        await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
        break;
      }
      case 'goto': await page.goto(s.url.startsWith('http') ? s.url : BASE + s.url, { waitUntil: 'networkidle2' }); await sleep(s.wait ?? 1000); break;
      case 'reload': await page.reload({ waitUntil: 'networkidle2' }); await sleep(s.wait ?? 1000); break;
      case 'selectUnit': {
        await page.waitForSelector(`select option[value="${s.unitId}"]`, { timeout: 15000 });
        await page.evaluate((v) => document.querySelector(`select option[value="${v}"]`).closest('select').setAttribute('data-rb', 'unit'), s.unitId);
        await page.select('select[data-rb="unit"]', s.unitId);
        await sleep(s.wait ?? 1500);
        break;
      }
      case 'select': {
        // s.sel (CSS) ou s.ariaLabel; s.value ou s.optionText
        const sel = s.sel || `select[aria-label="${s.ariaLabel}"]`;
        await page.waitForSelector(sel, { timeout: 10000 });
        const value = s.value ?? (await page.evaluate((a, t) => { const e = document.querySelector(a); const o = [...e.options].find((x) => x.textContent.includes(t)); return o ? o.value : null; }, sel, s.optionText));
        if (value === null) throw new Error(`option "${s.optionText}" ausente em ${sel}`);
        await page.select(sel, value);
        await sleep(s.wait ?? 800);
        break;
      }
      case 'tab': {
        const h = await byText('[role="tab"]', s.text, { exact: s.exact ?? true });
        if (!h) throw new Error(`aba "${s.text}" ausente`);
        await h.evaluate((e) => e.click());
        await sleep(s.wait ?? 1500);
        break;
      }
      case 'click': {
        const h = await byText(s.sel || 'button', s.text, { exact: s.exact ?? true, nth: s.nth ?? 0 });
        if (!h) throw new Error(`"${s.text}" (${s.sel || 'button'}) ausente`);
        await h.evaluate((e) => e.click());
        await sleep(s.wait ?? 1000);
        break;
      }
      case 'clickSel': await page.waitForSelector(s.sel, { timeout: 8000 }); await page.$eval(s.sel, (e) => e.click()); await sleep(s.wait ?? 1000); break;
      case 'clickInRow': {
        const row = await byText(s.rowSel || 'tr, li', s.row);
        if (!row) throw new Error(`linha "${s.row}" ausente`);
        const btns = await row.$$(s.sel || 'button');
        let done = false;
        for (const b of btns) {
          const t = (await b.evaluate((e) => (e.innerText || e.getAttribute('aria-label') || e.title || '').trim()));
          if (s.exact === false ? t.includes(s.text) : t === s.text) { await b.evaluate((e) => e.click()); done = true; break; }
        }
        if (!done) throw new Error(`botão "${s.text}" ausente na linha "${s.row}"`);
        await sleep(s.wait ?? 1000);
        break;
      }
      case 'type': {
        await page.waitForSelector(s.sel, { timeout: 8000 });
        await page.focus(s.sel);
        if (s.clear !== false) await page.$eval(s.sel, (e) => { if ('value' in e) { const p = Object.getPrototypeOf(e); Object.getOwnPropertyDescriptor(p, 'value').set.call(e, ''); e.dispatchEvent(new Event('input', { bubbles: true })); } });
        await page.type(s.sel, s.text);
        await sleep(s.wait ?? 300);
        break;
      }
      case 'fillLabel': {
        // <label>texto<input|select/></label> (Field do SPED): s.scope? ("last:<css>" = o último), s.label (início do texto), s.nth?, s.value
        const r = await page.evaluate((scope, label, nth, value) => {
          const root = !scope ? document : scope.startsWith('last:') ? [...document.querySelectorAll(scope.slice(5))].pop() : document.querySelector(scope);
          if (!root) return 'sem escopo ' + scope;
          const labs = [...root.querySelectorAll('label')].filter((l) => (l.offsetWidth || l.offsetHeight) && (l.childNodes[0]?.textContent || l.innerText || '').trim().startsWith(label));
          const l = labs[nth || 0];
          if (!l) return `rótulo "${label}"[${nth || 0}] ausente (${labs.length})`;
          const el = l.querySelector('input,select,textarea');
          if (!el) return 'sem campo no rótulo';
          if (el.tagName === 'SELECT') {
            const o = [...el.options].find((x) => x.value === value) || [...el.options].find((x) => x.text.includes(value));
            if (!o) return `opção "${value}" ausente: ${[...el.options].map((x) => x.value).join(',')}`;
            Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(el, o.value);
            el.dispatchEvent(new Event('change', { bubbles: true }));
            return 'ok ' + o.value;
          }
          const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
          Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          return 'ok';
        }, s.scope || null, s.label, s.nth || 0, s.value);
        log(`[fill] ${s.label}[${s.nth || 0}] = ${s.value} -> ${r}`);
        if (!String(r).startsWith('ok')) throw new Error(r);
        await sleep(s.wait ?? 200);
        break;
      }
      case 'setVal': {
        // valor por seletor CSS (input/select/checkbox; o último que casa), com o setter nativo + eventos do React
        const r = await page.evaluate((sel, value) => {
          const el = [...document.querySelectorAll(sel)].pop();
          if (!el) return 'ausente ' + sel;
          if (el.type === 'checkbox') { if (el.checked !== !!value) el.click(); return 'ok checked=' + el.checked; }
          const proto = el.tagName === 'SELECT' ? HTMLSelectElement.prototype : el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
          Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
          el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
          if (el.tagName !== 'SELECT') el.dispatchEvent(new Event('change', { bubbles: true }));
          return 'ok ' + el.value;
        }, s.sel, s.value);
        log(`[set] ${s.sel} = ${s.value} -> ${r}`);
        if (!String(r).startsWith('ok')) throw new Error(r);
        await sleep(s.wait ?? 200);
        break;
      }
      case 'drag': {
        // arrasto com mouse real (dnd-kit e afins só ouvem pointer events); from/to = {x,y} ou JS que devolve {x,y}
        const pt = async (v) => (typeof v === 'string' ? page.evaluate(v) : v);
        const a = await pt(s.from);
        const b = await pt(s.to);
        if (!a || !b) throw new Error('drag sem ponto: ' + JSON.stringify({ a, b }));
        const n = s.steps ?? 20;
        await page.mouse.move(a.x, a.y);
        await page.mouse.down();
        for (let i = 1; i <= n; i++) { await page.mouse.move(a.x + ((b.x - a.x) * i) / n, a.y + ((b.y - a.y) * i) / n); await sleep(25); }
        await sleep(300);
        if (s.probe) { const r = await page.evaluate(s.probe); log('[drag:probe]', typeof r === 'string' ? r : JSON.stringify(r)); }
        if (s.shot) await shot(s.shot);
        await page.mouse.up();
        log(`[drag] (${Math.round(a.x)},${Math.round(a.y)}) -> (${Math.round(b.x)},${Math.round(b.y)})`);
        await sleep(s.wait ?? 1500);
        break;
      }
      case 'key': await page.keyboard.press(s.key); await sleep(s.wait ?? 500); break;
      case 'eval': { const r = await page.evaluate(s.js); log('[eval]', typeof r === 'string' ? r : JSON.stringify(r)); await sleep(s.wait ?? 300); break; }
      case 'waitText': await waitText(s.text, s.ms); log(`[ok] texto presente: "${s.text}"`); break;
      case 'assertAbsent': {
        const present = (await page.evaluate(() => document.body.innerText)).includes(s.text);
        log(`[assert] "${s.text}" presente=${present} (esperado ausente)`);
        if (present) throw new Error('assertAbsent falhou');
        break;
      }
      case 'controls': {
        const r = await page.evaluate((scope) => {
          const root = scope ? document.querySelector(scope) : document;
          if (!root) return '(sem escopo)';
          const vis = (e) => e.offsetWidth || e.offsetHeight;
          const btn = [...root.querySelectorAll('a,button,[role=tab]')].filter(vis).map((e) => (e.innerText || e.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ')).filter(Boolean);
          const inp = [...root.querySelectorAll('input,select,textarea')].filter(vis).map((e) => `${e.tagName.toLowerCase()}[${['id', 'name', 'type', 'aria-label', 'placeholder'].map((a) => e.getAttribute(a) ? a + '=' + e.getAttribute(a) : '').filter(Boolean).join(',')}]${e.tagName === 'SELECT' ? '{' + [...e.options].map((o) => o.value + ':' + o.text).join(';').slice(0, 300) + '}' : ''}`);
          return location.pathname + location.search + '\nBTN: ' + btn.join(' | ').slice(0, 2500) + '\nINP: ' + inp.join(' ').slice(0, 2500);
        }, s.scope || null);
        log('[controls]', r);
        break;
      }
      case 'tabsList': { const tabs = await page.$$eval('[role="tab"]', (els) => els.map((e) => e.innerText.trim())); log('[abas]', JSON.stringify(tabs)); break; }
      case 'shot': await shot(s.name, s.fullPage); break;
      case 'text': await dumpText(s.name, s.sel, s.max); break;
      case 'sleep': await sleep(s.ms); break;
      default: throw new Error('op desconhecida ' + s.op);
    }
  } catch (e) {
    log('[ERRO]', e.message);
    failed = e;
    if (cfg.continueOnError) continue;
    try { await shot((cfg.tag || 'erro') + '-falha'); await dumpText(null, null, 2500); } catch {}
    break;
  }
}
if (cfg.netFile) fs.writeFileSync(path.join(out, cfg.netFile + '.txt'), net.join('\n'), 'utf8');
await browser.close();
release();
log(failed ? '\n[fim] COM ERRO' : '\n[fim] ok');
process.exit(failed ? 1 : 0);
