import { z } from 'zod';
import { CNPJ_REGEX, CPF_REGEX, classifyTaxId, isValidCnpj, nfeChaveCheckDigit } from '../../../lib/cnpj';
import { NFCE_CFOP } from '../models/nfePrecondicoes';
import { NfeIbsCbsSchema, NfeIbsCbsTotSchema, NfeIsSchema, NfeIsTotSchema, regrasIbsCbs } from './NfeIbsCbsDto';

/**
 * BE-INCR-NFCE (nó X10a, item 12) — leiaute de SAÍDA da NF-e 55 / NFC-e 65, transcrito de
 * `docs/accounting/fontes-oficiais/TRANSCRICAO-MOC70-NFCe-NFe-saida-2026-10-26.md` (MOC 7.0 Anexo I). `.strict()` em toda a
 * árvore: tag fora da transcrição é recusada — é assim que os grupos proibidos na NFC-e (ISUF 730, IEST 718, NFref 708,
 * ICMSUFDest 807, IPI/II/PIS-ST/COFINS-ST 742–749, cobr 760) nunca chegam ao parceiro. As regras de validação da §7 da
 * transcrição viram `superRefine`, com o código de rejeição da SEFAZ na mensagem ("rej. NNN").
 *
 * Forma: códigos com zero à esquerda (NCM, CFOP, CST, CSOSN, cUF, cNF) como string; dinheiro e quantidades como texto
 * decimal ("0.00") — mesma convenção da DPS (`DpsPayloadDto.ts`); a conversão de centavos mora na montagem
 * (`models/nfeMontagem.ts`). O grupo UB (IS e IBS/CBS) e os totais W03 moram em `NfeIbsCbsDto.ts` (PR-6, item 20).
 */

const Money = z.string().regex(/^\d{1,13}\.\d{2}$/); // 13v2
const Qtd = z.string().regex(/^\d{1,11}(\.\d{1,4})?$/); // 11v0-4 (I10/I14)
const VUn = z.string().regex(/^\d{1,11}(\.\d{1,10})?$/); // 11v0-10 (I10a/I14a)
const Pct = z.string().regex(/^\d{1,3}\.\d{2,4}$/); // 3v2-4 (pPIS/pCOFINS)
const Ibge7 = z.string().regex(/^\d{7}$/);
const Gtin = z.string().regex(/^(\d{8}|\d{12}|\d{13}|\d{14}|SEM GTIN)$/); // I03/I12 — sem GTIN ⇒ "SEM GTIN" (p. 19)
const Csosn102 = z.enum(['102', '103', '300', '400']); // N10d ICMSSN102
const Orig = z.number().int().min(0).max(8); // N11

/** B03-10 (rej. 897): cNF que a SEFAZ recusa (além de cNF = nNF). */
export const CNF_PROIBIDOS = [
  '00000000', '11111111', '22222222', '33333333', '44444444', '55555555', '66666666', '77777777', '88888888', '99999999',
  '12345678', '23456789', '34567890', '45678901', '56789012', '67890123', '78901234', '89012345', '90123456', '01234567',
] as const;

/** N12a-40/N12a-44 e N12-40/N12-44 (rej. 386/382): CFOP de mercadoria sem ST × com ST. */
const CFOP_SEM_ST = ['5101', '5102', '5103', '5104', '5115'];
const CFOP_COM_ST = ['5405', '5656', '5667'];

/** A literal I04-10 (rej. 373): `xProd` do 1º item da NFC-e em homologação. */
export const XPROD_HOMOLOGACAO_NFCE = 'NOTA FISCAL EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL';

const Ender = z
  .object({
    xLgr: z.string().min(2).max(60), // C06/E06
    nro: z.string().min(1).max(60), // C07
    xCpl: z.string().min(1).max(60).optional(), // C08
    xBairro: z.string().min(2).max(60), // C09
    cMun: Ibge7, // C10
    xMun: z.string().min(2).max(60), // C11
    UF: z.string().regex(/^[A-Z]{2}$/), // C12
    CEP: z.string().regex(/^\d{8}$/), // C13
    cPais: z.literal('1058').optional(), // C14
    xPais: z.string().min(1).max(60).optional(), // C15
    fone: z.string().regex(/^\d{6,14}$/).optional(), // C16
  })
  .strict();

