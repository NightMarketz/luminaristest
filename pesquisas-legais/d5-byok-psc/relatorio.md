# Relatório de pesquisa legal — d5-byok-psc

**Pergunta:** BYOK com e-CNPJ em nuvem (PSC): o PSC pode assinar NF-e/NFC-e (rsa-sha1)? cadastro da aplicação? mTLS?
**Aberto em:** 2026-10-30T02:26:56-03:00 · **Atualizado em:** 2026-10-30T02:50:54-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão
**O maior risco do BYOK por PSC é o SHA-1, não o mTLS. Em 30/10 ele virou conflito de norma verificado.**

- **A SEFAZ continua exigindo SHA-1 (verificado).** O MOC online oficial do Paraná (Aj. SINIEF 40/26), "Atualizado até a
  NT 2026.007 v.1.10 publicada em 01/10/2026", fixa XS06 = `http://www.w3.org/2000/09/xmldsig#rsa-sha1` e XS16 =
  `xmldsig#sha1` [D05]. A NT 2026.001 v1.00 (PAA, 03/2026), a mais nova sobre assinatura, também usa SHA1 e não muda o
  `SignatureMethod`: o campo ZG04 manda "assinar com a chave privada do RSA com algoritmo SHA1" [X02]. Nenhuma nota
  técnica migra para SHA-256 nesta data.
- A DOC-ICP-01.01 v6.0, quadro "Assinaturas Digitais ICP-Brasil", lista como **suíte de assinatura** só sha256/sha512
  com RSA/ECDSA, EdDSA e ML-DSA. **Não há `sha1WithRSAEncryption`** [D01]. O SHA-1 saiu das suítes pela IN ITI 08/2019 [D02].
- A DOC-ICP-17.01 v3.0 §7.5.1 manda o PSC seguir a DOC-ICP-01.01 nos algoritmos (dossiê
  `fila-2026-10-27-bloco6-terceiros` [D03]).
- **Leitura (inferida):** o PSC não deve produzir assinatura `rsa-sha1`. O SerproID confirma na prática: o
  `hash_algorithm` aceita só SHA-256 e SHA-512 [D04].
- Na Safeweb e no BirdID o OID é campo livre e a documentação não lista os aceitos [X01]. O BirdID Pro (produto
  licenciado) aceita "SHA1" na preparação [X01], o que é **indício** de que o PSC da Soluti assina SHA-1.
  DigitalSign e Certisign não publicam documentação de API.

**mTLS: tecnicamente possível em ao menos um PSC.** O BirdID publica um driver PKCS#11 e uma engine OpenSSL (libp11),
"utilizado principalmente para autenticação, listagem de objetos e assinatura" [X01]. Uma pilha TLS comum consegue
fazer o handshake com a chave em nuvem. Grau: **inferido**, a partir de documentação de fornecedor e sem teste.

**Cadastro da aplicação sem compra:** sai no BirdID (`POST /v0/oauth/application`, sem certificado) e na Safeweb
("cadastro gratuito"). Na Safeweb há planos com "cobranças extras" por consumo [X01]. A Valid só integra por um canal
comercial (IntegraICP) [X01].

