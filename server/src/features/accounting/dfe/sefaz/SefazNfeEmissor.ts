import { createHash } from 'node:crypto';
import { XMLParser } from 'fast-xml-parser';
import { logger } from '../../../../lib/logger';
import { NFE_NS, escapeXml, partesDaChave, serializeNfe, CUF_POR_SIGLA } from '../../../../lib/nfeXml';
import { assinarEnveloped, digestValueDe } from '../../../../lib/dfeXmlSign';
import { assertChaveAcesso, locateInfNFe, readNfeTree, str } from '../../../../lib/nfe';
import { NfePayloadSchema, type NfePayload } from '../../dtos/NfePayloadDto';
import { tpAmbFor } from '../DfeEmissorPort';
import type {
  CancelInput,
  CancelResult,
  CancelSubstInput,
  DfeAmbiente,
  DfeCallContext,
  DfeCapabilities,
  DfeEmissorPort,
  DfeKind,
  EmissaoResult,
  EmitirInput,
  InutilizarInput,
  InutilizarResult,
  NfceSupl,
} from '../DfeEmissorPort';
import { AssinaturaRemotaError, type TipoDfeAssinado } from '../AssinadorRemotoPort';
import { endpointSefaz, type SefazServico } from './sefazConfig';
import {
  baseAssinavelQrV3Offline,
  comInfNFeSupl,
  qrCodeV2Offline,
  qrCodeV2Online,
  qrCodeV3Offline,
  qrCodeV3Online,
  urlsNfce,
  type CscNfce,
  type InfNFeSupl,
} from './nfceQrCode';
import type { SefazSoapClient } from './SefazSoapClient';

/**
 * SefazNfeEmissor — adaptador `sefaz` da NF-e 55 e NFC-e 65 (BE-INCR-NFCE-EMENDA-1 itens E-4..E-8, E-10; F-NFCE-E1-1 a,
 * E1-2 a: um adaptador para os dois modelos). Fala SOAP 1.2 com a autorizadora da UF (tabela E-11) sobre o mTLS do
 * transmissor; a nota é assinada pelo certificado do emitente no PSC (`AssinadorRemotoPort`, F-E8-1R a) — o Luminaris
 * nunca vê a chave. Leiaute dos lotes e retornos: `TRANSCRICAO-MOC70-webservices-NFe-2026-10-29.md` (`[WS-*]`).
 *
 * - `emitir` (E-5): lote `enviNFe` com UMA nota e `indSinc=1` (`[NT2025001-SINC]`); cStat 100/150 ⇒ `AUTHORIZED` com o
 *   `nfeProc` (NFe + protNFe); rejeição ⇒ `REJECTED` com o cStat em `errors[].code`; duplicidade (204/539) ⇒
 *   `NFeConsultaProtocolo4` pela chave antes de qualquer outra decisão. `partnerRef` = chave (44).
 * - `consultar` (E-8): `consSitNFe` pela chave; 100/150 ⇒ `AUTHORIZED` (re-assina a mesma nota — a assinatura é
 *   determinística — e confere o `digVal` do protocolo); 217 ⇒ `PROCESSING` com o código, e quem decide o
 *   `dfe_nao_recebida` é o ciclo (F-ADN-8 a, D-2026-10-29-X10A-PR7-9-FORKS). Nunca reenvia.
 * - `inutilizar` (E-6) e `cancelar` 110111 (E-7) montam, assinam e enviam o pedido; o `nProt` do cancelamento vem da
 *   consulta (sem coluna nova).
 * - Releitura (E-10): o `nfeProc` passa por `readNfeTree` (assinatura PRIMEIRO, F-SIG-5 a) e é comparado com o payload;
 *   divergência de identidade ⇒ alerta, e o protocolo da SEFAZ é o fato.
 * - Contingência off-line (E-9, F-NFCE-E1-5 b; X10a PR-9): a NFC-e `tpEmis=9` leva o QR Code off-line — v3 com a
 *   assinatura RSA-SHA1 dos parâmetros 1–7 pelo PSC (D01 §4.4.2) e, se a UF recusar a v3 (407) e houver CSC, v2 off-line
 *   com dia/vNF/DigestValue (D01 §4.3.5). `montarContingencia` dá o `infNFeSupl` do DANFE sem falar com a SEFAZ; o `emitir`
 *   posterior remonta o mesmo (a assinatura PKCS#1 v1.5 é determinística). `cancelarPorSubstituicao` = evento 110112.
 *
 * Não recusa `NODE_ENV=production`: é o adaptador real. Não tem webhook.
 */

