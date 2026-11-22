/**
 * BE-INCR-DP-F2 itens 34–45 (PR-4) — o motor da folha: ordem de avaliação, pendências (uma falta por vez, A3), faltas
 * com DSR perdido (L1), comissionista (Súm. 340), aprendiz, piso do tempo parcial (F-DPF-6, dono 07/11), unidades de
 * salário (L3), determinismo (item 45) e o teste de desempenho informativo do F-DPF-12.
 */
import fc from 'fast-check';
import { DP_RUBRICAS } from '../../rubricas/catalogo';
import { provaIncoerente } from '../calcNode';
import { calcularFolha, ETAPAS, MOTOR_VERSAO, resultadoSha256, type ResultadoVinculo } from '../motor';
import { DP_PENDENCIA_CODIGOS } from '../pendencias';
import { REAL } from './fotografias';
import { SEG_SAB, SEG_SEX, snapshotDe, type EntradaVinculo, type EntradasCenario } from './cenarios';

const J44 = { diasTrabalho: SEG_SAB, minutosPorDia: 440 };
const MENSALISTA: EntradaVinculo = { id: 'v1', matricula: 'M-001', categoria: '101', dataInicio: '2025-01-02', salarioCents: '300000', unidadeSalario: '5', jornada: J44 };
const cen = (vinculos: EntradaVinculo[], extra: Partial<EntradasCenario> = {}): EntradasCenario => ({ competencia: '2026-03', dataPagamento: '2026-04-06', vinculos, ...extra });
const um = (v: EntradaVinculo, extra: Partial<EntradasCenario> = {}): ResultadoVinculo => calcularFolha(snapshotDe(cen([v], extra))).resultados[0];
const linha = (r: ResultadoVinculo, rubrica: string) => r.linhas.find((l) => l.rubrica === rubrica)?.valorCents;
const codigos = (r: ResultadoVinculo) => r.pendencias.map((p) => p.codigo);

describe('DP-F2 item 35 — ordem de avaliação fixa', () => {
  it('toda rubrica do catálogo tem um lugar, e um só, na lista de etapas', () => {
    const naOrdem = ETAPAS.flatMap((e) => e.rubricas as readonly string[]);
    expect([...naOrdem].sort()).toEqual(DP_RUBRICAS.map((r) => r.codigo).sort());
    expect(new Set(naOrdem).size).toBe(naOrdem.length);
    expect(ETAPAS.map((e) => e.etapa)).toEqual(['CONTRATUAL', 'INFORMADOS', 'AFASTAMENTO', 'DERIVADOS', 'BASES', 'INSS', 'IRRF', 'FGTS', 'DESCONTO_ADIANTAMENTO', 'TOTAIS']);
  });

  it('item 34 — o resultado traz linhas, bases, totais, prova coerente e a versão do motor', () => {
    const f = calcularFolha(snapshotDe(cen([MENSALISTA])));
    expect(f.motorVersao).toBe(MOTOR_VERSAO);
    const r = f.resultados[0];
    expect(r.linhas.map((l) => l.rubrica)).toEqual(['SALARIO_BASE', 'INSS_SEGURADO', 'FGTS_MES']);
    expect(r.totais.liquido).toBe(r.totais.proventos - r.totais.descontos);
    expect(provaIncoerente(r.prova)).toEqual([]);
    expect(r.prova.valorCents).toBe(r.totais.liquido);
  });
});

