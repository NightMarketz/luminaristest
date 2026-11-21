import fs from 'node:fs';
import path from 'node:path';
import { SEFAZ_ENDPOINTS } from '../../sefaz/sefazConfig';
import { hostsDoTransporte } from '../sefazHosts';

/** X10a EMENDA-4 AL-11 — a lista embarcada no assinador cobre toda URL da tabela de endpoints (propriedade). */
const ARQUIVO = path.join(__dirname, '..', 'sefazHosts.json');

describe('AL-11 — lista de hosts do transporte do assinador local', () => {
  it('o sefazHosts.json commitado é o que a tabela gera (UPDATE_SEFAZ_HOSTS=1 regenera)', () => {
    const gerado = { geradoDe: 'server/src/features/accounting/dfe/sefaz/sefazEndpoints.data.json', hosts: hostsDoTransporte() };
    if (process.env.UPDATE_SEFAZ_HOSTS === '1') fs.writeFileSync(ARQUIVO, `${JSON.stringify(gerado, null, 2)}\n`);
    expect(JSON.parse(fs.readFileSync(ARQUIVO, 'utf8'))).toEqual(gerado);
  });

  it('toda URL da tabela tem o host na lista; a lista só tem hosts da tabela', () => {
    const lista = new Set(hostsDoTransporte());
    for (const e of SEFAZ_ENDPOINTS) expect(lista.has(new URL(e.url).host.toLowerCase())).toBe(true);
    expect(lista.size).toBe(new Set(SEFAZ_ENDPOINTS.map((e) => new URL(e.url).host.toLowerCase())).size);
  });

  it('só https entra (uma linha http é descartada)', () => {
    expect(hostsDoTransporte([{ ...SEFAZ_ENDPOINTS[0], url: 'http://inseguro.example/ws' }])).toEqual([]);
  });
});
