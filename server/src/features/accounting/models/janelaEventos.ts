import { JanelaEventosSchema, type JanelaEventos } from '../dtos/FiscalDocumentDto';
import { dateOnlyFromDayNumber, dayNumberFromDateOnly, scopeDay } from './dates';

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

export function janelaEventos(
  doc: { nfseDhProc: Date | null },
  profile: { cancelPrazoDias: number | null; substPrazoDias: number | null } | null,
): JanelaEventos {
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
