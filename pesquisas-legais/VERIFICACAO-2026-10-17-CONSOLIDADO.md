# Verificação das decisões baseadas em lei — 17/10/2026

Pedido do dono (chat, 17/10/2026): "Verifique todas as nossas decisões baseadas em lei com as atuais leis".
Método: `docs/operating-manual/VERIFICACAO-LEGAL.md`, com o acervo ctresb/leis primeiro e a fonte oficial onde houve alerta ou texto mais novo.
São 7 frentes, cada uma com dossiê, fontes [Dnn] e hash. Nada foi aplicado em código, vault ou testes.

| Frente | Itens | Confere | Diverge | Risco/desatualizado | Não verificável | Dossiê |
|---|---|---|---|---|---|---|
| Simples/MEI | 20 | 16 | 0 | 4 (2027) | — | [verif-2026-10-17-simples-mei](verif-2026-10-17-simples-mei/relatorio.md) |
| IRPJ/CSLL | 24 | 17 | 2 | 2 | 3 | [verif-2026-10-17-irpj-csll](verif-2026-10-17-irpj-csll/relatorio.md) |
| PIS/COFINS | 23 | 18 | 1 | 2 | 3 | [verif-2026-10-17-pis-cofins](verif-2026-10-17-pis-cofins/relatorio.md) |
| ISS/NFS-e | 18 | 14 | 2 | 2 | — | [verif-2026-10-17-iss-nfse](verif-2026-10-17-iss-nfse/relatorio.md) |
| NF-e/NFC-e | 20 | 11 | 1 | 3 | 4 (+1 fora) | [verif-2026-10-17-nfe-nfce-dfe](verif-2026-10-17-nfe-nfce-dfe/relatorio.md) |
| Contábil/ECD | 16 | 13 | 2 (citação) | 1 | — | [verif-2026-10-17-contabil-ecd](verif-2026-10-17-contabil-ecd/relatorio.md) |
| LGPD/CDC/obrigações | 26 | 20 | 2 | 3 | 1 | [verif-2026-10-17-lgpd-cdc-obrigacoes](verif-2026-10-17-lgpd-cdc-obrigacoes/relatorio.md) |

Os 10 dossiês anteriores continuam válidos com o texto vigente. Exceção parcial: a memória "Simples no Emissor Nacional *desde* 01/11/2026" deve dizer "a partir de", porque a data ainda não chegou.

## Prioridade 1 — tem data e muda comportamento

1. **Fim da inutilização de NF-e/NFC-e em SP a partir de 01/11/2026.** Base: Aj. SINIEF 38/26 (cl. 16ª §6º do Aj. 19/16) e 40/26 (cl. 14ª §6º do Aj. 07/05). Lemos o compilado do CONFAZ; o trecho foi conferido de novo no texto salvo. Isso afeta o F-NFCE-5, os itens 24–25 do BRIEF X10a e o E-6 da EMENDA-1. Ainda não achamos o ato da SEFAZ-SP que diga o que substitui a inutilização.
2. **`pAliq` em toda DPS com alíquota preenchida** (`FiscalDocumentEmissionService.ts:996`). O leiaute rejeita com E0617 (regime normal em município ativo) e com E0625 (Simples sem retenção). O salão do Simples em SP passa ao Emissor Nacional em 01/11/2026.
3. **Res. CGSN 190/2026, com efeitos em 01/01/2027.** Ela regula o que o código trata como "não regulamentado":
   - início de atividade: `simplesCalc.ts:227-231` hoje devolve 422;
   - retenção de 2% no mês seguinte ao início: `SimplesApuracaoService.ts:1021`;
   - DEFIS substituída pelo PGDAS-D (art. 38-B);
   - nova citação do SIMEI (art. 101 IV/V e Anexo XIII). O valor não muda.
4. **CBS/IBS.** Em 2026, o produto supõe que o cliente está dispensado (LC 214 art. 348 §1º), sem dizer isso na apuração. Em 2027, Presumido e Real ficam sem apuração federal sobre a receita enquanto a frente M5 não sair.

## Prioridade 2 — cálculo ou regra errada, sem data

5. **Adicional de IRPJ no trimestre fixo em ×3**, mesmo no início ou no encerramento de atividade. Pela Lei 9.249 art. 3º §1º, conta só o número de meses do período. A apuração anual já faz isso.
6. **NCM farmacêuticos monofásicos (8 códigos) pela TIPI de 2011.** A IN 2.121 art. 452 usa outros códigos. No Lucro Real, isso gera crédito indevido.
7. **Relatório de ISS agrupado por `cLocPrestacao`.** Pela LC 116 art. 3º caput, nos itens EP o ISS é devido no estabelecimento prestador.
8. **IRRF de 1,5% sugerido para qualquer prestador fora do Simples** (E7-3). O RIR art. 714 limita essa retenção aos serviços profissionais da lista.
9. **Validade do pacote ignora feriado estadual e municipal** (CC 132 §1º; Lei 9.093). Já existe o fork F-E4-1 (a), ratificado sem "executa".
10. **8% hospitalar** (P-7, vertical clínica): a lista foi ampliada pela IN 2.343/2026. É preciso reler.

