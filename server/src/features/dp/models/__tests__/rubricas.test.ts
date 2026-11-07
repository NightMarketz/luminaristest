/**
 * BE-INCR-DP-F0-F1 itens 50–53 (PR-5) — catálogo de rubricas: schema `.strict()`, consistência com as cargas reais do
 * PR-2 (`legal_parameters_dp_v1.sql`) e congelamento das publicadas por SHA-256.
 */
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';
import { LEGAL_PARAMS_SEED_FILE_DP, legalParamsSeedRows } from '@test/helpers/legalParams';
import { linhaLegalVigente } from '../../../legalParameters/models/legalParameter';
import { CATEGORIAS_NUCLEO } from '../vinculo';
import { DP_RUBRICAS, DP_RUBRICAS_VALIDADAS, RUBRICAS_CONFERIDAS_PELO_CONTADOR, rubricaDefSchema } from '../rubricas/catalogo';

const LINHAS = legalParamsSeedRows(LEGAL_PARAMS_SEED_FILE_DP);
/** As tabelas do eSocial são dado de teste e de golden a partir de 2026 (PRE-ADR §4); o catálogo se confere ali. */
const DATA = '2026-01-01';

/** JSON canônico (chaves ordenadas em todo nível), como no `published.json` dos kits (BE-INCR-KIT-SETOR item 5). */
function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    return `{${Object.keys(obj)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}
const enquadramento = (r: { codigo: string; natureza: string; incidencia: object; nome?: unknown }) => ({ codigo: r.codigo, natureza: r.natureza, incidencia: r.incidencia });
const sha256 = (v: unknown) => createHash('sha256').update(canonicalJson(v)).digest('hex');

describe('DP-F0-F1 PR-5 — catálogo de rubricas', () => {
  it('item 50 — o catálogo passa pelo schema strict; campo extra ou família desconhecida reprova', () => {
    expect(DP_RUBRICAS_VALIDADAS).toEqual(DP_RUBRICAS);
    const base = DP_RUBRICAS[0];
    expect(rubricaDefSchema.safeParse({ ...base, formula: 'salario * 1' }).success).toBe(false);
    expect(rubricaDefSchema.safeParse({ ...base, calculo: 'FORMULA' }).success).toBe(false);
    expect(rubricaDefSchema.safeParse({ ...base, categorias: ['701'] }).success).toBe(false);
    expect(rubricaDefSchema.safeParse({ ...base, incidencia: { ...base.incidencia, pis: '00' } }).success).toBe(false);
  });

  it('item 51 — as 6 rubricas do F1 e as 5 INFORMADO do F2 PR-1, marcadas como não conferidas pelo contador', () => {
    expect(DP_RUBRICAS.map((r) => [r.codigo, r.tipo])).toEqual([
      ['SALARIO_BASE', 'PROVENTO'],
      ['BOLSA_ESTAGIO', 'PROVENTO'],
      ['PRO_LABORE', 'PROVENTO'],
      ['INSS_SEGURADO', 'DESCONTO'],
      ['IRRF', 'DESCONTO'],
      ['FGTS_MES', 'INFORMATIVA'],
      // BE-INCR-DP-F2 PR-1 (do item 23; dono, 07/11: "PR-1 já com INFORMADO") — as rubricas que o lançamento informa.
      ['HORA_EXTRA_50', 'PROVENTO'],
      ['HORA_EXTRA_100', 'PROVENTO'],
      ['ADICIONAL_NOTURNO', 'PROVENTO'],
      ['COMISSAO', 'PROVENTO'],
      ['FALTAS', 'DESCONTO'],
    ]);
    const cat = Object.fromEntries(DP_RUBRICAS.map((r) => [r.codigo, r.categorias]));
    expect([cat.SALARIO_BASE, cat.BOLSA_ESTAGIO, cat.PRO_LABORE]).toEqual([['101', '103'], ['901'], ['723']]);
    // CLT art. 432 [D02 do brief-pes4-f2]: aprendiz sem prorrogação de jornada ⇒ HE só para o 101.
    expect([cat.HORA_EXTRA_50, cat.HORA_EXTRA_100, cat.ADICIONAL_NOTURNO, cat.COMISSAO, cat.FALTAS]).toEqual([['101'], ['101'], ['101', '103'], ['101', '103'], ['101', '103']]);
    expect(DP_RUBRICAS.filter((r) => r.calculo === 'INFORMADO').map((r) => r.codigo)).toEqual(['HORA_EXTRA_50', 'HORA_EXTRA_100', 'ADICIONAL_NOTURNO', 'COMISSAO', 'FALTAS']);
    expect(RUBRICAS_CONFERIDAS_PELO_CONTADOR).toBe(false);
  });

  it('item 52 — natureza e incidências existem e estão vigentes na tabela certa (cargas reais)', () => {
    const faltando: string[] = [];
    for (const r of DP_RUBRICAS) {
      if (!linhaLegalVigente(LINHAS, 'ESOCIAL_NATUREZA_RUBRICA', r.natureza, DATA)) faltando.push(`${r.codigo}/natureza ${r.natureza}`);
      for (const [campo, disc] of [['cp', 'CP'], ['irrf', 'IRRF'], ['fgts', 'FGTS']] as const) {
        const cod = r.incidencia[campo];
        if (!linhaLegalVigente(LINHAS, 'ESOCIAL_INCIDENCIA_RUBRICA', cod, DATA, disc)) faltando.push(`${r.codigo}/${disc} ${cod}`);
      }
    }
    expect(faltando).toEqual([]);
  });

  it('item 52 — a checagem morde: código inexistente ou encerrado não é achado na data', () => {
    expect(linhaLegalVigente(LINHAS, 'ESOCIAL_NATUREZA_RUBRICA', '9999', DATA)).toBeUndefined();
    // IRRF 0 ("Rendimento não tributável") terminou em 2021-06-30 na Tabela 21 [D10].
    expect(linhaLegalVigente(LINHAS, 'ESOCIAL_INCIDENCIA_RUBRICA', '0', DATA, 'IRRF')).toBeUndefined();
    // O código de CP não vale como código de FGTS: o discriminador separa os domínios.
    expect(linhaLegalVigente(LINHAS, 'ESOCIAL_INCIDENCIA_RUBRICA', '31', DATA, 'CP')).toBeDefined();
    expect(linhaLegalVigente(LINHAS, 'ESOCIAL_INCIDENCIA_RUBRICA', '41', DATA, 'FGTS')).toBeUndefined();
  });

  it('item 52 — códigos únicos e categorias ⊆ CATEGORIAS_NUCLEO', () => {
    expect(new Set(DP_RUBRICAS.map((r) => r.codigo)).size).toBe(DP_RUBRICAS.length);
    for (const r of DP_RUBRICAS) for (const c of r.categorias) expect(CATEGORIAS_NUCLEO).toContain(c);
  });

  it('item 52 — rubrica de categoria do grupo "Contribuinte Individual" ou "Bolsista" não usa codIncCP 25, 26 ou 51 [D09 S-1200 codRubr "a"]', () => {
    const grupo = (cat: string) => JSON.parse(linhaLegalVigente(LINHAS, 'ESOCIAL_CATEGORIA', cat, DATA)?.valorJson ?? '{}').grupo;
    expect([grupo('723'), grupo('901')]).toEqual(['Contribuinte Individual', 'Bolsista']);
    const vedadas = DP_RUBRICAS.filter(
      (r) => r.categorias.some((c) => ['Contribuinte Individual', 'Bolsista'].includes(grupo(c))) && ['25', '26', '51'].includes(r.incidencia.cp),
    );
    expect(vedadas.map((r) => r.codigo)).toEqual([]);
  });

  it('item 53 — published.json congela {codigo, natureza, incidencia} de cada rubrica publicada', () => {
    const published: Array<{ codigo: string; sha256: string }> = JSON.parse(readFileSync(join(__dirname, '..', 'rubricas', 'published.json'), 'utf8'));
    const porCodigo = new Map(DP_RUBRICAS.map((r) => [r.codigo as string, r]));
    for (const p of published) {
      const r = porCodigo.get(p.codigo);
      expect(r).toBeDefined(); // publicada não sai do catálogo
      expect([p.codigo, sha256(enquadramento(r!))]).toEqual([p.codigo, p.sha256]);
    }
    expect(published.map((p) => p.codigo)).toEqual(DP_RUBRICAS.map((r) => r.codigo)); // toda rubrica do catálogo está publicada
  });

  it('item 53 — mudar a natureza ou uma incidência muda o hash (o congelamento morde)', () => {
    const r = DP_RUBRICAS[0];
    const original = sha256(enquadramento(r));
    expect(sha256(enquadramento({ ...r, natureza: '1001' }))).not.toBe(original);
    expect(sha256(enquadramento({ ...r, incidencia: { ...r.incidencia, fgts: '00' } }))).not.toBe(original);
    expect(sha256({ ...enquadramento(r), nome: 'x' })).not.toBe(original); // só o enquadramento entra no hash
    expect(sha256(enquadramento({ ...r, nome: { pt: 'Outro', en: 'Other' } }))).toBe(original);
  });
});
