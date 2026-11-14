/**
 * Guarda de cascata: a regra global de campos de texto (`styles/globals.css`, `@layer base`) não pode vencer as
 * utilitárias que o próprio campo declara quando a tela migrou (`data-own-style`; achado do runbook W7, passo 6,
 * 13/11, migração por tela decidida pelo dono). Campo SEM o atributo continua com a regra global vencendo (as demais
 * telas não mudam até migrarem); campo COM o atributo ainda recebe o default global do que não declara.
 *
 * jsdom não calcula cascata de CSS, então este teste a calcula: compila o `globals.css` real com o Tailwind real
 * (config do projeto, conteúdo = só as classes dos campos), acha as regras que casam o elemento (jsdom `matches`),
 * ordena por (!important, especificidade, ordem) e exige que, em cada propriedade que o campo declara por classe
 * própria, a regra vencedora venha de uma classe do próprio campo — em claro e em escuro.
 *
 * Limite: não cobre pseudo-estados (`focus:`, `placeholder:`) nem breakpoints; a medição em build de produção
 * (getComputedStyle) fica no corpo do PR.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import postcss from 'postcss';
import selectorParser from 'postcss-selector-parser';
import tailwindcss from 'tailwindcss';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const APP = path.resolve(__dirname, '..', '..');

// Telas migradas: wizard de onboarding (BRIEF W7 item 8: neutral-*, rounded-2xl), login/signup (já usavam `!pl-16`) e as 16
// telas em que a regra global quebrava `pl-*`/largura (texto por cima do ícone, w-24 virando 100%).
// Tela nova migrada entra aqui (D-2026-11-13-REGRA-GLOBAL-INPUT-MIGRACAO-POR-TELA).
const WIZARD_FILES = [
  'pages/users/login.tsx',
  'pages/users/signup.tsx',
  'components/widgets/generic-chat/components/GenericChatWidget.tsx',
  'features/accounting/components/CompliancePanel.tsx',
  'features/accounting/components/JournalEntryModal.tsx',
  'features/accounting/components/MeiEnquadramentoSection.tsx',
  'features/accounting/components/PresumidoServicosSection.tsx',
  'features/accounting/components/SubledgerFilterBar.tsx',
  'features/accounting/components/TaxAssessmentPanel.tsx',
  'features/crm/components/reports/CrmReportEditor.tsx',
  'features/dashboard/category-views/finance/components/sales/create/inputs.tsx',
  'features/dashboard/category-views/finance/components/sales/SalesCreateModal.tsx',
  'features/dashboard/category-views/inventory/components/InventoryTable.tsx',
  'features/dashboard/category-views/inventory/components/MovementModal.tsx',
  'pages/documents/index.tsx',
  'pages/users/create.tsx',
  'pages/users/edit/[id].tsx',
  'pages/users/profile.tsx',
  'features/interview/setup/QuickSetup.tsx',
  'features/interview/setup/TotalControlSetup.tsx',
  'features/interview/components/RightSidebar/NewFieldForm.tsx',
  'features/interview/components/RightSidebar/AIChatMode.tsx',
  'features/interview/components/AiInterviewSetup/InputArea.tsx',
];

type Field = { file: string; tag: string; type: string | null; classes: string; own: boolean };
const TEXT_TYPES = ['text', 'email', 'password', 'number', 'search'];

function readFields(): Field[] {
  const out: Field[] = [];
  for (const file of WIZARD_FILES) {
    const src = fs.readFileSync(path.join(APP, file), 'utf8');
    const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const visit = (n: ts.Node): void => {
      if (ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) {
        const tag = n.tagName.getText(sf);
        if (tag === 'input' || tag === 'textarea' || tag === 'select') {
          let type: string | null = null;
          let classes = '';
          let own = false;
          for (const a of n.attributes.properties) {
            if (ts.isJsxAttribute(a) && a.name.getText(sf) === 'data-own-style') own = true;
            if (!ts.isJsxAttribute(a) || !a.initializer) continue;
            const name = a.name.getText(sf);
            if (name === 'type' && ts.isStringLiteral(a.initializer)) type = a.initializer.text;
            if (name === 'className') {
              if (ts.isStringLiteral(a.initializer)) classes = a.initializer.text;
              else if (ts.isJsxExpression(a.initializer) && a.initializer.expression) {
                // template com `${}`: vale só a parte literal (as classes vindas da expressão não são cobertas)
                const e = a.initializer.expression;
                if (ts.isNoSubstitutionTemplateLiteral(e)) classes = e.text;
                else if (ts.isTemplateExpression(e)) classes = [e.head.text, ...e.templateSpans.map((t) => t.literal.text)].join(' ');
              }
            }
          }
          if (classes && (tag !== 'input' || (type !== null && TEXT_TYPES.includes(type)))) out.push({ file, tag, type, classes, own });
        }
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);
  }
  return out;
}

type Spec = [number, number, number];
const cmp = (a: Spec, b: Spec): number => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
const add = (a: Spec, b: Spec): Spec => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

/** Especificidade de um seletor composto: :where = 0; :is/:not/:has = o maior dos argumentos. */
function specificity(sel: selectorParser.Selector): Spec {
  let s: Spec = [0, 0, 0];
  for (const n of sel.nodes) {
    if (n.type === 'id') s = add(s, [1, 0, 0]);
    else if (n.type === 'class' || n.type === 'attribute') s = add(s, [0, 1, 0]);
    else if (n.type === 'tag') s = add(s, [0, 0, 1]);
    else if (n.type === 'pseudo') {
      if (n.value === ':where') continue;
      if (n.value === ':is' || n.value === ':not' || n.value === ':has') {
        s = add(s, n.nodes.map(specificity).reduce<Spec>((m, v) => (cmp(v, m) > 0 ? v : m), [0, 0, 0]));
      } else s = add(s, n.value.startsWith('::') ? [0, 0, 1] : [0, 1, 0]);
    }
  }
  return s;
}

