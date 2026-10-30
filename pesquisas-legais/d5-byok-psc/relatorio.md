# Relatório de pesquisa legal — d5-byok-psc

**Pergunta:** BYOK com e-CNPJ em nuvem (PSC): o PSC pode assinar NF-e/NFC-e (rsa-sha1)? cadastro da aplicação? mTLS?
**Aberto em:** 2026-10-30T02:26:56-03:00 · **Atualizado em:** 2026-10-30T02:30:55-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão
**O maior risco do BYOK por PSC é o SHA-1, não o mTLS.**

- A NF-e e a NFC-e assinam com `rsa-sha1` e digest `sha1` (MOC 7.0 §4.2.3–4.2.5, transcrito em
  `docs/accounting/fontes-oficiais/TRANSCRICAO-MOC70-assinatura-digital-NFe-2026-09-26.md`, chaves `[SIG-ALG]` e
  `[SIG-DIGEST]`).
- A DOC-ICP-01.01 v6.0, quadro "Assinaturas Digitais ICP-Brasil", lista como **suíte de assinatura** só sha256/sha512
  com RSA/ECDSA, EdDSA e ML-DSA. **Não há `sha1WithRSAEncryption`** [D01]. O SHA-1 saiu das suítes pela IN ITI 08/2019 [D02].
- A DOC-ICP-17.01 v3.0 §7.5.1 manda o PSC seguir a DOC-ICP-01.01 nos algoritmos (dossiê
  `fila-2026-10-27-bloco6-terceiros` [D03]).
- **Leitura (inferida):** o PSC não deve produzir assinatura `rsa-sha1`. O SerproID confirma na prática: o
  `hash_algorithm` aceita só SHA-256 e SHA-512 [D04].
- Na Safeweb e no BirdID o OID é campo livre e a documentação não lista os aceitos [D05]. O BirdID Pro (produto
  licenciado) aceita "SHA1" na preparação [D05], o que é **indício** de que o PSC da Soluti assina SHA-1.
  DigitalSign e Certisign não publicam documentação de API.

**mTLS: tecnicamente possível em ao menos um PSC.** O BirdID publica um driver PKCS#11 e uma engine OpenSSL (libp11),
"utilizado principalmente para autenticação, listagem de objetos e assinatura" [D05]. Uma pilha TLS comum consegue
fazer o handshake com a chave em nuvem. Grau: **inferido**, a partir de documentação de fornecedor e sem teste.

**Cadastro da aplicação sem compra:** sai no BirdID (`POST /v0/oauth/application`, sem certificado) e na Safeweb
("cadastro gratuito"). Na Safeweb há planos com "cobranças extras" por consumo [D05]. A Valid só integra por um canal
comercial (IntegraICP) [D05].

## 2. Fundamentação
| Ponto | Norma (art.) | Fonte | Trecho literal |
|---|---|---|---|
| Suítes de assinatura ICP sem SHA-1 | DOC-ICP-01.01 v6.0, quadro "Assinaturas Digitais ICP-Brasil" | [D01] | "Suíte de Assinatura sha256WithRSAEncryption sha256WithECDSAEncryption sha512WithRSAEncryption ..." |
| Retirada do SHA-1 | IN ITI 08/2019, ementa | [D02] | "retirar dos Algoritmos e Suítes de Assinatura a função hash SHA-1" |
| PSC segue a DOC-ICP-01.01 | DOC-ICP-17.01 v3.0 §7.5.1 | dossiê bloco6 [D03] | "Todos os algoritmos e tamanho de chaves [...] encontram-se definidos no documento DOC-ICP-01.01" |
| SerproID só SHA-2 | Manual de integração SerproID | [D04] | "valores possíveis: 2.16.840.1.101.3.4.2.1 [...] SHA-2 256 e 2.16.840.1.101.3.4.2.3 [...] SHA-2 512" |
| Cadastro sem certificado é opcional | DOC-ICP-17.01 v3.0 §6.4.6.1 | dossiê bloco6 [D03] | "Cadastro de Aplicação sem Certificado" (em "Serviços de Confiança Opcionais") |

## 3. Vigência conferida
- DOC-ICP-01.01: a versão compilada do ITI é a v6.0, com a redação da IN ITI 35/2026 [D01][D03]. A IN 08/2019 [D02]
  está marcada "REVOGADA", porque foi consolidada nas versões seguintes. A v6.0 mantém o SHA-1 fora das suítes.
- MOC: a partir de 01/11/2026 vale o "MOC da NF-e" online mantido pelo Paraná (Aj. SINIEF 40/26). **Não conferi** se a
  versão online aceita `rsa-sha256`; a transcrição é do MOC 7.0.
