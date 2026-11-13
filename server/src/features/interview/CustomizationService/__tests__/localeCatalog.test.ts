/**
 * Lacunas L-20261111-204322-f834 e -37cb (RUNBOOK-W7, passo 5; decisão do dono, chat, 2026-11-11: "Sim, localizar"):
 * o texto que o servidor fabrica para a UI (descrição fallback de tabela, nome/descrição dos presets) segue o idioma
 * da UI, como o resto da entrevista (`interviewText.ts`, decisão de 2026-11-06).
 */
import { TableExtractor } from '../TableExtractor';
import BeautySalonPreset from '../../../dynamicTables/presets/systems/BeautySalonPreset';
import { composeSessionTables } from '../sessionComposition';
import { resolveModuleSelection } from '../../../dynamicTables/presets/modules/moduleSelection';
import { presetService } from '../../../dynamicTables/services/PresetService';

const salao = {
  key: BeautySalonPreset.key,
  tables: composeSessionTables(BeautySalonPreset, resolveModuleSelection([], BeautySalonPreset.modules)),
  bridges: BeautySalonPreset.bridges,
};

describe('f834 — descrição fallback de tabela segue o locale', () => {
  it('sem locale: português (o comportamento de antes)', () => {
    const tables = new TableExtractor().extractTablesFromRealPreset(salao);
    expect(tables.some((t) => t.description.startsWith('Tabela de '))).toBe(true);
  });

  it('locale en: nenhuma descrição fabricada começa com "Tabela de"', () => {
    const tables = new TableExtractor().extractTablesFromRealPreset(salao, 'en');
    expect(tables.filter((t) => t.description.startsWith('Tabela de '))).toEqual([]);
    expect(tables.some((t) => t.description.startsWith('Table of '))).toBe(true);
  });
});

describe('37cb — resumo dos presets segue o locale', () => {
  const svc = presetService;
  const PT = /[ãáâçéêíóôõú]|\b(para|de|do|da|completo|módulo)\b/i;

  it('locale en: nenhum name/description em português', () => {
    const resumos = svc.getAllPresetSummaries('en');
    expect(resumos.length).toBeGreaterThanOrEqual(3);
    for (const r of resumos) {
      expect(`${r.name} | ${r.description}`).not.toMatch(PT);
    }
  });

  it('locale pt (ou ausente): nomes em português', () => {
    const porKey = Object.fromEntries(svc.getAllPresetSummaries('pt').map((r) => [r.key, r.name]));
    expect(porKey.crmModule).toBe('Módulo CRM');
    expect(porKey.aestheticClinic).toBe('ERP para Clínica de Estética');
    expect(svc.getAllPresetSummaries().map((r) => r.key)).toEqual(svc.getAllPresetSummaries('pt').map((r) => r.key));
  });
});
