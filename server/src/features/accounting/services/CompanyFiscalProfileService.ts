import { Prisma } from 'generated/prisma';
import type { CompanyFiscalProfile } from 'generated/prisma';
import { ConflictError, ForbiddenError, NotFoundError } from '../../../lib/errors';
import type { AccountingScope } from '../scope/AccountingScope';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { ICompanyFiscalProfileRepository, CompanyFiscalProfileData } from '../repositories/ICompanyFiscalProfileRepository';
import type { ICompanySignerRepository } from '../repositories/ICompanySignerRepository';
import type { IAccountingContactRepository } from '../repositories/IAccountingContactRepository';
import type { AuditService } from './AuditService';
import type { CompanyDeclarante, UpsertCompanyFiscalProfileInput } from '../dtos/CompanyFiscalProfileDto';
import { resolverObrigacoes } from '../models/obrigacoesPorRegime';
import type { CondicoesPerfil, ObrigacaoSped, StatusObrigacao } from '../models/obrigacoesPorRegime';
import type { RegimeEmpresa } from '../models/regimeEmpresa';

export const COMPANY_FISCAL_PROFILE_UPDATED = 'company_fiscal_profile.updated';
export const COMPANY_FISCAL_PROFILE_DELETED = 'company_fiscal_profile.deleted';

export interface CompanyFiscalProfileView {
  ano: number;
  regime: RegimeEmpresa;
  grandePorte: boolean | null;
  inativa: boolean;
  condicoes: CondicoesPerfil;
  declarante: CompanyDeclarante | null;
  ecd: { indNire: string; nire: string | null; numOrd: string | null; natLivr: string | null } | null;
  ecf: { indAliqCsll: string | null; indRecReceita: string | null } | null;
  contadorContactId: string | null;
  representanteLegalSignerId: string | null;
  ecfRecibo: string | null;
  regimeTravadoEm: string | null;
  updatedAt: string;
}

export interface ObrigacaoComFaltantes {
  obrigacao: ObrigacaoSped;
  status: StatusObrigacao;
  fonte: string;
  perguntaPendente?: string;
  faltantes: string[];
}

export interface CompanyObligationsView {
  ano: number;
  perfil: 'COMPLETO' | 'INCOMPLETO' | 'AUSENTE';
  regime?: RegimeEmpresa;
  obrigacoes: ObrigacaoComFaltantes[];
  avisos: string[];
}

/**
 * Campos exigidos por arquivo, espelhando o que os DTOs de geração obrigam HOJE (fonte = o próprio contrato de
 * entrada, que já cita o manual): ECD 0000 → `SpedEcdDto.DeclarantSchema` (nome/cnpj/uf/codMun obrigatórios; ie/im
 * opcionais) + `BookSchema` + `indGrandePorte`; ECF 0000/0030 → `SpedEcfDto.DeclarantSchema`.
 */
const DECLARANTE_ECD: (keyof CompanyDeclarante)[] = ['nome', 'cnpj', 'uf', 'codMun'];
const DECLARANTE_ECF: (keyof CompanyDeclarante)[] = ['cnpj', 'nome', 'codNat', 'cnaeFiscal', 'endereco', 'bairro', 'uf', 'codMun', 'cep', 'email'];

/**
 * BE-INCR-FISCAL-OBLIGATION-PROFILE (nó X13, BRIEF itens 6, 7, 9, 10; F-XP-2/3 → a) — perfil fiscal da EMPRESA por
 * ano. Chave (dono, ano) — instância = CNPJ raiz (R8). Policy = a do perfil fiscal (item 6).
 *
 * Referências (item 7) resolvidas DENTRO da tx do upsert, com `tx` propagado (gate autoritativo dentro da tx):
 * contador = `AccountingContact` vivo do escopo; representante legal = `CompanySigner` vivo do dono. Id de outro
 * escopo → 404 (nunca 403, mesma regra de `expandSignerContacts`).
 *
 * Obrigações (item 9): faltantes só para obrigação OBRIGATORIA ou CONDICIONAL — FACULTATIVA não cobra dado de quem
 * não é obrigado a entregar; CONDICIONAL também cobra a resposta pendente (`condicoes.<chave>`).
 */
