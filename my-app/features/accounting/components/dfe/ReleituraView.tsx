import type { Releitura } from '../../../../lib/services/dfe.service';
import { useAccountingT } from '../../lib/useAccountingT';
import { CAMPO_LABEL, campoKey } from './dfeLabels';

/**
 * Releitura do retorno manual (item 21): `IGUAL` em verde, ou `DIVERGENTE` com a tabela campo | enviado | autorizado.
 * Valor ausente em `toma.doc` é PII que o BE nunca devolve (`toReleituraJson`); nos outros campos, ausência é o próprio
 * achado (`tipo: 'ausente'`).
 */
export function ReleituraView({ releitura }: { releitura: Releitura }) {
  const { t } = useAccountingT();
  if (releitura.status === 'IGUAL') {
    return (
      <div className="rounded-xl border border-emerald-300 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-300" data-testid="releitura-igual">
        {t('dfe.releitura.igual', 'Releitura: a nota autorizada é igual ao que foi enviado.')}
      </div>
    );
  }
  const empty = (campo: string) =>
    campo === 'toma.doc'
      ? t('dfe.releitura.pii', '— (dado pessoal, não exibido)')
      : t('dfe.releitura.ausente', '— (ausente)');
  return (
    <div className="space-y-2" data-testid="releitura-divergente">
      <div className="rounded-xl border border-amber-300 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
        {t('dfe.releitura.divergente', 'Releitura: a nota autorizada DIVERGE do que foi enviado.')}
      </div>
      <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-neutral-200 dark:border-neutral-800 text-left text-neutral-500">
              <th className="px-2 py-1.5 font-medium">{t('dfe.releitura.col.campo', 'Campo')}</th>
              <th className="px-2 py-1.5 font-medium">{t('dfe.releitura.col.enviado', 'Enviado')}</th>
              <th className="px-2 py-1.5 font-medium">{t('dfe.releitura.col.autorizado', 'Autorizado')}</th>
            </tr>
          </thead>
          <tbody>
            {releitura.divergencias.map((d) => (
              <tr key={d.campo} className="border-b border-neutral-100 dark:border-neutral-800/60 last:border-0 text-neutral-800 dark:text-neutral-200">
                <td className="px-2 py-1.5">{t(campoKey(d.campo), CAMPO_LABEL[d.campo] ?? d.campo)}</td>
                <td className="px-2 py-1.5 font-mono">{d.enviado ?? empty(d.campo)}</td>
                <td className="px-2 py-1.5 font-mono">{d.autorizado ?? empty(d.campo)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
