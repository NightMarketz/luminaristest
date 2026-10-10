# Pesquisa em fonte primária: bloco PIS/Cofins, ICMS, NF-e e NFC-e (10/10/2026)

**Autorização:** dono, chat, 10/10: "Sim, roda a pesquisa para termos um questionário mais completo e assertivo".
Nenhum arquivo do repo foi editado e nada foi commitado.
**Em duas linhas:** das 27 perguntas, 20 ficaram RESOLVIDAS na fonte, 7 PARCIAIS e nenhuma NÃO ALCANÇADA. Quatro
achados contradizem o que o repo afirma hoje.
**Risco principal:** a SC SRRF04 4.024/2021, que o dossiê de 29/09 cita como base do "monofásico usado como insumo",
**não trata de monofásico**: trata de produto médico-hospitalar com alíquota zero (Decreto 6.426). O princípio que ela
aplica (alíquota zero na compra não gera crédito) vale para o caso por analogia, mas a citação está errada.

Todas as leituras são de 10/10/2026. Os arquivos baixados estão em `scratchpad/lei/` e `scratchpad/lei/pc/`.
Planalto: o texto riscado (redação superada) foi removido na extração. Normas RFB: segmentos `tachado` removidos.

**Grau:** **V** = li o dispositivo na fonte primária, na redação vigente · **I** = inferência minha a partir do texto
lido · **A** = assumido.

## Achados que mudam o repo (verificar antes de usar o texto atual)

1. **SC 4.024/2021 citada errado.** Ver PC-8. Afeta `DOSSIE-DECISOES-2026-09-29.md:143` e `BE-INCR-ITEM-DESTINATION-brief.md:386,436,514`.
2. **O prazo de cancelamento da NFC-e é de 30 minutos, não 24 h.** Ajuste SINIEF 19/16, cl. 15ª, na redação do
   Ajuste SINIEF 7/18 (efeitos desde 01/10/2018). As 24 h são a redação original. O BRIEF NFC-e (`[NFE-CANC-PRAZO]`)
   tirou as 24 h da regra de rejeição 501 do MOC. Ver PC-20.
3. **O CFOP de mercadoria usada em serviço sujeito ao ISS é o 1.128/2.128, não o 1.556.** Ver PC-15.
4. **A NT 2025.002 já está na v1.52** (publicada em 01/10/2026). O corpus tem a v1.51. Ver PC-21.
5. **IN SRF 459/2004, art. 1º § 3º**, ainda diz que a retenção é dispensada até R$ 5.000. A Lei 10.833, art. 31 § 3º
   (red. Lei 13.137/2015), dispensa só a retenção de valor ≤ R$ 10. Vale a lei. Ver PC-2.
6. **DIFAL do Simples em SP:** o STF (Tema 1284, pista secundária) exige lei estadual em sentido estrito. A Lei
   paulista 6.374 cobre uso, consumo e ativo. A revenda só aparece no RICMS (decreto). Ver PC-24.

---

## PIS/Cofins

### PC-1 · Lei 13.097/2015, art. 30: crédito do não varejista de bebidas
- **Status:** RESOLVIDA
- **Resposta:** quem está no não cumulativo pode creditar na compra dos produtos do art. 14. O crédito é o **valor
  informado na nota pelo vendedor** (art. 36), e não 1,65%/7,6%. Se o vendedor é do Simples, o crédito é 0,38% + 1,60%
  sobre o valor de aquisição. O varejista que revende com a alíquota zero do art. 28 fica vedado (art. 29).
- **Citação:** art. 30 § 1º: *"os créditos de que trata o caput correspondem aos valores informados na nota fiscal
  pelo vendedor"*.
- **Fonte:** <http://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13097.htm> (10/10/2026; mesmo sha
  `c6679a9a9fa3` do corpus de 25/09). **Grau:** V. Confere com `TRANSCRICAO-monofasico-…-2026-09-25.md`.

### PC-2 · IN SRF 459/2004: retenções de CSRF (vigência e alíquotas)
- **Status:** RESOLVIDA
- **Resposta:** a IN está **vigente** no Normas RFB (idAto 15365, `vigente=true`), alterada pelas IN RFB 765/2007,
  791/2007 e 1.151/2011. A alíquota total é **4,65%** (CSLL 1% + Cofins 3% + PIS 0,65%), sobre o valor bruto, código
  **5952**. Quem paga e é optante do Simples **não retém** (art. 1º § 6º; Lei 10.833 art. 30 § 2º). Quem recebe e é
  optante do Simples não sofre retenção (art. 3º II; Lei art. 32 III). **Conflito:** o art. 1º § 3º da IN ainda
  dispensa a retenção em pagamento ≤ R$ 5.000. A Lei 10.833, art. 31 § 3º, na redação da Lei 13.137/2015, dispensa só
  a retenção de valor ≤ R$ 10. A lei prevalece.
- **Citação:** Lei 10.833, art. 31 § 3º: *"Fica dispensada a retenção de valor igual ou inferior a R$ 10,00 (dez
  reais)"*.
- **Fonte:** <https://normasinternet2.receita.fazenda.gov.br/api/consulta-externa/ato/15365/visao/multivigente>;
  <http://www.planalto.gov.br/ccivil_03/leis/2003/l10.833.htm> (10/10/2026). **Grau:** V (texto). I (prevalência da
  lei sobre a IN não atualizada).
