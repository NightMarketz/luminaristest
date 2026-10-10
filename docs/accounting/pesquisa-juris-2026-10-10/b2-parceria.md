# Jurisprudência: Bloco 2, salão-parceiro e pró-labore (questões 2.1 a 2.4), 10/10/2026

Prompt: `docs/accounting/PROMPT-PESQUISA-JURISPRUDENCIA-2026-10-10.md`, Bloco 2. Autorização do dono (chat, 10/10): "Faz um prompt
para o que o contador não confirmou e pesquise jurisprudencia". Ponto de partida, não repetido aqui:
`pesquisa-lei-2026-10-10/parceria-consumidor-a1.md` (A-1..A-11) e `PRE-ADR-PESSOAL-FOLHA-ESOCIAL-REINF.md`.

**Como verifiquei.** Busquei direto nas bases oficiais, todas consultadas em 10/10/2026:
- **STF:** portal de processos, ADI 5625, abas Andamentos e Decisões (incidente 5094239).
- **TST:** API da pesquisa de jurisprudência (`jurisprudencia-backend.tst.jus.br/rest/pesquisa-textual`), filtro "Acórdão".
- **CARF:** índice Solr público de acórdãos (`acordaos.economia.gov.br/solr/acordaos2`). A busca alcança só a **ementa**; o
  campo de texto integral não responde a consultas.
- **RFB (normas):** API de pesquisa (`normas.receita.fazenda.gov.br/api/indexacao/ato/pesquisar`) e API de texto
  (`normasinternet2.../api/consulta-externa/ato/{id}/visao/multivigente`).
- **Não acessei:** STJ (SCON) devolveu um desafio anti-robô e não tentei contornar; jurisprudência do TRT-2.

Os textos brutos estão em `scratchpad/juris/b2/`.

**Graus:** **V** = li o dado (número, data, relator, ementa) na base oficial nesta sessão. **S** = fonte secundária, só pista.
**I** = minha inferência.

---

Questão 2.1 — ADI 5625 e vínculo de emprego quando o contrato não é homologado ou a parceria é fraudada
Posição: constitucionalidade **(a) apoia**, segurança **alta**. Efeito da falta de contrato ou de homologação: **(c) dividida**,
com tendência a **presunção relativa** de vínculo (o salão pode provar que não há subordinação), segurança **média**.
Decisões:
  - STF ADI 5625, rel. orig. Min. Edson Fachin (vencido), **redator do acórdão Min. Nunes Marques**, Tribunal Pleno, julg.
    28/10/2021, acórdão publ. DJe 29/03/2022 (DJe nº 59, divulgado em 28/03/2022), **trânsito em julgado em 06/04/2022** —
    força: **vinculante** (controle concentrado; não houve embargos) —
    https://portal.stf.jus.br/processos/detalhe.asp?incidente=5094239 — V
    Tese, item 2: "É nulo o contrato civil de parceria referido, quando utilizado para dissimular relação de emprego"
    (item 1: constitucional nos termos da Lei 13.352/2016). Placar por maioria, vencidos Fachin e Rosa Weber.
  - TST AIRR-0000065-36.2024.5.10.0103, rel. Min. Dora Maria da Costa, 8ª Turma, julg. 03/12/2025, publ. 15/12/2025 —
    força: persuasivo (turma; decisão por maioria, vencido o Min. Evandro Valadão) — https://jurisprudencia.tst.jus.br — V
    "É de presunção relativa a configuração de vínculo empregatício [...] na hipótese de ausência de formalização escrita de
    contrato de parceria" (art. 1º-C, I, pode ser afastado sem os elementos dos arts. 2º e 3º da CLT).
  - TST RR-10465-90.2018.5.03.0014, rel. Min. Mauricio Godinho Delgado, 3ª Turma, julg. 15/05/2024, publ. 17/05/2024 (embargos
    de declaração rejeitados em 21/08/2024, publ. 23/08/2024) — força: persuasivo — https://jurisprudencia.tst.jus.br — V
    Reconheceu o vínculo de uma cabeleireira. O contrato escrito só existia a partir de 2017 e **não foi homologado** (art.
    1º-A §8º), mas a Turma decidiu pela **primazia da realidade** (subordinação objetiva e estrutural) e disse que o caso
    "não pode ser analisado apenas sob o aspecto formal". Ônus da prova do salão (art. 818 da CLT).
  - TST Ag-RR-10862-64.2017.5.03.0183, 6ª Turma, julg. 27/02/2019, publ. 01/03/2019 — força: persuasivo (fatos anteriores à Lei
    13.352) — V
    Transcreve o TRT-3: "A inexistência do contrato por escrito [...] por si só, não invalida uma parceria".
  - TST AIRR-1000174-02.2024.5.02.0444 (origem TRT-2), rel. Min. Delaíde Miranda Arantes, 2ª Turma, julg. 25/09/2026, publ.
    02/10/2026 — força: isolado; não entrou no mérito (rito sumaríssimo, art. 896 §9º da CLT) — V.
  - **Pistas S, não conferidas na fonte primária:** TRT-2, 15ª Turma (2021, rel. juiz Marcos Neves Fava): vínculo de manicure
    sem contrato escrito (ConJur, 04/10/2021). TRT-5 e TRT-15 (2ª Câmara, 2025): vínculo por falta de contrato. TRT-3 (4ª
    Turma, julho de 2025): parceria válida com contrato homologado.
