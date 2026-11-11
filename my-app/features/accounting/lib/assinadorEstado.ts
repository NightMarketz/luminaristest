import type { DfeSignerView } from '../../../lib/services/dfeAssinador.service';

/**
 * Estado de tela do assinador local (FE-INCR-NFCE-ASSINADOR FA-5) — função pura sobre a view do servidor. `online` e
 * `diasParaVencer` vêm prontos do BE (F-FEAS-5 a): nenhuma conta de data no cliente.
 */
export type AssinadorAviso = 'token-ausente' | 'cert-vencendo' | 'cert-vencido' | 'versao-antiga';

export type AssinadorEstadoTela =
  | { kind: 'sem-pareamento' }
  | { kind: 'online'; avisos: AssinadorAviso[] }
  | { kind: 'fora'; desde: string | null; avisos: AssinadorAviso[] };

/** Mesmo limiar de 30 dias do alerta AL-15 do servidor. */
export const CERT_VENCENDO_DIAS = 30;

/** `a < b` em versão semântica `X.Y.Z`; parte ausente ou não numérica vale 0. */
export function versaoMenor(a: string, b: string): boolean {
  const pa = a.split('.').map((n) => Number.parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => Number.parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) < (pb[i] ?? 0);
  }
  return false;
}

export function assinadorEstado(view: DfeSignerView | null): AssinadorEstadoTela {
  if (!view) return { kind: 'sem-pareamento' };
  const avisos: AssinadorAviso[] = [];
  if (!view.tokenPresente) avisos.push('token-ausente');
  if (view.diasParaVencer < 0) avisos.push('cert-vencido');
  else if (view.diasParaVencer <= CERT_VENCENDO_DIAS) avisos.push('cert-vencendo');
  if (versaoMenor(view.versaoAssinador, view.versaoMinima)) avisos.push('versao-antiga');
  return view.online ? { kind: 'online', avisos } : { kind: 'fora', desde: view.lastSeenAt, avisos };
}
