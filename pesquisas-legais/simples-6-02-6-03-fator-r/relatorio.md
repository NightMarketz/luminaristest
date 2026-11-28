# Relatório de pesquisa legal — simples-6-02-6-03-fator-r

**Pergunta:** Os subitens 6.02 (estética, depilação) e 6.03 (massagem) da LC 116 são tributados no Anexo III do Simples sem fator r, ou estão sujeitos ao fator r (LC 123 art. 18 §§ 5º-B a 5º-M; Res. CGSN 140; soluções de consulta)?
**Aberto em:** 2026-11-24T01:20:23-03:00 · **Atualizado em:** 2026-11-24T01:48:43-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão
O Simples não classifica por subitem da LC 116, e sim pela atividade. O ponto de partida é a regra residual: o serviço não vedado e sem previsão expressa de Anexo IV ou V vai ao **Anexo III** [D01 LC 123 art. 17 § 2º e art. 18 § 5º-F]. O fator r só se aplica às atividades **listadas**: as do § 5º-I, mais as dos incisos XVI e XVIII a XXI do § 5º-B e as do § 5º-D, pelo § 5º-M [D01 art. 18 §§ 5º-I, 5º-J e 5º-M].

- **6.02: estética, tratamento de pele, depilação.** Vai ao **Anexo III, sem fator r**. A SC Cosit 127/2019 [D09] responde a uma consulente do CNAE 9602-5/02, que presta os serviços do item 6.02 e perguntou se usava "diretamente o Anexo III" por "não depender do fator 'R'". A resposta:
  - as atividades "não são objeto de nenhuma norma específica que determine sua tributação nos termos de algum dos Anexos" e por isso "devem ser tributadas na forma do Anexo III, conforme disposto no art. 18, 5º-F, c/c art. 17, § 2º" [D09 item 7];
  - a pessoa jurídica "cuja única atividade é a prestação de serviços de estética e cuidados com a beleza, tais como tratamento de pele, depilação, manicure, pedicure, cabeleireiro, barbeiro e congêneres, deve tributar suas receitas na forma do Anexo III" [D09 item 8].

  A SC Disit/SRRF01 1011/2019 [D10] se vincula a ela. Estética e depilação não aparecem em nenhum inciso dos §§ 5º-B, 5º-C, 5º-D ou 5º-I [D01], nem no art. 25 da Res. CGSN 140 com nome próprio [D02]. Grau: **verificado** (SC Cosit lida no inteiro teor; texto da LC conferido).
  - **Na parceria (Lei 12.592), há texto expresso.** A Res. CGSN 140 art. 25 § 18 manda tributar a receita do salão-parceiro e do profissional-parceiro "na forma prevista no Anexo III ... quanto aos serviços e produtos neles empregados" [D02]. A Lei 12.592 cobre "Cabeleireiro, Barbeiro, **Esteticista**, Manicure, Pedicure, **Depilador** e Maquiador" [D13 arts. 1º e 1º-A]. Esteticista e depilador estão na lista, então o 6.02 em parceria tem regra própria de Anexo III, sem fator r. Grau: **verificado**.
  - O "única atividade" da SC vem do caso consultado. Com revenda junto, cada receita é segregada pela sua atividade [D02 art. 25], e o serviço de estética continua no Anexo III. Grau: **inferido**.
- **6.03: massagem, banhos, duchas, sauna.** **Nenhum texto achado** que classifique a atividade. O massagista não está na lista da Lei 12.592 [D13 art. 1º], e por isso o § 18 do art. 25 da Res. 140 também não o alcança. Não há inciso nos §§ 5º-B a 5º-I [D01] nem alínea no art. 25 da Res. 140 [D02]. Na busca do SIJUT não apareceu SC sobre o tema. Os CNAE 9609-2/05 e 9602-5/02 não constam dos Anexos VI e VII da Res. 140 [D03], [D04], que listam CNAE impeditivos e ambíguos, não o anexo de tributação.
  - Pelas regras residuais, a leitura mais fiel é **Anexo III**, pelo mesmo caminho da SC 127/2019: § 5º-F com art. 17 § 2º [D01], e a Res. 140 art. 25 § 1º III "m" [D02], que manda ao Anexo III o serviço que "não tenha por finalidade ... atividade intelectual, de natureza técnica, científica, desportiva, artística ou cultural". A massagem de salão é um cuidado corporal do mesmo tipo dos "congêneres" que a SC agrupa. Grau: **inferido**. Há outras duas leituras, na Ambiguidade 1.