Superação/vigência: ADI transitada em 06/04/2022, sem modulação. O TST cita a ADI 5625 ao lado da ADPF 324, da ADC 48 e do Tema
725 para validar contratos não celebrados pela CLT (ex.: RR-10721-46.2015.5.01.0482, 4ª Turma, julg. 27/05/2025, corretor;
V). Não localizei Reclamação no STF que tenha cassado decisão de vínculo em salão.
Conclusão em 2 linhas: a parceria é constitucional, mas o que decide o vínculo no TST é a realidade (subordinação), não o papel.
Na letra, a falta de contrato homologado leva ao vínculo (art. 1º-C); a 8ª Turma trata isso como presunção que admite prova em
contrário, e a 3ª Turma reconheceu o vínculo pela subordinação, apesar de existir contrato.
Pergunta que sobra para advogado ou contador: a falta **só da homologação**, com contrato escrito e duas testemunhas, basta para
a presunção do art. 1º-C, I? Nenhum acórdão do TST lido decide esse ponto isolado (L-PES-8 continua aberta). O sindicato de SP
homologa esses contratos, e com que custo e prazo?

Questão 2.2 — INSS de 11% e IRRF sobre a cota do parceiro PF; patronal do salão do Simples
Posição: **(c) inexistente**, segurança **baixa** quanto a precedente. A leitura continua sustentada só pela letra (A-2, A-3: Lei
10.666 art. 4º; IN 2.110 arts. 37 II "a", 41 I e 165 I; RIR art. 685).
Decisões:
  - **Não localizei** SC Cosit, Disit ou acórdão CARF sobre a retenção de INSS ou de IRRF na cota do profissional-parceiro. Fiz
    oito buscas na base de normas da RFB ("salão-parceiro", "profissional-parceiro", "Lei nº 12.592", "13.352", "cabeleireiro",
    "salão de beleza", "cota-parte parceiro", "salão-parceiro contribuinte individual") e várias na ementa do CARF ("PARCEIRO",
    "CABELEIREIR", "SALÃO DE BELEZA", "BELEZA", "MANICUR", "12.592", "13.352").
  - Mais próxima (diferente, anterior à Lei 13.352): RFB SC Cosit nº 80, de 31/03/2014, DOU 29/05/2014 — força: administrativo
    vinculante para a RFB, mas anterior à lei —
    https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=52783 — V
    "não afirma, autoriza ou abona a modalidade de operacionalização de salão de beleza e dos profissionais que lá atuam como se
    pessoas jurídicas fossem [...] pois frustam e descumprem as legislações trabalhista, tributária e previdenciária".
    Diferença: tratava de profissionais com CNPJ e de uma PJ de "gestão de caixa", antes da Lei 13.352. Mostra a desconfiança da
    RFB com o modelo, não decide a retenção.
  - Enquadramento do salão no Simples: RFB SC Cosit nº 127, de 27/03/2019 — força: administrativo vinculante — idAto=99744 — V
    Salão de beleza do Simples tributa no **Anexo III** (art. 18 §5º-F). Com a Res. CGSN 140 art. 25 §18 (A-8), fica de pé que a
    CPP está dentro do DAS e que **não há 20% patronal à parte** (I).
Superação/vigência: SC 80/2014 e SC 127/2019 constam como vigentes na base da RFB.
Conclusão em 2 linhas: não há precedente administrativo nem do CARF sobre os 11% e o IRRF da cota do parceiro PF. A posição do
sistema se apoia só na letra da lei, que é clara para quem presta serviço a empresa.
Pergunta que sobra para advogado ou contador: a cota do parceiro PF é "remuneração por serviço prestado ao salão" (o salão
retém 11%) ou receita própria do profissional prestada ao **cliente**, em que o salão só arrecada (Lei 12.592 §§2º e 4º)? Se
for a segunda, a base da Lei 10.666 art. 4º cai. **Vale fazer consulta formal à RFB (IN 2.058)**, porque não há SC sobre isso.

