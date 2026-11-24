# Relatório de pesquisa legal — ecd-presumido-real-in2003

**Pergunta:** Pela IN RFB 2.003/2021 art. 3º, a ECD é obrigatória para o salão no Lucro Presumido (inclusive quando distribui lucro acima do limite sem escrituração) e no Lucro Real? Vale para 2026 e 2027?
**Aberto em:** 2026-11-24T01:33:09-03:00 · **Atualizado em:** 2026-11-24T01:36:20-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão
Regra da IN RFB 2.003 art. 3º [D01], em vigor sem alteração desde 2021 e sem alteração agendada. Vale para 2026 e 2027.

| Regime do salão | ECD | Base | Grau |
|---|---|---|---|
| **Simples** | Dispensada, salvo aporte de investidor-anjo (LC 123 arts. 61-A a 61-D) | [D01, art. 3º § 1º I e § 2º] | verificado |
| **Lucro Presumido com livro Caixa** | Dispensada, desde que (a) mantenha o livro Caixa com toda a movimentação financeira, inclusive bancária, e (b) não distribua lucro sem IRRF acima do limite do § 3º | [D01, art. 3º § 1º V e § 3º]; [D02, Lei 8.981 art. 45 p.ú.] | verificado |
| **Lucro Presumido que distribui acima do limite** | **Obrigatória.** A dispensa do § 1º V cai | [D01, art. 3º § 3º] | verificado |
| **Lucro Presumido sem livro Caixa** | **Obrigatória.** Sem o livro Caixa, vale a escrituração contábil do art. 45 I [D02] | [D01, art. 3º caput e § 1º V] | verificado |
| **Lucro Real** | **Obrigatória**, sem exceção para o salão | [D01, art. 3º caput; § 1º não traz o Real]; [D09, DL 1.598 art. 7º] | verificado |

**O limite do § 3º.** É "o valor da base de cálculo do imposto sobre a renda apurado, diminuída dos impostos e das contribuições
a que estiverem sujeitas" [D01, art. 3º § 3º]. É o mesmo valor que a IN 1.700 deixa distribuir sem IRRF e sem escrituração:
presunção − IRPJ − CSLL − PIS − Cofins [D08, IN 1.700 art. 238 § 2º I]. Acima dele, o lucro só sai isento se a contabilidade
mostrar lucro maior [D08, art. 238 § 2º II]. Essa contabilidade vai à ECD [D01, § 3º].

Em números: com R$ 40.000 de serviço por mês, a presunção de 32% dá R$ 12.800 de base de IRPJ por mês. Desse valor saem o
IRPJ, a CSLL, o PIS e a Cofins. O simulador já calcula esse valor: é o "teto isento sem contabilidade" da aba Lucro (`limIsento`,
IN 1.700 art. 238 § 2º I). Distribuir sem IRRF acima dele obriga à ECD do ano.

**Efeito no produto.** Hoje a aba Lucro, no PR e no RE, diz que a página "não leu" a IN 2.003 (v50, congelada). O motor do
`SIMULACAO-CENARIO` passa a mostrar:
- no **Real:** "ECD obrigatória (IN RFB 2.003 art. 3º; DL 1.598 art. 7º); prazo: último dia útil de junho do ano seguinte"
  [D01, art. 5º, red. IN 2.142/2023];
- no **Presumido:** "ECD dispensada com livro Caixa (art. 3º § 1º V); obrigatória se a distribuição isenta do ano passar o teto
  (§ 3º) ou sem livro Caixa". O teto é o `limIsento` que a página já calcula.

Isso vai ao motor como requisito da lacuna ec55 (item 19 do BRIEF de grupo). A página está congelada (F-SIM-8).

