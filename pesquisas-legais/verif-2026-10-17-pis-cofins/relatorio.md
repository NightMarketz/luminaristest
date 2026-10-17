# Relatório de pesquisa legal — verif-2026-10-17-pis-cofins

**Pergunta:** As decisões do produto sobre PIS/Cofins (alíquotas, regime por tributação, monofásico/alíquota zero, NCM, cota-parte, dedução na DRE, códigos DCTF, revogação 2027 e ano-teste CBS/IBS 2026) seguem conformes ao texto vigente em 17/10/2026?
**Aberto em:** 2026-10-17T09:51:50-03:00 · **Atualizado em:** 2026-10-17T09:59:54-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão
**Quase tudo confere com o texto vigente em 17/10/2026; há 1 divergência e 2 riscos de prazo.**

- **Confere (verificado, 10 parâmetros):** as alíquotas 0,65%/3% e 1,65%/7,6%, o regime pela forma de tributação, a
  base, a alíquota zero na revenda de monofásico, a ausência de crédito no monofásico, a cota-parte do salão-parceiro,
  a dedução da receita bruta na DRE, e a revogação de PIS/Cofins a partir de 01/01/2027. Também confere a
  lista de NCM de **perfumaria/toucador/higiene** (a que importa ao salão).
- **Diverge (verificado):** **8 das 15 linhas de NCM farmacêutico** (`3002101`, `3002102`, `3002103`, `3002201`,
  `3002202`, `30029020`, `30029092`, `30029099`) foram copiadas do texto da Lei 10.147, que cita a TIPI de 2011
  ([D04] art. 1º). A IN RFB 2.121/2022 vigente traz os códigos atualizados ([D10] art. 452):
  `3002.11.00, 3002.12.1/2/3, 3002.13.00, 3002.14.00, 3002.15, 3002.41.1/2, 3002.49.10/92/99, 3002.59.00, 3002.90.00,
  3822.11.00, 3822.19.40`. Hoje uma NF-e com NCM atual (ex.: vacina 3002.41.xx) **não casa** com a tabela. Então a
  compra vai a TRIBUTADO quando o CST é 01/02, ou a TRIBUTADO com alerta quando o CST é 04, e **gera crédito indevido**
  no Real. As posições 30.01/30.03/30.04 e os códigos 3005.10.10, 3006.30.1/2 e 3006.60.00 seguem válidos.
- **Risco de prazo (verificado):** o ano de 2026 é o de teste da CBS (0,9%) e do IBS (0,1%) ([D09] arts. 343, 346, 348).
  Quem cumpre as obrigações acessórias fica dispensado de recolher e paga PIS/Cofins integral ([D09] art. 348 §§ 1º–2º).
  A apuração do produto, sem linha de compensação de CBS/IBS, só fica correta nessa hipótese.
  Em 2027 PIS e Cofins acabam ([D09] art. 542 X, XI, XVIII, XXI) e a CBS entra
  pela alíquota de referência menos 0,1 p.p. ([D09] art. 347). O produto responde 400 ("CBS é da onda 3"). Isso é
  coerente com a lei, mas deixa Presumido/Real **sem apuração federal sobre receita a partir de 01/2027 (~2,5 meses)**.

