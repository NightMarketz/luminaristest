# Relatório de pesquisa legal — fila-2026-10-27-bloco6-terceiros

**Pergunta:** Bloco 6 da fila (terceiros): (a) comparativo dos PSCs credenciados pelo ITI (lista vigente, API DOC-ICP-17.01, cota, preço, SLA) para e-CNPJ em nuvem; (b) Payouts do Mercado Pago: há operação em nome de terceiro (OAuth) ou só conta própria, e como se obtém a chave Ed25519
**Aberto em:** 2026-10-27T11:33:54-03:00 · **Atualizado em:** 2026-10-27T11:41:38-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão
### (a) PSCs credenciados: a escolha fica entre 2 ou 3, porque API e SLA são iguais por norma
- **A lista do ITI não mudou:** são os mesmos 8 PSCs de 11/10, atualizada em 17/09/2026 [D01]: ACDIGITAL, DIGITALSIGN, SERPRO, CERTISIGN, SOLUTI, SAFEWEB, VALID e SYNGULARID.
- **API e SLA não diferenciam.** A versão vigente do DOC-ICP-17.01 é a 3.0, aprovada pela IN ITI 20/2020 (a página do ITI lista a 2.3 entre as anteriores [D02]). Ela obriga todo PSC a:
  - oferecer "o framework OAuth 2.0 (RFC 6749 e RFC 7636)" com `<URI-base>/oauth/signature` e o escopo `signature_session`;
  - ter disponibilidade mínima de 99,99% [D03, 6.3.2 e 6.4].
  - A v2.3 (29/05/2020) [D04] tinha os mesmos pontos. O que muda entre PSCs é preço, cota, duração da sessão e venda para PJ.
- **Comparativo de 27/10** [D05, páginas lidas no navegador, com hash]:

| PSC | e-CNPJ em nuvem | Cota de assinaturas | Situação |
|---|---|---|---|
| DigitalSign (DS Cloud) | R$ 180 (12 meses), R$ 220 (24 meses) | "Sem Limite de Transações e Assinaturas" | candidato principal |
| Valid (VIDaaS) | R$ 208 (de R$ 238) | 6.000 por ano (12 ou 24 meses); 1.000 em 4 meses | a cota não cobre um caixa com 20 vendas por dia (6.240 por ano; conta do 11/10) |
| Certisign (nuvem) | R$ 324,40 (12 meses) | não informada | candidato, mas confirmar a cota |
| Safeweb (SafeID) | sem preço público | não informada; tem o produto "SafeID Integração", com APIs | pedir cotação |
| Soluti (Bird ID) | a página só mostra o PF (R$ 34,90 por mês ou R$ 149,90 por ano) | não informada para PJ | pedir cotação |
| Serpro (NeoID) | a loja oficial dá 404 na página de certificado | — | fora por ora (pista: venda suspensa) |
| SyngularID, ACDIGITAL | sem página de preço achada | — | fora do 1º corte |

- **Recomendação para o D5:**
  - mandar o pedido escrito de 11/10 (cota, duração máxima da `signature_session`, preço por volume, SE-S ou e-CNPJ A3) só para DigitalSign, Certisign e Safeweb;
  - a DigitalSign é a única com "sem limite" escrito, e a resposta dela decide.
  - "Quem contrata" continua sendo decisão do dono.

