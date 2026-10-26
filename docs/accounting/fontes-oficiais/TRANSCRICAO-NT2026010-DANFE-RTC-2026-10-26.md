# Transcrição: NT 2026.010 v1.00 (DANFE da Reforma Tributária) e classificação das NTs do nó, em 2026-10-26

> **Itens 1 e 3 do PR-0 do [`BE-INCR-NFE-DANFE-IBSCBS-brief.md`](../BE-INCR-NFE-DANFE-IBSCBS-brief.md)** (nó `NFE-DANFE-IBSCBS`;
> autorização do dono no chat, 2026-10-26: *"Executa o NFE-DANFE-IBSCBS PR-0 — sessao-feature, sem merge."*). Uma linha por
> campo: rótulo impresso, tag, ID e condição. As chaves `[NT10-…]` são as do BRIEF §1. O leiaute base, que esta NT altera,
> está em [`TRANSCRICAO-MOC70-AnexoII-DANFE-2026-10-26.md`](TRANSCRICAO-MOC70-AnexoII-DANFE-2026-10-26.md).
>
> **Fonte:** Portal da NF-e → Documentos → Notas Técnicas → *"Nota Técnica 2026.010 v.1.00 - Publicada em 01/10/2026 —
> Divulga modelo do Danfe pra RTC"*, <https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=ugn4MYF5PLg=>
> (cookie de sessão, como no MOC). **Rebaixada em 2026-10-26:** PDF de 9 páginas, 712.823 bytes, sha256
> `eadc5246235f37a55f8140ddcf84595c8ce77f2d760f111f7b85ddf389b8f484`, **igual** ao de 17/10 e ao de 22/10 (dossiê
> `nfe-danfe-ibscbs-nt2026010` [D03]). A NT não mudou. Cópia e texto: dossiê
> [`pesquisas-legais/nfe-danfe-pr0/`](../../../pesquisas-legais/nfe-danfe-pr0/relatorio.md) [D01]. O texto foi extraído com
> `pdftotext -raw`, que mantém a ordem das células; o `-layout` embaralha a tabela do §4.3.
>
> **Vigência:** "Alteração do Leiaute do DANFE": teste "-", produção **01/12/2026** (p. 3). Aplica-se ao DANFE **modelo 55**
> (§1: *"Documento Auxiliar da Nota Fiscal Eletrônica (DANFE), modelo 55"*).

## 1. §4.1 Novo bloco "Total do IBS/CBS/IS" (p. 4–5) `[NT10-TOT]`

Posição: *"imediatamente após o bloco 'Total do ICMS/IPI'"*.

| # | rótulo impresso | tag | ID |
|---|---|---|---|
| 1 | Valor da CBS | `vCBS` | W56 |
| 2 | Valor do IBS UF | `vIBSUF` | W41 |
| 3 | Valor do IBS Município | `vIBSMun` | W46 |
| 4 | Valor do Imposto Seletivo | `vIS` | W33 |
| 5 | Valor do IBS Monofásico | `vIBSMono` | W58 |
| 6 | Valor da CBS Monofásica | `vCBSMono` | W59 |
| 7 | Valor do IBS Monofásico por Retenção | `vIBSMonoReten` | W59a |
| 8 | Valor da CBS Monofásica por Retenção | `vCBSMonoReten` | W59b |

**8 linhas.** As linhas 5–8 também estão no §4.4 como facultativas (condição em §4 abaixo).

## 2. §4.2 Campos no quadro do emitente (p. 5) `[NT10-EMIT]`

| # | rótulo impresso | tag | ID | condição |
|---|---|---|---|---|
| 1 | Código do Regime Tributário | `CRT` | C21 | sempre (**inferido**: a NT não diz "sempre"; o CRT só não está entre os facultativos do §4.4). O modelo da p. 8 imprime código e descrição: *"3 - REGIME NORMAL"* |
| 2 | Tipo de Regime de Apuração do IBS e da CBS | — | *"tag/ID a ser publicada em NT futura"* | §4.4: *"Campo reservado. Não imprimir conteúdo enquanto não houver definição da origem da informação."* |

**2 linhas.**

## 3. §4.3 Campos do item em "Dados dos Produtos/Serviços" (p. 5) `[NT10-ITEM]` `[NT10-ALIQ]`

*"Os campos abaixo correspondem diretamente ao Grupo UB do leiaute da NF-e"*.

| # | rótulo impresso | tag (ID) | com `gRed` informado |
|---|---|---|---|
| 1 | Classificação Tributária do IBS/CBS | `cClassTrib` (UB14) | — |
| 2 | Base de Cálculo IBS/CBS | `vBC` (UB16) | — |
| 3 | Alíquota IBS UF | `pIBSUF` (UB18) | *"se gIBSUF/gRed informado:"* `pAliqEfet` (UB28) |
| 4 | Valor IBS UF | `vIBSUF` (UB35) | — |
| 5 | Alíquota IBS Município | `pIBSMun` (UB37) | *"se gIBSMun/gRed informado:"* `pAliqEfet` (UB47) |
| 6 | Valor IBS Município | `vIBSMun` (UB54) | — |
| 7 | Alíquota CBS | `pCBS` (UB56) | *"se gCBS/gRed informado:"* `pAliqEfet` (UB66) |
| 8 | Valor CBS | `vCBS` (UB67) | — |
| 9 | Base de Cálculo do IS | `vBCIS` (UB05) | — |
| 10 | Alíquota do IS | `pIS` (UB06) | — (*"Para o Imposto Seletivo, permanece a alíquota pIS – UB06"*) |
| 11 | Valor do IS | `vIS` (UB11) | — |

