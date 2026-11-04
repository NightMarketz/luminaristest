import type { DpAfastamento, DpFeriasImplantacao, DpVinculo, Prisma } from 'generated/prisma';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../../lib/errors';
import type { AccountingScope } from '../../accounting/scope/AccountingScope';
import type { AuditService } from '../../accounting/services/AuditService';
import { linhaLegalVigente } from '../../legalParameters/models/legalParameter';
import type { LegalParameterService } from '../../legalParameters/services/LegalParameterService';
import type {
  CreateAfastamentoInput,
  CreateFeriasImplantacaoInput,
  UpdateAfastamentoInput,
  UpdateFeriasImplantacaoInput,
} from '../dtos/DpAfastamentoFeriasDto';
import { dpConflictError, dpValidationError } from '../models/erros';
import { periodosDeFerias, type PeriodoFerias } from '../models/ferias';
import { sobrepoe } from '../models/vigencia';
import { naturezaDoEvento, type NaturezaVinculo } from '../models/vinculo';
import type { IDpPolicy } from '../policies/IDpPolicy';
import type { DpAfastamentoData, IDpAfastamentoFeriasRepository } from '../repositories/IDpAfastamentoFeriasRepository';
import type { IDpVinculoRepository } from '../repositories/IDpVinculoRepository';

type Tx = Prisma.TransactionClient;

/**
 * Eventos de auditoria do PR-6 (item 61). O afastamento leva ids e datas; o `motivo` fica FORA (pode ser dado de saúde,
 * e o `AuditEvent` não se apaga — F17). A implantação leva ids, `aquisitivoInicio` e `diasGozados`.
 */
export const DP_AFASTAMENTO_FERIAS_EVENTS = [
  'dp.afastamento.created', 'dp.afastamento.updated', 'dp.afastamento.deleted',
  'dp.ferias_implantacao.created', 'dp.ferias_implantacao.updated', 'dp.ferias_implantacao.deleted',
] as const;
type DpAfastamentoFeriasEvent = (typeof DP_AFASTAMENTO_FERIAS_EVENTS)[number];

export type DpAfastamentoView = Omit<DpAfastamento, 'deletedAt' | 'createdAt' | 'updatedAt'> & { createdAt: string; updatedAt: string };
export type DpFeriasImplantacaoView = Omit<DpFeriasImplantacao, 'deletedAt' | 'createdAt' | 'updatedAt'> & { createdAt: string; updatedAt: string };
/** Item 59 — sem saldo no F1 (o saldo depende das faltas, CLT art. 130). */
export interface DpFeriasView {
  vinculoId: string;
  natureza: NaturezaVinculo;
  dataRef: string;
  periodos: (PeriodoFerias & { diasGozadosImplantados: number | null })[];
}

/**
 * BE-INCR-DP-F0-F1 itens 56–61 (PR-6) — afastamento e férias do vínculo. Policy primeiro; a posse vem do vínculo do dono
 * (Tier-0 ⇒ 404). A sobreposição de afastamentos e a unicidade viva da implantação por `(vinculoId, aquisitivoInicio)` são
 * gates DENTRO da tx, sobre o `tx` propagado aos repositórios (memória authoritative-gate-inside-tx), e a auditoria grava
 * na mesma tx.
 */
export class DpAfastamentoFeriasService {
  constructor(
    private readonly repo: IDpAfastamentoFeriasRepository,
    private readonly vinculos: Pick<IDpVinculoRepository, 'findVinculo'>,
    private readonly policy: IDpPolicy,
    private readonly auditService: AuditService,
    private readonly legalParams: Pick<LegalParameterService, 'fotografia'>,
  ) {}

