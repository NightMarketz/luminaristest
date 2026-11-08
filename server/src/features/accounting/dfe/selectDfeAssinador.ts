import type { DfeKind } from './DfeEmissorPort';

/** X10a EMENDA-4 (AL-2; F-AL-7 a): quem assina a NF-e/NFC-e do adaptador `sefaz`. */
export type DfeAssinadorKind = 'local' | 'psc';

export type DfeAssinadorSelection = { enabled: true; kind: DfeAssinadorKind } | { enabled: false; reason: string };

const KNOWN: readonly DfeAssinadorKind[] = ['local', 'psc'];

/**
 * AL-2 — seleção do assinador POR TIPO, pura (mesmo padrão do `selectDfeEmissor`, `ADR-INCR-DFE-EMISSAO-PARCEIRO` §13
 * item 2 e §14 item 3): `DFE_ASSINADOR_<KIND>` com fallback para `DFE_ASSINADOR`, valor em `local | psc`.
 *
 * - O assinador só existe para o parceiro `sefaz` (o emissor próprio). Outro parceiro ⇒ desabilitado com o motivo.
 * - Ausente ou desconhecido ⇒ desabilitado com o motivo nomeado, nunca silêncio.
 * - `local` (padrão do desenho, ADR-ASSINADOR-LOCAL D2): assina e transmite pelo assinador do caixa; dispensa o
 *   `DFE_TRANSMISSOR_CERT`, que saiu (F-AL-7 a). `psc`: assina pelo PSC do cliente; sem transmissor do Luminaris, a
 *   transmissão também passa pelo assinador local.
 */
export function selectDfeAssinador(env: NodeJS.ProcessEnv, kind: DfeKind): DfeAssinadorSelection {
  const partner = env[`DFE_PARTNER_${kind}`] || env.DFE_PARTNER;
  if (partner !== 'sefaz') {
    return { enabled: false, reason: `o assinador só se aplica ao parceiro 'sefaz' (parceiro de ${kind}: '${partner ?? ''}')` };
  }
  const raw = env[`DFE_ASSINADOR_${kind}`] || env.DFE_ASSINADOR;
  if (!raw) return { enabled: false, reason: `DFE_ASSINADOR não configurado para ${kind} (esperado 'local' | 'psc')` };
  if (!KNOWN.includes(raw as DfeAssinadorKind)) {
    return { enabled: false, reason: `assinador '${raw}' desconhecido para ${kind} (esperado 'local' | 'psc')` };
  }
  return { enabled: true, kind: raw as DfeAssinadorKind };
}
