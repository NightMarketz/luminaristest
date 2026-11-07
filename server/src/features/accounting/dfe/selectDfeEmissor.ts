import { DfeDisabledEmissor } from './DfeDisabledEmissor';
import { ManualEmissor } from './ManualEmissor';
import { NullEmissor } from './NullEmissor';
import { SefazNfeEmissor } from './sefaz/SefazNfeEmissor';
import { transporteAssinadorLocal } from './local/assinadorLocalRuntime';
import { selectDfeAssinador, type DfeAssinadorKind } from './selectDfeAssinador';
import type { SefazTransporte } from './sefaz/SefazTransporte';
import type { DfeAmbiente, DfeEmissorPort, DfeKind } from './DfeEmissorPort';

export interface DfeSelection {
  port: DfeEmissorPort;
  /** null quando a porta está desabilitada (nenhum ambiente configurado se aplica). */
  ambiente: DfeAmbiente | null;
  enabled: boolean;
  reason?: string;
  /** X10a EMENDA-4 (AL-2): quem assina, quando o parceiro é `sefaz`. */
  assinador?: DfeAssinadorKind;
}

/** AL-2 — dependências injetáveis da seleção (o padrão é o transporte ligado pelo factory). */
export interface DfeSelectionDeps {
  transporteLocal?: SefazTransporte | null;
}

const KNOWN_AMBIENTES: readonly DfeAmbiente[] = ['producao', 'homologacao'];

/**
 * BE-INCR-DFE (BRIEF item 13; ADR §7 item 6) — seleção do adaptador por env, PURA (testável sem
 * processo). `DFE_PARTNER` ausente ou sem adaptador implementado neste BRIEF ⇒ `DfeDisabledEmissor`
 * com o motivo nomeado (nunca silêncio). `DFE_PARTNER_ENV` é obrigatório sempre que um adaptador REAL
 * está habilitado — sem ele, a porta também fica desabilitada (o mesmo aviso nomeado cobre os dois
 * motivos possíveis).
 *
 * BE-INCR-NFCE (nó X10a, item 5; F-NFCE-1 c) — a seleção é POR TIPO: `DFE_PARTNER_<KIND>` /
 * `DFE_PARTNER_ENV_<KIND>` com fallback para `DFE_PARTNER` / `DFE_PARTNER_ENV`, e o adaptador escolhido
 * tem de declarar o tipo em `capabilities.kinds` (senão: desabilitada com o motivo nomeado). Assim a NFS-e
 * pelo portal (`manual`) e a NFC-e por outro adaptador convivem na mesma instância.
 *
 * X10a EMENDA-4 (AL-2; F-AL-7 a; `ADR-INCR-DFE-EMISSAO-PARCEIRO` §14): o `sefaz` exige um assinador
 * (`selectDfeAssinador`) e transmite pelo transporte do assinador local — o transmissor com o e-CNPJ do Luminaris
 * (`DFE_TRANSMISSOR_CERT`) saiu. Sem assinador ou sem o transporte ligado ⇒ desabilitada com o motivo nomeado.
 */
export function selectDfeEmissor(env: NodeJS.ProcessEnv, kind: DfeKind, deps: DfeSelectionDeps = {}): DfeSelection {
  const partner = env[`DFE_PARTNER_${kind}`] || env.DFE_PARTNER;
  const ambienteRaw = env[`DFE_PARTNER_ENV_${kind}`] || env.DFE_PARTNER_ENV;
  const ambiente = KNOWN_AMBIENTES.includes(ambienteRaw as DfeAmbiente) ? (ambienteRaw as DfeAmbiente) : null;

  // BE-INCR-DFE-MANUAL (F-MAN-3 → a): 'file' deixou de existir — o modo manual é 'manual'.
  if (partner !== 'null' && partner !== 'manual' && partner !== 'sefaz') {
    const reason = partner
      ? `parceiro '${partner}' não tem adaptador implementado neste BRIEF`
      : 'DFE_PARTNER não configurado';
    return { port: new DfeDisabledEmissor(reason), ambiente: null, enabled: false, reason };
  }

  if (!ambiente) {
    const reason = `DFE_PARTNER_ENV ausente ou inválido (esperado 'producao' | 'homologacao') para o parceiro '${partner}'`;
    return { port: new DfeDisabledEmissor(reason), ambiente: null, enabled: false, reason };
  }

  let port: DfeEmissorPort;
  let assinador: DfeAssinadorKind | undefined;
  if (partner === 'sefaz') {
    const sel = selectDfeAssinador(env, kind);
    if (!sel.enabled) {
      const reason = `parceiro 'sefaz' sem assinador: ${sel.reason}`;
      return { port: new DfeDisabledEmissor(reason), ambiente: null, enabled: false, reason };
    }
    const transporte = deps.transporteLocal !== undefined ? deps.transporteLocal : transporteAssinadorLocal();
    if (!transporte) {
      const reason = "parceiro 'sefaz' sem transporte: o assinador local não está ligado nesta instância";
      return { port: new DfeDisabledEmissor(reason), ambiente: null, enabled: false, reason };
    }
    assinador = sel.kind;
    port = new SefazNfeEmissor({ ambiente, soap: transporte, assinador: sel.kind });
  } else {
    port = partner === 'null' ? new NullEmissor() : new ManualEmissor();
  }
  if (!port.capabilities.kinds.includes(kind)) {
    const reason = `parceiro '${partner}' não emite ${kind}`;
    return { port: new DfeDisabledEmissor(reason), ambiente: null, enabled: false, reason };
  }
  return { port, ambiente, enabled: true, ...(assinador ? { assinador } : {}) };
}
