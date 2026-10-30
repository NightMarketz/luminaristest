import type { DpsManualPayload, DpsPayload } from '../dtos/DpsPayloadDto';
import type { NfePayload as NfePayloadNumerada, NfePayloadSemNumeracao } from '../dtos/NfePayloadDto';
import type { AssinadorRemotoPort, CredencialPscResolvida } from './AssinadorRemotoPort';

/**
 * DfeEmissorPort — BE-INCR-DFE (nó X10b, BRIEF item 10; ADR-DFE D-X10b-1).
 *
 * Porta de APLICAÇÃO para a emissão de documento fiscal de saída (NFS-e nacional / NF-e 55),
 * invocada por serviço/controller, JAMAIS de um plugin ou de dentro de
 * DynamicTableService/RuleContext/RulePlugin (§2.1 boundary — mesmo desenho de
 * `AccountingSyncPort`). Este BRIEF implementa a NFS-e (Fase E / NF-e 55 é [pendente-insumo]);
 * o tipo `NfePayload` fica reservado como `unknown` até a Fase E transcrever o leiaute.
 */

/** BE-INCR-NFCE (nó X10a, item 3; F-PLAN-2 a) — `NFCE` = NFC-e modelo 65. */
export type DfeKind = 'NFSE' | 'NFE' | 'NFCE';
export type DfeAmbiente = 'producao' | 'homologacao';

/** `infDPS/tpAmb` [103] — Anexo I v1.01, aba LEIAUTE, linha 103: 1 = Produção, 2 = Homologação. */
export type DpsTpAmb = 1 | 2;

/** BE-INCR-DFE-TPAMB (item 8) — o `tpAmb` da DPS é o ambiente do DOCUMENTO. Inversa exata de `ambienteFromTpAmb`. */
export function tpAmbFor(ambiente: DfeAmbiente): DpsTpAmb {
  switch (ambiente) {
    case 'producao':
      return 1;
    case 'homologacao':
      return 2;
    default: {
      const unknownAmbiente: never = ambiente;
      throw new Error(`dfe_ambiente_unknown: ${String(unknownAmbiente)}`);
    }
  }
}

/** Leitura do `tpAmb` de uma nota (XML: '1' | '2') ou DPS (1 | 2) — o MESMO mapeamento de `tpAmbFor` (F-AMB-6 a). */
export function ambienteFromTpAmb(tpAmb: '1' | '2' | DpsTpAmb): DfeAmbiente {
  switch (tpAmb) {
    case 1:
    case '1':
      return 'producao';
    case 2:
    case '2':
      return 'homologacao';
    default: {
      const unknownTpAmb: never = tpAmb;
      throw new Error(`dfe_tpamb_unknown: ${String(unknownTpAmb)}`);
    }
  }
}

/** BE-INCR-DFE-TPAMB (item 7, F-AMB-3 a) — DPS com `tpAmb` ≠ ambiente do documento é bug nosso (500), nunca 400. */
export function assertTpAmb(payload: { infDPS: { tpAmb: number } }, ambiente: DfeAmbiente): void {
  if (payload.infDPS.tpAmb !== tpAmbFor(ambiente)) {
    throw new Error(`dfe_tpamb_invariant: DPS com tpAmb=${payload.infDPS.tpAmb} num documento de ${ambiente}.`);
  }
}

