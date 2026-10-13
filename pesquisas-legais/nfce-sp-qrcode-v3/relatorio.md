# Relatório de pesquisa legal — nfce-sp-qrcode-v3

**Pergunta:** L-NFCE-1: a SEFAZ-SP aceita NFC-e de PJ com QR Code versão 3, sem CSC?
**Aberto em:** 2026-10-13T00:55:34-03:00 · **Atualizado em:** 2026-10-13T01:28:37-03:00
**Método:** somente fontes oficiais; documentos baixados e com hash para referência.

<!-- ANALISE -->
## 1. Conclusão
**Não confirmado: não há fonte oficial de SP que aceite o QR Code v3 sem CSC.** O material oficial da SEFAZ-SP diz o
contrário: o CSC "é requisito de validade do DANFE NFC-e" e deve estar no emissor antes da 1ª nota [D03] FAQ #30, e
obtê-lo é requisito para emitir [D03] FAQ #14. A página de webservices e QR Code de SP não menciona a versão 3 [D04].
Pela regra do F-NFCE-E1-4 ratificada em 13/10, o ramo é **(c): v3 por padrão, com v2 + CSC por UF onde a v3 for
recusada**. Para SP, o Luminaris precisa receber, cifrar e guardar o CSC (model `NfceCsc`).

Achados extras da mesma fonte, para as outras perguntas de lei da emenda:
- **L-NFCE-5:** é preciso **credenciamento** do estabelecimento como emitente de NFC-e, feito no portal com
  certificado e de forma individual por estabelecimento [D03] FAQ #14, #15, #59. O software **não** precisa de
  homologação nem de autorização [D03] FAQ #17, #41.
- **L-NFCE-4:** o DANFE pode deixar de ser impresso e ir em formato eletrônico ou só pela chave, **se o adquirente
  concordar** [D03] FAQ #26, base no Ajuste SINIEF 19/16 cl. 10ª §3º.
- **L-NFCE-3:** o cancelamento vai até **30 minutos** da autorização e exige que a mercadoria ainda não tenha saído
  [D03] FAQ #37, o que confere com a errata de 10/10.

## 2. Fundamentação
| Ponto | Norma (art.) | Fonte | Trecho literal |
|---|---|---|---|
| CSC obrigatório em SP | FAQ oficial SEFAZ-SP #30 | [D03] | "O CSC é requisito de validade do DANFE NFC-e" |
| Requisitos de emissão | FAQ #14 | [D03] | "Solicitar o Código de Segurança do Contribuinte (CSC) de produção" |
| Credenciamento | FAQ #59 | [D03] | "O credenciamento é individual para cada estabelecimento" |
| Software sem homologação | FAQ #17 | [D03] | "sem necessidade de homologação" |
| Webservices/QR SP sem v3 | página oficial | [D04] | (lista URLs; nenhuma menção a versão 3) |

## 3. Vigência conferida
- A FAQ foi lida pela API oficial do portal em 13/10/2026 (lista "Perguntas Frequentes", 59 itens). Ela não traz data
  por item e **não é norma**. A NT 2025.001 v1.02 (Portal NF-e) põe a v3 como opção da PJ, com aceitação
  parametrizada por UF (rej. 407); o PDF não foi baixado porque o servidor entrou em loop de redirecionamento.

## 4. Ambiguidades
- **A FAQ pode estar desatualizada em relação à NT 2025.001.** Leituras: (i) SP ainda exige CSC, e a v3 não está
  liberada para PJ; (ii) SP já aceita a v3, e a FAQ não foi revista. Implicação: com (i), guardar o CSC é obrigatório;
  com (ii), seria dispensável. **Leitura mais segura: (i)**, e o ramo (c) cobre as duas, porque tenta a v3 e cai para
  a v2. Pergunta exata ao **Fale Conosco da SEFAZ-SP (assunto NFC-e)**, e não a contador: *"A SEFAZ-SP já aceita em
  produção NFC-e de emitente PJ com QR Code versão 3 (NT 2025.001), sem CSC? Se não, há data prevista?"* O runbook de
  homologação também responde: basta enviar uma v3 em homologação e ver se volta a rejeição 407.

