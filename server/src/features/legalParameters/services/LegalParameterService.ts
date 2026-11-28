import type { LegalParameter } from 'generated/prisma';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../../lib/errors';
import type { AuditService } from '../../accounting/services/AuditService';
import type { AccountingScope } from '../../accounting/scope/AccountingScope';
import type { ILegalParameterRepository } from '../repositories/ILegalParameterRepository';
import type { ILegalParameterRecalcJobRepository } from '../repositories/ILegalParameterRecalcJobRepository';
import type { ILegalParameterPolicy, LegalParameterActor } from '../policies/ILegalParameterPolicy';
import type {
  LegalParameterTableView,
  LegalParameterView,
  ListRecalcJobsQuery,
  RecalcJobView,
  ListLegalParametersQuery,
  ProposeLegalParameterInput,
  VigenteLegalParameterQuery,
} from '../dtos/LegalParameterDto';
import { LinhaLegalIlegivelError, TabelaLegalDesconhecidaError, linhaLegalVigente, linhasEmVigor } from '../models/legalParameter';
import type { CrossTableRows, LegalParameterFormatRegistry, LegalParameterTableInfo, LinhaParaFormato } from '../models/formatRegistry';
import { cachedPublished, storePublished } from './legalParameterCache';

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

/** As linhas lidas das tabelas requeridas, como o registro as pede (BE-INCR-PAIS-NA-BORDA-F3 item 7). */
function linhasDe(rows: readonly LegalParameter[]): CrossTableRows {
  return { rowsOf: (t) => rows.filter((r) => r.tabela === t) };
}

/** A linha gravada como o registro a enxerga (valorJson já parseado; vigência para a checagem entre tabelas). */
function paraFormato(r: LegalParameter): LinhaParaFormato {
  const v = toView(r);
  return {
    tabela: v.tabela,
    chave: v.chave,
    discriminador: v.discriminador ?? undefined,
    valorInt: v.valorInt ?? undefined,
    valorTexto: v.valorTexto ?? undefined,
    valorJson: v.valorJson ?? undefined,
    vigenteDesde: v.vigenteDesde,
    vigenteAte: v.vigenteAte,
  };
}

/** Linha PUBLISHED que a regra de formato de hoje recusaria (`checkLegalParamsFormatoCli`). */
export interface LinhaPublicadaForaDoFormato {
  id: string;
  tabela: string;
  chave: string;
  discriminador: string | null;
  vigenteDesde: string;
  erro: string;
}

const TIPO_VALOR: Record<LegalParameterTableInfo['value'], LegalParameterTableView['tipoValor']> = { int: 'int', text: 'texto', json: 'json', mixed: 'misto' };

const mesmaLinhaLogica = (a: Pick<LegalParameter, 'tabela' | 'chave' | 'discriminador'>, b: Pick<LegalParameter, 'tabela' | 'chave' | 'discriminador'>) =>
  a.tabela === b.tabela && a.chave === b.chave && a.discriminador === b.discriminador;

function parseValorJson(r: LegalParameter): unknown {
  if (r.valorJson === null) return null;
  try {
    return JSON.parse(r.valorJson) as unknown;
  } catch {
    throw new LinhaLegalIlegivelError(r.id, r.tabela, r.chave); // BRD F-69.1
  }
}

