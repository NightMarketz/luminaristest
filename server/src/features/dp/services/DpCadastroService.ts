import type { DpCargo, DpConvencaoColetiva, DpConvencaoParametro, DpJornada, DpLotacao, DpSindicato, Prisma } from 'generated/prisma';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../lib/errors';
import type { AccountingScope } from '../../accounting/scope/AccountingScope';
import type { AuditService } from '../../accounting/services/AuditService';
import type {
  CreateCargoInput,
  CreateConvencaoInput,
  CreateConvencaoParametroInput,
  CreateJornadaInput,
  CreateLotacaoInput,
  CreateSindicatoInput,
  UpdateCargoInput,
  UpdateConvencaoInput,
  UpdateConvencaoParametroInput,
  UpdateJornadaInput,
  UpdateLotacaoInput,
  UpdateSindicatoInput,
} from '../dtos/DpCadastrosDto';
import { vigenciaContida } from '../models/cadastros';
import { dpConflictError } from '../models/erros';
import { sobrepoe, type Vigencia } from '../models/vigencia';
import type { IDpPolicy } from '../policies/IDpPolicy';
import type { IDpCadastroRepository } from '../repositories/IDpCadastroRepository';

type Tx = Prisma.TransactionClient;
type Acao = 'created' | 'updated' | 'deleted';

/** Eventos de auditoria do PR-3 (§3.7). Payload só com ids, códigos, datas e o piso em string (item 36). */
export const DP_CADASTRO_EVENTS = [
  'dp.lotacao.created', 'dp.lotacao.updated', 'dp.lotacao.deleted',
  'dp.cargo.created', 'dp.cargo.updated', 'dp.cargo.deleted',
  'dp.jornada.created', 'dp.jornada.updated', 'dp.jornada.deleted',
  'dp.sindicato.created', 'dp.sindicato.updated', 'dp.sindicato.deleted',
  'dp.convencao.created', 'dp.convencao.updated', 'dp.convencao.deleted',
  'dp.convencao_parametro.created', 'dp.convencao_parametro.updated', 'dp.convencao_parametro.deleted',
] as const;
type DpCadastroEvent = (typeof DP_CADASTRO_EVENTS)[number];

export type DpLotacaoView = Omit<DpLotacao, 'userId' | 'deletedAt' | 'createdAt' | 'updatedAt'> & { createdAt: string; updatedAt: string };
export type DpCargoView = Omit<DpCargo, 'userId' | 'deletedAt' | 'createdAt' | 'updatedAt'> & { createdAt: string; updatedAt: string };
export type DpJornadaView = Omit<DpJornada, 'userId' | 'deletedAt' | 'createdAt' | 'updatedAt'> & { createdAt: string; updatedAt: string };
export type DpSindicatoView = Omit<DpSindicato, 'userId' | 'deletedAt' | 'createdAt' | 'updatedAt'> & { createdAt: string; updatedAt: string };
export type DpConvencaoView = Omit<DpConvencaoColetiva, 'userId' | 'deletedAt' | 'createdAt' | 'updatedAt'> & { createdAt: string; updatedAt: string };
/** `valorInt` sai como string (BigInt não serializa em JSON). */
export type DpConvencaoParametroView = Omit<DpConvencaoParametro, 'valorInt' | 'deletedAt' | 'createdAt' | 'updatedAt'> & {
  valorInt: string;
  createdAt: string;
  updatedAt: string;
};

/**
 * BE-INCR-DP-F0-F1 itens 28–33 e 36 (PR-3) — cadastros de estrutura do DP (lotação, cargo, jornada, sindicato,
 * convenção coletiva e seus parâmetros), por instância (R8: `ownerUserId`). Policy primeiro; unicidade de registro vivo
 * (código da lotação, CNPJ do sindicato) e as regras de vigência do parâmetro são gates DENTRO da tx, sobre o `tx`
 * propagado ao repositório (F19; memória authoritative-gate-inside-tx), e a auditoria grava na mesma tx. Apagar é
 * soft-delete, então apagar e recriar com o mesmo código funciona.
 *
 * A trava de cálculo da jornada (item 30, D-5: `DP_JORNADA_EM_USO`) entrou no PR-4, com a versão de vínculo.
 */
export class DpCadastroService {
  constructor(
    private readonly repo: IDpCadastroRepository,
    private readonly policy: IDpPolicy,
    private readonly auditService: AuditService,
  ) {}

