/**
 * Idioma da entrevista com IA (dono, chat, 2026-11-06: "Seguir o idioma da UI", achado do RUNBOOK-W3-ESCOLHA-CRIACAO).
 *
 * O front manda `locale` no `POST /dashboard/ai/ChatInterview`; sem ele, português (o comportamento de antes).
 * Os prompts internos continuam escritos em português — o que muda é a instrução de idioma da RESPOSTA
 * (`replyIn`) e os textos fixos que o servidor devolve sem passar pelo modelo (`INTERVIEW_TEXT`).
 */
export const INTERVIEW_LOCALES = ['pt', 'en'] as const;
export type InterviewLocale = (typeof INTERVIEW_LOCALES)[number];
export const DEFAULT_INTERVIEW_LOCALE: InterviewLocale = 'pt';

/** Frase final dos prompts que geram texto para o usuário. */
export function replyIn(locale: InterviewLocale): string {
  return locale === 'en'
    ? 'Responda SEMPRE em inglês (en-US), mesmo que a conversa ou este prompt estejam em português.'
    : 'Responda SEMPRE em português do Brasil.';
}

const NEXT_STEPS = {
  pt: '1. **Adicionar** outra funcionalidade\n2. **Remover** alguma funcionalidade existente\n3. **Finalizar** a customização e criar o sistema',
  en: '1. **Add** another feature\n2. **Remove** an existing feature\n3. **Finish** the customization and create the system',
} as const;

