# Perguntas de lei: documento único (10/10/2026)

**Pedido do dono (chat, 10/10, questionário):** "Liste todas as perguntas sobre lei num documento só".
**O que entra:** toda pergunta legal, fiscal, contábil-normativa, trabalhista, consumerista ou de LGPD ainda **sem resposta** no repositório, incluindo as de hoje: BRIEF ADN (`L-ADN`), emenda NFC-e (`L-NFCE`), tela de cobrança (`L-COB`), PRE-ADR folha/eSocial/Reinf (`L-PES`) e PRE-ADR ICMS/IPI (`L-ICMS`).
**Base:** `origin/main` 845d79ce. Leitura integral de 64 ADRs, os BRIEFs `BE-INCR-*` e `FE-INCR-*`, PRE-ADRs, pareceres, `PEDIDO-*`, triagens e as notas do vault (nós, gates, diferidos, decisões de 23/09 em diante), por 9 varreduras em paralelo. Os caminhos `docs/accounting/` estão abreviados.

**Em duas linhas:** ~150 perguntas abertas se reduzem a ~90 depois de juntar as duplicatas. Cerca de 40% dá para responder lendo a lei, sem contador (regra do dono: pesquisar a doc antes de perguntar).
**Risco principal:** **nenhum pedido ao contador ou ao jurídico posterior a 23/09 tem registro de envio**. O follow-up de 23/09 (itens 1–11), o `PEDIDO-CONTADOR-2026-10-02` (PE-1..5) e o `PEDIDO-JURIDICO-2026-10-05` (PE-FE-1..3, "Enviado em: ____") estão prontos e parados. Só a consulta ao CRC-SP teve envio decidido (10/10), ainda sem resposta. Por isso o **H1 está parado no P5**: falta o código referencial da conta 3.4, que está no item 3b do PE.

## Como ler
- Organizado por **quem responde**, porque é assim que o dono envia: §1 contador · §2 advogado · §3 órgão público · §4 pesquisa de lei (o agente faz, sem humano) · §5 dado do cliente · §6 oráculo (PVA ou 1ª importação; não é pergunta, entra por runbook).
- Cada linha: **ID(s)** (duplicatas juntas) · pergunta · **o que trava** · fonte.
- **[NOVO]** = nasceu hoje nos documentos não commitados. **[TRAVA]** = bloqueia gate, deploy ou código.
- Estado de envio: o padrão é "sem registro de envio". Exceções vêm marcadas.

## 0. As 10 que mais travam

| # | Pergunta | Quem | Trava | IDs |
|---|---|---|---|---|
| 1 | Código referencial RFB da conta **3.4** (receita por não uso) e linha da DRE | contador | **H1 parado no P5** (a ECD dá 400) | PE-1(ii)/3b · RUNBOOK-H1-PVA.md:462 |
| 2 | Códigos referenciais das contas-folha novas (juros, multa, descontos, imobilizado, provisões, 2.1.2, 4.x, 1.1.5) e COD_PB_RFB da Parte B | contador | coverage da ECD, emenda 3.3, Lalur, X4/H1b | follow-up 1 e 2 (=0.8a/b) · D10 · ENC §6-1 · KIT §5-1 · FA §5-a |
| 3 | Incide ISS / emite-se NFS-e sobre o saldo vencido do pacote? cTribNac e cNBS do pacote | contador/prefeitura | a NFS-e automática do vencido (F-PV-9 b) já está ligada | PE-4 · PE-4b · DFE-5 |
| 4 | Linha software × serviço contábil; reabertura de período revisado; aceite interno vale? | CRC-SP | venda "com contador incluso" | F-GOV-1 · CONSULTA-CRC-SP Q1–Q5 (**envio decidido em 10/10**) |
| 5 | O Luminaris pode guardar e usar o A1 do cliente? Com que contrato e base na LGPD? | advogado | todo o emissor próprio (D5, X10i) | **[NOVO]** L-ADN-5 · L-PES-10 |
| 6 | Data da NFS-e nacional obrigatória para o Simples: 01/09 (CGSN 189), 01/11 (CGSN 191) ou 01/01/2027 (Ato 4)? | lei | prazo do 1º cliente, D7, alerta NFSE_DIVERGE | DFE-1 · FU-5 · R191 · achado do BRIEF ADN |
| 7 | Contas de provisão de IRPJ/CSLL, PIS/Cofins, DAS e saldo negativo | contador | a provisão fica pendente | TA §9.3 · X8 P-1 · SN §8.6 · P-5 (X7-A) · P-B8 |
| 8 | Conta do saldo no MP, data da baixa, conta da tarifa, estorno/chargeback | contador | F5 roda com default | MP P1–P4 |
| 9 | Liminar contra a LC 224: alcança o passado? O débito vai cheio com suspensão? | jurídico do cliente | X9 responde 409 | TA §9.1 · P-11 (X7-A) · MIT P-5 |
| 10 | Parceiro do salão: o que o salão retém (INSS, IRRF, ISS) e onde informa? | lei + contador | parceiro PF bloqueado (F-PES-6) | **[NOVO]** L-PES-1/2/3 · ADR-PIS-COFINS P-6 |

---

## 1. Contador

### 1.1 Plano de contas e referencial RFB
- **PE-1(ii)/3b** [TRAVA]: referencial e linha da DRE da conta 3.4. Trava H1/P5. Fonte: `BE-INCR-PACOTE-VALIDADE-brief.md:481`, `RUNBOOK-H1-PVA.md:462-465`.
- **follow-up 2 (=0.8b) · D10/§5.1 · ENC §6-1/§6-8 · KIT §5-1 · INCR9B · §4.2b** [TRAVA]: referencial RFB de cada conta-folha (juros/multa de mora, multa punitiva, descontos, imobilizado, 2.1.2, 4.x, 1.1.5, conta 4.5). Confirmar se 3.01.01.07, 3.02.01.07 e 3.01.04.01 batem com a tabela vigente. Fontes: `ADR-INCR9B:99,172,196`, `ENCARGOS-DESCONTOS-EMENDA-3-3-brief:448,467`, `KIT-SETOR-brief:490`, `FE-INCR-BANK-CHARGE-ACCOUNTS-brief:91,102`.
- **follow-up 1 (=0.8a) · FA Passo 11(h)/D6** [TRAVA]: COD_PB_RFB (PARTEB_PADRAO 1071/2210/3130) do M010, incluindo a conta "diferença de depreciação". Trava X4/H1b e o Lalur trimestral. Fonte: `ADR-INCR-FIXED-ASSETS:318`, `gates/D1.md`.
- **D7 · 9B-3**: de que `mappingVersion` partir (2025, 2026 ou ECF-2026)? Fonte: `ADR-INCR9B:82,192`.
- **F-EM-7**: confirmar 3.01.01.07.01.24 e 1.02.03.01.31 (amortização de benfeitoria). Já decidido por delegação. Fonte: `decisoes/D-2026-10-02-C8-EMENDA-3-2-E-I1B-FORKS.md:250`.
- **KIT §5-2**: códigos e nomes das contas de imposto do kit. Fonte: `KIT-SETOR-brief:494`.
- **P2-plano**: a clínica precisa de conta nova? Fonte: `BE-INCR-P2-VERTICAL-CLINICA-brief:360`.