const IdeBase = z
  .object({
    cUF: z.string().regex(/^\d{2}$/), // B02
    natOp: z.string().min(1).max(60), // B04
    mod: z.union([z.literal(55), z.literal(65)]), // B06
    serie: z.number().int().min(0).max(889), // B07 — 000–889 aplicativo do contribuinte
    dhEmi: z.string().datetime({ offset: true }), // B09 AAAA-MM-DDThh:mm:ssTZD
    dhSaiEnt: z.string().datetime({ offset: true }).optional(), // B10 — proibido na NFC-e (705)
    tpNF: z.union([z.literal(0), z.literal(1)]), // B11
    idDest: z.union([z.literal(1), z.literal(2), z.literal(3)]), // B11a
    cMunFG: Ibge7, // B12
    tpImp: z.number().int().min(0).max(5), // B21
    tpEmis: z.number().int().min(1).max(9), // B22
    tpAmb: z.union([z.literal(1), z.literal(2)]), // B24
    finNFe: z.number().int().min(1).max(4), // B25
    indFinal: z.union([z.literal(0), z.literal(1)]), // B25a
    indPres: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(9)]), // B25b
    indIntermed: z.literal(0).optional(), // B25c
    procEmi: z.literal(0), // B26
    verProc: z.string().min(1).max(20), // B27
    // X10a PR-9 (E-9): B28 dhCont (UTC com TZD) e B29 xJust (15–256) — só na contingência (556/557, regra abaixo).
    dhCont: z.string().datetime({ offset: true }).optional(), // B28
    xJust: z.string().min(15).max(256).optional(), // B29
  })
  .strict();

/** Numeração da chave (B03 cNF, B08 nNF, B23 cDV) — só quando o Luminaris numera (`numbersDps === false`, item 21). */
const IdeNumeracao = z
  .object({
    cNF: z.string().regex(/^\d{8}$/), // B03
    nNF: z.number().int().min(1).max(999_999_999), // B08
    cDV: z.number().int().min(0).max(9), // B23
  })
  .strict();

const Emit = z
  .object({
    CNPJ: z.string().regex(CNPJ_REGEX), // C02 (alfanumérico — NT 2026.004)
    xNome: z.string().min(2).max(60), // C03
    xFant: z.string().min(1).max(60).optional(), // C04
    enderEmit: Ender, // C05
    IE: z.string().regex(/^\d{2,14}$/), // C17 — só algarismos
    CRT: z.union([z.literal(1), z.literal(2), z.literal(3)]), // C21
  })
  .strict();

const Dest = z
  .object({
    CNPJ: z.string().regex(CNPJ_REGEX).optional(), // E02
    CPF: z.string().regex(CPF_REGEX).optional(), // E03
    xNome: z.string().min(2).max(60).optional(), // E04 — obrigatória na 55
    enderDest: Ender.optional(), // E05 — obrigatório na 55
    indIEDest: z.union([z.literal(1), z.literal(2), z.literal(9)]), // E16a
    IE: z.string().regex(/^\d{2,14}$/).optional(), // E17
    email: z.string().min(1).max(60).optional(), // E19
  })
  .strict()
  .refine((d) => Boolean(d.CNPJ) !== Boolean(d.CPF), 'dest: informe CNPJ ou CPF (um só, E02/E03)');

const Prod = z
  .object({
    cProd: z.string().min(1).max(60), // I02
    cEAN: Gtin, // I03
    xProd: z.string().min(1).max(120), // I04
    NCM: z.string().regex(/^\d{8}$/), // I05 — completo
    CEST: z.string().regex(/^\d{7}$/).optional(), // I05c
    CFOP: z.string().regex(/^\d{4}$/), // I08
    uCom: z.string().min(1).max(6), // I09
    qCom: Qtd, // I10
    vUnCom: VUn, // I10a
    vProd: Money, // I11
    cEANTrib: Gtin, // I12
    uTrib: z.string().min(1).max(6), // I13
    qTrib: Qtd, // I14
    vUnTrib: VUn, // I14a
    vDesc: Money.optional(), // I17
    indTot: z.union([z.literal(0), z.literal(1)]), // I17b
  })
  .strict();

const Icms = z
  .object({
    ICMSSN102: z.object({ orig: Orig, CSOSN: Csosn102 }).strict().optional(), // N10d
    ICMSSN500: z.object({ orig: Orig, CSOSN: z.literal('500') }).strict().optional(), // N10g (sem o N25.1 opcional)
    ICMS00: z
      .object({
        orig: Orig,
        CST: z.literal('00'), // N12
        modBC: z.number().int().min(0).max(3), // N13
        vBC: Money, // N15
        pICMS: Pct, // N16
        vICMS: Money, // N17
      })
      .strict()
      .optional(),
  })
  .strict()
  .refine((g) => Object.values(g).filter(Boolean).length === 1, 'ICMS: exatamente um subgrupo (N01)');

