import { linhasEmVigor, type LinhaLegal } from '../../legalParameters/models/legalParameter';
import { CBS_REFERENCIA_NAO_PUBLICADA, tabelaIbsCbsDe, type ParametroIbsCbs } from './ibsCbsParams';

/**
 * EFICIENCIA-FISCAL PR-5 (BRIEF itens 30, 31 e 32; D-2026-10-28-EFICIENCIA-FISCAL-PR5-EXECUCAO lacuna 4) — alertas de
 * enquadramento dos serviços e a carga de IBS/CBS de 2027 do serviço, PUROS. Quem lê perfis, subrazão e tabelas é o
 * `ServicoFiscalAvaliacaoService`. Cada alerta cita o artigo (ADR §3 L20, L23–L25); nada é inferido de agenda (I-19).
 */

export const ALERTAS_SERVICO = [
  'PROFISSAO_REGULAMENTADA_TIRA_16',
  'MEDICO_COM_SERVICO_ESTETICO',
  'LOCACAO_IMOVEL_PROPRIO_NO_SIMPLES',
  'CESSAO_MAO_DE_OBRA_MEDICA',
  'PACOTE_FATO_GERADOR_FORA_DO_PADRAO',
] as const;
export type AlertaServicoCodigo = (typeof ALERTAS_SERVICO)[number];

export interface AlertaServico {
  code: AlertaServicoCodigo;
  severity: 'WARN' | 'INFO';
  serviceRefs: string[];
  motivoInformativo: string;
  legalBasis: string;
}

export interface ServicoParaAvaliar {
  serviceRef: string;
  cTribNac: string;
  cNBS: string | null;
  finalidade: string | null;
}

export interface EmpresaParaAvaliar {
  regime: string;
  prestadoraExclusivaServicos: boolean;
  declaraLocacaoImovelProprio: boolean | null;
  declaraCessaoMaoDeObraMedica: boolean | null;
}

const L20 = 'Lei 9.250/1995 art. 40 parágrafo único; Lei 13.643/2018 art. 1º';
const L25 = 'LC 123/2006 art. 17 XV (red. LC 214/2025); SC Cosit 185/2026';
const L23 = 'Res. CGSN 140/2018 art. 2º §§ 8º–9º; LC 214/2025 art. 10 § 4º';

/**
 * Item 30 — alertas de enquadramento, recorte POR EMPRESA no 16 % (triagem B do contador, ADR L20):
 *  - `PROFISSAO_REGULAMENTADA_TIRA_16` (Presumido com o 16 % declarado): TERAPEUTICA ou ESTETICA ⇒ WARN — saúde e esteticista
 *    (a Lei 13.643/2018 "Regulamenta as profissões de Esteticista", art. 1º — lida em 27/10); BELEZA ⇒ INFO, ambíguo
 *    (Lei 12.592/2012 "reconhece", leitura segura 32 %); finalidade não informada ⇒ INFO;
 *  - `MEDICO_COM_SERVICO_ESTETICO`: serviço do item 4 da lista (saúde) com finalidade ESTETICA ou não informada (I-17, F-EF-11);
 *  - `LOCACAO_IMOVEL_PROPRIO_NO_SIMPLES` e `CESSAO_MAO_DE_OBRA_MEDICA`: só pela natureza DECLARADA no perfil da empresa (L25).
 */
