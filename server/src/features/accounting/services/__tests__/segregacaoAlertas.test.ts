import { alertasDeSegregacao, type PerfilProdutoSegregacao } from '../SimplesApuracaoService';
import type { SimplesSegregacaoParcela } from '../../dtos/SimplesDto';

/**
 * BE-INCR-EFICIENCIA-FISCAL PR-2 (itens 13–14; ADR D7, I-8): os avisos da segregação derivada da NCM — `SEM_NCM`,
 * `ICMS_ST_NAO_CONFERIDA` (D-2026-10-27-EFICIENCIA-FISCAL-PR2-EXECUCAO, decisão 2), `SEGREGACAO_DIVERGE` e `SEGREGACAO_INDEVIDA`.
 */
type Linha = Parameters<typeof alertasDeSegregacao>[1][number];
const revenda = (productRef: string | null, cents: number, excluir: string[]): Linha => ({
  natureza: 'REVENDA',
  cTribNac: null,
  receitaCents: BigInt(cents),
  cotaProfissionalCents: 0n,
  parceriaContratoId: null,
  excluir,
  productRef,
});
const servico = (cents: number): Linha => ({ natureza: 'SERVICO', cTribNac: '060101', receitaCents: BigInt(cents), cotaProfissionalCents: 0n, parceriaContratoId: null, excluir: [], productRef: null });
const perfis = new Map<string, PerfilProdutoSegregacao>([
  ['shampoo', { ncm: '33051000', csosn: '500' }],
  ['tesoura', { ncm: '82130000', csosn: '102' }],
  ['semNcm', { ncm: '', csosn: null }],
]);
const manual = (receitaCents: number, motivo: SimplesSegregacaoParcela['motivo']): SimplesSegregacaoParcela => ({ natureza: 'REVENDA', receitaCents, motivo });
const codigos = (a: ReturnType<typeof alertasDeSegregacao>) => a.map((x) => x.codigo).sort();

describe('alertasDeSegregacao', () => {
  it('tudo derivado e com NCM, sem manual, sem CSOSN 500 ⇒ nenhum aviso', () => {
    expect(alertasDeSegregacao([], [revenda('tesoura', 5000, []), servico(10000)], perfis)).toEqual([]);
  });

  it('SEM_NCM: revenda sem produto ou com NCM inválida no perfil soma no aviso (WARNING); serviço não conta', () => {
    const a = alertasDeSegregacao([], [revenda('semNcm', 3000, []), revenda(null, 2000, []), revenda('desconhecido', 1000, []), servico(9000)], perfis);
    expect(a).toEqual([expect.objectContaining({ codigo: 'SEM_NCM', severity: 'WARNING', detalhe: expect.stringContaining('R$ 60.00') })]);
  });

  it('ICMS_ST_NAO_CONFERIDA: CSOSN 500 sem ICMS nas marcas ⇒ INFO; com ICMS derivado, silêncio', () => {
    expect(alertasDeSegregacao([], [revenda('shampoo', 4000, ['COFINS', 'PIS'])], perfis)).toEqual([
      expect.objectContaining({ codigo: 'ICMS_ST_NAO_CONFERIDA', severity: 'INFO', detalhe: expect.stringContaining('R$ 40.00') }),
    ]);
    expect(alertasDeSegregacao([], [revenda('shampoo', 4000, ['COFINS', 'ICMS', 'PIS'])], perfis)).toEqual([]);
  });

  it('SEGREGACAO_DIVERGE: manual igual à derivada ⇒ silêncio; diferente ⇒ WARNING (a manual prevalece, I-8)', () => {
    const linhas = [revenda('shampoo', 4000, ['COFINS', 'PIS']), revenda('tesoura', 6000, [])];
    expect(codigos(alertasDeSegregacao([manual(4000, 'MONOFASICO')], linhas, perfis))).toEqual(['ICMS_ST_NAO_CONFERIDA']);
    const a = alertasDeSegregacao([manual(2500, 'MONOFASICO')], linhas, perfis);
    expect(a.find((x) => x.codigo === 'SEGREGACAO_DIVERGE')).toMatchObject({ severity: 'WARNING', detalhe: expect.stringContaining('COFINS+PIS manual R$ 25.00 × derivada R$ 40.00') });
    expect(a.some((x) => x.codigo === 'SEGREGACAO_INDEVIDA')).toBe(false);
  });

  it('SEGREGACAO_INDEVIDA: monofásico declarado acima do que a NCM sustenta ⇒ WARNING citando LC 123 art. 29 V', () => {
    const linhas = [revenda('shampoo', 4000, ['COFINS', 'PIS']), revenda('tesoura', 6000, [])];
    const a = alertasDeSegregacao([manual(9000, 'MONOFASICO_E_ICMS_ST')], linhas, perfis);
    expect(codigos(a)).toEqual(['ICMS_ST_NAO_CONFERIDA', 'SEGREGACAO_DIVERGE', 'SEGREGACAO_INDEVIDA']);
    expect(a.find((x) => x.codigo === 'SEGREGACAO_INDEVIDA')!.detalhe).toContain('LC 123 art. 29 V');
  });

  it('revenda sem NCM entra no que sustenta a manual: não acusa indevida, só SEM_NCM e a divergência', () => {
    const a = alertasDeSegregacao([manual(3000, 'MONOFASICO')], [revenda('semNcm', 3000, [])], perfis);
    expect(codigos(a)).toEqual(['SEGREGACAO_DIVERGE', 'SEM_NCM']);
  });
});
