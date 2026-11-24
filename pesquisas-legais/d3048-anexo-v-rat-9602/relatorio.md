# Relatório de pesquisa legal — d3048-anexo-v-rat-9602

**Pergunta:** O Decreto 3.048/1999 mudou desde 20/11/2026? No Anexo V vigente, qual é o RAT do CNAE 9602-5/01 (cabeleireiros, manicure e pedicure)?
**Aberto em:** 2026-11-24T01:36:31-03:00 · **Atualizado em:** 2026-11-24T01:38:24-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão
**Vale: o RAT do CNAE 9602-5/01 continua 2% (risco médio).** Grau: **verificado** no Planalto em 24/11/2026.
- O Anexo V do Decreto 3.048, na redação do Decreto 10.410/2020, traz "9602-5/01 · Cabeleireiros, manicure e pedicure · 2"
  [D02].
- Pelo art. 202 II, 2% é a alíquota do risco médio [D01].
- A linha é a mesma da captura do parecer de 20/11 (parecer D40). A vizinhança também: 9601-7/03 com 3, 9602-5/02 com 2 e
  9603-3/01 com 3.

**O "TEXTO MUDOU" que abriu a lacuna 95f3 não é mudança do RAT.** A página do decreto tem as notas de alteração em linha.
- A única norma de 2026 que aparece nela é o **Decreto 13.054, de 03/07/2026** [D03]. Ele mexe só no art. 9º (segurado
  especial associado a cooperativa), em 11 notas [D01]. É anterior a 20/11 e não toca o art. 202, o 202-A nem o Anexo V.
- O Anexo V [D02] não tem nota de alteração de 2021 em diante. As notas mais novas nele são do Decreto 10.491/2020 (edição
  de jornais e revistas).
- O alerta veio de comparar dois tipos de arquivo pela mesma URL: a transcrição manual do parecer (D40, trechos do innerText
  do navegador) e a página baixada. Hashes diferentes eram esperados sem que o texto do decreto mudasse. A memória do projeto
  também registra que o Planalto devolve hashes diferentes no mesmo dia, por causa do rodapé dinâmico.

**Efeito no simulador:** nenhum. O campo `f_rat` tem 2 como padrão e cita o Anexo V, e o FAP continua campo da ficha
(parecer, §RAT). A conclusão do parecer [D40] vale.

## 2. Fundamentação
| Ponto | Norma (art.) | Fonte | Trecho literal |
|---|---|---|---|
| RAT por grau de risco | Decreto 3.048 art. 202 I a III | [D01] | "I - um por cento … leve; II - dois por cento … médio; ou III - três por cento … grave" |
| Atividade preponderante | art. 202 § 3º (red. Dec. 10.410/2020) | [D01] | "Considera-se preponderante a atividade que ocupa, em cada estabelecimento da empresa, o maior número de segurados empregados e de trabalhadores avulsos" |
| Tabela no Anexo V | art. 202 § 4º | [D01] | "compõem a Relação de Atividades Preponderantes e correspondentes Graus de Risco, prevista no Anexo V" |
| Redação do anexo | Anexo V (cabeçalho) | [D02] | "ANEXO V (Redação dada pelo Decreto nº 10.410, de 2020 … CNAE 2.3 / Descrição / Alíquota (%)" |
| Linha do salão | Anexo V | [D02] | "9602-5/01 · Cabeleireiros, manicure e pedicure · 2" |
| Estética, para comparar | Anexo V | [D02] | "9602-5/02 · Atividades de estética e outros serviços de cuidados com a beleza · 2" |
| Única alteração de 2026 | Decreto 13.054/2026 art. 1º | [D03] | "Altera o Regulamento da Previdência Social … para dispor sobre a condição de segurado especial dos associados em cooperativas" |
| FAP | art. 202-A | [D01] | "serão reduzidas em até cinquenta por cento ou aumentadas em até cem por cento em razão do desempenho da empresa, individualizada pelo seu CNPJ" |

