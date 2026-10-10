# Pesquisa em fonte primária: salão-parceiro, retenções, trabalhista, contábil-normativo, consumidor, LGPD, A1 (10/10/2026)

Autorização: dono, chat, 10/10: "Sim, roda a pesquisa para termos um questionário mais completo e assertivo".
Escopo: perguntas do bloco listado no despacho (PERGUNTAS-DE-LEI-2026-10-10 §1.8, §1.9, §2, §4, §8.1, §9).
Nenhum arquivo do repo foi editado. Textos brutos baixados em `scratchpad/lei/` (e `lei/icp/`), extraídos com `python -I`.

**Graus:** V-fonte = li o dispositivo no texto oficial (planalto, Receita, CFC, ITI, Portal NF-e, BCB) nesta sessão ·
V-repo = já verificado em doc do repo (não repetido) · V-r = reprodução não oficial ou resumo de ferramenta ·
I = inferência minha a partir de V · S = fonte secundária (pista).

**Redação vigente:** no planalto, os textos com redação revogada aparecem duplicados; usei sempre o último bloco com
"Redação dada por". Na IN 2.110, a API da Receita marca segmentos `tachado`; descartei os marcados.

---

## Contagem

| Status | Qtde |
|---|---|
| RESOLVIDA | 16 |
| PARCIAL | 14 (F-3 e F-4 contam aqui: o fato está resolvido, o efeito no produto não) |
| NÃO ALCANÇADA | 0 |

Dois achados novos que ninguém perguntou (A-7 e F-3) estão marcados **[ACHADO]**.

---

## A. Salão-parceiro, retenções, trabalhista

### A-1 · Lei 12.592/2012, art. 1º-A (todos os §§) e art. 1º-C — RESOLVIDA
- **Resposta:** o texto vigente (red. Lei 13.352/2016) bate com o que o PRE-ADR-PESSOAL já tinha como V-fonte: §3º retenção da
  cota do salão **e** dos tributos do parceiro; §4º cota do salão = aluguel de bens móveis e/ou gestão; §5º cota do parceiro
  fora da receita bruta do salão; §8º contrato escrito **homologado pelo sindicato** (ou MTE), duas testemunhas; §10 II
  cláusula obrigatória de retenção; §11 sem vínculo; art. 1º-C: vínculo se "não existir contrato de parceria formalizado na
  forma descrita nesta Lei" **e** (inciso II) funções diferentes. Sem alteração posterior a 2016.
- **Citação:** §3º "realizará a retenção de sua cota-parte percentual [...] bem como dos valores de recolhimento de tributos".
- **Fonte:** https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2012/lei/l12592.htm (10/10/2026, 21.926 bytes, igual ao do repo).
- **Grau:** V-fonte (reconfirmação de V-repo).
- **Pista para L-PES-8 (advogado):** STF, ADI 5625 (mérito 28/10/2021) julgou a lei constitucional, com a ressalva de que o
  contrato é nulo quando disfarça vínculo de emprego (S: portalcontnews, Migalhas). O art. 1º-C liga os incisos I e II com
  "e" na letra; se a homologação integra a "forma descrita" continua sendo a L-PES-8.

### A-2 · L-PES-1 (INSS): o salão retém 11% do parceiro pessoa física — RESOLVIDA (regra) / I (enquadramento)
- **Resposta:** se o parceiro PF é contribuinte individual (CI) que presta serviço à empresa, a empresa arrecada a
  contribuição dele descontando da remuneração e recolhe até o dia 20 do mês seguinte (Lei 10.666 art. 4º). A alíquota é
  **11%** pela dedução de 45% da contribuição patronal (Lei 8.212 art. 30 §4º; IN RFB 2.110 art. 37 II "a"), até o teto. A
  IN 2.110 diz expressamente que isso vale **também quando a contratante é do Simples** (art. 41 I) e que a ME/EPP do Simples
  é obrigada a arrecadar e recolher a contribuição do CI (art. 165 I). Para a cota patronal, o salão-parceiro é tributado no
  **Anexo III** (Res. CGSN 140 art. 25 §18, ver A-8), e a CPP está no DAS fora do Anexo IV (MOS, V-repo). Logo: **não há 20%
  patronal à parte**, só os 11% retidos.
- **Citação:** IN 2.110 art. 41: "aplicam-se inclusive: I - ao contribuinte individual que presta serviços a empresa optante pelo Simples Nacional".
- **Fontes:** Lei 10.666: https://www.planalto.gov.br/ccivil_03/leis/2003/l10.666.htm · Lei 8.212:
  https://www.planalto.gov.br/ccivil_03/leis/l8212cons.htm · IN RFB 2.110/2022 (texto multivigente, API oficial):
  https://normasinternet2.receita.fazenda.gov.br/api/consulta-externa/ato/126687/visao/multivigente (visualização:
  https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=126687). Todos lidos em 10/10/2026.
- **Grau:** V-fonte para a regra. **I** para o enquadramento do parceiro PF como CI "a serviço" do salão: a Lei 12.592 diz que
  a cota do parceiro é "prestação de serviços de beleza" (§4º) e que o salão centraliza o pagamento (§2º). A IN 2.110 **não
  menciona** salão-parceiro (busquei "parceiro", "12.592", "13.352": zero ocorrências fora do parceiro rural).
- **Pergunta reformulada (contador):** "Pela Lei 10.666 art. 4º e pela IN RFB 2.110 arts. 37 II 'a', 41 I e 165 I, entendemos
  que o salão-parceiro do Simples (Anexo III) desconta 11% do profissional-parceiro pessoa física, até o teto, sobre a cota
  repassada, e recolhe até o dia 20, sem cota patronal à parte. Confirma? Se não, qual norma diz diferente?"