## 5. Lacunas
- Nenhum ato normativo de SP sobre a v3 foi encontrado.

## 6. Rodada 2 (13/10) — portal oficial de SP, listas e páginas
- A página "Regras de validação facultativas por UF" de SP [D05] lista as regras ativas e inativas. **A regra do QR
  v3 (rejeição 407) não aparece**; o único "407" na página é parte de "B06-40 / 775".
- A página "Sobre" [D06], com notícias até setembro de 2026 (protocolo de 17 posições em 05/10/2026, manutenção em
  20/09/2026), **não fala da v3** e repete: "para que o contribuinte possa emitir NFC-e, é necessário obter o código
  de segurança".
- As listas "Legislação" e "Downloads" do portal (lidas pela API oficial) param no Manual do DANFE v4.1 e não têm a
  NT 2025.001.
- **Conclusão mantida:** não há confirmação oficial de que SP aceite a v3 de PJ. Toda a fonte oficial de SP aponta o
  CSC como obrigatório. O ramo (c) segue: v3 tentada, v2 + CSC como caminho real em SP. **Só duas coisas fecham a
  dúvida:** a resposta do Fale Conosco da SEFAZ-SP ou uma v3 enviada em homologação (rejeição 407 ou não). Ambas ficam
  fora do alcance do agente: a primeira é mensagem em nome do dono, a segunda exige credenciamento e certificado.
<!-- /ANALISE -->

## Fontes oficiais consultadas
- **[D01]** Perguntas Frequentes — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://portal.fazenda.sp.gov.br/servicos/nfce/Paginas/perguntas-frequentes.aspx>  
  Baixado em 2026-10-13T00:56:29-03:00 · arquivo local `docs/D01_perguntas-frequentes-aspx.html` · SHA-256 `23629bb9a699aecea71ccaf447321b1144f492e82268b543edb40c7951f4aa85`
- **[D02]** Páginas
	- 
	Sobre a Nota Fiscal de Consumidor Eletrônica — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://portal.fazenda.sp.gov.br/servicos/nfce>  
  Baixado em 2026-10-13T00:56:29-03:00 · arquivo local `docs/D02_nfce.html` · SHA-256 `ec59d58a33d29d9f5b09a53490093e28760dbb6a2fdaab558f5538632a2b7b25`
- **[D03]** D03_items — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://portal.fazenda.sp.gov.br/servicos/nfce/_api/web/lists/getByTitle('Perguntas%20Frequentes')/items?$select=Id,Title,Resposta,Assunto&$top=1000>  
  Baixado em 2026-10-13T00:57:07-03:00 · arquivo local `docs/D03_items.html` · SHA-256 `47efc811a21b6d50190790a93dbb7ac0f2f235febe2ffd4d9bf620ee996eb236`
- **[D04]** WebServices — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://portal.fazenda.sp.gov.br/servicos/nfce/Paginas/WebServices.aspx>  
  Baixado em 2026-10-13T00:57:23-03:00 · arquivo local `docs/D04_WebServices-aspx.html` · SHA-256 `142ca899c20baca5cad81e1e12debc9a5d943cdf7d7eb14e15e5e1efa488f005`
- **[D05]** Regras de validação facultativas por UF — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://portal.fazenda.sp.gov.br/servicos/nfce/Paginas/Regras-de-validacao.aspx>  
  Baixado em 2026-10-13T01:24:58-03:00 · arquivo local `docs/D05_Regras-de-validacao-aspx.html` · SHA-256 `8c03febbc068f73fe8fd3494bfa514c7a671c70535cc23de19370565703c7bdd`
- **[D06]** Páginas
	- 
	Sobre a Nota Fiscal de Consumidor Eletrônica — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://portal.fazenda.sp.gov.br/servicos/nfce/Paginas/Sobre.aspx>  
  Baixado em 2026-10-13T01:24:59-03:00 · arquivo local `docs/D06_Sobre-aspx.html` · SHA-256 `3d2bf48476f41bf5719084af3a1e557ce4db275e54c8ddc6bb0b457cb2bfd994`

## Registro de buscas
_Nenhuma busca registrada._
