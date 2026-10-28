import { z } from 'zod';
import { cClassTribIbsCbs, cCredPresIbsCbs, cstIbsCbs, type CClassTribIbsCbs, type CstIbsCbs, type Ind } from '../models/ibsCbsTabelas';

/**
 * BE-INCR-NFCE (nó X10a, item 20; F-NFCE-12 b, F-NFCE-12b b) — grupo UB (`det/imposto/IS` e `det/imposto/IBSCBS`) e grupo W03
 * (`total/ISTot`, `total/IBSCBSTot`, `total/vNFTot`) da NF-e 55 / NFC-e 65, transcritos de
 * `docs/accounting/fontes-oficiais/TRANSCRICAO-NT2025002-v152-UB-2026-10-26.md` (NT 2025.002-RTC v1.52, pp. 18–30 e 39–72).
 * Todos os subgrupos do UB entram no schema (F-NFCE-12b b): base `gIBSCBS` (`gIBSUF`, `gIBSMun`, `gCBS`), `gDif`, `gDevTrib`,
 * `gRed`, `gALCZFMCBS`, `gTribRegular`, `gTribCompraGov`, monofásico (`gIBSCBSMono`, ad rem e ad valorem), `gTransfCred`,
 * `gAjusteCompet`, `gEstornoCred`, `gCredPresOper` e `gCredPresIBSZFM`.
 *
 * As regras da §7 viram `regrasIbsCbs` (chamada pelo `superRefine` do `NfePayloadDto`), com o código de rejeição na mensagem.
 * As que dependem de indicador consultam as tabelas do IT 2025.002 v1.70 (`models/ibsCbsTabelas.ts`). NÃO são aplicadas:
 *  - as marcadas "Implementação Futura" na NT (UB01–UB11 do IS, UB13-40, UB16-10, UB105a/b, W33-10, W60-05/10) — a SEFAZ
 *    também não as aplica hoje;
 *  - as que leem campo fora do leiaute transcrito (comb/pBio, cProdANP, gCompraGov, tpNFDebito, tpNFCredito, ISUFemit):
 *    UB14-30/50/60/70/80, UB88a/93a/98a/103a, UB89a/b e irmãs, UB106-31. Sem o campo, a nota do Luminaris é sempre a do caso
 *    "não informado" — daí UB66a-10 (sem ISUFemit), UB82a-30 (sem gCompraGov), UB106-30 (finNFe ≠ 6) e UB131-40 (sem
 *    tpNFCredito) recusarem o subgrupo sempre que ele vem;
 *  - as fórmulas ad valorem do monofásico (UB91c/e, UB92c, UB101c, UB102c): o texto multiplica `qBCMono` (quantidade) pela
 *    alíquota em percentual, mas o leiaute do subgrupo só tem `vBCMono` (valor) — leitura ambígua, registrada no PR.
 * Tolerância de ±0,01 onde a NT a declara; `pAliqEfet` com 4 casas, arredondada na última (UB28-10).
 */

const Money = z.string().regex(/^\d{1,13}\.\d{2}$/); // 13v2
const Pct = z.string().regex(/^\d{1,3}\.\d{2,4}$/); // 3v2-4
const Qtd = z.string().regex(/^\d{1,11}(\.\d{1,4})?$/); // 11v0-4
const Cst = z.string().regex(/^\d{3}$/);
const CClassTrib = z.string().regex(/^\d{6}$/);
const AnoMes = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/); // C 7 (AAAA-MM)

/** UB01–UB11 — Imposto Seletivo (as regras do grupo são todas "Implementação Futura"; só a forma é validada). */
export const NfeIsSchema = z
  .object({
    CSTIS: Cst, // UB02
    cClassTribIS: CClassTrib, // UB03
    vBCIS: Money.optional(), // UB05 (sequência UB04)
    pIS: Pct.optional(), // UB06
    adRemIS: Pct.optional(), // UB07
    uTrib: z.string().min(1).max(6).optional(), // UB09 (sequência UB08)
    qTrib: Qtd.optional(), // UB10
    vIS: Money.optional(), // UB11
  })
  .strict()
  .refine((g) => [g.vBCIS, g.pIS, g.vIS].every((v) => v === undefined) || [g.vBCIS, g.pIS, g.vIS].every((v) => v !== undefined), 'IS: vBCIS, pIS e vIS vêm juntos (sequência UB04)')
  .refine((g) => (g.uTrib === undefined) === (g.qTrib === undefined), 'IS: uTrib e qTrib vêm juntos (sequência UB08)');

const GDif = z.object({ pDif: Pct, vDif: Money }).strict(); // UB21/UB40/UB59
const GDevTrib = z.object({ pDevTrib: Pct.optional(), vDevTrib: Money }).strict(); // UB24/UB43/UB62
const GRed = z.object({ pRedAliq: Pct, pAliqEfet: Pct }).strict(); // UB26/UB45/UB64

const GIbsUf = z.object({ pIBSUF: Pct, gDif: GDif.optional(), gDevTrib: GDevTrib.optional(), gRed: GRed.optional(), vIBSUF: Money }).strict(); // UB17
const GIbsMun = z.object({ pIBSMun: Pct, gDif: GDif.optional(), gDevTrib: GDevTrib.optional(), gRed: GRed.optional(), vIBSMun: Money }).strict(); // UB36
const GAlcZfmCbs = z
  .object({
    tpALCZFMCBS: z.union([z.literal(1), z.literal(2)]), // UB66b
    nProcSuframa: z.string().min(8).max(12).optional(), // UB66c
    pAliqEfetRegCBS: Pct, // UB66d
    vTribRegCBS: Money, // UB66e
  })
  .strict();
const GCbs = z
  .object({ pCBS: Pct, gDif: GDif.optional(), gDevTrib: GDevTrib.optional(), gRed: GRed.optional(), gALCZFMCBS: GAlcZfmCbs.optional(), vCBS: Money })
  .strict(); // UB55
const GTribRegular = z
  .object({
    CSTReg: Cst, cClassTribReg: CClassTrib, pAliqEfetRegIBSUF: Pct, vTribRegIBSUF: Money, pAliqEfetRegIBSMun: Pct, vTribRegIBSMun: Money,
    pAliqEfetRegCBS: Pct, vTribRegCBS: Money,
  })
  .strict(); // UB68–UB72d
const GTribCompraGov = z
  .object({ pAliqIBSUF: Pct, vTribIBSUF: Money, pAliqIBSMun: Pct, vTribIBSMun: Money, pAliqCBS: Pct, vTribCBS: Money })
  .strict(); // UB82a–UB82g
