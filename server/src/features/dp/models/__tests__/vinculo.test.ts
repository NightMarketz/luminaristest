/**
 * BE-INCR-DP-F0-F1 itens 39–45 e 47 (PR-4) — domínio `undSalFixo` conferido contra o leiaute do dossiê [D09], natureza
 * pelo evento, idade e prazo do aprendiz (bordas), idade mínima do 101, hash da correção e `vinculoNaData`.
 */
import fs from 'fs';
import path from 'path';
import type { AppError } from '../../../../lib/errors';
import { VigenciaSobrepostaError } from '../vigencia';
import {
  assertIdadeEPrazo,
  camposAlterados,
  CATEGORIAS_NUCLEO,
  hashCampos,
  idadeEm,
  naturezaDoEvento,
  UND_SAL_FIXO,
  vespera,
  vinculoNaData,
  type DadosIdade,
} from '../vinculo';

const D09 = path.resolve(__dirname, '../../../../../../pesquisas-legais/brief-pes4-f0-f1/docs/D09_index-html.html');

function reason(fn: () => void): string | null {
  try {
    fn();
    return null;
  } catch (e) {
    return (e as AppError).errorCode;
  }
}

// Nascido em 2010-05-10: 14 anos em 2024-05-10; 24 em 2034-05-10.
const aprendiz = (o: Partial<DadosIdade>): DadosIdade => ({
  categoria: '103',
  nascimento: '2010-05-10',
  pcd: false,
  dataInicio: '2024-05-10',
  dataTermino: '2026-05-09',
  ...o,
});

