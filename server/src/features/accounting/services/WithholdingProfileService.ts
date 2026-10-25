import type { LegalParameter, Prisma, WithholdingProfile } from 'generated/prisma';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../../lib/errors';
import type { AccountingScope } from '../scope/AccountingScope';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { ICounterpartyRepository } from '../repositories/ICounterpartyRepository';
import type { IWithholdingProfileRepository } from '../repositories/IWithholdingProfileRepository';
import type { ILegalParameterRepository } from '../../legalParameters/repositories/ILegalParameterRepository';
import type { AuditService } from './AuditService';
import type { CreateWithholdingProfileInput, UpdateWithholdingProfileInput } from '../dtos/WithholdingProfileDto';
import { AVISO_PERFIL_RETENCAO, erroDoPerfilRetencao, vigenciasDoPerfilSeSobrepoem, type PerfilRetencaoDados } from '../models/withholdingProfile';
import { naturezaRendimentoVigente } from '../models/retencaoParams';

export const WITHHOLDING_PROFILE_CREATED = 'withholding_profile.created';
export const WITHHOLDING_PROFILE_UPDATED = 'withholding_profile.updated';
export const WITHHOLDING_PROFILE_DELETED = 'withholding_profile.deleted';

export interface WithholdingProfileView extends PerfilRetencaoDados {
  id: string;
  counterpartyId: string;
  updatedAt: string;
  /** Não bloqueiam: `NATUREZA_RENDIMENTO_DRAFT`. */
  avisos: string[];
}

/** A fotografia da `NATUREZA_RENDIMENTO` (PUBLISHED em vigor) — o `LegalParameterService` (F-LP-4 a). */
export interface FotografiaLegal {
  fotografia(tabelas: readonly ['NATUREZA_RENDIMENTO']): Promise<LegalParameter[]>;
}

/**
 * BE-INCR-RETENCOES-FONTE PR-1 (BRIEF item 6, §5.1; F-RET-3 a, F-RET-16 a) — perfil de retenção por contraparte × natureza
 * do serviço. Policy `canManageWithholdingProfile` (régua do AP). Tenancy em dois níveis: id de outro escopo → 404. Dentro da
 * tx do write: a contraparte relida (regime PF ⇒ só IRRF), o `natRend` na Tabela 01 (PUBLISHED vigente em `vigenteDesde`; só
 * DRAFT ⇒ aceito com aviso; ausente ⇒ 400) e a vigência sem sobreposição por (contraparte, natureza) ⇒ 409. Auditoria com ids,
 * natureza e flags — nunca `taxId` nem nome (memória allowlist de auditoria).
 */
export class WithholdingProfileService {
  constructor(
    private readonly repo: IWithholdingProfileRepository,
    private readonly counterpartyRepo: ICounterpartyRepository,
    private readonly legalParams: FotografiaLegal,
    private readonly legalParamRepo: Pick<ILegalParameterRepository, 'findMany'>,
    private readonly policy: IAccountingPolicy,
    private readonly auditService: AuditService,
  ) {}

  async list(scope: AccountingScope, counterpartyId?: string): Promise<WithholdingProfileView[]> {
    this.assertRead(scope);
    return (await this.repo.list(scope, counterpartyId)).map((r) => toView(r, []));
  }

  async get(scope: AccountingScope, id: string): Promise<WithholdingProfileView> {
    this.assertRead(scope);
    const row = await this.repo.findById(scope, id);
    if (!row) throw new NotFoundError('Perfil de retenção não encontrado.');
    return toView(row, []);
  }

  async create(scope: AccountingScope, input: CreateWithholdingProfileInput): Promise<WithholdingProfileView> {
    this.assertManage(scope);
    const data = toData(input);
    return this.repo.runInTransaction(async (tx) => {
      const avisos = await this.validar(scope, input.counterpartyId, data, null, tx);
      const row = await this.repo.create(scope, input.counterpartyId, data, tx);
      await this.audit(tx, scope, row, WITHHOLDING_PROFILE_CREATED);
      return toView(row, avisos);
    });
  }

  async update(scope: AccountingScope, id: string, input: UpdateWithholdingProfileInput): Promise<WithholdingProfileView> {
    this.assertManage(scope);
    const data = toData(input);
    return this.repo.runInTransaction(async (tx) => {
      const atual = await this.repo.findById(scope, id, tx);
      if (!atual) throw new NotFoundError('Perfil de retenção não encontrado.');
      const avisos = await this.validar(scope, atual.counterpartyId, data, id, tx);
      const row = await this.repo.update(scope, id, data, tx);
      await this.audit(tx, scope, row, WITHHOLDING_PROFILE_UPDATED);
      return toView(row, avisos);
    });
  }

