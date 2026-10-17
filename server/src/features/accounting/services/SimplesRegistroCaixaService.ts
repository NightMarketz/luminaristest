import type { Prisma } from 'generated/prisma';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../lib/errors';
import { calendarDayAsWritten } from '../models/dates';
import type { AccountingScope } from '../scope/AccountingScope';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { IFiscalDocumentRepository } from '../repositories/IFiscalDocumentRepository';
import type { IReceitaFiscalRepository } from '../repositories/IReceitaFiscalRepository';
import type { IReceitaFiscalRecebimentoRepository } from '../repositories/IReceitaFiscalRecebimentoRepository';
import type { ISimplesCreditoIncobravelRepository } from '../repositories/ISimplesCreditoIncobravelRepository';
import type { LinhaAnexoIx, SimplesCreditoIncobravelCreate, SimplesCreditoIncobravelView } from '../dtos/SimplesDto';
import type { AuditService } from './AuditService';

/** Item 20 — eventos da allowlist (`auditCanonical.ts`), no padrão `tax.simples_*`. */
export const SIMPLES_INCOBRAVEL_REGISTRADO = 'tax.simples_incobravel.registrado';
export const SIMPLES_INCOBRAVEL_REMOVIDO = 'tax.simples_incobravel.removido';

const MEIOS_CARTAO = new Set(['Debit Card', 'Credit Card']);
const AUTORIZADOS = new Set(['AUTHORIZED', 'AUTHORIZED_DIVERGENT']);

/**
 * Porta do núcleo (core-boundary, `docs/accounting/NUCLEO-PORTAVEL.md`): o `dueDate` cru da venda de origem, ou null.
 * Implementada em `lib/factory.ts` sobre a linha da venda — o núcleo não importa o motor.
 */
export interface VencimentoDaVendaPort {
  dueDateBruto(saleId: string): Promise<string | null>;
}

export interface RegistroValoresAReceber {
  ano: number;
  linhas: LinhaAnexoIx[];
}

/**
 * BE-INCR-SIMPLES-CAIXA PR-3 (nó X14-CAIXA, itens 19–21; F-CX-5 a) — registro dos valores a receber no modelo do Anexo IX
 * da Res. CGSN 140 (arts. 20 III e 77; vigentes até 31/12/2026) e os créditos incobráveis (art. 77 VI, §§ 5º–6º).
 *
 * O registro é LEITURA: deriva das linhas de receita (venda), dos recebimentos (X14-CAIXA PR-1), dos documentos fiscais e
 * dos incobráveis. A venda do salão tem um único pagamento integral ⇒ uma parcela por venda. A venda paga no próprio dia
 * da operação nunca teve saldo e fica fora; a cancelada ou devolvida também (a operação foi desfeita).
 *
 * Incobrável: soft-delete; o saldo é re-checado DENTRO da tx do registro (gate autoritativo). O incobrável **não** tira a
 * venda da base do art. 20 I (a lei não exclui; F-CX-5 a).
 */
export class SimplesRegistroCaixaService {
  constructor(
    private readonly repo: ISimplesCreditoIncobravelRepository,
    private readonly receitaRepo: Pick<IReceitaFiscalRepository, 'findVendasEntre' | 'findLinhasDasVendas'>,
    private readonly recebimentoRepo: Pick<IReceitaFiscalRecebimentoRepository, 'findBySales'>,
    private readonly fiscalDocumentRepo: Pick<IFiscalDocumentRepository, 'findLiveBySale'>,
    private readonly vendas: VencimentoDaVendaPort,
    private readonly auditService: AuditService,
    private readonly policy: IAccountingPolicy,
  ) {}

  /** Item 19 — GET …/registro-valores-a-receber: uma linha por venda finalizada no ano com saldo em algum momento. */
  async registro(scope: AccountingScope, ano: number): Promise<RegistroValoresAReceber> {
    this.assertRead(scope);
    const vendas = await this.receitaRepo.findVendasEntre(scope, `${ano}-01`, `${ano}-12`);
    const ids = [...new Set(vendas.map((l) => l.saleId))];
    const [todas, recs, incob] = await Promise.all([
      this.receitaRepo.findLinhasDasVendas(scope, ids),
      this.recebimentoRepo.findBySales(scope, ids),
      this.repo.somaAtivaPorVenda(scope, ids),
    ]);
    const desfeitas = new Set(todas.filter((l) => l.tipo !== 'VENDA').map((l) => l.saleId));
    const linhas: LinhaAnexoIx[] = [];
    for (const saleId of ids) {
      if (desfeitas.has(saleId)) continue;
      const doVenda = vendas.filter((l) => l.saleId === saleId);
      const dataOperacao = doVenda.reduce((d, l) => (l.dia < d ? l.dia : d), doVenda[0].dia);
      const valorTotal = doVenda.reduce((s, l) => s + l.receitaCents, 0n);
      const rec = recs.find((r) => r.saleId === saleId && r.status === 'ACTIVE') ?? null;
      if (rec && rec.dia <= dataOperacao) continue; // recebida no ato: nunca teve saldo
      const pago = rec ? rec.valorCents : 0n;
      const docs = (await this.fiscalDocumentRepo.findLiveBySale(scope, saleId)).filter((d) => AUTORIZADOS.has(d.status));
      linhas.push({
        saleId,
        dataOperacao,
        // art. 77 § 1º: os documentos fiscais da mesma operação registrados juntos.
        documentosFiscais: docs.map((d) => `${d.kind} ${d.nNFSe ?? (d.numero === null ? d.chaveOuCodigo ?? d.id : String(d.numero))}`),
        valorTotalCents: Number(valorTotal),
        quantidadeParcelas: 1,
        parcelas: [
          {
            numero: 1,
            valorCents: Number(valorTotal),
            vencimento: await this.vencimento(saleId, dataOperacao),
            dataRecebimento: rec?.dia ?? null,
            valorPagoCents: Number(pago),
            saldoAReceberCents: Number(valorTotal - pago),
            incobravelCents: Number(incob.get(saleId) ?? 0n),
          },
        ],
        // art. 77 § 3º: a venda no cartão fica dispensada do registro (vale o extrato da administradora).
        dispensadaCartao: rec !== null && MEIOS_CARTAO.has(rec.meio),
      });
    }
    return { ano, linhas };
  }

