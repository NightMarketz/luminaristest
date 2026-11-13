import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// L-20261113-152233-4b14: Modal declarava showCloseButton/headerActions e ignorava os dois — quem passasse
// achava que funcionava. Sem chamador (WizardModal tem os próprios), saem da interface. Guarda estática.
describe('Modal — sem props mortas', () => {
  it('não declara showCloseButton nem headerActions', () => {
    const src = readFileSync(join(__dirname, '..', 'Modal.tsx'), 'utf8');
    expect(src).not.toMatch(/showCloseButton|headerActions/);
  });
});
