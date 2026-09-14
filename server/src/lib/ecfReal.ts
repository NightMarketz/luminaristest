import { countRegisters, spedLine, centsToSpedDecimal, spedDate } from './sped';
import {
  buildBlockOpen,
  buildBlockClose,
  build0000,
  build0010,
  build0020,
  build0030,
  build0930,
  build9900,
  build9999,
  type BlockOpenReg,
  type BlockCloseReg,
  type Reg0000Input,
  type Reg0030Input,
  type Reg0930Signer,
} from './ecf';

/**
 * Pure serializer for the SPED Fiscal (ECF) text file — Lucro REAL
 * (ADR-INCR-SPED-ECF-FASE3: Fork 1→(b) dedicado, Fork 5→(a) trimestral, ratificados 2026-09-02;
 * BRIEF 3B `BE-INCR-SPED-ECF-FASE3B-blocos-LMN-brief.md`, Forks 2→(d) 3→(a) 4→(b) 6→(b) 7→(a),
 * ratificados 2026-09-11). Mirrors the pure-lib pattern of `ecf.ts` (Presumido) and `sped.ts`
 * (ECD): no model, no I/O, no Prisma, NO tax-computation logic. `SpedEcfRealGenerationService`
 * composes the data (READS the e-Lalur store) and calls the builders here.
 *
 * REUSO, NÃO DUPLICAÇÃO: o Bloco 0 (0000/0010/0020/0030/0930), a abertura/encerramento de bloco e o
 * Bloco 9 (9900/9999) vêm de `ecf.ts`; `spedLine`/`centsToSpedDecimal`/`spedDate`/`countRegisters` de
 * `sped.ts`. Este arquivo NÃO edita `ecf.ts` — só importa. Every register builder cites the page of
 * the Manual do Leiaute 12 its field order was transcribed from (Passo A —
 * `docs/accounting/BE-INCR-SPED-ECF-FASE3-layout-transcription-LMN.md`); nothing here is from memory.
 *
 * ── O QUE ESTE MONTADOR EMITE ──
 *  - Bloco 0 com dados: 0010 parametrizado (FORMA_TRIB/FORMA_TRIB_PER/FORMA_APUR do DTO — nenhum código
 *    de regime é literal aqui); HASH_ECF_ANTERIOR VAZIO (Fork 2→(d): Manual p.70, campo 2 "preenchido
 *    automaticamente pelo sistema", Obrigatório=Não — o PVA preenche na recuperação da ECF anterior);
 *    0000.COD_VER resolvido por ano-calendário (`codVer`, Fork 7→(a)).
 *  - Blocos C/E/J/K: marcadores vazios (recuperados pelo PVA da ECD, TIP_ESC_PRE='C').
 *  - Bloco L (Fork 6→(b)): L001(IND_DAD=0) + L030 por período + L990 — SEM L100/L300 (saldos finais
 *    "não são editáveis", recuperados do K155/K156 — pp.224/232).
 *  - Bloco M (Fork 4→(b)): M001(IND_DAD=0) SEMPRE (períodos derivam do Bloco 0, p.241) + M010 por conta
 *    da Parte B (p.237) + M030 por período (p.241) com, sob cada um, M300 (e-Lalur, p.244) e M350
 *    (e-Lacs, p.256) uma linha por ajuste, cada uma seguida dos filhos M305/M355 (Parte B, pp.250/262)
 *    e/ou M310/M360 (conta contábil, pp.252/264) conforme IND_RELACAO (REGRA_RELACAO_INEXISTENTE, p.247),
 *    M312/M362 (NUM_LCTO da ECD, pp.254/266 — filho do M310/M360) e M315/M365 (processos, pp.255/267);
 *    depois, sob o mesmo M030, M410 (+M415) por movimento da Parte B (pp.268/270), M500 por conta
 *    (p.271) e M510 por conta-padrão (p.273) — ECF Fase 3C (ADR EMENDA 2026-09-12, 3ª). A ordem
 *    intra-período é a hierárquica da p.236; o PVA confirma (BRIEF 3C §4 item 3). + M990.
 *  - Bloco N (Fork 3→(a)): N001(IND_DAD=0) + N030 por período + só as linhas `E` de N500/N630/N670 com
 *    valor informado (o PVA computa as CNA/CA — alíquota, adicional, teto da LC 224/25) + N990.
 *    Nenhuma alíquota aqui (o teste faz grep neste arquivo).
 *  - Bloco P: marcador vazio — é do Presumido, "outro regime" para o Real (p.41). Q/S/T/U/V/W/X/Y: idem.
 *  - Bloco 9: contagem em 2ª passada, auto-referente (mesma regra da ECD/Presumido).
 */

