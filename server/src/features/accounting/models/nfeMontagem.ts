import { randomInt } from 'crypto';
import { classifyTaxId, nfeChaveCheckDigit } from '../../../lib/cnpj';
import { linhaLegalVigente, SemLinhaVigenteError, type LinhaLegal } from '../../legalParameters/models/legalParameter';
import {
  CNF_PROIBIDOS,
  XPROD_HOMOLOGACAO_NFCE,
  type NfePayload,
  type NfePayloadSemNumeracao,
} from '../dtos/NfePayloadDto';
import type { Crt } from './nfePrecondicoes';

/**
 * BE-INCR-NFCE (nó X10a, Fase C — itens 13–19 e 21) — montagem PURA da NF-e 55 / NFC-e 65 do Simples (CRT 1), a partir
 * dos perfis e da venda já lidos pelo serviço. Fonte do leiaute: `docs/accounting/fontes-oficiais/
 * TRANSCRICAO-MOC70-NFCe-NFe-saida-2026-10-26.md` (MOC 7.0 Anexo I). Decisões do dono que não estão no BRIEF (questionário
 * de 26/10, D-2026-10-26-X10A-EXECUCAO): PIS/COFINS do CRT 1 = CST do perfil com valores zerados; natOp "VENDA";
 * cProd = productRef; destinatário da NFC-e pela A9 com "vínculo do cliente = pedido do adquirente".
 */

/** Tabela de UF do IBGE (B02 "tabela IBGE de UF"): API de localidades do IBGE, `/api/v1/localidades/estados`, lida em 26/10/2026. */
export const UF_IBGE: Readonly<Record<string, string>> = {
  '11': 'RO', '12': 'AC', '13': 'AM', '14': 'RR', '15': 'PA', '16': 'AP', '17': 'TO', '21': 'MA', '22': 'PI', '23': 'CE',
  '24': 'RN', '25': 'PB', '26': 'PE', '27': 'AL', '28': 'SE', '29': 'BA', '31': 'MG', '32': 'ES', '33': 'RJ', '35': 'SP',
  '41': 'PR', '42': 'SC', '43': 'RS', '50': 'MS', '51': 'MT', '52': 'GO', '53': 'DF',
};

/** cUF = 2 primeiros dígitos do código IBGE do município (item 15: cUF ≠ prefixo do codMun é impossível por construção). */
export function ufDoCodMun(codMun: string): { cUF: string; UF: string } {
  const cUF = codMun.slice(0, 2);
  const UF = UF_IBGE[cUF];
  if (!UF) throw new Error(`nfe_cuf_desconhecido: codMun ${codMun} não começa por um código de UF do IBGE.`);
  return { cUF, UF };
}

/** natOp (B04) — decisão do dono de 26/10 ("VENDA + productRef"): só venda a consumidor nesta fatia. */
export const NAT_OP_VENDA = 'VENDA';
export const NFE_VERPROC = 'luminaris-1.0';

/**
 * Item 18 — `sales.paymentMethod` → `tPag` (YA02, `[NFE-PAG]`). `Package Balance` e qualquer outro valor ⇒ recusa nomeada
 * (BRIEF §6: o `tPag` do saldo de pacote é pergunta ao contador).
 */
export const TPAG_POR_METODO: Readonly<Record<string, string>> = { Cash: '01', 'Credit Card': '03', 'Debit Card': '04', Pix: '17' };

export function tPagDoMetodo(paymentMethod: unknown): { tPag: string } | { faltante: string } {
  const tPag = typeof paymentMethod === 'string' ? TPAG_POR_METODO[paymentMethod] : undefined;
  if (tPag) return { tPag };
  if (paymentMethod === 'Package Balance') {
    return { faltante: "forma de pagamento 'Package Balance' sem tPag definido (YA02) — pendente do contador (BRIEF §6)" };
  }
  return { faltante: `forma de pagamento '${String(paymentMethod ?? '')}' sem tPag mapeado (YA02: Cash, Credit Card, Debit Card, Pix)` };
}

