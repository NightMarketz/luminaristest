# Relatório de pesquisa legal — verif-2026-10-17-contabil-ecd

**Pergunta:** Decisões de escrituração contábil, ECD/SPED, imobilizado/depreciação, CFC/CRC e demonstrações conferem com o texto vigente?
**Aberto em:** 2026-10-17T09:51:52-03:00 · **Atualizado em:** 2026-10-17T10:08:44-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão

Das 16 decisões e parâmetros conferidos nesta frente (escrituração, ECD, imobilizado, CRC e demonstrações), 12 conferem com o texto vigente. Há uma divergência de citação que tem efeito no texto que o usuário lê, uma citação de artigo errada e um risco de versão do manual. Nenhuma das três muda um cálculo.

1. **DIVERGE (verificado): o CRC cita uma norma revogada.** O código cita a Res. CFC 1.494/2015, arts. 3º e 36, em `server/src/features/accounting/models/AccountingContact.model.ts:55, 79, 108`, e esse texto sai numa mensagem de 400. Pelo SRE do CFC, a 1.494/2015 foi revogada pela Res. CFC 1.554/2018. A 1.554 foi revogada pela **Res. CFC 1.707/2023**, que está em vigor desde 01/01/2024 e foi alterada pelas Res. 1.717, 1.726 e 1.731/2024.
   - O conteúdo que o projeto usa continua valendo pela 1.707: os tipos de registro são Originário e Transferido (art. 3º), e o transferido recebe "T" e a sigla do CRC de destino (art. 5º, parágrafo único).
   - O art. 36 citado para dizer que "o registro provisório foi extinto" não existe com esse conteúdo na norma vigente. Na 1.707, o art. 36 só revoga normas anteriores. A extinção do provisório decorre do art. 3º, que só prevê os dois tipos (grau: inferido).
   - O sufixo " S-UF" (secundário) aceito pelo `CRC_NUMBER_RE` não tem base na 1.707, que não tem registro secundário. A tolerância é permissiva, não restritiva.
2. **DIVERGE (verificado, só a citação): o art. 187 está com o inciso errado.** As deduções da receita bruta estão no **art. 187, inciso I** da Lei 6.404/76 [D03], não no inciso II. O inciso II trata da receita líquida, do CMV e do lucro bruto.
   - Onde está: `server/src/features/accounting/services/StatementMappingFixture.ts:30` e `server/src/features/sectorKits/kits/_shared/conteudoFiscalCanonico.ts:10`.
   - O mapeamento em si (3.6.x como dedução) está certo.
3. **DESATUALIZADO-RISCO (verificado): o manual da ECD vigente é outra edição.** O D-2026-09-23-MANUAL-ECD-L9-VIGENTE fixa como vigente a edição de **janeiro/2026** (sha `7ddf47755f61`). Em 17/10/2026, a página oficial de manuais (sped.rfb.gov.br/pasta/show/1569) lista só a **"Atualização – maio/2026"**, também anexa ao ADE Cofis nº 1/2026, com sha `bc63f0a893ce` [D07]. O leiaute continua 9 (I010.COD_VER_LC = 9.00).
   - Conferi na edição de maio [D07] tudo o que o código usa e bate: J930 (tabela de 19 códigos, REGRA_OBRIGATORIO_ASSIN_CONTADOR, REGRA_OBRIGATORIO_UM_RESP_LEGAL, REGRA_QUALIF_INV_RESP_LEGAL, REGRA_OBRIGATORIO_CONTADOR, NUM_SEQ_CRC no formato UF/AAAA/NÚMERO), J801 (COD_MOT_SUBS 001–005 e 099), J932 (910/920) e REGRA_VALIDA_NIVEL_CONTAS (nível ≥ 4).
   - O que pode diferir entre as duas edições, fora desses registros, não foi comparado: o PDF de janeiro não está neste worktree.

O Anexo III da IN RFB 1.700/2017 (taxas de depreciação), conferido linha a linha contra o texto vigente oficial, **confere**: são 220 linhas vivas iguais. As duas diferenças são escolhas documentadas no ADR: (a) a linha `8517 0%` tachada (retificada no DOU de 13/04/2017) foi descartada; (b) a linha `8905`, sem "%" na fonte, foi derivada como 5% (prazo de 20 anos). As alterações da IN 1.700 até a IN 2.343 (17/09/2026) não mexeram no Anexo III.

