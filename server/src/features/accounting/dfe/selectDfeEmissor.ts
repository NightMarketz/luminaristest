import { DfeDisabledEmissor } from './DfeDisabledEmissor';
import { FileEmissor } from './FileEmissor';
import { NullEmissor } from './NullEmissor';
import type { DfeAmbiente, DfeEmissorPort } from './DfeEmissorPort';

export interface DfeSelection {
  port: DfeEmissorPort;
  /** null quando a porta está desabilitada (nenhum ambiente configurado se aplica). */
  ambiente: DfeAmbiente | null;
  enabled: boolean;
  reason?: string;
}

const KNOWN_AMBIENTES: readonly DfeAmbiente[] = ['producao', 'homologacao'];

/**
 * BE-INCR-DFE (BRIEF item 13; ADR §7 item 6) — seleção do adaptador por env, PURA (testável sem
 * processo). `DFE_PARTNER` ausente ou sem adaptador implementado neste BRIEF ⇒ `DfeDisabledEmissor`
 * com o motivo nomeado (nunca silêncio). `DFE_PARTNER_ENV` é obrigatório sempre que um adaptador REAL
 * está habilitado — sem ele, a porta também fica desabilitada (o mesmo aviso nomeado cobre os dois
 * motivos possíveis).
 */
export function selectDfeEmissor(env: NodeJS.ProcessEnv): DfeSelection {
  const partner = env.DFE_PARTNER;
  const ambienteRaw = env.DFE_PARTNER_ENV;
  const ambiente = KNOWN_AMBIENTES.includes(ambienteRaw as DfeAmbiente) ? (ambienteRaw as DfeAmbiente) : null;

  if (partner !== 'null' && partner !== 'file') {
    const reason = partner
      ? `parceiro '${partner}' não tem adaptador implementado neste BRIEF`
      : 'DFE_PARTNER não configurado';
    return { port: new DfeDisabledEmissor(reason), ambiente: null, enabled: false, reason };
  }

  if (!ambiente) {
    const reason = `DFE_PARTNER_ENV ausente ou inválido (esperado 'producao' | 'homologacao') para o parceiro '${partner}'`;
    return { port: new DfeDisabledEmissor(reason), ambiente: null, enabled: false, reason };
  }

  const port = partner === 'null' ? new NullEmissor() : new FileEmissor(env.DFE_FILE_DIR || './var/dfe-files');
  return { port, ambiente, enabled: true };
}