### A-3 · L-PES-1 (IRRF) — RESOLVIDA
- **Resposta:** cota paga a pessoa física é rendimento do trabalho não assalariado pago por PJ a PF: IRRF pela **tabela
  progressiva** (RIR/2018 art. 685). O Simples não dispensa: o recolhimento unificado "não exclui" o IR "relativo aos
  pagamentos ou créditos efetuados pela pessoa jurídica a pessoas físicas" (LC 123 art. 13 §1º XI).
- **Citação:** RIR art. 685: "calculado de acordo com as tabelas progressivas [...] os rendimentos do trabalho não assalariado".
- **Fontes:** https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/decreto/d9580.htm ·
  https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm (10/10/2026).
- **Grau:** V-fonte (regra); I (subsunção, igual a A-2).

### A-4 · L-PES-1 (ISS do parceiro PF em SP) — PARCIAL
- **Resposta:** beleza é subitem 6.01 da lista. Pela Lei SP 13.701/2003 (resumo de ferramenta), o tomador PJ retém quando o
  prestador não emite NF ou recibo (art. 7º §1º) ou não é inscrito no cadastro municipal (art. 9º-A §2º), e fica
  desobrigado quando o prestador "for profissional autônomo estabelecido no Município" (art. 10 X). O §3º da Lei 12.592 manda
  o salão reter os "tributos" do parceiro, o que alcança o ISS, mas não diz como.
- **Fonte:** https://legislacao.prefeitura.sp.gov.br/leis/lei-13701-de-24-de-dezembro-de-2003 (10/10/2026, lido só até 100 mil
  caracteres pela ferramenta).
- **Grau:** V-r (não li o texto integral; o art. 15 que tratava do autônomo foi revogado pela Lei 14.865/2008, segundo o resumo).
- **Pergunta reformulada (contador):** "Pela Lei 12.592 art. 1º-A §3º e pela Lei SP 13.701 arts. 7º §1º, 9º-A §2º e 10 X,
  entendemos que o salão retém o ISS do parceiro PF só quando ele não for autônomo inscrito no CCM de SP, e que o autônomo
  inscrito recolhe o próprio ISS. Confirma? Qual a base e a alíquota nesse caso?"

### A-5 · L-PES-1 (em que obrigação informa) — PARCIAL
- **Resposta:** remuneração de CI paga por empresa vai ao **eSocial** (S-1200 com a categoria de CI e S-1210 para o pagamento
  e o IRRF). A Reinf R-4010 exclui rendimento do trabalho declarado no eSocial (IN 2.043 art. 3º §1º I, V-repo no
  PRE-ADR-PESSOAL). Portanto parceiro PF ⇒ eSocial, não R-4010.
- **Grau:** V-repo (IN 2.043) + I (o código da categoria do CI não foi relido no leiaute).
- **Pergunta reformulada (contador):** "Pela IN RFB 2.043 art. 3º §1º I, entendemos que a cota do parceiro PF vai no eSocial
  (S-1200 categoria de contribuinte individual + S-1210) e não na Reinf R-4010. Confirma? Qual o código de categoria que o
  escritório usa para o profissional-parceiro?"

### A-6 · L-PES-2 (parceiro MEI ou ME): nota e retenção — RESOLVIDA (nota e federais) / ISS do ME residual
- **Nota fiscal:** a Res. CGSN 140 resolve: o salão emite **um** documento ao consumidor com o total e "a discriminação das
  cotas-parte do salão-parceiro e do profissional-parceiro, bem como o CNPJ deste" (art. 59 §2º); o parceiro **emite documento
  fiscal ao salão** pelo valor das cotas recebidas (art. 59 §3º). Para o MEI parceiro, a receita dele é a cota inteira (art.
  100 §6º), e o salão-parceiro **não pode ser MEI** (art. 100 §7º).
- **Retenções:** INSS 11% não se aplica (o MEI/ME é pessoa jurídica, não CI a serviço; a regra especial do art. 113 da Res. 140
  cobre só hidráulica, eletricidade, pintura, alvenaria, carpintaria e veículos). CSRF: não, por dois lados (o salão do
  Simples "não está obrigado" a reter, Lei 10.833 art. 30 §2º; e o prestador do Simples não sofre, art. 32 III). IRRF 1,5%
  (RIR art. 714): serviços de beleza **não estão** na lista do §1º. ISS: no MEI (ISS fixo) "não caberá a retenção" (Res. 140
  art. 27 IV); no ME de alíquota variável a retenção depende da lei municipal (LC 116 art. 6º; Res. 140 art. 27).
- **Citação:** Res. 140 art. 59 §3º: "O profissional-parceiro emitirá documento fiscal destinado ao salão-parceiro relativamente ao valor das cotas-parte recebidas."
- **Fontes:** corpus `docs/accounting/fontes-oficiais/Res-CGSN-140-2018.txt` (redação vigente, linhas 89, 950-954, 1604-1606,
  2530-2532, 2914) · Lei 10.833: https://www.planalto.gov.br/ccivil_03/leis/2003/l10.833.htm · RIR (acima) (10/10/2026).
- **Grau:** V-fonte (corpus do repo é o texto oficial; o PRE-ADR não tinha lido o art. 59 nem o art. 100).
- **Resíduo (contador, junto com A-4):** ISS retido do parceiro ME de alíquota variável em SP.

### A-7 · [ACHADO] A exclusão da cota do parceiro da receita do Simples exige CNPJ — PARCIAL (pergunta nova)
- **Resposta:** a Res. CGSN 140 art. 2º §5º VI tira da receita bruta do salão os valores repassados ao parceiro "desde que
  este esteja devidamente inscrito no CNPJ". A Lei 12.592 §5º não tem essa condição. Na letra da resolução, **a cota do
  parceiro PF (sem CNPJ) entra na receita bruta do salão no PGDAS-D**. Isso mexe no X14 (receita) e na premissa do
  `SalaoParceriaContrato`.