## 2. Fundamentação
| Ponto | Norma (art.) | Fonte | Trecho literal |
|---|---|---|---|
| Suítes de assinatura ICP sem SHA-1 | DOC-ICP-01.01 v6.0, quadro "Assinaturas Digitais ICP-Brasil" | [D01] | "Suíte de Assinatura sha256WithRSAEncryption sha256WithECDSAEncryption sha512WithRSAEncryption ..." |
| Retirada do SHA-1 | IN ITI 08/2019, ementa | [D02] | "retirar dos Algoritmos e Suítes de Assinatura a função hash SHA-1" |
| PSC segue a DOC-ICP-01.01 | DOC-ICP-17.01 v3.0 §7.5.1 | dossiê bloco6 [D03] | "Todos os algoritmos e tamanho de chaves [...] encontram-se definidos no documento DOC-ICP-01.01" |
| SerproID só SHA-2 | Manual de integração SerproID | [D04] | "valores possíveis: 2.16.840.1.101.3.4.2.1 [...] SHA-2 256 e 2.16.840.1.101.3.4.2.3 [...] SHA-2 512" |
| Cadastro sem certificado é opcional | DOC-ICP-17.01 v3.0 §6.4.6.1 | dossiê bloco6 [D03] | "Cadastro de Aplicação sem Certificado" (em "Serviços de Confiança Opcionais") |
| SEFAZ exige rsa-sha1 hoje | MOC NF-e/NFC-e online, Visão Geral, XS06 e XS16 | [D05] | "Atributo Algorithm de SignatureMethod: http://www.w3.org/2000/09/xmldsig#rsa-sha1" |
| MOC online atualizado | idem, cabeçalho | [D05] | "Atualizado até a NT 2026.007 v.1.10 publicada em 01/10/2026" |
| PAA também em SHA1 | NT 2026.001 v1.00, campo ZG04 | [X02] | "assinar com a chave privada do RSA com algoritmo SHA1" |
| SEFAZ aceita A1 ou A3 com CNPJ | MOC online §4.2.3 | [D05] | "tipo A1 ou A3, devendo conter o CNPJ da pessoa jurídica titular" |
| Tipos atuais valem até 02/03/2029; depois, Selo Eletrônico para PJ | Res. CG ICP-Brasil 211/2024, FAQ do ITI, perguntas 01–03 | [D06] | "Até 02/03/2029 todos os tipos de certificados hoje existentes [...] poderão ser utilizados" |
| Responsável técnico e CSRT a critério da UF | MOC online §2.2.10 | [D05] | "A critério da UF, para os estados que exigem o credenciamento de software emissor de DF-e, poderá ser exigido [...] CSRT" |
| CSRT só onde há cadastro de software; ativo só no PR (mod. 55) | NT 2018.005 v1.40, regra ZD07-10 | [D07] | "Implementação a critério da UF para os estados que possuem cadastro de fornecedor de software [...] Regra válida para o PR, modelo 55" |
| Regra 972 (infRespTec) a critério da UF | NT 2020.005 v1.20, regra ZD01-10 | [D08] | "Não informado o grupo de informações do responsável técnico Observação: Implementação a critério da UF" |
| SP não autoriza nem homologa software | FAQ NFC-e SEFAZ-SP | [X04] | "Não é necessário autorizar qualquer equipamento ou software na SEFAZ para emitir a NFC-e" |
| Ambiente de teste de SP só para contribuinte | idem | [X04] | "disponível para os contribuintes do ICMS" |

## 3. Vigência conferida
- DOC-ICP-01.01: a versão compilada do ITI é a v6.0, com a redação da IN ITI 35/2026 [D01][D03]. A IN 08/2019 [D02]
  está marcada "REVOGADA", porque foi consolidada nas versões seguintes. A v6.0 mantém o SHA-1 fora das suítes.
- MOC: a partir de 01/11/2026 vale o "MOC da NF-e" online mantido pelo Paraná (Aj. SINIEF 40/26). **Conferido em
  30/10** [D05]: atualizado até a NT 2026.007 v1.10 (01/10/2026), com `rsa-sha1` e `sha1`, igual ao MOC 7.0. Não há
  nota técnica de migração para SHA-256.
- O acervo `ctresb/leis` não tem documentos do ITI (árvore consultada em 30/10: 0 caminhos `/iti/`). Por isso a fonte foi
  direto a oficial.

## 4. Ambiguidades (só o que precisa de decisão humana)
- **A NF-e é "assinatura digital ICP-Brasil" para a DOC-ICP-01.01?**
  - Leitura (i): não. A NF-e é XMLDSig simples, fora das políticas CAdES/XAdES/PAdES da DOC-ICP-15, e o PSC poderia
    assinar SHA-1.
  - Leitura (ii): sim, para o PSC. O §7.5.1 da DOC-ICP-17.01 vale para todo serviço de assinatura do PSC, e o PSC não
    assina SHA-1.
  - Leitura mais segura: a (ii). Não é pergunta para contador nem advogado: quem resolve é **um teste real** (o PSC
    aceita ou recusa o OID 1.3.14.3.2.26). Como o MOC online não aceita SHA-256 [D05], resta só o teste.
  - **Conflito verificado entre as duas normas:** a SEFAZ exige `rsa-sha1` [D05] e o ITI não tem SHA-1 nas suítes de
    assinatura [D01]. Com certificado de arquivo ou token, a chave fica com o contribuinte e nada impede o SHA-1. Num
    PSC, a política do HSM decide, e o SerproID já recusa [D04].
- **PKCS#11 com credencial do titular × DOC-ICP-17.01 6.4.3.2.1** ("as aplicações não deverão coletar fatores de
  autenticação do titular"). O driver pede login (C_Login), e não se sabe se o servidor do Luminaris pode guardar esse
  login. Leitura mais segura: só com o login feito pelo titular, na forma que o PSC documentar.

## 5. Lacunas
- Lista de OIDs aceitos pela Safeweb, pelo BirdID, pela DigitalSign e pela Certisign: nenhum publica.
- Documentação de API da DigitalSign e da Certisign: não achada.
- Preço do e-CNPJ em nuvem PJ da Soluti (BirdID) e da Safeweb: não publicado.
- NT 2026.001: só a v1.00 foi lida [X02]. As v1.01, v1.02 e v1.02a não foram lidas; as notícias não indicam mudança
  de algoritmo.