  async remove(scope: AccountingScope, id: string): Promise<void> {
    this.assertManage(scope);
    await this.repo.runInTransaction(async (tx) => {
      if (!(await this.repo.findById(scope, id, tx))) throw new NotFoundError('Perfil de retenção não encontrado.');
      await this.repo.softDelete(scope, id, tx);
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType: WITHHOLDING_PROFILE_DELETED,
        targetType: 'withholding_profile',
        targetId: id,
        payload: { profileId: id },
      });
    });
  }

  /** As regras que leem o banco, dentro da tx. Devolve os avisos. */
  private async validar(
    scope: AccountingScope,
    counterpartyId: string,
    data: PerfilRetencaoDados,
    selfId: string | null,
    tx: Prisma.TransactionClient,
  ): Promise<string[]> {
    const contraparte = await this.counterpartyRepo.findById(scope, counterpartyId, tx);
    if (!contraparte) throw new NotFoundError(`Contraparte '${counterpartyId}' não foi encontrada.`);
    const erro = erroDoPerfilRetencao(data, contraparte.regimeTributario);
    if (erro) throw new ValidationError(erro);

    const avisos: string[] = [];
    if (data.natRend !== null) {
      const vigente = naturezaRendimentoVigente(await this.legalParams.fotografia(['NATUREZA_RENDIMENTO']), data.natRend, data.vigenteDesde);
      if (!vigente) {
        const rascunho = (await this.legalParamRepo.findMany({ tabela: 'NATUREZA_RENDIMENTO', status: 'DRAFT' })).some((l) => l.chave === data.natRend);
        if (!rascunho) throw new ValidationError(`natRend ${data.natRend} não está na Tabela 01 da EFD-Reinf (NATUREZA_RENDIMENTO) vigente em ${data.vigenteDesde}.`);
        avisos.push(`${AVISO_PERFIL_RETENCAO.NATUREZA_RENDIMENTO_DRAFT}: natRend ${data.natRend} só existe em rascunho na Tabela 01 — o código de receita fica nulo até a publicação.`);
      }
    }

    const conflito = (await this.repo.listByCounterpartyAndNatureza(scope, counterpartyId, data.naturezaServico, tx)).find(
      (p) => p.id !== selfId && vigenciasDoPerfilSeSobrepoem(p, data),
    );
    if (conflito) {
      throw new ConflictError(
        `VIGENCIA_SOBREPOSTA: a contraparte já tem perfil ${data.naturezaServico} de ${conflito.vigenteDesde} a ${conflito.vigenteAte ?? 'em aberto'} (id ${conflito.id}), que se cruza com ${data.vigenteDesde} a ${data.vigenteAte ?? 'em aberto'}.`,
        'VIGENCIA_SOBREPOSTA',
      );
    }
    return avisos;
  }

  private async audit(
    tx: Parameters<AuditService['append']>[0],
    scope: AccountingScope,
    row: WithholdingProfile,
    eventType: typeof WITHHOLDING_PROFILE_CREATED | typeof WITHHOLDING_PROFILE_UPDATED,
  ): Promise<void> {
    await this.auditService.append(tx, scope, {
      actorUserId: scope.actorUserId,
      eventType,
      targetType: 'withholding_profile',
      targetId: row.id,
      payload: {
        profileId: row.id,
        counterpartyId: row.counterpartyId,
        naturezaServico: row.naturezaServico,
        natRend: row.natRend ?? '',
        irrf: String(row.irrf),
        csrf: String(row.csrf),
        inss: String(row.inss),
        issRetido: String(row.issRetido),
        vigenteDesde: row.vigenteDesde,
        vigenteAte: row.vigenteAte ?? '',
      },
    });
  }

  private assertRead(scope: AccountingScope): void {
    if (!this.policy.canReadWithholdingProfile(scope)) throw new ForbiddenError('Você não tem permissão para ler perfis de retenção.');
  }

  private assertManage(scope: AccountingScope): void {
    if (!this.policy.canManageWithholdingProfile(scope)) throw new ForbiddenError('Você não tem permissão para alterar perfis de retenção.');
  }
}

function toData(input: UpdateWithholdingProfileInput): PerfilRetencaoDados {
  return {
    naturezaServico: input.naturezaServico,
    natRend: input.natRend ?? null,
    irrf: input.irrf,
    csrf: input.csrf,
    inss: input.inss,
    inssTpServico: input.inssTpServico ?? null,
    inssCprb: input.inssCprb ?? null,
    issRetido: input.issRetido,
    issCodMun: input.issCodMun ?? null,
    issAliquotaBp: input.issAliquotaBp ?? null,
    issVencimentoDia: input.issVencimentoDia ?? null,
    fonte: input.fonte,
    vigenteDesde: input.vigenteDesde,
    vigenteAte: input.vigenteAte ?? null,
  };
}

function toView(row: WithholdingProfile, avisos: string[]): WithholdingProfileView {
  return {
    id: row.id,
    counterpartyId: row.counterpartyId,
    naturezaServico: row.naturezaServico as PerfilRetencaoDados['naturezaServico'],
    natRend: row.natRend,
    irrf: row.irrf,
    csrf: row.csrf,
    inss: row.inss,
    inssTpServico: row.inssTpServico,
    inssCprb: row.inssCprb,
    issRetido: row.issRetido,
    issCodMun: row.issCodMun,
    issAliquotaBp: row.issAliquotaBp,
    issVencimentoDia: row.issVencimentoDia,
    fonte: row.fonte,
    vigenteDesde: row.vigenteDesde,
    vigenteAte: row.vigenteAte,
    updatedAt: row.updatedAt.toISOString(),
    avisos,
  };
}
