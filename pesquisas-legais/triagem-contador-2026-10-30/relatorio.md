# Relatório de pesquisa legal — triagem-contador-2026-10-30

**Pergunta:** Quais perguntas abertas ao contador (D1, X7, ISS-TRANSICAO, EF, RETENCOES, PRESUMIDO-TETO, X14-CAIXA, confirmações de 10/10) a lei ou a doc oficial já responde?
**Aberto em:** 2026-10-30T02:20:30-03:00 · **Atualizado em:** 2026-10-30T09:31:46-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão

Entraram **22** perguntas abertas. A lei ou a documentação oficial responde **14**: (a) lei ou norma, 12; (b) documento
oficial, 2. **6** eram decisão de produto (c): 5 já tinham decisão do dono, e a P-EF-1 foi decidida em 30/10. No mesmo dia foram ao
dono também o lado de produto da F-RET-15 e o da A1. **1** não é pergunta
para o contador: é gate do dono. **Só 1** depende de fato do contador (d): P-C1, que é a preferência dele sobre a planilha
que ele mesmo usa. Fato novo do dono (chat, 30/10): o produto entra no ar só em 2027. Por isso A1, A2 e A3, que só valem
para o regime de caixa de 2026, não têm cliente.

| # | Pergunta (nó) | Classe | Resposta | Fonte |
|---|---|---|---|---|
| 1 | III-4: ISS 5% em SP e códigos nacionais (D1/D1f) | (a) | Confere: 6.01–6.03 caem no art. 16 IV da Lei SP 13.701 (5%), fora do Simples; piso de 2% da LC 116 art. 8º-A | dossiê `gates-humanos-lei` [D08][D03], 24/10 |
| 2 | III-7a: 16% só no IRPJ, CSLL a 32% (D1) | (a) | Confere: a Lei 9.250 art. 40 fala só da "base de cálculo mensal do imposto de renda"; a CSLL de serviço é 32% (Lei 9.249 art. 20 I) | [D04] art. 40; [D03] art. 20 I |
| 3 | III-8: IRRF 1,5% salvo Simples e valor mínimo (D1) | (a) | 1,5%: RIR art. 714. Simples: dispensa vigente (IN RFB 765/2007 art. 1º). Valor mínimo: a dispensa de R$ 10 da Lei 9.430 art. 67 é da PF. Na PJ o IRRF pequeno se acumula até o DARF de R$ 10, como o código já faz desde o #902 | dossiê `verif-2026-10-20-f1-retencoes-reinf-ibscbs` [D09]; [D13] |
| 4 | III-9: PER/DCOMP de saldo negativo só depois da ECF (D1) | (b) | Confere, com ressalva: no trimestral, PER/DCOMP feito antes de fechar o ano não exige ECF | [D11] (guia RFB); [D14] IN 2.055 art. 28 § 2º |
| 5 | III-10: o CST 02 não é só do monofásico (D1) | (a) | Confere: na tabela do CST, o 02 é "alíquota diferenciada" | `docs/accounting/pesquisa-lei-2026-10-10/piscofins-icms.md` (IN 1.009, Tabela II; MOC 7.0) |
| 6 | P-C1: a forma da planilha de memória serve ao contador? (X7) | **(d)** | Só ele diz se a planilha serve à rotina dele | — |
| 7 | P-C5: soma do ISS × livro municipal (X7) | gate do dono | Conferência com dado real (runbook), não pergunta | BRIEF X7-C §P-C5 |
| 8 | P-ISS-1: o piso de 2% cai de 2029 a 2032? (ISS-TRANSICAO-IBS) | (a) | **Cai junto.** O ADCT art. 128 manda fixar "as alíquotas" em 9/10…6/10 das alíquotas da lei municipal, sem exceção; norma constitucional prevalece sobre a LC 116 art. 8º-A. O piso de 2% vale para a alíquota-base (a de 31/12/2028) | [D09] ADCT art. 128 caput I–IV |
| 9 | P-ISS-2: § 3º no benefício municipal do Simples | (a) | **O § 3º afasta a redução extra.** ADCT art. 128 § 3º: "Ficam mantidos em sua integralidade, até 31 de dezembro de 2032, os percentuais utilizados para calcular os benefícios … já reduzidos por força da redução das alíquotas". Isenção ou redução em percentual do ISS fica como está (leitura (a) do F-ISS-3) | [D09] ADCT art. 128 § 3º; LC 116 art. 8º-B § 3º |
| 10 | P-ISS-3: pacote vendido em 2028 e consumido em 2029 | (a) | "Primeira ocorrência" = o primeiro fato gerador da operação (art. 408 § 4º I). O pagamento antecipado é fato gerador só na execução fracionada (art. 10 § 3º, red. LC 227). No resto, ele gera só antecipação, e o fato gerador é o fornecimento (art. 10 § 4º I–II). O produto segue o `pacoteFatoGerador` do perfil: VENDA ⇒ lei de 2028; CONSUMO ⇒ lei de 2029. Saldo não consumido até 31/12/2032: só IBS (art. 408 § 4º II; § 5º) | [D10] arts. 10 §§ 3º–4º, 408 §§ 4º–5º |
| 11 | P-EF-1: prova de custo no modo CARGA (EFICIENCIA-FISCAL) | (c) → dono | **Documento obrigatório** (dono, 30/10). Base: DL 1.598 art. 9º § 1º (a escrituração só faz prova com "documentos hábeis") | [D06] art. 9º § 1º |
| 12 | P-EF-7: lista de procedimentos hospitalares por cliente | (c) já decidido | Critério já respondido em 21/10; a lista é cadastro de cada cliente, feito no onboarding | BRIEF EF §9 |
| 13 | P-EF-11: o cabeleireiro perde os 16%? | (a) | A Lei 12.592 só "reconhece" as atividades (art. 1º). A Lei 13.643 "Regulamenta" a esteticista. A IN 1.700 tira dos 16% só a alínea "a" (profissão regulamentada), sem definir o termo [D15]. Nenhuma Solução de Consulta achada no SIJUT. O produto mantém 32% por padrão (leitura segura), e a diferença máxima é de R$ 2.880/ano | [D05] art. 1º; dossiê `fila-2026-10-27-bloco3-eficiencia` |
| 14 | P-EF-12: ligar o CARGA exige aceite do contador | (c) já decidido | Liga por cliente, com o aceite do contador **do cliente**, no onboarding. Não é pergunta ao nosso contador | BRIEF EF §9 |
| 15 | F-RET-15: o ISS retido vai direto para "ISS sobre serviços"? (RETENCOES-FONTE) | (a) + (c) | **Sim:** o ISS é tributo sobre a receita, então é dedução da receita bruta (DL 1.598 art. 12 § 1º III). **Momento:** pela competência (Lei 6.404 art. 177), a dedução cai no mês da receita. O dono decidiu em 30/10: lançar na emissão da NFS-e com ISS retido, e o recebimento só baixa o valor | [D06] art. 12 § 1º III; [D12] art. 177 |
| 16 | P-RET-9: autônomo no eSocial não vai ao R-4010 | (b) | Confere: o manual da Reinf (item 11) e o FAQ 1.17 mandam o rendimento do trabalho para o eSocial | dossiê `fila-2026-10-27-bloco2-reinf` [D01][D05] |
| 17 | P-PT-1: teto de R$ 78 mi pela receita total ou bruta? | (a) | Receita total: a IN 1.700 usa a mesma medida na opção e na obrigação (arts. 59 I e § 1º, 214) | dossiê `presumido-teto-78mi` [D04] |
| 18 | P-PT-2: o mês de abertura conta inteiro? | (c) já decidido | Nem a lei nem a IN tratam. Fica o F-PT-4 (a) que o dono ratificou. Para salão e clínica o efeito é nulo (R$ 6,5 mi por mês) | dossiê `presumido-teto-78mi` §4.2 |
| 19 | P-PT-3: no ano de início não há teto? | (a) | Não há. O art. 13 mede o "ano-calendário anterior", e a IN 1.700 art. 214 § 3º regula a opção de quem começa sem citar limite | [D02] art. 13; dossiê `presumido-teto-78mi` [D04] |
| 20 | A1: receita de 2026 não recebida (X14-CAIXA) | (a) + (c) | Entra no PGDAS-D de **dez/2026**: o art. 20 II b da Res. CGSN 140 vale até 31/12/2026, e o fim do caixa é um "retorno ao Regime de Competência". Nenhum ato do CGSN traz regra de transição: conferi o texto da Res. 190 e as Res. 191 a 195 [D16][D17]. O dono escolheu automatizar, mas o produto **vai ao ar só em 2027**, então ninguém vai apurar dez/2026 nele. Nada a codificar | dossiê `simples-regime-caixa` [D02][D04]; notícia RFB/Agência Gov 14/08/2026 |
| 21 | A2: o cartão entra na base no mês da venda ou no do crédito? | (c) já decidido | A norma não diz. Fica o F-CX-2 (c), D+N, com alerta. Só vale até 2026: sem cliente | dossiê `simples-regime-caixa` §4 A2 |
| 22 | A3: receita de 2025 recebida no caixa de 2026 | (c) já decidido | A norma não trata. Fica a decisão do dono de 16/10 ("Só vendas de ano no caixa"). Só vale para 2026: sem cliente | D-2026-10-16-X14-CAIXA-LACUNAS |

