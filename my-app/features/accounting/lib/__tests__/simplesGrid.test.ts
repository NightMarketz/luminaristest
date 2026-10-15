import { describe, it, expect } from 'vitest';
import { ehMei, type AlertaSimples } from '../../../../lib/services/simples.service';
import {
  BLOQUEANTES, CONCORRENCIA_ANO, celulaDaApuracao, celulaDoErro, competenciasDoAno, emLotes, formatBp, formatMilesimos, ordenarAlertas,
} from '../simplesGrid';
import { apuracaoMei, apuracaoSimples } from '../../components/__tests__/simplesFixtures';

/** FE-INCR-SIMPLES PR-A — helpers da grade (itens 2, 3, 5, 6; F-FS-3, F-FS-4). */
describe('simplesGrid', () => {
  it('item 2: as 12 competências do ano', () => {
    expect(competenciasDoAno(2026)).toEqual([
      '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12',
    ]);
  });

  it('F-FS-3 (a): no máximo 3 em voo e todos os itens processados', async () => {
    expect(CONCORRENCIA_ANO).toBe(3);
    let emVoo = 0;
    let pico = 0;
    const feitos: string[] = [];
    await emLotes(competenciasDoAno(2026), CONCORRENCIA_ANO, async (c) => {
      emVoo += 1;
      pico = Math.max(pico, emVoo);
      await new Promise((r) => setTimeout(r, 1));
      feitos.push(c);
      emVoo -= 1;
    });
    expect(pico).toBe(3);
    expect(feitos).toHaveLength(12);
  });

  it('item 3: o type guard separa MEI de ME/EPP pelas duas fixtures', () => {
    const mei = apuracaoMei('2026-03');
    const me = apuracaoSimples('2026-03');
    expect(ehMei(mei)).toBe(true);
    expect(ehMei(me)).toBe(false);
    if (ehMei(mei)) expect(mei.cppAliquotaBp).toBe(500);
    if (!ehMei(me)) expect(me.rbt12Cents).toBe(36000000);
  });

  it('item 2: estado e selos da célula saem da resposta', () => {
    expect(celulaDaApuracao(apuracaoSimples('2026-01'))).toMatchObject({ estado: 'calculado', bloqueante: false, divergente: false, warning: false, pendente: false });
    const das = { id: 'd1', numeroDocumento: '07202601', valorCents: 257300, vencimento: '2026-02-20', provisaoPendente: true };
    const alertas: AlertaSimples[] = [
      { codigo: 'RBT12_INCOMPLETO', detalhe: 'falta 2025-04', severity: 'WARNING' },
    ];
    expect(celulaDaApuracao(apuracaoSimples('2026-01', { dasOficial: das, divergenciaCents: 50, alertas }))).toMatchObject({
      estado: 'registrado', bloqueante: true, divergente: true, warning: true, pendente: true,
    });
    // divergência zero não é divergente; INFO não acende o selo de alerta
    const info: AlertaSimples[] = [{ codigo: 'SEGREGACAO_MANUAL', detalhe: 'x', severity: 'INFO' }];
    expect(celulaDaApuracao(apuracaoMei('2026-01', { dasOficial: { ...das, provisaoPendente: false }, divergenciaCents: 0, alertas: info }))).toMatchObject({
      estado: 'registrado', divergente: false, warning: false, bloqueante: false,
    });
  });

  it('item 2: 400 = sem perfil, 422 SIMPLES_REGRA_NAO_REGULAMENTADA = não regulamentada, resto = erro (texto do BE)', () => {
    expect(celulaDoErro('2026-01', { status: 400, code: 'VALIDATION_ERROR', message: 'Cadastre o perfil fiscal de 2026…' }, 'fb'))
      .toMatchObject({ estado: 'semPerfil', mensagem: 'Cadastre o perfil fiscal de 2026…' });
    expect(celulaDoErro('2027-01', { status: 422, code: 'SIMPLES_REGRA_NAO_REGULAMENTADA', message: 'IBS/CBS sem regulamento' }, 'fb'))
      .toMatchObject({ estado: 'naoRegulamentada', mensagem: 'IBS/CBS sem regulamento' });
    expect(celulaDoErro('2026-01', { status: 422, code: 'OUTRO', message: 'm' }, 'fb')).toMatchObject({ estado: 'erro' });
    expect(celulaDoErro('2026-01', { status: 500 }, 'fb')).toMatchObject({ estado: 'erro', mensagem: 'fb' });
  });

  it('item 6: WARNING antes de INFO, mantendo a ordem do BE dentro da severidade; os 3 bloqueantes do BE', () => {
    const a: AlertaSimples[] = [
      { codigo: 'SEGREGACAO_MANUAL', detalhe: '1', severity: 'INFO' },
      { codigo: 'LIMITE_ME_EXCEDIDO', detalhe: '2', severity: 'WARNING' },
      { codigo: 'NFSE_DIVERGE_RECEITA', detalhe: '3', severity: 'INFO', motivoInformativo: 'REGIME_CAIXA' },
      { codigo: 'TIEOUT_DIVERGENTE', detalhe: '4', severity: 'WARNING' },
    ];
    expect(ordenarAlertas(a).map((x) => x.detalhe)).toEqual(['2', '4', '1', '3']);
    expect([...BLOQUEANTES].sort()).toEqual(['ATIVIDADE_SEM_ANEXO', 'RBT12_INCOMPLETO', 'TIEOUT_DIVERGENTE']);
  });

  it('F-FS-4 (a): milésimos com 3 casas, sem arredondar', () => {
    expect(formatMilesimos(0)).toBe('R$ 0,000');
    expect(formatMilesimos(5)).toBe('R$ 0,005');
    expect(formatMilesimos(1234)).toBe('R$ 1,234');
    expect(formatMilesimos(1234567)).toBe('R$ 1.234,567');
  });

  it('item 5: alíquota da CPP em pontos-base → %', () => {
    expect(formatBp(500)).toBe('5%');
    expect(formatBp(1200)).toBe('12%');
    expect(formatBp(1250)).toBe('12,5%');
  });
});