- **Extra para L-PES-4:** o Simples como tomador não retém CSRF (IN 459 art. 1º § 6º). Isso responde metade da L-PES-4.

### PC-3 · Leis 10.637 e 10.833, art. 3º II: redação vigente de "insumo"
- **Status:** RESOLVIDA
- **Resposta:** a redação vigente nas duas leis é a da Lei 10.865/2004. O crédito vale para *"bens e serviços,
  utilizados como insumo na prestação de serviços e na produção ou fabricação de bens…, inclusive combustíveis e
  lubrificantes"*. A IN 2.121, art. 176, define insumo como o bem ou serviço *"essencial ou relevante"*.
- **Citação:** IN 2.121, art. 176: *"consideram-se insumos, os bens ou serviços considerados essenciais ou relevantes"*.
- **Fonte:** planalto l10637.htm / l10.833.htm; IN RFB 2.121/2022, idAto 127905 (10/10/2026). **Grau:** V.

### PC-4 · Lei 10.833, art. 3º § 1º: "mês da aquisição" é a emissão ou a entrada? (X8 P-2/P-3)
- **Status:** PARCIAL
- **Resposta:** a lei diz *"adquiridos no mês"* (§ 1º I) e não define o momento. A IN 2.121 repete a expressão (arts.
  173 e 175) e também não define. O Guia da EFD-Contribuições (v1.35) aceita, no C100, que a data de emissão (campo 10)
  **ou** a de entrada (campo 11) caia no período. A RFB conta o prazo do crédito a partir do mês da aquisição (pista
  secundária: SC Cosit 355/2017 e 114/2024), mas nenhum texto lido diz qual das duas datas vale. Inferência minha: no
  direito civil, a propriedade de bem móvel só passa com a tradição, o que aponta para a entrada.
- **Citação:** Lei 10.833, art. 3º § 1º I: *"dos itens mencionados nos incisos I e II do caput, adquiridos no mês"*.
- **Fonte:** planalto l10.833.htm; Guia EFD-Contribuições v1.35, C100 campos 10/11
  (<http://sped.rfb.gov.br/arquivo/download/5836>) (10/10/2026). **Grau:** V (texto). I (tradição).
- **Pergunta reformulada (contador):** "A Lei 10.833, art. 3º § 1º I, não define o momento, e o Guia da
  EFD-Contribuições aceita no C100 a data de emissão ou a de entrada. Entendemos que o crédito entra no mês da
  **entrada** da mercadoria (`dEntrada` no sistema), e não no mês do `dhEmi`, quando os dois meses diferem. Confirma?
  Se não, qual norma ou solução de consulta adota a data de emissão?"

### PC-5 · Lei 10.833, art. 3º VI: crédito sobre depreciação (FA §5-e)
- **Status:** RESOLVIDA
- **Resposta:** dá crédito sobre os **encargos de depreciação incorridos no mês** (§ 1º III) de máquinas, equipamentos
  e outros bens do imobilizado usados na produção ou na **prestação de serviços** (inciso VI). A taxa é a da IN
  1.700 (IN 2.121 art. 183). Há duas opções: **1/48 por mês** para máquinas e equipamentos (art. 184; Lei art. 3º
  § 14), irretratável; ou **crédito imediato** para máquinas e equipamentos **novos** (art. 185; Lei 11.774 art. 1º).
  É vedado sobre bem usado e sobre depreciação acelerada incentivada (arts. 180 I e 183 p.ú.).
- **Citação:** IN 2.121, art. 179: *"os valores dos encargos de depreciação ou amortização incorridos no mês"*.
- **Fonte:** planalto l10.833.htm; IN 2.121 arts. 179–185 (10/10/2026). **Grau:** V.
- **Nota:** o CIAP 1/48 é do ICMS (LC 87 art. 20 § 5º) e é outra regra. O 1/48 do PIS/Cofins é opcional.

### PC-6 · IN RFB 2.121, art. 160: monofásico usado como insumo dá crédito básico? (follow-up 4, ITEM-DEST P-1/P-6)
- **Status:** PARCIAL (a regra da RFB está resolvida; a aplicação ao salão é do contador)
- **Resposta:** o art. 160 II "b" veda o crédito do monofásico **só na aquisição para revenda**. Para insumo valem dois
  limites. (1) **Comprado de fabricante ou importador**, que paga a alíquota concentrada: a RFB admite crédito à
  alíquota básica de 1,65%/7,6%. A própria IN diz que os produtos de tributação concentrada *"somente permitem a
  apuração de créditos caso sejam utilizados como insumos, mediante a aplicação dos percentuais referidos no art.
  169"* (art. 534 § 1º II, dentro do capítulo da ZFM). (2) **Comprado de revendedor**, a alíquota zero (Lei 10.147,
  art. 2º): sem crédito, porque a aquisição *"não sujeita ao pagamento"* é vedada (art. 160 I; Lei 10.833, art. 3º
  § 2º II). A SC 4.024/2021 aplica essa mesma leitura à alíquota zero (PC-8).