const GIbsCbs = z
  .object({
    vBC: Money, // UB16
    gIBSUF: GIbsUf,
    gIBSMun: GIbsMun,
    vIBS: Money, // UB54a
    gCBS: GCbs,
    gTribRegular: GTribRegular.optional(),
    gTribCompraGov: GTribCompraGov.optional(),
  })
  .strict(); // UB15

/** Monofásico (UB84–UB105b): os quatro blocos (IBS/CBS × ad rem/ad valorem), cada um com os subgrupos padrão/retenção/retido/bio. */
const GMonoRet = (v: string) => z.object({ [v]: Money }).strict();
const GBio = (v: string) => z.object({ qBCBioComb: Qtd, [v]: Money }).strict();
const GMonoAdRem = (t: 'IBS' | 'CBS') =>
  z
    .object({
      gMonoPadrao: z.object({ qBCMono: Qtd, [`adRem${t}`]: Pct, [`v${t}Mono`]: Money }).strict().optional(),
      gMonoReten: z.object({ qBCMonoReten: Qtd, [`adRem${t}Reten`]: Pct, [`v${t}MonoReten`]: Money }).strict().optional(),
      gMonoRet: GMonoRet(`v${t}MonoRet`).optional(),
      gpBioDiferenca: GBio(`v${t}Diferenca`).optional(),
    })
    .strict();
const GIbsMonoAdValorem = z
  .object({
    gMonoPadrao: z
      .object({ vBCMono: Money, pAliqMonoUF: Pct, vIBSMonoUF: Money, pAliqMonoMun: Pct, vIBSMonoMun: Money, vIBSMono: Money })
      .strict()
      .optional(), // UB91
    gMonoReten: z.object({ vBCMonoReten: Money, pAliqMonoReten: Pct, vIBSMonoReten: Money }).strict().optional(), // UB92
    gMonoRet: GMonoRet('vIBSMonoRet').optional(), // UB93
    gpBioDiferenca: GBio('vIBSDiferenca').optional(), // UB94
  })
  .strict(); // UB90
const GCbsMonoAdValorem = z
  .object({
    gMonoPadrao: z.object({ vBCMono: Money, pAliqMonoCBS: Pct, vCBSMono: Money }).strict().optional(), // UB101
    gMonoReten: z.object({ vBCMonoReten: Money, pAliqMonoReten: Pct, vCBSMonoReten: Money }).strict().optional(), // UB102
    gMonoRet: GMonoRet('vCBSMonoRet').optional(), // UB103
    gpBioDiferenca: GBio('vCBSDiferenca').optional(), // UB104
  })
  .strict(); // UB100
const GIbsCbsMono = z
  .object({
    gIBSMonoAdRem: GMonoAdRem('IBS').optional(), // UB85a
    gIBSMonoAdValorem: GIbsMonoAdValorem.optional(), // UB90
    gCBSMonoAdRem: GMonoAdRem('CBS').optional(), // UB95a
    gCBSMonoAdValorem: GCbsMonoAdValorem.optional(), // UB100
    vTotIBSMonoItem: Money, // UB105a
    vTotCBSMonoItem: Money, // UB105b
  })
  .strict(); // UB84

const GCredPres = z
  .object({ pCredPres: Pct, vCredPres: Money.optional(), vCredPresCondSus: Money.optional() })
  .strict()
  .refine((g) => (g.vCredPres === undefined) !== (g.vCredPresCondSus === undefined), 'vCredPres ou vCredPresCondSus (escolha CE, UB125/UB126)');

export const NfeIbsCbsSchema = z
  .object({
    CST: Cst, // UB13
    cClassTrib: CClassTrib, // UB14
    indDoacao: z.literal(1).optional(), // UB14a
    gIBSCBS: GIbsCbs.optional(), // UB15 ┐
    gIBSCBSMono: GIbsCbsMono.optional(), // UB84 │ escolha da sequência UB14k
    gTransfCred: z.object({ vIBS: Money, vCBS: Money }).strict().optional(), // UB106 │
    gAjusteCompet: z.object({ competApur: AnoMes, vIBS: Money, vCBS: Money }).strict().optional(), // UB112 ┘
    gEstornoCred: z.object({ vIBSEstCred: Money, vCBSEstCred: Money }).strict().optional(), // UB116
    gCredPresOper: z
      .object({ vBCCredPres: Money, cCredPres: z.string().regex(/^\d{2}$/), gIBSCredPres: GCredPres.optional(), gCBSCredPres: GCredPres.optional() })
      .strict()
      .optional(), // UB120 ┐ escolha da sequência UB119
    gCredPresIBSZFM: z
      .object({ competApur: AnoMes, tpCredPresIBSZFM: z.number().int().min(0).max(4), vCredPresIBSZFM: Money })
      .strict()
      .optional(), // UB131 ┘
  })
  .strict()
  .refine((g) => [g.gIBSCBS, g.gIBSCBSMono, g.gTransfCred, g.gAjusteCompet].filter(Boolean).length <= 1, 'IBSCBS: um só entre gIBSCBS, gIBSCBSMono, gTransfCred e gAjusteCompet (sequência UB14k)')
  .refine((g) => !(g.gCredPresOper && g.gCredPresIBSZFM), 'IBSCBS: gCredPresOper ou gCredPresIBSZFM, não os dois (sequência UB119)');
export type NfeIbsCbs = z.infer<typeof NfeIbsCbsSchema>;

/** W31–W60 — totais do IS e do IBS/CBS. */
export const NfeIsTotSchema = z.object({ vIS: Money }).strict();
export const NfeIbsCbsTotSchema = z
  .object({
    vBCIBSCBS: Money, // W35
    gIBS: z
      .object({
        gIBSUF: z.object({ vDif: Money, vDevTrib: Money, vIBSUF: Money }).strict(), // W37
        gIBSMun: z.object({ vDif: Money, vDevTrib: Money, vIBSMun: Money }).strict(), // W42
        vIBS: Money, // W47
        vCredPres: Money, // W48
        vCredPresCondSus: Money, // W49
      })
      .strict()
      .optional(), // W36
    gCBS: z.object({ vDif: Money, vDevTrib: Money, vCBS: Money, vCredPres: Money, vCredPresCondSus: Money }).strict().optional(), // W50
    gMono: z
      .object({ vIBSMono: Money, vCBSMono: Money, vIBSMonoReten: Money, vCBSMonoReten: Money, vIBSMonoRet: Money, vCBSMonoRet: Money })
      .strict()
      .optional(), // W57
    gEstornoCred: z.object({ vIBSEstCred: Money, vCBSEstCred: Money }).strict().optional(), // W59e
  })
  .strict(); // W34
export type NfeIbsCbsTot = z.infer<typeof NfeIbsCbsTotSchema>;

