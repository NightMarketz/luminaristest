/**
 * BE-INCR-DP-F2 itens 28 e 53 (PR-3) — forma canônica e hash do snapshot: chaves ordenadas, `bigint` em string, a ordem
 * de leitura das linhas não muda o hash (fast-check), e a forma serializada dos parâmetros volta sem perda (a
 * reprodução do item 53 relê o `snapshotJson`). Parâmetro ausente vira ausência nomeada, não exceção.
 */
import fc from 'fast-check';
import type { Competencia } from '../../competencia';
import { parametrosFolha } from '../../parametrosFolha';
import {
  DpSnapshotSchema,
  formaCanonica,
  lerOuAusente,
  parametrosDeJson,
  parametrosParaJson,
  regrasParaJson,
  sha256Canonico,
  snapshotSha256,
  type DpSnapshot,
  type VinculoSnapshot,
} from '../snapshot';
import { params, REAL, regras } from './fotografias';

function vinculo(id: string): VinculoSnapshot {
  return {
    vinculoId: id,
    trabalhadorId: `t-${id}`,
    unitId: 'u1',
    matricula: `M-${id}`,
    categoria: '101',
    dataInicio: '2025-01-01',
    dataTermino: null,
    idadeNaDataPagamento: 30,
    pcd: false,
    versoes: [
      { id: `${id}-x1`, vigenteDesde: '2025-01-01', vigenteAte: '2026-03-14', salarioCents: '300000', unidadeSalario: '5', jornada: null, cargoId: null, cargoNome: null, sindicatoId: null },
      { id: `${id}-x2`, vigenteDesde: '2026-03-15', vigenteAte: null, salarioCents: '320000', unidadeSalario: '5', jornada: null, cargoId: null, cargoNome: null, sindicatoId: null },
    ],
    cct: [
      { id: `${id}-c1`, sindicatoId: 's1', chave: 'PISO_SALARIAL_CENTS', discriminador: 'cargo1', valorInt: '180000', vigenteDesde: '2026-01-01', vigenteAte: null },
      { id: `${id}-c2`, sindicatoId: 's1', chave: 'PISO_SALARIAL_CENTS', discriminador: 'cargo2', valorInt: '190000', vigenteDesde: '2026-01-01', vigenteAte: null },
    ],
    afastamentos: [
      { id: `${id}-a1`, motivo: '03', inicio: '2026-03-02', fim: '2026-03-03' },
      { id: `${id}-a2`, motivo: '03', inicio: '2026-03-20', fim: null },
    ],
    lancamentos: [
      { id: `${id}-l1`, rubrica: 'HORA_EXTRA_50', quantidadeMin: 120, origem: 'MANUAL' },
      { id: `${id}-l2`, rubrica: 'COMISSAO', valorCents: '5000', origem: 'MANUAL' },
      { id: null, rubrica: 'ADICIONAL_NOTURNO', quantidadeMin: 60, origem: 'MODULO', data: '2026-03-05' },
    ],
    jornadaApurada: { origem: 'NULO', motivo: 'DP-PONTO desligado na competência 2026-03' },
    dependentes: { irrf: 1, salarioFamilia: [{ idade: 3, invalido: false }, { idade: 20, invalido: true }] },
    jaPagoNoMesDePagamento: { rendimentoCents: '0', irrfRetidoCents: '0' },
    outrasRemuneracoes: [
      { id: `${id}-o1`, remuneracaoCents: '200000', contribuicaoCents: '16000', ordem: 'ANTES', categoriaOutraFonte: 'EMPREGADO' },
      { id: `${id}-o2`, remuneracaoCents: '50000', contribuicaoCents: '5500', ordem: 'DEPOIS', categoriaOutraFonte: 'CONTRIBUINTE_INDIVIDUAL' },
    ],
  };
}

const snapshot = (vinculos: VinculoSnapshot[]): DpSnapshot =>
  DpSnapshotSchema.parse({
    versaoFormato: 1,
    competencia: '2026-03',
    roteiro: 'MENSAL',
    dataPagamento: '2026-04-06',
    parametros: {
      competencia: { ok: true, valor: parametrosParaJson(params(REAL, '2026-03-31')) },
      pagamento: { ok: true, valor: parametrosParaJson(params(REAL, '2026-04-06')) },
    },
    regras: { ok: true, valor: regrasParaJson(regras(REAL, '2026-03-31')) },
    feriados: { u1: ['2026-03-01', '2026-03-19'], u2: [] },
    modulosAtivos: ['DP-PONTO', 'DP-BEN'],
    vinculos,
  });

function embaralhar<T>(xs: readonly T[], semente: number): T[] {
  const out = [...xs];
  let s = semente;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) % 2147483648;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