- **Citação:** IN 2.121, art. 160 II: *"das aquisições para revenda: … b) de bens sujeitos à tributação concentrada"*.
- **Fonte:** IN 2.121 arts. 160, 169, 534 § 1º II; Lei 10.147 art. 2º (planalto l10147.htm) (10/10/2026). **Grau:** V
  (texto). I (estender o art. 534 § 1º II, escrito para a ZFM, à regra geral; CST 01 de fornecedor fabricante = pagou).
- **Pergunta reformulada (contador):** "Pela IN 2.121, art. 160 I e II 'b' e art. 534 § 1º II, entendemos que o produto
  monofásico (Lei 10.147) usado como **insumo** do serviço dá crédito básico de 1,65%/7,6% quando comprado do
  **fabricante ou importador** (CST 01 ou 02 na nota), e não dá crédito quando comprado de **revendedor** a alíquota
  zero (CST 04 ou 06). Confirma? Se não, qual norma diz diferente?"

### PC-7 · IN 2.121, art. 126 IX "a": a clínica de estética é "clínica médica"? (P-5 do X8)
- **Status:** PARCIAL
- **Resposta:** a lei e a IN só listam *"hospital, pronto-socorro, clínica médica, odontológica, de fisioterapia e de
  fonoaudiologia"* (Lei 10.833, art. 10 XIII "a"). Não há "estética". Pista secundária: na SC Cosit 126/2020 a RFB
  separou por **tipo de receita**. Só o serviço que é tecnicamente fisioterapia foi para o cumulativo, e a estética
  não. Inferência: o procedimento estético não médico (depilação, estética facial) fica no não cumulativo para o Lucro
  Real. O ato médico feito por médico pode entrar como "clínica médica".
- **Citação:** IN 2.121, art. 126 IX "a": *"prestados por hospital, pronto-socorro, clínica médica, odontológica, de
  fisioterapia e de fonoaudiologia"*.
- **Fonte:** IN 2.121 art. 126; planalto l10.833.htm art. 10 XIII (10/10/2026). **Grau:** V (texto). I
  (enquadramento). A SC 126/2020 não foi lida na fonte.
- **Pergunta reformulada (contador):** "Pela Lei 10.833, art. 10 XIII 'a', e pela IN 2.121, art. 126 IX 'a', só a
  receita de serviço **médico** da clínica (ato feito por médico) vai para o cumulativo. Os procedimentos estéticos
  não médicos ficam no não cumulativo para o Lucro Real, segregados por tipo de receita, na linha da SC Cosit 126/2020.
  Confirma? Se não, qual norma inclui a clínica de estética?"

### PC-8 · SC Cosit 4.024/2021: existe? O que diz?
- **Status:** RESOLVIDA (com correção)
- **Resposta:** existe, mas é da **Disit/SRRF04**, e não da Cosit: SC Disit/SRRF04 nº 4.024, de 26/08/2021, DOU de
  27/08/2021, idAto 120147. **Não trata de monofásico.** Trata de **produtos médico-hospitalares** com alíquota zero
  (Decreto 6.426/2008, Anexo III) e conclui que não há crédito na aquisição, porque ela não paga a contribuição,
  *"inclusive por meio da redução a zero da alíquota"*. O art. 17 da Lei 11.033 não salva o crédito. Ela está
  vinculada à SD 4/2017 e às SC Cosit 222/2017 e 23/2020. Serve ao PC-6 só por analogia (alíquota zero = sem crédito).
- **Citação:** ementa: *"vedado esse direito quando a aquisição do bem ou serviço não se sujeita ao pagamento da
  contribuição, inclusive por meio da redução a zero da alíquota desta"*.
- **Fonte:** <https://normasinternet2.receita.fazenda.gov.br/api/consulta-externa/ato/120147/visao/original>
  (10/10/2026). **Grau:** V.

### PC-9 · STJ REsp 1.221.170 (essencialidade/relevância), só contexto (ITEM-DEST P-3)
- **Status:** RESOLVIDA (contexto)
- **Resposta:** o critério do STJ está positivado na IN 2.121, art. 176 ("essenciais ou relevantes"), que é a regra que
  a RFB aplica. O acórdão não foi lido, porque é só contexto. Se tintura, química e descartável são insumo do salão
  depende do fato e vai ao contador junto com o PC-6.
- **Fonte:** IN 2.121 art. 176 (10/10/2026). **Grau:** V (IN). A ligação com o REsp é I.

### PC-10 · RIR/2018, art. 301 § 3º, e CPC 16, item 11: tributo recuperável fora do custo
- **Status:** RESOLVIDA
- **Resposta:** os dois dizem a mesma coisa. Imposto recuperável por crédito na escrita fiscal não entra no custo de
  aquisição. O tributo não recuperável entra (no Simples, o ICMS e o PIS/Cofins da compra vão ao custo).
- **Citações:** RIR art. 301 § 3º: *"Os impostos recuperáveis por meio de créditos na escrita fiscal não integram o
  custo de aquisição."* CPC 16 (R1), item 11: *"outros tributos (exceto os recuperáveis junto ao fisco)"*.
- **Fonte:** planalto d9580.htm (mesmo sha `08623894666c` do corpus); Res. CVM 99/2022, Anexo A (CPC 16 R1), vigente
  desde 01/07/2022, <https://conteudo.cvm.gov.br/export/sites/cvm/legislacao/resolucoes/anexos/001/resol099.pdf>
  (10/10/2026). **Grau:** V.

