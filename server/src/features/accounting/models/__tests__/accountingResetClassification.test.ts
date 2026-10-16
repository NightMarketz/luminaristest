/**
 * BE-INCR-RESET-CONSISTENTE item 9 — teste-guarda da classificação fechada do reset contábil. Lê os `model` do
 * `schema.prisma` e falha se algum `model` com `unitId`/`scopeUserId`, ou com `userId` contábil, estiver fora das três
 * classes ou em duas delas. Tabela nova nasce aqui vermelha até alguém a classificar (o padrão é BLOCKING).
 */
import { readFileSync } from 'fs';
import path from 'path';
import {
  ACCOUNTING_RESET_BLOCKING,
  ACCOUNTING_RESET_SETUP,
  ACCOUNTING_RESET_SETUP_USER_LEVEL,
  ACCOUNTING_RESET_TRAIL,
} from '../accountingResetClassification';

/** Os `model` com `userId` que NÃO são contabilidade — o reset não contábil (PR-1) cuida deles. */
const NAO_CONTABEIS = [
  'SavedTableView',
  'CrmReportDefinition',
  'CrmAttachment',
  'DashboardLayout',
  'ChatInstance',
  'Document',
  'DynamicTable',
  'KnowledgeGraph',
  'ActionProposal',
  // W4 (BE-INCR-INTERVIEW-SESSION): o reset NÃO a apaga — expira em 24 h e o expurgo a remove em 7 dias
  // (dono, questionário, 2026-10-16, na integração do lote: "Não contábil e fica").
  'InterviewSession',
];

type ModelInfo = { name: string; fields: Set<string> };

function lerModelos(): ModelInfo[] {
  const schema = readFileSync(path.resolve(__dirname, '../../../../../prisma/schema.prisma'), 'utf8').replace(/\r\n/g, '\n');
  const out: ModelInfo[] = [];
  for (const m of schema.matchAll(/^model (\w+) \{([\s\S]*?)^\}/gm)) {
    const fields = new Set<string>();
    for (const line of m[2].split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('//') || t.startsWith('@@')) continue;
      fields.add(t.split(/\s+/)[0]);
    }
    out.push({ name: m[1], fields });
  }
  return out;
}

describe('accountingResetClassification — classificação fechada (I7 item 9)', () => {
  const modelos = lerModelos();
  const porNome = new Map(modelos.map((m) => [m.name, m]));
  const classes: Record<string, readonly string[]> = {
    TRAIL: ACCOUNTING_RESET_TRAIL,
    SETUP: ACCOUNTING_RESET_SETUP,
    BLOCKING: ACCOUNTING_RESET_BLOCKING,
  };

  it('o schema foi lido (sanidade do parser)', () => {
    expect(modelos.length).toBeGreaterThan(80);
    expect(porNome.get('JournalEntry')?.fields.has('unitId')).toBe(true);
  });

  it('todo model com unitId/scopeUserId ou userId contábil está em exatamente uma classe', () => {
    const contabeis = modelos
      .filter((m) => m.fields.has('unitId') || m.fields.has('scopeUserId') || (m.fields.has('userId') && !NAO_CONTABEIS.includes(m.name)))
      .map((m) => m.name);
    const problemas: string[] = [];
    for (const nome of contabeis) {
      const em = Object.entries(classes).filter(([, lista]) => lista.includes(nome)).map(([c]) => c);
      if (em.length !== 1) problemas.push(`${nome}: ${em.length === 0 ? 'sem classe (nasce BLOCKING — classifique)' : `em ${em.join(' + ')}`}`);
    }
    expect(problemas).toEqual([]);
  });

  it('nenhuma classe cita model que não existe, e SETUP/BLOCKING têm userId (o repositório filtra por ele)', () => {
    for (const nome of [...ACCOUNTING_RESET_TRAIL, ...ACCOUNTING_RESET_SETUP, ...ACCOUNTING_RESET_BLOCKING]) {
      expect(porNome.has(nome)).toBe(true);
    }
    for (const nome of [...ACCOUNTING_RESET_SETUP, ...ACCOUNTING_RESET_BLOCKING]) {
      expect([nome, porNome.get(nome)?.fields.has('userId')]).toEqual([nome, true]);
    }
  });

  it('SETUP sem unitId é exatamente a lista USER_LEVEL (as demais quebram por unidade)', () => {
    const semUnit = ACCOUNTING_RESET_SETUP.filter((n) => !porNome.get(n)?.fields.has('unitId'));
    expect([...semUnit].sort()).toEqual([...ACCOUNTING_RESET_SETUP_USER_LEVEL].sort());
  });

  it('ordem de remoção: Account por último; transição antes do período', () => {
    expect(ACCOUNTING_RESET_SETUP[ACCOUNTING_RESET_SETUP.length - 1]).toBe('Account');
    expect(ACCOUNTING_RESET_SETUP.indexOf('AccountingPeriodTransition')).toBeLessThan(ACCOUNTING_RESET_SETUP.indexOf('AccountingPeriod'));
  });
});
