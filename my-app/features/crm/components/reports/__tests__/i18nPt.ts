import i18next from 'i18next';
import pt from '../../../../../public/locales/pt/crm.json';

/**
 * `useTranslation` dos testes do builder de relatórios com o i18next REAL e o `crm.json` pt — o teste lê o texto que o
 * usuário vê e quebra se uma chave nova faltar no arquivo (item 21). Uso: `vi.mock('next-i18next', async () =>
 * (await import('./i18nPt')).nextI18nextPt())`.
 */
export async function nextI18nextPt() {
  const inst = i18next.createInstance();
  await inst.init({ lng: 'pt', fallbackLng: false, ns: ['crm'], defaultNS: 'crm', resources: { pt: { crm: pt } }, interpolation: { escapeValue: false } });
  const t = inst.getFixedT('pt', 'crm');
  return { useTranslation: () => ({ t, i18n: { language: 'pt-BR' } }) };
}