### PC-11 · LC 123, art. 23: o Simples não transfere nem apropria crédito
- **Status:** RESOLVIDA
- **Resposta:** confirmado na redação vigente. A exceção é o crédito de **ICMS** do comprador não optante sobre
  mercadoria comprada do Simples para comercialização ou industrialização (§§ 1º–3º), limitado à alíquota informada
  na nota. O § 7º (LC 216/2025) abre exceção em 2025–2026 só para o Reintegra de exportação.
- **Citação:** *"não farão jus à apropriação nem transferirão créditos relativos a impostos ou contribuições
  abrangidos pelo Simples Nacional"*.
- **Fonte:** planalto lcp123.htm (sha do corpus `07ee7d3adc22`, 07/10) (10/10/2026). **Grau:** V. A PC-1 mostra uma
  exceção legal no PIS/Cofins das bebidas (Lei 13.097, art. 30 § 2º: 0,38% + 1,60%).

### PC-12 · Tabela de CST PIS/Cofins (4.3.3): quais são tributados e quais não geram crédito (D-6 / NFE-COST f9)
- **Status:** RESOLVIDA (a tabela) · a ligação CST → crédito é inferência
- **Resposta:** a tabela oficial é o Anexo Único da IN RFB 1.009/2010 (Tabelas II e III), que o Guia v1.35 reproduz.
  Saídas: **01** alíquota básica, **02** alíquota diferenciada, **03** por unidade de medida, **05** substituição
  tributária, todas "Operação Tributável". **04** monofásica com revenda a alíquota zero, **06** alíquota zero,
  **07** isenta, **08** sem incidência, **09** suspensão, **49** outras saídas, **99** outras. Entradas: 50–56 com
  direito a crédito, 60–67 crédito presumido, **70** aquisição sem direito a crédito, 71–75, 98, 99. Na nota do
  fornecedor, os códigos **04, 06, 07, 08 e 09** indicam aquisição *"não sujeita ao pagamento"*, logo sem crédito
  (Lei 10.833, art. 3º § 2º II; IN 2.121, art. 160 I). A exceção é o isento revendido ou usado em operação tributada
  (art. 160 § 1º). O **05** (ST) comprado para revenda é vedado pelo art. 160 II "a".
- **Citação:** Guia v1.35: *"conforme a Tabela II constante no Anexo Único da Instrução Normativa RFB nº 1.009, de
  2010"*.
- **Fonte:** Guia Prático EFD-Contribuições v1.35, registros C181/C185 e D101/D105 (10/10/2026). **Grau:** V (tabela).
  I (CST da nota do fornecedor → crédito do comprador: a tabela não fala de crédito).

### PC-13 · CST 02 com NCM fora das listas monofásicas
- **Status:** PARCIAL
- **Resposta:** o CST 02 ("alíquota diferenciada") **não é exclusivo** do monofásico. A IN 1.009 não amarra CST a NCM.
  O código cobre qualquer alíquota diferente da básica (ex.: venda de produtor ou importador com alíquota
  concentrada; regimes como ZFM e papel imune). Por isso CST 02 com NCM fora das Leis 10.147/10.485/9.718/13.097 não
  prova monofásico. Pode ser outro regime de alíquota diferenciada, ou erro do emitente.
- **Fonte:** Guia v1.35 (tabela); IN 2.121 arts. 60 e 533 § 3º (10/10/2026). **Grau:** V (tabela). I (classificação).
- **Pergunta reformulada (contador):** "Pela Tabela II da IN 1.009, o CST 02 cobre qualquer alíquota diferenciada, e
  não só o monofásico. Entendemos que nota com CST 02 e NCM fora das listas monofásicas deve ser tratada pela regra
  geral de crédito do comprador (1,65%/7,6% se for insumo ou revenda tributada), com um aviso para conferência
  manual. Confirma? Se não, qual tratamento padrão?"

### PC-14 · CFOP de imobilizado (1.551 / 2.551 / 3.551) (D-7)
- **Status:** RESOLVIDA
- **Resposta:** os três são "Compra de bem para o ativo imobilizado" (interna, interestadual e do exterior). Com
  mercadoria sujeita a ST: **1.406 / 2.406**. **Atenção à fonte:** o Anexo II do Convênio s/nº de 1970 foi
  reescrito pelo **Ajuste SINIEF 03/22, com efeitos desde 01/06/2022**. A cláusula segunda (Anexo II-A) foi revogada
  pelo Ajuste SINIEF 29/23. A descrição desses códigos não mudou.
- **Citação:** *"3.551 - Compra de bem para o ativo imobilizado. Classificam-se neste código as compras de bens
  destinados ao ativo imobilizado do estabelecimento."*
- **Fonte:** <https://www.confaz.fazenda.gov.br/legislacao/ajustes/2022/AJ003_22>, cl. primeira;
  <https://www.confaz.fazenda.gov.br/legislacao/ajustes/sinief/cfop_cvsn_70_vigente> (10/10/2026). **Grau:** V.