const EMPTY = '';
const EMPTY_BLOCK_CLOSE_QTD = 2; // abertura + encerramento

export interface EcfRealFiscalInput {
  /** 0010.FORMA_TRIB — dígito informado pelo caller (default '1' ratificado no DTO). */
  formaTrib: string;
  /** 0010.FORMA_TRIB_PER — 4 posições `[0RPAES]` (item 2; sem default). */
  formaTribPer: string;
  /** 0010.FORMA_APUR — 'T' (Fork 5→(a) Trimestral). */
  formaApur: 'T';
  /** 0010.IND_REC_RECEITA — '1'/'2'. */
  indRecReceita: string;
}

export interface EcfRealParamsInput {
  /** 0020.IND_ALIQ_CSLL — '1' / '4' (código da alíquota, tabela do 0020; a alíquota em si é do PVA). */
  indAliqCsll: string;
}

/** Um período de apuração (L030/M030/N030) — Fork 5→(a): T01..T04. */
export interface EcfRealPeriod {
  perApur: 'T01' | 'T02' | 'T03' | 'T04';
  dtIni: string; // ISO
  dtFin: string; // ISO
}

/**
 * Uma linha de ajuste JÁ RESOLVIDA contra o catálogo pelo serviço (BRIEF §2.3): `descricao` e
 * `tipoLancamento` vêm do fixture, nunca do caller; `codCta`/`codNat` já resolvidos de `accountId`.
 * `valorCents` ≥ 0 SEMPRE (p.244) — o serializer não escreve sinal em VALOR; a direção D/C dos filhos
 * é derivada de `tipoLancamento` (REGRA_PEA p.250 + conversão de REGRA_VALOR_DETALHADO p.246).
 */
export interface EcfRealLalurLine {
  livro: 'lalur' | 'lacs' | 'n500' | 'n630' | 'n670';
  perApur: string;
  codigo: string;
  descricao: string;
  /** M300/M350.TIPO_LANCAMENTO ∈ [A;E;P;L] (p.245) — derivado do catálogo. Ausente em N. */
  tipoLancamento?: 'A' | 'E' | 'P' | 'L';
  /** M300/M350.IND_RELACAO ∈ [1;2;3;4] (p.245). Ausente em N. */
  indRelacao?: '1' | '2' | '3' | '4';
  valorCents: number;
  hist?: string;
  /** → M305/M355.COD_CTA_B (indRelacao ∈ {1,3}). */
  codCtaB?: string;
  /** → M310/M360.COD_CTA = I050/J050.COD_CTA da ECD (p.252) (indRelacao ∈ {2,3}). */
  codCta?: string;
  /** J050.COD_NAT da conta ('01'..'04','09' — domínio de natureToCodNat/I050) — decide o sinal do M310 (p.246). */
  codNat?: string;
  /** → M312/M362.NUM_LCTO (pp.254/266) — filhos do M310/M360; ordem de entrada preservada (já ordenada pelo serviço). */
  numLctos?: string[];
  /** → M315/M365 (pp.255/267) — processos judiciais/administrativos do ajuste. */
  processos?: EcfRealProcesso[];
}

/** M315 / M365 / M415 — processo (3 campos: REG, IND_PROC, NUM_PROC). */
export interface EcfRealProcesso {
  indProc: '1' | '2';
  numProc: string;
}

/** M410 — lançamento na Parte B sem reflexo na Parte A (p.268, 8 campos). */
export interface EcfRealParteBMovement {
  perApur: string;
  codCtaB: string;
  codTributo: 'I' | 'C';
  valorCents: number; // ≥ 0
  indicador: 'CR' | 'DB' | 'PF' | 'BC';
  codCtaBCtp?: string; // COD_CTA_B_CTP — ausente com PF/BC
  hist: string;
  indLanAnt: 'S' | 'N';
  processos?: EcfRealProcesso[]; // → M415
}

