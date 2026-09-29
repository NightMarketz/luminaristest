import type { QualifAssinante, QualifLayout } from '../../../lib/services/sped.service';
import { CatalogCombobox } from './CatalogCombobox';
import { inputClass } from './SpedGenerationPanel';

export interface QualifAssinanteSelectProps {
  /** J930 (ECD, `codAssin`) ou 0930 (ECF, `identQualif`) — tabelas diferentes (F-C12-2 → a). */
  layout: QualifLayout;
  /** A tabela do layout, vinda de `GET /accounting/sped/qualif-assinante` (o caller carrega uma vez). */
  options: QualifAssinante[];
  /** Código selecionado ('' = nenhum). */
  value: string;
  onChange: (code: string) => void;
  loading?: boolean;
  placeholder: string;
}

/**
 * QualifAssinanteSelect (FE-INCR-SPED-SIGNERS item 2) — "código — descrição" com busca por substring e
 * SEM texto livre: é o `CatalogCombobox` canônico (texto fora da tabela é limpo no blur, nunca enviado),
 * emitindo só o código. A descrição é o texto do manual (vem do BE, não se traduz). O `placeholder`
 * fica o do `<input>` que ele substitui — é por ele que o guarda do J930 (GAP-MAP N3) acha o campo.
 */
export function QualifAssinanteSelect({ layout, options, value, onChange, loading, placeholder }: QualifAssinanteSelectProps) {
  return (
    <CatalogCombobox
      options={options.map((o) => ({ codigo: o.code, descricao: o.description }))}
      value={value}
      onChange={onChange}
      loading={loading}
      inputClassName={inputClass}
      placeholder={placeholder}
      ariaLabel={`${placeholder} (${layout === 'ECD' ? 'J930' : '0930'})`}
    />
  );
}