export interface DfeCapabilities {
  /**
   * BE-INCR-NFCE (nó X10a, item 4) — os tipos de documento que o adaptador emite. A seleção (`selectDfeEmissor`) e a
   * resolução por documento (`resolveEmissorFor`) recusam o tipo que não estiver aqui (F-NFCE-1 c).
   */
  kinds: readonly DfeKind[];
  /** true quando o parceiro numera a DPS/NF-e (a sequência local NÃO é consumida nesse caso). */
  numbersDps: boolean;
  consultar: boolean;
  cancelar: boolean;
  webhook: boolean;
  /**
   * BE-INCR-DFE-EVENTOS (nó X11, item 16) — o adaptador emite a DPS substituta (grupo `infDPS/subst`, Anexo I [113]).
   * `false` ⇒ `POST …/substituir` recusa com 409 `DFE_SUBST_NAO_SUPORTADA`.
   */
  substituir: boolean;
  /**
   * BE-INCR-NFCE (nó X10a, item 24) — o adaptador pede a inutilização de faixa de NF-e/NFC-e (`inutNFe`, MOC VG §5.3).
   * `false` ⇒ `POST …/inutilizacoes` recusa com 409 `DFE_INUT_NAO_SUPORTADA`.
   */
  inutilizar: boolean;
  /**
   * BE-INCR-NFCE (nó X10a, item 28; F-NFCE-9 c, ratificado 02/10) — carta de correção (evento 110110, só NF-e 55;
   * vedada na NFC-e, Aj. SINIEF 19/16 cl. 8ª §1º). Reservada: nenhum adaptador declara `true` e não há rota.
   */
  cce: boolean;
  /**
   * BE-INCR-DFE-ADN-EMENDA-PSC (E-6/E-12; X10a PR-7) — o adaptador assina pelo PSC e precisa da credencial da unidade em
   * `ctx.assinatura`. O serviço faz o pré-voo (F-PSC-5 a) antes de consumir número. Ausente = `false`.
   */
  assinaturaRemota?: boolean;
  /**
   * X10a PR-7 (F-ADN-5 a, D-2026-10-29-X10A-PR7-9-FORKS decisão 1) — o retorno de `emitir` é o resultado do fisco (SEFAZ
   * com `indSinc=1`), e o serviço o aplica pelo mesmo `applyResult` do ciclo. Ausente = `false`: o resultado imediato
   * fica para o polling, como antes.
   */
  resultadoSincrono?: boolean;
  /**
   * X10a PR-9 (E-9, F-NFCE-E1-5 b) — NFC-e em contingência off-line (`tpEmis=9`): o adaptador monta o `infNFeSupl` da nota
   * off-line (`montarContingencia`), transmite-a depois pelo `emitir` e pede o cancelamento por substituição 110112
   * (`cancelarPorSubstituicao`). Ausente = `false`: falha de comunicação segue a regra antiga (fica `SENT`).
   */
  contingenciaOffline?: boolean;
}

/**
 * X10a PR-9 (decisão 4 de D-2026-10-29-X10A-PR7-9-FORKS) — falha de COMUNICAÇÃO com o fisco (timeout, 5xx, rede, TLS,
 * resposta sem corpo): o que liga a contingência automática. Rejeição nunca é isto. O adaptador lança uma subclasse.
 */
export class DfeTransporteError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'DfeTransporteError';
  }
}

export function isFalhaDeComunicacao(error: unknown): error is DfeTransporteError {
  return error instanceof DfeTransporteError;
}

/** X10a PR-9 — o grupo `infNFeSupl` da NFC-e (QR Code + urlChave), entregue ao FE para o DANFE (F-NFCE-E1-6 b). */
export interface NfceSupl {
  qrCode: string;
  urlChave: string;
}

/** X10a PR-9 — pedido do evento 110112 (MOC 7.0 VG Tabela 5-37; Aj. SINIEF 19/16 cl. 15ª-A). */
export interface CancelSubstInput {
  /** Chave (44) da NFC-e substituta, emitida em contingência (`chNFeRef`, P31). */
  chNFeRef: string;
  xJust: string;
}

/**
 * BE-INCR-DFE-ADN-EMENDA-PSC item E-12 (X10a PR-7) — contexto por chamada, resolvido pelo SERVIÇO pela unidade do
 * documento (BRIEF-ADN item 16; a porta não lê Prisma). `payload` serve ao `consultar` que remonta o `nfeProc` (E-8).
 */
