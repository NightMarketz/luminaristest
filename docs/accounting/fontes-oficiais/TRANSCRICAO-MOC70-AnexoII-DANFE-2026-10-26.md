# Transcrição: MOC 7.0, Anexo II (leiaute base do DANFE da NF-e 55 e código de barras), em 2026-10-26

> **Item 2 do PR-0 do [`BE-INCR-NFE-DANFE-IBSCBS-brief.md`](../BE-INCR-NFE-DANFE-IBSCBS-brief.md)** (nó `NFE-DANFE-IBSCBS`;
> autorização do dono no chat, 2026-10-26: *"Executa o NFE-DANFE-IBSCBS PR-0 — sessao-feature, sem merge."*). Este arquivo
> resolve o insumo ausente 1 do BRIEF (§7). As regras dos itens 10, 13 e 14 citam a **chave** `[MOC-DANFE-…]` da linha
> que aplicam. A NT 2026.010 acrescenta campos a este leiaute; a transcrição dela está em
> [`TRANSCRICAO-NT2026010-DANFE-RTC-2026-10-26.md`](TRANSCRICAO-NT2026010-DANFE-RTC-2026-10-26.md).
>
> **Fonte:** Portal da NF-e → Documentos → Manuais → *"Anexo II - Manual Especificações Técnicas - Danfe-Código-Barras"*,
> <https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=f%20NhsSn3/5M=>. O host exige cookie de sessão
> (`curl -c cj -b cj -L -A "<UA de navegador>"`). Baixado 2026-10-26: PDF de 28 páginas, 1.345.906 bytes, sha256
> `729c04fd1374188c29eb21ca60342741b24a014003d4c2ff1bbb455bb1a6a60e`. Título da capa: *"Anexo II - Manual de Especificações
> Técnicas do DANFE e Código de Barras — Versão 7.00 - Outubro de 2020"*. Cópia e texto no dossiê
> [`pesquisas-legais/nfe-danfe-pr0/`](../../../pesquisas-legais/nfe-danfe-pr0/relatorio.md) [D02].
>
> **Por que o Anexo II:** o MOC 7.0 Visão Geral (sha `f664dcf94b77…`, o mesmo de 26/09, rebaixado hoje) diz no §2.2.4 que o
> DANFE segue o *"MOC - Anexo II - Manual de Especificações Técnicas do DANFE e Código de Barras"*. A NT 2026.010 §4.4 mantém
> *"as regras de aproveitamento do espaço previstas no Manual do DANFE"*.
>
> **Vigência:** a partir de **01/11/2026** o MOC passa a ter versão online mantida pelo Paraná (Aj. SINIEF 40/26; nota da
> EMENDA-3 do X10a em `TRANSCRICAO-MOC70-assinatura-digital-NFe-2026-09-26.md`). Hoje (26/10) a versão vigente é a 7.00.
> **Pendência:** o PR-2 (render, alvo 24/11) confere se a versão online diverge nas linhas `[MOC-DANFE-…]` abaixo.

## 1. Código de barras (Anexo II §2, pp. 6–7, e Anexo III.01, p. 24)

| chave | regra | onde |
|---|---|---|
| `[MOC-DANFE-C128-SIMB]` | Simbologia **CODE-128C**. Emissão normal ou SVC: **um** código de barras, com a chave de acesso. Contingência FS/FS-DA: dois códigos (o segundo, "Dados da NF-e", fica fora: o nó não trata contingência) | §2, p. 6 |
| `[MOC-DANFE-C128-ESTRUTURA]` | Margem clara · Start C · dados · DV · Stop · margem clara. Start C (valor 105) não representa caractere. Cada símbolo codifica 2 dígitos: 44 dígitos = 22 símbolos | §2, pp. 6–7 |
| `[MOC-DANFE-C128-DIM]` | Largura mínima total do código da chave (44 posições): **6 cm** em impressora de não impacto. Altura mínima da barra **0,8 cm**. Largura mínima do módulo **0,02 cm**. Margem clara de no mínimo **10 módulos** de cada lado. Total = 242 + 20 + 11 (start) + 11 (DV) + 13 (stop) = **297 módulos** | §2, p. 7 |
| `[MOC-DANFE-C128-DV]` | DV = (105 × 1 + Σ valorᵢ × i) mod 103, com i = 1, 2, … na ordem dos pares de dígitos | §2.1, p. 7 |
| `[MOC-DANFE-C128-VETOR]` | **Vetor de teste do MOC:** dados `09758364` → valores 105, 9, 75, 83, 64 → soma ponderada **769** → DV **48**. Sequência de larguras (barra/espaço alternados, start a stop): `2112322212132412111142121114223131212331112` | §2.1–§2.2, p. 7 |
| `[MOC-DANFE-C128-TABELA]` | Larguras por valor (6 elementos, começando por barra, 11 módulos cada). Start C (105) = `211232`. Stop = `2331112` (7 elementos, 13 módulos). Tabela no §1.1 | Anexo III.01, p. 24 |