## 2. Fundamentação
| Ponto | Norma (art.) | Fonte | Trecho literal |
|---|---|---|---|
| Redução 2029–2032 | ADCT art. 128 caput | [D09] | "as alíquotas dos impostos previstos nos arts. 155, II, e 156, III … serão fixadas nas seguintes proporções das alíquotas fixadas nas respectivas legislações" |
| Benefício já reduzido | ADCT art. 128 § 3º | [D09] | "Ficam mantidos em sua integralidade, até 31 de dezembro de 2032, os percentuais utilizados para calcular os benefícios" |
| Primeira ocorrência | LC 214 art. 408 § 4º I | [D10] | "prevalecerá a legislação vigente no ano-calendário da primeira ocorrência em relação aos referidos impostos" |
| ISS não aperfeiçoado | LC 214 art. 408 § 4º II | [D10] | "os referidos impostos não incidirão na operação; e b) será devido exclusivamente o IBS" |
| Execução fracionada | LC 214 art. 10 § 3º (red. LC 227) | [D10] | "considera-se ocorrido o fato gerador na primeira entre as seguintes ocorrências" |
| Pagamento antecipado | LC 214 art. 10 § 4º II | [D10] | "na data do fornecimento: a) os valores definitivos dos tributos serão calculados" |
| 16% só no IR | Lei 9.250 art. 40 | [D04] | "A base de cálculo mensal do imposto de renda das pessoas jurídicas prestadoras de serviços em geral" |
| CSLL 32% | Lei 9.249 art. 20 I | [D03] | "32% (trinta e dois por cento) para a receita bruta decorrente das atividades previstas no inciso III do § 1º do art. 15" |
| Cabeleireiro | Lei 12.592 art. 1º | [D05] | "É reconhecido, em todo o território nacional, o exercício das atividades profissionais de Cabeleireiro" |
| IRRF e Simples | IN RFB 765/2007 art. 1º | [D13] | "Fica dispensada a retenção do imposto de renda na fonte sobre as importâncias pagas ou creditadas a pessoa jurídica inscrita no … Simples Nacional" |
| PER/DCOMP × ECF | IN RFB 2.055 art. 28 (guia RFB) | [D11] | "O PER/DCOMP será recepcionado pela Receita Federal somente se houver a confirmação de transmissão da ECF" |
| ISS como dedução | DL 1.598 art. 12 § 1º III | [D06] | "A receita líquida será a receita bruta diminuída de: … III - tributos sobre ela incidentes" |
| Competência | Lei 6.404 art. 177 | [D12] | "registrar as mutações patrimoniais segundo o regime de competência" |
| Prova por documento | DL 1.598 art. 9º § 1º | [D06] | "faz prova a favor do contribuinte dos fatos nela registrados e comprovados por documentos hábeis" |
| Teto pelo ano anterior | Lei 9.718 art. 13 | [D02] | "receita bruta total, no ano-calendário anterior, tenha sido igual ou inferior a R$ 78.000.000,00" |