### (b) Payouts do Mercado Pago: só da conta de quem integra, e a chave passa pelo time de Integrações
- **O Payouts debita a conta do integrador.** A documentação oficial diz "a partir da sua conta Mercado Pago". Os pré-requisitos são conta, "saldo suficiente" e chave Pix do destinatário. O lote é um `POST /v1/payouts` com até 1000 transações, por transferência bancária ou Pix [D08].
- **A chave Ed25519 não é autosserviço.** O integrador gera o par com `openssl genpkey -algorithm ed25519`, assina o corpo no header `X-signature` e "Para enviar sua chave pública, você precisará se conectar com a equipe de Integrações" [D08]. É o "aprovada pelo time" do ADR, agora com texto oficial.
- **Não há operação em nome de terceiro documentada.** A página de credenciais do Payouts só tem o parágrafo genérico "Use o OAuth para gerenciar credenciais de terceiros" [D08]. Nada liga token OAuth de vendedor à chave Ed25519 ou ao débito na conta do vendedor. O guia oficial do MP no GitHub diz que o Payouts "is not [...] Marketplace split [...] or a seller's ordinary dashboard withdrawal" [D06].
- **Efeito no F6: o desenho muda, como a fila previa.** O Luminaris não opera o Payouts pelos clientes. Há duas saídas:
  - **(i) o cliente é o integrador.** Isso é o BYOK que você escolheu em 27/09. O cliente cria a aplicação no MP, gera o par de chaves, envia a pública ao time de Integrações do MP e cadastra no Luminaris o Access Token e a chave privada, que ficam cifrados em repouso (M2). É um passo humano por cliente, sem OAuth.
  - **(ii) Pix de saída pela API do banco do cliente**, que volta junto com o D6. É o §6.2 item 4 do ADR.
  - A (i) não depende de nada do MP além do contato com Integrações. Ela cabe numa emenda ao §6.2 do `ADR-INCR-PAYMENT-PROVIDER-COLLECTION`, a ser escrita só com autorização sua.

## 2. Fundamentação
| Ponto | Documento | Fonte | Trecho literal |
|---|---|---|---|
| Lista vigente | ITI, Lista de PSC | [D01] | "Atualizado em 17/09/2026" + 8 entradas "PSC …" |
| API única | DOC-ICP-17.01 v3.0, 6.4.1.2 | [D03] | "Deverá ser utilizado o framework OAuth 2.0 (RFC 6749 e RFC 7636) para implementação" |
| Sessão | idem | [D03] | "signature_session: token de sessão OAuth que permite várias assinaturas em" |
| SLA | idem, 6.3.2 | [D03] | "devem atender aos critérios mínimos de 99,99% de “nível de" |
| Sem limite | DigitalSign, DS Cloud | [D05] | "Sem Limite de Transações e Assinaturas" |
| Cota Valid | Valid, VIDaaS | [D05] | "6.000 assinaturas por ano para certificados de 12 meses (1 ano), 24 meses (2 anos)" |
| Origem do dinheiro | MP, Payouts, visão geral | [D08] | "a partir da sua conta Mercado Pago" |
| Chave pública | MP, Payouts, subir em produção | [D08] | "Para enviar sua chave pública, você precisará se conectar com a equipe de Integrações." |
| Não é marketplace | Guia oficial do MP (GitHub) | [D06] | "It is not Checkout, a buyer payment, Marketplace split, an Advanced Payment, or a seller's ordinary dashboard withdrawal." |

## 3. Vigência conferida
- O DOC-ICP-17.01 v3.0 [D03] entra em vigor pelo art. 4º da IN ITI 20/2020 ("em 1° de dez[embro de 2020]"). Não se buscou IN posterior que o altere; a página do ITI de 27/10 [D02] lista a v3.0 como título do documento.
- Preços: páginas de loja de 27/10 [D05]; mudam sem aviso.
- MP: as páginas do site de desenvolvedores foram lidas em 27/10 [D08]. O guia do GitHub [D06] é do commit 8458eb50, de 24/08/2026.
- **Divergência:** o guia [D06] diz que o Brasil usa um contrato "single Transaction Intent" com um destino por requisição. O site [D08] mostra o lote `/v1/payouts` com até 1000 transações em BRL. Conferir o contrato no momento de integrar. Isso não muda a conclusão sobre de quem é a conta.

## 4. Ambiguidades (só o que precisa de decisão humana)
- **F6 pelo caminho (i) ou (ii).** Decisão sua de produto, não de lei.
  - (i): cada salão faz um contato com o MP e o Luminaris guarda a chave privada do cliente. A guarda já está prevista no ADR, cifrada.
  - (ii): depende do banco de cada cliente.
  - Leitura mais simples: (i) para quem já recebe pelo MP (F5), (ii) quando houver cliente com CNAB (D6).