export { AssinaturaRemotaError };

export type EndpointResolver = (uf: string, modelo: 55 | 65, ambiente: DfeAmbiente, servico: SefazServico) => string;

export interface SefazNfeEmissorOptions {
  ambiente: DfeAmbiente;
  soap: SefazSoapClient;
  endpoint?: EndpointResolver;
  /** `verAplic` do evento / `verProc`: versão do Luminaris. */
  versaoAplicativo?: string;
  now?: () => Date;
}

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', removeNSPrefix: true, parseTagValue: false, trimValues: true });

const AUTORIZADO = new Set(['100', '150']); // [WS-CSTAT] 100 autorizado; 150 autorizado fora de prazo
const DUPLICIDADE = new Set(['204', '539']); // [WS-CSTAT] duplicidade de NF-e
const NAO_CONSTA = '217'; // [WS-CSTAT] NF-e não consta na base de dados da SEFAZ
const QR_V3_RECUSADO = '407'; // RV ZX02-220 (D02 p. 11): "QR Code versão 3 e UF não aceita esta versão"

type No = Record<string, unknown>;
const no = (v: unknown): No => (v && typeof v === 'object' ? (v as No) : {});

/** `dhEvento` / `dhRecbto` (TZD) em Brasília (-03:00): o mesmo formato do `dhEmi` da montagem. */
function dataHoraBrasilia(d: Date): string {
  const local = new Date(d.getTime() - 3 * 3600_000);
  return `${local.toISOString().slice(0, 19)}-03:00`;
}

export class SefazNfeEmissor implements DfeEmissorPort {
  public readonly name = 'sefaz';
  public readonly capabilities: DfeCapabilities = {
    kinds: ['NFE', 'NFCE'],
    numbersDps: false, // EMENDA-1 item 21: o emissor próprio sempre monta a chave localmente
    consultar: true,
    cancelar: true,
    webhook: false,
    substituir: false,
    inutilizar: true,
    cce: false,
    assinaturaRemota: true,
    contingenciaOffline: true, // X10a PR-9 (E-9): NFC-e tpEmis=9 + 110112
    resultadoSincrono: true, // indSinc=1: o protNFe vem na resposta do lote (F-ADN-5 a)
  };
  private readonly endpoint: EndpointResolver;
  private readonly now: () => Date;
  private idLoteSeq = 0;

  constructor(private readonly opts: SefazNfeEmissorOptions) {
    this.endpoint = opts.endpoint ?? endpointSefaz;
    this.now = opts.now ?? (() => new Date());
  }