const OWN_PROPS = [
  'width',
  'background-color',
  'border-color',
  'border-top-color',
  'border-top-left-radius',
  'border-top-right-radius',
  'border-bottom-right-radius',
  'border-bottom-left-radius',
  'padding-left',
  'padding-right',
  'padding-top',
  'padding-bottom',
  'color',
];
const SKIP_STATE = /:(focus|hover|active|disabled|focus-visible|focus-within|checked)|::|:-moz-|:-webkit-/;

async function compile(classes: string[]): Promise<postcss.Root> {
  const config = { ...require('../../tailwind.config.js'), content: [{ raw: classes.join(' '), extension: 'html' }] };
  const cssPath = path.join(APP, 'styles/globals.css');
  const res = await postcss([tailwindcss(config)]).process(fs.readFileSync(cssPath, 'utf8'), { from: cssPath });
  return res.root;
}

/** `border-radius`/`padding` de um valor viram longhands, para comparar com utilitárias de um lado só (rounded-l-lg). */
function expand(prop: string, value: string): Array<[string, string]> {
  const v = value.trim().split(/\s+/);
  if (prop === 'border-radius' && v.length === 1) {
    return ['top-left', 'top-right', 'bottom-right', 'bottom-left'].map((c): [string, string] => [`border-${c}-radius`, value]);
  }
  if (prop === 'padding' && v.length === 1) {
    return ['top', 'right', 'bottom', 'left'].map((s): [string, string] => [`padding-${s}`, value]);
  }
  return [[prop, value]];
}

type Decl = { prop: string; value: string; important: boolean; spec: Spec; order: number; selector: string };

/** Todas as declarações de propriedades de interesse que casam o campo, no modo pedido. */
function matching(root: postcss.Root, field: Field, dark: boolean): Decl[] {
  const doc = document.implementation.createHTMLDocument('t');
  const wrap = doc.createElement('div');
  if (dark) wrap.className = 'dark';
  const el = doc.createElement(field.tag);
  if (field.type) el.setAttribute('type', field.type);
  if (field.own) el.setAttribute('data-own-style', '');
  el.className = field.classes;
  wrap.appendChild(el);
  doc.body.appendChild(wrap);

  const out: Decl[] = [];
  let order = 0;
  root.walkRules((rule) => {
    if (rule.parent && rule.parent.type === 'atrule' && (rule.parent as postcss.AtRule).name !== 'layer') return;
    selectorParser((list) => {
      list.each((sel) => {
        const text = sel.toString().trim();
        if (SKIP_STATE.test(text)) return;
        let hit = false;
        try {
          hit = el.matches(text);
        } catch {
          throw new Error(`jsdom não entendeu o seletor: ${text}`);
        }
        if (!hit) return;
        const spec = specificity(sel);
        rule.walkDecls((d) => {
          order += 1;
          for (const [prop, value] of expand(d.prop, d.value)) {
            if (OWN_PROPS.includes(prop)) out.push({ prop, value, important: !!d.important, spec, order, selector: text });
          }
        });
      });
    }).processSync(rule.selector);
  });
  return out;
}