/**
 * Item 19 (`[RTC-SIMPLES]`, NT 2025.002 v1.52 RV UB12-10): CRT 1/2/4 só leva o grupo IBSCBS a partir de 04/01/2027, e as
 * orientações estão em "NT futura" ainda não transcrita ⇒ a partir dessa data o documento do Simples é recusado.
 */
export const RTC_SIMPLES_DESDE = '2027-01-04';
export const RTC_SIMPLES_NAO_TRANSCRITO =
  'rtc_simples_nao_transcrito: a partir de 04/01/2027 a NF-e/NFC-e do Simples leva o grupo IBSCBS (NT 2025.002 RV UB12-10), cujas orientações para o CRT 1 estão em NT futura ainda não transcrita';

/** Limites da NFC-e (item 17 pela A9): Aj. SINIEF 19/16 cl. 4ª VII "a" e § 4º; a linha da UF (§ 5º) vence a nacional. */
export interface LimitesNfce {
  destIdentificadoCents: number;
  vedadaCents: number;
}

export function limitesNfce(linhas: readonly LinhaLegal[], cUF: string, data: string): LimitesNfce {
  const valor = (chave: 'DEST_IDENTIFICADO_CENTS' | 'VEDADA_CENTS'): number => {
    const l = linhaLegalVigente(linhas, 'NFCE_LIMITE', chave, data, cUF) ?? linhaLegalVigente(linhas, 'NFCE_LIMITE', chave, data);
    if (l?.valorInt == null) throw new SemLinhaVigenteError('NFCE_LIMITE', data, chave);
    return l.valorInt;
  };
  return { destIdentificadoCents: valor('DEST_IDENTIFICADO_CENTS'), vedadaCents: valor('VEDADA_CENTS') };
}

/** O cliente da venda como a montagem o enxerga: sem cliente/sem documento, documento válido por DV, ou documento inválido. */
export type ClienteDaVenda =
  | { status: 'sem_documento' }
  | { status: 'valido'; cpf?: string; cnpj?: string; xNome: string }
  | { status: 'invalido'; customerId: string };

export function clienteDaVenda(customerId: string, taxIdRaw: string, xNome: string): ClienteDaVenda {
  if (!customerId || !taxIdRaw.trim()) return { status: 'sem_documento' };
  const doc = classifyTaxId(taxIdRaw);
  if (!doc) return { status: 'invalido', customerId };
  return { status: 'valido', ...doc, xNome };
}

type DestNfe = NonNullable<NfePayload['infNFe']['dest']>;

/**
 * Item 17 pela A9 (Aj. SINIEF 19/16 cl. 4ª VII e § 4º; transcrição §9) — destinatário da NFC-e:
 *  - vNF ≥ limite vedado ⇒ recusa (a NFC-e é vedada; o documento é a NF-e — W16-30, rej. 780);
 *  - cliente com documento válido ⇒ `dest` com CPF/CNPJ e `indIEDest = 9` (E16a-10): vincular o cliente = pedido do
 *    adquirente (alínea "b"; questionário de 26/10, "Vínculo = pedido");
 *  - cliente com documento inválido por DV ⇒ recusa (nunca emite sem destinatário em silêncio);
 *  - sem documento: abaixo do limite ⇒ sem `dest`; a partir dele ⇒ recusa (alínea "a"; W16-40, rej. 750 — o Ajuste diz
 *    "igual ou superior", o MOC "superior": vale o Ajuste).
 * A venda do Luminaris é sempre presencial (`indPres = 1`, item 15), então a alínea "c" não se aplica aqui.
 */
