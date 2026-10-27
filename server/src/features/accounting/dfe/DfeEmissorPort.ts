import type { DpsManualPayload, DpsPayload } from '../dtos/DpsPayloadDto';
import type { NfePayload as NfePayloadNumerada, NfePayloadSemNumeracao } from '../dtos/NfePayloadDto';

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
  consultar(partnerRef: string): Promise<EmissaoResult>;
  cancelar(partnerRef: string, input: CancelInput): Promise<CancelResult>;
  /** BE-INCR-NFCE item 24 — só existe quando `capabilities.inutilizar`. */
  inutilizar?(input: InutilizarInput): Promise<InutilizarResult>;
  verifyWebhook(
    headers: Record<string, string | undefined>,
    rawBody: Buffer,
  ): { ok: true; partnerRef: string } | { ok: false };
}
