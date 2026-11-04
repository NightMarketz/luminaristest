import type { DpTrabalhador, DpVinculo, DpVinculoVersao, Prisma } from 'generated/prisma';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../lib/errors';
import type { ICompanyFiscalProfileRepository } from '../../accounting/repositories/ICompanyFiscalProfileRepository';
import type { IPartnerRepository } from '../../accounting/repositories/IPartnerRepository';
import type { AccountingScope } from '../../accounting/scope/AccountingScope';
import type { AuditService } from '../../accounting/services/AuditService';
import { linhaLegalVigente } from '../../legalParameters/models/legalParameter';
import type { LegalParameterService } from '../../legalParameters/services/LegalParameterService';
import type {
  CorrigirVersaoInput,
  CreateTrabalhadorInput,
  CreateVersaoInput,
  CreateVinculoInput,
  UpdateTrabalhadorInput,
} from '../dtos/DpVinculoDto';
import { vigenciaContida } from '../models/cadastros';
import { dpConflictError, dpValidationError } from '../models/erros';
import { sobrepoe } from '../models/vigencia';
import {
  assertIdadeEPrazo,
  camposAlterados,
  CATEGORIAS_NUCLEO,
  hashCampos,
  naturezaDoEvento,
  vespera,
  vinculoNaData,
  type CategoriaNucleo,
  type NaturezaVinculo,
} from '../models/vinculo';
import type { IDpPolicy } from '../policies/IDpPolicy';
import type { EmployeeRowLookup } from '../ports/EmployeeRowLookup';
import type { IDpCadastroRepository } from '../repositories/IDpCadastroRepository';
import type { DpVersaoData, DpVinculoCompleto, IDpVinculoRepository } from '../repositories/IDpVinculoRepository';

type Tx = Prisma.TransactionClient;

/** Eventos de auditoria do PR-4 (§3.7). Payload só com ids, códigos, datas, flags e hashes; nunca CPF, nome, nascimento nem salário. */
export const DP_VINCULO_EVENTS = [
  'dp.trabalhador.created', 'dp.trabalhador.updated', 'dp.trabalhador.deleted', 'dp.trabalhador.corrected',
  'dp.vinculo.created', 'dp.vinculo.deleted',
  'dp.vinculo_versao.created', 'dp.vinculo_versao.corrected',
] as const;
type DpVinculoEvent = (typeof DP_VINCULO_EVENTS)[number];

/** Campos do trabalhador cuja correção vira `dp.trabalhador.corrected` (item 45). */
const CAMPOS_TRABALHADOR = ['cpf', 'nome', 'nascimento', 'pcd', 'employeeRef', 'partnerId'] as const;
const CAMPOS_VERSAO = ['lotacaoId', 'cargoId', 'jornadaId', 'sindicatoId', 'salarioCents', 'unidadeSalario'] as const;

export type DpTrabalhadorView = Omit<DpTrabalhador, 'userId' | 'deletedAt' | 'createdById' | 'createdAt' | 'updatedAt'> & {
  createdAt: string;
  updatedAt: string;
  /** Item 38 (D-6): a linha de `employees` apontada pelo `employeeRef` foi apagada. */
  pessoaOperacionalRemovida: boolean;
};
export type DpVinculoView = Omit<DpVinculo, 'userId' | 'deletedAt' | 'createdAt' | 'updatedAt'> & { createdAt: string; updatedAt: string };
/** `salarioCents` sai como string (BigInt não serializa em JSON). */
export type DpVersaoView = Omit<DpVinculoVersao, 'salarioCents' | 'createdAt' | 'updatedAt'> & {
  salarioCents: string;
  createdAt: string;
  updatedAt: string;
};
export type DpVinculoDetalheView = DpVinculoView & { versoes: DpVersaoView[] };

/** O que este serviço lê de fora do DP (reuso, D-9 e F5): o sócio, o regime do ano e a fotografia legal. */
export interface DpVinculoDeps {
  partners: Pick<IPartnerRepository, 'findById'>;
  fiscalProfiles: Pick<ICompanyFiscalProfileRepository, 'findByYear'>;
  legalParams: Pick<LegalParameterService, 'fotografia'>;
  employees: EmployeeRowLookup;
}

