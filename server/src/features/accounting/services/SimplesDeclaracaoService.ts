/**
 * SimplesDeclaracaoService — espelhos anuais do Simples Nacional (nó X14, PR-4, BRIEF itens 27–28; fork L3 → PUT por ano +
 * model próprio, dono 08/10). FIRST-CLASS PRISMA (`SimplesDeclaracaoAnual`). O GET junta o que o sistema calcula
 * (subrazão de receita, razão) com o que o cliente digitou; o PUT grava só o digitado. Não transmite nada: o portal é
 * do cliente.
 */
import { ForbiddenError, ValidationError } from '../../../lib/errors';
import { ESTOQUES_CODE } from '../fixtures/ChartOfAccountsFixture';
import type { AccountingScope } from '../scope/AccountingScope';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { ICompanyFiscalProfileRepository } from '../repositories/ICompanyFiscalProfileRepository';
import type { IReceitaFiscalRepository } from '../repositories/IReceitaFiscalRepository';
import type { ISimplesApuracaoRepository } from '../repositories/ISimplesApuracaoRepository';
import type { ISimplesDeclaracaoRepository } from '../repositories/ISimplesDeclaracaoRepository';
import type { ISimplesEntradasRepository } from '../repositories/ISimplesEntradasRepository';
import type { AccountingReportService } from './AccountingReportService';
import {
  SimplesDasnDigitadoSchema,
  SimplesDefisDigitadoSchema,
  type SimplesDasnDigitado,
  type SimplesDasnSimeiView,
  type SimplesDasnUpsert,
  type SimplesDefisDigitado,
  type SimplesDefisUpsert,
  type SimplesDefisView,
} from '../dtos/SimplesDto';

/** Res. CGSN 140 art. 72 § 1º — a DEFIS do ano é a partir de 2027 mensal (red. LC 214 do art. 25); BRIEF §5. */
const ULTIMO_ANO_DEFIS = 2026;

const mesesDoAno = (ano: number): string[] => Array.from({ length: 12 }, (_, i) => `${ano}-${String(i + 1).padStart(2, '0')}`);
const fimDoDia = (iso: string): Date => new Date(`${iso}T23:59:59.999Z`);

export class SimplesDeclaracaoService {
  constructor(
    private readonly repo: ISimplesDeclaracaoRepository,
    private readonly apuracaoRepo: Pick<ISimplesApuracaoRepository, 'competenciasConfirmadasDoAno'>,
    private readonly companyProfileRepo: Pick<ICompanyFiscalProfileRepository, 'findByYear'>,
    private readonly entradasRepo: Pick<ISimplesEntradasRepository, 'findHistorico'>,
    private readonly receitaRepo: Pick<IReceitaFiscalRepository, 'findByCompetencia'>,
    private readonly report: Pick<AccountingReportService, 'incomeStatement' | 'balancesAsOf'>,
    private readonly policy: IAccountingPolicy,
  ) {}

  /**
   * Item 27 — DASN-SIMEI do ano (Res. CGSN 140 art. 109): I receita bruta total; II a parte sujeita ao ICMS (a revenda do
   * subrazão); III contratação de empregado (digitado). Prazo: último dia de maio do ano seguinte. Mês sem subrazão
   * usa o histórico (sem natureza: não entra no ICMS e é listado em `mesesSemSubrazao`).
   */
  async dasnSimei(scope: AccountingScope, ano: number): Promise<SimplesDasnSimeiView> {
    this.assertRead(scope);
    await this.exigirRegime(scope, ano, 'MEI', 'A DASN-SIMEI é do MEI (Res. CGSN 140 art. 109).');
    const meses = mesesDoAno(ano);
    const historico = new Map((await this.entradasRepo.findHistorico(scope, meses)).map((h) => [h.competencia, h.receitaBrutaCents]));
    let total = 0n;
    let icms = 0n;
    const semSubrazao: string[] = [];
    for (const m of meses) {
      const linhas = await this.receitaRepo.findByCompetencia(scope, m);
      if (linhas.length === 0) {
        const h = historico.get(m);
        if (h !== undefined) {
          total += h;
          semSubrazao.push(m);
        }
        continue;
      }
      for (const l of linhas) {
        const v = l.receitaCents - l.cotaProfissionalCents;
        total += v;
        if (l.natureza === 'REVENDA') icms += v;
      }
    }
    const row = await this.repo.find(scope, ano, 'DASN_SIMEI');
    return {
      ano,
      prazo: `${ano + 1}-05-31`,
      receitaBrutaTotalCents: Number(total),
      receitaIcmsCents: Number(icms),
      mesesSemSubrazao: semSubrazao,
      digitado: row ? (SimplesDasnDigitadoSchema.parse(row.dados) as SimplesDasnDigitado) : null,
    };
  }