/** Q02–Q05 (PIS) e S02–S05 (COFINS) — o mesmo desenho, um subgrupo por CST. */
function tributoPisCofins(t: 'PIS' | 'COFINS') {
  const p = t === 'PIS' ? 'pPIS' : 'pCOFINS';
  const v = t === 'PIS' ? 'vPIS' : 'vCOFINS';
  const aliq = z.object({ CST: z.enum(['01', '02']), vBC: Money, [p]: Pct, [v]: Money }).strict();
  const nt = z.object({ CST: z.enum(['04', '05', '06', '07', '08', '09']) }).strict();
  const outr = z
    .object({
      CST: z.enum(['49', '50', '51', '52', '53', '54', '55', '56', '60', '61', '62', '63', '64', '65', '66', '67', '70', '71', '72', '73', '74', '75', '98', '99']),
      vBC: Money,
      [p]: Pct,
      [v]: Money,
    })
    .strict();
  return z
    .object({ [`${t}Aliq`]: aliq.optional(), [`${t}NT`]: nt.optional(), [`${t}Outr`]: outr.optional() })
    .strict()
    .refine((g) => Object.values(g).filter(Boolean).length === 1, `${t}: exatamente um subgrupo`);
}

const Det = z
  .object({
    nItem: z.number().int().min(1).max(990), // H01 @nItem
    prod: Prod,
    imposto: z
      .object({
        ICMS: Icms, // N01
        PIS: tributoPisCofins('PIS').optional(), // Q01 0-1
        COFINS: tributoPisCofins('COFINS').optional(), // S01 0-1
        IS: NfeIsSchema.optional(), // UB01 0-1
        IBSCBS: NfeIbsCbsSchema.optional(), // UB12 0-1 — exigido conforme UB12-10
      })
      .strict(),
  })
  .strict();

const IcmsTot = z
  .object({
    vBC: Money, vICMS: Money, vICMSDeson: Money, vFCPUFDest: Money.optional(), vBCST: Money, vST: Money, vFCPST: Money,
    vProd: Money, vFrete: Money, vSeg: Money, vDesc: Money, vII: Money, vIPI: Money, vIPIDevol: Money, vPIS: Money,
    vCOFINS: Money, vOutro: Money, vNF: Money,
  })
  .strict(); // W02–W16

const DetPag = z
  .object({
    indPag: z.union([z.literal(0), z.literal(1)]).optional(), // YA01b
    tPag: z.string().regex(/^\d{2}$/), // YA02
    vPag: Money, // YA03
  })
  .strict();

const InfNFeShape = {
  versao: z.literal('4.00'), // A02
  ide: IdeBase,
  emit: Emit,
  dest: Dest.optional(), // E01 0-1 — obrigatório na 55
  det: z.array(Det).min(1).max(990),
  total: z
    .object({ ICMSTot: IcmsTot, ISTot: NfeIsTotSchema.optional(), IBSCBSTot: NfeIbsCbsTotSchema.optional(), vNFTot: Money.optional() }) // W31, W34, W60
    .strict(),
  transp: z.object({ modFrete: z.number().int().min(0).max(9) }).strict(), // X02
  pag: z.object({ detPag: z.array(DetPag).min(1).max(100), vTroco: Money.optional() }).strict(), // YA01
} as const;

const cents = (s: string | undefined): number => (s ? Math.round(Number(s) * 100) : 0);

type InfNFeComum = z.infer<z.ZodObject<typeof InfNFeShape>>;

