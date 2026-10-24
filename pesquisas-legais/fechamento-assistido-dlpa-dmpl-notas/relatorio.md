# Relatório de pesquisa legal — fechamento-assistido-dlpa-dmpl-notas

**Pergunta:** DLPA/DMPL e notas explicativas: obrigatoriedade por porte/regime; leiaute ECD J210/J215/J800; conciliação de contas como dever do contador
**Aberto em:** 2026-10-22T22:09:56-03:00 · **Atualizado em:** 2026-10-22T22:13:53-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão

1. **A DLPA (ou a DMPL que a contém) é exigida em todos os portes que o Luminaris atende hoje.** Grau: verificado.
   - Microentidade (receita bruta até R$ 4,8 mi): o conjunto completo é BP, DRE e **DLPA** ([C01] item 3.6 "c").
     A DMPL é opcional e pode trazer a DLPA como coluna ([C01] item 6.2).
   - Pequena empresa (acima de R$ 4,8 mi até R$ 78 mi): BP, DRE, **DMPL**, DFC e **notas explicativas** ([C02] item 3.5).
     Se o PL só mexeu em lucros ou prejuízos acumulados, basta a DLPA ([C02] item 6.2).
   - Micro ou pequena **no Lucro Real** ou companhia fechada: segue a Lei 6.404 ([C03] item 10). Lá a DLPA é
     obrigatória ([D01] art. 176, II) e pode ir dentro da DMPL ([D01] art. 186 §2º). As notas também são
     obrigatórias ([D01] art. 176 §4º e §5º).
   - O Código Civil sozinho pede só BP e resultado ([D02] arts. 1.065, 1.179 e 1.189). A exigência de DLPA vem
     da norma do CFC e, no Lucro Real, da Lei 6.404 via [C03] item 10.
2. **Notas explicativas: o regime depende do porte.** Grau: verificado.
   - Microentidade: **não é obrigada** a notas, mas é incentivada ([C01] item 3.7). Continua obrigada a declarar,
     "ao final das demonstrações", conformidade com a norma e a atividade operacional ([C01] item 3.2).
   - Pequena empresa: notas obrigatórias, com declaração de conformidade ([C02] itens 3.5 "e" e 8.5) e referência
     cruzada de cada item da demonstração para a nota ([C02] item 8.3). A ITG 1000 traz diretriz: nota 1 =
     entidade e atividade; nota 2 = declaração de conformidade ([C03] Anexo 6, A6.7 e A6.8).
   - Lucro Real: [D01] art. 176 §5º lista o conteúdo mínimo (critérios de avaliação, ônus, juros de longo prazo,
     ações/quotas, ajustes de exercícios anteriores, eventos subsequentes).
3. **No PVA da ECD, J210, J215 e J800 são facultativos** (tabela de obrigatoriedade, coluna "F"; Observações de
   cada registro: "Registro facultativo"). Grau: verificado em [D03] pp. 187-193. A obrigação de elaborar vem de
   [C01]/[C02]/[D01], não do leiaute. Consequência: omitir o J210 não reprova o PVA; **emitir errado reprova**
   (REGRA_VALIDA_DMPL_COM_SALDO_FIN e REGRA_VALIDA_TOT_AGLUTINACAO_J215 geram erro).
4. **Leiaute** (verificado em [D03]):
   - J210 (9 campos): REG, IND_TIP (0 = DLPA, 1 = DMPL), COD_AGL (aglutinação de conta **analítica** do PL, via I052),
     DESCR_COD_AGL, VL_CTA_INI, IND_DC_CTA_INI, VL_CTA_FIN, IND_DC_CTA_FIN, NOTAS_EXP_REF. Um só J210 quando DLPA
     (REGRA_UNICO_DLPA, aviso). Todos os J210 do período com o mesmo IND_TIP (erro). Saldo final = soma dos I155 da
     aglutinação na data final (erro).
   - J215 (5 campos): REG, COD_HIST_FAT, DESC_FAT, VL_FAT_CONT, IND_DC_FAT (D, C, P ou N). O primeiro J215 traz o
     saldo inicial. VL_CTA_FIN do J210 = soma dos J215 menos o saldo inicial (erro).
   - J800 (6 campos): REG, TIPO_DOC (001 DRA, 002 DFC, 003 DVA, 010 Notas, 011 Relatório da Administração,
     012 Parecer, 099 Outros), DESC_RTF, HASH_RTF, ARQ_RTF (RTF até 30 MB), IND_FIM_RTF = "J800FIM".
   - NOTA_EXP_REF preenchido em J100, J150 ou J210 exige J800 com TIPO_DOC 010, 011, 012 ou 999
     (REGRA_EXISTE_NOTA_EXPLICATIVA, erro). **Atenção:** a regra cita "999 – Outros", mas a tabela do J800 lista
     "099: Outros". Divergência interna do manual (ver §4).
