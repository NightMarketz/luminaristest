# Transcrição — leiaute de SAÍDA da NF-e 55 / NFC-e 65 (MOC 7.0) — PR-0 do X10a

> Item 1 do [`BE-INCR-NFCE-brief.md`](../BE-INCR-NFCE-brief.md) (com as EMENDAS 1–3). Sessão de 2026-10-26, pedido do
> dono no chat: *"faz o X10a EMENDA-2 PR-1..PR-6 e EMENDA-3 (#757)"* + questionário da mesma sessão (*"Faço o PR-0
> também"*, *"Sigo a A9 relendo a lei"*). Só os grupos que a montagem do Luminaris usa; o resto do leiaute fica fora
> (o schema `.strict()` recusa tag não transcrita). O grupo UB (IBS/CBS) está em
> [`TRANSCRICAO-NT2025002-v152-UB-2026-10-26.md`](TRANSCRICAO-NT2025002-v152-UB-2026-10-26.md).

## Fontes (sha256 conferido nesta sessão)

| Chave | Documento | sha256 | Como foi lido |
|---|---|---|---|
| `[AI]` | MOC 7.0 Anexo I — Leiaute e Regras de Validação da NF-e e NFC-e (153 pp.) | `5eb4cf2010b10b0b62f78197c4eb64025f24535d4c6e61158bc7806dd008f55d` (= MANIFEST `moc70-anexo-i`) | navegador embutido, pdf.js; o host bloqueia download fora do navegador |
| `[VG]` | MOC 7.0 Visão Geral (150 pp.) | `f664dcf94b77cabb32311620d85a7eb02cdf86adb2d4632ce178af2572dd2ad1` (= MANIFEST) | `pdftotext` |
| `[NT1]` | NT 2025.001 v1.03 | `333b69f71debe5040585b677b574bb13b39362aa7934b904edc59cdf83cded02` (= dossiê 17/10 [P2]) | `pdftotext` |
| `[NT2]` | NT 2025.002-RTC v1.52 | `54ed893327040a20a4a3c0562d342953542a1dc98e55d73dbe607d6c13d3d416` (= dossiê 17/10 [P1]) | `pdftotext -raw` |
| `[AJ19]` | Ajuste SINIEF 19/16 compilado (CONFAZ) | `6692d344259fba1448dcb53b50385d9eb9106cec341af56c09316409feaa3570` (= dossiê 17/10 [D03]: sem alteração desde então) | `legal.py baixar` |
| `[AJ07]` | Ajuste SINIEF 07/05 compilado (CONFAZ) | `f44adf45f3e22df040e5dc588c5aa5d944b0a7a468ea90adecc000e405843670` (= [D02]) | `legal.py baixar` |

Dossiê: `pesquisas-legais/x10a-pr0-leiaute-saida/`. Vigência do MOC: a partir de 01/11/2026 vale a versão online do
Paraná (Aj. 38/26 e 40/26); endereço não localizado (EMENDA-3 §4 item 3). Este texto é o do MOC 7.0.

Colunas: `ID · campo · Ele · Pai · Tipo · Ocor. · Tam. · observação (resumo fiel)`. `13v2` = 13 inteiros, 2 decimais.

## 1. Raiz e identificação (`[AI]` pp. 8–11)

| ID | Campo | Ele | Pai | Tipo | Ocor. | Tam. | Observação |
|---|---|---|---|---|---|---|---|
| A01 | infNFe | G | Raiz | | 1-1 | | |
| A02 | versao | A | A01 | C | 1-1 | 1-4 | "4.00" |
| A03 | Id | ID | A01 | C | 1-1 | 47 | chave de acesso precedida do literal "NFe" |
| B01 | ide | G | A01 | | 1-1 | | |
| B02 | cUF | E | B01 | N | 1-1 | 2 | tabela IBGE de UF |
| B03 | cNF | E | B01 | N | 1-1 | 8 | número aleatório do emitente |
| B04 | natOp | E | B01 | C | 1-1 | 1-60 | natureza da operação (venda…) |
| B06 | mod | E | B01 | N | 1-1 | 2 | 55 = NF-e; 65 = NFC-e |
| B07 | serie | E | B01 | N | 1-1 | 1-3 | 000–889 aplicativo do contribuinte, emitente CNPJ (p. 9) |
| B08 | nNF | E | B01 | N | 1-1 | 1-9 | |
| B09 | dhEmi | E | B01 | D | 1-1 | | AAAA-MM-DDThh:mm:ssTZD |
| B10 | dhSaiEnt | E | B01 | D | 0-1 | | "Não informar este campo para a NFC-e" |
| B11 | tpNF | E | B01 | N | 1-1 | 1 | 0 entrada; 1 saída |
| B11a | idDest | E | B01 | N | 1-1 | 1 | 1 interna; 2 interestadual; 3 exterior |
| B12 | cMunFG | E | B01 | N | 1-1 | 7 | IBGE |
| B21 | tpImp | E | B01 | N | 1-1 | 1 | 4 DANFE NFC-e; 5 DANFE NFC-e em mensagem eletrônica |
| B22 | tpEmis | E | B01 | N | 1-1 | 1 | 1 normal |
| B23 | cDV | E | B01 | N | 1-1 | 1 | módulo 11 (base 2–9) da chave |
| B24 | tpAmb | E | B01 | N | 1-1 | 1 | 1 produção; 2 homologação |
| B25 | finNFe | E | B01 | N | 1-1 | 1 | 1 normal |
| B25a | indFinal | E | B01 | N | 1-1 | 1 | 0 normal; 1 consumidor final |
| B25b | indPres | E | B01 | N | 1-1 | 1 | 1 presencial; 2 internet; 3 teleatendimento; 4 NFC-e entrega a domicílio; 5 presencial fora do estab.; 9 não presencial, outros |
| B25c | indIntermed | E | B01 | N | 0-1 | 1 | 0 sem intermediador |
| B26 | procEmi | E | B01 | N | 1-1 | 1 | 0 aplicativo do contribuinte |
| B27 | verProc | E | B01 | C | 1-1 | 1-20 | versão do aplicativo emissor |

## 2. Emitente (`[AI]` pp. 12–13)

| ID | Campo | Ele | Pai | Tipo | Ocor. | Tam. | Observação |
|---|---|---|---|---|---|---|---|
| C01 | emit | G | A01 | | 1-1 | | |
| C02 | CNPJ | CE | C01 | N | 1-1 | 14 | |
| C03 | xNome | E | C01 | C | 1-1 | 2-60 | |
| C04 | xFant | E | C01 | C | 0-1 | 1-60 | |
| C05 | enderEmit | G | C01 | | 1-1 | | |
| C06 | xLgr | E | C05 | C | 1-1 | 2-60 | |
| C07 | nro | E | C05 | C | 1-1 | 1-60 | |
| C08 | xCpl | E | C05 | C | 0-1 | 1-60 | |
| C09 | xBairro | E | C05 | C | 1-1 | 2-60 | |
| C10 | cMun | E | C05 | N | 1-1 | 7 | IBGE |
| C11 | xMun | E | C05 | C | 1-1 | 2-60 | |
| C12 | UF | E | C05 | C | 1-1 | 2 | |
| C13 | CEP | E | C05 | N | 1-1 | 8 | com zeros não significativos |
| C14 | cPais | E | C05 | N | 0-1 | 4 | 1058 |
| C15 | xPais | E | C05 | C | 0-1 | 1-60 | |
| C16 | fone | E | C05 | N | 0-1 | 6-14 | |
| C17 | IE | E | C01 | C | 1-1 | 2-14 | só algarismos, sem formatação |
| C21 | CRT | E | C01 | N | 1-1 | 1 | 1 Simples; 2 Simples com excesso de sublimite; 3 regime normal |

## 3. Destinatário (`[AI]` pp. 14–15)

| ID | Campo | Ele | Pai | Tipo | Ocor. | Tam. | Observação |
|---|---|---|---|---|---|---|---|
| E01 | dest | G | A01 | | 0-1 | | "Grupo Obrigatório para a NF-e (modelo 55)" |
| E02 | CNPJ | CE | E01 | N | 1-1 | 14 | |
| E03 | CPF | CE | E01 | N | 1-1 | 11 | |
| E04 | xNome | E | E01 | C | 0-1 | 2-60 | obrigatória na 55, opcional na 65 |
| E05 | enderDest | G | E01 | | 0-1 | | obrigatório na 55 |
| E06–E16 | xLgr, nro, xCpl, xBairro, cMun, xMun, UF, CEP, cPais, xPais, fone | E | E05 | | | | mesmas formas de C06–C16 |
| E16a | indIEDest | E | E01 | N | 1-1 | 1 | 1 contribuinte; 2 isento; 9 não contribuinte |
| E17 | IE | E | E01 | N | 0-1 | 2-14 | |
| E19 | email | E | E01 | C | 0-1 | 1-60 | |

## 4. Produto (`[AI]` pp. 17–19)

| ID | Campo | Ele | Pai | Tipo | Ocor. | Tam. | Observação |
|---|---|---|---|---|---|---|---|
| H01 | det (`@nItem`) | G | A01 | | 1-990 | | item numerado a partir de 1 |
| I01 | prod | G | H01 | | 1-1 | | |
| I02 | cProd | E | I01 | C | 1-1 | 1-60 | |
| I03 | cEAN | E | I01 | C | 1-1 | 0,8,12,13,14 | GTIN; sem GTIN ⇒ literal "SEM GTIN" (p. 19) |
| I04 | xProd | E | I01 | C | 1-1 | 1-120 | |
| I05 | NCM | E | I01 | N | 1-1 | 2, 8 | NCM completo (8 dígitos) |
| I05c | CEST | E | I05b | N | 1-1 | 7 | grupo opcional I05b |
| I08 | CFOP | E | I01 | N | 1-1 | 4 | |
| I09 | uCom | E | I01 | C | 1-1 | 1-6 | |
| I10 | qCom | E | I01 | N | 1-1 | 11v0-4 | |
| I10a | vUnCom | E | I01 | N | 1-1 | 11v0-10 | |
| I11 | vProd | E | I01 | N | 1-1 | 13v2 | valor total bruto |
| I12 | cEANTrib | E | I01 | C | 1-1 | 0,8,12,13,14 | |
| I13 | uTrib | E | I01 | C | 1-1 | 1-6 | |
| I14 | qTrib | E | I01 | N | 1-1 | 11v0-4 | |
| I14a | vUnTrib | E | I01 | N | 1-1 | 11v0-10 | |
| I17 | vDesc | E | I01 | N | 0-1 | 13v2 | |
| I17b | indTot | E | I01 | N | 1-1 | 1 | 1 compõe o total |

## 5. Tributos do item (`[AI]` pp. 25–56)

| ID | Campo | Ele | Pai | Tipo | Ocor. | Tam. | Observação |
|---|---|---|---|---|---|---|---|
| M01 | imposto | G | H01 | | 1-1 | | |
| N01 | ICMS | CG | M01 | | 1-1 | | um só subgrupo (ICMS00, ICMSSN102…) |
| N02 | ICMS00 | CG | N01 | | 1-1 | | CST 00: N11 orig, N12 CST, N13 modBC (0–3), N15 vBC 13v2, N16 pICMS 3v2-4, N17 vICMS 13v2 (p. 26) |
| N10d | ICMSSN102 | CG | N01 | | 1-1 | | CRT 1, CSOSN 102/103/300/400: N11 orig + N12a CSOSN (3) (pp. 42–43) |
| N10g | ICMSSN500 | CG | N01 | | 1-1 | | CRT 1, CSOSN 500: N11 orig, N12a CSOSN=500, grupo opcional N25.1 (vBCSTRet, pST, vICMSSubstituto, vICMSSTRet) (p. 46) |
| N11 | orig | E | | N | 1-1 | 1 | 0 a 8 (p. 26): 0 nacional; 1 estrangeira importação direta; 2 estrangeira mercado interno; 3 nacional CI > 40% ≤ 70%; 4 nacional PPB; 5 nacional CI ≤ 40%; 6 estrangeira direta sem similar (CAMEX); 7 estrangeira mercado interno sem similar (CAMEX); 8 nacional CI > 70% |
| Q01 | PIS | G | M01 | | 0-1 | | um de Q02 (CST 01/02: vBC, pPIS 3v2-4, vPIS), Q03 (CST 03), Q04 PISNT (CST 04, 05, 06, 07, 08, 09), Q05 PISOutr (CST 49–99) (pp. 52–54) |
| S01 | COFINS | G | M01 | | 0-1 | | espelho do PIS: S02 (01/02), S03 (03), S04 COFINSNT (04–09), S05 COFINSOutr (49–99) (pp. 54–56) |

## 6. Totais, transporte, pagamento, informações adicionais (`[AI]` pp. 58–66)

| ID | Campo | Ele | Pai | Tipo | Ocor. | Tam. | Observação |
|---|---|---|---|---|---|---|---|
| W01 | total | G | A01 | | 1-1 | | somatório dos itens |
| W02 | ICMSTot | G | W01 | | 1-1 | | W03 vBC, W04 vICMS, W04a vICMSDeson, W04c vFCPUFDest?, W05 vBCST, W06 vST, W06a vFCPST, W07 vProd, W08 vFrete, W09 vSeg, W10 vDesc, W11 vII, W12 vIPI, W12a vIPIDevol, W13 vPIS, W14 vCOFINS, W15 vOutro, W16 vNF — todos 13v2, 1-1 |
| X01 | transp | G | A01 | | 1-1 | | |
| X02 | modFrete | E | X01 | N | 1-1 | 1 | 9 = sem ocorrência de transporte |
| YA01 | pag | G | A01 | | 1-1 | | obrigatório na NF-e e na NFC-e (p. 62) |
| YA01a | detPag | G | YA01 | | 1-100 | | |
| YA01b | indPag | E | YA01a | N | 0-1 | 1 | 0 à vista; 1 a prazo |
| YA02 | tPag | E | YA01a | N | 1-1 | 2 | 01 dinheiro; 02 cheque; 03 cartão de crédito; 04 cartão de débito; 05 crédito loja; 10–13 vales; 15 boleto; 16 depósito; 17 PIX; 18 transferência/carteira digital; 19 fidelidade/cashback; 90 sem pagamento; 99 outros. **91 pagamento posterior: `[NT1]` v1.03, RV YA03-10/YA03-30, pp. 10–11** |
| YA03 | vPag | E | YA01a | N | 1-1 | 13v2 | |
| YA04 | card | G | YA01a | | 0-1 | | tpIntegra (1 integrado / 2 não integrado), CNPJ?, tBand?, cAut? |
| YA09 | vTroco | E | YA01 | N | 0-1 | 13v2 | |
| Z01 | infAdic | G | A01 | | 0-1 | | Z02 infAdFisco 1-2000; Z03 infCpl 1-5000 |
| ZX01 | infNFeSupl | G | Raiz | | 0-1 | | fora da assinatura (NT 2015.002) — QR Code: PR-8, não montado aqui |

## 7. Regras de validação que a montagem espelha (`[AI]` pp. 74–126)

Formato: `regra · modelo · código · texto`. "65" = só NFC-e.

| Regra | Mod. | Cód. | Texto (resumo fiel) | p. |
|---|---|---|---|---|
| A03-10 | 55/65 | 502 | Id difere da concatenação dos campos da chave | 74 |
| B03-10 | 55/65 | 897 | cNF não pode ser 00000000, 11111111 … 99999999, 12345678, 23456789, 34567890, 45678901, 56789012, 67890123, 78901234, 89012345, 90123456, 01234567; cNF não pode ser igual a nNF | 75 |
| B09-40 | 65 | 704 | tpEmis=1 e dhEmi com atraso > 5 min da recepção; "emissão on-line, real-time" | 76 |
| B10-10 | 65 | 705 | NFC-e com data de entrada/saída | 76 |
| B11-10 | 65 | 706 | NFC-e de entrada (tpNF=0) | 76 |
| B11a-10 | 65 | 707 | NFC-e interestadual ou exterior (idDest≠1) | 76 |
| B21-10 | 65 | 709 | tpImp ≠ 4 e 5 | 76 |
| B22-34 | 65 | 714 | tpEmis 2, 4, 5 (EPEC pode ser aceita a critério da UF) | 77 |
| B23-10 | 55/65 | 253 | DV da chave inválido | 77 |
| B25-20 | 65 | 715 | finNFe ≠ 1 | 77 |
| B25a-10 | 65 | 716 | indFinal = 0 | 77 |
| B25b-20 | 65 | 717 | indPres ≠ 1 e 4 | 77 |
| BA01-10 | 65 | 708 | NFC-e não referencia outro documento (NFref) | 78 |
| C18-10 | 65 | 718 | NFC-e com IEST | 82 |
| E02-10 | 55/65 | 208 | CNPJ do destinatário com DV inválido | 83 |
| E02-20 | 65 | 220 | CNPJ do destinatário = CNPJ do emitente | 83 |
| E03-10 | 55/65 | 237 | CPF com zeros, sequência repetida ou DV inválido | 83 |
| E01-20 / E05-20 | 65 | 787 / 788 | indPres=4 sem dest / sem enderDest | 83 |
| E16a-10 | 65 | 789 | indIEDest ≠ 9 na NFC-e | 86 |
| E18-10 | 65 | 730 | NFC-e com ISUF | 87 |
| I04-10 | 65 | 373 | homologação: xProd do **1º item** = "NOTA FISCAL EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL" | 89 |
| I08-150 | 65 | 725 | CFOP aceitos: 5.101, 5.102, 5.103, 5.104, 5.115, 5.405, 5.656, 5.667, 5.933 (este só com ISSQN, NF conjugada) | 93 |
| I17b-10 | 65 | 774 | indTot = 0 | 94 |
| N12-30 | 65 | 766 | CST ICMS aceitos: 00, 20, 40, 41, 60 (90 a critério da UF) | 100 |
| N12-40 / N12-44 | 65 | 382 | CST 00/20/40/41/90 só com CFOP 5.101–5.104, 5.115; CST 60 só com 5.405, 5.656, 5.667 | 100 |
| N12a-20 | 65 | 383 | CSOSN aceitos: 102, 103, 300, 400, 500 (900 a critério da UF) | 107 |
| N12a-40 / N12a-44 | 65 | 386 | CSOSN 102/103/300/400/900 só com CFOP 5.101–5.104, 5.115; CSOSN 500 só com 5.405, 5.656, 5.667 | 108 |
| NA01-10 | 65 | 807 | NFC-e com ICMSUFDest | 115 |
| O01/P01/R01/T01-10 | 65 | 742/743/746/749 | NFC-e com IPI, II, PIS-ST, COFINS-ST | 118–119 |
| W07-10 | 55/65 | 564 | vProd total ≠ Σ vProd dos itens com indTot=1 | 121 |
| W10-10 | 55/65 | 537 | vDesc total ≠ Σ vDesc dos itens | 121 |
| W16-10 | 55/65 | 610 | vNF = vProd − vDesc − vICMSDeson + vST + vFCPST + vFrete + vSeg + vOutro + vII + vIPI + vIPIDevol + vServ | 122 |
| W16-30 | 65 | 780 | vNF acima do limite da UF (default R$ 200.000,00) | 122 |
| W16-40 | 65 | 750 | NFC-e com valor total **superior a R$ 10.000,00** sem CNPJ/CPF/idEstrangeiro do destinatário | 122 |
| X02-10 | 65 | 753 | modFrete ≠ 9 sem entrega a domicílio | 123 |
| Y01-10 | 65 | 760 | NFC-e com cobrança (cobr) | 125 |
| YA02-40 | 65 | 899 | tPag = 90 na NFC-e | 125 |
| YA02-50 | 65 | 436 | tPag = 99 "Outros" (regra de descrição) | 126 |
| YA03-10 | 55/65 | 865 | Σ vPag < vNF (não se aplica a tPag 90 e — `[NT1]` — 91) | 126 |

## 8. Visão Geral — numeração, inutilização e evento (`[VG]`)

| Chave | Texto | Onde |
|---|---|---|
| `[VG-REJ-DESCARTADA]` | "Rejeição - a NF-e será descartada, não sendo armazenada no Banco de Dados podendo ser corrigida e novamente transmitida"; denegação de uso é gravada (Tabela 5-4) | §5.1.6, pp. 73–74 |
| `[VG-INUT-ID]` | `infInut/@Id` (43): "Código da UF + Ano (2 posições) + CNPJ + modelo + série + número inicial e número final precedida do literal 'ID'"; campos tpAmb, xServ='INUTILIZAR', cUF, ano (2), CNPJ (14), mod (55 ou 65), serie (1-3), nNFIni, nNFFin (1-9), xJust | DP03–DP14, p. 78 |
| `[VG-EVT-ID]` | `infEvento/@Id` (54): "ID" + tpEvento + Chave da NF-e + nSeqEvento | P07, p. 99 |

**Efeito no EMENDA-3 §2.1 (E3-2 a):** o `[VG-REJ-DESCARTADA]` responde ao §4 item 2: nota **rejeitada** não fica na
base da SEFAZ e "pode ser corrigida e novamente transmitida" — o número volta a servir. Nota **denegada** fica gravada e
consome o número. Grau V para o MOC 7.0; a versão online do Paraná não foi lida (insumo ausente 2 da EMENDA-3).

## 9. Ajuste SINIEF 19/16 cl. 4ª — destinatário na NFC-e (`[AJ19]`, texto vigente)

> "VII - identificação do destinatário, a qual será feita pelo CNPJ ou CPF ou, tratando-se de estrangeiro, documento de
> identificação admitido na legislação civil, nas seguintes situações: a) nas operações com valor igual ou superior a
> R$ 10.000,00 (dez mil reais); b) nas operações com valor inferior a R$ 10.000,00 (dez mil reais), quando solicitado
> pelo adquirente; c) nas operações não presenciais, hipótese em que deverá constar a informação do respectivo
> endereço;" (alínea "c" pela redação do Aj. SINIEF 9/26, efeitos a partir de 03/08/2026)
>
> "§ 4° É vedada a emissão da NFC-e, nas operações com valor igual ou superior a R$ 200.000,00 (Duzentos mil reais),
> sendo obrigatória a emissão da NF-e. § 5º A critério da unidade federada poderão ser reduzidos os valores a que se
> referem o inciso VII do caput e seu § 4º."

O caput do inciso VII na redação do Aj. 11/25 ("só CPF") ficou sem efeito pela revogação do Aj. 12/26; vale a original.
**Divergência menor:** o MOC W16-40 diz "superior a R$ 10.000,00"; o Ajuste diz "igual ou superior". Vale o Ajuste
(norma; o MOC é leiaute) — a montagem exige o destinatário a partir de R$ 10.000,00 inclusive. Ato de SP reduzindo
esses valores (§ 5º): não procurado nesta sessão; os limites entram como parâmetro legal por UF com o valor nacional.
