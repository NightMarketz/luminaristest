# Relatório de pesquisa legal — verif-2026-10-17-irpj-csll-correcoes

**Pergunta:** Correções IRPJ/CSLL de 17/10: adicional trimestral, CSLL de bancos 2020-2026, 8% hospitalar na IN 2.343
**Aberto em:** 2026-10-17T10:53:37-03:00 · **Atualizado em:** 2026-10-17T11:03:27-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão
Dossiê de apoio às 3 correções de IRPJ/CSLL do consolidado de 17/10 (dossiê-mãe: `verif-2026-10-17-irpj-csll`).
1. **Adicional trimestral:** o limite é R$ 20 mil × "número de meses do respectivo período de apuração" [D03 art. 3º § 1º], inclusive na incorporação, fusão, cisão e extinção [D03 art. 3º § 2º]. O código passa a usar os meses do trimestre em atividade.
2. **CSLL de bancos (código 3):** 25% de 01/07/2021 a 31/12/2021 [D05 art. 1º (Lei 7.689 art. 3º III na redação da MP) e art. 5º II; D02 art. 1º (II-A)]; 21% de 01/08/2022 a 31/12/2022 [D01 art. 3º parágrafo único, nota de vigência da MP 1.115]; 20% no resto (03/2020–06/2021, 01–07/2022, 2023–03/2026) [D01 art. 3º II-A; D02 art. 1º].
3. **8% hospitalar:** a IN 2.343/2026 reescreveu o art. 33 § 1º II a e o § 4º da IN 1.700 [D04 arts. 1º–3º]. Só registro no brief (P-7); não implementado.

## 2. Fundamentação
| Ponto | Norma (art.) | Fonte | Trecho literal |
|---|---|---|---|
| Adicional | Lei 9.249 art. 3º § 1º | [D03] | "pelo número de meses do respectivo período de apuração" |
| 25% bancos | MP 1.034 art. 1º; art. 5º II | [D05] | "vinte e cinco por cento até o dia 31 de dezembro de 2021"; vigência "no primeiro dia do quarto mês subsequente ao de sua publicação" (01/03/2021 ⇒ 01/07/2021) |
| 25% → 20% | Lei 14.183 art. 1º (II-A) | [D02] | "25% (vinte e cinco por cento) até o dia 31 de dezembro de 2021 e 20% (vinte por cento) a partir de 1º de janeiro de 2022" |
| 21% bancos | Lei 7.689 art. 3º p.ú. | [D01] | "de 16% (dezesseis por cento) e de 21% (vinte e um por cento), respectivamente, até 31 de dezembro de 2022" (MP 1.115 de 28/04/2022, efeitos no 1º dia do 4º mês subsequente ⇒ 01/08/2022) |
| Hospitalar | IN 1.700 art. 33 § 1º II a, § 4º I, IV, V (red. IN 2.343) | [D04] | lista com fisioterapia, terapia ocupacional, fonoaudiologia, anestesiologia…; "sociedade empresária" + Anvisa |

## 3. Vigência conferida
- Alertas do acervo: D02 (republicação), D04 (publicação original) e D05 (original). Os trechos usados são os próprios dispositivos alterados e foram conferidos contra a Lei 7.689 compilada [D01]. O dossiê-mãe já conferiu a IN 1.700 multivigente no Sijut (sha `faa47fa1…`, igual a 09/10). Não fui à fonte oficial: não há evidência de texto mais novo.
- Redação atual: Lei 7.689 art. 3º II-A na redação da LC 224 (20% desde 01/04/2026) [D01]; Lei 9.249 art. 3º compilada [D03].
- Datas de início (01/07/2021 e 01/08/2022): lidas nas cláusulas de vigência das MPs (verificado no texto; o dossiê-mãe as tinha como inferidas).

