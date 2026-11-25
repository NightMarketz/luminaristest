# Relatório de pesquisa legal — dp-tabelas-irrf-das-sst

**Pergunta:** Tabelas mensais do IRRF (IN RFB 1.500/2014 Anexos II e X), faixas do DAS 2027 (Res. CGSN 190 Anexos I-V) conferidas contra legal_parameters; textos IN PRES/INSS 128/2022 (PPP/LTCAT), NR-5 Quadro I, NR-4 Anexo II para o BRIEF do SST
**Aberto em:** 2026-11-25T16:39:41-03:00 · **Atualizado em:** 2026-11-25T16:57:18-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão

**Valores: nenhuma divergência.** As tabelas mensais do IRRF (IN RFB 1.500/2014, Anexos II e X) e as faixas e a repartição do DAS de 2027 (Anexos I a V da Res. CGSN 140) batem, linha a linha, com o que está nos parâmetros legais do repositório. **Mas a fonte do DAS 2027 mudou:** a Res. CGSN 196, de 16/11/2026 (DOU de 24/11/2026), revogou o art. 6º da Res. CGSN 190, que era o artigo que trazia os Anexos I a V. Ela pôs no lugar Anexos I a V próprios, com vigência em 01/01/2027 [D10 art. 3º e art. 6º; D24 mostra os cinco anexos da Res. 140 com `[AGENDADO] … 01/01/2027, nos termos da Resolução CGSN nº 196`]. Os números das tabelas são os mesmos da 190. O que mudou foram as notas e uma regra: o excesso do teto do ISS passa a ir também para o IBS. Isso gerou uma lacuna fiscal no código (§4).

Onde as linhas estão: o arquivo `server/prisma/data/legal_parameters_v1.sql`, citado no pedido, **não existe**. As linhas estão em:
- `IRRF_PF_MENSAL`: `server/prisma/data/legal_parameters_retencoes_v1.sql:319-326` e `server/prisma/migrations/20261024120000_add_withholding_profiles_retencoes/migration.sql`;
- `SIMPLES_ANEXO_FAIXA` / `SIMPLES_ANEXO_REPARTICAO` 2027: `server/prisma/data/legal_parameters_simples_v1.sql` e `server/prisma/migrations/20261008090000_seed_simples_legal_parameters/migration.sql`.

### 1.1 IRRF mensal — IN RFB 1.500/2014 (verificado)

Anexo II, item X, "a partir do mês de maio do ano-calendário de 2025", sem data final. Vale em 2026 e em 2027 enquanto não houver tabela nova [D01; redação dada pela IN RFB 2.299/2025, vigência 18/12/2025, D08 l.1151]:

| Base de cálculo (R$) | Alíquota | Parcela a deduzir (R$) | Linha no repositório | Bate? |
|---|---|---|---|---|
| até 2.428,80 | zero | zero | FAIXA_1 `ateCents 242880, 0, 0` | sim |
| 2.428,81 a 2.826,65 | 7,5% | 182,16 | FAIXA_2 `282665, 750, 18216` | sim |
| 2.826,66 a 3.751,05 | 15% | 394,16 | FAIXA_3 `375105, 1500, 39416` | sim |
| 3.751,06 a 4.664,68 | 22,5% | 675,49 | FAIXA_4 `466468, 2250, 67549` | sim |
| acima de 4.664,68 | 27,5% | 908,73 | FAIXA_5 `null, 2750, 90873` | sim |

Anexo X, "Tabela de redução do imposto mensal — a partir de 1º de janeiro de 2026" [D02; art. 65-A incluído pela IN RFB 2.299/2025, D08 l.711]:

| Rendimentos tributáveis sujeitos ao ajuste mensal | Redução do IR |
|---|---|
| até R$ 5.000,00 | até R$ 312,89 (de modo que o imposto devido seja zero) |
| de R$ 5.000,01 a R$ 7.350,00 | R$ 978,62 − (0,133145 × rendimentos tributáveis sujeitos à incidência mensal), decrescente até zerar a partir de R$ 7.350,00 |

O repositório tem `REDUCAO_ART3A {limiteZeroCents 500000, tetoCents 735000, constanteCents 97862, coeficienteMilionesimos 133145}`, e bate. O repositório não guarda o teto de R$ 312,89, mas o resultado é o mesmo. Isso é **inferido**: li o texto e o código e fiz a conta, sem teste. `reducaoArt3A` (`retencaoParams.ts:198-206`) devolve o imposto inteiro quando o rendimento é ≤ R$ 5.000. A IN 1.500 art. 52 § 8º manda usar o desconto simplificado de 25% da faixa zero (R$ 607,20) sempre que for mais benéfico. Com rendimento de R$ 5.000, a base é no máximo R$ 4.392,80, e o imposto fica em 4.392,80 × 22,5% − 675,49 = **R$ 312,89**. Logo o imposto a zerar nunca passa de R$ 312,89, e "zerar o imposto" coincide com "reduzir até R$ 312,89". Se o cálculo não aplicar o desconto simplificado quando ele é mais benéfico, essa equivalência cai. O cálculo de hoje escolhe o maior entre os dois (`DESCONTO_SIMPLIFICADO_BP`).