export function alertasDeEnquadramento(servicos: readonly ServicoParaAvaliar[], empresa: EmpresaParaAvaliar): AlertaServico[] {
  const alertas: AlertaServico[] = [];
  if (empresa.regime === 'PRESUMIDO' && empresa.prestadoraExclusivaServicos) {
    const por = (pred: (f: string | null) => boolean) => servicos.filter((s) => pred(s.finalidade)).map((s) => s.serviceRef);
    const regulamentada = por((f) => f === 'TERAPEUTICA' || f === 'ESTETICA');
    const beleza = por((f) => f === 'BELEZA');
    const semFinalidade = por((f) => f === null);
    if (regulamentada.length > 0) {
      alertas.push({
        code: 'PROFISSAO_REGULAMENTADA_TIRA_16', severity: 'WARN', serviceRefs: regulamentada, legalBasis: L20,
        motivoInformativo: 'A empresa declarou o 16 % com serviço de saúde ou de esteticista no quadro. O 16 % não se aplica a sociedade de profissão legalmente regulamentada (Lei 9.250/1995 art. 40 p.ú.), e esteticista é profissão regulamentada (Lei 13.643/2018 art. 1º). O recorte é da empresa: um serviço basta.',
      });
    }
    if (beleza.length > 0) {
      alertas.push({
        code: 'PROFISSAO_REGULAMENTADA_TIRA_16', severity: 'INFO', serviceRefs: beleza, legalBasis: `${L20}; Lei 12.592/2012 art. 1º`,
        motivoInformativo: 'Cabeleireiro, manicure, depilador e maquiador têm o exercício "reconhecido" pela Lei 12.592/2012, sem o verbo "regulamenta": é ambíguo se tiram o 16 %. A leitura segura é 32 %; leve ao contador se a receita do ano ficar até R$ 120 mil.',
      });
    }
    if (semFinalidade.length > 0) {
      alertas.push({
        code: 'PROFISSAO_REGULAMENTADA_TIRA_16', severity: 'INFO', serviceRefs: semFinalidade, legalBasis: L20,
        motivoInformativo: 'Serviço sem finalidade informada no perfil fiscal: não dá para dizer se tira o 16 %. Informe TERAPEUTICA, ESTETICA ou BELEZA.',
      });
    }
  }
  const medicoEstetico = servicos.filter((s) => s.cTribNac.startsWith('04') && (s.finalidade ?? 'ESTETICA') === 'ESTETICA').map((s) => s.serviceRef);
  if (medicoEstetico.length > 0) {
    alertas.push({
      code: 'MEDICO_COM_SERVICO_ESTETICO', severity: 'WARN', serviceRefs: medicoEstetico, legalBasis: 'Lei 9.249/1995 art. 15 § 1º III "a"; LC 214/2025 art. 130 e Anexo III',
      motivoInformativo: 'Serviço do item 4 da lista (saúde) com finalidade estética (ou não informada, tratada como estética): não entra no 8 %/12 % hospitalar nem na redução de 60 % de 2027 sem decisão aceita.',
    });
  }
  if (empresa.regime === 'SIMPLES' && empresa.declaraLocacaoImovelProprio === true) {
    alertas.push({
      code: 'LOCACAO_IMOVEL_PROPRIO_NO_SIMPLES', severity: 'WARN', serviceRefs: [], legalBasis: L25,
      motivoInformativo: 'A empresa declarou locação de imóvel próprio: é vedação ao Simples Nacional (LC 123 art. 17 XV, redação da LC 214/2025).',
    });
  }
  if (empresa.declaraCessaoMaoDeObraMedica === true) {
    alertas.push({
      code: 'CESSAO_MAO_DE_OBRA_MEDICA', severity: 'WARN', serviceRefs: [], legalBasis: L25,
      motivoInformativo: 'A empresa declarou cessão de mão de obra médica: no Simples é vedada (SC Cosit 185/2026); fora dele, confira a retenção e o enquadramento com o contador.',
    });
  }
  return alertas;
}

/**
 * Item 31 (F-EF-13 a, F-EF-17 a) — sem campo novo: a política é `FiscalProfile.pacoteFatoGerador`. VENDA no Simples ou CONSUMO
 * fora dele ⇒ INFO; o padrão do campo não muda (F-EF-17 a). O aviso fixo de 2027 entra no texto.
 */
export function alertaPacote(pacoteFatoGerador: string | null, regime: string): AlertaServico | null {
  if (!pacoteFatoGerador) return null;
  const fora = (pacoteFatoGerador === 'VENDA' && regime === 'SIMPLES') || (pacoteFatoGerador === 'CONSUMO' && regime !== 'SIMPLES');
  if (!fora) return null;
  return {
    code: 'PACOTE_FATO_GERADOR_FORA_DO_PADRAO', severity: 'INFO', serviceRefs: [], legalBasis: L23,
    motivoInformativo: `NFS-e do pacote emitida ${pacoteFatoGerador === 'VENDA' ? 'na venda' : 'por sessão consumida'} no regime ${regime}: fora do padrão (Simples = por consumo; fora dele = na venda). A partir de 2027 o IBS/CBS é devido no pagamento de cada parcela (LC 214 art. 10 § 4º), qualquer que seja a política.`,
  };
}

// ─── Item 32 — IBS/CBS de 2027 do serviço (redução de 60 % do Anexo III só com NBS de saúde e finalidade ≠ ESTETICA) ─────────

export const IBS_CBS_REDUCAO_NBS_DESDE = '2027-01-01';