  // ── Item 28 — lotação ──────────────────────────────────────────────────────────────────────────────────────────────
  async listLotacoes(scope: AccountingScope, limit: number): Promise<DpLotacaoView[]> {
    this.assertRead(scope);
    return (await this.repo.listLotacoes(scope.ownerUserId, limit)).map(view);
  }
  async getLotacao(scope: AccountingScope, id: string): Promise<DpLotacaoView> {
    this.assertRead(scope);
    return view(achado(await this.repo.findLotacao(scope.ownerUserId, id), 'Lotação'));
  }
  async createLotacao(scope: AccountingScope, input: CreateLotacaoInput): Promise<DpLotacaoView> {
    this.assertManage(scope);
    return this.repo.runTransaction(async (tx) => {
      await this.assertCodigoLivre(scope, input.codigo, null, tx);
      // Estabelecimento = a unidade do escopo, já resolvida como do dono pelo AccountingScopeResolver (R8, F-DP-2).
      const row = await this.repo.createLotacao(scope.ownerUserId, { unitId: scope.unitId, codigo: input.codigo, descricao: input.descricao }, tx);
      await this.auditLotacao(tx, scope, 'created', row);
      return view(row);
    });
  }
  async updateLotacao(scope: AccountingScope, id: string, input: UpdateLotacaoInput): Promise<DpLotacaoView> {
    this.assertManage(scope);
    return this.repo.runTransaction(async (tx) => {
      achado(await this.repo.findLotacao(scope.ownerUserId, id, tx), 'Lotação');
      if (input.codigo !== undefined) await this.assertCodigoLivre(scope, input.codigo, id, tx);
      const row = await this.repo.updateLotacao(id, { codigo: input.codigo, descricao: input.descricao }, tx);
      await this.auditLotacao(tx, scope, 'updated', row);
      return view(row);
    });
  }
  async deleteLotacao(scope: AccountingScope, id: string): Promise<void> {
    this.assertManage(scope);
    await this.repo.runTransaction(async (tx) => {
      achado(await this.repo.findLotacao(scope.ownerUserId, id, tx), 'Lotação');
      await this.auditLotacao(tx, scope, 'deleted', await this.repo.deleteLotacao(id, tx));
    });
  }

  // ── Item 29 — cargo ────────────────────────────────────────────────────────────────────────────────────────────────
  async listCargos(scope: AccountingScope, limit: number): Promise<DpCargoView[]> {
    this.assertRead(scope);
    return (await this.repo.listCargos(scope.ownerUserId, limit)).map(view);
  }
  async getCargo(scope: AccountingScope, id: string): Promise<DpCargoView> {
    this.assertRead(scope);
    return view(achado(await this.repo.findCargo(scope.ownerUserId, id), 'Cargo'));
  }
  async createCargo(scope: AccountingScope, input: CreateCargoInput): Promise<DpCargoView> {
    this.assertManage(scope);
    return this.repo.runTransaction(async (tx) => {
      const row = await this.repo.createCargo(scope.ownerUserId, { nome: input.nome, cbo: input.cbo }, tx);
      await this.auditCargo(tx, scope, 'created', row);
      return view(row);
    });
  }
  async updateCargo(scope: AccountingScope, id: string, input: UpdateCargoInput): Promise<DpCargoView> {
    this.assertManage(scope);
    return this.repo.runTransaction(async (tx) => {
      achado(await this.repo.findCargo(scope.ownerUserId, id, tx), 'Cargo');
      const row = await this.repo.updateCargo(id, { nome: input.nome, cbo: input.cbo }, tx);
      await this.auditCargo(tx, scope, 'updated', row);
      return view(row);
    });
  }
  async deleteCargo(scope: AccountingScope, id: string): Promise<void> {
    this.assertManage(scope);
    await this.repo.runTransaction(async (tx) => {
      achado(await this.repo.findCargo(scope.ownerUserId, id, tx), 'Cargo');
      await this.auditCargo(tx, scope, 'deleted', await this.repo.deleteCargo(id, tx));
    });
  }

