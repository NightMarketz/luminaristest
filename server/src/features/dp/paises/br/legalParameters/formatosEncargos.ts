import type { LegalParameterFormatRegistration } from '../../../../legalParameters/models/formatRegistry';
import { bp, jsonOk, semDisc, so } from '../../../../legalParameters/models/formatHelpers';
import { z } from 'zod';
import { isValidCnpj } from '../../../../../lib/cnpj';
import { TerceirosFpasJson } from '../models/folha/terceiros';

/**
 * BE-INCR-DP-PONTE-RAZAO PR-P0 itens 1–3 (§5.2 do BRIEF; F-PBA-7 a) — formatos das tabelas de lei da CPP patronal fora
 * do DAS. Espalhados em `DP_BR_LEGAL_PARAMETER_FORMATS` (`index.ts`); só o `lib/factory.ts` e os testes os importam.
 *
 * Item 7 (PR-P1; F-PNT-3 b + 3b a, dono 21/11: "Tudo em parâmetros legais" + "Linha por CNPJ, via admin") — o
 * enquadramento da empresa na mesma tabela global, publicado só pelo admin da plataforma: grau do RAT e FAP por CNPJ do
 * estabelecimento, FPAS por raiz de CNPJ. Cada um confere, em toda a vigência, a tabela de lei de que depende.
 */
const BR = { domain: 'dp', country: 'br' } as const;

/** `valorJson` opcional de `FPAS_EMPRESA`: o código de terceiros do S-1005 (4 dígitos). */
export const FpasEmpresaJson = z.object({ codigoTerceiros: z.string().regex(/^\d{4}$/) }).strict();
const ehCnpjComDv = (c: string) => isValidCnpj(c);
const ano = (d: string | undefined | null) => (d ? d.slice(0, 4) : null);

export const DP_BR_ENCARGOS_FORMATS: readonly LegalParameterFormatRegistration[] = [
  // Item 1 — Lei 8.212 art. 22 II "a"–"c": 1%, 2% ou 3% pelo grau de risco; valorInt em bp.
  {
    table: 'RAT_ALIQUOTA',
    ...BR,
    value: 'int',
    check: (l) => so(/^GRAU_[123]$/.test(l.chave) && semDisc(l), 'chave GRAU_1|GRAU_2|GRAU_3, sem discriminador') ?? so(bp(l), 'valorInt em bp 0..10000'),
  },
  // Item 2 — Lei 10.666 art. 10 e Dec. 3.048 art. 202-A § 1º: o FAP vai de 0,5000 a 2,0000; valorInt = FAP × 10000.
  {
    table: 'FAP_LIMITES',
    ...BR,
    value: 'int',
    check: (l) =>
      so(['MIN_X10000', 'MAX_X10000'].includes(l.chave) && semDisc(l), 'chave MIN_X10000|MAX_X10000, sem discriminador') ??
      so(Number.isInteger(l.valorInt) && (l.valorInt ?? 0) >= 1 && (l.valorInt ?? 0) <= 30_000, 'valorInt inteiro em 1..30000 (FAP × 10000)'),
  },
  // Item 3 — IN RFB 2.110 art. 85 II e Anexo III: chave = código FPAS; totalBp = soma das entidades (gate de formato).
  {
    table: 'TERCEIROS_FPAS',
    ...BR,
    value: 'json',
    check: (l) =>
      so(/^\d{3}$/.test(l.chave) && semDisc(l), 'chave = código FPAS de 3 dígitos, sem discriminador') ??
      jsonOk(TerceirosFpasJson, l.valorJson, 'valorJson = { entidades: { <código de 4 dígitos>: bp }, totalBp } com totalBp = soma das entidades'),
  },
  // Item 7 — Dec. 3.048 art. 202 §§ 3º e 5º: grau da atividade preponderante em cada estabelecimento (autoenquadramento).
  {
    table: 'RAT_GRAU_ESTABELECIMENTO',
    ...BR,
    value: 'int',
    check: (l) => so(ehCnpjComDv(l.chave) && semDisc(l), 'chave = CNPJ do estabelecimento (14 posições, DV válido), sem discriminador') ?? so([1, 2, 3].includes(l.valorInt ?? 0), 'valorInt = grau 1..3'),
    requires: ['RAT_ALIQUOTA'],
    checkAgainst: (l, ctx) => so(ctx.rowsInForce('RAT_ALIQUOTA').some((r) => r.chave === `GRAU_${l.valorInt}`), `RAT_ALIQUOTA sem GRAU_${l.valorInt} em vigor`),
  },
  // Item 7 — Dec. 3.048 art. 202-A: FAP por CNPJ, vigência anual (1º/01 a 31/12 do ano de validade).
  {
    table: 'FAP_ESTABELECIMENTO',
    ...BR,
    value: 'int',
    check: (l) =>
      so(ehCnpjComDv(l.chave) && semDisc(l), 'chave = CNPJ do estabelecimento (14 posições, DV válido), sem discriminador') ??
      so(Number.isInteger(l.valorInt), 'valorInt = FAP × 10000 (inteiro, truncado na 4ª casa)') ??
      so(l.vigenteDesde === undefined || l.vigenteDesde.slice(5) === '01-01', 'vigência anual: vigenteDesde em 1º de janeiro') ??
      so(l.vigenteAte === undefined || l.vigenteAte === null || (l.vigenteAte.slice(5) === '12-31' && ano(l.vigenteAte) === ano(l.vigenteDesde ?? l.vigenteAte)), 'vigência anual: vigenteAte em 31 de dezembro do mesmo ano'),
    endRequired: () => true,
    requires: ['FAP_LIMITES'],
    checkAgainst: (l, ctx) => {
      const lim = ctx.rowsInForce('FAP_LIMITES');
      const min = lim.find((r) => r.chave === 'MIN_X10000')?.valorInt;
      const max = lim.find((r) => r.chave === 'MAX_X10000')?.valorInt;
      if (min === undefined || min === null || max === undefined || max === null) return 'FAP_LIMITES sem MIN_X10000 e MAX_X10000 em vigor';
      return so((l.valorInt ?? 0) >= min && (l.valorInt ?? 0) <= max, `FAP ${l.valorInt} fora de ${min}..${max} (FAP_LIMITES)`);
    },
  },
  // Item 7 — IN RFB 2.110 art. 91: o FPAS vale para todos os estabelecimentos da mesma raiz de CNPJ.
  {
    table: 'FPAS_EMPRESA',
    ...BR,
    value: 'text',
    check: (l) =>
      so(/^[A-Z0-9]{8}$/.test(l.chave) && semDisc(l), 'chave = raiz do CNPJ (8 posições), sem discriminador') ??
      so(/^\d{3}$/.test(l.valorTexto ?? ''), 'valorTexto = código FPAS de 3 dígitos') ??
      (l.valorJson === undefined || l.valorJson === null ? null : jsonOk(FpasEmpresaJson, l.valorJson, 'valorJson opcional = { codigoTerceiros: 4 dígitos }')),
    requires: ['TERCEIROS_FPAS'],
    checkAgainst: (l, ctx) => so(ctx.rowsInForce('TERCEIROS_FPAS').some((r) => r.chave === l.valorTexto), `TERCEIROS_FPAS sem a linha do FPAS ${l.valorTexto} em vigor`),
  },
];
