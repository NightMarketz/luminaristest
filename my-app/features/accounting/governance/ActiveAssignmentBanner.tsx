import { useAccountingT } from '../lib/useAccountingT';
import type { ActiveAssignment } from './useActiveAssignment';
import type { GovernanceScope } from './GovernanceScope';

/** `{{name}}`/`{{crc}}` dos textos de governança: o contador ativo (dono) ou o CRC do snapshot (contador). */
export function activeAssignmentVars(active: ActiveAssignment | null, governance?: GovernanceScope): Record<string, string> {
  if (governance) return { name: governance.ownerEmail, crc: governance.crcNumber };
  return { name: active?.contactName ?? '—', crc: active?.assignment.crcNumber ?? '—' };
}

/**
 * Banner informativo do dono nos painéis de Períodos e Revisão quando o escopo tem contador ativo
 * (F-FE-GOV-4 a: os botões CONTINUAM visíveis — o servidor decide e o erro é traduzido).
 */
export function ActiveAssignmentBanner({ active }: { active: ActiveAssignment | null }) {
  const { t } = useAccountingT();
  if (!active) return null;
  const vars = activeAssignmentVars(active);
  return (
    <div role="status" data-testid="active-assignment-banner" className="rounded-2xl border border-amber-900/50 bg-amber-950/20 px-4 py-3 text-sm text-amber-200">
      {t(
        'governance.banner.active',
        'Contador responsável ativo: {{name}} ({{crc}}). Só ele reabre períodos e assina revisões; para fazer você mesmo, encerre a atribuição na aba Compliance.',
        vars,
      )}
    </div>
  );
}
