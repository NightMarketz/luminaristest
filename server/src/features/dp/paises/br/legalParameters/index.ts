import { z } from 'zod';
import type { LegalParameterFormatRegistration } from '../../../../legalParameters/models/formatRegistry';
import { jsonOk, semDisc, so } from '../../../../legalParameters/models/formatHelpers';
import { InssEmpregadoFaixaJson } from '../../../models/parametrosFolha';
import { DpCategoriaEncargoJson, FOLHA_REGRA_CHAVES_INT, FOLHA_REGRA_CHAVES_TEXTO, type FolhaRegraChaveInt, type FolhaRegraChaveTexto } from '../../../models/regrasFolha';

/**
 * BE-INCR-PAIS-NA-BORDA-F3 item 3 — formatos das tabelas do Departamento Pessoal (INSS do empregado, eSocial e regras da folha). Cada regra é a do `formatoLinha.ts`, movida
 * sem mudança: mesmo predicado e mesma mensagem.
 *
 * Só o `lib/factory.ts` e os testes importam este arquivo (X1, P1). A ponte folha → razão acrescenta aqui os formatos
 * dela (`formatosEncargos.ts`, F-PBA-7 a).
 */
const BR = { domain: 'dp', country: 'br' } as const;

const texto = z.string().trim().min(1);
/** DP-F0-F1 item 23 — Tabela 01: `evento` pela REGRA_COMPATIB_CATEG_EVENTO do leiaute (S-2200 = emprego; S-2300 = TSVE). */
export const EsocialCategoriaJson = z.object({ grupo: texto, descricao: texto, evento: z.enum(['S-2200', 'S-2300']).nullable() }).strict();
export const EsocialNaturezaRubricaJson = z.object({ nome: texto, descricao: texto }).strict();
export const EsocialDescricaoJson = z.object({ descricao: texto }).strict();
const ehChaveInt = (c: string): c is FolhaRegraChaveInt => Object.prototype.hasOwnProperty.call(FOLHA_REGRA_CHAVES_INT, c);
const ehChaveTexto = (c: string): c is FolhaRegraChaveTexto => Object.prototype.hasOwnProperty.call(FOLHA_REGRA_CHAVES_TEXTO, c);

export const DP_BR_LEGAL_PARAMETER_FORMATS: readonly LegalParameterFormatRegistration[] = [
  // DP-F0-F1 item 20: faixas progressivas (EC 103 art. 28 caput e § 1º); a última vai até o teto (`ateCents: null`).
  {
    table: 'INSS_EMPREGADO',
    ...BR,
    value: 'json',
    check: (l) =>
      so(/^FAIXA_[1-9]$/.test(l.chave) && semDisc(l), 'chave FAIXA_1..9, sem discriminador') ??
      jsonOk(InssEmpregadoFaixaJson, l.valorJson, 'valorJson = { ateCents: inteiro > 0 | null, aliquotaBp: 0..10000 }'),
  },
  // DP-F0-F1 item 23: tabelas do eSocial (S-1.3), chave = código da tabela, transcritas por script do HTML oficial.
  {
    table: 'ESOCIAL_CATEGORIA',
    ...BR,
    value: 'json',
    check: (l) =>
      so(/^\d{3}$/.test(l.chave) && semDisc(l), 'chave = código de 3 dígitos da Tabela 01, sem discriminador') ??
      jsonOk(EsocialCategoriaJson, l.valorJson, 'valorJson = { grupo, descricao, evento: S-2200 | S-2300 | null }'),
  },
  {
    table: 'ESOCIAL_NATUREZA_RUBRICA',
    ...BR,
    value: 'json',
    check: (l) =>
      so(/^\d{4}$/.test(l.chave) && semDisc(l), 'chave = código de 4 dígitos da Tabela 03, sem discriminador') ??
      jsonOk(EsocialNaturezaRubricaJson, l.valorJson, 'valorJson = { nome, descricao }'),
  },
  {
    table: 'ESOCIAL_INCIDENCIA_RUBRICA',
    ...BR,
    value: 'json',
    check: (l) =>
      so(
        (['CP', 'FGTS'].includes(l.discriminador ?? '') && /^\d{2}$/.test(l.chave)) || (l.discriminador === 'IRRF' && /^\d{1,4}$/.test(l.chave)),
        'discriminador CP|FGTS (chave de 2 dígitos do S-1010) ou IRRF (chave de 1 a 4 dígitos da Tabela 21)',
      ) ?? jsonOk(EsocialDescricaoJson, l.valorJson, 'valorJson = { descricao }'),
  },
  {
    table: 'ESOCIAL_MOTIVO_AFASTAMENTO',
    ...BR,
    value: 'json',
    check: (l) =>
      so(/^\d{2}$/.test(l.chave) && semDisc(l), 'chave = código de 2 dígitos da Tabela 18, sem discriminador') ??
      jsonOk(EsocialDescricaoJson, l.valorJson, 'valorJson = { descricao }'),
  },
  // DP-F2 PR-1 item 13: Tabela 07 do eSocial, como a Tabela 18.
  {
    table: 'ESOCIAL_TIPO_DEPENDENTE',
    ...BR,
    value: 'json',
    check: (l) =>
      so(/^\d{2}$/.test(l.chave) && semDisc(l), 'chave = código de 2 dígitos da Tabela 07, sem discriminador') ??
      jsonOk(EsocialDescricaoJson, l.valorJson, 'valorJson = { descricao }'),
  },
  // DP-F2 PR-0R item 65: discriminador = categoria (3 dígitos) só onde a regra varia por categoria; nenhuma linha inicial varia.
  {
    table: 'FOLHA_REGRA',
    ...BR,
    value: (l) => (ehChaveTexto(l.chave) ? 'text' : 'int'),
    check: (l) => {
      const disc = so(semDisc(l) || /^\d{3}$/.test(l.discriminador ?? ''), 'discriminador nulo ou código de categoria de 3 dígitos');
      if (disc) return disc;
      if (ehChaveTexto(l.chave)) {
        const opcoes: readonly string[] = FOLHA_REGRA_CHAVES_TEXTO[l.chave];
        return so(opcoes.includes(l.valorTexto ?? ''), `${l.chave}: valorTexto ∈ ${opcoes.join('|')}`);
      }
      if (ehChaveInt(l.chave)) {
        const { min, max } = FOLHA_REGRA_CHAVES_INT[l.chave];
        const v = l.valorInt ?? Number.NaN;
        return so(Number.isInteger(v) && v >= min && v <= max, `${l.chave}: valorInt inteiro em ${min}..${max}`);
      }
      return `chave fora do catálogo (${[...Object.keys(FOLHA_REGRA_CHAVES_INT), ...Object.keys(FOLHA_REGRA_CHAVES_TEXTO)].join(', ')})`;
    },
  },
  // DP-F2 PR-0R item 66: chave = categoria do eSocial (Tabela 01, 3 dígitos), sem discriminador.
  {
    table: 'DP_CATEGORIA_ENCARGO',
    ...BR,
    value: 'json',
    check: (l) =>
      so(/^\d{3}$/.test(l.chave) && semDisc(l), 'chave = categoria de 3 dígitos, sem discriminador') ??
      jsonOk(DpCategoriaEncargoJson, l.valorJson, "valorJson = { inss: EMPREGADO|CONTRIBUINTE_INDIVIDUAL|NENHUM, fgtsChave: FGTS_BP|FGTS_APRENDIZ_BP|null, irrf: boolean }"),
  },
];
