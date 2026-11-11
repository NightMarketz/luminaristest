/**
 * X10a EMENDA-4 AL-17 — contrato compartilhado servidor ⇄ assinador local. O JSON Schema que o assinador (.NET, AL-PR-5)
 * consome é GERADO do Zod (`z.toJSONSchema()`, Zod 4, sem dependência nova) e commitado em `dtos/dfeSigner.schema.json`.
 * Este teste reprova se o gerado divergir do commitado: mudar o protocolo sem regenerar o arquivo não passa.
 *
 * PARA ATUALIZAR (mudança de protocolo intencional): UPDATE_DFE_SIGNER_SCHEMA=1 npx jest <este arquivo> --selectProjects unit
 */
import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';
import { DFE_SIGNER_PROTOCOL_SCHEMAS } from '../DfeSignerDto';

const FILE = path.resolve(__dirname, '../dfeSigner.schema.json');

function gerar(): string {
  const defs = Object.fromEntries(
    Object.entries(DFE_SIGNER_PROTOCOL_SCHEMAS).map(([nome, schema]) => [nome, z.toJSONSchema(schema, { io: 'input' })]),
  );
  return `${JSON.stringify({ protocolo: 'v1', $defs: defs }, null, 2)}\n`;
}

describe('dfeSigner.schema.json (AL-17)', () => {
  it('o JSON Schema commitado é o gerado do Zod', () => {
    const gerado = gerar();
    if (process.env.UPDATE_DFE_SIGNER_SCHEMA === '1') fs.writeFileSync(FILE, gerado);
    expect(fs.readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n')).toBe(gerado);
  });

  it('o pareamento é estrito: campo a mais é recusado (o assinador não manda subject nem chave)', () => {
    const corpo = { codigo: 'ABCDEFGHJKMN', nomeDispositivo: 'Caixa 1', versaoAssinador: '1.0.0', certificadoDerB64: 'A'.repeat(120) };
    expect(DFE_SIGNER_PROTOCOL_SCHEMAS.PareamentoBody.safeParse(corpo).success).toBe(true);
    expect(DFE_SIGNER_PROTOCOL_SCHEMAS.PareamentoBody.safeParse({ ...corpo, subject: 'CN=x' }).success).toBe(false);
    expect(DFE_SIGNER_PROTOCOL_SCHEMAS.PareamentoBody.safeParse({ ...corpo, versaoAssinador: '1.0' }).success).toBe(false);
  });
});