/** A regra é "do campo" quando o seletor dela cita uma das classes do próprio campo. */
function isOwn(selector: string, classes: string): boolean {
  return classes.split(/\s+/).some((c) => selector.includes(`.${c.replace(/([^a-zA-Z0-9_-])/g, String.raw`\$1`)}`));
}

const beats = (a: Decl, b: Decl): boolean =>
  a.important !== b.important ? a.important : cmp(a.spec, b.spec) !== 0 ? cmp(a.spec, b.spec) > 0 : a.order > b.order;

describe('regra global de campos de texto × utilitárias do campo (wizard)', () => {
  const fields = readFields();

  it('acha os campos do wizard', () => {
    expect(fields.length).toBeGreaterThanOrEqual(49);
  });

  it('todo campo de texto dessas telas declara data-own-style (sem ele a regra global volta a vencer)', () => {
    expect(fields.filter((f) => !f.own).map((f) => `${f.file} <${f.tag} type=${f.type}>`)).toEqual([]);
  });

  it.each(['light', 'dark'] as const)('em %s, toda propriedade declarada por classe do campo é vencida por classe do campo', async (mode) => {
    const root = await compile(fields.map((f) => f.classes));
    const losses: string[] = [];
    for (const f of fields) {
      const all = matching(root, f, mode === 'dark');
      for (const prop of new Set(all.filter((d) => isOwn(d.selector, f.classes)).map((d) => d.prop))) {
        const cands = all.filter((d) => d.prop === prop);
        const win = cands.reduce((m, d) => (beats(d, m) ? d : m));
        const ownBest = cands.filter((d) => isOwn(d.selector, f.classes)).reduce((m, d) => (beats(d, m) ? d : m));
        // vencer com o MESMO valor que o campo declara é inofensivo (ex.: rounded-md × rounded-md)
        if (!isOwn(win.selector, f.classes) && win.value !== ownBest.value) {
          losses.push(`${f.file} <${f.tag}> ${prop}: declara ${ownBest.value}, mas vence "${win.selector}" = ${win.value}`);
        }
      }
    }
    expect(losses).toEqual([]);
  });

  it('sem data-own-style a regra global ainda vence a utilitária (telas não migradas não mudam)', async () => {
    const probe: Field = { file: 'probe', tag: 'input', type: 'text', classes: 'rounded-2xl bg-white px-4', own: false };
    const root = await compile([probe.classes]);
    const all = matching(root, probe, false);
    const win = (prop: string): Decl => all.filter((d) => d.prop === prop).reduce((m, d) => (beats(d, m) ? d : m));
    for (const prop of ['border-top-left-radius', 'background-color', 'padding-left']) {
      expect(isOwn(win(prop).selector, probe.classes)).toBe(false);
    }
  });

  it('com data-own-style a regra global continua dando o default do que o campo não declara', async () => {
    const probe: Field = { file: 'probe', tag: 'input', type: 'text', classes: 'rounded-2xl', own: true };
    const root = await compile([probe.classes]);
    const all = matching(root, probe, false);
    const win = (prop: string): Decl => all.filter((d) => d.prop === prop).reduce((m, d) => (beats(d, m) ? d : m));
    expect(isOwn(win('border-top-left-radius').selector, probe.classes)).toBe(true);
    expect(win('background-color').selector).toContain('data-own-style'); // default global (gray-50), não do campo
    expect(win('padding-left').selector).toContain('data-own-style');
  });
});
