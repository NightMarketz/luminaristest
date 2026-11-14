import { SEFAZ_ENDPOINTS, type SefazEndpoint } from '../sefaz/sefazConfig';

/**
 * X10a EMENDA-4 AL-11 — a lista de hosts que o assinador local aceita no `TRANSMITIR`: gerada da tabela oficial de
 * endpoints (`sefazEndpoints.data.json`, E-11), só `https`, ordenada e sem repetição. O arquivo `sefazHosts.json` é a
 * saída commitada que o pacote do assinador embarca (AL-PR-5); o teste falha se ele divergir do que esta função gera
 * (`UPDATE_SEFAZ_HOSTS=1` regenera). O servidor manda a URL; o assinador recusa host fora da lista (`HOST_FORA_DA_LISTA`).
 */
export function hostsDoTransporte(endpoints: readonly SefazEndpoint[] = SEFAZ_ENDPOINTS): string[] {
  const hosts = new Set<string>();
  for (const e of endpoints) {
    const u = new URL(e.url);
    if (u.protocol !== 'https:') continue;
    hosts.add(u.host.toLowerCase());
  }
  return [...hosts].sort();
}
