# Relatório de pesquisa legal — pc1-memoria-calculo

**Pergunta:** P-C1: que formato da memória de cálculo do IRPJ/CSLL (EXPORT_TAX_ASSESSMENT_MEMO) serve para o contador conferir e arquivar — há formato obrigatório? qual layout oficial a conferência usa?
**Aberto em:** 2026-11-03T00:34:02-03:00 · **Atualizado em:** 2026-11-03T00:35:47-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão

**A P-C1 sai do contador.** Nenhuma norma fixa o formato da memória de cálculo do IRPJ/CSLL. A lei manda **guardar**
os papéis que sustentam a apuração até a prescrição, em qualquer formato: Lei 8.981/1995 art. 45 III [D03] (Presumido)
e CTN art. 195 parágrafo único [D04]. O que fixa linhas e códigos é a **ECF**. O cálculo do Presumido sai nos registros
P200/P300 (IRPJ) e P400/P500 (CSLL); o do Real, nos registros N620/N630 (IRPJ) e N660/N670 (CSLL). Cada registro tem uma
linha por `CODIGO` da tabela dinâmica do Sped, com descrição e valor [D01] (Registro P300, campos 2–3) [D02]. Conferir a
apuração é bater a memória com essas linhas.

**Saída adotada (b, "colunas a mudar"):** manter o formato longo, que é o mesmo da ECF (uma linha por passo, resumo antes
da memória), e acrescentar duas colunas: `registroEcf` e `linhaEcf`, com o código da tabela dinâmica correspondente ao
passo (ex.: `ADICIONAL` → P300 linha 4). O passo sem linha na ECF, como a guarda de circularidade, fica com as duas
colunas vazias. A pergunta 2 do pedido também sai: a conta contábil já vai na coluna `fonte`. A data do recolhimento é
do DARF e da DCTFWeb/MIT ([[X9]]), não da memória de cálculo.

## 2. Fundamentação

| Ponto | Norma (art.) | Fonte | Trecho literal |
|---|---|---|---|
| Guarda dos papéis no Presumido, sem formato | Lei 8.981/1995 art. 45 III | [D03] | "em boa guarda e ordem [...] os documentos e demais papéis que serviram de base para escrituração comercial e fiscal" |
| Guarda até a prescrição | CTN art. 195 parágrafo único | [D04] | "os comprovantes dos lançamentos neles efetuados serão conservados até que ocorra a prescrição" |
| Linha da ECF = código da tabela dinâmica | Manual da ECF, leiaute 12, Registro P300 campo 2 | [D01] | "Código, conforme tabela dinâmica do Sped" |
| Códigos das linhas (P200 1–26 e 25100–25250; P300 1–18500; P400 1–21 e 20100–20230; P500 1–18500; N620/N630A-C/N660/N670) | Tabelas dinâmicas da ECF, leiaute 12 (28/05/2026) | [D02] | ex.: P300 "4 \| Adicional"; P300 "15 \| IMPOSTO DE RENDA A PAGAR"; P500 "13 \| CSLL A PAGAR" |
| "Memória de cálculo detalhada" só é exigida em caso específico | Manual da ECF §1.33 (Outras Exclusões > R$ 20 mi no M300A/M350A) | [D01] | "Memória de cálculo detalhada." (requerimento web) — não se aplica ao produto |

Correspondência proposta (Presumido; grau **inferido**, conferir linha a linha na implementação):

| Passo da memória | IRPJ | CSLL |
|---|---|---|
| `RECEITA_SERVICO` (32%) | P200 8 | P400 4 |
| `RECEITA_REVENDA` | P200 4 (8%) | P400 2 (12%) |
| `PRESUNCAO_*` (soma) | P200 10 | P400 6 |
| `LC224_RECEITA_ACUMULADA`, `_LIMITE_TRIMESTRE`, `_EXCEDENTE`, `_EXCEDENTES_ANTERIORES`, `_LIMITE_ANUAL`, `_EXCEDENTE_ANUAL` | P200 25130, 25140, 25150, 25160, 25180, 25190 | P400 20130, 20140, 20150, 20160, 20180, 20190 |
| `LC224_ACRESCIMO_*` | P200 25210–25250 | P400 20210–20230 |
| `BASE` | P200 26 = P300 1 | P400 21 = P500 1 |
| `ALIQUOTA` | P300 3 | P500 2 |
| `ADICIONAL` | P300 4 | — |
| `RETIDO_MESES` | P300 10 | P500 11 |
| `A_PAGAR` | P300 15 | P500 13 |
| `DIFERENCA_POSTERGADA` | P300 17 | P500 15 |