export const INTERVIEW_TEXT = {
  pt: {
    greeting: 'Olá! Para começarmos, por favor me conte sobre o seu negócio ou projeto para que eu possa entender como melhor ajudá-lo com a configuração do sistema.',
    noPreset: 'Não encontrei um preset que se encaixe perfeitamente no seu negócio. Mas não se preocupe, podemos criar um sistema totalmente personalizado. Vamos começar definindo as principais funcionalidades que você precisa.',
    presetFallback: (preset: string, features: string, modules: string[]) =>
      `Ótimo! Encontrei um sistema de **${preset}** que combina com o que você precisa.\n\nCom ele você poderá gerenciar ${features} e muito mais.${modules.length > 0 ? `\n\nPelo que você contou, também sugiro os módulos: ${modules.join(', ')}.` : ''}\n\nGostaria de **criar o sistema agora** ou prefere **customizar** primeiro?`,
    customizationCompletedStage: 'Sua customização foi concluída com sucesso! O sistema será criado com todas as modificações que você solicitou.',
    aiUnavailable: 'Desculpe, estou com problemas para processar sua solicitação no momento. Vamos tentar novamente.',
    confirmSummary: (summary: string) => `Entendi. Então, em resumo, seu negócio é: ${summary}. Isso está correto?`,
    genericFallback: 'Desculpe, não consegui processar sua solicitação.',
    turnError: 'Desculpe, ocorreu um erro ao processar sua solicitação. Por favor, tente novamente.',
    choiceNoMessage: 'Não entendi sua escolha. Por favor, indique se deseja customizar o sistema ou criar diretamente.',
    choiceCreate: 'Ótimo! Seu sistema será criado diretamente com as configurações padrão.',
    choiceDeclined: 'Entendi que você prefere não customizar. Quer **criar o sistema agora** com as configurações padrão?',
    choiceUnclear: 'Não entendi sua escolha. Você prefere **criar o sistema agora** ou **customizar** primeiro?',
    choiceSessionError: 'Desculpe, houve um erro ao preparar a customização. Quer tentar **customizar** de novo ou **criar o sistema agora**?',
    choiceError: 'Desculpe, houve um erro ao processar sua escolha. Quer tentar **customizar** de novo ou **criar o sistema agora**?',
    customizationIntro: (preset: string) =>
      `# Customização do Sistema "${preset}"\n\nPor favor, observe o painel de customização à esquerda para ver todas as funcionalidades atuais do seu sistema.\n\nO que você gostaria de fazer agora?\n\n1. **Adicionar** novas funcionalidades\n2. **Remover** funcionalidades existentes\n3. **Finalizar** a customização e criar o sistema`,
    requiredSuffix: ' (obrigatório)',
    mainFields: 'Campos principais',
    tablesFallback: (preset: string, tables: string) =>
      `# Customização do Sistema ${preset}\n\n## Funcionalidades Atuais\n\nEstas são as tabelas e funcionalidades incluídas no seu sistema:\n\n- ${tables}\n\n## Próximos Passos\n\nVocê gostaria de:\n\n1. **Adicionar** novas funcionalidades\n2. **Remover** alguma funcionalidade existente\n3. **Finalizar** a customização e criar o sistema`,
    stepNoMessage: 'Não entendi sua solicitação. Por favor, diga o que deseja fazer com a customização do sistema.',
    customizationDone: (preset: string) =>
      `# Customização Concluída!\n\nSeu sistema "${preset}" foi customizado com sucesso e agora inclui todas as funcionalidades e tabelas que você solicitou.\n\nO sistema será criado conforme suas especificações.`,
    stepUnknown: 'Não entendi completamente o que você deseja fazer. Você gostaria de adicionar novas funcionalidades, remover alguma existente, ou finalizar a customização?',
    stepError: 'Ocorreu um erro ao processar sua solicitação de customização. Por favor, tente novamente.',
    addNoAi: 'Não consegui entender os detalhes da tabela que você deseja adicionar. Por favor, forneça o nome e a descrição da tabela.',
    addMissing: 'Não consegui identificar claramente o nome ou a descrição da tabela. Por favor, forneça essas informações no formato: "Quero adicionar uma tabela de [nome] para [descrição]".',
    addOk: (table: string) => `# Tabela Adicionada com Sucesso!\n\nA tabela "${table}" foi adicionada ao seu sistema.\n\nVocê gostaria de:\n\n${NEXT_STEPS.pt}`,
    addFailed: (table: string) => `Não foi possível adicionar a tabela "${table}". Ela pode já existir no sistema ou ocorreu um erro no processo.\n\nPor favor, tente um nome diferente ou escolha outra ação:`,
    addParseError: 'Não consegui processar corretamente as informações da tabela. Por favor, tente novamente com um formato mais claro, especificando o nome e a descrição da tabela.',
    addError: 'Ocorreu um erro ao processar a adição da tabela. Por favor, tente novamente.',
    removeUnknown: 'Não consegui identificar qual tabela você deseja remover. Por favor, especifique o nome exato da tabela que deseja remover.',
    removeModuleNote: (moduleName: string, tables: string) =>
      `\n\nEla faz parte do módulo "${moduleName}", que existe inteiro ou não existe: o módulo saiu junto, com as tabelas ${tables}.`,
    removeOk: (table: string, moduleNote: string) =>
      `# Tabela Removida com Sucesso!\n\nA tabela "${table}" foi removida do seu sistema.${moduleNote}\n\nVocê gostaria de:\n\n1. **Adicionar** uma nova funcionalidade\n2. **Remover** outra funcionalidade existente\n3. **Finalizar** a customização e criar o sistema`,
    removeNone: 'Não há tabelas que possam ser removidas. Todas as tabelas restantes são essenciais para o funcionamento do sistema.\n\nVocê gostaria de adicionar novas funcionalidades ou finalizar a customização?',
    removeNotFound: (table: string) => `Não encontrei a tabela "${table}" neste sistema.`,
    removeRefused: (reason: string, tables: string[]) =>
      `${reason}\n\nTabelas disponíveis para remoção:\n${tables.map((t) => `- ${t}`).join('\n')}\n\nPor favor, escolha uma das tabelas listadas ou selecione outra ação.`,
    removeError: 'Ocorreu um erro ao processar a remoção da tabela. Por favor, tente novamente.',
    tableFallbackDescription: (name: string) => `Tabela de ${name}`,
    addGuidanceFallback:
      '# Adicionando uma Nova Tabela\n\nPara adicionar uma nova tabela ao seu sistema, por favor forneça:\n\n1. **Nome da tabela** - Um nome claro e descritivo\n2. **Descrição** - Para que serve esta tabela?\n3. **Campos principais** - Quais informações ela deve armazenar?\n\nExemplo: "Quero adicionar uma tabela de Fornecedores para registrar informações de empresas que fornecem produtos para meu negócio, com campos como nome da empresa, contato, produtos fornecidos e condições de pagamento."',
    removeGuidanceFallback: (tables: string[]) =>
      `# Removendo uma Tabela\n\nPara remover uma tabela do seu sistema, por favor indique o nome da tabela que deseja remover.\n\nTabelas disponíveis para remoção:\n${tables.map((t) => `- ${t}`).join('\n')}\n\nExemplo: "Quero remover a tabela de Produtos"\n\n**Nota:** Algumas tabelas são essenciais para o funcionamento do sistema e não podem ser removidas.`,
  },
  en: {
    greeting: "Hi! To get started, please tell me about your business or project so I can understand how best to help you set up the system.",
    noPreset: "I couldn't find a preset that fits your business perfectly. Don't worry, we can build a fully custom system. Let's start by defining the main features you need.",
    presetFallback: (preset: string, features: string, modules: string[]) =>
      `Great! I found a **${preset}** system that matches what you need.\n\nWith it you'll be able to manage ${features} and much more.${modules.length > 0 ? `\n\nFrom what you told me, I also suggest these modules: ${modules.join(', ')}.` : ''}\n\nWould you like to **create the system now** or **customize** it first?`,
    customizationCompletedStage: 'Your customization is complete! The system will be created with all the changes you asked for.',
    aiUnavailable: "Sorry, I'm having trouble processing your request right now. Let's try again.",
    confirmSummary: (summary: string) => `Got it. So, in short, your business is: ${summary}. Is that correct?`,
    genericFallback: "Sorry, I couldn't process your request.",
    turnError: 'Sorry, something went wrong while processing your request. Please try again.',
    choiceNoMessage: "I didn't get your choice. Please tell me whether you want to customize the system or create it directly.",
    choiceCreate: 'Great! Your system will be created directly with the default settings.',
    choiceDeclined: 'I understand you would rather not customize. Do you want to **create the system now** with the default settings?',
    choiceUnclear: "I didn't get your choice. Would you rather **create the system now** or **customize** it first?",
    choiceSessionError: 'Sorry, something went wrong while preparing the customization. Do you want to try to **customize** again or **create the system now**?',
    choiceError: 'Sorry, something went wrong while processing your choice. Do you want to try to **customize** again or **create the system now**?',
    customizationIntro: (preset: string) =>
      `# Customizing the "${preset}" System\n\nPlease check the customization panel on the left to see all the current features of your system.\n\nWhat would you like to do now?\n\n1. **Add** new features\n2. **Remove** existing features\n3. **Finish** the customization and create the system`,
    requiredSuffix: ' (required)',
    mainFields: 'Main fields',
    tablesFallback: (preset: string, tables: string) =>
      `# Customizing the ${preset} System\n\n## Current Features\n\nThese are the tables and features included in your system:\n\n- ${tables}\n\n## Next Steps\n\nWould you like to:\n\n1. **Add** new features\n2. **Remove** an existing feature\n3. **Finish** the customization and create the system`,
    stepNoMessage: "I didn't understand your request. Please tell me what you want to do with the system customization.",
    customizationDone: (preset: string) =>
      `# Customization Complete!\n\nYour "${preset}" system has been customized and now includes all the features and tables you asked for.\n\nThe system will be created according to your specifications.`,
    stepUnknown: "I didn't fully understand what you want to do. Would you like to add new features, remove an existing one, or finish the customization?",
    stepError: 'Something went wrong while processing your customization request. Please try again.',
    addNoAi: "I couldn't understand the details of the table you want to add. Please give the table's name and description.",
    addMissing: 'I couldn\'t clearly identify the table\'s name or description. Please give them in this format: "I want to add a [name] table for [description]".',
    addOk: (table: string) => `# Table Added!\n\nThe "${table}" table has been added to your system.\n\nWould you like to:\n\n${NEXT_STEPS.en}`,
    addFailed: (table: string) => `The "${table}" table could not be added. It may already exist in the system, or something went wrong.\n\nPlease try a different name or choose another action:`,
    addParseError: "I couldn't process the table information. Please try again with a clearer format, giving the table's name and description.",
    addError: 'Something went wrong while adding the table. Please try again.',
    removeUnknown: "I couldn't identify which table you want to remove. Please give the exact name of the table.",
    removeModuleNote: (moduleName: string, tables: string) =>
      `\n\nIt belongs to the "${moduleName}" module, which exists as a whole or not at all: the module was removed with it, along with the tables ${tables}.`,
    removeOk: (table: string, moduleNote: string) =>
      `# Table Removed!\n\nThe "${table}" table has been removed from your system.${moduleNote}\n\nWould you like to:\n\n1. **Add** a new feature\n2. **Remove** another existing feature\n3. **Finish** the customization and create the system`,
    removeNone: 'There are no tables that can be removed. All the remaining tables are essential for the system to work.\n\nWould you like to add new features or finish the customization?',
    removeNotFound: (table: string) => `I couldn't find the "${table}" table in this system.`,
    removeRefused: (reason: string, tables: string[]) =>
      `${reason}\n\nTables available for removal:\n${tables.map((t) => `- ${t}`).join('\n')}\n\nPlease choose one of the listed tables or select another action.`,
    removeError: 'Something went wrong while removing the table. Please try again.',
    tableFallbackDescription: (name: string) => `Table of ${name}`,
    addGuidanceFallback:
      '# Adding a New Table\n\nTo add a new table to your system, please provide:\n\n1. **Table name** - A clear, descriptive name\n2. **Description** - What is this table for?\n3. **Main fields** - What information should it store?\n\nExample: "I want to add a Suppliers table to keep track of the companies that supply products to my business, with fields such as company name, contact, products supplied and payment terms."',
    removeGuidanceFallback: (tables: string[]) =>
      `# Removing a Table\n\nTo remove a table from your system, please tell me the name of the table you want to remove.\n\nTables available for removal:\n${tables.map((t) => `- ${t}`).join('\n')}\n\nExample: "I want to remove the Products table"\n\n**Note:** Some tables are essential for the system to work and cannot be removed.`,
  },
} satisfies Record<InterviewLocale, Record<string, unknown>>;