### PC-15 · CFOP de entrada por destinação (1.102 × 1.556 × 1.407 …) (A-8)
- **Status:** RESOLVIDA
- **Resposta:** pela tabela vigente:
  - **1.102 / 2.102 / 3.102**: compra para comercialização. **1.403 / 2.403**: a mesma compra, com ST.
  - **1.556 / 2.556 / 3.556**: material para uso ou consumo. **1.407 / 2.407**: o mesmo, com ST.
  - **1.128 / 2.128**: *"Compra para utilização na prestação de serviço sujeita ao ISSQN"*. **Este é o código da
    destinação `INSUMO_SERVICO` do salão**, e não o 1.556.
  - **1.126**: para serviço sujeito ao ICMS. **1.653**: combustível de usuário final.
- **Citação:** *"1.128 - … Classificam-se neste código as entradas de mercadorias a serem utilizadas nas prestações
  de serviços sujeitas ao ISSQN."*
- **Fonte:** Ajuste SINIEF 03/22, cl. primeira (10/10/2026). **Grau:** V. Quem atribui o CFOP de entrada é o
  destinatário, na escrituração. Isso é **I**, por ser prática da EFD; não li dispositivo que o diga.

---

## ICMS (crédito) e IBS/CBS

### PC-16 · LC 87/96, art. 20 § 1º e art. 33 I: crédito de uso e consumo e de insumo de serviço sujeito ao ISS (ITEM-DEST P-2)
- **Status:** RESOLVIDA
- **Resposta:** o material de uso e consumo **só dá crédito a partir de 01/01/2033** (art. 33 I, red. LC 171/2019),
  quando o ICMS já estará extinto (EC 132). Na prática, não há crédito. A mercadoria usada em serviço sujeito ao ISS
  também não dá crédito: o art. 20 § 3º II veda o crédito quando *"a prestação subsequente não for tributada"* pelo
  ICMS, e o § 1º veda entrada *"alheia à atividade do estabelecimento"*. O default conservador do item 5 (sem crédito)
  está correto.
- **Citação:** art. 33 I: *"somente darão direito de crédito as mercadorias destinadas ao uso ou consumo do
  estabelecimento nele entradas a partir de 1º de janeiro de 2033"*.
- **Fonte:** planalto lcp87.htm (10/10/2026). **Grau:** V (texto). I (enquadrar o serviço do ISS no § 3º II). Para o
  Simples a questão nem aparece (PC-11).

### PC-17 · LC 214, art. 57: bens de uso e consumo pessoal sem crédito de IBS/CBS ("estéticos") (ITEM-DEST P-5)
- **Status:** PARCIAL
- **Resposta:** o dispositivo exato é o **art. 57, inciso I, alínea "f"**: *"bens e serviços recreativos, esportivos e
  estéticos"*. O crédito é vedado pelo § 5º. A exceção é o **§ 3º, inciso III**: deixa de ser uso pessoal o bem da
  alínea "f" que é comercializado (remete ao inciso I do § 3º) ou que é *"utilizado exclusivamente em estabelecimento
  físico pelos seus clientes"*. A LC 227/2026 acrescentou a alínea "g" (aquisição e manutenção desses bens) e o § 9º,
  revogou os §§ 4º, 6º e 7º e não mexeu na "f" nem no § 3º III.
- **Citação:** § 3º III: *"os bens previstos na alínea 'f' do inciso I do caput deste artigo que cumpram o disposto
  no inciso I deste parágrafo ou sejam utilizados exclusivamente em estabelecimento físico pelos seus clientes"*.
- **Fonte:** planalto lcp214.htm (10/10/2026). **Grau:** V (texto). I: o produto aplicado pelo profissional no
  cliente, dentro do salão, cabe em "utilizados … pelos seus clientes"? O texto pede uso **pelo** cliente.
- **Pergunta reformulada (contador, depois o PRE-ADR IBS/CBS):** "Pela LC 214, art. 57 I 'f' e § 3º III, entendemos
  que o insumo estético aplicado no cliente dentro do salão não é uso pessoal, por ser utilizado exclusivamente no
  estabelecimento físico em favor do cliente, e dá crédito de IBS/CBS no regime regular a partir de 2027. O produto
  revendido também dá. Confirma? Se não, o regulamento (§ 3º V) restringe a leitura?"

### PC-18 · Portaria CAT 28/2020 (SP): estoque que saiu da ST
- **Status:** RESOLVIDA
- **Resposta:** na exclusão da ST, o contribuinte pode **optar por não aproveitar** o crédito do estoque e fica
  dispensado do procedimento (art. 1º p.ú. 1). Se aproveitar, faz relatório por mercadoria (Anexos I e II) e
  inventário (Bloco H, Anexo III). Fórmulas nos Anexos IV e V. O crédito vem de `vBCSTRet`/`vBCFCPSTRet` da NF-e de
  entrada (CST 60 / CSOSN 500). Sem a base retida no item, o crédito é zero (art. 4º I). **Simples:** deduz o valor do
  ICMS do DAS **no mês seguinte ao da exclusão**, no campo "redução da base de cálculo" do PGDAS-D, e o excedente passa
  aos meses seguintes (art. 3º § 3º). **RPA:** 12 parcelas, na redação da SRE 07/26 com efeitos desde 01/01/2026.
  Antes era 24 (SRE 65/25).
- **Citação:** art. 3º § 3º 1: *"o valor do imposto a ser compensado deverá ser deduzido do ICMS devido na forma do
  Simples Nacional, no mês posterior ao da exclusão"*.