/** O que `regrasIbsCbs` lê da nota — só o que as regras do UB/W03 consultam. */
export interface NotaParaRegrasIbsCbs {
  ide: { mod: 55 | 65; dhEmi: string; tpAmb: 1 | 2; finNFe: number };
  emit: { CRT: 1 | 2 | 3; enderEmit: { cMun: string } };
  dest?: { enderDest?: { cMun: string } };
  det: Array<{ prod: { NCM: string; vProd: string }; imposto: { IS?: z.infer<typeof NfeIsSchema>; IBSCBS?: NfeIbsCbs } }>;
  total: { ISTot?: { vIS: string }; IBSCBSTot?: NfeIbsCbsTot };
}

/** UB12-10, Obs. 1–3 (e BRIEF item 20): a partir de quando o grupo IBSCBS é exigido, por CRT e ambiente. */
export const IBSCBS_EXIGIDO_DESDE = { crt3Homologacao: '2026-07-01', crt3Producao: '2026-08-03', simples: '2027-01-04' } as const;

/** UB56-10 Exceção 3 / UB66a-20 — municípios da ZFM e das ALC (pares do mesmo grupo = mesma área incentivada). */
const AREAS_INCENTIVADAS: readonly (readonly string[])[] = [
  ['1302603', '1303569', '1301902'], // ZFM: Manaus, Rio Preto da Eva, Itacoatiara
  ['1304062'], // ALC 1 Tabatinga
  ['1100106'], // ALC 2 Guajará-Mirim
  ['1400100', '1400159'], // ALC 3 Boa Vista, Bonfim
  ['1600303', '1600600'], // ALC 4 Macapá, Santana
  ['1200104', '1200252', '1200203'], // ALC 5 Brasileia, Epitaciolândia, Cruzeiro do Sul
];
const mesmaAreaIncentivada = (a: string | undefined, b: string | undefined): boolean =>
  !!a && !!b && AREAS_INCENTIVADAS.some((g) => g.includes(a) && g.includes(b));
/** UB56-10 Exceção 3 Condição 01 / UB66a-20 — NCM fora da alíquota zero da ZFM/ALC. */
export function ncmForaDaAliquotaZeroZfm(ncm: string): boolean {
  const n4 = Number(ncm.slice(0, 4));
  if (ncm.startsWith('93') || ncm.startsWith('24') || (n4 >= 2203 && n4 <= 2208) || ncm.startsWith('8703')) return true;
  return ncm.startsWith('33') && !(n4 >= 3303 && n4 <= 3307);
}

/** Texto decimal → inteiro na escala dada (centavos = 2 casas; alíquota = 4 casas). */
const escala = (s: string | undefined, casas: number): number => (s ? Math.round(Number(s) * 10 ** casas) : 0);
const c = (s: string | undefined) => escala(s, 2);
/** vBC × (p% / 100) × (q% / 100) em centavos, com p e q em texto. */
const vezesPct = (baseCents: number, ...pcts: string[]): number => pcts.reduce((v, p) => (v * Number(p)) / 100, baseCents);
const difere = (informadoCents: number, calculadoCents: number): boolean => Math.abs(informadoCents - calculadoCents) > 1 + 1e-9;
/** pAliqEfet (UB28-10/UB47-10/UB66-10) em décimos de milésimo: p × (1 − pRed/100), arredondado na 4ª casa. */
const aliqEfet10k = (p: string, pRed: string): number => Math.round(Number(p) * (1 - Number(pRed) / 100) * 10_000 + 1e-9);

type Add = (message: string, path: (string | number)[]) => void;

