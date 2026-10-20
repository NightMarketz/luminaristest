# Eficiência fiscal em SERVIÇOS — práticas lícitas, limite legal e o que pode entrar no nó EFICIENCIA-FISCAL (20/10/2026)

> Pedido do dono (chat, 20/10): *"Já pesquise formas de vc ter eficiencia fiscal em serviços tbm"*. Complementa
> [`PESQUISA-EFICIENCIA-FISCAL-2026-10-20.md`](PESQUISA-EFICIENCIA-FISCAL-2026-10-20.md) (foco em produto e combo).
> Base legal lida no acervo `ctresb/leis`, no Planalto, no Sijut (RFB), no STJ/STF e na legislação de SP pelo método
> oficial — dossiê [`pesquisas-legais/eficiencia-fiscal-servicos/relatorio.md`](../../pesquisas-legais/eficiencia-fiscal-servicos/relatorio.md)
> (referências `[Dnn]` e `[SIJUT nnn]` são desse dossiê, com hash). Grau: **V** verificado na fonte oficial ou no acervo
> compilado · **V\*** lido em fonte oficial por sessão anterior · **I** inferido · **A** assumido.

**Em duas linhas.** Em serviço não há "preço a otimizar": a economia lícita vem de **enquadrar certo** (percentual de
presunção por atividade, anexo do Simples, fator r, subitem da LC 116 e alíquota municipal, NBS da saúde em 2027) e de
**estrutura real** (parceria com contrato, sociedade uniprofissional sem estrutura empresarial, desconto incondicional
destacado). O maior ganho é da **clínica**: 8 %/12 % no Presumido para procedimento hospitalar (Atribuição 4 da RDC 50)
e Anexo III pelo fator r no Simples. **Risco principal:** procedimento **estético** não tem nenhuma Solução de Consulta
que dê 8 % e está fora da redução de 60 % de 2027 — tratar estética como saúde é o erro mais caro desta lista (S1).

---

## 1. O limite legal em serviços

| Regra | Norma | O que diz | Efeito no desenho |
|---|---|---|---|
| Base do ISS = preço do serviço | LC 116 art. 7º [D01] | material aplicado só se deduz em 7.02/7.05 (art. 7º § 2º I; LC 123 art. 18 § 23 [D05]) | produto aplicado integra o preço do serviço; separar só o que o cliente **leva** (revenda) |
| Alíquota mínima 2 % | LC 116 art. 8º-A [D01]; LC 157 art. 10-A [D06] (improbidade) | benefício abaixo de 2 % é nulo | `IssBeneficioMunicipal` já tem o piso |
| Atividades mistas no Presumido | Lei 9.249 art. 15 § 2º [D03] | "percentual correspondente a cada atividade" | presunção **por serviço**, não por empresa (exceto 16 %, ver S4) |
| Equiparação hospitalar | Lei 9.249 art. 15 § 1º III "a" [D03]; IN RFB 1.700 art. 33 (red. IN 2.343/2026) | 8 % IRPJ / 12 % CSLL para serviços hospitalares e de auxílio diagnóstico e terapia, **sociedade empresária** + **Anvisa** | catálogo de serviços elegíveis + checklist; o resto em 32 % |
| Simples: anexo por atividade | LC 123 art. 18 §§ 5º-B, 5º-I, 5º-J, 5º-M [D05] | saúde (fisio, medicina, odonto, psicologia…) = III se r ≥ 28 %, senão V; salão/estética = III direto (SC Cosit 127/2019 [SIJUT 99744]) | `SIMPLES_ENQUADRAMENTO` por `cTribNac` (X14) |
| ISS fixo no Simples | LC 123 art. 18 § 22-A [D05]; Res. CGSN 140 art. 25 | só escritório contábil; "não se aplica… valor fixo… enquanto não optante" | SUP **só fora do Simples** |
| Parceria | LC 123 art. 13 § 1º-A [D05]; Lei 12.592 art. 1º-A §§ 4º, 5º, 8º e art. 1º-C [D08] | cota do profissional fora da receita; contrato escrito homologado; vínculo se dissimular emprego | X14 já aplica; alerta de contrato/CNPJ |
| Pré-pago (2027+) | LC 214 art. 10 § 4º [D09] | IBS/CBS antecipados "na data de pagamento de cada parcela" | não há diferimento de IBS/CBS no pacote |
| Saúde 60 % (2027+) | LC 214 art. 130 + Anexo III [D09] | lista fechada por NBS; estética não consta | NBS por serviço → alíquota |
| Estéticos sem crédito | LC 214 art. 57 [D09] | "serviços recreativos, esportivos e estéticos" (uso pessoal) | opção do Simples pelo regime regular rende pouco no salão |

