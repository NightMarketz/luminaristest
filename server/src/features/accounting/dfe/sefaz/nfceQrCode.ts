import { createHash } from 'node:crypto';
import { z } from 'zod';
import { escapeXml } from '../../../../lib/nfeXml';
import type { DfeAmbiente } from '../DfeEmissorPort';
import { UFS } from './sefazConfig';
import dados from './nfceQrCode.data.json';

/**
 * QR Code e `urlChave` da NFC-e — BE-INCR-NFCE-EMENDA-1 item E-3, ramo (c) do F-NFCE-E1-4 (EMENDA-2 §4.1: SP não
 * confirmou a v3 ⇒ v3 + v2/CSC). Fonte: `TRANSCRICAO-NFCe-QRCode-contingencia-2026-10-29.md` (Manual do DANFE NFC-e e QR
 * Code v6.0 = D01; NT 2025.001 v1.03 = D02).
 *
 * - v3 on-line (D01 §4.4.1, Tabela 6): `p=<chave>|3|<tpAmb>` — sem CSC, sem hash, sem assinatura (RV ZX02-330, rej. 445).
 * - v2 on-line (D01 §4.3.1, Tabela 2; §4.3.3–4.3.4): `p=<chave>|2|<tpAmb>|<idCSC>|<hash>`, hash = SHA-1 em hex de
 *   `chave|2|tpAmb|idCSC` + CSC (colado, sem separador); idCSC sem zeros não significativos; hex em maiúsculas como no
 *   vetor do manual (a RV ZX02-316 aceita as duas caixas).
 * - Off-line (X10a PR-9, tpEmis=9): v3 com a assinatura RSA-SHA1 dos parâmetros 1–7 (D01 §4.4.2) e v2 com dia, vNF e
 *   DigestValue (D01 §4.3.2, §4.3.5).
 * - URLs por UF × ambiente em `nfceQrCode.data.json` (§2 da transcrição): UF sem fonte oficial, sem `urlChave`
 *   declarada ou com fonte ambígua fica desabilitada com o motivo — nunca a URL de outra UF.
 */

const UrlSchema = z
  .object({
    uf: z.enum(UFS),
    ambiente: z.enum(['producao', 'homologacao']),
    qrCodeBase: z.string().regex(/^https?:\/\/[^\s?|]+$/),
    urlChave: z.string().min(1),
    fonte: z.string().min(1),
  })
  .strict();
const DadosSchema = z.object({
  acessoEm: z.string(),
  fonte: z.string(),
  regra: z.string(),
  urls: z.array(UrlSchema),
  desabilitadas: z.array(z.object({ uf: z.enum(UFS), ambiente: z.enum(['producao', 'homologacao']), motivo: z.string().min(1) }).strict()),
});
const parsed = DadosSchema.parse(dados);

export const NFCE_QRCODE_URLS = parsed.urls;
export const NFCE_QRCODE_DESABILITADAS = parsed.desabilitadas;

/** Contrato do grupo ZX01 (EMENDA-1 §4): qrCode 60–1000 (D02 p. 8, vigente) e urlChave 21–85 (D02 p. 8 = D06 p. 66). */
export const InfNFeSuplSchema = z
  .object({
    qrCode: z.string().min(60).max(1000),
    urlChave: z.string().min(21).max(85),
  })
  .strict();
export type InfNFeSupl = z.infer<typeof InfNFeSuplSchema>;

export type UrlsNfce = { ok: true; qrCodeBase: string; urlChave: string } | { ok: false; motivo: string };

export function urlsNfce(uf: string, ambiente: DfeAmbiente): UrlsNfce {
  const linha = NFCE_QRCODE_URLS.find((u) => u.uf === uf && u.ambiente === ambiente);
  if (linha) return { ok: true, qrCodeBase: linha.qrCodeBase, urlChave: linha.urlChave };
  const motivo = NFCE_QRCODE_DESABILITADAS.find((d) => d.uf === uf && d.ambiente === ambiente)?.motivo ?? 'sem linha na tabela';
  return { ok: false, motivo: `NFC-e em ${uf}/${ambiente} sem URL oficial do QR Code: ${motivo}` };
}

/** CSC da unidade (cadastro `NfceCsc`): `id` é o identificador na SEFAZ (1–6 dígitos), `csc` o código (só em memória). */
export interface CscNfce {
  id: string;
  csc: string;
}

/** idCSC "sem os 0 (zeros) não significativos" (D01 Tabela 2, 4º parâmetro). */
function idCscSemZeros(id: string): string {
  if (!/^\d{1,6}$/.test(id)) throw new Error(`nfce_csc_id_invalido: ${id}`);
  return String(Number(id));
}

/** D01 §4.3.4 passos 1–3: SHA-1 de `chave|2|tpAmb|idCSC` + CSC, em hex (maiúsculas, como no vetor §4.3.6.1). */
export function hashQrCodeV2(chave: string, tpAmb: 1 | 2, idCsc: string, csc: string): string {
  return createHash('sha1').update(`${chave}|2|${tpAmb}|${idCscSemZeros(idCsc)}${csc}`, 'utf8').digest('hex').toUpperCase();
}