- **Fonte:** <https://legislacao.fazenda.sp.gov.br/Paginas/Portaria-CAT-28-de-2020.aspx> (com SRE 65/25 e 07/26)
  (10/10/2026). **Grau:** V.

### PC-19 · Portaria SRE 94/2025 (SP): perfumaria e higiene fora da ST em 01/04/2026
- **Status:** RESOLVIDA (reconfirma o §7 do levantamento)
- **Resposta:** o art. 1º revoga o **Anexo XI da Portaria CAT 68/19**. A página da CAT 68 mostra o título do Anexo XI:
  "PRODUTOS DE PERFUMARIA E DE HIGIENE PESSOAL (artigo 313-E do RICMS)", revogado a partir de 01/04/2026. O art. 3º
  manda o estoque para a CAT 28/20 (PC-18). Vigência em 01/04/2026 (art. 4º).
- **Citação:** art. 1º: *"Fica revogado o Anexo XI da Portaria CAT 68/19"*.
- **Fonte:** <https://legislacao.fazenda.sp.gov.br/Paginas/Portaria-SRE-94-de-2025.aspx>;
  <https://legislacao.fazenda.sp.gov.br/Paginas/Portaria-CAT-68-de-2019.aspx> (10/10/2026). **Grau:** V.

---

## NF-e / NFC-e

### PC-20 · Ajuste SINIEF 19/2016 (NFC-e)
- **Status:** RESOLVIDA
- **Resposta:**
  - **Cl. 1ª:** a NFC-e (modelo 65) substitui, a critério da UF, a NF modelo 2, o cupom de ECF, o **CF-e-SAT** e a NF
    modelo 4 (inciso IV, Aj. 54/22). A autorização vem **antes** do fato gerador.
  - **Eventos (cl. 13ª):** EPEC, Cancelamento, **ECONF** (conciliação financeira) e o cancelamento do ECONF (Aj. 10/23,
    desde 01/06/2023). Não há CC-e.
  - **Cancelamento (cl. 15ª):** em até **30 minutos** desde a autorização, sem saída da mercadoria. A UF pode reduzir
    o prazo e aceitar pedido extemporâneo em caso excepcional (§ 6º). A redação vem do Aj. 7/18, com efeitos desde
    01/10/2018. As 24 h eram a redação original.
  - **Cancelamento por substituição (cl. 15ª-A):** 168 h.
  - **Inutilização (cl. 16ª):** até o dia 10 do mês seguinte.
- **Citação:** cl. 15ª: *"em prazo não superior a 30 minutos, podendo ser reduzido a critério de cada unidade
  federada"*.
- **Fonte:** <https://www.confaz.fazenda.gov.br/legislacao/ajustes/2016/AJ_019_16> (10/10/2026). **Grau:** V.
  **Diverge do BRIEF NFC-e** (`[NFE-CANC-PRAZO]` 24 h).

### PC-21 · NT de IBS/CBS na NF-e/NFC-e para o Simples: o Simples destaca em 2026?
- **Status:** RESOLVIDA
- **Resposta:** **não.** A NT 2025.002 **v1.52** (01/10/2026) diz que as orientações para CRT 1, 2 e 4 e para a
  tributação monofásica *"serão publicadas em NT futura"*, porque o Simples só é tributado pelo IBS/CBS a partir de
  2027 (LC 214, art. 348). A regra que exige o grupo IBSCBS entra em produção para CRT 1/2/4 só **a partir de
  04/01/2027** (Observação 3). O art. 348 III "c" confirma que as alíquotas de teste de 2026 *"não serão aplicadas em
  relação às operações dos contribuintes optantes pelo Simples Nacional"*. A NT específica do Simples **ainda não saiu**:
  na lista do portal de 01/10/2026, as NTs 2026.008 (valor líquido) e 2026.010 (DANFE) são outras.
- **Citação:** NT p. 7: *"a tributação do IBS/CBS/IS para estes contribuintes ocorre somente a partir de 2027,
  conforme disposto no Art. 348 da LC 214/25"*.
- **Fonte:** portal NF-e (cookie de sessão), `exibirArquivo.aspx?conteudo=HXPO8VLbh4o=`, 94 pp., sha256 `54ed89332704…`;
  planalto lcp214.htm art. 348 (10/10/2026). **Grau:** V.

### PC-22 · RICMS-SP: venda a consumidor sem documento é permitida? NFC-e obrigatória? SAT vedado desde quando? (F-NFCE-7 b)
- **Status:** RESOLVIDA
- **Resposta:** **não é permitida.** O RICMS, art. 125 I, manda emitir nota **antes de iniciada a saída**, e o II
  manda emitir *"no momento do fornecimento … de mercadoria"*. Para a venda a consumidor, o SAT está **vedado desde
  01/01/2026** (Portaria CAT 147/12, art. 34-D, acrescentado pela SRE 79/2024). A SRE 92/2024 revogou só o 34-C, que
  vedava a ativação de equipamento novo. Sobra a NFC-e (art. 212-O III; Portaria CAT 12/2015, com credenciamento
  prévio, art. 2º) ou a NF-e 55. A identificação do consumidor é opcional na NFC-e (grupo `dest`, já no BRIEF), então
  a venda "anônima" se faz **com** NFC-e sem destinatário, e não sem documento.