  async emitir(input: EmitirInput): Promise<EmissaoResult> {
    const payload = NfePayloadSchema.parse(input.payload);
    const chave = payload.infNFe.Id.slice(3);
    const { uf, modelo } = partesDaChave(chave);
    let assinado = await this.assinarNota(payload, input.kind as TipoDfeAssinado, input.ctx);
    // E-3: a NFC-e leva o infNFeSupl (fora da assinatura) — v3 primeiro (F-NFCE-E1-4 c). E-9: tpEmis=9 ⇒ o QR off-line.
    const offline = payload.infNFe.ide.tpEmis === 9;
    if (modelo === 65) assinado = comInfNFeSupl(assinado, offline ? await this.suplOffline(uf, chave, payload, assinado, 3, input.ctx) : this.supl(uf, chave, 3));
    let envio = await this.enviarLote(uf, modelo, assinado);
    if (modelo === 65 && envio.cStat === QR_V3_RECUSADO) {
      if (!input.ctx?.csc) {
        return {
          status: 'REJECTED',
          partnerRef: chave,
          errors: [{ code: QR_V3_RECUSADO, message: `${envio.xMotivo} — a UF recusa o QR Code v3 e a unidade não tem CSC cadastrado (PUT /api/accounting/nfce-cscs/:unitId)` }],
        };
      }
      // A mesma nota assinada: só o infNFeSupl muda (D02 p. 8), então não há nova assinatura.
      assinado = comInfNFeSupl(
        assinado,
        offline ? await this.suplOffline(uf, chave, payload, assinado, 2, input.ctx) : this.supl(uf, chave, 2, input.ctx.csc),
      );
      envio = await this.enviarLote(uf, modelo, assinado);
    }
    const { ret, prot, cStat, xMotivo } = envio;
    if (AUTORIZADO.has(cStat)) return this.autorizado(chave, payload, assinado, extrairProtNFe(ret), prot);
    if (DUPLICIDADE.has(cStat)) return this.consultar(chave, input.ctx ? { ...input.ctx, payload } : { ambiente: this.opts.ambiente, payload });
    return { status: 'REJECTED', partnerRef: chave, errors: [{ code: cStat || 'sefaz_sem_cstat', message: xMotivo }] };
  }

  /** X10a PR-8: webservice de autorização e (na NFC-e) URL do QR Code da UF/ambiente — o que falta vira faltante nomeado. */
  faltantesDoEnvio(kind: DfeKind, cUF: string, ambiente: DfeAmbiente): string[] {
    const uf = Object.entries(CUF_POR_SIGLA).find(([, c]) => c === cUF)?.[0];
    if (!uf) return [`UF do emitente desconhecida (cUF ${cUF})`];
    const modelo = kind === 'NFCE' ? 65 : 55;
    const faltantes: string[] = [];
    try {
      this.endpoint(uf, modelo, ambiente, 'NFeAutorizacao4');
    } catch (error) {
      faltantes.push(error instanceof Error ? error.message : String(error));
    }
    if (modelo === 65) {
      const urls = urlsNfce(uf, ambiente);
      if (!urls.ok) faltantes.push(urls.motivo);
    }
    return faltantes;
  }

  async consultar(partnerRef: string, ctx?: DfeCallContext): Promise<EmissaoResult> {
    const { uf, modelo } = partesDaChave(partnerRef);
    const pedido = `<consSitNFe xmlns="${NFE_NS}" versao="4.00"><tpAmb>${tpAmbFor(this.opts.ambiente)}</tpAmb><xServ>CONSULTAR</xServ><chNFe>${partnerRef}</chNFe></consSitNFe>`;
    const ret = await this.opts.soap.call(this.endpoint(uf, modelo, this.opts.ambiente, 'NFeConsultaProtocolo4'), 'NFeConsultaProtocolo4', pedido);
    const r = no(no(parser.parse(ret)).retConsSitNFe);
    const cStat = str(r.cStat);
    const prot = no(no(r.protNFe).infProt);
    if (AUTORIZADO.has(cStat) || AUTORIZADO.has(str(prot.cStat))) {
      const payload = ctx?.payload ? NfePayloadSchema.parse(ctx.payload) : null;
      if (!payload || !ctx?.assinatura) {
        // Sem a nota para remontar o nfeProc: autoriza pelo protocolo (o fato), sem XML — a pendência de anexo fica sem bytes.
        return { status: 'AUTHORIZED', partnerRef, chaveOuCodigo: partnerRef, numero: String(partesDaChave(partnerRef).nNF), errors: [] };
      }
      let assinado = await this.assinarNota(payload, modelo === 65 ? 'NFCE' : 'NFE', ctx);
      // O infNFeSupl não é assinado; na remontagem vai o v3 (a versão aceita pela UF não volta no protocolo).
      if (modelo === 65) {
        const supl = payload.infNFe.ide.tpEmis === 9 ? await this.suplOffline(uf, partnerRef, payload, assinado, 3, ctx) : this.supl(uf, partnerRef, 3);
        assinado = comInfNFeSupl(assinado, supl);
      }
      return this.autorizado(partnerRef, payload, assinado, extrairProtNFe(ret), prot);
    }
    return { status: 'PROCESSING', partnerRef, errors: [{ code: cStat || 'sefaz_sem_cstat', message: str(r.xMotivo) }] };
  }