export function destNfce(
  vNFCents: number,
  limites: LimitesNfce,
  cliente: ClienteDaVenda,
): { dest: DestNfe | null; faltantes: string[] } {
  if (vNFCents >= limites.vedadaCents) {
    return {
      dest: null,
      faltantes: [`NFC-e vedada a partir de R$ ${(limites.vedadaCents / 100).toFixed(2)} — emita NF-e (Aj. SINIEF 19/16 cl. 4ª § 4º; W16-30, rej. 780)`],
    };
  }
  if (cliente.status === 'invalido') {
    return { dest: null, faltantes: [`cliente '${cliente.customerId}': taxId inválido por dígito verificador (E02-10/E03-10, rej. 208/237)`] };
  }
  if (cliente.status === 'valido') {
    const doc = cliente.cnpj ? { CNPJ: cliente.cnpj } : { CPF: cliente.cpf! };
    const xNome = cliente.xNome.trim().slice(0, 60);
    return { dest: { ...doc, ...(xNome.length >= 2 ? { xNome } : {}), indIEDest: 9 }, faltantes: [] };
  }
  if (vNFCents >= limites.destIdentificadoCents) {
    return {
      dest: null,
      faltantes: [
        `cliente com CPF/CNPJ: NFC-e a partir de R$ ${(limites.destIdentificadoCents / 100).toFixed(2)} exige o destinatário (Aj. SINIEF 19/16 cl. 4ª VII "a"; W16-40, rej. 750)`,
      ],
    };
  }
  return { dest: null, faltantes: [] };
}

/** "0.00" a partir de centavos inteiros (13v2). */
export function moneyDeCents(c: number): string {
  if (!Number.isInteger(c) || c < 0) throw new Error(`nfe_valor_invalido: ${c}`);
  return `${Math.trunc(c / 100)}.${String(c % 100).padStart(2, '0')}`;
}

/** Quantidade 11v0-4 (I10) — até 4 casas, sem zeros à direita desnecessários. */
export function qtdTexto(qty: number): string {
  const escala = Math.round(qty * 10_000);
  if (escala <= 0) throw new Error(`nfe_quantidade_invalida: ${qty}`);
  const int = Math.trunc(escala / 10_000);
  const frac = String(escala % 10_000).padStart(4, '0').replace(/0+$/, '');
  return frac ? `${int}.${frac}` : String(int);
}

/** vUnCom 11v0-10 (I10a) = vProd ÷ qCom, arredondado meio-para-cima na 10ª casa. */
export function vUnTexto(vProdCents: number, qty: number): string {
  const q = BigInt(Math.round(qty * 10_000));
  const num = BigInt(vProdCents) * 10n ** 12n; // vProd × 10^10 ÷ (q / 10^4), com vProd em reais = cents / 100
  const v = (num * 2n + q) / (q * 2n);
  const s = v.toString().padStart(11, '0');
  return `${BigInt(s.slice(0, -10)).toString()}.${s.slice(-10)}`;
}

/** Item 19 (CRT 1) — o subgrupo ICMSSN do CSOSN do perfil (N10d / N10g); nenhum valor de ICMS (o Simples recolhe no DAS). */
function icmsSimples(csosn: string, origem: number): NfePayload['infNFe']['det'][number]['imposto']['ICMS'] {
  if (csosn === '500') return { ICMSSN500: { orig: origem, CSOSN: '500' } };
  return { ICMSSN102: { orig: origem, CSOSN: csosn as '102' | '103' | '300' | '400' } };
}

/**
 * PIS/COFINS do CRT 1 (decisão do dono, 26/10: "CST do perfil, zerado") — CST 04–09 ⇒ PISNT/COFINSNT (Q04/S04); CST 49–99
 * ⇒ PISOutr/COFINSOutr (Q05/S05) com base, alíquota e valor zero. CST 01/02 (Q02/S02) exige alíquota, que o Simples não
 * destaca ⇒ faltante. A prática não teve base legal conferida — pendente do contador (registrado no PR-3).
 */
export function pisCofinsSimples(t: 'PIS' | 'COFINS', cst: string): { grupo: Record<string, unknown> } | { faltante: string } {
  if (cst === '01' || cst === '02') return { faltante: `CST ${t} ${cst} exige alíquota (${t === 'PIS' ? 'Q02' : 'S02'}), que o Simples não destaca` };
  if (['04', '05', '06', '07', '08', '09'].includes(cst)) return { grupo: { [`${t}NT`]: { CST: cst } } };
  const p = t === 'PIS' ? 'pPIS' : 'pCOFINS';
  const v = t === 'PIS' ? 'vPIS' : 'vCOFINS';
  return { grupo: { [`${t}Outr`]: { CST: cst, vBC: '0.00', [p]: '0.00', [v]: '0.00' } } };
}