/**
 * BE-INCR-DP-F0-F1 itens 37–49 (PR-4) — trabalhador, vínculo e versões do vínculo, por instância (R8: `ownerUserId`).
 * Policy primeiro; unicidade de registro vivo (CPF, matrícula), a cobertura contínua das versões e as referências aos
 * cadastros são gates DENTRO da tx, sobre o `tx` propagado aos repositórios (F19; memória authoritative-gate-inside-tx),
 * e a auditoria grava na mesma tx. O vínculo nasce com a 1ª versão na mesma tx; a versão nova fecha a anterior na
 * véspera, na mesma tx. Correção é no lugar, auditada sem valores (F-DP-8 → b; F-DPB-3).
 */
export class DpVinculoService {
  constructor(
    private readonly repo: IDpVinculoRepository,
    private readonly cadastros: IDpCadastroRepository,
    private readonly policy: IDpPolicy,
    private readonly auditService: AuditService,
    private readonly deps: DpVinculoDeps,
  ) {}

  // ── Itens 37–38 — trabalhador ──────────────────────────────────────────────────────────────────────────────────────
  async listTrabalhadores(scope: AccountingScope, limit: number): Promise<DpTrabalhadorView[]> {
    this.assertRead(scope);
    const rows = await this.repo.listTrabalhadores(scope.ownerUserId, limit);
    return Promise.all(rows.map((r) => this.viewTrabalhador(scope, r)));
  }
  async getTrabalhador(scope: AccountingScope, id: string): Promise<DpTrabalhadorView> {
    this.assertRead(scope);
    return this.viewTrabalhador(scope, achado(await this.repo.findTrabalhador(scope.ownerUserId, id), 'Trabalhador'));
  }
  async createTrabalhador(scope: AccountingScope, input: CreateTrabalhadorInput): Promise<DpTrabalhadorView> {
    this.assertManage(scope);
    const row = await this.repo.runTransaction(async (tx) => {
      await this.assertCpfLivre(scope, input.cpf, null, tx);
      if (input.employeeRef !== undefined) await this.assertEmployeeRef(scope, input.employeeRef);
      if (input.partnerId !== undefined) achado(await this.deps.partners.findById(scope, input.partnerId, tx), 'Sócio');
      const r = await this.repo.createTrabalhador(
        scope.ownerUserId,
        scope.actorUserId,
        {
          cpf: input.cpf,
          nome: input.nome,
          nascimento: input.nascimento,
          pcd: input.pcd,
          employeeRef: input.employeeRef ?? null,
          partnerId: input.partnerId ?? null,
        },
        tx,
      );
      await this.auditTrabalhador(tx, scope, 'dp.trabalhador.created', r);
      return r;
    });
    return this.viewTrabalhador(scope, row);
  }
  async updateTrabalhador(scope: AccountingScope, id: string, input: UpdateTrabalhadorInput): Promise<DpTrabalhadorView> {
    this.assertManage(scope);
    const row = await this.repo.runTransaction(async (tx) => {
      const atual = achado(await this.repo.findTrabalhador(scope.ownerUserId, id, tx), 'Trabalhador');
      if (input.cpf !== undefined) await this.assertCpfLivre(scope, input.cpf, id, tx);
      if (input.employeeRef) await this.assertEmployeeRef(scope, input.employeeRef);
      if (input.partnerId) achado(await this.deps.partners.findById(scope, input.partnerId, tx), 'Sócio');
      const patch = pick(input, CAMPOS_TRABALHADOR);
      const campos = camposAlterados(atual, patch);
      const r = await this.repo.updateTrabalhador(id, patch, tx);
      await this.auditTrabalhador(tx, scope, 'dp.trabalhador.updated', r);
      // Item 45: a correção do dado registrado leva os campos e o hash antes/depois, sem os valores (F-DPB-3).
      if (campos.length) {
        await this.audit(tx, scope, 'dp.trabalhador.corrected', 'dp_trabalhador', id, {
          trabalhadorId: id,
          campos: campos.join(','),
          antesSha256: hashCampos(atual, campos),
          depoisSha256: hashCampos(r, campos),
        });
      }
      return r;
    });
    return this.viewTrabalhador(scope, row);
  }
  async deleteTrabalhador(scope: AccountingScope, id: string): Promise<void> {
    this.assertManage(scope);
    await this.repo.runTransaction(async (tx) => {
      achado(await this.repo.findTrabalhador(scope.ownerUserId, id, tx), 'Trabalhador');
      // Item 48: trabalhador com vínculo vivo não se apaga.
      if ((await this.repo.countVinculosVivos(id, tx)) > 0) {
        throw dpConflictError('DP_TRABALHADOR_COM_VINCULO', 'O trabalhador tem vínculo vivo; apague o vínculo antes.');
      }
      await this.auditTrabalhador(tx, scope, 'dp.trabalhador.deleted', await this.repo.deleteTrabalhador(id, tx));
    });
  }

