# NFC-e mod. 65: QR Code, URLs por UF e contingência off-line (fontes oficiais)

Coleta para o nó X10a (PR-8 / PR-9). Data de acesso de tudo: **29/10/2026**. Só fonte oficial; blog, fornecedor e biblioteca só serviram de pista e não aparecem como fonte.

## 0. Documentos lidos (PDF) e sha256

Os PDFs foram baixados dentro do navegador embutido, porque o portal da NF-e prende o `curl` e o WebFetch num laço de redirecionamento do ASP.NET (`AspxAutoDetectCookieSupport`). O sha256 foi calculado com `crypto.subtle` sobre os bytes servidos, e o texto foi extraído com pdf.js. **Os PDFs não foram gravados em disco**: a pasta `scratchpad/fontes-nfce/` ficou vazia e foi removida. Para ter cópia local, baixe pela URL e confira o hash.

| ID | Documento (nome do arquivo servido) | URL oficial | Bytes | sha256 |
|---|---|---|---|---|
| D01 | Manual de Padrões Técnicos do DANFE NFC-e e QR Code, **Versão 6.0, Março de 2025** (`20250324 - Manual_de_Especificações_Técnicas_do_DANFE_NFC-e_QR_Code.pdf`) | https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=k/IuuaW4YiY= | 1.887.904 | `bf906cc212f1edd19b1df7d1cdf4fbf5e73c3fec77567b6e69fa74453c95db5e` |
| D02 | NT 2025.001 v1.03 "Corrigido", publicada em 29/09/2025 (`NT2025.001_v1.03 - NFCe_qrCode_v3 corrigido.pdf`) | https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=NvuzQGYd6E8= | 1.028.544 | `333b69f71debe5040585b677b574bb13b39362aa7934b904edc59cdf83cded02` (**bate** com o hash que já tínhamos) |
| D03 | MOC 7.0, Anexo IV: Manual de Contingência NFC-e, versão 7.00, nov/2020 | https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=fMhAfsQfE%20M= | 811.631 | `0b5ae1e88ae60b57d4f1d752316289ff55f7e10c7e1d405905325e9de2666b0e` |
| D04 | Manual de Especificações da Contingência Offline para NFC-e, versão 2.0, 16/12/2016 | https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=tG8%20fKpcfbM= | 574.805 | `5ff5c8fdc8a55ae91f2f6e7c29566a45ca7e3867c7b76877deb48911071cf06c` |
| D05 | MOC 7.0, Visão Geral, versão 7.00, nov/2020 | https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=LrBx7WT9PuA= | 4.304.647 | `f664dcf94b77cabb32311620d85a7eb02cdf86adb2d4632ce178af2572dd2ad1` |
| D06 | MOC 7.0, Anexo I: Leiaute e Regras de Validação NF-e e NFC-e, versão 7.00, nov/2020 | https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=J%20I%20v4eN00E= | 4.106.196 | `5eb4cf2010b10b0b62f78197c4eb64025f24535d4c6e61158bc7806dd008f55d` |
| D07 | NT 2018.004 v1.00: Evento de cancelamento por substituição da NFC-e (dez/2018) | https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=DEisbx2XCIs= | 709.017 | `793c8130e74192e5874970533c05d6c9c66626e0d24826d3a6494e1bddc9eb75` |
| D08 | NT 2026.004 v1.01 (CNPJ alfanumérico); conferida só para ver se mexe em qrCode | https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=BTZQzgsO9Ws= | 516.956 | `5f24a25351e790692754b07bbefac42ac67e70167a62a7806395d880f56675be` |
| D09 | NT 2026.008 v1.00 (RTC valor líquido); conferida só para ver se mexe em qrCode | https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=qAoMot6VyiY= | 461.635 | `bc56e76ae5f3354f7ae636d87908840c5c685284f0f8f32bb29579f8124e44cd` |

Páginas de listagem: "Documentos > Manuais" em https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=ndIjl+iEFdE= e "Notas Técnicas" em https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=04BIflQt1aY=.