export class CompanyFiscalProfileService {
  constructor(
    private readonly repo: ICompanyFiscalProfileRepository,
    private readonly signerRepo: ICompanySignerRepository,
    private readonly contactRepo: IAccountingContactRepository,
    private readonly policy: IAccountingPolicy,
    private readonly auditService: AuditService,
  ) {}

  async get(scope: AccountingScope, ano: number): Promise<CompanyFiscalProfileView | null> {
    this.assertRead(scope);
    const row = await this.repo.findByYear(scope, ano);
    return row ? toView(row) : null;
  }

  async upsert(scope: AccountingScope, ano: number, input: UpsertCompanyFiscalProfileInput): Promise<CompanyFiscalProfileView> {
    this.assertManage(scope);
    const data = toData(input);
    return this.repo.runTransaction(async (tx) => {
      await this.assertRefs(scope, data, tx);
      const row = await this.repo.upsert(scope, ano, data, tx);
      await this.auditUpdated(tx, scope, row);
      return toView(row);
    });
  }

  async remove(scope: AccountingScope, ano: number): Promise<void> {
    this.assertManage(scope);
    await this.repo.runTransaction(async (tx) => {
      const n = await this.repo.softDelete(scope, ano, tx);
      if (n === 0) throw new NotFoundError(`company_fiscal_profile_missing: sem perfil fiscal da empresa para ${ano}.`);
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType: COMPANY_FISCAL_PROFILE_DELETED,
        targetType: 'company_fiscal_profile',
        targetId: `${scope.ownerUserId}:${ano}`,
        payload: { anoCalendario: String(ano) },
      });
    });
  }

  /**
   * F-XP-2/3 → (a): copia o perfil de `anoAnterior` para `ano`. NÃO copia o nº de ordem do livro (muda todo ano,
   * BRIEF F-XP-3) nem o recibo/trava da ECF (estado do ano de origem, F-XP-5). Origem ausente → 404; destino já
   * existente → 409 (a cópia nunca sobrescreve — para editar use o PUT).
   */
  async copyFrom(scope: AccountingScope, ano: number, anoAnterior: number): Promise<CompanyFiscalProfileView> {
    this.assertManage(scope);
    return this.repo.runTransaction(async (tx) => {
      const origem = await this.repo.findByYear(scope, anoAnterior, tx);
      if (!origem) throw new NotFoundError(`company_fiscal_profile_missing: sem perfil fiscal da empresa para ${anoAnterior}.`);
      if (await this.repo.findByYear(scope, ano, tx)) {
        throw new ConflictError(`company_fiscal_profile_exists: já existe perfil fiscal da empresa para ${ano} — edite pelo PUT.`);
      }
      const data: CompanyFiscalProfileData = { ...rowToData(origem), ecdNumOrd: null };
      await this.assertRefs(scope, data, tx);
      const row = await this.repo.upsert(scope, ano, data, tx);
      await this.auditUpdated(tx, scope, row, anoAnterior);
      return toView(row);
    });
  }

  async obligations(scope: AccountingScope, ano: number): Promise<CompanyObligationsView> {
    this.assertRead(scope);
    const row = await this.repo.findByYear(scope, ano);
    if (!row) return { ano, perfil: 'AUSENTE', obrigacoes: [], avisos: [] };
    const view = toView(row);
    const contadorVivo = view.contadorContactId ? !!(await this.contactRepo.findById(scope, view.contadorContactId)) : false;
    const representanteVivo = view.representanteLegalSignerId ? !!(await this.signerRepo.findById(scope, view.representanteLegalSignerId)) : false;

    const obrigacoes = resolverObrigacoes({ regime: view.regime, inativa: view.inativa, condicoes: view.condicoes }).map((o) => {
      const cobra = o.status === 'OBRIGATORIA' || o.status === 'CONDICIONAL';
      const faltantes: string[] = [];
      if (cobra) {
        if (o.status === 'CONDICIONAL') {
          for (const [k, v] of Object.entries(view.condicoes)) if (v === null) faltantes.push(`condicoes.${k}`);
        }
        const dec = view.declarante ?? {};
        for (const k of o.obrigacao === 'ECD' ? DECLARANTE_ECD : DECLARANTE_ECF) if (dec[k] === undefined) faltantes.push(`declarante.${k}`);
        if (o.obrigacao === 'ECD') {
          if (view.grandePorte === null) faltantes.push('grandePorte');
          if (!view.ecd) faltantes.push('ecd.indNire', 'ecd.numOrd', 'ecd.natLivr');
          else {
            if (!view.ecd.numOrd) faltantes.push('ecd.numOrd');
            if (!view.ecd.natLivr) faltantes.push('ecd.natLivr');
            if (view.ecd.indNire === '1' && !view.ecd.nire) faltantes.push('ecd.nire');
          }
          // J930: exatamente 1 responsável legal + ao menos 1 contador (SpedEcdDto superRefine, REGRA_OBRIGATORIO_ASSIN_CONTADOR)
          if (!representanteVivo) faltantes.push('representanteLegalSignerId');
          if (!contadorVivo) faltantes.push('contadorContactId');
        } else {
          if (!view.ecf?.indAliqCsll) faltantes.push('ecf.indAliqCsll');
          if (!view.ecf?.indRecReceita) faltantes.push('ecf.indRecReceita');
          // 0930: ao menos 1 signatário (SpedEcfDto) — o manual não obriga contador aqui
          if (!representanteVivo && !contadorVivo) faltantes.push('representanteLegalSignerId');
        }
      }
      return { ...o, faltantes };
    });
    const completo = obrigacoes.every((o) => o.faltantes.length === 0);
    return { ano, perfil: completo ? 'COMPLETO' : 'INCOMPLETO', regime: view.regime, obrigacoes, avisos: [] };
  }

  private async assertRefs(scope: AccountingScope, data: CompanyFiscalProfileData, tx: Prisma.TransactionClient): Promise<void> {
    if (data.contadorContactId && !(await this.contactRepo.findById(scope, data.contadorContactId, tx))) {
      throw new NotFoundError(`Contador '${data.contadorContactId}' não encontrado neste escopo.`);
    }
    if (data.representanteLegalSignerId && !(await this.signerRepo.findById(scope, data.representanteLegalSignerId, tx))) {
      throw new NotFoundError(`Signatário '${data.representanteLegalSignerId}' não encontrado.`);
    }
  }

  private async auditUpdated(tx: Prisma.TransactionClient, scope: AccountingScope, row: CompanyFiscalProfile, copiadoDe?: number): Promise<void> {
    const b = (v: boolean | null) => (v === null ? '' : String(v));
    await this.auditService.append(tx, scope, {
      actorUserId: scope.actorUserId,
      eventType: COMPANY_FISCAL_PROFILE_UPDATED,
      targetType: 'company_fiscal_profile',
      targetId: row.id,
      payload: {
        anoCalendario: String(row.anoCalendario),
        regime: row.regime,
        grandePorte: b(row.grandePorte),
        inativa: String(row.inativa),
        aporteInvestidorAnjo: b(row.aporteInvestidorAnjo),
        livroCaixaSemEscrituracao: b(row.livroCaixaSemEscrituracao),
        distribuicaoAcimaBase: b(row.distribuicaoAcimaBase),
        ecdIndNire: row.ecdIndNire ?? '',
        ecfIndAliqCsll: row.ecfIndAliqCsll ?? '',
        ecfIndRecReceita: row.ecfIndRecReceita ?? '',
        contadorContactId: row.contadorContactId ?? '',
        representanteLegalSignerId: row.representanteLegalSignerId ?? '',
        ...(copiadoDe === undefined ? {} : { copiadoDe: String(copiadoDe) }),
      },
    });
  }

  private assertRead(scope: AccountingScope): void {
    if (!this.policy.canReadFiscalProfile(scope)) throw new ForbiddenError('Você não tem permissão para ler o perfil fiscal da empresa.');
  }

  private assertManage(scope: AccountingScope): void {
    if (!this.policy.canManageFiscalProfile(scope)) throw new ForbiddenError('Você não tem permissão para alterar o perfil fiscal da empresa.');
  }
}

