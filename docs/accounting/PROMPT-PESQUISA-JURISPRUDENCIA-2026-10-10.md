# Prompt — pesquisa de jurisprudência sobre o que o contador não confirmou (10/10/2026)

> Pedido do dono (chat, 10/10): "Faz um prompt para o que o contador não confirmou e pesquise jurisprudencia".
> Origem dos itens: [`TRIAGEM-RESPOSTA-CONTADOR-2026-10-10.md`](TRIAGEM-RESPOSTA-CONTADOR-2026-10-10.md) §2 e
> [`docs/plano/PERGUNTAS-DE-LEI-2026-10-10.md`](../plano/PERGUNTAS-DE-LEI-2026-10-10.md) §10.3.
> O prompt é autossuficiente: pode ir a um advogado, a um pesquisador ou a um agente de IA. Copie da linha abaixo até o
> fim.

---

## PROMPT

Você é um pesquisador jurídico-tributário brasileiro. Preciso de **jurisprudência e entendimento administrativo
vigentes** (até outubro de 2026) sobre as questões abaixo. Elas vêm de um ERP para **salões de beleza e clínicas de
estética**. O primeiro cliente é optante do **Simples Nacional** em **São Paulo capital** e presta os serviços dos
subitens 6.01/6.02/6.03 da LC 116. Para cada questão, já existe uma leitura da letra da lei (abaixo). O contador **não
confirmou** essas leituras. Quero saber o que os tribunais e a administração tributária decidiram.

### Regras da pesquisa
1. **Só fonte verificável.** Para cada decisão, informe: tribunal ou órgão, classe e número (REsp, RE, ADI, AgInt,
   Apelação, Acórdão CARF, Solução de Consulta Cosit/Disit, Parecer), relator, órgão julgador, data do julgamento e da
   publicação, link no portal oficial (stf.jus.br, stj.jus.br, carf.economia.gov.br, esaj.tjsp.jus.br, trf3.jus.br,
   normas.receita.fazenda.gov.br) e um trecho curto da ementa.
2. **Nunca invente número de processo.** Se não encontrar decisão sobre o ponto exato, diga **"não localizei"** e indique
   a decisão mais próxima, explicando a diferença.
3. **Classifique a força** de cada precedente:
   - vinculante (súmula vinculante, ADI/ADC, repercussão geral, recurso repetitivo, IRDR);
   - persuasivo (turma, câmara);
   - isolado;
   - administrativo vinculante para a RFB (SC Cosit, Parecer Normativo);
   - administrativo não vinculante (Disit, CARF de turma ordinária).
4. **Confira se está superado:** overruling, lei posterior, modulação de efeitos, tese revista.
5. **Separe jurisprudência de doutrina.** Artigo, blog ou notícia serve só como pista, marcada como tal.
6. **Conclua** cada questão em uma de três posições, com o grau de segurança:
   - (a) a jurisprudência **apoia** a leitura;
   - (b) **contraria**;
   - (c) **dividida ou inexistente**.

### Questões

**Bloco 1 — Pacote pré-pago com prazo de validade (saldo vencido sem uso, "breakage")**
- **1.1** Incide **ISS** sobre o valor de pacote de serviços pago antecipadamente que **vence sem nenhuma sessão
  prestada**? Leitura: não, porque o fato gerador é a prestação (LC 116 art. 1º; Lei SP 13.701 arts. 1º e 6º; RISS-SP
  art. 81; SC SF/DEJUG 06/2018). Procure: STF e STJ sobre ISS em valores não usufruídos, créditos pré-pagos, cartões,
  vale-serviço, assinaturas e multa por desistência; TJSP sobre o ISS paulistano nesses casos; a posição da SF/SP.
- **1.2** No **IRPJ/CSLL e no PIS/Cofins**, a receita de saldo expirado ("breakage" de vale-presente, pontos, milhas,
  créditos pré-pagos) é **receita da atividade** (receita bruta) ou **outra receita**? Quando é reconhecida? Procure:
  CARF e SC Cosit sobre breakage de programa de fidelidade e de vale-presente; Lucro Presumido, Lei 9.430 art. 25 I × II.
- **1.3** No **Simples Nacional**, o saldo vencido entra na receita bruta do PGDAS-D? Em qual anexo? É "indenização"
  (Res. CGSN 140 art. 2º §5º V)? Procure: SC Cosit, CARF, TRFs.
- **1.4** (Consumidor, risco residual) É válida a cláusula de **prazo de validade** em pacote de serviços pré-pago, com
  perda do saldo vencido? Procure: STJ sobre perda integral de créditos pré-pagos (telefonia, vale-presente) e TJSP sobre
  pacotes de estética e academia.

**Bloco 2 — Salão-parceiro (Lei 12.592/2012, art. 1º-A) e sócio que trabalha**
- **2.1** Status da **ADI 5625** (constitucionalidade do salão-parceiro) e das teses sobre **vínculo de emprego**
  quando o contrato não é homologado ou a parceria é fraudada (TST, TRT-2).
- **2.2** Sobre a cota do **parceiro pessoa física**, o salão retém e recolhe **INSS de 11%** como contribuinte
  individual (Lei 10.666 art. 4º)? Há contribuição patronal à parte quando o salão é do Simples? Retém **IRRF** pela
  tabela? Procure: SC Cosit e CARF sobre salão-parceiro, cota-parte e cabeleireiro autônomo.
