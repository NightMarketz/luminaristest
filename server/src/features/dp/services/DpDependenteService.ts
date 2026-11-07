import type { DpDependente, Prisma } from 'generated/prisma';
import type { Keyring } from '../../../lib/secretBox';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../lib/errors';
import type { AccountingScope } from '../../accounting/scope/AccountingScope';
import type { AuditService } from '../../accounting/services/AuditService';
import { linhaLegalVigente } from '../../legalParameters/models/legalParameter';
import type { LegalParameterService } from '../../legalParameters/services/LegalParameterService';
import type { CreateDependenteInput, UpdateDependenteInput } from '../dtos/DpDependenteDto';
import { assertSalarioFamilia } from '../models/dependente';
import { regraInt } from '../models/regrasFolha';
import { camposAlterados, hashCampos } from '../models/vinculo';
import type { IDpPolicy } from '../policies/IDpPolicy';
import type { DpDependenteData, IDpDependenteRepository } from '../repositories/IDpDependenteRepository';
import type { IDpVinculoRepository } from '../repositories/IDpVinculoRepository';

type Tx = Prisma.TransactionClient;

/**
 * Eventos do item 21. Só `dependenteId`, `trabalhadorId` e `tipo` (sem nome, CPF nem nascimento — o `AuditEvent` não se
 * apaga, F17); a alteração leva os campos e o HMAC antes/depois deles, como a correção do trabalhador (G12).
 */
export const DP_DEPENDENTE_EVENTS = ['dp.dependente.created', 'dp.dependente.updated', 'dp.dependente.deleted'] as const;
type DpDependenteEvent = (typeof DP_DEPENDENTE_EVENTS)[number];

const CAMPOS = ['nome', 'cpf', 'nascimento', 'tipo', 'deduzIrrf', 'salarioFamilia', 'invalido', 'vigenteDesde', 'vigenteAte'] as const;