function toData(input: UpsertCompanyFiscalProfileInput): CompanyFiscalProfileData {
  return {
    regime: input.regime,
    grandePorte: input.grandePorte,
    inativa: input.inativa,
    aporteInvestidorAnjo: input.condicoes.aporteInvestidorAnjo,
    livroCaixaSemEscrituracao: input.condicoes.livroCaixaSemEscrituracao,
    distribuicaoAcimaBase: input.condicoes.distribuicaoAcimaBase,
    declarante: input.declarante ? (input.declarante as Prisma.InputJsonValue) : Prisma.DbNull,
    ecdIndNire: input.ecd?.indNire ?? null,
    ecdNire: input.ecd?.nire ?? null,
    ecdNumOrd: input.ecd?.numOrd ?? null,
    ecdNatLivr: input.ecd?.natLivr ?? null,
    ecfIndAliqCsll: input.ecf?.indAliqCsll ?? null,
    ecfIndRecReceita: input.ecf?.indRecReceita ?? null,
    contadorContactId: input.contadorContactId ?? null,
    representanteLegalSignerId: input.representanteLegalSignerId ?? null,
  };
}

function rowToData(row: CompanyFiscalProfile): CompanyFiscalProfileData {
  return {
    regime: row.regime,
    grandePorte: row.grandePorte,
    inativa: row.inativa,
    aporteInvestidorAnjo: row.aporteInvestidorAnjo,
    livroCaixaSemEscrituracao: row.livroCaixaSemEscrituracao,
    distribuicaoAcimaBase: row.distribuicaoAcimaBase,
    declarante: row.declarante === null ? Prisma.DbNull : (row.declarante as Prisma.InputJsonValue),
    ecdIndNire: row.ecdIndNire,
    ecdNire: row.ecdNire,
    ecdNumOrd: row.ecdNumOrd,
    ecdNatLivr: row.ecdNatLivr,
    ecfIndAliqCsll: row.ecfIndAliqCsll,
    ecfIndRecReceita: row.ecfIndRecReceita,
    contadorContactId: row.contadorContactId,
    representanteLegalSignerId: row.representanteLegalSignerId,
  };
}