## 2. Práticas classificadas

### 2.1 Lucro Presumido

| Prática | Como funciona | Base legal / posição oficial | Classe | Automatizável? | Grau |
|---|---|---|---|---|---|
| **Equiparação hospitalar (8 %/12 %)** | procedimento da "Atribuição 4" da RDC Anvisa 50 (cirurgia, procedimentos invasivos, fisioterapia, terapia ocupacional, fonoaudiologia, diagnóstico por imagem, laboratório…) em sociedade empresária "de direito e de fato" com alvará sanitário; consulta simples fica em 32 % | Lei 9.249 art. 15 § 1º III "a" e art. 20 [D03]; IN 1.700 art. 33 (red. IN 2.343, 17/09/2026: incluiu fisio/TO/fono, revogou as exclusões de estrutura de terceiro e ambulatorial); SC Cosit 127/2026 [SIJUT 152634] e SC Disit 7013/2026 [SIJUT 154157]: "inobservância de quaisquer desses requisitos… 32%"; STJ Tema 217 (interpretação objetiva) | LÍCITA com requisitos | flag `elegivelHospitalar` por serviço + checklist (sociedade empresária, alvará vigente, Atribuição 4); presunção por serviço no X7 | V |
| Equiparação usando estrutura de terceiro | admitida se houver "efetivo elemento empresarial" | SC Disit 6032/2025 [SIJUT 148113]; IN 2.343 revogou a exclusão | LÍCITA | checklist | V |
| **Procedimento estético** a 8 % | nenhuma SC admite; SC Cosit 195/2019 [SIJUT 101592] fala em atividades "voltados diretamente à promoção da saúde" | — | CINZENTA → ILÍCITA sem fonte (S1) | bloquear 8 % em serviço marcado estético | I |
| Presunção de 16 % (receita ≤ R$ 120 mil) | prestadora exclusiva de serviços em geral; não vale para hospitalar nem profissão regulamentada | Lei 9.250 art. 40 [D04]; IN 1.700 art. 33 §§ 7º–10; ADN Cosit 22/2000 (impedimento é da PJ) | LÍCITA para salão só de cabelo/unha; ILÍCITA com esteticista (Lei 13.643) ou médico no quadro (S4) | **já existe** (X7 PRESUMIDO-16, com confirmação F-P16-1) | V / V\* |
| Desconto incondicional | deduzido da receita bruta | Lei 9.249 arts. 15 e 20 [D03] | LÍCITA | desconto por item destacado (PR-1 do nó) | V |
| Pré-pago no Presumido | competência: receita quando o serviço é prestado, independe do recebimento | SC Cosit 15/2026 [SIJUT 149273] | LÍCITA | receita diferida (pacote já é passivo no razão) | V |

### 2.2 Simples Nacional