Questão 2.3 — A cota do parceiro PF sai da receita bruta do salão? (Simples × Presumido/PIS-Cofins)
Posição: Simples **(a) apoia** a leitura literal (a cota do PF **sem CNPJ** fica na receita do salão), por analogia, segurança
**média-baixa**. Presumido e PIS/Cofins **(c) inexistente** sobre salão-parceiro; as analogias favorecem a exclusão quando o
contrato segue a lei, segurança **baixa**.
Decisões:
  - RFB SC Cosit nº 94, de 24/06/2025, DOU 27/06/2025 — força: administrativo vinculante —
    https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=144819 — V
    No Simples, o criador de cursos reconhece o total "sem dedução da comissão da plataforma e da parcela repassada ao
    Coprodutor". É análogo: sem exclusão expressa, o repasse ao parceiro fica na receita.
  - RFB SC Cosit nº 46, de 19/03/2025 — força: administrativo vinculante — idAto=143384 — V
    "sendo permitidas apenas as exclusões expressamente previstas na legislação do Simples Nacional". Daí (I): como o art. 2º §5º
    VI da Res. 140 exige CNPJ, a cota do PF não sai.
  - RFB SC Cosit nº 78, de 25/06/2020 — força: administrativo vinculante — idAto=110776 — V
    Valores da "empresa parceira" destinados aos funcionários "compõem a receita bruta [...] já que fazem parte do preço".
  - Presumido, analogia favorável: RFB SC Cosit nº 161, de 08/09/2025, DOU 11/09/2025 — força: administrativo vinculante —
    idAto=146243 — V
    Sociedade de advogados no Presumido "poderá reconhecer como receita bruta própria apenas a parcela dos honorários que lhe
    couber, conforme estipulado em contrato previamente firmado", observadas as normas do conselho profissional. A SC Cosit nº
    210, de 29/09/2025, se vincula a ela.
  - Presumido e PIS/Cofins cumulativo, anterior à lei: SC Cosit nº 80/2014 (acima) — V
    Ficam fora da receita os valores "por conta e ordem de terceiros e que representem receita bruta destes terceiros, com a
    respectiva emissão de nota fiscal em nome deles".
  - CARF Acórdão 1302-005.086, proc. 11516.720225/2013-15, rel. Cleucio Santos Nunes, 2ª Turma Ordinária da 3ª Câmara da 1ª
    Seção, sessão 08/12/2020, publ. 18/01/2021 — força: persuasivo (turma ordinária; unânime; fatos de 2009) — V
    Antes da Lei 13.352, "a triangulação entre o proprietário do negócio, o cliente e prestador" fez a receita recebida pelo
    dono do salão ser tratada como receita da atividade dele, com lucro arbitrado. O acórdão ressalva expressamente que a análise
    é anterior à lei.
Superação/vigência: todas as SCs constam como vigentes. Não localizei SC nem acórdão aplicando a Lei 12.592 §5º, que exclui a
cota do parceiro da receita bruta **sem condicionar a CNPJ**, a IRPJ, CSLL ou PIS/Cofins.
Conclusão em 2 linhas: no Simples, a RFB só admite exclusão expressa; a Res. 140 exige CNPJ, então a cota do PF fica na receita
(premissa do A-7 reforçada). No Presumido e no PIS/Cofins não há regra de CNPJ: a lei e as analogias (SC 161/2025, SC 80/2014)
favorecem a exclusão, sem precedente direto.
Pergunta que sobra para advogado ou contador: no Presumido, a Lei 12.592 §5º basta para excluir a cota do parceiro **PF** (sem
nota emitida por ele)? A SC 80/2014 condiciona a exclusão à nota "em nome deles". Isso pede consulta formal.