## 3. Vigência conferida
- **Constituição [D01]:** o acervo deu alerta (sem versão nem data). Resolvi no Planalto compilado [D09], baixado em 30/10. O
  ADCT art. 128 tem a redação da EC 132/2023, sem alteração posterior.
- **LC 214:** o acervo traz a republicação. Li o compilado do Planalto [D10], baixado em 30/10, com as marcas da LC 227/2026.
  Os arts. 10 § 3º e § 4º I a.2 e II c têm a redação da LC 227. O art. 408 § 4º não tem marca de alteração.
- **RIR/2018 [D07]:** está no acervo em versão original. Não o citei direto: o art. 714 foi conferido no Planalto em 20/10
  (dossiê `verif-2026-10-20-f1-retencoes-reinf-ibscbs`, D09).
- **IN RFB 765/2007 [D13]:** não está no acervo. Li no SIJUT pelo navegador embutido, em 30/10, na visão multivigente. Só o
  art. 2º foi revogado (IN 1.234/2012); o art. 1º vigora.
- **IN RFB 2.055/2021 [D14]:** não está no acervo. Li o texto no SIJUT (visão multivigente, alterações até a IN 2.314/2026). Os
  arts. 27 e 28 não trazem marca de alteração. O art. 28 § 2º confirma a ressalva do trimestral que o guia [D11] já dava.