describe('snapshot (itens 28 e 53)', () => {
  it('item 28 — forma canônica ordena as chaves, escreve bigint em decimal e omite undefined', () => {
    expect(formaCanonica({ b: 1n, a: { d: undefined, c: [2n, 'x'] } })).toBe('{"a":{"c":["2","x"]},"b":"1"}');
    expect(sha256Canonico({ x: 1, y: 2 })).toBe(sha256Canonico({ y: 2, x: 1 }));
  });

  it('item 28 — propriedade: permutar a ordem de leitura das linhas não muda o hash', () => {
    const base = snapshot([vinculo('v1'), vinculo('v2'), vinculo('v3')]);
    const h = snapshotSha256(base);
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 2 ** 30 }), (semente) => {
        const perm: DpSnapshot = {
          ...base,
          feriados: Object.fromEntries(embaralhar(Object.entries(base.feriados), semente).map(([u, ds]) => [u, embaralhar(ds, semente + 7)])),
          modulosAtivos: embaralhar(base.modulosAtivos, semente + 5),
          vinculos: embaralhar(base.vinculos, semente).map((v, i) => ({
            ...v,
            versoes: embaralhar(v.versoes, semente + i),
            cct: embaralhar(v.cct, semente + i + 4),
            outrasRemuneracoes: embaralhar(v.outrasRemuneracoes, semente + i + 5),
            afastamentos: embaralhar(v.afastamentos, semente + i + 1),
            lancamentos: embaralhar(v.lancamentos, semente + i + 2),
            dependentes: { ...v.dependentes, salarioFamilia: embaralhar(v.dependentes.salarioFamilia, semente + i + 3) },
          })),
        };
        expect(snapshotSha256(perm)).toBe(h);
      }),
      { numRuns: 100 },
    );
    // Uma inversão fixa de cada lista (o embaralhamento aleatório pode manter a ordem): o hash não muda.
    const rev = <T,>(xs: readonly T[]) => [...xs].reverse();
    const invertido: DpSnapshot = {
      ...base,
      feriados: { u2: [], u1: rev(base.feriados.u1) },
      modulosAtivos: rev(base.modulosAtivos),
      vinculos: rev(base.vinculos).map((v) => ({ ...v, cct: rev(v.cct), outrasRemuneracoes: rev(v.outrasRemuneracoes), versoes: rev(v.versoes), afastamentos: rev(v.afastamentos), lancamentos: rev(v.lancamentos) })),
    };
    expect(snapshotSha256(invertido)).toBe(h);
  });

  it('item 28 — mudar um valor muda o hash', () => {
    const a = snapshot([vinculo('v1')]);
    const b = snapshot([{ ...vinculo('v1'), lancamentos: [{ id: 'v1-l1', rubrica: 'HORA_EXTRA_50', quantidadeMin: 121, origem: 'MANUAL' }] }]);
    expect(snapshotSha256(a)).not.toBe(snapshotSha256(b));
  });

  it('item 53 — ida e volta pelo JSON: parse → serializa mantém o hash e os parâmetros voltam iguais', () => {
    const s = snapshot([vinculo('v1')]);
    const relido = DpSnapshotSchema.parse(JSON.parse(JSON.stringify(s)));
    expect(snapshotSha256(relido)).toBe(snapshotSha256(s));
    const p = params(REAL, '2026-04-06');
    expect(parametrosDeJson(parametrosParaJson(p))).toEqual(p);
  });

  it('item 27 — parâmetro sem linha na data vira ausência nomeada (tabela, chave, data); erro de outro tipo sobe', () => {
    const r = lerOuAusente(() => parametrosFolha(REAL.filter((l) => l.tabela !== 'SALARIO_MINIMO'), '2026-03-31'), parametrosParaJson);
    expect(r).toEqual({ ok: false, ausente: { tabela: 'SALARIO_MINIMO', chave: 'NACIONAL', data: '2026-03-31' } });
    expect(() => lerOuAusente(() => { throw new Error('bug'); }, (x) => x)).toThrow('bug');
  });

  it('o schema do contrato recusa campo fora do §3.2 (strict) e categoria fora do núcleo', () => {
    const s = snapshot([vinculo('v1')]);
    expect(() => DpSnapshotSchema.parse({ ...s, vinculos: [{ ...s.vinculos[0], nome: 'Ana' }] })).toThrow();
    expect(() => DpSnapshotSchema.parse({ ...s, vinculos: [{ ...s.vinculos[0], categoria: '701' }] })).toThrow();
    expect(s.competencia).toBe('2026-03' as Competencia);
  });
});
