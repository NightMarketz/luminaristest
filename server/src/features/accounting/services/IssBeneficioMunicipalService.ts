import type { IssBeneficioMunicipal, Prisma } from 'generated/prisma';
import { ConflictError, ForbiddenError, NotFoundError } from '../../../lib/errors';
import type { AccountingScope } from '../scope/AccountingScope';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { IIssBeneficioMunicipalRepository, IssBeneficioMunicipalData } from '../repositories/IIssBeneficioMunicipalRepository';
import type { AuditService } from './AuditService';
import type { IssBeneficioMunicipalInput, IssBeneficioTipo } from '../dtos/IssBeneficioMunicipalDto';
import { sobrepoe, type BeneficioCadastrado } from '../models/issBeneficio';

export const ISS_BENEFICIO_CRIADO = 'iss_beneficio_municipal.created';
export const ISS_BENEFICIO_ATUALIZADO = 'iss_beneficio_municipal.updated';
export const ISS_BENEFICIO_REMOVIDO = 'iss_beneficio_municipal.deleted';

export type IssBeneficioMunicipalView = BeneficioCadastrado & { updatedAt: string };

export const toBeneficio = (r: IssBeneficioMunicipal): BeneficioCadastrado => ({
  id: r.id,
  codMun: r.codMun,
  cTribNacPrefixos: (r.cTribNacPrefixos as string[] | null) ?? [],
  tipo: r.tipo as IssBeneficioTipo,
  reducaoBpPorFaixa: (r.reducaoBpPorFaixa as number[] | null) ?? null,
  legislacao: r.legislacao,
  vigenteDesde: r.vigenteDesde,
  vigenteAte: r.vigenteAte,
});

/**
 * SIMPLES-PISO-ANEXO-XI bloco 1 (BRIEF §3 item 1; F-PI-1 a) — cadastro do benefício municipal de ISS da ME/EPP do
 * Simples (Res. CGSN 140 arts. 31-32), por unidade. Soft-delete. A não-sobreposição (mesmo Município, vigência e
 * serviços em comum) é re-checada DENTRO da tx — é ela que torna única a seleção na apuração.
 * Auditoria: só código/enum/data; a `legislacao` (texto livre) fica fora do evento.
 */
export class IssBeneficioMunicipalService {
  constructor(
    private readonly repo: IIssBeneficioMunicipalRepository,
    private readonly policy: IAccountingPolicy,
    private readonly auditService: AuditService,
  ) {}

  async list(scope: AccountingScope): Promise<IssBeneficioMunicipalView[]> {
    this.assertRead(scope);
    return (await this.repo.listByScope(scope)).map(this.toView);
  }

  async get(scope: AccountingScope, id: string): Promise<IssBeneficioMunicipalView> {
    this.assertRead(scope);
    const row = await this.repo.findById(scope, id);
    if (!row) throw new NotFoundError(`Benefício municipal de ISS '${id}' não encontrado.`);
    return this.toView(row);
  }

  async create(scope: AccountingScope, input: IssBeneficioMunicipalInput): Promise<IssBeneficioMunicipalView> {
    this.assertManage(scope);
    const data = this.data(input);
    return this.repo.runTransaction(async (tx) => {
      await this.assertSemSobreposicao(scope, data, null, tx);
      const row = await this.repo.create(scope, data, tx);
      await this.audit(tx, scope, ISS_BENEFICIO_CRIADO, row);
      return this.toView(row);
    });
  }

  async update(scope: AccountingScope, id: string, input: IssBeneficioMunicipalInput): Promise<IssBeneficioMunicipalView> {
    this.assertManage(scope);
    const data = this.data(input);
    return this.repo.runTransaction(async (tx) => {
      if (!(await this.repo.findById(scope, id, tx))) throw new NotFoundError(`Benefício municipal de ISS '${id}' não encontrado.`);
      await this.assertSemSobreposicao(scope, data, id, tx);
      const row = await this.repo.update(scope, id, data, tx);
      await this.audit(tx, scope, ISS_BENEFICIO_ATUALIZADO, row);
      return this.toView(row);
    });
  }

  async delete(scope: AccountingScope, id: string): Promise<void> {
    this.assertManage(scope);
    await this.repo.runTransaction(async (tx) => {
      const row = await this.repo.findById(scope, id, tx);
      if (!row) throw new NotFoundError(`Benefício municipal de ISS '${id}' não encontrado.`);
      await this.repo.softDelete(scope, id, tx);
      await this.audit(tx, scope, ISS_BENEFICIO_REMOVIDO, row);
    });
  }

  /** Isenção e valor fixo não carregam redução por faixa. */
  private data(input: IssBeneficioMunicipalInput): IssBeneficioMunicipalData {
    const { unitId: _unitId, ...d } = input;
    return { ...d, cTribNacPrefixos: [...new Set(d.cTribNacPrefixos)], reducaoBpPorFaixa: d.tipo === 'REDUCAO_PERCENTUAL' ? d.reducaoBpPorFaixa : null };
  }

  private async assertSemSobreposicao(scope: AccountingScope, data: IssBeneficioMunicipalData, ignorar: string | null, tx: Prisma.TransactionClient): Promise<void> {
    const conflito = (await this.repo.listByScope(scope, tx)).find((r) => r.id !== ignorar && sobrepoe(toBeneficio(r), data));
    if (conflito) {
      throw new ConflictError(
        `Já existe benefício do Município ${data.codMun} com vigência e serviços em comum ('${conflito.id}', desde ${conflito.vigenteDesde}): encerre a vigência dele antes.`,
      );
    }
  }

  private async audit(tx: Prisma.TransactionClient, scope: AccountingScope, eventType: string, row: IssBeneficioMunicipal): Promise<void> {
    const b = toBeneficio(row);
    await this.auditService.append(tx, scope, {
      actorUserId: scope.actorUserId,
      eventType,
      targetType: 'iss_beneficio_municipal',
      targetId: row.id,
      payload: {
        codMun: b.codMun,
        tipo: b.tipo,
        cTribNacPrefixos: b.cTribNacPrefixos.join(','),
        reducaoBpPorFaixa: b.reducaoBpPorFaixa ? b.reducaoBpPorFaixa.join(',') : '',
        vigenteDesde: b.vigenteDesde,
        vigenteAte: b.vigenteAte ?? '',
      },
    });
  }

  private toView = (r: IssBeneficioMunicipal): IssBeneficioMunicipalView => ({ ...toBeneficio(r), updatedAt: r.updatedAt.toISOString() });

  private assertRead(scope: AccountingScope): void {
    if (!this.policy.canReadFiscalProfile(scope)) throw new ForbiddenError('Você não tem permissão para ler os benefícios municipais de ISS.');
  }

  private assertManage(scope: AccountingScope): void {
    if (!this.policy.canManageIssBeneficioMunicipal(scope)) throw new ForbiddenError('Você não tem permissão para alterar os benefícios municipais de ISS.');
  }
}