Outras linhas da mesma tabela, também conferidas:
- `DEPENDENTE` 18959 = R$ 189,59 "a partir do mês de abril do ano-calendário de 2015" (Anexo VI, red. IN RFB 1.558/2015) [D26];
- `DESCONTO_SIMPLIFICADO_BP` 2500 = "25% … do valor máximo da faixa com alíquota de 0%" (art. 52 § 8º) [D08 l.241].

### 1.2 DAS 2027 — Anexos I a V da Res. CGSN 140, redação da Res. CGSN 196/2026 (verificado)

Os cinco anexos valem de 1º/1/2027 a 31/12/2028 para faixas e alíquotas e de 2027 a 2028 para a partilha [D11–D15]. A conferência foi mecânica, com `ferramentas/cmp.py`: ele extrai as 6 faixas e as 6 linhas de repartição de cada anexo e compara com o `valorJson` das 60 linhas de 2027 (`vigenteDesde 2027-01-01`, `vigenteAte 2028-12-31`). O resultado foi **60 de 60 iguais**, tanto no `.sql` de dados quanto na migração, nos Anexos da 196 [D11–D15] e nos da 190 [D03–D07].

**Prova de que a checagem pega erro:** com a 5ª faixa do Anexo I trocada de 1430 para 1431 bp numa cópia do SQL, a mesma comparação devolveu "divergencias 1".

Tabelas (alíquota nominal / valor a deduzir), 2027–2028:

| Faixa (RBT12) | Anexo I | Anexo II | Anexo III | Anexo IV | Anexo V |
|---|---|---|---|---|---|
| 1ª até 180.000,00 | 4,00% / – | 4,50% / – | 6,00% / – | 4,50% / – | 15,50% / – |
| 2ª até 360.000,00 | 7,30% / 5.940,00 | 7,80% / 5.940,00 | 11,20% / 9.360,00 | 9,00% / 8.100,00 | 18,00% / 4.500,00 |
| 3ª até 720.000,00 | 9,50% / 13.860,00 | 10,00% / 13.860,00 | 13,50% / 17.640,00 | 10,20% / 12.420,00 | 19,50% / 9.900,00 |
| 4ª até 1.800.000,00 | 10,70% / 22.500,00 | 11,20% / 22.500,00 | 16,00% / 35.640,00 | 14,00% / 39.780,00 | 20,50% / 17.100,00 |
| 5ª até 3.600.000,00 | 14,30% / 87.300,00 | 14,70% / 85.500,00 | 21,00% / 125.640,00 | 22,00% / 183.780,00 | 23,00% / 62.100,00 |
| 6ª até 4.800.000,00 | 18,90% / 378.000,00 | 29,90% / 720.000,00 | 32,90% / 648.000,00 | 32,90% / 828.000,00 | 30,40% / 540.000,00 |

A repartição de 2027–2028, com IBS de 0,15% a 0,27% e CBS no lugar de PIS/Cofins, está nos textos D11–D15 e bate com as linhas `SIMPLES_ANEXO_REPARTICAO`. As linhas `SIMPLES_TETO_ISS` de 2027 também batem com as notas (*):
- Anexo III: limiar de 14,92537%, com IRPJ 6,02, CSLL 5,26, CBS 23,20, CPP 65,26 e IBS 0,26;
- Anexo IV: limiar de 12,5%, com IRPJ 31,33, CSLL 32,00, CBS 36,27 e IBS 0,40.

**O que a 196 mudou nas notas dos anexos (diff D03–D07 × D11–D15):**
1. **Anexo II, fórmula do ICMS acima da 5ª faixa.** A 190 trazia `{[(RBT12 × 21%) − R$ 125.640,00]/RBT12} × 33,50%`, que é a fórmula do Anexo III, um erro material. A 196 corrigiu para `{[(RBT12 × 14,70%) − R$ 85.500,00]/RBT12} × 32,00%`. O `simplesCalc.ts` calcula pela 5ª faixa do próprio anexo (l.374-381), o que já equivale à redação corrigida. Sem lacuna.
2. **Condição das fórmulas da 6ª faixa.** Saiu "para a parcela que não ultrapassar o sublimite": agora a regra vale "quando o valor do RBT12 for superior ao limite da 5ª faixa". O sublimite continua tirando ICMS, ISS e IBS do DAS (art. 13-A). O código trata os dois casos (`sublimiteExcedido`). Sem lacuna.
3. **Teto do ISS.** A diferença vai "aos tributos federais **e IBS** da mesma faixa" (notas dos Anexos III e IV). O art. 21 III da Res. 140, na redação do art. 2º da 196 com vigência em 01/01/2027, diz o mesmo: "distribuída, de forma proporcional, entre os tributos federais e o IBS" [D10 l.49]. Na 5ª faixa a tabela de transferência já inclui o IBS. **Na 6ª faixa o código distribui só entre os federais**: `simplesCalc.ts:398-410` filtra o IBS por ele estar em `SUBLIMITE`. Isso foi para a caixa como **L-20261125-195439-09b7** (fiscal, G2·E3·silencioso·inferido).

