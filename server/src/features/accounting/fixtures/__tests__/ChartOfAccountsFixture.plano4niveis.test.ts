import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';
import {
  CANONICAL_ACCOUNTS,
  CANONICAL_ACCOUNTS_PRE_L8,
  NIVEL_MINIMO_ANALITICA_PATRIMONIAL,
  PATRIMONIAL_NATURES,
  RENOMEACAO_CANONICA_L8,
  codigoPosL8,
} from '../ChartOfAccountsFixture';
import { CASH_ACCOUNT_CODE_PREFIXES } from '../../services/CashFlowReportService';

/**
 * BE-INCR-PLANO-4-NIVEIS (L8 do RUNBOOK-H1; ADR-PLANO-CONTAS-4-NIVEIS) — itens 1, 2 e 3 do BRIEF.
 * Regra: Manual da ECD L9 (jan/2026) p. 119, REGRA_VALIDA_NIVEL_CONTAS — analítica de COD_NAT 01/02/03 com NIVEL ≥ 4.
 */

const segmentos = (code: string) => code.split('.').length;
const byCode = new Map(CANONICAL_ACCOUNTS.map((a) => [a.code, a]));

describe('plano canônico em 4 níveis (item 1)', () => {
  it('toda analítica de ativo/passivo/PL tem ≥ 4 segmentos (varre o fixture)', () => {
    const rasas = CANONICAL_ACCOUNTS.filter(
      (a) => a.acceptsEntries && PATRIMONIAL_NATURES.includes(a.nature) && segmentos(a.code) < NIVEL_MINIMO_ANALITICA_PATRIMONIAL,
    ).map((a) => a.code);
    expect(rasas).toEqual([]);
  });

  it('todo prefixo de código existe como sintética (I050.COD_CTA_SUP), da mesma natureza — exceto o PL sob Passivo', () => {
    const problemas: string[] = [];
    for (const a of CANONICAL_ACCOUNTS) {
      const partes = a.code.split('.');
      for (let n = 1; n < partes.length; n++) {
        const pai = byCode.get(partes.slice(0, n).join('.'));
        if (!pai) problemas.push(`${a.code}: falta ${partes.slice(0, n).join('.')}`);
        else if (pai.acceptsEntries) problemas.push(`${a.code}: ${pai.code} aceita lançamento`);
        // O PL (Equity) fica sob `2` Passivo — o COD_NAT é por conta no I050 (comentário do fixture; o PVA aceitou
        // na tentativa 2 do H1). Toda outra conta tem a natureza do pai.
        else if (pai.nature !== a.nature && !(a.nature === 'Equity' && pai.code === '2')) {
          problemas.push(`${a.code} (${a.nature}) sob ${pai.code} (${pai.nature})`);
        }
      }
    }
    expect(problemas).toEqual([]);
  });

  it('o de-para L8 leva toda analítica patrimonial antiga a uma analítica nova de mesmo nome e natureza', () => {
    const antigas = CANONICAL_ACCOUNTS_PRE_L8.filter((a) => a.acceptsEntries && PATRIMONIAL_NATURES.includes(a.nature));
    expect(antigas.map((a) => a.code).sort()).toEqual(RENOMEACAO_CANONICA_L8.map((r) => r.de).sort());
    for (const a of antigas) {
      const nova = byCode.get(codigoPosL8(a.code));
      expect(nova).toMatchObject({ nature: a.nature, acceptsEntries: true });
    }
    // Resultado não muda (fora da regra): mesmos códigos e nomes antes e depois.
    const resultado = (l: ReadonlyArray<{ code: string; name: string; nature: string }>) =>
      l.filter((a) => a.nature === 'Revenue' || a.nature === 'Expense').map((a) => `${a.code} ${a.name}`);
    expect(resultado(CANONICAL_ACCOUNTS)).toEqual(resultado(CANONICAL_ACCOUNTS_PRE_L8));
  });
});

describe('caixa do DFC (item 3)', () => {
  it('os prefixos de caixa casam Banco e Caixa e nenhuma outra analítica', () => {
    const caixa = CANONICAL_ACCOUNTS.filter(
      (a) => a.acceptsEntries && CASH_ACCOUNT_CODE_PREFIXES.some((p) => a.code === p || a.code.startsWith(`${p}.`)),
    ).map((a) => a.name);
    expect(caixa.sort()).toEqual(['Banco', 'Caixa']);
  });
});

describe('nenhum código patrimonial antigo literal em produção (item 2)', () => {
  // Classe `auditAllowlistCoverage`: varre a fonte em vez de confiar numa lista de arquivos. Ficam de fora só os
  // artefatos CONGELADOS do plano de 3 níveis (F-L8-7 a / F-L8-9 a): o próprio fixture (tabela de-para e o plano
  // antigo), os bindings V1 e os kits/referencial publicados antes da L8.
  const SRC = join(__dirname, '..', '..', '..', '..');
  const CONGELADOS = new Set([
    'features/accounting/fixtures/ChartOfAccountsFixture.ts',
    'features/accountingBinding/fixtures/saleBinding.ts',
    'features/accountingBinding/fixtures/clinicBinding.ts',
    'features/sectorKits/kits/beautySalon/kit.v2.ts',
    'features/sectorKits/kits/_shared/referencial2025Canonico.ts',
  ]);
  const LITERAL = /['"](1\.1\.[1-6]|2\.1\.[12]|2\.3\.1)['"]/;

  function tsFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) return name === '__tests__' ? [] : tsFiles(full);
      return /\.ts$/.test(name) && !/\.test\.ts$/.test(name) ? [full] : [];
    });
  }

  it('fora dos artefatos congelados, todo código patrimonial vem das constantes do fixture', () => {
    const achados: string[] = [];
    for (const file of tsFiles(SRC)) {
      const rel = relative(SRC, file).replace(/\\/g, '/');
      if (CONGELADOS.has(rel)) continue;
      readFileSync(file, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          const codigo = line.split('//')[0];
          if (!/^\s*\*/.test(line) && LITERAL.test(codigo)) achados.push(`${rel}:${i + 1}: ${line.trim()}`);
        });
    }
    expect(achados).toEqual([]);
  });
});
