# Relatório de pesquisa legal — das-espelho-guia

**Pergunta:** DAS espelho da guia: vencimento (Res. CGSN 140 art. 40, dia não útil), partilha do Anexo I 2026 e 2027 em R$, janela do RBT12 em 2027 (LC 214 art. 517)
**Aberto em:** 2026-11-20T18:52:34-03:00 · **Atualizado em:** 2026-11-21T01:18:33-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão
Este dossiê serviu à aba "2 · DAS" do simulador (vencimento, partilha, RBT12, sublimite, início de atividade). A seção abaixo fecha a última dúvida que ficava para o contador: **o teto de 5% do ISS na receita acima do sublimite** (21/11/2026).

**Conclusão: em 2026, o ISS de toda parcela do mês fica limitado a 5% da receita, e a diferença vai aos tributos federais. Isso vale também para a parte acima do sublimite.** É o que o manual do PGDAS-D calcula no exemplo 8 [D09]. A parcela normal com RBT12 na 6ª faixa segue o art. 21 III "b" [D03]: o ISS sai em 6,09968%, fica em 5%, e a sobra de 1,09968% vai aos federais. A parcela acima do sublimite segue o art. 24 I "b" item 2 [D03]: o ISS sai em 5,86585%, também fica em 5%, e a sobra de 0,86585% vai aos federais.
- **Divisão da sobra:** usa os pesos fixos da nota da 5ª faixa do Anexo III: IRPJ 6,02%, CSLL 5,26%, Cofins 19,28%, PIS 4,18% e CPP 65,26% [D01, Anexo III].
- **Base dos federais na parcela acima:** é a do art. 21 (art. 24 I "a" [D03]). Ela não herda a sobra que a parcela normal recebeu pelo art. 21 III "b". A sobra de cada parcela fica com a própria parcela.

O simulador já travava o ISS em 5%, mas tinha dois erros, ambos corrigidos na v18 do artifact:
1. **Sobra contada duas vezes:** a parcela acima do sublimite repetia a sobra da parcela normal. No exemplo 8, o DAS saía R$ 4.398,73 mais alto (400 mil × 1,09968%).
2. **Pesos errados:** a sobra era dividida com outros pesos. No art. 21 III "b", eram os da partilha da 6ª faixa. Na parcela acima, eram as alíquotas do mês.

Agora o simulador reproduz o exemplo 8 ao centavo: total de R$ 246.061,47, e cada tributo bate com o manual.

## 2. Fundamentação
| Ponto | Norma (art.) | Fonte | Trecho literal |
|---|---|---|---|
| Teto do ISS e transferência | LC 123 art. 18 § 1º-B I | [D01] | "o percentual efetivo máximo destinado ao ISS será de 5% (cinco por cento), transferindo-se eventual diferença, de forma proporcional, aos tributos federais da mesma faixa de receita bruta anual" |
| Pesos da transferência | LC 123 Anexo III, nota (*) da 5ª faixa | [D01] | "(Alíquota efetiva – 5%) x 6,02%" (IRPJ) … "x 65,26%" (CPP) … "Percentual de ISS fixo em 5%" |
| ISS da parcela acima: alíquota máxima da faixa | LC 123 art. 18 § 17 | [D01] | "estará sujeita, em relação aos percentuais aplicáveis ao ICMS e ao ISS, às alíquotas máximas correspondentes a essas faixas" |
| Mesmo teto no regulamento | Res. CGSN 140 art. 21 III "a" | [D03] | "o percentual efetivo máximo destinado ao ISS será de 5% (cinco por cento), e que eventual diferença será transferida, de forma proporcional, aos tributos federais" |
| Fórmula da parcela acima (SP, sublimite de 3,6 mi) | Res. CGSN 140 art. 24 I "b" 2 | [D03] | "{[(3.600.000,00 × alíquota nominal da 5ª faixa) – (menos) a parcela a deduzir da 5ª faixa]/3.600.000,00} × percentual de distribuição do ICMS/ISS da 5ª faixa" |
| Federais da parcela acima | Res. CGSN 140 art. 24 I "a" | [D03] | "quanto aos tributos federais, aos percentuais efetivos calculados na forma prevista no art. 21" |
| Como o PGDAS-D aplica o teto (P1 e P2) | Manual do PGDAS-D, versão de abril de 2022, exemplo 8 | [D09] | "ISS excedente a ser redistribuído entre os demais tributos = 5,86585% - 5% = 0,86585%" |
| Início de atividade | Res. CGSN 140 art. 24 § 1º I | [D03] | remete à "alínea 'b' do inciso I do caput": o teto e a transferência valem igual com o sublimite proporcional |