  // ── Itens 39–44 — vínculo + 1ª versão ──────────────────────────────────────────────────────────────────────────────
  async listVinculos(scope: AccountingScope, limit: number): Promise<DpVinculoView[]> {
    this.assertRead(scope);
    return (await this.repo.listVinculos(scope.ownerUserId, limit)).map(view);
  }
  async getVinculo(scope: AccountingScope, id: string): Promise<DpVinculoDetalheView> {
    this.assertRead(scope);
    const v = achado(await this.repo.findVinculo(scope.ownerUserId, id), 'Vínculo');
    return { ...view(v), versoes: (await this.repo.listVersoes(id)).map(viewVersao) };
  }
  async createVinculo(scope: AccountingScope, input: CreateVinculoInput): Promise<DpVinculoDetalheView> {
    this.assertManage(scope);
    const categoria = assertCategoriaNucleo(input.categoria);
    const natureza = await this.naturezaEm(categoria, input.dataInicio);
    const dataTermino = input.dataTermino ?? null;
    return this.repo.runTransaction(async (tx) => {
      const trab = achado(await this.repo.findTrabalhador(scope.ownerUserId, input.trabalhadorId, tx), 'Trabalhador');
      assertIdadeEPrazo({ categoria, nascimento: trab.nascimento, pcd: trab.pcd, dataInicio: input.dataInicio, dataTermino });
      if (categoria === '723') await this.assertProLabore(scope, trab, input.dataInicio, dataTermino, tx);
      await this.assertMatriculaLivre(scope, input.matricula, tx);
      const versao = await this.versaoValida(scope, natureza, input.versao, tx);
      const v = await this.repo.createVinculo(
        scope.ownerUserId,
        // Estabelecimento = a unidade do escopo, já resolvida como do dono pelo AccountingScopeResolver (R8).
        { trabalhadorId: trab.id, unitId: scope.unitId, matricula: input.matricula, categoria, dataInicio: input.dataInicio, dataTermino },
        tx,
      );
      // Item 43: a 1ª versão começa em dataInicio e nasce na mesma tx do vínculo.
      const ver = await this.repo.createVersao(v.id, { ...versao, vigenteDesde: input.dataInicio, vigenteAte: null }, tx);
      await this.auditVinculo(tx, scope, 'dp.vinculo.created', v);
      await this.auditVersaoCriada(tx, scope, ver);
      return { ...view(v), versoes: [viewVersao(ver)] };
    });
  }
  async deleteVinculo(scope: AccountingScope, id: string): Promise<void> {
    this.assertManage(scope);
    await this.repo.runTransaction(async (tx) => {
      achado(await this.repo.findVinculo(scope.ownerUserId, id, tx), 'Vínculo');
      // Item 48: soft-delete livre no F1 (o bloqueio por folha calculada é do F2; o S-3000 é do F4).
      await this.auditVinculo(tx, scope, 'dp.vinculo.deleted', await this.repo.deleteVinculo(id, tx));
    });
  }

