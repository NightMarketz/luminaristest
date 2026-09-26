# Transcrição — MOC 7.0 (Visão Geral), padrão de assinatura digital da NF-e 4.00 (2026-09-26)

> **B0 do [`BE-INCR-NFE-SIGNATURE-brief.md`](../BE-INCR-NFE-SIGNATURE-brief.md)** (SIG-NFE, passo 2.4; autorização do
> dono 26/09, *"executa o SIG-NFE 2.4"*). Transcreve os parâmetros que travam os B2–B5. Cada teste do
> `nfeSignature` cita a **chave** `[SIG-…]` da linha que ele exercita.
>
> **Fonte:** Portal da NF-e → Documentos → Manuais → *"Manual de Orientação ao Contribuinte - MOC - versão 7.0 - NF-e e
> NFC-e"*, <https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=LrBx7WT9PuA=> (o host exige cookie
> de sessão: `curl -c cj -b cj -L -A "<UA de navegador>"`). Baixado 2026-09-26: PDF 1.7, 150 páginas, 4.304.647 bytes,
> sha256 `f664dcf94b77cabb32311620d85a7eb02cdf86adb2d4632ce178af2572dd2ad1`. **Não commitado** (PDF, `.gitignore`);
> o MANIFEST registra a origem. O MOC 7.0 é o manual do **leiaute 4.00** (p. 19, §2.2.6.1: "versão 4.00 do leiaute da
> NF-e (NT 2018.001)"); a mesma versão 7.0 é a fonte do `BE-INCR-NFE-layout-transcription.md` (Anexo I).
>
> Para reconferir: baixar a URL, `pdftotext -layout` e procurar "4.2.4. Padrão de Assinatura Digital" (pp. 52–55).

## 1. Parâmetros (tabela do leiaute XS01–XS21, p. 53–54, e Tabela 4-2, p. 54–55)

| chave | parâmetro | valor exigido | onde no MOC |
|---|---|---|---|
| `[SIG-C14N]` | `SignedInfo/CanonicalizationMethod/@Algorithm` | `http://www.w3.org/TR/2001/REC-xml-c14n-20010315` | XS04, p. 53 |
| `[SIG-ALG]` | `SignedInfo/SignatureMethod/@Algorithm` | `http://www.w3.org/2000/09/xmldsig#rsa-sha1` | XS06, p. 53; Tabela 4-2 ("RSA") |
| `[SIG-DIGEST]` | `Reference/DigestMethod/@Algorithm` | `http://www.w3.org/2000/09/xmldsig#sha1` | XS19–XS21, p. 54; Tabela 4-2 ("SHA-1") |
| `[SIG-REF-1]` | `Reference` — ocorrência | **1-1** | XS07, p. 53 |
| `[SIG-TRANSFORMS]` | `Transforms/Transform` — ocorrência e valores | **2-2**; atributo `Algorithm` **único** entre os dois (XS11 `unique_Transf_Alg`); valores válidos: `http://www.w3.org/2000/09/xmldsig#enveloped-signature` e `http://www.w3.org/TR/2001/REC-xml-c14n-20010315`. O exemplo da p. 54 e a Tabela 4-2 ("Transformações exigidas") trazem a ordem **Enveloped, depois C14N** | XS12–XS16, p. 54; Tabela 4-2 |
| `[SIG-REF-URI]` | `Reference/@URI` | `#` + `infNFe/@Id`. Literal do MOC: a assinatura "será feita na TAG `<infNFe>` identificada pelo atributo Id", e o identificador "precedido do literal `#NFe`" vai no `URI` da `Reference` | p. 54, parágrafo após a tabela |
| `[SIG-X509]` | `KeyInfo/X509Data/X509Certificate` | 1-1, certificado X.509 em Base64. Tabela 4-2: "EndCertOnly (Incluir na assinatura apenas o certificado do usuário final)" | XS20–XS21, p. 54; Tabela 4-2 |
| `[SIG-ENVELOPED]` | formato | "XML Digital Signature", formato **Enveloped**; a `<Signature>` é irmã de `<infNFe>` dentro de `<NFe>` (exemplo da p. 54) e declara o namespace `http://www.w3.org/2000/09/xmldsig#` na própria tag (§4.2.1.2, p. 50) | Tabela 4-2; p. 50 e 54 |
| `[SIG-CODIF]` | codificação | Base64 | Tabela 4-2 |

## 2. Certificado — regra do CNPJ e da validade

| chave | regra | onde no MOC |
|---|---|---|
| `[SIG-CERT-CNPJ-OID]` | O certificado é ICP-Brasil, tipo A1 ou A3, e contém o CNPJ da PJ titular "no campo OtherName OID =2.16.76.1.3.3" (ou o CPF, OID 2.16.76.1.3.1, para e-CPF) | §4.2.3, p. 52; §4.2.4.1, p. 55 |
| `[SIG-CERT-CNPJ]` | O certificado de **assinatura** "deverá conter o CNPJ/CPF de um dos estabelecimentos da empresa emissora da NF-e" (repetido em §4.2.4: "CNPJ de um dos estabelecimentos da empresa emissora"). **Leitura:** qualquer estabelecimento da mesma empresa ⇒ a comparação é pela **raiz** (8 primeiras posições) do CNPJ, não pelos 14 dígitos — é o que o F-SIG-3 (b) do BRIEF ratificou | §4.2.3, p. 53; §4.2.4, p. 53 |
| `[SIG-CERT-ECPF]` | Com e-CPF (NT 2018.001), "o CPF constante no certificado digital deverá coincidir com o CPF do emitente da NF-e" | §4.2.4.1, p. 55 |
| `[SIG-CERT-VALIDADE]` | Procedimento de validação da SEFAZ: (a) extrair a chave pública; **(b) verificar o prazo de validade do certificado**; (c) montar e validar a cadeia + LCR; (d) uso da chave = assinatura digital (tipo A); (e) certificado de usuário final, não de AC; (f)–(h) RFC 3280, integridade e prazo das LCR | §4.2.5, p. 55 |

## 3. O que esta transcrição NÃO fixa (e onde isso fica)

- **Cadeia ICP-Brasil + LCR** (`[SIG-CERT-VALIDADE]` itens c, f, g, h): exige as raízes do ITI (dado externo). Fica
  para o F-SIG-3 (c), o nó seguinte. **Sem ela, quem re-assina o XML adulterado com um certificado próprio que
  carregue o CNPJ passa.**
- **Uso da chave / tipo A / usuário final** (itens d, e): fora do F-SIG-3 (b) ratificado; não implementado.
- **Momento da validade:** a SEFAZ confere a validade no **recebimento**. O F-SIG-3 (b) ratificado confere contra o
  `dhEmi`, que é o que um importador que recebe a nota depois consegue verificar. A comparação é por **data**
  (AAAA-MM-DD, reslice), não por instante.
- **Codificação ASN.1 do valor do OtherName** (OCTET STRING × string imprimível): o MOC não fixa; é do DOC-ICP-04
  (ICP-Brasil), que **não** foi transcrito. O verificador aceita OCTET STRING, PrintableString, UTF8String e
  IA5String e exige 14 posições. **Inferido, não verificado** — só um XML real assinado (D2/E9) prova.
- O **e-CPF** (`[SIG-CERT-ECPF]`) não está no F-SIG-3 (b), que fala só de CNPJ: lacuna de spec registrada no PR
  do 2.4. Enquanto isso, nota de emitente pessoa física (`emit/CPF`) **é recusada**: não há CNPJ para conferir.