export interface DfeCallContext {
  ambiente: DfeAmbiente;
  assinatura?: { assinador: AssinadorRemotoPort; credencial: CredencialPscResolvida };
  payload?: unknown;
  /** X10a PR-8 (E-3, F-NFCE-E1-4 c): CSC da unidade no ambiente, para o QR Code v2 quando a UF recusa a v3 (rej. 407). */
  csc?: { id: string; csc: string };
}

/**
 * BE-INCR-NFCE (nó X10a, item 12) — a NF-e 55 / NFC-e 65 pelo `NfePayloadSchema`: numerada quando o Luminaris numera
 * (`numbersDps === false`, item 21), sem Id/cNF/nNF/cDV quando o adaptador numera.
 */
export type NfePayload = NfePayloadNumerada | NfePayloadSemNumeracao;

export interface EmitirInput {
  kind: DfeKind;
  /** Chave de idempotência no parceiro — "<documentId>:<attemptNo>" (ADR §9.1). */
  ref: string;
  ambiente: DfeAmbiente;
  cnpjEmitente: string;
  partnerAccountRef: string | null;
  /** DPS numerada, DPS sem numeração (portal numera, F-MAN-4 a) ou NF-e/NFC-e (item 12). */
  payload: DpsPayload | DpsManualPayload | NfePayload;
  /** X10a PR-7 — credencial do PSC quando `capabilities.assinaturaRemota`. */
  ctx?: DfeCallContext;
}

export interface EmissaoResult {
  status: 'PROCESSING' | 'AUTHORIZED' | 'REJECTED';
  partnerRef: string;
  numero?: string;
  serie?: string;
  nNFSe?: string;
  chaveOuCodigo?: string;
  /** Strings — BigInt-safe (nunca cruze o parceiro com um `number` de centavos). */
  valores?: {
    vIssCents?: string;
    aliqIssBp?: number;
    vIbsCents?: string;
    vCbsCents?: string;
    baseIssCents?: string;
  };
  xml?: Buffer;
  pdf?: Buffer;
  /**
   * BE-INCR-DFE-EVENTOS (nó X11, item 1) — `infNFSe/dhProc` [19] (TSDateTimeUTC, com fuso): o instante fiscal da nota,
   * gravado em `FiscalDocument.nfseDhProc` no AUTHORIZED. Opcional: adaptador que não o devolve deixa a janela `null`.
   */
  dhProc?: string;
  errors: Array<{ code: string; message: string }>;
}

/**
 * BE-INCR-DFE-EVENTOS (nó X11, item 6) — contrato do resultado do cancelamento por máquina:
 * - `OUT_OF_WINDOW` ⇔ o fisco rejeitou com **E0822** ("fora do prazo limite … conforme parametrização do município
 *   emissor", Anexo II aba `RN EVENTO_PED.REG.EVENTO` [28]).
 * - BE-INCR-NFCE (nó X10a, item 27; F-NFCE-10 a): na NF-e/NFC-e, `OUT_OF_WINDOW` ⇔ o fisco rejeitou o 110111 com **501**
 *   (`retEvento/cStat`, prazo de cancelamento superado — `[NFCE-CANC-FORA]`; na NFC-e é terminal).
 * - E0823 / E0824 / E0827 / E0840 (Anexo II [29]/[30]/[31]/[35]) e qualquer outra rejeição ⇒ `REJECTED`, com o
 *   código preservado em `errors[].code`.
 * O adaptador real (X10i) herda o teste de tradução (`DfeCancelResultContract.test.ts`).
 */
export interface CancelResult {
  status: 'CANCELLED' | 'OUT_OF_WINDOW' | 'REJECTED' | 'PROCESSING';
  errors: Array<{ code: string; message: string }>;
}

/**
 * BE-INCR-NFCE (nó X10a, item 7) — o cancelamento tem a forma do tipo: NFS-e = `cMotivo`/`xMotivo` do e101101 (Anexo II,
 * inalterado); NF-e/NFC-e = `xJust` de 15 a 255 caracteres (MOC 7.0 VG §5.9.1, Tabela 5-37, evento 110111).
 */
