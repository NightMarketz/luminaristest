/**
 * Teste-guarda (sessao-instrumentacao) — GAP-MAP "Wizard — `validateFields` morto" (ponto #19 da
 * auditoria de modelos de decisão, 2026-09-30). `FieldCustomizationService.validateFields` não tem
 * chamador em `server/src` nem em `my-app`, e decide "válido" por `!response.includes('recomend')`
 * sobre texto livre do LLM; o `FIELD_VALIDATION_PROMPT` só existe para ele. Decisão do dono
 * (2026-09-30, chat): "#19: posso seguir com a remoção do validateFields morto".
 *
 * Varre a fonte em vez de importar: o módulo cria o singleton (e o OpenAIService) no import.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const dir = join(__dirname, '..');
const source = (file: string) => readFileSync(join(dir, file), 'utf8');

describe('FieldCustomizationService — sem validação de campos morta', () => {
  it('nem validateFields nem FIELD_VALIDATION_PROMPT existem no módulo', () => {
    expect(source('index.ts')).not.toMatch(/validateFields|FIELD_VALIDATION_PROMPT/);
    expect(source('PromptConfig.ts')).not.toMatch(/FIELD_VALIDATION_PROMPT/);
  });
});
