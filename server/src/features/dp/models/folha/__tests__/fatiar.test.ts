/**
 * BE-INCR-DP-F2 itens 30–32 (PR-3) — fatiamento puro do mês do vínculo: cortes nas versões, no vínculo e nos
 * afastamentos; o afastamento por doença não do trabalho paga os primeiros dias pela empresa atravessando competências
 * (Lei 8.213 art. 60 § 3º); outro motivo fica sem regra; dias remunerados na base do mensalista (F-DPF-4 a).
 */
import fc from 'fast-check';
import type { Competencia } from '../../competencia';
import { diasDevidosMensalista } from '../salario';
import { fatiar, periodoNoMes, type Fatia } from '../fatiar';
import type { VinculoSnapshot } from '../snapshot';
import { alterada, REAL, regras } from './fotografias';

const C = (c: string) => c as Competencia;
const R = regras(REAL, '2026-03-31');

function versao(id: string, vigenteDesde: string, vigenteAte: string | null, unidadeSalario = '5'): VinculoSnapshot['versoes'][number] {
  return { id, vigenteDesde, vigenteAte, salarioCents: '300000', unidadeSalario, jornada: null, cargoId: null, cargoNome: null, sindicatoId: null };
}

function vinculo(extra: Partial<VinculoSnapshot> = {}): VinculoSnapshot {
  return {
    vinculoId: 'v1',
    trabalhadorId: 't1',
    unitId: 'u1',
    matricula: 'M1',
    categoria: '101',
    dataInicio: '2025-01-01',
    dataTermino: null,
    idadeNaDataPagamento: 30,
    pcd: false,
    versoes: [versao('x1', '2025-01-01', null)],
    cct: [],
    afastamentos: [],
    lancamentos: [],
    jornadaApurada: { origem: 'NULO' },
    dependentes: { irrf: 0, salarioFamilia: [] },
    jaPagoNoMesDePagamento: { rendimentoCents: '0', irrfRetidoCents: '0' },
    outrasRemuneracoes: [],
    ...extra,
  };
}

const resumo = (fs: Fatia[]) => fs.map((f) => [f.inicio, f.fim, f.versao?.id ?? null, f.afastamento?.pagoPor ?? null, f.diasRemunerados]);