  async cancelar(partnerRef: string, input: CancelInput, ctx?: DfeCallContext): Promise<CancelResult> {
    if (input.kind === 'NFSE') throw new Error('dfe_cancel_tipo: o adaptador sefaz não cancela NFS-e');
    const assinatura = this.exigirAssinatura(ctx);
    const { uf, modelo, cnpj, cUF } = partesDaChave(partnerRef);
    const nProt = await this.nProtDe(partnerRef, uf, modelo);
    if (!nProt) return { status: 'REJECTED', errors: [{ code: 'sefaz_sem_protocolo', message: 'a consulta não devolveu o protocolo de autorização' }] };
    const id = `ID110111${partnerRef}01`; // [VG-EVT-ID]: "ID" + tpEvento + chave + nSeqEvento (2)
    const evento =
      `<evento xmlns="${NFE_NS}" versao="1.00"><infEvento Id="${id}"><cOrgao>${cUF}</cOrgao><tpAmb>${tpAmbFor(this.opts.ambiente)}</tpAmb>` +
      `<CNPJ>${cnpj}</CNPJ><chNFe>${partnerRef}</chNFe><dhEvento>${dataHoraBrasilia(this.now())}</dhEvento><tpEvento>110111</tpEvento>` +
      `<nSeqEvento>1</nSeqEvento><verEvento>1.00</verEvento><detEvento versao="1.00"><descEvento>Cancelamento</descEvento>` +
      `<nProt>${nProt}</nProt><xJust>${escapeXml(input.xJust)}</xJust></detEvento></infEvento></evento>`;
    const assinado = await this.assinar(evento, 'infEvento', modelo === 65 ? 'NFCE' : 'NFE', assinatura);
    const lote = `<envEvento xmlns="${NFE_NS}" versao="1.00"><idLote>${this.idLote()}</idLote>${assinado}</envEvento>`;
    const ret = await this.opts.soap.call(this.endpoint(uf, modelo, this.opts.ambiente, 'NFeRecepcaoEvento4'), 'NFeRecepcaoEvento4', lote);
    const r = no(no(parser.parse(ret)).retEnvEvento);
    const inf = no(no(r.retEvento).infEvento);
    const cStat = str(inf.cStat) || str(r.cStat);
    if (cStat === '135' || cStat === '155') return { status: 'CANCELLED', errors: [] }; // [WS-EVENTO] 135 registrado; 155 fora de prazo
    if (cStat === '501') return { status: 'OUT_OF_WINDOW', errors: [{ code: '501', message: str(inf.xMotivo) }] }; // [NFCE-CANC-FORA]
    return { status: 'REJECTED', errors: [{ code: cStat || 'sefaz_sem_cstat', message: str(inf.xMotivo) || str(r.xMotivo) }] };
  }

  /**
   * E-9 — o `infNFeSupl` da NFC-e off-line para o DANFE impresso na hora da venda (F-NFCE-E1-6 b: o BE entrega chave/QR/
   * URL). Assina a nota (o v2 precisa do DigestValue) e, no v3, os parâmetros 1–7; nada vai à SEFAZ.
   */
  async montarContingencia(payloadBruto: unknown, ctx: DfeCallContext, versao: 2 | 3 = 3): Promise<NfceSupl> {
    const payload = NfePayloadSchema.parse(payloadBruto);
    if (payload.infNFe.ide.tpEmis !== 9 || payload.infNFe.ide.mod !== 65) throw new Error('dfe_contingencia_tpemis: só a NFC-e tpEmis=9 tem QR Code off-line');
    const chave = payload.infNFe.Id.slice(3);
    const { uf } = partesDaChave(chave);
    const assinado = await this.assinarNota(payload, 'NFCE', ctx);
    return this.suplOffline(uf, chave, payload, assinado, versao, ctx);
  }

