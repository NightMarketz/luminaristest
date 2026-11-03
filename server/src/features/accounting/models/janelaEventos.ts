import { JanelaEventosSchema, type JanelaEventos } from '../dtos/FiscalDocumentDto';
import { dateOnlyFromDayNumber, dayNumberFromDateOnly, scopeDay } from './dates';
import type { DfeKind } from '../dfe/DfeEmissorPort';

/**
 * BE-INCR-DFE-EVENTOS (nó X11, item 3) — janela de cancelamento/substituição de uma NFS-e. Função pura.
 *
 * - Base = `nfseDhProc` (infNFSe/dhProc [19]) — F-EVT-2 (b), ratificado 02/10.
 * - Dias de CALENDÁRIO no fuso `America/Sao_Paulo`; o prazo vence às 23:59:59 do último dia (F-EVT-2 b). O fuso é o
 *   do fork, não o do escopo.
 * - `cancelarAte`/`substituirAte` só existem com o prazo do município configurado no perfil (F-EVT-1 a): o número é
 *   nível 3 — Anexo II RN E0822 [28] (cancelamento) e Anexo I RN E0050 [173] (substituição); a fonte primária não o traz.
 * - `substituirTeto` = base + 2 anos (Anexo I [114], obs. de `chSubstda`: "Prazo máximo parametrizável é 2 anos") —
 *   único limite nacional; mesma base e mesmo calendário (F-EVT-2 b).
 * - Sem `nfseDhProc` (documento anterior ao X11) ⇒ tudo `null`.
 *
 * BE-INCR-NFCE (nó X10a, item 27; F-NFCE-10 a) — ramo 55/65, cancelamento 110111:
 * - Base = a mesma coluna, com o `protNFe/infProt/dhRecbto` devolvido pelo parceiro em `EmissaoResult.dhProc`
 *   (EMENDA 2026-10-11 §3 E3-2: "calculada em minutos sobre dhRecbto").
 * - Prazo CORRIDO a partir do instante (não dia de calendário): NF-e `nfeCancelPrazoHoras`, null ⇒ 24 h (Aj. SINIEF 07/05
 *   cl. 12ª); NFC-e `nfceCancelPrazoMinutos`, null ⇒ 30 min (Aj. SINIEF 19/16 cl. 15ª; errata de 10/10 em
 *   `docs/plano/PERGUNTAS-DE-LEI-2026-10-10.md` §10.2). `fonte` = 'perfil' com o campo do tipo preenchido, senão
 *   'nacional' (dono, questionário de 26/10).
 * - `substituirAte`/`substituirTeto` = null: o 110112 está fora (item 29, F-NFCE-9 c) e o teto de 2 anos é da NFS-e.
 */
export const JANELA_TIME_ZONE = 'America/Sao_Paulo';

const pad = (n: number) => String(n).padStart(2, '0');

/** Offset do fuso no instante, como "-03:00" (Intl `longOffset`: "GMT-03:00"; UTC puro vem como "GMT"). */
function offsetAt(instant: Date, timeZone: string): string {
  const part = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' })
    .formatToParts(instant)
    .find((p) => p.type === 'timeZoneName')?.value;
  const m = /GMT([+-]\d{2}):?(\d{2})/.exec(part ?? '');
  return m ? `${m[1]}:${m[2]}` : '+00:00';
}

/** 23:59:59 do dia `dateOnly` no fuso, em ISO com o offset daquele instante. */
function endOfDayIso(dateOnly: string, timeZone: string): string {
  const guess = new Date(`${dateOnly}T23:59:59Z`);
  const off = offsetAt(guess, timeZone);
  const sign = off.startsWith('-') ? -1 : 1;
  const minutes = sign * (Number(off.slice(1, 3)) * 60 + Number(off.slice(4, 6)));
  const exact = new Date(guess.getTime() - minutes * 60_000);
  return `${dateOnly}T23:59:59${offsetAt(exact, timeZone)}`;
}

