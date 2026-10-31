/**
 * BE-INCR-MODULOS-BASE-SUBMODULOS — PR-4, item 23: suítes sem tabela solta. Depois do PR-4, `tables` do salão e da
 * clínica só pode trazer o que não é módulo; a troca de fonte (ficha da clínica em `customers`) vive em
 * `moduleOverrides` (item 11a), não em `tables`. Allowlist nomeada, cada entrada com motivo; vazia esperada.
 */
import BeautySalonPreset from '../systems/BeautySalonPreset';
import AestheticClinicPreset from '../systems/AestheticClinicPreset';
import { moduleOfTable } from '../modules/registry';

// ESTOQUE (EST-0 = productUnits + stockMovements) e AGENDA (AGE-0 = appointments) entram no registro no PR-3, que corre
// em paralelo a este; quem chegar depois rebaseia e esvazia esta lista.
const TABELAS_SOLTAS: Readonly<Record<string, string>> = {
  productUnits: 'PR-3 em paralelo: EST-0 ainda não está no registro desta base',
  stockMovements: 'PR-3 em paralelo: EST-0 ainda não está no registro desta base',
  appointments: 'PR-3 em paralelo: AGE-0 ainda não está no registro desta base',
};

describe('item 23 — toda tabela de suíte pertence a módulo', () => {
  it.each([
    ['beautySalon', BeautySalonPreset],
    ['aestheticClinic', AestheticClinicPreset],
  ] as const)('%s: nenhuma tabela solta fora da allowlist', (_key, suite) => {
    const soltas = Object.keys(suite.tables).filter((t) => !moduleOfTable(t));
    expect(soltas.filter((t) => !TABELAS_SOLTAS[t])).toEqual([]);
  });

  it('nenhuma tabela de módulo segue declarada em `tables` (a fonte vem do registro ou de moduleOverrides)', () => {
    for (const suite of [BeautySalonPreset, AestheticClinicPreset]) {
      expect(Object.keys(suite.tables).filter((t) => moduleOfTable(t))).toEqual([]);
    }
  });

  it('a allowlist só encolhe: toda entrada ainda é tabela solta de alguma suíte', () => {
    const soltas = new Set([BeautySalonPreset, AestheticClinicPreset].flatMap((s) => Object.keys(s.tables).filter((t) => !moduleOfTable(t))));
    expect(Object.keys(TABELAS_SOLTAS).filter((t) => !soltas.has(t))).toEqual([]);
  });
});
