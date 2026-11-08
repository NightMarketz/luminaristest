/**
 * BE-INCR-EFD-REINF PR-3 (BRIEF itens 23–24) — todo código de aviso do relatório e os dois 400 que o BRIEF chama de
 * `PERFIL_SEM_NATUREZA`/`CONTATO_SEM_CPF` (lacuna C, dono 28/10) têm texto em pt e en, com o mesmo conjunto de chaves.
 */
import fs from 'fs';
import path from 'path';
import { REINF_AVISO_CODIGOS } from '../ReinfDto';

const locale = (lang: 'pt' | 'en') =>
  (JSON.parse(fs.readFileSync(path.resolve(__dirname, `../../../../../../my-app/public/locales/${lang}/accounting.json`), 'utf8')) as {
    reinf: { avisos: Record<string, string>; erros: Record<string, string> };
  }).reinf;

describe('i18n da Reinf (itens 23–24)', () => {
  it.each(['pt', 'en'] as const)('%s: um texto por código de aviso, com {{quantidade}}', (lang) => {
    const { avisos } = locale(lang);
    expect(Object.keys(avisos).sort()).toEqual([...REINF_AVISO_CODIGOS].sort());
    for (const c of REINF_AVISO_CODIGOS) expect([c, avisos[c]]).toEqual([c, expect.stringContaining('{{quantidade}}')]);
  });

  it('pt e en: os dois 400 do cadastro (natureza e contato do R-1000), mesmas chaves', () => {
    expect(Object.keys(locale('pt').erros).sort()).toEqual(['NATUREZA_RENDIMENTO_SEM_MAPA', 'REINF_SEM_CONTATO']);
    expect(Object.keys(locale('en').erros).sort()).toEqual(Object.keys(locale('pt').erros).sort());
  });
});