## 3. Vigência conferida
- **Alertas do acervo e como foram resolvidos.** O Decreto 3.048 não está no acervo (a pasta `federal/decretos/1999` pula do
  3.047 para o 3.049, parecer D40). Li a fonte oficial: o Planalto, com o texto principal [D01] e o volume 1 do Anexo V [D02].
  Desta vez o `legal.py baixar` passou (em 20/11 tinha dado timeout).
- **Redação atual.** As notas de 2026 na página são todas do Decreto 13.054/2026 (3 "Redação dada" e 8 "Incluído"), no art. 9º
  [D01; D03]. O art. 202 tem notas até o Decreto 10.410/2020. O Anexo V tem o rótulo "(Redações anteriores)" no topo, mas se
  declara na redação do Decreto 10.410/2020. O parecer já tinha registrado esse rótulo em 20/11.
- **Comparação com 20/11.** Os hashes não se comparam: o D40 guardou o hash do innerText do navegador, e aqui é o arquivo
  baixado. A comparação foi pelo conteúdo da linha 9602-5/01 e das vizinhas, que é igual.
- **O dossiê `emenda-pes4-ponte-folha`**, que deu o alerta em 21/11, está na `main` só com o `relatorio.md`, sem o
  `manifest.json` nem os `docs/*.txt`. Não há a captura de 21/11 para comparar. O texto de hoje basta para a conclusão.

## 4. Ambiguidades (só o que precisa de decisão humana)
Nenhuma para o salão de cabeleireiro. Duas observações:
- **Salão com mais esteticistas do que cabeleireiros.** A preponderância se mede por estabelecimento, pelo número de
  empregados [D01, art. 202 § 3º]. Se a maioria dos empregados for de estética, o CNAE preponderante é o 9602-5/02. A alíquota
  é a mesma (2%) [D02], então o número não muda.
- **FAP.** Multiplica o RAT de 0,5 a 2,0 e é de cada CNPJ [D01, art. 202-A]. Continua campo da ficha.

## 5. Lacunas
- A ferramenta: o "TEXTO MUDOU" compara uma transcrição manual (D40 do parecer) com a página baixada pela mesma URL. Vai à
  caixa de lacunas como assunto do `legal.py`, junto com o caso igual do D75 (dossiê `salao-fpas-515`).
- O dossiê `emenda-pes4-ponte-folha` não tem o `manifest.json` na `main` (seção 3). Vai à caixa: sem o `.txt`, a próxima
  captura não tem com o que comparar (VERIFICACAO-LEGAL, "Commit do dossiê").
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** D3048 — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/decreto/d3048.htm>  
  Baixado em 2026-11-24T01:36:32-03:00 · arquivo local `docs/D01_d3048-htm.html` · SHA-256 `0ea9c2ac49a2e0bb9155f675d48ce9ca061840637812fc208b1dc75169f374ae`  
  ⚠ TEXTO MUDOU desde 2026-11-20. Dossiês que citaram a versão anterior: parecer-salao-sp-4-pessoas D40. Conferir se a conclusão deles ainda vale
- **[D02]** D3048anexoiv-v-vol1 — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/decreto/d3048anexov-vol1.htm>  
  Baixado em 2026-11-24T01:36:54-03:00 · arquivo local `docs/D02_d3048anexov-vol1-htm.html` · SHA-256 `8c0cbd67eb1771b3925c452b490fc3e947e37e0b32f7fb1925262e786ccce8d5`
- **[D03]** d13054 — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2026/decreto/d13054.htm>  
  Baixado em 2026-11-24T01:37:21-03:00 · arquivo local `docs/D03_d13054-htm.html` · SHA-256 `9b45d51735db19959ca30a81306700877054db5e77fdaff66c39eb9fef0f7fdf`

## Registro de buscas
_Nenhuma busca registrada._
