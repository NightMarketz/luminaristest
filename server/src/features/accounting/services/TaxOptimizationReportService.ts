import { ForbiddenError, ValidationError } from '../../../lib/errors';
import { ParametroLegalAusenteError } from '../../legalParameters/models/legalParameter';
import type { AccountingScope } from '../scope/AccountingScope';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { ITaxOptimizationRepository } from '../repositories/ITaxOptimizationRepository';
import type { IReceitaFiscalRepository } from '../repositories/IReceitaFiscalRepository';
import type { TaxOptimizationReport } from '../dtos/TaxOptimizationDto';
import type { SimplesApuracaoService } from './SimplesApuracaoService';
import { scopeDay } from '../models/dates';
import { montarRelatorio, saleIdDoAssunto, type MedidaDoSimples } from '../models/taxOptimizationReport';

/** Leitura do desconto incondicional das vendas (DynamicTable `sales`, só leitura pela ponte `saleItems`). */
export interface IDescontoIncondicionalReader {
  descontoIncondicionalCents(ownerUserId: string, saleIds: readonly string[]): Promise<bigint>;
}

/**
 * EFICIENCIA-FISCAL PR-4 itens 22–23 (BRIEF BE-INCR-EFICIENCIA-FISCAL §4.3; ADR D9; D-2026-10-28-EFICIENCIA-FISCAL-PR4-EXECUCAO
 * #5 e #6) — `GET /api/accounting/tax-optimization/report?competencia=` e a fonte do `EXPORT_ECONOMIA_FISCAL`. Só lê: não grava
 * sugestão, apuração nem razão; não chama `postEntry`. A regra está em `models/taxOptimizationReport.ts` (pura).
 */
export class TaxOptimizationReportService {
  constructor(
    private readonly repo: Pick<ITaxOptimizationRepository, 'listSuggestions'>,
    private readonly receitaRepo: Pick<IReceitaFiscalRepository, 'findByCompetencia' | 'findLinhasDasVendas'>,
    private readonly simples: Pick<SimplesApuracaoService, 'medidaDaApuracao'>,
    private readonly descontos: IDescontoIncondicionalReader,
    private readonly policy: IAccountingPolicy,
  ) {}

  async relatorio(scope: AccountingScope, competencia: string): Promise<TaxOptimizationReport> {
    if (!this.policy.canManageTaxAssessment(scope)) throw new ForbiddenError('Você não tem permissão para ler o relatório de economia fiscal.');
    const sugestoes = await this.repo.listSuggestions(scope);

    // #5: o mês da venda vem da subrazão (a linha VENDA); sem linha, a sugestão cai no mês da decisão.
    const saleIds = [...new Set(sugestoes.map(saleIdDoAssunto).filter((x): x is string => x !== null))];
    const competenciaDaVenda = new Map<string, string>();
    if (saleIds.length > 0) {
      for (const l of await this.receitaRepo.findLinhasDasVendas(scope, saleIds)) {
        if (l.tipo === 'VENDA' && !competenciaDaVenda.has(l.saleId)) competenciaDaVenda.set(l.saleId, l.competencia);
      }
    }

    let medida: MedidaDoSimples | null = null;
    let motivoSemMedida = 'fora do Simples Nacional (ME/EPP): a medida da segregação e do desconto é a do DAS';
    try {
      const m = await this.simples.medidaDaApuracao(scope, competencia);
      if (m) {
        medida = {
          dasCents: BigInt(m.dasCents),
          dasSemSegregacaoCents: m.dasSemSegregacaoCents === null ? null : BigInt(m.dasSemSegregacaoCents),
          receitaPaCents: BigInt(m.receitaPaCents),
          descontoIncondicionalCents: await this.descontoDoMes(scope, competencia),
        };
      }
    } catch (e) {
      // Só os erros de dado da apuração (parâmetro legal ausente, entrada inválida) viram linha indisponível com o motivo; o resto sobe.
      if (!(e instanceof ParametroLegalAusenteError || e instanceof ValidationError)) throw e;
      motivoSemMedida = `apuração do Simples de ${competencia} indisponível: ${(e as Error).message}`;
    }

    return montarRelatorio({
      competencia,
      unitId: scope.unitId,
      sugestoes,
      competenciaDaVenda,
      diaNoEscopo: (d) => scopeDay(scope, d),
      medida,
      motivoSemMedida,
    });
  }

  /** Σ desconto incondicional das vendas reconhecidas na competência; venda cancelada no mesmo mês fica fora. */
  private async descontoDoMes(scope: AccountingScope, competencia: string): Promise<bigint> {
    const linhas = await this.receitaRepo.findByCompetencia(scope, competencia);
    const canceladas = new Set(linhas.filter((l) => l.tipo === 'CANCELAMENTO').map((l) => l.saleId));
    const vendas = [...new Set(linhas.filter((l) => l.tipo === 'VENDA' && !canceladas.has(l.saleId)).map((l) => l.saleId))];
    return vendas.length === 0 ? 0n : this.descontos.descontoIncondicionalCents(scope.ownerUserId, vendas);
  }
}