/** Mesmo dia/mês `anos` depois. 29/02 sem 29/02 no ano-alvo ⇒ 28/02 (nunca rola para março). */
function addYears(dateOnly: string, anos: number): string {
  const [y, m, d] = dateOnly.split('-').map(Number);
  const ty = y + anos;
  const lastDay = new Date(Date.UTC(ty, m, 0)).getUTCDate();
  return `${ty}-${pad(m)}-${pad(Math.min(d, lastDay))}`;
}

/** Prazos nacionais do cancelamento 110111 quando o perfil não traz o do tipo (item 27). */
export const NFE_CANCEL_PRAZO_HORAS_NACIONAL = 24; // Aj. SINIEF 07/05 cl. 12ª
export const NFCE_CANCEL_PRAZO_MINUTOS_NACIONAL = 30; // Aj. SINIEF 19/16 cl. 15ª

/** O instante em ISO com o offset do fuso naquele instante; segundos truncados (o `dhRecbto` não tem fração). */
function isoAt(instant: Date, timeZone: string): string {
  const off = offsetAt(instant, timeZone);
  const sign = off.startsWith('-') ? -1 : 1;
  const minutes = sign * (Number(off.slice(1, 3)) * 60 + Number(off.slice(4, 6)));
  const local = new Date(Math.floor(instant.getTime() / 1000) * 1000 + minutes * 60_000);
  return `${local.toISOString().slice(0, 19)}${off}`;
}

type PrazosDoPerfil = {
  cancelPrazoDias: number | null;
  substPrazoDias: number | null;
  nfeCancelPrazoHoras?: number | null;
  nfceCancelPrazoMinutos?: number | null;
};

function janelaNfe(kind: 'NFE' | 'NFCE', dhRecbto: Date | null, profile: PrazosDoPerfil | null): JanelaEventos {
  const doPerfil = kind === 'NFE' ? profile?.nfeCancelPrazoHoras ?? null : profile?.nfceCancelPrazoMinutos ?? null;
  const minutos = kind === 'NFE' ? (doPerfil ?? NFE_CANCEL_PRAZO_HORAS_NACIONAL) * 60 : doPerfil ?? NFCE_CANCEL_PRAZO_MINUTOS_NACIONAL;
  return JanelaEventosSchema.parse({
    cancelarAte: dhRecbto ? isoAt(new Date(dhRecbto.getTime() + minutos * 60_000), JANELA_TIME_ZONE) : null,
    substituirAte: null,
    substituirTeto: null,
    fonte: doPerfil != null ? 'perfil' : 'nacional',
  });
}

export function janelaEventos(
  doc: { kind: DfeKind; nfseDhProc: Date | null },
  profile: PrazosDoPerfil | null,
): JanelaEventos {
  if (doc.kind !== 'NFSE') return janelaNfe(doc.kind, doc.nfseDhProc, profile);
  const cancelPrazo = profile?.cancelPrazoDias ?? null;
  const substPrazo = profile?.substPrazoDias ?? null;
  const fonte = cancelPrazo != null || substPrazo != null ? 'perfil' : 'desconhecida';
  if (!doc.nfseDhProc) {
    return JanelaEventosSchema.parse({ cancelarAte: null, substituirAte: null, substituirTeto: null, fonte });
  }
  const baseDay = scopeDay({ timeZone: JANELA_TIME_ZONE }, doc.nfseDhProc);
  const plusDays = (n: number) => endOfDayIso(dateOnlyFromDayNumber(dayNumberFromDateOnly(baseDay) + n), JANELA_TIME_ZONE);
  return JanelaEventosSchema.parse({
    cancelarAte: cancelPrazo != null ? plusDays(cancelPrazo) : null,
    substituirAte: substPrazo != null ? plusDays(substPrazo) : null,
    substituirTeto: endOfDayIso(addYears(baseDay, 2), JANELA_TIME_ZONE),
    fonte,
  });
}

/** `instante` depois do fim da janela (`ate` ISO com fuso). `null` = sem janela ⇒ nunca "fora". */
export function foraDaJanela(ate: string | null, instante: Date): boolean {
  return ate != null && instante.getTime() > Date.parse(ate);
}
