/**
 * Integration project only (globalSetup). Aquece o banco-modelo UMA vez, antes do 1º arquivo: sem isto, o `db push`
 * frio caía dentro do `beforeAll` (5 s) do primeiro arquivo de cada shard do CI. Depois disto, o `templateDb()` do
 * `pushTestSchema()` acha o modelo e só copia.
 */
import { templateDb } from './helpers/templateDb';

export default async (): Promise<void> => {
  templateDb();
};