  // ── Item 30 — jornada ──────────────────────────────────────────────────────────────────────────────────────────────
  async listJornadas(scope: AccountingScope, limit: number): Promise<DpJornadaView[]> {
    this.assertRead(scope);
    return (await this.repo.listJornadas(scope.ownerUserId, limit)).map(view);
  }
  async getJornada(scope: AccountingScope, id: string): Promise<DpJornadaView> {
    this.assertRead(scope);
    return view(achado(await this.repo.findJornada(scope.ownerUserId, id), 'Jornada'));
  }
  async createJornada(scope: AccountingScope, input: CreateJornadaInput): Promise<DpJornadaView> {
    this.assertManage(scope);
    return this.repo.runTransaction(async (tx) => {
      const row = await this.repo.createJornada(
        scope.ownerUserId,
        { nome: input.nome, minutosSemanais: input.minutosSemanais, tipoJornada: input.tipoJornada, descricao: input.descricao ?? null },
        tx,
      );
      await this.auditJornada(tx, scope, 'created', row);
      return view(row);
    });
  }
  async updateJornada(scope: AccountingScope, id: string, input: UpdateJornadaInput): Promise<DpJornadaView> {
    this.assertManage(scope);
    return this.repo.runTransaction(async (tx) => {
      const atual = achado(await this.repo.findJornada(scope.ownerUserId, id, tx), 'Jornada');
      // Item 30 (D-5): referenciada por versão de vínculo, os campos de cálculo não mudam — mudança = jornada nova +
      // versão nova do vínculo. Gate dentro da tx (memória authoritative-gate-inside-tx).
      const mudaCalculo =
        (input.minutosSemanais !== undefined && input.minutosSemanais !== atual.minutosSemanais) ||
        (input.tipoJornada !== undefined && input.tipoJornada !== atual.tipoJornada);
      if (mudaCalculo && (await this.repo.jornadaEmUso(id, tx))) {
        throw dpConflictError(
          'DP_JORNADA_EM_USO',
          'A jornada já é usada por versão de vínculo: minutosSemanais e tipoJornada não mudam. Cadastre jornada nova e crie versão nova do vínculo.',
        );
      }
      const row = await this.repo.updateJornada(
        id,
        { nome: input.nome, minutosSemanais: input.minutosSemanais, tipoJornada: input.tipoJornada, descricao: input.descricao },
        tx,
      );
      await this.auditJornada(tx, scope, 'updated', row);
      return view(row);
    });
  }
  async deleteJornada(scope: AccountingScope, id: string): Promise<void> {
    this.assertManage(scope);
    await this.repo.runTransaction(async (tx) => {
      achado(await this.repo.findJornada(scope.ownerUserId, id, tx), 'Jornada');
      await this.auditJornada(tx, scope, 'deleted', await this.repo.deleteJornada(id, tx));
    });
  }

  // ── Item 31 — sindicato ────────────────────────────────────────────────────────────────────────────────────────────
  async listSindicatos(scope: AccountingScope, limit: number): Promise<DpSindicatoView[]> {
    this.assertRead(scope);
    return (await this.repo.listSindicatos(scope.ownerUserId, limit)).map(view);
  }
  async getSindicato(scope: AccountingScope, id: string): Promise<DpSindicatoView> {
    this.assertRead(scope);
    return view(achado(await this.repo.findSindicato(scope.ownerUserId, id), 'Sindicato'));
  }
  async createSindicato(scope: AccountingScope, input: CreateSindicatoInput): Promise<DpSindicatoView> {
    this.assertManage(scope);
    return this.repo.runTransaction(async (tx) => {
      await this.assertCnpjLivre(scope, input.cnpj, null, tx);
      const row = await this.repo.createSindicato(scope.ownerUserId, { cnpj: input.cnpj, nome: input.nome }, tx);
      await this.auditSindicato(tx, scope, 'created', row);
      return view(row);
    });
  }
  async updateSindicato(scope: AccountingScope, id: string, input: UpdateSindicatoInput): Promise<DpSindicatoView> {
    this.assertManage(scope);
    return this.repo.runTransaction(async (tx) => {
      achado(await this.repo.findSindicato(scope.ownerUserId, id, tx), 'Sindicato');
      if (input.cnpj !== undefined) await this.assertCnpjLivre(scope, input.cnpj, id, tx);
      const row = await this.repo.updateSindicato(id, { cnpj: input.cnpj, nome: input.nome }, tx);
      await this.auditSindicato(tx, scope, 'updated', row);
      return view(row);
    });
  }
  async deleteSindicato(scope: AccountingScope, id: string): Promise<void> {
    this.assertManage(scope);
    await this.repo.runTransaction(async (tx) => {
      achado(await this.repo.findSindicato(scope.ownerUserId, id, tx), 'Sindicato');
      await this.auditSindicato(tx, scope, 'deleted', await this.repo.deleteSindicato(id, tx));
    });
  }

