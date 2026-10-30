import type { LinhaLegal } from '../../legalParameters/models/legalParameter';
import type { NfePayload, NfePayloadSemNumeracao } from '../dtos/NfePayloadDto';
import { dateOnlyFromDayNumber, dayNumberFromDateOnly } from './dates';
import { ehDiaUtil } from './profitDistribution';

/**
 * Contingência off-line da NFC-e — regras puras (X10a PR-9; BE-INCR-NFCE-EMENDA-1 E-9, F-NFCE-E1-5 b). Fonte:
 * `TRANSCRICAO-NFCe-QRCode-contingencia-2026-10-29.md` §3 (MOC 7.0 Anexo IV = D03) e D-2026-10-29-X10A-PR7-9-FORKS.
 */

/** Justificativa (B29, 15–256) da entrada AUTOMÁTICA (decisão 4): a falha de comunicação com a autorizadora. */
export const XJUST_ENTRADA_AUTOMATICA = 'Falha de comunicacao com o webservice de autorizacao da SEFAZ';

/** Decisão 9: o alerta dispara faltando 4 h para o fim do prazo. */
export const ALERTA_PRAZO_ANTECEDENCIA_MS = 4 * 3600_000;

/**
 * Prazo de transmissão (D03 p. 7: "até o final do primeiro dia útil subsequente contado a partir de sua emissão em
 * contingência"; Aj. SINIEF 19/16 cl. 11ª §1º II "a"): 23:59:59 do 1º dia útil depois do dia do `dhEmi`, no fuso do próprio
 * `dhEmi` (o da unidade). Dia útil = seg–sex fora de `FERIADO_NACIONAL` (`ehDiaUtil`; decisão 9 — feriado estadual ou
 * municipal fora só encurta o prazo, nunca o alonga).
 */
export function prazoTransmissao(dhEmi: string, feriados: readonly LinhaLegal[]): Date {
  const m = /^(\d{4}-\d{2}-\d{2})T[\d:.]+([+-]\d{2}:\d{2}|Z)$/.exec(dhEmi);
  if (!m) throw new Error(`nfce_contingencia_dhemi_invalido: ${dhEmi}`);
  let n = dayNumberFromDateOnly(m[1]) + 1;
  while (!ehDiaUtil(dateOnlyFromDayNumber(n), feriados)) n += 1;
  return new Date(`${dateOnlyFromDayNumber(n)}T23:59:59${m[2]}`);
}

export type AlertaDePrazo = 'PERTO' | 'VENCIDO' | null;

/** Decisão 9: `PERTO` faltando ≤ 4 h; `VENCIDO` depois do fim do prazo. */
export function alertaDePrazo(agora: Date, prazo: Date): AlertaDePrazo {
  const falta = prazo.getTime() - agora.getTime();
  if (falta < 0) return 'VENCIDO';
  return falta <= ALERTA_PRAZO_ANTECEDENCIA_MS ? 'PERTO' : null;
}

/** Justificativa (P30, 15–255) do 110112 que o job pede sobre a nota normal autorizada (decisão 6). */
export const XJUST_CANCEL_SUBST = 'NFC-e substituida por NFC-e emitida em contingencia off-line';

/** Justificativa (15–255) do pedido de inutilização do número da nota normal que a SEFAZ não recebeu (decisão 6). */
export const XJUST_INUT_ORFA = 'Numero de NFC-e nao autorizada, substituida por NFC-e emitida em contingencia off-line';

/** A nota sem a numeração da chave (Id, cNF, nNF, cDV) — para renumerar a venda que sai em contingência. */
export function semNumeracao(p: NfePayload): NfePayloadSemNumeracao {
  const { Id: _id, ...inf } = p.infNFe;
  const { cNF: _cNF, nNF: _nNF, cDV: _cDV, ...ide } = inf.ide;
  return { infNFe: { ...inf, ide } };
}

/**
 * A NFC-e off-line (D03 p. 9: "tpEmis = 9 (contingência off-line)"; dhCont/xJust obrigatórios, B28-20 rej. 557). O
 * `dhEmi` é o da emissão em contingência; a numeração vem depois (`numerarNfe`), com número novo (D03 p. 8: "avance um
 * número na sequência"; p. 11: "É vedada a reutilização, em contingência, de número de NFC-e transmitida com tipo de
 * emissão 'Normal'").
 */
export function emContingencia(p: NfePayloadSemNumeracao, c: { dhEmi: string; dhCont: string; xJust: string }): NfePayloadSemNumeracao {
  if (p.infNFe.ide.mod !== 65) throw new Error('nfce_contingencia_modelo: contingência off-line só na NFC-e (rej. 711 na 55)');
  return { infNFe: { ...p.infNFe, ide: { ...p.infNFe.ide, tpEmis: 9, dhEmi: c.dhEmi, dhCont: c.dhCont, xJust: c.xJust } } };
}