## Prioridade 3 — citação ou documento

- CRC: a Res. CFC 1.494/2015 foi revogada; a vigente é a 1.707/2023 (arts. 3º e 5º p.ú.). A mensagem do 400 em `AccountingContact.model.ts:108` cita norma revogada para o usuário. O sufixo "S" ficou sem base.
- Lei 6.404 art. 187: deveria ser inciso **I**, não II (`StatementMappingFixture.ts:30`, `conteudoFiscalCanonico.ts:10`).
- Manual da ECD L9: a edição vigente é a de maio/2026 (sha `bc63f0a893ce`), não a de janeiro.
- "Lei 14.592 art. 6º" deveria ser Lei 10.833 art. 3º §2º III.
- CNPJ alfanumérico: o código diz "em produção desde 01/07/2026", mas a IN 2.119 diz só "previsão a partir de julho de 2026".
- NT 2025.001: a vigente é a v1.03, que inclui o `tPag` 91. MOC 7.0: a partir de 01/11/2026 vale o MOC online.
- CSLL dos bancos `lp5-csll-3-a`: 25% em 2021-S2 e 21% em 08–12/2022. Nenhuma apuração lê essa linha (ano ≥ 2025).
- BRIEFs com a lacuna "compilação até a 183" e M11 do PISO-ISS: já resolvidas.
- Expurgo de 90 dias justificado como "LGPD": falta confirmar se pode apagar linha que o razão referencia antes da prescrição (CTN 195 p.ú.).

## Ambíguo — precisa de decisão ou de pergunta externa

| # | Ambiguidade | Leitura mais segura | Pergunta exata (a quem) |
|---|---|---|---|
| A1 | O que substitui a inutilização em SP após 01/11/2026 | Segurar o E-6 para SP | "Com os Aj. SINIEF 38/26 e 40/26, como o contribuinte de SP trata números de NF-e/NFC-e não utilizados a partir de 01/11/2026?" (SEFAZ-SP) |
| A2 | Dispensa de CBS/IBS em 2026 (LC 214 art. 348 §1º) | Declarar a premissa na memória da apuração | "Para Presumido/Real em 2026, emitir NF-e/NFS-e com o grupo IBSCBS basta para a dispensa do art. 348 §1º?" (contador) |
| A3 | Declaração socioeconômica de 2026: DEFIS ou PGDAS-D | Prazo 31/03/2027, citando as duas normas | contador |
| A4 | Anexo I, 6ª faixa, a partir de 2029: 19% (LC 214) × 18,9% (Res. 190) | Manter 19% (vale a lei) e alertar quando houver divergência | — |
| A5 | Piso de 2% do ISS no Simples quando a tabela já está abaixo de 2% | — | "Na faixa 1 do Anexo III, com ISS de tabela abaixo de 2% e isenção municipal, a ME recolhe o % da tabela ou 2%?" (contador) |
| A6 | Adicional do IRPJ com mês de abertura fracionado | Contar os meses em atividade | "PJ do Presumido aberta em 10/02: o adicional do T01 usa R$ 20 mil × 2? Fevereiro parcial conta como mês inteiro?" (contador) |
| A7 | J930: exatamente 1 × pelo menos 1 responsável legal | Manter até o teste no PVA | "O PGE aceita dois J930 com IND_RESP_LEGAL=S?" (contador) |
| A8 | Multa de 2% (CDC 52 §1º) em serviço parcelado sem financiamento | Manter o teto de 2% para PF | advogado |
| A9 | NFC-e "sem CPF, sem nota" (F-NFCE-7 b): a lei exige CPF só a partir de R$ 10 mil | Reabrir o fork (decisão do dono) | — |
| A10 | Clínica: item 4 × 6.02, e em SP isso muda a alíquota (2% × 5%) | — | já aberta no dossiê ctribnac |

## Não verificado (e por quê)

- Tabelas de códigos de receita DCTF: não estão no acervo.
- STJ Tema 1.373 (IPI no crédito).
- IN 1.252 (EFD-Contribuições).
- IN SRF 765: não está no acervo nem no Sijut.
- Res. CGSN 192 e 194/2026: só achamos a ementa.
- RICMS/SP e a tabela de CFOP.
- NT Conjunta 2025.001 (DV do CNPJ alfanumérico): o cálculo do DV foi conferido pelo exemplo oficial.
- Compilado do Aj. 9/22: o CONFAZ deu timeout.
- Parametrização de SP no ADN: exige mTLS.
- Vigência das NBC TG 1000/1001/1002 e do CPC 27.
- Resoluções da ANPD: o projeto não tem decisão que se apoie nelas.