describe('fatiar (itens 30–32)', () => {
  it('mês cheio sem mudança: uma fatia de 31 dias e 30 dias remunerados', () => {
    expect(resumo(fatiar(vinculo(), C('2026-03'), R))).toEqual([['2026-03-01', '2026-03-31', 'x1', null, 30]]);
  });

  it('item 30 — corta na troca de versão; o dia 31 não soma além da base (fatia de 31/03 = 0 dia)', () => {
    const v = vinculo({ versoes: [versao('x1', '2025-01-01', '2026-03-14'), versao('x2', '2026-03-15', '2026-03-30'), versao('x3', '2026-03-31', null)] });
    expect(resumo(fatiar(v, C('2026-03'), R))).toEqual([
      ['2026-03-01', '2026-03-14', 'x1', null, 14],
      ['2026-03-15', '2026-03-30', 'x2', null, 16],
      ['2026-03-31', '2026-03-31', 'x3', null, 0],
    ]);
  });

  it('item 31 / F-DPF-4 — admissão em 15/03 recebe 16 dias; término em 10/02 recebe 10', () => {
    expect(resumo(fatiar(vinculo({ dataInicio: '2026-03-15', versoes: [versao('x1', '2026-03-15', null)] }), C('2026-03'), R))).toEqual([
      ['2026-03-15', '2026-03-31', 'x1', null, 16],
    ]);
    expect(resumo(fatiar(vinculo({ dataTermino: '2026-02-10' }), C('2026-02'), R))).toEqual([['2026-02-01', '2026-02-10', 'x1', null, 10]]);
    expect(fatiar(vinculo({ dataTermino: '2026-02-10' }), C('2026-03'), R)).toEqual([]);
  });

  it('item 32 — doença (03) de 10/03 a 20/04: 15 dias pela empresa atravessando o mês, o resto pela previdência', () => {
    const v = vinculo({ afastamentos: [{ id: 'a1', motivo: '03', inicio: '2026-03-10', fim: '2026-04-20' }] });
    expect(resumo(fatiar(v, C('2026-03'), R))).toEqual([
      ['2026-03-01', '2026-03-09', 'x1', null, 9],
      ['2026-03-10', '2026-03-24', 'x1', 'EMPRESA', 15],
      ['2026-03-25', '2026-03-31', 'x1', 'PREVIDENCIA', 0],
    ]);
    expect(resumo(fatiar(v, C('2026-04'), R))).toEqual([
      ['2026-04-01', '2026-04-20', 'x1', 'PREVIDENCIA', 0],
      ['2026-04-21', '2026-04-30', 'x1', null, 10],
    ]);
  });

  it('item 32 — doença começando em 25/03: os dias da empresa seguem em abril (1º a 8)', () => {
    const v = vinculo({ afastamentos: [{ id: 'a1', motivo: '03', inicio: '2026-03-25', fim: null }] });
    expect(resumo(fatiar(v, C('2026-04'), R))).toEqual([
      ['2026-04-01', '2026-04-08', 'x1', 'EMPRESA', 8],
      ['2026-04-09', '2026-04-30', 'x1', 'PREVIDENCIA', 0],
    ]);
  });

  it('item 32 — outro motivo da Tabela 18 fica SEM_REGRA e sem dias remunerados (o motor trava)', () => {
    const v = vinculo({ afastamentos: [{ id: 'a1', motivo: '01', inicio: '2026-03-10', fim: '2026-03-12' }] });
    expect(resumo(fatiar(v, C('2026-03'), R))).toEqual([
      ['2026-03-01', '2026-03-09', 'x1', null, 9],
      ['2026-03-10', '2026-03-12', 'x1', 'SEM_REGRA', null],
      ['2026-03-13', '2026-03-31', 'x1', null, 18],
    ]);
  });

  it('§0.1 — o número de dias pagos pela empresa vem da linha: com 10, a previdência começa no 11º dia', () => {
    const r10 = regras(alterada({ AFASTAMENTO_DIAS_EMPRESA: 10 }), '2026-03-31');
    const v = vinculo({ afastamentos: [{ id: 'a1', motivo: '03', inicio: '2026-03-10', fim: null }] });
    expect(resumo(fatiar(v, C('2026-03'), r10)).map((f) => f.slice(0, 2).concat(f[3]))).toEqual([
      ['2026-03-01', '2026-03-09', null],
      ['2026-03-10', '2026-03-19', 'EMPRESA'],
      ['2026-03-20', '2026-03-31', 'PREVIDENCIA'],
    ]);
  });

  it('item 31 — horista e unidades sem regra no F2 não têm dias remunerados; sem versão, a fatia fica sem versão', () => {
    expect(fatiar(vinculo({ versoes: [versao('x1', '2025-01-01', null, '1')] }), C('2026-03'), R)[0].diasRemunerados).toBeNull();
    const buraco = fatiar(vinculo({ versoes: [versao('x1', '2025-01-01', '2026-03-10')] }), C('2026-03'), R);
    expect(resumo(buraco)).toEqual([
      ['2026-03-01', '2026-03-10', 'x1', null, 10],
      ['2026-03-11', '2026-03-31', null, null, null],
    ]);
  });

  // ── Propriedade do item 30 ───────────────────────────────────────────────────────────────────────────────────────
  const dia = (mes: string, d: number) => `${mes}-${String(d).padStart(2, '0')}`;
  const arbCaso = fc
    .record({
      mes: fc.constantFrom('2026-02', '2026-03', '2026-04', '2028-02'),
      inicio: fc.integer({ min: -5, max: 31 }),
      termino: fc.option(fc.integer({ min: 1, max: 35 }), { nil: null }),
      trocas: fc.uniqueArray(fc.integer({ min: 2, max: 28 }), { maxLength: 3 }),
      afast: fc.option(fc.record({ ini: fc.integer({ min: 1, max: 28 }), dur: fc.integer({ min: 1, max: 40 }), motivo: fc.constantFrom('03', '01') }), { nil: null }),
    })
    .map(({ mes, inicio, termino, trocas, afast }) => {
      const ultimo = new Date(Date.UTC(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)), 0)).getUTCDate();
      const dataInicio = inicio < 1 ? '2025-06-01' : dia(mes, Math.min(inicio, ultimo));
      const dataTermino = termino === null ? null : termino > ultimo ? '2027-01-01' : dia(mes, termino);
      const cortes = trocas.sort((a, b) => a - b).filter((t) => dia(mes, t) > dataInicio);
      const desdes = [dataInicio, ...cortes.map((t) => dia(mes, t))];
      const versoes = desdes.map((d, i) => versao(`x${i}`, d, i + 1 < desdes.length ? dia(mes, cortes[i] - 1) : null));
      const afastamentos = afast
        ? [{ id: 'a1', motivo: afast.motivo, inicio: [dia(mes, afast.ini), dataInicio].sort()[1], fim: dia(mes, Math.min(afast.ini + afast.dur, ultimo)) }]
        : [];
      return { comp: C(mes), v: vinculo({ dataInicio, dataTermino: dataTermino && dataTermino < dataInicio ? null : dataTermino, versoes, afastamentos }) };
    });

  it('propriedade — as fatias cobrem o período sem buraco nem sobreposição; a soma dos dias comerciais telescopa', () => {
    fc.assert(
      fc.property(arbCaso, ({ comp, v }) => {
        const fs = fatiar(v, comp, R);
        const p = periodoNoMes(v, comp);
        if (p === null) return fs.length === 0;
        expect(fs[0].inicio).toBe(p.inicio);
        expect(fs[fs.length - 1].fim).toBe(p.fim);
        for (let i = 1; i < fs.length; i++) {
          const fimAnterior = new Date(`${fs[i - 1].fim}T00:00:00Z`);
          fimAnterior.setUTCDate(fimAnterior.getUTCDate() + 1);
          expect(fs[i].inicio).toBe(fimAnterior.toISOString().slice(0, 10));
        }
        const total = (Date.parse(`${p.fim}T00:00:00Z`) - Date.parse(`${p.inicio}T00:00:00Z`)) / 86400000 + 1;
        expect(fs.reduce((s, f) => s + f.dias, 0)).toBe(total);
        if (v.afastamentos.length === 0) {
          expect(fs.reduce((s, f) => s + (f.diasRemunerados ?? 0), 0)).toBe(diasDevidosMensalista(comp, v.dataInicio, v.dataTermino, R.mensalistaBaseDias));
        }
        return true;
      }),
      { numRuns: 300 },
    );
  });
});