function toView(row: CompanyFiscalProfile): CompanyFiscalProfileView {
  return {
    ano: row.anoCalendario,
    regime: row.regime as RegimeEmpresa,
    grandePorte: row.grandePorte,
    inativa: row.inativa,
    condicoes: {
      aporteInvestidorAnjo: row.aporteInvestidorAnjo,
      livroCaixaSemEscrituracao: row.livroCaixaSemEscrituracao,
      distribuicaoAcimaBase: row.distribuicaoAcimaBase,
    },
    declarante: (row.declarante as CompanyDeclarante | null) ?? null,
    ecd: row.ecdIndNire ? { indNire: row.ecdIndNire, nire: row.ecdNire, numOrd: row.ecdNumOrd, natLivr: row.ecdNatLivr } : null,
    ecf: row.ecfIndAliqCsll || row.ecfIndRecReceita ? { indAliqCsll: row.ecfIndAliqCsll, indRecReceita: row.ecfIndRecReceita } : null,
    contadorContactId: row.contadorContactId,
    representanteLegalSignerId: row.representanteLegalSignerId,
    ecfRecibo: row.ecfRecibo,
    regimeTravadoEm: row.regimeTravadoEm ? row.regimeTravadoEm.toISOString() : null,
    updatedAt: row.updatedAt.toISOString(),
  };
}