  /**
   * Decisão 6 de D-2026-10-29-X10A-PR7-9-FORKS — evento 110112 "Cancelamento por substituição" (MOC 7.0 VG §5.9, Tabela
   * 5-37: detEvento com descEvento, cOrgaoAutor, tpAutor=1, verAplic, nProt, xJust, chNFeRef; nSeqEvento 1; Id "ID" +
   * tpEvento + chave + nSeqEvento). **Grau I** do literal `descEvento`: o MOC só nomeia o evento ("110112 - Cancelamento por
   * substituição", p. 105); a enumeração sem acento vem do `e110112_v1.00.xsd` lido num espelho público (nfephp-org/
   * sped-nfe, PL_009_V4), não no pacote oficial — conferir no runbook D5. 135/155 ⇒ CANCELLED; 501 ⇒ OUT_OF_WINDOW.
   */
  async cancelarPorSubstituicao(partnerRef: string, input: CancelSubstInput, ctx: DfeCallContext): Promise<CancelResult> {
    const assinatura = this.exigirAssinatura(ctx);
    const { uf, modelo, cnpj, cUF } = partesDaChave(partnerRef);
    if (modelo !== 65) throw new Error('dfe_cancel_subst_modelo: o 110112 é da NFC-e');
    const nProt = await this.nProtDe(partnerRef, uf, modelo);
    if (!nProt) return { status: 'REJECTED', errors: [{ code: 'sefaz_sem_protocolo', message: 'a consulta não devolveu o protocolo de autorização' }] };
    const id = `ID110112${partnerRef}01`; // [VG-EVT-ID]; P15 nSeqEvento "Informar o valor 1 para este evento"
    const verAplic = escapeXml((this.opts.versaoAplicativo ?? 'Luminaris').slice(0, 20));
    const evento =
      `<evento xmlns="${NFE_NS}" versao="1.00"><infEvento Id="${id}"><cOrgao>${cUF}</cOrgao><tpAmb>${tpAmbFor(this.opts.ambiente)}</tpAmb>` +
      `<CNPJ>${cnpj}</CNPJ><chNFe>${partnerRef}</chNFe><dhEvento>${dataHoraBrasilia(this.now())}</dhEvento><tpEvento>110112</tpEvento>` +
      `<nSeqEvento>1</nSeqEvento><verEvento>1.00</verEvento><detEvento versao="1.00"><descEvento>Cancelamento por substituicao</descEvento>` +
      `<cOrgaoAutor>${cUF}</cOrgaoAutor><tpAutor>1</tpAutor><verAplic>${verAplic}</verAplic>` +
      `<nProt>${nProt}</nProt><xJust>${escapeXml(input.xJust)}</xJust><chNFeRef>${input.chNFeRef}</chNFeRef></detEvento></infEvento></evento>`;
    const assinado = await this.assinar(evento, 'infEvento', 'NFCE', assinatura);
    const lote = `<envEvento xmlns="${NFE_NS}" versao="1.00"><idLote>${this.idLote()}</idLote>${assinado}</envEvento>`;
    const ret = await this.opts.soap.call(this.endpoint(uf, modelo, this.opts.ambiente, 'NFeRecepcaoEvento4'), 'NFeRecepcaoEvento4', lote);
    const r = no(no(parser.parse(ret)).retEnvEvento);
    const inf = no(no(r.retEvento).infEvento);
    const cStat = str(inf.cStat) || str(r.cStat);
    if (cStat === '135' || cStat === '155') return { status: 'CANCELLED', errors: [] }; // D07 p. 11: 155 = homologado fora de prazo
    if (cStat === '501') return { status: 'OUT_OF_WINDOW', errors: [{ code: '501', message: str(inf.xMotivo) }] }; // 2P12-18: > 168 h
    return { status: 'REJECTED', errors: [{ code: cStat || 'sefaz_sem_cstat', message: str(inf.xMotivo) || str(r.xMotivo) }] };
  }

