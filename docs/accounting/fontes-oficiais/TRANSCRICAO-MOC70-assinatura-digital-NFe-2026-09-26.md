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

## 3. Regras de rejeição da SEFAZ (MOC 7.0 **Anexo I**, §4.1.4–4.1.5, pp. 73–74) — acrescentado 26/09

Fonte: Portal NF-e → Manuais → *"Anexo I - Leiaute e Regra de Validação - NF-e e NFC-e"*,
<https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=J%20I%20v4eN00E=>, baixado 2026-09-26, PDF 1.7,
153 pp., 4.106.196 bytes, sha256 `5eb4cf2010b10b0b62f78197c4eb64025f24535d4c6e61158bc7806dd008f55d`. Decisões do dono
26/09 sobre a pesquisa de mercado: e-CPF → implementar; NFA-e → (c); codificação → corrigir pela norma.

| chave | regra | rejeição | onde |
|---|---|---|---|
| `[SIG-REJ-291]` | E02 — validade do certificado (data início e data fim) | 291 | p. 73 |
| `[SIG-REJ-292]` | E03 — falta a extensão de CNPJ (OtherName OID 2.16.76.1.3.3) **ou** a de CPF (OID 2.16.76.1.3.1) (NT 2018.001) | 292 | p. 73 |
| `[SIG-REJ-213]` | F03 — certificado com CNPJ: "CNPJ-Base do Emitente difere do CNPJ-Base do Certificado Digital", ressalvado o CNPJ da SEFAZ da UF (texto do PDF embaralhado na extração — leitura **inferida**) | 213 | p. 74 |
| `[SIG-REJ-227]` | F03A — certificado com CPF: "CPF do Emitente difere do CPF do Certificado Digital" (NT 2018.001) | 227 | p. 74 |
| `[SIG-SERIE-NFAE]` | Observação do campo `serie` (B07): 000–889 app do contribuinte, emitente CNPJ, e-CNPJ do contribuinte; 890–899 NFA-e no site do Fisco, emitente CNPJ/CPF, **e-CNPJ da SEFAZ** (`procEmi=1`); 900–909 NFA-e, emitente CNPJ, e-CNPJ da SEFAZ (`procEmi=1`) ou do contribuinte (`procEmi=2`); 910–919 NFA-e, emitente CPF, e-CNPJ da SEFAZ (`procEmi=1`) ou e-CPF do contribuinte (`procEmi=2`); 920–969 app do contribuinte, emitente CPF, e-CPF | — | p. 9 |

Implementado: 292 sempre; com `procEmi=1` o emissor **não** é conferido (decisão (c): só a cadeia ICP prova que é a
SEFAZ, e com F-SIG-3 (b) quem re-assina já escolhe o CNPJ); fora disso, 213 se o certificado tem CNPJ, senão 227.
E01 (KeyUsage/BasicConstraints), E04–E07 (cadeia, LCR, raiz ICP) ficam para o F-SIG-3 (c).

## 4. Norma ICP-Brasil — DOC-ICP-04 **v8.3** (acrescentado 26/09)

Fonte: ITI, *Resolução CG ICP-Brasil nº 179/2020, compilada* (DOC-ICP-04 "versão 8.3" no rodapé; item 7.1.2.2 com
redação da Resolução nº 211/2024), <https://www.gov.br/iti/pt-br/assuntos/legislacao/documentos-principais/resolucao179_doc-icp-04_compilada.pdf>,
baixado 2026-09-26, 732.810 bytes, sha256 `0603dbb47ea9f1928a5e6f72168a2f6dfe1ad2796b394aa6ad6ac92282a9c9a8`.

| chave | regra | onde |
|---|---|---|
| `[SIG-OTHERNAME-TIPO]` | 7.1.2.2 a) valor de todo otherName em ASN.1 **OCTET STRING ou PRINTABLE STRING**; b) número indisponível é preenchido com caracteres "zero"; g) só A–Z e 0–9 | p. 24 |
| `[SIG-CERT-CNPJ-OID]` | Anexo, e-CNPJ: OID 2.16.76.1.3.3 = "nas 14 (quatorze) posições" o CNPJ da PJ titular | p. 35 |
| `[SIG-CERT-CPF-OID]` | Anexo, e-CPF: OID 2.16.76.1.3.1 = 8 posições de nascimento (ddmmaaaa), **11 posições de CPF do titular**, NIS, RG… O e-CNPJ traz o CPF do **responsável** em 2.16.76.1.3.4 — não é o titular (leiaute RFB v4.1 §3.2.5) | p. 32 |
| `[SIG-SERIALNUMBER]` | Nota (*) dos OIDs acima: mantidos "de forma provisória, até 31/12/2028", para as aplicações passarem a ler o CPF/CNPJ do atributo **serialNumber (OID 2.5.4.5)** do DN do titular; depois disso o otherName fica **opcional**. **Não implementado** (o MOC 7.0 e a regra E03 ainda exigem o otherName) — achado com data | p. 32, 35 |

## 5. O que esta transcrição NÃO fixa

- **Cadeia ICP-Brasil + LCR** (`[SIG-CERT-VALIDADE]` itens c, f, g, h; Anexo I E04–E07): exige as raízes do ITI (dado
  externo). Fica para o F-SIG-3 (c), o nó seguinte. **Sem ela, quem re-assina o XML adulterado com um certificado
  próprio que carregue o CNPJ passa**, e qualquer certificado com CNPJ/CPF passa numa nota com `procEmi=1`.
- **Uso da chave / tipo A / usuário final** (itens d, e; Anexo I E01): fora do F-SIG-3 (b); não implementado.
- **Momento da validade:** a SEFAZ confere a validade no **recebimento**. O F-SIG-3 (b) ratificado confere contra o
  `dhEmi`, que é o que um importador que recebe a nota depois consegue verificar. A comparação é por **data**
  (AAAA-MM-DD, reslice), não por instante.
- **Leitura do serialNumber** (`[SIG-SERIALNUMBER]`): certificado emitido depois de 31/12/2028 sem otherName será
  recusado pela 292 até isso entrar.
