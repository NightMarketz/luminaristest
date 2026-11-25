# Relatório de pesquisa legal — marcos-restantes-onda32

**Pergunta:** Datas de corte: opção IBS/CBS no DAS (LC 123 art. 13 §§9-10), fim do regime de caixa (Res. CGSN 190/2026), IBS municipal 2026
**Aberto em:** 2026-11-24T16:31:41-03:00 · **Atualizado em:** 2026-11-24T17:03:04-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão
Os três literais de data que sobravam fora de `MARCO_LEGAL` no #1363 têm norma e valem 2027-01-01:
- **Opção do IBS/CBS no DAS** (`CompanyFiscalProfileService`: trava do `upsert` e `ibsCbsNoDas`): LC 214/2025 art. 517 (nova redação do art. 13 da LC 123, IX–X e §§ 9º a 11) com efeitos a partir de 01/01/2027 pelo art. 544 III (que lista o art. 517 nas duas redações) — texto no Planalto, dossiê `marco-legal-lc214` [D02]. O acervo [D01] só traz "(Vide LC 214)" nos §§ 9º e 10 do art. 13.
- **Fim do regime de caixa** (`assertCaixaAte2026`, agora `assertCaixaAntesDoFim`): Res. CGSN 190/2026 art. 1º (art. 16 caput da Res. 140: "receita bruta total mensal auferida") e art. 8º IX e XII (revogam o art. 16 § 1º e os arts. 19 e 20), efeitos a partir de 01/01/2027 pelo art. 9º II, **na redação da Res. CGSN 196/2026** [D02].
- **IBS municipal** (`aliquotasIbsCbsVigentes`): LC 214 art. 343 (fatos geradores de 2026: só IBS estadual de 0,1%) e art. 344 (de 01/01/2027: estadual 0,05% + municipal 0,05%).

## 2. Fundamentação
| Ponto | Norma (art.) | Fonte | Trecho literal |
|---|---|---|---|
| Opção IBS/CBS (efeitos) | LC 214 art. 544 III | dossiê marco-legal-lc214 [D02] | "a partir de 1º de janeiro de 2027, em relação aos arts. … 517, 519 a 534 e 542" |
| Opção IBS/CBS (conteúdo) | LC 123 art. 13 § 9º (red. LC 214 art. 517 / LC 227) | idem | "É facultado ao optante pelo Simples Nacional apurar e recolher o IBS e a CBS de acordo com o regime regular" |
| Caixa (conteúdo) | Res. CGSN 190 art. 1º (art. 16 caput) e art. 8º IX, XII | [D02] | "será a receita bruta total mensal auferida"; "§1º do art. 16"; "art. 19 e 20" · vigência 01/01/2027 |
| Caixa (efeitos) | Res. CGSN 190 art. 9º II (red. Res. CGSN 196/2026) | [D02] | "a partir de 1º de janeiro de 2027, em relação às demais alterações da Resolução CGSN nº 140" |
| IBS municipal | LC 214 art. 343 e 344 | dossiê marco-legal-lc214 [D02] | "fatos geradores ocorridos de 1º de janeiro a 31 de dezembro de 2026, o IBS será cobrado mediante aplicação da alíquota estadual de 0,1%" / "2027 a 2028 … alíquota municipal de 0,05%" |

## 3. Vigência conferida
- [D01] LC 123 do acervo: compilada, cópia de 2026-10-13, sem alerta; os §§ 9º e 10 do art. 13 são só remissão à LC 214 — o texto vem do Planalto (dossiê marco-legal-lc214).
- [D02] Res. CGSN 190: NÃO está no acervo; lida no Normas RFB (multivigente, idAto 152832). `legal.py` avisou "TEXTO MUDOU desde 2026-11-24": a Res. CGSN 196/2026 (vigência 24/11/2026) reescreveu o art. 9º (antes um só efeito, 2027) em dois incisos e revogou trechos da 190. As linhas relidas para o caixa (art. 16 caput, art. 8º IX e XII) não têm anotação da 196. A data de 01/01/2027 se mantém, agora pelo art. 9º II. Citações antigas a "art. 9º" ficam na caixa de lacunas.
- Regulamentação pendente: nenhuma lida.

## 4. Ambiguidades (só o que precisa de decisão humana)
Nenhuma para a data. Fora do escopo desta fatia: o texto do art. 9º I da 190 trata dos arts. 144-D e 144-E da Res. 140 (efeito imediato) — não toca os marcos aqui.

## 5. Lacunas
- `SimplesApuracaoService.ts:77` (`INICIO_CGSN190_MES_SEGUINTE`, 2% de ISS no mês seguinte ao início de atividade; Res. CGSN 190 art. 9º): fica como literal de propósito (decisão do dono); a citação "art. 9º" precisa ser atualizada para o inciso II (lacuna registrada).
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** Lei Complementar nº 123 de 14/12/2006 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/394a7e97c8604703a3ea6638df61ab1873cecc6e/federal/leis-complementares/2006/lcp-123-2006-12-14.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei.complementar:2006-12-14;123> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-11-24T16:31:50-03:00 · arquivo local `docs/D01_lcp-123-2006-12-14.md` · SHA-256 `62ae5f126e5d6a0bf1e149614362aeca97730684067c128251c92cc1f732bdd9`
- **[D02]** Resolução CGSN nº 190, de 4 de agosto de 2026 — Receita Federal - Sistema Normas (API)  
  Link oficial: <https://normasinternet2.receita.fazenda.gov.br/#/consulta/externa/152832/visao/multivigente>  
  Baixado em 2026-11-24T16:33:07-03:00 · arquivo local `docs/D02_rfb-152832-multivigente.json` · SHA-256 `38a118e86ac90bd8f9bd9f4efb8e2fe947cc5af9216c27150d3a5537ca68e66f`  
  ⚠ 6 anexos binários não baixados (o texto integral pode estar neles): as URLs estão no fim do texto e no campo 'anexos'; baixe com 'legal.py baixar' os que a pesquisa citar  
  ⚠ TEXTO MUDOU desde 2026-11-24. Dossiês que citaram a versão anterior: emissao-mei-me-por-tipo D03, dp-cobertura-100 D20, das-espelho-guia D08, parecer-salao-sp-4-pessoas D37, ciclo-fiscal-prazos D09, nfse-2027-salao-parceiro-cbs-ibs D04, simples-6-02-6-03-fator-r D05. Conferir se a conclusão deles ainda vale

## Registro de buscas
_Nenhuma busca registrada._