### 1.1. Tabela CODE-128C (Anexo III.01)

Extraída do PDF por script (`pdftotext -layout`) e conferida assim: cada padrão soma 11 módulos, e a concatenação
start, 09, 75, 83, 64, 48 (DV) e stop reproduz, dígito a dígito, a sequência impressa no §2.2 do MOC (`[MOC-DANFE-C128-VETOR]`).

| valor | larguras (B S B S B S) | valor | larguras | valor | larguras |
|---|---|---|---|---|---|
| 00 | `212222` | 35 | `131321` | 70 | `112412` |
| 01 | `222122` | 36 | `112313` | 71 | `122114` ¹ |
| 02 | `222221` | 37 | `132113` | 72 | `122411` |
| 03 | `121223` | 38 | `132311` | 73 | `142112` |
| 04 | `121322` | 39 | `211313` | 74 | `142211` |
| 05 | `131222` | 40 | `231113` | 75 | `241211` |
| 06 | `122213` | 41 | `231311` | 76 | `221114` |
| 07 | `122312` | 42 | `112133` | 77 | `413111` |
| 08 | `132212` | 43 | `112331` | 78 | `241112` |
| 09 | `221213` | 44 | `132131` | 79 | `134111` |
| 10 | `221312` | 45 | `113123` | 80 | `111242` |
| 11 | `231212` | 46 | `113321` | 81 | `121142` |
| 12 | `112232` | 47 | `133121` | 82 | `121241` |
| 13 | `122132` | 48 | `313121` | 83 | `114212` |
| 14 | `122231` | 49 | `211331` | 84 | `124112` |
| 15 | `113222` | 50 | `231131` | 85 | `124211` |
| 16 | `123122` | 51 | `213113` | 86 | `411212` |
| 17 | `123221` | 52 | `213311` | 87 | `421112` |
| 18 | `223211` | 53 | `213131` | 88 | `421211` |
| 19 | `221132` | 54 | `311123` | 89 | `212141` |
| 20 | `221231` | 55 | `311321` | 90 | `214121` |
| 21 | `213212` | 56 | `331121` | 91 | `412121` |
| 22 | `223112` | 57 | `312113` | 92 | `111143` |
| 23 | `312131` | 58 | `312311` | 93 | `111341` |
| 24 | `311222` | 59 | `332111` | 94 | `131141` |
| 25 | `321122` | 60 | `314111` | 95 | `114113` |
| 26 | `321221` | 61 | `221411` | 96 | `114311` |
| 27 | `312212` | 62 | `431111` | 97 | `411113` |
| 28 | `322112` | 63 | `111224` | 98 | `411311` |
| 29 | `322211` | 64 | `111422` | 99 | `113141` |
| 30 | `212123` | 65 | `121124` | 100 | `114131` |
| 31 | `212321` | 66 | `121421` | 101 | `311141` |
| 32 | `232121` | 67 | `141122` | 102 | `411131` |
| 33 | `111323` | 68 | `141221` | 103 | `211412` |
| 34 | `131123` | 69 | `112214` | 104 | `211214` |