5. **Conciliação de contas (saldo × composição) não tem norma própria que a imponha.** Grau: verificado por
   ausência nas normas lidas. Ela decorre do dever de o balanço exprimir "a situação real" ([D02] art. 1.188) e
   da responsabilidade exclusiva do profissional pelas análises e demonstrações ([C04] item 12). É prática
   profissional, não registro de leiaute.
6. **Carta de Responsabilidade da Administração:** o profissional "deve obter" ao término de cada exercício
   ([C03] itens 13 e 14). Entra como item do checklist anual.

## 2. Fundamentação
| Ponto | Norma (art.) | Fonte | Trecho literal |
|---|---|---|---|
| DLPA na S.A. | Lei 6.404 art. 176, II | [D01] | "demonstração dos lucros ou prejuízos acumulados" |
| DLPA dentro da DMPL | Lei 6.404 art. 186 §2º | [D01] | "poderá ser incluída na demonstração das mutações do patrimônio líquido" |
| Notas obrigatórias (6.404) | art. 176 §4º | [D01] | "serão complementadas por notas explicativas" |
| CC: só BP e resultado | CC art. 1.179 | [D02] | "levantar anualmente o balanço patrimonial e o de resultado econômico" |
| Ltda pode adotar a S.A. | CC art. 1.053 par. único | [D02] | "regência supletiva da sociedade limitada pelas normas da sociedade anônima" |
| Micro: conjunto completo | NBC TG 1002 item 3.6 | [C01] | "(c) demonstração dos lucros ou prejuízos acumulados" |
| Micro: notas facultativas | NBC TG 1002 item 3.7 | [C01] | "não está obrigada a elaborar notas explicativas" |
| Micro: declaração | NBC TG 1002 item 3.2 | [C01] | "declaração explícita e sem reservas dessa conformidade" |
| Pequena: conjunto completo | NBC TG 1001 item 3.5 | [C02] | "(c) demonstração das mutações do patrimônio líquido" |
| Pequena: DLPA basta | NBC TG 1001 item 6.2 | [C02] | "poderá ser apresentada apenas a demonstração dessa conta" |
| Lucro Real → 6.404 | ITG 1000 item 10 | [C03] | "sujeitas à tributação com base no lucro real deverão seguir o que determina a Lei nº 6.404/76" |
| Carta de responsabilidade | ITG 1000 item 14 | [C03] | "deve ser obtida ao término de cada exercício social" |
| Análises são do contador | ITG 2000 (R1) item 12 | [C04] | "atribuição e de responsabilidade exclusivas do profissional da contabilidade" |
| J210/J215/J800 facultativos | Manual ECD L9 tabela + registros | [D03] | "Registro facultativo" |

Documentos do CFC (fora do manifesto: o `legal.py baixar` recusa `cfc.org.br`, mas o CFC é o órgão emissor;
baixados por `curl` em 22/10/2026, binário fora do git):

- **[C01]** NBC TG 1002, de 18/11/2021 — <https://www1.cfc.org.br/sisweb/SRE/docs/NBCTG1002.pdf> · SHA-256 `22e993c60f44fb4aedeea3a51af2a4a5a8fa3baf440d9e413e0fddcbda9bd335`
- **[C02]** NBC TG 1001 — <https://www1.cfc.org.br/sisweb/SRE/docs/NBCTG1001.pdf> · SHA-256 `6f1b3a9f510837877ef19e4021fb843e89f695839fd6556c80ed65271559f141`
- **[C03]** ITG 1000, de 15/12/2022 — <https://cfc.org.br/wp-content/uploads/2023/01/ITG-1000.pdf> · SHA-256 `d90a03fffd4d4fa4d3372e089029acb5823279e9db9b60b0e73e2cdde919440f`
- **[C04]** ITG 2000 (R1) — <https://www1.cfc.org.br/sisweb/SRE/docs/ITG2000(R1).pdf> · SHA-256 `6b4355f83fb74d084248893d4dc3ce78258a624a151dabcaebb801d9a63042e5` (mesmo sha do dossiê `verif-2026-10-17-contabil-lacunas`)

## 3. Vigência conferida
- Alertas do acervo: nenhum em [D01] e [D02] (compilada, cópia de 13/10/2026). [D03] tem o mesmo sha `bc63f0a893ce`
  do MANIFEST e da decisão D-2026-10-17-MANUAL-ECD-L9-MAIO.