- **2.3** A cota-parte do **parceiro PF** sai da receita bruta do salão no Simples, ou só a do parceiro com CNPJ (Res.
  CGSN 140 art. 2º §5º VI)? E no Presumido e no PIS/Cofins? Procure: Cosit e CARF.
- **2.4** **Pró-labore:** a Receita e o CARF requalificam como remuneração (base de INSS) a distribuição de lucros ao
  sócio que trabalha, quando não há pró-labore ou a escrituração não separa lucro de remuneração? Existe "valor mínimo"
  aceito? Confirme se existe e o que diz a **SC Cosit 120/2016**. Procure: CARF (CSRF), STJ.

**Bloco 3 — IRPJ/CSLL do prestador**
- **3.1** **Presunção de 16%** (Lei 9.250 art. 40 p.ú.): salão de beleza, cabeleireiro, manicure e **esteticista**
  (profissão regulamentada pela Lei 13.643/2018) podem usar 16%? O que é "profissão legalmente regulamentada" para esse
  fim? Procure: SC Cosit e CARF.
- **3.2** **Estouro** de R$ 120 mil no ano: como se recolhe a diferença postergada? No **ano de início**, o limite é
  integral ou proporcional? Procure: Cosit e CARF.
- **3.3** **LC 224/2025** (acréscimo de 10% na presunção acima de R$ 5 milhões): estado das **ADIs 7936 e 7944** no STF
  e das liminares nos TRFs; se há modulação; como declarar o débito com liminar (DCTFWeb/MIT). O limite da CSLL em 2026 é
  R$ 3,75 milhões (orientação da Receita, P&R v5)? A estimativa mensal do Lucro Real sofre o acréscimo?
- **3.4** **Adicional do IRPJ** no mês de início fracionado: o limite de R$ 20 mil/mês conta o mês inteiro? Procure:
  CARF e Cosit (Lei 9.249 art. 3º §1º).

**Bloco 4 — PIS/Cofins, Simples em 2027 e ICMS**
- **4.1** **Produto monofásico usado como insumo** (tintura aplicada no cliente, não revendida) por prestador no regime
  não cumulativo: dá **crédito básico**? A resposta muda se o produto foi comprado do fabricante ou de revendedor?
  Procure: STJ (repetitivos sobre crédito no monofásico, inclusive o Tema 1093), CARF, SC Cosit (IN RFB 2.121 arts. 160
  e 534).
- **4.2** **Multa e juros recebidos** de clientes inadimplentes compõem a base do PIS/Cofins não cumulativo? Procure:
  STJ e CARF.
- **4.3** **Simples em 2027 (Res. CGSN 190):** juros e multas de mora entram na receita bruta (§4º VI acrescido) ou ficam
  fora (§5º II mantido)? Já existe jurisprudência ou SC sobre juros moratórios na receita bruta do Simples (regime
  anterior)?
- **4.4** **Fim do regime de caixa no Simples em 2027:** como se tributam os valores a receber de 2026 na virada (Res.
  140 art. 20 II b)? Há precedente de transições anteriores?
- **4.5** **DIFAL de ICMS cobrado do optante do Simples** em São Paulo, nas compras interestaduais **para revenda**
  (RICMS-SP art. 115 XV-A a; Lei 6.374 art. 2º VI cobre só uso, consumo e ativo). Procure: STF **Tema 517** (DIFAL do
  Simples) e **Tema 1284**, e o TJSP.

**Bloco 5 — Consumidor, LGPD e certificado digital**
- **5.1** A **multa de mora de 2%** do CDC art. 52 §1º vale para **prestação de serviço sem financiamento** (mensalidade,
  pacote, boleto)? Procure: STJ.
- **5.2** Vencimento em **sábado, domingo ou feriado** (inclusive estadual e municipal): o pagamento no 1º dia útil
  seguinte afasta juros e multa? A Lei 7.089/1983 alcança **instituição de pagamento** (ex.: Mercado Pago)? Procure: STJ e
  TJSP.
- **5.3** **LGPD:** enviar CPF, e-mail e endereço do pagador ao provedor de pagamento tem base em "execução de contrato"
  (art. 7º V)? O provedor é operador ou controlador? Há decisão da ANPD ou dos tribunais?
- **5.4** **Certificado digital de terceiro:** quem responde quando um software, contador ou procurador guarda e usa o
  certificado A1 da empresa e emite documento fiscal (MP 2.200-2 art. 6º p.ú.; DOC-ICP-04 item 6.1.1.8)? Há decisões
  sobre responsabilidade por uso do certificado por terceiro, nulidade ou repúdio de documento assinado por quem detinha
  a chave?

### Formato da resposta
Para cada questão (1.1 a 5.4):
```
Questão X.Y — <título>
Posição: (a) apoia / (b) contraria / (c) dividida ou inexistente — segurança: alta / média / baixa
Decisões:
  - <Tribunal/órgão> <classe e número>, rel. <nome>, <órgão julgador>, julg. <data>, publ. <data> — força: <vinculante/persuasivo/isolado/administrativo> — <link oficial>
    "<trecho curto da ementa>"
Superação/vigência: <...>
Conclusão em 2 linhas: <...>
Pergunta que sobra para advogado ou contador: <...>
```
No fim, um quadro-resumo com as posições e as 5 questões em que a jurisprudência mais muda o produto.
