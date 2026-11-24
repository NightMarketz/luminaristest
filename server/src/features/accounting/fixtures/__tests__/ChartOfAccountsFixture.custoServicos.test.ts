/**
 * Lacuna L-20261120-223329-35d3 (dono, 2026-11-21): a folha 4.7 "Custo dos Serviços Prestados" no plano padrão, na linha de
 * custo da DRE (acima do lucro bruto, NBC TG 1002 item 5.1 (d)), com referencial e papel padrão do insumo do serviço.
 */
import {
  CANONICAL_ACCOUNTS,
  CANONICAL_ACCOUNTS_PRE_L8,
  CUSTO_SERVICOS_CODE,
  PERFIL_FISCAL_PLANO_PADRAO,
  REFERENCIAL_PLANO_PADRAO,
} from '../ChartOfAccountsFixture';
import { findDreRule, findMappingRule } from '../../services/StatementMappingFixture';

describe('Lacuna 35d3 — Custo dos Serviços Prestados (4.7)', () => {
  it('é folha Expense do plano padrão; o plano congelado de antes da L8 não muda', () => {
    expect(CUSTO_SERVICOS_CODE).toBe('4.7');
    expect(CANONICAL_ACCOUNTS.filter((a) => a.code === '4.7')).toEqual([
      { code: '4.7', name: 'Custo dos Serviços Prestados', nature: 'Expense', acceptsEntries: true },
    ]);
    expect(CANONICAL_ACCOUNTS_PRE_L8.some((a) => a.code === '4.7')).toBe(false);
  });

  it('DRE: 4.7 → costOfGoodsSold (débito negativo), como a 4.2; 4.1 e 4.6 seguem em expenses', () => {
    expect(findMappingRule('Expense', '4.7', 'DRE')).toMatchObject({ id: 'dre.cogs_services', section: 'costOfGoodsSold', sign: 'debit_negative' });
    expect(findMappingRule('Expense', '4.2', 'DRE')?.section).toBe('costOfGoodsSold');
    expect(['4.1', '4.6'].map((c) => findMappingRule('Expense', c, 'DRE')?.section)).toEqual(['expenses', 'expenses']);
  });

  it('referencial 3.01.01.03.01.03 e padrão do insumoExpenseAccountId', () => {
    expect(REFERENCIAL_PLANO_PADRAO.filter((e) => e.accountCode === '4.7')).toEqual([
      { accountCode: '4.7', referentialCode: '3.01.01.03.01.03', label: '(-) Custo dos Serviços Prestados' },
    ]);
    expect(PERFIL_FISCAL_PLANO_PADRAO.filter((e) => e.field === 'insumoExpenseAccountId')).toEqual([{ field: 'insumoExpenseAccountId', accountCode: '4.7' }]);
  });
});

describe('Lacuna 13dd — a regra de folha da DRE casa só a conta que É a folha do plano padrão', () => {
  const sem = new Set<string>();
  const linha = (code: string, name: string, nature = 'Expense', accountId = `acc-${code}`) => ({ accountId, code, name, nature });

  it('4.7 do plano padrão → custo; 4.7 do usuário ("Perda na Baixa") → expenses', () => {
    expect(findDreRule(linha('4.7', 'Custo dos Serviços Prestados'), sem)?.id).toBe('dre.cogs_services');
    expect(findDreRule(linha('4.7', 'custo  dos serviços PRESTADOS'), sem)?.id).toBe('dre.cogs_services'); // caixa/espaço não contam
    expect(findDreRule(linha('4.7', 'Perda na Baixa de Imobilizado C7'), sem)?.id).toBe('dre.expenses');
    expect(findDreRule(linha('4.2', 'Outra Despesa'), sem)?.id).toBe('dre.expenses');
  });

  it('só o código exato passa pela identidade: subconta legada sob a 4.7 segue a tabela (custo), como antes', () => {
    expect(findDreRule(linha('4.7.1', 'Insumos do serviço (custo)'), sem)?.id).toBe('dre.cogs_services');
  });

  it('o papel do insumo vence a identidade (038d): a 4.7 do usuário apontada como insumo é custo', () => {
    expect(findDreRule(linha('4.7', 'Perda na Baixa de Imobilizado C7'), new Set(['acc-4.7']))?.id).toBe('dre.cogs_services');
  });

  it('limite: Revenue segue pelo prefixo (sem regra genérica a seguir, sairia da DRE)', () => {
    expect(findDreRule(linha('3.2', 'Outra Receita', 'Revenue'), sem)?.id).toBe('dre.deductions');
    expect(findDreRule(linha('3.5.1', 'Juros de Mora Recebidos', 'Revenue'), sem)?.id).toBe('dre.financial_rev');
  });
});
