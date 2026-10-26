/**
 * NFE-DANFE-IBSCBS PR-1, item 4 (F-DANFE-3 b): `readNfeTree` é a leitura protegida que `parseNfe` e o leitor do DANFE
 * compartilham. A outra metade do item ("o parseNfe passa a usá-lo sem mudar comportamento") é a suíte de `nfe.test.ts`,
 * que segue verde sem edição.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { readNfeTree } from '../nfe';
import { ValidationError } from '../errors';

const FULL = readFileSync(join(__dirname, 'fixtures', 'nfe', 'purchase-full-layout.SYNTHETIC.xml'), 'utf8');

describe('readNfeTree — guardas compartilhadas (item 4)', () => {
  it('nota assinada e íntegra ⇒ devolve a árvore com nfeProc', () => {
    const tree = readNfeTree(FULL);
    expect(tree.nfeProc).toBeDefined();
  });

  it('<!DOCTYPE ⇒ ValidationError antes do parse (XXE / billion-laughs)', () => {
    const withDoctype = '<?xml version="1.0"?>\n<!DOCTYPE nfeProc [<!ENTITY x "y">]>\n' + FULL.split('\n').slice(1).join('\n');
    expect(() => readNfeTree(withDoctype)).toThrow(ValidationError);
    expect(() => readNfeTree(withDoctype)).toThrow(/DOCTYPE/);
  });

  it('assinatura adulterada (infNFe mudou depois de assinado) ⇒ erro', () => {
    const adulterada = FULL.replace('<vNF>544.89</vNF>', '<vNF>999.99</vNF>');
    expect(adulterada).not.toBe(FULL);
    expect(() => readNfeTree(adulterada)).toThrow();
  });

  it('aceita Buffer', () => {
    expect(readNfeTree(Buffer.from(FULL, 'utf8')).nfeProc).toBeDefined();
  });
});