export type CancelInput =
  | { kind: 'NFSE'; cMotivo: 1 | 2 | 9; xMotivo: string }
  | { kind: 'NFE' | 'NFCE'; xJust: string };

/**
 * BE-INCR-NFCE (nó X10a, item 24) — pedido de inutilização (`inutNFe`, MOC 7.0 VG §5.3.1, Tabela 5-9): tpAmb, ano (2),
 * CNPJ, mod (55 | 65), série, nNFIni, nNFFin e xJust (15–255). EMENDA-3 E3-1 (c): vale para toda UF, também AC/BA/SP depois
 * de 01/11/2026 — quem decide é a SEFAZ.
 */
export interface InutilizarInput {
  kind: 'NFE' | 'NFCE';
  ambiente: DfeAmbiente;
  cnpjEmitente: string;
  partnerAccountRef: string | null;
  ano: number;
  serie: number;
  nIni: bigint;
  nFin: bigint;
  xJust: string;
  /** X10a PR-7 (E-6) — UF do emitente (cUF do `infInut`) e a credencial do PSC, para o adaptador que assina. */
  uf?: string;
  ctx?: DfeCallContext;
}

export interface InutilizarResult {
  status: 'HOMOLOGATED' | 'REJECTED' | 'PROCESSING';
  nProt?: string;
  errors: Array<{ code: string; message: string }>;
}

/**
 * A porta. Cada adaptador declara suas `capabilities`; o serviço nunca assume uma capacidade que o
 * adaptador corrente não anuncia (ex.: só consome a sequência local quando `numbersDps === false`).
 */
export interface DfeEmissorPort {
  readonly name: string;
  readonly capabilities: DfeCapabilities;
  emitir(input: EmitirInput): Promise<EmissaoResult>;
  consultar(partnerRef: string, ctx?: DfeCallContext): Promise<EmissaoResult>;
  cancelar(partnerRef: string, input: CancelInput, ctx?: DfeCallContext): Promise<CancelResult>;
  /**
   * X10a PR-8 — o que impede o envio do tipo na UF/ambiente do emitente (webservice ou URL do QR Code sem fonte oficial),
   * como faltantes nomeados. O serviço consulta ANTES de consumir o número. Ausente = nada a checar.
   */
  faltantesDoEnvio?(kind: DfeKind, cUF: string, ambiente: DfeAmbiente): string[];
  /**
   * X10a PR-9 (E-9) — só com `capabilities.contingenciaOffline`: assina a NFC-e `tpEmis=9` e devolve o `infNFeSupl` que o
   * DANFE impresso leva (v3 off-line assinado; v2 off-line com o CSC quando `v2`). Não fala com o fisco.
   */
  montarContingencia?(payload: unknown, ctx: DfeCallContext, versao?: 2 | 3): Promise<NfceSupl>;
  /** X10a PR-9 (decisão 6) — evento 110112 sobre a nota normal autorizada, apontando a substituta de contingência. */
  cancelarPorSubstituicao?(partnerRef: string, input: CancelSubstInput, ctx: DfeCallContext): Promise<CancelResult>;
  /** BE-INCR-NFCE item 24 — só existe quando `capabilities.inutilizar`. */
  inutilizar?(input: InutilizarInput): Promise<InutilizarResult>;
  /** BE-INCR-NFCE item 28 — CC-e (110110), só NF-e e só quando `capabilities.cce`. Sem implementação (F-NFCE-9 c). */
  cce?(partnerRef: string, xCorrecao: string, nSeqEvento: number): Promise<CancelResult>;
  verifyWebhook(
    headers: Record<string, string | undefined>,
    rawBody: Buffer,
  ): { ok: true; partnerRef: string } | { ok: false };
}
