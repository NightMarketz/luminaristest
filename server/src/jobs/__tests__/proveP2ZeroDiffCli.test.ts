const execFileSync = jest.fn();
jest.mock('child_process', () => ({ execFileSync: (...a: unknown[]) => execFileSync(...a) }));

import { classifyZeroDiffViolations, parseArgs, runCli } from '../proveP2ZeroDiffCli';

describe('classifyZeroDiffViolations — função pura (BE-INCR-P2-VERTICAL-CLINICA, comportamento 9)', () => {
  it('diff limpo (só arquivos da camada PRESET/DADO e do CLI) → clean=true', () => {
    const report = classifyZeroDiffViolations([
      'server/src/features/dynamicTables/presets/systems/AestheticClinicPreset.ts',
      'server/src/features/dynamicTables/presets/modules/people/AestheticClinicCustomerModule.ts',
      'server/src/features/dynamicTables/presets/index.ts',
      'server/src/features/accountingBinding/fixtures/clinicBinding.ts',
      'server/src/features/accountingBinding/services/BindingCompileService.ts',
      'server/src/jobs/activateAccountingBindingCli.ts',
    ]);
    expect(report.clean).toBe(true);
    expect(report.perimeterViolations).toEqual([]);
    expect(report.vetoedFileViolations).toEqual([]);
  });

  it('DETECTA um diff plantado no perímetro (motor DynamicTable) — teste-guarda literal do BRIEF', () => {
    const report = classifyZeroDiffViolations([
      'server/src/features/dynamicTables/presets/systems/AestheticClinicPreset.ts',
      'server/src/features/dynamicTables/services/DynamicTableService.ts', // plantado
    ]);
    expect(report.clean).toBe(false);
    expect(report.perimeterViolations).toEqual(['server/src/features/dynamicTables/services/DynamicTableService.ts']);
  });

  it('detecta diff em features/accounting/ (núcleo + sync — leitura AMPLA do parecer)', () => {
    const report = classifyZeroDiffViolations(['server/src/features/accounting/sync/bridges/SaleSalesAccountingBridge.ts']);
    expect(report.clean).toBe(false);
  });

  it('detecta diff em server/src/lib/factory.ts (emenda 2026-08-22)', () => {
    const report = classifyZeroDiffViolations(['server/src/lib/factory.ts']);
    expect(report.clean).toBe(false);
  });

  it('detecta diff em dynamicTablesController.ts (F-P2-10 → (c))', () => {
    const report = classifyZeroDiffViolations(['server/src/controllers/dynamicTablesController.ts']);
    expect(report.clean).toBe(false);
  });

  it('presets/ai/PresetKnowledgeBase.ts é EXPLICITAMENTE isento (comportamento 3 precisa editá-lo)', () => {
    const report = classifyZeroDiffViolations(['server/src/features/dynamicTables/presets/ai/PresetKnowledgeBase.ts']);
    expect(report.clean).toBe(true);
  });

  it('CustomerModule.ts compartilhado é vetado (F-P2-5) mesmo fora da árvore do motor', () => {
    const report = classifyZeroDiffViolations(['server/src/features/dynamicTables/presets/modules/people/CustomerModule.ts']);
    expect(report.clean).toBe(false);
    expect(report.vetoedFileViolations).toEqual(['server/src/features/dynamicTables/presets/modules/people/CustomerModule.ts']);
  });

  it('normaliza separador win32 (rg-win32-backslash-quebra-filtro-de-caminho) antes de classificar', () => {
    const report = classifyZeroDiffViolations(['server\\src\\features\\accounting\\services\\PostingService.ts']);
    expect(report.clean).toBe(false);
  });
});

describe('parseArgs', () => {
  it('default: origin/main...HEAD', () => {
    expect(parseArgs([])).toEqual({ base: 'origin/main', head: 'HEAD' });
  });
  it('honra --base/--head explícitos', () => {
    expect(parseArgs(['--base', 'main', '--head', 'feature-x'])).toEqual({ base: 'main', head: 'feature-x' });
  });
});

describe('runCli', () => {
  beforeEach(() => jest.clearAllMocks());

  it('exit 0 quando git diff não retorna nenhum arquivo do perímetro', () => {
    execFileSync.mockReturnValueOnce(
      'server/src/features/dynamicTables/presets/systems/AestheticClinicPreset.ts\nserver/src/jobs/activateAccountingBindingCli.ts\n',
    );
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    expect(runCli(['--base', 'origin/main', '--head', 'HEAD'])).toBe(0);
    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/^OK:/));
    spy.mockRestore();
  });

  it('exit 1 quando git diff retorna um arquivo do perímetro — passa quando não há (comportamento 9)', () => {
    execFileSync.mockReturnValueOnce('server/src/features/accounting/services/PostingService.ts\n');
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(runCli([])).toBe(1);
    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/^FALHOU:/));
    spy.mockRestore();
  });

  it('exit 1 e mensagem clara quando o próprio git diff falha (ex.: ref desconhecida)', () => {
    execFileSync.mockImplementationOnce(() => {
      throw new Error("fatal: ambiguous argument 'origin/main...HEAD'");
    });
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(runCli([])).toBe(1);
    expect(String(spy.mock.calls[0][0])).toMatch(/erro ao rodar/);
    spy.mockRestore();
  });
});