/** M500 — controle de saldos de UMA conta da Parte B no período (p.271, 11 campos), já materializado. */
export interface EcfRealParteBBalance {
  perApur: string;
  codCtaB: string;
  codTributo: 'I' | 'C';
  codPbRfb: string; // agrega o M510
  descricaoPbRfb: string; // M510.DESCRICAO_PB_RFB (aba PARTEB_PADRAO)
  sdIniCents: number; indSdIni: 'D' | 'C';
  vlParteACents: number; indVlParteA: 'D' | 'C';
  vlParteBCents: number; indVlParteB: 'D' | 'C';
  sdFimCents: number; indSdFim: 'D' | 'C';
}

/** M010 — conta da Parte B (p.237, campos 2-10). */
export interface EcfRealParteBAccount {
  codCtaB: string;
  descricao: string;
  dtApLal: string; // ISO — data FINAL do período em que a conta nasceu
  codPbRfb: string;
  dtLimLal?: string; // ISO
  codTributo: 'I' | 'C';
  saldoIniCents: number; // ≥ 0, sinal em indSaldoIni (N 19 2)
  indSaldoIni: 'D' | 'C';
  cnpjSitEsp?: string;
}

export interface EcfRealFileInput {
  declarant: Reg0000Input & Reg0030Input;
  fiscal: EcfRealFiscalInput;
  params: EcfRealParamsInput;
  signers: Reg0930Signer[]; // ≥1 contador (900) + ≥1 não-contador
  periods: EcfRealPeriod[]; // T01→T04 (ordenados)
  lalur: EcfRealLalurLine[]; // vazio ⇒ M/N só com 001/010/030/990
  parteB: EcfRealParteBAccount[]; // vazio ⇒ sem M010
  /** M410 (ECF 3C) — ausente/vazio ⇒ nenhum M410. Já ordenados pelo serviço (quarter, codCtaB, createdAt, id). */
  movements?: EcfRealParteBMovement[];
  /** M500 materializado (ECF 3C) — ausente/vazio ⇒ nenhum M500/M510. */
  balances?: EcfRealParteBBalance[];
  /** 0000.COD_VER resolvido fora do serializer (Fork 7→(a), `resolveEcfCodVer`). */
  codVer: string;
}

// ─── Builders (Manual do Leiaute 12 — página na transcrição do Passo A) ───────

/**
 * L030 / M030 / N030 — Identificação dos períodos (4 campos): REG, DT_INI, DT_FIN, PER_APUR.
 * pp.221 / 241 / 277 — mesma forma do P030 do Presumido (`ecf.ts`), aqui com REG parametrizado.
 */
export function buildPeriodReg(reg: 'L030' | 'M030' | 'N030', p: EcfRealPeriod): string {
  return spedLine([reg, spedDate(p.dtIni), spedDate(p.dtFin), p.perApur]);
}

/**
 * M010 — Identificação da conta na Parte B (10 campos, p.237): REG, COD_CTA_B, DESC_CTA_LAL, DT_AP_LAL,
 * COD_PB_RFB, DT_LIM_LAL, COD_TRIBUTO, VL_SALDO_INI, IND_VL_SALDO_INI, CNPJ_SIT_ESP.
 */
export function buildM010(a: EcfRealParteBAccount): string {
  return spedLine([
    'M010',
    a.codCtaB,
    a.descricao,
    spedDate(a.dtApLal),
    a.codPbRfb,
    a.dtLimLal ? spedDate(a.dtLimLal) : EMPTY,
    a.codTributo,
    centsToSpedDecimal(a.saldoIniCents),
    a.indSaldoIni,
    a.cnpjSitEsp ?? EMPTY,
  ]);
}

/**
 * M300 (e-Lalur, p.244) / M350 (e-Lacs, p.256) — lançamento da Parte A (7 campos): REG, CODIGO,
 * DESCRICAO, TIPO_LANCAMENTO, IND_RELACAO, VALOR, HIST_LAN_LAL. VALOR é `NS` mas sempre POSITIVO
 * (p.244: negativo = "Erro no programa") — a direção vem de TIPO_LANCAMENTO.
 */
export function buildParteALine(reg: 'M300' | 'M350', l: EcfRealLalurLine): string {
  return spedLine([
    reg,
    l.codigo,
    l.descricao,
    l.tipoLancamento ?? EMPTY,
    l.indRelacao ?? EMPTY,
    centsToSpedDecimal(l.valorCents),
    l.hist ?? EMPTY,
  ]);
}