- **Citação:** art. 2º §5º VI: "os valores repassados ao profissional-parceiro, desde que este esteja devidamente inscrito no CNPJ".
- **Fonte:** corpus Res-CGSN-140-2018.txt:89. **Grau:** V-fonte (texto); I (efeito).
- **Pergunta reformulada (contador):** "Pela Res. CGSN 140 art. 2º §5º VI, entendemos que a cota repassada ao parceiro pessoa
  física sem CNPJ compõe a receita bruta do salão no PGDAS-D, apesar do §5º da Lei 12.592. Confirma? Se não, qual norma
  prevalece?"

### A-8 · L-PES-3 (cota do parceiro PF na folha do fator R) — PARCIAL
- **Resposta:** para a receita da parceria, o fator R **não se aplica**: a Res. 140 art. 25 §18 manda tributar a receita do
  salão-parceiro e do profissional-parceiro no **Anexo III** (serviços) e no Anexo I (produtos). O fator R só importa para
  receita de outra atividade do mesmo tenant sujeita ao art. 25 §1º V (ex.: parte da clínica do P2). Para essa outra receita,
  o conflito de leitura do PRE-ADR continua: art. 26 §1º (remuneração a PF pelo trabalho) e §2º I (só o informado no eSocial)
  incluiriam a cota do parceiro PF informada no eSocial (A-5).
- **Citação:** art. 25 §18: "deverá ser tributada: I - na forma prevista no Anexo III [...] quanto aos serviços".
- **Fonte:** corpus Res-CGSN-140-2018.txt:950-954. **Grau:** V-fonte.
- **Pergunta reformulada (contador; se divergir, consulta à RFB):** "Pela Res. CGSN 140 art. 25 §18, entendemos que a receita
  da parceria fica no Anexo III sem fator R. Para outras receitas do tenant sujeitas ao fator R, entendemos que a cota do
  parceiro PF informada no eSocial entra na folha do art. 26 §§1º e 2º I. Confirma as duas? Se não, qual norma diz diferente?"

### A-9 · L-PES-4 (Simples como tomador retém CSRF e IRRF de PJ?) — PARCIAL
- **CSRF: resolvida.** "Não estão obrigadas a efetuar a retenção a que se refere o caput as pessoas jurídicas optantes pelo
  SIMPLES" (Lei 10.833 art. 30 §2º). A IN SRF 459 não foi lida; a lei basta.
- **IRRF de serviço profissional (RIR art. 714, 1,5%): aberto.** O art. 714 obriga "pessoas jurídicas" sem excluir o tomador
  do Simples, e a LC 123 art. 13 §1º lista só o IR sobre pagamento a **pessoa física** (XI). Não achei dispensa expressa para o
  tomador do Simples. Para o salão o efeito é pequeno: os serviços de beleza não estão no §1º do art. 714. Afeta a clínica
  (fisioterapia, medicina, nutrição estão na lista) e serviços comprados (contabilidade, advocacia, consultoria).
- **Fontes:** Lei 10.833 e RIR (acima), 10/10/2026. **Grau:** V-fonte; a ausência de dispensa é I (não li IN 459, IN 1.234, Cosit).
- **Pergunta reformulada (contador):** "Pela Lei 10.833 art. 30 §2º, entendemos que o tomador do Simples não retém CSRF. Pelo
  RIR art. 714, sem dispensa expressa, entendemos que ele **retém** 1,5% de IRRF quando paga PJ não optante por serviço da
  lista do §1º (ex.: contabilidade, advocacia) e informa na R-4020. Confirma o IRRF? Se não, qual norma dispensa?"

### A-10 · L-PES-5 (aluguel pago a locador PF) — RESOLVIDA
- **Resposta:** aluguel pago por PJ a PF sofre IRRF pela tabela progressiva (RIR art. 688), com exclusão da base de impostos e
  taxas do imóvel, aluguel de sublocação, despesas de cobrança e condomínio (art. 689). O Simples não dispensa (LC 123 art. 13
  §1º XI). A informação vai na **R-4010** (IN 2.043 art. 3º VIII, V-repo).
- **Citação:** RIR art. 688: "calculado de acordo com as tabelas progressivas [...] os rendimentos decorrentes de aluguéis".
- **Fonte:** RIR (acima), 10/10/2026. **Grau:** V-fonte + V-repo.

### A-11 · L-PES-9 (sócio que trabalha é obrigado a pró-labore?) — PARCIAL
- **Resposta:** a letra da lei condiciona: o sócio é segurado obrigatório como CI quando "recebam remuneração decorrente de seu
  trabalho" (Lei 8.212 art. 12 V "f"; IN 2.110 art. 8º XII, "desde que receba remuneração"). Nenhum dispositivo lido **obriga**
  a pagar pró-labore. O risco documentado é outro: na **sociedade simples de profissão regulamentada**, valores pagos ao sócio
  sem discriminar trabalho e capital, ou antecipados sem DRE, viram base previdenciária (IN 2.110 art. 33 §3º II e §4º).
- **Citação:** Lei 8.212 art. 12 V "f": "o sócio gerente e o sócio cotista que recebam remuneração decorrente de seu trabalho".
- **Fontes:** Lei 8.212 e IN 2.110 (acima). **Grau:** V-fonte (texto); a jurisprudência do CARF não foi pesquisada.
- **Pergunta reformulada (contador):** "Pela Lei 8.212 art. 12 V 'f' e pela IN 2.110 art. 8º XII, entendemos que não há
  obrigação legal de pró-labore: o sócio só contribui se receber remuneração pelo trabalho. O risco é o art. 33 §3º II da IN
  2.110 (lucro sem discriminação na sociedade simples de profissão regulamentada). O alerta do sistema deve ser 'aviso', não
  'bloqueio'. Confirma? Há posição da RFB ou do CARF que obrigue?"