  // ── Itens 43 e 45 — versões ────────────────────────────────────────────────────────────────────────────────────────
  async createVersao(scope: AccountingScope, vinculoId: string, input: CreateVersaoInput): Promise<DpVersaoView> {
    this.assertManage(scope);
    return this.repo.runTransaction(async (tx) => {
      const v = achado(await this.repo.findVinculo(scope.ownerUserId, vinculoId, tx), 'Vínculo');
      if (input.vigenteDesde < v.dataInicio) {
        throw dpValidationError('DP_VERSAO_ANTES_DO_INICIO', `A versão começa em ${input.vigenteDesde}, antes do início do vínculo (${v.dataInicio}).`);
      }
      const natureza = await this.naturezaEm(assertCategoriaNucleo(v.categoria), v.dataInicio);
      const versao = await this.versaoValida(scope, natureza, input, tx);
      const nova = { vigenteDesde: input.vigenteDesde, vigenteAte: null };
      const cobertas = (await this.repo.listVersoes(vinculoId, tx)).filter((x) => sobrepoe(x, nova));
      const posterior = cobertas.find((x) => x.vigenteDesde >= input.vigenteDesde);
      if (posterior) {
        throw dpConflictError(
          'DP_VERSAO_SOBREPOSTA',
          `Já há versão do vínculo desde ${posterior.vigenteDesde} (id ${posterior.id}); a versão nova precisa começar depois dela.`,
        );
      }
      // Cobertura contínua: a versão nova fecha a anterior na véspera, na mesma tx.
      for (const anterior of cobertas) await this.repo.updateVersao(anterior.id, { vigenteAte: vespera(input.vigenteDesde) }, tx);
      const ver = await this.repo.createVersao(vinculoId, { ...versao, ...nova }, tx);
      await this.auditVersaoCriada(tx, scope, ver);
      return viewVersao(ver);
    });
  }
  async corrigirVersao(scope: AccountingScope, vinculoId: string, versaoId: string, input: CorrigirVersaoInput): Promise<DpVersaoView> {
    this.assertManage(scope);
    return this.repo.runTransaction(async (tx) => {
      const v = achado(await this.repo.findVinculo(scope.ownerUserId, vinculoId, tx), 'Vínculo');
      const atual = achado(await this.repo.findVersao(vinculoId, versaoId, tx), 'Versão do vínculo');
      const patch = pick(input, CAMPOS_VERSAO);
      const natureza = await this.naturezaEm(assertCategoriaNucleo(v.categoria), v.dataInicio);
      await this.versaoValida(
        scope,
        natureza,
        {
          lotacaoId: patch.lotacaoId ?? atual.lotacaoId,
          cargoId: (patch.cargoId !== undefined ? patch.cargoId : atual.cargoId) ?? undefined,
          jornadaId: (patch.jornadaId !== undefined ? patch.jornadaId : atual.jornadaId) ?? undefined,
          sindicatoId: (patch.sindicatoId !== undefined ? patch.sindicatoId : atual.sindicatoId) ?? undefined,
          salarioCents: patch.salarioCents ?? atual.salarioCents,
          unidadeSalario: patch.unidadeSalario ?? atual.unidadeSalario,
        },
        tx,
      );
      const campos = camposAlterados(atual, patch);
      const r = await this.repo.updateVersao(versaoId, patch, tx);
      if (campos.length) {
        // Item 45 (F-DPB-3): campos + SHA-256 antes/depois, sem os valores (o salário nunca entra).
        await this.audit(tx, scope, 'dp.vinculo_versao.corrected', 'dp_vinculo_versao', versaoId, {
          vinculoId,
          versaoId,
          campos: campos.join(','),
          antesSha256: hashCampos(atual, campos),
          depoisSha256: hashCampos(r, campos),
        });
      }
      return viewVersao(r);
    });
  }

  // ── Item 47 — vínculo na data ──────────────────────────────────────────────────────────────────────────────────────
  /** Identidade + versão vigente + cadastros resolvidos em `data` (entrada do snapshot do F2). `null` se nada cobre a data. */
  async vinculoNaData(scope: AccountingScope, vinculoId: string, data: string) {
    this.assertRead(scope);
    const completo: DpVinculoCompleto = achado(await this.repo.findVinculoCompleto(scope.ownerUserId, vinculoId), 'Vínculo');
    return vinculoNaData(completo, data);
  }

  // ── gates ──────────────────────────────────────────────────────────────────────────────────────────────────────────
  /** Item 40 — a categoria vigente na ESOCIAL_CATEGORIA em `dataInicio`; natureza pelo `evento` (item 39). */
  private async naturezaEm(categoria: CategoriaNucleo, data: string): Promise<NaturezaVinculo> {
    const linha = linhaLegalVigente(await this.deps.legalParams.fotografia(['ESOCIAL_CATEGORIA']), 'ESOCIAL_CATEGORIA', categoria, data);
    const evento = linha?.valorJson ? (JSON.parse(linha.valorJson) as { evento: string | null }).evento : null;
    const natureza = linha ? naturezaDoEvento(evento) : null;
    if (!natureza) {
      throw new ValidationError(`A categoria ${categoria} não está vigente na Tabela 01 do eSocial em ${data} (ESOCIAL_CATEGORIA).`);
    }
    return natureza;
  }

