/**
 * W5 item 1 (F-W5-1 → b): teste de TIPOS — compilado por `npx tsc -p tsconfig.test.json`. O `@ts-expect-error` abaixo
 * vira erro de compilação se `SelectablePresetSuite` deixar de exigir `aiProfile` (a guarda some → este arquivo quebra).
 */
import { tablePresetSuites, type PresetSuite, type SelectablePresetSuite } from '..';

// Toda suíte do registro é selecionável (o `satisfies` em `index.ts` garante; aqui a atribuição repete a prova).
const registry: Record<string, Record<string, SelectablePresetSuite>> = tablePresetSuites;

// `key` presente: o único motivo do erro abaixo é a falta de `aiProfile`.
const semPerfil: PresetSuite & { key: string } = { key: 'semPerfil', tables: {} };

// @ts-expect-error — suíte sem `aiProfile` não é uma suíte selecionável.
const invalida: SelectablePresetSuite = semPerfil;

// @ts-expect-error — `aiProfile` sem `description` também não serve.
const perfilIncompleto: SelectablePresetSuite = { key: 'x', tables: {}, aiProfile: { name: 'X' } };

describe('W5 item 1 — tipo do perfil de IA', () => {
  it('as suítes do registro carregam aiProfile em runtime', () => {
    for (const category of Object.values(registry)) {
      for (const suite of Object.values(category)) {
        expect(suite.aiProfile.name.length).toBeGreaterThan(0);
        expect(suite.aiProfile.description.length).toBeGreaterThan(0);
      }
    }
    expect([invalida, perfilIncompleto]).toHaveLength(2);
  });
});