---

## B. Contábil-normativo

### B-1 · DL 9.295/1946 arts. 25 e 26 (revisão de escritas é privativa de contador?) — PARCIAL
- **Resposta:** sim na letra. O art. 25 "c" lista "revisão permanente ou periódica de escritas", e o art. 26 torna a alínea "c"
  "privativa dos contadores diplomados", salvo direito adquirido. O texto já era V no GOVERNANCE-brief §7. **Fica aberto** se a
  revisão do C11 se enquadra em "revisão de escritas": é interpretação do CRC.
- **Citação:** art. 26: "as atribuições definidas na alínea c do artigo anterior são privativas dos contadores diplomados".
- **Fonte:** https://www.planalto.gov.br/ccivil_03/decreto-lei/del9295.htm (10/10/2026). **Grau:** V-fonte (texto).
- **Pergunta reformulada (CRC-SP, junto com F-GOV-1):** "Pelo DL 9.295 arts. 25 'c' e 26, entendemos que a revisão periódica
  dos lançamentos que o sistema chama de C11 é 'revisão de escritas', privativa do contador (bacharel), e que o técnico em
  contabilidade não pode assiná-la. Confirma? Se não, qual norma permite?"

### B-2 · Res. CFC 1.590/2020 arts. 1º e 5º — RESOLVIDA
- **Resposta:** contrato **por escrito** obrigatório (art. 1º), que serve para "comprovar a extensão e os limites da
  responsabilidade técnica" (p.ú.), celebrado após "aceitação formal da proposta" (art. 5º). Bate com o V-repo.
- **Fonte:** https://www1.cfc.org.br/sisweb/SRE/docs/RES_1590.pdf (10/10/2026). **Grau:** V-fonte.

### B-3 · ITG 2000 (R1) itens 31–36 — RESOLVIDA
- **Resposta:** retificação se faz por estorno, transferência ou complementação (31); o histórico deve dizer o motivo, a data e
  a localização do lançamento de origem (32); estorno anula totalmente (33); transferência reclassifica (34); complementação
  aumenta ou reduz (35); lançamento fora de época consigna a data efetiva e "a razão do registro extemporâneo" (36).
- **Citação:** item 36: "devem consignar, nos seus históricos, as datas efetivas das ocorrências e a razão do registro extemporâneo".
- **Fonte:** https://www1.cfc.org.br/sisweb/SRE/docs/ITG2000(R1).pdf (10/10/2026). **Grau:** V-fonte. Não achei ITG 2000 (R2).

### B-4 · NBC TA 530 (amostragem) — RESOLVIDA
- **Resposta:** existe (Res. CFC 1.222/2009, vigente desde 2010) e é norma do **auditor independente**: aplica-se "quando o
  auditor independente decide usar amostragem". Exige definir a amostra pela finalidade e pela população (6), tamanho que
  reduza o risco de amostragem a nível aceitável (7), seleção em que cada unidade tenha a mesma chance (8), e tratar item não
  testável como desvio ou distorção (11). **I:** não obriga a revisão do contador do C11, que não é auditoria; serve de
  referência de método se o C11 amostrar.
- **Fonte:** coletânea oficial https://cfc.org.br/wp-content/uploads/2018/04/Publicacao_NBC_TA_AUDITORIA.pdf (10/10/2026).
- **Grau:** V-fonte (coletânea de 2018; o índice não mostra revisão R1 da TA 530).

### B-5 · NBC TG 1000 (R2) / IFRS para PMEs 3ª edição no Brasil — RESOLVIDA (negativa, até 10/10/2026)
- **Resposta:** **não há** NBC TG 1000 (R2) nem audiência pública do CPC para a 3ª edição. Os cinco editais de 2025–2026 do CPC
  tratam de CPC 51/IFRS 18 (01 e 02/2025), Revisão 29 (03/2025), CPC 52 (01/2026) e CPC 18/36 (02/2026, aberto até 03/11/2026).
  A notícia do CPC de 15/09/2026 só resume o boletim da Fundação IFRS. A 3ª edição internacional vale para exercícios a partir
  de 01/01/2027 (S). Vale a NBC TG 1000 (R1).
- **Fontes:** https://www.cpc.org.br/CPC e editais Id=182, 183, 185; comunicado id=1328 (10/10/2026).
- **Grau:** V-fonte (lista de editais); a busca no site do CFC por resolução avulsa não foi feita.

### B-6 · NBC TG 1002 item 23.7 — RESOLVIDA (promove de V-r a V-fonte)
- **Resposta:** a microentidade pode reconhecer a receita "conforme a emissão da nota fiscal" quando isso representar
  adequadamente a posição e o desempenho; do contrário segue a seção 23.
- **Fonte:** https://www1.cfc.org.br/sisweb/SRE/docs/NBCTG1002.pdf (10/10/2026). **Grau:** V-fonte (o repo tinha LegisWeb).

### B-7 · CPC 47 B47: há lei brasileira que obrigue repassar saldo não reclamado ao Estado? — PARCIAL
- **Resposta:** B44–B47 já eram V-repo. Achei **uma** lei geral: a Lei 2.313/1954 art. 2º manda recolher ao Tesouro os
  "créditos resultantes de contratos de qualquer natureza" em poder de estabelecimentos "comerciais" não reclamados por **mais
  de 25 anos**, e o §1º exclui "os casos para os quais a lei determine prazo de prescrição menor de 25 anos". A Lei 14.973/2024
  (cap. VIII, "recursos esquecidos") vale só para instituições depositárias do sistema financeiro e está com "vigência
  encerrada". **I:** num pacote com validade de N dias, a pretensão prescreve muito antes de 25 anos (CC arts. 205/206), então
  a Lei 2.313 não alcança, e o B47 segue inaplicável.