  // ── Item 32 — convenção coletiva ───────────────────────────────────────────────────────────────────────────────────
  async listConvencoes(scope: AccountingScope, limit: number): Promise<DpConvencaoView[]> {
    this.assertRead(scope);
    return (await this.repo.listConvencoes(scope.ownerUserId, limit)).map(view);
  }
  async getConvencao(scope: AccountingScope, id: string): Promise<DpConvencaoView> {
    this.assertRead(scope);
    return view(achado(await this.repo.findConvencao(scope.ownerUserId, id), 'Convenção coletiva'));
  }
  async createConvencao(scope: AccountingScope, input: CreateConvencaoInput): Promise<DpConvencaoView> {
    this.assertManage(scope);
    return this.repo.runTransaction(async (tx) => {
      // Sindicato de outro dono ou apagado ⇒ 404 (Tier-0).
      achado(await this.repo.findSindicato(scope.ownerUserId, input.sindicatoId, tx), 'Sindicato');
      const row = await this.repo.createConvencao(
        scope.ownerUserId,
        { sindicatoId: input.sindicatoId, identificacao: input.identificacao, vigenteDesde: input.vigenteDesde, vigenteAte: input.vigenteAte ?? null, fonte: input.fonte },
        tx,
      );
      await this.auditConvencao(tx, scope, 'created', row);
      return view(row);
    });
  }
  async updateConvencao(scope: AccountingScope, id: string, input: UpdateConvencaoInput): Promise<DpConvencaoView> {
    this.assertManage(scope);
    return this.repo.runTransaction(async (tx) => {
      const atual = achado(await this.repo.findConvencao(scope.ownerUserId, id, tx), 'Convenção coletiva');
      const nova: Vigencia = {
        vigenteDesde: input.vigenteDesde ?? atual.vigenteDesde,
        vigenteAte: input.vigenteAte !== undefined ? input.vigenteAte : atual.vigenteAte,
      };
      assertVigenciaOrdenada(nova);
      // Item 33: os parâmetros vivos continuam dentro da vigência da convenção.
      const fora = (await this.repo.listParametros(id, tx)).filter((p) => !vigenciaContida(p, nova));
      if (fora.length) {
        throw new ValidationError(
          `A nova vigência da convenção (${nova.vigenteDesde} a ${nova.vigenteAte ?? 'em aberto'}) deixaria ${fora.length} parâmetro(s) fora dela.`,
          { parametroIds: fora.map((p) => p.id) },
        );
      }
      const row = await this.repo.updateConvencao(
        id,
        { identificacao: input.identificacao, vigenteDesde: input.vigenteDesde, vigenteAte: input.vigenteAte, fonte: input.fonte },
        tx,
      );
      await this.auditConvencao(tx, scope, 'updated', row);
      return view(row);
    });
  }
  async deleteConvencao(scope: AccountingScope, id: string): Promise<void> {
    this.assertManage(scope);
    await this.repo.runTransaction(async (tx) => {
      achado(await this.repo.findConvencao(scope.ownerUserId, id, tx), 'Convenção coletiva');
      await this.auditConvencao(tx, scope, 'deleted', await this.repo.deleteConvencao(id, tx));
    });
  }

