import type { DpLancamento, DpOutraRemuneracao, Prisma } from 'generated/prisma';
import type { Keyring } from '../../../lib/secretBox';
import { ConflictError, ForbiddenError, NotFoundError } from '../../../lib/errors';
import type { AccountingScope } from '../../accounting/scope/AccountingScope';
import type { AuditService } from '../../accounting/services/AuditService';
import type {
  CreateLancamentoInput,
  CreateOutraRemuneracaoInput,
  UpdateLancamentoInput,
  UpdateOutraRemuneracaoInput,
} from '../dtos/DpLancamentoDto';
import type { Competencia } from '../models/competencia';
import { assertLancamentoValido } from '../models/lancamento';
import { hashCampos } from '../models/vinculo';
import type { IDpPolicy } from '../policies/IDpPolicy';
import type { DpLancamentoData, DpOutraRemuneracaoData, IDpLancamentoRepository } from '../repositories/IDpLancamentoRepository';
import type { IDpVinculoRepository } from '../repositories/IDpVinculoRepository';

type Tx = Prisma.TransactionClient;

/**
 * Eventos dos itens 21 e 77. F-DPF-9 → (b) (dono, 06/11: "Só o hash"): ids, competência e rubrica/origem; os valores
 * (minutos, centavos, CNPJ da outra empresa) vão só como HMAC com o chaveiro do DP, com a versão da chave.
 */
export const DP_LANCAMENTO_EVENTS = [
  'dp.lancamento.created', 'dp.lancamento.updated', 'dp.lancamento.deleted',
  'dp.outra_remuneracao.created', 'dp.outra_remuneracao.updated', 'dp.outra_remuneracao.deleted',
] as const;
type DpLancamentoEvent = (typeof DP_LANCAMENTO_EVENTS)[number];

const VALORES_LANCAMENTO = ['quantidadeMin', 'valorCents'] as const;
const VALORES_OUTRA = ['remuneracaoCents', 'contribuicaoCents', 'ordem', 'categoriaOutraFonte', 'cnpjOutroEmpregador'] as const;

/** Dinheiro sai como string (BigInt não serializa em JSON). */
export type DpLancamentoView = Omit<DpLancamento, 'valorCents' | 'deletedAt' | 'createdAt' | 'updatedAt'> & {
  valorCents: string | null;
  createdAt: string;
  updatedAt: string;
};
export type DpOutraRemuneracaoView = Omit<DpOutraRemuneracao, 'remuneracaoCents' | 'contribuicaoCents' | 'deletedAt' | 'createdAt' | 'updatedAt'> & {
  remuneracaoCents: string;
  contribuicaoCents: string;
  createdAt: string;
  updatedAt: string;
};

/**
 * BE-INCR-DP-F2 itens 16–17, 20–21 e 77 (PR-1) — lançamentos informados e remuneração em outra empresa do vínculo.
 * Policy primeiro; a posse vem do vínculo do dono (Tier-0 ⇒ 404). A validação do lançamento (item 17) roda na tx sobre o
 * vínculo lido nela; a unicidade viva da outra remuneração por (vínculo, competência) é gate DENTRO da tx (memória
 * authoritative-gate-inside-tx). Todo write audita com HMAC e recusa com 503 sem o chaveiro, antes de gravar.
 * Lançamento numa competência com folha calculada não muda execução nenhuma (item 16); marcar a folha desatualizada é do
 * PR-5 (item 52), que cria a `DpFolha`.
 */
export class DpLancamentoService {
  constructor(
    private readonly repo: IDpLancamentoRepository,
    private readonly vinculos: Pick<IDpVinculoRepository, 'findVinculo'>,
    private readonly policy: IDpPolicy,
    private readonly auditService: AuditService,
    private readonly auditKeyring: () => Keyring,
  ) {}

