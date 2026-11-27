import type { SefazServico } from './sefazConfig';

/**
 * SefazTransporte — X10a EMENDA-4 AL-1 (`BE-INCR-NFCE-EMENDA-4-assinador-local-brief.md` §4.1; `ADR-INCR-DFE-EMISSAO-PARCEIRO`
 * §14 item 2): o que o `SefazNfeEmissor` precisa do transporte, extraído do `SefazSoapClient`. Duas implementações:
 * `SefazSoapClient` (mTLS a partir do servidor — hoje só o falso dos testes) e o `AssinadorLocalTransporte` (o mTLS sai
 * do caixa do cliente, com o certificado dele).
 */
export interface SefazTransporte {
  /**
   * Envia `xml` (o conteúdo da área `nfeDadosMsg`) ao serviço em `url` e devolve o conteúdo de `nfeResultMsg`.
   * Falha de transporte ⇒ `SefazTransporteError` com um dos quatro códigos (`sefaz_timeout | sefaz_tls | sefaz_http |
   * sefaz_resposta_ilegivel`) — é ela que liga a contingência automática (decisão 4 de 29/10).
   */
  call(url: string, servico: SefazServico, xml: string): Promise<string>;
}