## 2. Fundamentação
| # | Decisão / parâmetro (onde) | Norma vigente lida | Status |
|---|---|---|---|
| 1 | PIS cumulativo 65 bp (`server/prisma/migrations/20261007150000_add_legal_parameters/migration.sql:55`) | IN 2.121 art. 128 [D10] ("0,65% … e 3%"); Lei 9.715 art. 8º I citada pela IN | CONFERE (V) |
| 2 | Cofins cumulativa 300 bp (`…:56`) | Lei 9.718 art. 8º [D01] ("três por cento"); IN 2.121 art. 128 [D10] | CONFERE (V) |
| 3 | PIS não cumulativo 165 bp (`…:57`) | Lei 10.637 art. 2º [D02] ("1,65%"); IN 2.121 art. 150 [D10] | CONFERE (V) |
| 4 | Cofins não cumulativa 760 bp (`…:58`) | Lei 10.833 art. 2º [D03] ("7,6%"); IN 2.121 art. 150 [D10] | CONFERE (V) |
| 5 | Presumido ⇒ cumulativo; Real ⇒ não cumulativo; Simples/MEI ⇒ 400 (`pisCofinsCalc.ts:124-131`) | Lei 10.637 art. 8º II–III [D02]; Lei 10.833 art. 10 II–III [D03]; IN 2.121 arts. 122 e 145 [D10] | CONFERE (V); exceção por receita no Real (art. 10 XIII) segue a ambiguidade do dossiê `pis-cofins-regime-por-tributacao` |
| 6 | Base cumulativa = faturamento/receita bruta; não cumulativa = total das receitas (`pisCofinsCalc.ts:108-111`) | Lei 9.718 art. 3º [D01]; DL 1.598 art. 12 [D08]; IN 2.121 art. 25 I–II [D10] | CONFERE (V) |
| 7 | Revenda de monofásico com alíquota zero, informada pelo operador (`pisCofinsCalc.ts:112, 204-206`; F-X8-5 a) | Lei 10.147 art. 2º [D04]; IN 2.121 art. 487 [D10] | CONFERE (V); par. único do art. 2º exclui o Simples, e o Simples já é 400 aqui |
| 8 | NCM perfumaria/toucador/higiene `3303, 3304, 3305, 3307, 34011190, 34012010, 96032100` (`server/prisma/data/legal_parameters_v2.sql:34-40`) | Lei 10.147 art. 1º I "b" [D04]; IN 2.121 art. 481 [D10] ("33.03 a 33.07, exceto na posição 33.06 … 3401.11.90, exceto … Ex 01, 3401.20.10 e 9603.21.00") | CONFERE (V); 3401.11.90 Ex 01 conta como monofásico, desvio conservador já declarado no código |
| 9 | NCM farmacêutico `3002101…30029099` (`legal_parameters_v2.sql:25-31`) | IN 2.121 art. 452 [D10], códigos da TIPI atual | **DIVERGE (V)** |
| 10 | NCM farmacêutico `3001`, `3003` exc. 30039056, `3004` exc. 30049046, `3006301/2`, `30051010`, `30066000` (`…:22-24, 30-33`) | Lei 10.147 art. 1º I "a" [D04]; IN 2.121 art. 452 [D10] | CONFERE (V) |
| 11 | Sem crédito no monofásico/alíquota zero; ICMS fora da base do crédito (`pisCofinsMonofasicoNcm.ts:5`; `server/src/lib/nfeCost.ts:13,168`) | Lei 10.833 art. 3º I "b" e § 2º II–III [D03] (§ 2º III na redação da Lei 14.592/2023) | CONFERE (V). Nota menor: o código cita "Lei 14.592 art. 6º"; o dispositivo vigente é o art. 3º § 2º III da Lei 10.833 |
| 12 | Créditos art. 3º III–IX, § 1º (mês da aquisição / incorrido), § 4º saldo transportado (`pisCofinsCalc.ts:37-46,114-116`) | Lei 10.833 art. 3º caput, § 1º I–III, § 4º [D03] | CONFERE (V) |
| 13 | Cota-parte do parceiro fora da receita bruta; exige contrato (`pisCofinsCalc.ts:113,153-168`) | Lei 12.592 art. 1º-A §§ 5º e 8º [D05] | CONFERE (V). Lei 12.592 **não** está no art. 542 da LC 214 |
| 14 | Retenção deduz do devido (`pisCofinsCalc.ts:117`) | IN 2.121 art. 120 [D10] | CONFERE (V) |
| 15 | Regime de caixa só com o mesmo critério do IRPJ/CSLL (BRIEF, fontes) | IN 2.121 art. 127 [D10] | CONFERE (V) |
| 16 | PIS/Cofins como dedução da receita bruta na DRE (F-PCB-1R; `D-2026-10-13-F-PCB-1R-PIS-COFINS-DEDUCAO.md`) | DL 1.598 art. 12 § 1º III [D08] ("tributos sobre ela incidentes") | CONFERE (V); repete o dossiê `pis-cofins-deducao-receita` com cópia nova |
| 17 | `vigenteAte = 2026-12-31`; 2027 ⇒ 400 (`pisCofinsParams.ts:4,29`; `migration.sql:55-58`) | LC 214 art. 542 X (Lei 9.718 arts. 2º–8º-B), XI (Lei 10.147), XVIII (Lei 10.637 arts. 1º–5º-A, 7º–8º…), XXI (Lei 10.833 arts. 1º–16…); art. 544 III na redação da LC 227/2026 [D09] | CONFERE (V) |
| 18 | 2026 sem CBS/IBS na apuração de PIS/Cofins (nenhum código; `docs/plano/diferidos/M5-ibs-cbs.md` diferido) | LC 214 arts. 343, 346, 348 I–III e §§ 1º–4º [D09] | DESATUALIZADO-RISCO (I): só confere se as obrigações acessórias forem cumpridas (§ 1º) |
| 19 | Simples fora da CBS/IBS de 2026 (`ibsCbsInformar` default false no SIMPLES) | LC 214 art. 348 III "c" [D09] | CONFERE (V) |
| 20 | 2027+: CBS "onda 3", sem apuração (`pisCofinsCalc.ts:144`) | LC 214 art. 347 [D09] | DESATUALIZADO-RISCO (V): a lei já está em vigor; o produto não cobre a CBS |
| 21 | Códigos DCTF 810902/217201/691201/585601 (`migration.sql`, linhas `lp2-cr-*`) | Tabelas da RFB (não lidas nesta rodada) | NÃO VERIFICÁVEL nesta rodada |
| 22 | IPI fora da base do crédito (`D-2026-09-25-FASE1-PIS-COFINS`, "STJ Tema 1.373") | IN 2.121 lida não trata do IPI na aquisição interna (busca por "recuperável" e "IPI…integra": 0 resultado fora da importação/estoque de abertura) | NÃO VERIFICÁVEL (tese do STJ não lida) |
| 23 | EFD-Contribuições fora da matriz de obrigações (`obrigacoesPorRegime.ts:6-7`) | IN RFB 1.252/2012 (não lida) | NÃO VERIFICÁVEL; é decisão de escopo (F-X8-1 a), não leitura de lei |

