import type { LegalParameter } from 'generated/prisma';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../../lib/errors';
import type { AuditService } from '../../accounting/services/AuditService';
import type { AccountingScope } from '../../accounting/scope/AccountingScope';
import type { ILegalParameterRepository } from '../repositories/ILegalParameterRepository';
import type { ILegalParameterPolicy, LegalParameterActor } from '../policies/ILegalParameterPolicy';
import type {
  LegalParameterView,
  ListLegalParametersQuery,
  ProposeLegalParameterInput,
  VigenteLegalParameterQuery,
} from '../dtos/LegalParameterDto';
import { TABELAS_MIGRADAS, linhaLegalVigente, linhasEmVigor, type LegalParameterTabela } from '../models/legalParameter';
import { cachedPublished, invalidateLegalParameterCache, storePublished } from './legalParameterCache';

/**
 * Emenda §9 L-5 — a corrente de auditoria da PLATAFORMA: mesma tabela e mesmo hash encadeado da casa, num escopo fixo
 * que nenhuma empresa tem (`ownerUserId` não é id de usuário). Nenhuma empresa vê estes eventos na própria trilha.
 */
export const PLATFORM_AUDIT_SCOPE: AccountingScope = {
  ownerUserId: 'PLATFORM',
  actorUserId: 'PLATFORM',
  unitId: 'legal-parameters',
  ledgerCode: 'DEFAULT',
  baseCurrencyCode: 'BRL',
  timeZone: 'America/Sao_Paulo',
};

/** Formato do valor por tabela migrada (PR-1). `ARREDONDAMENTO` é a única linha de texto do TAX_ASSESSMENT. */
function exigirFormato(d: ProposeLegalParameterInput): void {
  const texto = d.tabela === 'TAX_ASSESSMENT' && d.chave === 'ARREDONDAMENTO';
  if (texto ? d.valorTexto === undefined : d.valorInt === undefined) {
    throw new ValidationError(`${d.tabela}/${d.chave}: o valor desta tabela é ${texto ? 'valorTexto' : 'valorInt'} (bp ou centavos).`);
  }
  if (d.tabela === 'PIS_COFINS' && (!['PIS', 'COFINS'].includes(d.chave) || !['CUMULATIVO', 'NAO_CUMULATIVO'].includes(d.discriminador ?? ''))) {
    throw new ValidationError('PIS_COFINS: chave PIS|COFINS e discriminador CUMULATIVO|NAO_CUMULATIVO.');
  }
}

const mesmaLinhaLogica = (a: Pick<LegalParameter, 'tabela' | 'chave' | 'discriminador'>, b: Pick<LegalParameter, 'tabela' | 'chave' | 'discriminador'>) =>
  a.tabela === b.tabela && a.chave === b.chave && a.discriminador === b.discriminador;

function toView(r: LegalParameter): LegalParameterView {
  return {
    id: r.id,
    tabela: r.tabela,
    chave: r.chave,
    discriminador: r.discriminador,
    valorInt: r.valorInt,
    valorTexto: r.valorTexto,
    valorJson: r.valorJson === null ? null : (JSON.parse(r.valorJson) as unknown),
    fonte: r.fonte,
    fonteUrl: r.fonteUrl,
    fonteSha256: r.fonteSha256,
    vigenteDesde: r.vigenteDesde,
    vigenteAte: r.vigenteAte,
    status: r.status,
    supersedesId: r.supersedesId,
    motivo: r.motivo,
    proposedById: r.proposedById,
    publishedById: r.publishedById,
    publishedAt: r.publishedAt?.toISOString() ?? null,
    revokedById: r.revokedById,
    revokedAt: r.revokedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
  };
}

/**
 * BE-INCR-LEGAL-PARAMS PR-1 (nó LEGAL-PARAMS; BRIEF §3 itens 3–5, 8, 11–12; emenda §9) — coeficientes de lei como
 * dado de plataforma versionado. Propor ⇒ `DRAFT`; publicar ⇒ passa a valer; revogar ⇒ sai do lookup (só o status
 * muda, L-6). Cada mudança grava um evento na corrente da plataforma, na mesma tx (L-5).
 *
 * `fotografia` (item 5, F-LP-4 a) é a leitura que os cálculos recebem: linhas em vigor das tabelas pedidas, do cache.
 * O cache só é invalidado DEPOIS do commit — uma tx desfeita não deixa leitura nova à vista.
 */