  // ── Item 56 — afastamento ──────────────────────────────────────────────────────────────────────────────────────────
  async listAfastamentos(scope: AccountingScope, vinculoId: string): Promise<DpAfastamentoView[]> {
    this.assertRead(scope);
    achado(await this.vinculos.findVinculo(scope.ownerUserId, vinculoId), 'Vínculo');
    return (await this.repo.listAfastamentos(vinculoId)).map(view);
  }
  async createAfastamento(scope: AccountingScope, vinculoId: string, input: CreateAfastamentoInput): Promise<DpAfastamentoView> {
    this.assertManage(scope);
    const data: DpAfastamentoData = { motivo: input.motivo, inicio: input.inicio, fim: input.fim ?? null, observacao: input.observacao ?? null };
    await this.assertMotivoVigente(data.motivo, data.inicio);
    return this.repo.runTransaction(async (tx) => {
      const v = achado(await this.vinculos.findVinculo(scope.ownerUserId, vinculoId, tx), 'Vínculo');
      await this.assertAfastamentoValido(v, data, null, tx);
      const r = await this.repo.createAfastamento(vinculoId, data, tx);
      await this.auditAfastamento(tx, scope, 'dp.afastamento.created', r);
      return view(r);
    });
  }
  async updateAfastamento(scope: AccountingScope, vinculoId: string, id: string, input: UpdateAfastamentoInput): Promise<DpAfastamentoView> {
    this.assertManage(scope);
    return this.repo.runTransaction(async (tx) => {
      const v = achado(await this.vinculos.findVinculo(scope.ownerUserId, vinculoId, tx), 'Vínculo');
      const atual = achado(await this.repo.findAfastamento(vinculoId, id, tx), 'Afastamento');
      const patch = pick(input, ['motivo', 'inicio', 'fim', 'observacao'] as const);
      const novo: DpAfastamentoData = { motivo: atual.motivo, inicio: atual.inicio, fim: atual.fim, observacao: atual.observacao, ...patch };
      if (novo.fim !== null && novo.fim < novo.inicio) throw new ValidationError('fim < inicio');
      await this.assertMotivoVigente(novo.motivo, novo.inicio);
      await this.assertAfastamentoValido(v, novo, id, tx);
      const r = await this.repo.updateAfastamento(id, patch, tx);
      await this.auditAfastamento(tx, scope, 'dp.afastamento.updated', r);
      return view(r);
    });
  }
  async deleteAfastamento(scope: AccountingScope, vinculoId: string, id: string): Promise<void> {
    this.assertManage(scope);
    await this.repo.runTransaction(async (tx) => {
      achado(await this.vinculos.findVinculo(scope.ownerUserId, vinculoId, tx), 'Vínculo');
      achado(await this.repo.findAfastamento(vinculoId, id, tx), 'Afastamento');
      await this.auditAfastamento(tx, scope, 'dp.afastamento.deleted', await this.repo.deleteAfastamento(id, tx));
    });
  }

