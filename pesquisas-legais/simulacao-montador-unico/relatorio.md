# Relatório de pesquisa legal — simulacao-montador-unico

**Pergunta:** Elegibilidade por ano para a simulação de regime: limites ME/EPP e vedações do Simples (LC 123 arts. 3º e 17), teto do Presumido e obrigação ao Real (Lei 9.718 arts. 13 e 14)
**Aberto em:** 2026-11-21T16:56:03-03:00 · **Atualizado em:** 2026-11-21T17:08:33-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão
A elegibilidade por ano que a simulação de regime e a rota precisam tem base completa em três textos:
- **Simples:** vedado a quem teve receita acima de R$ 4,8 mi **no ano anterior ou no ano em curso** (Res. CGSN 140 art. 15 I [D03]), com os efeitos do excesso do ano em curso pela LC 123 art. 3º § 9º (acima de 20%: exclusão no mês seguinte), § 9º-A (até 20%: só no ano seguinte), § 10 (ano de início, acima de 20%: retroativo) e § 12 (ano de início, até 20%: sem retroagir, efeitos no ano seguinte) [D01]; mais as 26 vedações dos incisos II–XXVII do art. 15 [D03], que consolidam a LC 123 art. 3º § 4º e art. 17 [D01]. A receita é a soma de todos os estabelecimentos (art. 16 § 2º [D03]).
- **Presumido:** só para receita total do ano anterior até R$ 78 mi, ou R$ 6,5 mi × meses de atividade (Lei 9.718 art. 13 [D02]).
- **Real obrigatório:** receita acima do teto e as situações dos incisos II–VII (Lei 9.718 art. 14 [D02]).
Deriváveis do cadastro de hoje: art. 15 II (PJ no capital), XIII (sócio domiciliado no exterior), IV–VI (interdependência, com a receita global informada) e XXIII (locação de imóvel próprio). O resto depende de declaração.

## 2. Fundamentação
| Ponto | Norma (art.) | Fonte | Trecho literal |
|---|---|---|---|
| Vedação por receita | Res. CGSN 140 art. 15 I | [D03] | "que tenha auferido, no ano-calendário imediatamente anterior ou no ano-calendário em curso, receita bruta superior a R$ 4.800.000,00" |
| Excesso > 20% | LC 123 art. 3º § 9º | [D01] | "fica excluída, no mês subsequente à ocorrência do excesso" |
| Excesso ≤ 20% | LC 123 art. 3º § 9º-A | [D01] | "dar-se-ão no ano-calendário subsequente se o excesso [...] não for superior a 20%" |
| Ano de início | LC 123 art. 3º § 10 | [D01] | "com efeitos retroativos ao início de suas atividades" |
| Ano de início, até 20% | LC 123 art. 3º § 12 | [D01] | "não retroagirá ao início das atividades se o excesso [...] não for superior a 20%" |
| Todos os estabelecimentos | Res. CGSN 140 art. 16 § 2º | [D03] | "deverá ser considerado o somatório das receitas brutas de todos os estabelecimentos" |
| PJ no capital | LC 123 art. 3º § 4º I; Res. 140 art. 15 II | [D01] [D03] | "de cujo capital participe outra pessoa jurídica" |
| Sócio no exterior | LC 123 art. 17 II; Res. 140 art. 15 XIII | [D01] [D03] | "cujo titular ou sócio seja domiciliado no exterior" |
| Locação de imóvel próprio | LC 123 art. 17 XV; Res. 140 art. 15 XXIII | [D01] [D03] | "que realize atividade de locação de imóveis próprios" |
| Teto do Presumido | Lei 9.718 art. 13 | [D02] | "igual ou inferior a R$ 78.000.000,00 [...] poderá optar pelo regime de tributação com base no lucro presumido" |
| Obrigação ao Real | Lei 9.718 art. 14 I–VII | [D02] | "Estão obrigadas à apuração do lucro real as pessoas jurídicas" |

## 3. Vigência conferida
- [D01] e [D02]: compilados, cópia de 13/10/2026, sem alerta. A LC 123 traz "(Vide LC 214/LC 227)" em dispositivos do art. 13/18 que não são os citados aqui.
- [D03] lido na fonte oficial (SIJUT, visão multivigente) em 21/11/2026. O art. 15 e o art. 16 § 2º não têm alteração agendada; as Res. CGSN 190 e 195 alteram outros dispositivos a partir de 01/01/2027 (o regime de caixa, art. 16 caput e § 1º).
- Os valores (R$ 4,8 mi, R$ 78 mi) já estão nas tabelas `SIMPLES_LIMITE` e `TAX_ASSESSMENT`; a função lê a tabela, não o número.