/**
 * Sinal do filho Parte B — REGRA_PEA (p.250): adição/lucro DEBITA a conta da Parte B ('D');
 * exclusão/compensação CREDITA ('C'). Erro do PVA se A com 'C' ou E/P com 'D'.
 */
export function indVlCtaParteB(tipo: 'A' | 'E' | 'P' | 'L'): 'D' | 'C' {
  return tipo === 'A' || tipo === 'L' ? 'D' : 'C';
}

/**
 * Sinal do filho conta contábil — bloco de conversão de REGRA_VALOR_DETALHADO (p.246) com VALOR
 * positivo: para A/L, conta de resultado (COD_NAT '04') ⇒ 'D', patrimonial ('01'/'02'/'03') ⇒ 'C';
 * para E/P, o inverso. COD_NAT chega com 2 chars (domínio do I050/J050; a regra escreve "4" / "1, 2 ou 3").
 */
export function indVlCtaContabil(tipo: 'A' | 'E' | 'P' | 'L', codNat: string): 'D' | 'C' {
  const resultado = codNat === '04' || codNat === '4';
  const adicao = tipo === 'A' || tipo === 'L';
  return adicao === resultado ? 'D' : 'C';
}

/** M305 (p.250) / M355 (p.262) — Conta da Parte B (4 campos): REG, COD_CTA_B, VL_CTA, IND_VL_CTA. */
export function buildParteBChild(reg: 'M305' | 'M355', l: EcfRealLalurLine): string {
  if (!l.codCtaB || !l.tipoLancamento) throw new Error(`${reg}: linha ${l.codigo} sem codCtaB/tipoLancamento`);
  return spedLine([reg, l.codCtaB, centsToSpedDecimal(l.valorCents), indVlCtaParteB(l.tipoLancamento)]);
}

/**
 * M310 (p.252) / M360 (p.264) — Conta contábil relacionada (5 campos): REG, COD_CTA, COD_CCUS (vazio —
 * sem J100 nesta fase), VL_CTA, IND_VL_CTA. 1 filho por linha — ponytail: a soma de vários filhos é
 * o mesmo invariante (REGRA_VALOR_DETALHADO); adicionar quando um ajuste precisar de mais de uma conta.
 */
export function buildContabilChild(reg: 'M310' | 'M360', l: EcfRealLalurLine): string {
  if (!l.codCta || !l.codNat || !l.tipoLancamento) throw new Error(`${reg}: linha ${l.codigo} sem codCta/codNat/tipoLancamento`);
  return spedLine([reg, l.codCta, EMPTY, centsToSpedDecimal(l.valorCents), indVlCtaContabil(l.tipoLancamento, l.codNat)]);
}

/** M312 (p.254) / M362 (p.266) — NUM_LCTO da ECD (2 campos): REG, NUM_LCTO. Filho do M310/M360 (nível 5). */
export function buildNumLctoChild(reg: 'M312' | 'M362', numLcto: string): string {
  return spedLine([reg, numLcto]);
}

/** M315 (p.255) / M365 (p.267) / M415 (p.270) — processo (3 campos): REG, IND_PROC, NUM_PROC. */
export function buildProcesso(reg: 'M315' | 'M365' | 'M415', p: EcfRealProcesso): string {
  return spedLine([reg, p.indProc, p.numProc]);
}

/**
 * M410 (p.268) — lançamento na Parte B sem reflexo na Parte A (8 campos): REG, COD_CTA_B, COD_TRIBUTO,
 * VAL_LAN_LALB_PB, IND_VAL_LAN_LALB_PB, COD_CTA_B_CTP, HIST_LAN_LALB, IND_LAN_ANT. Exemplo da p.269:
 * `|M410|101|I|1000,00|CR|202|Transferência|N|` (reproduzido byte a byte no teste — BRIEF 3C item 5).
 */
export function buildM410(m: EcfRealParteBMovement): string {
  return spedLine([
    'M410',
    m.codCtaB,
    m.codTributo,
    centsToSpedDecimal(m.valorCents),
    m.indicador,
    m.codCtaBCtp ?? EMPTY,
    m.hist,
    m.indLanAnt,
  ]);
}