  // ── Item 33 — parâmetro da convenção ───────────────────────────────────────────────────────────────────────────────
  async listParametros(scope: AccountingScope, convencaoId: string): Promise<DpConvencaoParametroView[]> {
    this.assertRead(scope);
    achado(await this.repo.findConvencao(scope.ownerUserId, convencaoId), 'Convenção coletiva');
    return (await this.repo.listParametros(convencaoId)).map(viewParametro);
  }
  async createParametro(scope: AccountingScope, convencaoId: string, input: CreateConvencaoParametroInput): Promise<DpConvencaoParametroView> {
    this.assertManage(scope);
    return this.repo.runTransaction(async (tx) => {
      const conv = achado(await this.repo.findConvencao(scope.ownerUserId, convencaoId, tx), 'Convenção coletiva');
      // PISO_SALARIAL_CENTS: discriminador = cargoId, cargo vivo do mesmo dono (Tier-0 ⇒ 404).
      achado(await this.repo.findCargo(scope.ownerUserId, input.discriminador, tx), 'Cargo');
      const vig: Vigencia = { vigenteDesde: input.vigenteDesde, vigenteAte: input.vigenteAte ?? null };
      await this.assertParametroCabe(tx, conv, { chave: input.chave, discriminador: input.discriminador, ...vig }, null);
      const row = await this.repo.createParametro(
        convencaoId,
        { chave: input.chave, discriminador: input.discriminador, valorInt: input.valorInt, clausula: input.clausula, ...vig },
        tx,
      );
      await this.auditParametro(tx, scope, 'created', row);
      return viewParametro(row);
    });
  }
  async updateParametro(
    scope: AccountingScope,
    convencaoId: string,
    id: string,
    input: UpdateConvencaoParametroInput,
  ): Promise<DpConvencaoParametroView> {
    this.assertManage(scope);
    return this.repo.runTransaction(async (tx) => {
      const conv = achado(await this.repo.findConvencao(scope.ownerUserId, convencaoId, tx), 'Convenção coletiva');
      const atual = achado(await this.repo.findParametro(convencaoId, id, tx), 'Parâmetro da convenção');
      const vig: Vigencia = {
        vigenteDesde: input.vigenteDesde ?? atual.vigenteDesde,
        vigenteAte: input.vigenteAte !== undefined ? input.vigenteAte : atual.vigenteAte,
      };
      assertVigenciaOrdenada(vig);
      await this.assertParametroCabe(tx, conv, { chave: atual.chave, discriminador: atual.discriminador, ...vig }, id);
      const row = await this.repo.updateParametro(
        id,
        { valorInt: input.valorInt, clausula: input.clausula, vigenteDesde: input.vigenteDesde, vigenteAte: input.vigenteAte },
        tx,
      );
      await this.auditParametro(tx, scope, 'updated', row);
      return viewParametro(row);
    });
  }
  async deleteParametro(scope: AccountingScope, convencaoId: string, id: string): Promise<void> {
    this.assertManage(scope);
    await this.repo.runTransaction(async (tx) => {
      achado(await this.repo.findConvencao(scope.ownerUserId, convencaoId, tx), 'Convenção coletiva');
      achado(await this.repo.findParametro(convencaoId, id, tx), 'Parâmetro da convenção');
      await this.auditParametro(tx, scope, 'deleted', await this.repo.deleteParametro(id, tx));
    });
  }

  // ── gates ──────────────────────────────────────────────────────────────────────────────────────────────────────────
  private async assertCodigoLivre(scope: AccountingScope, codigo: string, selfId: string | null, tx: Tx): Promise<void> {
    const outro = await this.repo.findLotacaoPorCodigo(scope.ownerUserId, codigo, tx);
    if (outro && outro.id !== selfId) {
      throw dpConflictError('DP_CODIGO_DUPLICADO', `Já existe lotação viva com o código '${codigo}' (id ${outro.id}).`);
    }
  }

  private async assertCnpjLivre(scope: AccountingScope, cnpj: string, selfId: string | null, tx: Tx): Promise<void> {
    const outro = await this.repo.findSindicatoPorCnpj(scope.ownerUserId, cnpj, tx);
    if (outro && outro.id !== selfId) {
      throw dpConflictError('DP_CODIGO_DUPLICADO', `Já existe sindicato vivo com este CNPJ (id ${outro.id}).`);
    }
  }

  /** Item 33: vigência dentro da convenção e sem sobreposição por `(convencaoId, chave, discriminador)`. */
  private async assertParametroCabe(
    tx: Tx,
    conv: DpConvencaoColetiva,
    novo: Vigencia & { chave: string; discriminador: string | null },
    selfId: string | null,
  ): Promise<void> {
    if (!vigenciaContida(novo, conv)) {
      throw new ValidationError(
        `A vigência do parâmetro (${novo.vigenteDesde} a ${novo.vigenteAte ?? 'em aberto'}) sai da vigência da convenção (${conv.vigenteDesde} a ${conv.vigenteAte ?? 'em aberto'}).`,
      );
    }
    const conflito = (await this.repo.listParametros(conv.id, tx)).find(
      (p) => p.id !== selfId && p.chave === novo.chave && p.discriminador === novo.discriminador && sobrepoe(p, novo),
    );
    if (conflito) {
      throw dpConflictError(
        'DP_VERSAO_SOBREPOSTA',
        `'${novo.chave}' já tem parâmetro de ${conflito.vigenteDesde} a ${conflito.vigenteAte ?? 'em aberto'} (id ${conflito.id}) para o mesmo discriminador.`,
      );
    }
  }

