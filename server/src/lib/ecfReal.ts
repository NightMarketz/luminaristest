import { countRegisters } from './sped';
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
 * Pure serializer for the SPED Fiscal (ECF) text file — Lucro REAL, esqueleto
 * (ADR-INCR-SPED-ECF-FASE3, Fork 1→(b) dedicado + Fork 5→(a) trimestral, ratificados
 * 2026-09-02). Mirrors the pure-lib pattern of `ecf.ts` (Presumido) and `sped.ts` (ECD): no
 * model, no I/O, no Prisma, NO tax-computation logic. `SpedEcfRealGenerationService` composes
 * the data and calls the builders here.
 *
 * REUSO, NÃO DUPLICAÇÃO (BRIEF item 2): o Bloco 0 (0000/0010/0020/0030/0930), a abertura/
 * encerramento de bloco e o Bloco 9 (9900/9999) são comuns aos dois regimes e vêm de `ecf.ts`;
 * `spedLine`/`centsToSpedDecimal`/`spedDate`/`countRegisters` de `sped.ts`. Este arquivo NÃO
 * edita `ecf.ts` — só importa. O que é próprio do Real é o MONTADOR (`buildEcfRealFile`): a
 * lista de blocos e o que cada um carrega.
 *
 * ── O QUE ESTE ESQUELETO EMITE ──
 *  - Bloco 0 com dados: 0010 parametrizado (FORMA_TRIB/FORMA_TRIB_PER/FORMA_APUR vêm do DTO,
 *    nenhum código de regime é literal aqui); HASH_ECF_ANTERIOR vazio (Fork 2 pendente — mesmo
 *    comportamento do Presumido, `ecf.ts` build0010).
 *  - Blocos C/E/J/K: marcadores vazios (recuperados pelo PVA da ECD, TIP_ESC_PRE='C' — mesma
 *    regra do Presumido).
 *  - Blocos L/M/N: marcadores vazios. // Fase 3 — conteúdo pendente do Manual do Leiaute 12
 *    (Forks 2/3/4). Nenhuma alíquota, adicional ou percentual é hardcoded (BRIEF item 7,
 *    disciplina) — os builders L100/L300/M010/M300/M350/M500/N5xx-N6xx só serão escritos
 *    citando a página do Manual (lição I052).
 *  - Bloco P: marcador vazio — é do Presumido, "outro regime" para o Real (regra "todos os
 *    blocos obrigatórios", Manual p. 41, citada em `ecf.ts`).
 *  - Blocos Q/S/T/U/V/W/X/Y: marcadores vazios (outros regimes/condicionais — idem Presumido,
 *    inclusive a decisão sobre S001 registrada em `ecf.ts`).
 *  - Bloco 9: contagem em 2ª passada, auto-referente (mesma regra da ECD/Presumido).
 *
 * Os dados por trimestre (`EcfRealQuarter`) chegam do serviço (BP/DRE via
 * `AccountingReportService`, BRIEF item 5) e AINDA NÃO são emitidos — o leiaute campo a campo
 * de L100/L300 não está transcrito (ADR §5 item 2). Eles existem no contrato para que o
 * caminho serviço→serializer esteja ligado; nenhum valor deles entra no arquivo.
 */

const EMPTY_BLOCK_CLOSE_QTD = 2; // abertura + encerramento

export interface EcfRealFiscalInput {
  /** 0010.FORMA_TRIB — dígito informado pelo caller (sem default; BRIEF §4 item 6). */
  formaTrib: string;
  /** 0010.FORMA_TRIB_PER — 4 posições informadas pelo caller (sem default; ver DTO). */
  formaTribPer: string;
  /** 0010.FORMA_APUR — 'T' (Fork 5→(a) Trimestral). */
  formaApur: 'T';
  /** 0010.IND_REC_RECEITA — '1'/'2'. */
  indRecReceita: string;
}

export interface EcfRealParamsInput {
  /** 0020.IND_ALIQ_CSLL — '1' (9%) / '4' (15%). */
  indAliqCsll: string;
}

/**
 * Apuração trimestral (Fork 5→(a)): uma janela T01..T04 + as fontes candidatas de L100
 * (balanço, `balanceSheet`) e L300 (DRE, `incomeStatement`) — ADR §1. NÃO emitidos ainda.
 */
export interface EcfRealQuarter {
  perApur: string; // 'T01'..'T04'
  dtIni: string; // ISO
  dtFin: string; // ISO
  /** Fonte candidata de L100 (ADR §1) — totais do BP em centavos inteiros. NÃO emitido. */
  l100Source: { assetsCents: number; liabilitiesCents: number; equityCents: number };
  /** Fonte candidata de L300 (ADR §1) — resultado líquido da DRE em centavos. NÃO emitido. */
  /** YTD (1/jan → dtFin), como `incomeStatement` entrega; o resultado DO trimestre
   *  (YTD(Tn) − YTD(Tn−1)) é decisão do builder L300 (Fork 3), não deste contrato. */
  l300Source: { ytdNetResultCents: number };
}

export interface EcfRealFileInput {
  declarant: Reg0000Input & Reg0030Input;
  fiscal: EcfRealFiscalInput;
  params: EcfRealParamsInput;
  signers: Reg0930Signer[]; // ≥1 contador (900) + ≥1 não-contador
  quarters: EcfRealQuarter[]; // T01→T04 (ordenados)
}

/**
 * Ordem canônica dos blocos (Manual p. 40-41, transcrita em `ecf.ts`). No esqueleto do Real
 * TODOS os blocos entre 0 e 9 são marcadores vazios; a lista é mantida em ordem para que a
 * futura substituição de L/M/N por blocos com dados seja uma troca posicional.
 */
const EMPTY_BLOCKS_BEFORE_L: Array<{ open: BlockOpenReg; close: BlockCloseReg }> = [
  { open: 'C001', close: 'C990' },
  { open: 'E001', close: 'E990' },
  { open: 'J001', close: 'J990' },
  { open: 'K001', close: 'K990' },
];
// Fase 3 — conteúdo pendente do Manual do Leiaute 12 (Forks 2/3/4).
const EMPTY_BLOCKS_LMN: Array<{ open: BlockOpenReg; close: BlockCloseReg }> = [
  { open: 'L001', close: 'L990' },
  { open: 'M001', close: 'M990' },
  { open: 'N001', close: 'N990' },
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

/**
 * Monta a ECF do Lucro Real (esqueleto) e resolve os contadores em 2ª passada:
 *   - encerradores de bloco = linhas do bloco (auto-inclusivo);
 *   - 9900 = uma linha por tipo de registro presente, auto-referente;
 *   - 9999 = total de linhas do arquivo.
 * Determinismo: mesma entrada ⇒ saída byte-idêntica (asserção sha256 no teste).
 */
export function buildEcfRealFile(input: EcfRealFileInput): string[] {
  // ── Bloco 0 (com dados) ──
  const block0: string[] = [];
  block0.push(build0000(input.declarant));
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

  // ── Blocos vazios entre 0 e 9 (C/E/J/K · L/M/N · P/Q/S/T/U/V/W/X/Y) ──
  const middle: string[] = [];
  for (const b of [...EMPTY_BLOCKS_BEFORE_L, ...EMPTY_BLOCKS_LMN, ...EMPTY_BLOCKS_AFTER_N]) {
    middle.push(...emptyBlock(b.open, b.close));
  }

  // ── Bloco 9 (contagem, 2ª passada — mesma regra de `ecf.ts`/`sped.ts`) ──
  const preceding = [...block0, ...middle];
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
