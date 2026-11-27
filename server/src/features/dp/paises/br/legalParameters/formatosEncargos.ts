import type { LegalParameterFormatRegistration } from '../../../../legalParameters/models/formatRegistry';
import { bp, jsonOk, semDisc, so } from '../../../../legalParameters/models/formatHelpers';
import { TerceirosFpasJson } from '../models/folha/terceiros';

/**
 * BE-INCR-DP-PONTE-RAZAO PR-P0 itens 1–3 (§5.2 do BRIEF; F-PBA-7 a) — formatos das tabelas de lei da CPP patronal fora
 * do DAS. Espalhados em `DP_BR_LEGAL_PARAMETER_FORMATS` (`index.ts`); só o `lib/factory.ts` e os testes os importam.
 *
 * As três tabelas do enquadramento por CNPJ (`RAT_GRAU_ESTABELECIMENTO`, `FAP_ESTABELECIMENTO`, `FPAS_EMPRESA`) são do
 * PR-P1 (item 7) e entram depois.
 */
const BR = { domain: 'dp', country: 'br' } as const;

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
];