Questão 2.4 — Pró-labore: a RFB e o CARF requalificam lucro do sócio que trabalha? Há valor mínimo? SC Cosit 120/2016
Posição: **(c) dividida**, segurança **média**. A **RFB contraria** a leitura "não há obrigação de pró-labore" no plano
administrativo vinculante. O **CARF está dividido**, inclusive na CSRF. **Não há valor mínimo** em norma nem em decisão.
Decisões:
  - **RFB SC Cosit nº 120, de 17/08/2016, publ. 19/08/2016 — EXISTE, consta como vigente** — força: administrativo vinculante
    para a RFB — https://normasinternet2.receita.fazenda.gov.br/#/consulta/externa/76675 (idAto 76675) — V. A API devolveu só a
    ementa, sem relatório nem fundamentos. Teor:
    - Assunto: Contribuições Sociais Previdenciárias. "SÓCIO. PRÓ-LABORE. INCIDÊNCIA DE CONTRIBUIÇÃO."
    - O sócio "da sociedade civil de prestação de serviços profissionais" que presta serviços à sociedade é contribuinte
      individual (Lei 8.212 art. 12 V "f"), "sendo obrigatória a discriminação entre a parcela da distribuição de lucro e aquela
      paga pelo trabalho".
    - "Pelo menos parte dos valores pagos pela sociedade ao sócio que presta serviço à sociedade terá necessariamente natureza
      jurídica de retribuição pelo trabalho".
    - Dispositivos: Lei 8.212 arts. 12 V "f", 21, 22 III e 30 §4º; Lei 10.666 art. 4º; RPS art. 201 §5º; IN 971 arts. 52 e 57.
      Não fixa valor mínimo.
  - RFB SC Cosit nº 228, de 16/10/2023 — força: administrativo vinculante; **mais recente, mesma tese** — idAto=134391 — V
    Sociedade simples, sócio de serviços: é "obrigação da sociedade a discriminação [...] não é possível considerar todo o
    montante pago a esse sócio como distribuição de lucros". No IRPF, os lucros ao sócio de serviços ficam isentos (Lei 9.249
    art. 10). A Disit/SRRF04 nº 4016, de 17/04/2024, se vincula a ela e cita a IN 2.110 art. 33 §§3º e 4º (V).
  - CARF CSRF Acórdão **9202-009.799**, proc. 10140.722267/2011-71, rel. Pedro Paulo Pereira Barbosa, 2ª Turma da CSRF, sessão
    27/08/2021, publ. 27/09/2021 — força: persuasivo (CSRF; maioria) — V — **contra o contribuinte**
    "A base de cálculo [...] corresponde aos valores totais pagos ou creditados [...] quando não houver discriminação entre a
    remuneração decorrente do trabalho e a proveniente do capital social."
  - CARF CSRF Acórdão **9202-010.159**, proc. 10140.720479/2010-33, rel. Maria Helena Cotta Cardozo, 2ª Turma da CSRF, sessão
    24/11/2021, publ. 17/01/2022 — força: persuasivo (CSRF; unânime) — V — **a favor do contribuinte**
    Aceitou a distribuição de lucros "com base na produção do sócio e não conforme o capital social" (sociedade simples).
  - CARF Acórdão **2101-002.899**, proc. 10280.722578/2020-27, rel. Wesley Rocha, 1ª Turma Ordinária da 1ª Câmara da 2ª Seção,
    sessão 04/09/2024, publ. 18/02/2025 — força: persuasivo (maioria) — V
    "não existe norma que obrigue a percepção pelos sócios de verba mínima representativa de pró-labore, podendo a remuneração
    decorrer apenas de distribuição nos lucros".
  - CARF Acórdão 2201-012.005, proc. 10166.724874/2019-35, rel. Fernando Gomes Favacho, 1ª Turma Ordinária da 2ª Câmara da 2ª
    Seção, sessão 04/02/2025, publ. 06/03/2025 (embargos acolhidos sem efeito infringente pelo Acórdão 2201-012.312, de
    07/10/2025) — força: persuasivo (unânime) — V
    Admite distribuição desproporcional em sociedade de médicos "quando o contrato social for claro [...] e os registros
    contábeis contabilizarem regularmente o lucro".
  - CARF, contra o contribuinte (V):
    - 2202-011.634 e 2202-011.635, rel. Thiago Buschinelli Sorrentino, sessão 05/11/2025: lucro que configure "retribuição do
      trabalho prestado" é pró-labore.
    - 2402-013.049, rel. Gregório Rechmann Junior, sessão 21/07/2025: mesma tese.
    - 2301-011.411, rel. Vanessa Kaeda Bulara de Andrade, sessão 07/08/2024: lucro distribuído "em desconformidade com a
      legislação" compõe a remuneração.
    - 2402-013.594, rel. Luciana Vilardi Vieira de Souza Mifano, sessão 12/05/2026: requalificou quando faltou prova contábil
      da distribuição efetiva.
  - STJ: **não localizei** decisão de mérito. Pista S: REsp 1.812.311/SP (PwC × Fazenda, rel. Min. Herman Benjamin), sobre
    antecipação de lucros sem demonstração de resultado; desfecho não confirmado (SCON bloqueado por anti-robô).