export interface ItemParaMontagem {
  productRef: string;
  xProd: string; // perfil.xProd ?? products.name
  qty: number;
  vProdCents: number; // já rateado do crédito 3.3 (item 14)
  perfil: { ncm: string; cest: string | null; origem: number; cfopPadrao: string; csosn: string | null; uCom: string; cEan: string; cstPis: string; cstCofins: string };
}

export interface MontagemNfeInput {
  mod: 55 | 65;
  ambiente: 'producao' | 'homologacao';
  serie: number;
  dhEmi: string;
  codMun: string;
  crt: Crt;
  emit: {
    cnpj: string;
    razaoSocial: string;
    ie: string;
    logradouro: string;
    numero: string;
    complemento: string | null;
    bairro: string;
    municipio: string;
    cep: string;
  };
  dest: DestNfe | null;
  itens: ItemParaMontagem[];
  tPag: string;
}

/**
 * Itens 13–19 — a nota sem numeração (Id/cNF/nNF/cDV vêm de `numerarNfe`, item 21). Preço líquido no item, `vDesc = 0`
 * (F-NFCE-11 a): Σ vProd = crédito 3.3, e vNF = vProd (W16-10, sem frete/seguro/ST/IPI). Só CRT 1 aqui; o regime normal é o
 * PR-6 (item 20) — quem chama recusa antes.
 */
export function montarNfe(input: MontagemNfeInput): NfePayloadSemNumeracao {
  if (input.crt !== 1) throw new Error('nfe_crt_nao_suportado: a montagem do PR-3 é só do CRT 1 (Simples).');
  const { cUF, UF } = ufDoCodMun(input.codMun);
  const nfce = input.mod === 65;
  const det = input.itens.map((it, i) => {
    const qCom = qtdTexto(it.qty);
    const vUnCom = vUnTexto(it.vProdCents, it.qty);
    const pis = pisCofinsSimples('PIS', it.perfil.cstPis);
    const cofins = pisCofinsSimples('COFINS', it.perfil.cstCofins);
    if ('faltante' in pis || 'faltante' in cofins || !it.perfil.csosn) {
      throw new Error(`nfe_pre_condicao_violada: item ${it.productRef} chegou à montagem com faltante (bug do chamador).`);
    }
    return {
      nItem: i + 1,
      prod: {
        cProd: it.productRef,
        cEAN: it.perfil.cEan,
        xProd: nfce && i === 0 && input.ambiente === 'homologacao' ? XPROD_HOMOLOGACAO_NFCE : it.xProd.slice(0, 120), // I04-10 (373)
        NCM: it.perfil.ncm,
        ...(it.perfil.cest ? { CEST: it.perfil.cest } : {}),
        CFOP: it.perfil.cfopPadrao,
        uCom: it.perfil.uCom,
        qCom,
        vUnCom,
        vProd: moneyDeCents(it.vProdCents),
        cEANTrib: it.perfil.cEan,
        uTrib: it.perfil.uCom,
        qTrib: qCom,
        vUnTrib: vUnCom,
        indTot: 1 as const,
      },
      imposto: {
        ICMS: icmsSimples(it.perfil.csosn, it.perfil.origem),
        PIS: pis.grupo,
        COFINS: cofins.grupo,
      },
    };
  });
  const vProd = input.itens.reduce((s, it) => s + it.vProdCents, 0);
  const zero = '0.00';
  const e = input.emit;
  return {
    infNFe: {
      versao: '4.00',
      ide: {
        cUF,
        natOp: NAT_OP_VENDA,
        mod: input.mod,
        serie: input.serie,
        dhEmi: input.dhEmi,
        tpNF: 1,
        idDest: 1,
        cMunFG: input.codMun,
        tpImp: nfce ? 4 : 1, // B21: 4 = DANFE NFC-e; na 55, 1 = DANFE retrato
        tpEmis: 1,
        tpAmb: input.ambiente === 'producao' ? 1 : 2, // mesmo mapeamento de tpAmbFor (F-AMB-6 a)
        finNFe: 1,
        indFinal: 1,
        indPres: 1,
        procEmi: 0,
        verProc: NFE_VERPROC,
      },
      emit: {
        CNPJ: e.cnpj,
        xNome: e.razaoSocial,
        enderEmit: {
          xLgr: e.logradouro,
          nro: e.numero,
          ...(e.complemento ? { xCpl: e.complemento } : {}),
          xBairro: e.bairro,
          cMun: input.codMun,
          xMun: e.municipio,
          UF,
          CEP: e.cep,
        },
        IE: e.ie,
        CRT: input.crt,
      },
      ...(input.dest ? { dest: input.dest } : {}),
      det: det as NfePayloadSemNumeracao['infNFe']['det'],
      total: {
        ICMSTot: {
          vBC: zero, vICMS: zero, vICMSDeson: zero, vBCST: zero, vST: zero, vFCPST: zero, vProd: moneyDeCents(vProd),
          vFrete: zero, vSeg: zero, vDesc: zero, vII: zero, vIPI: zero, vIPIDevol: zero, vPIS: zero, vCOFINS: zero,
          vOutro: zero, vNF: moneyDeCents(vProd),
        },
      },
      transp: { modFrete: 9 },
      pag: { detPag: [{ tPag: input.tPag, vPag: moneyDeCents(vProd) }] },
    },
  };
}

