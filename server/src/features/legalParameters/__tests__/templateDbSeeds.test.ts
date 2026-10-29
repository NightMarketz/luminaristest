/**
 * Achado 3 (fora de escopo do #965; dono, chat, 2026-10-29): o banco-modelo da integração aplica a lista
 * `LEGAL_PARAMS_SEEDS`, e cada arquivo de `prisma/data/legal_parameters*.sql` é semente que uma migração carrega.
 * Arquivo fora da lista = linhas que a produção tem e a suíte de integração não, e o hash do modelo não muda quando ele muda.
 */
import fs from 'fs';
import path from 'path';
import { LEGAL_PARAMS_SEEDS, SERVER_DIR } from '@test/helpers/templateDb';

describe('templateDb — LEGAL_PARAMS_SEEDS', () => {
  it('cobre todo prisma/data/legal_parameters*.sql', () => {
    const dataDir = path.join(SERVER_DIR, 'prisma', 'data');
    const noDisco = fs.readdirSync(dataDir).filter((f) => /^legal_parameters.*\.sql$/.test(f)).sort();
    const naLista = LEGAL_PARAMS_SEEDS.map((f) => path.basename(f));
    expect(noDisco.filter((f) => !naLista.includes(f))).toEqual([]);
  });
});