## 3. Vigência conferida
- **Alertas do acervo:**
  - D01: texto compilado, cópia de 13/10/2026 (menos de 90 dias). O "Vide LC 214, alterada pela LC 227" no § 1º-B só vale a partir de 2027 (ver abaixo).
  - D03: Sistema Normas da RFB, texto multivigente. Os arts. 21 III "a" e 24 I "b" estão sem "Redação dada" para 2026, então valem como publicados em 2018.
  - Anexos binários: não precisaram ser baixados, porque o trecho citado da partilha está no Anexo III da LC 123 [D01].
- **2027:** a Res. CGSN 190 [D08] muda o quadro.
  - A transferência passa a ir "aos tributos federais e IBS" (art. 21 III, nova redação). O simulador agora leva 0,26% da sobra ao IBS, pela nota da 5ª faixa do Anexo III de 2027.
  - A parcela acima do sublimite passa a ser "tributada conjuntamente com a parcela que não o exceder" (art. 24 I "b", nova redação). Os itens 1 e 2 e os §§ 2º a 7º do art. 24 são revogados. Em 2027 não há fórmula própria nem sobra dupla possível.
- **Manual [D09]:** o arquivo se chama MANUAL_PGDAS-D_2018_V4.pdf, mas a capa diz "Versão - Abril 2022" (metadados do PDF: criado em 18/04/2022). É a cópia do portal da Sefin/RO. As normas citadas no exemplo têm hoje o mesmo texto, e as tabelas do Anexo III de 2026 são as de 2018.
- **Versões mais novas do manual (conferência de 21/11/2026, cerca de 01:20):**
  - Pelo índice de busca, a versão atual no portal do Simples é a de 13/11/2026. Ela vale para os períodos de 2018 a 2026, e o histórico de versões inclui a de 17/06/2025, que corrigiu texto e imagens do item 3.
  - Nenhuma das duas foi lida. O host www8.receita.fazenda.gov.br (189.9.84.33) não respondeu:
    - curl desta máquina: tempo esgotado nas portas 443 e 80;
    - Chrome do usuário: página de erro;
    - leitor web de fora: ECONNREFUSED.
    Então o portal estava fora do ar, e não só bloqueado aqui. Nova tentativa automática a cada 5 minutos, das 01:20 às 03:23 de 21/11 (24 tentativas): nenhuma conexão (curl código 000).
  - Busca pelos números do exemplo ("5,86585%", "0,86585%"): só aparecem versões antigas e fóruns. Nada indica mudança no exemplo 8, mas também nada o confirma na versão nova.

## 4. Ambiguidades (só o que precisa de decisão humana)
Nenhuma sobre o teto de 5%.
- **O que se descartou:** pela letra do art. 24 I, a parcela acima poderia ter o ISS travado em 5% sem levar a diferença a ninguém, porque os federais dela vêm prontos do art. 24 I "a". O exemplo 8 do PGDAS-D [D09] faz a transferência, e o § 1º-B I da LC 123 [D01] não abre exceção. Então essa leitura não vale.
- **Resíduo para o contador:** o simulador não substitui o PGDAS-D. Se um caso real com receita acima do sublimite der diferença contra o PGDAS-D, a pergunta é: "o PGDAS-D desta competência dividiu a sobra do ISS acima de 5% pelos pesos da nota da 5ª faixa do Anexo III (6,02/5,26/19,28/4,18/65,26)?"

## 5. Lacunas
- As versões de 17/06/2025 e de 13/11/2026 do manual do PGDAS-D não foram lidas, porque o portal do Simples estava fora do ar em 21/11/2026. A conferir quando ele voltar:
  - se o exemplo 8 (Viva Bem Ltda) mantém os números: P1 R$ 148.198,08, P2 R$ 97.863,39 e total R$ 246.061,47;
  - se a sobra do ISS acima de 5% continua sendo levada aos federais na parcela acima do sublimite.
  Se algo mudar, o simulador (função `taxasExc`) e esta conclusão precisam ser revistos.
- Fora do escopo do salão: segundo um fórum, quando o ISS é retido na fonte o PGDAS-D não redistribui a sobra. A pista não foi conferida em fonte oficial, e o salão que vende a pessoa física não tem retenção.
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** Lei Complementar nº 123 de 14/12/2006 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/394a7e97c8604703a3ea6638df61ab1873cecc6e/federal/leis-complementares/2006/lcp-123-2006-12-14.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei.complementar:2006-12-14;123> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-11-20T18:53:02-03:00 · arquivo local `docs/D01_lcp-123-2006-12-14.md` · SHA-256 `62ae5f126e5d6a0bf1e149614362aeca97730684067c128251c92cc1f732bdd9`
- **[D02]** Lei Complementar nº 214 de 16/01/2025 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/571468687b4dc8d8f1a3b1dbd5f958ff85fad0cf/federal/leis-complementares/2025/lcp-214-2025-01-16.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei.complementar:2025-01-16;214> · versao_texto: republicação/retificação · cópia de 2026-10-13  
  Lido em 2026-11-20T18:53:05-03:00 · arquivo local `docs/D02_lcp-214-2025-01-16.md` · SHA-256 `f1f80d77a11f96d8eaf7777d647e577d04abd0fc28420ec22664be7a76ed8851`  
  ⚠ versao_texto = 'republicação/retificação' (não é texto compilado: alterações posteriores não aparecem)
