import type { LinhaLegal } from '../../legalParameters/models/legalParameter';
import { linhaLegalVigente } from '../../legalParameters/models/legalParameter';

/**
 * BE-INCR-NFCE (nó X10a, itens 24–25; EMENDA-3 E3-2 a) — regras puras da inutilização de numeração de NF-e/NFC-e.
 * Fontes: `[NFE-INUT-REGRAS]` (MOC 7.0 VG §5.3.4, Tabela 5-12, pp. 80–81) e as decisões do dono por questionário de
 * 26/10/2026 (registradas no corpo do PR-4): REJECTED não bloqueia a guarda da rej. 241; só se inutiliza número já
 * consumido pela sequência; a lacuna lista todos os ambientes; o aviso compara com HOJE no fuso do escopo.
 */

/** Status do documento fiscal, como o modelo o lê (espelho de `FISCAL_DOCUMENT_STATUSES`; o modelo não importa repositório — L6). */
type FiscalDocumentStatus = 'SENT' | 'PROCESSING' | 'AUTHORIZED' | 'AUTHORIZED_DIVERGENT' | 'REJECTED' | 'CANCELLED' | 'PENDING_SIGNATURE';

/** Rej. 201: "Faixa de inutilização com mais de 10.000 números". */
export const INUT_MAX_NUMEROS = 10_000n;

/**
 * Status de documento que ocupa o número na guarda da rej. 241 ("um número da faixa já foi utilizado"): o que ainda pode
 * voltar autorizado (SENT/PROCESSING — F-NFCE-5) e o autorizado, cancelado ou não. REJECTED fica de fora: a nota rejeitada
 * é descartada pela SEFAZ (`[VG-REJ-DESCARTADA]`, MOC VG §5.1.6) — dono, 26/10: "REJECTED não bloqueia".
 * PENDING_SIGNATURE (X10a PR-7, F-PSC-6 a) ocupa: a nota guarda o número para sair com ele depois da reautorização.
 */
export const STATUS_QUE_OCUPAM_NUMERO: readonly FiscalDocumentStatus[] = ['SENT', 'PROCESSING', 'AUTHORIZED', 'AUTHORIZED_DIVERGENT', 'CANCELLED', 'PENDING_SIGNATURE'];

/**
 * `[NFCE-PRESUNCAO]` — Ajuste SINIEF 19/16 cl. 11ª § 5º (redação do Ajuste SINIEF 26/19, efeitos a partir de 18.12.19), texto
 * vigente lido no compilado do CONFAZ (sha256 6692d344…, dossiês sp-inutilizacao-nfe-nfce-2026-11 e x10a-pr0-leiaute-saida).
 * Só NFC-e: o Aj. 07/05 (NF-e) não tem regra igual (EMENDA-3 §1).
 */
export const NFCE_PRESUNCAO =
  'Constatada, a partir do 11º (décimo primeiro) dia do mês subsequente, quebra da ordem sequencial na emissão da NFC-e, sem que tenha havido a inutilização dos números de NFC-e não utilizados, considerar-se-á que a numeração correspondente a esse intervalo se refere a documentos emitidos em contingência e não transmitidos (Ajuste SINIEF 19/16, cl. 11ª, § 5º).';

export type GuardaFaixa =
  | { code: 'inut_faixa_invertida'; message: string }
  | { code: 'inut_faixa_excede_10000'; message: string }
  | { code: 'inut_ano_futuro'; message: string }
  | { code: 'inut_acima_do_ultimo'; message: string };

/**
 * Guardas da faixa que não dependem de banco além do último número consumido. Ordem = a da Tabela 5-12: ano (453),
 * nIni ≤ nFin (224), ≤ 10.000 números (201); por último a regra local do dono (só número já consumido; `last` = 0 quando
 * a sequência ainda não existe).
 */