## 4. Ambiguidades (só o que precisa de decisão humana)
- **A6 / P-B4 — mês fracionado no adicional:** o código conta inteiro o mês que a atividade toca (PJ aberta em 10/02 ⇒ 2 meses no T01), como o anual já fazia. Leitura alternativa: só meses completos (1 mês no exemplo, limite menor, mais adicional). A lei não fala em fração [D03]. Pergunta ao contador (já registrada em 10/10): "Pela Lei 9.249 art. 3º § 1º, numa PJ do Presumido aberta em 10/02, o adicional do T01 usa R$ 20 mil × 2 (fev–mar)? Fevereiro parcial conta como mês inteiro?"
- **Código ECF 3 em 2021-H2 e 2022-H2:** a tabela `CSLL_ALIQUOTA` é chaveada pelo `IND_ALIQ_CSLL` da ECF. Não conferi se o leiaute da ECF dos AC 2021/2022 usava o código 3 para os bancos a 25%/21% ou outro código. Sem efeito hoje (a apuração exige ano ≥ 2025).

## 5. Lacunas
- Texto anterior do art. 33 § 4º II e III da IN 1.700 (revogados pela IN 2.343): não está neste dossiê; o dossiê-mãe [D15 de lá] tem a multivigente.
- Leiaute da ECF de 2021/2022 (códigos de IND_ALIQ_CSLL): não relido.
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** Lei nº 7.689 de 15/12/1988 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/109b06481773474599dbf7e4d73a01309b658007/federal/leis-ordinarias/1988/lei-7689-1988-12-15.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:1988-12-15;7689> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-17T10:53:39-03:00 · arquivo local `docs/D01_lei-7689-1988-12-15.md` · SHA-256 `7c57b2c916e9d1627edd79bf85758f111d036cbf52c0964fb2527090ac0ed22b`
- **[D02]** Lei nº 14.183 de 14/07/2021 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/e3db373dc20968124cc876ee38efba5f3ded5926/federal/leis-ordinarias/2021/lei-14183-2021-07-14.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:2021-07-14;14183> · versao_texto: republicação/retificação · cópia de 2026-10-13  
  Lido em 2026-10-17T10:53:40-03:00 · arquivo local `docs/D02_lei-14183-2021-07-14.md` · SHA-256 `990a572ccdb2d87c36bd9857596758c8468cc326f9501d4585c233140d1f82ca`  
  ⚠ versao_texto = 'republicação/retificação' (não é texto compilado: alterações posteriores não aparecem)
- **[D03]** Lei nº 9.249 de 26/12/1995 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/d955e7e66c4a7176278ee8ac74513668de7fc989/federal/leis-ordinarias/1995/lei-9249-1995-12-26.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:1995-12-26;9249> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-17T10:53:41-03:00 · arquivo local `docs/D03_lei-9249-1995-12-26.md` · SHA-256 `18cb96b64a850a3f9b738da870044230b76a336068e3fae79cb83f10b14d4699`
- **[D04]** INStrução normativa rfb Nº 2.343, DE 17 DE setembro DE 2026 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/808531961ddbb516885d7bb43171ee4f19656b80/reguladores/rfb/instrucoes-normativas/2026/instrucao-normativa-rfb-n-2.343-de-17-de-setembro-de-2026-732611655.md>  
  Fonte oficial declarada: <https://www.in.gov.br/web/dou/-/instrucao-normativa-rfb-n-2.343-de-17-de-setembro-de-2026-732611655> · versao_texto: publicação original · cópia de 2026-10-15  
  Lido em 2026-10-17T10:53:42-03:00 · arquivo local `docs/D04_instrucao-normativa-rfb-n-2-343-de-17-de-setembro-de-2026-73.md` · SHA-256 `5a2d9eaa418c355a526a350487761e906b60837dff62f2285b3f25d19aac37bf`  
  ⚠ versao_texto = 'publicação original' (não é texto compilado: alterações posteriores não aparecem)
- **[D05]** Medida Provisória nº 1.034 de 01/03/2021 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/ea0d91e6d324be2e3f53149980cb9048e55732da/federal/medidas-provisorias/2021/mpv-1034-2021-03-01.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:medida.provisoria:2021-03-01;1034> · versao_texto: original · cópia de 2026-10-15  
  Lido em 2026-10-17T10:54:11-03:00 · arquivo local `docs/D05_mpv-1034-2021-03-01.md` · SHA-256 `9879caa402fddbec4f481d843be103d8fdc14a8e888b3f5726869e9d499cf07b`  
  ⚠ versao_texto = 'original' (não é texto compilado: alterações posteriores não aparecem)

## Registro de buscas
_Nenhuma busca registrada._
