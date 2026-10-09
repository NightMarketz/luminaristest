/** SIMPLES-PISO-ANEXO-XI itens 12-15 — leitura pura do Anexo XI (tabela MEI_ANEXO_XI). */
import type { LinhaLegal } from '../../../legalParameters/models/legalParameter';
import { ocupacoesExcluidas, anexoXiVigente, chavesInexistentes, cnaesForaDoAnexo, enquadramentoDasOcupacoes, transportadorNaTabelaB } from '../meiAnexoXi';

const linha = (chave: string, cnae: string, iss: boolean, icms: boolean, extra: Partial<LinhaLegal> = {}): LinhaLegal => ({
  id: `id-${chave}`,
  tabela: 'MEI_ANEXO_XI',
  chave,
  discriminador: chave.slice(0, 1),
  valorInt: null,
  valorTexto: null,
  valorJson: JSON.stringify({ ocupacao: `OCUPACAO ${chave}`, cnae, descricaoCnae: 'X', iss, icms }),
  fonte: 'Res. CGSN 140/2018 Anexo XI',
  vigenteDesde: '2025-10-01',
  vigenteAte: null,
  status: 'PUBLISHED',
  supersedesId: null,
  ...extra,
});
const LINHAS = [linha('A-0050', '9602-5/01', true, false), linha('A-0002', '1531-9/02', true, true), linha('B-0001', '4930-2/01', true, false), linha('A-0003', '4722-9/01', false, true, { status: 'REVOKED' })];

describe('meiAnexoXi', () => {
  it('chavesInexistentes: só as que não estão em vigor (revogada conta como inexistente)', () => {
    expect(chavesInexistentes(LINHAS, ['A-0050', 'A-0003', 'A-9999'])).toEqual(['A-0003', 'A-9999']);
  });

  it('anexoXiVigente: null antes da versão transcrita; mapa normalizado depois', () => {
    expect(anexoXiVigente(LINHAS, '2025-09-01')).toBeNull();
    const m = anexoXiVigente(LINHAS, '2026-03-01')!;
    expect([...m.keys()].sort()).toEqual(['A-0002', 'A-0050', 'B-0001']);
    expect(m.get('B-0001')).toMatchObject({ tabela: 'B', cnae: '4930201' });
  });

  it('cnaesForaDoAnexo: compara por dígitos, sem repetição', () => {
    const m = anexoXiVigente(LINHAS, '2026-03-01')!;
    expect(cnaesForaDoAnexo(m, ['9602501', '9602-5/01', '6201501', '6201-5/01'])).toEqual(['6201501']);
  });

  it('enquadramentoDasOcupacoes e transportadorNaTabelaB', () => {
    const m = anexoXiVigente(LINHAS, '2026-03-01')!;
    const o = (...k: string[]) => k.map((x) => m.get(x)!);
    expect(enquadramentoDasOcupacoes(o('A-0050'))).toEqual({ contribuinteIcms: false, contribuinteIss: true });
    expect(enquadramentoDasOcupacoes(o('A-0050', 'A-0002'))).toEqual({ contribuinteIcms: true, contribuinteIss: true });
    expect(transportadorNaTabelaB(o('B-0001'))).toEqual({ soTabelaB: true, algumaB: true });
    expect(transportadorNaTabelaB(o('B-0001', 'A-0050'))).toEqual({ soTabelaB: false, algumaB: true });
    expect(transportadorNaTabelaB(o('A-0050'))).toEqual({ soTabelaB: false, algumaB: false });
    expect(transportadorNaTabelaB([])).toEqual({ soTabelaB: false, algumaB: false });
  });

  it('ocupacoesExcluidas: encerrada antes da data ⇒ excluída com efeito no dia seguinte; com fim futuro ⇒ a excluir', () => {
    const ls = [linha('A-0050', '9602-5/01', true, false, { vigenteAte: '2026-05-31' }), linha('A-0002', '1531-9/02', true, true)];
    const antes = ocupacoesExcluidas(ls, anexoXiVigente(ls, '2026-03-01')!, ['A-0050', 'A-0002'], '2026-03-01');
    expect(antes).toEqual({ excluidas: [], aExcluir: [{ chave: 'A-0050', efeitoDesde: '2026-06-01' }] });
    const depois = ocupacoesExcluidas(ls, anexoXiVigente(ls, '2026-06-01')!, ['A-0050', 'A-0002'], '2026-06-01');
    expect(depois).toEqual({ excluidas: [{ chave: 'A-0050', efeitoDesde: '2026-06-01' }], aExcluir: [] });
  });
});