**11 campos impressos, 14 tags** (as 11 + as 3 `pAliqEfet`). O BRIEF (item 1) esperava "12 de item, contando as 3
`pAliqEfet`"; a contagem da fonte é outra (lacuna L-DANFE-PR0-1 do retorno do PR-0).

**Regra das alíquotas** `[NT10-ALIQ]` (observação do §4.3): *"quando houver redução de alíquota (ind_gRed = 1) ou compra
governamental (gCompraGov), hipóteses em que o grupo gRed é informado, o DANFE deverá exibir a alíquota efetiva (pAliqEfet)
para IBS UF, IBS Município e CBS. Na ausência do grupo gRed, deverá exibir a alíquota vigente (pIBSUF, pIBSMun ou pCBS)."*

**Disposição no modelo** (p. 8, retrato): a linha do item tem as colunas *"DESCRIÇÃO DO PRODUTO / SERVIÇO · CST / CFOP · QTD /
UN · VLR UNIT · VLR TOTAL · BASES DE CÁLCULO · ALÍQUOTAS · VALOR DOS TRIBUTOS"*. Bases: `ICMS`, `IBS / CBS`, `IS`, `IPI`.
Alíquotas, em 3 linhas: `ICMS / CBS`, `IBS UF / IPI`, `IBS MUN / IS`. Valores: as mesmas 3 linhas. Abaixo da descrição vêm
`[informações adicionais do item]` e `[NCM 012345678] [cClassTrib 012345678]`.

## 4. §4.4 Quadros e campos facultativos ou condicionados (p. 5–6) `[NT10-FACULT]`

Regra geral: *"Quando a informação correspondente não existir no XML, ou quando o grupo não se aplicar à operação, o campo não
deverá ser preenchido."* e *"A faculdade de exibição não autoriza a criação, inferência ou impressão de informação inexistente
no XML."* Nos modelos, esses campos aparecem em azul com borda tracejada.

| # | quadro / campo | tag (ID) | condição (texto da NT) |
|---|---|---|---|
| 1 | Canhoto | sem tag própria | pode ser suprimido quando o emitente não utilizar o bloco de canhoto |
| 2 | Tipo de Regime de Apuração do IBS e da CBS | sem tag/ID publicada | campo reservado; não imprimir conteúdo enquanto não houver definição da origem da informação |
| 3 | Fatura / Duplicatas | `cobr` (Y01); `dup` (Y07); `nDup` (Y08); `dVenc` (Y09); `vDup` (Y10) | pode ser suprimido quando o contribuinte não utilizar esses documentos |
| 4 | Valor do FCP | `vFCP` (W04h) | exibição condicionada à existência/aplicabilidade da informação no XML |
| 5 | Valor do FCP retido por ST | `vFCPST` (W06a) | idem |
| 6 | Valor do DIFAL na UF de destino | `vICMSUFDest` (W04e) | exibição condicionada à existência da informação no XML |
| 7 | Valor do FCP na UF de destino | `vFCPUFDest` (W04c) | idem |
| 8 | BC (quantidade) do ICMS monofásico | `qBCMono` (W06b.1) | base quantitativa da tributação monofásica |
| 9 | Valor do ICMS monofásico | `vICMSMono` (W06c) | exibição condicionada à existência da informação no XML |
| 10 | BC (quantidade) do ICMS monofásico por retenção | `qBCMonoReten` (W06c.1) | base quantitativa sujeita à retenção na monofasia |
| 11 | Valor do ICMS monofásico por retenção | `vICMSMonoReten` (W06d) | exibição condicionada à existência da informação no XML |
| 12 | Valor do IBS monofásico | `vIBSMono` (W58) | exibir quando informado o grupo de monofasia (`gMono` – W57) |
| 13 | Valor da CBS monofásica | `vCBSMono` (W59) | idem |
| 14 | Valor do IBS monofásico por retenção | `vIBSMonoReten` (W59a) | exibir quando houver tributação monofásica sujeita a retenção |
| 15 | Valor da CBS monofásica por retenção | `vCBSMonoReten` (W59b) | idem |
| 16 | Cálculo do ISSQN | `IM` (C19); `ISSQNtot` (W17); `vServ` (W18); `vBC` (W19); `vISS` (W20) | pode ser suprimido quando não se aplicar às operações do emitente, conforme o MOC |
| 17 | Transportador / Volumes Transportados | `transp` (X01); `modFrete` (X02) e campos do Grupo X | no modelo proposto, a exibição detalhada fica condicionada à existência de dados de transporte/volumes |
| 18 | QR Code | `qrCode` (ZX02) | no modelo proposto, a exibição detalhada fica condicionada à existência de dados de QR Code |