export interface CargaIbsCbsServico {
  cargaBp: number | null; // null = alíquota de 2027 não publicada (DRAFT) ou data antes de 2027
  cheiaBp: number | null;
  nbsSaude: boolean; // cNBS consta do Anexo III na data
  reducaoBp: number; // 0 ou a da tabela (6000)
  avisos: string[];
  memoria: string[];
}

/** Linha da `IBS_CBS_REDUCAO_NBS` vigente cuja chave (prefixo de NBS, 5 a 9 dígitos) casa o `cNBS` — a mais longa vence. */
export function reducaoNbsVigente(cNBS: string | null, data: string, linhas: readonly LinhaLegal[]): LinhaLegal | null {
  if (!cNBS) return null;
  let melhor: LinhaLegal | null = null;
  for (const l of linhasEmVigor(linhas)) {
    if (l.tabela !== 'IBS_CBS_REDUCAO_NBS' || l.vigenteDesde > data || (l.vigenteAte && data > l.vigenteAte)) continue;
    if (!cNBS.startsWith(l.chave)) continue;
    if (!melhor || l.chave.length > melhor.chave.length) melhor = l;
  }
  return melhor;
}

/**
 * `cargaTributariaDoItem` de 2027 para SERVIÇO (BRIEF item 32; ADR §7): CBS + IBS (UF + município) vigentes na data; a redução
 * do Anexo III (LC 214 art. 130) só com o `cNBS` na tabela **e** `finalidade ≠ ESTETICA` (null ⇒ ESTETICA, I-17; F-EF-8/11 a).
 * Alíquota de 2027 sem linha PUBLISHED (a CBS de referência é DRAFT até a resolução do Senado) ⇒ `cargaBp = null` + aviso.
 */
export function cargaIbsCbsDoServico(servico: { cNBS: string | null; finalidade: string | null }, data: string, linhas: readonly LinhaLegal[]): CargaIbsCbsServico {
  const memoria: string[] = [];
  const avisos: string[] = [];
  const red = reducaoNbsVigente(servico.cNBS, data, linhas);
  const nbsSaude = red !== null && red.valorInt !== null;
  const aplica = nbsSaude && (servico.finalidade ?? 'ESTETICA') !== 'ESTETICA';
  const reducaoBp = aplica ? red!.valorInt! : 0;
  if (nbsSaude) memoria.push(`NBS ${servico.cNBS} no Anexo III (${red!.fonte})${aplica ? `: redução de ${reducaoBp / 100}%` : ': finalidade estética ⇒ alíquota cheia (F-EF-11 a)'}`);
  if (data < IBS_CBS_REDUCAO_NBS_DESDE) {
    avisos.push(`carga de IBS/CBS por item só a partir de ${IBS_CBS_REDUCAO_NBS_DESDE} (LC 214 art. 130 e Anexo III).`);
    return { cargaBp: null, cheiaBp: null, nbsSaude, reducaoBp, avisos, memoria };
  }
  const tabela = tabelaIbsCbsDe(linhas);
  const vig = (tributo: 'IBS' | 'CBS', chave: ParametroIbsCbs['chave']) =>
    tabela.filter((p) => p.tributo === tributo && p.chave === chave && p.vigenteDesde <= data && (p.vigenteAte === null || data <= p.vigenteAte)).sort((a, b) => b.vigenteDesde.localeCompare(a.vigenteDesde))[0];
  const cbs = vig('CBS', 'ALIQUOTA');
  const ibsUf = vig('IBS', 'ALIQUOTA_UF');
  const ibsMun = vig('IBS', 'ALIQUOTA_MUN');
  if (!cbs || !ibsUf || !ibsMun) {
    avisos.push(`${CBS_REFERENCIA_NAO_PUBLICADA}: linha DRAFT ou ausente em ${data} — carga não calculada.`);
    return { cargaBp: null, cheiaBp: null, nbsSaude, reducaoBp, avisos, memoria };
  }
  const cheiaBp = cbs.aliquotaBp + ibsUf.aliquotaBp + ibsMun.aliquotaBp;
  const cargaBp = Math.round((cheiaBp * (10000 - reducaoBp)) / 10000);
  memoria.push(`CBS ${cbs.aliquotaBp} bp + IBS ${ibsUf.aliquotaBp} + ${ibsMun.aliquotaBp} bp = ${cheiaBp} bp; com a redução: ${cargaBp} bp`);
  return { cargaBp, cheiaBp, nbsSaude, reducaoBp, avisos, memoria };
}