## 3. Vigência conferida
- **Alertas do acervo e como foram resolvidos:**
  - [D06] LC 214 no acervo está em "republicação/retificação". Conferida no Planalto compilado [D09], que traz as
    redações da LC 227/2026: art. 544 III, art. 344 par. único IV e art. 348 §§ 3º–4º.
  - [D07] LC 227 no acervo está como "texto da fonte oficial". O efeito dela foi lido já incorporado em [D09].
  - A IN RFB 2.121/2022 **não está no acervo** (rfb/2022 tem 11 atos, nenhum é a IN). Foi lida na visão "Vigente" do
    Sijut [D10], com alterações até a IN RFB 2.264/2025.
- **Redação atual:** os arts. 2º, 3º e 8º/10 das Leis 10.637/10.833, o art. 3º e o art. 8º da Lei 9.718 e os arts. 1º e
  2º da Lei 10.147 aparecem compilados em 13/10/2026, com "Vide LC 214/2025" (a revogação de 2027).
  - Única mudança em 2026 nessas leis: o art. 38 da Lei 10.637 foi revogado pela LC 225/2026. Ele não é usado pelo produto.
- **Norma mais específica:** a IN 2.121 art. 452 atualiza a lista de NCM farmacêutico para a TIPI vigente. É o que
  gera a divergência do item 9.

## 4. Ambiguidades (só o que precisa de decisão humana)
- **A. 2026: dispensa da CBS/IBS (art. 348 § 1º).**
  - Leitura 1: o cliente Presumido/Real cumpre as obrigações acessórias (grupo IBSCBS na NF-e/NFS-e etc.). Nesse caso
    fica dispensado e paga PIS/Cofins integral. A apuração atual está certa.
  - Leitura 2: o cliente não cumpre. Nesse caso recolhe CBS 0,9% e IBS 0,1% e compensa com PIS/Cofins do mesmo período
    (art. 348 I). A apuração do produto superestima o PIS/Cofins a pagar, e o produto não emite a guia da CBS.
  - O § 3º (LC 227) dá 60 dias para sanar a omissão antes da penalidade.
  - Leitura mais segura: tratar a dispensa como premissa declarada na memória da apuração, condicionada a
    `ibsCbsInformar = true` no perfil do regime normal.
  - Pergunta ao contador: *"Para o cliente Presumido/Real em 2026, as NFS-e/NF-e emitidas com o grupo IBSCBS bastam para
    a dispensa do art. 348 § 1º da LC 214, ou há outra obrigação acessória exigida (art. 341-G)?"*
- **B. Clínica estética no Real (art. 10 XIII "a" da Lei 10.833):** segue aberta, como no dossiê
  `pis-cofins-regime-por-tributacao`. O texto foi relido e está sem mudança.

## 5. Lacunas
- Códigos de receita DCTF/DCTFWeb (item 21), a tese do STJ sobre o IPI (item 22) e a IN RFB 1.252/2012 (item 23) não
  foram lidos nesta rodada.
- Ato Conjunto RFB/CGIBS sobre as obrigações acessórias de 2026: não pesquisado.
- [D10] foi lido no navegador (portal só com JS). Não há arquivo baixado no dossiê, só o hash do texto renderizado (abaixo).

### [D10] IN RFB nº 2.121/2022 — visão Vigente (Sijut)
- URL lida: <https://normasinternet2.receita.fazenda.gov.br/#/consulta/externa/127905/visao/vigente> (redireciona de
  `normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=127905`).
- Lido em 2026-10-17 pelo navegador embutido. Histórico mostra alterações pelas IN RFB 2.125/2022, 2.152/2023,
  2.162/2023, 2.194/2024 e 2.264/2025.