¹ **Erro tipográfico da fonte:** o PDF imprime "61" duas vezes. A segunda ocorrência fica entre 70 e 72 e o valor 71 não
aparece em outro lugar, então ela é lida como **71** (**inferido**). O vetor do §2.2 não usa o valor 71. Com o F-DANFE-4 (b)
(biblioteca), a tabela serve para conferir a saída da biblioteca, não para codificar.

## 2. Regras gerais do DANFE (Anexo II §3 e §3.1, pp. 8–9)

| chave | regra | onde |
|---|---|---|
| `[MOC-DANFE-HOMOLOG]` | NF-e autorizada **em homologação**: o DANFE deve conter a frase **"SEM VALOR FISCAL"** no quadro "Informações Complementares" **ou** em marca d'água destacada | §3, p. 8 |
| `[MOC-DANFE-CONTINGENCIA]` | NF-e emitida em contingência: a informação vai em destaque, conforme o Anexo IV do MOC 7 (fora do nó: sem contingência) | §3, p. 8 |
| `[MOC-DANFE-SO-XML]` | Os campos do DANFE representam o conteúdo das tags do XML. **"Não poderão ser impressas informações que não constem do arquivo da NF-e."** O conteúdo pode ocupar mais de uma linha | §3.1, p. 8 |
| `[MOC-DANFE-TODOS-CAMPOS]` | O DANFE contém todos os campos do modelo adotado, exceto as colunas não obrigatórias de "Dados dos Produtos/Serviços" (`[MOC-DANFE-COLUNAS]`). As mesmas regras valem para as folhas adicionais | §3.1, p. 8 |
| `[MOC-DANFE-CHAVE-MASCARA]` | Chave de acesso impressa em **11 blocos de 4 dígitos**: `9999 9999 9999 9999 9999 9999 9999 9999 9999 9999 9999` | §3.1.1, p. 8 |
| `[MOC-DANFE-EMITENTE]` | Quadro do emitente com, no mínimo: nome ou razão social; endereço completo (logradouro, número, complemento, bairro, município, UF, CEP); telefone. Logotipo é opcional | §3.1.3, p. 9 |
| `[MOC-DANFE-RETIRADA-ENTREGA]` | Grupos F (local de retirada) e G (local de entrega): exibição **possível** em área própria (NT 2018.005) | §3.1.4–§3.1.5, p. 9 |
| `[MOC-DANFE-FATURA]` | Quadro Fatura/Duplicatas: pode ter linhas divisórias internas; pode receber outras informações de cobrança, desde que estejam no XML | §3.1.6, pp. 9–10 |

## 3. Quadro "Dados dos Produtos/Serviços" e informações complementares (§3.1.7–§3.1.10, §3.2, pp. 10–13)

| chave | regra | onde |
|---|---|---|
| `[MOC-DANFE-INFADPROD]` | `infAdProd` é impresso **logo abaixo** do item a que se refere | §3.1.7, p. 10 |
| `[MOC-DANFE-DESTAQUE-ITEM]` | Item que ocupa mais de uma linha recebe **destaque divisório** que separe um item do outro: linha (pontilhada, contínua ou tracejada), espaço duplo, sombreamento ou recurso semelhante | §3.1.7, pp. 10–11 |
| `[MOC-DANFE-VUNTRIB]` | Valor unitário comercial diferente do tributável: os dois aparecem identificados (linha adicional ou informações adicionais) | §3.1.7, p. 11 |
| `[MOC-DANFE-COLUNAS]` | O contribuinte pode suprimir colunas que não se aplicam e acrescentar outras **à direita** de "Descrição", mantendo a ordem das demais. **Não podem ser suprimidas:** Código, Descrição, NCM, CST, CFOP, Unidade, Quantidade, Valor Unitário, Valor Total, BC do ICMS próprio, Valor do ICMS próprio e Alíquota do ICMS | §3.1.7, p. 11 |
| `[MOC-DANFE-COLUNA-DUPLA]` | Pares que podem dividir uma coluna (2 linhas por item): Código/NCM; CST/CFOP; CSOSN/CFOP; Quantidade/Unidade; Valor Unitário/Desconto; Valor Total/BC do ICMS; BC do ICMS ST/Valor do ICMS ST; Valor do ICMS/Valor do IPI; Alíquota do ICMS/Alíquota do IPI. A Descrição não divide coluna | §3.2, p. 13 |
| `[MOC-DANFE-INFCPL]` | "Informações Complementares" contém **todo** o `infAdFisco` e o `infCpl`; `obsCont` é facultativo. Sem espaço, continua no verso ou na folha seguinte, no mesmo quadro ou em "Dados dos Produtos/Serviços" | §3.1.8, pp. 11–12 |
| `[MOC-DANFE-FISCO]` | "Reservado ao Fisco": o contribuinte **não preenche** (salvo orientação da UF) | §3.1.9, p. 12 |
| `[MOC-DANFE-MODFRETE]` | `modFrete` (X02) impresso com o código e a descrição: 0 Contratação do Frete por conta do Remetente (CIF); 1 … do Destinatário (FOB); 2 … de Terceiros; 3 Transporte Próprio por conta do Remetente; 4 … do Destinatário; 9 Sem Ocorrência de Transporte. Exemplo do MOC: "0 – Remetente" | §3.1.10, p. 12 |
| `[MOC-DANFE-ICMS-DESON]` | `vICMSDeson`, enquanto não estiver no leiaute, é copiado **pelo emissor** para `infCpl` (regra do emissor, não do leitor) | §3.10.5, p. 22 |