  /** Item 20 — POST …/creditos-incobraveis: valor ≤ saldo (re-checado na tx) + `tax.simples_incobravel.registrado`. */
  async registrarIncobravel(scope: AccountingScope, input: SimplesCreditoIncobravelCreate): Promise<SimplesCreditoIncobravelView> {
    this.assertManage(scope);
    return this.repo.runTransaction(async (tx) => {
      const saldo = await this.saldoLivre(scope, input.saleId, tx);
      if (BigInt(input.valorCents) > saldo) {
        throw new ValidationError(`Valor incobrável maior que o saldo a receber da venda '${input.saleId}' (saldo ${saldo} centavos).`);
      }
      const row = await this.repo.create(
        scope,
        { saleId: input.saleId, valorCents: BigInt(input.valorCents), meioCobranca: input.meioCobranca, data: input.data, evidencia: input.evidencia },
        tx,
      );
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType: SIMPLES_INCOBRAVEL_REGISTRADO,
        targetType: 'simples_credito_incobravel',
        targetId: row.id,
        // a referência da evidência (texto livre) fica FORA do evento
        payload: { incobravelId: row.id, saleId: row.saleId, valorCents: row.valorCents.toString(), meioCobranca: row.meioCobranca, data: row.data },
      });
      return toView(row);
    });
  }

  /** Item 20 — DELETE …/creditos-incobraveis/:id: soft-delete + `tax.simples_incobravel.removido`. */
  async removerIncobravel(scope: AccountingScope, id: string): Promise<void> {
    this.assertManage(scope);
    await this.repo.runTransaction(async (tx) => {
      const row = await this.repo.findById(scope, id, tx);
      if (!row) throw new NotFoundError(`Crédito incobrável '${id}' não encontrado.`);
      await this.repo.softDelete(scope, id, tx);
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType: SIMPLES_INCOBRAVEL_REMOVIDO,
        targetType: 'simples_credito_incobravel',
        targetId: id,
        payload: { incobravelId: id, saleId: row.saleId },
      });
    });
  }

  /** Saldo a receber da venda ainda não declarado incobrável. Venda sem linha de receita ⇒ 404. */
  private async saldoLivre(scope: AccountingScope, saleId: string, tx: Prisma.TransactionClient): Promise<bigint> {
    const linhas = (await this.receitaRepo.findLinhasDasVendas(scope, [saleId], tx)).filter((l) => l.tipo === 'VENDA');
    if (linhas.length === 0) throw new NotFoundError(`Venda '${saleId}' não encontrada no subrazão de receita.`);
    const total = linhas.reduce((s, l) => s + l.receitaCents, 0n);
    const pago = (await this.recebimentoRepo.findBySales(scope, [saleId], tx)).filter((r) => r.status === 'ACTIVE').reduce((s, r) => s + r.valorCents, 0n);
    const incob = (await this.repo.somaAtivaPorVenda(scope, [saleId], tx)).get(saleId) ?? 0n;
    return total - pago - incob;
  }

  /** Vencimento = o `dueDate` da venda (campo date do motor, lido como escrito); sem ele, a venda é à vista. */
  private async vencimento(saleId: string, dataOperacao: string): Promise<string> {
    const due = await this.vendas.dueDateBruto(saleId);
    if (due === null) return dataOperacao;
    try {
      return calendarDayAsWritten(due);
    } catch {
      return dataOperacao;
    }
  }

  private assertRead(scope: AccountingScope): void {
    if (!this.policy.canReadTaxAssessment(scope)) throw new ForbiddenError('Você não tem permissão para ler a apuração do Simples Nacional.');
  }

  private assertManage(scope: AccountingScope): void {
    if (!this.policy.canManageTaxAssessment(scope)) throw new ForbiddenError('Você não tem permissão para registrar créditos incobráveis do Simples Nacional.');
  }
}

function toView(row: { id: string; saleId: string; valorCents: bigint; meioCobranca: string; data: string; evidencia: string; createdAt: Date }): SimplesCreditoIncobravelView {
  return {
    id: row.id,
    saleId: row.saleId,
    valorCents: Number(row.valorCents),
    meioCobranca: row.meioCobranca as SimplesCreditoIncobravelView['meioCobranca'],
    data: row.data,
    evidencia: row.evidencia,
    createdAt: row.createdAt.toISOString(),
  };
}