  // ── Itens 16–17 — lançamento ───────────────────────────────────────────────────────────────────────────────────────
  async listLancamentos(scope: AccountingScope, vinculoId: string, competencia: Competencia | null): Promise<DpLancamentoView[]> {
    this.assertRead(scope);
    achado(await this.vinculos.findVinculo(scope.ownerUserId, vinculoId), 'Vínculo');
    return (await this.repo.listLancamentos(vinculoId, competencia)).map(viewLancamento);
  }
  async createLancamento(scope: AccountingScope, vinculoId: string, input: CreateLancamentoInput): Promise<DpLancamentoView> {
    this.assertManage(scope);
    const chave = this.chaveAuditoria();
    const data: DpLancamentoData = {
      competencia: input.competencia,
      rubrica: input.rubrica,
      quantidadeMin: input.quantidadeMin ?? null,
      valorCents: input.valorCents ?? null,
      origem: 'MANUAL',
      moduloKey: null,
      observacao: input.observacao ?? null,
    };
    return this.repo.runTransaction(async (tx) => {
      const v = achado(await this.vinculos.findVinculo(scope.ownerUserId, vinculoId, tx), 'Vínculo');
      assertLancamentoValido({ ...data, competencia: input.competencia }, v);
      const r = await this.repo.createLancamento(vinculoId, scope.actorUserId, data, tx);
      await this.auditLancamento(tx, scope, 'dp.lancamento.created', r, chave);
      return viewLancamento(r);
    });
  }
  async updateLancamento(scope: AccountingScope, vinculoId: string, id: string, input: UpdateLancamentoInput): Promise<DpLancamentoView> {
    this.assertManage(scope);
    const chave = this.chaveAuditoria();
    return this.repo.runTransaction(async (tx) => {
      const v = achado(await this.vinculos.findVinculo(scope.ownerUserId, vinculoId, tx), 'Vínculo');
      const atual = achado(await this.repo.findLancamento(vinculoId, id, tx), 'Lançamento');
      const patch = pick(input, ['competencia', 'rubrica', 'quantidadeMin', 'valorCents', 'observacao'] as const);
      const novo = { competencia: atual.competencia as Competencia, rubrica: atual.rubrica, quantidadeMin: atual.quantidadeMin, valorCents: atual.valorCents, ...patch };
      assertLancamentoValido(novo, v);
      const r = await this.repo.updateLancamento(id, patch, tx);
      await this.auditLancamento(tx, scope, 'dp.lancamento.updated', r, chave);
      return viewLancamento(r);
    });
  }
  async deleteLancamento(scope: AccountingScope, vinculoId: string, id: string): Promise<void> {
    this.assertManage(scope);
    const chave = this.chaveAuditoria();
    await this.repo.runTransaction(async (tx) => {
      achado(await this.vinculos.findVinculo(scope.ownerUserId, vinculoId, tx), 'Vínculo');
      achado(await this.repo.findLancamento(vinculoId, id, tx), 'Lançamento');
      await this.auditLancamento(tx, scope, 'dp.lancamento.deleted', await this.repo.deleteLancamento(id, tx), chave);
    });
  }

  // ── Item 77 — remuneração em outra empresa ─────────────────────────────────────────────────────────────────────────
  async listOutrasRemuneracoes(scope: AccountingScope, vinculoId: string): Promise<DpOutraRemuneracaoView[]> {
    this.assertRead(scope);
    achado(await this.vinculos.findVinculo(scope.ownerUserId, vinculoId), 'Vínculo');
    return (await this.repo.listOutrasRemuneracoes(vinculoId)).map(viewOutra);
  }
  async createOutraRemuneracao(scope: AccountingScope, vinculoId: string, input: CreateOutraRemuneracaoInput): Promise<DpOutraRemuneracaoView> {
    this.assertManage(scope);
    const chave = this.chaveAuditoria();
    const data: DpOutraRemuneracaoData = {
      competencia: input.competencia,
      remuneracaoCents: input.remuneracaoCents,
      contribuicaoCents: input.contribuicaoCents,
      ordem: input.ordem,
      categoriaOutraFonte: input.categoriaOutraFonte,
      cnpjOutroEmpregador: input.cnpjOutroEmpregador,
      documento: input.documento,
    };
    return this.repo.runTransaction(async (tx) => {
      achado(await this.vinculos.findVinculo(scope.ownerUserId, vinculoId, tx), 'Vínculo');
      await this.assertCompetenciaLivre(vinculoId, data.competencia, null, tx);
      const r = await this.repo.createOutraRemuneracao(vinculoId, scope.actorUserId, data, tx);
      await this.auditOutra(tx, scope, 'dp.outra_remuneracao.created', r, chave);
      return viewOutra(r);
    });
  }
  async updateOutraRemuneracao(scope: AccountingScope, vinculoId: string, id: string, input: UpdateOutraRemuneracaoInput): Promise<DpOutraRemuneracaoView> {
    this.assertManage(scope);
    const chave = this.chaveAuditoria();
    return this.repo.runTransaction(async (tx) => {
      achado(await this.vinculos.findVinculo(scope.ownerUserId, vinculoId, tx), 'Vínculo');
      achado(await this.repo.findOutraRemuneracao(vinculoId, id, tx), 'Remuneração em outra empresa');
      const patch = pick(input, ['competencia', 'remuneracaoCents', 'contribuicaoCents', 'ordem', 'categoriaOutraFonte', 'cnpjOutroEmpregador', 'documento'] as const);
      if (patch.competencia !== undefined) await this.assertCompetenciaLivre(vinculoId, patch.competencia, id, tx);
      const r = await this.repo.updateOutraRemuneracao(id, patch, tx);
      await this.auditOutra(tx, scope, 'dp.outra_remuneracao.updated', r, chave);
      return viewOutra(r);
    });
  }
  async deleteOutraRemuneracao(scope: AccountingScope, vinculoId: string, id: string): Promise<void> {
    this.assertManage(scope);
    const chave = this.chaveAuditoria();
    await this.repo.runTransaction(async (tx) => {
      achado(await this.vinculos.findVinculo(scope.ownerUserId, vinculoId, tx), 'Vínculo');
      achado(await this.repo.findOutraRemuneracao(vinculoId, id, tx), 'Remuneração em outra empresa');
      await this.auditOutra(tx, scope, 'dp.outra_remuneracao.deleted', await this.repo.deleteOutraRemuneracao(id, tx), chave);
    });
  }