  async inutilizar(input: InutilizarInput): Promise<InutilizarResult> {
    const assinatura = this.exigirAssinatura(input.ctx);
    if (!input.uf || !CUF_POR_SIGLA[input.uf]) throw new Error(`dfe_inut_sem_uf: UF do emitente ausente (${input.uf ?? ''})`);
    const cUF = CUF_POR_SIGLA[input.uf];
    const mod = input.kind === 'NFCE' ? 65 : 55;
    const ano = String(input.ano % 100).padStart(2, '0');
    const serie3 = String(input.serie).padStart(3, '0');
    // [VG-INUT-ID]: "ID" + cUF + ano(2) + CNPJ + mod + série(3) + nNFIni(9) + nNFFin(9)
    const id = `ID${cUF}${ano}${input.cnpjEmitente}${mod}${serie3}${String(input.nIni).padStart(9, '0')}${String(input.nFin).padStart(9, '0')}`;
    const pedido =
      `<inutNFe xmlns="${NFE_NS}" versao="4.00"><infInut Id="${id}"><tpAmb>${tpAmbFor(input.ambiente)}</tpAmb><xServ>INUTILIZAR</xServ>` +
      `<cUF>${cUF}</cUF><ano>${ano}</ano><CNPJ>${input.cnpjEmitente}</CNPJ><mod>${mod}</mod><serie>${input.serie}</serie>` +
      `<nNFIni>${input.nIni}</nNFIni><nNFFin>${input.nFin}</nNFFin><xJust>${escapeXml(input.xJust)}</xJust></infInut></inutNFe>`;
    const assinado = await this.assinar(pedido, 'infInut', input.kind, assinatura);
    const ret = await this.opts.soap.call(this.endpoint(input.uf, mod, input.ambiente, 'NFeInutilizacao4'), 'NFeInutilizacao4', assinado);
    const inf = no(no(no(parser.parse(ret)).retInutNFe).infInut);
    const cStat = str(inf.cStat);
    if (cStat === '102') return { status: 'HOMOLOGATED', nProt: str(inf.nProt), errors: [] }; // [WS-INUT] 102 inutilização homologada
    return { status: 'REJECTED', errors: [{ code: cStat || 'sefaz_sem_cstat', message: str(inf.xMotivo) }] };
  }

  verifyWebhook(): { ok: false } {
    return { ok: false };
  }

  // ---- internos ----

  private async enviarLote(uf: string, modelo: 55 | 65, nfeAssinada: string): Promise<{ ret: string; prot: No; cStat: string; xMotivo: string }> {
    const lote = `<enviNFe xmlns="${NFE_NS}" versao="4.00"><idLote>${this.idLote()}</idLote><indSinc>1</indSinc>${nfeAssinada}</enviNFe>`;
    const ret = await this.opts.soap.call(this.endpoint(uf, modelo, this.opts.ambiente, 'NFeAutorizacao4'), 'NFeAutorizacao4', lote);
    const r = no(no(parser.parse(ret)).retEnviNFe);
    const prot = no(no(r.protNFe).infProt);
    return { ret, prot, cStat: str(prot.cStat) || str(r.cStat), xMotivo: str(prot.xMotivo) || str(r.xMotivo) };
  }