- **Citação:** Lei 2.313 art. 2º §1º: "os casos para os quais a lei determine prazo de prescrição menor de 25 (vinte e cinco) anos".
- **Fontes:** https://www.planalto.gov.br/ccivil_03/leis/1950-1969/l2313.htm ·
  https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2024/lei/l14973.htm (10/10/2026).
- **Grau:** V-fonte (textos); I (inaplicabilidade). Lei estadual de SP sobre o tema não foi pesquisada.
- **Pergunta reformulada (contador, com nota ao advogado):** "Pela Lei 2.313/1954 art. 2º §1º, que exclui créditos com prazo
  prescricional menor que 25 anos, entendemos que nenhuma lei obriga o salão a entregar ao Estado o saldo de pacote vencido, e
  que o CPC 47 B47 não se aplica. Confirma? Conhece lei (inclusive estadual) que diga o contrário?"

---

## C. Consumidor

### C-1 · CDC art. 42-A — RESOLVIDA (texto) · a conformidade do boleto do MP segue como L-COB-1
- **Resposta:** todo documento de cobrança ao consumidor deve trazer **nome, endereço e CPF/CNPJ do fornecedor**.
- **Citação:** "deverão constar o nome, o endereço e o número de inscrição no [...] CPF ou no [...] CNPJ do fornecedor".
- **Fonte:** https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm (10/10/2026). **Grau:** V-fonte.
- **O que fica:** conferir se o boleto/Pix do MP mostra o **salão** (fornecedor) e não só o MP. Depende do boleto real do M2 (dado).

### C-2 · CDC art. 52 §1º (multa de mora de 2% sem financiamento) — PARCIAL
- **Resposta:** o §1º está dentro do art. 52, cujo caput fala de fornecimento "que envolva outorga de crédito ou concessão de
  financiamento". Na letra, o teto de 2% é do contrato com crédito. A jurisprudência do STJ estende o teto às relações de
  consumo contratuais em geral (S: tese citada em jus.com.br, sem número de tema confirmado).
- **Citação:** §1º: "não poderão ser superiores a dois por cento do valor da prestação".
- **Fonte:** CDC (acima). **Grau:** V-fonte (texto); S (jurisprudência).
- **Pergunta reformulada (advogado):** "Pelo CDC art. 52 §1º, na leitura ampla do STJ, entendemos que a multa de mora na
  cobrança de serviço ao consumidor (pacote em parcelas, sem financiamento) fica limitada a 2%, e o sistema deve travar o
  parâmetro em 2% para consumidor PF. Confirma? Indique o precedente vinculante, se houver."

### C-3 · CC art. 406 (juros de mora, red. Lei 14.905/2024) — RESOLVIDA
- **Resposta:** sem taxa convencionada, vale a taxa legal = **Selic menos o IPCA** (art. 389 p.ú.); metodologia do CMN,
  divulgada pelo BCB (§2º); resultado negativo vira zero (§3º).
- **Citação:** §1º: "taxa referencial do [...] (Selic), deduzido o índice de atualização monetária de que trata o parágrafo único do art. 389".
- **Fonte:** https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm (10/10/2026). **Grau:** V-fonte.

### C-4 · CC art. 132 (feriado estadual/municipal conta? sábado é dia útil?) — PARCIAL
- **Resposta:** §1º prorroga para o dia útil seguinte o vencimento que cair "em feriado"; não define feriado nem dia útil. A Lei
  9.093/1995 diz que são feriados civis os de lei federal, a data magna estadual e o início/fim do centenário municipal (art.
  1º), e feriados religiosos até quatro por lei municipal (art. 2º). Logo **feriado estadual e municipal contam como feriado**
  (I). **Sábado não é feriado** e o CC não o prorroga na letra. Mas a Lei 7.089/1983 proíbe banco e instituição financeira de
  cobrar juros de mora sobre título que vence em **sábado, domingo ou feriado** se pago no primeiro dia seguinte.
- **Citação:** Lei 7.089 art. 1º: "cujo vencimento se dê em sábado, domingo ou feriado, desde que seja quitado no primeiro dia subsequente".
- **Fontes:** CC (acima) · https://www.planalto.gov.br/ccivil_03/leis/l9093.htm · https://www.planalto.gov.br/ccivil_03/leis/l7089.htm (10/10/2026).
- **Grau:** V-fonte (textos); I (aplicação ao tenant: a Lei 7.089 obriga o banco, não o salão; se ela alcança instituição de
  pagamento como o MP não verifiquei).
- **Pergunta reformulada (advogado):** "Pelo CC art. 132 §1º, pela Lei 9.093 arts. 1º e 2º e pela Lei 7.089 art. 1º,
  entendemos que o título do salão que vence em sábado, domingo ou feriado (nacional, estadual de SP ou municipal) pode ser
  pago no dia útil seguinte sem multa nem juros, e o sistema deve calcular assim. Confirma? A Lei 7.089 alcança o título
  emitido por instituição de pagamento?"

### C-5 · CDC art. 54 §3º (corpo 12) e art. 6º VIII — RESOLVIDA (texto)
- **Resposta:** contrato de adesão escrito em fonte "não [...] inferior ao corpo doze" (art. 54 §3º, red. Lei 11.785/2008);
  inversão do ônus da prova a critério do juiz quando verossímil ou hipossuficiente (art. 6º VIII).