## 2. Fundamentação
| Ponto | Norma (art.) | Fonte | Trecho literal |
|---|---|---|---|
| Quem entrega | IN RFB 2.003 art. 3º caput | [D01] | "Deverão apresentar a ECD as pessoas jurídicas … obrigadas a manter escrituração contábil nos termos da legislação comercial" |
| Simples fora | art. 3º § 1º I | [D01] | "às pessoas jurídicas optantes pelo … (Simples Nacional)" |
| Presumido fora, com condição | art. 3º § 1º V | [D01] | "às pessoas jurídicas tributadas com base no lucro presumido que cumprirem o disposto no parágrafo único do art. 45 da Lei nº 8.981" |
| A condição: livro Caixa | Lei 8.981 art. 45 I e p.ú. | [D02] | "escrituração contábil nos termos da legislação comercial"; "não se aplica à pessoa jurídica que, no decorrer do ano-calendário, mantiver livro Caixa, no qual deverá estar escriturado toda a movimentação financeira, inclusive bancária" |
| Distribuição acima do limite | art. 3º § 3º | [D01] | "A exceção a que se refere o inciso V do § 1º não se aplica às pessoas jurídicas que distribuírem parcela de lucros ou dividendos sem incidência do … (IRRF) em montante superior ao valor da base de cálculo do imposto sobre a renda apurado, diminuída dos impostos e das contribuições a que estiverem sujeitas" |
| Aporte de investidor-anjo | art. 3º § 2º | [D01] | "As exceções a que se referem os incisos I e V do § 1º não se aplicam à microempresa ou empresa de pequeno porte que tenha recebido aporte de capital na forma prevista nos arts. 61-A a 61-D" |
| Lucro acima do presumido | IN 1.700 art. 238 § 2º I e II | [D08] | "o valor da base de cálculo do imposto, diminuído do IRPJ, da CSLL, da Contribuição para o PIS/Pasep e da Cofins"; "desde que a empresa demonstre, com base em escrituração contábil … que o lucro efetivo é maior" |
| Real exige escrituração | DL 1.598 art. 7º | [D09] | "O lucro real será determinado com base na escrituração que o contribuinte deve manter, com observância das leis comerciais e fiscais" |
| Dever geral do empresário | CC art. 1.179 | [D03] | "O empresário e a sociedade empresária são obrigados a seguir um sistema de contabilidade … e a levantar anualmente o balanço patrimonial e o de resultado econômico" |
| Prazo | IN 2.003 art. 5º | [D01] | "até o último dia útil do mês de junho do ano subsequente ao ano-calendário" (red. IN RFB 2.142/2023) |
| Facultativa | art. 3º § 6º | [D01] | "podem apresentá-la de forma facultativa, inclusive para atender ao disposto no art. 1.179 da Lei nº 10.406" |
| Dividendo acima de R$ 50 mil por mês | Lei 9.250 art. 6º-A, incl. Lei 15.270 | [D07] | "em montante superior a R$ 50.000,00 … em um mesmo mês fica sujeito à retenção na fonte … à alíquota de 10%" |

## 3. Vigência conferida
- **IN RFB 2.003.** A visão multivigente de hoje [D01] tem o mesmo SHA-256 da captura do parecer de 20/11 (D21, `f12ac0d0…`).
  O `legal.py` marcou a captura como `IGUAL` à do dossiê `ciclo-fiscal-prazos` de 21/11. O art. 3º não tem trecho riscado.
  O histórico só lista a IN 2.142/2023, que mudou o art. 5º (prazo). Nenhum `[AGENDADO]`.
- **Lei 8.981 art. 45 [D02], DL 1.598 art. 7º [D09] e CC art. 1.179 [D03]:** cópias do acervo compiladas, de 13/10/2026,
  sem alerta.
- **Lei 9.249 art. 10 [D04]:** compilada no acervo, com a redação da Lei 15.270 (efeitos de 01/01/2026).
- **Lei 9.250 art. 6º-A:** a cópia do acervo [D06], "compilada" de 13/10/2026, **não tem o art. 6º-A**, que a Lei 15.270
  incluiu em 11/2025. Li o artigo no Planalto [D07]. A Lei 15.270 do acervo [D05] está em "original". O defeito do acervo
  vai à caixa de lacunas (seção 5).