## 4. Ambiguidades (só o que precisa de decisão humana)
Nenhuma de lei. As escolhas de modelagem (exclusão no meio do ano, vedação sem dado, receita de exportação) estão nos forks F-MU-7, F-MU-8 e F-MU-11 do BRIEF.

## 5. Lacunas
- A receita de exportação tem limite próprio (Res. 140 art. 2º § 1º e art. 15 I); o razão não a separa (BRIEF §7 insumo 3).
- As vedações não deriváveis (filial de estrangeira, cooperativa, S.A., cisão, débito, cadastro, atividades) não têm dado no sistema.
### Releitura Res. CGSN 196 (27/11/2026)

Item 6 do BRIEF `BE-INCR-SIMPLES-CGSN-196` (lacuna `L-20261125-195503-a785`). Este adendo só acrescenta; o texto acima
fica como estava.
- **Base.** A cópia deste dossiê, [D03], é a mesma das outras sete (SHA-256 do texto `b5a02304…`, anterior à Res. 196).
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
| art. 15 I | vedação por receita acima de R$ 4,8 mi no ano anterior ou no ano em curso | igual (D24 L294) | não muda |
| art. 15 II | PJ no capital | igual (D24 L295) | não muda |
| art. 15 XIII | sócio no exterior | igual (D24 L308). O trecho da tabela acima é a redação da LC 123 art. 17 II. A Res. 140 diz "que possua titular ou sócio domiciliado no exterior" (red. Res. 183/2025), e as duas cópias da 140 trazem o mesmo texto | não muda |
| art. 15 XXIII | locação de imóvel próprio | igual (D24 L329) | não muda |
| art. 16 § 2º | soma de todos os estabelecimentos | igual (D24 L362) | não muda |
| art. 2º § 1º | limite próprio da exportação | igual (D24 L34); a 196 mexe no art. 2º (incisos V a VII do caput e §§ 4º, 8º, 9º e 9º-A), não no § 1º | não muda |

A 196 não toca os arts. 15 e 16. Nenhuma lacuna nova.
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** Lei Complementar nº 123 de 14/12/2006 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/394a7e97c8604703a3ea6638df61ab1873cecc6e/federal/leis-complementares/2006/lcp-123-2006-12-14.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei.complementar:2006-12-14;123> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-11-21T16:56:15-03:00 · arquivo local `docs/D01_lcp-123-2006-12-14.md` · SHA-256 `62ae5f126e5d6a0bf1e149614362aeca97730684067c128251c92cc1f732bdd9`
- **[D02]** Lei nº 9.718 de 27/11/1998 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/2ee55c0d178cb912e1a74026bc8bf4a365018bf0/federal/leis-ordinarias/1998/lei-9718-1998-11-27.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:1998-11-27;9718> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-11-21T16:56:16-03:00 · arquivo local `docs/D02_lei-9718-1998-11-27.md` · SHA-256 `b15173fa6f57c3ef3a6c7709268c5757ad900c2f567a08f2e646ec014feadf12`
- **[D03]** Resolução CGSN nº 140, de 22 de maio de 2018 — Receita Federal - Sistema Normas (API)  
  Link oficial: <https://normasinternet2.receita.fazenda.gov.br/#/consulta/externa/92278/visao/multivigente>  
  Baixado em 2026-11-21T17:01:16-03:00 · arquivo local `docs/D03_rfb-92278-multivigente.json` · SHA-256 `158a09df9d0832b58264f9a0f625f75b9238563c44c967c7b5ea03bde5f48cb3`  
  ⚠ alteração com vigência futura: Alterado(a) pelo(a) Resolução CGSN nº 190, de 4 de agosto de 2026, a partir de 01/01/2027 (rfb:152832)  
  ⚠ alteração com vigência futura: Alterado(a) pelo(a) Resolução CGSN nº 195, de 21 de outubro de 2026, a partir de 01/01/2027 (rfb:154194)  
  ⚠ 24 anexos binários não baixados (o texto integral pode estar neles): as URLs estão no fim do texto e no campo 'anexos'; baixe com 'legal.py baixar' os que a pesquisa citar

## Registro de buscas
_Nenhuma busca registrada._
