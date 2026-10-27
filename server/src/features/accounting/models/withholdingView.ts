import type { Counterparty, Payable, TaxWithholding, WithholdingProfile } from 'generated/prisma';
import type { WithholdingLineForReinf, WithholdingLineView } from '../dtos/WithholdingDto';
import { taxIdKindDe, type TributoRetencao } from './retencaoParams';

/**
 * BE-INCR-RETENCOES-FONTE PR-2 (item 23; Emenda 22/10 item 2) — O mapeador ÚNICO da retenção feita para o contrato da Reinf.
 * A rota de linhas e a porta `findMadeForReinf` passam por aqui (teste garante o mesmo conjunto). Puro.
 */
export type TaxWithholdingComOrigem = TaxWithholding & {
  counterparty: Pick<Counterparty, 'id' | 'name' | 'taxId' | 'regimeTributario'>;
  titulo: Pick<Payable, 'id' | 'documentNumber' | 'issueDate'>;
  /** Perfil vigente na data do fato gerador (campos do R-2010); null quando a linha não tem natureza. */
  perfil: Pick<WithholdingProfile, 'inssTpServico' | 'inssCprb'> | null;
};

interface PfDetalheJson {
  dependentes: number;
  deducaoDependentesCents: string;
  previdenciaCents: string;
  pensaoCents: string;
  descontoSimplificadoCents: string;
  reducaoArt3ACents: string;
}

export function toWithholdingLineForReinf(r: TaxWithholdingComOrigem): WithholdingLineForReinf {
  const pf = r.pfDetalhe ? (JSON.parse(r.pfDetalhe) as PfDetalheJson) : null;
  return {
    id: r.id,
    tributo: r.tributo as TributoRetencao,
    event: r.event as 'RECOGNITION' | 'SETTLEMENT',
    dataFatoGerador: r.dataFatoGerador,
    competencia: r.competencia,
    beneficiario: {
      counterpartyId: r.counterparty.id,
      nome: r.counterparty.name,
      taxId: r.counterparty.taxId,
      kind: taxIdKindDe(r.counterparty.taxId),
      regime: r.counterparty.regimeTributario,
    },
    natRend: r.natRend,
    codigoReceita: r.codigoReceita,
    brutoCents: r.brutoCents.toString(),
    baseCents: r.baseCents.toString(),
    amountCents: r.amountCents.toString(),
    dispensa: r.dispensa,
    titulo: { payableId: r.titulo.id, documentNumber: r.titulo.documentNumber, documentoSerie: r.documentoSerie, issueDate: r.titulo.issueDate.toISOString().slice(0, 10) },
    inss: r.tributo === 'INSS' ? { tpServico: r.perfil?.inssTpServico ?? null, cprb: r.perfil?.inssCprb ?? null } : null,
    pf: pf
      ? {
          dependentes: pf.dependentes,
          deducaoDependentesCents: pf.deducaoDependentesCents,
          previdenciaCents: pf.previdenciaCents,
          pensaoCents: pf.pensaoCents,
          descontoSimplificadoCents: pf.descontoSimplificadoCents,
          reducaoArt3ACents: pf.reducaoArt3ACents,
        }
      : null,
    taxPayableId: r.taxPayableId,
    settlementId: r.settlementId,
    originSettlementId: r.originSettlementId,
    unitId: r.unitId,
  };
}

/** A linha da rota = a da porta sem as duas baixas e a unidade (mesmo mapeador). */
export function toWithholdingLineView(r: TaxWithholdingComOrigem): WithholdingLineView {
  const { settlementId: _s, originSettlementId: _o, unitId: _u, ...view } = toWithholdingLineForReinf(r);
  return view;
}