/**
 * M500 (p.271) — controle de saldos da conta da Parte B (11 campos): REG, COD_CTA_B, COD_TRIBUTO,
 * SD_INI_LAL, IND_SD_INI_LAL, VL_LCTO_PARTE_A, IND_VL_LCTO_PARTE_A, VL_LCTO_PARTE_B, IND_VL_LCTO_PARTE_B,
 * SD_FIM_LAL, IND_SD_FIM_LAL. Valores são magnitudes; o sinal está no indicador.
 */
export function buildM500(b: EcfRealParteBBalance): string {
  return spedLine([
    'M500',
    b.codCtaB,
    b.codTributo,
    centsToSpedDecimal(b.sdIniCents),
    b.indSdIni,
    centsToSpedDecimal(b.vlParteACents),
    b.indVlParteA,
    centsToSpedDecimal(b.vlParteBCents),
    b.indVlParteB,
    centsToSpedDecimal(b.sdFimCents),
    b.indSdFim,
  ]);
}

/** Uma linha do M510 (agregado por COD_PB_RFB + COD_TRIBUTO). */
export interface EcfRealParteBPadraoBalance {
  perApur: string;
  codPbRfb: string;
  descricaoPbRfb: string;
  codTributo: 'I' | 'C';
  sdIniCents: number; indSdIni: 'D' | 'C';
  vlParteACents: number; indVlParteA: 'D' | 'C';
  vlParteBCents: number; indVlParteB: 'D' | 'C';
  sdFimCents: number; indSdFim: 'D' | 'C';
}

const sgn = (cents: number, ind: 'D' | 'C') => (ind === 'C' ? -cents : cents);
const mag = (v: number): { cents: number; ind: 'D' | 'C' } => (v > 0 ? { cents: v, ind: 'D' } : { cents: -v, ind: 'C' });

/**
 * M510 (p.273) = Σ do M500 por (COD_PB_RFB, COD_TRIBUTO) dentro do período (BRIEF 3C item 8). Soma com sinal
 * (D=+, C=−) e re-expressa como magnitude + indicador; zero sai 'C' (mesma convenção do serviço, D-P3.1).
 * Ordem: (codTributo, codPbRfb) — determinística.
 */
export function aggregateM510(balances: EcfRealParteBBalance[]): EcfRealParteBPadraoBalance[] {
  const acc = new Map<string, { perApur: string; codPbRfb: string; descricaoPbRfb: string; codTributo: 'I' | 'C'; sdIni: number; vlA: number; vlB: number; sdFim: number }>();
  for (const b of balances) {
    const k = `${b.codTributo}|${b.codPbRfb}`;
    const cur = acc.get(k) ?? { perApur: b.perApur, codPbRfb: b.codPbRfb, descricaoPbRfb: b.descricaoPbRfb, codTributo: b.codTributo, sdIni: 0, vlA: 0, vlB: 0, sdFim: 0 };
    cur.sdIni += sgn(b.sdIniCents, b.indSdIni);
    cur.vlA += sgn(b.vlParteACents, b.indVlParteA);
    cur.vlB += sgn(b.vlParteBCents, b.indVlParteB);
    cur.sdFim += sgn(b.sdFimCents, b.indSdFim);
    acc.set(k, cur);
  }
  return [...acc.values()]
    .sort((x, y) => x.codTributo.localeCompare(y.codTributo) || x.codPbRfb.localeCompare(y.codPbRfb))
    .map((r) => {
      const si = mag(r.sdIni), a = mag(r.vlA), pb = mag(r.vlB), sf = mag(r.sdFim);
      return {
        perApur: r.perApur, codPbRfb: r.codPbRfb, descricaoPbRfb: r.descricaoPbRfb, codTributo: r.codTributo,
        sdIniCents: si.cents, indSdIni: si.ind, vlParteACents: a.cents, indVlParteA: a.ind,
        vlParteBCents: pb.cents, indVlParteB: pb.ind, sdFimCents: sf.cents, indSdFim: sf.ind,
      };
    });
}

/**
 * M510 (p.273) — controle de saldos da conta PADRÃO (12 campos): REG, COD_PB_RFB, DESCRICAO_PB_RFB, COD_TRIBUTO,
 * SD_INI_LAL, IND_SD_INI_LAL, VL_LCTO_PARTE_A, IND_VL_LCTO_PARTE_A, VL_LCTO_PARTE_B, IND_VL_LCTO_PARTE_B,
 * SD_FIM_LAL, IND_SD_FIM_LAL.
 */