describe('vínculo do DP (itens 39–45, 47)', () => {
  it('item 43 — UND_SAL_FIXO = itens do campo undSalFixo do S-2200 no leiaute [D09]', () => {
    const html = fs.readFileSync(D09, 'utf8');
    const i = html.indexOf('id="2200_vinculo_infoContrato_remuneracao_undSalFixo"');
    expect(i).toBeGreaterThan(0);
    const celula = html.slice(i, html.indexOf('</tr>', i));
    const itens = [...celula.matchAll(/<strong>(\d+)<\/strong>\s*-\s*([^<]+)/g)].map((m) => [m[1], m[2].replace(/\s+/g, ' ').trim()]);
    expect(Object.fromEntries(itens)).toEqual(UND_SAL_FIXO);
  });

  it('item 40 — núcleo = 101, 103, 901, 723 (F-DPB-1)', () => {
    expect(CATEGORIAS_NUCLEO).toEqual(['101', '103', '901', '723']);
  });

  it('item 39 — natureza: S-2200 ⇒ EMPREGO; S-2300 ⇒ TSVE; sem evento ⇒ null', () => {
    expect([naturezaDoEvento('S-2200'), naturezaDoEvento('S-2300'), naturezaDoEvento(null)]).toEqual(['EMPREGO', 'TSVE', null]);
  });

  it('idadeEm conta o aniversário no próprio dia; véspera atravessa mês e ano', () => {
    expect([idadeEm('2010-05-10', '2024-05-09'), idadeEm('2010-05-10', '2024-05-10')]).toEqual([13, 14]);
    expect([vespera('2026-03-01'), vespera('2026-01-01')]).toEqual(['2026-02-28', '2025-12-31']);
  });

  it('item 41 — aprendiz: 14º aniversário no dia da admissão ⇒ aceito; véspera ⇒ DP_APRENDIZ_IDADE', () => {
    expect(reason(() => assertIdadeEPrazo(aprendiz({})))).toBeNull();
    expect(reason(() => assertIdadeEPrazo(aprendiz({ dataInicio: '2024-05-09', dataTermino: '2025-05-08' })))).toBe('DP_APRENDIZ_IDADE');
  });

  it('item 41 — aprendiz sem pcd: 24 anos na admissão ⇒ DP_APRENDIZ_IDADE; com pcd ⇒ aceito', () => {
    const velho = { dataInicio: '2034-05-10', dataTermino: '2035-05-09' };
    expect(reason(() => assertIdadeEPrazo(aprendiz(velho)))).toBe('DP_APRENDIZ_IDADE');
    expect(reason(() => assertIdadeEPrazo(aprendiz({ ...velho, pcd: true })))).toBeNull();
  });

  it('item 41 — termo: obrigatório; no 24º aniversário ⇒ 400; até início + 2 anos − 1 dia; pcd dispensa o prazo', () => {
    expect(reason(() => assertIdadeEPrazo(aprendiz({ dataTermino: null })))).toBe('DP_APRENDIZ_PRAZO');
    expect(reason(() => assertIdadeEPrazo(aprendiz({ dataTermino: '2026-05-10' })))).toBe('DP_APRENDIZ_PRAZO');
    // Admissão aos 23: termo na véspera do 24º aniversário ⇒ aceito; no dia ⇒ 400.
    const aos23 = { dataInicio: '2033-06-01' };
    expect(reason(() => assertIdadeEPrazo(aprendiz({ ...aos23, dataTermino: '2034-05-09' })))).toBeNull();
    expect(reason(() => assertIdadeEPrazo(aprendiz({ ...aos23, dataTermino: '2034-05-10' })))).toBe('DP_APRENDIZ_PRAZO');
    expect(reason(() => assertIdadeEPrazo(aprendiz({ ...aos23, dataTermino: '2034-05-10', pcd: true })))).toBeNull();
    expect(reason(() => assertIdadeEPrazo(aprendiz({ dataTermino: '2027-05-09', pcd: true })))).toBeNull();
  });

  it('item 42 — 101 com menos de 16 anos ⇒ DP_IDADE_MINIMA; no 16º aniversário ⇒ aceito; 901 e 723 sem regra de idade', () => {
    const geral = { categoria: '101' as const, nascimento: '2010-05-10', pcd: false, dataTermino: null };
    expect(reason(() => assertIdadeEPrazo({ ...geral, dataInicio: '2026-05-09' }))).toBe('DP_IDADE_MINIMA');
    expect(reason(() => assertIdadeEPrazo({ ...geral, dataInicio: '2026-05-10' }))).toBeNull();
    expect(reason(() => assertIdadeEPrazo({ ...geral, categoria: '901', dataInicio: '2026-05-09' }))).toBeNull();
  });

  it('item 45 — hash dos campos alterados: muda com o valor, não revela o valor, ignora campo não alterado', () => {
    const antes = { salarioCents: 300000n, cargoId: 'c1', unidadeSalario: '5' };
    const depois = { salarioCents: 350000n, cargoId: 'c1', unidadeSalario: '5' };
    expect(camposAlterados(antes, { salarioCents: 350000n, cargoId: 'c1' })).toEqual(['salarioCents']);
    const h1 = hashCampos(antes, ['salarioCents']);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
    expect(hashCampos(depois, ['salarioCents'])).not.toBe(h1);
    expect(hashCampos({ ...antes, cargoId: 'outro' }, ['salarioCents'])).toBe(h1);
    expect(h1).not.toContain('300000');
  });

  it('item 47 — vinculoNaData: versão vigente com cadastros resolvidos; antes do início ⇒ null; sobreposta ⇒ erro', () => {
    const ver = (id: string, vigenteDesde: string, vigenteAte: string | null) => ({
      id,
      vigenteDesde,
      vigenteAte,
      lotacao: { id: `lot-${id}` },
      cargo: { id: `car-${id}` },
      jornada: null,
      sindicato: null,
    });
    const vinculo = { id: 'v1', matricula: 'M1', versoes: [ver('a', '2026-01-01', '2026-05-31'), ver('b', '2026-06-01', null)] };
    expect(vinculoNaData(vinculo, '2025-12-31')).toBeNull();
    const r = vinculoNaData(vinculo, '2026-05-31');
    expect(r).toMatchObject({ vinculo: { id: 'v1', matricula: 'M1' }, versao: { id: 'a' }, lotacao: { id: 'lot-a' }, cargo: { id: 'car-a' }, jornada: null });
    expect(r?.vinculo).not.toHaveProperty('versoes');
    expect(r?.versao).not.toHaveProperty('lotacao');
    expect(vinculoNaData(vinculo, '2026-06-01')?.versao.id).toBe('b');
    const sobreposto = { ...vinculo, versoes: [ver('a', '2026-01-01', null), ver('b', '2026-06-01', null)] };
    expect(() => vinculoNaData(sobreposto, '2026-07-01')).toThrow(VigenciaSobrepostaError);
  });
});
