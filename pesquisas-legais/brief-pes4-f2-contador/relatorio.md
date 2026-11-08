# Relatório de pesquisa legal — brief-pes4-f2-contador

**Pergunta:** fechar por norma e por cálculo as perguntas do F2 (motor mensal da folha, nó PES-4) que iriam ao contador,
para que ao contador só vá o ambíguo. Base: `docs/accounting/BE-INCR-DP-F2-brief.md` §4 (F-DPF-1, 2, 3, 6, 7, 8, 10), §5,
item 23 (rubricas), item 46 (goldens) e o dossiê anterior `pesquisas-legais/brief-pes4-f2/` (não refeito aqui).
**Aberto em:** 2026-11-06 · **Autor:** agente (subagente de pesquisa), branch `claude/dp-f2-forks-decididos`, sem commit.
**Método:** `docs/operating-manual/VERIFICACAO-LEGAL.md`. O `legal.py` **não existe nesta máquina**
(`~/.claude/tools/pesquisa-legal/` ausente): o acervo ctresb/leis foi lido por `raw.githubusercontent.com` e a fonte
oficial por curl; os arquivos ficaram em `docs/` com SHA-256 (lista no fim). Planalto respondeu "Acesso Negado" a curl
e a WebFetch; o DOU (in.gov.br) recusou a conexão. Não houve browser embutido nesta sessão.

## Resumo

| # | Questão | Situação | Uma linha |
|---|---|---|---|
| 1 | F-DPF-1 divisor | **ambíguo** | A decisão do dono (min/dia × 30 → 240 para 40 h/5 dias) é a **letra do CLT art. 64**; a **Súm. 431 diz 200 para 40 h** sem distinguir a escala. Depois da EC 141 a lógica da 431 dá 240, mas o art. 2º da EC (sem redução "de qualquer espécie") é um risco: a hora fica menor que a de 220. |
| 2 | F-DPF-2 dias do DSR | resolvido a partir de 16/12/2026; **ambíguo antes** | Desde 16/12/2026, CF art. 7º XV: 2 dias de repouso remunerado, logo (a) segue a letra. Antes disso, numa escala 5×2, o sábado é dia útil não trabalhado (Lei 605 art. 1º: um repouso de 24 h), e não repouso. |
| 3 | F-DPF-3 arredondamento do INSS | resolvido pelo eSocial; **contradiz a decisão do dono** | Nenhuma lei fala em arredondamento. O MOS do S-5001, item 2.13, diz: duas casas, **truncamento em cada faixa** da tabela progressiva. A decisão (a), meio-para-cima só no total, diverge dele em 1 a 3 centavos. |
| 4 | F-DPF-6 piso proporcional | resolvido (inferido) | OJ 358 SDI-1: piso proporcional é lícito em qualquer jornada contratada abaixo do limite constitucional, não só no tempo parcial. EC 141 art. 2º, parágrafo único, e art. 4º: a redução da jornada pela EC não reduz piso. A decisão (a) é mais restritiva que a OJ, e isso é seguro. |
| 5 | IN RFB 2.110/2022, mais de um vínculo | resolvido; **muda o item 78 do BRIEF** | Arts. 36 e 49 § 2º II "a": cada empregador, **na ordem da declaração do segurado (Anexo VIII)**, aplica as alíquotas continuando das faixas já tributadas nos anteriores, até o teto. A conta é feita sobre a **remuneração** dos anteriores, não sobre a contribuição deles. |
| 6 | IN SRF 15/2001, adiantamento | resolvido; **a IN SRF 15 foi revogada** | Foi revogada pela IN RFB 1.500/2014 art. 114. A regra vigente é a IN 1.500 art. 63: não se retém no adiantamento se o mês for todo pago no próprio mês. Se não for (§ 1º), o imposto se calcula **de imediato sobre o adiantamento**. Pela regra de hoje, a pendência bloqueante do F-DPF-10 não precisa existir. |
| 7 | Salário-família 2026 | resolvido (órgão) | A partir de 01/01/2026: remuneração até **R$ 1.980,38**, cota de **R$ 67,54** por filho (Portaria Interministerial MPS/MF 13/2026). Lido no INSS; o texto da Portaria no DOU não foi lido (a conexão falhou). |
| 8 | Dec. 3.048 art. 75, nova incapacidade | resolvido (texto do decreto alterador) | Mesmo motivo dentro de 60 dias da cessação do benefício: a empresa **não paga** de novo os 15 dias, porque o benefício anterior é prorrogado (§ 3º). Afastamento de até 15 dias, retorno e novo afastamento em 60 dias: o auxílio começa no novo afastamento (§§ 4º e 5º). |
| 9 | Rubricas S-1010 | proposta com fonte; **5 pontos ambíguos** | Tabela 03 e domínios do S-1010 (S-1.3, NT 07/2026). Achado: a natureza 1002 (DSR) **acabou em 30/04/2024**, então use 1012. Achado: **falta a rubrica do salário-família** (1409, CP 51) entre as 18. |
| 10 | Goldens item 46 | calculados pelo agente; **conferência externa pendente** | São 11 cenários com a conta linha a linha (§10). G9 mostra que o IRRF de dois vínculos do mesmo empregador **soma no mês**: B retém R$ 1.184,45, e não zero. |