- **Para o simulador e o motor (item 19 do BRIEF):**
  - 6.02 fica no Anexo III, como hoje. Não há requisito de fator r.
  - 6.03 fica no Anexo III, mas com aviso de grau: "sem norma nem SC específica; leitura residual". O caso de teste do motor é o 6.03 com folha baixa, que fica no Anexo III, mais o aviso.
- **A lacuna f821 fica resolvida:** o 6.02 tem fonte, e o 6.03 está descrito como ambíguo, com a pergunta ao contador.

## 2. Fundamentação
| Ponto | Norma (art.) | Fonte | Trecho literal |
|---|---|---|---|
| Serviço não vedado pode optar | LC 123 art. 17 § 2º | [D01] | "que se dedique à prestação de outros serviços que não tenham sido objeto de vedação expressa neste artigo" |
| Regra residual: Anexo III | LC 123 art. 18 § 5º-F | [D01] | "serão tributadas na forma do Anexo III ..., salvo se, para alguma dessas atividades, houver previsão expressa de tributação na forma dos Anexos IV ou V" |
| Lista do Anexo V (fator r) | LC 123 art. 18 § 5º-I | [D01] | incisos I a XII, sem estética, depilação, massagem ou sauna |
| Residual do § 5º-I | LC 123 art. 18 § 5º-I XII (red. LC 155/2016) | [D12] | "atividade intelectual, de natureza técnica, científica, desportiva, artística ou cultural ... desde que não sujeitas à tributação na forma dos Anexos III ou IV" |
| Fator r | LC 123 art. 18 §§ 5º-J e 5º-M | [D01] | "caso a razão entre a folha de salários e a receita bruta ... seja igual ou superior a 28%" |
| Fator r no § 5º-B | LC 123 art. 18 § 5º-B XVI e XXI | [D01] | "fisioterapia"; "psicologia, psicanálise, terapia ocupacional, acupuntura, podologia, fonoaudiologia ..." |
| Anexo III residual na Res. 140 | Res. CGSN 140 art. 25 § 1º III "m" | [D02] | "outros serviços que, cumulativamente: 1. não tenham por finalidade ... atividade intelectual, de natureza técnica, científica, desportiva, artística ou cultural" |
| Anexo V residual na Res. 140 | Res. CGSN 140 art. 25 § 1º V "x" | [D02] | "1. tenham por finalidade a prestação de serviços decorrentes do exercício de atividade intelectual, de natureza técnica ..." |
| 6.02 no Anexo III | SC Cosit 127/2019, itens 7 e 8 | [D09] | "cuja única atividade é a prestação de serviços de estética e cuidados com a beleza, tais como tratamento de pele, depilação ... deve tributar suas receitas na forma do Anexo III" |
| Pergunta era sobre fator r | SC Cosit 127/2019, relatório | [D09] | "utilizar o Anexo III ... por não depender do fator 'R' do Anexo V?" |
| SC vinculada | SC Disit/SRRF01 1011/2019 | [D10] | vinculada à SC Cosit 127/2019 |
| Parceria no Anexo III | Res. CGSN 140 art. 25 § 18 I | [D02] | "A receita obtida pelo salão-parceiro e pelo profissional-parceiro de que trata a Lei nº 12.592, de 2012, deverá ser tributada: I - na forma prevista no Anexo III desta Resolução, quanto aos serviços e produtos neles empregados" |
| Profissões da parceria | Lei 12.592 arts. 1º e 1º-A | [D13] | "Cabeleireiro, Barbeiro, Esteticista, Manicure, Pedicure, Depilador e Maquiador" |
| Itens da LC 116 | LC 116, lista, 6.02 e 6.03 | [D11] | "6.02 - Esteticistas, tratamento de pele, depilação e congêneres."; "6.03 - Banhos, duchas, sauna, massagens e congêneres." |

## 3. Vigência conferida
- **Alertas do acervo e como foram resolvidos:**
  - A LC 123 do acervo [D01] veio sem alerta, mas **diverge do Planalto [D12] no § 5º-I XII**:
    - o acervo põe a terminação "Anexos III, IV ou V" sob a nota "redação dada pela LC 155/2016";
    - no Planalto, a redação da LC 155/2016 termina em "**Anexos III ou IV**", e "III, IV ou V" é a redação original da LC 147/2014, riscada.
  - A citação usa o Planalto. A diferença não muda a conclusão: os dois textos só mandam ao Anexo V a atividade "intelectual, de natureza técnica ...". A divergência do acervo foi registrada na caixa de lacunas.