export function buildM510(b: EcfRealParteBPadraoBalance): string {
  return spedLine([
    'M510',
    b.codPbRfb,
    b.descricaoPbRfb,
    b.codTributo,
    centsToSpedDecimal(b.sdIniCents),
    b.indSdIni,
    centsToSpedDecimal(b.vlParteACents),
    b.indVlParteA,
    centsToSpedDecimal(b.vlParteBCents),
    b.indVlParteB,
    centsToSpedDecimal(b.sdFimCents),
    b.indSdFim,
  ]);
}

/**
 * N500 (p.280) / N630 (p.298) / N670 (p.307) — linha `E` informada pela PJ (4 campos): REG, CODIGO,
 * DESCRICAO, VALOR. Só linhas `E`; toda CNA/CA é do PVA (Fork 3→(a)).
 */
export function buildNLine(reg: 'N500' | 'N630' | 'N670', l: EcfRealLalurLine): string {
  return spedLine([reg, l.codigo, l.descricao, centsToSpedDecimal(l.valorCents)]);
}

// ─── Montador ────────────────────────────────────────────────────────────────

/** Ordem canônica dos blocos (Manual p. 40-41, transcrita em `ecf.ts`). */
const EMPTY_BLOCKS_BEFORE_L: Array<{ open: BlockOpenReg; close: BlockCloseReg }> = [
  { open: 'C001', close: 'C990' },
  { open: 'E001', close: 'E990' },
  { open: 'J001', close: 'J990' },
  { open: 'K001', close: 'K990' },
];
const EMPTY_BLOCKS_AFTER_N: Array<{ open: BlockOpenReg; close: BlockCloseReg }> = [
  { open: 'P001', close: 'P990' }, // Presumido — outro regime para o Real
  { open: 'Q001', close: 'Q990' },
  { open: 'S001', close: 'S990' },
  { open: 'T001', close: 'T990' },
  { open: 'U001', close: 'U990' },
  { open: 'V001', close: 'V990' },
  { open: 'W001', close: 'W990' },
  { open: 'X001', close: 'X990' },
  { open: 'Y001', close: 'Y990' },
];

function emptyBlock(open: BlockOpenReg, close: BlockCloseReg): string[] {
  return [buildBlockOpen(open, false), buildBlockClose(close, EMPTY_BLOCK_CLOSE_QTD)];
}

/** Bloco com dados: abertura IND_DAD=0 + linhas + encerramento auto-inclusivo. */
function dataBlock(open: BlockOpenReg, close: BlockCloseReg, body: string[]): string[] {
  const lines = [buildBlockOpen(open, true), ...body];
  return [...lines, buildBlockClose(close, lines.length + 1)];
}

/**
 * Filhos de uma linha da Parte A conforme IND_RELACAO (REGRA_RELACAO_INEXISTENTE, p.247), na ordem da
 * tabela de registros (p.236): M305 → M310 → M312 (filho do M310) → M315.
 */
function parteAChildren(livro: 'lalur' | 'lacs', l: EcfRealLalurLine): string[] {
  const out: string[] = [];
  const needsB = l.indRelacao === '1' || l.indRelacao === '3';
  const needsCta = l.indRelacao === '2' || l.indRelacao === '3';
  if (needsB) out.push(buildParteBChild(livro === 'lalur' ? 'M305' : 'M355', l));
  if (needsCta) {
    out.push(buildContabilChild(livro === 'lalur' ? 'M310' : 'M360', l));
    for (const n of l.numLctos ?? []) out.push(buildNumLctoChild(livro === 'lalur' ? 'M312' : 'M362', n));
  }
  for (const p of l.processos ?? []) out.push(buildProcesso(livro === 'lalur' ? 'M315' : 'M365', p));
  return out;
}

/** M410 + filhos M415 (p.270). */
function movementLines(m: EcfRealParteBMovement): string[] {
  return [buildM410(m), ...(m.processos ?? []).map((p) => buildProcesso('M415', p))];
}

/**
 * Monta a ECF do Lucro Real e resolve os contadores em 2ª passada:
 *   - encerradores de bloco = linhas do bloco (auto-inclusivo);
 *   - 9900 = uma linha por tipo de registro presente, auto-referente;
 *   - 9999 = total de linhas do arquivo.
 * Determinismo: mesma entrada (já ordenada pelo serviço) ⇒ saída byte-idêntica (sha256 no teste).
 */
