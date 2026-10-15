import type { ServiceFiscalCatalogItem } from '../../dtos/SectorKitDto';

/**
 * Catálogo de sugestões fiscais por serviço (BE-INCR-KIT-SETOR-EMENDA-1, PR-K3, item 7a; F-KE-3 b, F-KE-4; L4 de 13/10:
 * salão e clínica com a tabela inteira). Fonte dos códigos: `pesquisas-legais/ctribnac-salao-clinica/relatorio.md`
 * — LC 116/2003, lista anexa (planalto.gov.br) [D02] e Anexo B v1.01 do Sistema Nacional NFS-e, 22/01/2026 (gov.br/nfse)
 * [D01]. O `cNBS` é o NBS 2.0 sem pontos, casado por descrição (o relatório registra que a correlação oficial
 * item ↔ NBS não foi baixada).
 *
 * Os `sinonimos` são vocabulário de cadastro (não norma): servem só para a camada 1 casar o nome que o usuário deu ao
 * serviço. 6.02 × 4.01 depende de QUEM executa (relatório §4): por isso as entradas da 4.01 dizem "executado por" e
 * podem aparecer junto com a de estética — o usuário escolhe; nada é gravado sem ele.
 */
export const CATALOGO_SERVICOS_FISCAIS: ServiceFiscalCatalogItem[] = [
  {
    key: 'cabeleireiro',
    label: 'Cabeleireiro e barbeiro (corte, escova, coloração, barba)',
    cTribNac: '060101',
    cNBS: '126021000',
    sinonimos: [
      'cabeleireiro', 'cabelo', 'corte', 'escova', 'escova progressiva', 'progressiva', 'alisamento', 'coloracao', 'tintura',
      'mechas', 'luzes', 'penteado', 'hidratacao capilar', 'botox capilar', 'barba', 'barbearia', 'barbeiro',
    ],
    fonte: 'LC 116 6.01; Anexo B v1.01 (NBS 1.2602.10.00)',
  },
  {
    key: 'manicure',
    label: 'Manicure e pedicure',
    cTribNac: '060101',
    cNBS: '126022000',
    sinonimos: ['manicure', 'pedicure', 'unha', 'unha em gel', 'alongamento de unha', 'esmaltacao', 'spa dos pes'],
    fonte: 'LC 116 6.01; Anexo B v1.01 (NBS 1.2602.20.00)',
  },
  {
    key: 'estetica',
    label: 'Estética, limpeza de pele e depilação (executado por esteticista)',
    cTribNac: '060201',
    cNBS: '126022000',
    sinonimos: [
      'estetica', 'esteticista', 'limpeza de pele', 'depilacao', 'cera', 'sobrancelha', 'design de sobrancelha', 'cilios',
      'extensao de cilios', 'maquiagem', 'peeling', 'micropigmentacao',
    ],
    fonte: 'LC 116 6.02; Anexo B v1.01 (NBS 1.2602.20.00)',
  },
  {
    key: 'massagem',
    label: 'Massagem, banho e sauna',
    cTribNac: '060301',
    cNBS: '126023000',
    sinonimos: ['massagem', 'massagem relaxante', 'drenagem', 'drenagem linfatica', 'sauna', 'banho', 'ducha', 'shiatsu', 'reflexologia'],
    fonte: 'LC 116 6.03; Anexo B v1.01 (NBS 1.2602.30.00)',
  },
  {
    key: 'emagrecimento',
    label: 'Centro de emagrecimento e spa',
    cTribNac: '060501',
    cNBS: '126029000',
    sinonimos: ['emagrecimento', 'spa', 'day spa', 'programa de emagrecimento'],
    fonte: 'LC 116 6.05; Anexo B v1.01 (NBS 1.2602.90.00)',
  },
  {
    key: 'procedimento_medico',
    label: 'Procedimento médico (executado por médico)',
    cTribNac: '040101',
    cNBS: '123012200',
    sinonimos: ['medico', 'consulta', 'toxina botulinica', 'botox', 'preenchimento', 'acido hialuronico', 'bioestimulador', 'laser', 'harmonizacao facial'],
    fonte: 'LC 116 4.01; Anexo B v1.01 (NBS 1.2301.22.00)',
  },
  {
    key: 'procedimento_biomedico',
    label: 'Procedimento estético (executado por biomédico)',
    cTribNac: '040102',
    cNBS: '123012200',
    sinonimos: ['biomedico', 'biomedicina', 'preenchimento', 'harmonizacao facial', 'toxina botulinica'],
    fonte: 'LC 116 4.01; Anexo B v1.01 (NBS 1.2301.22.00)',
  },
];