export function qrCodeV3Online(base: string, chave: string, tpAmb: 1 | 2): string {
  return `${base}?p=${chave}|3|${tpAmb}`;
}

export function qrCodeV2Online(base: string, chave: string, tpAmb: 1 | 2, csc: CscNfce): string {
  return `${base}?p=${chave}|2|${tpAmb}|${idCscSemZeros(csc.id)}|${hashQrCodeV2(chave, tpAmb, csc.id, csc.csc)}`;
}

/**
 * X10a PR-9 (E-9, F-NFCE-E1-5 b) — dados da NFC-e emitida em contingência off-line que entram no QR Code: dia do `dhEmi`
 * (B09, dois dígitos), `vNF` (W16, com ponto) e o destinatário (E02/E03; ausente ⇒ parâmetros vazios).
 */
export interface DadosQrOffline {
  dhEmi: string;
  vNF: string;
  dest?: { CNPJ?: string; CPF?: string } | undefined;
}

/** D01 Tabela 3/7, 4º parâmetro: "o dia da data de emissão […] exatamente dois dígitos" (o dia escrito no `dhEmi`, no fuso dele). */
function diaDoDhEmi(dhEmi: string): string {
  const dia = /^\d{4}-\d{2}-(\d{2})T/.exec(dhEmi)?.[1];
  if (!dia) throw new Error(`nfce_qr_dhemi_invalido: ${dhEmi}`);
  return dia;
}

/**
 * v3 off-line (D01 §4.4.2, Tabela 7): parâmetros 1–7 `chave|3|tpAmb|dd|vNF|tp_idDest|idDest`. Destinatário não
 * identificado ⇒ "informar apenas o separador" (6º e 7º vazios — leitura mais segura da transcrição §1(c), item 1).
 */
export function baseAssinavelQrV3Offline(chave: string, tpAmb: 1 | 2, d: DadosQrOffline): string {
  const tpIdDest = d.dest?.CNPJ ? '1' : d.dest?.CPF ? '2' : '';
  const idDest = d.dest?.CNPJ ?? d.dest?.CPF ?? '';
  return `${chave}|3|${tpAmb}|${diaDoDhEmi(d.dhEmi)}|${d.vNF}|${tpIdDest}|${idDest}`;
}

/** A URL v3 off-line: a base assinável + `|<assinatura RSA-SHA1 em Base64>` (8º parâmetro; RV ZX02-334 rej. 474 sem ele). */
export function qrCodeV3Offline(base: string, baseAssinavel: string, assinaturaB64: string): string {
  return `${base}?p=${baseAssinavel}|${assinaturaB64}`;
}

/**
 * v2 off-line (D01 §4.3.2, Tabela 3; §4.3.5): `chave|2|tpAmb|dd|vNF|digValHex|idCSC|hash`, digValHex = hex minúsculo dos
 * bytes ASCII do DigestValue em Base64 (conferido no vetor §4.3.6.2), hash = SHA-1 em hex de `chave|2|tpAmb|dd|vNF|
 * digValHex|idCSC` + CSC. Usado quando a UF recusa a v3 (rej. 407, F-NFCE-E1-4 c) e a unidade tem CSC.
 */
export function qrCodeV2Offline(base: string, chave: string, tpAmb: 1 | 2, d: DadosQrOffline, digestValueB64: string, csc: CscNfce): string {
  const digValHex = Buffer.from(digestValueB64, 'utf8').toString('hex');
  const params = `${chave}|2|${tpAmb}|${diaDoDhEmi(d.dhEmi)}|${d.vNF}|${digValHex}|${idCscSemZeros(csc.id)}`;
  const hash = createHash('sha1').update(`${params}${csc.csc}`, 'utf8').digest('hex').toUpperCase();
  return `${base}?p=${params}|${hash}`;
}

/** O grupo `infNFeSupl` validado pelo contrato; fica fora da assinatura (D02 p. 8: "não afetando a assinatura digital"). */
export function infNFeSuplXml(supl: InfNFeSupl): string {
  const s = InfNFeSuplSchema.parse(supl);
  // D02 item 04, Nota 4: na v3 (e na v2) o qrCode não precisa de CDATA — o escape XML basta.
  return `<infNFeSupl><qrCode>${escapeXml(s.qrCode)}</qrCode><urlChave>${escapeXml(s.urlChave)}</urlChave></infNFeSupl>`;
}

/** O `infNFeSupl` entra entre `</infNFe>` e `<Signature>` (ordem do XSD da NF-e 4.00: infNFe, infNFeSupl?, Signature). */
export function comInfNFeSupl(nfeAssinada: string, supl: InfNFeSupl): string {
  const i = nfeAssinada.indexOf('</infNFe>');
  if (i < 0) throw new Error('nfce_supl: NF-e sem </infNFe>');
  const fim = i + '</infNFe>'.length;
  const resto = nfeAssinada.slice(fim).replace(/^<infNFeSupl>[\s\S]*?<\/infNFeSupl>/, '');
  return nfeAssinada.slice(0, fim) + infNFeSuplXml(supl) + resto;
}