describe('DP-F2 item 44 — pendências, uma falta por vez (A3): dado visível, nunca cuid', () => {
  const unica = (r: ResultadoVinculo) => {
    expect(r.pendencias).toHaveLength(1);
    const p = r.pendencias[0];
    expect(p.dado).not.toMatch(/c[a-z0-9]{24}/); // cuid
    expect(p.mensagem).not.toMatch(/dp_|Dp[A-Z]/); // nome de tabela ou model
    return p;
  };

  it('SEM_VERSAO_NA_COMPETENCIA com a matrícula; o vínculo não tem linhas', () => {
    const r = um({ ...MENSALISTA, versoes: [{ vigenteDesde: '2026-03-20', salarioCents: '300000', unidadeSalario: '5', jornada: J44 }] });
    expect([unica(r).codigo, unica(r).dado, r.linhas]).toEqual(['SEM_VERSAO_NA_COMPETENCIA', 'M-001', []]);
  });

  it('PARAMETRO_LEGAL_AUSENTE com a tabela e a data (sem INSS_EMPREGADO vigente): uma pendência, mesmo faltando nas duas datas', () => {
    const foto = REAL.filter((l) => l.tabela !== 'INSS_EMPREGADO');
    const r = calcularFolha(snapshotDe(cen([MENSALISTA]), foto)).resultados[0];
    expect([unica(r).codigo, unica(r).dado, r.linhas]).toEqual(['PARAMETRO_LEGAL_AUSENTE', 'INSS_EMPREGADO em 2026-03-31', []]);
  });

  it('JORNADA_AUSENTE com a matrícula (101 sem jornada); 901 e 723 não pedem jornada', () => {
    expect(unica(um({ ...MENSALISTA, jornada: null })).codigo).toBe('JORNADA_AUSENTE');
    expect(um({ ...MENSALISTA, categoria: '901', jornada: null, salarioCents: '100000' }).pendencias).toEqual([]);
  });

  it('AFASTAMENTO_SEM_REGRA_NO_F2 com o código do motivo (F-DPF-5 a)', () => {
    const p = unica(um({ ...MENSALISTA, afastamentos: [{ motivo: '17', inicio: '2026-03-05', fim: '2026-03-08' }] }));
    expect([p.codigo, p.dado]).toEqual(['AFASTAMENTO_SEM_REGRA_NO_F2', '17']);
  });

  it('LIQUIDO_NEGATIVO (F-DPF-11): o desconto do adiantamento acima do salário trava o vínculo', () => {
    const r = um({ ...MENSALISTA, adiantamentoPagoCents: '400000' });
    expect([unica(r).codigo, r.linhas]).toEqual(['LIQUIDO_NEGATIVO', []]);
  });

  it('LANCAMENTO_DUPLICADO_COM_PONTO: manual de jornada com o DP-PONTO devolvendo itens (item 19)', () => {
    const r = um({
      ...MENSALISTA,
      jornadaApurada: { origem: 'MODULO' },
      lancamentos: [
        { rubrica: 'HORA_EXTRA_50', quantidadeMin: 60, id: 'c00000000000000000000000l1' },
        { rubrica: 'HORA_EXTRA_50', quantidadeMin: 90, origem: 'MODULO', data: '2026-03-10' },
      ],
    });
    expect([unica(r).codigo, unica(r).dado]).toEqual(['LANCAMENTO_DUPLICADO_COM_PONTO', 'HORA_EXTRA_50']);
  });

  it('SALARIO_FAMILIA_SEM_PARAMETRO é aviso (F-DPF-7 b): o vínculo calcula normalmente', () => {
    const r = um({ ...MENSALISTA, salarioFamilia: [{ idade: 5, invalido: false }] });
    expect([unica(r).codigo, unica(r).bloqueante, linha(r, 'SALARIO_BASE')]).toEqual(['SALARIO_FAMILIA_SEM_PARAMETRO', false, 300000n]);
    // Acima da idade da linha SALARIO_FAMILIA_IDADE_MAX e não inválido: sem aviso.
    expect(um({ ...MENSALISTA, salarioFamilia: [{ idade: 15, invalido: false }] }).pendencias).toEqual([]);
  });

  it('JORNADA_ACIMA_DO_LIMITE e REPOUSO_ABAIXO_DO_MINIMO pela linha vigente na competência', () => {
    expect(unica(um({ ...MENSALISTA, jornada: { diasTrabalho: SEG_SAB, minutosPorDia: 450 } })).codigo).toBe('JORNADA_ACIMA_DO_LIMITE');
    const p = unica(um({ ...MENSALISTA, jornada: { diasTrabalho: [...SEG_SAB, 'DOM'], minutosPorDia: 360 } }));
    expect([p.codigo, p.dado]).toEqual(['REPOUSO_ABAIXO_DO_MINIMO', 'M-001 (jornada 2520 min)']);
    // A mesma escala 6×1 de 44 h passa em 2026-03 e trava em 2026-12 (a virada da EC 141 é dado, não data no código).
    expect(um(MENSALISTA, { competencia: '2026-12', dataPagamento: '2026-12-30' }).pendencias.map((x) => x.codigo)).toEqual(['JORNADA_ACIMA_DO_LIMITE', 'REPOUSO_ABAIXO_DO_MINIMO']);
  });

  it('L3 — unidades 2/3/4/6 travam com UNIDADE_SALARIO_SEM_REGRA_NO_F2; 7 calcula com fixo zero', () => {
    for (const u of ['2', '3', '4', '6']) {
      const p = unica(um({ ...MENSALISTA, unidadeSalario: u }));
      expect([p.codigo, p.dado]).toEqual(['UNIDADE_SALARIO_SEM_REGRA_NO_F2', `M-001 (unidade ${u})`]);
    }
    const so = um({ ...MENSALISTA, unidadeSalario: '7', salarioCents: '0', lancamentos: [{ rubrica: 'COMISSAO', valorCents: '300000' }] });
    expect([so.pendencias, linha(so, 'SALARIO_BASE'), linha(so, 'COMISSAO')]).toEqual([[], undefined, 300000n]);
  });

  it('L2 — horista sem HORAS_NORMAIS trava; HORAS_NORMAIS no mensalista trava (nunca some em silêncio)', () => {
    expect(unica(um({ ...MENSALISTA, unidadeSalario: '1', salarioCents: '1500' })).codigo).toBe('HORAS_NORMAIS_INCOERENTES');
    expect(unica(um({ ...MENSALISTA, lancamentos: [{ rubrica: 'HORAS_NORMAIS', quantidadeMin: 600 }] })).codigo).toBe('HORAS_NORMAIS_INCOERENTES');
  });

  it('L1 — FALTAS sem a data (lançamento anterior à coluna) trava com FALTA_SEM_DATA', () => {
    expect(unica(um({ ...MENSALISTA, lancamentos: [{ rubrica: 'FALTAS', quantidadeMin: 440 }] })).codigo).toBe('FALTA_SEM_DATA');
  });

  it('item 41 — vínculo anterior do mesmo trabalhador com pendência trava o seguinte (OUTRO_VINCULO_PENDENTE)', () => {
    const a = { ...MENSALISTA, id: 'va', matricula: 'A-1', trabalhadorId: 't1', dataInicio: '2024-01-02', jornada: null };
    const b = { ...MENSALISTA, id: 'vb', matricula: 'B-1', trabalhadorId: 't1' };
    const [ra, rb] = calcularFolha(snapshotDe(cen([b, a]))).resultados;
    expect([codigos(ra), codigos(rb), rb.pendencias[0].dado]).toEqual([['JORNADA_AUSENTE'], ['OUTRO_VINCULO_PENDENTE'], 'A-1']);
  });

  it('a lista fechada tem 13 códigos (os 9 do §3.1, os 2 da cédula de 21/11 e as 2 leituras do PR-4)', () => {
    expect(DP_PENDENCIA_CODIGOS).toHaveLength(13);
  });

  it('PARAMETRO_LEGAL_AUSENTE do IRRF (tabela da data de pagamento ausente) nasce depois do cálculo e tira as linhas', () => {
    const s = snapshotDe(cen([{ ...MENSALISTA, salarioCents: '800000' }]));
    const r = calcularFolha({ ...s, parametros: { ...s.parametros, irrfPagamento: s.parametros.irrfPagamento.filter((l) => l.tabela !== 'IRRF_PF_MENSAL') } }).resultados[0];
    expect([r.pendencias.map((p) => [p.codigo, p.dado]), r.linhas]).toEqual([[['PARAMETRO_LEGAL_AUSENTE', 'IRRF_PF_MENSAL em 2026-04-06']], []]);
  });

  it('A2 (revisor do #1326): o pagamento anterior do mês e a outra remuneração ANTES do vínculo A contam para o B', () => {
    const a = { ...MENSALISTA, id: 'va', matricula: 'A-1', trabalhadorId: 't1', dataInicio: '2024-01-02', salarioCents: '600000' };
    const b = { ...MENSALISTA, id: 'vb', matricula: 'B-1', trabalhadorId: 't1', salarioCents: '400000' };
    const jaPago = { rendimentoCents: '500000', irrfRetidoCents: '50000' };
    const irrf = (vs: EntradaVinculo[]) => calcularFolha(snapshotDe(cen(vs))).resultados.reduce((s, x) => s + (linha(x, 'IRRF') ?? 0n), 0n);
    // O IRRF somado do mês não depende do vínculo que carrega o pagamento anterior (Lei 7.713 art. 7º § 1º).
    expect(irrf([{ ...a, jaPago }, b])).toBe(irrf([a, { ...b, jaPago }]));
    // Outra remuneração ANTES de 3.000 registrada só em A: A + B não passam do INSS do teto (988,07).
    const outra = [{ id: 'o1', remuneracaoCents: '300000', contribuicaoCents: '0', ordem: 'ANTES', categoriaOutraFonte: 'EMPREGADO' }];
    const rs = calcularFolha(snapshotDe(cen([{ ...a, outrasRemuneracoes: outra }, b]))).resultados;
    expect(rs.reduce((s, x) => s + (linha(x, 'INSS_SEGURADO') ?? 0n), 0n)).toBeLessThanOrEqual(98807n);
    expect(linha(rs.find((x) => x.vinculoId === 'vb')!, 'INSS_SEGURADO')).toBeUndefined();
  });
});