- SHA-256 do `innerText` do artigo: `9915d23cd8bc81be1c1326a19f132e63b6c76236027847ebfd726193414ddf48` (944.029 caracteres).
- Artigos lidos: 25, 120, 122, 127, 128, 145, 150, 452, 481, 487.
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** Lei nº 9.718 de 27/11/1998 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/2ee55c0d178cb912e1a74026bc8bf4a365018bf0/federal/leis-ordinarias/1998/lei-9718-1998-11-27.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:1998-11-27;9718> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-17T09:52:03-03:00 · arquivo local `docs/D01_lei-9718-1998-11-27.md` · SHA-256 `b15173fa6f57c3ef3a6c7709268c5757ad900c2f567a08f2e646ec014feadf12`
- **[D02]** Lei nº 10.637 de 30/12/2002 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/823c54bedbd9e523afea8ab05e3cd715bd70a18d/federal/leis-ordinarias/2002/lei-10637-2002-12-30.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:2002-12-30;10637> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-17T09:52:04-03:00 · arquivo local `docs/D02_lei-10637-2002-12-30.md` · SHA-256 `f165259701b4081b0e9f73921c214895bea18d10081ade540630de3ee2a5ad8e`
- **[D03]** Lei nº 10.833 de 29/12/2003 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/17688c9637f6a90b7faace6d797aedfa3f6b2ff0/federal/leis-ordinarias/2003/lei-10833-2003-12-29.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:2003-12-29;10833> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-17T09:52:05-03:00 · arquivo local `docs/D03_lei-10833-2003-12-29.md` · SHA-256 `fa0d994627d9e1476d625a9f0b588e596181735b922bdcdf9c1c0336fd06b9fc`
- **[D04]** Lei nº 10.147 de 21/12/2000 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/dc08d8291baac23e97bb4c5095389052d6846822/federal/leis-ordinarias/2000/lei-10147-2000-12-21.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:2000-12-21;10147> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-17T09:52:07-03:00 · arquivo local `docs/D04_lei-10147-2000-12-21.md` · SHA-256 `3e15396e59ce53f5cec18fe5bdce6341dc281ef23e9924b977a80a696d687d37`
- **[D05]** Lei nº 12.592 de 18/01/2012 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/a31cf3cd12073c7b195933a53e733b85c00cfe02/federal/leis-ordinarias/2012/lei-12592-2012-01-18.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:2012-01-18;12592> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-17T09:52:08-03:00 · arquivo local `docs/D05_lei-12592-2012-01-18.md` · SHA-256 `ae4c4aae44ba1bd08493c05fd82e366cdd2f3bf263b93383f93b1f936541fd00`
- **[D06]** Lei Complementar nº 214 de 16/01/2025 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/571468687b4dc8d8f1a3b1dbd5f958ff85fad0cf/federal/leis-complementares/2025/lcp-214-2025-01-16.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei.complementar:2025-01-16;214> · versao_texto: republicação/retificação · cópia de 2026-10-13  
  Lido em 2026-10-17T09:52:10-03:00 · arquivo local `docs/D06_lcp-214-2025-01-16.md` · SHA-256 `f1f80d77a11f96d8eaf7777d647e577d04abd0fc28420ec22664be7a76ed8851`  
  ⚠ versao_texto = 'republicação/retificação' (não é texto compilado: alterações posteriores não aparecem)
- **[D07]** Lei Complementar nº 227 de 13/01/2026 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/6b9308d1da378562fa53395b5c2e9cd311bf86cc/federal/leis-complementares/2026/lcp-227-2026-01-13.md>  
  Fonte oficial declarada: <https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp227.htm> · versao_texto: texto da fonte oficial · cópia de 2026-10-15  
  Lido em 2026-10-17T09:52:11-03:00 · arquivo local `docs/D07_lcp-227-2026-01-13.md` · SHA-256 `47f4fbcbb78694c49003c2c41c5631c0db1c3a1e7cdd19b5c244db5639312156`  
  ⚠ versao_texto = 'texto da fonte oficial' (não é texto compilado: alterações posteriores não aparecem)
- **[D08]** Decreto-Lei nº 1.598 de 26/12/1977 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/d5fce5484986fb975f9fe9c086c943774d63859f/federal/decretos-lei/1977/del-1598-1977-12-26.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:decreto.lei:1977-12-26;1598> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-17T09:52:22-03:00 · arquivo local `docs/D08_del-1598-1977-12-26.md` · SHA-256 `3a4f02e9cca3d46efbd8ed906783149fbf170a2205948643344ca153a5fdf7ed`
- **[D09]** Lcp 214 — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm>  
  Baixado em 2026-10-17T09:52:26-03:00 · arquivo local `docs/D09_lcp214-htm.html` · SHA-256 `d4baa7c4b9800a43164e8a797e1c3db6e4a4267034c08631eab949fbbbf60bc2`

## Registro de buscas
_Nenhuma busca registrada._