  /** Item 43 — referências vivas do dono (Tier-0 ⇒ 404) e o exigido pela natureza. */
  private async versaoValida(
    scope: AccountingScope,
    natureza: NaturezaVinculo,
    v: { lotacaoId: string; cargoId?: string; jornadaId?: string; sindicatoId?: string; salarioCents: bigint; unidadeSalario: string },
    tx: Tx,
  ): Promise<Omit<DpVersaoData, 'vigenteDesde' | 'vigenteAte'>> {
    if (natureza === 'EMPREGO' && (!v.cargoId || !v.jornadaId)) {
      throw new ValidationError('Vínculo de emprego (S-2200) exige cargo e jornada na versão.');
    }
    const owner = scope.ownerUserId;
    achado(await this.cadastros.findLotacao(owner, v.lotacaoId, tx), 'Lotação');
    if (v.cargoId) achado(await this.cadastros.findCargo(owner, v.cargoId, tx), 'Cargo');
    if (v.jornadaId) achado(await this.cadastros.findJornada(owner, v.jornadaId, tx), 'Jornada');
    if (v.sindicatoId) achado(await this.cadastros.findSindicato(owner, v.sindicatoId, tx), 'Sindicato');
    return {
      lotacaoId: v.lotacaoId,
      cargoId: v.cargoId ?? null,
      jornadaId: v.jornadaId ?? null,
      sindicatoId: v.sindicatoId ?? null,
      salarioCents: v.salarioCents,
      unidadeSalario: v.unidadeSalario,
    };
  }

  /**
   * Item 44 — pró-labore (723): sócio PF da instância com `taxId = cpf`; a vigência do vínculo cabe na do sócio; MEI no
   * ano de `dataInicio` não cadastra o próprio CPF como contribuinte individual [D11 MOS §2.1]. Sem perfil do ano ⇒ aceito.
   */
  private async assertProLabore(scope: AccountingScope, trab: DpTrabalhador, dataInicio: string, dataTermino: string | null, tx: Tx): Promise<void> {
    const socio = trab.partnerId ? await this.deps.partners.findById(scope, trab.partnerId, tx) : null;
    if (!socio || socio.tipoPessoa !== 'PF' || socio.taxId !== trab.cpf) {
      throw dpValidationError('DP_PRO_LABORE_SEM_SOCIO', 'O pró-labore (723) exige o trabalhador ligado a um sócio pessoa física com o mesmo CPF.');
    }
    if (!vigenciaContida({ vigenteDesde: dataInicio, vigenteAte: dataTermino }, { vigenteDesde: socio.entradaEm, vigenteAte: socio.saidaEm })) {
      throw dpValidationError(
        'DP_PRO_LABORE_FORA_DA_SOCIEDADE',
        `A vigência do vínculo (${dataInicio} a ${dataTermino ?? 'em aberto'}) sai da participação do sócio (${socio.entradaEm} a ${socio.saidaEm ?? 'em aberto'}).`,
      );
    }
    const perfil = await this.deps.fiscalProfiles.findByYear(scope, Number(dataInicio.slice(0, 4)), tx);
    if (perfil?.regime === 'MEI') {
      throw dpValidationError('DP_PRO_LABORE_MEI', 'O MEI não cadastra o próprio CPF como contribuinte individual para informar o pró-labore (MOS §2.1).');
    }
  }

  private async assertEmployeeRef(scope: AccountingScope, employeeRef: string): Promise<void> {
    if (!(await this.deps.employees.employeeRowExists(scope.ownerUserId, employeeRef))) {
      throw dpValidationError('DP_EMPLOYEE_REF_INVALIDO', 'employeeRef não aponta para uma linha viva de employees desta instância.');
    }
  }

  private async assertCpfLivre(scope: AccountingScope, cpf: string, selfId: string | null, tx: Tx): Promise<void> {
    const outro = await this.repo.findTrabalhadorPorCpf(scope.ownerUserId, cpf, tx);
    if (outro && outro.id !== selfId) throw dpConflictError('DP_CPF_DUPLICADO', `Já existe trabalhador vivo com este CPF (id ${outro.id}).`);
  }