**Vigência conferida:**
- A lista de Manuais traz o D01 v6.0 como vigente.
- A NT 2025.001 v1.03 e a NT 2018.004 v1.00 estão na seção vigente da lista de NTs, antes de "Documentos não vigentes". Não há versão mais nova de nenhuma das duas.
- Das NTs de 2026 vigentes (2026.001 a 2026.010), D08 e D09 não citam `qrCode`, `QR` nem `urlChave`. As outras foram descartadas só pelo título: PAA, DANFE Simplificado, LCC/CCC, RTC, split payment.
- O portal SVRS (https://dfe-portal.svrs.rs.gov.br/NFCE/Documentos) ainda lista o Manual DANFE/QR **v5.1**. O Portal Nacional tem a v6.0, que é a vigente (ver divergências na seção 4).

---

## 1. QR Code e urlChave

### 1(a) QR Code versão 2, emissão ON-LINE

**Montagem da URL** (D01, p. 21, §4.3.1, Tabela 2):
> "1º Chave de Acesso da NFC-e 44* Informar a chave de acesso da NFC-e / 2º Versão do QR Code 1* Para esta versão de documento, preencher o com "2". / 3º Identificação do Ambiente (1 – Produção, 2 – Homologação) 1* Informar valor do campo B24 do leiaute NFC-e. / 4º Identificador do CSC (Código de Segurança do Contribuinte no Banco de Dados da SEFAZ) 1-6 Deve ser informado sem os "0" (zeros) não significativos. A identificação do CSC corresponde a ordem do CSC no banco de dados da SEFAZ, não confundir com o próprio CSC. / 5º Código Hash dos Parâmetros 40* […]"

> "O asterisco (*) na tabela acima indica que o preenchimento deve ser exato com a quantidade de bytes indicada."

> "http://<dominio>/nfce/qrcode?p=<chave_acesso>|<versao_qrcode>|<tipo_ambiente>|<identificador_csc>|<codigo_hash>"

Fonte: D01 p. 21, acesso 29/10/2026.

**Hash** (D01, p. 23, §4.3.3 e §4.3.4):
> "Para a geração do hash do QR Code sobre os parâmetros da consulta NFC-e via QR Code, deve ser utilizado o algoritmo SHA-1 e o resultado obtido deve ser convertido para hexadecimal, correspondendo a 40 bytes."

> "• Passo 1: Concatenar os parâmetros de 1 a 4 constantes da tabela 2 (seção 4.3.1) separados por "|" na ordem indicada; • Passo 2: Adicionar ao final da string o CSC (disponibilizado pela SEFAZ da UF onde a empresa está localizada); • Passo 3: Aplicar o algoritmo SHA-1 sobre o resultado e converter para hexadecimal, correspondendo a 40 bytes."

> "O CSC corresponde a um código de segurança alfanumérico (16 a 36 bytes) de conhecimento apenas da Secretaria da Fazenda da Unidade Federada do emitente e do próprio contribuinte."

Resumo: o SHA-1 é calculado sobre `chave|2|tpAmb|idCSC` + CSC, colado sem separador depois do idCSC. A saída vai em hex. A URL final acrescenta `|hash`.

**Maiúsculas e minúsculas:**
- O manual não fixa a caixa do hex do hash, mas os exemplos trazem o hash em **MAIÚSCULAS** e o hex do digVal em **minúsculas**.
- A NT 2025.001 (D02, p. 14) diz: "Nota 2: Respeitar o uso de caracteres maiúsculos / minúsculos, conforme consta no referido Manual."
- A RV ZX02-316 (D06, p. 133) aceita o hash em hex "(Caracteres: "0-9", "a-f","A-F")". A rejeição 400 só sai se não for hex.
- Leitura mais segura: seguir o exemplo, com o hash em maiúsculas. Isso é inferido; a validação aceita as duas caixas.

**Vetor de teste** (D01, pp. 24–25, §4.3.6.1), transcrito:
> "• Chave de Acesso: 28170800156225000131650110000151341562040824 • Versão do QR Code: 2 • Identificação do Ambiente: 1 (Produção) • Identificação do CSC: 1 (informar sem os zeros não significativos) • CSC de produção 1: CODIGO-CSC-CONTRIBUINTE-36-CARACTERES"

> "Entrada: 28170800156225000131650110000151341562040824|2|1|1SEU-CODIGO-CSC-CONTRIBUINTE-36-CARACTERES / Saída: Hash do QR Code = DC6AE2C2B9A992BE59679AC365E29922DE6B7511"

> "http://www.sefazexemplo.gov.br/nfce/qrcode?p=28170800156225000131650110000151341562040824|2|1|1|DC6AE2C2B9A992BE59679AC365E29922DE6B7511"

**Conferido por execução** em 29/10/2026, SHA-1 via `crypto.subtle` sobre UTF-8:
- `…|2|1|1SEU-CODIGO-CSC-CONTRIBUINTE-36-CARACTERES` → `DC6AE2C2B9A992BE59679AC365E29922DE6B7511`. **Bate.**
- `…|2|1|1CODIGO-CSC-CONTRIBUINTE-36-CARACTERES`, sem "SEU-", → `60F23E801495B0D62BB914225A5611E65A87CBFA`. **Não bate.**

O CSC que gera o vetor é **`SEU-CODIGO-CSC-CONTRIBUINTE-36-CARACTERES`** (40 caracteres). A linha "CSC de produção 1" do próprio manual omite o "SEU-". Para teste, use a string da linha "Entrada".

Note também o case da URL. O exemplo mistura `/nfce/qrcode?p=` (Tabela 4) e "http://www.sefazexemplo.gov.br/NFC-e/QR Code?p=" (p. 25, erro de edição). A RV ZX02-20 (D06, p. 129) diz: "O uso diferenciado de maiúsculas ou minúsculas não deve ser considerado na validação." Isso vale para o endereço da UF.

### 1(b) QR Code versão 2, contingência OFF-LINE (tpEmis=9)

**Parâmetros** (D01, p. 22, §4.3.2, Tabela 3):
> "4º Dia da data de emissão 2* Informar o dia da data de emissão, que consta no campo B09 do leiaute NFC-e. O valor deverá ter exatamente dois dígitos. / 5º Valor Total da NFC-e 15 Informar valor do campo W16 do leiaute NFC-e. O valor deve ser informado com ponto (".") como separador decimal; não informar separador de milhar ou sinais. / 6º DigestValue da NFC-e 56* Corresponde ao algoritmo SHA1 sobre o arquivo XML da NFC-e, convertido para formato hexadecimal. Ao se efetuar a assinatura digital da NFC-e emitida em contingência off-line, o campo DigestValue constante da XML Signature deve obrigatoriamente ser idêntico ao encontrado quando da geração do DigestValue para a montagem QR Code. / 7º Identificador do CSC […] 1-6 […] / 8º Código Hash dos Parâmetros 40* […]"

> "http://<dominio>/nfce/qrcode/?p=<chave_acesso>|<versao_qrcode>|<tipo_ambiente>|<dia_data_emissao>|<valor_total_nfce>|<digVal>|<identificador_csc>|<codigo_hash>"

**Hash off-line** (D01, p. 24, §4.3.5):
> "• Passo 1: Converter o valor do DigestValue da NFC-e (digVal) para HEXA; • Passo 2: Concatenar os parâmetros de 1 a 7 constantes da tabela 3 (seção 4.3.2) separados por "|", na ordem indicada; • Passo 3: Adicionar ao final da string o CSC […]; • Passo 4: Aplicar o algoritmo SHA-1 sobre o resultado e converter para hexadecimal, correspondendo a 40 bytes."

**Vetor off-line** (D01, pp. 26–27, §4.3.6.2):
> "• Chave de Acesso: 28170800156225000131650110000151349562040824 • Versão do QR Code: 2 • Identificação do Ambiente: 1 (Produção) • Dia da data de emissão da NFC-e: 02 • Valor Total da NFC-e: 60.90 • DigestValue da NFC-e: yzGYhUx1/XYYzksWB+fPR3Qc50c="

> "Entrada: yzGYhUx1/XYYzksWB+fPR3Qc50c= / Saída : 797a4759685578312f5859597a6b7357422b6650523351633530633d"

> "Entrada: 28170800156225000131650110000151349562040824|2|1|02|60.90|797a4759685578312f5859597a6b7357422b6650523351633530633d|1SEU-CODIGO-CSC-CONTRIBUINTE-36-CARACTERES / Saída:4615A93BB0D7C4E780F8D30EE77EDD5BA55C7D66"

> URL: "http://www.sefazexemplo.gov.br/nfce/qrcode?p=28170800156225000131650110000151349562040824|2|1|02|60.90|797a4759685578312f5859597a6b7357422b6650523351633530633d|1|4615A93BB0D7C4E780F8D30EE77EDD5BA55C7D66"

**Conferido por execução:**
- O "HEXA" do digVal é o hex **minúsculo dos bytes ASCII da string base64** do DigestValue, e **não** o hex do digest decodificado. `hex(utf8("yzGYhUx1/XYYzksWB+fPR3Qc50c="))` = `797a4759…633d`, o que bate e dá exatamente 56 caracteres.
- O SHA-1 da entrada com "SEU-…" dá `4615A93BB0D7C4E780F8D30EE77EDD5BA55C7D66`, que bate. Sem "SEU-" dá `264FD031…`, que não bate.

**RVs do digVal v2** (D06, p. 132):
- ZX02-292: "Parâmetro Digest Value no QR-Code não está no formato hexadecimal (Caracteres: "0-9", "a-f","A-F")", rej. 400.
- ZX02-296: "Parâmetro Digest Value no QR-Code diverge do Digest Value da Nota Fiscal (tag grupo: Signature, id:ZZ01)", rej. 397.
- ZX02-320 (D06, p. 133): "Parâmetro Hash do QR-Code diverge do calculado", rej. 464.

### 1(c) QR Code versão 3, on-line e off-line (NT 2025.001)

**Conceito** (D02, p. 5, §02.1):
> "Nesta nova versão, o controle sobre a autenticidade do conteúdo do QR-Code impresso no DANFE NFC-e será feito pela assinatura de campos específicos do QR-Code. Esse controle será feito unicamente para as NFC-e emitidas em Contingência, com a inclusão do resultado da assinatura no próprio QR-Code. Neste novo modelo, não será mais necessário o controle do CSC-Código de Segurança do Contribuinte pelas empresas. Futuramente (sem data definida) está prevista a eliminação do CSC […], com a adoção unicamente do leiaute do QR-Code versão 3."

**Quem usa** (D02, p. 5, §02.2; igual em D01, p. 29):
> "A orientação atual é adotar o novo leiaute do QR-Code (versão 3) para o Produtor Rural Pessoa Física […] (exceto PR) / No caso de emitente Pessoa Jurídica (CNPJ) é opção da empresa adotar esse novo leiaute do QR-Code, ou não."

**v3 ON-LINE** (D01, p. 29, §4.4.1, Tabela 6):
> "1º Chave de Acesso da NFC-e 44* […] / 2º Versão do QR Code 1* Para esta versão de documento, preencher o com "3". / 3º Identificação do Ambiente (1 – Produção, 2 – Homologação) 1* Informar valor do campo B24 do leiaute NFC-e - tpAmb"

> "http://www.sefazexemplo.gov.br/nfce/qrcode?p=<chave_acesso>|<3>|<tpAmb>"

On-line v3 não tem hash nem assinatura. A RV ZX02-330 (D02, p. 13) diz: "Se QR Code versão "3" e NFC-e não é de contingência (tpEmis<>9), o parâmetro "assinatura" não deve ser informado no qrCode", rej. **445**.

**v3 OFF-LINE** (D01, p. 30, §4.4.2, Tabela 7):
> "4º Dia da data de emissão 2* Informar o dia da data de emissão, que consta no campo B09 do leiaute NFC-e. O valor deverá ter exatamente dois dígitos. / 5º Valor Total da NFC-e 15 Informar valor do campo W16 […] com ponto (".") como separador decimal; não informar separador de milhar ou sinais. / 6º Tipo de Identificação do Destinatário 1 1=CNPJ; 2=CPF; 3=idEstrangeiro; Caso Destinatário não identificado, informar apenas o separador "|". / 7º Identificação do Destinatário 3-14 Identificação do Destinatário CPF ou CNPJ na NFC-e. Caso Destinatário estrangeiro ou não identificado, informar apenas o separador "|". / 8º Assinatura Assinatura digital da concatenação dos parâmetros de 1 a 7, mantendo os separadores ("|"). Assinatura no padrão RSA SHA-1 (Base64), com o mesmo certificado digital que assina a NFC-e. Este parâmetro deve ser adicionado aos demais usando um caractere "|" como separador."

> "http://www.sefazexemplo.gov.br/nfce/qrcode?p=<chave_acesso>|<3>|<tpAmb>|<dia_data_emissao>|<vNF>|<tp_idDest>|<idDest>|ZZSKiypy7fkg22MUv6TUh71EI+wLYWr/fUHJy3PyWnL7d5mzEqtxu6bVbhE7AeNiDTirh1u9gVfC2Hw+Lsno2XNL5FRUc5NcuMTT2hA6E9HYC9gryvtWAIgiCZUNG5cWWLCh0G62QdnNe8iSrlSooQu9Z5g1vbGaTFMxaugzzvo="

Resumo da assinatura:
- **Sobre que string:** os parâmetros 1 a 7 concatenados com `|`, ou seja, `chave|3|tpAmb|dd|vNF|tp_idDest|idDest`.
- **Algoritmo:** RSA com SHA-1, usando a chave privada do mesmo e-CNPJ/e-CPF que assina a NFC-e.
- **Saída:** Base64.

Lacunas (assumido, não escrito na fonte):
- O manual não diz se a string é codificada em UTF-8 ou ASCII antes de assinar. Todos os caracteres são ASCII, então o resultado não muda.
- O manual não diz o padding. "RSA SHA-1" costuma significar PKCS#1 v1.5 (`SHA1withRSA`), mas isso é assumido.
- O exemplo não traz chave, certificado nem entrada concreta, então **não há vetor de teste verificável para a v3**.

Pontos de ambiguidade:
1. Para destinatário ausente, a Tabela 7 manda "informar apenas o separador "|"", sem dizer se o parâmetro vira string vazia. Leitura mais segura: string vazia entre separadores, `…|vNF|||assinatura`.
2. Para estrangeiro (tp_idDest=3), o parâmetro 7 também fica vazio ("Caso Destinatário estrangeiro ou não identificado, informar apenas o separador"). Assim, o 6º = 3 vem com o 7º vazio.
3. CNPJ alfanumérico: o 7º parâmetro tem 3–14 posições. A NT 2026.004 (D08) não menciona o qrCode, e a tabela não diz se aceita letras.

**RVs v3** (D02, pp. 11–13), transcritas:
- ZX02-220: "Se QR Code versão 3 e UF não aceita esta versão […] Parâmetro por UF, enquanto todas as UF não migrarem", rej. **407**. Divergência: o histórico da v1.01 diz "Removida RV ZX02-220, considerando que todas as UF irão disponibilizar o layout do qrCode v3", mas a regra continua impressa na tabela da v1.03, na p. 11. Ver seção 4.
- ZX02-222: "Se QR-Code versão 2 e Emitente Pessoa Física (Produtor Rural, identificado pelo CPF), rejeitar a NFC-e", rej. **444**.
- ZX02-260/268 e 272/276 (v2 ou 3, tpEmis=9): dia e vNF ausentes dão 396; divergentes dão 397.
- ZX02-324/326: "Se QR Code versão "3" e NFC-e de contingência (tpEmis=9): Parâmetro Tipo de Identificação do Destinatário / Identificação do Destinatário não informado no QR-Code", rej. 396.
- ZX02-328: "Parâmetro Identificação do Destinatário do QR-Code diverge da Identificação do Destinatário da NFC-e. […] Obs. 3: Se a identificação do Destinatário não for informada na NFC-e, não deve ser informada no QR Code, e vice-versa.", rej. 397.
- ZX02-330: rej. **445** (assinatura indevida, tpEmis<>9).
- ZX02-334: "Se QR Code versão "3" e NFC-e é de contingência (tpEmis=9), o parâmetro "assinatura" deve ser informado no qrCode", rej. **474**.
- ZX02-338: "Valor da assinatura difere do valor calculado", rej. **583**.

Preenchimento (D02, p. 14, item 04):
> "3 Informar a URL da "Consulta da NFC-e via QR-Code", na versão 3, usando o Protocolo "http" ou "https", conforme os seguintes modelos: • Para NFC-e emitida "on-line": https://endereco-consulta-QRCode?p=<chave_acesso>|<versao_qrcode>|<tpAmb> • Para NFC-e emitida em contingência "off-line": https:// endereco-consulta-QRCode?p=<chave_acesso>|<versao_qrcode>|<tpAmb>|<dia_data_emissao>|<vNF>|<tp_idDest>|<idDest>|<assinatura> […] Nota 4: Nesta nova versão do layout do qrCode não existe a necessidade de informar o conteúdo da tag qrCode dentro de uma seção CDATA."

A mesma Nota 4 vale para a v2.

**Configuração da imagem** (D01, p. 31, §4.5.2 e §4.5.3):
> "Para o QR Code do DANFE NFC-e será utilizado Nível M." / "Para o QR Code da NFC-e será utilizada a opção 2 – UTF-8."

**Tamanho mínimo** (D01, p. 10, §3.1.5):
> "deve ter tamanho mínimo 25mm x 25mm, sendo 22mm de conteúdo para 3mm de margem segura (quiet zone). Para dimensões superiores a 25mm, considerar a margem segura de 10% da dimensão total."

**Cronograma da NT 2025.001** (D02, p. 2):
> "1.00 NFC-e: Leiaute do QR-Code versão 3 e outras mudanças Até 02/06/2025 Até 01/09/2025"

A v1.03 tem "Até 20/10/2025" em teste e "03/11/2025" em produção, para as RVs ajustadas: 865, 904 e 805.

### 1(d) urlChave (ZX03)

D01, p. 10, §3.1.4:
> "Deve iniciar com o texto "Consulte pela Chave de Acesso em" seguido do endereço eletrônico para consulta pública da NFC-e no Portal da Secretaria da Fazenda da Unidade Federada do contribuinte […], e a chave de acesso impressa em 11 blocos de quatro dígitos, com um espaço entre cada bloco. A URL da consulta chaves de acesso da NFC-e deve constar do arquivo XML da NFC-e, no campo destinado às Informações Suplementares da Nota Fiscal (tag ZX-03)."

D02, p. 8 (leiaute vigente):
> "426 ZX03 urlChave Texto com a URL de consulta por chave de acesso a ser impressa no DANFE NFC-e. Obs.: URLs, por UF, utilizadas para consulta por chave de acesso acesse: http://nfce.encat.org/consumidor/consulteno ta/ E ZX01 C 1-1 21-85 Informar a URL da "Consulta por chave de acesso da NFC-e". A mesma URL que deve estar informada no DANFE NFC-e para consulta por chave de acesso."

D06, p. 133, RV ZX03-20:
> "Endereço do site da UF para a Consulta por chave de acesso difere do previsto. […] Observação 2: regra de validação opcional por UF Observação3: regra de validação vigente a partir de 01/04/2019. (NT 2016.002) Facul. 878 Rej. Rejeição: Endereço do site da UF da Consulta por chave de acesso diverge do previsto"

Base do QR por UF, D06, p. 129, RV ZX02-20:
> "Endereço do site da UF para a Consulta via QR-Code difere do previsto. Nota: O uso diferenciado de maiúsculas ou minúsculas não deve ser considerado na validação. […] Obrig. 395"

### 1(e) Limites de tamanho do campo qrCode

- **Vigente:** D02, p. 8, ZX02 `qrCode` "E ZX01 C 1-1 **60-1000**". O histórico da v1.01 diz: "Alterada documentação do tamanho máximo do campo de qrCode, conforme o schema".
- **Superado:** D06 (Anexo I, nov/2020), p. 66, ZX02 `qrCode` "C 1-1 **100-600**". A NT é posterior e prevalece.
- `urlChave`: **21-85** nas duas fontes.
- `infNFeSupl` (ZX01): "não afetando a assinatura digital" (D02, p. 8).

Uma v3 off-line com assinatura RSA-2048 tem 344 caracteres de base64 mais uns 100 de prefixo, e cabe nos 1000. Isso é inferido: o tamanho da chave não está escrito.

---

## 2. URLs de consulta por UF (qrCode base e urlChave)

### Situação da fonte nacional

O D01 (pp. 21 e 28) e a D02 (p. 8) remetem à tabela do Portal Nacional da NFC-e, o ENCAT: http://nfce.encat.org/desenvolvedor/qrcode/ e http://nfce.encat.org/consumidor/consulteno ta/. Em 29/10/2026 o site estava **fora do ar**: ECONNREFUSED 187.17.9.17:443 e ERR_CONNECTION_TIMED_OUT na 80, testado pelo WebFetch, pelo navegador e por três subagentes. O MOC Online (moc.sped.fazenda.pr.gov.br) e o portal SVRS não trazem tabela por UF. Por isso as URLs abaixo saíram **página por página de cada SEFAZ**.

A SP foi lida por mim. As outras 26 UF foram lidas por três subagentes, que transcreveram o texto literal da página oficial. Grau: **verificado pelo subagente**; não reli cada página.

### Linhas lidas (JSON, uma por UF × ambiente)

```json
{"uf":"SP","ambiente":"producao","qrCodeBase":"https://www.nfce.fazenda.sp.gov.br/NFCeConsultaPublica/Paginas/ConsultaQRCode.aspx ; https://www.nfce.fazenda.sp.gov.br/qrcode","urlChave":"https://www.nfce.fazenda.sp.gov.br/NFCeConsultaPublica","fonte":"https://portal.fazenda.sp.gov.br/servicos/nfce/Paginas/WebServices.aspx (acesso 29/10/2026)","obs":"'2. URL QR Code / A URL a ser utilizada na consulta via QR Code no ambiente de produção deverá ser: https://www.nfce.fazenda.sp.gov.br/NFCeConsultaPublica/Paginas/ConsultaQRCode.aspx  https://www.nfce.fazenda.sp.gov.br/qrcode' / '3. Consulta Pública https://www.nfce.fazenda.sp.gov.br/NFCeConsultaPublica'"}
{"uf":"SP","ambiente":"homologacao","qrCodeBase":"https://www.homologacao.nfce.fazenda.sp.gov.br/NFCeConsultaPublica/Paginas/ConsultaQRCode.aspx ; https://www.homologacao.nfce.fazenda.sp.gov.br/qrcode","urlChave":"https://www.homologacao.nfce.fazenda.sp.gov.br/NFCeConsultaPublica ; https://www.homologacao.nfce.fazenda.sp.gov.br/consulta","fonte":"https://portal.fazenda.sp.gov.br/servicos/nfce/Paginas/WebServices.aspx (acesso 29/10/2026)","obs":"'A URL a ser utilizada na consulta via QR Code no ambiente de homologação deverá ser: https://www.homologacao.nfce.fazenda.sp.gov.br/NFCeConsultaPublica/Paginas/ConsultaQRCode.aspx  https://www.homologacao.nfce.fazenda.sp.gov.br/qrcode' / '3. URL Consulta Pública https://www.homologacao.nfce.fazenda.sp.gov.br/NFCeConsultaPublica  https://www.homologacao.nfce.fazenda.sp.gov.br/consulta'"}
{"uf":"AM","ambiente":"producao","qrCodeBase":"https://sistemas.sefaz.am.gov.br/nfceweb/consultarNFCe.jsp?","urlChave":"","fonte":"https://portalnfce.sefaz.am.gov.br/desenvolvedor/documentacao-tecnica/","obs":"'URL de Produção: ... QR-CODE: https://sistemas.sefaz.am.gov.br/nfceweb/consultarNFCe.jsp?'. urlChave não declarada na página."}
{"uf":"AM","ambiente":"homologacao","qrCodeBase":"https://sistemas.sefaz.am.gov.br/nfceweb-hom/consultarNFCe.jsp?","urlChave":"","fonte":"https://portalnfce.sefaz.am.gov.br/desenvolvedor/documentacao-tecnica/","obs":"'URL de Homologação: ... QR-CODE: https://sistemas.sefaz.am.gov.br/nfceweb-hom/consultarNFCe.jsp?'. Página também lista WS antigos (NfeConsulta2): pode estar desatualizada."}
{"uf":"BA","ambiente":"producao","qrCodeBase":"http://nfe.sefaz.ba.gov.br/servicos/nfce/qrcode.aspx","urlChave":"http://www.sefaz.ba.gov.br/nfce/consulta","fonte":"https://www.sefaz.ba.gov.br/docs/inspetoria-eletronica/icms/nfce_configuracao_programa_emissor.pdf (PDF de 27/03/2018)","obs":"'http://www.sefaz.ba.gov.br/nfce/consulta (a ser impressa no DANFE NFC-e, antes da Chave de Acesso)'; 'http://nfe.sefaz.ba.gov.br/servicos/nfce/qrcode.aspx (deverá compor o QR Code...)'. Fonte de 2018."}
{"uf":"BA","ambiente":"homologacao","qrCodeBase":"http://hnfe.sefaz.ba.gov.br/servicos/nfce/qrcode.aspx","urlChave":"http://hinternet.sefaz.ba.gov.br/nfce/consulta","fonte":"https://www.sefaz.ba.gov.br/docs/inspetoria-eletronica/icms/nfce_configuracao_programa_emissor.pdf","obs":"'URL para consulta da NFC-e pela chave de acesso - Homologação Versão 4.0: http://hinternet.sefaz.ba.gov.br/nfce/consulta'; QR homologação 'http://hnfe.sefaz.ba.gov.br/servicos/nfce/qrcode.aspx'."}
{"uf":"CE","ambiente":"producao","qrCodeBase":"http://nfce.sefaz.ce.gov.br/pages/ShowNFCe.html","urlChave":"","fonte":"http://nfce.sefaz.ce.gov.br/pages/informacoes/web_services.jsf","obs":"'URL Base do QRCode Consulta NFC-e via QR-Code http://nfce.sefaz.ce.gov.br/pages/ShowNFCe.html?...' (reticências da própria página). urlChave não declarada."}
{"uf":"CE","ambiente":"homologacao","qrCodeBase":"http://nfceh.sefaz.ce.gov.br/pages/ShowNFCe.html","urlChave":"","fonte":"http://nfce.sefaz.ce.gov.br/pages/informacoes/web_services.jsf","obs":"'Ambiente de Testes (Homologação) URL Base do QRCode ... http://nfceh.sefaz.ce.gov.br/pages/ShowNFCe.html?...'"}
{"uf":"DF","ambiente":"producao","qrCodeBase":"http://www.fazenda.df.gov.br/nfce/qrcode?","urlChave":"http://www.fazenda.df.gov.br/nfce/consulta","fonte":"https://mobile.receita.fazenda.df.gov.br/aplicacoes/CartaServicos/servico.cfm?codTipoPessoa=7&codServico=781&codSubCategoria=218 (última alteração 19/05/2026)","obs":"'3) URL por UF utilizada para consulta chave: Qr Code versão 2.0 e versão 3.0 http://www.fazenda.df.gov.br/nfce/consulta 4) URL por UF utilizada QR code : URL QRCODE NFCe 4.00 http://www.fazenda.df.gov.br/nfce/qrcode?'"}
{"uf":"DF","ambiente":"homologacao","qrCodeBase":"http://www.fazenda.df.gov.br/nfce/qrcode?","urlChave":"http://www.fazenda.df.gov.br/nfce/consulta","fonte":"idem DF produção","obs":"A página não separa ambientes; inferido que a URL única vale para os dois."}
{"uf":"ES","ambiente":"producao","qrCodeBase":"www2.sefaz.es.gov.br/nfce/consulta","urlChave":"https://app.sefaz.es.gov.br/ConsultaNFCe/www.sefaz.es.gov.br/nfce/consulta","fonte":"https://sefaz.es.gov.br/qr-code ; https://sefaz.es.gov.br/url-dos-web-services","obs":"QR: 'Endereço no Estado do Espírito Santo para utilizar o serviço de consulta pública de NFC-e por QR Code: www2.sefaz.es.gov.br/nfce/consulta' (href http://www2.sefaz.es.gov.br/nfce/consulta). urlChave: âncora com texto literal acima e href https://app.sefaz.es.gov.br/ConsultaNFCe/ — AMBÍGUO (ver divergências)."}
{"uf":"ES","ambiente":"homologacao","qrCodeBase":"www2.sefaz.es.gov.br/nfce/consulta","urlChave":"https://app.sefaz.es.gov.br/ConsultaNFCe/www.sefaz.es.gov.br/nfce/consulta","fonte":"https://sefaz.es.gov.br/qr-code","obs":"'Para consulta em produção ou homologação utiliza-se a mesma URL, basta trocar o valor do parâmetro tpAmb'."}
{"uf":"GO","ambiente":"producao","qrCodeBase":"https://nfeweb.sefaz.go.gov.br/nfeweb/sites/nfce/danfeNFCe","urlChave":"","fonte":"https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=VPJWnW2ypos= (Informe Técnico 2025.003 v1.00, 11/06/2025; sha256 informado pelo subagente começa c1b84960…fb92)","obs":"Antiga 'http://nfe.sefaz.go.gov.br/nfeweb/sites/nfce/danfeNFCe Até 30/08/2025'; nova 'https://nfeweb.sefaz.go.gov.br/nfeweb/sites/nfce/danfeNFCe A partir de 16/06/2025'; 'somente será aceita a nova URL' (rej. 395). urlChave: nenhuma página oficial de GO lida a declara."}
{"uf":"GO","ambiente":"homologacao","qrCodeBase":"https://nfewebhomolog.sefaz.go.gov.br/nfeweb/sites/nfce/danfeNFCe","urlChave":"","fonte":"idem GO produção (IT 2025.003)","obs":"Antiga 'http://homolog.sefaz.go.gov.br/nfeweb/sites/nfce/danfeNFCe Até 30/06/2025'; nova 'https://nfewebhomolog.sefaz.go.gov.br/nfeweb/sites/nfce/danfeNFCe A partir de 16/06/2025'."}
{"uf":"MS","ambiente":"producao","qrCodeBase":"http://www.dfe.ms.gov.br/nfce/qrcode?","urlChave":"http://www.dfe.ms.gov.br/nfce/consulta","fonte":"https://www.sefaz.ms.gov.br/documentos-fiscais-eletronicos/nfc-e/","obs":"'URL que deverá ser utilizada na tag QRcode: http://www.dfe.ms.gov.br/nfce/qrcode?' / 'URL que deverá ser utilizada na tag urlChave: http://www.dfe.ms.gov.br/nfce/consulta' (bloco 'nos ambientes de Homologação e Produção')."}
{"uf":"MS","ambiente":"homologacao","qrCodeBase":"http://www.dfe.ms.gov.br/nfce/qrcode?","urlChave":"http://www.dfe.ms.gov.br/nfce/consulta","fonte":"idem MS produção","obs":"Mesmo bloco vale para os dois ambientes."}
{"uf":"MG","ambiente":"producao","qrCodeBase":"https://portalsped.fazenda.mg.gov.br/portalnfce/sistema/qrcode.xhtml","urlChave":"https://portalsped.fazenda.mg.gov.br/portalnfce","fonte":"https://portalsped.fazenda.mg.gov.br/spedmg/nfce/web-services/","obs":"Tabela 'Ambiente de Produção': 'QRCode | https://portalsped.fazenda.mg.gov.br/portalnfce/sistema/qrcode.xhtml' ; 'Consulta por chave (Portal) | https://portalsped.fazenda.mg.gov.br/portalnfce'"}
{"uf":"MG","ambiente":"homologacao","qrCodeBase":"https://portalsped.fazenda.mg.gov.br/portalnfce/sistema/qrcode.xhtml","urlChave":"https://hportalsped.fazenda.mg.gov.br/portalnfce","fonte":"idem MG produção","obs":"Tabela 'Ambiente de Homologação': QR igual ao de produção; 'Consulta por chave (Portal) | https://hportalsped.fazenda.mg.gov.br/portalnfce' (href com barra final)."}
{"uf":"PB","ambiente":"producao","qrCodeBase":"http://www.sefaz.pb.gov.br/nfce","urlChave":"www.sefaz.pb.gov.br/nfce","fonte":"https://www.sefaz.pb.gov.br/view-docs?task=document.viewdoc&id=2576 (aviso de 16/01/2024)","obs":"'A URL da página de consulta estadual da NFC-e para inclusão no Código do QR Code será apenas a seguinte: http://www.sefaz.pb.gov.br/nfce' ... 'No DANFE NFC-e deve ser impressa a informação de consulta pela chave de acesso (campo VI do DANFE NFC-e) para o endereço: www.sefaz.pb.gov.br/nfce'. URL antiga não aceita a partir de 01/04/2024."}
{"uf":"PB","ambiente":"homologacao","qrCodeBase":"http://www.sefaz.pb.gov.br/nfcehom","urlChave":"","fonte":"https://www.sefaz.pb.gov.br/view-docs?task=document.viewdoc&id=1382 (aviso de 12/02/2020)","obs":"'Para o ambiente de homologação deve ser usada a URL abaixo (a partir de 05/02/2020): http://www.sefaz.pb.gov.br/nfcehom'. urlChave de homologação não informada."}
{"uf":"PR","ambiente":"producao","qrCodeBase":"http://www.fazenda.pr.gov.br/nfce/qrcode?","urlChave":"","fonte":"https://sped.fazenda.pr.gov.br/NFCe/Pagina/QR-Code","obs":"'Endereço no Estado do Paraná para utilizar o serviço de consulta pública de NFC-e por QR Code: http://www.fazenda.pr.gov.br/nfce/qrcode?' + 'Para consulta em produção ou homologação utiliza-se a mesma URL'. Página já descreve QR v3 e cita o Manual v6.0. urlChave não informada."}
{"uf":"PR","ambiente":"homologacao","qrCodeBase":"http://www.fazenda.pr.gov.br/nfce/qrcode?","urlChave":"","fonte":"idem PR produção","obs":"Mesma URL; ambiente distinguido pelo tpAmb."}
{"uf":"PE","ambiente":"producao","qrCodeBase":"http://nfce.sefaz.pe.gov.br/nfce/consulta","urlChave":"nfce.sefaz.pe.gov.br/nfce/consulta","fonte":"https://www.sefaz.pe.gov.br/Servicos/Nota-Fiscal-de-Consumidor-Eletronica/Paginas/Webservices-Producao-e-Homologacao.aspx ; https://www.sefaz.pe.gov.br/Servicos/Nota-Fiscal-de-Consumidor-Eletronica/Paginas/Avisos-NFC-e.aspx","obs":"'NFeConsultaQRCode http://nfce.sefaz.pe.gov.br/nfce/consulta' (Produção v4.0); aviso 20/05/2019: 'URL da chave (para os ambientes de Homologação e de Produção): nfce.sefaz.pe.gov.br/nfce/consulta'"}
{"uf":"PE","ambiente":"homologacao","qrCodeBase":"http://nfcehomolog.sefaz.pe.gov.br/nfce/consulta","urlChave":"nfce.sefaz.pe.gov.br/nfce/consulta","fonte":"idem PE produção","obs":"'NFeConsultaQRCode http://nfcehomolog.sefaz.pe.gov.br/nfce/consulta' (Homologação v4.0)."}
{"uf":"RJ","ambiente":"producao","qrCodeBase":"https://consultadfe.fazenda.rj.gov.br/consultaNFCe/QRCode","urlChave":"www.fazenda.rj.gov.br/nfce/consulta ; https://consultadfe.fazenda.rj.gov.br/consultaDFe/paginas/consultaChaveAcesso.faces","fonte":"https://portal.fazenda.rj.gov.br/dfe/ ; https://portal.fazenda.rj.gov.br/dfe/wp-content/uploads/sites/17/2023/01/DF-e_NFC-e.pdf (revisão 16/07/2026)","obs":"Aviso: 'nos ambientes de produção e homologação ... a partir de 19/12/2023 – https://consultadfe.fazenda.rj.gov.br/consultaNFCe/QRCode'. Manual 2.5: '...é https://consultadfe.fazenda.rj.gov.br/consultaNFCe/QRCode?'. urlChave: o manual dá dois valores (item 2.6 'www.fazenda.rj.gov.br/nfce/consulta' e seção DANFE 'https://consultadfe.fazenda.rj.gov.br/consultaDFe/paginas/consultaChaveAcesso.faces') — AMBÍGUO."}
{"uf":"RJ","ambiente":"homologacao","qrCodeBase":"https://consultadfe.fazenda.rj.gov.br/consultaNFCe/QRCode","urlChave":"www.fazenda.rj.gov.br/nfce/consulta ; https://consultadfe.fazenda.rj.gov.br/consultaDFe/paginas/consultaChaveAcesso.faces","fonte":"idem RJ produção","obs":"URL do QR vale para 'produção e homologação'; urlChave não separada por ambiente."}
{"uf":"RO","ambiente":"producao","qrCodeBase":"http://www.nfce.sefin.ro.gov.br/consultanfce/consulta.jsp","urlChave":"www.sefin.ro.gov.br/nfce/consulta","fonte":"http://www.nfce.sefin.ro.gov.br/docTecnica.jsp","obs":"'O endereço que deve constar no QRCode é: http://www.nfce.sefin.ro.gov.br/consultanfce/consulta.jsp' / 'O endereço para consulta pela chave de acesso que deve constar no DANFE é: www.sefin.ro.gov.br/nfce/consulta'. A página não diz o ambiente; assumido produção."}
{"uf":"SC","ambiente":"producao","qrCodeBase":"https://sat.sef.sc.gov.br/nfce/consulta","urlChave":"https://sat.sef.sc.gov.br/nfce/consulta","fonte":"https://www.sef.sc.gov.br/arquivos_portal/servicos/136/WEBSERVICE_DA_NFC_E_URL_DO_QR_CODE_E_DA_CONSULTA_EM_SC.pdf (sem data)","obs":"'URL de QR Code que deve ser indicada conforme a UF do emitente (mesmo no caso de SVC): ... Produção: https://sat.sef.sc.gov.br/nfce/consulta?p=' / consulta por chave 'Produção: https://sat.sef.sc.gov.br/nfce/consulta'"}
{"uf":"SC","ambiente":"homologacao","qrCodeBase":"https://hom.sat.sef.sc.gov.br/nfce/consulta","urlChave":"https://hom.sat.sef.sc.gov.br/nfce/consulta","fonte":"idem SC produção","obs":"'Homologação: https://hom.sat.sef.sc.gov.br/nfce/consulta?p=' / 'Homologação: https://hom.sat.sef.sc.gov.br/nfce/consulta'"}
{"uf":"TO","ambiente":"producao","qrCodeBase":"http://www.sefaz.to.gov.br/nfce/qrcode","urlChave":"http://www.sefaz.to.gov.br/nfce/consulta","fonte":"https://www.to.gov.br/sefaz/documentacao/4zw4v3wp9rrc","obs":"'Consulta por Chave da Nota (ATUAL) — ... produção: http://www.sefaz.to.gov.br/nfce/consulta' / 'QrCode Versão 2.0 (ATUAL) — ... produção: http://www.sefaz.to.gov.br/nfce/qrcode'. URLs apps.sefaz.to.gov.br marcadas ANTIGO."}
{"uf":"TO","ambiente":"homologacao","qrCodeBase":"http://homologacao.sefaz.to.gov.br/nfce/qrcode","urlChave":"http://homologacao.sefaz.to.gov.br/nfce/consulta","fonte":"idem TO produção","obs":"'... homologação: http://homologacao.sefaz.to.gov.br/nfce/consulta' / '... homologação: http://homologacao.sefaz.to.gov.br/nfce/qrcode'"}
```

Convenção: onde a página publica a base com "?" no fim (AM, DF, MS, PR, RJ no manual) ou com "?p=" (SC), a transcrição está na `obs`. O campo `qrCodeBase` traz o literal da página, menos o `p=`. A base é tudo o que vem antes de `?p=`.

### UF fora da tabela (sem fonte oficial lida) e motivo

| UF | Ambiente | Motivo |
|---|---|---|
| AC | ambos | O portal http://www.sefaznet.ac.gov.br/nfce/ não publica URL de QR nem urlChave. O site sefaz.ac.gov.br só devolve decretos na busca. |
| AL | ambos | https://www.sefaz.al.gov.br/nfce/nfce-documentacao mostra "SEFAZ-AL \| Site em manutenção" (curl, WebFetch e navegador). |
| AP | ambos | O portal novo https://www.sefaz.ap.gov.br/ é uma SPA; o link "Consultar NFC-e" tem href vazio e /nfce/ dá 404. |
| MA | ambos | https://portal-sgc.sefaz.ma.gov.br/portal/pagina?id=3571 só tem links de consulta pública, sem rótulo de QR ou urlChave. O menu de webservices manda para o ENCAT, fora do ar. |
| MT | ambos | O portal NFC-e da SEFAZ-MT dá ECONNRESET ou timeout. |
| PA | ambos | http://nfce.sefa.pa.gov.br/index.php/desenvolvedor dá ECONNREFUSED. |
| PI | ambos | As páginas do portal.sefaz.pi.gov.br caem na home; portal-admin dá 403 e siteantigo dá 502. www.sefaz.pi.gov.br/nfce/qrcode tem **desafio anti-robô, não resolvido**. |
| RN | ambos | As páginas NFC-e de sefaz.rn.gov.br não trazem as URLs. O aviso "Atenção desenvolvedores NFC-e" dá 404 e www.set.rn.gov.br não conecta. |
| RR | ambos | O portal só remete à SVRS. O manual em sefaz.rr.gov.br dá 404 e portalweb dá 403. |
| RS | ambos | As páginas de sefaz.rs.gov.br (m_nfe_nfce, l_rel_end_ws_nfce, FAQ) só trazem web services e CSC. https://nfce.svrs.rs.gov.br/ tem certificado inválido e não foi lido. |
| SE | ambos | http://www.nfce.se.gov.br/ responde 403 (bloqueio) e fecha a conexão em https. |
| RO | homologação | A página oficial não separa homologação. |
| AM, CE, GO, PR | urlChave | As páginas oficiais lidas não declaram a urlChave. |
| PB | urlChave de homologação | Os avisos falam só de produção. |

Pistas não oficiais (ACBr, fórum, Tecnospeed, oobj) foram anotadas pelos subagentes mas **não usadas**. Exemplos: RS `https://www.sefaz.rs.gov.br/NFCE/NFCE-COM.aspx` e `www.sefaz.rs.gov.br/nfce/consulta`; PI `http://www.sefaz.pi.gov.br/nfce/qrcode`. Para fechar as lacunas: ENCAT de volta no ar, ou alguém abrir esses portais de uma rede que eles não bloqueiem.

---

## 3. Contingência off-line da NFC-e (tpEmis=9)

### 3.1 dhCont / xJust

D03 (Anexo IV MOC 7.0), p. 8, idêntico em D04 p. 6:
> "Nos casos de contingências 4 e 9 o contribuinte deverá preencher, obrigatoriamente, os campos de Data e Hora da entrada em contingência (dhCont B28) e de Justificativa da entrada em contingência (xJust B29) que, todavia, não serão impressos no DANFE NFC-e."

D03, p. 9, campos da NFC-e off-line:
> "• Mod = 65 (NFC-e); • dhCont = data e hora de entrada em contingência; • xJust = preencher com a justificativa da entrada em contingência; • idDest = 1 (operação interna); • tpEmis = 9 (contingência off-line); • finfe = 1 (finalidade de emissão normal); • indFinal =1 (indicador de operação com consumidor final); • indPres =1 (indicador de presença do consumidor no estabelecimento);"

> "No caso de emissão em contingência deverá constar obrigatoriamente no DANFE NFC-e a mensagem "EMITIDA EM CONTINGÊNCIA"."

Leiaute, D06, p. 11:
> "B28 dhCont Data e Hora da entrada em contingência E B27.1 D 1-1 Data e hora no formato UTC (Universal Coordinated Time): AAAA-MM-DDThh:mm:ssTZD / B29 xJust Justificativa da entrada em contingência E B27.1 C 1-1 15 - 256"

RVs, D06, p. 78:
- B28-10: "Se emissão normal (tpEmis = 1-Normal): – dhCont e xJust não devem ser informados", Obrig., **556** "Rejeição: Justificativa de entrada em contingência não deve ser informada para tipo de emissão normal".
- B28-20: "Se emissão em contingência utilizando DPEC, formulário de segurança ou contingência off-line (tpEmis = 2, 4, 5 ou 9): – dhCont e xJust devem ser informados", Obrig., **557**.
- B28-30: "Data de entrada em contingência não deve ser maior que a data de recepção da NF-e […] Observação 2: Aceita uma tolerância de até 5 minutos", Facul., **558**.
- B28-40: "Data de entrada em contingência deve ser menor ou igual à data de emissão – 30 dias", Facul., **569** "Data de entrada em contingência muito atrasada". O texto é literal e ambíguo; a leitura provável é que dhCont não pode ser anterior a dhEmi − 30 dias.

### 3.2 Número novo ou o mesmo; mesma chave

D03, p. 8 (= D04, p. 6):
> "Outro ponto importante é a recomendação de que se avance um número na sequência da numeração quando da entrada em contingência a fim de evitar que a NFC-e emitida em contingência seja posteriormente rejeitada por duplicidade."

> "Também cabe alertar que, superado o problema técnico, na transmissão da NFC-e emitida em contingência, deve-se manter a mesma chave de acesso, inclusive com a manutenção do mesmo código numérico original (campo cNF B03)."

D03, p. 7:
> "Na escolha de contingência off-line da NFC-e (tpEmis = 9) não é necessária a adoção de série específica ou a utilização de papel especial."

D03, p. 11, Exemplo Prático:
> "Observação: É vedada a reutilização, em contingência, de número de NFC-e transmitida com tipo de emissão 'Normal'."

> "A NFC-e é emitida offline com numeração diferente, n° 21, para evitar a duplicidade da nota."

> "• Caso não haja tentativa de transmissão, a numeração utilizada na emissão off-line pode ser mantida."

### 3.3 O que fazer com a nota "normal" transmitida sem resposta

D03, pp. 11–12 (= D04, pp. 9–10):
> "• Caso na tentativa de transmissão (opção 1) o serviço de comunicação seja retomado, e a NFC-e autorizada,o procedimento correto é cancelar a NFC-e n°20."

> "Superado o problema técnico, a NFC-e n°21 é transmitida para obtenção da autorização de uso. Se vier a ser rejeitada, gerar novamente o arquivo com a mesma numeração e série, sanando a irregularidade e transmitir novamente. Para aquela que ficou pendente de retorno (a nota n° 20 desse exemplo): • inutilizar a numeração, se não autorizada; ou • cancelar, se autorizada."

O manual não diz como saber se a nº 20 foi autorizada. O caminho padrão é o WS NFeConsultaProtocolo4, mas isso é inferido. O cancelamento é o evento 110112 (seção 3.6), que existe exatamente para esse caso, ou o 110111 dentro do prazo normal. As regras dos dois estão em 3.6.

### 3.4 Prazo de transmissão

D03, p. 7 (= D04, p. 4):
> "Todavia, deve ser observado o prazo de envio para autorização da NFC-eaté o final do primeiro dia útil subsequente contado a partir de sua emissão em contingência.."

D03, p. 9:
> "Posteriormente, superado o problema técnico, até o final do primeiro dia útil seguinte à emissão, as NFC-e emitidas em contingência deverão ser transmitidas para obtenção da autorização de uso."

RV de atraso, D06, p. 76, B09-40 (mod. 65):
> "NFC-e com Tipo de Emissão=1-Normal (ou 3-SCAN, ou 6-SVC-AN, 7-SVC-RS) e Data-Hora de Emissão com atraso superior a 5 minutos em relação ao horário de recepção na SEFAZ. […] Exceção 2: A critério da UF, pode ser aceita a NFC-e com Data de Emissão muito atrasada, desde que tenham sido emitida em contingência (tpEmis=4, 9). A NFC-e transmitida para a SEFAZ Autorizadora após o prazo de 24 horas deveretornar cStat="150- Autorizado Uso da NF-e, autorização fora de prazo". […] Obrig. 704 Rej. Rejeição: NFC-e com Data-Hora de emissão atrasada"

A NT 2025.001 (D02, p. 6) diz: "Em relação a Nota Fiscal para Consumidor (NFC-e, modelo 65), se espera um atraso máximo de 5 minutos entre a Data de Emissão da NFC-e pela Empresa em relação a Data da Autorização do documento pelo Fisco."

### 3.5 Rejeições específicas

| Cód. | Regra (literal) | Fonte |
|---|---|---|
| **712** | B22-20 (65): "NFC-e com contingência off-line para a UF (tag:tpEmis=9 e UF não aceita este tipo de contingência)", Facul. "Rejeição: NFC-e com contingência off-line para a UF" | D06 p. 76 |
| **714** | B22-34 (65): "Na autorização pela SEFAZ: – rejeitar a NFC-e com opção de contingência inválida (tag:tpEmis=2, 4, 5) Observação: A contingência EPEC (tag:tpEmis=4) poderá ser aceita, a critério da UF. (NT 2015.002)", Facul. "Rejeição: NFC-e com contingência inválida (tpEmis=2, 4 (a critério da UF) ou 5)" | D06 p. 77 |
| 711 | B22-10 (55): "NF-e com contingência off-line (tag:tpEmis=9)", Obrig. | D06 p. 76 |
| 783 | B22-70 (65): "Na autorização pela SVC: – não aceitar autorização de NFC-e" | D06 p. 77 |
| **539** | 2B08-10: "Modelo 65: Acesso BD NFE (Chave: Modelo, UF, CNPJ Emitente, Série, Número, Tipo de Emissão): – NF-e já cadastrada, com diferença na Chave de Acesso (Código Numérico ou outras posições da Chave de Acesso). (NT 2011/004) (NT 2018.001 v1.10)", Facul. "Rejeição: Duplicidade de NF-e com diferença na Chave de Acesso [chNFe: …][nRec:…]" | D06 p. 134 |
| **204** | 2B08-20: "Acesso BD NFE (Chave: Modelo, UF, CNPJ/CPF Emitente, Série, Número): – NF-e já cadastrada e não Cancelada/Denegada […] Observação 2: A critério da UF, no caso do DigestValue ser igual a NF-e autorizada, poderá retornar o protocolo de Autorização. (NT 2018.005 v1.30 / NT 2018.001 v1.10)", Obrig. "Rejeição: Duplicidade de NF-e [nRec:999999999999999]" | D06 p. 134 |
| 556 / 557 / 558 / 569 | dhCont/xJust (ver 3.1) | D06 p. 78 |
| 704 / 150 | atraso de dhEmi; 150 = autorizado fora de prazo (ver 3.4) | D06 p. 76 |
| 396 / 397 / 400 / 464 | parâmetros, divergência, hex e hash do QR v2 off-line | D06 pp. 132–133 |
| 445 / 474 / 583 / 407 / 444 | QR v3 (ver 1(c)) | D02 pp. 11–13 |

Observação sobre a 539 no mod. 65: a chave de busca inclui o **Tipo de Emissão**. Inferido: uma nota tpEmis=9 com o mesmo número de uma tpEmis=1 não cai na 539. A 204, cuja chave não inclui o tpEmis, continua se aplicando. Isso combina com a recomendação de avançar o número (3.2).

### 3.6 Evento 110112 (Cancelamento por substituição)

**Base legal citada** (D07, p. 3; igual em D05, p. 47):
> "O Ajuste SINIEF 07/18, que alterou o ajuste 19/16, trouxe a seguinte redação: "Cláusula décima quinta-A Na hipótese prevista no inciso I da cláusula décima segunda, o emitente poderá solicitar o cancelamento da NFC-e, desde que tenha sido emitida uma outra NFC-e em contingência para acobertar a mesma operação, em prazo não superior a 168 horas, podendo ser reduzido a critério de cada unidade federada, contado do momento em que foi concedida a Autorização de Uso da NFC-e, de que trata o inciso I da cláusula oitava.""

**detEvento**: D05 (MOC 7.0 Visão Geral), p. 105, Tabela 5-37; o mesmo texto está em D07, pp. 4–5.
> "P18 versao A P17 N 1-1 2v2 Informar o mesmo valor da tag "verEvento" (P16) / P19 descEvento E P17 C 1-1 5-60 Veja a descrição do evento, junto com o Tipo de Evento documentado anteriormente. / P20 cOrgaoAutor E P17 N 1-1 2 Código do Órgão Autor do Evento. Informar o Código da UF para este Evento. Nota: Campo exclusivo do Evento "110112 – Cancelamento por substituição". / P21 tpAutor E P17 N 1-1 1 Informar 1=Empresa Emitente. Valores: 1=Empresa Emitente, 2=Empresa destinatária; 3=Empresa; 5=Fisco; 6=RFB; 9=Outros Órgãos; Nota: Campo exclusivo do Evento "110112 […]". / P22 verAplic E P17 C 1-1 1-20 Versão do aplicativo do Autor do Evento. Nota: Campo exclusivo do Evento "110112 […]". / P23 nProt E P17 N 1-1 15 Informar o número do Protocolo de Autorização da NF-e a ser Cancelada. / P30 xJust E P17 C 1-1 15-255 Informar a justificativa do cancelamento / P31 chNFeRef E P17 N 1-1 44 Informa a chave de acesso da NF-e substituta da NF-e a ser cancelada. Nota: Campo exclusivo do Evento "110112 – Cancelamento por substituição"."

Ordem dos elementos no detEvento: versao (atributo), descEvento, cOrgaoAutor, tpAutor, verAplic, nProt, xJust, chNFeRef. Os schemas são `envEventoCancSubst_v1.00.xsd` e `retEventoCancSubst_v1.00.xsd` (D05, p. 105; a D07 grafa "v1.0").

Da parte geral (D07, p. 4):
- "P07 Id … "ID" + tpEvento + Chave da NF-e + nSeqEvento"
- "P08 cOrgao … Informar o código da UF para este evento."
- "P15 nSeqEvento … Informar o valor "1" para este evento."
- "P04 evento … um lote pode conter até 20 eventos"
- "P91 Signature … a assinatura deverá ser aplicada no elemento infEvento".

**Lacuna:** o literal de `descEvento` para o 110112 não aparece no texto do MOC nem da NT ("Veja a descrição do evento"). Ele está no XSD `e110112_v1.00.xsd`, que não foi lido. Pela convenção dos outros eventos, sem acento, a candidata é "Cancelamento por substituicao", mas isso é **não verificado**.

**Regras de negócio**: D05, pp. 106–109, Tabela 5-38, a versão mais recente.
- P12-48: "Se tpEvento=110112 e NF-e com Tipo de Emissão diferente de 1-Normal", Obrig. **920** "Rejeição: Tipo de emissão da NF-e a ser cancelada deve ser normal".
- 5P31-44: "Se tpEvento=110112 e chave da NF-e substituta com Tipo de Emissão igual a 1-Normal", Obrig. **921** "Rejeição: Tipo de emissão da NF-e substituta deve ser de contingência".
- P20-10: "UF do Autor (cOrgaoAutor) diverge da UF da Chave de Acesso", **455**.
- P21-10: "Tipo do Autor difere de "1=Empresa Emitente"", **466** "Evento com Tipo de Autor incompatível".
- P31-10 a P31-34 (chNFeRef inválida: dígito, UF, ano, mês, CNPJ/CPF, modelo, número): **910**.
- P31-38 a P31-52 (substituta igual, ou com UF, CNPJ/CPF ou modelo divergente): **911**.
- 2P12-18: "Se tpEvento=110112 (Cancelamento por Substituição): verificar se NF-e autorizada há mais de 7 dias (168 horas). Nota: Considera a exceção de prazo definida em legislação estadual", **501**.
- 2P12-22: NF-e denegada ou cancelada, **580**. 2P23-10: nProt diverge, **222**. 3P15-10: duplicidade de evento, **573**.
- 5P31-10, substituta inexistente: **912**.
- 5P31-14, substituta denegada ou cancelada: **913**.
- 5P31-20: "Data de emissão da NF-e substituta (chNFeRef) maior que 2 horas da data de emissão da NF-e a ser cancelada (chNFe)", **914**.
- 5P31-24, valor total difere: **915**.
- 5P31-28, ICMS total difere: **916**.
- 5P31-32: "Se foi identificado o destinatário na NF-e original (CNPJ/CPF/ID Estrangeiro): – Identificação do destinatário […] difere", **917**.
- 5P31-36, quantidade de itens difere: **918**.
- 5P31-40: "Verificar se o item da NF-e substituta (chNFeRef) difere do respectivo item da NF-e a ser cancelada (chNFe). Nota: Verificar divergência para os campos cProd, cEAN, xProd, NCM, CFOP, uCom, qCom, vUnCom, vProd, indTot", **919**.
- Retorno de sucesso: cStat=135; D05 p. 105: "xEvento: "Cancelamento homologado"". D07 p. 11: "A SEFAZ autorizadora poderá aceitar o cancelamento fora de prazo […] Status "155-Cancelamento homologado fora de prazo"".
- Também da D07, p. 8: P11-20, "Se informado o CPF do Autor do evento e Modelo da Chave de Acesso = 65: – Evento não disponível para Autor tipo pessoa física", **408**.

Para comparar, o cancelamento normal 110111: na D07, p. 9, 2P12-14 dizia "Se modelo=65 (NFC-e) e NF autorizada há mais de 30 minutos". A D05, p. 107, diz "verificar se NF-e autorizada há mais de 1 dia (24 horas)". Ver seção 4.

---

## 4. Divergências entre fontes

1. **Vetor do QR v2 (D01):** a linha "CSC de produção 1" diz `CODIGO-CSC-CONTRIBUINTE-36-CARACTERES`, mas o hash publicado só fecha com `SEU-CODIGO-CSC-CONTRIBUINTE-36-CARACTERES`. Verificado por execução, on-line e off-line.
2. **Tamanho do qrCode:** Anexo I MOC 7.0 (2020) 100-600 × NT 2025.001 v1.03 **60-1000**. A NT é mais nova e acompanha o schema.
3. **ZX02-220 (rej. 407):** o histórico da v1.01 da NT 2025.001 diz "Removida", mas a tabela da v1.03 (p. 11) ainda traz a regra. A extração por texto não mostra tachado. Leitura mais segura: tratar 407 como possível em UF que ainda não aceite v3.
4. **Regra 920 do 110112:** a NT 2018.004 junta numa só RV "tpEmis da chave ≠ 1" e "tpEmis da substituta ≠ 9". O MOC 7.0 separa em 920 (cancelada deve ser normal) e **921** (substituta não pode ser 1-Normal). Pela redação do MOC, uma substituta tpEmis=4 (EPEC) passaria; pela NT, só a 9. O MOC é posterior (nov/2020).
5. **Prazo do cancelamento normal (110111) mod. 65:** NT 2018.004 "30 minutos" × MOC 7.0 "1 dia (24 horas)", com exceção por legislação estadual. Não é o foco, mas afeta a escolha entre 110111 e 110112.
6. **Manual DANFE/QR:** o Portal NF-e tem a v6.0 (mar/2025, com QR v3); o portal SVRS ainda lista a v5.1/v5.0.
7. **Por UF:**
   - **RJ:** o próprio manual traz duas urlChave. Item 2.6, atualizado em 29/04/2025: `www.fazenda.rj.gov.br/nfce/consulta`. Seção DANFE, de 11/03/2025: `https://consultadfe.fazenda.rj.gov.br/consultaDFe/paginas/consultaChaveAcesso.faces`.
   - **ES:** o texto da âncora da urlChave parece duas URLs coladas, e o href é só `https://app.sefaz.es.gov.br/ConsultaNFCe/`.
   - **GO:** a página goias.gov.br é de 2016 e superada; vale o IT 2025.003, com host novo `nfeweb.` e https.
   - **PB:** o aviso de 2024 superou o de 2020; a urlChave ficou só em `www.sefaz.pb.gov.br/nfce`.
   - **PR:** a página QR-Code traz `http://www.fazenda.pr.gov.br/nfce/qrcode?` e a página de Web Services a mesma URL sem esquema.
   - **TO:** URLs `apps.sefaz.to.gov.br` marcadas ANTIGO.
   - **BA:** fonte de 2018.
   - **AM:** página com WS antigos, possivelmente desatualizada.