- **Citação:** art. 34-D: *"A emissão do Cupom Fiscal Eletrônico - CF-e-SAT … fica vedada a partir de 1º de janeiro
  de 2026."*
- **Fonte:** <https://legislacao.fazenda.sp.gov.br/Paginas/art125.aspx>; `…/Paginas/art212o.aspx`;
  `…/Portaria-SRE-79-de-2024.aspx`; `…/Portaria-SRE-92-de-2024.aspx`; `…/pcat122015.aspx` (10/10/2026). **Grau:** V.
  Não busquei prorrogação do 34-D depois de 2024: **A** que não houve.

---

## ICMS paulista (L-ICMS)

### PC-23 · L-ICMS-9: FCP em SP (Lei 16.006/2015 e alíquotas)
- **Status:** RESOLVIDA
- **Resposta:** existe o **FECOEP**, com adicional de **2 pontos percentuais** no ICMS **só** sobre (a) bebidas
  alcoólicas da posição **22.03** (cervejas e chope) e (b) **fumo** e sucedâneos do capítulo **24**. Incide só em
  operação destinada a **consumo final**, com ou sem ST (art. 2º § 3º), e não admite benefício fiscal (art. 1º § 5º 2).
  Perfumaria, cosmético e higiene **não** pagam FCP em SP. A tabela `ICMS_FCP` de SP tem duas linhas.
- **Citação:** art. 2º I: *"adicional de 2% (dois por cento) na alíquota do ICMS … incidente sobre as seguintes
  mercadorias: a) bebidas alcoólicas classificadas na posição 22.03; b) fumo e seus sucedâneos manufaturados"*.
- **Fonte:** <https://www.al.sp.gov.br/repositorio/legislacao/lei/2015/lei-16006-24.11.2015.html> (10/10/2026).
  **Grau:** V (texto original da ALESP; a ficha não mostra alteração). A regulamentação do recolhimento no RICMS não
  foi lida.