describe('DP-F2 item 36 — faltas e DSR perdido na semana da falta (L1)', () => {
  it('falta de um dia (440 min) numa quarta: desconta o dia e o domingo da semana (Lei 605 art. 6º)', () => {
    const r = um({ ...MENSALISTA, lancamentos: [{ rubrica: 'FALTAS', quantidadeMin: 440, data: '2026-03-11' }] });
    // Salário-hora 3.000/220; 440 min = 100,00. Semana de 09/03 (segunda) a 15/03: 1 domingo; 3.000/30 = 100,00.
    expect([linha(r, 'FALTAS'), linha(r, 'DSR_PERDIDO'), r.bases.cp]).toEqual([10000n, 10000n, 280000n]);
  });

  it('a linha SEMANA_SEIS_DIAS × escala muda o salário-hora da falta sem código (item 3)', () => {
    const r = um({ ...MENSALISTA, jornada: { diasTrabalho: SEG_SEX, minutosPorDia: 480 }, lancamentos: [{ rubrica: 'FALTAS', quantidadeMin: 480, data: '2026-03-11' }] });
    // 40 h: divisor 200 h na forma de seis dias; 480 min × 15,00 = 120,00. Semana de 09 a 15/03: sábado e domingo.
    expect([linha(r, 'FALTAS'), linha(r, 'DSR_PERDIDO')]).toEqual([12000n, 20000n]);
  });
});