export function buildEcfRealFile(input: EcfRealFileInput): string[] {
  // ── Bloco 0 (com dados) ──
  const block0: string[] = [];
  block0.push(build0000({ ...input.declarant, codVer: input.codVer }));
  block0.push(buildBlockOpen('0001', true));
  block0.push(
    build0010({
      formaTrib: input.fiscal.formaTrib,
      formaApur: input.fiscal.formaApur,
      formaTribPer: input.fiscal.formaTribPer,
      indRecReceita: input.fiscal.indRecReceita,
    }),
  );
  block0.push(build0020({ indAliqCsll: input.params.indAliqCsll }));
  block0.push(build0030(input.declarant));
  for (const s of input.signers) block0.push(build0930(s));
  block0.push(buildBlockClose('0990', block0.length + 1));

  // ── C/E/J/K (recuperados pelo PVA) ──
  const before: string[] = [];
  for (const b of EMPTY_BLOCKS_BEFORE_L) before.push(...emptyBlock(b.open, b.close));

  const byPeriod = (livro: EcfRealLalurLine['livro'], perApur: string) =>
    input.lalur.filter((l) => l.livro === livro && l.perApur === perApur);

  // ── Bloco L (Fork 6→(b)): só os períodos ──
  const blockL = dataBlock('L001', 'L990', input.periods.map((p) => buildPeriodReg('L030', p)));

  // ── Bloco M (Fork 4→(b) + 3C): M010 × contas + M030 × períodos ⊃ M300/M350 (+ filhos) → M410 → M500 → M510 ──
  const bodyM: string[] = input.parteB.map(buildM010);
  for (const p of input.periods) {
    bodyM.push(buildPeriodReg('M030', p));
    for (const l of byPeriod('lalur', p.perApur)) bodyM.push(buildParteALine('M300', l), ...parteAChildren('lalur', l));
    for (const l of byPeriod('lacs', p.perApur)) bodyM.push(buildParteALine('M350', l), ...parteAChildren('lacs', l));
    for (const m of (input.movements ?? []).filter((x) => x.perApur === p.perApur)) bodyM.push(...movementLines(m));
    const bal = (input.balances ?? []).filter((x) => x.perApur === p.perApur);
    for (const b of bal) bodyM.push(buildM500(b));
    for (const b of aggregateM510(bal)) bodyM.push(buildM510(b));
  }
  const blockM = dataBlock('M001', 'M990', bodyM);

  // ── Bloco N (Fork 3→(a)): períodos + só linhas E com valor ──
  const bodyN: string[] = [];
  for (const p of input.periods) {
    bodyN.push(buildPeriodReg('N030', p));
    for (const l of byPeriod('n500', p.perApur)) bodyN.push(buildNLine('N500', l));
    for (const l of byPeriod('n630', p.perApur)) bodyN.push(buildNLine('N630', l));
    for (const l of byPeriod('n670', p.perApur)) bodyN.push(buildNLine('N670', l));
  }
  const blockN = dataBlock('N001', 'N990', bodyN);

  // ── P/Q/S/T/U/V/W/X/Y (outros regimes / condicionais) ──
  const after: string[] = [];
  for (const b of EMPTY_BLOCKS_AFTER_N) after.push(...emptyBlock(b.open, b.close));

  // ── Bloco 9 (contagem, 2ª passada — mesma regra de `ecf.ts`/`sped.ts`) ──
  const preceding = [...block0, ...before, ...blockL, ...blockM, ...blockN, ...after];
  const nine001 = buildBlockOpen('9001', true);
  const { byRegister: counts } = countRegisters([...preceding, nine001]);
  const types = new Set<string>([...counts.keys(), '9900', '9990', '9999']);
  counts.set('9900', types.size); // uma 9900 por tipo (auto-referência)
  counts.set('9990', 1);
  counts.set('9999', 1);
  const nine900 = [...types].sort().map((t) => build9900(t, counts.get(t) ?? 0));
  const block9WithoutClosers = [nine001, ...nine900];
  const block9Total = block9WithoutClosers.length + 2; // + 9990 + 9999
  const block9: string[] = [...block9WithoutClosers, buildBlockClose('9990', block9Total)];

  const grandTotal = preceding.length + block9.length + 1; // +1 = a própria 9999
  block9.push(build9999(grandTotal));

  return [...preceding, ...block9];
}
