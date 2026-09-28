import { XMLParser } from 'fast-xml-parser';
import { ValidationError } from './errors';
import { verifyNfseEventoSignature } from './nfseSignature';

/**
 * BE-INCR-DFE-MANUAL (item 13, F-MAN-5 → a) — leitor PURO do XML do EVENTO de cancelamento `e101101` que o portal
 * devolve. Caminhos do XSD 1.01 (o XSD vence a planilha — divergência 2 da transcrição §8: `pedRegEvento` é filho de
 * `infEvento`): `evento/infEvento/pedRegEvento/infPedReg/{chNFSe, e101101/{cMotivo, xMotivo}}`
 * (`docs/accounting/fontes-oficiais/TRANSCRICAO-NFSe-infNFSe-E0010-evento-v1.01-2026-09-27.md` §7).
 */
export interface EventoCancelamento {
  chNFSe: string; // TSChaveNFSe [0-9]{50}
  cMotivo: 1 | 2 | 9; // 1 erro na emissão | 2 serviço não prestado | 9 outros
  xMotivo: string; // 15–255
  dhProc: string;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  removeNSPrefix: true,
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
});

type Node = Record<string, unknown>;
const obj = (v: unknown): Node | undefined => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Node) : undefined);
const txt = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
const fail = (motivo: string): never => {
  throw new ValidationError(`nfse_evento_invalido: ${motivo}`);
};

export function parseEventoCancelamento(input: string | Buffer): EventoCancelamento {
  const xml = (typeof input === 'string' ? input : input.toString('utf8')).trim();
  if (!xml) fail('documento vazio.');
  if (/<!DOCTYPE/i.test(xml)) fail('documento com DTD (<!DOCTYPE>) não é aceito.');
  verifyNfseEventoSignature(xml);
  let root: Node;
  try {
    root = parser.parse(xml) as Node;
  } catch (e) {
    return fail(`XML mal-formado (${(e as Error).message}).`);
  }
  const infEvento = obj(obj(root.evento)?.infEvento);
  if (!infEvento) fail('elemento <evento>/<infEvento> não encontrado.');
  const infPedReg = obj(obj(infEvento!.pedRegEvento)?.infPedReg);
  if (!infPedReg) fail('infEvento/pedRegEvento/infPedReg não encontrado.');
  const e101101 = obj(infPedReg!.e101101);
  if (!e101101) fail('o evento não é um cancelamento (e101101 ausente).');

  const chNFSe = txt(infPedReg!.chNFSe);
  if (!/^\d{50}$/.test(chNFSe)) fail(`chNFSe "${chNFSe}" fora do formato de 50 dígitos.`);
  const cMotivo = txt(e101101!.cMotivo);
  if (!['1', '2', '9'].includes(cMotivo)) fail(`cMotivo "${cMotivo}" fora de 1|2|9.`);
  const xMotivo = txt(e101101!.xMotivo);
  if (xMotivo.length < 15 || xMotivo.length > 255) fail('xMotivo fora de 15–255 caracteres.');
  const dhProc = txt(infEvento!.dhProc);
  if (!dhProc) fail('infEvento/dhProc ausente.');

  return { chNFSe, cMotivo: Number(cMotivo) as 1 | 2 | 9, xMotivo, dhProc };
}