export class LegalParameterService {
  constructor(
    private readonly repo: ILegalParameterRepository,
    private readonly policy: ILegalParameterPolicy,
    private readonly auditService: AuditService,
  ) {}

  private exigirLeitura(actor: LegalParameterActor): void {
    if (!this.policy.canRead(actor)) throw new ForbiddenError('Sem acesso aos parâmetros legais.');
  }

  private exigirGestao(actor: LegalParameterActor): void {
    if (!this.policy.canManage(actor)) throw new ForbiddenError('Só o administrador da plataforma (PLATFORM_ADMIN) altera parâmetros legais.');
  }

  /** Item 5 — linhas em vigor (PUBLISHED, sem as substituídas) das tabelas pedidas. Sem I/O quando o cache está quente. */
  async fotografia(tabelas: readonly LegalParameterTabela[]): Promise<LegalParameter[]> {
    const faltam = tabelas.filter((t) => cachedPublished(t) === undefined);
    if (faltam.length > 0) {
      const lidas = await this.repo.findPublished(faltam);
      for (const t of faltam) storePublished(t, lidas.filter((l) => l.tabela === t));
    }
    return linhasEmVigor(tabelas.flatMap((t) => cachedPublished(t) ?? []));
  }

  async list(actor: LegalParameterActor, q: ListLegalParametersQuery): Promise<LegalParameterView[]> {
    this.exigirLeitura(actor);
    return (await this.repo.findMany(q)).map(toView);
  }

  /** Item 4 — sem linha vigente ⇒ 404 (a prévia de cada cálculo traduz a ausência no próprio 400). */
  async vigente(actor: LegalParameterActor, q: VigenteLegalParameterQuery): Promise<LegalParameterView> {
    this.exigirLeitura(actor);
    const linha = linhaLegalVigente(await this.fotografia([q.tabela]), q.tabela, q.chave, q.data, q.discriminador ?? null);
    if (!linha) throw new NotFoundError(`Sem linha vigente de ${q.tabela}/${q.chave}${q.discriminador ? `/${q.discriminador}` : ''} em ${q.data}.`);
    return toView(linha);
  }

  async propose(actor: LegalParameterActor, d: ProposeLegalParameterInput): Promise<LegalParameterView> {
    this.exigirGestao(actor);
    if (!TABELAS_MIGRADAS.has(d.tabela)) {
      throw new ValidationError(`${d.tabela}: tabela ainda não migrada para o banco — nenhum cálculo a lê (BE-INCR-LEGAL-PARAMS, PR-2/PR-3).`);
    }
    exigirFormato(d);
    const row = await this.repo.runTransaction(async (tx) => {
      if (d.supersedesId) {
        const alvo = await this.repo.findById(d.supersedesId, tx);
        if (!alvo) throw new NotFoundError(`supersedesId ${d.supersedesId} não existe.`);
        if (alvo.status !== 'PUBLISHED') throw new ConflictError(`supersedesId ${d.supersedesId} não está publicada (${alvo.status}).`);
        if (!mesmaLinhaLogica(alvo, { tabela: d.tabela, chave: d.chave, discriminador: d.discriminador ?? null })) {
          throw new ValidationError('supersedesId aponta para outra tabela/chave/discriminador (emenda §9 L-7).');
        }
      }
      const created = await this.repo.create(
        {
          tabela: d.tabela,
          chave: d.chave,
          discriminador: d.discriminador ?? null,
          valorInt: d.valorInt ?? null,
          valorTexto: d.valorTexto ?? null,
          valorJson: d.valorJson === undefined ? null : JSON.stringify(d.valorJson),
          fonte: d.fonte,
          fonteUrl: d.fonteUrl ?? null,
          fonteSha256: d.fonteSha256 ?? null,
          vigenteDesde: d.vigenteDesde,
          vigenteAte: d.vigenteAte ?? null,
          supersedesId: d.supersedesId ?? null,
          motivo: d.motivo,
          proposedById: actor.userId,
        },
        tx,
      );
      await this.auditService.append(tx, PLATFORM_AUDIT_SCOPE, {
        actorUserId: actor.userId,
        eventType: 'legal_parameter.proposed',
        targetType: 'LegalParameter',
        targetId: created.id,
        payload: { legalParameterId: created.id, tabela: created.tabela, chave: created.chave, discriminador: created.discriminador, valorInt: created.valorInt, valorTexto: created.valorTexto, vigenteDesde: created.vigenteDesde, vigenteAte: created.vigenteAte, supersedesId: created.supersedesId },
      });
      return created;
    });
    return toView(row);
  }