- **SP, conferido em 30/10:** o CSRT não se aplica, porque SP não credencia software (inferido forte, [D07] + [X04]).
  Para a regra 972 (`infRespTec`) não achei ato de SP que a ative; **não verificado**, e só a homologação responde. O
  [D09] é a página do FAQ de SP salva pelo `baixar`, mas veio sem conteúdo (1.379 caracteres); o texto vale pelo [X04].
- **Caminho A3 com assinador local (30/10):** Também não achei norma da
  SEFAZ que admita o Selo Eletrônico (pós-2029) na NF-e: o MOC diz "A1 ou A3". O texto da Res. CG ICP-Brasil 211/2024
  não foi lido; só o FAQ oficial do ITI [D06].

**Fora do manifesto:**
- **[X04]** `docs/X04_sefaz-sp-nfce-faq-navegador.txt`: FAQ oficial da NFC-e da SEFAZ-SP, salvo do texto renderizado no
  navegador, com SHA-256 do texto, porque o servidor entrega a página vazia a script.
- **[X03]** `docs/X03_lojas-a3-token-navegador.txt`: preços de loja de e-CNPJ A1, A3 em token e A3 em cartão da
  DigitalSign, da Certisign e da Safeweb, lidos em 30/10. É dado comercial.
- **[X01]** `docs/X01_psc-docs-fornecedores-navegador.txt`: documentação de fornecedor, não é fonte oficial. Linhas
  literais de BirdID, Safeweb, Valid, DigitalSign e Certisign, lidas em 30/10.
- **[X02]** `docs/X02_NT2026-001_v1-00_PAA.pdf` (+ `.txt` extraído): NT 2026.001 v1.00, fonte **oficial**
  (<https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=52e8psumXNc%3D>). Baixada por `curl` com cookie
  em 30/10, porque o `legal.py baixar` entra em laço de redirecionamento. SHA-256
  `B1514106678D8F3617266F92D3EADF98B8F10C6A7F240804FC1A9508D32AA65C`.
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
- **[D05]** Manual da NF-e — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <http://moc.sped.fazenda.pr.gov.br/NFe_NFCe/VisaoGeral.html>  
  Baixado em 2026-10-30T02:35:49-03:00 · arquivo local `docs/D05_VisaoGeral-html.html` · SHA-256 `7869d3726b407c988030087b19d2efa4421f5b96c9353c93a9bd09a9994f9eb2`
- **[D06]** Perguntas Frequentes - CG ICP-Brasil — Instituto Nacional de Tecnologia da Informação — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www.gov.br/iti/pt-br/assuntos/comite-gestor/perguntas-frequentes-cg-icp-brasil>  
  Baixado em 2026-10-30T02:39:11-03:00 · arquivo local `docs/D06_perguntas-frequentes-cg-icp-brasil.html` · SHA-256 `1fbca433a21a3f48b952129527dce81a7821ac1c9fd5aa9a0969313e30d1fb27`
- **[D07]** D07_DownloadArquivoEstatico — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://dfe-portal.svrs.rs.gov.br/NFE/DownloadArquivoEstatico/?sistema=NFE&tipoArquivo=3&nomeArquivo=NT2018%20005_v1_40-AlteracaodeleiauteNF-eNFC-e.pdf>  
  Baixado em 2026-10-30T02:48:06-03:00 · arquivo local `docs/D07_DownloadArquivoEstatico.html` · SHA-256 `817cdba0654a4cd6cf72af52fd67bbb588f7a22aa7bedc8a026d041e91438af7`
- **[D08]** D08_DownloadArquivoEstatico — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://dfe-portal.svrs.rs.gov.br/NFE/DownloadArquivoEstatico/?sistema=NFE&tipoArquivo=3&nomeArquivo=Nota%20T%C3%A9cnica%202020.005%20-%20v1.20%20-%20Regras%20de%20Valida%C3%A7%C3%A3o.pdf>  
  Baixado em 2026-10-30T02:48:51-03:00 · arquivo local `docs/D08_DownloadArquivoEstatico.html` · SHA-256 `b0a750234d4c2b2f79f44f1fbdef33c2e51c6f98347952b01633cde5942b0737`
- **[D09]** Perguntas Frequentes — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://portal.fazenda.sp.gov.br/servicos/nfce/Paginas/perguntas-frequentes.aspx>  
  Baixado em 2026-10-30T02:49:36-03:00 · arquivo local `docs/D09_perguntas-frequentes-aspx.html` · SHA-256 `f930b129274d3b61a6fe72c977d054bf5327d12627ea80a7522ceb0ce8f0fe11`

## Registro de buscas
_Nenhuma busca registrada._