describe('DP-F2 itens 38, 39 e F-DPF-6 — comissionista, aprendiz e piso', () => {
  it('Súm. 340: HE do comissionista só com o adicional sobre o valor-hora da comissão', () => {
    const r = um({ ...MENSALISTA, unidadeSalario: '7', salarioCents: '0', lancamentos: [{ rubrica: 'COMISSAO', valorCents: '120000' }, { rubrica: 'HORA_EXTRA_50', quantidadeMin: 600 }] });
    // Horas trabalhadas: 26 × 440 + 600 = 12.040 min; hora da comissão = 1.200 × 60/12.040; 10 h × hora × 1,5 = 89,70
    // menos 10 h × hora = 59,80 ⇒ 29,90 (o normal da hora já está pago na comissão).
    expect(linha(r, 'HORA_EXTRA_50')).toBe(2990n);
  });

  it('item 39: aprendiz com salário abaixo do mínimo-hora × horas recebe o complemento', () => {
    const r = um({ ...MENSALISTA, categoria: '103', salarioCents: '70000', jornada: { diasTrabalho: SEG_SEX, minutosPorDia: 240 } });
    expect(linha(r, 'COMPLEMENTO_MINIMO')).toBe(3682n); // 736,82 − 700,00
  });

  it('F-DPF-6 (a): piso da CCT proporcional só com tempoParcial na jornada', () => {
    const cct = [{ id: 'p1', sindicatoId: 's1', chave: 'PISO_SALARIAL_CENTS', discriminador: 'c1', valorInt: '200000', vigenteDesde: '2026-01-01', vigenteAte: null }];
    const base = (tempoParcial: boolean): EntradaVinculo => ({
      ...MENSALISTA,
      versoes: [{ vigenteDesde: '2025-01-02', salarioCents: '120000', unidadeSalario: '5', jornada: { diasTrabalho: SEG_SAB, minutosPorDia: 300, tempoParcial }, cargoId: 'c1', sindicatoId: 's1' }],
      cct,
    });
    // Tempo parcial: piso 2.000,00 × 1.800/2.640 = 1.363,64 e mínimo 1.105,23 (abaixo do salário) ⇒ só o complemento do
    // piso, 163,64. Sem tempo parcial: mínimo integral (complemento 421,00) e depois o piso integral (379,00).
    expect([linha(um(base(true)), 'COMPLEMENTO_MINIMO'), linha(um(base(true)), 'COMPLEMENTO_PISO')]).toEqual([undefined, 16364n]);
    expect([linha(um(base(false)), 'COMPLEMENTO_MINIMO'), linha(um(base(false)), 'COMPLEMENTO_PISO')]).toEqual([42100n, 37900n]);
  });

  it('item 42: o roteiro ADIANTAMENTO sem o percentual da instância é erro de programação (o serviço responde 400 antes)', () => {
    expect(() => calcularFolha(snapshotDe(cen([MENSALISTA], { roteiro: 'ADIANTAMENTO', dataPagamento: '2026-03-20' })))).toThrow(/DP_ADIANTAMENTO_SEM_PARAMETRO/);
  });
});