- **IN 1.700 art. 238 [D08]:** visão multivigente de hoje.
- **2027.** A IN 2.003 não muda com a reforma. O § 3º fala em "impostos e contribuições a que estiverem sujeitas", sem listar
  quais. Já a IN 1.700 art. 238 § 2º I lista IRPJ, CSLL, PIS e Cofins. A pergunta de 2027 ("CBS e IBS entram no desconto?")
  é a lacuna **ca7a**, que já está com o dono para o contador (BRIEF de grupo §5). Este dossiê não a reabre.

## 4. Ambiguidades (só o que precisa de decisão humana)
**A1. Dividendo acima de R$ 50 mil por mês com retenção de 10%: conta como "sem incidência do IRRF" no § 3º?**
- O § 3º conta só a distribuição "sem incidência do IRRF" acima do limite. Desde 2026, o que uma PJ paga a uma mesma pessoa
  física acima de R$ 50 mil no mês sofre 10% de IRRF [D07, Lei 9.250 art. 6º-A].
  - **Leitura (i):** a parcela que sofreu os 10% não é "sem incidência" e não conta para o § 3º. Só a parcela isenta acima do
    limite tira a dispensa.
  - **Leitura (ii):** o § 3º usa "sem incidência" no sentido da isenção do art. 10 da Lei 9.249 [D04], e os 10% são
    antecipação do IRPF mínimo. Toda distribuição acima do limite tira a dispensa.
- **Efeito no salão pequeno:** quase nenhum. Passar de R$ 50 mil por sócio no mês é raro nesse porte, e a distribuição acima do
  teto já pede a contabilidade pela IN 1.700 art. 238 § 2º II [D08].
- **Leitura mais segura: (ii).** Escriturar a ECD sempre que a distribuição do ano passar o teto.
- **Pergunta exata ao contador**, só se o caso aparecer: *"Presumido com livro Caixa, sócio que recebeu mais de R$ 50 mil num
  mês com 10% retidos (Lei 9.250 art. 6º-A). Essa parcela entra no 'sem incidência do IRRF' do § 3º do art. 3º da IN RFB
  2.003?"*

**A2. Sociedade simples (registro em cartório) no Lucro Real.** O caput da IN alcança quem é obrigado a manter escrituração
"nos termos da legislação comercial" [D01]. O CC art. 1.179 fala do empresário e da sociedade empresária [D03]. Para o Real,
porém, o DL 1.598 art. 7º exige escrituração "com observância das leis comerciais e fiscais" de todo contribuinte [D09]. A
leitura segura, e a usual, é que o salão no Real entrega a ECD seja qual for o tipo societário (grau: inferido). Não muda o
simulador.

## 5. Lacunas
- Nenhuma de conteúdo para o salão.
- **Acervo:** a Lei 9.250 "compilada (texto vigente)" de 13/10/2026 não tem o art. 6º-A, incluído pela Lei 15.270/2025 [D06 ×
  D07]. É o mesmo tipo de defeito da lacuna 59df (Lei 9.249 art. 13 I). Vai à caixa, como assunto do acervo e do `legal.py`.
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** Instrução Normativa RFB nº 2003, de 18 de janeiro de 2021 — Receita Federal - Sistema Normas (API)  
  Link oficial: <https://normasinternet2.receita.fazenda.gov.br/#/consulta/externa/114965/visao/multivigente>  
  Baixado em 2026-11-24T01:33:10-03:00 · arquivo local `docs/D01_rfb-114965-multivigente.json` · SHA-256 `f12ac0d01b43b55445a7856883ba0f6c289387320d77fefb0b573344d9877b79`
