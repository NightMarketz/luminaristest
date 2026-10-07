/**
 * BE-INCR-LEGAL-PARAMS PR-2 — unidade: o formato por tabela (§4 — `valorJson` com schema por tabela; linha fora do
 * formato ⇒ 400 na proposta), a regra "tabela-lista vazia na data ⇒ erro explícito" (item 4) e o teste-guarda do
 * item 13 (as constantes soltas não são mais exportadas nem declaradas como literal).
 */
import fs from 'fs';
import path from 'path';
import { erroDeFormato, type LinhaParaFormato } from '../models/formatoLinha';
import { SemLinhaVigenteError, linhasVigentesDaTabela, type LinhaLegal } from '../models/legalParameter';

const L = (o: Partial<LinhaLegal>): LinhaLegal => ({
  id: 'a', tabela: 'CFOP_IMOBILIZADO', chave: '1551', discriminador: null, valorInt: null, valorTexto: 'ENTRADA_IMOBILIZADO', valorJson: null,
  fonte: 'f', vigenteDesde: '2025-01-01', vigenteAte: null, status: 'PUBLISHED', supersedesId: null, ...o,
});

describe('formato por tabela (§4)', () => {
  it.each<[Partial<LinhaParaFormato>, RegExp]>([
    [{ tabela: 'CODIGO_RECEITA', chave: 'IRPJ_PRESUMIDO', valorTexto: '2089' }, /6 dígitos/],
    [{ tabela: 'CODIGO_RECEITA', chave: 'INVENTADO', valorTexto: '208901' }, /nome do código/],
    [{ tabela: 'CODIGO_RECEITA', chave: 'PIS', discriminador: 'OUTRO', valorTexto: '810902' }, /CUMULATIVO\|NAO_CUMULATIVO/],
    [{ tabela: 'PIS_COFINS_MONOFASICO_NCM', chave: '3004', valorJson: { exceto: ['30049099'] } }, /ordem/],
    [{ tabela: 'PIS_COFINS_MONOFASICO_NCM', chave: '30.04', valorJson: { ordem: 1 } }, /prefixo/],
    [{ tabela: 'CST_PIS_COFINS', chave: '03', valorTexto: 'TALVEZ' }, /SEM_CREDITO\|TRIBUTADO/],
    [{ tabela: 'CFOP_IMOBILIZADO', chave: '3551', valorInt: 1 }, /valorTexto/],
    [{ tabela: 'NFE_CSTAT_AUTORIZADA', chave: '1000', valorTexto: 'AUTORIZADA' }, /3 dígitos/],
    [{ tabela: 'OBRIGACAO_REGIME', chave: 'ECD', discriminador: 'LTDA', valorJson: {} }, /regime/],
    [{ tabela: 'OBRIGACAO_REGIME', chave: 'ECD', discriminador: 'REAL', valorJson: { statusBase: 'OBRIGATORIA' } }, /statusBase, condicoes/],
    [{ tabela: 'LC116_SERVICO', chave: '060101', valorJson: { linha: 73, descricao: 'x', li: ['XX'], grupo: null } }, /li/],
    [{ tabela: 'ISS_LIMITE', chave: 'ALIQUOTA_MAX_BP', valorInt: 20_000 }, /0\.\.10000/],
    [{ tabela: 'LEIAUTE_SPED', chave: 'ECF', valorTexto: '12' }, /4 dígitos/],
    [{ tabela: 'FERIADO_NACIONAL', chave: '02-30', valorTexto: 'FIXO' }, /MM-DD de calendário/],
  ])('%j ⇒ erro', (linha, msg) => {
    expect(erroDeFormato(linha as LinhaParaFormato)).toMatch(msg);
  });

  it('linhas no formato ⇒ null; tabela do PR-1 fica com a regra do serviço (sem regra aqui)', () => {
    expect(erroDeFormato({ tabela: 'CODIGO_RECEITA', chave: 'PIS', discriminador: 'CUMULATIVO', valorTexto: '810902' })).toBeNull();
    expect(erroDeFormato({ tabela: 'FERIADO_NACIONAL', chave: '02-29', valorTexto: 'FIXO' })).toBeNull();
    expect(erroDeFormato({ tabela: 'ISS_LIMITE', chave: 'ALIQUOTA_MAX_BP', valorInt: 500 })).toBeNull();
    expect(erroDeFormato({ tabela: 'TAX_ASSESSMENT', chave: 'IRPJ_ALIQ', valorInt: 1500 })).toBeNull();
  });
});