  // ── Itens 57–59 — períodos e implantação de férias ─────────────────────────────────────────────────────────────────
  async getFerias(scope: AccountingScope, vinculoId: string, dataRef: string): Promise<DpFeriasView> {
    this.assertRead(scope);
    const v = achado(await this.vinculos.findVinculo(scope.ownerUserId, vinculoId), 'Vínculo');
    const natureza = await this.naturezaEm(v);
    const gozados = new Map((await this.repo.listImplantacoes(vinculoId)).map((i) => [i.aquisitivoInicio, i.diasGozados]));
    return {
      vinculoId,
      natureza,
      dataRef,
      periodos: this.periodos(v, natureza, dataRef).map((p) => ({ ...p, diasGozadosImplantados: gozados.get(p.aquisitivoInicio) ?? null })),
    };
  }
  async listImplantacoes(scope: AccountingScope, vinculoId: string): Promise<DpFeriasImplantacaoView[]> {
    this.assertRead(scope);
    achado(await this.vinculos.findVinculo(scope.ownerUserId, vinculoId), 'Vínculo');
    return (await this.repo.listImplantacoes(vinculoId)).map(view);
  }
  async createImplantacao(scope: AccountingScope, vinculoId: string, input: CreateFeriasImplantacaoInput): Promise<DpFeriasImplantacaoView> {
    this.assertManage(scope);
    return this.repo.runTransaction(async (tx) => {
      const v = achado(await this.vinculos.findVinculo(scope.ownerUserId, vinculoId, tx), 'Vínculo');
      // Item 58: o aquisitivo tem de ser um período do item 57 (natureza EMPREGO, aniversário do contrato, até o término).
      const natureza = await this.naturezaEm(v);
      if (!this.periodos(v, natureza, input.aquisitivoInicio).some((p) => p.aquisitivoInicio === input.aquisitivoInicio)) {
        throw dpValidationError(
          'DP_FERIAS_PERIODO_INEXISTENTE',
          `${input.aquisitivoInicio} não é início de período aquisitivo deste vínculo (aniversário do contrato de ${v.dataInicio}, só na natureza EMPREGO).`,
          { aquisitivoInicio: input.aquisitivoInicio },
        );
      }
      const outra = await this.repo.findImplantacaoPorAquisitivo(vinculoId, input.aquisitivoInicio, tx);
      if (outra) throw new ConflictError(`Já há implantação viva para o aquisitivo de ${input.aquisitivoInicio} (id ${outra.id}).`);
      const r = await this.repo.createImplantacao(
        vinculoId,
        scope.actorUserId,
        { aquisitivoInicio: input.aquisitivoInicio, diasGozados: input.diasGozados, fonte: input.fonte },
        tx,
      );
      await this.auditImplantacao(tx, scope, 'dp.ferias_implantacao.created', r);
      return view(r);
    });
  }
  async updateImplantacao(scope: AccountingScope, vinculoId: string, id: string, input: UpdateFeriasImplantacaoInput): Promise<DpFeriasImplantacaoView> {
    this.assertManage(scope);
    return this.repo.runTransaction(async (tx) => {
      achado(await this.vinculos.findVinculo(scope.ownerUserId, vinculoId, tx), 'Vínculo');
      achado(await this.repo.findImplantacao(vinculoId, id, tx), 'Implantação de férias');
      const r = await this.repo.updateImplantacao(id, pick(input, ['diasGozados', 'fonte'] as const), tx);
      await this.auditImplantacao(tx, scope, 'dp.ferias_implantacao.updated', r);
      return view(r);
    });
  }
  async deleteImplantacao(scope: AccountingScope, vinculoId: string, id: string): Promise<void> {
    this.assertManage(scope);
    await this.repo.runTransaction(async (tx) => {
      achado(await this.vinculos.findVinculo(scope.ownerUserId, vinculoId, tx), 'Vínculo');
      achado(await this.repo.findImplantacao(vinculoId, id, tx), 'Implantação de férias');
      await this.auditImplantacao(tx, scope, 'dp.ferias_implantacao.deleted', await this.repo.deleteImplantacao(id, tx));
    });
  }

  // ── gates ──────────────────────────────────────────────────────────────────────────────────────────────────────────
  /** Item 57 — só a natureza EMPREGO tem período de férias; TSVE (723, 901) ⇒ lista vazia. */
  private periodos(v: DpVinculo, natureza: NaturezaVinculo, dataRef: string): PeriodoFerias[] {
    return natureza === 'EMPREGO' ? periodosDeFerias(v.dataInicio, dataRef, v.dataTermino) : [];
  }

  /** Item 56 — `inicio ≥ dataInicio` do vínculo e sem sobreposição com outro afastamento vivo do mesmo vínculo (na tx). */
  private async assertAfastamentoValido(v: DpVinculo, a: DpAfastamentoData, selfId: string | null, tx: Tx): Promise<void> {
    if (a.inicio < v.dataInicio) {
      throw new ValidationError(`O afastamento começa em ${a.inicio}, antes do início do vínculo (${v.dataInicio}).`);
    }
    const este = { vigenteDesde: a.inicio, vigenteAte: a.fim };
    const outro = (await this.repo.listAfastamentos(v.id, tx)).find(
      (x) => x.id !== selfId && sobrepoe({ vigenteDesde: x.inicio, vigenteAte: x.fim }, este),
    );
    if (outro) {
      throw dpConflictError(
        'DP_AFASTAMENTO_SOBREPOSTO',
        `O afastamento se sobrepõe a outro do mesmo vínculo (id ${outro.id}, de ${outro.inicio} a ${outro.fim ?? 'em aberto'}).`,
      );
    }
  }

