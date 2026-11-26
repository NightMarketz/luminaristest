/**
 * BE-INCR-DP-PONTE-RAZAO item 28 (F-PNT-4 a; dono 26/11: "Pesquisar referencial e incluir") — as contas de pessoal do plano
 * padrão, cada folha com o seu referencial RFB (tabela dinâmica da ECF, Leiaute 12, AC 2025). PROVISÓRIO até o P-FOL-5.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { CANONICAL_ACCOUNTS, CANONICAL_ACCOUNTS_PRE_L8, REFERENCIAL_PLANO_PADRAO } from '../ChartOfAccountsFixture';
import { findMappingRule } from '../../services/StatementMappingFixture';

const PESSOAL: ReadonlyArray<{ code: string; nature: string; referentialCode: string }> = [
  { code: '1.1.10.01', nature: 'Asset', referentialCode: '1.01.02.01.03' },
  { code: '2.1.10.01', nature: 'Liability', referentialCode: '2.01.01.01.01' },
  { code: '2.1.10.02', nature: 'Liability', referentialCode: '2.01.01.01.01' },
  { code: '2.1.10.03', nature: 'Liability', referentialCode: '2.01.01.01.03' },
  { code: '2.1.10.04', nature: 'Liability', referentialCode: '2.01.01.01.04' },
  { code: '2.1.10.05', nature: 'Liability', referentialCode: '2.01.01.15.03' },
  { code: '2.1.10.06', nature: 'Liability', referentialCode: '2.01.01.15.04' },
  { code: '4.10.01', nature: 'Expense', referentialCode: '3.01.01.07.01.02' },
  { code: '4.10.02', nature: 'Expense', referentialCode: '3.01.01.07.01.01' },
  { code: '4.10.03', nature: 'Expense', referentialCode: '3.01.01.07.01.05' },
  { code: '4.10.04', nature: 'Expense', referentialCode: '3.01.01.07.01.05' },
  { code: '4.10.05', nature: 'Expense', referentialCode: '3.01.01.07.01.07' },
  { code: '4.10.06', nature: 'Expense', referentialCode: '3.01.01.07.01.06' },
  { code: '4.10.07', nature: 'Expense', referentialCode: '3.01.01.07.01.26' },
  { code: '4.10.08', nature: 'Expense', referentialCode: '3.01.01.07.01.27' },
  { code: '4.10.09', nature: 'Expense', referentialCode: '3.01.01.07.01.03' },
  { code: '4.10.10', nature: 'Expense', referentialCode: '3.01.01.07.01.26' },
  { code: '4.10.11', nature: 'Expense', referentialCode: '3.01.01.07.01.27' },
];

describe('Item 28 da ponte — contas de pessoal no plano padrão', () => {
  it('cada folha de pessoal é analítica, com a natureza do papel, debaixo de uma sintética do plano', () => {
    for (const p of PESSOAL) {
      const conta = CANONICAL_ACCOUNTS.filter((a) => a.code === p.code);
      expect([p.code, conta.length, conta[0]?.nature, conta[0]?.acceptsEntries]).toEqual([p.code, 1, p.nature, true]);
      const pai = p.code.split('.').slice(0, -1).join('.');
      expect([pai, CANONICAL_ACCOUNTS.find((a) => a.code === pai)?.acceptsEntries]).toEqual([pai, false]);
    }
    expect(CANONICAL_ACCOUNTS_PRE_L8.some((a) => PESSOAL.some((p) => p.code === a.code))).toBe(false);
  });

  it('cada folha de pessoal tem exatamente um referencial, o da tabela', () => {
    for (const p of PESSOAL) {
      expect(REFERENCIAL_PLANO_PADRAO.filter((e) => e.accountCode === p.code).map((e) => e.referentialCode)).toEqual([p.referentialCode]);
    }
  });

  it('cada referencial de pessoal está no extrato da tabela oficial: analítico, sem DT_FIM, nas duas abas (Real e Presumido)', () => {
    // Extrato das linhas citadas da tabela dinâmica da ECF (Leiaute 12, AC 2025), versionado com o dossiê. Colunas: código |
    // descrição | DT_INI | DT_FIM | TIPO | superior | nível | natureza | orientações.
    const extrato = readFileSync(join(__dirname, '..', '..', '..', '..', '..', '..', 'pesquisas-legais', 'dp-ponte-item28-referencial', 'docs', 'D01_linhas-citadas.txt'), 'utf8');
    const linhasPorAba = new Map<string, string[][]>();
    let aba = '';
    for (const linha of extrato.split(/\r?\n/)) {
      const m = /^=== Aba (\w+) ===$/.exec(linha);
      if (m) aba = m[1];
      else if (aba && linha.includes(' | ')) linhasPorAba.set(aba, [...(linhasPorAba.get(aba) ?? []), linha.split(' | ')]);
    }
    const NATUREZA_RFB: Record<string, string> = { Asset: '1', Liability: '2', Expense: '4' };
    for (const p of PESSOAL) {
      const abas = p.nature === 'Expense' ? ['L300A', 'P150A'] : ['L100A', 'P100A'];
      for (const a of abas) {
        const r = (linhasPorAba.get(a) ?? []).find((c) => c[0] === p.referentialCode);
        expect([p.code, a, r?.[3], r?.[4], r?.[7]]).toEqual([p.code, a, '', 'A', NATUREZA_RFB[p.nature]]);
      }
    }
    // Prova na condição que falha: a sintética do grupo está no extrato com TIPO S.
    expect((linhasPorAba.get('L300A') ?? []).find((c) => c[0] === '3.01.01.07.01')?.[4]).toBe('S');
  });

  it('códigos sem repetição no plano', () => {
    const codigos = CANONICAL_ACCOUNTS.map((a) => a.code);
    expect(new Set(codigos).size).toBe(codigos.length);
  });

  it('DRE: as despesas de pessoal caem em expenses (regra só por natureza), não em custo nem no financeiro', () => {
    for (const p of PESSOAL.filter((x) => x.nature === 'Expense')) {
      expect([p.code, findMappingRule('Expense', p.code, 'DRE')?.section]).toEqual([p.code, 'expenses']);
    }
  });
});