## 4. Supressões, verso e folhas adicionais (§3.3–§3.5, §3.10.2, pp. 13–14 e 22)

| chave | regra | onde |
|---|---|---|
| `[MOC-DANFE-SUPR-CANHOTO]` | Sem o bloco de canhoto, o espaço vai para "Dados dos Produtos/Serviços". Sem formulário de segurança, o canhoto pode ir para a extremidade inferior. Só no retrato | §3.3.1, p. 13 |
| `[MOC-DANFE-SUPR-FATURA]` | Fatura/Duplicatas pode ser suprimido (sem esses documentos) ou reduzido (com todos os dados das tags); o espaço vai para "Dados dos Produtos/Serviços". Retrato e paisagem | §3.3.2, p. 13 |
| `[MOC-DANFE-SUPR-ISSQN]` | "Cálculo do ISSQN" pode ser suprimido quando não se aplica; o espaço vai para "Dados dos Produtos/Serviços" e para "Informações Complementares"/"Reservado ao Fisco" | §3.3.3, p. 14 |
| `[MOC-DANFE-VERSO]` | Até 50% do verso pode continuar "Dados dos Produtos/Serviços" e/ou "Informações Complementares"; o resto do verso fica em branco. Usado o verso, imprime-se **"CONTINUA NO VERSO"** no anverso, ao fim do quadro continuado | §3.4, p. 14 |
| `[MOC-DANFE-FOLHAS]` | DANFE em mais de uma folha: cada folha adicional traz no topo, na mesma disposição e tamanho da 1ª: identificação do emitente; "DANFE" em destaque e "Documento Auxiliar da Nota Fiscal Eletrônica"; número e série, tipo de operação (Entrada/Saída), total de folhas e número da folha; código(s) de barras; Natureza da Operação e Chave de Acesso; IE, IE do substituto tributário e CNPJ do emitente. O resto da folha recebe **só** os itens que não couberam (mesmas colunas e larguras) e/ou o restante das informações complementares | §3.5, p. 14 |
| `[MOC-DANFE-NUM-FOLHA]` | Número da folha e total de folhas no topo de **todas** as folhas, inclusive a 1ª, mesmo com folha única | §3.10.2, p. 22 |

## 5. Formulário, fontes e identificação do documento (§3.6–§3.7, pp. 14–16)

