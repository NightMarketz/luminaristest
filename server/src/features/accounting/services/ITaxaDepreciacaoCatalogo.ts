import type { AccountingScope } from '../scope/AccountingScope';
import type { TaxaDepreciacaoView, TaxaEscolhida } from '../models/FixedAsset.model';

/**
 * BE-INCR-LEGAL-PARAMS PR-3 (item 9; emenda §9 L-1; questionário do dono 07/10: "rateId aceita os dois ids") — o
 * catálogo de taxas de depreciação de um escopo: Anexo III da PLATAFORMA (`legal_parameters`) + CUSTOM do escopo
 * (`depreciation_rates`). Quem cria bem (`FixedAssetService`, `PayableService` no modo 4) lê por aqui e grava a taxa
 * na coluna certa do bem (`TaxaEscolhida`). Implementado por `DepreciationRateService`; sem checagem de policy — o
 * chamador já checou a dele.
 */
export interface ITaxaDepreciacaoCatalogo {
  /** Anexo III vigente hoje + CUSTOM do escopo (sem as ocultas, salvo `includeHidden`). */
  catalogo(scope: AccountingScope, includeHidden: boolean): Promise<TaxaDepreciacaoView[]>;

  /** O id escolhido (de plataforma ou CUSTOM do escopo) ⇒ onde gravar. Id desconhecido ⇒ `NotFoundError`. */
  resolverTaxa(scope: AccountingScope, id: string): Promise<TaxaEscolhida>;
}
