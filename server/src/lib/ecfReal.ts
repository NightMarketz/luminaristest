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
 *    e/ou M310/M360 (conta contábil, pp.252/264) conforme IND_RELACAO (REGRA_RELACAO_INEXISTENTE, p.247)
 *    + M990. NÃO emitidos (item 13, pendente-externa M362/M415/M510 + N-1): M312/M362, M410/M415, M500/M510.
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

/** Filhos de uma linha da Parte A conforme IND_RELACAO (REGRA_RELACAO_INEXISTENTE, p.247). */
function parteAChildren(livro: 'lalur' | 'lacs', l: EcfRealLalurLine): string[] {
  const out: string[] = [];
  const needsB = l.indRelacao === '1' || l.indRelacao === '3';
  const needsCta = l.indRelacao === '2' || l.indRelacao === '3';
  if (needsB) out.push(buildParteBChild(livro === 'lalur' ? 'M305' : 'M355', l));
  if (needsCta) out.push(buildContabilChild(livro === 'lalur' ? 'M310' : 'M360', l));
  return out;
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

  // ── Bloco M (Fork 4→(b)): M010 × contas + M030 × períodos ⊃ M300/M350 (+ filhos) ──
  const bodyM: string[] = input.parteB.map(buildM010);
  for (const p of input.periods) {
    bodyM.push(buildPeriodReg('M030', p));
    for (const l of byPeriod('lalur', p.perApur)) bodyM.push(buildParteALine('M300', l), ...parteAChildren('lalur', l));
    for (const l of byPeriod('lacs', p.perApur)) bodyM.push(buildParteALine('M350', l), ...parteAChildren('lacs', l));
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