## 2. Fundamentação

- IN RFB 1.500/2014: art. 22, art. 52 § 8º, art. 65, art. 65-A; Anexos II, VI e X [D08 multivigente, rfb:57670; anexos D01, D02, D26]. Link oficial: <https://normasinternet2.receita.fazenda.gov.br/#/consulta/externa/57670/visao/multivigente>.
- Res. CGSN 196/2026: art. 2º (nova redação do art. 21 III da Res. 140), art. 3º (Anexos I a V) e art. 6º (revoga o art. 6º da Res. 190) [D10, rfb:154694; anexos D11–D15]. Link oficial: <https://normasinternet2.receita.fazenda.gov.br/#/consulta/externa/154694/visao/multivigente>.
- Res. CGSN 190/2026: art. 9º, na redação da Res. 196 — produz efeitos "I – imediatamente" quanto aos arts. 144-D e 144-E e "II – a partir de 1º de janeiro de 2027" quanto às demais alterações [D09].
- Res. CGSN 140/2018, visão multivigente: Anexos I a V com `[AGENDADO] … 01/01/2027, nos termos da Resolução CGSN nº 196` [D24 l.2168-2194]. Há outra alteração agendada para 2027, da Res. CGSN 195/2026 (rfb:154194), mas ela toca outros dispositivos (l.1358 e l.1634), não os anexos.

## 3. Vigência e alertas resolvidos

- **Acervo × fonte oficial.** As IN RFB e as Resoluções CGSN do acervo estão em "publicação original", sem a compilação, e os anexos são PDFs. Por isso fui direto à API do SIJUT, na visão multivigente, e aos PDFs oficiais. A extração é do texto do PDF (pypdf), não de OCR.
- **IN 1.500.** Nenhum `[AGENDADO]` sobre os Anexos II, VI ou X na cópia de 25/11/2026 [D08].
- **Res. 190 → 196.** O dossiê `dp-cobertura-100` (D20, baixado em 14/11) é anterior à 196. A Res. 140 acusou TEXTO MUDOU desde 24/11, e há 8 dossiês a reler: lacuna **L-20261125-195503-a785**.
- **IRRF em 2027.** Não achei tabela mensal nova para 2027. O Anexo II item X não tem fim, e o Anexo X vale "a partir de 1º de janeiro de 2026". Se sair uma IN ou lei com tabela de 2027 depois de 25/11/2026, esta conclusão cai.

## 4. Ambiguidades e lacunas

- **L-20261125-195439-09b7** (fiscal · defeito · G2·E3·silencioso·inferido): teto do ISS na 6ª faixa sem o IBS a partir de 2027. Situação de exemplo: Anexo III, RBT12 de R$ 4,5 mi e sublimite não excedido no ano, em que o ISS pela fórmula da 5ª passa de 5%.
- **L-20261125-195502-411d** (fiscal · spec · G2·E2·silencioso·assumido): o resto da Res. 196 não foi mapeado no módulo Simples. Inclui o art. 144-C (o optante pelo regime de caixa em 2026 integra os valores não recebidos na base de 12/2026, em vigor desde 24/11/2026), o art. 2º §§ 8º a 9º-A (receita auferida no faturamento, a partir de 2027), o art. 25-A (compra pública) e o art. 144-F (Defis 2026 até 31/03/2027).
- **L-20261125-195503-a785** (fiscal · débito · G3): reler os 8 dossiês que citaram a Res. 140 antes de 24/11.
- Fica para o código, sem lacuna própria: as linhas `SIMPLES_TETO_ISS` de 2027 têm `transfereAIbs:false` e o IBS dentro de `transferencia`. O flag não é lido pelo cálculo (só no schema e no `formatoLinha`), então não muda o resultado.

## 5. SST — textos para o BRIEF (parte 2, L-20261114-214052-52cd)

### 5.1 IN PRES/INSS 128/2022 — LTCAT e PPP (arts. 272 a 285)