- **IN RFB 1.700/2017 [D15]:** li no SIJUT, já com a IN 2.343/2026. Art. 33 § 7º e art. 215 § 10: os 16% valem só para os
  serviços das alíneas "b", "c", "d", "f", "g" e "j" do art. 33 § 1º IV, ou seja, **sem** a alínea "a" (profissão legalmente
  regulamentada). A IN não define o termo.
- **Leis 9.718, 9.249, 9.250, 12.592 e 6.404, DL 1.598 e LC 123:** compiladas, cópias de 13/10, sem alerta.
- **Res. CGSN 190/2026 [D16]:** li o texto integral no SIJUT. "caixa", "a receber" e "transição" não aparecem nenhuma vez. A
  resolução só revoga os arts. 16 § 1º, 17 p.ú., 18 § 1º, 19, 20, 77 e 78 (art. 8º), com efeitos em 01/01/2027 (art. 9º).
- **Resoluções CGSN posteriores [D17]:** a lista do SIJUT para 2026 vai até a Res. 195 (DOU 22/10/2026). Nenhuma trata do
  caixa: a 191 é da NFS-e (art. 59), a 194 é dos prazos de opção para 2027, e a 195 é do documento fiscal do MEI.

## 4. Ambiguidades (só o que precisa de decisão humana)
- **P-ISS-1:** a LC 116 art. 8º-A não foi alterada. A leitura "o piso cai junto" se apoia na hierarquia: o ADCT art. 128 manda
  fixar todas as alíquotas na proporção. Grau: **inferido forte**. Só pesa a partir de 2029.
- **P-ISS-3:** pacote de sessões é "execução fracionada"? A lei não define. O produto não escolhe sozinho: segue o
  `pacoteFatoGerador` que o cliente já configura.