  private async assertMatriculaLivre(scope: AccountingScope, matricula: string, tx: Tx): Promise<void> {
    const outro = await this.repo.findVinculoPorMatricula(scope.ownerUserId, matricula, tx);
    if (outro) throw dpConflictError('DP_MATRICULA_DUPLICADA', `Já existe vínculo vivo com a matrícula '${matricula}' (id ${outro.id}).`);
  }

  // ── auditoria (item 49) ────────────────────────────────────────────────────────────────────────────────────────────
  private auditTrabalhador(tx: Tx, scope: AccountingScope, eventType: DpVinculoEvent, r: DpTrabalhador) {
    return this.audit(tx, scope, eventType, 'dp_trabalhador', r.id, {
      trabalhadorId: r.id,
      origem: r.origem,
      temEmployeeRef: String(r.employeeRef !== null),
      temPartner: String(r.partnerId !== null),
    });
  }
  private auditVinculo(tx: Tx, scope: AccountingScope, eventType: DpVinculoEvent, r: DpVinculo) {
    return this.audit(tx, scope, eventType, 'dp_vinculo', r.id, {
      vinculoId: r.id,
      trabalhadorId: r.trabalhadorId,
      unitId: r.unitId,
      categoria: r.categoria,
      dataInicio: r.dataInicio,
    });
  }
  private auditVersaoCriada(tx: Tx, scope: AccountingScope, r: DpVinculoVersao) {
    return this.audit(tx, scope, 'dp.vinculo_versao.created', 'dp_vinculo_versao', r.id, {
      vinculoId: r.vinculoId,
      versaoId: r.id,
      vigenteDesde: r.vigenteDesde,
    });
  }
  private async audit(tx: Tx, scope: AccountingScope, eventType: DpVinculoEvent, targetType: string, targetId: string, payload: Record<string, string | null>) {
    await this.auditService.append(tx, scope, { actorUserId: scope.actorUserId, eventType, targetType, targetId, payload });
  }

  private async viewTrabalhador(scope: AccountingScope, r: DpTrabalhador): Promise<DpTrabalhadorView> {
    const { userId: _u, deletedAt: _d, createdById: _c, createdAt, updatedAt, ...resto } = r;
    // Item 38 (D-6): verificação no read — a linha apagada vira marca, sem erro.
    const removida = r.employeeRef !== null && !(await this.deps.employees.employeeRowExists(scope.ownerUserId, r.employeeRef));
    return { ...resto, createdAt: createdAt.toISOString(), updatedAt: updatedAt.toISOString(), pessoaOperacionalRemovida: removida };
  }

  private assertRead(scope: AccountingScope): void {
    if (!this.policy.canRead(scope)) throw new ForbiddenError('Você não tem permissão para ler o cadastro de pessoal do DP.');
  }

  private assertManage(scope: AccountingScope): void {
    if (!this.policy.canManage(scope)) throw new ForbiddenError('Você não tem permissão para alterar o cadastro de pessoal do DP.');
  }
}

/**
 * Item 40 — fora do núcleo ⇒ 400 `DP_CATEGORIA_FORA_DO_NUCLEO`; a mensagem aponta o submódulo `DP-CAT` (F-DPB-1).
 * A validação mora aqui, não no `z.enum` do DTO, para o 400 levar o `reason`.
 */
function assertCategoriaNucleo(categoria: string): CategoriaNucleo {
  if ((CATEGORIAS_NUCLEO as readonly string[]).includes(categoria)) return categoria as CategoriaNucleo;
  throw dpValidationError(
    'DP_CATEGORIA_FORA_DO_NUCLEO',
    `A categoria ${categoria} não é do núcleo (${CATEGORIAS_NUCLEO.join(', ')}). As demais (por exemplo 102, 104, 111, avulso e cooperado) entram pelo submódulo DP-CAT.`,
    { categoria, submodulo: 'DP-CAT' },
  );
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

function view(r: DpVinculo): DpVinculoView {
  const { userId: _u, deletedAt: _d, createdAt, updatedAt, ...resto } = r;
  return { ...resto, createdAt: createdAt.toISOString(), updatedAt: updatedAt.toISOString() };
}

function viewVersao(r: DpVinculoVersao): DpVersaoView {
  const { salarioCents, createdAt, updatedAt, ...resto } = r;
  return { ...resto, salarioCents: salarioCents.toString(), createdAt: createdAt.toISOString(), updatedAt: updatedAt.toISOString() };
}