/** B03 (rej. 897) — cNF aleatório de 8 dígitos, fora da lista proibida e diferente do nNF. */
export function gerarCnf(nNF: number, sorteio: () => number = () => randomInt(0, 100_000_000)): string {
  for (;;) {
    const cNF = String(sorteio()).padStart(8, '0');
    if (!(CNF_PROIBIDOS as readonly string[]).includes(cNF) && cNF !== String(nNF).padStart(8, '0')) return cNF;
  }
}

/**
 * Item 21 (`[NFE-CHAVE]`, VG Tabela 2-1) — chave de 44: cUF(2) AAMM(4) CNPJ(14) mod(2) serie(3) nNF(9) tpEmis(1) cNF(8) cDV(1),
 * DV módulo 11 (`nfeChaveCheckDigit`). Só quando o Luminaris numera (`numbersDps === false`).
 */
export function numerarNfe(semNumero: NfePayloadSemNumeracao, nNF: number, cNF: string): NfePayload {
  const { ide, emit } = semNumero.infNFe;
  const aamm = ide.dhEmi.slice(2, 4) + ide.dhEmi.slice(5, 7);
  const chave43 = `${ide.cUF}${aamm}${emit.CNPJ}${ide.mod}${String(ide.serie).padStart(3, '0')}${String(nNF).padStart(9, '0')}${ide.tpEmis}${cNF}`;
  const cDV = nfeChaveCheckDigit(chave43);
  return { infNFe: { Id: `NFe${chave43}${cDV}`, ...semNumero.infNFe, ide: { ...ide, cNF, nNF, cDV } } };
}

/** `dhEmi` (B09) no fuso do escopo: AAAA-MM-DDThh:mm:ss±hh:mm (F-NFCE-6 a: momento da montagem). */
export function dhEmiNoFuso(instante: Date, timeZone: string): string {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
      timeZoneName: 'longOffset',
    })
      .formatToParts(instante)
      .map((p) => [p.type, p.value]),
  );
  const off = partes.timeZoneName === 'GMT' ? '+00:00' : String(partes.timeZoneName).replace('GMT', '');
  return `${partes.year}-${partes.month}-${partes.day}T${partes.hour}:${partes.minute}:${partes.second}${off}`;
}
