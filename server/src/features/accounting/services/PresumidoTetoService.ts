import type { LegalParameterService } from '../../legalParameters/services/LegalParameterService';
import type { AccountingScope } from '../scope/AccountingScope';
import type { ICompanyFiscalProfileRepository } from '../repositories/ICompanyFiscalProfileRepository';
import type { IFiscalProfileRepository } from '../repositories/IFiscalProfileRepository';
import type { IPostingRepository } from '../repositories/IPostingRepository';
import { LEDGER_STATUSES } from '../models/ledgerStatus';
import { tabelaApuracaoDe } from '../models/taxAssessmentParams';
import { mesesAtividadeAnterior, tetoPresumido, type TetoPresumidoResultado } from '../models/presumidoTeto';

/**
 * PRESUMIDO-TETO-78MI (BRIEF item 8) — lê os perfis da empresa de Y e Y−1, a receita total de Y−1 no razão (item 4, todas
 * as unidades do dono) e a tabela `TAX_ASSESSMENT`, e chama a função pura `tetoPresumido`. Só orquestra: a regra é do
 * model. Sem rota própria (F-PT-1 c) — quem chama (obrigações do perfil, prévia/confirmação do Presumido) já passou pela
 * policy de leitura; aqui não há escrita.
 */
export class PresumidoTetoService {
  constructor(
    private readonly companyProfileRepo: Pick<ICompanyFiscalProfileRepository, 'findByYear'>,
    private readonly postingRepo: Pick<IPostingRepository, 'sumRevenueNetByOwner'>,
    /** F-PCB-1R (a): as contas de dedução de PIS/COFINS de cada unidade saem da soma (item 4). */
    private readonly fiscalProfileRepo: Pick<IFiscalProfileRepository, 'findManyByOwner'>,
    private readonly legalParams: Pick<LegalParameterService, 'fotografia'>,
  ) {}

  async avaliar(scope: AccountingScope, ano: number): Promise<TetoPresumidoResultado> {
    const [perfil, perfilAnterior] = await Promise.all([this.companyProfileRepo.findByYear(scope, ano), this.companyProfileRepo.findByYear(scope, ano - 1)]);
    // Item 3: a data de início vem do perfil de Y−1; na falta, do de Y se cair em Y−1. Início em Y (ou depois) ⇒ não há Y−1.
    const inicio = perfilAnterior?.inicioAtividadeEm ?? perfil?.inicioAtividadeEm ?? null;
    const inicioAtividadeNoAno = inicio !== null && Number(inicio.slice(0, 4)) >= ano;
    // Item 7 (Lei 9.718 art. 13 § 2º): Y−1 no Presumido pelo caixa ⇒ o razão não é a medida.
    const razaoValido = !(perfilAnterior?.regime === 'PRESUMIDO' && perfilAnterior.ecfIndRecReceita === '1');

    const deducoes = (await this.fiscalProfileRepo.findManyByOwner(scope.ownerUserId))
      .flatMap((p) => [p.pisDespesaAccountId, p.cofinsDespesaAccountId])
      .filter((id): id is string => !!id);
    const from = new Date(Date.UTC(ano - 1, 0, 1, 0, 0, 0, 0));
    const to = new Date(Date.UTC(ano - 1, 11, 31, 23, 59, 59, 999));
    const receitaRazaoCents = razaoValido ? await this.postingRepo.sumRevenueNetByOwner(scope.ownerUserId, LEDGER_STATUSES, from, to, deducoes) : null;

    return tetoPresumido({
      ano,
      receitaRazaoCents,
      receitaDeclaradaCents: perfil?.receitaTotalAnoAnteriorCents ?? null,
      razaoValido,
      mesesAtividadeAnterior: mesesAtividadeAnterior(ano, inicio),
      inicioAtividadeNoAno,
      tabela: tabelaApuracaoDe(await this.legalParams.fotografia(['TAX_ASSESSMENT'])),
    });
  }
}