## 2. Fundamentação
| Ponto | Norma (art.) | Fonte | Trecho literal |
|---|---|---|---|
| Taxas por NCM | IN RFB 1.700/2017 art. 124 §1º + Anexo III (vigente) | normasinternet2 ato 81268, visão vigente (lida no browser em 17/10) | "O prazo de vida útil admissível é aquele estabelecido no Anexo III" |
| Taxa fiscal | RIR/2018 art. 320 §1º | [D08] | "publicará periodicamente o prazo de vida útil admissível" |
| Quota mensal cheia no mês de ativação/baixa | RIR/2018 art. 319 §2º | [D08] | "dispensado o ajuste da taxa para os bens postos em funcionamento ou baixados no curso do mês" |
| Teto da depreciação acumulada | RIR/2018 art. 317 §3º | [D08] | "não poderá ultrapassar o custo de aquisição" |
| Bem de até R$ 1.200 ou vida útil ≤ 1 ano na despesa; conjunto | RIR/2018 art. 313 §1º I-II, §2º | [D08] | "valor unitário não superior a R$ 1.200,00" |
| Benfeitoria em bem de terceiro | RIR/2018 arts. 331 III, 333 | [D08] | "quando não houver direito ao recebimento de seu valor" |
| Estoque a custo médio | RIR/2018 art. 307 | [D08] | "poderá ser o custo médio" |
| Grupos do BP | Lei 6.404 art. 178 §§1º-2º | [D03] | "I - ativo circulante; e II - ativo não circulante" |
| Deduções na DRE | Lei 6.404 art. 187 **I** | [D03] | "a receita bruta das vendas e serviços, as deduções das vendas" |
| ECD: quem é obrigado, dispensas, facultativa | IN RFB 2.003/2021 art. 3º caput, §1º I/III/V, §§2º, 3º, 6º | normasinternet2 ato 114965, visão vigente (só a IN 2.142/2023 a alterou) | "podem apresentá-la de forma facultativa" |
| Escrituração sob contabilista; ordem cronológica | CC arts. 1.179 §2º, 1.182, 1.183 | [D04] | "a escrituração ficará sob a responsabilidade de contabilista legalmente habilitado" |
| Registro no CRC | DL 9.295 arts. 12, 25 | [D06] | "registro no Conselho Regional de Contabilidade" |
| Tipos de registro e sufixo T | Res. CFC 1.707/2023 arts. 3º e 5º p.ú. | www1.cfc.org.br/sisweb/SRE/docs/RES_1707.pdf (sha `e8f380919d07`) | "ao número do Registro Originário será acrescentada a letra 'T'" |
| J930 | Manual ECD L9, maio/2026, pp. 201-203 | [D07] | "REGRA_VALIDA_FORMATO_SEQUENCIAL_CRC … o PGE do Sped Contábil gera um aviso" |
| Nível ≥ 4 | Manual ECD L9, maio/2026, p. ~121 | [D07] | "NIVEL (Campo 05) – é maior ou igual a '4'" |

## 3. Vigência conferida
- **Alertas do acervo e como os resolvi:**
  - O Decreto 9.580 está no acervo como "original" [D02]. Conferi a versão compilada do Planalto [D08].
  - A IN 1.700 e a IN 2.003 não estão no acervo (só há IN de 2025 e 2026). Li as duas na visão vigente do normasinternet2 (Sijut2), no browser.
  - O acervo do CFC só cobre 2025 e 2026, com 2025 parcial (1.756 a 1.765). Conferi a Res. 1.494, a 1.554 e a 1.707 no SRE do CFC: a página de detalhes diz que a 1.707 está "em vigor: SIM", alterada pela 1.717, pela 1.726 e pela 1.731.
  - O cfc.org.br não está na lista de domínios do `legal.py`. Por isso as Res. CFC estão aqui por URL e sha, sem ID D.
- **Redação atual:**
  - IN 1.700: as alterações vão até a IN 2.343 de 17/09/2026, e o Anexo III não mudou.
  - IN 2.003: a única alteração é a IN 2.142/2023.
  - Res. CFC 1.707: os arts. 3º e 5º não foram tocados pelas Res. 1.717, 1.726 e 1.731.
  - Lei 6.404, CC e DL 9.295: versão compilada de 13/10/2026.
- **Manual ECD:** a edição vigente é a de maio/2026 [D07], não a de janeiro/2026 citada pelo D-2026-09-23.

## 4. Ambiguidades (só o que precisa de decisão humana)
1. **"Exatamente um" ou "ao menos um" responsável legal no J930.** A regra diz "existe um registro J930 … IND_RESP_LEGAL = S" [D07]. O projeto exige exatamente 1 (`SpedEcdDto.ts:397-399`).
   - Lendo "pelo menos um", o projeto recusaria uma ECD com 2 administradores marcados S, que o PGE aceitaria.
   - Lendo "exatamente um", o projeto está certo.
   - Leitura mais segura: manter, porque o caso é raro e o 400 é visível. Quem decide é o PVA do H1. A pergunta ao contador: "o PGE aceita dois J930 com IND_RESP_LEGAL=S?"
2. **A máscara do IND_CRC é mais rígida que o manual.** O manual não dá formato ao campo 06, e o exemplo oficial usa `1SP123456`, sem `/O-D`, com UF_CRC = RJ [D07]. Esse exemplo levaria 400 no projeto duas vezes: por faltar o dígito verificador e pelo cruzamento de UF. Foi decisão do dono (F13; "Origem OU destino").
   - A fonte da máscara é o Manual de Registro do CFC de 2009, que não foi relido aqui. A Res. 1.707 vigente não dá formato além do "T + sigla" do art. 5º.
   - Leitura mais segura: manter a máscara, mas só se o contador confirmar que todo registro real tem o dígito verificador. A pergunta: "a carteira/certidão de todo contador ativo traz o número no formato `1UF000000/O-D`?"