- **Redação atual da Res. 140:** lida na visão multivigente [D02]. Há alterações de 01/01/2027 pelas Res. CGSN 190 [D05] e 195 [D06]. A 190 altera o art. 25 § 1º III "l" e outros, não a "m" nem o inciso V. A 195 não altera o art. 25.
- **SC Cosit 127/2019:** "vigente" na fonte [D08]. Pela IN RFB 2.058/2021, a SC da Cosit vincula a RFB. A norma não foi baixada neste dossiê; a informação é do conhecimento do método, grau **assumido**.

## 4. Ambiguidades (só o que precisa de decisão humana)
1. **Massagem e sauna (6.03).**
   - **(a) Anexo III, sem fator r.** É a leitura adotada. Vem do residual do § 5º-F e da Res. 140 III "m", pela analogia com a SC 127/2019 (cuidados corporais "e congêneres").
   - **(b) Anexo V com fator r, pelo § 5º-I XII.** Vale se a massagem for vista como "atividade intelectual, de natureza técnica". Com folha abaixo de 28% da receita, a tributação sobe para o Anexo V.
   - **(c) Fator r como fisioterapia, pelo § 5º-B XVI e § 5º-M.** Vale para a massagem terapêutica ou massoterapia feita como tratamento.
   - **Implicação:** em (b) e (c) o salão com massagista e folha baixa paga a tabela do Anexo V sobre essa receita.
   - **Mais segura:** (a) para massagem estética e relaxante em salão, sem fim terapêutico. Se o salão anunciar massoterapia ou terapia, (c) fica plausível.
   - **Pergunta exata ao contador:** "Salão no Simples que presta massagem estética e relaxante (LC 116, subitem 6.03; CNAE 9602-5/02 ou 9609-2/05). A receita vai ao Anexo III pelo art. 18 § 5º-F da LC 123 (como a SC Cosit 127/2019 faz com a estética), ou ao Anexo V com fator r, pelo § 5º-I XII ou pelo § 5º-B XVI (fisioterapia)?"

## 5. Lacunas
- Não há norma nem solução de consulta sobre massagem, sauna, banhos ou duchas no Simples. A busca no SIJUT, só em SC, cobriu os termos massagem, massagens, massagista, massoterapia, sauna, banhos, duchas, spa e 9609-2.
- Nenhum ato lido atribui anexo do Simples por CNAE. Os Anexos VI e VII da Res. 140 tratam de impeditivos e ambíguos.
- A divergência do acervo no § 5º-I XII da LC 123 foi registrada na caixa de lacunas, com destino à ferramenta e ao acervo.
### Releitura Res. CGSN 196 (27/11/2026)

Item 6 do BRIEF `BE-INCR-SIMPLES-CGSN-196` (lacuna `L-20261125-195503-a785`). Este adendo só acrescenta; o texto acima
fica como estava.
- **Base.** A cópia deste dossiê, [D02], é a mesma das outras sete (SHA-256 do texto `b5a02304…`, anterior à Res. 196).
  Conferi contra a Res. CGSN 140 multivigente de 25/11/2026,
  `pesquisas-legais/dp-tabelas-irrf-das-sst/docs/D24_rfb-92278-multivigente.txt` (`6683e711…`). Também usei a Res. CGSN 196,
  `…/D10_rfb-154694-multivigente.txt` (`37ff4316…`), e a Res. CGSN 190 já com as revogações da 196,
  `…/D09_rfb-152832-multivigente.txt` (`a5692faa…`). Um diff das duas cópias da 140 mostra só quatro trocas de texto
  vigente: art. 21 II "c", art. 121 § 4º e os novos arts. 144-C e 144-F. Os arts. 144-D e 144-E, da 190, também aparecem
  agora como vigentes. O resto são marcas `[AGENDADO]` que passaram da 190 para a 196.
- **Como conferi.** Rodei `python ~/.claude/tools/pesquisa-legal/legal.py trecho dp-tabelas-irrf-das-sst D24 "<termo>"` por
  dispositivo (D10 e D09 no lugar de D24 para a redação de 2027). Para o vigente, o critério é o texto da linha na D24.
  Para 2027, o critério é constar ou não dos arts. 1º, 2º, 5º e 7º da 196. A marca na linha não serve de critério, porque o
  `[AGENDADO]` fica na linha vizinha.