- **Fonte:** CDC (acima). **Grau:** V-fonte. **PE-FE-2:** "corpo 12" é medida tipográfica de 12 pontos; em CSS, 12pt = 16px
  a 96 dpi (I; a lei não fala em pixel). A pergunta ao advogado continua sendo se a tela equivale ao "escrito".

---

## D. Pacote pré-pago

### D-1 · Decreto 12.955/2026 art. 57 e LC 214 art. 10 §§4º–7º — PARCIAL (texto resolvido, interpretação aberta)
- **Resposta:** art. 57 do decreto já era V-repo. LC 214 art. 10, redação da LC 227/2026: no pagamento antes do fornecimento,
  a antecipação é débito na data de cada parcela (§4º I); no fornecimento, ajuste ao definitivo; excesso segue a regra do
  pagamento indevido (§4º II "c"); **"caso não ocorra o fornecimento [...] inclusive em decorrência de distrato, observar-se-ão
  as regras aplicáveis ao cancelamento"** (§5º); o regulamento pode diferir o débito ao período do fornecimento se o
  intervalo for de no máximo 5 dias (§7º). **I:** a letra do §5º ("não ocorra o fornecimento") parece cobrir o pacote vencido
  sem uso, o que reforça a leitura (a) do PE-5 (estorno do débito pelo art. 57).
- **Fonte:** https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm (10/10/2026). **Grau:** V-fonte (texto); I (leitura).
- **Pergunta reformulada (contador):** "Pela LC 214 art. 10 §5º (red. LC 227/2026) e pelo Decreto 12.955 art. 57 §1º II,
  entendemos que o pacote que vence sem uso é 'não ocorrência do fornecimento' e segue o cancelamento: o fornecedor emite o
  documento e estorna o débito da antecipação, mesmo sem devolver o dinheiro. Confirma? Se não, qual norma trata a retenção
  do valor como fornecimento?" (Para o Simples que fica no DAS, vale o PE-3, não isto.)

---

## E. LGPD

### E-1 · Base legal para enviar CPF, e-mail e endereço do pagador ao provedor de pagamento (L-COB-4) — PARCIAL
- **Resposta:** as duas bases existem na letra: execução de contrato "do qual seja parte o titular, a pedido do titular" (art.
  7º V) e legítimo interesse (art. 7º IX, com os limites do art. 10). Controlador decide a finalidade e operador trata "em nome
  do controlador" (art. 5º VI e VII; art. 39). O guia da ANPD (v2.0, abr/2022) diz que a finalidade "será sempre estabelecida
  pelo controlador" e que o operador pode decidir só elementos não essenciais (itens 36–37). **I:** o pagador é parte do
  contrato com o salão, o que favorece o art. 7º V; o provedor de pagamento, por ter deveres regulatórios próprios (BCB,
  prevenção à lavagem), tende a ser controlador independente nessa parte, não só operador. A tela deve informar o
  compartilhamento (art. 9º V).
- **Fontes:** https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm ·
  https://www.gov.br/anpd/pt-br/documentos-e-publicacoes/Segunda_Versao_do_Guia_de_Agentes_de_Tratamento_retificada.pdf (10/10/2026).
- **Grau:** V-fonte (lei e guia); I (enquadramento do MP). Não verifiquei se há versão do guia posterior a 2022.
- **Pergunta reformulada (advogado):** "Pela LGPD art. 7º V, entendemos que enviar CPF, e-mail e endereço do pagador ao
  provedor de pagamento para emitir a cobrança que ele pediu é execução de contrato, sem consentimento, e que o provedor é
  operador na emissão e controlador independente nas obrigações regulatórias dele, com aviso na tela pelo art. 9º V.
  Confirma? Se não, qual base e qual papel?"

---

## F. Certificado A1, custódia, PSC, PAA

### F-1 · DOC-ICP-04/05: onde está o controle exclusivo da chave pelo titular — RESOLVIDA
- **Resposta:** não está no DOC-ICP-03. Está em três lugares:
  - **DOC-ICP-05 v7.0, item 4.5.1.2 "b"** (obrigação do titular): "garantir a proteção e o sigilo de suas chaves privadas,
    código de ativação (PIN) e dispositivos criptográficos" (red. Res. CG 204/2022). Para PJ, a nota diz que a obrigação é do
    "responsável pelo certificado".
  - **DOC-ICP-05 v7.0, item 9.3.3.3**: o titular PF ou o responsável pelo certificado de PJ têm "as atribuições de geração,
    manutenção e sigilo" das chaves e respondem por divulgação ou uso indevido (red. Res. 211/2024).
  - **DOC-ICP-04 v8.3, item 6.1.1.6 "c"**: a mídia deve assegurar que a chave "pode ser eficazmente protegida pelo legítimo
    titular contra a utilização por terceiros".
- **Fontes:** https://www.gov.br/iti/pt-br/assuntos/legislacao/documentos-principais/Resolucao177_DOCICP05_compilada_v7.0.pdf ·
  https://www.gov.br/iti/pt-br/assuntos/legislacao/documentos-principais/resolucao179_doc-icp-04_compilada.pdf (10/10/2026).
- **Grau:** V-fonte. Corrige o §8.1: a atribuição ao DOC-ICP-03 não se confirma.