**Fonte.** A IN 128 **não está no acervo**: a pasta `reguladores/inss/instrucoes-normativas/2022` só tem as INs 130 a 138. O DOU (in.gov.br) devolve 403. A fonte usada foi o Portal da Legislação do INSS (<https://portalin.inss.gov.br/in/594>), que renderiza a IN compilada a partir do pacote `main.11d20173ec4bc58ac2aa.js`. O texto foi extraído por `ferramentas/ext2.py` e está transcrito em [D23].

**Como ler as redações.** O portal mostra primeiro a redação anterior, com a anotação "(alterado pela …)", e logo abaixo a vigente. Conferi essa convenção na IN PRES/INSS 170/2024 do acervo [D22]: ela dá ao art. 272, II a redação "PPP – emitido a partir de 18 de julho de 2002", que no portal é a linha de baixo.

**Atualidade.** O pacote cita alterações até a IN PRES/INSS 212, de 06/08/2026. Das INs de 2025 e 2026 que estão no acervo, só as 195/2025, 203/2026 e 208/2026 alteram a IN 128, e nenhuma toca os arts. 272 a 285: mexem nos arts. 416 a 421 e 576. O acervo não tem a IN 188/2025, que o portal aponta como autora da redação do art. 273, p.ú. Grau: **verificado** para o texto compilado pelo portal. Alteração de setembro a novembro de 2026 está **não excluída**, porque o acervo para na IN 211.

Pontos para o BRIEF do SST (texto literal em D23):
- **Art. 272 — formulários de atividade especial.**
  - I: os antigos formulários, até 31/12/2003;
  - II: o PPP "emitido a partir de 18 de julho de 2002" (red. IN 170/2024);
  - § 2º: "será válida a apresentação de documento eletrônico previsto no eSocial para esta finalidade" — é o PPP eletrônico.
- **Art. 273, p.ú. (red. IN 188/2025):** a cooperativa e a empresa contratada para cessão ou empreitada de mão de obra emitem os formulários com base nos laudos da contratante, quando o serviço é prestado no estabelecimento da contratante.
- **Art. 274, IV:** para períodos a partir de 01/01/2004, o documento é o PPP.
- **Art. 276 — elementos mínimos do LTCAT (I a XII):**
  - se é individual ou coletivo;
  - empresa;
  - setor e função;
  - atividade;
  - agente;
  - fontes geradoras;
  - via e periodicidade da exposição;
  - metodologia;
  - medidas de controle;
  - conclusão;
  - "assinatura e identificação do médico do trabalho ou engenheiro de segurança do trabalho";
  - data da avaliação.
- **Art. 277 — documentos que substituem ou complementam o LTCAT.** Entre eles, no inciso V, as demonstrações ambientais: PGR (NR-1) a partir de 03/01/2022, PCMSO (NR-7) e outras. O p.ú. lista os laudos não aceitos.
- **Arts. 278 e 279:** a atualização segue a periodicidade trabalhista, ou acontece quando o ambiente muda (leiaute, máquinas, proteção coletiva, nível de ação). Laudo extemporâneo vale com declaração expressa de que não houve alteração.
- **Art. 280:** o LTCAT embasa a GFIP e o eSocial. O INSS pode requisitá-lo.
- **Art. 281 — PPP.**
  - Conteúdo: dados administrativos, registros ambientais e responsáveis, no modelo do Anexo XVII.
  - § 1º e § 2º: assinado pelo representante legal ou preposto, com nome e CPF.
  - § 3º: informação falsa é crime (CP arts. 297 e 299).
  - § 4º-A (incl. IN 170/2024): dispensas de campos por período.
  - § 7º: o leiaute pode mudar no meio digital.
- **Art. 284 — quem recebe o PPP, quando atualizar e quanto tempo guardar.**
  - Caput: PPP individual para quem trabalha exposto a agente nocivo, mesmo sem enquadramento como atividade especial.
  - § 1º: **com o PPP digital, vale para todos os empregados, avulsos e cooperados, haja exposição ou não**.
  - § 3º, I: a ME/EPP pode declarar ausência de riscos com base na declaração eletrônica da NR-1, item 1.8.4.
  - § 3º, II: para o MEI, a base são as fichas da NR-1, item 1.8.2.
  - § 3º, III: qualquer empresa pode declarar ausência de riscos quando o inventário do PGR não aponta risco físico, químico ou biológico do Anexo IV do RPS.
  - § 4º: atualizar sempre que houver mudança.
  - § 5º: entregar na rescisão, mediante recibo, a pedido do trabalhador e a pedido do INSS ou de autoridade.
  - § 6º: as informações enviadas pelo eSocial são disponibilizadas ao segurado pelo INSS.
  - § 9º: **guarda do PPP e do comprovante de entrega por 20 anos**. O texto remete ao "inciso I do § 4º", mas a entrega está no § 5º, I. É provável remissão errada da norma.
- **Art. 285:** revogado pela IN 170/2024. O conteúdo foi para o art. 281 § 4º-A.

Modelo do formulário: Anexo XVII, PDF oficial do INSS [D21].

### 5.2 NR-4 — Anexo II, Dimensionamento do SESMT

**Fonte.** PDF "nr-04-atualizada-2023", ligado na página de NRs vigentes do MTE [D16, D18]. A última alteração é a Portaria MTP 4.219/2022. As NRs não estão no acervo ctresb/leis. Não achei portaria posterior a 2022 na página do MTE (grau: inferido).

**Como a tabela foi lida.** A extração de texto simples perde a posição das colunas. A transcrição abaixo veio das coordenadas x de cada número no PDF (`ferramentas/xy.py`, página 31).

Colunas, em número de trabalhadores no estabelecimento: 50–100 | 101–250 | 251–500 | 501–1.000 | 1.001–2.000 | 2.001–3.500 | 3.501–5.000 | acima de 5.000, por grupo de 4.000 ou fração acima de 2.000 (**).

| GR | Profissional | 50–100 | 101–250 | 251–500 | 501–1.000 | 1.001–2.000 | 2.001–3.500 | 3.501–5.000 | +grupo |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Técnico Seg. Trabalho | | | | 1 | 1 | 1 | 2 | 1 |
| 1 | Engenheiro Seg. Trabalho | | | | | | 1* | 1 | 1* |
| 1 | Aux./Téc. Enferm. Trabalho | | | | | | 1*** | 1 | 1 |
| 1 | Enfermeiro do Trabalho | | | | | | | 1* | |
| 1 | Médico do Trabalho | | | | | 1* | 1* | 1 | 1* |
| 2 | Técnico Seg. Trabalho | | | | 1 | 1 | 2 | 5 | 1 |
| 2 | Engenheiro Seg. Trabalho | | | | | 1* | 1 | 1 | 1* |
| 2 | Aux./Téc. Enferm. Trabalho | | | | | 1*** | 1*** | 1 | 1 |
| 2 | Enfermeiro do Trabalho | | | | | | | 1 | |
| 2 | Médico do Trabalho | | | | | 1* | 1 | 1 | 1 |
| 3 | Técnico Seg. Trabalho | | 1 | 2 | 3 | 4 | 6 | 8 | 3 |
| 3 | Engenheiro Seg. Trabalho | | | | 1* | 1 | 1 | 2 | 1 |
| 3 | Aux./Téc. Enferm. Trabalho | | | | | 1*** | 1 | 1 | 1 |
| 3 | Enfermeiro do Trabalho | | | | | | 1 | 1 | |
| 3 | Médico do Trabalho | | | | 1* | 1 | 1 | 2 | 1 |
| 4 | Técnico Seg. Trabalho | 1 | 2 | 3 | 4 | 5 | 8 | 10 | 3 |
| 4 | Engenheiro Seg. Trabalho | | 1* | 1* | 1 | 1 | 2 | 3 | 1 |
| 4 | Aux./Téc. Enferm. Trabalho | | | | 1*** | 1*** | 1 | 1 | 1 |
| 4 | Enfermeiro do Trabalho | | | | | | 1 | 1 | |
| 4 | Médico do Trabalho | | 1* | 1* | 1 | 1 | 2 | 3 | 1 |

Notas da tabela:
- (*) tempo parcial, mínimo de 3 horas;
- (**) acima de 5.000, o total é o dimensionamento da faixa de 3.501 a 5.000 mais o de cada grupo de 4.000 ou fração acima de 2.000;
- (***) o empregador pode trocar o auxiliar ou técnico de enfermagem por um enfermeiro do trabalho em tempo parcial;
- Obs. A: hospitais e similares com mais de 500 trabalhadores contratam enfermeiro do trabalho em tempo integral.

**Para o salão:** o Anexo I da NR-4 dá ao CNAE **96.02-5 (cabeleireiros e outras atividades de tratamento de beleza) o grau de risco 2** [D18, p.30]. Com GR 2, o SESMT próprio começa com 501 empregados no estabelecimento.

### 5.3 NR-5 — Quadro I, Dimensionamento da CIPA

**Fonte.** PDF "nr-05-atualizada-2022", ligado na página de NRs vigentes do MTE [D17, D19]. A última alteração é a Portaria MTP 4.219/2022, cujo título entrou em vigor em 20/03/2023. O grau de risco é o do Quadro I da NR-4. A tabela foi transcrita por coordenadas, como a da NR-4 (página 11).

Colunas, em número de empregados no estabelecimento: 0–19 | 20–29 | 30–50 | 51–80 | 81–100 | 101–120 | 121–140 | 141–300 | 301–500 | 501–1.000 | 1.001–2.500 | 2.501–5.000 | 5.001–10.000 | acima de 10.000, a acrescentar por grupo de 2.500.

| GR | | 0–19 | 20–29 | 30–50 | 51–80 | 81–100 | 101–120 | 121–140 | 141–300 | 301–500 | 501–1.000 | 1.001–2.500 | 2.501–5.000 | 5.001–10.000 | +2.500 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Efetivos | | | | | 1 | 1 | 1 | 1 | 2 | 4 | 5 | 6 | 8 | 1 |
| 1 | Suplentes | | | | | 1 | 1 | 1 | 1 | 2 | 3 | 4 | 5 | 6 | 1 |
| 2 | Efetivos | | | | 1 | 1 | 2 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 1 |
| 2 | Suplentes | | | | 1 | 1 | 1 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 1 |
| 3 | Efetivos | | 1 | 1 | 2 | 2 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 2 |
| 3 | Suplentes | | 1 | 1 | 1 | 1 | 1 | 2 | 2 | 4 | 4 | 6 | 8 | 8 | 2 |
| 4 | Efetivos | | 1 | 2 | 3 | 3 | 4 | 4 | 4 | 5 | 6 | 9 | 11 | 13 | 2 |
| 4 | Suplentes | | 1 | 1 | 2 | 2 | 2 | 2 | 3 | 4 | 5 | 7 | 8 | 10 | 2 |

**Para o salão (GR 2):** a CIPA constituída começa com **51 empregados no estabelecimento** (1 efetivo e 1 suplente). Abaixo disso, se o estabelecimento não for atendido por SESMT, vale o item 5.4.13: a organização "nomeará um representante da organização dentre seus empregados para auxiliar na execução das ações de prevenção em segurança e saúde no trabalho" [D19].

<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** D01_82218 — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://normasinternet2.receita.fazenda.gov.br/api/consulta-externa/ato/57670/anexo/82218>  
  Baixado em 2026-11-25T16:39:43-03:00 · arquivo local `docs/D01_82218.pdf` · SHA-256 `0a6301ce1f6b973c2864a41f358045c59de5be6f3912e64e6eb66767a5fd99af`
- **[D02]** D02_82219 — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://normasinternet2.receita.fazenda.gov.br/api/consulta-externa/ato/57670/anexo/82219>  
  Baixado em 2026-11-25T16:39:43-03:00 · arquivo local `docs/D02_82219.html` · SHA-256 `9f477abe0f0681685a9b3aca094524c56bc694a96e26583fe169360121786504`
- **[D03]** D03_85769 — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://normasinternet2.receita.fazenda.gov.br/api/consulta-externa/ato/152832/anexo/85769>  
  Baixado em 2026-11-25T16:39:43-03:00 · arquivo local `docs/D03_85769.pdf` · SHA-256 `ebaafdc46750043969d998b259d33101a2d0e7f7494cb2e554fb0424a7069c12`
- **[D04]** D04_85770 — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://normasinternet2.receita.fazenda.gov.br/api/consulta-externa/ato/152832/anexo/85770>  
  Baixado em 2026-11-25T16:39:44-03:00 · arquivo local `docs/D04_85770.pdf` · SHA-256 `397d24f5d285cbe60c16e70afd688e37e1e31f8c5c805a07c6d8588ebbef16ab`
- **[D05]** D05_85771 — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://normasinternet2.receita.fazenda.gov.br/api/consulta-externa/ato/152832/anexo/85771>  
  Baixado em 2026-11-25T16:39:44-03:00 · arquivo local `docs/D05_85771.pdf` · SHA-256 `0e6535b469f737eceea4b4ba812a45dc0ca63463632aa12b1678a3d50a92a4f6`
- **[D06]** D06_85775 — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://normasinternet2.receita.fazenda.gov.br/api/consulta-externa/ato/152832/anexo/85775>  
  Baixado em 2026-11-25T16:39:44-03:00 · arquivo local `docs/D06_85775.pdf` · SHA-256 `11aad0a339cf319abce522a4badfb3c5d1f803b7ad17b31fe1b1d67110f67a8b`
- **[D07]** D07_85773 — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://normasinternet2.receita.fazenda.gov.br/api/consulta-externa/ato/152832/anexo/85773>  
  Baixado em 2026-11-25T16:39:44-03:00 · arquivo local `docs/D07_85773.pdf` · SHA-256 `9e2e6bbc1b67cdbf624132ebeaa9eec475e5512f66ce603435dd1568a5b9b38e`
- **[D08]** Instrução Normativa RFB nº 1500, de 29 de outubro de 2014 — Receita Federal - Sistema Normas (API)  
  Link oficial: <https://normasinternet2.receita.fazenda.gov.br/#/consulta/externa/57670/visao/multivigente>  
  Baixado em 2026-11-25T16:41:00-03:00 · arquivo local `docs/D08_rfb-57670-multivigente.json` · SHA-256 `24cd4877274f766c168739036645c74cddfa2c7e1597aba522841f10a2bd3658`  
  ⚠ 35 anexos binários não baixados (o texto integral pode estar neles): as URLs estão no fim do texto e no campo 'anexos'; baixe com 'legal.py baixar' os que a pesquisa citar
- **[D09]** Resolução CGSN nº 190, de 4 de agosto de 2026 — Receita Federal - Sistema Normas (API)  
  Link oficial: <https://normasinternet2.receita.fazenda.gov.br/#/consulta/externa/152832/visao/multivigente>  
  Baixado em 2026-11-25T16:41:01-03:00 · arquivo local `docs/D09_rfb-152832-multivigente.json` · SHA-256 `38a118e86ac90bd8f9bd9f4efb8e2fe947cc5af9216c27150d3a5537ca68e66f`  
  ⚠ 6 anexos binários não baixados (o texto integral pode estar neles): as URLs estão no fim do texto e no campo 'anexos'; baixe com 'legal.py baixar' os que a pesquisa citar
- **[D10]** Resolução CGSN nº 196, de 16 de novembro de 2026 — Receita Federal - Sistema Normas (API)  
  Link oficial: <https://normasinternet2.receita.fazenda.gov.br/#/consulta/externa/154694/visao/multivigente>  
  Baixado em 2026-11-25T16:41:13-03:00 · arquivo local `docs/D10_rfb-154694-multivigente.json` · SHA-256 `af0387ef601c947b71bbbea50f319c5a20d59f0cfd93cb9e6e3c7bd24449e52a`  
  ⚠ 5 anexos binários não baixados (o texto integral pode estar neles): as URLs estão no fim do texto e no campo 'anexos'; baixe com 'legal.py baixar' os que a pesquisa citar
- **[D11]** D11_87477 — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://normasinternet2.receita.fazenda.gov.br/api/consulta-externa/ato/154694/anexo/87477>  
  Baixado em 2026-11-25T16:41:33-03:00 · arquivo local `docs/D11_87477.pdf` · SHA-256 `1d5a2e01b55d1572b603db227d875cec7afd78e93bb28ccda49d8bd8114d8da3`
- **[D12]** D12_87478 — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://normasinternet2.receita.fazenda.gov.br/api/consulta-externa/ato/154694/anexo/87478>  
  Baixado em 2026-11-25T16:41:33-03:00 · arquivo local `docs/D12_87478.pdf` · SHA-256 `bbc0358064d0ab67109e77d49900dd64481885c525fa50687ba8bf6380dd0f99`
- **[D13]** D13_87479 — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://normasinternet2.receita.fazenda.gov.br/api/consulta-externa/ato/154694/anexo/87479>  
  Baixado em 2026-11-25T16:41:33-03:00 · arquivo local `docs/D13_87479.pdf` · SHA-256 `6f69ff8f9ad48b1c06aead505e0333e11859a1ca98c9bffe5e7deb19739af53a`
- **[D14]** D14_87480 — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://normasinternet2.receita.fazenda.gov.br/api/consulta-externa/ato/154694/anexo/87480>  
  Baixado em 2026-11-25T16:41:33-03:00 · arquivo local `docs/D14_87480.pdf` · SHA-256 `f43abf935606d16a3728d91eb967e8a8266c916aa8d60baba52431d01707b84e`
- **[D15]** D15_87481 — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://normasinternet2.receita.fazenda.gov.br/api/consulta-externa/ato/154694/anexo/87481>  
  Baixado em 2026-11-25T16:41:34-03:00 · arquivo local `docs/D15_87481.pdf` · SHA-256 `c5bad9145121eed320d1077eed135ae43cf47e5cbad46af6db83ccaf4b671538`
- **[D16]** Norma Regulamentadora No. 4 (NR-4) — Ministério do Trabalho e Emprego — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/normas-regulamentadora/normas-regulamentadoras-vigentes/norma-regulamentadora-no-4-nr-4>  
  Baixado em 2026-11-25T16:43:47-03:00 · arquivo local `docs/D16_norma-regulamentadora-no-4-nr-4.html` · SHA-256 `ea0d96a9adcd780aaaf5a86c3591ef3c01e403f72d52d1045345d93ac0f78d1d`
- **[D17]** Norma Regulamentadora No. 5 (NR-5) — Ministério do Trabalho e Emprego — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/normas-regulamentadora/normas-regulamentadoras-vigentes/norma-regulamentadora-no-5-nr-5>  
  Baixado em 2026-11-25T16:43:47-03:00 · arquivo local `docs/D17_norma-regulamentadora-no-5-nr-5.html` · SHA-256 `8c6c3d5aba01547d671c87bfe3d0fd59b321ba61db662fbc7fa9355795759d5b`
- **[D18]** NR 4 - Serviços Especializados em Segurança e em Medicina do Trabalho — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/normas-regulamentadora/normas-regulamentadoras-vigentes/nr-04-atualizada-2023.pdf>  
  Baixado em 2026-11-25T16:44:10-03:00 · arquivo local `docs/D18_nr-04-atualizada-2023-pdf.pdf` · SHA-256 `1e7bdfb832d7cda0ac012d55c818be2d945730cb64316f498198c6b2eae6dc84`
- **[D19]** NR5 - Comissão Interna de Prevenção de Acidentes — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/arquivos/normas-regulamentadoras/nr-05-atualizada-2022.pdf>  
  Baixado em 2026-11-25T16:44:10-03:00 · arquivo local `docs/D19_nr-05-atualizada-2022-pdf.pdf` · SHA-256 `c05059a8423db7dc334fe97813b5833009b1310d05d32331494180b7372a6c55`
- **[D20]** Portal IN — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://portalin.inss.gov.br/in/594>  
  Baixado em 2026-11-25T16:46:30-03:00 · arquivo local `docs/D20_594.html` · SHA-256 `4c0e3c7a9e02c2eedfbcb1b3e5fa05116ed396f863224e9466464682179bc264`
- **[D21]** D21_ppp-pdf — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www.gov.br/inss/pt-br/centrais-de-conteudo/publicacoes/outras/ppp.pdf>  
  Baixado em 2026-11-25T16:46:31-03:00 · arquivo local `docs/D21_ppp-pdf.pdf` · SHA-256 `b773df9c51d12059fc33eee2aa8b81953df80e4efb7c1750b03dedfec8027807`
- **[D22]** INSTRUÇÃO NORMATIVA PRES/INSS Nº 170, DE 4 DE JULHO DE 2024 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/8e43c11fade9f61fef46935d2f0af9b45641d906/reguladores/inss/instrucoes-normativas/2024/instrucao-normativa-pres-inss-n-170-de-4-de-julho-de-2024-570602042.md>  
  Fonte oficial declarada: <https://www.in.gov.br/web/dou/-/instrucao-normativa-pres/inss-n-170-de-4-de-julho-de-2024-570602042> · versao_texto: publicação original · cópia de 2026-10-16  
  Lido em 2026-11-25T16:48:55-03:00 · arquivo local `docs/D22_instrucao-normativa-pres-inss-n-170-de-4-de-julho-de-2024-57.md` · SHA-256 `79fcfa500b41bafb28901747c6b8af5236c4dfe3f90c3b06dd13c7f27e6897e9`  
  ⚠ versao_texto = 'publicação original' (não é texto compilado: alterações posteriores não aparecem)
- **[D23]** IN PRES/INSS 128/2022 arts. 272-285 (extraido do Portal IN do INSS) — INSS  
  Link oficial: <https://portalin.inss.gov.br/in/594>  
  Baixado em 2026-11-25T16:49:44-03:00 · arquivo local `docs/D23_in128-arts272-285.txt` · SHA-256 `15debaa5aedc4351eacdf16691441b0d3a8ba53f6a92493d366c5c85d3409027`
- **[D24]** Resolução CGSN nº 140, de 22 de maio de 2018 — Receita Federal - Sistema Normas (API)  
  Link oficial: <https://normasinternet2.receita.fazenda.gov.br/#/consulta/externa/92278/visao/multivigente>  
  Baixado em 2026-11-25T16:52:01-03:00 · arquivo local `docs/D24_rfb-92278-multivigente.json` · SHA-256 `c90d8eb75a39ceff54bf57dd998a795dc53920ba5c94f1415aef79633a45d612`  
  ⚠ alteração com vigência futura: Alterado(a) pelo(a) Resolução CGSN nº 190, de 4 de agosto de 2026, a partir de 01/01/2027 (rfb:152832)  
  ⚠ alteração com vigência futura: Alterado(a) pelo(a) Resolução CGSN nº 195, de 21 de outubro de 2026, a partir de 01/01/2027 (rfb:154194)  
  ⚠ alteração com vigência futura: Alterado(a) pelo(a) Resolução CGSN nº 196, de 16 de novembro de 2026, a partir de 01/01/2027 (rfb:154694)  
  ⚠ 24 anexos binários não baixados (o texto integral pode estar neles): as URLs estão no fim do texto e no campo 'anexos'; baixe com 'legal.py baixar' os que a pesquisa citar  
  ⚠ TEXTO MUDOU desde 2026-11-24. Dossiês que citaram a versão anterior: dp-cobertura-100 D30, parecer-salao-sp-4-pessoas D13, das-espelho-guia D03, insumos-salao-sp D10, ciclo-fiscal-prazos D04, simulacao-montador-unico D03, nfse-2027-salao-parceiro-cbs-ibs D03, simples-6-02-6-03-fator-r D02. Conferir se a conclusão deles ainda vale
- **[D25]** D25_82242 — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://normasinternet2.receita.fazenda.gov.br/api/consulta-externa/ato/57670/anexo/82242>  
  Baixado em 2026-11-25T16:53:31-03:00 · arquivo local `docs/D25_82242.pdf` · SHA-256 `80318b691f488736dbefa8fab787b1dbba767e60a5b0ad45dd644e528c0a46a2`
- **[D26]** D26_35494 — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://normasinternet2.receita.fazenda.gov.br/api/consulta-externa/ato/57670/anexo/35494>  
  Baixado em 2026-11-25T16:53:45-03:00 · arquivo local `docs/D26_35494.pdf` · SHA-256 `116d13c82888973fbd4c878e802cedec6b4d524b0b61d6a2a8d8385e435a46cd`

## Registro de buscas
_Nenhuma busca registrada._