/** As regras da §7 da transcrição que não dependem de parâmetro legal (os limites W16-30/40 ficam na montagem). */
function regrasNfe(inf: InfNFeComum & { ide: { cNF?: string; nNF?: number; cDV?: number }; Id?: string }, ctx: z.RefinementCtx): void {
  const add = (message: string, path: (string | number)[]) => ctx.addIssue({ code: 'custom', message, path });
  const { ide, dest, det, total, pag } = inf;
  const nfce = ide.mod === 65;

  // Chave (A03-10 rej. 502, B23-10 rej. 253, B03-10 rej. 897) — só na forma numerada.
  if (inf.Id !== undefined && ide.cNF !== undefined && ide.nNF !== undefined && ide.cDV !== undefined) {
    if ((CNF_PROIBIDOS as readonly string[]).includes(ide.cNF) || ide.cNF === String(ide.nNF).padStart(8, '0')) {
      add('rej. 897: cNF inválido (sequência proibida ou igual ao nNF) — B03-10', ['ide', 'cNF']);
    }
    const aamm = ide.dhEmi.slice(2, 4) + ide.dhEmi.slice(5, 7);
    const chave43 = `${ide.cUF}${aamm}${inf.emit.CNPJ}${ide.mod}${String(ide.serie).padStart(3, '0')}${String(ide.nNF).padStart(9, '0')}${ide.tpEmis}${ide.cNF}`;
    if (inf.Id !== `NFe${chave43}${ide.cDV}`) add('rej. 502: Id difere da concatenação dos campos da chave — A03-10', ['Id']);
    if (chave43.length === 43 && nfeChaveCheckDigit(chave43) !== ide.cDV) add('rej. 253: DV da chave inválido — B23-10', ['ide', 'cDV']);
  }

  // Destinatário (E02-10 rej. 208, E03-10 rej. 237; E01 obrigatório na 55).
  if (dest?.CNPJ && !isValidCnpj(dest.CNPJ)) add('rej. 208: CNPJ do destinatário com DV inválido — E02-10', ['dest', 'CNPJ']);
  if (dest?.CPF && !classifyTaxId(dest.CPF)?.cpf) add('rej. 237: CPF do destinatário inválido — E03-10', ['dest', 'CPF']);
  if (!nfce) {
    if (!dest) add('E01: grupo dest obrigatório na NF-e (modelo 55)', ['dest']);
    else if (!dest.xNome || !dest.enderDest) add('E04/E05: xNome e enderDest obrigatórios na NF-e (modelo 55)', ['dest']);
  }

  // Totais (W07-10 rej. 564, W10-10 rej. 537, W16-10 rej. 610; YA03-10 rej. 865).
  const t = total.ICMSTot;
  const somaProd = det.filter((d) => d.prod.indTot === 1).reduce((s, d) => s + cents(d.prod.vProd), 0);
  if (cents(t.vProd) !== somaProd) add('rej. 564: vProd total ≠ Σ vProd dos itens com indTot=1 — W07-10', ['total', 'ICMSTot', 'vProd']);
  const somaDesc = det.reduce((s, d) => s + cents(d.prod.vDesc), 0);
  if (cents(t.vDesc) !== somaDesc) add('rej. 537: vDesc total ≠ Σ vDesc dos itens — W10-10', ['total', 'ICMSTot', 'vDesc']);
  const vNF =
    cents(t.vProd) - cents(t.vDesc) - cents(t.vICMSDeson) + cents(t.vST) + cents(t.vFCPST) + cents(t.vFrete) + cents(t.vSeg) +
    cents(t.vOutro) + cents(t.vII) + cents(t.vIPI) + cents(t.vIPIDevol);
  if (cents(t.vNF) !== vNF) add('rej. 610: vNF difere da fórmula do W16-10', ['total', 'ICMSTot', 'vNF']);
  const somaPag = pag.detPag.filter((p) => p.tPag !== '90' && p.tPag !== '91').reduce((s, p) => s + cents(p.vPag), 0);
  const semPagamento = pag.detPag.every((p) => p.tPag === '90' || p.tPag === '91');
  if (!semPagamento && somaPag < cents(t.vNF)) add('rej. 865: Σ vPag < vNF — YA03-10', ['pag']);

  // Grupo UB e totais W03 (NT 2025.002 v1.52) — `NfeIbsCbsDto.regrasIbsCbs`.
  regrasIbsCbs(inf, add);

  // Contingência (X10a PR-9; Anexo I B28-10 rej. 556, B28-20 rej. 557; B22-10 rej. 711 na 55).
  if (ide.tpEmis === 1 && (ide.dhCont !== undefined || ide.xJust !== undefined)) {
    add('rej. 556: dhCont/xJust informados em emissão normal — B28-10', ['ide', 'dhCont']);
  }
  if (ide.tpEmis === 9 && (ide.dhCont === undefined || ide.xJust === undefined)) {
    add('rej. 557: contingência sem dhCont/xJust — B28-20', ['ide', 'dhCont']);
  }
  if (!nfce && ide.tpEmis === 9) add('rej. 711: NF-e (modelo 55) com contingência off-line — B22-10', ['ide', 'tpEmis']);

  if (!nfce) return;

  // NFC-e (modelo 65) — `[AI]` pp. 76–125.
  if (ide.dhSaiEnt) add('rej. 705: NFC-e com data de entrada/saída — B10-10', ['ide', 'dhSaiEnt']);
  if (ide.tpNF === 0) add('rej. 706: NFC-e de entrada — B11-10', ['ide', 'tpNF']);
  if (ide.idDest !== 1) add('rej. 707: NFC-e interestadual ou exterior — B11a-10', ['ide', 'idDest']);
  if (ide.tpImp !== 4 && ide.tpImp !== 5) add('rej. 709: tpImp ≠ 4 e 5 na NFC-e — B21-10', ['ide', 'tpImp']);
  if ([2, 4, 5].includes(ide.tpEmis)) add('rej. 714: tpEmis 2, 4 ou 5 na NFC-e — B22-34', ['ide', 'tpEmis']);
  if (ide.finNFe !== 1) add('rej. 715: finNFe ≠ 1 na NFC-e — B25-20', ['ide', 'finNFe']);
  if (ide.indFinal === 0) add('rej. 716: indFinal = 0 na NFC-e — B25a-10', ['ide', 'indFinal']);
  if (ide.indPres !== 1 && ide.indPres !== 4) add('rej. 717: indPres ≠ 1 e 4 na NFC-e — B25b-20', ['ide', 'indPres']);
  if (ide.indPres === 4 && !dest) add('rej. 787: entrega a domicílio sem destinatário — E01-20', ['dest']);
  if (ide.indPres === 4 && dest && !dest.enderDest) add('rej. 788: entrega a domicílio sem enderDest — E05-20', ['dest', 'enderDest']);
  if (dest && dest.indIEDest !== 9) add('rej. 789: indIEDest ≠ 9 na NFC-e — E16a-10', ['dest', 'indIEDest']);
  if (dest?.CNPJ && dest.CNPJ === inf.emit.CNPJ) add('rej. 220: CNPJ do destinatário = CNPJ do emitente — E02-20', ['dest', 'CNPJ']);
  if (inf.transp.modFrete !== 9 && ide.indPres !== 4) add('rej. 753: modFrete ≠ 9 sem entrega a domicílio — X02-10', ['transp', 'modFrete']);
  pag.detPag.forEach((p, i) => {
    if (p.tPag === '90') add('rej. 899: tPag = 90 (sem pagamento) na NFC-e — YA02-40', ['pag', 'detPag', i, 'tPag']);
  });

  det.forEach((d, i) => {
    const at = (...p: (string | number)[]) => ['det', i, ...p];
    if (i === 0 && ide.tpAmb === 2 && d.prod.xProd !== XPROD_HOMOLOGACAO_NFCE) {
      add(`rej. 373: em homologação o xProd do 1º item deve ser "${XPROD_HOMOLOGACAO_NFCE}" — I04-10`, at('prod', 'xProd'));
    }
    const cfop = d.prod.CFOP;
    if (!(NFCE_CFOP as readonly string[]).includes(cfop)) add(`rej. 725: CFOP ${cfop} não aceito na NFC-e — I08-150`, at('prod', 'CFOP'));
    if (d.prod.indTot === 0) add('rej. 774: indTot = 0 na NFC-e — I17b-10', at('prod', 'indTot'));
    const { ICMSSN102, ICMSSN500, ICMS00 } = d.imposto.ICMS;
    if ((ICMSSN102 && !CFOP_SEM_ST.includes(cfop)) || (ICMSSN500 && !CFOP_COM_ST.includes(cfop))) {
      add(`rej. 386: CSOSN incompatível com o CFOP ${cfop} — N12a-40/N12a-44`, at('imposto', 'ICMS'));
    }
    if (ICMS00 && !CFOP_SEM_ST.includes(cfop)) add(`rej. 382: CST 00 incompatível com o CFOP ${cfop} — N12-40`, at('imposto', 'ICMS'));
  });
}

const InfNFeNumerada = z
  .object({ Id: z.string().regex(/^NFe[0-9]{6}[A-Z0-9]{12}[0-9]{26}$/), ...InfNFeShape, ide: IdeBase.merge(IdeNumeracao).strict() })
  .strict()
  .superRefine(regrasNfe);

/** A NF-e/NFC-e completa, como o Luminaris a numera (item 21: `numbersDps === false`). */
export const NfePayloadSchema = z.object({ infNFe: InfNFeNumerada }).strict();
export type NfePayload = z.infer<typeof NfePayloadSchema>;

/** A mesma nota SEM Id/cNF/nNF/cDV — o que segue para um adaptador que numera (`numbersDps === true`, item 21). */
export const NfePayloadSemNumeracaoSchema = z
  .object({ infNFe: z.object(InfNFeShape).strict().superRefine(regrasNfe) })
  .strict();
export type NfePayloadSemNumeracao = z.infer<typeof NfePayloadSemNumeracaoSchema>;