### 1.2 Provisões, encargos e contabilização de eventos
- **TA §9.3 · X8 P-1 · SN §8.6 · P-5 (X7-A) · P-B8**: contas de provisão (IRPJ/CSLL, PIS/Cofins, DAS) e de saldo negativo. A CPP do DAS é dedução da receita ou despesa? Fontes: `ADR-INCR-TAX-ASSESSMENT:375`, `ADR-INCR-PIS-COFINS:210`, `PRE-ADR-SIMPLES:521`.
- **FA Passo 11(h) §5-a/c/d**: contas do imobilizado por classe e taxa praticada (Anexo III integral ou laudo do art. 124)? Usa depreciação acelerada por turnos? Trava: depreciação e baixa dão 400. Fonte: `ADR-INCR-FIXED-ASSETS:19-21,152-156`.
- **ENC §6-2/§6-4/§6-5**: multa de mora é despesa financeira ou operacional? O grupo "4.4 Multas indedutíveis" é aceito? Qual a conta da multa por obrigação acessória? Saldo negativo de multa no trimestre vira exclusão? Fonte: `ENCARGOS-DESCONTOS-EMENDA-3-3-brief:450-460`.
- **(premissa 09/10)**: tarifa bancária e do MP é despesa operacional dedutível, fora do M300? É diretriz do dono, sem validação. Fonte: `FE-INCR-BANK-CHARGE-ACCOUNTS-brief:92-97`.
- **MP P1–P4**: conta do saldo no MP ("a liberar" e "disponível" separados; a 1.1.4 serve?). Baixa na data do pagamento ou da liberação? Conta da tarifa; `TAXES_AMOUNT` é retenção recuperável? Como contabilizar estorno e chargeback? Fonte: `ADR-INCR-PAYMENT-PROVIDER-COLLECTION:364-367`. Estado: "nunca enviada" (:488).
- **X8 P-7/P-8**: o saldo credor do 1º mês está no saldo de abertura do "a recuperar"? A contrapartida "retenções a conciliar" está certa? Fonte: `decisoes/D-2026-10-06-X8-PR3-LACUNAS.md:51-57`.
- **Variação cambial**: como contabilizar a variação realizada em título em moeda estrangeira (NBC TG 02)? Trava o ADR de moeda no AR. Fonte: `decisoes/D-2026-09-29-CRM-RB-MOEDA-REALIZADO.md:33`.
- **ITEM-DEST P-4**: insumo vai para despesa na entrada ou fica no estoque até o consumo (CPC 16)? Fonte: `ITEM-DESTINATION-brief:517`.
- **(premissa FA:331)**: ICMS no custo do bem quando o contribuinte recupera ICMS (CPC 27)?

### 1.3 Pacote pré-pago
- **PE-1(i)(iii)(iv) · PP-3c**: qual norma a empresa segue (CPC 47, NBC TG 1000/1002 item 23.7)? Reconhece o vencido de uma vez ou proporcional (B46)? Competência em expiresOn+1? Fonte: `BE-INCR-PACOTE-VALIDADE-brief:481`.
- **PE-2**: vencido no Presumido/Real entra a 32% ou como "demais receitas" (100%)? Em qual linha da ECF? Fonte: `:482`.
- **PE-4 · PE-4b · DFE-5** [TRAVA]: ver §0 #3. Fonte: `:484`, `PEDIDO-CONTADOR-2026-10-02` item 1b, `ADR-INCR-DFE-EMISSAO-PARCEIRO:306`.
- **PE-5 · L8**: vencer o pacote é "desfazimento" (Dec. 12.955 art. 57) ou contraprestação para IBS/CBS? Qual `cIndOp` da nota do vencido? Fonte: `:475,485`.
- **PE-VP-1**: pacote B pago com saldo do pacote A é uso de saldo ou renovação? A NFS-e do B incide sobre valor já pago? Fonte: `FE-INCR-VENDA-PACOTE-brief:125`.
- **SN §8.7**: no Simples, a receita do pacote nasce na venda ou no consumo? Fonte: `PRE-ADR-SIMPLES:522`.

### 1.4 IRPJ/CSLL
- **P-1/P-2/P-3 (X7-A)**: o acréscimo da LC 224 é ×1,10? Como fica o limite anual da CSLL na transição de abril? O "poderá" do §5º vale sempre? Fonte: `BE-INCR-TAX-ASSESSMENT-A-brief:414-416`.
- **P-4 (X7-A) · D-5 LEGAL-PARAMS**: regra de arredondamento (hoje half-up sem fonte). Fonte: `:417`.
- **TA §9.4 · P-6/P-B7 · ECFP §7**: tratamento das "demais receitas" e ganhos de capital na base do Presumido (Lei 9.430 art. 25 II). Fonte: `ADR-INCR-TAX-ASSESSMENT:377`.
- **P-7**: serviço com percentual diferente de 32%. Fonte: `TAX-A:420`.
- **P-B1/P-B3/P-B4/P-B5/P-B6/P-B10**:
  - P-B1: o balancete deduz o "devido" ou o "já pago"?
  - P-B3: a LC 224 alcança a estimativa do Real?
  - P-B4: mês fracionado de início.
  - P-B5: limite de R$ 120 mil no ano de início.
  - P-B6: o 16% é "será" ou "poderão"?
  - P-B10: como reconstruir o "pago".
  - Fonte: `BE-INCR-TAX-ASSESSMENT-B-brief:505-514`.
- **PRESUMIDO-16 §4-2 (alínea j)**: salão é profissão "legalmente regulamentada" (Lei 9.250 art. 40 × Lei 12.592)? Decide o flag do 16%. Fonte: `BE-INCR-TAX-PRESUMIDO-16-brief:104`.
- **D-P3.3/D-P3.5 · 3C-5 · ECF3 §5.7**: base do prejuízo fiscal é resultado + ΣA − ΣE? Compensação acima do saldo dá 400? Trava de 30% (Lei 9.065). Fonte: `ADR-INCR-SPED-ECF-FASE3:603-619`.
- **P-CA-4**: no Real anual, como fica a CSLL quando a alíquota muda em 01/04 (rateio)? Fonte: `CSLL-ALIQUOTA-LC224-brief:122`.
- **ECFP Residual 2**: como representar as deduções de P300/P500 quando houver IRRF/CSLL retido? Fonte: `ADR-INCR-SPED-ECF-file-generation:88`.
- **X7 P-C1**: a planilha de memória de cálculo serve ao contador? Fonte: `BE-INCR-TAX-ASSESSMENT-C-brief:247`.

### 1.5 PIS/Cofins
- **X8 P-2/P-3**: exclusões do art. 26 e receitas financeiras no Real. "Mês da aquisição" é `dhEmi` ou a data de entrada? Fonte: `BE-INCR-PIS-COFINS-brief:279-281`.
- **follow-up 4 · ITEM-DEST P-1/P-3/P-6 · NFE-COST errata**: monofásico usado como insumo dá crédito (IN 2.121 art. 160; SC 4.024/2021)? O que é "insumo" no salão? CST 01 ou 02 com NCM monofásico dá crédito? Fonte: `ITEM-DESTINATION-brief:514-519`.
- **P-5 (X8)**: a clínica do P2 é "clínica médica" (IN 2.121 art. 126 IX a)? Fonte: `ADR-INCR-PIS-COFINS:224`.
- **ENC §6-6**: multa recebida entra no PIS/Cofins não cumulativo? Fonte: `ENCARGOS…:462`.
- **FA §5-e**: CIAP 1/48 e crédito de PIS/Cofins sobre depreciação (Lei 10.833 art. 3º VI). Fonte: `ADR-INCR-FIXED-ASSETS:191-194`.