- **Estados.** **igual**: o texto vigente não mudou. **2027 trocada**: a redação de 2027 que o dossiê citou foi revogada ou
  reeditada pela 196. **novo**: dispositivo novo que confirma ou contraria uma leitura do dossiê.

| Dispositivo | Como o dossiê citou | Estado | Conclusão |
|---|---|---|---|
| art. 25 § 1º III "m" | Anexo III residual | igual (D24 L486-488) | não muda |
| art. 25 § 1º V "x" | Anexo V residual | igual (D24 L517) | não muda |
| art. 25 § 18 I | parceria no Anexo III | igual (D24 L574-575) | não muda |
| art. 25 (segregação) | revenda segregada pela atividade | igual; a 196 não altera o art. 25, só inclui o art. 25-A | não muda |
| art. 25 § 1º III "l" (red. 190, linha 43 acima) | "a 190 altera o III 'l'" | igual: a 196 não revoga essa alteração (D09 L124, sem risco) | não muda |
| Anexos VI e VII da 140 | CNAE impeditivos e ambíguos | igual: a 196 art. 3º substitui só os Anexos I a V | não muda |

Dispositivo que o dossiê não citou: a 196 art. 7º III revoga, em 01/01/2027, os incisos I a III do art. 26 § 6º (fator r
do mês de início, por FSPA e RPAr). A pergunta aqui é qual anexo vale para o 6.02 e o 6.03, não o cálculo do r. A resposta
(Anexo III, sem fator r) não depende desse parágrafo. No produto, o caso está coberto pela janela `LC214-art517`
(BRIEF §2, "coberto"). Nenhuma lacuna nova.
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** Lei Complementar nº 123 de 14/12/2006 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/394a7e97c8604703a3ea6638df61ab1873cecc6e/federal/leis-complementares/2006/lcp-123-2006-12-14.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei.complementar:2006-12-14;123> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-11-24T01:24:05-03:00 · arquivo local `docs/D01_lcp-123-2006-12-14.md` · SHA-256 `62ae5f126e5d6a0bf1e149614362aeca97730684067c128251c92cc1f732bdd9`
- **[D02]** Resolução CGSN nº 140, de 22 de maio de 2018 — Receita Federal - Sistema Normas (API)  
  Link oficial: <https://normasinternet2.receita.fazenda.gov.br/#/consulta/externa/92278/visao/multivigente>  
  Baixado em 2026-11-24T01:24:37-03:00 · arquivo local `docs/D02_rfb-92278-multivigente.json` · SHA-256 `158a09df9d0832b58264f9a0f625f75b9238563c44c967c7b5ea03bde5f48cb3`  
  ⚠ alteração com vigência futura: Alterado(a) pelo(a) Resolução CGSN nº 190, de 4 de agosto de 2026, a partir de 01/01/2027 (rfb:152832)  
  ⚠ alteração com vigência futura: Alterado(a) pelo(a) Resolução CGSN nº 195, de 21 de outubro de 2026, a partir de 01/01/2027 (rfb:154194)  
  ⚠ 24 anexos binários não baixados (o texto integral pode estar neles): as URLs estão no fim do texto e no campo 'anexos'; baixe com 'legal.py baixar' os que a pesquisa citar
- **[D03]** ANEXO VI DA RESOLUÇÃO CGSN Nº 140,  DE 2018 — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://normasinternet2.receita.fazenda.gov.br/api/consulta-externa/ato/92278/anexo/50966>  
  Baixado em 2026-11-24T01:25:03-03:00 · arquivo local `docs/D03_50966.pdf` · SHA-256 `2e324391b6a71b66643806c281989491ac5bf8d3b3f7b75b978d2f51cd5274cd`
- **[D04]** D04_58338 — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://normasinternet2.receita.fazenda.gov.br/api/consulta-externa/ato/92278/anexo/58338>  
  Baixado em 2026-11-24T01:25:03-03:00 · arquivo local `docs/D04_58338.pdf` · SHA-256 `720a45577269001346a01e07be89d336196a983a4a5803edb5c2ce0bab1753d2`
