import { ConflictError, ForbiddenError, NotFoundError } from '../../../lib/errors';
import type { AccountingScope } from '../scope/AccountingScope';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { IPartnerRepository, PartnerData } from '../repositories/IPartnerRepository';
import type { IProfitDistributionRepository } from '../repositories/IProfitDistributionRepository';
import type { IInterestOnEquityRepository } from '../repositories/IInterestOnEquityRepository';
import type { AuditService } from './AuditService';
import type { CreatePartnerInput, OutraParticipacao } from '../dtos/PartnerDto';
import type { Partner, Prisma } from 'generated/prisma';
import { scopeToday } from '../models/dates';
import { PARTICIPACAO_TOTAL_BP, somaParticipacaoBp, tipoPessoaDe, vigenciasSeSobrepoem, vigenteEm } from '../models/partner';

export const PARTNER_CREATED = 'partner.created';
export const PARTNER_UPDATED = 'partner.updated';
export const PARTNER_DELETED = 'partner.deleted';

export interface PartnerView {
  id: string;
  nome: string;
  taxId: string;
  tipoPessoa: string;
  residenteBrasil: boolean;
  participacaoBp: number;
  entradaEm: string;
  saidaEm: string | null;
  outrasParticipacoes: OutraParticipacao[] | null;
  updatedAt: string;
}

export interface PartnerListView {
  data: string;
  socios: PartnerView[];
  somaParticipacaoBp: number;
  /** Item 3 — soma ≠ 10000 não bloqueia o cadastro (bloqueia o JCP, item 22); só avisa. */
  aviso: string | null;
}

/**
 * BE-INCR-IRRF-DISTRIBUICAO PR-1 (BRIEF itens 1–4; F-IRD-2, F-IRD-7, F-IRD-14) — cadastro dos sócios da PJ. Policy: a
 * mesma régua do perfil fiscal (precedente `CompanySignerService`). Tenancy pelo dono: id de outro dono → 404. A
 * vigência não se sobrepõe por `taxId` na PJ (item 2): o gate roda DENTRO da tx, sobre o `tx` propagado ao repositório
 * (memória authoritative-gate-inside-tx). Auditoria só com o id e os valores — nome e CPF/CNPJ ficam fora (item 33).
 */
export class PartnerService {
  constructor(
    private readonly repo: IPartnerRepository,
    private readonly policy: IAccountingPolicy,
    private readonly auditService: AuditService,
    private readonly distribuicoes: Pick<IProfitDistributionRepository, 'existsDoSocio'>,
    private readonly jcp: Pick<IInterestOnEquityRepository, 'existsAlocacaoDoSocio'>,
  ) {}

  /** Item 3 — sócios vigentes na `data` (hoje no fuso do escopo, sem ela) e a soma das participações. */
  async list(scope: AccountingScope, data?: string): Promise<PartnerListView> {
    this.assertRead(scope);
    const dia = data ?? scopeToday(scope);
    const socios = (await this.repo.list(scope)).filter((p) => vigenteEm(p, dia));
    const soma = somaParticipacaoBp(socios);
    return {
      data: dia,
      socios: socios.map(toView),
      somaParticipacaoBp: soma,
      aviso:
        soma === PARTICIPACAO_TOTAL_BP
          ? null
          : `A soma das participações vigentes em ${dia} é ${soma} bp (esperado ${PARTICIPACAO_TOTAL_BP}): o JCP fica bloqueado até a soma fechar 100%.`,
    };
  }

  async get(scope: AccountingScope, id: string): Promise<PartnerView> {
    this.assertRead(scope);
    const row = await this.repo.findById(scope, id);
    if (!row) throw new NotFoundError('Sócio não encontrado.');
    return toView(row);
  }

  async create(scope: AccountingScope, input: CreatePartnerInput): Promise<PartnerView> {
    this.assertManage(scope);
    const data = toData(input);
    return this.repo.runTransaction(async (tx) => {
      await this.assertSemSobreposicao(scope, data, null, tx);
      const row = await this.repo.create(scope, data, tx);
      await this.audit(tx, scope, row, PARTNER_CREATED);
      return toView(row);
    });
  }

  async update(scope: AccountingScope, id: string, input: CreatePartnerInput): Promise<PartnerView> {
    this.assertManage(scope);
    const data = toData(input);
    return this.repo.runTransaction(async (tx) => {
      if (!(await this.repo.findById(scope, id, tx))) throw new NotFoundError('Sócio não encontrado.');
      await this.assertSemSobreposicao(scope, data, id, tx);
      const row = await this.repo.update(scope, id, data, tx);
      await this.audit(tx, scope, row, PARTNER_UPDATED);
      return toView(row);
    });
  }

