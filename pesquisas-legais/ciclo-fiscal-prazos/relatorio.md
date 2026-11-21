# Relatório de pesquisa legal — ciclo-fiscal-prazos

**Pergunta:** Prazos legais (vencimento de guia e de entrega) de cada obrigação do calendário fiscal por competência: DAS/PGDAS-D, IRPJ/CSLL, PIS/COFINS, DCTFWeb, EFD-Reinf, ECD, ECF, DEFIS, DASN-SIMEI, CBS/IBS — regra de dia não útil de cada um
**Aberto em:** 2026-11-21T16:05:42-03:00 · **Atualizado em:** 2026-11-21T16:12:55-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão

Prazo de cada obrigação do calendário fiscal por competência, com a regra de dia não útil de cada uma:

| Obrigação | Prazo | Dia não útil | Fonte |
|---|---|---|---|
| DAS (Simples ME/EPP) | dia 20 do mês seguinte ao da receita | **adia** para o dia útil seguinte se não houver expediente bancário | Res. CGSN 140 art. 40 caput e § 3º [D04] |
| PGDAS-D | até o vencimento do DAS (art. 40), sobre os fatos do mês anterior | o mesmo do DAS | Res. CGSN 140 art. 38 § 2º II [D04] |
| IRPJ/CSLL trimestral (quota única) | último dia útil do mês seguinte ao fim do trimestre | já é dia útil | Lei 9.430 art. 5º caput; art. 28 para a CSLL [D02] |
| IRPJ/CSLL estimativa mensal | último dia útil do mês seguinte | já é dia útil | Lei 9.430 art. 6º caput [D02] |
| IRPJ/CSLL ajuste anual | último dia útil de março do ano seguinte | já é dia útil | Lei 9.430 art. 6º § 1º I [D02] (dossiê `pc1-vencimento-darf-irpj-csll`) |
| PIS/COFINS (até 12/2026) | dia 25 do mês seguinte | **antecipa** para o dia útil anterior | MP 2.158-35 art. 18 II e parágrafo único [D03] |
| DCTFWeb mensal | último dia útil do mês seguinte | já é dia útil (o § 1º que adiava foi revogado pela IN 2.248/2025) | IN RFB 2.237 art. 6º [D08] |
| EFD-Reinf mensal | dia 15 do mês seguinte | **adia** para o dia útil seguinte | IN RFB 2.043 art. 6º caput e § 2º [D07] |
| EFD-Reinf de dividendo isento | dia 15 do 2º mês depois do trimestre | adia | IN RFB 2.043 art. 6º § 3º [D07] |
| ECD | último dia útil de junho do ano seguinte | já é dia útil | IN RFB 2.003 art. 5º [D05] |
| ECF | último dia útil de julho do ano seguinte | já é dia útil | IN RFB 2.004 art. 3º [D06] |
| DEFIS (anos até 2026) | 31 de março do ano seguinte | não há regra | Res. CGSN 140 art. 72 § 1º [D04]; revogado a partir de 01/01/2027 [D09] |
| Bloco anual do PGDAS-D (desde 2027) | de janeiro a março, uma vez por ano | não há regra | Res. CGSN 140 art. 38-B § 1º, incluído pela Res. CGSN 190 [D09] |
| DASN-SIMEI | último dia de maio | não há regra | Res. CGSN 140 art. 109 [D04] |
| CBS (desde 2027) | último dia útil do mês seguinte | já é dia útil | Decreto 12.955 art. 45 (dossiê `verif-2026-10-23-ibs-cbs-vencimento`; já é a linha `IBS_CBS/CBS/VENCIMENTO`) |

As regras não têm a mesma forma. Há "dia N, adia", "dia N, antecipa", "último dia útil" e "data fixa". Por isso o
calendário precisa de uma **regra por obrigação**, não de um único parâmetro. O código já tem três intérpretes:
`prazoReinfMensal` (adia), `ultimoDiaUtilAteDia20` (antecipa) e `ultimoDiaUtilDoMesSeguinte`.