Superação/vigência: a SC 120/2016 não aparece como revogada, e a SC 228/2023 repete a tese. No CARF, o critério que se repete nos
dois lados é a **contabilidade**: há lucro apurado e escriturado, o contrato prevê o critério de distribuição, e a escrituração
separa trabalho de capital. Sem isso, a requalificação é mantida mesmo pela CSRF (9202-009.799).
Conclusão em 2 linhas: a RFB diz que pelo menos parte do que o sócio que trabalha recebe é remuneração e exige discriminar. O CARF
aceita remuneração só por lucros quando a escrituração é regular (2101-002.899, 2201-012.005, 9202-010.159) e requalifica quando
não é (9202-009.799 e outros). Valor mínimo não existe.
Pergunta que sobra para advogado ou contador: as SCs 120/2016 e 228/2023 falam de "sociedade civil de serviços profissionais" e
de "sociedade simples". O salão LTDA **empresária** está no alcance delas, ou só no da IN 2.110 art. 33 §3º II? A Lei 12.592
"reconhece" a profissão, mas não a torna regulamentada no sentido do art. 33. Para o sistema, a pergunta prática é: o alerta de
pró-labore ausente deve ser "aviso" (posição do CARF) ou "bloqueio" (posição da RFB)?

---

## Quadro-resumo

| Q | Posição | Segurança | Decisão mais forte (V) |
|---|---|---|---|
| 2.1 constitucionalidade | (a) apoia | alta | STF ADI 5625 (julg. 28/10/2021, trânsito em 06/04/2022) |
| 2.1 falta de homologação ⇒ vínculo | (c) dividida, tende à presunção relativa | média | TST AIRR-65-36.2024.5.10.0103 (8ª T, 2025) × RR-10465-90.2018.5.03.0014 (3ª T, 2024) |
| 2.2 INSS 11% / IRRF / sem patronal | (c) inexistente | baixa (precedente); a letra é clara | nenhuma; SC Cosit 127/2019 só para o Anexo III |
| 2.3 Simples (PF sem CNPJ fica na receita) | (a) apoia, por analogia | média-baixa | SC Cosit 94/2025 + SC Cosit 46/2025 |
| 2.3 Presumido e PIS/Cofins (exclusão pela lei) | (c) inexistente, analogia favorável | baixa | SC Cosit 161/2025; SC Cosit 80/2014 (exige nota do terceiro) |
| 2.4 pró-labore obrigatório? | (c) dividida; RFB contraria | média | SC Cosit 120/2016 e 228/2023 × CARF 2101-002.899; CSRF 9202-009.799 × 9202-010.159 |

**O que mais muda o produto neste bloco:**
1. **2.4:** a escrituração precisa separar lucro apurado de remuneração e guardar o critério de distribuição previsto no contrato.
   Sem isso, perde-se até na CSRF.
2. **2.1:** o contrato homologado não blinda o salão. O TST olha a subordinação (agenda imposta, preço fixado pelo salão, metas).
   O sistema não deve dar ao contrato o status de garantia.
3. **2.3:** a cota do parceiro PF sem CNPJ **fica** na receita do PGDAS-D (A-7 reforçado por SC 94/2025 e SC 46/2025).

## Casos adversariais que tentei
- **Contra 2.1 (a falta de homologação gera vínculo automático):** procurei no TST acórdão que desse vínculo só pela forma. Achei
  o oposto: a 8ª Turma chama de presunção relativa, e a 3ª Turma reconheceu o vínculo pela realidade, não pela forma. A leitura
  literal do art. 1º-C ficou **mais fraca**.
- **Contra 2.2 e 2.3 ("não há SC sobre salão-parceiro"):** fiz oito buscas na base da RFB e mais de seis no CARF para derrubar a
  ausência. Só apareceu a SC 80/2014, anterior à lei e sobre profissionais com CNPJ. A ausência se manteve, com a limitação de
  que no CARF busquei só na ementa.
- **Contra 2.4 ("o CARF sempre requalifica" e "o CARF nunca requalifica"):** os dois falharam. Há CSRF dos dois lados, e o fator
  que decide é a contabilidade.
- **SC Cosit 120/2016 inventada?** Existe (idAto 76675, vigente) e o teor bate com o que as secundárias diziam. Elas, porém,
  generalizam para "toda sociedade": a ementa restringe à "sociedade civil de prestação de serviços profissionais".

## Limitações
- CARF: só a ementa é pesquisável, então um acórdão que trate de salão-parceiro só no voto não aparece.
- TRT-2: nenhuma decisão conferida na fonte primária (só a pista do ConJur, 2021).
- STJ: não acessado por causa do desafio anti-robô.
- SC Cosit 120/2016: li só a ementa; a API não trouxe os fundamentos.