No Real, o mesmo vale para N620 (estimativa IRPJ), N630A–C (IRPJ trimestral/anual), N660 (estimativa CSLL) e N670 (CSLL
trimestral/anual), com `BASE` → linha 1 (N630/N670) ou 1–2 (N620/N660), `ADICIONAL` → N630 4 e `A_PAGAR` → N630 26 /
N670 21.

## 3. Vigência conferida

- [D01] e [D02] baixados de sped.rfb.gov.br em 03/11/2026, com hash igual ao da cópia de 27/10 (`7216ec2b…`, `366b8d90…`):
  é o leiaute 12 vigente (AC 2025, situação especial 2026).
- [D03] e [D04] do acervo, texto compilado de 13/10/2026, sem alerta.
- Tabelas com linhas datadas: as linhas LC 224/25 do P400/P500 valem desde 01/04/2026, e as do P200/P300 desde 01/01/2026.
  A correspondência tem de respeitar `DT_INI`/`DT_FIM` de cada linha.

## 4. Ambiguidades

- **A preferência pessoal de um contador não se pesquisa.** Ela fica coberta pelo layout oficial que ele já usa para
  conferir. Se o contador do 1º cliente quiser outro formato, a mudança é de exportação, sem efeito no cálculo.

## 5. Lacunas

- A correspondência linha a linha é inferida da descrição das tabelas. Ela se confirma na implementação, gerando a ECF e a
  memória do mesmo período e comparando valor por código.
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** D01_Manual_ECF_Leiaute_12_20_05_2026_AC_2025_SIT_ESP_2026-pdf — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <http://sped.rfb.gov.br/estatico/54/7E3B296352B7AFD32210C180962BDB938B0804/Manual_ECF_Leiaute_12_20_05_2026_AC_2025_SIT_ESP_2026.pdf>  
  Baixado em 2026-11-03T00:34:20-03:00 · arquivo local `docs/D01_Manual_ECF_Leiaute_12_20_05_2026_AC_2025_SIT_ESP_2026-pdf.pdf` · SHA-256 `7216ec2bd62de7d45e5b019298be2420d08c2a3c6ade3646a053412937e95265`
- **[D02]** D02_Tabelas_Dinamicas_ECF_Leiaute_12_28_05_2026_AC_2025_SIT_ESP_ — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <http://sped.rfb.gov.br/estatico/E1/20FDEEE25CAA9F998AC2AD3045DE0E9C631D3C/Tabelas_Dinamicas_ECF_Leiaute_12_28_05_2026_AC_2025_SIT_ESP_2026.xlsx>  
  Baixado em 2026-11-03T00:34:20-03:00 · arquivo local `docs/D02_Tabelas_Dinamicas_ECF_Leiaute_12_28_05_2026_AC_2025_SIT_ESP_.html` · SHA-256 `366b8d9030a04e9f6203b6ae29ace49d3ffa3fa0c1f5a7a18b0c967b9a5a3cac`
- **[D03]** Lei nº 8.981 de 20/01/1995 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/8bf2e5070525043cb82294b9de8630a4aea5e53d/federal/leis-ordinarias/1995/lei-8981-1995-01-20.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:1995-01-20;8981> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-11-03T00:34:50-03:00 · arquivo local `docs/D03_lei-8981-1995-01-20.md` · SHA-256 `b567b47ee6be147deb0aeea63f5cc92d7c93652f40fae948125979dac84680e7`
- **[D04]** Lei nº 5.172 de 25/10/1966 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://raw.githubusercontent.com/ctresb/leis/main/federal/leis-ordinarias/1966/lei-5172-1966-10-25.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:1966-10-25;5172> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-11-03T00:34:55-03:00 · arquivo local `docs/D04_lei-5172-1966-10-25.md` · SHA-256 `fe8ef71d4ebe8c0d04d3422ca95853e15291c5c7ca6168cd34ae7b8ee6e3983b`

## Registro de buscas
_Nenhuma busca registrada._