| chave | regra | onde |
|---|---|---|
| `[MOC-DANFE-PAPEL]` | Retrato ou paisagem, mínimo A4, máximo Ofício II (230 × 330 mm). Folha maior que A4: o excedente vai para largura dos campos ou altura de "Dados dos Produtos/Serviços" e/ou "Informações Complementares"/"Reservado ao Fisco" | §3.6.1, p. 14 |
| `[MOC-DANFE-MARGEM]` | Margem entre o corpo impresso e a borda: **mínimo 0,2 cm, máximo 0,8 cm** em cada lado (inclusive superior e inferior) | §3.6.2, p. 15 |
| `[MOC-DANFE-MODELOS]` | Disposição obrigatória conforme o anexo do formato: retrato folhas soltas (III.02), retrato contínuo (III.03), paisagem folhas soltas (III.04), paisagem contínuo (III.05) | §3.6.3, p. 15 |
| `[MOC-DANFE-FONTE]` | Fonte **Times New Roman ou Courier New**. Descritivo de bloco: ≥ 5 pt, negrito, caixa alta. Descritivo de coluna de produtos: ≥ 5 pt, caixa alta. Demais descritivos: ≥ 6 pt, caixa alta | §3.7–§3.7.3, p. 15 |
| `[MOC-DANFE-IDENT-DOC]` | "DANFE", entrada/saída, número, série e folhas em caixa alta. "DANFE" em negrito ≥ 12 pt. Série, número, folha, total de folhas e o dígito do tipo de operação (`tpNF`) em negrito ≥ 10 pt. "DOCUMENTO AUXILIAR DA NOTA FISCAL ELETRÔNICA" e "ENTRADA"/"SAÍDA" ≥ 8 pt | §3.7.4, p. 15 |
| `[MOC-DANFE-FONTE-CONTEUDO]` | Chave de acesso em negrito. Emitente em negrito, razão social ≥ 12 pt e os demais dados ≥ 8 pt. Conteúdo de produtos ≥ 6 pt. Informações complementares ≥ 6 pt. Demais campos ≥ 10 pt | §3.7.5–§3.7.9, pp. 15–16 |
| `[MOC-DANFE-TAMANHOS]` | As medidas do §3.8 são **sugestão, não obrigação** (§3.1, p. 8). A extração do PDF embaralha a tabela; as posições não são usadas como regra (ver §6) | §3.8, pp. 16–19 |

## 6. Ordem dos quadros no retrato (§3.8.1, pp. 16–17)

Ordem de cima para baixo, pela coluna "Superior" da tabela do §3.8.1 (cm a partir do topo). A ordem é **verificada**; as
medidas são sugestão. A NT 2026.010 (p. 8) insere "Total do IBS/CBS/IS" entre "Total do ICMS/IPI" e "Cálculo do ISSQN" e
divide "Cálculo do Imposto" em "Total dos produtos e total da nota" e "Total do ICMS/IPI".

`[MOC-DANFE-ORDEM]`:

1. **Canhoto** (0,42): "RECEBEMOS DE …", "NF-e / Nº / SÉRIE", "DATA DE RECEBIMENTO", "IDENTIFICAÇÃO E ASSINATURA DO RECEBEDOR".
2. **Dados da NF-e** (2,54): identificação do emitente · quadro "DANFE" (descrição, 0-ENTRADA/1-SAÍDA, número, série, folha) ·
   código de barras da chave (2,78) · chave de acesso (4,02) · campo 1 de conteúdo variável (4,98) · natureza da operação
   (B04) e campo 2 de conteúdo variável (6,46; o rótulo da tabela é "DADOS DA NF-e", leitura **inferida** pela posição e pelo §3.9) · IE (C17), IE do ST (C18) e CNPJ (C02) do emitente (7,31).
3. **Destinatário/Remetente** (8,16–10,28): razão social (E04), CNPJ (E02), data de emissão (B09); endereço (E06),
   bairro (E09), CEP (E13), data de entrada/saída (B10); município (E11), fone (E16), UF (E12), IE (E03), hora de entrada/saída.
4. **Fatura/Duplicatas** (11,09): Y02, com as duplicatas do grupo Y07 permitidas (Obs 1).
5. **Cálculo do Imposto** (12,78): BC do ICMS (W03), ICMS (W04), BC do ICMS ST (W05), ICMS ST (W06), total dos produtos
   (W07), frete (W08), seguro (W09), desconto (W10), outras despesas (W15), IPI (W12), total da nota (W16).