- **Quem contrata o PSC (D5).** Segue com você. A pesquisa só reduz a escolha a DigitalSign, com Certisign e Safeweb como alternativas.

## 5. Lacunas
- Preço e cota de Safeweb, Soluti PJ, SyngularID e ACDIGITAL: só com cotação.
- A duração máxima da `signature_session` de cada PSC não é pública.
- A Referência de API do Payouts (o formato do `X-signature` na página de referência) não foi aberta.
- Não foi perguntado ao MP se a aplicação do Luminaris poderia operar Payouts com token OAuth do cliente: só o time de Integrações responde.

## Fontes fora do manifest (não são domínio oficial aceito pelo `legal.py`)
- **[D05]** `docs/D05_psc-precos-navegador.txt`: páginas de loja de Valid, DigitalSign, Soluti, Certisign, Safeweb e Serpro, lidas no navegador embutido em 27/10, com o SHA-256 do texto de cada uma.
- **[D06]** `docs/D06_mp-payouts-guide.md`: `mercadopago/mercadopago-claude-marketplace`, `plugins/mercadopago/skills/mp-integrate/references/guides/payouts.md`, commit 8458eb50, baixado por `gh api`. SHA-256 `67991fe0e3fd73215087041fa18dd3f39f37f2812f150bf0bf310d3f24751073`.
- **[D07]** `docs/D07_mp-llms.txt`: https://www.mercadopago.com.br/developers/llms.txt devolveu erro (44 bytes). SHA-256 `b492ad28…`.
- **[D08]** `docs/D08_mp-payouts-navegador.txt`: páginas `developers/pt/docs/payouts/*`, lidas no navegador embutido em 27/10, com o SHA-256 de cada uma.
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** Lista de Prestadores de Serviço de Confiança - PSC — Instituto Nacional de Tecnologia da Informação — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www.gov.br/iti/pt-br/assuntos/icp-brasil/lista-de-prestadores-de-servico-de-confianca-psc>  
  Baixado em 2026-10-27T11:33:55-03:00 · arquivo local `docs/D01_lista-de-prestadores-de-servico-de-confianca-psc.html` · SHA-256 `2f3f87297e225cc131a78fa69744c8bd13697555ee70d6aeb84b16e461730d70`
- **[D02]** Documentos Principais — Instituto Nacional de Tecnologia da Informação — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www.gov.br/iti/pt-br/assuntos/legislacao/documentos-principais>  
  Baixado em 2026-10-27T11:33:55-03:00 · arquivo local `docs/D02_documentos-principais.html` · SHA-256 `89ff6dae591aa8d9815c1737de6a79b0c0749e40f0ce04b58cfc49c0370daa52`
- **[D03]** D03_IN_20_2020_DOC_17-01_assinada-pdf — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www.gov.br/iti/pt-br/assuntos/legislacao/instrucoes-normativas/IN_20_2020_DOC_17.01_assinada.pdf>  
  Baixado em 2026-10-27T11:34:31-03:00 · arquivo local `docs/D03_IN_20_2020_DOC_17-01_assinada-pdf.pdf` · SHA-256 `250483a6b21a6bd2fac9a31e5ed6a1ee56a36b89d86d3ca2b9ffd6831b10b136`
- **[D04]** D04_DOCICP17-01verso2-3PROCEDIMENTOSOPERACIONAISMNIMOSPARAOSPRES — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www.gov.br/iti/pt-br/assuntos/legislacao/documentos-principais/DOCICP17.01verso2.3PROCEDIMENTOSOPERACIONAISMNIMOSPARAOSPRESTADORESDESERVIODECONFIANADAICPBRASIL.pdf>  
  Baixado em 2026-10-27T11:34:32-03:00 · arquivo local `docs/D04_DOCICP17-01verso2-3PROCEDIMENTOSOPERACIONAISMNIMOSPARAOSPRES.pdf` · SHA-256 `9181b47a7f5f7660b6f5bed087a5c630d3515e22e38623500b34d55a1676d945`

## Registro de buscas
_Nenhuma busca registrada._