- **P-EF-11:** dizer que o cabeleireiro tem "profissão legalmente regulamentada" segue em aberto. O padrão de 32% é o lado
  seguro. Vale levar ao contador **do cliente** só se houver cliente real no Presumido com até R$ 120 mil.
- **A1–A3:** a norma não diz nada, mas nenhuma das três tem cliente: o produto vai ao ar em 2027 e o caixa acaba em
  31/12/2026.

## 5. Lacunas (2ª varredura, 30/10)
- ~~Texto integral da IN RFB 2.055/2021 não lido~~ **Fechada:** lida no SIJUT [D14]. O art. 28 § 2º confirma o guia [D11].
- **Cabeleireiro e 16%: segue sem Solução de Consulta.** Busquei no SIJUT por "cabeleireiro presunção", "cabeleireiro
  'lucro presumido'", "'profissão legalmente regulamentada' 16%", "'Lei nº 12.592'" e "esteticista 'lucro presumido'". Vieram
  só atos de outro tema: a SC Cosit 127/2019 (Simples, Anexo III), a SC Cosit 80/2014 (PIS/Cofins do salão), INs da Dirf e a
  IN 1.700, onde "cabeleireiro" só aparece na tabela de depreciação. Fato novo: a IN 1.700 [D15] confirma que os 16% excluem a
  alínea "a" (profissão regulamentada), mas não define o termo. O padrão de 32% continua sendo o lado seguro.
- **Transição do caixa: segue inexistente, agora conferida no texto.** A Res. 190 [D16] e as Res. 191 a 195 [D17] não tratam do
  assunto (até 22/10/2026). Sem efeito no produto: o go-live é em 2027.
- ~~D13 gravado à mão~~ **Fechada:** o D13 foi regravado com o innerText da página do SIJUT. O SHA-256 do texto integral,
  calculado no navegador, é `4a55eb6d…df46b`. O arquivo diz o que foi tirado: só rótulos de interface e linhas de pontilhado.
  O `baixar` continua recebendo a casca JS do SIJUT. O mesmo método (hash do innerText no navegador) valeu para D14–D17.

## 6. Achado lateral (fora das 22)
- **Res. CGSN 195/2026 (DOU 22/10/2026, efeitos em 01/01/2027), art. 106-C [D17]:** a DASN-Simei "poderá ser utilizada como
  documento fiscal eletrônico" nas vendas e serviços do MEI a consumidor final pessoa física sem CNPJ. O dossiê
  `emissao-mei-me-por-tipo` e a [[D-2026-10-29-EMISSAO-SIMPLES-E-FINANCEIRO]] não conhecem esse artigo: o dossiê diz que, para
  tomador PF, a emissão do MEI é facultativa só "até 31/12/2026".
- **Conferido em 30/10 (pedido do dono: "Sim, confere aqui").** Em 2027, três normas mexem nisso ao mesmo tempo [D18]:
  1. **A lei passa a obrigar.** A LC 214 art. 517 (efeitos em 01/01/2027, art. 544 III) dá à LC 123 art. 26 § 6º II a
     redação "será obrigatória a emissão de documento fiscal nas vendas e nas prestações de serviços realizadas pelo MEI",
     sem a exceção do consumidor final, e tira do § 1º a dispensa [D10].
  2. **A Res. 190 acompanha.** O art. 106 novo diz "O MEI deverá emitir os documentos fiscais nas vendas e nas prestações de
     serviços realizadas", e o art. 106-A torna a NFS-e nacional obrigatória. Saem a dispensa para PF (art. 106 II "a" 1) e a
     NFS-e facultativa para PF (art. 106-A § 2º): Res. 190 art. 8º XXIX e XXX [D18].
  3. **A Res. 195 regulamenta a obrigação para PF.** Pelo art. 106-C, a DASN-Simei "poderá ser utilizada como documento fiscal
     eletrônico" nas vendas e serviços a consumidor final PF sem CNPJ, "para fins do disposto nos arts. 106, 106-A e 106-B".
     A base são a LC 123 art. 26 §§ 1º, 6º II e 15 (o CGSN regulamenta) [D17].