### F-2 · Custódia por terceiro / PSC — RESOLVIDA
- **Resposta:** a ICP-Brasil **regula** a custódia, e só por quem é credenciado. DOC-ICP-04 v8.3 item 6.1.1.8: "O
  armazenamento de chaves privadas por terceiros em hardware criptográfico só poderá ser realizada por entidade credenciada
  como PSC" (exceção: HSM corporativo para chaves de funcionários). O PSC é "credenciado, auditado e fiscalizado pelo ITI"
  (DOC-ICP-17 v2.0 item 1.1.2, aprovado pela **Res. CG ICP-Brasil 180/2020**, que revogou a Res. 132/2017; não é a 151/2019).
  Procedimentos operacionais: DOC-ICP-17.01 v3.0 (IN ITI 20/2020). O subscritor aprova o serviço e pode desvincular as chaves
  (portabilidade) (itens 1.3.2.2 e nota 1). A AC também não pode guardar cópia da chave do titular salvo se for PSC (DOC-ICP-04
  6.2.4.2, red. Res. 215/2025).
- **I (para o F-ADN-1):** guardar o arquivo .pfx do cliente num servidor do Luminaris **não é** caminho previsto pela
  ICP-Brasil. O 6.1.1.8 fala de "hardware criptográfico", e a guarda de certificado em software por terceiro não tem regra
  própria, mas choca com 6.1.1.6 "c" e com o DOC-ICP-05 9.3.3.3. O caminho regulado é o **certificado em nuvem num PSC**, com o
  cliente autorizando cada uso ou lote.
- **Fontes:** DOC-ICP-04 (acima) · https://www.gov.br/iti/pt-br/assuntos/legislacao/documentos-principais/resolucao180_doc-icp-17_compilada.pdf
  · https://www.gov.br/iti/pt-br/assuntos/legislacao/resolucoes/resolucoes-old/Resoluo180Dec10139Etapa2DOC17_assinada.pdf (10/10/2026).
- **Grau:** V-fonte (normas); I (consequência para o produto).

### F-3 · [ACHADO] Res. CG ICP-Brasil 211/2024: o tipo A1 foi extinto — RESOLVIDA (fato) / PARCIAL (efeito)
- **Resposta:** o DOC-ICP-04 v8.3 lista 10 tipos e **não tem A1** (item 1.1.5). A Res. 211/2024 (DOU 04/11/2024) criou SE-S/SE-H
  (selo eletrônico de PJ, software/hardware) e AE-S/AE-H (art. 2º), extinguiu "certificado de assinatura dos tipos A1 e A2"
  (art. 3º I) e vedou o selo "com propósito de assinatura como manifestação de vontade de pessoa jurídica" (art. 4º). A3/A4
  passam a ser só de pessoa física (DOC-ICP-04 1.1.6). Transição: o art. 13 admite A1 na cadeia V5 "até 02 de março de 2029"
  (V-r). Validade máxima do SE-S: 1 ano (Tabela 6).
- **Por que importa:** todo o vocabulário do repo ("A1 do cliente", "e-CNPJ A1") descreve um tipo em extinção. O que o salão
  terá na renovação é um **SE-S** (selo de PJ) ou um A3 do responsável PF. Se assinar NF-e/NFS-e com selo é "manifestação de
  vontade" (vedado pelo art. 4º) ou prova de origem é pergunta nova.
- **Fontes:** DOC-ICP-04 v8.3 (acima, V-fonte) · Res. 211/2024 arts. 1º–6º e 13 em reprodução:
  https://www.normasbrasil.com.br/norma/resolucao-211-2024_468443.html (V-r; o PDF do ITI não foi baixado).
- **Pergunta reformulada (advogado + ITI/SEFAZ):** "Pela Res. CG ICP-Brasil 211/2024 arts. 3º e 4º e pelo DOC-ICP-04 v8.3 item
  1.1.5, entendemos que o e-CNPJ A1 deixa de ser emitido e que a PJ passa a ter selo SE-S, que serve para provar a origem do
  documento fiscal e não como manifestação de vontade. Entendemos que assinar a NF-e e a DPS da NFS-e com SE-S é permitido.
  Confirma? Até quando um A1 emitido antes vale para NF-e/NFS-e?"

### F-4 · NT 2026.001 (Provedor de Assinatura e Autorização, PAA) — RESOLVIDA (o que é) / PARCIAL (se resolve a custódia)
- **Resposta:** é modelo do Ajuste SINIEF 9/22 para **NF-e/NFC-e** via ambiente da SVRS. O emitente se vincula a um PAA
  "previamente homologado pela Coordenação do ENCAT" logando com **gov.br**; o portal gera um par RSA 1024 por relação
  PAA-emitente; o PAA assina o grupo `infPAA` com essa chave e assina o DF-e com o **certificado ICP-Brasil do próprio PAA**.
  **O emitente não precisa de certificado e ninguém guarda o certificado dele.** A responsabilidade tributária continua do
  emitente (cláusula 4ª III do Ajuste). O vínculo acaba a qualquer tempo, com efeito imediato. Produção: **05/10/2026** (v1.02;
  v1.02b de 31/07/2026 é a vigente). Foco declarado: MEI, produtor rural e Simples.
- **Citação:** "O DF-e também deverá receber a assinatura digital qualificada com certificado ICP-Brasil do PAA."
- **Limites (I):** (1) só NF-e/NFC-e; **não cobre a NFS-e nacional (ADN)**, que é o objeto do L-ADN-5; (2) o Luminaris
  precisaria ser **homologado pelo ENCAT** como PAA; (3) a NT não diz se todo emitente do Simples pode usar ou só um "perfil"
  (o texto fala em "Emitentes que se enquadrarem nesse perfil").
- **Fonte:** https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=AlgHfV6gpAU= (NT 2026.001 v1.02b, 19 p.,
  baixada em 10/10/2026). **Grau:** V-fonte. Ajuste SINIEF 9/22 não lido.