### 1.6 ISS, NFS-e e perfil fiscal
- **D1f · follow-up 3a/3b · item novo**: alíquota de ISS de SP para 6.01/6.02/6.03 e `cClassTrib` de cada serviço. Trava X10b/X10i e a emissão de produção. Fonte: `gates/D1f.md`.
- **DFE p1/5a · KIT §5-3 · DFE achado 3-iii**: enquadramento em 6.01/6.02, `cNBS` de esteticista, `cTribNac`/`cNBS` de cada serviço do kit. Fonte: `BE-INCR-DFE-brief:753,789`.
- **item 1b · DFE achado 3-ii**: CST e `cClassTrib` de IBS/CBS e DeRE dos serviços. Fonte: `ADR-INCR-DFE-EMISSAO-PARCEIRO:193`.
- **DFE p8**: percentuais IBPT (`pTotTrib*`, Lei 12.741). Fonte: `BE-INCR-DFE-brief:760`.
- **P-C3/P-C4 (X7-C)**: o ISS do Simples sai pelo DAS no relatório? Nota cancelada fora da competência sai de onde? P-C3 talvez esteja superada pela D-2026-10-07. Fonte: `BE-INCR-TAX-ASSESSMENT-C-brief:249-250`.
- **[NOVO] L-ADN-3**: separar a numeração da DPS por ambiente é exigência ou boa prática? Depois do contador, vai ao órgão. Fonte: `BE-INCR-DFE-ADN-EMISSOR-brief.md`.

### 1.7 Obrigações acessórias
- **OBP §7.5 · FISC-OBL §5-3/§5-4**: em quais casos você entrega ECD para Simples e Presumido? Presumido com livro-caixa e escrituração completa fica dispensado? Fonte: `ADR-FISCAL-OBLIGATION-PROFILE:224`.
- **OBP §8**: o texto bruto da tabela de obrigações que o contador enviou não está no repo (só o resumo da triagem). Fonte: `:229`.
- **MIT P-2/P-3/P-4 · P-M1/P-M2/P-M4**:
  - P-2: `ValorDebito` é líquido ou bruto?
  - P-3: débito zero se declara?
  - P-4: o trimestral vai no PA do último mês?
  - P-M1: mês só com suspensão.
  - P-M2: Dados Iniciais na troca de regime.
  - P-M4: balancete com redução.
  - Fonte: `ADR-INCR-DCTFWEB-MIT:269-271`, `BE-INCR-MIT-EXPORT-brief:341-345`.
- **EMENDA-3-4 §6-1..6-5**: o cliente precisa do Livro de Inventário / Bloco H? Quais as faixas do aging? Que arquivos o contador importa? Que campos extras na ficha do imobilizado? Fonte: `CONTADOR-PACKAGE-EMENDA-3-4-brief:323-333`.
- **#331 item ampliado**: que demonstrativos vão no pacote além de ECD e ECF? Fonte: `FE-INCR-DELIVERY-brief:244`.
- **3B-7**: quais linhas E da M300A os clientes usam? Fonte: `BE-INCR-SPED-ECF-FASE3B…:546`.

### 1.8 Governança do contador
- **§7-b · GOV §3 · CONTADOR-DELIVERY §5-d**: assinatura interna + trilha atendem ao que você pediu no item 0? O desenho de 23/09 foi revalidado? O que precisa ver antes de assinar? Fonte: `BE-INCR-ACCOUNTANT-GOVERNANCE-brief:474`, `PRE-ADR-ACCOUNTANT-GOVERNANCE:76`.
- **F-POL-2**: quais parâmetros exigem aprovação do contador? Fonte: `FE-INCR-ACCOUNTING-POLICY-VERSION-brief:309`.
- **RL-3**: você revisa dentro do sistema ou por fora? Fonte: `BE-INCR-REVIEW-LAYER-brief:232`.
- **CRC-FOLLOWUPS §5-1/§5-2**: num registro transferido, que UF de CRC vai no SPED? `SP1234567` é 6 dígitos + DV? Fonte: `CRC-CFC-FOLLOWUPS-brief:112-114`.

### 1.9 Folha, parceria e retenções [NOVO]
- **L-PES-2**: parceiro MEI ou ME: o salão retém algo? Quem emite nota de quê para quem? Fonte: `PRE-ADR-PESSOAL-FOLHA-ESOCIAL-REINF.md`.
- **L-PES-3**: a cota do parceiro PF entra na folha do fator R? Se divergir, consulta à RFB.
- **L-PES-1** (com §4): o que o salão retém do parceiro PF e em qual obrigação informa.
- **L-PES-9** (com §4): sócio que trabalha é obrigado a ter pró-labore?
- **ADR-PIS-COFINS P-6 · SN §8.4**: o contrato de salão-parceiro é homologado (Lei 12.592 art. 1º-A §8º)? Qual a cota-parte? A cota do salão é aluguel ou gestão? Aqui pergunta e dado do cliente se misturam. Fonte: `ADR-INCR-PIS-COFINS:225`, `PRE-ADR-SIMPLES:518`.

### 1.10 ICMS [NOVO] (só se o gatilho do F-ICMS-0 disparar)
- **L-ICMS-1**: Simples com IE em SP abaixo do sublimite está dispensado da EFD? Depois do contador, vai à SEFAZ-SP. Fonte: `PRE-ADR-ICMS-IPI-EFD.md`.
- **L-ICMS-3 · L-ICMS-5 · SN §8.10**: SP cobra do Simples o DIFAL nas compras interestaduais? Perfumaria depois da Portaria SRE 94/2025 tem antecipação? Junto com lei pesquisável.
- **§6-1/§6-4/§6-5/§6-6 NFCE**: CSOSN e CFOP dos produtos; CRT 2; `tPag` para venda paga com saldo de pacote; desconto no item. Fonte: `BE-INCR-NFCE-brief:551-556`.
- **L-ICMS-10**: importação direta equipara a industrial para IPI? Junto com o RIPI.

---

## 2. Advogado

- **[NOVO] L-ADN-5 · L-PES-10** [TRAVA]: diante do **art. 6º p.ú. da MP 2.200-2** (chave privada de "exclusivo controle, uso e conhecimento" do titular; verificado em 10/10), guardar e usar o A1 do cliente é admissível? Com que outorga, contrato e base na LGPD? A NT 2026.001 (PAA) dá um caminho sem custódia? Cruza com a decisão 2 de 26/09 e o D1 do ADR ("nunca guarda A1"), que o fork F-ADN-1 precisa reabrir. Insumos do dono em §8.1.
- **PE-FE-1/2/3** (`PEDIDO-JURIDICO-2026-10-05`, **pronto, "Enviado em" vazio**):
  - PE-FE-1: o texto v1 é "prévio, ostensivo e com destaque"? "Não será devolvido" se sustenta?
  - PE-FE-2: "corpo 12" = 16px?
  - PE-FE-3: checkbox + assinatura bastam como aceite?
  - Fonte: `PACOTE-VALIDADE-PENDENCIAS-brief:180-182`.
