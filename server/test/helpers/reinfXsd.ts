/**
 * BE-INCR-EFD-REINF PR-1 (item 5; F-REINF-6 a, F-REINF-7 a) — valida um XML no XSD OFICIAL da Reinf (pacote v2.1.2 "CNPJ
 * alfanumérico", cópia byte a byte em `src/lib/reinf/xsd/`) com o libxml2 em WebAssembly (`xmllint-wasm`, devDependency).
 * O `xmldsig-core-schema.xsd` (W3C) entra como pré-carga porque todo evento o importa por `schemaLocation` relativo.
 */
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { validateXML } from 'xmllint-wasm';

export const REINF_XSD_DIR = join(__dirname, '../../src/lib/reinf/xsd');

/** O XSD cujo nome começa por `prefixo` (ex.: 'R-4020', 'envioLoteEventosAssincrono'). */
export function xsdReinf(prefixo: string): string {
  const f = readdirSync(REINF_XSD_DIR).find((n) => n.startsWith(prefixo) && n.endsWith('.xsd'));
  if (!f) throw new Error(`XSD da Reinf não encontrado: ${prefixo}`);
  return f;
}

export async function validarNoXsdReinf(xml: string, prefixo: string): Promise<{ valid: boolean; errors: string[] }> {
  const f = xsdReinf(prefixo);
  const r = await validateXML({
    xml: [{ fileName: 'evento.xml', contents: xml }],
    schema: [{ fileName: f, contents: readFileSync(join(REINF_XSD_DIR, f), 'utf8') }],
    preload: [{ fileName: 'xmldsig-core-schema.xsd', contents: readFileSync(join(REINF_XSD_DIR, 'xmldsig-core-schema.xsd'), 'utf8') }],
  });
  return { valid: r.valid, errors: r.errors.map((e) => e.message ?? e.rawMessage) };
}