  /**
   * D-2026-10-28-LACUNAS-EXECUTA-27-28 item 1 ("Bloquear remoção") — sócio com distribuição (lucro/dividendo ou JCP, em
   * qualquer status; linha soft-deletada não conta) → 409 `SOCIO_COM_DISTRIBUICAO`, checado dentro da tx do soft-delete.
   * A saída da sociedade é `saidaEm`; o soft-delete fica para o cadastro errado, que não tem fato.
   */
  async remove(scope: AccountingScope, id: string): Promise<void> {
    this.assertManage(scope);
    await this.repo.runTransaction(async (tx) => {
      if (!(await this.repo.findById(scope, id, tx))) throw new NotFoundError('Sócio não encontrado.');
      if ((await this.distribuicoes.existsDoSocio(scope.ownerUserId, id, tx)) || (await this.jcp.existsAlocacaoDoSocio(scope.ownerUserId, id, tx))) {
        throw new ConflictError(
          'SOCIO_COM_DISTRIBUICAO: o sócio tem distribuição de lucros ou JCP registrada e não pode ser removido. Se ele saiu da sociedade, informe a data de saída (saidaEm).',
          'SOCIO_COM_DISTRIBUICAO',
        );
      }
      await this.repo.softDelete(scope, id, tx);
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType: PARTNER_DELETED,
        targetType: 'partner',
        targetId: id,
        payload: { partnerId: id },
      });
    });
  }

  /** Item 2 — duas vigências do mesmo `taxId` na mesma PJ que se cruzam → 409. Dentro da tx do write. */
  private async assertSemSobreposicao(scope: AccountingScope, data: PartnerData, selfId: string | null, tx: Prisma.TransactionClient): Promise<void> {
    const conflito = (await this.repo.listByTaxId(scope, data.taxId, tx)).find((p) => p.id !== selfId && vigenciasSeSobrepoem(p, data));
    if (conflito) {
      throw new ConflictError(
        `VIGENCIA_SOBREPOSTA: o sócio já tem vigência de ${conflito.entradaEm} a ${conflito.saidaEm ?? 'em aberto'} (id ${conflito.id}), que se cruza com ${data.entradaEm} a ${data.saidaEm ?? 'em aberto'}.`,
        'VIGENCIA_SOBREPOSTA',
      );
    }
  }

  private async audit(
    tx: Parameters<AuditService['append']>[0],
    scope: AccountingScope,
    row: Partner,
    eventType: typeof PARTNER_CREATED | typeof PARTNER_UPDATED,
  ): Promise<void> {
    await this.auditService.append(tx, scope, {
      actorUserId: scope.actorUserId,
      eventType,
      targetType: 'partner',
      targetId: row.id,
      payload: {
        partnerId: row.id,
        tipoPessoa: row.tipoPessoa,
        residenteBrasil: String(row.residenteBrasil),
        participacaoBp: String(row.participacaoBp),
        entradaEm: row.entradaEm,
        saidaEm: row.saidaEm ?? '',
      },
    });
  }

  private assertRead(scope: AccountingScope): void {
    if (!this.policy.canReadFiscalProfile(scope)) throw new ForbiddenError('Você não tem permissão para ler os sócios da empresa.');
  }

  private assertManage(scope: AccountingScope): void {
    if (!this.policy.canManageFiscalProfile(scope)) throw new ForbiddenError('Você não tem permissão para alterar os sócios da empresa.');
  }
}

function toData(input: CreatePartnerInput): PartnerData {
  return {
    nome: input.nome,
    taxId: input.taxId,
    tipoPessoa: tipoPessoaDe(input.taxId),
    residenteBrasil: input.residenteBrasil,
    participacaoBp: input.participacaoBp,
    entradaEm: input.entradaEm,
    saidaEm: input.saidaEm ?? null,
    outrasParticipacoes: input.outrasParticipacoes ?? null,
  };
}

function toView(row: Partner): PartnerView {
  return {
    id: row.id,
    nome: row.nome,
    taxId: row.taxId,
    tipoPessoa: row.tipoPessoa,
    residenteBrasil: row.residenteBrasil,
    participacaoBp: row.participacaoBp,
    entradaEm: row.entradaEm,
    saidaEm: row.saidaEm,
    outrasParticipacoes: (row.outrasParticipacoes as OutraParticipacao[] | null) ?? null,
    updatedAt: row.updatedAt.toISOString(),
  };
}