| Prática | Como funciona | Base legal / posição oficial | Classe | Automatizável? | Grau |
|---|---|---|---|---|---|
| **Fator r ≥ 28 % em saúde** | medicina, enfermagem, odontologia, fisioterapia, psicologia, TO, acupuntura, podologia, fono, nutrição: Anexo III (1ª faixa 6 %) em vez do V (15,5 %) | LC 123 art. 18 § 5º-B XVI/XIX/XX/XXI, § 5º-M I, § 24 [D05]; Res. CGSN 140 arts. 25–26 | LÍCITA com folha e pró-labore reais (A3 do dossiê de produto) | **já calcula** (X14); falta o simulador (PR-3 do nó) | V |
| Salão e estética no Anexo III direto | sem fator r | SC Cosit 127/2019 [SIJUT 99744] | LÍCITA | **já existe** (enquadramento por `cTribNac`) | V |
| Médico fazendo estética | vai por medicina (§ 5º-B XIX), com fator r | — | — | alerta ao cadastrar o serviço | I |
| **Cota do salão-parceiro fora da receita** | profissional com CNPJ ativo e contrato homologado | LC 123 art. 13 § 1º-A [D05]; Res. CGSN 140 art. 2º § 5º VI ("desde que este esteja devidamente inscrito no CNPJ"); Lei 12.592 art. 1º-A § 5º [D08] | LÍCITA | **já existe** (X14 `SalaoParceriaContrato`); falta alerta de CNPJ e contrato (PR-4 do nó) | V |
| Cota do salão como **aluguel de bem móvel, sem ISS** | locação de móveis vai ao Anexo III deduzido o ISS; a lei da parceria chama a cota de "aluguel de bens móveis e utensílios" e/ou "gestão" | LC 123 art. 18 § 4º V [D05]; Lei 12.592 art. 1º-A § 4º [D08]; SV 31 | CINZENTA (S3): nenhuma norma trata da combinação | **já existe** no X14 (`ALUGUEL_BEM_MOVEL` → `LOCACAO_MOVEL`); falta a pergunta ao contador | V (texto) / I (combinação) |
| ISS fixo (SUP) dentro do Simples | vedado; só contábil | LC 123 art. 18 § 22-A [D05]; Res. CGSN 140 art. 25 | ILÍCITA | bloquear SUP com regime SIMPLES | V |
| Cessão de mão de obra médica | vedada no Simples | SC Cosit 185/2026 [SIJUT 153818] | ILÍCITA | alerta | V |
| Locação de imóvel próprio | veda a opção pelo Simples | LC 123 art. 17 XV (red. LC 214) | ILÍCITA no optante | bloqueio ao cadastrar | V (pesquisa) |
| Produto aplicado × vendido | aplicado = Anexo III com o serviço; vendido = Anexo I (revenda, segregável se monofásico) | Res. CGSN 140 art. 25 § 18 | LÍCITA (segregar o que o cliente **leva**) | natureza por item (já existe) | V |
| Pré-pago no Simples | receita no faturamento **ou** na prestação, "o que ocorrer primeiro" — emitir NFS-e na venda do pacote antecipa a receita | SC Cosit 158/2020 [SIJUT 114933]; Res. CGSN 140 art. 2º §§ 8º–9º | LÍCITA: NFS-e por sessão consumida adia a receita | regra de emissão por consumo | V |

### 2.3 ISS

| Prática | Como funciona | Base legal / posição oficial | Classe | Automatizável? | Grau |
|---|---|---|---|---|---|
| **SUP — ISS fixo por profissional** (médicos, fora do Simples) | base fixa × profissional habilitado; em SP R$ 1.995,26 × profissional (até 5, faixa do § 12); subitens 4.01, 4.02, 4.06, 4.08, 4.11–4.14, 4.16 (nenhum 6.xx) | DL 406 art. 9º §§ 1º e 3º [D02]; STJ Tema 1.323 (limitada não impede; exige prestação pessoal, responsabilidade técnica individual e sem estrutura empresarial); Lei SP 13.701 art. 15 [D11] | LÍCITA sem estrutura empresarial; CINZENTA em SP para limitada (S2) | simulador ISS fixo × variável + checklist (filiais, sócio investidor, nº de profissionais) | V |
| Alíquota por subitem | SP: itens 4 e 5 e subitem 6.04 a 2 %; 6.01, 6.02, 6.03, 6.05, 6.06 na regra geral (5 %) | Lei SP 13.701 art. 16 I "a" (red. Lei 18.066/2023) [D11] | — | alíquota por `cTribNac` × município (X7 Fase C) | V |
| Desconto incondicional | sai da base do ISS em SP | Lei SP 13.701 art. 14 [D11] | LÍCITA | desconto destacado na NFS-e | V |
| Deduzir produto aplicado | só 7.02/7.05 | LC 116 art. 7º § 2º I [D01]; LC 123 art. 18 § 23 [D05] | ILÍCITA | bloquear dedução de material | V |
| Benefício municipal abaixo de 2 % | nulo | LC 116 art. 8º-A [D01] | ILÍCITA | **já existe** (`IssBeneficioMunicipal`) | V |

### 2.4 Estrutura de pessoal