function toView(r: LegalParameter): LegalParameterView {
  return {
    id: r.id,
    tabela: r.tabela,
    chave: r.chave,
    discriminador: r.discriminador,
    valorInt: r.valorInt,
    valorTexto: r.valorTexto,
    valorJson: parseValorJson(r),
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
 * O cache só é reaquecido DEPOIS do commit — uma tx desfeita não deixa leitura nova à vista (PR-2, L-8: reaquecer em
 * vez de esvaziar, porque o DTO estático lê o cache de forma síncrona).
 */
export class LegalParameterService {
  /** PR-4 (item 10): chamado DEPOIS do commit de publicar/revogar — acorda o agendador (fire-and-forget). */
  private aoEnfileirar: () => void = () => undefined;

  constructor(
    private readonly repo: ILegalParameterRepository,
    private readonly policy: ILegalParameterPolicy,
    private readonly auditService: AuditService,
    /** BE-INCR-LEGAL-PARAMS PR-4 (item 10; L-3, dono 07/10 "Tabela de jobs"): publicar/revogar enfileira o recálculo. */
    private readonly recalcJobs: ILegalParameterRecalcJobRepository,
    /**
     * BE-INCR-PAIS-NA-BORDA-F3 itens 6–7 — o formato de cada tabela, declarado pela borda de cada domínio e país e composto
     * no `lib/factory.ts` (`LEGAL_PARAMETER_FORMATS`). A plataforma não conhece nenhuma tabela.
     */
    private readonly formats: LegalParameterFormatRegistry,
  ) {}

  /** Linha fora do formato (inclusive a checagem entre tabelas, com as linhas de `deps`) ⇒ 400. */
  private exigirFormato(l: LinhaParaFormato, deps: CrossTableRows): void {
    const erro = this.formats.formatError(l, deps);
    if (erro) throw new ValidationError(erro);
  }

  /** Lacuna 03e4 (F-F3-6 a): a linha que marca o fim da lei não entra (proposta nem publicação) sem `vigenteAte`. */
  private exigirFim(l: Pick<LinhaParaFormato, 'tabela' | 'chave' | 'discriminador' | 'vigenteAte'>): void {
    const erro = this.formats.endRequiredError(l);
    if (erro) throw new ValidationError(erro);
  }

  /** As tabelas que a checagem entre tabelas de `tabela` lê, pelo `tx` quando dado (gate dentro da tx). */
  private async dependencias(tabela: string, tx?: Parameters<ILegalParameterRepository['findPublished']>[1]): Promise<CrossTableRows> {
    const requeridas = this.formats.requiredTables(tabela);
    return linhasDe(requeridas.length === 0 ? [] : await this.repo.findPublished(requeridas, tx));
  }

  /** Item 13 (F-F3-1 a) — tabela fora do registro ⇒ 400 `PARAMETRO_LEGAL_TABELA_DESCONHECIDA` (substitui o `TABELAS_MIGRADAS`). */
  private exigirTabelaRegistrada(tabela: string): void {
    if (!this.formats.has(tabela)) throw new TabelaLegalDesconhecidaError(tabela);
  }

  /** Os nomes de todas as tabelas registradas (o `aquecer` e o CLI percorrem o registro, não um enum). */
  private tabelasRegistradas(): string[] {
    return this.formats.tables().map((t) => t.table);
  }

  /** PR-4 — o factory liga o agendador do recálculo depois de construir os dois (sem ciclo de construção). */
  setAoEnfileirar(fn: () => void): void {
    this.aoEnfileirar = fn;
  }

  private exigirLeitura(actor: LegalParameterActor): void {
    if (!this.policy.canRead(actor)) throw new ForbiddenError('Sem acesso aos parâmetros legais.');
  }

  private exigirGestao(actor: LegalParameterActor): void {
    if (!this.policy.canManage(actor)) throw new ForbiddenError('Só o administrador da plataforma (PLATFORM_ADMIN) altera parâmetros legais.');
  }

  /** Item 5 — linhas em vigor (PUBLISHED, sem as substituídas) das tabelas pedidas. Sem I/O quando o cache está quente. */
  async fotografia(tabelas: readonly string[]): Promise<LegalParameter[]> {
    const faltam = tabelas.filter((t) => cachedPublished(t) === undefined);
    if (faltam.length > 0) {
      const lidas = await this.repo.findPublished(faltam);
      for (const t of faltam) storePublished(t, lidas.filter((l) => l.tabela === t));
    }
    return linhasEmVigor(tabelas.flatMap((t) => cachedPublished(t) ?? []));
  }

  /**
   * Emenda §9 L-8 (dono, 07/10: "DTO lê o cache síncrono") — carrega TODAS as tabelas no cache. Roda no boot (antes
   * do `listen`) e depois de cada publicação/revogação, para que o DTO estático nunca encontre o cache frio.
   */
  async aquecer(): Promise<void> {
    // Lê tudo e só então troca tabela a tabela: o cache nunca fica frio no meio (um DTO concorrente leria o antigo).
    const tabelas = this.tabelasRegistradas();
    const lidas = await this.repo.findPublished(tabelas);
    for (const t of tabelas) storePublished(t, lidas.filter((l) => l.tabela === t));
  }

  /**
   * Lacuna fora do #870: o `publish` confere o formato, mas a linha publicada ANTES de a regra apertar não é revalidada.
   * Só lê — a correção do dado é decisão do dono (`supersedesId`). Uso: `checkLegalParamsFormatoCli`.
   */
  async linhasPublicadasForaDoFormato(): Promise<LinhaPublicadaForaDoFormato[]> {
    const fora: LinhaPublicadaForaDoFormato[] = [];
    const publicadas = await this.repo.findPublished(this.tabelasRegistradas());
    // Item 10: a checagem entre tabelas também roda aqui, contra o conjunto publicado inteiro (a dependência revogada acusa).
    const deps = linhasDe(publicadas);
    for (const r of publicadas) {
      const erro = this.formats.formatError(paraFormato(r), deps);
      if (erro) fora.push({ id: r.id, tabela: r.tabela, chave: r.chave, discriminador: r.discriminador, vigenteDesde: r.vigenteDesde, erro });
    }
    return fora;
  }

  /**
   * RECALC-STATUS (itens 1–4; dono 08/10: "Qualquer autenticado", "Jobs com a linha legal junto") — a fila de recálculo
   * do PR-4, paginada, mais recentes primeiro, com a linha legal que disparou cada job (lida em lote).
   */
  async listRecalcJobs(actor: LegalParameterActor, q: ListRecalcJobsQuery): Promise<{ items: RecalcJobView[]; total: number; page: number; pageSize: number }> {
    this.exigirLeitura(actor);
    const filtro = { status: q.status, legalParameterId: q.legalParameterId };
    const [jobs, total] = await Promise.all([this.recalcJobs.findMany(filtro, (q.page - 1) * q.pageSize, q.pageSize), this.recalcJobs.count(filtro)]);
    const linhas = new Map((await this.repo.findByIds([...new Set(jobs.map((j) => j.legalParameterId))])).map((l) => [l.id, l]));
    const items = jobs.map((j): RecalcJobView => {
      const l = linhas.get(j.legalParameterId);
      return {
        id: j.id,
        evento: j.evento,
        status: j.status,
        tentativas: j.tentativas,
        ultimoErro: j.ultimoErro,
        resumo: (j.resumo as RecalcJobView['resumo']) ?? null,
        createdAt: j.createdAt.toISOString(),
        processedAt: j.processedAt?.toISOString() ?? null,
        legalParameterId: j.legalParameterId,
        linha: l ? { tabela: l.tabela, chave: l.chave, discriminador: l.discriminador, vigenteDesde: l.vigenteDesde, vigenteAte: l.vigenteAte, status: l.status } : null,
      };
    });
    return { items, total, page: q.page, pageSize: q.pageSize };
  }

  /** GET /tabelas (item 13, F-F3-1 a) — o catálogo do registro, sem repositório; a mesma policy do `list`. */
  tabelas(actor: LegalParameterActor): LegalParameterTableView[] {
    this.exigirLeitura(actor);
    return this.formats.tables().map((t) => ({ tabela: t.table, dominio: t.domain, pais: t.country, tipoValor: TIPO_VALOR[t.value] }));
  }

  async list(actor: LegalParameterActor, q: ListLegalParametersQuery): Promise<LegalParameterView[]> {
    this.exigirLeitura(actor);
    if (q.tabela !== undefined) this.exigirTabelaRegistrada(q.tabela);
    return (await this.repo.findMany(q)).map(toView);
  }

  /** Item 4 — sem linha vigente ⇒ 404 (a prévia de cada cálculo traduz a ausência no próprio 400). */
  async vigente(actor: LegalParameterActor, q: VigenteLegalParameterQuery): Promise<LegalParameterView> {
    this.exigirLeitura(actor);
    this.exigirTabelaRegistrada(q.tabela); // antes da fotografia: nome fora do registro não entra no cache
    const linha = linhaLegalVigente(await this.fotografia([q.tabela]), q.tabela, q.chave, q.data, q.discriminador ?? null);
    if (!linha) throw new NotFoundError(`Sem linha vigente de ${q.tabela}/${q.chave}${q.discriminador ? `/${q.discriminador}` : ''} em ${q.data}.`);
    return toView(linha);
  }

  async propose(actor: LegalParameterActor, d: ProposeLegalParameterInput): Promise<LegalParameterView> {
    this.exigirGestao(actor);
    this.exigirTabelaRegistrada(d.tabela);
    // Item 7: fora da tx, como antes; as dependências pelo repositório (o publish re-checa dentro da tx).
    this.exigirFormato({ ...d, vigenteAte: d.vigenteAte ?? null }, await this.dependencias(d.tabela));
    this.exigirFim({ tabela: d.tabela, chave: d.chave, discriminador: d.discriminador ?? null, vigenteAte: d.vigenteAte ?? null });
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
      // Dono 23/10 ("(a) 400 no publish"): a regra de formato do propose vale também aqui — o rascunho sem valor da migração
      // (ex.: CBS 2027) não entra em vigor.
      // Item 7 (F3): a checagem entre tabelas lê as dependências pelo MESMO tx (gate autoritativo dentro da tx).
      const l = paraFormato(linha);
      this.exigirFormato(l, await this.dependencias(linha.tabela, tx));
      this.exigirFim(l);
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
      // PR-4 (item 10, L-3): o recálculo das apurações afetadas entra na fila na MESMA tx — nunca roda na requisição.
      await this.recalcJobs.create(id, 'PUBLISHED', tx);
      return { ...linha, status: 'PUBLISHED', publishedById: actor.userId, publishedAt: at };
    });
    await this.aquecer();
    this.aoEnfileirar();
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
      // PR-4 (dono 07/10 "revogar também dispara"): revogar muda o resultado como publicar.
      await this.recalcJobs.create(id, 'REVOKED', tx);
      return { ...linha, status: 'REVOKED', revokedById: actor.userId, revokedAt: at };
    });
    await this.aquecer();
    this.aoEnfileirar();
    return toView(row);
  }
}