6. **Transportador/Volumes transportados** (14,48): grupo X.
7. **Dados dos Produtos/Serviços** (17,45): colunas na ordem descrita (Obs 4): código (I02), descrição (I04), "colunas
   específicas da empresa", NCM/SH (I05), CST (N11/N12), CFOP (I08), unidade (I09/I13), quantidade (I10/I14), valor unitário
   (I10a/I14a), desconto (I17), valor total (I11), BC do ICMS (N15), BC do ICMS ST (N21), ICMS (N17), ICMS ST (N23), IPI
   (O14), alíquota do ICMS (N16), alíquota do IPI (O13).
8. **Cálculo do ISSQN** (24,64): inscrição municipal (C19), total dos serviços (W18), BC do ISSQN (W19), ISSQN (W20).
9. **Dados adicionais** (25,91): Informações Complementares (Z02/Z03) e Reservado ao Fisco.

## 7. Campos de conteúdo variável e protocolo (§3.9, pp. 20–21)

| chave | regra | onde |
|---|---|---|
| `[MOC-DANFE-CAMPO1]` | Emissão normal ou SVC: o **Campo 1** (abaixo da chave) traz onde consultar a autenticidade. Texto do exemplo do MOC: *"Consulta de autenticidade no portal nacional da NF-e www.nfe.fazenda.gov.br/portal ou no site da Sefaz Autorizadora"* | §3.9.1, p. 20 |
| `[MOC-DANFE-PROTOCOLO]` | Emissão normal ou SVC: o DANFE sai **depois** da autorização de uso, em papel comum, com o **Campo 2** = "PROTOCOLO DE AUTORIZAÇÃO DE USO" seguido do número do protocolo e da data e hora da autorização. Exemplo do MOC: `11090123456789 12/03/2009 10:00:00` | §3.9.1, p. 20 |
| `[MOC-DANFE-TPNF]` | Quadro do tipo de operação: "0 - ENTRADA / 1 - SAÍDA", com o dígito de `tpNF` em destaque | §3.9, p. 20; §3.7.4 |
| `[MOC-DANFE-FS-EPEC]` | FS/FS-DA (código de barras "Dados da NF-e", 36 posições) e EPEC ("PROTOCOLO DE AUTORIZAÇÃO DO EPEC") ficam **fora** do nó: o X10a não emite em contingência no escopo atual (E1-5) | §3.9.2–§3.9.3, pp. 20–21 |

## 8. Outros (§3.10–§3.12, p. 22)

- `[MOC-DANFE-MARCA-DAGUA]`: marca d'água permitida desde que não prejudique a leitura (§3.10.1).
- `[MOC-DANFE-BARRAS-EXTRA]`: códigos de barras de interesse do emissor só em informações complementares, rodapé ou verso (§3.10.4).
- DANFE Simplificado (§3.11) e Simplificado-Etiqueta (§3.12): fora do nó (achado §9 item 3 do BRIEF; a NT 2026.003 cria o Tipo 2).

## 9. Divergências entre este anexo e a NT 2026.010 (registradas, não decididas)

1. **Texto do Campo 1.** MOC 7.0 (p. 20): *"Consulta de autenticidade no portal nacional da NF-e … ou no site da Sefaz
   Autorizadora"*. Modelo da NT 2026.010 (p. 8): *"Consulte a autenticidade no portal nacional da NF-e … ou no site da SEFAZ
   autorizadora"*. O BRIEF não diz qual texto o item 11 imprime (lacuna L-DANFE-PR0-3 do retorno do PR-0).
2. **FCP.** O MOC (§3.1.7 e §3.1.8) manda o **emissor** pôr o FCP por item em `infAdProd` e os totais (W04b, W06a) em
   `infAdFisco`. A NT 2026.010 §4.4 cria campos facultativos de FCP no bloco de totais (vFCP W04h, vFCPST W06a). O leitor só
   imprime o que está no XML, então as duas regras convivem; o ID do total do FCP diverge entre as fontes (W04b no MOC,
   W04h na NT; o do FCP-ST é W06a nas duas) e o item 10 lê pelo **nome da tag**, não pelo ID.