  /** E-3 — QR Code da versão pedida + urlChave da UF; UF sem URL oficial ⇒ erro nomeado (o serviço já barrou no pré-voo). */
  private supl(uf: string, chave: string, versao: 2 | 3, csc?: { id: string; csc: string }): InfNFeSupl {
    const urls = urlsNfce(uf, this.opts.ambiente);
    if (!urls.ok) throw new Error(`dfe_nfce_sem_url: ${urls.motivo}`);
    const tpAmb = tpAmbFor(this.opts.ambiente);
    if (versao === 2 && !csc) throw new Error('dfe_nfce_sem_csc: QR Code v2 sem o CSC da unidade');
    const qrCode = versao === 3 ? qrCodeV3Online(urls.qrCodeBase, chave, tpAmb) : qrCodeV2Online(urls.qrCodeBase, chave, tpAmb, csc!);
    return { qrCode, urlChave: urls.urlChave };
  }

  /**
   * E-9 — o QR Code off-line: v3 = parâmetros 1–7 assinados em RSA-SHA1 pelo certificado da nota (o mesmo PSC; o hash
   * SHA-1 da string ASCII vai ao `/oauth/signature`, PKCS#1 v1.5 — padding assumido, transcrição §1(c)); v2 = hash com o
   * DigestValue da nota assinada e o CSC da unidade.
   */
  private async suplOffline(uf: string, chave: string, payload: NfePayload, assinado: string, versao: 2 | 3, ctx?: DfeCallContext): Promise<InfNFeSupl> {
    const urls = urlsNfce(uf, this.opts.ambiente);
    if (!urls.ok) throw new Error(`dfe_nfce_sem_url: ${urls.motivo}`);
    const tpAmb = tpAmbFor(this.opts.ambiente);
    const dados = { dhEmi: payload.infNFe.ide.dhEmi, vNF: payload.infNFe.total.ICMSTot.vNF, dest: payload.infNFe.dest };
    if (versao === 2) {
      if (!ctx?.csc) throw new Error('dfe_nfce_sem_csc: QR Code v2 sem o CSC da unidade');
      return { qrCode: qrCodeV2Offline(urls.qrCodeBase, chave, tpAmb, dados, digestValueDe(assinado), ctx.csc as CscNfce), urlChave: urls.urlChave };
    }
    const a = this.exigirAssinatura(ctx);
    const base = baseAssinavelQrV3Offline(chave, tpAmb, dados);
    const digest = createHash('sha1').update(base, 'utf8').digest('base64');
    const r = await a.assinador.assinarHash(digest, 'sha1', 'NFCE', a.credencial);
    if (!r.ok) throw new AssinaturaRemotaError(r.code, r.message);
    return { qrCode: qrCodeV3Offline(urls.qrCodeBase, base, r.signatureValueB64), urlChave: urls.urlChave };
  }

  private idLote(): string {
    // idLote 1–15 dígitos ([WS-ENVINFE]); instante + sequência local evita repetição dentro do processo.
    this.idLoteSeq = (this.idLoteSeq + 1) % 1000;
    return `${this.now().getTime()}${String(this.idLoteSeq).padStart(3, '0')}`.slice(-15);
  }

  private exigirAssinatura(ctx?: DfeCallContext): NonNullable<DfeCallContext['assinatura']> {
    if (!ctx?.assinatura) throw new Error('dfe_sem_credencial_psc: o serviço não resolveu a credencial do PSC da unidade');
    return ctx.assinatura;
  }

  private async assinarNota(payload: NfePayload, tipo: TipoDfeAssinado, ctx?: DfeCallContext): Promise<string> {
    return this.assinar(serializeNfe(payload), 'infNFe', tipo, this.exigirAssinatura(ctx));
  }

  private async assinar(xml: string, alvo: 'infNFe' | 'infEvento' | 'infInut', tipo: TipoDfeAssinado, a: NonNullable<DfeCallContext['assinatura']>): Promise<string> {
    return assinarEnveloped(xml, { signedLocalName: alvo }, a.credencial.certificadoPem, async (digest) => {
      const r = await a.assinador.assinarHash(digest, 'sha1', tipo, a.credencial);
      if (!r.ok) throw new AssinaturaRemotaError(r.code, r.message);
      return r.signatureValueB64;
    });
  }

