import { z } from 'zod';
import type { LegalParameterFormatRegistration } from '../../../../legalParameters/models/formatRegistry';
import { bp, jsonOk, semDisc, so } from '../../../../legalParameters/models/formatHelpers';
import { REGRAS_VENCIMENTO_IBS_CBS } from '../../../models/ibsCbsParams';
import { CClassTribIbsCbsJson, CCredPresIbsCbsJson, CstIbsCbsJson } from '../../../models/ibsCbsTabelas';

/**
 * BE-INCR-PAIS-NA-BORDA-F3 item 3 — formatos das tabelas de IBS/CBS (LC 214) e ISS (LC 116). Cada regra é a do `formatoLinha.ts`, movida
 * sem mudança: mesmo predicado e mesma mensagem.
 */
const BR = { domain: 'accounting', country: 'br' } as const;

const texto = z.string().trim().min(1);
export const Lc116ServicoJson = z
  .object({
    linha: z.number().int().min(1),
    descricao: texto,
    li: z.array(z.enum(['EP', 'LP', 'ET'])),
    grupo: z.enum(['obra', 'atvEvento']).nullable(),
  })
  .strict();

export const IBS_CBS_ISS_FORMATS: readonly LegalParameterFormatRegistration[] = [
  // Achado 1 do #861: a linha VENCIMENTO (PR-5) é de texto — a regra que `vencimentoIbsCbsDe` sabe ler; as alíquotas seguem
  // valorInt, como na regra do PR-1.
  {
    table: 'IBS_CBS',
    ...BR,
    value: (l) => (l.discriminador === 'VENCIMENTO' ? 'text' : 'int'),
    check: (l) =>
      l.discriminador === 'VENCIMENTO'
        ? so(['IBS', 'CBS'].includes(l.chave) && (REGRAS_VENCIMENTO_IBS_CBS as readonly string[]).includes(l.valorTexto ?? ''), `chave IBS|CBS; valorTexto = regra de vencimento (${REGRAS_VENCIMENTO_IBS_CBS.join('|')})`)
        : so(
            ((l.chave === 'CBS' && l.discriminador === 'ALIQUOTA') || (l.chave === 'IBS' && ['ALIQUOTA_UF', 'ALIQUOTA_MUN'].includes(l.discriminador ?? ''))) && bp(l),
            'chave CBS com discriminador ALIQUOTA, ou IBS com ALIQUOTA_UF|ALIQUOTA_MUN (ou VENCIMENTO); valorInt em bp (0..10000)',
          ),
  },
  // IBS-CBS-2027 PR-3 (item 15; dono 21/10): lista de uso ou consumo pessoal (LC 214 art. 57) — chave = prefixo de NCM.
  {
    table: 'IBS_CBS_USO_CONSUMO',
    ...BR,
    value: 'text',
    check: (l) => so(/^\d{2,8}$/.test(l.chave) && semDisc(l), 'chave = prefixo de NCM (2 a 8 dígitos); valorTexto = categoria do art. 57'),
  },
  // IBS-CBS-2027 PR-3 (dono 22/10): taxa de referência PROVISÓRIA da CBS enquanto a Res. SF não sai (art. 349 I) — só a prévia
  // a lê; a confirmação continua bloqueada. chave CBS, discriminador ALIQUOTA, valorInt em bp.
  {
    table: 'IBS_CBS_PROVISORIA',
    ...BR,
    value: 'int',
    check: (l) => so(l.chave === 'CBS' && l.discriminador === 'ALIQUOTA' && bp(l) && (l.valorInt ?? 0) > 0, 'chave CBS, discriminador ALIQUOTA; valorInt em bp (1..10000)'),
  },
  // EFICIENCIA-FISCAL PR-5 (item 32): Anexo III da LC 214 — chave = prefixo de NBS (5 a 9 dígitos, sem pontos), sem
  // discriminador; valorInt = redução em bp.
  {
    table: 'IBS_CBS_REDUCAO_NBS',
    ...BR,
    value: 'int',
    check: (l) => so(/^\d{5,9}$/.test(l.chave) && semDisc(l) && bp(l) && (l.valorInt ?? 0) > 0, 'chave = prefixo de NBS (5 a 9 dígitos); sem discriminador; valorInt = redução em bp (1..10000)'),
  },
  // Onda 3.2 fatia 5 (dono, 24/11/2026): tabelas NT do IT 2025.002 v1.70. Chave = código da planilha, sem discriminador;
  // valorJson = as colunas que a montagem e as regras do UB leem (o que `models/ibsCbsTabelas.ts` parseia).
  {
    table: 'CST_IBS_CBS',
    ...BR,
    value: 'json',
    check: (l) => so(/^\d{3}$/.test(l.chave) && semDisc(l), 'chave = CST de 3 dígitos; sem discriminador') ?? jsonOk(CstIbsCbsJson, l.valorJson, 'valorJson = { ordem, descricao, ind_* }'),
  },
  {
    table: 'CCLASSTRIB_IBS_CBS',
    ...BR,
    value: 'json',
    check: (l) => so(/^\d{6}$/.test(l.chave) && semDisc(l), 'chave = cClassTrib de 6 dígitos; sem discriminador') ?? jsonOk(CClassTribIbsCbsJson, l.valorJson, 'valorJson = { ordem, cst, tipoAliquota, pRed*, ind_*, tpRBSN, tpDoacao, indNFe, indNFCe }'),
  },
  {
    table: 'CCREDPRES_IBS_CBS',
    ...BR,
    value: 'json',
    check: (l) => so(/^\d{2}$/.test(l.chave) && semDisc(l), 'chave = cCredPres de 2 dígitos; sem discriminador') ?? jsonOk(CCredPresIbsCbsJson, l.valorJson, 'valorJson = { ordem, apropria*, ind_*, cClassTribNotaReferenciada, dIniVig/dFimVig CBS e IBS, indNFe, indNFCe }'),
  },
  {
    table: 'LC116_SERVICO',
    ...BR,
    value: 'json',
    check: (l) =>
      so(/^\d{6}$/.test(l.chave) && semDisc(l), 'chave = cTribNac de 6 dígitos, sem discriminador') ??
      jsonOk(Lc116ServicoJson, l.valorJson, 'valorJson = { linha, descricao, li: [EP|LP|ET], grupo: obra|atvEvento|null }'),
  },
  {
    table: 'ISS_LIMITE',
    ...BR,
    value: 'int',
    // ISS-TRANSICAO-IBS PR-2 item 10 (F-ISS-4 a): ALIQUOTA_MIN_BP (LC 116 art. 8º-A; ADCT art. 128) ao lado do máximo.
    check: (l) =>
      so((l.chave === 'ALIQUOTA_MAX_BP' || l.chave === 'ALIQUOTA_MIN_BP') && semDisc(l) && (l.valorInt ?? -1) >= 0 && (l.valorInt ?? 0) <= 10_000, 'chave ALIQUOTA_MAX_BP|ALIQUOTA_MIN_BP; valorInt em bp (0..10000)'),
    // Lacuna 03e4 (F-F3-6 a): ALIQUOTA_MAX_BP marca o fim do ISS (`fimIss`); a mínima aceita fim aberto.
    endRequired: (l) => l.chave === 'ALIQUOTA_MAX_BP',
  },
  // ISS-TRANSICAO-IBS PR-1 (BRIEF item 2): fator de redução do ISS por ano (LC 116 art. 8º-B I–IV), sem discriminador.
  {
    table: 'ISS_TRANSICAO',
    ...BR,
    value: 'int',
    check: (l) => so(l.chave === 'FATOR_REDUCAO_BP' && semDisc(l) && bp(l), 'chave FATOR_REDUCAO_BP; valorInt em bp (0..10000)'),
  },
];