- **[D02]** Lei nº 8.981 de 20/01/1995 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/8bf2e5070525043cb82294b9de8630a4aea5e53d/federal/leis-ordinarias/1995/lei-8981-1995-01-20.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:1995-01-20;8981> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-11-24T01:33:44-03:00 · arquivo local `docs/D02_lei-8981-1995-01-20.md` · SHA-256 `b567b47ee6be147deb0aeea63f5cc92d7c93652f40fae948125979dac84680e7`
- **[D03]** Lei nº 10.406 de 10/01/2002 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/40fe0ecf521a6ae5e22077bcc927c90a9477d3a5/federal/leis-ordinarias/2002/lei-10406-2002-01-10.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:2002-01-10;10406> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-11-24T01:33:46-03:00 · arquivo local `docs/D03_lei-10406-2002-01-10.md` · SHA-256 `be0cd7d8a1eaacb21cb64f07086929db91f43ad3149b3c721cd33873d328c32c`
- **[D04]** Lei nº 9.249 de 26/12/1995 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/d955e7e66c4a7176278ee8ac74513668de7fc989/federal/leis-ordinarias/1995/lei-9249-1995-12-26.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:1995-12-26;9249> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-11-24T01:33:48-03:00 · arquivo local `docs/D04_lei-9249-1995-12-26.md` · SHA-256 `18cb96b64a850a3f9b738da870044230b76a336068e3fae79cb83f10b14d4699`
- **[D05]** Lei nº 15.270 de 26/11/2025 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/4f02311c78e8f4f559c63b67861c2bd33d691ea2/federal/leis-ordinarias/2025/lei-15270-2025-11-26.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:2025-11-26;15270> · versao_texto: original · cópia de 2026-10-13  
  Lido em 2026-11-24T01:33:50-03:00 · arquivo local `docs/D05_lei-15270-2025-11-26.md` · SHA-256 `32c63ec7cff289c036bab1475951631181b42d4f5ced56ceb3304526d50779b9`  
  ⚠ versao_texto = 'original' (não é texto compilado: alterações posteriores não aparecem)
- **[D06]** Lei nº 9.250 de 26/12/1995 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/ec2d052273aea51cd30fac55a779a8d933c11046/federal/leis-ordinarias/1995/lei-9250-1995-12-26.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:1995-12-26;9250> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-11-24T01:34:08-03:00 · arquivo local `docs/D06_lei-9250-1995-12-26.md` · SHA-256 `aa9eedaae0195205b7f5bcde33c46572d4f1f5352de3cf92ec1e36342e88befd`
- **[D07]** L9250 — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/leis/l9250.htm>  
  Baixado em 2026-11-24T01:34:23-03:00 · arquivo local `docs/D07_l9250-htm.html` · SHA-256 `5a157ec5a19239f7b1576b6b549c69022fcb1a4bbe3541fb90baf52fb3ffb803`  
  ⚠ há captura de 2026-10-24 (retencoes-fonte-pr1-reinf-tabelas D04), mas o texto dela não foi guardado
- **[D08]** Instrução Normativa RFB nº 1700, de 14 de março de 2017 — Receita Federal - Sistema Normas (API)  
  Link oficial: <https://normasinternet2.receita.fazenda.gov.br/#/consulta/externa/81268/visao/multivigente>  
  Baixado em 2026-11-24T01:34:59-03:00 · arquivo local `docs/D08_rfb-81268-multivigente.json` · SHA-256 `0ffa45faae60ed62285940fb442dcb472b5c2529ccb0ae491c20cec9c5446c42`  
  ⚠ 14 anexos binários não baixados (o texto integral pode estar neles): as URLs estão no fim do texto e no campo 'anexos'; baixe com 'legal.py baixar' os que a pesquisa citar
- **[D09]** Decreto-Lei nº 1.598 de 26/12/1977 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/d5fce5484986fb975f9fe9c086c943774d63859f/federal/decretos-lei/1977/del-1598-1977-12-26.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:decreto.lei:1977-12-26;1598> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-11-24T01:35:16-03:00 · arquivo local `docs/D09_del-1598-1977-12-26.md` · SHA-256 `3a4f02e9cca3d46efbd8ed906783149fbf170a2205948643344ca153a5fdf7ed`

## Registro de buscas
_Nenhuma busca registrada._