  private async nProtDe(chave: string, uf: string, modelo: 55 | 65): Promise<string | null> {
    const pedido = `<consSitNFe xmlns="${NFE_NS}" versao="4.00"><tpAmb>${tpAmbFor(this.opts.ambiente)}</tpAmb><xServ>CONSULTAR</xServ><chNFe>${chave}</chNFe></consSitNFe>`;
    const ret = await this.opts.soap.call(this.endpoint(uf, modelo, this.opts.ambiente, 'NFeConsultaProtocolo4'), 'NFeConsultaProtocolo4', pedido);
    const nProt = str(no(no(no(no(parser.parse(ret)).retConsSitNFe).protNFe).infProt).nProt);
    return nProt || null;
  }

  private autorizado(chave: string, payload: NfePayload, assinado: string, protXml: string | null, prot: No): EmissaoResult {
    const digVal = str(prot.digVal);
    if (digVal && digVal !== digestValueDe(assinado)) {
      // O protocolo é o fato (E-10): a nota autorizada não é a que montamos agora — alerta, sem anexar XML trocado.
      logger.error('dfe_sefaz_releitura: digVal do protocolo difere da nota montada — ação humana', { chave });
      return { status: 'AUTHORIZED', partnerRef: chave, chaveOuCodigo: chave, numero: String(payload.infNFe.ide.nNF), errors: [] };
    }
    const nfeProc = `<nfeProc xmlns="${NFE_NS}" versao="4.00">${assinado}${protXml ?? ''}</nfeProc>`;
    const divergencias = releituraNfe(nfeProc, payload);
    if (divergencias.length) {
      logger.error('dfe_sefaz_releitura: nfeProc diverge do payload enviado — ação humana', { chave, divergencias: divergencias.join(',') });
    }
    return {
      status: 'AUTHORIZED',
      partnerRef: chave,
      chaveOuCodigo: chave,
      numero: String(payload.infNFe.ide.nNF),
      serie: String(payload.infNFe.ide.serie),
      xml: Buffer.from(nfeProc, 'utf8'),
      errors: [],
    };
  }
}

/** O `<protNFe>…</protNFe>` cru do retorno (o nfeProc carrega o protocolo como a SEFAZ o devolveu). */
function extrairProtNFe(ret: string): string | null {
  const m = /<protNFe\b[\s\S]*?<\/protNFe>/.exec(ret);
  return m ? m[0] : null;
}

/**
 * E-10 — releitura do autorizado: `readNfeTree` verifica a assinatura ANTES de ler (F-SIG-5 a; adulteração depois do
 * protocolo lança aqui) e a comparação campo a campo cobre a nota montada diferente do payload persistido. Devolve os
 * nomes dos campos divergentes (chave, emitente, destinatário, itens, vNF, tPag).
 */
export function releituraNfe(nfeProc: string, payload: NfePayload): string[] {
  const { infNFe } = locateInfNFe(readNfeTree(nfeProc));
  const inf = payload.infNFe;
  const div: string[] = [];
  if (assertChaveAcesso(infNFe) !== inf.Id.slice(3)) div.push('chave');
  if (str(no(infNFe.emit).CNPJ) !== inf.emit.CNPJ) div.push('emitente');
  const dest = no(infNFe.dest);
  if ((str(dest.CNPJ) || str(dest.CPF)) !== (inf.dest?.CNPJ ?? inf.dest?.CPF ?? '')) div.push('dest');
  const det = Array.isArray(infNFe.det) ? infNFe.det : infNFe.det ? [infNFe.det] : [];
  if (det.length !== inf.det.length) div.push('itens');
  if (str(no(no(infNFe.total).ICMSTot).vNF) !== inf.total.ICMSTot.vNF) div.push('vNF');
  const detPag = no(infNFe.pag).detPag;
  const tPags = (Array.isArray(detPag) ? detPag : [detPag]).map((p) => str(no(p).tPag)).join(',');
  if (tPags !== inf.pag.detPag.map((p) => p.tPag).join(',')) div.push('tPag');
  return div;
}