## 2. Fundamentação
| Ponto | Norma (art.) | Fonte | Trecho literal |
|---|---|---|---|
| DAS dia 20 | Res. CGSN 140 art. 40 | [D04] | "deverão ser pagos até o dia 20 (vinte) do mês subsequente" |
| DAS adia | art. 40 § 3º | [D04] | "deverão ser pagos até o dia útil imediatamente posterior" |
| Prorrogação por calamidade | art. 40-A | [D04] | prorroga por até 6 meses o vencimento no município com decreto de calamidade reconhecido |
| PGDAS-D | art. 38 § 2º II | [D04] | "até o vencimento do prazo para pagamento dos tributos devidos" |
| IRPJ trimestral | Lei 9.430 art. 5º | [D02] | "até o último dia útil do mês subseqüente ao do encerramento do período de apuração" |
| Estimativa | Lei 9.430 art. 6º | [D02] | "até o último dia útil do mês subseqüente àquele a que se referir" |
| PIS/COFINS | MP 2.158-35 art. 18 II | [D03] | "até o 25º (vigésimo quinto) dia do mês subsequente" |
| PIS/COFINS antecipa | art. 18 parágrafo único | [D03] | "considerar-se-á antecipado o prazo para o primeiro dia útil que o anteceder" |
| DCTFWeb | IN 2.237 art. 6º | [D08] | "até o último dia útil do mês seguinte ao da ocorrência dos fatos geradores" |
| Reinf | IN 2.043 art. 6º § 2º | [D07] | "postergado para o primeiro dia útil subsequente ao dia 15" |
| ECD | IN 2.003 art. 5º | [D05] | "até o último dia útil do mês de junho do ano subsequente" |
| ECF | IN 2.004 art. 3º | [D06] | "até o último dia útil do mês de julho do ano seguinte" |
| DEFIS | Res. CGSN 140 art. 72 § 1º | [D04] | "até 31 de março do ano-calendário subsequente" |
| DEFIS revogada em 2027 | Res. CGSN 190, lista de revogações, XXI | [D09] | "o art. 72" (vigência 01/01/2027) |
| Bloco anual no PGDAS-D | art. 38-B § 1º (Res. 190) | [D09] | "no período de janeiro a março de cada ano-calendário" |
| PGDAS-D assistida (2027) | art. 38-A (Res. 190) | [D09] | pré-preenchida pela RFB "até o décimo dia do mês subsequente" |
| DASN-SIMEI | Res. CGSN 140 art. 109 | [D04] | "até o último dia de maio de cada ano" |

## 3. Vigência conferida
- **Alertas do acervo.** Nenhum em [D01]–[D03], que estão compilados e foram copiados em 13–15/10/2026. [D04]–[D10]
  vêm da API oficial da RFB (Sijut, visão multivigente) e foram baixados hoje.
- **LC 123 art. 21 III [D01].** O texto compilado diz "enquanto não regulamentado pelo Comitê Gestor, até o último dia
  útil da primeira quinzena". O Comitê Gestor regulamentou no art. 40 da Res. 140 (dia 20). Vale o dia 20.
- **PIS/COFINS [D03].** O art. 18 traz "Vide LC 214". É a extinção em 01/01/2027 (LC 214 art. 542; nó IBS-CBS-2027).
  O calendário precisa da vigência: a linha de PIS/COFINS termina na competência 12/2026.
- **ECF [D06].** O art. 3º traz "Vide" da IN 2.039/2021, da IN 2.082/2022 e da Portaria RFB 421/2024: são
  prorrogações pontuais. **Prova de que o prazo muda por ato avulso.** O calendário precisa aceitar uma exceção datada
  com fonte (ver BRIEF, F-CF-2).
- **Res. CGSN 190 e 195 [D09][D10].** Mudam a Res. 140 a partir de 01/01/2027. Os arts. 38 e 40 continuam com o mesmo
  prazo. O art. 72 (DEFIS) é revogado e o bloco anual vai para o PGDAS-D (art. 38-B). A matriz do código já fecha a
  DEFIS em `vigenteAte = 2027-03-31` (linha `sn7-obr-defis-simples`, migração `20261017153700_seed_simples_res_cgsn_190`).