- **[D05]** Resolução CGSN nº 190, de 4 de agosto de 2026 — Receita Federal - Sistema Normas (API)  
  Link oficial: <https://normasinternet2.receita.fazenda.gov.br/#/consulta/externa/152832/visao/multivigente>  
  Baixado em 2026-11-24T01:25:17-03:00 · arquivo local `docs/D05_rfb-152832-multivigente.json` · SHA-256 `9d1b3419c37266069da0ff3eb51292886279aac4674436e4e540b1bbf57dce6b`  
  ⚠ 6 anexos binários não baixados (o texto integral pode estar neles): as URLs estão no fim do texto e no campo 'anexos'; baixe com 'legal.py baixar' os que a pesquisa citar
- **[D06]** Resolução CGSN nº 195, de 21 de outubro de 2026 — Receita Federal - Sistema Normas (API)  
  Link oficial: <https://normasinternet2.receita.fazenda.gov.br/#/consulta/externa/154194/visao/multivigente>  
  Baixado em 2026-11-24T01:25:17-03:00 · arquivo local `docs/D06_rfb-154194-multivigente.json` · SHA-256 `744914843138b566449799d31c8bb6264fa34bd58fc7222babf23c60968b0579`
- **[D07]** Normas — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://normas.receita.fazenda.gov.br/sijut2consulta/anexoOutros.action?idArquivoBinario=51835>  
  Baixado em 2026-11-24T01:26:07-03:00 · arquivo local `docs/D07_anexoOutros-action.html` · SHA-256 `9f9413e20884b24680269927744a2abbf407243127ba5087a1489fd91fc8153a`
- **[D08]** Solução de Consulta Cosit nº 127, de 27 de março de 2019 — Receita Federal - Sistema Normas (API)  
  Link oficial: <https://normasinternet2.receita.fazenda.gov.br/#/consulta/externa/99744/visao/multivigente>  
  Baixado em 2026-11-24T01:28:53-03:00 · arquivo local `docs/D08_rfb-99744-multivigente.json` · SHA-256 `3fc001f4bd305a1123a18056fa021769f6847ff65e242e8e1e631a87e187a19f`  
  ⚠ 1 anexo binário não baixado (o texto integral pode estar neles): as URLs estão no fim do texto e no campo 'anexos'; baixe com 'legal.py baixar' os que a pesquisa citar
- **[D09]** SC Cosit nº 127-2019 Publicação — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://normasinternet2.receita.fazenda.gov.br/api/consulta-externa/ato/99744/anexo/51835>  
  Baixado em 2026-11-24T01:29:08-03:00 · arquivo local `docs/D09_51835.pdf` · SHA-256 `7833af6a5a580426fdd95f4cb07d3f41269f38d54dfbb9cb19ce8494d23cbbea`
- **[D10]** Solução de Consulta Disit/SRRF01 nº 1011, de 12 de agosto de 2019 — Receita Federal - Sistema Normas (API)  
  Link oficial: <https://normasinternet2.receita.fazenda.gov.br/#/consulta/externa/105154/visao/multivigente>  
  Baixado em 2026-11-24T01:31:29-03:00 · arquivo local `docs/D10_rfb-105154-multivigente.json` · SHA-256 `95c4e98e4bf686327658a0ba9dea367c93cab4c115f4d11f86e448d91374b6b2`
- **[D11]** Lei Complementar nº 116 de 31/07/2003 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/ae234474cd3e1e3f6e871eaa102aeb862ec17541/federal/leis-complementares/2003/lcp-116-2003-07-31.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei.complementar:2003-07-31;116> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-11-24T01:31:42-03:00 · arquivo local `docs/D11_lcp-116-2003-07-31.md` · SHA-256 `ee5663cd6f75d06dc795b4b9b49b52e4a9d7ad9c2575d817375088a5ed3098b9`
- **[D12]** Lcp 123 — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm>  
  Baixado em 2026-11-24T01:33:33-03:00 · arquivo local `docs/D12_lcp123-htm.html` · SHA-256 `090781a7a5d9b5221bd6ebe1774f14d871dfca633ec4707cf610305a702cdb58`  
  ⚠ há captura de 2026-10-17 (verif-2026-10-17-simples-mei D13), mas o texto dela não foi guardado
- **[D13]** Lei nº 12.592 de 18/01/2012 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/a31cf3cd12073c7b195933a53e733b85c00cfe02/federal/leis-ordinarias/2012/lei-12592-2012-01-18.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:2012-01-18;12592> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-11-24T01:48:30-03:00 · arquivo local `docs/D13_lei-12592-2012-01-18.md` · SHA-256 `ae4c4aae44ba1bd08493c05fd82e366cdd2f3bf263b93383f93b1f936541fd00`

## Registro de buscas
_Nenhuma busca registrada._