### PC-24 · L-ICMS-3 / L-ICMS-5: SP cobra DIFAL do Simples? Base legal; antecipação × diferencial depois da saída da ST
- **Status:** PARCIAL (a regra paulista está resolvida; a validade para revenda vai ao advogado)
- **Resposta:**
  - **Regra:** sim. O RICMS-SP, art. 115 XV-A "a" (red. Decreto 52.858/2008), cobra do Simples, na entrada de
    mercadoria de outra UF, *"destinada a industrialização ou comercialização, material de uso e consumo ou bem do
    ativo permanente"*, a diferença entre a alíquota interna e a interestadual, quando a interestadual é menor.
  - **Prazo e alíquota:** vence no **último dia do 2º mês subsequente** à entrada (red. Decreto 59.967/2013). A
    alíquota interestadual é 4% para importados (Res. SF 13/2012) e 12% para as demais (§ 8º). A LC 123, art. 13 § 1º
    XIII, autoriza nas alíneas "g" 2 (antecipação sem encerramento, só a diferença, *"vedada a agregação de qualquer
    valor"*) e "h" (sem antecipação).
  - **Depois da SRE 94/2025:** a perfumaria comprada de outra UF para revenda cai nessa **mesma regra de diferencial**,
    e não na ST com MVA.
  - **Base em lei estrita:** a Lei 6.374/89, art. 2º VI (red. Lei 17.470/2021), prevê o fato gerador **só** para uso,
    consumo e ativo. Para revenda, a base legal é delegação: art. 2º § 3º-A (antecipação *"conforme disposto no
    regulamento"*) e art. 60 II.
  - **STF (pista secundária):** o Tema 517 validou o DIFAL do Simples. O Tema 1284 exige **lei estadual em sentido
    estrito**.
- **Citação:** RICMS art. 115 XV-A "a": *"o valor resultante da multiplicação do percentual correspondente à diferença
  entre a alíquota interna e a interestadual pela base de cálculo"*.
- **Fonte:** <https://legislacao.fazenda.sp.gov.br/Paginas/art115.aspx> (página atualizada em 04/06/2025);
  ALESP, compilação da Lei 6.374/89; planalto lcp123.htm (10/10/2026). **Grau:** V (textos). Teses do STF: pista
  secundária, sem acórdão lido.
- **Pergunta reformulada (advogado tributarista, depois contador):** "O RICMS-SP, art. 115 XV-A 'a', cobra do Simples
  o diferencial na compra interestadual para revenda, para uso e consumo e para ativo. A Lei 6.374/89 só prevê o fato
  gerador para uso, consumo e ativo (art. 2º VI). Para revenda há só a delegação do art. 2º § 3º-A e do art. 60 II.
  Diante do Tema 1284 do STF (lei estadual em sentido estrito), entendemos que a cobrança sobre **uso, consumo e
  ativo** é devida, e que a cobrança sobre **revenda** é discutível. Por isso o sistema vai calcular e provisionar
  as duas, sinalizando a de revenda. Confirma? Se não, qual lei paulista dá base à de revenda?"

### PC-25 · L-ICMS-1: Protocolo ICMS 3/2011 e as UFs que obrigaram o Simples à EFD (SP está?)
- **Status:** RESOLVIDA (com uma conferência de cadastro)
- **Resposta:** a cl. 2ª II dispensa ME/EPP do Simples, salvo a impedida pelo sublimite (LC 123 art. 20 § 1º). O
  parágrafo único (Prot. 49/15) excetua a UF que tenha obrigado o Simples até o 1º trimestre de 2014. O histórico do
  próprio protocolo mostra quais UFs se reservaram a obrigação do Simples: na red. Prot. 36/13, **AC, AL, AM, MT, MS, RO
  e TO**. **SP não está.** Em SP, a Portaria CAT 147/09, art. 1º § 1º (lida no PRE-ADR), dispensa quem não está
  "relacionado". Resta só conferir que a IE do cliente não consta da relação.
- **Citação:** red. Prot. 36/13: *"não se aplica aos contribuintes dos Estados do Acre, Alagoas, Amazonas, Mato
  Grosso, Mato Grosso do Sul, Rondônia e Tocantins"*.
- **Fonte:** <https://www.confaz.fazenda.gov.br/legislacao/protocolos/2011/pt003_11> (10/10/2026). **Grau:** V
  (texto). I (que a lista de 2013 é a das UFs do parágrafo único de 2015). O RC 22801/2020 não foi lido.
- **Conferência (dado do cliente, não pergunta):** consultar no Posto Fiscal Eletrônico se a IE consta como obrigada à
  EFD.

### PC-26 · Formato da IE de SP (12 dígitos, DV)
- **Status:** RESOLVIDA
- **Resposta:** para indústria e comércio são **12 dígitos**, com o **9º e o 12º como DV** (módulo 11). DV1: pesos
  1, 3, 4, 5, 6, 7, 8, 10 sobre os 8 primeiros. DV2: pesos 3, 2, 10, 9, 8, 7, 6, 5, 4, 3, 2 sobre os 11 primeiros.
  Nos dois, o DV é o algarismo mais à direita do resto da divisão por 11 (resto 10 → 0). Exemplo oficial:
  110.042.490.114. Para produtor rural: `P0MMMSSSSD000`, 13 caracteres, DV na 10ª posição.
- **Citação:** *"Formato: 12 dígitos sendo que o 9º e o 12º são dígitos verificadores"*.
- **Fonte:** <http://www.sintegra.gov.br/Cad_Estados/cad_SP.html>, roteiro do Governo de SP no SINTEGRA (10/10/2026).
  **Grau:** V. A conta do DV2 na página tem erro de digitação ("(118)") e o resultado certo é 125, resto 4.

### PC-27 · L-ICMS-10: importação direta equipara a industrial para o IPI (RIPI, art. 9º I)
- **Status:** PARCIAL
- **Resposta:** sim. O RIPI, art. 9º I, equipara a industrial *"os estabelecimentos importadores de produtos de
  procedência estrangeira, que derem saída a esses produtos"*. O art. 24 I torna o importador contribuinte no
  desembaraço. Com isso, a revenda do cosmético importado diretamente é fato gerador de IPI. Falta saber se a
  obrigação acessória continua quando a alíquota é zero desde 2027 (EC 132, ADCT 126 III "a", já no PRE-ADR).
- **Citação:** RIPI art. 9º I (acima).
- **Fonte:** <http://www.planalto.gov.br/ccivil_03/_ato2007-2010/2010/decreto/d7212.htm> (10/10/2026). **Grau:** V
  (equiparação). Obrigação acessória com alíquota zero: não lido.
- **Pergunta reformulada (contador):** "Pelo RIPI, art. 9º I, o tenant que importa diretamente e revende fica
  equiparado a industrial. Entendemos que, com a alíquota zero de 2027 (EC 132, ADCT 126 III 'a'), ele continua
  contribuinte do IPI e com as obrigações acessórias (destaque na NF-e, EFD ICMS/IPI se não for do Simples), mas sem
  imposto a pagar. Confirma? Se não, qual norma dispensa?"

---

## Contagem
| Status | Qtde | IDs |
|---|---|---|
| RESOLVIDA | 20 | PC-1, 2, 3, 5, 8, 9, 10, 11, 12, 14, 15, 16, 18, 19, 20, 21, 22, 23, 25, 26 |
| PARCIAL | 7 | PC-4, 6, 7, 13, 17, 24, 27 |
| NÃO ALCANÇADA | 0 | — |

## Caso adversarial e checagens que teriam falhado
- **SC 4.024:** eu esperava achar a SC do monofásico. Rastreei o idAto 120147 por varredura de faixa no Normas e li a
  ementa. Ela trata de outra coisa (PC-8). A checagem refutou a premissa do repo.
- **Prazo da NFC-e:** procurei confirmar as 24 h do BRIEF e o texto vigente diz 30 minutos (PC-20).
- **DIFAL:** procurei na Lei 6.374 a base da cobrança sobre revenda e não achei fato gerador explícito, só delegação
  (PC-24).
- **CFOP:** a página "cfop_cvsn_70_vigente" está marcada como revogada pelo Ajuste 03/22. Fui ao Ajuste 03/22 e
  confirmei que a cl. 2ª foi revogada (Aj. 29/23), então a tabela vigente é a da cl. 1ª.
- **Não feito:** acórdãos do STF e do STJ (Temas 517/1284, REsp 1.221.170) e SC Cosit 126/2020: só pista. Possível
  prorrogação do art. 34-D da CAT 147 depois de 2024: não buscada.
