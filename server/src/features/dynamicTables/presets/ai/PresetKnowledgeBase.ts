/**
 * Base de conhecimento para a IA, associando chaves de presets a descrições detalhadas.
 * Essas descrições são otimizadas para busca semântica, permitindo que a IA encontre o preset
 * mais relevante com base na descrição do negócio do usuário.
 */

export interface IPresetKnowledge {
  key: string;
  name: string;
  aiDescription: string;
}

export const presetKnowledgeBase: IPresetKnowledge[] = [
  {
    key: 'beautySalon',
    name: 'Salão de Beleza',
    // BE-INCR-P2-VERTICAL-CLINICA, comportamento 3: emenda à descrição — este preset reivindicava
    // literalmente "clínicas de estética" (`PresetKnowledgeBase.ts:17`, verificado no BRIEF §2), o
    // que faria o matcher resolver qualquer descrição de clínica para `beautySalon` mesmo depois de
    // `aestheticClinic` existir (as duas entradas competiriam pela mesma descrição). Removido aqui;
    // "clínicas de estética" migrou para a entrada nova abaixo.
    aiDescription: 'Um sistema completo de gestão para negócios na área da beleza, como salões, barbearias ou spas. Otimizado para gerenciar o relacionamento com clientes e a agenda. Inclui tabelas para: Clientes (com histórico de visitas), Serviços (catálogo de serviços oferecidos com preço e duração), Agendamentos (para marcar horários, vinculando cliente, serviço e funcionário), Produtos (para venda ou uso interno), Vendas (registrando serviços e produtos), e Funcionários (para comissões e agenda).',
  },
  {
    key: 'aestheticClinic',
    name: 'Clínica de Estética',
    // BE-INCR-P2-VERTICAL-CLINICA, comportamento 3: entrada NOVA — sem ela o matcher devolveria
    // `beautySalon` para qualquer descrição de clínica (a prova mediria o próprio preset do
    // vertical 1, não o vertical 2). Conteúdo clínico sensível (anamnese/contraindicação/consentimento)
    // NÃO é mencionado aqui — a ficha clínica só promete um campo administrativo próprio (ver
    // `AestheticClinicCustomerModule.ts`), a decisão de conteúdo de saúde está pendente de validação
    // externa (BRIEF §7 item 4).
    aiDescription: 'Um sistema completo de gestão para clínicas de estética — procedimentos estéticos, protocolos de tratamento e pacotes de sessões pré-pagas. Otimizado para o relacionamento com o paciente/cliente e a agenda de atendimentos. Inclui tabelas para: Clientes (ficha com registro administrativo próprio da clínica), Serviços (catálogo de procedimentos com preço e duração), Agendamentos (marcação de atendimentos vinculando cliente, procedimento e profissional), Produtos (cosméticos/insumos para revenda ou uso interno, com controle de estoque), Pacotes (sessões pré-pagas), Vendas (registrando procedimentos e produtos), e Comissões (por profissional).',
  },
];