describe('DP-F2 item 45 — determinismo', () => {
  const vinculos: EntradaVinculo[] = [
    MENSALISTA,
    { ...MENSALISTA, id: 'v2', matricula: 'M-002', trabalhadorId: 't-v1', dataInicio: '2025-06-02', salarioCents: '450000' },
    { ...MENSALISTA, id: 'v3', matricula: 'H-003', unidadeSalario: '1', salarioCents: '1800', lancamentos: [{ rubrica: 'HORAS_NORMAIS', quantidadeMin: 9000 }, { rubrica: 'HORA_EXTRA_50', quantidadeMin: 120 }] },
    { ...MENSALISTA, id: 'v4', matricula: 'P-004', categoria: '723', jornada: null, salarioCents: '900000' },
  ];
  const ida = snapshotDe(cen(vinculos.map((v) => (v.id === 'v1' ? { ...v, trabalhadorId: 't-v1' } : v))));

  it('o mesmo snapshot dá o mesmo resultadoSha256; a ordem dos vínculos no snapshot não muda nenhum resultado', () => {
    const esperado = calcularFolha(ida);
    fc.assert(
      fc.property(fc.shuffledSubarray(ida.vinculos, { minLength: ida.vinculos.length }), (perm) => {
        const r = calcularFolha({ ...ida, vinculos: perm });
        expect(r.resultadoSha256).toBe(esperado.resultadoSha256);
        expect(r.resultados).toEqual(esperado.resultados);
      }),
      { numRuns: 30 },
    );
  });

  it('o hash cobre linhas, bases, totais e pendências (mudar um centavo muda o hash; a prova fica fora)', () => {
    const r = calcularFolha(ida).resultados;
    const h = resultadoSha256(r);
    const mexido = r.map((x, i) => (i === 0 ? { ...x, totais: { ...x.totais, liquido: x.totais.liquido + 1n } } : x));
    expect(resultadoSha256(mexido)).not.toBe(h);
    expect(resultadoSha256(r.map((x) => ({ ...x, prova: { ...x.prova, rotulo: 'outro' } })))).toBe(h);
  });
});

describe('F-DPF-12 — desempenho informativo (1.000 vínculos sintéticos)', () => {
  it('calcula 1.000 vínculos dentro da meta da spec (60 s); acima de 30 s vira fork no BRIEF do F5', () => {
    const muitos: EntradaVinculo[] = Array.from({ length: 1000 }, (_, i) => ({
      ...MENSALISTA,
      id: `s${String(i).padStart(4, '0')}`,
      matricula: `S-${i}`,
      salarioCents: String(200000 + i * 137),
      lancamentos: i % 3 === 0 ? [{ rubrica: 'HORA_EXTRA_50', quantidadeMin: 60 + (i % 7) * 30 }, { rubrica: 'FALTAS', quantidadeMin: 440, data: '2026-03-18' }] : [],
    }));
    const snap = snapshotDe(cen(muitos));
    const t0 = process.hrtime.bigint();
    const r = calcularFolha(snap);
    const ms = Number((process.hrtime.bigint() - t0) / 1_000_000n);
    expect(r.resultados).toHaveLength(1000);
    expect(r.resultados.every((x) => x.pendencias.length === 0)).toBe(true);
    expect(ms).toBeLessThan(60_000);
  });
});