3. **NUM_SEQ_CRC fora do formato.** O PGE só dá aviso, e o DTO recusa com 400 (`SpedEcdDto.ts:84-89`). É mais restritivo que o manual. Não é ilegal; é escolha de produto.

## 5. Lacunas
- Não comparei a edição de jan/2026 com a de maio/2026 do Manual ECD fora do J801, J930, J932 e I050: o PDF de janeiro não está no worktree.
- Não verifiquei o formato `1UFXXXXXX/O-X` no Manual de Registro do Sistema CFC/CRCs (2009). Não há norma vigente que o fixe.
- Não confirmei a vigência da NBC TG 1002, da NBC TG 1000/1001 e do CPC 27 (citados em forks), porque o SRE não expõe o status deles por URL direta. A ITG 2000 (R1) está "em vigor: SIM" no SRE, mas o texto não foi relido.
- Não há depreciação acelerada (RIR art. 323) nem incentivada no código. Não é decisão do projeto, então não há o que conferir.
- Lei 12.973 (AVP): não há decisão desta frente que a use.
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** Normas — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=81268>  
  Baixado em 2026-10-17T09:54:50-03:00 · arquivo local `docs/D01_link-action.html` · SHA-256 `9f9413e20884b24680269927744a2abbf407243127ba5087a1489fd91fc8153a`
- **[D02]** Decreto nº 9.580 de 22/11/2018 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/39239e708b021186cea3d407a5fc7984f2c725f5/federal/decretos/2018/dec-9580-2018-11-22.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:decreto:2018-11-22;9580> · versao_texto: original · cópia de 2026-10-15  
  Lido em 2026-10-17T09:58:28-03:00 · arquivo local `docs/D02_dec-9580-2018-11-22.md` · SHA-256 `2c328212c1a8408eaa64072debe9860ecb435a731150296702b0583f00acfe6e`  
  ⚠ versao_texto = 'original' (não é texto compilado: alterações posteriores não aparecem)
- **[D03]** Lei nº 6.404 de 15/12/1976 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/93b36bd206c427bbc1105b9d267654e75e7e6f56/federal/leis-ordinarias/1976/lei-6404-1976-12-15.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:1976-12-15;6404> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-17T09:58:30-03:00 · arquivo local `docs/D03_lei-6404-1976-12-15.md` · SHA-256 `5d16d68dae24463ba09ac3b4557d4a2b4b2004d0abee18d0783446f79e6fcb27`
- **[D04]** Lei nº 10.406 de 10/01/2002 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/40fe0ecf521a6ae5e22077bcc927c90a9477d3a5/federal/leis-ordinarias/2002/lei-10406-2002-01-10.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:2002-01-10;10406> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-17T09:58:31-03:00 · arquivo local `docs/D04_lei-10406-2002-01-10.md` · SHA-256 `be0cd7d8a1eaacb21cb64f07086929db91f43ad3149b3c721cd33873d328c32c`
- **[D05]** Lei nº 12.973 de 13/05/2014 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/5a77b1ed480d4b4fc20fabaac59f6674b120d7ec/federal/leis-ordinarias/2014/lei-12973-2014-05-13.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:2014-05-13;12973> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-17T09:58:32-03:00 · arquivo local `docs/D05_lei-12973-2014-05-13.md` · SHA-256 `d73a401dbbd14ab1feb1c8bce8daa51c3cfcb0cbc264e87b9023fc875f1b89cf`
- **[D06]** Decreto-Lei nº 9.295 de 27/05/1946 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/3ac4075b25b31b89791ae33b18dd3b60049d07df/federal/decretos-lei/1946/del-9295-1946-05-27.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:decreto.lei:1946-05-27;9295> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-17T09:58:33-03:00 · arquivo local `docs/D06_del-9295-1946-05-27.md` · SHA-256 `190cd073a8c707ffd127fed158b0b990c747eb99cc23aa3905e4fdea7df5dc01`
- **[D07]** D07_Manual_de_Orienta-c3-a7-c3-a3o_da_ECD_Leiaute_20_maio_2026-p — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <http://sped.rfb.gov.br/estatico/71/1BD273E4A9F51ED8EF01AC3A6BC15812A3481F/Manual_de_Orienta%c3%a7%c3%a3o_da_ECD_Leiaute_20_maio_2026.pdf>  
  Baixado em 2026-10-17T10:02:22-03:00 · arquivo local `docs/D07_Manual_de_Orienta-c3-a7-c3-a3o_da_ECD_Leiaute_20_maio_2026-p.pdf` · SHA-256 `bc63f0a893ce4b2262b73426717e1cb5546704db58eaf81791fb296468bacc91`
- **[D08]** D9580 — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/decreto/d9580.htm>  
  Baixado em 2026-10-17T10:06:05-03:00 · arquivo local `docs/D08_d9580-htm.html` · SHA-256 `ff0b99e37eb648920c66e9219c8140a4e6210807ddf051a2be801c67b96f5f2d`

## Registro de buscas
_Nenhuma busca registrada._
