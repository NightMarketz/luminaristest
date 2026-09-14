const execFileSync = jest.fn();
jest.mock('child_process', () => ({ execFileSync: (...a: unknown[]) => execFileSync(...a) }));

import {
  SYMBOL_ALLOWLIST,
  classifySymbolDiff,
  classifyZeroDiffViolations,
  parseArgs,
  runCli,
} from '../proveP2ZeroDiffCli';

// ─── Fixtures da exceção nominal (ADR-P2 EMENDA 2026-09-14, R7) ──────────────────────────────
const SERVICE_FILE = 'server/src/features/dynamicTables/services/DynamicTableService.ts';

/** Cabeça de arquivo mínima com o MESMO formato do real: método público indentado com 2 espaços,
 *  fechado por `  }` na coluna do membro da classe; um método vizinho antes e outro depois. */
const HEAD_SOURCE = [
  'export class DynamicTableService {', // 1
  '  private resolvePresetRelations(schema: ITableSchema): ITableSchema {', // 2
  '    return schema;', // 3
  '  }', // 4
  '', // 5
  '  public async installPresetAsSystem(userId: string, preset: Preset) {', // 6
  '    await prisma.$transaction(async (tx) => {', // 7
  '      const txRepo = new TransactionalDynamicTableRepository(tx);', // 8
  '      // T0 do time-to-first-ECD (ADR-P2 emenda R7)', // 9
  '      await tx.user.update({ where: { id: userId }, data: { onboardingCompletedAt: new Date() } });', // 10
  '    });', // 11
  "    return { message: 'Preset installed successfully' };", // 12
  '  }', // 13
  '', // 14
  '  public async deleteTableAsSystem(tableId: string): Promise<void> {', // 15
  '    await this.repository.deleteTable(tableId);', // 16
  '  }', // 17
  '}', // 18
].join('\n');

/** `git diff -U0` do marco: 2 linhas adicionadas (comentário + escrita) dentro do símbolo, nada removido. */
const DIFF_MARCO_ONLY = [
  `diff --git a/${SERVICE_FILE} b/${SERVICE_FILE}`,
  '--- a/' + SERVICE_FILE,
  '+++ b/' + SERVICE_FILE,
  '@@ -8,0 +9,2 @@',
  '+      // T0 do time-to-first-ECD (ADR-P2 emenda R7)',
  '+      await tx.user.update({ where: { id: userId }, data: { onboardingCompletedAt: new Date() } });',
  '',
].join('\n');