| Prática | Posição | Base | Classe | Automatizável? | Grau |
|---|---|---|---|---|---|
| Parceria (Lei 13.352) | lícita com contrato escrito homologado e funções do contrato | Lei 12.592 arts. 1º-A § 8º e 1º-C [D08]; STF ADI 5625 | LÍCITA; ILÍCITA se dissimula emprego | alertas: sem contrato, sem CNPJ, horário imposto, exclusividade, remuneração fixa, parceiro em função administrativa | V / V\* |
| Terceirização / PJ | lícita entre pessoas jurídicas distintas; pejotização com subordinação = vínculo | STF Tema 725; Tema 1.389 (pendente) | LÍCITA / CINZENTA | alerta de indícios de subordinação | V |
| CPRB (desoneração da folha) | salão e clínica não estão no rol | Lei 12.546 arts. 7º–8º [D07] | inaplicável | — | V |

### 2.5 Reforma (2027+)

| Prática | Como funciona | Base | Classe | Automatizável? | Grau |
|---|---|---|---|---|---|
| Saúde 60 % | 30 itens do Anexo III por NBS (clínica médica, médicos especializados, odontologia, enfermagem, fisioterapia, laboratório, imagem…); Decreto 12.955/2026 art. 205 repete a lista | LC 214 arts. 128 II e 130 + Anexo III [D09]; [D12] | LÍCITA; estética fora | NBS por serviço → alíquota (`ServiceFiscalProfile.cNBS` já existe) | V |
| Procedimento estético por médico | NBS 1.2301.22 "serviços médicos especializados"? | — | CINZENTA (S1) | decisão humana por serviço | I |
| 30 % profissões | 18 profissões; médico, dentista, fisio, esteticista e cabeleireiro **fora** | LC 214 art. 127 [D09] | inaplicável a salão/clínica | — | V |
| Simples no regime regular de IBS/CBS | dá crédito ao tomador PJ; serviço estético não gera crédito ao tomador (art. 57) | LC 214 arts. 41 §§ 3º–5º, 57 [D09] | LÍCITA | simulador só para clínica com tomador PJ | V |
| Nanoempreendedor | PF com receita < 50 % do limite do MEI não é contribuinte | LC 214 art. 26 IV [D09] | LÍCITA (parceiro PF) | alerta | V |
| Pré-pago | IBS/CBS antecipados no recebimento | LC 214 art. 10 § 4º [D09] | diferir é ILÍCITO | débito no recebimento (nó IBS-CBS-2027) | V |
| Transição do ISS | 9/10 em 2029 … ISS extinto em 2033 | EC 132, ADCT arts. 128–129 | — | tabela por ano (nó ISS-TRANSICAO-IBS) | V |

## 3. O que o Luminaris já faz (medido no código, 20/10)

| Prática | Estado | Onde |
|---|---|---|
| Anexo do Simples por `cTribNac`; fator r | ✅ cálculo | `simplesCalc.ts` (`SIMPLES_ENQUADRAMENTO`, `fatorR`) — X14 |
| Cota do salão-parceiro fora da receita; aluguel × gestão | ✅ | `SalaoParceriaContrato.naturezaCota`; `SimplesApuracaoService.ts:446,704` (`ALUGUEL_BEM_MOVEL` → `LOCACAO_MOVEL`) |
| Presunção de 16 % no Presumido | ✅ | X7 PRESUMIDO-16 (`taxAssessmentCalc.ts:294-411`, confirmação F-P16-1) |
| **Presunção hospitalar 8 %/12 %** | ⬜ | `taxAssessmentParams.ts:32` só conhece `SERVICO`/`REVENDA`; grep `HOSPITAL` = 0 |
| **ISS fixo (SUP)** | ⬜ | grep `uniprofissional`/`ISS_FIXO` = 0 |
| Benefício municipal de ISS com piso de 2 % | ✅ | `IssBeneficioMunicipal` |
| NBS por serviço (para o 60 % de 2027) | 🟡 campo | `ServiceFiscalProfile.cNBS` existe; sem mapeamento ao Anexo III da LC 214 |
| NFS-e por sessão consumida do pacote | 🟡 | pacote é passivo no razão (`CustomerPackageBalance`); emissão da NFS-e no consumo não verificada |
| Alertas de parceria (CNPJ, contrato) | ⬜ | PR-4 do nó EFICIENCIA-FISCAL (comportamento 19) |

