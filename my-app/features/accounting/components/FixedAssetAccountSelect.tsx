import type { Account } from '../../../lib/services/accounting.service';
import { inputClass } from './SpedGenerationPanel';

export interface FixedAssetAccountSelectProps {
  /** Contas folha (`acceptsEntries`) — o painel filtra uma vez e repassa. */
  accounts: Account[];
  /** Selected account **id** ('' = none). The value is the id, never the code (footgun do FE-INCR-AP). */
  value: string;
  onChange: (accountId: string) => void;
  ariaLabel: string;
  placeholder: string;
  disabled?: boolean;
}

/**
 * Select de conta do imobilizado (classe, contrapartida da baixa, "Contas"). Valor = **id** da conta.
 * Sem filtro de natureza: a tela não inventa regra que o BE decide (BRIEF FE-INCR-FIXED-ASSETS §6.4) — um
 * 400 do servidor aparece pelo `resolveError` de quem chama.
 */
export function FixedAssetAccountSelect({ accounts, value, onChange, ariaLabel, placeholder, disabled }: FixedAssetAccountSelectProps) {
  return (
    <select aria-label={ariaLabel} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} className={`w-full ${inputClass}`}>
      <option value="">{placeholder}</option>
      {accounts.map((a) => (
        <option key={a.id} value={a.id}>
          {a.code} — {a.name}
        </option>
      ))}
    </select>
  );
}