- **[D03]** Resolução CGSN nº 140, de 22 de maio de 2018 — Receita Federal - Sistema Normas (API)  
  Link oficial: <https://normasinternet2.receita.fazenda.gov.br/#/consulta/externa/92278/visao/multivigente>  
  Baixado em 2026-11-20T18:53:44-03:00 · arquivo local `docs/D03_rfb-92278-multivigente.json` · SHA-256 `158a09df9d0832b58264f9a0f625f75b9238563c44c967c7b5ea03bde5f48cb3`  
  ⚠ alteração com vigência futura: Alterado(a) pelo(a) Resolução CGSN nº 190, de 4 de agosto de 2026, a partir de 01/01/2027 (rfb:152832)  
  ⚠ alteração com vigência futura: Alterado(a) pelo(a) Resolução CGSN nº 195, de 21 de outubro de 2026, a partir de 01/01/2027 (rfb:154194)  
  ⚠ 24 anexos binários não baixados (o texto integral pode estar neles): as URLs estão no fim do texto e no campo 'anexos'; baixe com 'legal.py baixar' os que a pesquisa citar  
  ⚠ TEXTO MUDOU desde 2026-10-29. Dossiês que citaram a versão anterior: emissao-mei-me-por-tipo D02. Conferir se a conclusão deles ainda vale
- **[D04]** Lcp 214 — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm>  
  Baixado em 2026-11-20T18:53:46-03:00 · arquivo local `docs/D04_lcp214-htm.html` · SHA-256 `6efc444b364971c3b1e563dbd8cd51abd5682b69c049d5a645a05554092c4f83`
- **[D05]** Lei nº 14.759 de 21/12/2023 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/2be2554342e10a19c16058e427dbd3822364d8a9/federal/leis-ordinarias/2023/lei-14759-2023-12-21.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:2023-12-21;14759> · versao_texto: republicação/retificação · cópia de 2026-10-13  
  Lido em 2026-11-20T18:57:55-03:00 · arquivo local `docs/D05_lei-14759-2023-12-21.md` · SHA-256 `3458ce4b0eb829284797bd34f7c19959daca396e85c278b63a2805066a267787`  
  ⚠ versao_texto = 'republicação/retificação' (não é texto compilado: alterações posteriores não aparecem)  
  ⚠ corpo curto ou com aviso (texto integral pode faltar)
- **[D06]** Lei nº 662 de 06/04/1949 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/a8ffff23fc3bfa941c6fdad903b9429e3c6371c8/federal/leis-ordinarias/1949/lei-662-1949-04-06.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:1949-04-06;662> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-11-20T18:57:56-03:00 · arquivo local `docs/D06_lei-662-1949-04-06.md` · SHA-256 `52b0b95bbce511184a63823ca3b341dd3249c3fea06775f7d7e1dcc9ecf32142`
- **[D07]** L14759 — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2023/lei/l14759.htm>  
  Baixado em 2026-11-20T18:58:11-03:00 · arquivo local `docs/D07_l14759-htm.html` · SHA-256 `755248462e2d28f2848da8a65a149d451d227207eb4531aae1dbd5310ca7c0cb`  
  ⚠ há captura de 2026-10-17 (verif-2026-10-17-lgpd-cdc-obrigacoes D18), mas o texto dela não foi guardado
- **[D08]** Resolução CGSN nº 190, de 4 de agosto de 2026 — Receita Federal - Sistema Normas (API)  
  Link oficial: <https://normasinternet2.receita.fazenda.gov.br/#/consulta/externa/152832/visao/multivigente>  
  Baixado em 2026-11-20T19:16:23-03:00 · arquivo local `docs/D08_rfb-152832-multivigente.json` · SHA-256 `9d1b3419c37266069da0ff3eb51292886279aac4674436e4e540b1bbf57dce6b`  
  ⚠ 6 anexos binários não baixados (o texto integral pode estar neles): as URLs estão no fim do texto e no campo 'anexos'; baixe com 'legal.py baixar' os que a pesquisa citar
- **[D09]** MANUAL DO PGDAS — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www.sefin.ro.gov.br/portalsefin/manuais/MANUAL_PGDAS-D_2018_V4.pdf>  
  Baixado em 2026-11-21T00:41:47-03:00 · arquivo local `docs/D09_MANUAL_PGDAS-D_2018_V4-pdf.pdf` · SHA-256 `9980221cb690226594f78b5c3dc375b633657b8acdf9511048ade37386d1f434`

## Registro de buscas
_Nenhuma busca registrada._
