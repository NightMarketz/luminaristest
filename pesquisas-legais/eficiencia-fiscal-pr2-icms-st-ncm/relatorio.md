# Relatório de pesquisa legal — eficiencia-fiscal-pr2-icms-st-ncm

**Pergunta:** Quais NCM 3303/3304/3305 estão sob ICMS-ST (Conv. ICMS 142/2018 Anexo de perfumaria e o RICMS/SP) e como a segregação do Simples (LC 123 art. 18 § 4º-A I) depende disso?
**Aberto em:** 2026-10-27T11:07:21-03:00 · **Atualizado em:** 2026-10-27T11:56:28-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão
Em SP, a receita de revenda de perfumaria, higiene pessoal e cosméticos (NCM 3303/3304/3305) só pode ser segregada como ICMS-ST até 31/03/2026. Desde 01/04/2026 a Portaria SRE 94/2025 revogou a lista paulista (Anexo XI da Portaria CAT 68/2019, que o RICMS/SP art. 313-E aplicava) [D02][D03]. O Conv. ICMS 142/2018 Anexo XIX só lista os bens **passíveis** de ST: a adoção depende de acordo entre UFs e, internamente, de cada UF (cláusula segunda) [D01]. O monofásico de PIS/COFINS (Lei 10.147) cai em 01/01/2027 (LC 214 art. 542 XI) [D04]. Daí as linhas `ICMS_ST_NCM_UF` só de SP, DRAFT, com `vigenteAte = 2026-03-31`, e a regra de 2027 aplicada na função (cédula D-2026-10-27-EFICIENCIA-FISCAL-PR2-EXECUCAO).

## 2. Fundamentação
| Ponto | Norma (art.) | Fonte | Trecho literal |
|---|---|---|---|
| Lista nacional é de bens passíveis; a adoção é por acordo/UF | Conv. ICMS 142/2018 cl. 2ª | [D01] | "A adoção do regime de substituição tributária nas operações interestaduais dependerá de acordo específico" |
| NCM de cosméticos no anexo | Conv. ICMS 142/2018 Anexo XIX itens 7.0–22.0 | [D01] | "PRODUTOS DE PERFUMARIA E DE HIGIENE PESSOAL E COSMÉTICOS" |
| Fim da ST de perfumaria em SP | Portaria SRE 94/2025 art. 1º (via RC 33677/2026 § 5) | [D02] | "desde 01/04/2026, o artigo 1º da Portaria SRE 94/2025 revogou o Anexo XI da Portaria CAT 68/2019" |
| Regra paulista da ST de perfumaria | RICMS/SP art. 313-E | [D03] | "SEÇÃO XIII - DAS OPERAÇÕES COM PRODUTOS DE PERFUMARIA" |
| Fim do monofásico de cosméticos | LC 214/2025 art. 542 XI | [D04] | "Ficam revogados a partir de 1º de janeiro de 2027: … XI - a Lei nº 10.147" |

## 3. Vigência conferida
- O acervo não tem convênios CONFAZ de 2018 (só 2021), nem a legislação paulista. Por isso tudo foi lido na fonte oficial: CONFAZ [D01], SEFAZ-SP [D02][D03] e Planalto compilado [D04].
- Redação atual / alterações posteriores: no Anexo XIX não há nota de redação nova para os itens 7.0–22.0. O Conv. ICMS 107/26 mexe no Anexo XX (SP), não no XIX. A RC 33677/2026 é de 13/05/2026.
- Regulamentação pendente ou norma mais específica: a lista paulista em vigor até 31/03/2026 (Anexo XI da Portaria CAT 68/2019) **não foi lida**. Por isso as linhas ficam DRAFT.

## 4. Ambiguidades (só o que precisa de decisão humana)
As três foram decididas pelo dono no AskUserQuestion de 27/10 (cédula D-2026-10-27-EFICIENCIA-FISCAL-PR2-EXECUCAO):
1. o conteúdo da tabela: só SP, DRAFT, até 31/03;
2. sem linha PUBLISHED, o ICMS não é excluído, e o CSOSN 500 só gera alerta;
3. o fim do monofásico em 2027 é aplicado na função, sem fechar a vigência das linhas.

## 5. Lacunas
- O Anexo XI da Portaria CAT 68/2019 (lista de SP até 31/03/2026) e a própria Portaria SRE 94/2025 não foram baixados.
- Legislação de ST das outras 25 UFs e do DF: não lida.
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** CONVÊNIO ICMS 142/18 — Conselho Nacional de Política Fazendária CONFAZ — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www.confaz.fazenda.gov.br/legislacao/convenios/2018/CV142_18>  
  Baixado em 2026-10-27T11:07:22-03:00 · arquivo local `docs/D01_CV142_18.html` · SHA-256 `7c2bdc9db1ceb11faaa56b2582e77e5a1bcb66e51cd62b6de0f155a78359c45a`
- **[D02]** RC 33677/2026 — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://legislacao.fazenda.sp.gov.br/Paginas/RC33677_2026.aspx>  
  Baixado em 2026-10-27T11:08:35-03:00 · arquivo local `docs/D02_RC33677_2026-aspx.html` · SHA-256 `543cc9f15760ac039571d718c5b28ddb01b8cd35a795d7c654f1321c061c9753`
- **[D03]** RICMS - Artigo 313 E a 313 F
						
SEÇÃO XIII - DAS OPERAÇÕES COM PRODUTOS DE PERFUMARIA — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://legislacao.fazenda.sp.gov.br/Paginas/art313e.aspx>  
  Baixado em 2026-10-27T11:08:36-03:00 · arquivo local `docs/D03_art313e-aspx.html` · SHA-256 `ae78f66568762bf33159910dfa97cc8f9e22854e154168e877daac77073e4ed1`
- **[D04]** Lcp 214 — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm>  
  Baixado em 2026-10-27T11:08:57-03:00 · arquivo local `docs/D04_lcp214-htm.html` · SHA-256 `e4477a56b80a530c0225894ae17c4507c1d4bdab4d772999cc5befb4794ef8c8`

## Registro de buscas
_Nenhuma busca registrada._