/** §3.4: a resposta não leva o CPF completo — `***.***.ddd-dd` (só os 3 últimos dígitos do corpo e o DV). */
export type DpDependenteView = Omit<DpDependente, 'cpf' | 'deletedAt' | 'createdAt' | 'updatedAt'> & {
  cpfMascarado: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * BE-INCR-DP-F2 itens 13–15, 20–21 (PR-1) — dependentes do trabalhador. Policy primeiro; a posse vem do trabalhador do
 * dono (Tier-0 ⇒ 404). O tipo vigente na Tabela 07 e o salário-família (item 15) são checados antes de gravar; a
 * auditoria grava na mesma tx. A alteração recusa com 503 sem o chaveiro do DP, antes de qualquer escrita (falha
 * fechada, como a correção do trabalhador; dono, 2026-11-04).
 */
export class DpDependenteService {
  constructor(
    private readonly repo: IDpDependenteRepository,
    private readonly trabalhadores: Pick<IDpVinculoRepository, 'findTrabalhador'>,
    private readonly policy: IDpPolicy,
    private readonly auditService: AuditService,
    private readonly legalParams: Pick<LegalParameterService, 'fotografia'>,
    private readonly auditKeyring: () => Keyring,
  ) {}

  async list(scope: AccountingScope, trabalhadorId: string): Promise<DpDependenteView[]> {
    this.assertRead(scope);
    achado(await this.trabalhadores.findTrabalhador(scope.ownerUserId, trabalhadorId), 'Trabalhador');
    return (await this.repo.list(trabalhadorId)).map(view);
  }

  async create(scope: AccountingScope, trabalhadorId: string, input: CreateDependenteInput): Promise<DpDependenteView> {
    this.assertManage(scope);
    const data: DpDependenteData = {
      nome: input.nome,
      cpf: input.cpf ?? null,
      nascimento: input.nascimento,
      tipo: input.tipo,
      deduzIrrf: input.deduzIrrf,
      salarioFamilia: input.salarioFamilia,
      invalido: input.invalido,
      vigenteDesde: input.vigenteDesde,
      vigenteAte: input.vigenteAte ?? null,
    };
    await this.assertValido(data);
    return this.repo.runTransaction(async (tx) => {
      achado(await this.trabalhadores.findTrabalhador(scope.ownerUserId, trabalhadorId, tx), 'Trabalhador');
      const r = await this.repo.create(trabalhadorId, data, tx);
      await this.audit(tx, scope, 'dp.dependente.created', r, {});
      return view(r);
    });
  }

  async update(scope: AccountingScope, trabalhadorId: string, id: string, input: UpdateDependenteInput): Promise<DpDependenteView> {
    this.assertManage(scope);
    const chave = this.chaveAuditoria(); // 503 antes de qualquer escrita (falha fechada)
    return this.repo.runTransaction(async (tx) => {
      achado(await this.trabalhadores.findTrabalhador(scope.ownerUserId, trabalhadorId, tx), 'Trabalhador');
      const atual = achado(await this.repo.find(trabalhadorId, id, tx), 'Dependente');
      const patch = pick(input, CAMPOS);
      const novo: DpDependenteData = { ...dadosDe(atual), ...patch };
      if (novo.vigenteAte !== null && novo.vigenteAte < novo.vigenteDesde) throw new ValidationError('vigenteAte < vigenteDesde');
      await this.assertValido(novo);
      const campos = camposAlterados(atual, patch);
      const r = await this.repo.update(id, patch, tx);
      await this.audit(tx, scope, 'dp.dependente.updated', r, {
        campos: campos.join(','),
        antesSha256: hashCampos(atual, campos, chave.key),
        depoisSha256: hashCampos(r, campos, chave.key),
        chaveVersao: String(chave.version),
      });
      return view(r);
    });
  }

  async remove(scope: AccountingScope, trabalhadorId: string, id: string): Promise<void> {
    this.assertManage(scope);
    await this.repo.runTransaction(async (tx) => {
      achado(await this.trabalhadores.findTrabalhador(scope.ownerUserId, trabalhadorId, tx), 'Trabalhador');
      achado(await this.repo.find(trabalhadorId, id, tx), 'Dependente');
      await this.audit(tx, scope, 'dp.dependente.deleted', await this.repo.delete(id, tx), {});
    });
  }

  /**
   * Item 13 — o tipo vigente na ESOCIAL_TIPO_DEPENDENTE (Tabela 07) em `vigenteDesde`. Item 15 — marcado para o
   * salário-família, filho ou equiparado até a idade da FOLHA_REGRA `SALARIO_FAMILIA_IDADE_MAX` em `vigenteDesde`
   * (sem linha ⇒ 400 PARAMETRO_LEGAL_AUSENTE, como as outras regras do PR-0R).
   */
  private async assertValido(d: DpDependenteData): Promise<void> {
    const linhas = await this.legalParams.fotografia(['ESOCIAL_TIPO_DEPENDENTE', 'FOLHA_REGRA']);
    if (!linhaLegalVigente(linhas, 'ESOCIAL_TIPO_DEPENDENTE', d.tipo, d.vigenteDesde)) {
      throw new ValidationError(`O tipo ${d.tipo} não está vigente na Tabela 07 do eSocial em ${d.vigenteDesde} (ESOCIAL_TIPO_DEPENDENTE).`, { campo: 'tipo' });
    }
    if (d.salarioFamilia) assertSalarioFamilia(d, regraInt(linhas, 'SALARIO_FAMILIA_IDADE_MAX', d.vigenteDesde));
  }

  private async audit(tx: Tx, scope: AccountingScope, eventType: DpDependenteEvent, r: DpDependente, extra: Record<string, string>) {
    await this.auditService.append(tx, scope, {
      actorUserId: scope.actorUserId,
      eventType,
      targetType: 'dp_dependente',
      targetId: r.id,
      payload: { dependenteId: r.id, trabalhadorId: r.trabalhadorId, tipo: r.tipo, ...extra },
    });
  }

  private chaveAuditoria(): { key: Buffer; version: number } {
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

/** `***.***.ddd-dd`: 11 dígitos ⇒ só os dígitos 7–9 e o DV ficam visíveis. */
export function mascararCpf(cpf: string | null): string | null {
  return cpf === null ? null : `***.***.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
}

function dadosDe(r: DpDependente): DpDependenteData {
  const { nome, cpf, nascimento, tipo, deduzIrrf, salarioFamilia, invalido, vigenteDesde, vigenteAte } = r;
  return { nome, cpf, nascimento, tipo, deduzIrrf, salarioFamilia, invalido, vigenteDesde, vigenteAte };
}

function view(r: DpDependente): DpDependenteView {
  const { cpf, deletedAt: _d, createdAt, updatedAt, ...resto } = r;
  return { ...resto, cpfMascarado: mascararCpf(cpf), createdAt: createdAt.toISOString(), updatedAt: updatedAt.toISOString() };
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