export function guardaDaFaixa(args: { nIni: bigint; nFin: bigint; ano: number; anoAtual: number; last: bigint }): GuardaFaixa | null {
  if (args.ano > args.anoAtual) return { code: 'inut_ano_futuro', message: `ano ${args.ano} posterior ao atual (${args.anoAtual}) — rej. 453` };
  if (args.nIni > args.nFin) return { code: 'inut_faixa_invertida', message: `nIni (${args.nIni}) maior que nFin (${args.nFin}) — rej. 224` };
  if (args.nFin - args.nIni + 1n > INUT_MAX_NUMEROS) {
    return { code: 'inut_faixa_excede_10000', message: `faixa com ${args.nFin - args.nIni + 1n} números (máximo ${INUT_MAX_NUMEROS}) — rej. 201` };
  }
  if (args.nFin > args.last) {
    return {
      code: 'inut_acima_do_ultimo',
      message: `nFin (${args.nFin}) acima do último número consumido nesta série/ambiente (${args.last}) — só se inutiliza número já consumido`,
    };
  }
  return null;
}

export interface LacunaDeNumeracao {
  ambiente: string;
  serie: number;
  numero: string;
  /** O documento rejeitado que segura o número, quando houver. */
  documentId: string | null;
  status: FiscalDocumentStatus | null;
  avisos: string[];
  presuncao?: string;
}

/**
 * Item 25 — números 1..last de cada sequência sem documento que os ocupe (`STATUS_QUE_OCUPAM_NUMERO`) e fora de faixa
 * inutilizada HOMOLOGATED. Pedido REQUESTED/REJECTED não tira o número da lista (dono, 26/10). Nada automático.
 */
export function lacunasDeNumeracao(args: {
  sequencias: ReadonlyArray<{ ambiente: string; serie: number; last: bigint }>;
  documentos: ReadonlyArray<{ id: string; ambiente: string; serie: number; numero: bigint; status: FiscalDocumentStatus }>;
  homologadas: ReadonlyArray<{ ambiente: string; serie: number; nIni: bigint; nFin: bigint }>;
  aviso: { avisos: string[]; presuncao?: string };
}): LacunaDeNumeracao[] {
  const lacunas: LacunaDeNumeracao[] = [];
  for (const seq of args.sequencias) {
    const docs = args.documentos.filter((d) => d.ambiente === seq.ambiente && d.serie === seq.serie);
    const ocupados = new Set(docs.filter((d) => STATUS_QUE_OCUPAM_NUMERO.includes(d.status)).map((d) => d.numero));
    const faixas = args.homologadas.filter((v) => v.ambiente === seq.ambiente && v.serie === seq.serie);
    for (let n = 1n; n <= seq.last; n++) {
      if (ocupados.has(n) || faixas.some((v) => v.nIni <= n && n <= v.nFin)) continue;
      const rejeitado = docs.find((d) => d.numero === n);
      lacunas.push({
        ambiente: seq.ambiente,
        serie: seq.serie,
        numero: String(n),
        documentId: rejeitado?.id ?? null,
        status: rejeitado?.status ?? null,
        avisos: [...args.aviso.avisos],
        ...(args.aviso.presuncao ? { presuncao: args.aviso.presuncao } : {}),
      });
    }
  }
  return lacunas;
}

/**
 * EMENDA-3 E3-2 (a) — aviso da UF onde o pedido "não se aplica" (`INUT_NAO_SE_APLICA`, linha vigente na `data` = hoje no
 * fuso do escopo) e, só na NFC-e, o texto da presunção junto. Sem linha ⇒ sem aviso (as outras 24 UF).
 */
export function avisoDeInutilizacao(linhas: readonly LinhaLegal[], kind: 'NFE' | 'NFCE', cUF: string | null, data: string): { avisos: string[]; presuncao?: string } {
  if (!cUF) return { avisos: [] };
  const linha = linhaLegalVigente(linhas, 'INUT_NAO_SE_APLICA', kind, data, cUF);
  if (!linha?.valorTexto) return { avisos: [] };
  return { avisos: [linha.valorTexto], ...(kind === 'NFCE' ? { presuncao: NFCE_PRESUNCAO } : {}) };
}
