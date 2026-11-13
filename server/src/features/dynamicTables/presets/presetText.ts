import { DEFAULT_INTERVIEW_LOCALE, type InterviewLocale } from '../../interview/models/interviewText';

/**
 * Nome e descrição dos presets selecionáveis por idioma da UI (lacuna L-20261111-204322-37cb; dono, chat,
 * 2026-11-11: "Sim, localizar"). O `name`/`description` escritos no preset são o texto em português (idioma padrão do
 * produto, como `DEFAULT_INTERVIEW_LOCALE`); o inglês vive aqui. Preset sem entrada cai no texto do próprio preset.
 */
const PRESET_TEXT_EN: Record<string, { name: string; description: string }> = {
  beautySalon: {
    name: 'Advanced Beauty Salon ERP',
    description: 'Complete management solution for salons with scheduling, inventory, sales, financials, and marketing.',
  },
  aestheticClinic: {
    name: 'Aesthetic Clinic ERP',
    description:
      'Complete management solution for aesthetic clinics: appointments, clinical customer registry, ' +
      'inventory of cosmetics/products, service catalog, prepaid packages, sales, and full financials.',
  },
  crmModule: {
    name: 'CRM Module',
    description: 'Full CRM: lead funnel, proposals, activities, accounts and contacts.',
  },
};

const PRESET_TEXT_PT_OVERRIDE: Record<string, { name: string; description: string }> = {
  beautySalon: {
    name: 'ERP Avançado para Salão de Beleza',
    description: 'Solução completa de gestão para salões, com agenda, estoque, vendas, finanças e marketing.',
  },
  aestheticClinic: {
    name: 'ERP para Clínica de Estética',
    description:
      'Solução completa de gestão para clínicas de estética: agenda, cadastro clínico de clientes, estoque de ' +
      'cosméticos/produtos, catálogo de serviços, pacotes pré-pagos, vendas e financeiro completo.',
  },
};

export function localizePresetText(
  preset: { key: string; name: string; description: string },
  locale: InterviewLocale = DEFAULT_INTERVIEW_LOCALE,
): { name: string; description: string } {
  const own = { name: preset.name, description: preset.description };
  if (locale === 'en') return PRESET_TEXT_EN[preset.key] ?? own;
  return PRESET_TEXT_PT_OVERRIDE[preset.key] ?? own;
}