- **Resíduo do PE-6**: a retenção de 100% do vencido é abusiva (o análogo do STJ é 20%)? Há 7 conferências deixadas pelo dossiê. O dono fechou o PE-6 contra a recomendação; o risco fica registrado. Fonte: `decisoes/D-2026-10-04-PACOTE-VALIDADE-TRIAGEM-JURIDICO.md:25-28`.
- **TJSP**: acórdão sobre validade de pacote de estética (o e-SAJ exige login). Fonte: `PESQUISA-LEGAL-PACOTE-VALIDADE:155`.
- **MP P5 · [NOVO] L-COB-4**: base na LGPD para enviar CPF, e-mail e endereço do pagador ao MP. A tela precisa avisar o titular? Fonte: `ADR-INCR-PAYMENT-PROVIDER-COLLECTION:368`.
- **[NOVO] L-COB-1**: a cobrança emitida pelo MP cumpre o art. 42-A do CDC (identificação do fornecedor)? Precisa do boleto real da sonda do M2.
- **[NOVO] L-COB-2 · baixa parcial**: juros, multa e desconto no título vencido (CDC 52 §1º, CC 406). Junto com lei e contador. Fonte: `ADR-INCR-PARTIAL-SETTLEMENT:379`.
- **LGPD do contador**: base legal, minimização e retenção de 5 anos dos dados do contador (§4 do ADR-CONTADOR-DELIVERY). Fonte: `CONTADOR-DELIVERY-brief:414`.
- **P2-LGPD**: dado de saúde na ficha da clínica: campos, base legal, retenção. Fonte: `BE-INCR-P2-VERTICAL-CLINICA-brief:354`.
- **AUDIT insumo 1 · CRC-VALIDACAO F-V4 · NFE-PREVIEW achado 3**: requisito formal da LGPD para o mascaramento de texto livre; base para enviar o CPF do contador ao CFC (não há RoPA); `dest.cpf` na resposta.
- **§7-c · valor da aprovação interna**: valor da assinatura e da aprovação internas (MP 2.200-2 art. 10 §2º) e da declaração de contrato (Res. CFC 1.590). Fonte: `BE-INCR-ACCOUNTANT-GOVERNANCE-brief:477`, `FE-INCR-ACCOUNTING-POLICY-VERSION-brief:311`.
- **§7-e**: cláusulas do contrato-modelo "com contador incluso". Fonte: `BE-INCR-ACCOUNTANT-GOVERNANCE-brief:486`.
- **TA §9.1 · P-11 · MIT P-5**: liminar contra a LC 224 (ver §0 #9). Responde o jurídico do cliente.
- **[NOVO] L-PES-7 · L-PES-8** (trabalhista):
  - L-PES-7: cláusulas da convenção coletiva dos salões de SP que afetam o cálculo, e o que prevalece (CLT 611-A).
  - L-PES-8: parceria sem homologação gera vínculo e obriga S-2200 retroativo?
- **PARECER-P2**: comissão do profissional sem arquétipo contábil; a Lei 13.352 não é citada. Fonte: `PARECER-ARCHITECT-ADR-P2:229`.
- **[NOVO] L-ICMS-7**: como SP regulamenta a homologação do saldo credor e do CIAP de bem entrado a partir de 2029 (LC 227 art. 134)? Junto com a SEFAZ-SP.
- **[NOVO] L-NFCE-2**: vender sem nota quando a SEFAZ cai é permitido em SP? Que contingência SP admite? (ato não identificado)

---

## 3. Órgão público

**CRC-SP** (envio decidido em 10/10; ver `CONSULTA-CRC-SP-2026-10-02-F-GOV-1.md`)
- **F-GOV-1 Q1–Q5 · §7-d · Z0-a**:
  - Q1: software × serviço contábil.
  - Q2: o contador assina o que não conduziu?
  - Q3: reabertura pelo dono de período já revisado.
  - Q4: a revisão é privativa de contador (DL 9.295 arts. 25/26)?
  - Q5: o aceite interno vale?

**CFC**
- **CRC-CFC-VALIDACAO §5-1/§5-2 · F-GOV-5(b)**: termos de uso da API e `hash` por registro. O algoritmo do DV não é publicado.

**Sistema Nacional NFS-e / CGNFS-e** [NOVO]
- **L-ADN-1**: o A1 da matriz assina e faz o mTLS da filial?
- **L-ADN-2**: o número de DPS rejeitada pode ser reusado? Exige algum registro?
- **L-ADN-4**: o mTLS pode usar o certificado do Luminaris, com o A1 do cliente só para assinar?
- Alternativa às três: o runbook do D5.

**SEFAZ-SP**
- **[NOVO] L-NFCE-1**: SP aceita o QR Code v3 (sem CSC) para PJ?
- **L-NFCE-3 · NFCE §6-3**: prazo de cancelamento da NFC-e e limite de valor.
- **L-NFCE-4**: precisa imprimir o DANFE NFC-e?
- **L-NFCE-5**: aplicativo próprio exige credenciamento?
- **[NOVO] L-ICMS-2/L-ICMS-4**: quando o optante que cruza o sublimite passa a apurar ICMS no regime normal e a entregar EFD? A DeSTDA segue exigível em SP?
- **[NOVO] L-ICMS-1**: lista de obrigados (ver §1.10).

**Prefeitura de SP**
- **X11 PV-1/PV-2 · DFE p9 · DFE-MANUAL p4**: prazos de cancelamento e substituição da NFS-e em SP, se exigem tomador e a partir de que instante contam.
- **PE-4**: ver §0 #3.

**RFB / CONFAZ / Portal SPED**
- **[NOVO] L-ICMS-6**: Guia Prático vigente da EFD ICMS/IPI: 3.2.2 ou 3.2.4?
- **[NOVO] L-ICMS-8**: norma acessória para 2029–2033.
- **[NOVO] L-PES-6**: dá para baixar os XML do eSocial? A Reinf aceita importar arquivo?
- **CSLL-RESSEGURADORES**: código ECF da CSLL de 9%; depende de ADE Cofis ainda não publicado.

**BCB / Febraban** [NOVO]
- **L-COB-3**: o Pix MP com até 30 dias é cobrança imediata com validade ou cobrança com vencimento? Decide o rótulo da tela.
- **L-COB-5**: o boleto da Orders API é registrado na plataforma Febraban? Com qual beneficiário?

**ITI**
- **SIG-NFE**: o OtherName fica opcional depois de 31/12/2028 (DOC-ICP-04 v8.3)? Revisitar quando sair a NT.

---

## 4. Pesquisa de lei pública (o agente responde, sem humano)

Pela regra do dono, estas **não vão** ao contador. Cada uma vira uma leitura de fonte primária com URL e data. Assim que a autorização permitir, dá para despachar em lote.

**Simples / MEI**
- R191 e Res. CGSN 184–190 e 192/2026 (texto da 191; conferir a 189 "01/09/2026").
- R2027: resolução que ajusta o art. 27 à LC 227 e o PGDAS-D/MEI de 2027.
- R169/2022.
- Opção pelo caixa em 2027 (F-SN-7).
- DEFIS mensal em 2027?
- Anexo XX: o excesso de ISS inclui o IBS? E 14,92537% × 14,93%.
- LC 123 art. 18 §§5º-C, 5º-I, §4º V; art. 13-A com IBS.
- Res. 140 art. 106 §1º.
- Situação do PLP 108/2021.
- Manual do PGDAS-D e da DEFIS.
- Piso de 2% (F-PI-2v; LC 116 art. 8º-B pós-2029).
- SEST/SENAT do TAC.
- Base do DAS no regime de caixa (X14).
- PE-3: o vencido entra no PGDAS-D? Pela regra de 07/10, isto é lei, não contador.
- §6-7 ENC: receita financeira fora da receita bruta do DAS.

**IRPJ/CSLL**
- P-10: irretratabilidade do Presumido.
- P-12: saldo negativo trimestral.
- Lei 9.430 art. 5º: quotas.
- Lei 9.430 art. 6º.
- P-CA-1 · P-CB-1: Lei 7.689 art. 3º na redação da LC 224; EC 103 art. 32.
- IN 2.305/2025 e 2.306/2026.
- Atualizar o corpus da IN 1.700 (art. 33).
- Código 2089/02 no MIT (Manual §10.1) = P-M5.
- IRRF que entra no MIT (IN SRF 137 art. 2º).
- Leiaute JSON do MIT mais novo que 20/02/2025.
- Multa fiscal indedutível: RIR 311 §2º × Lei 8.981 art. 41 §5º.
- Arredondamento do adicional.
- Depreciação por turnos (Lei 3.470 art. 69).
- PN CST 20/1980.
- Presumido sempre trimestral (Lei 9.430).
- Data-limite da ECD substituta.
- Lei 15.525/2026 (resseguradoras).

**PIS/Cofins / NF-e / ICMS**
- Lei 13.097 art. 30 (bebidas).
- IN SRF 459 (retenções).
- Redação do art. 3º II das Leis 10.637/10.833.
- Lei 10.833 art. 3º §1º: mês do crédito.
- RIR 301 §3º / CPC 16 item 11.
- LC 123 art. 23.
- Tabelas de CST 4.3.3 (D-6 LEGAL-PARAMS = NFE-COST f9).
- CFOP 3551 e outros CFOPs de imobilizado (D-7).
- CFOP de entrada pela destinação (A-8).
- LC 87 art. 20 §1º.
- LC 214 art. 57 I f.
- Portaria CAT 28/20.
- Ajuste SINIEF 19/16.
- NT de IBS/CBS para o Simples.
- RICMS-SP: conformidade da venda anônima sem documento (F-NFCE-7 b).
- [NOVO] L-ICMS-9: FCP em SP.
- [NOVO] L-ICMS-3/5: base legal, antes de ir ao contador.
- Formato da IE de SP.

**ISS / NFS-e**
- Ato Conjunto 5/2026 (PNCT): o que conta como inconsistência; PAR-1/6/7.
- P-C2 · PAR-2: município do ISS e exceções do art. 3º da LC 116.
- DFE-4 · PAR-3: retenção pelo tomador PJ (LC 116 art. 6º).
- PAR-4: recolhimento de IBS/CBS em 2026.
- RISS-SP: NFS-e com pagamento antecipado.
- DFE-7/8 · DFE-TPAMB V2/V3 · DFE-MANUAL p3: prazo de cancelamento × substituição, numeração e "produção restrita" = tpAmb 2.
- IA-1/IA-2: parâmetros municipais na API; Anexo IV do ADN.
- `pTotTribSN` (E0713).
- Formato de `cTribNac`.
- Leiaute DPS com e-mail/telefone do tomador.
- Guarda do XML de NFS-e cancelada (5 anos do CTN?).
- PAR-5: devolução.
- DFE-9 · DFE p11: e-CNPJ da matriz vale para as filiais (regra RFB/ICP).
- Lei de benefício municipal de ISS do salão-piloto.

**SPED / leiaute**
- 9B-1..5 · F-KS-7: arquivo oficial do plano referencial (formato, entidade, ECD = ECF?, analítica/sintética, encoding) e tabela por regime × ano.
- OBP §7.3 · FISC-OBL §5-1/§5-2: fonte da aplicabilidade das obrigações; MEI no §2º da IN 2.003.
- L13: acompanhar o Leiaute 13 da ECF (ano 2026), que bloqueia a ECF 2026.
- TA §10.1: N620/N660.
- Regras dos meses `B`.
- Item 1.29 do Manual ECF.
- PVA-5: COD_ASSIN por papel.
- CRC/`UF_CRC` de transferido no Manual L9.
- p.12 do Manual ECD de jan/2026.
- CNPJ-ALFA PE-1/PE-2 (ECD 0000; NT 2026.004 / IN 2.229).
- MIT P-1: CNPJ alfanumérico no nome do arquivo.
- P-CA-3 · P-CB-2: IND_ALIQ_CSLL 7/8 no manual de 20/05/2026.
- Leiaute do J150 (§7.5 ENC).
- NBC TA 530 (amostragem).
- ITG 2000 itens 31–36 (ITG-36 e ITG-RL).
- INCR3 Emenda 1: fundamento do Diário sem lacunas.
- Custo médio aceito (CPC 16).

**Folha / Reinf / consumidor** [parte NOVO]
- L-PES-1: base legal da retenção do parceiro PF (Lei 10.666, IN 2.110).
- L-PES-4: Simples como tomador retém CSRF/IRRF?
- L-PES-5: aluguel a PF no R-4010.
- L-PES-9: obrigatoriedade de pró-labore.
- B47: lei de propriedade não reclamada.
- NBC TG 1000 R2.
- Feriado nacional e sábado (CC 132).
- Res. Conjunta 1/2020 (Open Finance), achado do mapa financeiro.

---

## 5. Dado do cliente (não é pergunta de lei; vem do cadastro ou do contrato)
- SN §8.1: CNAEs.
- SN §8.2: NCMs revendidos e estoque comprado com ST antes de 01/04/2026.
- SN §8.3: caixa ou competência em 2026.
- SN §8.5: 12–13 meses de receita e folha + PGDAS-D.
- SN §8.11: opção pelo IBS/CBS regular em 2027 (decisão do dono com o contador).
- TA §9.5: se qualifica ao 16%?
- ECFP Residual 2: tem IRRF retido relevante?
- D6: convênio e CNAB 240 do banco.
- R3: desvios do Segmento E.
- E9 / D2: XML de NF-e real.
- NFCE §6-2: NCM de cada produto.
- [NOVO] Folha: o 1º cliente tem empregado CLT? Quem faz a folha hoje? Decide o F-PES-0.

## 6. Oráculo / gate humano (não é pergunta; entra por runbook com evidência colada)
- PVA:
  - H1 (ECD/ECF Presumido), H1b (Real, P-B9 anual), H3 (clínica);
  - PVA-1/2 da ECF3 (E990/M990/S990 com N; L030/M030/N030);
  - D-P3.1, D-M4, D-P4 (saldo zero "C", `histLancamento`, ordem e M500 zerado);
  - ECFP Residual 1/3 (bloco S vazio; COD_VER);
  - 3C-2 (COD_CTA_B vazio);
  - EMENDA 4ª (DT_INI/DT_FIN de A0m).
- 1ª importação no MIT (MIT P-6, P-M3); JSON real do MIT como fixture.
- DAS do portal × espelho em competências reais (SN §11.5); guia real do PGMEI (TAC misto, PGMEI 2027).
- Medições no portal NFS-e: PV-1..PV-10 (`RUNBOOK-H2-DFE-MANUAL`).
- 1ª apuração real × contador (TA §9.7, X8 P-4); 1º ativo-conjunto; conferência da depreciação e dos rótulos da tela (H2).
- Homologação no ADN (D5) e sonda do MP no M2.

---

## 7. Respondidas ou superadas (só para não perguntar de novo)
- **PEDIDO-CONTADOR-2026-09-03, itens 0–13:**
  - Respondidos em 23/09 (triagem): LC 116 6.01/6.02/6.03, DeRE fora, Z0-a "assina sob condições", F-PC-1, natureza dos encargos (item 6).
  - D8 fechado em 24/09.
  - O item 0 respondeu, mas o desenho que saiu dele não foi revalidado (§1.8).
- **Follow-up itens 5–11 e o §8 do PRE-ADR do Simples:** superados pela D-2026-10-07 ("decide-se pela lei"). Candidatas à mesma superação: **PE-3** e **P-C3**.
- **PE-6:** respondida pelo jurídico em 04/10 e fechada pelo dono (F-JUR-0). Obs.: o `QUESTIONARIO-DONO-2026-10-10.md:74` ainda lista "jurídico (PE-6)" como pronto; o pedido pronto de fato é o PE-FE-1..3.
- **P-CA-1/2:** fechadas na fonte em 10/10. **P-4 do X8** e **P-3 de PIS/Cofins** (códigos no MIT): resolvidas em 03/10.
- **V4 do X7** (DIRF extinta, DCTFWeb + MIT, GIA-SP dispensada): fechada em 29/09. **L-X9-1:** fechada.
- **Fechadas em 29/09 (TA §10):** DCTFWeb na matriz (02/10); MEI e ECD/ECF; limiar de grande porte; vencimento do DAS no dia 20; DEFIS em 31/03; livro-caixa dispensado; ST de perfumaria em SP saiu em 01/04/2026; N620/N660 como fórmula do PVA; o MIT importa JSON; balancete de suspensão suprido pela ECD.
- **ECF Lucro Real:** Forks 2–6 e §5 itens 1–6 e 8 (Manual L12, 11/09). **ECD:** PVA-1..4, 6, 7. **ECF Presumido:** ECF-1..7.
- **Imobilizado:** IN 1.700 arts. 120–125, Anexo III, IN 2.003/2.004, J801/J935, limite de R$ 1.200 no conjunto, CFOP 1551; emenda 3.2 do C8 (FLAG A–D).
- **IPI na base do crédito:** STJ Tema 1.373 (#381). **Combustíveis monofásicos:** Tabela 4.3.10 (#387).
- **Lista de feriados nacionais:** transcrita do Planalto em 04/10 (`validity.ts:15-17`).
- **Perguntas sobre a Focus** (A1 no painel, entrega ao tomador): perderam o objeto em 07/10 (emissor próprio).

## 8. Conflitos que este levantamento encontrou
1. **Data da NFS-e do Simples.** O corpus tem a CGSN 191/2026 (01/11/2026). O ADR DFE:336 cita a CGSN 189. Um comunicado de Fortaleza (secundário) fala em 01/09/2026 pela 189. O Ato 4 §1º diz 01/01/2027 (IBS/CBS). Prioridade alta no §4.
2. **Custódia do A1.** O BRIEF ADN de hoje exige custódia. A decisão 2 de 26/09 e o D1 do ADR a proíbem e não foram revogados por escrito. Vai ao dono como F-ADN-1, e ao advogado como L-ADN-5.
3. **Livro-caixa.** O PRE-ADR do Simples diz que ele não está na matriz, mas `obrigacoesPorRegime.ts:21` tem `LIVRO_CAIXA`. É texto desatualizado.
4. **X10i, X10a e D5 ainda citam a Focus**, e a nota F5 diz que o #609 está sem merge. As duas precisam de fold.
5. **Nomes de pedido divergentes** (#331, "passo 11", follow-up 0.8x, "lista de 29/09", "junto do D8", `[[ENVIO-PEDIDO-CONTADOR]]`). Os BRIEFs mandam a mesma pergunta a pedidos diferentes, e nenhum registra envio. **DECIDIDO (dono, chat, 10/10):** "Acato a sugestão. Devemos montar um pedido único." Montado em [`PEDIDO-CONTADOR-2026-10-10-UNICO.md`](../accounting/PEDIDO-CONTADOR-2026-10-10-UNICO.md) a partir do §1 (blocos A–F, 31 itens com critério de aceite); os rascunhos de 23/09 e 02/10 levam a marca SUPERSEDIDO. O agente monta; quem envia é o dono.

### 8.1 Insumos do dono sobre os conflitos (chat, 10/10), conferidos na fonte
- **Conflito 1 (datas da NFS-e): FECHADO pela pesquisa de 10/10 (§10.1): 01/11/2026, Res. CGSN 191 art. 3º I.** Texto original: o dono indica a Res. CGSN 169/2022, alterada pelas 189 e 191, e o Ato Conjunto 4 como as normas do cronograma. Estava aberto: o insumo não diz qual data vale para o 1º cliente. Falta ler o texto da 189 e da 191 (§4). Obs.: o Ato 4 é Ato Conjunto RFB/CGIBS, não Ato Declaratório Executivo.
- **Conflito 2 (custódia do A1; F-ADN-1, L-ADN-5).** Normas indicadas pelo dono como base das proibições antigas:
  - **MP 2.200-2/2001, art. 6º, parágrafo único: VERIFICADO** (planalto.gov.br, lido em 10/10). Texto: *"O par de chaves criptográficas será gerado sempre pelo próprio titular e sua chave privada de assinatura será de seu exclusivo controle, uso e conhecimento."* É o argumento mais forte contra a custódia.
  - **Lei 14.063/2020: PARCIALMENTE VERIFICADO.** O art. 4º III define a assinatura qualificada como a que usa certificado ICP-Brasil. **Não existe** no texto dispositivo que atribua ao titular responsabilidade civil ou penal pela guarda: busquei "guarda", "responsabilidade" e "senha" e não há ocorrência. Achado útil: o **art. 5º §2º III** torna obrigatória a assinatura qualificada "nas emissões de notas fiscais eletrônicas, com exceção daquelas cujos emitentes sejam pessoas físicas ou MEIs, situações em que o uso torna-se facultativo".
  - **DOC-ICP-03: NÃO VERIFICADO** nesta sessão. A afirmação de que ele exige controle exclusivo da chave privada pelo titular fica para o advogado conferir; o requisito pode estar no DOC-ICP-04 ou no DOC-ICP-05.
  - **Contraponto para o advogado (inferido, não verificado):** emissores de nota via API costumam guardar o A1 do cliente em nuvem, e a NT 2026.001 ("Provedor de Assinatura e Autorização", não lida) pode mudar o desenho. A pergunta L-ADN-5 passa a ser: *"Diante do art. 6º p.ú. da MP 2.200-2, guardar e usar o A1 do cliente é admissível, com que outorga e contrato? A NT 2026.001 (PAA) oferece um caminho sem custódia?"* O F-ADN-1 continua **RATIFICAÇÃO PENDENTE**: estas normas fundamentam a proibição antiga e não a revogam.
- **Conflito 3:** decidido (item 5 acima). A fundamentação citada (LC 123 arts. 25–27; Res. CGSN 140 arts. 77–81) trata das declarações do Simples e não da forma do pedido ao contador; a decisão vale pelo comando do dono, não por essa base.

## 9. Mapa de fundamentos indicado pelo dono (chat, 10/10, 2ª mensagem)

O dono indicou a norma de cada tema. **Indicar a norma não responde a pergunta**: cada linha continua aberta até a
leitura do dispositivo (§4) ou a resposta de quem está no §1–§3. O mapa serve de roteiro da pesquisa do §4.

**Normas que conferem com o que este documento já citava (sem mudança):**
- **NFS-e e ISS:** LC 116 arts. 3º e 6º; Lei 12.741 (IBPT); RISS-SP (pacote).
- **A1 e assinatura:** MP 2.200-2 art. 6º e art. 10 §2º; Lei 14.063; DOC-ICP-04 v8.3 (OtherName).
- **Salão-parceiro e trabalhista:** Lei 12.592 art. 1º-A §8º; Lei 9.250 art. 40 × Lei 12.592; Lei 10.666 e IN RFB
  2.110; CLT art. 611-A.
- **Pacote pré-pago:** CPC 47, NBC TG 1000 e NBC TG 1002 item 23.7; Decreto 12.955 art. 57; lei de propriedade não
  reclamada.
- **IRPJ/CSLL:** LC 224 alterando a Lei 7.689 art. 3º; RIR art. 311 §2º × Lei 8.981 art. 41 §5º; Lei 9.065 (trava
  de 30%); Lei 9.430 art. 25 II.
- **Imobilizado:** IN 1.700 arts. 120–125 e Anexo III; Lei 3.470 art. 69; CPC 27.
- **Contador:** DL 9.295 arts. 25–26; Res. CFC 1.590.
- **PIS/Cofins:** IN 2.121 arts. 126 IX a e 160; Tabela 4.3.10; Lei 13.097 art. 30; Lei 10.833 art. 3º VI e §1º.
- **ICMS:** LC 227 art. 134; LC 87 art. 20 §1º.
- **Cobrança:** CDC arts. 42-A e 52 §1º; CC arts. 132 e 406; LGPD.

**Citações trocadas ou misturadas (corrigir antes de levar ao advogado ou ao contador):**

| Indicado | Correção | Grau |
|---|---|---|
| "Ato Declaratório Executivo nº 4 (§1º)" | É o **Ato Conjunto RFB/CGIBS nº 4/2026**, não ADE | verificado (corpus `fontes-oficiais/` e ADR DFE:38-46) |
| "Piso de ISS a 2% (pós-2029): LC 116 art. 8º-B" | O piso de 2% é o **art. 8º-A**. O 8º-B trata da redução de 2029–2032, e o efeito dele sobre o piso é justamente a pergunta aberta | verificado nos BRIEFs (`SIMPLES-PISO-ISS-ANEXO-XI-brief:54,239`); o texto do 8º-B não foi relido |
| "CGNFS-e: padrões definidos pelo Ato Conjunto nº 5/2026 (PNCT)" | O Ato Conjunto 5/2026 é **RFB/CGIBS** e trata do PNCT (correção de inconsistências até 31/12/2026). Os padrões da NFS-e nacional são do CGNFS-e, em outros atos | inferido (ADR DFE:44-46; o PDF do Ato 5 não foi lido) |
| "LC 214 art. 57 I f: ajustes do ICMS na base" | O art. 57 da LC 214 é sobre **IBS/CBS** (bens de uso e consumo pessoal, sem crédito), não sobre ICMS. A pergunta ITEM-DEST P-5 usa esse dispositivo para os bens "estéticos" | verificado no BRIEF (`ITEM-DESTINATION-brief:518`); dispositivo não relido |
| "LC 224 … impacta a EC 103 art. 32" | O art. 32 da EC 103 é a **CSLL dos bancos** (P-CB-1). Não é efeito da LC 224 no Presumido | verificado no BRIEF (`CSLL-BANCOS-Q1-brief:82`) |
| "Lei 9.430 art. 25 II (sempre trimestral)" | O art. 25 II trata das "demais receitas" na base do Presumido. A periodicidade trimestral é outra regra da mesma lei (art. 1º), com pergunta própria em §4 | assumido (art. 1º não relido nesta sessão) |

**O que muda:** nada no §0–§8. A data da NFS-e do Simples segue como conflito (§8.1, item 1).

## 10. Resultado da pesquisa em fonte primária (10/10)

**Autorização (dono, chat, 10/10):** "Sim, roda a pesquisa para termos um questionário mais completo e assertivo".
Cinco frentes. Os relatórios ficam em [`docs/accounting/pesquisa-lei-2026-10-10/`](../accounting/pesquisa-lei-2026-10-10/),
com status, citação literal, URL, data e grau de cada item.

| Frente | Itens | Resolvidas | Parciais | Não alcançadas |
|---|---|---|---|---|
| [Simples e datas da NFS-e](../accounting/pesquisa-lei-2026-10-10/simples-nfse.md) | 16 | 12 | 4 | 0 |
| [ISS, NFS-e e PNCT](../accounting/pesquisa-lei-2026-10-10/iss-nfse.md) | 21 | 12 | 9 | 0 |
| [IRPJ, CSLL e SPED](../accounting/pesquisa-lei-2026-10-10/irpj-sped.md) | 43 | 27 | 15 | 1 |
| [PIS/Cofins, ICMS e NF-e](../accounting/pesquisa-lei-2026-10-10/piscofins-icms.md) | 27 | 20 | 7 | 0 |
| [Parceria, consumidor, LGPD e A1](../accounting/pesquisa-lei-2026-10-10/parceria-consumidor-a1.md) | 30 | 16 | 14 | 0 |
| **Total** | **137** | **87** | **49** | **1** |

As parciais viraram perguntas assertivas ("Pela [norma], entendemos [X]. Confirma?"). As do contador estão no
[pedido único v2](../accounting/PEDIDO-CONTADOR-2026-10-10-UNICO.md). As do advogado e dos órgãos estão em 10.3.

### 10.1 Respostas que mudam decisão ou prazo
- **Data da NFS-e do Simples (§8.1, conflito 1): FECHADO. É 01/11/2026.** Res. CGSN 191 art. 3º I: *"produzirá efeitos:
  I - a partir de 01 de novembro de 2026, em relação ao art. 1º"*. A Res. 189 foi revogada pela 191 em 10/08, antes de
  produzir efeito. O Ato Conjunto 4 (01/01/2027) trata dos documentos de IBS/CBS e não adia a NFS-e.
- **Prazos urgentes:** opção pelo Simples para 2027 até **15/10/2026**; opção pelo regime regular de IBS/CBS até
  **30/10/2026** (Res. 186, alterada pela 194). O dono decidiu ficar no DAS em 29/09; o item E1(d) do pedido confirma
  com o contador.
- **Pacote vencido (PE-4):** pela letra, **sem ISS e sem NFS-e** em SP (Lei SP 13.701 arts. 1º e 6º; RISS art. 81;
  SC SF/DEJUG 06/2018). **Se o contador confirmar, contraria o F-PV-9 (b)**, que emite NFS-e automática no vencimento,
  e o modo `VENDA`, que emite antes da prestação. Vai ao dono como fork reaberto; nada foi revertido.
- **Alíquota de ISS em SP para 6.01–6.03:** 5% (Lei 13.701 art. 16 IV), sem benefício municipal. Nenhum tomador retém
  esse ISS.
- **Regime de caixa do Simples acaba em 2027** (Res. 190 revoga os arts. 19–20). **DEFIS acaba em 2027** (vira bloco
  anual do PGDAS-D). **O MEI passa a emitir documento fiscal em toda venda, inclusive para pessoa física** (LC 214 art.
  517; Res. 190). Isso afeta o X14 e o alerta `NFSE_DIVERGE_RECEITA`.
- **16%:** **esteticista é profissão regulamentada** (Lei 13.643/2018). O salão que presta estética pode perder o 16%.
  O flag do PRESUMIDO-16 precisa distinguir esse caso.
- **Certificado A1 (F-ADN-1 / L-ADN-5):**
  - O DOC-ICP-04 v8.3 item 6.1.1.8 diz que o armazenamento de chaves por terceiros **"só poderá ser realizada por
    entidade credenciada como PSC"** (DOC-ICP-17, Res. CG ICP-Brasil 180/2020).
  - O tipo **A1 foi extinto** pela Res. CG ICP-Brasil 211/2024. A PJ passa a ter o selo eletrônico SE-S, admitido até
    02/03/2029 (data lida em reprodução não oficial).
  - O **PAA** (NT 2026.001, em produção desde 05/10/2026) assina NF-e e NFC-e sem guardar o certificado do cliente,
    mas **não cobre a NFS-e nacional**.
  - Consequência: o desenho do BRIEF ADN (o Luminaris guarda o A1 do cliente) **não tem amparo na norma**. Para a
    NFS-e, o caminho regulado é certificado em nuvem num PSC credenciado. Para NF-e e NFC-e, é o PAA. Isso vai ao
    dono junto com o F-ADN-1 e o F-NFCE-E1-1.
- **Parceiro PF:** o salão retém **11% de INSS** e recolhe até o dia 20, sem patronal à parte (Lei 10.666 art. 4º; IN
  2.110 arts. 37, 41 e 165). Retém também IRRF pela tabela. Pela Res. 140 art. 2º §5º VI, só a cota de parceiro com
  CNPJ sai da receita do salão. O fator R não se aplica à receita da parceria (art. 25 §18).

### 10.2 Afirmações do repositório que caem

> **Errata aplicada em 10/10** (dono, chat: "Faz uma sessão de errata"): nota `[ERRATA 10/10]` na própria linha de
> cada documento, sem apagar o texto original.
> - **MANIFEST:** 3 linhas.
> - **PESQUISA-X14 §3a:** 1 linha.
> - **TAX-ASSESSMENT-A:** P-2 e item 186.
> - **ADR X7:** ADI 7982, 2 linhas.
> - **Multa** (FE-BANK-CHARGE-ACCOUNTS, EMENDA-3-3): citação conferida, nada a trocar.
> - **DOSSIE e ITEM-DESTINATION** (SC 4.024 → SC Cosit 496/2017; CFOP 1.128): 5 linhas.
> - **NFC-e 30 min:** NFCE-brief, 2 linhas; EMENDA-1, 1 linha.
> - **PRE-ADR Simples:** livro-caixa.
> - **Sem errata:** IN 459, porque a afirmação estava no texto da IN e não num doc nosso; DOC-ICP-03, que já está
>   corrigido no §8.1/§10.2 deste documento.
> - **Corpus defasado registrado no MANIFEST e não rebaixado:** IN 1.700 (IN 2.343/2026) e NT 2025.002 v1.52.
| Onde | Afirmação | Correção | Fonte |
|---|---|---|---|
| `fontes-oficiais/MANIFEST.md` | compilação da Res. 140 vai até a 183 | já traz as 190 e 191 | arquivo do corpus (sha `8d9b024965c1`) |
| `PESQUISA-X14-PR4-LACUNAS-2026-10-09.md` §3a | LC 123 art. 26 §§1º e 6º não mudam | LC 214 art. 517 reescreve os dois; MEI emite documento fiscal em toda venda a partir de 2027 | simples-nfse |
| `BE-INCR-TAX-ASSESSMENT-A-brief` (P-2 / item 9) | limite da CSLL de R$ 5 mi no ano | **R$ 3,75 mi em 2026** (P&R LC 224 v5, item 13; orientação da Receita, não lei) | irpj-sped |
| §9 deste documento e emenda 3.3 | multa indedutível: "RIR art. 311 §2º" | **RIR art. 352 §5º** | irpj-sped |
| corpus da IN 1.700 | art. 33 vigente | IN 2.343 (17/09/2026) mudou o §1º II a e o §4º; o §7º (16%) não mudou. Baixar de novo | irpj-sped |
| `DOSSIE-DECISOES-2026-09-29.md:143`; `ITEM-DESTINATION-brief:386,436,514` | SC Cosit 4.024/2021 sobre monofásico como insumo | é a SC **Disit/SRRF04** 4.024 e trata de produto hospitalar com alíquota zero; a regra real é a IN 2.121 art. 160 II b + art. 534 §1º II | piscofins-icms |
| `BE-INCR-NFCE-brief` `[NFE-CANC-PRAZO]` | cancelamento da NFC-e em 24 h | **30 minutos** (Ajuste SINIEF 19/16 cl. 15ª, desde 01/10/2018) | piscofins-icms |
| `ITEM-DESTINATION` A-8 | CFOP do insumo de serviço = 1.556 | **1.128/2.128** (Ajuste SINIEF 03/22) | piscofins-icms |
| `BE-INCR-PIS-COFINS-brief` (IN 459) | dispensa de CSRF até R$ 5.000 | a Lei 10.833 art. 31 §3º (red. Lei 13.137/2015) só dispensa até R$ 10; vale a lei | piscofins-icms |
| corpus NT 2025.002 | v1.51 | **v1.52** (01/10/2026) | piscofins-icms |
| §8.1 conflito 2 (insumo do dono) | "DOC-ICP-03" exige controle exclusivo | o requisito está no **DOC-ICP-05 v7.0** (4.5.1.2 b, 9.3.3.3) e no **DOC-ICP-04 v8.3** (6.1.1.6 c; 6.1.1.8) | parceria-consumidor-a1 |

### 10.2.1 Achado da revisão do dono (10/10): gate de cobertura da ECD é mais rígido que a lei
Pelo Manual da ECD, item 1.17, *"O mapeamento para os planos de contas referenciais é facultativo"* (`irpj-sped.md:288`).
O **H1 parado no P5** (ECD 400 `unmappedAccounts:[3.4]`) é causado pelo **gate de cobertura do Luminaris**, não pela lei.
O código continua necessário para a ECF. Decisão do dono: afrouxar o gate só na ECD (permitir gerar a ECD sem I051 para
conta não mapeada) destrava o passo da ECD do H1 sem esperar o contador. **Não decidido; nada foi alterado.**

### 10.3 Perguntas ao advogado e aos órgãos depois da pesquisa (substituem as versões do §2–§3)
- **Advogado:**
  - **F-3/F-4 + L-ADN-5:** "Pelo DOC-ICP-04 v8.3 item 6.1.1.8 (guarda só por PSC), pela Res. CG ICP-Brasil 211/2024
    (A1 extinto, SE-S para PJ) e pela NT 2026.001 (PAA), entendemos que o Luminaris **não pode guardar o certificado do
    cliente**. A NF-e/NFC-e segue pelo PAA homologado no ENCAT; a NFS-e nacional, por certificado em nuvem num PSC.
    Confirma? O SE-S pode assinar DPS/NF-e (a norma diz que não serve como manifestação de vontade da PJ)?"
  - **PC-24:** "Pelo RICMS-SP art. 115 XV-A a, SP cobra DIFAL do Simples também na compra para revenda; mas a Lei 6.374
    art. 2º VI só prevê uso, consumo e ativo. Pelo Tema 1284 do STF (exige lei estadual em sentido estrito), entendemos
    que o DIFAL de revenda é discutível. Confirma?"
  - **C-2:** "O teto de 2% do CDC art. 52 §1º está em artigo sobre fornecimento com crédito. Entendemos que, pela leitura
    ampla do STJ, ele vale para serviço sem financiamento. Confirma, e com qual precedente?"
  - **C-4:** "Pelo CC art. 132, Lei 9.093 e Lei 7.089, vencimento em sábado, domingo ou feriado (inclusive estadual e
    municipal) prorroga para o dia útil seguinte sem juros. A Lei 7.089 alcança instituição de pagamento como o MP?"
  - **E-1:** "Pela LGPD art. 7º V, entendemos que enviar CPF, e-mail e endereço ao MP é execução de contrato, com o MP
    como operador. Ou ele é controlador independente? Precisa de aviso ao titular na tela?"
  - PE-FE-1..3, L-PES-7/8, LGPD do contador e clínica, e A-7 sem mudança.
- **CRC-SP:** B-1: "Pelo DL 9.295 arts. 25 c e 26, a revisão de escritas é privativa de contador. A revisão do C11
  dentro do sistema é 'revisão de escritas'?" Vai junto com o F-GOV-1.
- **Prefeitura de SP:**
  - Prazos de cancelamento e substituição da NFS-e nacional em SP, e se o prazo do RISS art. 94 vale para o Simples.
  - Prazo para emitir em mês posterior ao da prestação.
  - O emissor municipal integrado cumpre a Res. 140 art. 59 §1º, ou o Simples tem de usar o Emissor Nacional?
  - Alternativa formal para o PE-4: consulta à SF/DEJUG (Lei SP 14.107 arts. 73–78).
- **CGNFS-e ou teste na produção restrita (runbook D5):**
  - Numeração da DPS separada por ambiente.
  - O que a API de parâmetros municipais devolve.
  - A filial pode assinar com o certificado da matriz? A rejeição E0718 fala em "certificado do emitente".
- **Não alcançadas ou adiadas:**
  - PN CST 20/1980 e IN SRF 137/1998 art. 2º: o portal não tem busca pública.
  - Fontes de aplicabilidade de EFD-Contribuições, EFD ICMS/IPI, eSocial/Reinf e DCTFWeb para o OBP §7.3: outra rodada.
  - Texto integral da Lei SP 13.701: lido só em resumo para o ISS do parceiro.
  - Lei 8.706 (SEST/SENAT): página indisponível.
- **PVA ou 1ª importação no MIT (§6):**
  - IND_ALIQ_CSLL 7/8: o manual de maio se contradiz.
  - Arredondamento: não há regra escrita.
  - CNPJ alfanumérico no nome do arquivo MIT.
  - Meses B.

## Grau
- **Verificado:** cada linha tem fonte arquivo:linha lida integralmente pelas varreduras. As de hoje vêm dos documentos produzidos nesta sessão.
- **Inferido:** o estado "sem registro de envio" vem da ausência de marca de envio nos documentos lidos; um envio feito fora do repositório não aparece. A coluna "pesquisa pública" é classificação.
- **Não exaustivo:** sete BRIEFs técnicos foram lidos só pela seção de pendência externa (vazia em todos). O corpo do checklist do TAX-ASSESSMENT-B foi lido por grep.
- **Caso adversarial:** procurei em cada arquivo marcas de "enviado em". A única encontrada é a decisão de envio da CONSULTA-CRC-SP (10/10). O PEDIDO-JURIDICO-2026-10-05 tem o campo explicitamente vazio.