**18 linhas**, iguais às da tabela da p. 6 (conferida linha a linha no texto `-raw`).

## 5. §4.5 QR Code no DANFE 55 (p. 6) `[NT10-QR]`

*"Em breve, será publicada alteração específica na Nota Técnica correspondente, de forma a prever expressamente a utilização do
QR Code também nos demais formatos de impressão do DANFE da NF-e, inclusive nas orientações retrato (tpImp=1) e paisagem
(tpImp=2)."* Sem regra de formação publicada em 26/10/2026 (F-DANFE-8 b).

## 6. Ordem dos blocos de totais no modelo (p. 8, retrato)

`[NT10-ORDEM-TOTAIS]`, de cima para baixo: **Total dos produtos e total da nota** (valor total dos produtos, frete, seguro,
desconto, outras despesas, valor total da nota) → **Total do ICMS/IPI** (BC do ICMS, ICMS, BC do ICMS ST, ICMS ST, IPI;
FCP, FCP retido por ST, DIFAL na UF de destino, FCP na UF de destino; BC do ICMS monofásico, ICMS monofásico, BC do ICMS
monofásico por retenção, ICMS monofásico por retenção) → **Total do IBS/CBS/IS** (CBS, IBS UF, IBS Município, Imposto
Seletivo; IBS monofásico, CBS monofásica, IBS monofásico por retenção, CBS monofásica por retenção) → **Cálculo do ISSQN** →
**Transportador/Volumes transportados** → **Dados dos produtos/serviços** → **Dados adicionais** (informações complementares,
reservado ao fisco) com a área **QR CODE**. No quadro do emitente, abaixo da IE: "CÓDIGO DO REGIME TRIBUTÁRIO" e "TIPO DE
REGIME DE APURAÇÃO DO IBS E DA CBS".

## 7. Classificação das NTs que a nota do nó manda conferir (item 3)

Baixadas em 2026-10-26 do Portal da NF-e → Notas Técnicas (mesmo cookie de sessão). Lidos o título, o controle de versões
e o resumo/introdução de cada uma; "menções a DANFE" = contagem de `danfe` no texto extraído.

| NT | título (p. 1) | publicação · produção | sha256 | afeta o DANFE 55? | destino |
|---|---|---|---|---|---|
| 2026.009 v1.00 | Alteração de Regra de Validação de CFOP | 09/2026 · até 17/09/2026 | `50b7dec40bba8928b4d544feb4fdbd8c8bac16e37c99d926ddb2834cf246f15d` | **Não.** Muda só a regra I08-140 (aceita CFOP 1.949/2.949 na devolução); *"não modifica o leiaute da NF-e nem os schemas XML"*; 0 menções a DANFE | `X10a`: regra de validação da emissão 55 |
| 2026.006 v1.00 | Reforma Tributária do Consumo – Vinculação com a Transação de Pagamento do DF-e | 08/2026 · homologação 05/10/2026, produção 03/11/2026 | `47a65abde315fed1e6a8c6085a67ca483935cb57877ae5715d365377a725e05d` | **Não.** Cria o grupo YC (split payment) e o evento 110300; *"Não há exigência de preenchimento ou uso dos campos de split payment em 2026 no ambiente de produção"* (em homologação desde 05/10/2026); 0 menções a DANFE | `IBS-CBS-2027` (F-IBS-6, split payment); ver `M5-ibs-cbs` |
| 2026.003 v1.00 | DANFE Simplificado Tipo 2 | 05/2026 · teste 01/07/2026, produção 03/08/2026 | `2ef826027e0e8423ba9dc2f53ee7197f8bfdcc399a30459b72da977528600f13` | **Não o DANFE 55 deste nó.** Cria outro documento auxiliar: NF-e 55 emitida *"em operações que, em regra, seriam acobertadas por NFC-e"*, impressa no leiaute do DANFE-NFC-e (Aj. SINIEF 07/05 cl. 9ª §5º-D, pelo Aj. SINIEF 13/26) | achado §9 item 3 do BRIEF (outro nó, sem pedido) |
| 2014.001 v1.41 | Evento Prévio de Emissão em Contingência (EPEC) | 08/2026 · teste 09/09/2026, produção 05/10/2026 | `fa9218ddadcb35ca1233434a4dfd040243360d983c0d3f6b85e7756284a6fd19` | **Só em contingência.** A v1.41 corrige o número da rejeição da regra P14-20 (a v1.40 impediu o EPEC para PR e PB). O DANFE em EPEC traz o protocolo do evento (MOC Anexo II §3.9.3); o nó não trata contingência | `X10a` (E1-5, EPEC fora do escopo atual) |

Sem célula vazia. Os quatro destinos confirmam o roteamento provável do BRIEF (item 3). A única diferença é de
detalhe: a NT 2026.009 vai para o X10a como regra de validação, e o BRIEF dizia "X10a PR-0".