  async upsertDasnSimei(scope: AccountingScope, ano: number, input: SimplesDasnUpsert): Promise<SimplesDasnSimeiView> {
    this.assertManage(scope);
    await this.exigirRegime(scope, ano, 'MEI', 'A DASN-SIMEI é do MEI (Res. CGSN 140 art. 109).');
    await this.repo.upsert(scope, ano, 'DASN_SIMEI', { contratouEmpregado: input.contratouEmpregado });
    return this.dasnSimei(scope, ano);
  }

  /**
   * Item 28 — DEFIS espelho mínimo (F-SN-9 → a): só anos ≤ 2026 com ao menos um mês apurado aqui; lucro contábil (manual
   * 9.4.3.1 item 4) = resultado da DRE do ano; estoques inicial/final (9.4.3.2 itens 1–2) = saldo da conta de estoques em
   * 31/12 do ano anterior e do ano. Prazo: 31 de março do ano seguinte (Res. CGSN 140 art. 72 § 1º).
   */
  async defis(scope: AccountingScope, ano: number): Promise<SimplesDefisView> {
    this.assertRead(scope);
    const mesesApurados = await this.exigirDefis(scope, ano);
    const [dre, inicial, final] = await Promise.all([
      this.report.incomeStatement(scope, fimDoDia(`${ano}-12-31`)),
      this.report.balancesAsOf(scope, fimDoDia(`${ano - 1}-12-31`)),
      this.report.balancesAsOf(scope, fimDoDia(`${ano}-12-31`)),
    ]);
    const estoque = (rows: typeof inicial) => rows.filter((r) => r.code === ESTOQUES_CODE).reduce((s, r) => s + r.balanceCents, 0);
    const row = await this.repo.find(scope, ano, 'DEFIS');
    return {
      ano,
      prazo: `${ano + 1}-03-31`,
      mesesApurados,
      lucroContabilCents: Number(dre.netResult.amountCents),
      estoqueInicialCents: estoque(inicial),
      estoqueFinalCents: estoque(final),
      digitado: row ? (SimplesDefisDigitadoSchema.parse(row.dados) as SimplesDefisDigitado) : null,
    };
  }

  async upsertDefis(scope: AccountingScope, ano: number, input: SimplesDefisUpsert): Promise<SimplesDefisView> {
    this.assertManage(scope);
    await this.exigirDefis(scope, ano);
    const { unitId: _u, ...digitado } = input;
    await this.repo.upsert(scope, ano, 'DEFIS', SimplesDefisDigitadoSchema.parse(digitado));
    return this.defis(scope, ano);
  }

  private async exigirDefis(scope: AccountingScope, ano: number): Promise<string[]> {
    if (ano > ULTIMO_ANO_DEFIS) {
      throw new ValidationError(`A DEFIS espelho cobre até o ano-calendário ${ULTIMO_ANO_DEFIS}; a partir de 2027 a declaração muda (LC 123 art. 25, red. LC 214) e aguarda regulamentação.`);
    }
    await this.exigirRegime(scope, ano, 'SIMPLES', 'A DEFIS é da ME/EPP optante pelo Simples Nacional (Res. CGSN 140 art. 72).');
    const meses = await this.apuracaoRepo.competenciasConfirmadasDoAno(scope, ano);
    if (meses.length === 0) throw new ValidationError(`Nenhum mês de ${ano} foi apurado aqui (DAS registrado): a DEFIS espelho só cobre anos apurados no sistema.`);
    return meses;
  }

  private async exigirRegime(scope: AccountingScope, ano: number, regime: 'MEI' | 'SIMPLES', mensagem: string): Promise<void> {
    const perfil = await this.companyProfileRepo.findByYear(scope, ano);
    if (!perfil || perfil.regime !== regime) throw new ValidationError(`${mensagem} O perfil fiscal de ${ano} não é ${regime}.`);
  }

  private assertManage(scope: AccountingScope): void {
    if (!this.policy.canManageTaxAssessment(scope)) throw new ForbiddenError('Você não tem permissão para editar as declarações do Simples Nacional.');
  }

  private assertRead(scope: AccountingScope): void {
    if (!this.policy.canReadTaxAssessment(scope)) throw new ForbiddenError('Você não tem permissão para ler as declarações do Simples Nacional.');
  }
}