**Só isto vai ao contador ou advogado** (o resto tem fonte):
1. **Advogado ou contador:** divisor do salário-hora depois de 16/12/2026. Os candidatos são 240 (CLT art. 64, decisão do dono) e 200 (letra da Súm. 431), à luz do art. 2º da EC 141. Pergunta: *"Com 2 dias de repouso remunerado e 8 h por dia, o divisor do mensalista de 40 h passa de 200 para 240? Isso conta como redução salarial vedada pelo art. 2º da EC 141, porque a hora fica menor que a de 220?"*
2. **Contador:** arredondamento do INSS. Pergunta: *"O desconto do INSS na folha pode ser arredondado no total, se o S-5001 calcula truncando por faixa? Ou alinhamos com o eSocial para não dar diferença entre vrDescSeg e vrCpSeg?"*
3. **Contador:** competência 12/2026 dividida em 1–15 (regra antiga) e 16–31 (2 repousos, 42 h). Pergunta: como o DSR e a hora extra se fatiam nela.
4. **Contador:** DSR sobre variáveis de escala 5×2 **antes** de 16/12/2026: o sábado não trabalhado é dia útil ou repouso?
5. **Contador:** o complemento até o mínimo do comissionista compara o mínimo com comissão + DSR (G4) ou só com a comissão (G4')?
6. **Contador:** os 5 enquadramentos ambíguos do §9: 15 dias de afastamento (1050 ou 1000), HE 100% (1003 ou 1012), adiantamento (enviado ou não, e com qual IRRF), salário-família (IRRF 79 ou 9) e incidências das faltas.
7. **Contador:** conferir os 11 goldens (§10), que viram `conferidoPor`.

---

## 1. F-DPF-1: divisor do salário-hora com a EC 141/2026

**Conclusão:** a decisão do dono (`DIAS_DE_TRABALHO_DA_ESCALA`: minutos por dia × 30, ou seja, 240 para 40 h/5 dias e 220 para 44 h/6 dias) **segue a letra do CLT art. 64**. Ela **diverge da letra da Súmula TST 431** (divisor 200 para 40 h). O ponto continua **ambíguo**.

- CLT art. 64 [dossiê anterior D02]: *"dividindo-se o salário mensal correspondente à duração do trabalho, a que se refere o art. 58, por 30 (trinta) vezes o número de horas dessa duração"*. O art. 58 é a duração **diária** (*"não excederá de 8 (oito) horas diárias"*). Com 8 h/dia dá 240; com 7h20 dá 220. **Verificado** (acervo compilado, cópia de 13/10/2026).
- CLT art. 64, parágrafo único: *"Sendo o número de dias inferiores a 30 (trinta), adotar-se-á [...] o de dias de trabalho por mês"*. Trata de meses com menos de 30 dias de trabalho, não da escala, e não muda a conclusão. Verificado.
- Súm. 431 [D16 anterior]: *"quando sujeitos a 40 horas semanais de trabalho, aplica-se o divisor 200"*. É de 2012, com um só repouso remunerado; ali o sábado era dia útil não trabalhado. Verificado (caderno consolidado do TST).
- EC 141 [D12 anterior]: art. 1º (CF art. 7º XIII com *"8 (oito) horas diárias e 40 (quarenta) horas semanais"* e XV com *"repouso semanal remunerado de 2 (dois) dias"*); art. 2º (*"sem qualquer redução salarial nominal, proporcional ou de qualquer outra espécie"*); art. 6º I (42 h a partir de 16/12/2026); art. 7º (só convenção ou acordo coletivo pode ampliar a duração diária para distribuir as 42 h); art. 10 I (o inciso XV vale 2 meses após a publicação). Verificado (Planalto, 05/11).
- **Regulamentação posterior:** nenhuma foi achada. A busca não foi exaustiva, porque o DOU ficou inacessível nesta sessão. Grau: assumido "sem regulamentação até 06/11".

**Inferências (sobre o texto lido):**
- A Súm. 431 contava 40 h de trabalho mais o DSR de um dia: 40/6 × 30 = 200. Com 2 dias de repouso remunerado, as horas pagas por semana são 40 + 2 × 8 = 56, e 56 × 30/7 = 240. A lógica da própria súmula, aplicada ao texto novo, dá 240. Inferido.
- **Risco do art. 2º:** quem tinha 44 h e divisor 220 passa a 40 h e divisor 240, então a hora usada na hora extra cai de S/220 para S/240 (−8,3%). O salário mensal não cai, mas a EC proíbe redução "de qualquer espécie". Inferido. É o ponto que leva ao advogado.
- **42 h em 5×2 só existe com norma coletiva:** a CF passa a ter 8 h/dia e 2 repousos, o que dá no máximo 5 × 8 = 40 h. As 42 h da transição exigem jornada diária acima de 8 h, e o art. 7º da EC só permite isso por CCT ou ACT. O golden de 2026-12 com "42 h, 5×2" (divisor 252) **pressupõe uma CCT**. Sem CCT, a pendência `JORNADA_ACIMA_DO_LIMITE` deveria olhar também o limite diário. Inferido.
- **12/2026 dividida:** de 1 a 15/12 vale 1 repouso e a linha antiga; de 16 a 31/12 valem 2 repousos e a linha nova. A hora extra de 1 a 15/12 usa a linha antiga (42/6 × 30 = 210 ou 44 h → 220). Inferido; vai ao contador (pergunta 3).

**Caso adversarial tentado:** "a Súm. 431 é vinculante e manda 200 para 40 h". Resultado: o texto da súmula não distingue escala e é anterior à mudança do art. 7º XV. Súmula de tribunal não revoga o CLT art. 64, mas é o que a Justiça do Trabalho aplica. Por isso o ponto é ambíguo e vai ao advogado, e não "resolvido a favor do dono".

## 2. F-DPF-2: dias úteis e de repouso no DSR sobre variáveis

**Conclusão:** **a partir de 16/12/2026**, a leitura (a) (dia útil = dia de trabalho da escala que não é feriado; os outros são repouso) segue a CF art. 7º XV com a redação da EC 141 (*"repouso semanal remunerado de 2 (dois) dias"*). Os dois dias são repouso remunerado. **Verificado** (texto) e **inferido** (aplicação à contagem).

- Lei 605 art. 7º "a" e "b" e Súm. 172: o DSR inclui as horas extras habituais [D01 e D14 anteriores]. Verificado. A fórmula "variáveis ÷ dias úteis × dias de repouso" é prática, não letra de lei: nenhum dispositivo lido a escreve. Grau: assumido como prática.
- **Antes de 16/12/2026** a Lei 605 art. 1º diz *"repouso semanal remunerado, de vinte e quatro horas consecutivas"*. Numa escala 5×2 vigente antes da EC, o sábado compensado é dia útil não trabalhado, e não repouso. A leitura (a), aplicada a competências anteriores a 12/2026 com escala 5×2, conta o sábado como repouso e dá DSR maior que o da prática. Inferido. Os goldens de 03/2026 usam escala 6×1 (horista e comissionista), onde as duas leituras coincidem, exceto o aprendiz 5×2, que não tem variável.
- A Lei 605 ainda não foi adaptada à EC; o art. 1º fala em um repouso de 24 h. A CF prevalece desde 16/12/2026. Inferido.

**Caso adversarial tentado:** EC art. 7º § 2º, regime compensatório com "na média 2 dias no mês". Resultado: a escala como dado cobre esse caso (dias de repouso contados no mês), sem mudar a fórmula.

## 3. F-DPF-3: arredondamento do INSS do segurado

**Conclusão:** nenhuma lei nem a IN RFB 2.110 fixa o arredondamento. A busca por "arredond" na IN 2.110 vigente não acha nada sobre o INSS. **O eSocial fixa: truncamento em cada faixa.**

- MOS S-1.3 (consolidado até a NO 12/2026) [`brief-pes4-f0-f1/docs/D11`], S-5001, item 2.13: *"Para efeito de apuração dos valores tributados são consideradas duas casas decimais sem arredondamentos. O truncamento é realizado em todos os cálculos dos eventos totalizadores, inclusive em cada uma das faixas de alíquota da tabela progressiva."* **Verificado.**
- IN 2.110 art. 35 II [S03]: alíquotas aplicadas "de forma progressiva", sem regra de centavo. Verificado.
- O S-5001 devolve `vrCpSeg` (o que o eSocial calcula) ao lado de `vrDescSeg` (o que a folha descontou) (MOS, S-5011 itens 2.1 e 2.2). Que efeito a diferença tem na DCTFWeb **não foi lido**. Grau: aberto.
- **Contradiz a decisão do dono:** (a) "soma exata, um arredondamento meio-para-cima no total" não é a conta do eSocial. Nos goldens: R$ 3.000,00 dá 248,60 por (a) e 248,58 pelo eSocial; R$ 6.000,00 dá 641,51 contra 641,50. A diferença chega a 2 centavos no G1. O BRIEF dizia "máximo 1 centavo por faixa", e isso confere: há 3 faixas com fração. A forma "trunca por faixa" já cabe como **valor** da linha `ARREDONDAMENTO` (item 65), se o código tiver as duas formas. Vai ao contador (pergunta 2), com a recomendação de alinhar ao eSocial.

**Caso adversarial tentado:** "o MOS só vale para os totalizadores, não para a folha". O texto diz "eventos totalizadores", mas é exatamente o cálculo contra o qual o desconto da folha é comparado. Não há norma que obrigue o empregador a truncar; daí a pergunta ao contador.

## 4. F-DPF-6: piso proporcional com jornada menor

**Conclusão:** piso proporcional à jornada contratada menor é lícito também fora do tempo parcial. A decisão (a), proporção só no tempo parcial, é **mais conservadora** que a lei e não contraria norma. Depois da EC 141, a referência da proporção passa a ser o limite vigente, e a redução de jornada feita pela EC não reduz piso. **Inferido** sobre textos verificados.

- OJ 358 SDI-1, I [S06, acervo]: *"Havendo contratação para cumprimento de jornada reduzida, inferior à previsão constitucional de oito horas diárias ou quarenta e quatro semanais, é lícito o pagamento do piso salarial ou do salário mínimo proporcional ao tempo trabalhado."* Verificado (redação de 2016, anterior à EC).
- CLT art. 58-A § 1º [D02 anterior]: no tempo parcial, salário *"proporcional à sua jornada"*. Verificado.
- EC 141 art. 2º, parágrafo único: *"A irredutibilidade salarial [...] aplica-se inclusive aos pisos salariais"*. Art. 4º: jornadas já ≤ 40 h não sofrem *"redução proporcional"*. Art. 3º: cláusulas de CCT incompatíveis perdem efeito 2 meses depois. Verificado.
- Leitura: o piso da CCT, antes pago por 44 h, passa a pagar 42 h (e depois 40 h) inteiro. Quem tem 30 h recebe piso × 30/limite vigente, que é mais que × 30/44. É o que o BRIEF já diz ("o divisor da proporção vira o limite vigente"). Inferido.
- **O que não se resolve sem a CCT real:** se a convenção fixa o piso para uma jornada própria (ex.: "piso para 220 h"), a referência é a da cláusula até ela perder efeito pelo art. 3º. Depende de dado externo (L-PES-7), não de pergunta.

**Caso adversarial tentado:** "a OJ 358 cita 44 h e caducou com a EC". Resultado: a OJ fala em "previsão constitucional", e a previsão mudou. A leitura atualizada troca 44 pelo limite vigente; a OJ não proíbe a proporção.

## 5. IN RFB 2.110/2022: segurado com mais de um vínculo

Fonte: SIJUT, **visão vigente** (compilada, alterações até a IN RFB 2.321/2026, vigência de 14/04/2026) [S03]. **Verificado.**

- **Quem informa e que documento serve:** art. 36 caput: o segurado *"deverá comunicar a todos os seus empregadores, mensalmente, a remuneração recebida até o limite máximo"*. § 1º: por **declaração no modelo do Anexo VIII**, com: I, os empregadores *"discriminados na ordem em que efetuaram ou efetuarão o desconto"*; II, o valor sobre o qual é descontada a contribuição ou a declaração de que atingiu o teto; III, nome e CNPJ (ou CPF) de quem desconta. § 2º: quem ganha acima do teto todo mês pode fazer uma declaração para várias competências do exercício. Art. 49 § 3º: a empresa arquiva a declaração ou os comprovantes pelo prazo decadencial.
- **Quem desconta o quê (desde 03/2020):** art. 49 § 2º II "a": *"cada empregador informado na declaração [...] aplicará as alíquotas sobre a remuneração devida ao segurado, observadas as faixas já tributadas nas empresas anteriores, até o limite máximo do salário de contribuição"*. Se houver remuneração como contribuinte individual (§ 2º II "b" e § 6º), ela entra **só para o teto, não para o enquadramento nas faixas**. § 4º: cada fonte informa à RFB os múltiplos vínculos (no eSocial, o grupo `infoMV`).
- eSocial (leiaute S-1.3 [`brief-pes4-f0-f1/docs/D09`]; MOS S-5001, itens 2.3 e 2.4): `infoMV/indMV` 1, 2 ou 3, e `remunOutrEmpr` com `tpInsc`, `nrInsc`, `codCateg` e o valor da remuneração de outra empresa. O eSocial calcula "levando em consideração a remuneração informada pelo declarante e as faixas de alíquotas já tributadas nos declarantes anteriores". Verificado.

**O que muda no BRIEF (inferido; não editei o BRIEF):**
- O item 78 diz "INSS(soma) − `contribuicaoCents` informada". A IN manda outra conta: INSS(remuneração anterior + a daqui) − INSS(remuneração anterior), **só para os empregadores anteriores na ordem da declaração**. Se esta empresa é a **primeira** da ordem, ela desconta sobre a própria remuneração desde a faixa 1, e a remuneração da outra não entra. As duas contas coincidem só quando a outra empresa é anterior e descontou certo.
- O item 77 precisa de mais dois campos: a **ordem** (antes ou depois desta empresa) e a **categoria** da outra fonte (empregado ou contribuinte individual, porque o CI só conta para o teto). O eSocial também pede `tpInsc`, `nrInsc` e `codCateg`. A `contribuicaoCents` não é usada pela regra; serve só de conferência.
- O item 5 (`jaContribuidoCents`) deve receber a **base** já tributada nos anteriores, não o valor já contribuído, para a faixa continuar de onde parou. Vale também para o item 41 (vínculos da mesma instância).

**Caso adversarial tentado:** "o § 2º II "a" vale só para o doméstico". Resultado: o caput do § 2º cobre *"segurado empregado, trabalhador avulso ou contribuinte individual que presta serviços remunerados a mais de uma empresa"*. Vale para todos.

## 6. IRRF sobre adiantamento (IN SRF 15/2001)

**Conclusão:** a IN SRF 15/2001 **foi revogada** pela IN RFB 1.500/2014 art. 114 (*"Ficam revogadas a Instrução Normativa SRF nº 15, de 6 de fevereiro de 2001, [...]"*). A regra vigente é a **IN RFB 1.500/2014 art. 63** [S04, SIJUT visão vigente, alterações até a IN 2.191/2024]. **Verificado.**

- Caput: *"O adiantamento de rendimentos correspondentes a determinado mês não está sujeito à retenção, desde que os rendimentos sejam integralmente pagos no próprio mês a que se referirem, momento em que são efetuados o cálculo e a retenção do imposto sobre o total dos rendimentos pagos no mês."*
- § 1º: *"Se o adiantamento se referir a rendimentos que não sejam integralmente pagos no próprio mês, o imposto será calculado de imediato sobre esse adiantamento [...]"*.
- § 2º: é adiantamento qualquer valor fornecido sem previsão cumulativa de encargos, forma e prazo de pagamento.

**Efeito no F-DPF-10 (inferido):** o caso "mesmo mês" da decisão (a) está certo. O caso "mês diferente", em que hoje a pendência bloqueia, **tem regra**: IRRF calculado sobre o adiantamento na data dele, e a mensal paga no mês seguinte entra no IRRF desse mês, somando o que a mesma fonte pagou nele (Lei 7.713 art. 7º § 1º; o item 8 do BRIEF já monta `rendimentoMesAntes`). Esse é o caso **comum**: salário pago até o 5º dia útil do mês seguinte. Com a pendência, quase toda competência travaria. A troca é de forma de regra, então é decisão do dono, não minha.

**Caso adversarial tentado:** "a IN 1.500 também foi revogada". Resultado: a consulta SIJUT de 06/11 marca `vigente=True`, com última alteração pela IN 2.191/2024.

## 7. Salário-família de 2026

**Conclusão:** a partir de 01/01/2026, remuneração mensal até **R$ 1.980,38**, cota de **R$ 67,54** por filho ou equiparado, com base na **Portaria Interministerial MPS/MF nº 13, de 9 de janeiro de 2026**.

- Fonte: INSS, "Valor limite para direito ao salário-família", atualizado em 06/02/2026 [S01]. A página também diz: *"Considera-se remuneração mensal do segurado o valor total do respectivo salário de contribuição, ainda que resultante da soma dos salários de contribuição correspondentes a atividades simultâneas"* e *"Caso o valor da remuneração mensal ultrapasse a faixa máxima, o trabalhador não terá direito"*. Grau: **verificado em órgão oficial**. O texto da Portaria no DOU **não foi lido**: in.gov.br recusou a conexão (`PROTOCOL_ERROR` e "Empty reply"). É a mesma Portaria que dá a tabela do INSS de 2026, já usada no F1.
- Efeito: a premissa do F-DPF-7 ("sem a cota de 2026") deixa de valer quando a linha `SALARIO_FAMILIA` entrar por PR de dado com esta fonte. A remuneração que define o direito é o salário de contribuição **somado de todos os vínculos**, o que liga este ponto aos itens 41 e 77.
- Não lido: a proporcionalidade da cota no mês de admissão ou desligamento (Dec. 3.048, Planalto bloqueado). Fica aberto.

## 8. Dec. 3.048/1999 art. 75: novo afastamento pela mesma doença

Fonte: a redação do art. 75 dada pelo **Dec. 10.410/2020**, no acervo [S05] (`versao_texto: original`, cópia de 15/10/2026). O Dec. 3.048 **não está no acervo**: os caminhos `federal/decretos/1999/dec-3048-*` dão 404, e o RPS está na fase 1 pendente do PROGRESSO.md. A compilada do Planalto foi bloqueada, e normas.leg.br só tem a publicação original de 1999. Grau: **verificado no decreto alterador; sem conferência de alteração posterior a 2020** (risco baixo, anotado).

- Caput: *"Durante os primeiros quinze dias consecutivos de afastamento [...] compete à empresa pagar o salário ao segurado empregado."*
- § 3º: *"Se concedido novo benefício decorrente do mesmo motivo [...] no prazo de sessenta dias, contado da data da cessação do benefício anterior, a empresa ficará desobrigada do pagamento relativo aos quinze primeiros dias de afastamento, prorrogando-se o benefício anterior"*.
- § 4º: afastou-se por até 15 dias, voltou no 16º e se afastou de novo pelo mesmo motivo em até 60 dias do retorno: *"fará jus ao auxílio [...] a partir da data do novo afastamento"*.
- § 5º: se voltou antes de completar os 15 dias, o auxílio começa *"a partir do dia seguinte ao que completar aquele período"*.

**Leitura para o motor (inferido):** na janela de 60 dias e mesmo motivo, a empresa paga no máximo 15 dias ao todo. Os dias já pagos no afastamento anterior abatem, e o restante até 15 fica com ela. O "mesmo motivo" depende do CID e da perícia, então é dado informado (S-2230), não cálculo.

## 9. Rubricas para o S-1010

Fontes: Tabela 03 (naturezas), Tabela 21 (IRRF) e domínios `codIncCP`/`codIncFGTS` do S-1010, leiaute S-1.3 com a NT 07/2026 rev. 20/10/2026 [`brief-pes4-f0-f1/docs/D10` e `D09`]. Regra de base do MOS S-5001, item 1.2 "a": as rubricas de desconto com a mesma incidência **subtraem** da base. A tabela abaixo é **proposta do agente** (enquadramento é do contador). As 6 do F1 estão em `server/src/features/dp/models/rubricas/catalogo.ts`.

| Rubrica | Tipo | Natureza (Tab. 03) | CP | IRRF | FGTS | Grau / observação |
|---|---|---|---|---|---|---|
| SALARIO_BASE (F1) | P | 1000 Salário | 11 | 11 | 11 | já no código; confere |
| BOLSA_ESTAGIO (F1) | P | 1350 Bolsa de estudo, estagiário | 00 | 11 | 00 | confere; 901 só aceita CP 00/01 e FGTS 00 (D09, validação 4) |
| PRO_LABORE (F1) | P | 3508 | 11 | 11 | 00 | confere |
| INSS_SEGURADO (F1) | D | 9201 | 31 | 41 | 00 | confere |
| IRRF (F1) | D | 9203 | 00 | 31 | 00 | confere |
| FGTS_MES (F1) | I | 9908 | 00 | 9 | 00 | confere |
| HORA_EXTRA_50 | P | 1003 Horas extraordinárias | 11 | 11 | 11 | inferido |
| HORA_EXTRA_100 | P | 1003, ou **1012 (c)** se for trabalho em repouso ou feriado | 11 | 11 | 11 | **ambíguo**: a 1012 (c) é *"devidos a trabalhadores que prestaram serviços nos dias de repouso semanal e feriado"* |
| ADICIONAL_NOTURNO | P | 1205 | 11 | 11 | 11 | inferido |
| DSR_VARIAVEIS | P | **1012** (b) DSR e feriado | 11 | 11 | 11 | verificado: a **1002 terminou em 30/04/2024** (D10, linha 187) |
| COMISSAO | P | 1207 Comissões, porcentagens, produção | 11 | 11 | 11 | inferido |
| FALTAS | D | 9207 Faltas | 11 | 11 | 11 | inferido: subtrai das bases (MOS 1.2 "a"); confirmar |
| DSR_PERDIDO | D | 9211 DSR sobre faltas | 11 | 11 | 11 | inferido |
| COMPLEMENTO_MINIMO | P | 1099 Outras verbas salariais | 11 | 11 | 11 | inferido: a 4011 é só RPPS |
| COMPLEMENTO_PISO | P | 1099 | 11 | 11 | 11 | inferido |
| AFASTAMENTO_EMPRESA_15D | P | **1050** Remuneração de dias de afastamento | 11 | 11 | 11 | **ambíguo**: 1050 (*"afastado do trabalho sem prejuízo de sua remuneração"*) ou 1000 |
| ADIANTAMENTO | P | 5501 Adiantamento de salário | 00 | 9 (mesmo mês) / 11 (IN 1.500 art. 63 § 1º) | 00 | **ambíguo**: se vai no S-1200 e com qual IRRF |
| DESCONTO_ADIANTAMENTO | D | 9200 Desconto de adiantamentos | 00 | 9 | 00 | inferido |
| **SALARIO_FAMILIA (falta na lista)** | P | 1409 Salário-família | **51** | 79 (isento, RIR art. 35 I "g") ou 9 | 00 | **achado**: o F-DPF-7 calcula o benefício, mas não há rubrica; o CP 51 alimenta o `tpValor` 31 do S-5001 |

Caso adversarial tentado: rubrica de 723/901 com CP em [25, 26, 51], que o item 52 do F1 veda. As novas são só para 101/103, então não colidem. O SALARIO_FAMILIA (CP 51) não pode ter 723 nem 901 em `categorias`.

## 10. Goldens do item 46 (calculado pelo agente, conferência externa pendente)

**Tabelas usadas** (todas com pagamento em 2026):
- INSS 2026: 7,5% até 1.621,00; 9% até 2.902,84; 12% até 4.354,27; 14% até o teto de 8.475,55 [`brief-pes4-f0-f1/docs/D07`, Portaria Interministerial 13/2026].
- Salário mínimo de R$ 1.621,00 (mesma fonte).
- IRRF mensal desde 05/2025: faixa zero até 2.428,80; depois 7,5% (−182,16), 15% (−394,16), 22,5% (−675,49) e 27,5% (−908,73).
- Redução do art. 3º-A desde 01/2026: zera o imposto até R$ 5.000; até R$ 7.350, 978,62 − 0,133145 × rendimento.
- Dependente: R$ 189,59. Desconto simplificado: R$ 607,20.
- As linhas do IRRF já estão em `legal_parameters_retencoes_v1.sql`, conferidas no dossiê `pesquisas-legais/retencoes-fonte-pr1-reinf-tabelas/` (não refeito).
- Atenção: o art. 3º-A **não aparece** na cópia do acervo da Lei 9.250 (13/10) usada no dossiê anterior. A cópia está velha nesse artigo; a fonte é o Planalto, conferido naquele dossiê.
- FGTS: 8%, e 2% para o aprendiz.

**Como as contas foram feitas:**
- Valores intermediários com meio-para-cima ao centavo. O INSS sai em três formas: (a) total meio-para-cima (decisão do dono), eSocial (trunca por faixa) e meio-para-cima por faixa.
- Março de 2026 tem 31 dias, começa num domingo e não tem feriado nacional: 5 domingos e 26 dias de segunda a sábado (conferido com `python3 -I`).
- As entradas são propostas do agente (o BRIEF só nomeia os cenários).

**G1. Mensalista simples, 03/2026, salário R$ 3.000,00, 0 dependente, pago em 31/03 ou 05/04/2026**
- INSS: 1.621,00 × 7,5% = 121,5750; (2.902,84 − 1.621,00) × 9% = 115,3656; (3.000,00 − 2.902,84) × 12% = 11,6592. Soma 248,5998, que dá **248,60** por (a), 248,58 pelo eSocial e 248,61 por faixa meio-para-cima.
- IRRF: o simplificado (607,20) é maior que o INSS, então base = 3.000,00 − 607,20 = 2.392,80, na faixa zero: **0,00**.
- FGTS: 3.000 × 8% = **240,00**.
- **Líquido: 2.751,40.**
- Com 2 dependentes: a dedução legal é 379,18 + 248,60 = 627,78; base 2.372,22; IRRF 0; mesmo líquido.

**G2. Admissão em 15/03/2026, salário R$ 3.000,00 (F-DPF-4 (a))**
- Dias = 30 − 15 + 1 = 16, então salário = 3.000 × 16/30 = **1.600,00**. Em dias corridos seria 17/31 × 3.000 = 1.645,16.
- INSS: 1.600 × 7,5% = **120,00**. IRRF: base 992,80, então **0**. FGTS: **128,00**.
- **Líquido: 1.480,00.**

**G3. Horista, R$ 15,00/h, escala 6×1 de 7h20 (440 min), 10 h de HE 50%, 20 h de relógio noturnas**
- Normais: 26 × 440 min = 190h40 × 15 = **2.860,00**.
- DSR do horista (Lei 605 art. 7º "b"): 5 × 7h20 × 15 = **550,00**.
- HE: 10 × 15 × 1,5 = **225,00**.
- Noturno: 20 h × 60/52,5 = 22,857143 h noturnas × 15 × 20% = **68,57**.
- DSR sobre as variáveis: (225,00 + 68,57)/26 × 5 = 56,4558, que dá **56,46**.
- Bruto: **3.760,03**.
- INSS: 121,5750 + 115,3656 + (3.760,03 − 2.902,84) × 12% = 102,8628. Total 339,8034, que dá **339,80** por (a) e 339,79 pelo eSocial.
- IRRF: base 3.760,03 − 607,20 = 3.152,83; × 15% − 394,16 = 78,76. A redução do art. 3º-A (rendimento ≤ 5.000) leva o imposto a **0,00**.
- FGTS: **300,80**.
- **Líquido: 3.420,23.**

**G4. Comissionista, comissão R$ 1.200,00, escala 6×1**
- DSR: 1.200/26 × 5 = 230,7692, que dá **230,77** (Súm. 27).
- Complemento até o mínimo: 1.621,00 − (1.200,00 + 230,77) = **190,23**.
- Bruto: **1.621,00**.
- INSS: **121,58** por (a) (121,5750; o eSocial dá 121,57). IRRF: **0**. FGTS: **129,68**.
- **Líquido: 1.499,42.**
- Variante G4', em que o mínimo se compara só com a comissão: complemento 421,00; bruto 1.851,77; INSS 142,34 (eSocial 142,33); FGTS 148,14; líquido 1.709,43. **Ambíguo** (pergunta 5 ao contador): o CLT art. 78, parágrafo único, garante "o salário mínimo", e o mínimo mensal já remunera o repouso, o que favorece G4 (inferido).

**G5. Afastamento por doença de 10/03 a 20/04/2026, mensalista de R$ 3.000,00**
- Março:
  - saldo de 1 a 9/03: 9/30 × 3.000 = **900,00**;
  - `AFASTAMENTO_EMPRESA_15D` de 10 a 24/03: 15/30 × 3.000 = **1.500,00** (Lei 8.213 art. 60 § 3º; Dec. 3.048 art. 75);
  - de 25/03 em diante o benefício é do INSS (fora da folha).
  - Bruto **2.400,00**. INSS: 121,5750 + (2.400 − 1.621) × 9% = 70,11, total **191,69** (eSocial 191,68). IRRF **0**. FGTS **192,00**. **Líquido 2.208,31.**
- Abril:
  - de 1 a 20/04 é INSS; retorno em 21/04 (feriado, mas é dia de salário no mês comercial): 10/30 × 3.000 = **1.000,00**.
  - INSS **75,00**. IRRF **0**. FGTS **80,00**. **Líquido 925,00.**
- Sem FGTS no período pago pelo INSS: o afastamento é por doença comum, e o FGTS do afastamento (natureza 9932) é só para acidente de trabalho (inferido).

**G6. Aprendiz, 20 h/semana em 5 dias, 03/2026 (antes da EC, linha `SEMANA_SEIS_DIAS`)**
- Horas no mês: 20/6 × 30 = 100 h. Mínimo-hora: 1.621/220 = 7,368182. Salário = 1.621 × 100/220 = **736,82** (CLT art. 428 § 2º).
- Pelo divisor da escala (4 h × 30 = 120 h) seriam 884,18. É o mesmo dilema do §1, aplicado ao aprendiz.
- INSS: **55,26**. IRRF: **0**. FGTS: 2% = **14,74**.
- **Líquido: 681,56.**

**G7. Estagiário, bolsa R$ 1.000,00**
- INSS e FGTS: 0 (Lei 11.788 art. 12 § 2º). IRRF: base 392,80, então **0**.
- **Líquido: 1.000,00.**

**G8. Pró-labore (723) de R$ 10.000,00, acima do teto**
- INSS de contribuinte individual: 11% × 8.475,55 = 932,3105, que dá **932,31** (igual por (a) e pelo eSocial).
- IRRF: dedução legal 932,31; base 9.067,69; × 27,5% = 2.493,61 − 908,73 = **1.584,88**. Sem redução, porque o rendimento passa de 7.350.
- FGTS: 0.
- **Líquido: 7.482,81.**

**G9. Dois vínculos 101 do mesmo CPF na mesma empresa: A de R$ 6.000,00 (o primeiro), B de R$ 4.000,00**
- INSS de A: 121,5750 + 115,3656 + 174,1716 + (6.000 − 4.354,27) × 14% = 230,4022. Total 641,5144, que dá **641,51** (eSocial 641,50).
- INSS de B, continuando as faixas a partir de 6.000 até o teto (IN 2.110 art. 49 § 2º II "a"): (8.475,55 − 6.000,00) × 14% = 346,577, que dá **346,58** (eSocial 346,57).
- Conferência: A + B = 988,09 = INSS sobre o teto.
- **IRRF:** a mesma fonte soma os pagamentos do mês (Lei 7.713 art. 7º § 1º [D06 anterior]; IN 1.500 art. 59 § 2º para matriz e filial [S04]).
  - A, pago primeiro: base 6.000 − 641,51 = 5.358,49; × 27,5% − 908,73 = 564,85; redução 978,62 − 0,133145 × 6.000 = 179,75; retém **385,10**.
  - B: total do mês 10.000; deduções do mês 988,09; base 9.011,91; × 27,5% − 908,73 = 1.569,55; sem redução (rendimento > 7.350); B retém 1.569,55 − 385,10 = **1.184,45**.
  - Se o motor calcular B sozinho, a retenção sai **0,00**, errada.
  - Nota de implementação (inferida): o `calcularIrrfPf` deduz `previdenciaCents` do **total** do mês. O adaptador do item 8 deve passar a previdência acumulada do mês (A + B), não só a de B, e contar os dependentes uma vez.
- FGTS: A 480,00; B 320,00.
- Líquidos: A **4.973,39**; B 4.000 − 346,58 − 1.184,45 = **2.468,97**.

**G10. Adiantamento de 40% e desconto na mensal, salário R$ 3.000,00**
- Adiantamento de 3.000 × 40% = **1.200,00**, pago em 20/03, sem INSS e sem FGTS. IRRF 0 (IN 1.500 art. 63 caput; mensal paga em 31/03).
- Mensal: bruto 3.000,00; INSS **248,60**; IRRF **0**; `DESCONTO_ADIANTAMENTO` 1.200,00; FGTS 240,00. **Líquido: 1.551,40.**
- Variante com a mensal paga em 06/04: o IRRF sobre o adiantamento isolado sai 0 (base abaixo da faixa zero), e o saldo entra no IRRF de abril, somado aos pagamentos de abril da mesma fonte (art. 63 § 1º).

**G11. 12/2026, salário R$ 3.000,00, escala 5×2 de 42 h (504 min/dia; pressupõe CCT, ver §1), 10 h de HE depois de 16/12, pagamento em 30/12/2026**
- Fatia de 16 a 31/12: 11 dias úteis e 5 de repouso (fins de semana e 25/12).
- Divisor 252 (escala, decisão do dono):
  - hora 11,904762; HE 10 × 1,5 = **178,57**; DSR 178,57/11 × 5 = **81,17**; bruto **3.259,74**;
  - INSS **279,77** (eSocial 279,75); IRRF 0 (redução do art. 3º-A); FGTS **260,78**;
  - **líquido 2.979,97**.
- Divisor 210 (seis dias):
  - hora 14,285714; HE **214,29**; DSR **97,40**; bruto **3.311,69**;
  - INSS **286,00** (eSocial 285,99); IRRF 0; FGTS **264,94**;
  - **líquido 3.025,69**.
- Com DSR pelo mês inteiro (22 dias úteis e 9 de repouso), seria 73,05, o que mostra o efeito do fatiamento (pergunta 3).

**Golden de troca de regra (item 47):** o mesmo G1 com `HE_ADICIONAL_BP` = 6000 não muda o G1, que não tem HE. Para o teste valer, ele precisa de um vínculo com HE: use o G3, em que a HE vira 10 × 15 × 1,6 = 240,00. O resto se recalcula pelo mesmo roteiro. Não fechei a conta inteira; fica ao executor.

**Caso adversarial tentado nos goldens:** cada INSS foi recalculado nas três formas de arredondamento, e o G9 foi conferido pela soma A + B = INSS do teto (988,09). Uma checagem que teria falhado se o IRRF de dois vínculos não somasse: o G9 dá 0,00 contra 1.184,45.

---

## Fontes desta rodada (arquivos em `docs/`)
| Id | Norma ou página | Origem | Versão | SHA-256 |
|---|---|---|---|---|
| S01 | INSS: valor limite do salário-família (.html/.txt) | <https://www.gov.br/inss/pt-br/direitos-e-deveres/salario-familia/valor-limite-para-direito-ao-salario-familia> (atualizado em 06/02/2026) | página do órgão | html `5e17cee6…71d9d9` |
| S03 | IN RFB 2.110/2022 (.json/.txt) | SIJUT `https://normasinternet2.receita.fazenda.gov.br/api/consulta-externa/ato/126687/visao/vigente` (link legado `normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=126687`) | **vigente** (alterações até a IN 2.321/2026) | json `2968feac…6604cb` |
| S04 | IN RFB 1.500/2014 (.json/.txt) | SIJUT `…/api/consulta-externa/ato/57670/visao/vigente` | **vigente** (até a IN 2.191/2024) | json `51f901af…a4f8d2` |
| S05 | Dec. 10.410/2020 (nova redação do RPS art. 75) | acervo `federal/decretos/2020/dec-10410-2020-06-30.md`; fonte `https://normas.leg.br/?urn=urn:lex:br:federal:decreto:2020-06-30;10410` | original; cópia de 15/10/2026 | `979e1a42…a0cc1` |
| S06 | OJ 358 SDI-1 do TST | acervo `jurisprudencia/tst/orientacoes-jurisprudenciais/oj-sdi1-358.md` | caderno consolidado; cópia de 15/10/2026 | `2bd991f3…` |

**Reaproveitado sem nova leitura:**
- `pesquisas-legais/brief-pes4-f2/docs/`: D01 (Lei 605), D02 (CLT), D06 (Lei 7.713), D11 (RIR art. 35), D12 (EC 141) e D14/D16 (Súm. 172/431).
- `pesquisas-legais/brief-pes4-f0-f1/docs/`: D07 (tabela do INSS de 2026), D09 (leiaute S-1.3), D10 (tabelas do eSocial) e D11 (MOS consolidado até a NO 12/2026).
- `pesquisas-legais/retencoes-fonte-pr1-reinf-tabelas/`: tabela do IRRF e redução do art. 3º-A.

**Não lidos (bloqueio):**
- Dec. 3.048/1999 compilado: o Planalto deu "Acesso Negado" e não está no acervo.
- Portaria Interministerial MPS/MF 13/2026 no DOU: in.gov.br recusou a conexão.
- Efeito da diferença `vrDescSeg` × `vrCpSeg` na DCTFWeb: não pesquisado.
- Regulamentação da EC 141 depois de 16/10/2026: nenhuma achada; busca limitada.

**Limite:** todo cálculo deste relatório é do agente e **não substitui a conferência do contador** (oráculo externo). Os goldens ficam `conferidoPor: null`.