  /**
   * DRAFT ⇒ PUBLISHED. Re-checa DENTRO da tx (memória authoritative-gate-inside-tx): a substituída ainda publicada, e
   * nenhuma outra linha em vigor com a mesma tabela/chave/discriminador e o MESMO `vigenteDesde` (empate tornaria o
   * lookup ambíguo — a correção desse caso é por `supersedesId`, L-7).
   */
  async publish(actor: LegalParameterActor, id: string): Promise<LegalParameterView> {
    this.exigirGestao(actor);
    const row = await this.repo.runTransaction(async (tx) => {
      const linha = await this.repo.findById(id, tx);
      if (!linha) throw new NotFoundError(`Parâmetro legal ${id} não existe.`);
      if (linha.status !== 'DRAFT') throw new ConflictError(`Parâmetro legal ${id} não é rascunho (${linha.status}).`);
      if (linha.supersedesId) {
        const alvo = await this.repo.findById(linha.supersedesId, tx);
        if (alvo?.status !== 'PUBLISHED') throw new ConflictError(`A linha substituída ${linha.supersedesId} já não está publicada.`);
      }
      const emVigor = linhasEmVigor(await this.repo.findPublished([linha.tabela], tx));
      const empate = emVigor.find((l) => mesmaLinhaLogica(l, linha) && l.vigenteDesde === linha.vigenteDesde && l.id !== linha.supersedesId);
      if (empate) {
        throw new ConflictError(`Já existe linha publicada ${empate.id} de ${linha.tabela}/${linha.chave} com vigenteDesde ${linha.vigenteDesde}; use supersedesId.`);
      }
      const at = new Date();
      if (!(await this.repo.markPublished(id, actor.userId, at, tx))) throw new ConflictError(`Parâmetro legal ${id} mudou de status durante a publicação.`);
      await this.auditService.append(tx, PLATFORM_AUDIT_SCOPE, {
        actorUserId: actor.userId,
        eventType: 'legal_parameter.published',
        targetType: 'LegalParameter',
        targetId: id,
        payload: { legalParameterId: id, tabela: linha.tabela, chave: linha.chave, discriminador: linha.discriminador, vigenteDesde: linha.vigenteDesde, vigenteAte: linha.vigenteAte, supersedesId: linha.supersedesId },
      });
      return { ...linha, status: 'PUBLISHED', publishedById: actor.userId, publishedAt: at };
    });
    invalidateLegalParameterCache();
    return toView(row);
  }

  /** PUBLISHED ⇒ REVOKED — só o status (L-6). A apuração que já usou a linha continua apontando para ela. */
  async revoke(actor: LegalParameterActor, id: string): Promise<LegalParameterView> {
    this.exigirGestao(actor);
    const row = await this.repo.runTransaction(async (tx) => {
      const linha = await this.repo.findById(id, tx);
      if (!linha) throw new NotFoundError(`Parâmetro legal ${id} não existe.`);
      const at = new Date();
      if (!(await this.repo.markRevoked(id, actor.userId, at, tx))) throw new ConflictError(`Parâmetro legal ${id} não está publicado (${linha.status}).`);
      await this.auditService.append(tx, PLATFORM_AUDIT_SCOPE, {
        actorUserId: actor.userId,
        eventType: 'legal_parameter.revoked',
        targetType: 'LegalParameter',
        targetId: id,
        payload: { legalParameterId: id, tabela: linha.tabela, chave: linha.chave, discriminador: linha.discriminador },
      });
      return { ...linha, status: 'REVOKED', revokedById: actor.userId, revokedAt: at };
    });
    invalidateLegalParameterCache();
    return toView(row);
  }
}