## 4. Proposta para o nó EFICIENCIA-FISCAL (incluída no PRE-ADR como PR-5 — dono, 20/10)

| # | Automação | Tipo | Base legal | Toca |
|---|---|---|---|---|
| S-1 | **Presunção por serviço no Presumido**, com `elegivelHospitalar` no catálogo de serviço e checklist (sociedade empresária, alvará vigente com validade, Atribuição 4); sugestão "este serviço pode ir a 8 %/12 %" com economia estimada; bloqueio para serviço marcado estético | cálculo + sugestão + bloqueio | Lei 9.249 art. 15 § 1º III "a", § 2º, art. 20; IN 1.700 art. 33 (IN 2.343) | X7 (`taxAssessmentParams`, `ServiceFiscalProfile`) |
| S-2 | **Simulador SUP × ISS variável** para clínica fora do Simples, com checklist do Tema 1.323 e a faixa municipal | simulação + bloqueio no Simples | DL 406 art. 9º §§ 1º/3º; Lei SP 13.701 art. 15; Res. CGSN 140 art. 25 | X7 Fase C (ISS) |
| S-3 | **Alerta de enquadramento de serviço**: médico com serviço estético; esteticista no quadro tira o 16 %; locação de imóvel próprio no optante; cessão de mão de obra médica | alerta | LC 123 arts. 17 XV, 18 § 5º-B; SC 185/2026; ADN Cosit 22/2000 | X14, X7 |
| S-4 | **NFS-e do pacote por sessão consumida** (não na venda) no Simples, com aviso de que o IBS/CBS de 2027 é devido no recebimento | regra de emissão | SC Cosit 158/2020; LC 214 art. 10 § 4º | X10a/X10i, IBS-CBS-2027 |
| S-5 | **NBS → Anexo III da LC 214** por serviço, com "estética = alíquota cheia" por padrão e decisão humana para procedimento médico estético | classificação | LC 214 art. 130 + Anexo III | IBS-CBS-2027, `ServiceFiscalProfile.cNBS` |
| S-6 | Alertas de parceria completos (já no comportamento 19 do PRE-ADR) + indícios de vínculo do art. 1º-C | alerta | Lei 12.592 arts. 1º-A § 8º, 1º-C | X14 |

Dono, chat, 20/10: *"Inclua as propostas S-1..S-6 de serviços no PRE-ADR do EFICIENCIA-FISCAL como comportamentos e
forks pendentes."* — viraram os comportamentos 25–33 (PR-5) e os forks F-EF-10..13 do `ADR-INCR-EFICIENCIA-FISCAL`;
S1–S4 viraram P-EF-7..10.

## 5. Para o contador (perguntas exatas)

- **S1:** "Na clínica, quais procedimentos vocês classificam como Atribuição 4 da RDC 50 para o 8 %/12 % no Presumido?
  Algum procedimento estético (toxina, preenchimento, laser) entra? E em 2027, procedimento estético feito por médico
  vocês enquadram como 'serviço médico especializado' (60 %) ou alíquota cheia?"
- **S2:** "A clínica é limitada em SP; vocês pleiteariam o ISS fixo de sociedade uniprofissional com base no Tema 1.323
  do STJ, ou mantêm o ISS sobre o faturamento?"
- **S3:** "Vocês aceitam a parcela de aluguel da cota do salão-parceiro como locação de bem móvel (Anexo III sem ISS)?
  Que cláusula do contrato querem ver separando aluguel de gestão?"
- **S4:** "Com uma esteticista no quadro, confirmam que a presunção de 16 % (Lei 9.250 art. 40) cai para toda a empresa?"

## 6. O que a pesquisa não confirmou

- Nenhuma SC Cosit dá 8 % para procedimento estético; nenhuma trata de "clínica de estética" no Simples.
- Acórdão do STJ sobre desconto incondicional na base do ISS: bloqueado por verificação humana no SCON (pista: REsp
  1.893.596). A conclusão de desconto em SP vem da lei municipal.
- Valor 2026 da base da SUP em SP; resolução do CGSN posterior a 10/09/2026; reclamações do STF sobre pejotização médica.
- Download direto do Sijut devolve só o invólucro em JavaScript; os atos foram lidos pela API pública e guardados com
  hash no dossiê (seção 3 do relatório).