  /** Item 77 — viva única por (vínculo, competência), na tx. 409 sem `reason` (o §3.6 não tem código para isso). */
  private async assertCompetenciaLivre(vinculoId: string, competencia: string, selfId: string | null, tx: Tx): Promise<void> {
    const outra = await this.repo.findOutraRemuneracaoPorCompetencia(vinculoId, competencia, tx);
    if (outra && outra.id !== selfId) {
      throw new ConflictError(`Já há remuneração em outra empresa viva para ${competencia} neste vínculo (id ${outra.id}).`);
    }
  }

  // ── auditoria (itens 21 e 77) ──────────────────────────────────────────────────────────────────────────────────────
  private auditLancamento(tx: Tx, scope: AccountingScope, eventType: DpLancamentoEvent, r: DpLancamento, chave: Chave) {
    return this.audit(tx, scope, eventType, 'dp_lancamento', r.id, {
      lancamentoId: r.id,
      vinculoId: r.vinculoId,
      competencia: r.competencia,
      rubrica: r.rubrica,
      origem: r.origem,
      valoresSha256: hashCampos(r, VALORES_LANCAMENTO, chave.key),
      chaveVersao: String(chave.version),
    });
  }
  private auditOutra(tx: Tx, scope: AccountingScope, eventType: DpLancamentoEvent, r: DpOutraRemuneracao, chave: Chave) {
    return this.audit(tx, scope, eventType, 'dp_outra_remuneracao', r.id, {
      outraRemuneracaoId: r.id,
      vinculoId: r.vinculoId,
      competencia: r.competencia,
      valoresSha256: hashCampos(r, VALORES_OUTRA, chave.key),
      chaveVersao: String(chave.version),
    });
  }
  private async audit(tx: Tx, scope: AccountingScope, eventType: DpLancamentoEvent, targetType: string, targetId: string, payload: Record<string, string | null>) {
    await this.auditService.append(tx, scope, { actorUserId: scope.actorUserId, eventType, targetType, targetId, payload });
  }

  /** Chave ativa do chaveiro da auditoria do DP; lança 503 `dp_audit_key_missing` sem as variáveis. */
  private chaveAuditoria(): Chave {
    const k = this.auditKeyring();
    return { key: k.keys.get(k.activeVersion)!, version: k.activeVersion };
  }

  private assertRead(scope: AccountingScope): void {
    if (!this.policy.canRead(scope)) throw new ForbiddenError('Você não tem permissão para ler o cadastro de pessoal do DP.');
  }

  private assertManage(scope: AccountingScope): void {
    if (!this.policy.canManage(scope)) throw new ForbiddenError('Você não tem permissão para alterar o cadastro de pessoal do DP.');
  }
}

type Chave = { key: Buffer; version: number };

function viewLancamento(r: DpLancamento): DpLancamentoView {
  const { valorCents, deletedAt: _d, createdAt, updatedAt, ...resto } = r;
  return { ...resto, valorCents: valorCents === null ? null : valorCents.toString(), createdAt: createdAt.toISOString(), updatedAt: updatedAt.toISOString() };
}

function viewOutra(r: DpOutraRemuneracao): DpOutraRemuneracaoView {
  const { remuneracaoCents, contribuicaoCents, deletedAt: _d, createdAt, updatedAt, ...resto } = r;
  return {
    ...resto,
    remuneracaoCents: remuneracaoCents.toString(),
    contribuicaoCents: contribuicaoCents.toString(),
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  };
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
