# Dossiê — API Integra Contador (Serpro): o que entrega, autenticação, procuração, custo e limites

- **Pergunta:** o que a API Integra Contador entrega de fato para que o Luminaris entregue à Receita o que hoje só sai
  como arquivo (reabertura da R5, 21/11/2026).
- **Coleta:** 21/11/2026, `curl` das páginas da documentação oficial (MkDocs estático em
  `apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/`) e o `innerText` da loja oficial
  (`loja.serpro.gov.br/product/integracontador`, carregada por JavaScript). O texto de cada página é o `<article>` sem
  tags. O `manifest.json` traz a URL, o SHA-256 do HTML e do texto e a data.
- **Não é norma.** É documentação técnica e comercial do Serpro: vale como fonte do que a API faz, não do direito. As
  questões legais (efeito de confissão pelo canal, procuração eletrônica, termos de uso) ficam em
  `docs/adr/PRE-ADR-INTEGRA-CONTADOR.md` §8.

## Conclusão (detalhe no PRE-ADR §2)

1. Há API para **PGDAS-D** (transmitir, calcular sem transmitir, comparar com o nosso valor, gerar DAS) [D18, D19],
   **MIT** (encerrar com o JSON do leiaute de importação; situação gratuita) [D13, D14], **DCTFWeb** (XML assinado pelo
   autor) [D16], **Sicalc** (DARF com acréscimos e Pix) [D22] e **Pagamentos** [D25].
2. **Não há** Reinf, ECD, ECF ou eSocial no catálogo [D04]. Não há homologação com dado real; o trial é mock [D10, D11].
3. **Autenticação:** OAuth2 com Consumer Key/Secret e **o e-CNPJ do contratante no TLS**; o NI tem de bater com o
   certificado [D03, D06]. Sem procuração quando o autor do pedido é o próprio contribuinte [D05].
4. **Custo:** por chamada, em faixas mensais; 200, 202 e 403 são cobrados; Apoiar e Monitorar são gratuitos; 504 não é
   tarifado e é **estado indeterminado** [D06, D07, D08, D26].
5. `folhasSalario` passa a ser obrigatório no PGDAS-D para PA posterior a 10/2026 [D21].

## Fontes

| ID | Documento | URL |
|---|---|---|
| D01 | Introdução | https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/ |
| D02 | Como contratar | …/pt/como_contratar/ |
| D03 | Como autenticar na API | …/pt/quick_start/ |
| D04 | Catálogo de Serviços | …/pt/catalogo_de_servicos/ |
| D05 | Serviços x Procuração | …/pt/servicos_vs_procuracoes/ |
| D06 | Dúvidas/FAQ | …/pt/faq/ |
| D07 | Códigos de retorno | …/pt/codigos_retorno/ |
| D08 | Política de Timeout | …/pt/timeout/ |
| D09 | X-Request-Tag | …/pt/identificador_requisicoes/ |
| D10 | Demonstração (trial) | …/pt/como_usar_a_demonstracao_da_api/ |
| D11 | Cenários trial do MIT | …/pt/cenarios_trial/cenarios_mit/ |
| D12–D14 | MIT: introdução, encerrar, situação | …/pt/solucoes/integra-dctfweb/mit/… |
| D15–D16 | DCTFWeb: introdução, transmitir | …/pt/solucoes/integra-dctfweb/dctfweb/… |
| D17–D21 | PGDAS-D: introdução, entregar, gerar DAS, domínio, changelog | …/pt/solucoes/integra-sn/pgdasd/… |
| D22 | Sicalc: emitir DARF | …/pt/solucoes/integra-sicalc/sicalc/servicos/consolidar_emitir_um_darf/ |
| D23–D24 | Autentica Procurador: introdução, envio do XML | …/pt/solucoes/integra-contador-gerenciador/autenticaprocurador/… |
| D25 | PagtoWeb | …/pt/solucoes/integra-pagamento/pagtoweb/ |
| D26 | Loja: preço e contratação (captura) | https://loja.serpro.gov.br/product/integracontador |
| D27 | Procurações: obter procuração | …/pt/solucoes/integra-procuracoes/procuracoes/servicos/obter_procuracao/ |

## Pistas de mercado (não oficiais, fora do dossiê)

Omie e Alterdata: centrais de ajuda dos fornecedores, lidas em 21/11/2026. Resumo e links no PRE-ADR §3.

## Lacunas da coleta

- O API Reference (swagger de produção), as páginas de saída do PGDAS-D, os dados de domínio do Sicalc e as páginas de
  serviço do PagtoWeb não foram lidos. São insumos do BRIEF §6.
- A duração do token (`expires_in`) não aparece nas páginas lidas.
- O contrato de adesão do Integra Contador não é público: fica no fluxo de contratação, com login e e-CNPJ.
- A norma da procuração (autorização de acesso, IN RFB 2.320/2026) está no dossiê legal `pesquisas-legais/procuracao-eletronica-ecac`.
- A loja não traz data de atualização da tabela de preços.