- **Conclusão:** em 2027 o MEI segue **sem precisar de NFS-e por venda a consumidor PF**. A obrigação legal de documento é
  cumprida pela DASN-Simei, e emitir a NFS-e continua permitido. Para tomador com CNPJ, a NFS-e nacional é obrigatória.
  Grau: **verificado** no texto das três normas. Uma ressalva de leitura: o CGSN trata uma declaração anual como "documento
  fiscal eletrônico". Isso se apoia na delegação do art. 26 § 15 e só seria contestado se alguém questionasse a resolução.
- **Efeito no produto (lido em `origin/main`):**
  - `SimplesApuracaoService.ts:1028–1029`: a conferência de NFS-e do MEI só cobra a nota do tomador `CNPJ`. **O comportamento
    continua certo em 2027.** O comentário cita a base antiga (LC 123 art. 26 § 6º II e Res. 140 art. 106 II, na redação até
    2026), que em 2027 passa a ser a Res. 140 art. 106-C. Ajuste só de comentário, sem mudar comportamento.
  - `FiscalDocumentEmissionService.ts:950–954`: a NF-e/NFC-e do MEI fica fora, com a NFF desde 2027 (art. 106-B). Confere com
    a Res. 190.
  - Nada no produto obriga o MEI a emitir NFS-e para PF, e nada impede que ele emita.
- **Sem pergunta ao contador e sem decisão de produto.** O ajuste do comentário vai junto do próximo PR que tocar o
  `SimplesApuracaoService` (este PR é só de docs).
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** D01_constituicao — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/2239daf933a7c50d9e3dc23522de9e4f3e551052/constituicao.md>  
  Fonte oficial declarada: <> · versao_texto:  · cópia de   
  Lido em 2026-10-30T02:20:53-03:00 · arquivo local `docs/D01_constituicao.md` · SHA-256 `32619869bc81b4eb97e0ec344daa7295fe581701a8e7804a5bf5039ec4f71774`  
  ⚠ versao_texto = 'ausente' (não é texto compilado: alterações posteriores não aparecem)  
  ⚠ baixado_em ausente ou inválido  
  ⚠ fonte do cabeçalho não é domínio oficial: ''  
  ⚠ corpo curto ou com aviso (texto integral pode faltar)