- [C01] vigora nos exercícios iniciados a partir de 01/01/2023 e revoga a ITG 1000 antiga (Res. CFC 1.418/2012)
  ([C01] seção "Vigência"). [C03] é a ITG 1000 nova, de 15/12/2022, que já cita a NBC TG 1001 e a 1002.
- Os limites de R$ 4,8 mi e R$ 78 mi se atualizam sozinhos se a LC 123 ou a Lei 9.718 mudarem ([C03] item 11).
- **Não conferido:** o status "em vigor" de [C01], [C02] e [C03] no SRE do CFC (a página não expõe status por URL
  direta, mesma lacuna do dossiê de 17/10). Os textos lidos não trazem revisão "(R1)".

## 4. Ambiguidades (só o que precisa de decisão humana)
1. **Onde vai a declaração de conformidade da microentidade que não faz notas.** [C01] item 3.2 manda declarar "ao
   final das demonstrações". Leituras: (a) texto ao pé da DLPA no PDF/relatório; (b) J800 TIPO_DOC 099 na ECD;
   (c) as duas. A mais segura é (c). Pergunta ao contador: *"Para microentidade sem notas, você coloca a
   declaração de conformidade da NBC TG 1002 item 3.2 num J800 ou só nas demonstrações impressas?"*
2. **"999" × "099" no J800.** A regra REGRA_EXISTE_NOTA_EXPLICATIVA aceita "999 – Outros"; a tabela de valores do
   J800 lista "099: Outros". Leitura segura: nunca depender de "Outros" para satisfazer a regra; usar sempre
   TIPO_DOC 010 quando houver NOTA_EXP_REF. Só o PVA resolve (teste no H1).
3. **Ocorrência do J800.** A tabela do registro diz "Ocorrência – 1:N"; as Observações e a tabela de obrigatoriedade
   dizem "facultativo". Leitura segura: tratar como facultativo e testar no PVA uma ECD sem J800.
4. **Ltda no Presumido com contrato social prevendo regência supletiva da S.A.** ([D02] art. 1.053 par. único):
   passa a seguir a 6.404 (notas obrigatórias)? [C03] item 10 só fala de companhia fechada e Lucro Real. Pergunta
   ao contador: *"Uma Ltda microentidade no Presumido cujo contrato adota a Lei das S.A. supletivamente precisa de
   notas explicativas?"*

## 5. Lacunas
- Não há norma que obrigue "conciliação de contas" como procedimento formal com trava. O desenho (trava, quem
  confere, periodicidade) é decisão de produto, não de lei.
- Help center oficial da Domínio sobre conciliação de contas e notas com variáveis: não encontrado nas buscas de
  22/10. Alterdata: lido (ver o PRE-ADR §2.4).
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** Lei nº 6.404 de 15/12/1976 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/93b36bd206c427bbc1105b9d267654e75e7e6f56/federal/leis-ordinarias/1976/lei-6404-1976-12-15.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:1976-12-15;6404> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-22T22:10:26-03:00 · arquivo local `docs/D01_lei-6404-1976-12-15.md` · SHA-256 `5d16d68dae24463ba09ac3b4557d4a2b4b2004d0abee18d0783446f79e6fcb27`
- **[D02]** Lei nº 10.406 de 10/01/2002 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/40fe0ecf521a6ae5e22077bcc927c90a9477d3a5/federal/leis-ordinarias/2002/lei-10406-2002-01-10.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:2002-01-10;10406> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-22T22:10:28-03:00 · arquivo local `docs/D02_lei-10406-2002-01-10.md` · SHA-256 `be0cd7d8a1eaacb21cb64f07086929db91f43ad3149b3c721cd33873d328c32c`
- **[D03]** D03_Manual_de_Orienta-c3-a7-c3-a3o_da_ECD_Leiaute_20_maio_2026-p — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <http://sped.rfb.gov.br/estatico/71/1BD273E4A9F51ED8EF01AC3A6BC15812A3481F/Manual_de_Orienta%c3%a7%c3%a3o_da_ECD_Leiaute_20_maio_2026.pdf>  
  Baixado em 2026-10-22T22:11:09-03:00 · arquivo local `docs/D03_Manual_de_Orienta-c3-a7-c3-a3o_da_ECD_Leiaute_20_maio_2026-p.pdf` · SHA-256 `bc63f0a893ce4b2262b73426717e1cb5546704db58eaf81791fb296468bacc91`

## Registro de buscas
_Nenhuma busca registrada._