  // ── auditoria (item 36) ────────────────────────────────────────────────────────────────────────────────────────────
  private auditLotacao(tx: Tx, scope: AccountingScope, acao: Acao, r: DpLotacao) {
    return this.audit(tx, scope, `dp.lotacao.${acao}`, 'dp_lotacao', r.id, { lotacaoId: r.id, unitId: r.unitId, codigo: r.codigo });
  }
  private auditCargo(tx: Tx, scope: AccountingScope, acao: Acao, r: DpCargo) {
    return this.audit(tx, scope, `dp.cargo.${acao}`, 'dp_cargo', r.id, { cargoId: r.id, cbo: r.cbo });
  }
  private auditJornada(tx: Tx, scope: AccountingScope, acao: Acao, r: DpJornada) {
    return this.audit(tx, scope, `dp.jornada.${acao}`, 'dp_jornada', r.id, {
      jornadaId: r.id,
      tipoJornada: r.tipoJornada,
      minutosSemanais: String(r.minutosSemanais),
    });
  }
  private auditSindicato(tx: Tx, scope: AccountingScope, acao: Acao, r: DpSindicato) {
    return this.audit(tx, scope, `dp.sindicato.${acao}`, 'dp_sindicato', r.id, { sindicatoId: r.id, cnpj: r.cnpj });
  }
  private auditConvencao(tx: Tx, scope: AccountingScope, acao: Acao, r: DpConvencaoColetiva) {
    return this.audit(tx, scope, `dp.convencao.${acao}`, 'dp_convencao', r.id, {
      convencaoId: r.id,
      sindicatoId: r.sindicatoId,
      vigenteDesde: r.vigenteDesde,
      vigenteAte: r.vigenteAte,
    });
  }
  private auditParametro(tx: Tx, scope: AccountingScope, acao: Acao, r: DpConvencaoParametro) {
    return this.audit(tx, scope, `dp.convencao_parametro.${acao}`, 'dp_convencao_parametro', r.id, {
      parametroId: r.id,
      convencaoId: r.convencaoId,
      chave: r.chave,
      discriminador: r.discriminador,
      valorInt: r.valorInt.toString(), // dinheiro da convenção em string, como o AP (item 36)
      vigenteDesde: r.vigenteDesde,
      vigenteAte: r.vigenteAte,
    });
  }

  private async audit(
    tx: Tx,
    scope: AccountingScope,
    eventType: DpCadastroEvent,
    targetType: string,
    targetId: string,
    payload: Record<string, string | null>,
  ): Promise<void> {
    await this.auditService.append(tx, scope, { actorUserId: scope.actorUserId, eventType, targetType, targetId, payload });
  }

  private assertRead(scope: AccountingScope): void {
    if (!this.policy.canRead(scope)) throw new ForbiddenError('Você não tem permissão para ler os cadastros do DP.');
  }

  private assertManage(scope: AccountingScope): void {
    if (!this.policy.canManage(scope)) throw new ForbiddenError('Você não tem permissão para alterar os cadastros do DP.');
  }
}

function achado<T>(row: T | null, oQue: string): T {
  if (!row) throw new NotFoundError(`${oQue} não encontrado(a).`);
  return row;
}

function assertVigenciaOrdenada(v: Vigencia): void {
  if (v.vigenteAte !== null && v.vigenteAte < v.vigenteDesde) {
    throw new ValidationError(`vigenteAte (${v.vigenteAte}) antes de vigenteDesde (${v.vigenteDesde}).`);
  }
}

function view<T extends { userId: string; deletedAt: Date | null; createdAt: Date; updatedAt: Date }>(
  r: T,
): Omit<T, 'userId' | 'deletedAt' | 'createdAt' | 'updatedAt'> & { createdAt: string; updatedAt: string } {
  const { userId: _u, deletedAt: _d, createdAt, updatedAt, ...resto } = r;
  return { ...resto, createdAt: createdAt.toISOString(), updatedAt: updatedAt.toISOString() };
}

function viewParametro(r: DpConvencaoParametro): DpConvencaoParametroView {
  const { deletedAt: _d, valorInt, createdAt, updatedAt, ...resto } = r;
  return { ...resto, valorInt: valorInt.toString(), createdAt: createdAt.toISOString(), updatedAt: updatedAt.toISOString() };
}
