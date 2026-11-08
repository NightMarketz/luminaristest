import { apiClient } from '../api/api-client';
import type { CreatePartnerInput, UpdatePartnerInput } from '@/types/contracts/accounting/PartnerDto.gen';

/**
 * Cadastro de sócios — cliente de `/api/accounting/partners` (BE-INCR-IRRF-DISTRIBUICAO PR-1; tela no FE-INCR-ECF-Y600
 * PR-2, F-FE-Y600-2 → a). O body de escrita é o tipo GERADO do DTO do servidor; a resposta é a `PartnerView` do serviço.
 */

interface Envelope<T> {
  success: boolean;
  data: T;
}

export type { CreatePartnerInput, UpdatePartnerInput };
export type OutraParticipacao = NonNullable<CreatePartnerInput['outrasParticipacoes']>[number];

/** `PartnerView` do `PartnerService` — o CPF/CNPJ vem inteiro: é o cadastro do próprio dono. */
export interface Partner {
  id: string;
  nome: string;
  taxId: string;
  tipoPessoa: string;
  residenteBrasil: boolean;
  participacaoBp: number;
  entradaEm: string;
  saidaEm: string | null;
  /** Do IRRF/Simples (EFICIENCIA-FISCAL PR-4); a tela de cadastro não edita, mas devolve no PUT para não apagar. */
  outrasParticipacoes: OutraParticipacao[] | null;
  updatedAt: string;
}

export interface PartnerList {
  /** Dia de referência da soma e do aviso (hoje, ou a data do filtro). */
  data: string;
  socios: Partner[];
  somaParticipacaoBp: number;
  /** Soma ≠ 100% — só avisa, não bloqueia o cadastro. */
  aviso: string | null;
}

/** Sem data: todas as vigências vivas (`todas=true`); com data: só as vigentes nela. */
export type PartnerListFilter = { todas: true } | { data: string };

export const partnersService = {
  async list(unitId: string, filtro: PartnerListFilter): Promise<PartnerList> {
    const extra = 'data' in filtro ? `&data=${encodeURIComponent(filtro.data)}` : '&todas=true';
    return (await apiClient.get<Envelope<PartnerList>>(`/accounting/partners?unitId=${encodeURIComponent(unitId)}${extra}`)).data;
  },

  async create(body: CreatePartnerInput): Promise<Partner> {
    return (await apiClient.post<Envelope<Partner>>('/accounting/partners', body)).data;
  },

  async update(id: string, body: UpdatePartnerInput): Promise<Partner> {
    return (await apiClient.put<Envelope<Partner>>(`/accounting/partners/${encodeURIComponent(id)}`, body)).data;
  },

  async remove(id: string, unitId: string): Promise<void> {
    await apiClient.delete<Envelope<unknown>>(`/accounting/partners/${encodeURIComponent(id)}?unitId=${encodeURIComponent(unitId)}`);
  },
};
