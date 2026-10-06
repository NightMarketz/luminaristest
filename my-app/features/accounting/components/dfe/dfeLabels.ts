import type { CampoComparado, FiscalDocumentPendencia, FiscalDocumentStatus } from '../../../../lib/services/dfe.service';

/**
 * Mapas FECHADOS (FE-INCR-DFE item 26): chave i18n `dfe.*` + texto pt de fallback. Um teste confere que toda chave dos
 * enums existe em `public/locales/{pt,en}/accounting.json`. Valor fora do mapa (BE mais novo que a tela) cai no cru.
 */

export const STATUS_LABEL: Record<FiscalDocumentStatus, string> = {
  SENT: 'Aguardando retorno do portal',
  PROCESSING: 'Em processamento',
  AUTHORIZED: 'Autorizada',
  AUTHORIZED_DIVERGENT: 'Autorizada com divergência',
  REJECTED: 'Rejeitada',
  CANCELLED: 'Cancelada',
};

export const PENDENCIA_LABEL: Record<FiscalDocumentPendencia, string> = {
  releitura_divergente: 'A nota autorizada diverge do que foi enviado — só sai cancelando e emitindo de novo.',
  sale_cancelled_with_live_document: 'A venda foi cancelada, mas esta nota continua válida — cancele a nota no portal e registre aqui.',
  cancelled_without_replacement: 'Nota cancelada sem substituta — emita de novo pelo botão, se a venda continuar valendo.',
};

/** cMotivo do evento e101101 (transcrição do evento §7, linha 129). */
export const MOTIVO_LABEL: Record<1 | 2 | 9, string> = {
  1: 'Erro na emissão',
  2: 'Serviço não prestado',
  9: 'Outros',
};

export const CAMPO_LABEL: Record<CampoComparado, string> = {
  'prest.CNPJ': 'CNPJ do emitente',
  'toma.doc': 'CPF/CNPJ do tomador',
  cTribNac: 'Código de Tributação Nacional',
  cNBS: 'Item da NBS',
  cLocPrestacao: 'Local da prestação',
  dCompet: 'Data de competência',
  vServ: 'Valor do serviço',
  vDescIncond: 'Desconto incondicionado',
  vDescCond: 'Desconto condicionado',
  tpRetISSQN: 'Retenção do ISSQN',
  pAliq: 'Alíquota',
  'IBSCBS.CST': 'CST do IBS/CBS',
  'IBSCBS.cClassTrib': 'cClassTrib do IBS/CBS',
};

/** Chave i18n de um campo comparado (o ponto do nome do campo não pode virar nível do JSON). */
export const campoKey = (campo: CampoComparado): string => `dfe.campo.${campo.replace('.', '_')}`;

export const AMBIENTE_LABEL: Record<'producao' | 'homologacao', string> = {
  producao: 'Produção',
  homologacao: 'Homologação',
};

/** Endereço do Emissor Nacional web (Guia v1.2, G1) — só para documento de produção (PV-7: homologação sem link). */
export const PORTAL_URL = 'https://www.nfse.gov.br/EmissorNacional';