describe('tabela-lista na data (item 4)', () => {
  it('a mais recente por chave; chave ausente = fora da lista; tabela vazia na data ⇒ SemLinhaVigenteError (400)', () => {
    const ls = [L({ id: 'a' }), L({ id: 'b', chave: '2551' }), L({ id: 'c', chave: '1551', vigenteDesde: '2026-01-01', valorTexto: 'ENTRADA_IMOBILIZADO' })];
    expect(linhasVigentesDaTabela(ls, 'CFOP_IMOBILIZADO', '2026-06-30').map((l) => l.id).sort()).toEqual(['b', 'c']);
    expect(linhasVigentesDaTabela(ls, 'CFOP_IMOBILIZADO', '2025-06-30').map((l) => l.id).sort()).toEqual(['a', 'b']);
    expect(() => linhasVigentesDaTabela(ls, 'CFOP_IMOBILIZADO', '2024-12-31')).toThrow(SemLinhaVigenteError);
    expect(() => linhasVigentesDaTabela(ls, 'NFE_CSTAT_AUTORIZADA', '2026-06-30')).toThrow(/NFE_CSTAT_AUTORIZADA/);
  });
});

describe('item 13 — as constantes soltas não são mais exportadas nem declaradas', () => {
  const SRC = path.resolve(__dirname, '../../../');
  it.each([
    ['lib/nfeCost.ts', 'PIS_CREDIT_BP'],
    ['lib/nfeCost.ts', 'COFINS_CREDIT_BP'],
    ['features/accounting/models/itemDestination.ts', 'FIXED_ASSET_CFOPS'],
    ['features/accounting/models/pisCofinsMonofasicoNcm.ts', 'CST_SEM_CREDITO'],
    ['features/accounting/models/pisCofinsMonofasicoNcm.ts', 'CST_TRIBUTADO'],
    ['features/accounting/models/pisCofinsMonofasicoNcm.ts', 'PIS_COFINS_MONOFASICO_NCM'],
    ['lib/nfe.ts', 'AUTHORIZED_CSTAT'],
    ['lib/sped.ts', 'SPED_LAYOUT_VERSION'],
    ['lib/ecf.ts', 'ECF_COD_VER_BY_YEAR'],
    ['lib/ecf.ts', 'ECF_COD_VER'],
    ['features/packages/models/validity.ts', 'FIXED_NATIONAL_HOLIDAYS'],
    ['features/packages/models/validity.ts', 'ZUMBI_FROM_YEAR'],
    ['features/accounting/models/taxAssessmentParams.ts', 'CODIGOS_RECEITA'],
    ['features/accounting/models/taxAssessmentParams.ts', 'CODIGOS_RECEITA_FONTE'],
    ['features/accounting/models/pisCofinsParams.ts', 'CODIGOS_RECEITA_PIS_COFINS'],
    ['features/accounting/models/obrigacoesPorRegime.ts', 'OBRIGACOES_POR_REGIME'],
    ['features/accounting/models/lc116ListaNacional.ts', 'LC116_LISTA_NACIONAL'],
  ])('%s não exporta nem declara %s', async (arquivo, simbolo) => {
    const mod = (await import(path.join(SRC, arquivo))) as Record<string, unknown>;
    expect(mod[simbolo]).toBeUndefined();
    expect(fs.readFileSync(path.join(SRC, arquivo), 'utf8')).not.toMatch(new RegExp(`(const|let|var)\\s+${simbolo}\\b`));
  });

  it('os literais de lei que saíram não voltaram: 165/760 do crédito, 1551/2551, 100/150, 9.00, 0012', () => {
    // Só código: comentário que conta a história (ex.: "'0012' chutado") não é literal em uso.
    const ler = (a: string) =>
      fs
        .readFileSync(path.join(SRC, a), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '');
    expect(ler('lib/nfeCost.ts')).not.toMatch(/\b(165|760)\b/);
    expect(ler('features/accounting/models/itemDestination.ts')).not.toMatch(/'(1551|2551)'/);
    expect(ler('lib/nfe.ts')).not.toMatch(/'(100|150)'/);
    expect(ler('lib/sped.ts')).not.toMatch(/'9\.00'/);
    expect(ler('lib/ecf.ts')).not.toMatch(/'0012'/);
  });
});
