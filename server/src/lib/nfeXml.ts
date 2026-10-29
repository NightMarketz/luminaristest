import type { NfePayload } from '../features/accounting/dtos/NfePayloadDto';

/**
 * BE-INCR-NFCE-EMENDA-1 item E-2 (X10a PR-7) — serialização da NF-e 55 / NFC-e 65 em XML 4.00, a partir do payload já
 * validado pelo `NfePayloadSchema`. Namespace `http://www.portalfiscal.inf.br/nfe` sem prefixo, `infNFe/@Id` e
 * `@versao` como atributos (A02/A03), elementos na ordem do leiaute (transcrição do PR-0,
 * `docs/accounting/fontes-oficiais/TRANSCRICAO-MOC70-NFCe-NFe-saida-2026-10-26.md`). Pura: sem rede, sem assinatura
 * (quem assina é `dfeXmlSign.ts`). Nada fora do payload entra no XML.
 *
 * A ordem dos grupos segue a ordem das chaves do schema (que o PR-3/PR-6 escreveram na ordem do leiaute); a única
 * exceção é o `ide`, em que o schema junta a numeração (B03 cNF, B08 nNF, B23 cDV) no fim — aqui ela volta ao lugar
 * do leiaute (`IDE_ORDER`).
 */

export const NFE_NS = 'http://www.portalfiscal.inf.br/nfe';

/** B02–B27 do Anexo I (transcrição §1): a ordem dos filhos de `ide`. */
export const IDE_ORDER = [
  'cUF', 'cNF', 'natOp', 'mod', 'serie', 'nNF', 'dhEmi', 'dhSaiEnt', 'tpNF', 'idDest', 'cMunFG', 'tpImp', 'tpEmis', 'cDV',
  'tpAmb', 'finNFe', 'indFinal', 'indPres', 'indIntermed', 'procEmi', 'verProc', 'dhCont', 'xJust',
] as const;

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' };
export const escapeXml = (s: string): string => s.replace(/[&<>"']/g, (c) => ESCAPES[c]);

type Valor = string | number | boolean | null | undefined | Valor[] | { [k: string]: Valor };

function elemento(nome: string, valor: Valor, attrs = ''): string {
  if (valor === undefined || valor === null) return '';
  if (Array.isArray(valor)) return valor.map((v) => elemento(nome, v)).join('');
  if (typeof valor === 'object') return `<${nome}${attrs}>${filhos(nome, valor)}</${nome}>`;
  return `<${nome}${attrs}>${escapeXml(String(valor))}</${nome}>`;
}

function filhos(pai: string, obj: { [k: string]: Valor }): string {
  if (pai === 'ide') {
    const extra = Object.keys(obj).filter((k) => !(IDE_ORDER as readonly string[]).includes(k));
    if (extra.length) throw new Error(`nfe_xml_campo_desconhecido: ide/${extra.join(', ')}`);
    return IDE_ORDER.map((k) => elemento(k, obj[k])).join('');
  }
  return Object.entries(obj)
    .map(([k, v]) => {
      if (pai === 'det' && k === 'nItem') return ''; // H01 @nItem é atributo
      return elemento(k, v);
    })
    .join('');
}

/** `det` com o atributo `nItem` (H01). */
function det(itens: NfePayload['infNFe']['det']): string {
  return itens
    .map((d) => {
      const { nItem, ...resto } = d;
      return `<det nItem="${nItem}">${filhos('det', resto as unknown as { [k: string]: Valor })}</det>`;
    })
    .join('');
}

/**
 * `<NFe xmlns=…><infNFe Id=… versao="4.00">…</infNFe></NFe>`, sem `<Signature>` e sem `infNFeSupl` (o QR Code entra no
 * PR-8, fora da assinatura — ZX01). Sem declaração `<?xml?>`: o lote `enviNFe` embute a nota como elemento.
 */
export function serializeNfe(payload: NfePayload): string {
  const { Id, versao, det: itens, ...grupos } = payload.infNFe;
  const corpo = Object.entries(grupos)
    .map(([k, v]) => (k === 'det' ? '' : elemento(k, v as Valor)))
    .join('');
  // `det` vem entre `dest` e `total` (H01 depois de E01, antes de W01).
  const [antes, depois] = splitAntesDeTotal(corpo);
  return `<NFe xmlns="${NFE_NS}"><infNFe Id="${escapeXml(Id)}" versao="${escapeXml(versao)}">${antes}${det(itens)}${depois}</infNFe></NFe>`;
}

function splitAntesDeTotal(corpo: string): [string, string] {
  const i = corpo.indexOf('<total>');
  if (i < 0) throw new Error('nfe_xml_sem_total: grupo W01 ausente');
  return [corpo.slice(0, i), corpo.slice(i)];
}

/** Tabela IBGE de UF (B02 cUF) — a mesma que a chave de acesso usa nas posições 1–2. */
export const CUF_POR_SIGLA: Readonly<Record<string, string>> = {
  RO: '11', AC: '12', AM: '13', RR: '14', PA: '15', AP: '16', TO: '17', MA: '21', PI: '22', CE: '23', RN: '24', PB: '25',
  PE: '26', AL: '27', SE: '28', BA: '29', MG: '31', ES: '32', RJ: '33', SP: '35', PR: '41', SC: '42', RS: '43', MS: '50',
  MT: '51', GO: '52', DF: '53',
};
export const SIGLA_POR_CUF: Readonly<Record<string, string>> = Object.fromEntries(Object.entries(CUF_POR_SIGLA).map(([s, c]) => [c, s]));

/** Partes da chave de acesso (44 dígitos; CNPJ alfanumérico nas posições 7–20, NT 2026.004). */
export function partesDaChave(chave: string): { cUF: string; uf: string; cnpj: string; modelo: 55 | 65; serie: number; nNF: number; tpEmis: number } {
  if (!/^\d{6}[A-Z0-9]{12}\d{26}$/.test(chave)) throw new Error(`nfe_chave_invalida: ${chave}`);
  const cUF = chave.slice(0, 2);
  const uf = SIGLA_POR_CUF[cUF];
  if (!uf) throw new Error(`nfe_chave_cuf_desconhecido: ${cUF}`);
  const mod = Number(chave.slice(20, 22));
  if (mod !== 55 && mod !== 65) throw new Error(`nfe_chave_modelo_invalido: ${mod}`);
  return { cUF, uf, cnpj: chave.slice(6, 20), modelo: mod, serie: Number(chave.slice(22, 25)), nNF: Number(chave.slice(25, 34)), tpEmis: Number(chave.slice(34, 35)) };
}