describe('SYMBOL_ALLOWLIST — exceção NOMINAL de UM símbolo (ADR-P2 EMENDA 2026-09-14, R7 item 2)', () => {
  it('tem exatamente uma entrada: installPresetAsSystem em DynamicTableService.ts, marco onboardingCompletedAt', () => {
    // Teste-guarda literal da emenda: "falha se a allowlist crescer (2º símbolo, 2º arquivo)".
    expect(SYMBOL_ALLOWLIST).toEqual([
      { file: SERVICE_FILE, symbol: 'installPresetAsSystem', marker: 'onboardingCompletedAt' },
    ]);
  });

  it('sem o diff do arquivo fornecido, o nome do arquivo continua sendo violação (fail-closed)', () => {
    const report = classifyZeroDiffViolations([SERVICE_FILE]);
    expect(report.clean).toBe(false);
    expect(report.perimeterViolations).toEqual([SERVICE_FILE]);
  });

  it('aceita o diff que toca SÓ o marco dentro de installPresetAsSystem — e só ele', () => {
    const report = classifyZeroDiffViolations([SERVICE_FILE], {
      symbolDiffs: { [SERVICE_FILE]: { diff: DIFF_MARCO_ONLY, headSource: HEAD_SOURCE } },
    });
    expect(report.clean).toBe(true);
    expect(report.perimeterViolations).toEqual([]);
    expect(report.allowlistedSymbolEdits).toEqual([SERVICE_FILE]);
  });

  it('REPROVA linha adicionada dentro do símbolo que não é o marco', () => {
    const diff = DIFF_MARCO_ONLY.replace(
      '+      // T0 do time-to-first-ECD (ADR-P2 emenda R7)',
      "+      await tx.user.update({ where: { id: userId }, data: { locale: 'pt' } });",
    );
    const v = classifySymbolDiff(diff, HEAD_SOURCE, SYMBOL_ALLOWLIST[0]);
    expect(v).toEqual([expect.stringMatching(/linha 9 .*não é o marco/)]);
  });

  it('REPROVA diff fora do símbolo (método vizinho), mesmo que contenha o marco', () => {
    const diff = [
      `diff --git a/${SERVICE_FILE} b/${SERVICE_FILE}`,
      '@@ -15,0 +16,1 @@',
      '+    await this.repository.touch(tableId, { onboardingCompletedAt: new Date() });',
      '',
    ].join('\n');
    const v = classifySymbolDiff(diff, HEAD_SOURCE, SYMBOL_ALLOWLIST[0]);
    expect(v).toEqual([expect.stringMatching(/linha 16 .*fora do corpo de installPresetAsSystem/)]);
  });

  it('REPROVA qualquer linha removida — a exceção é aditiva', () => {
    const diff = [
      `diff --git a/${SERVICE_FILE} b/${SERVICE_FILE}`,
      '@@ -8,1 +8,0 @@',
      '-      const txRepo = new TransactionalDynamicTableRepository(tx);',
      '',
    ].join('\n');
    const v = classifySymbolDiff(diff, HEAD_SOURCE, SYMBOL_ALLOWLIST[0]);
    expect(v).toEqual([expect.stringMatching(/remov/)]);
  });

  // ── Bypasses achados no review independente do PR #320 (F2–F5) — cada um REPROVA ──────────────
  it('F2: marker num comentário à direita de código não é o marco', () => {
    const diff = DIFF_MARCO_ONLY.replace(
      '+      await tx.user.update({ where: { id: userId }, data: { onboardingCompletedAt: new Date() } });',
      '+      await tx.user.deleteMany({}); // onboardingCompletedAt',
    );
    expect(classifySymbolDiff(diff, HEAD_SOURCE, SYMBOL_ALLOWLIST[0])).toEqual([expect.stringMatching(/linha 10 .*não é o marco/)]);
  });

  it('F2: marker dentro de string literal não é o marco', () => {
    const diff = DIFF_MARCO_ONLY.replace(
      "data: { onboardingCompletedAt: new Date() }",
      "data: { role: 'ADMIN', locale: 'onboardingCompletedAt' }",
    );
    expect(classifySymbolDiff(diff, HEAD_SOURCE, SYMBOL_ALLOWLIST[0])).toEqual([expect.stringMatching(/linha 10 .*não é o marco/)]);
  });

  it('F3: comentário de bloco na mesma linha de código executável não é isento', () => {
    const diff = DIFF_MARCO_ONLY.replace(
      '+      // T0 do time-to-first-ECD (ADR-P2 emenda R7)',
      "+      /* T0 */ await tx.user.update({ where: { id: userId }, data: { role: 'ADMIN' } });",
    );
    expect(classifySymbolDiff(diff, HEAD_SOURCE, SYMBOL_ALLOWLIST[0])).toEqual([expect.stringMatching(/linha 9 .*não é o marco/)]);
  });

  it('F3: linha que começa com `*/` seguida de código não é isenta', () => {
    const diff = DIFF_MARCO_ONLY.replace(
      '+      // T0 do time-to-first-ECD (ADR-P2 emenda R7)',
      '+      */ await tx.user.deleteMany({}); /*',
    );
    expect(classifySymbolDiff(diff, HEAD_SOURCE, SYMBOL_ALLOWLIST[0])).toEqual([expect.stringMatching(/linha 9 .*não é o marco/)]);
  });

  it('F4: linha adicionada cujo conteúdo começa com `++` não é confundida com cabeçalho `+++`', () => {
    const diff = DIFF_MARCO_ONLY.replace(
      '+      // T0 do time-to-first-ECD (ADR-P2 emenda R7)',
      '+++[].length, await tx.user.deleteMany({});',
    );
    expect(classifySymbolDiff(diff, HEAD_SOURCE, SYMBOL_ALLOWLIST[0])).toEqual([expect.stringMatching(/linha 9 .*não é o marco/)]);
  });

  it('F4: linha removida cujo conteúdo começa com `--` não é confundida com cabeçalho `---`', () => {
    const diff = [`diff --git a/${SERVICE_FILE} b/${SERVICE_FILE}`, '@@ -8,1 +8,0 @@', '---i;', ''].join('\n');
    expect(classifySymbolDiff(diff, HEAD_SOURCE, SYMBOL_ALLOWLIST[0])).toEqual([expect.stringMatching(/remov/)]);
  });

  it('F5: diff sem nenhuma linha do marco (ex.: só mode-change) não é "só o marco"', () => {
    const diff = [`diff --git a/${SERVICE_FILE} b/${SERVICE_FILE}`, 'old mode 100644', 'new mode 100755', ''].join('\n');
    expect(classifySymbolDiff(diff, HEAD_SOURCE, SYMBOL_ALLOWLIST[0])).toEqual([expect.stringMatching(/nenhuma linha do marco/)]);
  });

  it('REPROVA quando o símbolo não é encontrado no head (renomeado/apagado)', () => {
    const v = classifySymbolDiff(DIFF_MARCO_ONLY, HEAD_SOURCE.replace('installPresetAsSystem', 'installPreset'), SYMBOL_ALLOWLIST[0]);
    expect(v).toEqual([expect.stringMatching(/installPresetAsSystem não encontrado/)]);
  });

  it('runCli busca o diff -U0 e o head do arquivo allowlisted e sai 0 quando é só o marco', () => {
    execFileSync
      .mockReturnValueOnce(`${SERVICE_FILE}\nserver/prisma/schema.prisma\n`) // git diff --name-only
      .mockReturnValueOnce(DIFF_MARCO_ONLY) // git diff -U0 -- file
      .mockReturnValueOnce(HEAD_SOURCE); // git show head:file
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    expect(runCli(['--base', 'origin/main', '--head', 'HEAD'])).toBe(0);
    expect(execFileSync).toHaveBeenNthCalledWith(2, 'git', ['diff', '-U0', 'origin/main...HEAD', '--', SERVICE_FILE], expect.anything());
    expect(execFileSync).toHaveBeenNthCalledWith(3, 'git', ['show', `HEAD:${SERVICE_FILE}`], expect.anything());
    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/exceção nominal.*installPresetAsSystem/));
    spy.mockRestore();
  });

  it('runCli sai 1 e nomeia a linha quando o diff do símbolo vai além do marco', () => {
    execFileSync
      .mockReturnValueOnce(`${SERVICE_FILE}\n`)
      .mockReturnValueOnce(DIFF_MARCO_ONLY.replace('onboardingCompletedAt', 'lastLoginAt'))
      .mockReturnValueOnce(HEAD_SOURCE);
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(runCli([])).toBe(1);
    expect(spy.mock.calls.map((c) => String(c[0])).join('\n')).toMatch(/símbolo allowlisted.*linha 10/);
    spy.mockRestore();
  });
});

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