- **Pergunta reformulada (advogado; SEFAZ/ENCAT):** "Pela NT 2026.001 v1.02b e pelo Ajuste SINIEF 9/22, entendemos que um
  software homologado como PAA pelo ENCAT emite NF-e/NFC-e do cliente sem guardar o certificado dele, e que isso não vale para
  a NFS-e nacional. Para a NFS-e, entendemos que o único caminho regulado sem o .pfx no nosso servidor é o certificado em
  nuvem num PSC credenciado (DOC-ICP-04 item 6.1.1.8). Confirma as duas? Que requisitos o ENCAT exige do PAA? Quais emitentes
  podem usar?"

---

## G. Open Finance

### G-1 · Res. Conjunta BCB/CMN 1/2020: o agregador precisa ser instituição autorizada? — RESOLVIDA
- **Resposta:** sim para ser **participante**: o Open Finance é implementado "por parte de instituições financeiras,
  instituições de pagamento e demais instituições autorizadas a funcionar pelo Banco Central" (art. 1º), e os participantes
  são essas instituições (art. 6º). Entidade **não autorizada** só entra por **parceria** contratada por uma autorizada, para
  dados cadastrais e transacionais de clientes (art. 5º I "c" e "d"), com consentimento prévio e expresso (art. 36 §1º),
  parecer do diretor responsável (art. 36 §6º) e diligência prévia (art. 37). É vedado que o parceiro atue "em nome da
  instituição contratante para fins de compartilhamento" (art. 36 §5º II).
- **Fonte:** API oficial do BCB, https://www.bcb.gov.br/api/conteudo/app/normativos/exibenormativo?p1=Resolu%C3%A7%C3%A3o%20Conjunta&p2=1
  (10/10/2026; "Revogado: False"; assunto atual "implementação do Open Finance").
- **Grau:** V-fonte do texto devolvido pela API, que parece ser o original de 2020. As alterações posteriores (a API lista a
  Res. Conjunta 2/2020 e outras) não foram conferidas artigo por artigo.

---

## Fontes baixadas nesta sessão (para reproduzir)

| Norma | URL | Data |
|---|---|---|
| Lei 12.592 | planalto `_ato2011-2014/2012/lei/l12592.htm` | 10/10/2026 |
| Lei 10.666 | planalto `leis/2003/l10.666.htm` | 10/10/2026 |
| Lei 8.212 | planalto `leis/l8212cons.htm` | 10/10/2026 |
| IN RFB 2.110/2022 | `normasinternet2.receita.fazenda.gov.br/api/consulta-externa/ato/126687/visao/multivigente` (1,48 MB JSON) | 10/10/2026 |
| RIR/2018 | planalto `_ato2015-2018/2018/decreto/d9580.htm` | 10/10/2026 |
| Lei 10.833 | planalto `leis/2003/l10.833.htm` | 10/10/2026 |
| LC 123 · LC 214 | planalto `leis/lcp/lcp123.htm` · `lcp214.htm` | 10/10/2026 |
| Res. CGSN 140 | corpus do repo `docs/accounting/fontes-oficiais/Res-CGSN-140-2018.txt` | — |
| DL 9.295 | planalto `decreto-lei/del9295.htm` | 10/10/2026 |
| Res. CFC 1.590 · ITG 2000 (R1) · NBC TG 1002 | `www1.cfc.org.br/sisweb/SRE/docs/` (RES_1590, ITG2000(R1), NBCTG1002) | 10/10/2026 |
| NBC TA 530 | `cfc.org.br/wp-content/uploads/2018/04/Publicacao_NBC_TA_AUDITORIA.pdf` | 10/10/2026 |
| Lei 2.313 · Lei 14.973 | planalto | 10/10/2026 |
| CDC · CC · Lei 9.093 · Lei 7.089 | planalto (`l8078compilado`, `l10406compilada`, `l9093`, `l7089`) | 10/10/2026 |
| LGPD · Guia ANPD v2.0 | planalto `l13709.htm` · gov.br/anpd (PDF) | 10/10/2026 |
| DOC-ICP-04 v8.3 · DOC-ICP-05 v7.0 · DOC-ICP-17 v2.0 | gov.br/iti documentos-principais | 10/10/2026 |
| NT 2026.001 v1.02b | Portal NF-e `exibirArquivo.aspx?conteudo=AlgHfV6gpAU=` | 10/10/2026 |
| Res. Conjunta 1/2020 | API do BCB | 10/10/2026 |

**Dica operacional:** o portal novo da Receita (`normas.receita.fazenda.gov.br`) é Angular e devolve só o shell. O texto sai da
API do sistema antigo `normasinternet2.receita.fazenda.gov.br/api/consulta-externa/ato/{idAto}/visao/multivigente`, que o
`scratchpad/ato2txt.py` converte (marca `[TACHADO]`).

## Caso adversarial tentado
- **Contra A-2 (11% no Simples):** procurei na IN 2.110 uma regra que afastasse a retenção do CI quando a contratante não paga
  cota patronal (Simples fora do Anexo IV). Achei o oposto: art. 41 I aplica a seção ao CI que presta serviço a optante do
  Simples. O único 20% para "fontes que não contribuem com a cota patronal" é a complementação **do próprio segurado** (art. 39
  §4º II), não a retenção da empresa.
- **Contra A-6 (nota do parceiro):** procurei na Res. 140 se a nota unificada dispensa a nota do parceiro ao salão. Não
  dispensa: §2º (salão → consumidor) e §3º (parceiro → salão) coexistem.
- **Contra F-2 (custódia proibida):** procurei no DOC-ICP-04 e no DOC-ICP-17 uma permissão de guarda por software de
  terceiro não credenciado. Não existe; a única exceção é o HSM corporativo para funcionários.
- **Checagem que teria falhado:** se o A1 ainda existisse, o DOC-ICP-04 1.1.5 o listaria; não lista.
