/**
 * Integration project only (globalSetup). Aquece o banco-modelo UMA vez, antes do 1º arquivo: sem isto, o `db push`
 * frio caía dentro do `beforeAll` (5 s) do primeiro arquivo de cada shard do CI. Depois disto, o `templateDb()` do
 * `pushTestSchema()` acha o modelo e só copia.
 */
import { templateDb } from './helpers/templateDb';

// Vaga de trabalho pesado da máquina (scripts/heavy-slot.cjs; dono, chat, 2026-11-04: "Me da um prompt para implementar
// todas as 7 sugestões"). Fica aqui, e não no jest.config.js ao lado do test-scope-guard, porque só este globalSetup
// sabe que a integração vai rodar (unit não pega vaga) e porque ele pode esperar. A vaga sai quando o processo do jest
// termina; no CI não faz nada.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { acquire } = require('../../scripts/heavy-slot.cjs') as {
  acquire: (o: { label: string }) => Promise<() => void>;
};

export default async (): Promise<void> => {
  await acquire({ label: `jest integração (${process.cwd()})` });
  templateDb();
};