- **DCTFWeb [D08].** Redação da IN 2.248/2025. O § 1º, que adiava o prazo, foi revogado.

## 4. Ambiguidades (só o que precisa de decisão humana)
- **"Expediente bancário" no DAS (art. 40 § 3º).** Uma leitura usa só feriado nacional. A outra usa também feriado
  estadual e municipal da matriz, já que é o banco do local que fecha. A leitura mais segura conta o feriado local
  (tabela `FERIADO_LOCAL`, como `ultimoDiaUtilAteDia20`), porque o dia adiado nunca vence antes do prazo real. Pergunta
  ao contador: "O DAS de uma empresa em SP com vencimento num feriado municipal vence no dia útil seguinte?"
- **DEFIS, DASN-SIMEI e bloco anual sem regra de dia não útil.** O texto dá uma data fixa. A leitura mais segura avisa
  no último dia útil **antes** da data, sem mudar o prazo.

## 5. Lacunas
- **DAS do MEI.** O vencimento (dia 20) e a regra de dia não útil do MEI não foram lidos aqui (LC 123 art. 18-A). Vão
  para "Pendente de validação externa" no BRIEF.
- **ISS municipal.** A apuração não existe (só NFS-e). Fica fora deste calendário.
- **IBS.** O prazo segue DRAFT até o regulamento do CG-IBS (P-IBS-5).
- **Quotas do IRPJ/CSLL (Lei 9.430 art. 5º § 1º).** A lei permite até 3 quotas, mas o X7 só modela a quota única. O
  calendário mostra só a quota única até o X7 modelar as quotas (lacuna registrada na caixa).
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** Lei Complementar nº 123 de 14/12/2006 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/394a7e97c8604703a3ea6638df61ab1873cecc6e/federal/leis-complementares/2006/lcp-123-2006-12-14.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei.complementar:2006-12-14;123> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-11-21T16:05:50-03:00 · arquivo local `docs/D01_lcp-123-2006-12-14.md` · SHA-256 `62ae5f126e5d6a0bf1e149614362aeca97730684067c128251c92cc1f732bdd9`
- **[D02]** Lei nº 9.430 de 27/12/1996 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/6c8aa8aa7d6126d14c332df3ab07f956b17f4bf2/federal/leis-ordinarias/1996/lei-9430-1996-12-27.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:1996-12-27;9430> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-11-21T16:05:52-03:00 · arquivo local `docs/D02_lei-9430-1996-12-27.md` · SHA-256 `6e8e20371d0e7796244402441b7e3fc72df83a7bbe640029d4919359a6115bcc`
- **[D03]** Medida Provisória nº 2.158-35, de 24 de Agosto de 2001 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/6b9308d1da378562fa53395b5c2e9cd311bf86cc/federal/medidas-provisorias/2001/mpv-2158-35-2001-08-24.md>  
  Fonte oficial declarada: <https://www2.camara.leg.br/legin/fed/medpro/2001/medidaprovisoria-2158-35-24-agosto-2001-390566-normaatualizada-pe.html> · versao_texto: compilada · cópia de 2026-10-15  
  Lido em 2026-11-21T16:05:54-03:00 · arquivo local `docs/D03_mpv-2158-35-2001-08-24.md` · SHA-256 `18c9046ac3464f29c87475bb4df443c64ad2c577eb8ef68f9d10f8a01161605e`