- O acervo `ctresb/leis` não tem documentos do ITI (árvore consultada em 30/10: 0 caminhos `/iti/`). Por isso a fonte foi
  direto a oficial.

## 4. Ambiguidades (só o que precisa de decisão humana)
- **A NF-e é "assinatura digital ICP-Brasil" para a DOC-ICP-01.01?**
  - Leitura (i): não. A NF-e é XMLDSig simples, fora das políticas CAdES/XAdES/PAdES da DOC-ICP-15, e o PSC poderia
    assinar SHA-1.
  - Leitura (ii): sim, para o PSC. O §7.5.1 da DOC-ICP-17.01 vale para todo serviço de assinatura do PSC, e o PSC não
    assina SHA-1.
  - Leitura mais segura: a (ii). Não é pergunta para contador nem advogado: quem resolve é **um teste real** (o PSC
    aceita ou recusa o OID 1.3.14.3.2.26) ou o MOC online passar a aceitar SHA-256.
- **PKCS#11 com credencial do titular × DOC-ICP-17.01 6.4.3.2.1** ("as aplicações não deverão coletar fatores de
  autenticação do titular"). O driver pede login (C_Login), e não se sabe se o servidor do Luminaris pode guardar esse
  login. Leitura mais segura: só com o login feito pelo titular, na forma que o PSC documentar.

## 5. Lacunas
- Lista de OIDs aceitos pela Safeweb, pelo BirdID, pela DigitalSign e pela Certisign: nenhum publica.
- Documentação de API da DigitalSign e da Certisign: não achada.
- Preço do e-CNPJ em nuvem PJ da Soluti (BirdID) e da Safeweb: não publicado.
- Texto do MOC online (Paraná) sobre o algoritmo de assinatura: não lido. A busca de 30/10 não achou a URL nem nota
  técnica que troque SHA-1 por SHA-256 na NF-e.
- NT 2026.001 (PAA da NF-e), PDF oficial em `nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=52e8psumXNc%3D`: o
  `baixar` falhou (redirecionamento em laço por cookie) e o navegador embutido teve a navegação recusada. Não lida.
  Interessa porque mostraria o algoritmo que a própria SEFAZ aceita na assinatura do PAA.

**[D05]** (fora do manifesto: documentação de fornecedor, não é fonte oficial):
`docs/D05_psc-docs-fornecedores-navegador.txt`, com as linhas literais de BirdID, Safeweb, Valid, DigitalSign e
Certisign, lidas em 30/10.
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** D01_IN2022_22_DOC_ICP_01-01_compilada-pdf — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www.gov.br/iti/pt-br/assuntos/legislacao/documentos-principais/IN2022_22_DOC_ICP_01.01_compilada.pdf>  
  Baixado em 2026-10-30T02:26:57-03:00 · arquivo local `docs/D01_IN2022_22_DOC_ICP_01-01_compilada-pdf.pdf` · SHA-256 `6f975ac2b6dbdf578a1723687521a371e0cdf69adab7d3f0b9ab6bcaf71bf84e`
- **[D02]** D02_IN2019_08_DOC-ICP-01-01-htm — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://repositorio.iti.gov.br/instrucoes-normativas/IN2019_08_DOC-ICP-01.01.htm>  
  Baixado em 2026-10-30T02:30:24-03:00 · arquivo local `docs/D02_IN2019_08_DOC-ICP-01-01-htm.html` · SHA-256 `2d33f7be10e64ab78fc0dc745b2b840a7f08b0911ece0f70e35eeacba55c1637`
- **[D03]** D03_IN2026_35_DOC_ICP_01-01_PQC-htm — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://repositorio.iti.gov.br/instrucoes-normativas/IN2026_35_DOC_ICP_01.01_PQC.htm>  
  Baixado em 2026-10-30T02:30:24-03:00 · arquivo local `docs/D03_IN2026_35_DOC_ICP_01-01_PQC-htm.html` · SHA-256 `2d25791c4224eda63316291d770045fceccc3ddd6ec6c0630ba875fed240ed94`
- **[D04]** Assinatura digital - SerproID - Manual de integração — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://serproid.serpro.gov.br/manual-integracao/utilizacao-certificado/assinatura-digital/>  
  Baixado em 2026-10-30T02:30:29-03:00 · arquivo local `docs/D04_assinatura-digital.html` · SHA-256 `ef20baf846436193ddc4c6bca7f3c8998a002de1e27afe7cee435b0640a243b1`

## Registro de buscas
_Nenhuma busca registrada._