/** As regras da §7 do grupo UB e do W03 (ver o cabeçalho para as que não se aplicam). */
export function regrasIbsCbs(nota: NotaParaRegrasIbsCbs, add: Add): void {
  const { ide, emit, det, total } = nota;
  const data = ide.dhEmi.slice(0, 10);
  const ano = Number(ide.dhEmi.slice(0, 4));
  const competEmissao = ide.dhEmi.slice(0, 7);

  // UB12-10 (rej. 1115): grupo IBSCBS exigido — CRT 3 desde 01/07 (homologação) e 03/08/2026 (produção); Simples desde 04/01/2027.
  const exigeIbsCbs =
    emit.CRT === 3
      ? data >= (ide.tpAmb === 2 ? IBSCBS_EXIGIDO_DESDE.crt3Homologacao : IBSCBS_EXIGIDO_DESDE.crt3Producao)
      : data >= IBSCBS_EXIGIDO_DESDE.simples;
  const tiposZfm = new Map<number, number>();

  det.forEach((d, i) => {
    const at = (...p: (string | number)[]) => ['det', i, 'imposto', 'IBSCBS', ...p];
    const nItem = `[nItem: ${i + 1}]`;
    const g = d.imposto.IBSCBS;
    if (!g) {
      if (exigeIbsCbs) add(`rej. 1115: grupo IBSCBS não informado ${nItem} — UB12-10`, ['det', i, 'imposto', 'IBSCBS']);
      return;
    }
    const cst: CstIbsCbs | undefined = cstIbsCbs(g.CST);
    const cc: CClassTribIbsCbs | undefined = cClassTribIbsCbs(g.cClassTrib);
    if (!cst) add(`rej. 1020: CST do IBS/CBS ${g.CST} inexistente ${nItem} — UB13-10`, at('CST'));
    if (!cc) add(`rej. 1023: cClassTrib ${g.cClassTrib} inexistente ${nItem} — UB14-10`, at('cClassTrib'));
    else {
      if (cc.cst !== g.CST) add(`rej. 1024: cClassTrib ${g.cClassTrib} incompatível com o CST ${g.CST} ${nItem} — UB14-20`, at('cClassTrib'));
      if ((ide.mod === 55 ? cc.indNFe : cc.indNFCe) === 0) add(`rej. 1025: cClassTrib ${g.cClassTrib} não permitido no modelo ${ide.mod} ${nItem} — UB14-25`, at('cClassTrib'));
    }
    if (!cst || !cc) return; // as demais regras consultam os indicadores

    const pres = (v: unknown) => v !== undefined;
    // Indicadores de CST: gIBSCBS, monofásico, transferência de crédito, diferimento, redução, ajuste, ZFM (UB13-20..45, UB112, UB131).
    if (cst.ind_gIBSCBS === 0 && g.gIBSCBS) add(`rej. 1021: grupo gIBSCBS informado indevidamente ${nItem} — UB13-20`, at('gIBSCBS'));
    if (cst.ind_gIBSCBS === 1 && !g.gIBSCBS) add(`rej. 1022: grupo gIBSCBS não informado ${nItem} — UB13-30`, at('gIBSCBS'));
    if (cst.ind_gIBSCBSMono === 0 && g.gIBSCBSMono) add(`rej. 1151: grupo gIBSCBSMono informado indevidamente ${nItem} — UB13-39`, at('gIBSCBSMono'));
    if (cst.ind_gTransfCred === 0 && g.gTransfCred) add(`rej. 1131: grupo de transferência de crédito informado indevidamente ${nItem} — UB13-44`, at('gTransfCred'));
    if (cst.ind_gTransfCred === 1 && !g.gTransfCred) add(`rej. 1132: grupo de transferência de crédito não informado ${nItem} — UB13-45`, at('gTransfCred'));
    if (cst.ind_gAjusteCompet === 0 && g.gAjusteCompet) add(`rej. 1169: grupo de ajuste de competência informado indevidamente ${nItem} — UB112-10`, at('gAjusteCompet'));
    if (ide.mod === 55 && cst.ind_gAjusteCompet === 1 && !g.gAjusteCompet) add(`rej. 1170: grupo de ajuste de competência não informado ${nItem} — UB112-20`, at('gAjusteCompet'));
    if (cc.ind_gEstornoCred === 0 && g.gEstornoCred) add(`rej. 1172: grupo de estorno de crédito informado indevidamente ${nItem} — UB116-10`, at('gEstornoCred'));
    if (ide.mod === 55 && cc.ind_gEstornoCred === 1 && !g.gEstornoCred) add(`rej. 1173: grupo de estorno de crédito não informado ${nItem} — UB116-20`, at('gEstornoCred'));
    if (cc.tpDoacao === 1 && g.indDoacao === undefined) add(`UB14a (tpDoacao = 1): indDoacao obrigatório para o cClassTrib ${g.cClassTrib} ${nItem}`, at('indDoacao'));
    if (cc.tpDoacao === 0 && g.indDoacao !== undefined) add(`UB14a (tpDoacao = 0): indDoacao não pode ser preenchido para o cClassTrib ${g.cClassTrib} ${nItem}`, at('indDoacao'));

    // gIBSCBS — base, UF, município, CBS (UB16..UB82a).
    const b = g.gIBSCBS;
    if (b) {
      const vBC = c(b.vBC);
      const tribRegular = cc.ind_gTribRegular === 1;
      const esfera = (
        nome: 'gIBSUF' | 'gIBSMun' | 'gCBS',
        p: string,
        v: string,
        sub: { gDif?: { pDif: string; vDif: string }; gDevTrib?: { pDevTrib?: string; vDevTrib: string }; gRed?: { pRedAliq: string; pAliqEfet: string } },
        cod: { dif0: string; dif1: string; vDif: string; red0: string; red1: string; pRed: string; efet: string; v: string },
        pRedTabela: number,
      ) => {
        const aq = (...p2: string[]) => at('gIBSCBS', nome, ...p2);
        if (cst.ind_gDif === 0 && sub.gDif) add(`rej. ${cod.dif0}: CST ${g.CST} não permite diferimento (${nome}/gDif) ${nItem}`, aq('gDif'));
        if (cst.ind_gDif === 1 && !sub.gDif) add(`rej. ${cod.dif1}: CST ${g.CST} obriga diferimento (${nome}/gDif) ${nItem}`, aq('gDif'));
        if (cst.ind_gRed === 0 && sub.gRed) add(`rej. ${cod.red0}: CST ${g.CST} não permite redução de alíquota (${nome}/gRed) ${nItem}`, aq('gRed'));
        if (cst.ind_gRed === 1 && !sub.gRed) add(`rej. ${cod.red1}: grupo de redução de alíquota (${nome}/gRed) não informado ${nItem}`, aq('gRed'));
        const pEfet = sub.gRed?.pAliqEfet ?? p;
        if (sub.gRed) {
          if (cst.ind_gRed === 1 && escala(sub.gRed.pRedAliq, 4) !== pRedTabela * 10_000) {
            add(`rej. ${cod.pRed}: pRedAliq ${sub.gRed.pRedAliq} não é o do cClassTrib ${g.cClassTrib} (${pRedTabela}) ${nItem}`, aq('gRed', 'pRedAliq'));
          }
          if (escala(sub.gRed.pAliqEfet, 4) !== aliqEfet10k(p, sub.gRed.pRedAliq)) {
            add(`rej. ${cod.efet}: pAliqEfet ≠ ${nome === 'gCBS' ? 'pCBS' : nome === 'gIBSUF' ? 'pIBSUF' : 'pIBSMun'} × (1 − pRedAliq/100) ${nItem}`, aq('gRed', 'pAliqEfet'));
          }
        }
        if (sub.gDif && difere(c(sub.gDif.vDif), vezesPct(vBC, pEfet, sub.gDif.pDif))) add(`rej. ${cod.vDif}: vDif difere do calculado (${nome}) ${nItem}`, aq('gDif', 'vDif'));
        const vCalc = vezesPct(vBC, pEfet) - c(sub.gDif?.vDif) - c(sub.gDevTrib?.vDevTrib);
        if (difere(c(v), vCalc)) add(`rej. ${cod.v}: valor de ${nome} difere do calculado ${nItem}`, aq());
      };

      // Devolução de tributos (UB24-10, UB43-10, UB62-10, UB62a-10, UB63-10).
      if (b.gIBSUF.gDevTrib) add(`rej. 1111: grupo de devolução do IBS da UF informado indevidamente ${nItem} — UB24-10`, at('gIBSCBS', 'gIBSUF', 'gDevTrib'));
      if (b.gIBSMun.gDevTrib) add(`rej. 1112: grupo de devolução do IBS do município informado indevidamente ${nItem} — UB43-10`, at('gIBSCBS', 'gIBSMun', 'gDevTrib'));
      const devCbs = b.gCBS.gDevTrib;
      if (devCbs && ide.mod === 65) add(`rej. 1187: grupo de devolução da CBS informado indevidamente na NFC-e ${nItem} — UB62-10`, at('gIBSCBS', 'gCBS', 'gDevTrib'));
      if (devCbs && ide.mod === 55) {
        if (!devCbs.pDevTrib) add(`rej. 1188: percentual de devolução da CBS não informado ${nItem} — UB62a-10`, at('gIBSCBS', 'gCBS', 'gDevTrib'));
        else if (difere(c(devCbs.vDevTrib), vezesPct(vBC, b.gCBS.gRed?.pAliqEfet ?? b.gCBS.pCBS, devCbs.pDevTrib))) {
          add(`rej. 1189: valor da CBS devolvida difere do calculado ${nItem} — UB63-10`, at('gIBSCBS', 'gCBS', 'gDevTrib', 'vDevTrib'));
        }
      }

      // Alíquotas vigentes (UB18-10, UB37-10, UB56-10/20). Tributação regular ⇒ zero; ZFM/ALC ⇒ CBS zero.
      const alc = b.gCBS.gALCZFMCBS;
      const p10k = (s: string) => escala(s, 4);
      if (ano <= 2028) {
        const uf = tribRegular ? 0 : ano <= 2026 ? 1_000 : 500;
        const mun = tribRegular ? 0 : ano <= 2026 ? 0 : 500;
        if (p10k(b.gIBSUF.pIBSUF) !== uf) add(`rej. 1026: alíquota do IBS da UF inválida (esperado ${uf / 10_000}%) ${nItem} — UB18-10`, at('gIBSCBS', 'gIBSUF', 'pIBSUF'));
        if (p10k(b.gIBSMun.pIBSMun) !== mun) add(`rej. 1036: alíquota do IBS do município inválida (esperado ${mun / 10_000}%) ${nItem} — UB37-10`, at('gIBSCBS', 'gIBSMun', 'pIBSMun'));
      }
      const pCbs = p10k(b.gCBS.pCBS);
      const zeroZfm = !ncmForaDaAliquotaZeroZfm(d.prod.NCM) && mesmaAreaIncentivada(emit.enderEmit.cMun, nota.dest?.enderDest?.cMun);
      if (ano <= 2026) {
        const ok = tribRegular ? pCbs === 0 : pCbs === 9_000 || (pCbs === 0 && zeroZfm);
        if (!ok) add(`rej. 1037: alíquota da CBS inválida (0,9% em 2026; zero só na tributação regular ou na ZFM/ALC) ${nItem} — UB56-10`, at('gIBSCBS', 'gCBS', 'pCBS'));
      } else if ((tribRegular || alc) && pCbs !== 0) {
        add(`rej. 1037: alíquota da CBS deve ser zero com tributação regular ou gALCZFMCBS ${nItem} — UB56-20`, at('gIBSCBS', 'gCBS', 'pCBS'));
      }

      esfera('gIBSUF', b.gIBSUF.pIBSUF, b.gIBSUF.vIBSUF, b.gIBSUF, { dif0: '1029', dif1: '1030', vDif: '1031', red0: '1032', red1: '1033', pRed: '1034', efet: '1035', v: '1041' }, cc.pRedIBS);
      esfera('gIBSMun', b.gIBSMun.pIBSMun, b.gIBSMun.vIBSMun, b.gIBSMun, { dif0: '1083', dif1: '1044', vDif: '1045', red0: '1007', red1: '1074', pRed: '1046', efet: '1047', v: '1052' }, cc.pRedIBS);
      esfera('gCBS', b.gCBS.pCBS, b.gCBS.vCBS, b.gCBS, { dif0: '1090', dif1: '1061', vDif: '1062', red0: '1028', red1: '1079', pRed: '1063', efet: '1064', v: '1069' }, cc.pRedCBS);

      // UB54a-10 (rej. 1150): vIBS = vIBSUF + vIBSMun − vCredPres (se indDeduzCredPres = 1).
      const cp = g.gCredPresOper;
      const deduz = cp && cCredPresIbsCbs(cp.cCredPres)?.indDeduzCredPres === 1 ? c(cp.gIBSCredPres?.vCredPres) : 0;
      if (c(b.vIBS) !== c(b.gIBSUF.vIBSUF) + c(b.gIBSMun.vIBSMun) - deduz) add(`rej. 1150: vIBS do item difere de vIBSUF + vIBSMun − vCredPres ${nItem} — UB54a-10`, at('gIBSCBS', 'vIBS'));

      // gALCZFMCBS (UB66a-10/20, UB66c-10, UB66e-10).
      if (alc) {
        const aq = (...p2: string[]) => at('gIBSCBS', 'gCBS', 'gALCZFMCBS', ...p2);
        add(`rej. 1190: inscrição do emitente na Suframa não informada (ISUFemit fora do leiaute transcrito) ${nItem} — UB66a-10`, aq());
        if (!zeroZfm) add(`rej. 1191: gALCZFMCBS não permitido (NCM fora da alíquota zero ou emitente/destinatário fora da mesma área incentivada) ${nItem} — UB66a-20`, aq());
        if (alc.tpALCZFMCBS === 2 && (!alc.nProcSuframa || /^0+$/.test(alc.nProcSuframa))) add(`rej. 1192: número do processo na Suframa não informado ${nItem} — UB66c-10`, aq('nProcSuframa'));
        if (difere(c(alc.vTribRegCBS), vezesPct(vBC, alc.pAliqEfetRegCBS))) add(`rej. 1218: vTribRegCBS difere do calculado ${nItem} — UB66e-10`, aq('vTribRegCBS'));
      }

      // gTribRegular (UB68-10/11, UB69-10, UB70-10, UB72/72b/72d-10).
      const tr = b.gTribRegular;
      if (tribRegular && !tr) add(`rej. 1065: cClassTrib ${g.cClassTrib} obriga a tributação regular ${nItem} — UB68-10`, at('gIBSCBS', 'gTribRegular'));
      if (!tribRegular && tr) add(`rej. 1114: cClassTrib ${g.cClassTrib} não permite a tributação regular ${nItem} — UB68-11`, at('gIBSCBS', 'gTribRegular'));
      if (tr) {
        const aq = (...p2: string[]) => at('gIBSCBS', 'gTribRegular', ...p2);
        if (!cstIbsCbs(tr.CSTReg)) add(`rej. 1066: CSTReg ${tr.CSTReg} inexistente ${nItem} — UB69-10`, aq('CSTReg'));
        if (!cClassTribIbsCbs(tr.cClassTribReg)) add(`rej. 1067: cClassTribReg ${tr.cClassTribReg} inexistente ${nItem} — UB70-10`, aq('cClassTribReg'));
        if (difere(c(tr.vTribRegIBSUF), vezesPct(vBC, tr.pAliqEfetRegIBSUF))) add(`rej. 1040: vTribRegIBSUF difere do calculado ${nItem} — UB72-10`, aq('vTribRegIBSUF'));
        if (difere(c(tr.vTribRegIBSMun), vezesPct(vBC, tr.pAliqEfetRegIBSMun))) add(`rej. 1051: vTribRegIBSMun difere do calculado ${nItem} — UB72b-10`, aq('vTribRegIBSMun'));
        if (difere(c(tr.vTribRegCBS), vezesPct(vBC, tr.pAliqEfetRegCBS))) add(`rej. 1068: vTribRegCBS difere do calculado ${nItem} — UB72d-10`, aq('vTribRegCBS'));
      }

      // UB82a-30 (rej. 1144): gTribCompraGov sem gCompraGov — o grupo de compra governamental (ide) não está no leiaute transcrito.
      if (ide.mod === 55 && b.gTribCompraGov) add(`rej. 1144: gTribCompraGov informado sem compra governamental (gCompraGov) ${nItem} — UB82a-30`, at('gIBSCBS', 'gTribCompraGov'));
    }

    // Monofásico (UB85a..UB104, por ano e pelos indicadores do cClassTrib).
    const m = g.gIBSCBSMono;
    if (m) {
      const aq = (...p2: string[]) => at('gIBSCBSMono', ...p2);
      const algumMono = cc.ind_gMonoPadrao === 1 || cc.ind_gMonoReten === 1 || cc.ind_gMonoRet === 1 || cc.ind_gpBioDiferenca === 1;
      const ibsAdRem = ano > 2028;
      const cbsAdRem = ano > 2026;
      const anual: Array<[boolean, unknown, string, string, string]> = [
        [!ibsAdRem, m.gIBSMonoAdRem, '1219', 'UB85a-10', 'gIBSMonoAdRem informado indevidamente'],
        [ibsAdRem, m.gIBSMonoAdValorem, '1228', 'UB90-10', 'gIBSMonoAdValorem informado indevidamente'],
        [!cbsAdRem, m.gCBSMonoAdRem, '1245', 'UB95a-10', 'gCBSMonoAdRem informado indevidamente'],
        [cbsAdRem, m.gCBSMonoAdValorem, '1258', 'UB100-10', 'gCBSMonoAdValorem informado indevidamente'],
      ];
      for (const [vedado, grupo, cod, id, msg] of anual) if (vedado && grupo) add(`rej. ${cod}: ${msg} no ano ${ano} ${nItem} — ${id}`, aq());
      const exigidos: Array<[boolean, unknown, string, string, string]> = [
        [ibsAdRem, m.gIBSMonoAdRem, '1220', 'UB85a-20', 'gIBSMonoAdRem'],
        [!ibsAdRem, m.gIBSMonoAdValorem, '1229', 'UB90-20', 'gIBSMonoAdValorem'],
        [cbsAdRem, m.gCBSMonoAdRem, '1246', 'UB95a-20', 'gCBSMonoAdRem'],
        [!cbsAdRem, m.gCBSMonoAdValorem, '1259', 'UB100-20', 'gCBSMonoAdValorem'],
      ];
      for (const [vale, grupo, cod, id, nome] of exigidos) if (algumMono && vale && !grupo) add(`rej. ${cod}: não informado ${nome} ${nItem} — ${id}`, aq());

      // Subgrupos de cada bloco × indicador (UB86..UB89, UB91..UB94, UB96..UB99, UB101..UB104): "-10" falta, "-20" indevido.
      type Bloco = { gMonoPadrao?: unknown; gMonoReten?: unknown; gMonoRet?: unknown; gpBioDiferenca?: unknown } | undefined;
      const blocos: Array<[Bloco, string, number]> = [
        [m.gIBSMonoAdRem, 'gIBSMonoAdRem', 86],
        [m.gIBSMonoAdValorem, 'gIBSMonoAdValorem', 91],
        [m.gCBSMonoAdRem, 'gCBSMonoAdRem', 96],
        [m.gCBSMonoAdValorem, 'gCBSMonoAdValorem', 101],
      ];
      const CODIGOS: Record<number, [string, string]> = {
        86: ['1125', '1126'], 87: ['1127', '1128'], 88: ['1108', '1109'], 89: ['1224', '1225'],
        91: ['1230', '1231'], 92: ['1235', '1236'], 93: ['1238', '1239'], 94: ['1241', '1242'],
        96: ['1247', '1248'], 97: ['1250', '1251'], 98: ['1253', '1254'], 99: ['1148', '1149'],
        101: ['1260', '1261'], 102: ['1263', '1264'], 103: ['1266', '1267'], 104: ['1269', '1270'],
      };
      for (const [bloco, nome, id0] of blocos) {
        if (!bloco) continue;
        const subs: Array<[keyof NonNullable<Bloco>, Ind]> = [
          ['gMonoPadrao', cc.ind_gMonoPadrao], ['gMonoReten', cc.ind_gMonoReten], ['gMonoRet', cc.ind_gMonoRet], ['gpBioDiferenca', cc.ind_gpBioDiferenca],
        ];
        subs.forEach(([sub, ind], k) => {
          const id = id0 + k;
          const [falta, indevido] = CODIGOS[id];
          if (ind === 1 && !pres(bloco[sub])) add(`rej. ${falta}: ${nome}/${sub} não informado ${nItem} — UB${id}-10`, aq(nome, sub));
          if (ind === 0 && pres(bloco[sub])) add(`rej. ${indevido}: ${nome}/${sub} informado indevidamente ${nItem} — UB${id}-20`, aq(nome, sub));
        });
      }
      // Ad rem: v = q × adRem (UB86c, UB87c, UB96c, UB97c); ad valorem estadual + municipal (UB91f).
      const adRem = (q: string, a: string) => Math.round(Number(q) * Number(a) * 100);
      const checaAdRem = (t: 'IBS' | 'CBS', bloco: z.infer<ReturnType<typeof GMonoAdRem>> | undefined, codP: string, idP: string, codR: string, idR: string) => {
        const p = bloco?.gMonoPadrao as Record<string, string> | undefined;
        if (p && difere(c(p[`v${t}Mono`]), adRem(p.qBCMono, p[`adRem${t}`]))) add(`rej. ${codP}: v${t}Mono ad rem difere de qBCMono × adRem${t} ${nItem} — ${idP}`, aq(`g${t}MonoAdRem`, 'gMonoPadrao'));
        const r = bloco?.gMonoReten as Record<string, string> | undefined;
        if (r && difere(c(r[`v${t}MonoReten`]), adRem(r.qBCMonoReten, r[`adRem${t}Reten`]))) add(`rej. ${codR}: v${t}MonoReten ad rem difere de qBCMonoReten × adRem${t}Reten ${nItem} — ${idR}`, aq(`g${t}MonoAdRem`, 'gMonoReten'));
      };
      checaAdRem('IBS', m.gIBSMonoAdRem, '1221', 'UB86c-10', '1222', 'UB87c-10');
      checaAdRem('CBS', m.gCBSMonoAdRem, '1249', 'UB96c-10', '1252', 'UB97c-10');
      const mp = m.gIBSMonoAdValorem?.gMonoPadrao;
      if (mp && c(mp.vIBSMono) !== c(mp.vIBSMonoUF) + c(mp.vIBSMonoMun)) add(`rej. 1234: vIBSMono ad valorem ≠ vIBSMonoUF + vIBSMonoMun ${nItem} — UB91f-10`, aq('gIBSMonoAdValorem', 'gMonoPadrao', 'vIBSMono'));
    }

    // gTransfCred (UB106-30, UB106-40) — só na 55; a nota do Luminaris é sempre finNFe = 1.
    if (g.gTransfCred && ide.mod === 55) {
      if (ide.finNFe !== 6) add(`rej. 1133: gTransfCred exige finNFe = 6 (nota de débito) ${nItem} — UB106-30`, at('gTransfCred'));
      if (c(g.gTransfCred.vIBS) <= 0 && c(g.gTransfCred.vCBS) <= 0) add(`rej. 1129: vIBS ou vCBS deve ser maior que zero na transferência de crédito ${nItem} — UB106-40`, at('gTransfCred'));
    }
    // gAjusteCompet (UB112-30) e gEstornoCred (UB116-30).
    if (g.gAjusteCompet && ide.mod === 55 && c(g.gAjusteCompet.vIBS) <= 0 && c(g.gAjusteCompet.vCBS) <= 0) {
      add(`rej. 1171: vIBS ou vCBS deve ser maior que zero no ajuste de competência ${nItem} — UB112-30`, at('gAjusteCompet'));
    }
    if (g.gEstornoCred && ide.mod === 55 && c(g.gEstornoCred.vIBSEstCred) <= 0 && c(g.gEstornoCred.vCBSEstCred) <= 0) {
      add(`rej. 1174: vIBS ou vCBS deve ser maior que zero no estorno de crédito ${nItem} — UB116-30`, at('gEstornoCred'));
    }

    // gCredPresOper (UB120-10/20, UB122-10, UB123-10/20, UB125-10, UB126-10, UB127-10/20, UB129-10, UB130-10).
    const cp = g.gCredPresOper;
    if (cp) {
      const aq = (...p2: string[]) => at('gCredPresOper', ...p2);
      if (ide.mod === 65) add(`rej. 1049: crédito presumido não permitido na NFC-e ${nItem} — UB120-10`, aq());
      else {
        if (cc.ind_gCredPresOper === 0) add(`rej. 1175: cClassTrib ${g.cClassTrib} não permite crédito presumido na operação ${nItem} — UB120-20`, aq());
        const tab = cCredPresIbsCbs(cp.cCredPres);
        if (!tab) add(`rej. 1055: cCredPres ${cp.cCredPres} inexistente ${nItem} — UB122-10`, aq('cCredPres'));
        else {
          if (tab.ind_gIBSCredPres !== 1 && cp.gIBSCredPres) add(`rej. 1053: crédito presumido do IBS informado indevidamente ${nItem} — UB123-10`, aq('gIBSCredPres'));
          if (tab.ind_gIBSCredPres === 1 && !cp.gIBSCredPres) add(`rej. 1054: crédito presumido do IBS não informado ${nItem} — UB123-20`, aq('gIBSCredPres'));
          if (tab.ind_gCBSCredPres !== 1 && cp.gCBSCredPres) add(`rej. 1050: crédito presumido da CBS informado indevidamente ${nItem} — UB127-10`, aq('gCBSCredPres'));
          if (tab.ind_gCBSCredPres === 1 && !cp.gCBSCredPres) add(`rej. 1058: crédito presumido da CBS não informado ${nItem} — UB127-20`, aq('gCBSCredPres'));
        }
        const vProd = c(d.prod.vProd);
        const brecho = cp.cCredPres === '04';
        if (brecho && cp.gIBSCredPres?.vCredPres && c(cp.gIBSCredPres.vCredPres) > vProd) add(`rej. 1107: vCredPres do IBS superior a vProd ${nItem} — UB125-10`, aq('gIBSCredPres'));
        if (brecho && cp.gCBSCredPres?.vCredPres && c(cp.gCBSCredPres.vCredPres) > vProd) add(`rej. 1124: vCredPres da CBS superior a vProd ${nItem} — UB129-10`, aq('gCBSCredPres'));
        if (cp.gIBSCredPres?.vCredPresCondSus && (ano < 2033 || !brecho)) add(`rej. 1056: vCredPresCondSus do IBS informado indevidamente ${nItem} — UB126-10`, aq('gIBSCredPres'));
        if (cp.gCBSCredPres?.vCredPresCondSus && (ano < 2027 || !brecho)) add(`rej. 1060: vCredPresCondSus da CBS informado indevidamente ${nItem} — UB130-10`, aq('gCBSCredPres'));
      }
    }

    // gCredPresIBSZFM (UB131-10/20/30/40, UB132-10, UB133-10).
    const zfm = g.gCredPresIBSZFM;
    if (zfm && ide.mod === 65) add(`rej. 1138: crédito presumido ZFM não permitido na NFC-e ${nItem} — UB131-10`, at('gCredPresIBSZFM'));
    if (ide.mod === 55) {
      if (cst.ind_gCredPresIBSZFM === 0 && zfm) add(`rej. 1134: CST ${g.CST} não permite gCredPresIBSZFM ${nItem} — UB131-20`, at('gCredPresIBSZFM'));
      if (cst.ind_gCredPresIBSZFM === 1 && !zfm) add(`rej. 1135: CST ${g.CST} exige gCredPresIBSZFM ${nItem} — UB131-30`, at('gCredPresIBSZFM'));
      if (zfm) {
        add(`rej. 1158: gCredPresIBSZFM exige tpNFCredito = 02 (fora do leiaute transcrito) ${nItem} — UB131-40`, at('gCredPresIBSZFM'));
        if (zfm.competApur > competEmissao) add(`rej. 1160: competApur ${zfm.competApur} superior ao mês da emissão ${nItem} — UB132-10`, at('gCredPresIBSZFM', 'competApur'));
        const n = (tiposZfm.get(zfm.tpCredPresIBSZFM) ?? 0) + 1;
        tiposZfm.set(zfm.tpCredPresIBSZFM, n);
        if (n === 2) add(`rej. 1136: tpCredPresIBSZFM ${zfm.tpCredPresIBSZFM} repetido entre itens ${nItem} — UB133-10`, at('gCredPresIBSZFM', 'tpCredPresIBSZFM'));
      }
    }
  });

  // W03 — totais (W31-10/20, W34-10/20, W35..W59g).
  const comIs = det.some((d) => d.imposto.IS);
  if (total.ISTot && !comIs) add('rej. 1073: total de IS informado sem item com Imposto Seletivo — W31-10', ['total', 'ISTot']);
  if (!total.ISTot && comIs) add('rej. 1117: total de IS não informado — W31-20', ['total']);
  const comIbsCbs = det.some((d) => d.imposto.IBSCBS);
  const t = total.IBSCBSTot;
  if (t && !comIbsCbs) add('rej. 1118: total de IBS e CBS informado sem item com IBSCBS — W34-10', ['total', 'IBSCBSTot']);
  if (!t && comIbsCbs) add('rej. 1119: total de IBS e CBS não informado — W34-20', ['total']);
  if (!t) return;
  const soma = (f: (g: NfeIbsCbs) => string | undefined) => det.reduce((s, d) => s + (d.imposto.IBSCBS ? c(f(d.imposto.IBSCBS)) : 0), 0);
  const confere = (informado: string | undefined, f: (g: NfeIbsCbs) => string | undefined, cod: string, id: string, nome: string, path: string[]) => {
    if (c(informado) !== soma(f)) add(`rej. ${cod}: ${nome} difere da soma dos itens — ${id}`, ['total', 'IBSCBSTot', ...path]);
  };
  confere(t.vBCIBSCBS, (g) => g.gIBSCBS?.vBC, '1076', 'W35-10', 'vBCIBSCBS', ['vBCIBSCBS']);
  const gi = t.gIBS;
  confere(gi?.gIBSUF.vDif, (g) => g.gIBSCBS?.gIBSUF.gDif?.vDif, '1077', 'W38-10', 'vDif do IBS UF', ['gIBS', 'gIBSUF', 'vDif']);
  confere(gi?.gIBSUF.vDevTrib, (g) => g.gIBSCBS?.gIBSUF.gDevTrib?.vDevTrib, '1078', 'W39-10', 'vDevTrib do IBS UF', ['gIBS', 'gIBSUF', 'vDevTrib']);
  confere(gi?.gIBSUF.vIBSUF, (g) => g.gIBSCBS?.gIBSUF.vIBSUF, '1080', 'W41-10', 'vIBSUF', ['gIBS', 'gIBSUF', 'vIBSUF']);
  confere(gi?.gIBSMun.vDif, (g) => g.gIBSCBS?.gIBSMun.gDif?.vDif, '1081', 'W43-10', 'vDif do IBS municipal', ['gIBS', 'gIBSMun', 'vDif']);
  confere(gi?.gIBSMun.vDevTrib, (g) => g.gIBSCBS?.gIBSMun.gDevTrib?.vDevTrib, '1082', 'W44-10', 'vDevTrib do IBS municipal', ['gIBS', 'gIBSMun', 'vDevTrib']);
  confere(gi?.gIBSMun.vIBSMun, (g) => g.gIBSCBS?.gIBSMun.vIBSMun, '1084', 'W46-10', 'vIBSMun', ['gIBS', 'gIBSMun', 'vIBSMun']);
  confere(gi?.vIBS, (g) => g.gIBSCBS?.vIBS, '1085', 'W47-10', 'vIBS', ['gIBS', 'vIBS']);
  confere(gi?.vCredPres, (g) => g.gCredPresOper?.gIBSCredPres?.vCredPres, '1086', 'W48-10', 'vCredPres do IBS', ['gIBS', 'vCredPres']);
  const gc = t.gCBS;
  confere(gc?.vDif, (g) => g.gIBSCBS?.gCBS.gDif?.vDif, '1088', 'W53-10', 'vDif da CBS', ['gCBS', 'vDif']);
  confere(gc?.vDevTrib, (g) => g.gIBSCBS?.gCBS.gDevTrib?.vDevTrib, '1089', 'W54-10', 'vDevTrib da CBS', ['gCBS', 'vDevTrib']);
  confere(gc?.vCBS, (g) => g.gIBSCBS?.gCBS.vCBS, '1091', 'W56-10', 'vCBS', ['gCBS', 'vCBS']);
  confere(gc?.vCredPres, (g) => g.gCredPresOper?.gCBSCredPres?.vCredPres, '1087', 'W56a-10', 'vCredPres da CBS', ['gCBS', 'vCredPres']);
  const mo = t.gMono;
  const mono = (g: NfeIbsCbs) => g.gIBSCBSMono;
  const ibsMono = (g: NfeIbsCbs, k: 'gMonoPadrao' | 'gMonoReten' | 'gMonoRet', v: string) =>
    (mono(g)?.gIBSMonoAdRem?.[k] as Record<string, string> | undefined)?.[v] ?? (mono(g)?.gIBSMonoAdValorem?.[k] as Record<string, string> | undefined)?.[v];
  const cbsMono = (g: NfeIbsCbs, k: 'gMonoPadrao' | 'gMonoReten' | 'gMonoRet', v: string) =>
    (mono(g)?.gCBSMonoAdRem?.[k] as Record<string, string> | undefined)?.[v] ?? (mono(g)?.gCBSMonoAdValorem?.[k] as Record<string, string> | undefined)?.[v];
  if (mo || det.some((d) => d.imposto.IBSCBS?.gIBSCBSMono)) {
    confere(mo?.vIBSMono, (g) => ibsMono(g, 'gMonoPadrao', 'vIBSMono'), '1092', 'W58-10', 'vIBSMono', ['gMono', 'vIBSMono']);
    confere(mo?.vCBSMono, (g) => cbsMono(g, 'gMonoPadrao', 'vCBSMono'), '1093', 'W59-10', 'vCBSMono', ['gMono', 'vCBSMono']);
    confere(mo?.vIBSMonoReten, (g) => ibsMono(g, 'gMonoReten', 'vIBSMonoReten'), '1120', 'W59a-10', 'vIBSMonoReten', ['gMono', 'vIBSMonoReten']);
    confere(mo?.vCBSMonoReten, (g) => cbsMono(g, 'gMonoReten', 'vCBSMonoReten'), '1121', 'W59b-10', 'vCBSMonoReten', ['gMono', 'vCBSMonoReten']);
    confere(mo?.vIBSMonoRet, (g) => ibsMono(g, 'gMonoRet', 'vIBSMonoRet'), '1122', 'W59c-10', 'vIBSMonoRet', ['gMono', 'vIBSMonoRet']);
    confere(mo?.vCBSMonoRet, (g) => cbsMono(g, 'gMonoRet', 'vCBSMonoRet'), '1123', 'W59d-10', 'vCBSMonoRet', ['gMono', 'vCBSMonoRet']);
  }
  const est = t.gEstornoCred;
  confere(est?.vIBSEstCred, (g) => g.gEstornoCred?.vIBSEstCred, '1176', 'W59f-10', 'vIBSEstCred', ['gEstornoCred', 'vIBSEstCred']);
  confere(est?.vCBSEstCred, (g) => g.gEstornoCred?.vCBSEstCred, '1177', 'W59g-10', 'vCBSEstCred', ['gEstornoCred', 'vCBSEstCred']);
}