- **[D04]** Resolução CGSN nº 140, de 22 de maio de 2018 — Receita Federal - Sistema Normas (API)  
  Link oficial: <https://normasinternet2.receita.fazenda.gov.br/#/consulta/externa/92278/visao/multivigente>  
  Baixado em 2026-11-21T16:05:59-03:00 · arquivo local `docs/D04_rfb-92278-multivigente.json` · SHA-256 `158a09df9d0832b58264f9a0f625f75b9238563c44c967c7b5ea03bde5f48cb3`  
  ⚠ alteração com vigência futura: Alterado(a) pelo(a) Resolução CGSN nº 190, de 4 de agosto de 2026, a partir de 01/01/2027 (rfb:152832)  
  ⚠ alteração com vigência futura: Alterado(a) pelo(a) Resolução CGSN nº 195, de 21 de outubro de 2026, a partir de 01/01/2027 (rfb:154194)  
  ⚠ 24 anexos binários não baixados (o texto integral pode estar neles): as URLs estão no fim do texto e no campo 'anexos'; baixe com 'legal.py baixar' os que a pesquisa citar
- **[D05]** Instrução Normativa RFB nº 2003, de 18 de janeiro de 2021 — Receita Federal - Sistema Normas (API)  
  Link oficial: <https://normasinternet2.receita.fazenda.gov.br/#/consulta/externa/114965/visao/multivigente>  
  Baixado em 2026-11-21T16:05:59-03:00 · arquivo local `docs/D05_rfb-114965-multivigente.json` · SHA-256 `f12ac0d01b43b55445a7856883ba0f6c289387320d77fefb0b573344d9877b79`
- **[D06]** Instrução Normativa RFB nº 2004, de 18 de janeiro de 2021 — Receita Federal - Sistema Normas (API)  
  Link oficial: <https://normasinternet2.receita.fazenda.gov.br/#/consulta/externa/114966/visao/multivigente>  
  Baixado em 2026-11-21T16:06:00-03:00 · arquivo local `docs/D06_rfb-114966-multivigente.json` · SHA-256 `81a0b1b2d1eb5ee92cc32dbeb5fa24ce8204ab4ec0d952238ab2ec2cb83c38f7`
- **[D07]** Instrução Normativa RFB nº 2043, de 12 de agosto de 2021 — Receita Federal - Sistema Normas (API)  
  Link oficial: <https://normasinternet2.receita.fazenda.gov.br/#/consulta/externa/119859/visao/multivigente>  
  Baixado em 2026-11-21T16:06:00-03:00 · arquivo local `docs/D07_rfb-119859-multivigente.json` · SHA-256 `068ec9d8400922648f3811c5a24e5e7a61cb097ad984528fb9d64ccc4b7e653f`
- **[D08]** Instrução Normativa RFB nº 2237, de 4 de dezembro de 2024 — Receita Federal - Sistema Normas (API)  
  Link oficial: <https://normasinternet2.receita.fazenda.gov.br/#/consulta/externa/141910/visao/multivigente>  
  Baixado em 2026-11-21T16:06:51-03:00 · arquivo local `docs/D08_rfb-141910-multivigente.json` · SHA-256 `d80a3ba09ae418f6dd587bd62d0bc57415de569ca3ab85a21a3cb746ade9d95e`
- **[D09]** Resolução CGSN nº 190, de 4 de agosto de 2026 — Receita Federal - Sistema Normas (API)  
  Link oficial: <https://normasinternet2.receita.fazenda.gov.br/#/consulta/externa/152832/visao/multivigente>  
  Baixado em 2026-11-21T16:10:17-03:00 · arquivo local `docs/D09_rfb-152832-multivigente.json` · SHA-256 `9d1b3419c37266069da0ff3eb51292886279aac4674436e4e540b1bbf57dce6b`  
  ⚠ 6 anexos binários não baixados (o texto integral pode estar neles): as URLs estão no fim do texto e no campo 'anexos'; baixe com 'legal.py baixar' os que a pesquisa citar
- **[D10]** Resolução CGSN nº 195, de 21 de outubro de 2026 — Receita Federal - Sistema Normas (API)  
  Link oficial: <https://normasinternet2.receita.fazenda.gov.br/#/consulta/externa/154194/visao/multivigente>  
  Baixado em 2026-11-21T16:10:17-03:00 · arquivo local `docs/D10_rfb-154194-multivigente.json` · SHA-256 `744914843138b566449799d31c8bb6264fa34bd58fc7222babf23c60968b0579`

## Registro de buscas
_Nenhuma busca registrada._