- **[D02]** Lei nº 9.718 de 27/11/1998 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/2ee55c0d178cb912e1a74026bc8bf4a365018bf0/federal/leis-ordinarias/1998/lei-9718-1998-11-27.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:1998-11-27;9718> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-30T02:20:55-03:00 · arquivo local `docs/D02_lei-9718-1998-11-27.md` · SHA-256 `b15173fa6f57c3ef3a6c7709268c5757ad900c2f567a08f2e646ec014feadf12`
- **[D03]** Lei nº 9.249 de 26/12/1995 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/d955e7e66c4a7176278ee8ac74513668de7fc989/federal/leis-ordinarias/1995/lei-9249-1995-12-26.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:1995-12-26;9249> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-30T02:20:56-03:00 · arquivo local `docs/D03_lei-9249-1995-12-26.md` · SHA-256 `18cb96b64a850a3f9b738da870044230b76a336068e3fae79cb83f10b14d4699`
- **[D04]** Lei nº 9.250 de 26/12/1995 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/ec2d052273aea51cd30fac55a779a8d933c11046/federal/leis-ordinarias/1995/lei-9250-1995-12-26.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:1995-12-26;9250> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-30T02:20:58-03:00 · arquivo local `docs/D04_lei-9250-1995-12-26.md` · SHA-256 `aa9eedaae0195205b7f5bcde33c46572d4f1f5352de3cf92ec1e36342e88befd`
- **[D05]** Lei nº 12.592 de 18/01/2012 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/a31cf3cd12073c7b195933a53e733b85c00cfe02/federal/leis-ordinarias/2012/lei-12592-2012-01-18.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:2012-01-18;12592> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-30T02:20:59-03:00 · arquivo local `docs/D05_lei-12592-2012-01-18.md` · SHA-256 `ae4c4aae44ba1bd08493c05fd82e366cdd2f3bf263b93383f93b1f936541fd00`
- **[D06]** Decreto-Lei nº 1.598 de 26/12/1977 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/d5fce5484986fb975f9fe9c086c943774d63859f/federal/decretos-lei/1977/del-1598-1977-12-26.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:decreto.lei:1977-12-26;1598> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-30T02:21:01-03:00 · arquivo local `docs/D06_del-1598-1977-12-26.md` · SHA-256 `3a4f02e9cca3d46efbd8ed906783149fbf170a2205948643344ca153a5fdf7ed`
- **[D07]** Decreto nº 9.580 de 22/11/2018 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/39239e708b021186cea3d407a5fc7984f2c725f5/federal/decretos/2018/dec-9580-2018-11-22.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:decreto:2018-11-22;9580> · versao_texto: original · cópia de 2026-10-15  
  Lido em 2026-10-30T02:21:03-03:00 · arquivo local `docs/D07_dec-9580-2018-11-22.md` · SHA-256 `2c328212c1a8408eaa64072debe9860ecb435a731150296702b0583f00acfe6e`  
  ⚠ versao_texto = 'original' (não é texto compilado: alterações posteriores não aparecem)
- **[D08]** Lei Complementar nº 123 de 14/12/2006 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/394a7e97c8604703a3ea6638df61ab1873cecc6e/federal/leis-complementares/2006/lcp-123-2006-12-14.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei.complementar:2006-12-14;123> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-30T02:21:04-03:00 · arquivo local `docs/D08_lcp-123-2006-12-14.md` · SHA-256 `62ae5f126e5d6a0bf1e149614362aeca97730684067c128251c92cc1f732bdd9`
- **[D09]** Constituicao-Compilado — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/constituicao/constituicaocompilado.htm>  
  Baixado em 2026-10-30T02:21:13-03:00 · arquivo local `docs/D09_constituicaocompilado-htm.html` · SHA-256 `942887c0f0bfad8d45ab843230007172cbf2b0305e1b57a4d92757bd0563b805`
- **[D10]** Lcp 214 — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm>  
  Baixado em 2026-10-30T02:21:14-03:00 · arquivo local `docs/D10_lcp214-htm.html` · SHA-256 `48fd11b84baab0a7b0aad1f397d5e0aab3207c8645f469f7e01f488ffd28f50e`
- **[D11]** D11_per_dcomp-web_-saldo-negativo-de-irpj-ou-csll-pdf — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/restituicao-ressarcimento-reembolso-e-compensacao/per_dcomp-web_-saldo-negativo-de-irpj-ou-csll.pdf>  
  Baixado em 2026-10-30T02:24:01-03:00 · arquivo local `docs/D11_per_dcomp-web_-saldo-negativo-de-irpj-ou-csll-pdf.pdf` · SHA-256 `b1982cc997a2781f6a58a2e3eb243b3e6f9a003d4302d1daff75505725b7d963`
- **[D12]** Lei nº 6.404 de 15/12/1976 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/93b36bd206c427bbc1105b9d267654e75e7e6f56/federal/leis-ordinarias/1976/lei-6404-1976-12-15.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:1976-12-15;6404> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-30T02:25:51-03:00 · arquivo local `docs/D12_lei-6404-1976-12-15.md` · SHA-256 `5d16d68dae24463ba09ac3b4557d4a2b4b2004d0abee18d0783446f79e6fcb27`

## Registro de buscas
_Nenhuma busca registrada._