  /** Item 56 — o motivo vigente na ESOCIAL_MOTIVO_AFASTAMENTO (Tabela 18) no `inicio`. */
  private async assertMotivoVigente(motivo: string, inicio: string): Promise<void> {
    const linhas = await this.legalParams.fotografia(['ESOCIAL_MOTIVO_AFASTAMENTO']);
    if (!linhaLegalVigente(linhas, 'ESOCIAL_MOTIVO_AFASTAMENTO', motivo, inicio)) {
      throw new ValidationError(`O motivo ${motivo} não está vigente na Tabela 18 do eSocial em ${inicio} (ESOCIAL_MOTIVO_AFASTAMENTO).`);
    }
  }

  /** Natureza do vínculo pelo `evento` da categoria na ESOCIAL_CATEGORIA em `dataInicio` (itens 23 e 39). */
  private async naturezaEm(v: DpVinculo): Promise<NaturezaVinculo> {
    const linha = linhaLegalVigente(await this.legalParams.fotografia(['ESOCIAL_CATEGORIA']), 'ESOCIAL_CATEGORIA', v.categoria, v.dataInicio);
    const natureza = linha?.valorJson ? naturezaDoEvento((JSON.parse(linha.valorJson) as { evento: string | null }).evento) : null;
    if (!natureza) throw new ValidationError(`A categoria ${v.categoria} não está vigente na Tabela 01 do eSocial em ${v.dataInicio} (ESOCIAL_CATEGORIA).`);
    return natureza;
  }

  // ── auditoria (item 61) ────────────────────────────────────────────────────────────────────────────────────────────
  private auditAfastamento(tx: Tx, scope: AccountingScope, eventType: DpAfastamentoFeriasEvent, r: DpAfastamento) {
    return this.audit(tx, scope, eventType, 'dp_afastamento', r.id, { afastamentoId: r.id, vinculoId: r.vinculoId, inicio: r.inicio, fim: r.fim });
  }
  private auditImplantacao(tx: Tx, scope: AccountingScope, eventType: DpAfastamentoFeriasEvent, r: DpFeriasImplantacao) {
    return this.audit(tx, scope, eventType, 'dp_ferias_implantacao', r.id, {
      implantacaoId: r.id,
      vinculoId: r.vinculoId,
      aquisitivoInicio: r.aquisitivoInicio,
      diasGozados: String(r.diasGozados),
    });
  }
  private async audit(tx: Tx, scope: AccountingScope, eventType: DpAfastamentoFeriasEvent, targetType: string, targetId: string, payload: Record<string, string | null>) {
    await this.auditService.append(tx, scope, { actorUserId: scope.actorUserId, eventType, targetType, targetId, payload });
  }

  private assertRead(scope: AccountingScope): void {
    if (!this.policy.canRead(scope)) throw new ForbiddenError('Você não tem permissão para ler o cadastro de pessoal do DP.');
  }

  private assertManage(scope: AccountingScope): void {
    if (!this.policy.canManage(scope)) throw new ForbiddenError('Você não tem permissão para alterar o cadastro de pessoal do DP.');
  }
}

function pick<T extends object, K extends keyof T>(o: T, keys: readonly K[]): Partial<Pick<T, K>> {
  const out: Partial<Pick<T, K>> = {};
  for (const k of keys) if (o[k] !== undefined) out[k] = o[k];
  return out;
}

function achado<T>(row: T | null, oQue: string): T {
  if (!row) throw new NotFoundError(`${oQue} não encontrado(a).`);
  return row;
}

function view<T extends { deletedAt: Date | null; createdAt: Date; updatedAt: Date }>(r: T): Omit<T, 'deletedAt' | 'createdAt' | 'updatedAt'> & { createdAt: string; updatedAt: string } {
  const { deletedAt: _d, createdAt, updatedAt, ...resto } = r;
  return { ...resto, createdAt: createdAt.toISOString(), updatedAt: updatedAt.toISOString() };
}
